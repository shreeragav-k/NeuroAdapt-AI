"""MediaPipe hand / pose tracker.

Hands mode (default): seated, small-range. Cursor sits between thumb and index
fingertip. A pinch selects. Holding an open palm requests a pause.
Pose mode: standing or larger movement. Cursor follows the more visible wrist.
Selecting uses a short hold (dwell) or a raised arm; leaning the torso left or
right gives left / right for choice games.

Frames are processed in memory only. No video or image is ever saved.
"""
from __future__ import annotations

import math
import sys
import threading
import time
from typing import Optional

import numpy as np

from ..config import Config
from .base import GUIDANCE, HAND_CONNECTIONS, POSE_CONNECTIONS, TrackState, Tracker

try:  # imported lazily so the game still runs without the camera stack
    import cv2
    import mediapipe as mp

    AVAILABLE = True
except Exception:  # pragma: no cover - environment dependent
    cv2 = None  # type: ignore
    mp = None  # type: ignore
    AVAILABLE = False


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


class MediaPipeTracker(Tracker):
    def __init__(self, mode: str, cfg: Config, calibration: dict):
        super().__init__()
        self.mode = mode if mode in ("hands", "pose") else "hands"
        self.cfg = cfg
        self.cal = dict(calibration)
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._cursor: Optional[tuple] = None
        self._pinching = False
        self._palm_since: Optional[float] = None
        self._raised = False
        self._lean_base: Optional[float] = None
        self._lean = 0
        self._missed = 0
        self._frames = 0
        self._fps_t = time.time()
        self._fps = 0.0
        self._detector = None
        with self._lock:
            self._state.mode = self.mode
            self._state.status = "starting"
            self._state.message = GUIDANCE["starting"]

    # ------------------------------------------------------------ control
    def set_calibration(self, cal: dict) -> None:
        self.cal = dict(cal)

    def start(self) -> None:
        if self._thread:
            return
        self._thread = threading.Thread(target=self._run, name="halcyon-tracker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None

    def _set(self, **kw) -> None:
        with self._lock:
            for k, v in kw.items():
                setattr(self._state, k, v)

    # ---------------------------------------------------------- capture
    def _open(self):
        backend = cv2.CAP_DSHOW if sys.platform.startswith("win") else 0
        cap = cv2.VideoCapture(self.cfg.camera_index, backend) if backend else cv2.VideoCapture(self.cfg.camera_index)
        if cap is not None and cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.cfg.camera_width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.cfg.camera_height)
            return cap
        return None

    def _build_detector(self):
        if self.mode == "pose":
            return mp.solutions.pose.Pose(model_complexity=0, smooth_landmarks=True, min_detection_confidence=0.5, min_tracking_confidence=0.5)
        return mp.solutions.hands.Hands(max_num_hands=1, model_complexity=0, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    def _run(self) -> None:
        if not AVAILABLE:
            self._set(status="unsupported", message=GUIDANCE["unsupported"])
            return
        cap = self._open()
        if cap is None:
            self._set(status="no_camera", message=GUIDANCE["no_camera"])
            return
        try:
            self._detector = self._build_detector()
        except Exception:
            self._set(status="unsupported", message=GUIDANCE["unsupported"])
            cap.release()
            return
        failures = 0
        while not self._stop.is_set():
            ok, frame = cap.read()
            if not ok or frame is None:
                failures += 1
                if failures > 40:
                    self._set(status="error", message=GUIDANCE["error"], present=False)
                time.sleep(0.03)
                continue
            failures = 0
            self.process_frame(frame)
        cap.release()
        if self._detector is not None:
            self._detector.close()

    # ------------------------------------------------------- per frame
    def process_frame(self, frame_bgr: np.ndarray) -> None:
        """Analyse one BGR frame. Public so tests can feed synthetic frames."""
        frame = cv2.flip(frame_bgr, 1)  # selfie view
        h, w = frame.shape[:2]
        brightness = float(frame.mean()) if frame.size else 0.0
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        preview = cv2.resize(rgb, (320, 240))
        try:
            res = self._detector.process(rgb) if self._detector else None
        except Exception:
            res = None

        info = self._analyze_pose(res) if self.mode == "pose" else self._analyze_hand(res, w, h)

        self._frames += 1
        now = time.time()
        if now - self._fps_t >= 1.0:
            self._fps = self._frames / (now - self._fps_t)
            self._frames, self._fps_t = 0, now

        with self._lock:
            self._preview = preview
            st = self._state
            st.brightness = brightness
            st.fps = self._fps
            if info is None:
                self._missed += 1
                if self._missed > 8:
                    st.present = False
                    st.landmarks = None
                    st.pinching = False
                    st.palm_hold = 0.0
                    st.confidence = 0.0
                    dark = brightness < self.cfg.low_light_threshold
                    st.status = "low_light" if dark else "lost"
                    st.message = GUIDANCE["low_light"] if dark else GUIDANCE["lost" if self.mode == "hands" else "lost_pose"]
                return
            self._missed = 0
            st.present = True
            st.status = "ok"
            st.message = GUIDANCE["low_light"] if brightness < self.cfg.low_light_threshold else GUIDANCE["ok"]
            st.cursor = info["cursor"]
            st.raw = info["raw"]
            st.confidence = info["confidence"]
            st.landmarks = info["landmarks"]
            st.connections = HAND_CONNECTIONS if self.mode == "hands" else POSE_CONNECTIONS
            st.palm_hold = info.get("palm_hold", 0.0)
            st.pinch_ratio = info.get("pinch_ratio", st.pinch_ratio)
            st.pinch_ratio_img = info.get("pinch_ratio_img", st.pinch_ratio_img)
            st.pinch_ratio_world = info.get("pinch_ratio_world", st.pinch_ratio_world)
            st.palm_open = info.get("palm_open", False)
            st.lean = info.get("lean", 0)
            if info.get("pinching") is not None:
                if info["pinching"] and not st.pinching:
                    st.pinch_edge = True
                st.pinching = info["pinching"]
            if info.get("raise_edge"):
                st.raise_edge = True
            if info.get("pause"):
                st.pause_request = True

    # ---------------------------------------------------------- mapping
    def _map(self, rx: float, ry: float, pinching: bool = False) -> tuple:
        c = self.cal
        tx = _clamp01((rx - c["xmin"]) / max(0.05, c["xmax"] - c["xmin"]))
        ty = _clamp01((ry - c["ymin"]) / max(0.05, c["ymax"] - c["ymin"]))
        g = self.cfg.gestures
        a = float(g.get("smoothing_pinch", 0.28)) if pinching else float(g.get("smoothing", 0.45))
        if self._cursor is None:
            self._cursor = (tx, ty)
        else:
            self._cursor = (self._cursor[0] + (tx - self._cursor[0]) * a, self._cursor[1] + (ty - self._cursor[1]) * a)
        return self._cursor

    def _analyze_hand(self, res, w: int, h: int):
        if not res or not res.multi_hand_landmarks:
            self._palm_since = None
            return None
        lm = res.multi_hand_landmarks[0].landmark
        conf = float(res.multi_handedness[0].classification[0].score) if res.multi_handedness else 0.8

        def d(a, b):
            return math.hypot((lm[a].x - lm[b].x) * w, (lm[a].y - lm[b].y) * h)

        size = max(1.0, d(0, 9))
        ratio_img = d(4, 8) / size
        ratio_world = ratio_img
        wl = getattr(res, "multi_hand_world_landmarks", None)
        if wl:
            w3 = wl[0].landmark

            def d3(a, b):
                return math.sqrt((w3[a].x - w3[b].x) ** 2 + (w3[a].y - w3[b].y) ** 2 + (w3[a].z - w3[b].z) ** 2)

            ratio_world = d3(4, 8) / max(1e-6, d3(0, 9))
        ratio = ratio_world if getattr(self.cfg, "pinch_metric", "image") == "world" else ratio_img
        if self._pinching:
            pinching = ratio < self.cfg.pinch_off
        else:
            pinching = ratio < self.cfg.pinch_on
        self._pinching = pinching

        rx = (lm[4].x + lm[8].x) / 2
        ry = (lm[4].y + lm[8].y) / 2
        cursor = self._map(rx, ry, pinching)

        # Open palm: four fingers clearly extended and thumb away from the index.
        extended = all(lm[t].y < lm[p].y - 0.02 for t, p in ((8, 6), (12, 10), (16, 14), (20, 18)))
        palm_open = extended and ratio > 0.8
        hold = 0.0
        pause = False
        if self.cfg.gestures.get("pause") == "open_palm_hold" and palm_open:
            if self._palm_since is None:
                self._palm_since = time.time()
            hold = min(1.0, (time.time() - self._palm_since) / float(self.cfg.gestures.get("palm_hold_seconds", 1.6)))
            if hold >= 1.0:
                pause = True
                self._palm_since = None
        else:
            self._palm_since = None

        return {
            "cursor": cursor,
            "raw": (rx, ry),
            "confidence": conf,
            "pinching": pinching,
            "landmarks": [(p.x, p.y) for p in lm],
            "palm_hold": hold,
            "pause": pause,
            "pinch_ratio": ratio,
            "pinch_ratio_img": ratio_img,
            "pinch_ratio_world": ratio_world,
            "palm_open": palm_open,
        }

    def _analyze_pose(self, res):
        if not res or not res.pose_landmarks:
            return None
        lm = res.pose_landmarks.landmark
        lw, rw = lm[15], lm[16]
        wrist = rw if rw.visibility >= lw.visibility else lw
        conf = float(wrist.visibility)
        shoulder_y = (lm[11].y + lm[12].y) / 2
        cursor = self._map(wrist.x, wrist.y)

        raised = wrist.y < shoulder_y - 0.04
        raise_edge = raised and not self._raised
        self._raised = raised

        mid_x = (lm[11].x + lm[12].x) / 2
        if self._lean_base is None:
            self._lean_base = mid_x
        thr = float(self.cfg.gestures.get("lean_threshold", 0.12))
        off = mid_x - self._lean_base
        if abs(off) < thr * 0.5:
            self._lean_base += (mid_x - self._lean_base) * 0.02   # slow re-centering
            self._lean = 0
        elif off > thr:
            self._lean = 1
        elif off < -thr:
            self._lean = -1
        return {
            "cursor": cursor,
            "raw": (wrist.x, wrist.y),
            "confidence": conf,
            "pinching": None,
            "raise_edge": raise_edge,
            "landmarks": [(p.x, p.y) for p in lm],
            "lean": self._lean,
        }
