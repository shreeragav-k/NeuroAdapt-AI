"""Configuration for the Halcyon game runtime.

Everything a caregiver or developer might reasonably want to change lives in
`halcyon/config.json` (optional) or the shared `catalog.json`. Nothing here is
clinical: values are usability defaults.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
ROOT = PACKAGE_DIR.parents[1]           # .../halcyon
DATA_DIR = ROOT / "data"
CATALOG_PATH = ROOT / "catalog.json"
CONFIG_PATH = ROOT / "config.json"
FONT_DIR = ROOT / "web" / "fonts"

WINDOW_SIZE = (1280, 720)
FPS = 60

STARTER_COUNT = 5     # completed games used for the initial pace estimate
MIN_ADAPTIVE = 5      # minimum games offered in the adaptive phase

DIMENSIONS = ("pace", "load", "visual")   # each 1..5, adjusted one at a time


def load_catalog() -> dict:
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


@dataclass
class Config:
    """User-editable runtime configuration (halcyon/config.json)."""

    age_range: tuple[int, int] = (5, 17)
    camera_index: int = 0
    camera_width: int = 640
    camera_height: int = 480
    fullscreen: bool = False
    # Gestures are deliberately few and configurable.
    gestures: dict = field(
        default_factory=lambda: {
            "select": "pinch",          # pinch | dwell | both
            "pause": "open_palm_hold",  # open_palm_hold | off
            "dwell_seconds": 0.9,
            "palm_hold_seconds": 1.6,
            "lean_threshold": 0.12,     # pose mode: torso lean for left / right
            "dwell_radius": 60,         # pixels the hand may drift while holding still
            "smoothing": 0.45,          # cursor smoothing while pointing (higher = snappier)
            "smoothing_pinch": 0.28,    # steadier while pinching so a click does not jitter
        }
    )
    pinch_metric: str = "image"        # image | world (world uses MediaPipe's 3D coordinates, robust to hand tilt)
    pinch_on: float = 0.30
    pinch_off: float = 0.46
    low_light_threshold: float = 45.0   # mean frame brightness 0..255
    min_confidence: float = 0.55        # below this a missed movement is not counted as an error
    no_camera: bool = False             # force the non-camera path

    @classmethod
    def load(cls) -> "Config":
        cfg = cls()
        catalog = load_catalog()
        if "age_range" in catalog:
            cfg.age_range = tuple(catalog["age_range"])  # type: ignore[assignment]
        if CONFIG_PATH.exists():
            try:
                raw = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                raw = {}
            for key, value in raw.items():
                if key == "gestures" and isinstance(value, dict):
                    cfg.gestures.update(value)
                elif hasattr(cfg, key):
                    setattr(cfg, key, tuple(value) if key == "age_range" else value)
        return cfg


DEFAULT_PREFERENCES = {
    "movement_mode": "hands",      # hands | pose | none
    "posture": "seated",           # seated | standing
    "sound": True,
    "volume": 0.5,
    "animation": "gentle",         # off | gentle | full
    "instructions": "steps",       # short | steps | visual
    "session_minutes": 5,
    "select_method": "pinch",      # pinch | dwell | both
}


def default_profile() -> dict:
    return {
        "id": "guest",
        "guest": True,
        "name": "Guest",
        "age": 9,
        "role": "player",
        "profile": {"self_described": "prefer_not", "traits": [], "notes": ""},
        "preferences": dict(DEFAULT_PREFERENCES),
        "overrides": {},
    }
