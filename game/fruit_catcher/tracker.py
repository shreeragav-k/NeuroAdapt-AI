"""Hand tracking for the Fruit Catcher window: the webcam plus MediaPipe, or nothing (the arrow keys still work).

Starting the camera can take several seconds (MediaPipe is a big import, and Windows can be slow to open a
camera), so it starts in the background: the window opens at once and the preview switches on when ready.
Video frames are only shown on screen as a small preview; they are never saved or sent anywhere.
"""
from __future__ import annotations

import sys
import threading


class HandTracker:
    def __init__(self, camera_index: int = 0, enabled: bool = True) -> None:
        self.available = False
        self.starting = False
        self.reason = "Camera is switched off. Use the arrow keys."
        self._cap = None
        self._hands = None
        self._cv2 = None
        self._thread = None
        if enabled:
            self.starting = True
            self.reason = "Starting the camera…"
            self._thread = threading.Thread(target=self._start, args=(camera_index,), daemon=True)
            self._thread.start()

    def wait(self, timeout: float | None = None) -> None:
        """Block until start-up has finished (the game does not need this; the tests do)."""
        if self._thread is not None:
            self._thread.join(timeout)

    def _start(self, camera_index: int) -> None:
        try:
            try:
                import cv2
                import mediapipe as mp
            except Exception:                                  # packages not installed
                self.reason = "Hand tracking is not installed. Use the arrow keys."
                return
            try:
                self._cv2 = cv2
                hands = mp.solutions.hands.Hands(
                    static_image_mode=False, max_num_hands=1, min_detection_confidence=0.6, min_tracking_confidence=0.6)
                cap = None
                if sys.platform == "win32":                    # DirectShow opens a Windows camera much faster than the default
                    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
                    if not cap.isOpened():
                        cap.release()
                        cap = None
                if cap is None:
                    cap = cv2.VideoCapture(camera_index)
                if not cap.isOpened():
                    cap.release(); hands.close()
                    self.reason = "No camera was found. Use the arrow keys."
                    return
                self._hands, self._cap = hands, cap
                self.available = True
                self.reason = ""
            except Exception:
                self._release()
                self.reason = "The camera could not be started. Use the arrow keys."
        finally:
            self.starting = False

    def read(self):
        """-> (rgb_frame or None, wrist_x or None). wrist_x is 0 to 1 across the mirrored picture."""
        if not self.available:
            return None, None
        try:
            ok, frame = self._cap.read()
            if not ok:
                return None, None
            frame = self._cv2.flip(frame, 1)
            rgb = self._cv2.cvtColor(frame, self._cv2.COLOR_BGR2RGB)
            res = self._hands.process(rgb)
            wrist = res.multi_hand_landmarks[0].landmark[0].x if res.multi_hand_landmarks else None
            return rgb, wrist
        except Exception:
            return None, None

    def _release(self) -> None:
        try:
            if self._cap is not None:
                self._cap.release()
            if self._hands is not None:
                self._hands.close()
        except Exception:
            pass
        self._cap = self._hands = None

    def close(self) -> None:
        self.available = False
        self.wait(3)
        self._release()
