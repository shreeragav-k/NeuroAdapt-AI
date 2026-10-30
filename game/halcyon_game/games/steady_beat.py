"""Steady Beat: sustained attention and timing.

A ring slowly closes on a circle at a perfectly even tempo. Select as it
meets the circle. Any selection works (click, tap, Space, pinch, a raised arm)
so this game suits small or large movements alike, anywhere on screen.
  pace   the tempo
  load   how precise the timing needs to be
  visual how many extra ripples share the scene
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from .base import Game


class SteadyBeat(Game):
    id = "steady_beat"
    name = "Steady Beat"
    skill = "Sustained attention and timing"
    target_rt = 0.25
    default_trial_seconds = 2

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        bpm = lerp5(pace, 46, 82)
        self.period = 60.0 / bpm
        self.window = lerp5(load, 0.42, 0.20)
        self.extra = int(lerp5(vis, 0, 5))
        self.t0 = self.t + 2.6          # lead-in so the rhythm is clear before it counts
        self.beat = 0                   # index of the next unanswered beat
        self.answered_beat = -1
        self.pulse = 0.0
        self.pulse_ok = True
        self.hist: list[bool] = []
        self.early_note = 0.0
        self.set_targets([])

    def beat_time(self, i: int) -> float:
        return self.t0 + i * self.period

    def on_anywhere(self, frame) -> None:
        if self.t < self.t0 - self.period * 0.7:
            self.early_note = 1.2
            return
        b = self.beat
        dt = self.t - self.beat_time(b)
        if dt < -self.period * 0.5:
            self.early_note = 1.2
            return
        ok = abs(dt) <= self.window
        self.pulse, self.pulse_ok = 0.5, ok
        self.hist.append(ok)
        self.beat += 1
        if ok:
            self.ctx.sounds.tick()
        say = None
        if len(self.records) % 6 == 5:
            say = "Soft and steady." if ok else "Keep the rhythm. You're doing fine."
        self.finish_trial(ok, abs(dt), say=say, good=ok, delay=0.0)

    def tick(self, dt: float, frame) -> None:
        self.pulse = max(0.0, self.pulse - dt)
        self.early_note = max(0.0, self.early_note - dt)
        if self.t < self.t0 - 0.0:
            return
        while not self.done and self.t > self.beat_time(self.beat) + self.window + 0.08:
            self.hist.append(False)
            self.beat += 1
            self.pulse, self.pulse_ok = 0.4, False
            self.finish_trial(False, None, miss=True, delay=0.0)

    def draw_scene(self, s: pygame.Surface) -> None:
        cx, cy = self.w // 2, 360
        for i in range(self.extra):
            r = 150 + ((self.t * 22 * self.ctx.motion + i * 60) % 300)
            gfx.ring(s, (255, 255, 255), (cx + (i % 2) * 460 - 230, cy + 90), r * 0.45, 2, int(120 * (1 - (r - 150) / 300)))
        # core circle
        core = 92
        gfx.glow(s, (cx, cy), 190, (255, 255, 255), 0.5 + (self.pulse * 1.2 if self.pulse_ok else 0))
        gfx.circle(s, T.TEAL if self.pulse <= 0 or self.pulse_ok else T.MUTE, (cx, cy), core, alpha=255, border=T.PAPER, border_w=6)
        gfx.circle(s, T.TEAL_DEEP, (cx, cy), core - 28, alpha=120)
        # closing ring
        if self.t >= self.t0 - self.period and not self.done:
            b = self.beat
            ph = (self.beat_time(b) - self.t) / self.period     # 1 → 0 as the beat approaches
            ph = max(-0.3, min(1.0, ph))
            r = core + 8 + max(0.0, ph) * 190
            rect = pygame.Rect(0, 0, r * 2, r * 2)
            rect.center = (cx, cy)
            a = 1.0 if ph >= 0 else max(0.0, 1 + ph / 0.3)
            ring = gfx.ss(int(r * 2) + 12, int(r * 2) + 12, lambda big, k: pygame.draw.circle(big, (*T.CHAMPAGNE, int(255 * a)), (big.get_width() // 2, big.get_height() // 2), int(r * k), 8 * k), 2)
            s.blit(ring, ring.get_rect(center=(cx, cy)))
        # beat history
        n = min(len(self.hist), 12)
        for i, ok in enumerate(self.hist[-12:]):
            x = cx - (n - 1) * 20 + i * 40
            gfx.circle(s, T.TEAL if ok else T.LINE, (x, 640), 9)
        msg = "Get ready…" if self.t < self.t0 else "Select as the ring meets the circle"
        self.prompt(s, msg, sub="Any click, tap, Space, or pinch works" if self.t >= self.t0 else "")
        if self.early_note > 0:
            gfx.text(s, "Wait for the ring", T.font("body", 24), T.INK_SOFT, (cx, 610), "center", alpha=int(255 * min(1, self.early_note)))
