"""Tracker contract shared by the MediaPipe tracker and the no-camera tracker.

Privacy: trackers process frames in memory and keep only the latest landmark
set and a small preview image. Nothing is written to disk.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field, replace
from typing import Optional

import numpy as np

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
]
POSE_CONNECTIONS = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24)]

# Plain-language guidance for every status.
GUIDANCE = {
    "off": "Camera is off. You're playing with mouse, touch or keyboard.",
    "starting": "Starting the camera…",
    "ok": "Tracking is steady.",
    "lost": "I can't see your hand. Bring it back into the picture, or keep playing with mouse or keyboard.",
    "lost_pose": "I can't see you clearly. Move a little back into the picture, or keep playing with mouse or keyboard.",
    "low_light": "It's a bit dark. A lamp in front of you will help. You can also keep playing with mouse or keyboard.",
    "no_camera": "No camera found. That's fine. Mouse, touch and keyboard all work.",
    "error": "The camera isn't responding. Check no other app is using it, or play with mouse and keyboard.",
    "unsupported": "Movement tracking isn't available on this computer. Mouse, touch and keyboard all work.",
}


@dataclass
class TrackState:
    status: str = "off"
    message: str = GUIDANCE["off"]
    mode: str = "none"
    present: bool = False
    cursor: Optional[tuple] = None          # 0..1 in screen space after calibration
    raw: Optional[tuple] = None             # 0..1 in (mirrored) camera space
    pinching: bool = False
    pinch_edge: bool = False                # one-shot
    raise_edge: bool = False                # one-shot (pose mode: arm raised)
    palm_hold: float = 0.0                  # 0..1 progress of the open-palm pause gesture
    pause_request: bool = False             # one-shot
    lean: int = 0                           # -1 left, 0 centre, +1 right (pose mode)
    confidence: float = 0.0
    fps: float = 0.0
    pinch_ratio: float = 1.0                # active metric: thumb-index distance / hand size (small = pinched)
    pinch_ratio_img: float = 1.0            # measured in the flat camera image
    pinch_ratio_world: float = 1.0          # measured in MediaPipe's metric 3D space (tilt-proof)
    palm_open: bool = False
    landmarks: Optional[list] = None        # [(x, y)] mirrored 0..1 for drawing
    connections: list = field(default_factory=list)
    brightness: float = 0.0

    def usable(self, min_conf: float) -> bool:
        return self.status == "ok" and self.present and self.confidence >= min_conf


class Tracker:
    """Base class. Subclasses fill `_state` under `_lock`."""

    mode = "none"

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._state = TrackState()
        self._preview: Optional[np.ndarray] = None

    def start(self) -> None:  # pragma: no cover - trivial
        pass

    def stop(self) -> None:  # pragma: no cover - trivial
        pass

    def set_calibration(self, cal: dict) -> None:  # pragma: no cover - trivial
        pass

    def poll(self) -> TrackState:
        """Latest state; one-shot edges are consumed so each is delivered once."""
        with self._lock:
            s = replace(self._state)
            self._state.pinch_edge = False
            self._state.raise_edge = False
            self._state.pause_request = False
        return s

    def preview(self) -> Optional[np.ndarray]:
        with self._lock:
            return None if self._preview is None else self._preview.copy()
