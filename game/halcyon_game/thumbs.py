"""Card thumbnails: each game's own scenery with one of its signature objects."""
from __future__ import annotations

import pygame

from . import gfx, theme as T
from .games import art


BASE_W, BASE_H = 352, 120


def thumbnail(game_id: str, w: int, h: int) -> pygame.Surface:
    """Compose on a fixed 352x120 canvas, then centre-crop and scale to w x h."""
    base = gfx.cached(("thumb-base", game_id), lambda: _compose(game_id, BASE_W, BASE_H))
    if (w, h) == (BASE_W, BASE_H):
        return base

    def make():
        cw = min(BASE_W, int(BASE_H * w / h))
        ch = min(BASE_H, int(BASE_W * h / w))
        crop = base.subsurface(((BASE_W - cw) // 2, (BASE_H - ch) // 2, cw, ch))
        return pygame.transform.smoothscale(crop, (w, h))

    return gfx.cached(("thumb", game_id, w, h), make)


def _compose(game_id: str, w: int, h: int) -> pygame.Surface:
    def make():
        scene = gfx.scenery(game_id, (1280, 720))
        crop_h = int(1280 * h / w)
        crop = pygame.Surface((1280, min(720, crop_h)))
        crop.blit(scene, (0, 0), (0, 720 - min(720, crop_h) - 40, 1280, min(720, crop_h)))
        s = pygame.transform.smoothscale(crop, (w, h)).convert_alpha()
        cx, cy = w // 2, h // 2 + 6
        gid = game_id
        if gid == "lantern_memory":
            gfx.glow(s, (cx + 40, cy), 70, (255, 226, 160), 0.8, 1.6)
            for dx, col, lit in ((-70, T.ROSE, False), (0, T.AMBER, True), (70, T.SAGE, False)):
                sp = art.lantern(60, 96, col, lit)
                s.blit(sp, sp.get_rect(center=(cx + dx, cy - 4 + abs(dx) // 6)))
        elif gid == "quiet_signals":
            for dx, kind in ((-60, "go"), (60, "bud")):
                pad = art.lily_pad(96)
                s.blit(pad, pad.get_rect(center=(cx + dx, cy + 14)))
                f = art.lotus(78) if kind == "go" else art.bud(78)
                s.blit(f, f.get_rect(center=(cx + dx, cy)))
        elif gid == "sorting_stones":
            for dx, col, shp in ((-64, T.SKY, "round"), (4, T.AMBER, "round"), (70, T.SLATE, "angular")):
                sp = art.stone(84, col, shp)
                s.blit(sp, sp.get_rect(center=(cx + dx, cy + 6)))
        elif gid == "meadow_search":
            for dx, dy, col in ((-70, 6, T.SKY), (-20, -14, T.SKY), (34, 12, T.CLAY), (82, -8, T.SKY)):
                sp = art.flower(64, 6 if col != T.CLAY else 8, col)
                s.blit(sp, sp.get_rect(center=(cx + dx, cy + dy)))
        elif gid == "constellation_trace":
            pts = [(cx - 80, cy + 22), (cx - 28, cy - 18), (cx + 34, cy + 10), (cx + 84, cy - 22)]
            for a, b in zip(pts, pts[1:]):
                gfx.line_aa(s, (255, 244, 214), a, b, 3, 220)
            for p in pts:
                gfx.glow(s, p, 34, (255, 236, 190), 0.9)
                sp = art.sparkle(40)
                s.blit(sp, sp.get_rect(center=p))
        elif gid == "echo_garden":
            sp = art.flower(104, 8, T.AMBER, "pointed")
            s.blit(sp, sp.get_rect(center=(cx, cy - 6)))
            pygame.draw.polygon(s, T.CLAY, [(cx - 34, cy + 36), (cx + 34, cy + 36), (cx + 26, cy + 58), (cx - 26, cy + 58)])
        elif gid == "pattern_loom":
            for i, (k, col) in enumerate((("circle", T.TEAL), ("square", T.AMBER), ("circle", T.TEAL))):
                r = pygame.Rect(cx - 112 + i * 78, cy - 34, 68, 68)
                gfx.draw_rrect(s, r, T.PAPER, radius=14, shadow=6)
                g = art.glyph(60, k, col)
                s.blit(g, g.get_rect(center=r.center))
        elif gid == "steady_beat":
            gfx.ring(s, T.CHAMPAGNE, (cx, cy), 58, 5)
            gfx.circle(s, T.TEAL, (cx, cy), 32, border=T.PAPER, border_w=4)
        elif gid == "mirror_match":
            pat = [[1, 0, 1], [0, 1, 0], [1, 1, 0]]
            for r in range(3):
                for c in range(3):
                    for side, off in ((0, -92), (1, 28)):
                        cc = c if side == 0 else 2 - c
                        rect = pygame.Rect(cx + off + c * 22, cy - 34 + r * 22, 19, 19)
                        gfx.draw_rrect(s, rect, T.TEAL if pat[r][cc] else T.STONE, radius=5)
            pygame.draw.line(s, (255, 255, 255), (cx - 2, cy - 40), (cx - 2, cy + 40), 3)
        elif gid == "firefly_count":
            jar = art.jar(110, 110)
            s.blit(jar, jar.get_rect(center=(cx, cy)))
            for dx, dy in ((-18, 8), (14, -10), (22, 22)):
                gfx.glow(s, (cx + dx, cy + dy), 26, (255, 224, 140), 0.9, 1.6)
                o = art.orb(6, (255, 212, 110))
                s.blit(o, o.get_rect(center=(cx + dx, cy + dy)))
        # rounded corners
        mask = pygame.Surface((w, h), pygame.SRCALPHA)
        pygame.draw.rect(mask, (255, 255, 255, 255), (0, 0, w, h), border_radius=18)
        out = pygame.Surface((w, h), pygame.SRCALPHA)
        out.blit(s, (0, 0))
        out.blit(mask, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)
        return out

    return make()
