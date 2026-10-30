"""Mirror Match: visual-spatial reasoning.

A small pattern sits beside a mirror. Which option is its reflection?
  pace   how long before the soft hint appears
  load   grid size and number of options
  visual how many colours the pattern uses, and how alike the wrong options are
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from .base import Game, Target


def _flip(g):
    return [row[::-1] for row in g]


def _vflip(g):
    return g[::-1]


def _rot(g):
    n = len(g)
    return [[g[n - 1 - c][r] for c in range(n)] for r in range(n)]


class MirrorMatch(Game):
    id = "mirror_match"
    name = "Mirror Match"
    skill = "Visual-spatial reasoning"
    target_rt = 5.0

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        n = 3 if load < 2.4 else 4 if load < 4.1 else 5
        self.hint_after = lerp5(pace, 30, 13)
        two = vis >= 3
        cols = [T.TEAL, T.AMBER] if two else [T.TEAL]
        for _ in range(60):
            g = [[0 if self.rng.random() < 0.55 else self.rng.randint(1, len(cols)) for _ in range(n)] for _ in range(n)]
            if sum(1 for r in g for c in r if c) >= n and g != _flip(g) and g != _vflip(g) and g != _rot(g):
                break
        self.pattern, self.cols, self.n = g, cols, n
        correct = _flip(g)
        opts = [correct]
        cands = [g, _vflip(g), _rot(g)]
        # near-miss: the mirror with one cell changed (harder when visual detail is high)
        near = [row[:] for row in correct]
        r, c = self.rng.randrange(n), self.rng.randrange(n)
        near[r][c] = (near[r][c] + 1) % (len(cols) + 1)
        cands.append(near if vis >= 3 else _flip(_vflip(g)))
        self.rng.shuffle(cands)
        for cnd in cands:
            if len(opts) >= (3 if load < 2.6 else 4):
                break
            if cnd not in opts:
                opts.append(cnd)
        self.rng.shuffle(opts)
        self.options = opts
        self.correct = opts.index(correct)
        k = len(opts)
        ow, gap = 190, 30
        x0 = self.w // 2 + 130
        # options laid out on the right half, two per row at most
        per = 2
        self.opt_rects = []
        for i in range(k):
            row, col = divmod(i, per)
            self.opt_rects.append(pygame.Rect(x0 + col * (ow + gap) - 20, 180 + row * (ow + gap), ow, ow))
        self.set_targets([Target(i, r) for i, r in enumerate(self.opt_rects)])
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
        self.finish_trial(ok, self.trial_t, say=("That's the reflection." if ok else "Close. Here is the mirror image."), good=ok, delay=1.4)

    def tick(self, dt: float, frame) -> None:
        if not self.resolved and self.trial_t > 60:
            self.resolved = True
            self.finish_trial(False, None, miss=True, say="Let's try a fresh pattern.", good=False)

    def _grid(self, s, rect, g):
        n = len(g)
        pad = 14
        cell = (rect.w - pad * 2) // n
        for r in range(n):
            for c in range(n):
                cr = pygame.Rect(rect.x + pad + c * cell + 3, rect.y + pad + r * cell + 3, cell - 6, cell - 6)
                v = g[r][c]
                if v:
                    gfx.draw_rrect(s, cr, self.cols[v - 1], radius=max(6, cell // 6))
                else:
                    gfx.draw_rrect(s, cr, T.STONE, radius=max(6, cell // 6))

    def draw_scene(self, s: pygame.Surface) -> None:
        card = pygame.Rect(120, 180, 330, 330)
        gfx.draw_rrect(s, card, T.PAPER, radius=26, shadow=16, border=T.LINE)
        self._grid(s, card, self.pattern)
        gfx.text(s, "Pattern", T.font("body", 22), T.INK_SOFT, (card.centerx, card.bottom + 26), "center")
        mx = (card.right + self.w // 2 + 90) // 2
        for k in range(10):
            y = 190 + k * 34
            pygame.draw.line(s, (255, 255, 255), (mx, y), (mx, y + 18), 5)
        gfx.text(s, "mirror", T.font("body", 20), T.INK_SOFT, (mx, 540), "center")
        for i, t in enumerate(self.targets):
            hint = (not self.resolved) and self.trial_t > self.hint_after and i == self.correct
            if hint:
                gfx.glow(s, t.rect.center, 150, (255, 255, 255), 0.5 + 0.3 * math.sin(self.t * 3))
            gfx.draw_rrect(s, t.rect, T.PAPER, radius=22, shadow=12, border=T.LINE)
            self._grid(s, t.rect, self.options[i])
            if self.resolved and i == self.correct:
                pygame.draw.rect(s, T.TEAL, t.rect.inflate(10, 10), 4, border_radius=26)
            elif self.resolved and i == self.pick:
                pygame.draw.rect(s, T.MUTE, t.rect.inflate(10, 10), 3, border_radius=26)
        self.prompt(s, "Which one is the reflection?")
