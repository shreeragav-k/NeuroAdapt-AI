"""Meadow Search: focused attention (visual search).

Find the one flower that differs from the rest. The meadow is calm: flowers
sway only gently, and there is no countdown.
  pace   how long the meadow waits before giving a soft hint
  load   how many flowers, and how many ways the odd one differs
  visual how alike the odd flower is to the others, plus grass and leaf detail
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5, clamp
from . import art
from .base import Game, Target

BASE = T.SKY


class MeadowSearch(Game):
    id = "meadow_search"
    name = "Meadow Search"
    skill = "Focused attention"
    target_rt = 5.0

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        n = int(round(lerp5(load, 8, 28)))
        self.hint_after = lerp5(pace, 24, 10)
        diff = lerp5(vis, 1.0, 0.42)           # smaller = more alike
        odd_col = T.mix(BASE, T.CLAY, diff)
        odd_petals = 6 + (2 if load >= 3 else 0) if diff < 0.8 else 6
        self.grass = int(lerp5(vis, 6, 60))
        area = pygame.Rect(110, 190, self.w - 220, 440)
        self.pts = self.scatter(n, area, lerp5(load, 150, 88) * 0.7 if n < 20 else 74)
        self.odd = self.rng.randrange(n)
        self.items = []
        for i, p in enumerate(self.pts):
            jitter = 0 if vis < 2.5 else self.rng.uniform(-0.25, 0.25)
            size = int(96 + (self.rng.randint(-8, 8) if vis >= 2.5 else 0))
            if i == self.odd:
                spr = art.flower(size, odd_petals, odd_col, "round", rot=jitter)
            else:
                spr = art.flower(size, 6, BASE, "round", rot=jitter)
            self.items.append({"pos": p, "spr": spr, "state": "idle", "ph": self.rng.uniform(0, 6)})
        self.set_targets([Target(i, (p[0] - 46, p[1] - 46, 92, 92)) for i, p in enumerate(self.pts)])
        self.resolved = False

    def on_target(self, target: Target, frame) -> None:
        if self.resolved:
            return
        self.resolved = True
        ok = target.id == self.odd
        self.items[target.id]["state"] = "hit" if ok else "wrong"
        rt = self.trial_t
        if ok:
            self.ctx.sounds.good()
        else:
            self.ctx.sounds.soft()
        self.finish_trial(ok, rt, say=("Sharp eyes." if ok else "Close one. Here it is."), good=ok, delay=1.3)

    def tick(self, dt: float, frame) -> None:
        if not self.resolved and self.trial_t > 45:
            self.resolved = True
            self.finish_trial(False, None, miss=True, say="That was a tricky one. Next meadow.", good=False, delay=1.1)

    def draw_scene(self, s: pygame.Surface) -> None:
        for i in range(self.grass):
            x = (i * 193) % self.w
            y = 620 + (i * 47) % 90
            sway = math.sin(self.t + i) * 5 * self.ctx.motion
            pygame.draw.line(s, (104, 150, 96), (x, y), (x + sway, y - 28 - (i % 5) * 4), 2)
        showhint = self.trial_t > self.hint_after and not self.resolved
        for i, it in enumerate(self.items):
            x, y = it["pos"]
            y = y + math.sin(self.t * 0.9 + it["ph"]) * 3 * self.ctx.motion
            if it["state"] == "hit":
                gfx.glow(s, (x, y), 100, (255, 232, 170), 0.9)
            if i == self.odd and (self.resolved or showhint):
                a = 0.6 + 0.4 * math.sin(self.t * 3) if showhint else 1.0
                gfx.glow(s, (x, y), 90, (255, 255, 255), a * 0.7)
                pygame.draw.circle(s, T.TEAL, (int(x), int(y)), 62, 3)
            spr = it["spr"]
            if it["state"] == "wrong":
                spr = spr.copy()
                spr.set_alpha(120)
            s.blit(spr, spr.get_rect(center=(int(x), int(y))))
        self.prompt(s, "Find the flower that is different")
