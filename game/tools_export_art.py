"""Export the games' own artwork for the website.

    python tools_export_art.py        (from halcyon/game)

Writes web/img/hero.jpg and web/img/games/<id>.png using the same drawing
code the games use, so the site and the games share one visual language.
"""
import os
import sys
from pathlib import Path

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
sys.path.insert(0, str(Path(__file__).parent))

import pygame

from halcyon_game import gfx, theme as T
from halcyon_game.config import ROOT, load_catalog
from halcyon_game.games import art
from halcyon_game.thumbs import _compose

pygame.init()
pygame.display.set_mode((1, 1))
OUT = ROOT / "web" / "img"
(OUT / "games").mkdir(parents=True, exist_ok=True)

# Games: compose on the 352x120 design canvas at 2x for retina screens.
for g in load_catalog()["games"]:
    base = _compose(g["id"], 352, 120)
    big = pygame.transform.smoothscale(base, (704, 240))
    pygame.image.save(big, str(OUT / "games" / f"{g['id']}.png"))

# Hero: a calm dusk pond with lanterns, rendered at 1920x1080.
W, H = 1920, 1080
scene = gfx.scenery("lantern_memory", (W, H)).copy()
gfx.glow(scene, (1480, 250), 330, (255, 244, 224), 0.8, 1.4)
gfx.circle(scene, (255, 249, 238), (1480, 250), 84, alpha=240)
cols = [T.AMBER, T.ROSE, T.SAGE, T.SKY, T.DUSK, T.AMBER, T.ROSE]
lit = {1, 3, 5}
for i, c in enumerate(cols):
    x = 760 + i * 170
    y = 640 + int(70 * (2 * i / (len(cols) - 1) - 1) ** 2) - (i % 2) * 40
    if i in lit:
        gfx.glow(scene, (x, y), 190, (255, 226, 160), 0.85, 1.6)
    spr = art.lantern(150, 240, c, i in lit)
    scene.blit(spr, spr.get_rect(center=(x, y)))
pygame.image.save(scene.convert(), str(OUT / "hero.jpg"))
print("exported to", OUT)
