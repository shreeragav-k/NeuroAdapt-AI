"""Reusable interface pieces: buttons, keyboard focus, soft panels."""
from __future__ import annotations

import math
from typing import Callable, Optional

import pygame

from . import gfx, theme as T


class Button:
    def __init__(self, rect, label: str, kind: str = "primary", key: Optional[str] = None, sub: str = ""):
        self.rect = pygame.Rect(rect)
        self.label = label
        self.kind = kind          # primary | quiet | chip | tile
        self.key = key
        self.sub = sub
        self.selected = False
        self.enabled = True
        self.hover = 0.0

    def hit(self, pos, slop: int = 8) -> bool:
        return self.enabled and pos is not None and self.rect.inflate(slop * 2, slop * 2).collidepoint(pos)

    def draw(self, s: pygame.Surface, hovered: bool, focused: bool, dt: float = 0.016) -> None:
        self.hover += ((1.0 if hovered or focused else 0.0) - self.hover) * min(1, dt * 12)
        r = self.rect
        lift = int(2 * self.hover)
        rr = r.move(0, -lift)
        if not self.enabled:
            fill, border, tcol = T.STONE, T.LINE, T.MUTE
        elif self.kind == "primary":
            fill, border, tcol = T.mix(T.TEAL, T.TEAL_DEEP, self.hover), None, T.CREAM_TEXT
        elif self.selected:
            fill, border, tcol = T.TEAL_PALE, T.TEAL, T.TEAL_DEEP
        elif self.kind in ("quiet", "chip"):
            fill, border, tcol = T.mix(T.PAPER, (255, 255, 255), self.hover), T.mix(T.LINE, T.TEAL, self.hover), T.INK
        else:
            fill, border, tcol = T.PAPER, T.LINE, T.INK
        gfx.draw_rrect(s, rr, fill, radius=14 if self.kind != "chip" else rr.h // 2, border=border, border_w=2, shadow=10 if self.kind in ("primary", "tile") else 0)
        if self.sub:
            gfx.text(s, self.label, T.font("strong", 22), tcol, (rr.centerx, rr.centery - 11), "center")
            gfx.text(s, self.sub, T.font("body", 16), T.MUTE if self.kind != "primary" else T.CREAM_TEXT, (rr.centerx, rr.centery + 14), "center")
        else:
            gfx.text(s, self.label, T.font("strong", 22 if self.kind != "chip" else 19), tcol, rr.center, "center")
        if focused:
            pygame.draw.rect(s, T.TEAL, rr.inflate(10, 10), 3, border_radius=18)


class FocusGroup:
    """Keyboard (and camera) friendly focus over a set of rectangles."""

    def __init__(self, items: list):
        self.items = items
        self.index = 0
        self.visible = False

    def _centers(self):
        return [pygame.Vector2(i.rect.center) for i in self.items]

    def move(self, dx: int, dy: int) -> None:
        if not self.items:
            return
        self.visible = True
        cur = pygame.Vector2(self.items[self.index].rect.center)
        best, best_score = None, 1e9
        for i, c in enumerate(self._centers()):
            if i == self.index or not getattr(self.items[i], "enabled", True):
                continue
            v = c - cur
            along = v.x * dx + v.y * dy
            if along <= 1:
                continue
            across = abs(v.x * dy) + abs(v.y * dx)
            score = along + across * 2.2
            if score < best_score:
                best, best_score = i, score
        if best is not None:
            self.index = best

    def update(self, frame) -> Optional[object]:
        """Returns the activated item, if any."""
        if not self.items:
            return None
        for pos in frame.clicks:
            for i, it in enumerate(self.items):
                if it.hit(pos):
                    self.index = i
                    self.visible = False
                    return it
        if frame.nav != (0, 0):
            self.move(*frame.nav)
        if frame.activate and self.visible:
            return self.items[self.index]
        if frame.activate and not self.visible:
            self.visible = True
        return None

    def hovered(self, cursor) -> Optional[object]:
        for it in self.items:
            if it.hit(cursor, 0):
                return it
        return None


def draw_cursor(s: pygame.Surface, pos, source: str, dwell: float = 0.0, pinching: bool = False) -> None:
    """A soft ring so movement input always has a visible, calm pointer."""
    if pos is None or source not in ("camera",):
        return
    x, y = int(pos[0]), int(pos[1])
    gfx.glow(s, (x, y), 34, T.TEAL, 0.35)
    gfx.circle(s, T.TEAL if not pinching else T.TEAL_DEEP, (x, y), 17 if not pinching else 13, alpha=235, border=T.CREAM_TEXT, border_w=3)
    if dwell > 0:
        rect = pygame.Rect(0, 0, 54, 54)
        rect.center = (x, y)
        pygame.draw.arc(s, T.CHAMPAGNE, rect, math.pi / 2, math.pi / 2 + math.tau * dwell, 5)
