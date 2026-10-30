from __future__ import annotations

from ..config import Config
from .base import GUIDANCE, TrackState, Tracker


class NullTracker(Tracker):
    """Used when movement input is off or unavailable. The game stays fully playable."""

    def __init__(self, status: str = "off") -> None:
        super().__init__()
        with self._lock:
            self._state.status = status
            self._state.message = GUIDANCE.get(status, GUIDANCE["off"])


def make_tracker(movement_mode: str, cfg: Config, calibration: dict) -> Tracker:
    """Return a camera tracker, or a NullTracker with an explanatory status."""
    if movement_mode == "none" or cfg.no_camera:
        return NullTracker("off")
    from . import mediapipe_tracker as mpt

    if not mpt.AVAILABLE:
        return NullTracker("unsupported")
    return mpt.MediaPipeTracker(movement_mode, cfg, calibration)


__all__ = ["GUIDANCE", "NullTracker", "TrackState", "Tracker", "make_tracker"]
