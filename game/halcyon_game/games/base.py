"""Game framework.

A game is a sequence of short trials. The base class owns everything that
should feel identical across games: pacing between trials, gentle feedback,
the difficulty staircase used during the first five games, keyboard focus,
and the rule that a missed movement is *not* a thinking mistake when camera
tracking was unreliable.
"""
from __future__ import annotations

import math
import random
import statistics
from dataclasses import dataclass
from typing import Optional

import pygame

from .. import gfx, theme as T
from ..adaptive import SessionSummary, clamp, lerp5
from ..input_manager import Frame
from ..ui import FocusGroup


class Target:
    """Something that can be selected: a lantern, a basket, an answer tile."""

    def __init__(self, tid, rect, data=None):
        self.id = tid
        self.rect = pygame.Rect(rect)
        self.data = data
        self.enabled = True

    def hit(self, pos, slop: int = 14) -> bool:
        return self.enabled and pos is not None and self.rect.inflate(slop * 2, slop * 2).collidepoint(pos)


@dataclass
class TrialRecord:
    correct: bool
    rt: Optional[float]
    valid: bool


@dataclass
class Ctx:
    size: tuple
    sounds: object
    motion: float          # 0 off, 0.5 gentle, 1 full
    prefs: dict
    cfg: object


class Game:
    id = ""
    name = ""
    skill = ""
    target_rt = 3.0
    default_trial_seconds = 10

    def __init__(self, ctx: Ctx, dims: dict, trials: int, staircase: bool = False):
        self.ctx = ctx
        self.w, self.h = ctx.size
        self.dims = dict(dims)
        self.n_trials = trials
        self.staircase = staircase
        self.stair = 0.0
        self._streak = 0
        self.records: list[TrialRecord] = []
        self.done = False
        self.t = 0.0
        self.trial_t = 0.0
        self.targets: list[Target] = []
        self.focus = FocusGroup([])
        self._wait = 0.0
        self._started = False
        self.toast_text = ""
        self.toast_t = 0.0
        self.toast_good = True
        self.cam_frames = 0
        self.cam_good = 0
        self._rel_bad = False
        self.frame_cursor = None
        self.rng = random.Random()

    # ------------------------------------------------------- difficulty
    def eff(self, dim: str) -> float:
        return clamp(self.dims.get(dim, 2) + self.stair)

    def final_level_f(self) -> float:
        return clamp(sum(self.dims.values()) / max(1, len(self.dims)) + self.stair)

    def _stair_update(self, correct: bool) -> None:
        if not self.staircase:
            return
        if correct:
            self._streak += 1
            if self._streak >= 2:
                self.stair = min(1.5, self.stair + 0.4)
                self._streak = 0
        else:
            self._streak = 0
            self.stair = max(-1.0, self.stair - 0.4)

    # ---------------------------------------------------------- lifecycle
    def start_trial(self) -> None:  # override
        raise NotImplementedError

    def tick(self, dt: float, frame: Frame) -> None:  # override
        pass

    def draw_scene(self, s: pygame.Surface) -> None:  # override
        pass

    def on_target(self, target: Target, frame: Frame) -> None:
        pass

    def on_side(self, side: str, frame: Frame) -> None:
        pass

    def on_anywhere(self, frame: Frame) -> None:
        pass

    def set_targets(self, targets: list[Target]) -> None:
        self.targets = targets
        self.focus.items = targets
        self.focus.index = 0

    # ----------------------------------------------------------- trial end
    def finish_trial(self, correct: bool, rt: Optional[float] = None, miss: bool = False, say: Optional[str] = None, good: bool = True, delay: float = 1.1) -> None:
        valid = not (miss and self._rel_bad)
        self.records.append(TrialRecord(correct, rt, valid))
        if valid:
            self._stair_update(correct)
        if say:
            self.say(say, good)
        self._wait = delay
        if delay <= 0 and len(self.records) >= self.n_trials:
            self.done = True   # continuous games (rhythm) end without a pause

    def say(self, text: str, good: bool = True, secs: float = 1.5) -> None:
        self.toast_text, self.toast_t, self.toast_good = text, secs, good

    @property
    def trial_index(self) -> int:
        return len(self.records)

    def progress(self) -> tuple:
        return min(len(self.records), self.n_trials), self.n_trials

    # -------------------------------------------------------------- update
    def update(self, dt: float, frame: Frame) -> None:
        self.t += dt
        self.frame_cursor = frame.cursor
        if frame.camera_expected:
            self.cam_frames += 1
            if frame.track.usable(self.ctx.cfg.min_confidence):
                self.cam_good += 1
            if not frame.reliable:
                self._rel_bad = True
        if self.toast_t > 0:
            self.toast_t -= dt
        if self.ensure_started():
            return
        if self.done:
            return
        if self._wait > 0:
            self._wait -= dt
            if self._wait <= 0:
                if len(self.records) >= self.n_trials:
                    self.done = True
                else:
                    self._rel_bad = False
                    self.trial_t = 0.0
                    self.start_trial()
            else:
                self.tick_wait(dt, frame)
            return
        self.trial_t += dt
        hit = self.focus.update(frame) if self.targets else None
        if hit is not None:
            self.on_target(hit, frame)
        if frame.left:
            self.on_side("left", frame)
        if frame.right:
            self.on_side("right", frame)
        if frame.anywhere:
            self.on_anywhere(frame)
        if self._wait <= 0 and not self.done:
            self.tick(dt, frame)

    def tick_wait(self, dt: float, frame: Frame) -> None:
        """Animations that continue between trials."""

    def ensure_started(self) -> bool:
        """Build the first trial lazily; returns True if this call built it."""
        if self._started:
            return False
        self._started = True
        self.start_trial()
        return True

    # ---------------------------------------------------------------- draw
    def draw(self, s: pygame.Surface) -> None:
        self.ensure_started()
        s.blit(gfx.scenery(self.id, self.ctx.size), (0, 0))
        self.draw_scene(s)
        if self.focus.visible and self.targets and self._wait <= 0:
            t = self.targets[min(self.focus.index, len(self.targets) - 1)]
            pygame.draw.rect(s, T.TEAL, t.rect.inflate(18, 18), 4, border_radius=18)
        self._draw_toast(s)

    def prompt(self, s: pygame.Surface, text: str, sub: str = "") -> None:
        f = T.font("display", 34)
        tw = f.size(text)[0]
        rect = pygame.Rect(0, 0, tw + 64, 66 if not sub else 92)
        rect.midtop = (self.w // 2, 22)
        gfx.draw_rrect(s, rect, T.PAPER, radius=24, shadow=14, alpha=238)
        gfx.text(s, text, f, T.INK, (rect.centerx, rect.y + (34 if not sub else 30)), "center")
        if sub:
            gfx.text(s, sub, T.font("body", 19), T.INK_SOFT, (rect.centerx, rect.y + 66), "center")

    def _draw_toast(self, s: pygame.Surface) -> None:
        if self.toast_t <= 0 or not self.toast_text:
            return
        a = int(255 * min(1, self.toast_t / 0.4))
        f = T.font("strong", 26)
        tw = f.size(self.toast_text)[0]
        pad = 40
        layer = pygame.Surface((tw + 56 + pad * 2, 56 + pad * 2), pygame.SRCALPHA)
        rect = pygame.Rect(pad, pad, tw + 56, 56)
        gfx.draw_rrect(layer, rect, T.PAPER, radius=28, shadow=12)
        col = T.TEAL_DEEP if self.toast_good else T.INK_SOFT
        gfx.text(layer, self.toast_text, f, col, rect.center, "center")
        layer.set_alpha(a)
        s.blit(layer, layer.get_rect(midbottom=(self.w // 2, self.h - 14)))

    # ------------------------------------------------------------- summary
    def summary(self, input_mode: str, break_requests: int, feedback: Optional[str], reliability: Optional[float]) -> SessionSummary:
        valid = [r for r in self.records if r.valid]
        correct = sum(1 for r in valid if r.correct)
        rts = [r.rt for r in valid if r.correct and r.rt is not None]
        return SessionSummary(
            game_id=self.id,
            trials=len(self.records),
            valid_trials=len(valid),
            correct=correct,
            median_rt=statistics.median(rts) if rts else None,
            target_rt=self.target_rt,
            completed=self.done,
            tracking_reliability=reliability,
            break_requests=break_requests,
            feedback=feedback,
            final_level_f=self.final_level_f(),
            input_mode=input_mode,
            dims_used={k: int(round(self.eff(k))) for k in self.dims},
        )

    # -------------------------------------------------------------- helpers
    def bob(self, phase: float = 0.0, amp: float = 6.0, speed: float = 1.2) -> float:
        return math.sin(self.t * speed + phase) * amp * self.ctx.motion

    def scatter(self, n: int, area: pygame.Rect, min_dist: float, avoid: Optional[list] = None, tries: int = 600) -> list:
        pts: list = []
        md = min_dist
        guard = 0
        while len(pts) < n and guard < tries:
            guard += 1
            p = (self.rng.randint(area.left, area.right), self.rng.randint(area.top, area.bottom))
            if all(math.hypot(p[0] - q[0], p[1] - q[1]) >= md for q in pts + (avoid or [])):
                pts.append(p)
            if guard % 60 == 0:
                md *= 0.9
        while len(pts) < n:
            pts.append((self.rng.randint(area.left, area.right), self.rng.randint(area.top, area.bottom)))
        return pts


def trials_for(trial_seconds: float, session_minutes: float, lo: int = 5, hi: int = 30) -> int:
    return int(max(lo, min(hi, round(session_minutes * 60 / max(1.0, trial_seconds)))))
