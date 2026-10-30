"""Echo Garden: working memory (gentle n-back).

One flower appears at a time. Is it the same as the one before (or two before,
at higher challenge)? Choose Same or Different. The first flowers are just
for remembering and are never scored.
  pace   how long each flower waits for an answer
  load   1-back or 2-back, and how many kinds of flower
  visual how many pollen specks and leaves share the scene
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target

KINDS = [
    (5, "round", T.ROSE),
    (8, "pointed", T.AMBER),
    (6, "wide", T.SKY),
    (5, "pointed", T.DUSK),
    (7, "round", T.SAGE),
    (4, "wide", T.CLAY),
]


class EchoGarden(Game):
    id = "echo_garden"
    name = "Echo Garden"
    skill = "Working memory (n-back)"
    target_rt = 2.4

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        load = self.dims["load"]
        self.n = 1 if load < 3.6 else 2
        self.pool = min(6, 3 + int(load >= 2.5) + int(load >= 3.2) + int(load >= 4.4))
        self.seq: list[int] = []
        self.pos = 0
        total = self.n_trials + self.n
        for i in range(total):
            if i >= self.n and self.rng.random() < 0.38:
                self.seq.append(self.seq[i - self.n])
            else:
                choices = [c for c in range(self.pool) if i < self.n or c != self.seq[i - self.n]]
                self.seq.append(self.rng.choice(choices))

    def start_trial(self) -> None:
        pace, vis = self.eff("pace"), self.eff("visual")
        self.window = lerp5(pace, 7.0, 3.4)
        self.pollen = int(lerp5(vis, 0, 14))
        self.set_targets([Target("left", (170, 560, 400, 100)), Target("right", (self.w - 570, 560, 400, 100))])
        self.warm = self.pos < self.n
        self.answered = False
        self.warm_t = 0.0
        self.pop = 0.0

    def _is_match(self) -> bool:
        return self.seq[self.pos] == self.seq[self.pos - self.n]

    def _choose(self, side: str) -> None:
        if self.warm or self.answered:
            return
        self.answered = True
        said_same = side == "left"
        ok = said_same == self._is_match()
        if ok:
            self.ctx.sounds.good()
        else:
            self.ctx.sounds.soft()
        self.pos += 1
        self.finish_trial(ok, self.trial_t, say=("Yes." if ok else "Not that time. On to the next."), good=ok, delay=0.85)

    def on_target(self, target: Target, frame) -> None:
        self._choose(target.id)

    def on_side(self, side: str, frame) -> None:
        self._choose(side)

    def tick(self, dt: float, frame) -> None:
        self.pop = min(1.0, self.pop + dt * 4)
        if self.warm:
            self.warm_t += dt
            if self.warm_t > 2.4:
                self.pos += 1
                self.trial_t = 0.0
                self.start_trial()
            return
        if not self.answered and self.trial_t > self.window:
            self.answered = True
            self.pos += 1
            self.finish_trial(False, None, miss=True, say="That one passed. Here is the next.", good=False, delay=0.8)

    def draw_scene(self, s: pygame.Surface) -> None:
        for i in range(self.pollen):
            x = (i * 151 + self.t * 12 * self.ctx.motion) % self.w
            y = 140 + (i * 67) % 380 + math.sin(self.t * 0.7 + i) * 10 * self.ctx.motion
            gfx.circle(s, (255, 244, 200), (x, y), 3, alpha=140)
        idx = min(self.pos, len(self.seq) - 1)
        petals, kind, col = KINDS[self.seq[idx]]
        size = int(250 * (0.9 + 0.1 * self.pop))
        # terracotta pot
        pygame.draw.polygon(s, T.CLAY, [(self.w // 2 - 120, 470), (self.w // 2 + 120, 470), (self.w // 2 + 90, 540), (self.w // 2 - 90, 540)])
        pygame.draw.rect(s, T.mix(T.CLAY, (255, 255, 255), 0.15), (self.w // 2 - 135, 450, 270, 30), border_radius=12)
        pygame.draw.line(s, (96, 136, 100), (self.w // 2, 470), (self.w // 2, 390), 8)
        spr = art.flower(size, petals, col, kind)
        s.blit(spr, spr.get_rect(center=(self.w // 2, 300 + int(self.bob(0, 6)))))
        # a gentle reminder strip at low challenge
        if self.dims["load"] < 2.5 and self.pos > 0:
            pp, pk, pc = KINDS[self.seq[max(0, idx - 1)]]
            small = art.flower(96, pp, pc, pk)
            gfx.draw_rrect(s, (80, 250, 140, 160), T.PAPER, radius=22, shadow=10, alpha=230)
            s.blit(small, small.get_rect(center=(150, 310)))
            gfx.text(s, "Before", T.font("body", 20), T.INK_SOFT, (150, 372), "center")
        if self.warm:
            self.prompt(s, "Remember this flower", sub="Just looking for now")
        else:
            self.prompt(s, "Same as before?" if self.n == 1 else "Same as two ago?")
            for t, label, key in ((self.targets[0], "Same", "left"), (self.targets[1], "Different", "right")):
                gfx.draw_rrect(s, t.rect, T.TEAL if key == "left" else T.PAPER, radius=28, shadow=14, border=None if key == "left" else T.TEAL, border_w=3)
                gfx.text(s, label, T.font("display", 40), T.CREAM_TEXT if key == "left" else T.TEAL_DEEP, t.rect.center, "center")
            if not self.answered:
                frac = max(0.0, 1 - self.trial_t / self.window)
                pygame.draw.rect(s, T.LINE, (self.w // 2 - 120, 686, 240, 6), border_radius=3)
                pygame.draw.rect(s, T.TEAL, (self.w // 2 - 120, 686, int(240 * frac), 6), border_radius=3)
