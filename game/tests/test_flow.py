"""End-to-end headless test: drives the real App through ten sessions.

Run:  python -m unittest discover -s tests -v      (from halcyon/game)
Uses a temporary data folder, a synthetic player, and no camera.
"""
from __future__ import annotations

import json
import os
import random
import sys
import tempfile
import unittest
from pathlib import Path

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parents[1]))

import pygame

from harness import bot_frame
from halcyon_game import storage
from halcyon_game.app import App
from halcyon_game.config import Config, default_profile
from halcyon_game.input_manager import Frame
from halcyon_game import screens


def _patch_storage(tmp: Path) -> None:
    storage.PROFILE_PATH = tmp / "profile.json"
    storage.PROGRESS_PATH = tmp / "progress.json"
    storage.CALIBRATION_PATH = tmp / "calibration.json"


class FlowTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        _patch_storage(self.tmp)
        prof = default_profile()
        prof["name"] = "Sam"
        prof["preferences"].update({"movement_mode": "none", "session_minutes": 1, "sound": False})
        prof["profile"]["traits"] = ["likes_patterns", "needs_time"]
        storage.save_profile(prof)
        cfg = Config.load()
        cfg.no_camera = True
        self.app = App(cfg)
        self.rng = random.Random(3)
        self.shots = Path(os.environ.get("HALCYON_SHOTS", self.tmp))

    def drive(self, accuracy=0.85, feedback_index=1, frames=60000):
        """Advance the app with scripted input until one session is recorded."""
        app = self.app
        before = len(app.progress["sessions"])
        app.goto(screens.HomeScene(app))
        n = 0
        while len(app.progress["sessions"]) == before and n < frames:
            n += 1
            sc = app.scene
            f = Frame()
            if isinstance(sc, screens.HomeScene):
                f.clicks.append(sc.cards[0].rect.center)
            elif isinstance(sc, screens.InstructionScene):
                f.clicks.append(sc.start.rect.center)
            elif isinstance(sc, screens.PlayScene):
                f = bot_frame(sc.game, self.rng, accuracy)
            elif isinstance(sc, screens.SummaryScene) and sc.stage == 0:
                f.clicks.append(sc.fb[feedback_index].rect.center)
            f.track = app.input.track
            app.input.update = lambda dt, _f=f: _f
            app.tick(1 / 30, [])
        self.assertLess(n, frames, "session did not finish")
        return app.progress["sessions"][-1]

    def test_ten_session_journey(self):
        app = self.app
        self.assertEqual(app.engine.phase, "starter")
        seen = []
        for i in range(10):
            sess = self.drive(accuracy=0.9, feedback_index=1)
            seen.append(sess["game"])
            if i < 4:
                self.assertEqual(app.engine.phase, "starter", f"estimate should wait until game 5 (game {i + 1})")
        self.assertTrue(app.progress["estimate"]["done"], "estimate should be ready after five games")
        self.assertGreaterEqual(app.progress["estimate"]["level"], 1)
        self.assertEqual(len(set(seen[:5])), 5, f"starter five should be five different games: {seen[:5]}")
        self.assertEqual(len(app.progress["sessions"]), 10)
        phases = [s["phase"] for s in app.progress["sessions"]]
        self.assertEqual(phases[:5], ["starter"] * 5)
        self.assertEqual(phases[5:], ["adaptive"] * 5)
        # every adaptive session explains itself and changes at most one dimension
        for s in app.progress["sessions"][5:]:
            self.assertTrue(s["adjustment"])
            self.assertIn(s["changed"], (None, "pace", "load", "visual", "estimate"))
        saved = json.loads(storage.PROGRESS_PATH.read_text())
        self.assertEqual(saved["completed_count"], 10)

    def test_screens_render(self):
        app = self.app
        for scene in (screens.HomeScene(app), screens.InstructionScene(app, "lantern_memory"), screens.CalibrateScene(app, "lantern_memory")):
            app.goto(scene)
            for _ in range(3):
                f = Frame()
                f.track = app.input.track
                app.input.update = lambda dt, _f=f: _f
                app.tick(1 / 30, [])
            pygame.image.save(app.screen, str(self.shots / f"screen_{type(scene).__name__}.png"))

    def test_clear_progress(self):
        self.drive()
        self.assertTrue(storage.PROGRESS_PATH.exists())
        storage.clear_progress()
        self.assertFalse(storage.PROGRESS_PATH.exists())
        self.assertEqual(storage.load_progress()["completed_count"], 0)


if __name__ == "__main__":
    unittest.main()
