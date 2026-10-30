"""One input layer for every game.

Mouse, touch, keyboard and camera movement are all reduced to the same small
set of actions, so every game and every level works with any of them:

  clicks    positions where something was selected (click, tap, pinch, hold)
  anywhere  a selection happened and the position does not matter
  left/right  a choice made with arrow keys, A/D, or leaning (pose mode)
  nav       keyboard focus movement (arrow keys)
  activate  Enter / Space on the focused item
  pause     Esc, P, or holding an open palm
"""
from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import pygame

from .config import Config
from .tracking.base import TrackState, Tracker


@dataclass
class Frame:
    cursor: Optional[tuple] = None
    clicks: list = field(default_factory=list)
    anywhere: bool = False
    activate: bool = False
    nav: tuple = (0, 0)
    left: bool = False
    right: bool = False
    pause: bool = False
    digit: Optional[int] = None
    source: str = "mouse"           # mouse | touch | keyboard | camera
    track: TrackState = field(default_factory=TrackState)
    dwell: float = 0.0              # 0..1 progress of a hold-to-select
    dwell_pos: Optional[tuple] = None
    palm_hold: float = 0.0
    reliable: bool = True           # False when camera is expected but not trustworthy right now
    camera_expected: bool = False

    @property
    def any_select(self) -> bool:
        return bool(self.clicks) or self.anywhere or self.activate


class InputManager:
    def __init__(self, tracker: Tracker, cfg: Config, prefs: dict, size: tuple):
        self.tracker = tracker
        self.cfg = cfg
        self.prefs = prefs
        self.size = size
        self.select_method = prefs.get("select_method", "pinch")
        self.mouse_pos: Optional[tuple] = None
        self.source = "mouse"
        self._events: list[pygame.event.Event] = []
        self._rel = deque(maxlen=60)
        self._last_noncam = 0.0
        self._cam_cursor: Optional[tuple] = None
        self._dwell_anchor: Optional[tuple] = None
        self._dwell_t = 0.0
        self._dwell_cool = 0.0
        self._prev_lean = 0
        self.track = TrackState()

    # --------------------------------------------------------------- events
    def feed(self, events) -> None:
        self._events = list(events)

    @property
    def camera_expected(self) -> bool:
        """True when the player has chosen movement input and isn't currently using mouse / keys."""
        if self.prefs.get("movement_mode", "none") == "none" or self.tracker.mode == "none":
            return False
        return (time.time() - self._last_noncam) > 8.0

    @property
    def reliable_recent(self) -> bool:
        if not self.camera_expected:
            return True
        if not self._rel:
            return False
        return sum(self._rel) / len(self._rel) >= 0.7

    # --------------------------------------------------------------- update
    def update(self, dt: float) -> Frame:
        f = Frame()
        now = time.time()
        for e in self._events:
            if e.type == pygame.MOUSEMOTION:
                self.mouse_pos = e.pos
                if getattr(e, "touch", False):
                    self.source = "touch"
                else:
                    self.source = "mouse"
                self._last_noncam = now
            elif e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
                self.mouse_pos = e.pos
                f.clicks.append(e.pos)
                f.anywhere = True
                self.source = "touch" if getattr(e, "touch", False) else "mouse"
                self._last_noncam = now
            elif e.type == pygame.KEYDOWN:
                self.source = "keyboard"
                self._last_noncam = now
                k = e.key
                if k in (pygame.K_ESCAPE, pygame.K_p):
                    f.pause = True
                elif k in (pygame.K_RETURN, pygame.K_SPACE, pygame.K_KP_ENTER):
                    f.activate = True
                    f.anywhere = True
                elif k in (pygame.K_LEFT, pygame.K_a):
                    f.left = True
                    f.nav = (-1, f.nav[1])
                elif k in (pygame.K_RIGHT, pygame.K_d):
                    f.right = True
                    f.nav = (1, f.nav[1])
                elif k in (pygame.K_UP, pygame.K_w):
                    f.nav = (f.nav[0], -1)
                elif k in (pygame.K_DOWN, pygame.K_s):
                    f.nav = (f.nav[0], 1)
                elif pygame.K_0 <= k <= pygame.K_9:
                    f.digit = k - pygame.K_0
                elif pygame.K_KP0 <= k <= pygame.K_KP9:
                    f.digit = k - pygame.K_KP0

        w, h = self.size
        # Camera
        ts = self.tracker.poll()
        self.track = ts
        f.track = ts
        cam_active = ts.status == "ok" and ts.present and ts.cursor is not None
        if self.camera_expected:
            self._rel.append(1 if ts.usable(self.cfg.min_confidence) else 0)
        if cam_active:
            cx, cy = ts.cursor[0] * w, ts.cursor[1] * h
            moved = self._cam_cursor is None or abs(cx - self._cam_cursor[0]) + abs(cy - self._cam_cursor[1]) > 6
            self._cam_cursor = (cx, cy)
            if moved and (time.time() - self._last_noncam) > 1.2:
                self.source = "camera"
            if self.source == "camera":
                f.cursor = (cx, cy)
                method = self.select_method if self.tracker.mode == "hands" else "dwell"
                if ts.pinch_edge and method in ("pinch", "both"):
                    f.clicks.append((cx, cy))
                    f.anywhere = True
                if ts.raise_edge:
                    f.anywhere = True
                if method in ("dwell", "both"):
                    self._dwell(f, (cx, cy), dt)
                if ts.lean != self._prev_lean:
                    if ts.lean == -1:
                        f.left = True
                    elif ts.lean == 1:
                        f.right = True
                self._prev_lean = ts.lean
                f.palm_hold = ts.palm_hold
                if ts.pause_request:
                    f.pause = True
        else:
            self._cam_cursor = None
            self._dwell_anchor = None
        if f.cursor is None:
            f.cursor = self.mouse_pos
        f.source = self.source
        f.reliable = self.reliable_recent
        f.camera_expected = self.camera_expected
        self._events = []
        return f

    # ----------------------------------------------------------------- dwell
    def _dwell(self, f: Frame, pos: tuple, dt: float) -> None:
        secs = float(self.cfg.gestures.get("dwell_seconds", 0.9))
        radius = float(self.cfg.gestures.get("dwell_radius", 60))
        self._dwell_cool = max(0.0, self._dwell_cool - dt)
        if self._dwell_anchor is None or abs(pos[0] - self._dwell_anchor[0]) + abs(pos[1] - self._dwell_anchor[1]) > radius:
            self._dwell_anchor, self._dwell_t = pos, 0.0
            return
        if self._dwell_cool > 0:
            return
        self._dwell_t += dt
        f.dwell = min(1.0, self._dwell_t / secs)
        f.dwell_pos = self._dwell_anchor
        if self._dwell_t >= secs:
            f.clicks.append(self._dwell_anchor)
            f.anywhere = True
            self._dwell_t = 0.0
            self._dwell_cool = 0.8
            self._dwell_anchor = None
