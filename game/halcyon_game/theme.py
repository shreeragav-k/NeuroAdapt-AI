"""Visual identity: warm ivory ground, deep ink type, one teal accent.

The palette is deliberately restrained. Colour is used to carry meaning
(go / wait, left / right) and is always paired with a shape, label or position
so it is never the only cue.
"""
from __future__ import annotations

from functools import lru_cache

import pygame

from .config import FONT_DIR

IVORY = (246, 241, 231)
PAPER = (252, 249, 243)
STONE = (234, 227, 213)
LINE = (214, 205, 188)
INK = (24, 27, 31)
INK_SOFT = (78, 83, 90)
MUTE = (134, 137, 142)
TEAL = (43, 110, 106)
TEAL_DEEP = (28, 80, 78)
TEAL_PALE = (208, 228, 224)
CHAMPAGNE = (184, 153, 92)

# Object palette: muted, distinguishable by lightness as well as hue.
AMBER = (226, 163, 66)
CLAY = (192, 112, 84)
ROSE = (205, 135, 148)
SAGE = (138, 168, 134)
SKY = (110, 150, 188)
DUSK = (104, 108, 160)
SLATE = (122, 132, 144)
MOSS = (86, 128, 96)

CREAM_TEXT = (250, 246, 238)


def _font_path(name: str):
    p = FONT_DIR / name
    return str(p) if p.exists() else None


@lru_cache(maxsize=None)
def font(kind: str, size: int) -> pygame.font.Font:
    """kind: display (serif, headings and numerals) | body | strong (bold body)."""
    if kind == "display":
        path = _font_path("Fraunces.ttf")
        f = pygame.font.Font(path, size) if path else pygame.font.SysFont("georgia,times new roman", size)
        return f
    path = _font_path("HankenGrotesk.ttf")
    f = pygame.font.Font(path, size) if path else pygame.font.SysFont("segoe ui,arial", size)
    if kind == "strong":
        f.set_bold(True)
    return f


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1, c2, t: float):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))
