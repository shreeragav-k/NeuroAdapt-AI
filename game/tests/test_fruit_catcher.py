"""Fruit Catcher: rules, results, the camera fallback, the screens and the server hooks.
Run from halcyon/game:   python -m unittest discover -s tests -v
No camera, window or sound is needed.
"""
import importlib.util
import json
import os
import random
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path
from unittest import mock

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

from fruit_catcher import logic, store
from fruit_catcher.logic import LIVES, Layout, Round, lane_from_x
from fruit_catcher.tracker import HandTracker

ROOT = Path(__file__).resolve().parents[2]


def play(rnd: Round, chooser, max_frames=60 * 100):
    for _ in range(max_frames):
        if rnd.over:
            break
        rnd.update(1 / 60, chooser(rnd))
    return rnd


class Rules(unittest.TestCase):
    def test_lane_from_the_wrist_position(self):
        self.assertEqual([lane_from_x(x) for x in (0.0, 0.39, 0.4, 0.5, 0.6, 0.61, 1.0)], [0, 0, 1, 1, 1, 2, 2])

    def test_fruit_and_chocolate_fall_in_different_outer_lanes(self):
        rnd = Round(rng=random.Random(1))
        for i in range(200):
            self.assertIn(rnd.fruit.lane, (0, 2)); self.assertIn(rnd.choc.lane, (0, 2))
            self.assertEqual(rnd.fruit.lane + rnd.choc.lane, 2)
            self.assertTrue(0 <= rnd.fruit.kind < logic.FRUIT_KINDS)
            rnd.fruit, rnd.choc = rnd._spawn()

    def test_standing_under_the_fruit_catches_it_and_never_loses_a_life(self):
        r = play(Round(60, rng=random.Random(2)), lambda x: x.fruit.lane)
        self.assertEqual(r.over, "TIME_UP"); self.assertEqual(r.lives, LIVES); self.assertEqual(r.hit, 0)
        self.assertGreaterEqual(r.caught, 20)

    def test_standing_under_the_chocolate_loses_all_lives(self):
        r = play(Round(60, rng=random.Random(3)), lambda x: x.choc.lane)
        self.assertEqual(r.over, "OUT_OF_LIVES"); self.assertEqual(r.lives, 0); self.assertEqual(r.hit, LIVES); self.assertEqual(r.caught, 0)

    def test_the_middle_lane_is_always_safe(self):
        r = play(Round(30, rng=random.Random(4)), lambda x: 1)
        self.assertEqual(r.over, "TIME_UP"); self.assertEqual((r.caught, r.hit, r.lives), (0, 0, LIVES)); self.assertGreater(r.missed, 3)

    def test_it_gets_faster_with_every_three_fruit_up_to_a_limit(self):
        r = Round(60, rng=random.Random(5))
        self.assertEqual((r.speed, r.speed_factor), (logic.BASE_FALL_SPEED, 1.0))
        r.caught = 3; self.assertEqual(r.speed, logic.BASE_FALL_SPEED + 1)
        r.caught = 300; self.assertEqual(r.speed, logic.BASE_FALL_SPEED + logic.MAX_SPEED_BONUS)

    def test_the_round_ends_when_time_is_up(self):
        r = Round(30, rng=random.Random(6))
        for _ in range(60 * 29):
            r.update(1 / 60, 1)
        self.assertIsNone(r.over); self.assertEqual(r.remaining, 1)
        for _ in range(120):
            r.update(1 / 60, 1)
        self.assertEqual(r.over, "TIME_UP"); self.assertEqual(r.remaining, 0)
        self.assertEqual(r.update(1 / 60, 0), [])               # nothing moves after the end

    def test_the_player_glides_between_lanes(self):
        r = Round(60, rng=random.Random(7)); lx = r.layout.lane_x
        r.update(1 / 60, 0)
        self.assertTrue(lx[0] < r.char_x < lx[1])
        for _ in range(60):
            r.update(1 / 60, 0)
        self.assertAlmostEqual(r.char_x, lx[0], delta=2)

    def test_the_summary_has_what_the_website_reads(self):
        r = play(Round(30, rng=random.Random(8)), lambda x: x.fruit.lane)
        s = r.summary()
        for k in ("score", "caught", "hit", "missed", "duration_s", "played_s", "ended"):
            self.assertIn(k, s)
        self.assertEqual((s["score"], s["ended"]), (r.caught, "TIME_UP"))
        self.assertEqual(Round(30).summary()["ended"], "QUIT")


