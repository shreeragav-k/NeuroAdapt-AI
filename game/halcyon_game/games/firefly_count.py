"""Firefly Count: quick counting.

A few fireflies glow inside a jar for a moment, then fade. How many were there?
  pace   how long they glow
  load   how many fireflies
  visual whether they sit in an easy-to-read pattern or scatter, and how much
         dim shimmer is in the jar
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target

DICE = {
    1: [(0, 0)], 2: [(-1, -1), (1, 1)], 3: [(-1, -1), (0, 0), (1, 1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
    5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], 6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)],
}


class FireflyCount(Game):
    id = "firefly_count"
    name = "Firefly Count"
    skill = "Quick counting"
    target_rt = 3.0

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        self.n = int(round(lerp5(load, 2, 8)))
        self.glow_s = lerp5(pace, 1.9, 0.7)
        self.shimmer = int(lerp5(vis, 0, 12))
        cx, cy = self.w // 2, 330
        self.jar_rect = pygame.Rect(cx - 190, 150, 380, 360)
        if vis < 2.6 and self.n in DICE:
            self.pts = [(cx + dx * 80, cy + dy * 80) for dx, dy in DICE[self.n]]
        else:
            self.pts = self.scatter(self.n, pygame.Rect(cx - 140, 230, 280, 230), 62)
        self.phase = "lights"
        opts = {self.n}
        step = 1
        while len(opts) < (3 if load < 3 else 4):
            for d in (-step, step):
                v = self.n + d
                if v >= 1 and len(opts) < (3 if load < 3 else 4):
                    opts.add(v)
            step += 1
        self.options = sorted(opts)
        self.bg_dots = [(self.rng.randint(cx - 150, cx + 150), self.rng.randint(220, 470), self.rng.uniform(0, 6)) for _ in range(self.shimmer)]
        k = len(self.options)
        bw, gap = 150, 24
        x0 = cx - (k * bw + (k - 1) * gap) // 2
        self.btns = [Target(v, (x0 + i * (bw + gap), 560, bw, 110)) for i, v in enumerate(self.options)]
        self.set_targets([])
        self.resolved = False
        self.pick = None
        self.ready_t = 0.6

    def tick(self, dt: float, frame) -> None:
        if self.phase == "lights":
            if self.trial_t > self.ready_t + self.glow_s:
                self.phase = "answer"
                self.answer_t0 = self.trial_t
                self.set_targets(self.btns)
        elif not self.resolved and self.trial_t - self.answer_t0 > 40:
            self.resolved = True
            self.finish_trial(False, None, miss=True, say="Let's try a new jar.", good=False)

    def on_target(self, target: Target, frame) -> None:
        self._pick(target.id)

    def _pick(self, v: int) -> None:
        if self.phase != "answer" or self.resolved or v not in self.options:
            return
        self.resolved = True
        self.pick = v
        ok = v == self.n
        if ok:
            self.ctx.sounds.good()
        else:
            self.ctx.sounds.soft()
        self.finish_trial(ok, self.trial_t - self.answer_t0, say=("Yes, that many." if ok else f"There were {self.n}. Nicely tried."), good=ok, delay=1.3)

    def tick_wait(self, dt, frame) -> None:
        pass

    def update(self, dt, frame) -> None:
        if frame.digit is not None and self.phase == "answer":
            self._pick(frame.digit)
        super().update(dt, frame)

    def draw_scene(self, s: pygame.Surface) -> None:
        cx = self.w // 2
        jar = art.jar(380, 380)
        s.blit(jar, jar.get_rect(midtop=(cx, 140)))
        for x, y, ph in self.bg_dots:
            a = 50 + int(30 * math.sin(self.t * 1.6 * max(0.2, self.ctx.motion) + ph))
            gfx.circle(s, (255, 244, 210), (x, y), 3, alpha=a)
        lights_on = self.phase == "lights" and self.trial_t > self.ready_t
        show_after = self.resolved
        if lights_on or show_after:
            fade = 1.0
            if lights_on:
                u = (self.trial_t - self.ready_t) / self.glow_s
                fade = 1.0 if u < 0.7 else max(0.0, 1 - (u - 0.7) / 0.3)
            for (x, y) in self.pts:
                gfx.glow(s, (x, y), 64, (255, 224, 140), 0.85 * fade, 1.7)
                o = art.orb(14, (255, 212, 110))
                o = o.copy()
                o.set_alpha(int(255 * fade))
                s.blit(o, o.get_rect(center=(x, y)))
        if self.phase == "lights":
            self.prompt(s, "Watch the fireflies")
        else:
            self.prompt(s, "How many were there?", sub="You can also press a number key")
            for t in self.btns:
                chosen = self.resolved and t.id == self.pick
                good = self.resolved and t.id == self.n
                gfx.draw_rrect(s, t.rect, T.TEAL if good else T.PAPER, radius=26, shadow=12, border=T.TEAL if not good else None, border_w=3)
                gfx.text(s, str(t.id), T.font("display", 54), T.CREAM_TEXT if good else (T.MUTE if chosen else T.TEAL_DEEP), t.rect.center, "center")
