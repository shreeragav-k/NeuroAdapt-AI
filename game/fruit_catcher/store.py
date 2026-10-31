"""Where Fruit Catcher keeps its best score and the result the website reads back.

halcyon/data/fruit_catcher.json:
  { "best": 12, "rounds": 3, "last": { "score": 9, "caught": 9, "hit": 1, "missed": 2, "duration_s": 60,
                                       "played_s": 60.0, "ended": "TIME_UP", "camera": true, "finished_at": 1730000000000 } }
Only numbers are stored, never video.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "fruit_catcher.json"


def load(path: Path | None = None) -> dict:
    try:
        data = json.loads(Path(path or DEFAULT_PATH).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def best(path: Path | None = None) -> int:
    b = load(path).get("best")
    return b if isinstance(b, int) and b >= 0 else 0


def save_round(summary: dict, camera: bool, path: Path | None = None) -> bool:
    """Record a finished round. Returns True when it is a new best score."""
    p = Path(path or DEFAULT_PATH)
    data = load(p)
    old_best = best(p)
    new_best = summary["score"] > old_best
    data["best"] = max(old_best, int(summary["score"]))
    data["rounds"] = int(data.get("rounds", 0)) + 1
    data["last"] = {**summary, "camera": bool(camera), "finished_at": int(time.time() * 1000)}
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp.replace(p)
    except OSError:
        pass
    return new_best