class Results(unittest.TestCase):
    def test_best_score_and_the_last_round(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "sub" / "fc.json"
            self.assertEqual(store.best(path), 0); self.assertEqual(store.load(path), {})
            self.assertTrue(store.save_round({"score": 7, "caught": 7, "hit": 1}, True, path))
            self.assertFalse(store.save_round({"score": 5, "caught": 5, "hit": 0}, False, path))
            self.assertTrue(store.save_round({"score": 9, "caught": 9, "hit": 0}, True, path))
            data = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual((data["best"], data["rounds"], data["last"]["score"], data["last"]["camera"]), (9, 3, 9, True))
            self.assertGreater(data["last"]["finished_at"], 1_700_000_000_000)

    def test_a_damaged_file_does_not_stop_the_game(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "fc.json"; path.write_text("{not json", encoding="utf-8")
            self.assertEqual(store.best(path), 0)
            self.assertTrue(store.save_round({"score": 2}, False, path))


class Camera(unittest.TestCase):
    def test_without_a_camera_the_game_still_works(self):
        t = HandTracker(enabled=False)
        self.assertFalse(t.available); self.assertFalse(t.starting); self.assertEqual(t.read(), (None, None)); self.assertIn("arrow keys", t.reason)
        t.close()

    def test_missing_packages_or_camera_fall_back_to_the_keys(self):
        import numpy, cv2   # noqa: F401  load the C extensions first: patching sys.modules must not unload them
        with mock.patch.dict("sys.modules", {"mediapipe": None}):
            t = HandTracker(enabled=True)
            self.assertTrue(t.starting or t.reason)         # starts in the background: the window never waits for it
            t.wait(10)
        self.assertFalse(t.available); self.assertFalse(t.starting); self.assertIn("arrow keys", t.reason)


class Screens(unittest.TestCase):
    def test_menu_and_round_screens_draw(self):
        from fruit_catcher.app import snapshots
        with tempfile.TemporaryDirectory() as d:
            files = snapshots(Path(d), store_path=Path(d) / "fc.json")
            self.assertEqual([f.name for f in files], ["menu.png", "play.png"])
            for f in files:
                self.assertGreater(f.stat().st_size, 20_000)

    def test_the_sprites_are_there(self):
        a = ROOT / "game" / "fruit_catcher" / "assets"
        for f in ("character.png", "chocolate.png"):
            self.assertTrue((a / f).exists(), f)
        self.assertEqual(len(list((a / "fruits").glob("*.png"))), 4)


class Server(unittest.TestCase):
    """run.py: opens Fruit Catcher on request and hands its result back to the website."""

    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("halcyon_run", ROOT / "run.py")
        cls.rt = importlib.util.module_from_spec(spec); spec.loader.exec_module(cls.rt)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.rt.DATA = Path(cls.tmp.name)
        cls.server = cls.rt.ThreadingHTTPServer(("127.0.0.1", 0), cls.rt.Handler)
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.tmp.cleanup()

    def call(self, method, path, body=None):
        c = HTTPConnection("127.0.0.1", self.port, timeout=5)
        c.request(method, path, body=json.dumps(body) if body is not None else None, headers={"Content-Type": "application/json"})
        r = c.getresponse(); data = r.read(); c.close()
        return r.status, r.getheader("Cache-Control"), (json.loads(data) if r.getheader("Content-Type", "").startswith("application/json") else data)

    def test_it_launches_fruit_catcher_with_the_right_command(self):
        fake = mock.Mock(); fake.poll.return_value = None
        self.rt._proc = None
        with mock.patch.object(self.rt.subprocess, "Popen", return_value=fake) as popen:
            status, _, body = self.call("POST", "/api/launch", {"game": "fruit_catcher"})
        self.assertEqual((status, body), (200, {"ok": True}))
        cmd = popen.call_args.args[0]
        self.assertEqual(cmd[1:], ["-m", "fruit_catcher"]); self.assertTrue(str(popen.call_args.kwargs["cwd"]).endswith("game"))
        self.rt._proc = None

    def test_an_unknown_game_is_refused(self):
        self.rt._proc = None
        with mock.patch.object(self.rt.subprocess, "Popen") as popen:
            status, _, body = self.call("POST", "/api/launch", {"game": "rm -rf"})
        self.assertEqual(status, 400); popen.assert_not_called()

    def test_the_result_is_served(self):
        self.assertEqual(self.call("GET", "/api/fruit-catcher")[2], {})
        (Path(self.tmp.name) / "fruit_catcher.json").write_text(json.dumps({"best": 4, "last": {"score": 4, "finished_at": 1}}), encoding="utf-8")
        self.assertEqual(self.call("GET", "/api/fruit-catcher")[2]["last"]["score"], 4)

    def test_pages_are_not_cached_so_updates_show_up(self):
        status, cache, _ = self.call("GET", "/js/app.js")
        self.assertEqual(status, 200); self.assertEqual(cache, "no-cache")

    def test_a_game_that_cannot_start_says_why(self):
        fake = mock.Mock(); fake.poll.return_value = 1; fake.returncode = 1
        def popen(cmd, cwd=None, stdout=None, stderr=None):
            stdout.write(b"Traceback (most recent call last):" + bytes([10]) + b"ModuleNotFoundError: No module named 'pygame'" + bytes([10])); stdout.flush()
            return fake
        self.rt._proc = None
        with mock.patch.object(self.rt.subprocess, "Popen", side_effect=popen), mock.patch.object(self.rt.time, "sleep"):
            status, _, body = self.call("POST", "/api/launch", {"game": "fruit_catcher"})
        self.assertEqual(status, 500); self.assertIn("No module named 'pygame'", body["error"]); self.assertIn("stopped as it started", body["error"])
        self.rt._proc = None

    def test_missing_pygame_is_explained_before_trying(self):
        self.rt._proc = None
        with mock.patch.object(self.rt.importlib.util, "find_spec", return_value=None), mock.patch.object(self.rt.subprocess, "Popen") as popen:
            status, _, body = self.call("POST", "/api/launch", {"game": "fruit_catcher"})
        self.assertEqual(status, 500); self.assertIn("pip install -r game/requirements.txt", body["error"]); popen.assert_not_called()

    def test_script_and_module_files_are_served_with_the_right_types(self):
        for path, kind in (("/js/app.js", "javascript"), ("/vendor/mediapipe/vision_bundle.mjs", "javascript"), ("/vendor/mediapipe/wasm/vision_wasm_internal.wasm", "application/wasm")):
            c = HTTPConnection("127.0.0.1", self.port, timeout=5); c.request("HEAD", path); r = c.getresponse(); r.read(); c.close()
            self.assertEqual(r.status, 200, path); self.assertIn(kind, r.getheader("Content-Type"), path)


class Launchers(unittest.TestCase):
    def test_py_main_starts_the_site_and_the_game(self):
        import subprocess, sys
        for script, word in ((ROOT / "main.py", "Serve the Halcyon website"), (ROOT / "game" / "fruit_catcher" / "main.py", "Fruit Catcher")):
            r = subprocess.run([sys.executable, str(script), "--help"], capture_output=True, text=True, cwd=str(script.parent), timeout=60)
            self.assertEqual(r.returncode, 0, r.stderr); self.assertIn(word, r.stdout)


if __name__ == "__main__":
    unittest.main()
