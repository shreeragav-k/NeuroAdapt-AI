"""Small 2D drawing toolkit on top of pygame.

pygame's primitives are aliased. Everything visible here is painted at 3x and
smooth-scaled down (supersampling), then cached, so edges are clean and cheap
to draw every frame. Soft shadows and glows are blurred sprites.
"""
from __future__ import annotations

import math
import random
from typing import Callable

import numpy as np
import pygame

from . import theme as T

_CACHE: dict = {}


def cached(key, make: Callable[[], pygame.Surface]) -> pygame.Surface:
    s = _CACHE.get(key)
    if s is None:
        s = make()
        _CACHE[key] = s
    return s


def clear_cache() -> None:
    _CACHE.clear()


# ------------------------------------------------------------------ basics
def ss(w: int, h: int, painter: Callable[[pygame.Surface, int], None], k: int = 3) -> pygame.Surface:
    """Paint at k x resolution, then smooth-scale down. painter(surface, k)."""
    big = pygame.Surface((w * k, h * k), pygame.SRCALPHA)
    painter(big, k)
    return pygame.transform.smoothscale(big, (w, h))


def blur(surf: pygame.Surface, amount: int = 4) -> pygame.Surface:
    """Cheap blur: shrink and enlarge with smoothing."""
    w, h = surf.get_size()
    f = max(1, amount)
    small = pygame.transform.smoothscale(surf, (max(1, w // f), max(1, h // f)))
    return pygame.transform.smoothscale(small, (w, h))


def vgradient(w: int, h: int, top, bottom) -> pygame.Surface:
    def make():
        s = pygame.Surface((w, h))
        arr = pygame.surfarray.pixels3d(s)
        for c in range(3):
            arr[:, :, c] = np.linspace(top[c], bottom[c], h)[None, :]
        del arr
        return s

    return cached(("vg", w, h, tuple(top), tuple(bottom)), make)


def radial_glow(diameter: int, color, power: float = 2.0, peak: int = 255) -> pygame.Surface:
    def make():
        d = max(2, int(diameter))
        s = pygame.Surface((d, d), pygame.SRCALPHA)
        s.fill((*color[:3], 0))
        yy, xx = np.mgrid[0:d, 0:d]
        r = np.hypot(xx - d / 2 + 0.5, yy - d / 2 + 0.5) / (d / 2)
        a = np.clip(1 - r, 0, 1) ** power * peak
        alpha = pygame.surfarray.pixels_alpha(s)
        alpha[:] = a.T.astype(np.uint8)
        del alpha
        return s

    return cached(("glow", int(diameter), tuple(color[:3]), power, peak), make)


def glow(surf: pygame.Surface, center, radius: float, color, alpha: float = 1.0, power: float = 2.0) -> None:
    g = radial_glow(int(radius * 2), color, power)
    if alpha < 1:
        g = g.copy()
        g.set_alpha(int(255 * alpha))
    surf.blit(g, g.get_rect(center=(int(center[0]), int(center[1]))))


def soft_shadow(w: int, h: int, radius: int, spread: int = 14, alpha: int = 60) -> pygame.Surface:
    def make():
        pad = spread * 2
        s = pygame.Surface((w + pad * 2, h + pad * 2), pygame.SRCALPHA)
        s.fill((30, 28, 24, 0))
        pygame.draw.rect(s, (30, 28, 24, alpha), (pad, pad, w, h), border_radius=radius)
        return blur(s, max(2, spread // 2))

    return cached(("sh", w, h, radius, spread, alpha), make)


def rrect_sprite(w: int, h: int, radius: int, fill, border=None, border_w: int = 2, alpha: int = 255) -> pygame.Surface:
    def make():
        def paint(big, k):
            r = (0, 0, w * k, h * k)
            pygame.draw.rect(big, (*fill[:3], alpha), r, border_radius=radius * k)
            if border:
                pygame.draw.rect(big, (*border[:3], 255), r, width=border_w * k, border_radius=radius * k)

        return ss(w, h, paint)

    return cached(("rr", w, h, radius, tuple(fill[:3]), border, border_w, alpha), make)


def draw_rrect(surf, rect, fill, radius=14, border=None, border_w=2, shadow: int = 0, alpha: int = 255) -> pygame.Rect:
    rect = pygame.Rect(rect)
    if shadow:
        sh = soft_shadow(rect.w, rect.h, radius, spread=shadow, alpha=55)
        surf.blit(sh, (rect.x - shadow * 2, rect.y - shadow * 2 + shadow // 2))
    surf.blit(rrect_sprite(rect.w, rect.h, radius, fill, border, border_w, alpha), rect.topleft)
    return rect


def circle(surf, color, center, r: float, alpha: int = 255, border=None, border_w: int = 2) -> None:
    r = max(1, int(r))
    key = ("ci", r, tuple(color[:3]), alpha, border, border_w)

    def make():
        def paint(big, k):
            pygame.draw.circle(big, (*color[:3], alpha), (r * k + k, r * k + k), r * k)
            if border:
                pygame.draw.circle(big, (*border[:3], 255), (r * k + k, r * k + k), r * k, border_w * k)

        return ss(r * 2 + 2, r * 2 + 2, paint)

    spr = cached(key, make)
    surf.blit(spr, spr.get_rect(center=(int(center[0]), int(center[1]))))


def ring(surf, color, center, r: float, width: float = 3, alpha: int = 255) -> None:
    """Anti-aliased ring."""
    r = max(2, int(r))
    wd = max(1, int(width))
    d = r * 2 + wd * 2 + 4

    def paint(big, k):
        pygame.draw.circle(big, (*color[:3], alpha), (d * k // 2, d * k // 2), r * k, wd * k)

    spr = ss(d, d, paint, 2)
    surf.blit(spr, spr.get_rect(center=(int(center[0]), int(center[1]))))


def ellipse_shadow(w: int, h: int, alpha: int = 55) -> pygame.Surface:
    def make():
        pad = 16
        s = pygame.Surface((w + pad * 2, h + pad * 2), pygame.SRCALPHA)
        s.fill((30, 28, 24, 0))
        pygame.draw.ellipse(s, (30, 28, 24, alpha), (pad, pad, w, h))
        return blur(s, 6)

    return cached(("esh", w, h, alpha), make)


def line_aa(surf, color, p1, p2, width: float = 3, alpha: int = 255) -> None:
    x1, y1 = p1
    x2, y2 = p2
    pad = int(width) + 2
    x0, y0 = int(min(x1, x2)) - pad, int(min(y1, y2)) - pad
    w, h = int(abs(x2 - x1)) + pad * 2, int(abs(y2 - y1)) + pad * 2

    def paint(big, k):
        pygame.draw.line(big, (*color[:3], alpha), ((x1 - x0) * k, (y1 - y0) * k), ((x2 - x0) * k, (y2 - y0) * k), max(1, int(width * k)))
        for p in ((x1, y1), (x2, y2)):
            pygame.draw.circle(big, (*color[:3], alpha), ((p[0] - x0) * k, (p[1] - y0) * k), int(width * k / 2))

    surf.blit(ss(max(2, w), max(2, h), paint, 2), (x0, y0))


# -------------------------------------------------------------------- text
def text(surf, s: str, fnt: pygame.font.Font, color, pos, anchor: str = "topleft", alpha: int = 255) -> pygame.Rect:
    img = fnt.render(s, True, color)
    if alpha < 255:
        img.set_alpha(alpha)
    r = img.get_rect(**{anchor: pos})
    surf.blit(img, r)
    return r


def wrap(s: str, fnt: pygame.font.Font, max_w: int) -> list[str]:
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if fnt.size(t)[0] <= max_w or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def paragraph(surf, s: str, fnt, color, pos, max_w: int, leading: float = 1.4, anchor: str = "topleft") -> int:
    y = pos[1]
    for line in wrap(s, fnt, max_w):
        x = pos[0]
        if anchor == "midtop":
            text(surf, line, fnt, color, (x, y), "midtop")
        else:
            text(surf, line, fnt, color, (x, y))
        y += int(fnt.get_height() * leading)
    return y


# ----------------------------------------------------------------- grain
def grain(size, strength: int = 7) -> pygame.Surface:
    def make():
        rng = np.random.default_rng(7)
        w, h = size
        n = rng.integers(-strength, strength + 1, (w, h), dtype=np.int16)
        s = pygame.Surface((w, h), pygame.SRCALPHA)
        rgb = pygame.surfarray.pixels3d(s)
        base = np.where(n > 0, 255, 0).astype(np.uint8)
        rgb[:] = base[:, :, None]
        del rgb
        alpha = pygame.surfarray.pixels_alpha(s)
        alpha[:] = np.abs(n).astype(np.uint8) * 2
        del alpha
        return s

    return cached(("grain", tuple(size), strength), make)


# ---------------------------------------------------------------- scenery
def _hill(big, k, w, h, base, amp, freq, phase, color, alpha=255):
    pts = [(0, h * k)]
    for x in range(0, w * k + 1, 8 * k):
        t = x / (w * k)
        y = base + amp * math.sin(freq * t * math.tau + phase) + amp * 0.45 * math.sin(freq * 2.3 * t * math.tau + phase * 1.7)
        pts.append((x, y * k))
    pts.append((w * k, h * k))
    pygame.draw.polygon(big, (*color, alpha), pts)


SCENES = {
    # name: (sky top, sky bottom, [hill colours back→front], extras)
    "lantern_memory": ((196, 188, 214), (244, 210, 196), [(150, 138, 176), (118, 110, 150), (84, 82, 120)], ("pond", "mist")),
    "quiet_signals": ((214, 232, 224), (236, 240, 220), [(170, 202, 186), (136, 178, 160), (104, 150, 134)], ("pond", "ripples")),
    "sorting_stones": ((236, 228, 210), (246, 238, 222), [(206, 214, 214), (170, 190, 196), (140, 168, 178)], ("river",)),
    "meadow_search": ((226, 236, 208), (246, 240, 214), [(190, 212, 160), (160, 194, 134), (130, 172, 112)], ("mist",)),
    "constellation_trace": ((120, 136, 182), (226, 188, 196), [(96, 108, 156), (78, 88, 134)], ("stars",)),
    "echo_garden": ((226, 236, 226), (242, 240, 228), [(196, 214, 190), (166, 194, 166)], ("arches",)),
    "pattern_loom": ((240, 233, 218), (248, 243, 232), [], ("weave",)),
    "steady_beat": ((200, 226, 226), (232, 240, 232), [(168, 206, 204), (136, 186, 186)], ("ripples",)),
    "mirror_match": ((232, 228, 220), (246, 242, 234), [], ("mirror",)),
    "firefly_count": ((190, 186, 214), (230, 210, 206), [(128, 124, 164), (94, 96, 138)], ("mist", "stars")),
    "home": (T.IVORY, (240, 233, 219), [(236, 228, 211), (229, 220, 201)], ("mist",)),
}


def scenery(name: str, size=(1280, 720), motion: float = 0.0, t: float = 0.0) -> pygame.Surface:
    """Static layered backdrop for a game; light drift is composited by the caller."""

    def make():
        top, bottom, hills, extras = SCENES.get(name, SCENES["home"])
        w, h = size
        base = vgradient(w, h, top, bottom).copy().convert_alpha()

        def paint(big, k):
            for i, col in enumerate(hills):
                _hill(big, k, w, h, h * (0.62 + i * 0.09), 22 + i * 10, 1.1 + i * 0.4, i * 1.9, col, 255 if i else 235)

        if hills:
            layer = ss(w, h, paint, 2)
            base.blit(layer, (0, 0))

        if "mist" in extras:
            mist = pygame.Surface((w, h), pygame.SRCALPHA)
            mist.fill((255, 255, 255, 0))
            for i in range(5):
                pygame.draw.ellipse(mist, (255, 255, 255, 70), (-100 + i * 300, h * 0.5 + (i % 2) * 40, 700, 110))
            base.blit(blur(mist, 10), (0, 0))
        if "pond" in extras or "river" in extras:
            band = pygame.Surface((w, h), pygame.SRCALPHA)
            band.fill((255, 255, 255, 0))
            y0 = int(h * 0.72) if "pond" in extras else int(h * 0.60)
            col = (170, 190, 210, 150) if "river" in extras else (255, 255, 255, 60)
            pygame.draw.rect(band, col, (0, y0, w, h - y0))
            for i in range(14):
                yy = y0 + 10 + i * 14
                pygame.draw.line(band, (255, 255, 255, 40), (random.Random(i).randint(0, w // 2), yy), (random.Random(i + 9).randint(w // 2, w), yy), 2)
            base.blit(blur(band, 3), (0, 0))
        if "ripples" in extras:
            rp = ss(w, h, lambda big, k: [pygame.draw.circle(big, (255, 255, 255, 55 - i * 8), (int(w * (0.3 + 0.4 * (i % 2))) * k, int(h * 0.6) * k), (60 + i * 55) * k, 3 * k) for i in range(6)], 2)
            base.blit(rp, (0, 0))
        if "stars" in extras:
            rng = random.Random(4)
            for _ in range(70):
                x, y, r = rng.randint(0, w), rng.randint(0, int(h * 0.65)), rng.choice((1, 1, 2, 2, 3))
                circle(base, (255, 250, 240), (x, y), r, alpha=rng.randint(120, 220))
        if "arches" in extras:
            arch = ss(w, h, lambda big, k: [pygame.draw.rect(big, (255, 255, 255, 80), ((90 + i * 250) * k, 60 * k, 170 * k, 520 * k), 3 * k, border_top_left_radius=85 * k, border_top_right_radius=85 * k) for i in range(5)], 2)
            base.blit(arch, (0, 0))
        if "weave" in extras:
            wv = pygame.Surface((w, h), pygame.SRCALPHA)
            for x in range(0, w, 14):
                pygame.draw.line(wv, (180, 168, 146, 30), (x, 0), (x, h))
            for y in range(0, h, 14):
                pygame.draw.line(wv, (180, 168, 146, 24), (0, y), (w, y))
            base.blit(wv, (0, 0))
        if "mirror" in extras:
            mr = ss(w, h, lambda big, k: (pygame.draw.line(big, (255, 255, 255, 200), (w // 2 * k, 40 * k), (w // 2 * k, (h - 40) * k), 3 * k), pygame.draw.line(big, (190, 180, 160, 120), ((w // 2 + 5) * k, 40 * k), ((w // 2 + 5) * k, (h - 40) * k), 2 * k)), 2)
            base.blit(mr, (0, 0))

        base.blit(grain(size, 5), (0, 0))
        return base

    return cached(("scene", name, tuple(size)), make)


def paper_background(size=(1280, 720)) -> pygame.Surface:
    return scenery("home", size)
