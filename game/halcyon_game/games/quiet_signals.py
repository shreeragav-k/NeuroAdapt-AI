"""Quiet Signals: response inhibition (go / no-go).

A flower appears on the pond. Golden = select it. Grey bud = let it fade.
Color is never the only cue: the golden bloom is open and star-shaped, the
bud is closed and drooping.
  pace   how long each flower stays
  load   share of buds, and whether two flowers appear together
  visual how many ripples and dragonflies share the scene
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target


class QuietSignals(Game):
    id = "quiet_signals"
    name = "Quiet Signals"
    skill = "Response inhibition"
    target_rt = 1.4

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        self.life = lerp5(pace, 3.0, 1.3)
        self.nogo_p = lerp5(load, 0.18, 0.40)
        self.pair = load >= 3.6
        self.ripples = int(lerp5(vis, 0, 6))
        self.gap = self.rng.uniform(0.7, 1.4)
        area = pygame.Rect(260, 240, self.w - 520, 300)
        n = 2 if self.pair else 1
        pts = self.scatter(n, area, 300)
        nogo_wave = self.rng.random() < self.nogo_p
        kinds = ["bud"] * n if nogo_wave else (["go"] + ["bud"] * (n - 1))
        self.rng.shuffle(kinds)
        self.stims = [{"pos": p, "kind": k, "state": "idle", "t": 0.0} for p, k in zip(pts, kinds)]
        self.nogo_wave = nogo_wave
        self.resolved = False
        self.shown = False
        self.set_targets([])

    def tick(self, dt: float, frame) -> None:
        for st in self.stims:
            st["t"] += dt
        if not self.shown and self.trial_t >= self.gap:
            self.shown = True
            self.t_show = self.trial_t
            self.set_targets([Target(i, (st["pos"][0] - 75, st["pos"][1] - 75, 150, 150)) for i, st in enumerate(self.stims)])
        if self.shown and not self.resolved and self.trial_t - self.t_show >= self.life:
            self.resolved = True
            if self.nogo_wave:
                self.finish_trial(True, None, say="Nicely waited.", delay=0.9)
            else:
                self.finish_trial(False, None, miss=True, say="That one drifted by. Here comes another.", good=False, delay=0.9)
            self.set_targets([])

    def _choose(self, idx: int) -> None:
        if not self.shown or self.resolved:
            return
        st = self.stims[idx]
        self.resolved = True
        rt = self.trial_t - self.t_show
        if st["kind"] == "go":
            st["state"] = "hit"
            self.ctx.sounds.good()
            self.finish_trial(True, rt, say=self.rng.choice(["Lovely.", "Gathered.", "Nice and steady."]), delay=0.9)
        else:
            st["state"] = "wrong"
            self.ctx.sounds.soft()
            self.finish_trial(False, rt, say="That one was resting. No problem.", good=False, delay=0.9)
        self.set_targets([])

    def on_target(self, target: Target, frame) -> None:
        self._choose(target.id)

    def on_anywhere(self, frame) -> None:
        if len(self.stims) == 1 and self.shown and not self.resolved and not any(t.hit(p) for p in frame.clicks for t in self.targets):
            self._choose(0)

    def draw_scene(self, s: pygame.Surface) -> None:
        for i in range(self.ripples):
            r = (self.t * 18 * self.ctx.motion + i * 70) % 260
            cx = 220 + (i * 211) % (self.w - 440)
            cy = 560 + (i * 37) % 90
            gfx.ring(s, (255, 255, 255), (cx, cy), 20 + r * 0.5, 2, int(110 * (1 - r / 260)))
        if self.shown or self.resolved:
            for st in self.stims:
                x, y = st["pos"]
                y += self.bob(x, 4)
                shadow = gfx.ellipse_shadow(150, 36, 50)
                s.blit(shadow, shadow.get_rect(center=(x, y + 56)))
                pad = art.lily_pad(150)
                s.blit(pad, pad.get_rect(center=(x, y + 20)))
                if st["kind"] == "go":
                    if st["state"] == "hit":
                        gfx.glow(s, (x, y), 120, (255, 220, 140), 0.9)
                    f = art.lotus(120, T.AMBER)
                else:
                    f = art.bud(120)
                if st["state"] == "wrong":
                    f = f.copy()
                    f.set_alpha(150)
                fade = 1.0
                if self.nogo_wave or st["kind"] == "bud":
                    fade = max(0.35, 1 - max(0.0, (self.trial_t - self.t_show) / self.life - 0.55) * 1.5)
                if fade < 1:
                    f = f.copy()
                    f.set_alpha(int(255 * fade))
                s.blit(f, f.get_rect(center=(x, y)))
        self.prompt(s, "Golden: select.  Grey bud: wait.")
