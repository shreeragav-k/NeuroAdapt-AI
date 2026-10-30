"""Hand-built sprites for the games.

A consistent "cut paper with soft light" look: flat muted shapes, a gentle
highlight and shade on each, no outlines, and soft cast shadows. Every sprite
is painted at 3x and cached, so drawing them each frame is cheap.
"""
from __future__ import annotations

import math
import random

import pygame

from .. import gfx, theme as T


def _shade(c, k):
    """k>0 lighter, k<0 darker."""
    if k >= 0:
        return tuple(int(v + (255 - v) * k) for v in c[:3])
    return tuple(int(v * (1 + k)) for v in c[:3])


def _spr(key, w, h, painter, k=3):
    return gfx.cached(key, lambda: gfx.ss(w, h, painter, k))


# ----------------------------------------------------------------- lanterns
def lantern(w: int, h: int, color, lit: bool) -> pygame.Surface:
    def paint(s, k):
        cx = w * k // 2
        body = _shade(color, 0.35 if lit else -0.05)
        rib = _shade(color, -0.25)
        top, bot = int(h * 0.20) * k, int(h * 0.86) * k
        bw = int(w * 0.40) * k
        pygame.draw.line(s, (96, 82, 70, 255), (cx, 0), (cx, top), 3 * k // 2)
        pygame.draw.rect(s, (88, 74, 64, 255), (cx - bw // 2, top - 6 * k, bw, 12 * k), border_radius=6 * k)
        body_rect = pygame.Rect(cx - bw, top, bw * 2, bot - top)
        pygame.draw.ellipse(s, (*body, 255), body_rect)
        if lit:
            inner = body_rect.inflate(-bw * 0.8, -(bot - top) * 0.5)
            pygame.draw.ellipse(s, (255, 248, 226, 235), inner)
        for f in (-0.55, 0, 0.55):
            r = body_rect.inflate(-int(bw * (1 - abs(f) * 0.0)) * 0 - int(abs(f) * bw * 1.2), 0)
            pygame.draw.ellipse(s, (*rib, 150 if not lit else 70), r, max(2, k))
        sh = pygame.Rect(body_rect.x + bw * 0.25, body_rect.y + (bot - top) * 0.12, bw * 0.4, (bot - top) * 0.5)
        pygame.draw.ellipse(s, (255, 255, 255, 60 if not lit else 90), sh)
        pygame.draw.rect(s, (88, 74, 64, 255), (cx - bw // 2, bot - 4 * k, bw, 12 * k), border_radius=6 * k)
        pygame.draw.line(s, _shade(color, -0.2) + (255,), (cx, bot + 8 * k), (cx, h * k - 4 * k), 3 * k // 2)
        pygame.draw.circle(s, (*_shade(color, -0.2), 255), (cx, h * k - 6 * k), 6 * k)

    return _spr(("lantern", w, h, tuple(color), lit), w, h, paint)


# ------------------------------------------------------------------ flowers
def flower(size: int, petals: int, color, kind: str = "round", center=None, rot: float = 0.0) -> pygame.Surface:
    center = center or _shade(color, -0.45)

    def paint(s, k):
        c = size * k // 2
        pr = size * k * 0.30
        for i in range(petals):
            a = rot + math.tau * i / petals
            px, py = c + math.cos(a) * pr * 0.95, c + math.sin(a) * pr * 0.95
            if kind == "pointed":
                tip = (c + math.cos(a) * size * k * 0.46, c + math.sin(a) * size * k * 0.46)
                l = (c + math.cos(a - 0.38) * pr * 0.7, c + math.sin(a - 0.38) * pr * 0.7)
                r = (c + math.cos(a + 0.38) * pr * 0.7, c + math.sin(a + 0.38) * pr * 0.7)
                pygame.draw.polygon(s, (*_shade(color, 0.0 if i % 2 else 0.08), 255), [l, tip, r, (c, c)])
            else:
                rad_x = pr * (0.78 if kind == "round" else 0.62)
                rad_y = pr * (0.78 if kind == "round" else 1.0)
                surf = pygame.Surface((int(rad_x * 2) + 2, int(rad_y * 2) + 2), pygame.SRCALPHA)
                pygame.draw.ellipse(surf, (*_shade(color, 0.0 if i % 2 else 0.1), 255), surf.get_rect())
                surf = pygame.transform.rotate(surf, -math.degrees(a) - 90)
                s.blit(surf, surf.get_rect(center=(px, py)))
        pygame.draw.circle(s, (*_shade(color, -0.12), 255), (c, c), int(pr * 0.62))
        pygame.draw.circle(s, (*center, 255), (c, c), int(pr * 0.44))
        pygame.draw.circle(s, (255, 255, 255, 70), (c - int(pr * 0.12), c - int(pr * 0.14)), int(pr * 0.18))

    return _spr(("flower", size, petals, tuple(color), kind, tuple(center), round(rot, 2)), size, size, paint)


def lily_pad(size: int) -> pygame.Surface:
    def paint(s, k):
        c = size * k // 2
        r = int(size * k * 0.46)
        pygame.draw.circle(s, (*T.MOSS, 255), (c, c), r)
        pygame.draw.circle(s, (*_shade(T.MOSS, 0.12), 255), (c - r // 8, c - r // 8), int(r * 0.88))
        # notch
        a = 0.35
        pygame.draw.polygon(s, (0, 0, 0, 0), [(c, c), (c + math.cos(a) * r * 1.3, c + math.sin(a) * r * 1.3), (c + math.cos(a + 0.28) * r * 1.3, c + math.sin(a + 0.28) * r * 1.3)])
        for i in range(7):
            ang = i * math.tau / 7 + 0.6
            pygame.draw.line(s, (*_shade(T.MOSS, -0.18), 120), (c, c), (c + math.cos(ang) * r * 0.85, c + math.sin(ang) * r * 0.85), max(1, k))

    return _spr(("lily", size), size, size, paint)


def lotus(size: int, color=T.AMBER, open_: bool = True) -> pygame.Surface:
    def paint(s, k):
        c = size * k // 2
        n = 8 if open_ else 5
        for ring, (scale, shade) in enumerate(((1.0, -0.05), (0.72, 0.1), (0.46, 0.22))):
            for i in range(n):
                a = math.tau * i / n + ring * 0.2
                L = size * k * 0.34 * scale
                tip = (c + math.cos(a) * L * 1.5, c + math.sin(a) * L * 1.5)
                l = (c + math.cos(a - 0.34) * L * 0.8, c + math.sin(a - 0.34) * L * 0.8)
                r = (c + math.cos(a + 0.34) * L * 0.8, c + math.sin(a + 0.34) * L * 0.8)
                pygame.draw.polygon(s, (*_shade(color, shade), 255), [l, tip, r, (c, c)])
        pygame.draw.circle(s, (255, 244, 214, 255), (c, c), int(size * k * 0.07))

    return _spr(("lotus", size, tuple(color)), size, size, paint)


def bud(size: int) -> pygame.Surface:
    col = (150, 156, 160)

    def paint(s, k):
        c = size * k // 2
        pygame.draw.ellipse(s, (*_shade(col, 0.05), 255), (c - size * k * 0.18, c - size * k * 0.30, size * k * 0.36, size * k * 0.64))
        pygame.draw.ellipse(s, (*col, 255), (c - size * k * 0.26, c - size * k * 0.12, size * k * 0.28, size * k * 0.46))
        pygame.draw.ellipse(s, (*col, 255), (c - size * k * 0.02, c - size * k * 0.12, size * k * 0.28, size * k * 0.46))
        pygame.draw.ellipse(s, (255, 255, 255, 70), (c - size * k * 0.1, c - size * k * 0.26, size * k * 0.12, size * k * 0.22))

    return _spr(("bud", size), size, size, paint)


# ------------------------------------------------------------------- stones
def stone(size: int, color, shape: str) -> pygame.Surface:
    def paint(s, k):
        c = size * k // 2
        r = size * k * 0.40
        if shape == "round":
            rect = pygame.Rect(c - r * 1.05, c - r * 0.85, r * 2.1, r * 1.7)
            pygame.draw.ellipse(s, (*_shade(color, -0.12), 255), rect.move(0, k * 3))
            pygame.draw.ellipse(s, (*color, 255), rect)
            pygame.draw.ellipse(s, (255, 255, 255, 80), pygame.Rect(rect.x + r * 0.3, rect.y + r * 0.18, r * 0.9, r * 0.5))
        else:
            pts = [(c - r, c + r * 0.25), (c - r * 0.55, c - r * 0.8), (c + r * 0.35, c - r * 0.9), (c + r * 1.0, c - r * 0.1), (c + r * 0.6, c + r * 0.8), (c - r * 0.5, c + r * 0.85)]
            pygame.draw.polygon(s, (*_shade(color, -0.14), 255), [(x, y + k * 3) for x, y in pts])
            pygame.draw.polygon(s, (*color, 255), pts)
            pygame.draw.polygon(s, (*_shade(color, 0.22), 255), [pts[1], pts[2], (c + r * 0.1, c - r * 0.1)])
            pygame.draw.polygon(s, (*_shade(color, -0.1), 255), [pts[3], pts[4], (c + r * 0.1, c - r * 0.1)])

    return _spr(("stone", size, tuple(color), shape), size, size, paint)


def basket(w: int, h: int, color) -> pygame.Surface:
    def paint(s, k):
        pygame.draw.rect(s, (*_shade(color, -0.1), 255), (0, int(h * 0.18) * k, w * k, int(h * 0.82) * k), border_radius=int(h * 0.3) * k)
        for i in range(6):
            y = int(h * (0.3 + i * 0.12)) * k
            pygame.draw.line(s, (*_shade(color, -0.3), 110), (int(w * 0.08) * k, y), (int(w * 0.92) * k, y), 2 * k)
        for i in range(9):
            x = int(w * (0.1 + i * 0.1)) * k
            pygame.draw.line(s, (*_shade(color, 0.15), 90), (x, int(h * 0.22) * k), (x - 8 * k, int(h * 0.96) * k), 2 * k)
        pygame.draw.rect(s, (*_shade(color, 0.1), 255), (0, int(h * 0.08) * k, w * k, int(h * 0.2) * k), border_radius=int(h * 0.1) * k)

    return _spr(("basket", w, h, tuple(color)), w, h, paint)


# ------------------------------------------------------------- stars / orbs
def sparkle(size: int, color=(255, 246, 220)) -> pygame.Surface:
    def paint(s, k):
        c = size * k // 2
        a, b = size * k * 0.46, size * k * 0.09
        pts = []
        for i in range(8):
            ang = math.tau * i / 8 - math.pi / 2
            r = a if i % 2 == 0 else b
            pts.append((c + math.cos(ang) * r, c + math.sin(ang) * r))
        pygame.draw.polygon(s, (*color, 255), pts)
        pygame.draw.circle(s, (255, 255, 255, 255), (c, c), int(size * k * 0.08))

    return _spr(("sparkle", size, tuple(color)), size, size, paint)


def orb(r: int, color) -> pygame.Surface:
    d = r * 2 + 2

    def paint(s, k):
        c = d * k // 2
        pygame.draw.circle(s, (*_shade(color, -0.1), 255), (c, c), r * k)
        pygame.draw.circle(s, (*color, 255), (c - k, c - k), int(r * k * 0.86))
        pygame.draw.circle(s, (255, 255, 255, 120), (c - int(r * k * 0.28), c - int(r * k * 0.32)), int(r * k * 0.32))

    return _spr(("orb", r, tuple(color)), d, d, paint)


def jar(w: int, h: int) -> pygame.Surface:
    def paint(s, k):
        body = pygame.Rect(int(w * 0.08) * k, int(h * 0.14) * k, int(w * 0.84) * k, int(h * 0.84) * k)
        pygame.draw.rect(s, (255, 255, 255, 46), body, border_radius=int(w * 0.18) * k)
        pygame.draw.rect(s, (255, 255, 255, 170), body, 3 * k, border_radius=int(w * 0.18) * k)
        pygame.draw.rect(s, (196, 170, 120, 255), (int(w * 0.18) * k, 0, int(w * 0.64) * k, int(h * 0.12) * k), border_radius=6 * k)
        pygame.draw.rect(s, (255, 255, 255, 70), (int(w * 0.14) * k, int(h * 0.26) * k, int(w * 0.06) * k, int(h * 0.5) * k), border_radius=6 * k)

    return _spr(("jar", w, h), w, h, paint)


# ---------------------------------------------------------- pattern glyphs
GLYPHS = ["circle", "square", "triangle", "diamond", "cross", "ring"]


def glyph(size: int, kind: str, color, rot: int = 0, scale: float = 1.0) -> pygame.Surface:
    def paint(s, k):
        c = size * k // 2
        r = size * k * 0.34 * scale
        col = (*color[:3], 255)
        if kind == "circle":
            pygame.draw.circle(s, col, (c, c), int(r))
        elif kind == "ring":
            pygame.draw.circle(s, col, (c, c), int(r), max(3, int(r * 0.32)))
        elif kind == "square":
            pygame.draw.rect(s, col, (c - r, c - r, r * 2, r * 2), border_radius=int(r * 0.2))
        elif kind == "triangle":
            pygame.draw.polygon(s, col, [(c, c - r * 1.05), (c + r * 1.05, c + r * 0.8), (c - r * 1.05, c + r * 0.8)])
        elif kind == "diamond":
            pygame.draw.polygon(s, col, [(c, c - r * 1.2), (c + r * 1.2, c), (c, c + r * 1.2), (c - r * 1.2, c)])
        elif kind == "cross":
            t = r * 0.42
            pygame.draw.rect(s, col, (c - t, c - r, t * 2, r * 2), border_radius=int(t * 0.4))
            pygame.draw.rect(s, col, (c - r, c - t, r * 2, t * 2), border_radius=int(t * 0.4))

    base = _spr(("glyph", size, kind, tuple(color), round(scale, 2)), size, size, paint)
    if rot:
        base = pygame.transform.rotozoom(base, -rot, 1.0)
    return base


def rng(seed: int) -> random.Random:
    return random.Random(seed)
