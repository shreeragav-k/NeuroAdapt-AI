"""Application shell: window, main loop, and the services every screen shares."""
from __future__ import annotations

import argparse
import sys

import pygame

from . import gfx, storage
from .adaptive import AdaptiveEngine
from .config import FPS, WINDOW_SIZE, Config, load_catalog
from .games import Ctx
from .input_manager import Frame, InputManager
from .sound import Sounds
from .tracking import make_tracker
from .ui import draw_cursor

MOVEMENT_CYCLE = ["hands", "pose", "none"]
MOTION = {"off": 0.0, "gentle": 0.5, "full": 1.0}


class App:
    def __init__(self, cfg: Config, profile_path=None, movement: str | None = None):
        pygame.init()
        pygame.display.set_caption("Halcyon")
        flags = pygame.SCALED | pygame.RESIZABLE | (pygame.FULLSCREEN if cfg.fullscreen else 0)
        self.cfg = cfg
        self.size = WINDOW_SIZE
        try:
            self.screen = pygame.display.set_mode(self.size, flags)
        except pygame.error:
            # Some drivers (and headless test runs) cannot scale; fall back to a plain window.
            self.screen = pygame.display.set_mode(self.size)
        self.clock = pygame.time.Clock()
        self.catalog = load_catalog()
        self.game_meta = {g["id"]: g for g in self.catalog["games"]}
        self.profile = storage.load_profile(profile_path)
        self.progress = storage.load_progress()
        self.engine = AdaptiveEngine(self.progress, self.profile)
        prefs = self.profile["preferences"]
        self.tracker_mode = "none" if cfg.no_camera else (movement or prefs.get("movement_mode", "hands"))
        self.sounds = Sounds(bool(prefs.get("sound", True)), float(prefs.get("volume", 0.5)))
        self.motion = MOTION.get(prefs.get("animation", "gentle"), 0.5)
        self.ctx = Ctx(size=self.size, sounds=self.sounds, motion=self.motion, prefs=prefs, cfg=cfg)
        self.running = True
        self.calibrated = False
        self.tracker = None
        self.input = None
        self.last_frame = Frame()
        self.scene = None
        self._build_input()

    # ------------------------------------------------------------- services
    def _build_input(self) -> None:
        if self.tracker is not None:
            self.tracker.stop()
        self.tracker = make_tracker(self.tracker_mode, self.cfg, storage.load_calibration())
        self.tracker.start()
        prefs = dict(self.profile["preferences"])
        prefs["movement_mode"] = self.tracker_mode
        self.input = InputManager(self.tracker, self.cfg, prefs, self.size)

    def cycle_movement(self) -> None:
        i = MOVEMENT_CYCLE.index(self.tracker_mode) if self.tracker_mode in MOVEMENT_CYCLE else 0
        self.tracker_mode = MOVEMENT_CYCLE[(i + 1) % 3]
        self.calibrated = False
        self._build_input()

    def disable_camera(self) -> None:
        self.tracker_mode = "none"
        self._build_input()

    def save(self) -> None:
        storage.save_progress(self.progress)

    def goto(self, scene) -> None:
        scene.enter()
        self.scene = scene

    def start_game(self, game_id: str) -> None:
        from .screens import CalibrateScene, InstructionScene

        cam = self.tracker_mode != "none" and self.input.track.status not in ("unsupported", "no_camera")
        if cam and not self.calibrated:
            self.goto(CalibrateScene(self, game_id))
        else:
            self.goto(InstructionScene(self, game_id))

    def begin_play(self, game_id: str) -> None:
        from .screens import PlayScene

        self.goto(PlayScene(self, game_id))

    def recompute_recs(self) -> None:
        pass

    # ----------------------------------------------------------- main loop
    def tick(self, dt: float, events) -> None:
        for e in events:
            if e.type == pygame.QUIT:
                self.running = False
            elif e.type == pygame.KEYDOWN and e.key == pygame.K_F11:
                pygame.display.toggle_fullscreen()
        self.input.feed(events)
        frame = self.input.update(dt)
        self.last_frame = frame
        self.scene.update(dt, frame)
        self.scene.draw(self.screen)
        draw_cursor(self.screen, frame.cursor, frame.source, frame.dwell, frame.track.pinching)

    def run(self, game_id: str | None = None) -> None:
        from .screens import HomeScene

        self.goto(HomeScene(self))
        if game_id:
            self.start_game(game_id)
        try:
            while self.running:
                dt = min(0.05, self.clock.tick(FPS) / 1000)
                self.tick(dt, pygame.event.get())
                pygame.display.flip()
        finally:
            self.tracker.stop()
            pygame.quit()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="halcyon_game", description="Halcyon: calm cognitive games with movement or mouse, touch and keyboard.")
    p.add_argument("--game", help="start a specific game id (see catalog.json)")
    p.add_argument("--movement", choices=["hands", "pose", "none"], help="movement input mode (overrides the profile)")
    p.add_argument("--no-camera", action="store_true", help="never open the camera")
    p.add_argument("--profile", help="path to a profile.json (defaults to halcyon/data/profile.json)")
    p.add_argument("--fullscreen", action="store_true")
    args = p.parse_args(argv)
    cfg = Config.load()
    cfg.no_camera = cfg.no_camera or args.no_camera
    cfg.fullscreen = cfg.fullscreen or args.fullscreen
    from pathlib import Path

    App(cfg, Path(args.profile) if args.profile else None, args.movement).run(args.game)
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
