"""Constellation Trace: planning and sequencing.

Stars carry numbers (and later letters). Select them in order and a thread of
light draws the constellation. Mistakes simply wobble the star: the thread
keeps going, and a soft pulse marks the next star if you pause.
  pace   how soon the gentle pulse appears on the next star
  load   how many stars, and whether numbers and letters alternate
  visual how many decoy twinkles share the sky
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target

LETTERS = "ABCDEFGHIJKL"


class ConstellationTrace(Game):
    id = "constellation_trace"
    name = "Constellation Trace"
    skill = "Planning and sequencing"
    target_rt = 14.0
    default_trial_seconds = 22

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        n = int(round(lerp5(load, 5, 11)))
        self.nudge = lerp5(pace, 11, 5)
        self.twinkles = int(lerp5(vis, 0, 26))
        mixed = load >= 3.7
        labels = []
        a = b = 0
        for i in range(n):
            if mixed and i % 2 == 1:
                labels.append(LETTERS[b])
                b += 1
            else:
                a += 1
                labels.append(str(a))
        self.labels = labels
        area = pygame.Rect(150, 190, self.w - 300, 420)
        self.pts = self.scatter(n, area, 128)
        self.idx = 0
        self.errors = 0
        self.wobble: dict[int, float] = {}
        self.last_action = 0.0
        self.set_targets([Target(i, (x - 48, y - 48, 96, 96)) for i, (x, y) in enumerate(self.pts)])
        self.resolved = False
        self.tw = [(self.rng.randint(0, self.w), self.rng.randint(130, 640), self.rng.uniform(0, 6)) for _ in range(self.twinkles)]

    def on_target(self, target: Target, frame) -> None:
        if self.resolved:
            return
        self.last_action = self.trial_t
        if target.id == self.idx:
            self.idx += 1
            self.ctx.sounds.note(self.idx)
            if self.idx >= len(self.pts):
                self.resolved = True
                ok = self.errors <= 1
                self.finish_trial(ok, self.trial_t, say="The constellation is complete." if ok else "Complete. That was a tricky one.", good=True, delay=1.6)
        elif target.id > self.idx:
            self.errors += 1
            self.wobble[target.id] = 0.45
            self.ctx.sounds.soft()

    def tick(self, dt: float, frame) -> None:
        for k in list(self.wobble):
            self.wobble[k] -= dt
            if self.wobble[k] <= 0:
                del self.wobble[k]
        if not self.resolved and self.trial_t > 120:
            self.resolved = True
            self.finish_trial(False, None, miss=True, say="Let's try a fresh constellation.", good=False)

    def draw_scene(self, s: pygame.Surface) -> None:
        for x, y, ph in self.tw:
            a = 90 + int(80 * math.sin(self.t * 1.3 * max(0.2, self.ctx.motion) + ph))
            gfx.circle(s, (255, 250, 240), (x, y), 2, alpha=max(30, a))
        for i in range(1, self.idx):
            gfx.line_aa(s, (255, 244, 214), self.pts[i - 1], self.pts[i], 4, 220)
        for i in range(1, self.idx):
            pass
        pulse = (self.trial_t - self.last_action) > self.nudge and not self.resolved
        for i, (x, y) in enumerate(self.pts):
            done = i < self.idx
            dx = int(math.sin(self.t * 38) * 7) if i in self.wobble else 0
            if done or (pulse and i == self.idx):
                a = 0.9 if done else 0.45 + 0.4 * math.sin(self.t * 4)
                gfx.glow(s, (x + dx, y), 70 if done else 90, (255, 236, 190), a)
            spr = art.sparkle(86, (255, 240, 200) if done else (255, 252, 244))
            s.blit(spr, spr.get_rect(center=(x + dx, y)))
            col = T.TEAL_DEEP if not done else T.INK
            gfx.text(s, self.labels[i], T.font("display", 30), col, (x + dx, y + 52), "center")
        self.prompt(s, "Join the stars in order", sub=("Numbers and letters take turns: 1, A, 2, B…" if any(l.isalpha() for l in self.labels) else ""))
