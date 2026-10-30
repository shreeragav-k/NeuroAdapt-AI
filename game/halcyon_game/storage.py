"""Local-only persistence.

What is stored (all in halcyon/data/, nothing leaves the device):
  profile.json   the profile and preferences the player or caregiver entered
  progress.json  per-session game performance and current difficulty settings
  calibration.json  four numbers describing the comfortable movement range

Never stored: camera video, images, or landmark streams.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from .config import DATA_DIR, default_profile, DEFAULT_PREFERENCES

PROFILE_PATH = DATA_DIR / "profile.json"
PROGRESS_PATH = DATA_DIR / "progress.json"
CALIBRATION_PATH = DATA_DIR / "calibration.json"


def _read(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def _write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# ----------------------------------------------------------------- profile
def load_profile(path: Path | None = None) -> dict:
    prof = _read(path or PROFILE_PATH, None)
    base = default_profile()
    if not isinstance(prof, dict):
        return base
    base.update({k: v for k, v in prof.items() if k not in ("preferences", "profile")})
    base["profile"].update(prof.get("profile") or {})
    prefs = dict(DEFAULT_PREFERENCES)
    prefs.update(prof.get("preferences") or {})
    base["preferences"] = prefs
    return base


def save_profile(profile: dict) -> None:
    _write(PROFILE_PATH, profile)


# ---------------------------------------------------------------- progress
def empty_progress() -> dict:
    return {
        "version": 1,
        "completed_count": 0,
        "estimate": {"done": False, "level": None, "basis": []},
        "games": {},        # game_id -> {"dims": {...}, "sessions": n, "last_adjustment": str}
        "sessions": [],
    }


def load_progress(path: Path | None = None) -> dict:
    data = _read(path or PROGRESS_PATH, None)
    base = empty_progress()
    if isinstance(data, dict):
        base.update(data)
    return base


def save_progress(progress: dict, path: Path | None = None) -> None:
    _write(path or PROGRESS_PATH, progress)


def clear_progress() -> None:
    for p in (PROGRESS_PATH, CALIBRATION_PATH):
        if p.exists():
            p.unlink()


def clear_all() -> None:
    clear_progress()
    if PROFILE_PATH.exists():
        PROFILE_PATH.unlink()


# ------------------------------------------------------------- calibration
DEFAULT_CALIBRATION = {"xmin": 0.15, "xmax": 0.85, "ymin": 0.10, "ymax": 0.80}


def load_calibration() -> dict:
    data = _read(CALIBRATION_PATH, None)
    if isinstance(data, dict) and all(k in data for k in DEFAULT_CALIBRATION):
        return {k: float(data[k]) for k in DEFAULT_CALIBRATION}
    return dict(DEFAULT_CALIBRATION)


def save_calibration(cal: dict) -> None:
    _write(CALIBRATION_PATH, cal)
