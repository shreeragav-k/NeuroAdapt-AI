"""Lantern Memory: working memory.

Lanterns glow one at a time. After a pause the player lights them in the same
order. No timer pressure: the recall phase waits for the player.
  pace   how long each lantern glows
  load   how many lanterns are in the sequence and on screen
  visual how many drifting petals share the scene
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target

COLORS = [T.AMBER, T.ROSE, T.SAGE, T.SKY, T.DUSK, T.CLAY]


class LanternMemory(Game):
    id = "lantern_memory"
    name = "Lantern Memory"
    skill = "Working memory"
    target_rt = 3.0

    def start_trial(self) -> None:
        load, pace, vis = self.eff("load"), self.eff("pace"), self.eff("visual")
        self.count = 4 if load < 2.5 else 5 if load < 4.2 else 6
        self.length = int(round(lerp5(load, 2, 6)))
        self.show_s = lerp5(pace, 1.1, 0.52)
        self.petals = int(lerp5(vis, 0, 12))
        n = self.count
        xs = [int(190 + i * (self.w - 380) / (n - 1)) for i in range(n)]
        self.pos = []
        for i, x in enumerate(xs):
            u = 2 * i / (n - 1) - 1
            self.pos.append((x, int(380 + 60 * u * u)))
        self.set_targets([Target(i, (x - 70, y - 105, 140, 210)) for i, (x, y) in enumerate(self.pos)])
        seq: list[int] = []
        while len(seq) < self.length:
            c = self.rng.randrange(n)
            if not seq or c != seq[-1]:
                seq.append(c)
        self.seq = seq
        self.state = "ready"
        self.sub_t = 0.9
        self.show_i = 0
        self.show_phase = "gap"
        self.lit = None
        self.recall_i = 0
        self.recall_t0 = 0.0
        self.flash: dict[int, float] = {}
        self.shake: dict[int, float] = {}

    # ---------------------------------------------------------------- logic
    def tick(self, dt: float, frame) -> None:
        for d in (self.flash, self.shake):
            for k in list(d):
                d[k] -= dt
                if d[k] <= 0:
                    del d[k]
        if self.state == "ready":
            self.sub_t -= dt
            if self.sub_t <= 0:
                self.state, self.sub_t, self.show_phase = "show", 0.35, "gap"
        elif self.state == "show":
            self.sub_t -= dt
            if self.sub_t > 0:
                return
            if self.show_phase == "gap":
                if self.show_i >= self.length:
                    self.state, self.lit = "recall", None
                    self.recall_t0 = self.trial_t
                    return
                self.lit = self.seq[self.show_i]
                self.ctx.sounds.note(self.lit)
                self.show_phase, self.sub_t = "on", self.show_s
            else:
                self.lit = None
                self.show_i += 1
                self.show_phase, self.sub_t = "gap", 0.3
        elif self.state == "recall" and self.trial_t - self.recall_t0 > 45:
            self.finish_trial(False, miss=True, say="No rush. Let's try the next one.", good=False)

    def on_target(self, target: Target, frame) -> None:
        if self.state != "recall":
            return
        i = target.id
        self.flash[i] = 0.45
        self.ctx.sounds.note(i)
        if i == self.seq[self.recall_i]:
            self.recall_i += 1
            if self.recall_i >= self.length:
                rt = (self.trial_t - self.recall_t0) / self.length
                self.state = "done"
                self.finish_trial(True, rt, say=self.rng.choice(["Beautifully remembered.", "Just right.", "Nicely done."]))
        else:
            self.shake[i] = 0.4
            self.ctx.sounds.soft()
            self.state = "done"
            self.finish_trial(False, (self.trial_t - self.recall_t0) / max(1, self.recall_i + 1), say="Good try. The next one is a fresh start.", good=False)

    # ----------------------------------------------------------------- draw
    def draw_scene(self, s: pygame.Surface) -> None:
        gfx.glow(s, (self.w - 230, 150), 150, (255, 244, 224), 0.7, 1.4)
        gfx.circle(s, (255, 248, 236), (self.w - 230, 150), 46, alpha=235)
        for i in range(self.petals):
            ph = i * 1.7
            x = (i * 137 + self.t * 14 * self.ctx.motion) % (self.w + 80) - 40
            y = 120 + (i * 53) % 420 + math.sin(self.t * 0.6 + ph) * 18 * self.ctx.motion
            gfx.circle(s, T.ROSE, (x, y), 5, alpha=150)
        # soft reflection pool
        for i, (x, y) in enumerate(self.pos):
            lit = self.lit == i or i in self.flash
            col = COLORS[i % len(COLORS)]
            yb = y + self.bob(i * 0.9, 7)
            if lit:
                gfx.glow(s, (x, yb), 150, (255, 226, 160), 0.9, 1.6)
            spr = art.lantern(120, 190, col, lit)
            dx = int(math.sin(self.t * 40) * 6) if i in self.shake else 0
            s.blit(spr, spr.get_rect(center=(x + dx, int(yb))))
        msg = {"ready": "Get ready", "show": "Watch the lanterns", "recall": "Your turn", "done": ""}.get(self.state, "")
        if msg:
            self.prompt(s, msg, sub="Light them in the same order" if self.state == "recall" else "")
        if self.state in ("recall", "done"):
            for i in range(self.length):
                col = T.TEAL if i < self.recall_i else T.LINE
                gfx.circle(s, col, (self.w // 2 - (self.length - 1) * 16 + i * 32, 135), 8)
