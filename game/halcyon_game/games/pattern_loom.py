"""Pattern Loom: pattern reasoning.

A row of woven tiles follows a rule, one tile is missing, and the player picks
the tile that completes it. No countdown: after a while the loom gives a soft
glow on the right answer.
  pace   how long before the gentle hint appears
  load   how many things change in the pattern (shape, colour, size)
  visual how alike the wrong options are to the right one
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target

PALETTE = [T.TEAL, T.AMBER, T.ROSE, T.DUSK, T.SAGE]
RULES = {1: (1, 2, 1), 2: (3, 1, 1), 3: (2, 3, 1), 4: (3, 2, 1), 5: (3, 2, 2)}   # periods: shape, colour, size
VISIBLE = {1: 4, 2: 5, 3: 6, 4: 7, 5: 7}


class PatternLoom(Game):
    id = "pattern_loom"
    name = "Pattern Loom"
    skill = "Pattern reasoning"
    target_rt = 6.0

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        lv = int(round(load))
        ps, pc, pz = RULES[lv]
        shapes = self.rng.sample(art.GLYPHS, max(ps, 1))
        colors = self.rng.sample(PALETTE, max(pc, 1))
        sizes = [1.0, 1.35][:pz] if pz > 1 else [1.15]
        if ps == 1:
            shapes = [self.rng.choice(("circle", "square", "diamond"))]
        self.hint_after = lerp5(pace, 32, 14)
        self.tile = lambda i: (shapes[i % ps], colors[i % pc], sizes[i % pz])
        self.vis_n = VISIBLE[lv]
        self.answer = self.tile(self.vis_n)
        n_opts = 3 if load < 2.6 else 4
        changes = 2 if vis < 3 else 1
        opts = [self.answer]
        guard = 0
        while len(opts) < n_opts and guard < 200:
            guard += 1
            sh, co, sz = self.answer
            attrs = self.rng.sample(["shape", "colour", "size"], changes if pz > 1 or changes == 1 else 2)
            if "shape" in attrs:
                sh = self.rng.choice([g for g in art.GLYPHS if g != self.answer[0]])
            if "colour" in attrs:
                co = self.rng.choice([c for c in PALETTE if c != self.answer[1]])
            if "size" in attrs and pz > 1:
                sz = [x for x in (1.0, 1.35) if x != self.answer[2]][0]
            cand = (sh, co, sz)
            if cand not in opts:
                opts.append(cand)
        self.rng.shuffle(opts)
        self.options = opts
        self.correct = opts.index(self.answer)
        ox = self.w // 2 - (len(opts) - 1) * 90
        self.set_targets([Target(i, (ox + i * 180 - 70, 465, 140, 140)) for i in range(len(opts))])
        self.resolved = False
        self.pick = None

    def on_target(self, target: Target, frame) -> None:
        if self.resolved:
            return
        self.resolved = True
        self.pick = target.id
        ok = target.id == self.correct
        if ok:
            self.ctx.sounds.good()
        else:
            self.ctx.sounds.soft()
        self.finish_trial(ok, self.trial_t, say=("That fits." if ok else "Almost. Here is the one that fits."), good=ok, delay=1.4)

    def tick(self, dt: float, frame) -> None:
        if not self.resolved and self.trial_t > 60:
            self.resolved = True
            self.finish_trial(False, None, miss=True, say="Let's look at a new pattern.", good=False)

    def _tile(self, s, rect, spec, dashed=False):
        gfx.draw_rrect(s, rect, T.PAPER, radius=20, shadow=10, border=T.LINE, border_w=2)
        if spec:
            g = art.glyph(int(rect.w * 0.9), spec[0], spec[1], 0, spec[2])
            s.blit(g, g.get_rect(center=rect.center))
        elif dashed:
            gfx.text(s, "?", T.font("display", 60), T.TEAL, rect.center, "center")

    def draw_scene(self, s: pygame.Surface) -> None:
        n = self.vis_n + 1
        size, gap = 118, 14
        total = n * size + (n - 1) * gap
        x0 = (self.w - total) // 2
        for i in range(n):
            r = pygame.Rect(x0 + i * (size + gap), 215, size, size)
            if i == self.vis_n:
                if self.resolved:
                    self._tile(s, r, self.answer)
                else:
                    pygame.draw.rect(s, T.TEAL, r, 3, border_radius=20)
                    gfx.text(s, "?", T.font("display", 64), T.TEAL, r.center, "center")
            else:
                self._tile(s, r, self.tile(i))
        for i, t in enumerate(self.targets):
            hint = (not self.resolved) and self.trial_t > self.hint_after and i == self.correct
            if hint:
                gfx.glow(s, t.rect.center, 120, (255, 255, 255), 0.5 + 0.3 * math.sin(self.t * 3))
            self._tile(s, t.rect, self.options[i])
            if self.resolved and i == self.correct:
                pygame.draw.rect(s, T.TEAL, t.rect.inflate(10, 10), 4, border_radius=24)
            elif self.resolved and i == self.pick:
                pygame.draw.rect(s, T.MUTE, t.rect.inflate(10, 10), 3, border_radius=24)
        self.prompt(s, "Which tile fits the gap?")
