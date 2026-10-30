"""Render every screen to PNG for visual review.  python tests/render_screens.py OUT_DIR"""
import os
import random
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parents[1]))

import pygame

import test_flow as tf
from halcyon_game import screens, storage
from halcyon_game.app import App
from halcyon_game.config import Config, default_profile
from halcyon_game.input_manager import Frame

out = Path(sys.argv[1])
tmp = Path(tempfile.mkdtemp())
tf._patch_storage(tmp)
prof = default_profile()
prof["name"] = "Sam"
prof["preferences"].update({"movement_mode": "none", "session_minutes": 1, "sound": False, "instructions": "steps"})
storage.save_profile(prof)
cfg = Config.load()
cfg.no_camera = True
app = App(cfg)
rng = random.Random(2)


def step(n=3, frame=None):
    for _ in range(n):
        f = frame or Frame()
        f.track = app.input.track
        app.input.update = lambda dt, _f=f: _f
        app.tick(1 / 30, [])


def shot(name):
    pygame.image.save(app.screen, str(out / f"ui_{name}.png"))


app.goto(screens.InstructionScene(app, "sorting_stones")); step(); shot("instruction")
app.begin_play("quiet_signals")
for _ in range(120):
    step(1)
play = app.scene
shot("play")
app.goto(screens.PauseScene(app, play)); step(); shot("pause")
app.goto(screens.BreakScene(app, play)); step(40); shot("break")
# finish a session quickly for the summary screens
from harness import bot_frame
app.begin_play("lantern_memory")
sc = app.scene
n = 0
while not isinstance(app.scene, screens.SummaryScene) and n < 20000:
    n += 1
    if isinstance(app.scene, screens.PlayScene):
        f = bot_frame(app.scene.game, rng, 0.9)
        step(1, f)
    else:
        step(1)
step(3); shot("summary_feedback")
sc = app.scene
f = Frame(); f.clicks.append(sc.fb[1].rect.center)
step(1, f); step(3); shot("summary_next")
pose_cfg = Config.load()
app.goto(screens.CalibrateScene(app, "lantern_memory")); step(); shot("calibrate_nocamera")
print("rendered")
