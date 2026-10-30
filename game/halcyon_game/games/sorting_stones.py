"""Sorting Stones: cognitive flexibility.

A river stone arrives. A rule card shows where each kind of stone goes. Every
few stones the rule changes, always announced with a clear signal first so
the change is predictable.
  pace   how long a stone waits for a choice
  load   how often the rule changes
  visual how busy the riverbank is
"""
from __future__ import annotations

import math

import pygame

from .. import gfx, theme as T
from ..adaptive import lerp5
from . import art
from .base import Game, Target

COLOUR_A, COLOUR_B = T.SKY, T.AMBER


class SortingStones(Game):
    id = "sorting_stones"
    name = "Sorting Stones"
    skill = "Cognitive flexibility"
    target_rt = 2.2

    def start_trial(self) -> None:
        pace, load, vis = self.eff("pace"), self.eff("load"), self.eff("visual")
        self.window = lerp5(pace, 8.0, 3.8)
        self.k = int(round(lerp5(load, 9, 4)))
        self.reeds = int(lerp5(vis, 0, 10))
        self.lock_t = 0.0
        if not hasattr(self, "rule"):
            self.rule = "colour"
        elif self.trial_index > 0 and self.trial_index % self.k == 0:
            # Announce every rule change with a clear, unhurried signal.
            self.rule = "shape" if self.rule == "colour" else "colour"
            self.lock_t = 1.9
        self.stone_colour = self.rng.choice((COLOUR_A, COLOUR_B))
        self.stone_shape = self.rng.choice(("round", "angular"))
        self.stone_pos = pygame.Vector2(self.w / 2, 330)
        self.flying = None
        self.set_targets([Target("left", (110, 520, 360, 160)), Target("right", (self.w - 470, 520, 360, 160))])
        self.answered = False

    def _expected(self) -> str:
        if self.rule == "colour":
            return "left" if self.stone_colour == COLOUR_A else "right"
        return "left" if self.stone_shape == "round" else "right"

    def _choose(self, side: str) -> None:
        if self.answered or self.lock_t > 0:
            return
        self.answered = True
        ok = side == self._expected()
        self.flying = (self.stone_pos.copy(), pygame.Vector2(290 if side == "left" else self.w - 290, 590), 0.0)
        if ok:
            self.ctx.sounds.good()
        else:
            self.ctx.sounds.soft()
        self.finish_trial(ok, self.trial_t, say=("Right in." if ok else "Other basket this time. That's okay."), good=ok, delay=0.9)

    def on_target(self, target: Target, frame) -> None:
        self._choose(target.id)

    def on_side(self, side: str, frame) -> None:
        self._choose(side)

    def tick(self, dt: float, frame) -> None:
        if self.lock_t > 0:
            self.lock_t -= dt
            self.trial_t = 0.0
            return
        if not self.answered and self.trial_t > self.window:
            self.answered = True
            self.finish_trial(False, None, miss=True, say="Take your time. Next stone.", good=False, delay=0.8)

    def tick_wait(self, dt: float, frame) -> None:
        if self.flying:
            a, b, t = self.flying
            t = min(1.0, t + dt / 0.38)
            self.flying = (a, b, t)
            e = 1 - (1 - t) ** 3
            self.stone_pos = a.lerp(b, e)

    # ----------------------------------------------------------------- draw
    def _rule_icon(self, s, kind: str, which: int, center, size=64) -> None:
        if self.rule == "colour":
            col = COLOUR_A if which == 0 else COLOUR_B
            s.blit(art.stone(size, col, "round"), art.stone(size, col, "round").get_rect(center=center))
        else:
            shp = "round" if which == 0 else "angular"
            s.blit(art.stone(size, T.SLATE, shp), art.stone(size, T.SLATE, shp).get_rect(center=center))

    def draw_scene(self, s: pygame.Surface) -> None:
        for i in range(self.reeds):
            x = 60 + (i * 197) % (self.w - 120)
            h = 90 + (i * 31) % 70
            sway = math.sin(self.t * 0.9 + i) * 6 * self.ctx.motion
            pygame.draw.line(s, (120, 150, 118), (x, 520), (x + sway, 520 - h), 3)
        # baskets with their rule icons
        for side, rect in (("left", pygame.Rect(110, 520, 360, 160)), ("right", pygame.Rect(self.w - 470, 520, 360, 160))):
            b = art.basket(360, 150, T.CLAY if side == "left" else T.CHAMPAGNE)
            s.blit(b, b.get_rect(center=rect.center).move(0, 6))
            which = 0 if side == "left" else 1
            self._rule_icon(s, self.rule, which, (rect.centerx, rect.y - 6), 70)
            gfx.text(s, "LEFT" if side == "left" else "RIGHT", T.font("strong", 20), T.PAPER, (rect.centerx, rect.bottom - 34), "center")
        # rule card
        card = pygame.Rect(0, 0, 560, 118)
        card.midtop = (self.w // 2, 20)
        gfx.draw_rrect(s, card, T.PAPER, radius=26, shadow=16, alpha=245, border=T.TEAL if self.rule == "colour" else T.CHAMPAGNE, border_w=3)
        gfx.text(s, "Sort by colour" if self.rule == "colour" else "Sort by shape", T.font("display", 36), T.INK, (card.centerx, card.y + 36), "center")
        hint = "blue to the left, gold to the right" if self.rule == "colour" else "round to the left, angular to the right"
        gfx.text(s, hint, T.font("body", 20), T.INK_SOFT, (card.centerx, card.y + 82), "center")
        # stone
        if self.lock_t <= 0:
            spr = art.stone(190, self.stone_colour, self.stone_shape)
            if not self.flying:
                sh = gfx.ellipse_shadow(150, 28, 60)
                s.blit(sh, sh.get_rect(center=(int(self.stone_pos.x), int(self.stone_pos.y + 92))))
            s.blit(spr, spr.get_rect(center=(int(self.stone_pos.x), int(self.stone_pos.y + self.bob(0, 5)))))
            if not self.answered:
                frac = max(0.0, 1 - self.trial_t / self.window)
                pygame.draw.rect(s, T.LINE, (self.w // 2 - 90, 455, 180, 6), border_radius=3)
                pygame.draw.rect(s, T.TEAL, (self.w // 2 - 90, 455, int(180 * frac), 6), border_radius=3)
        else:
            ov = pygame.Rect(0, 0, 520, 150)
            ov.center = (self.w // 2, 340)
            gfx.draw_rrect(s, ov, T.PAPER, radius=30, shadow=18, border=T.CHAMPAGNE, border_w=3)
            gfx.text(s, "The rule changes", T.font("display", 40), T.INK, (ov.centerx, ov.y + 52), "center")
            gfx.text(s, "Look at the card above", T.font("body", 22), T.INK_SOFT, (ov.centerx, ov.y + 105), "center")
