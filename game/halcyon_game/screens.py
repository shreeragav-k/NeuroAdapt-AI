"""All screens: home, calibration, instructions, play, pause, break, summary.

Every screen is operable with mouse, touch, keyboard, or camera movement, and
every screen offers a way to continue without the camera.
"""
from __future__ import annotations

import math
import random
from collections import Counter
from typing import Optional

import numpy as np
import pygame

from . import gfx, storage, theme as T
from .adaptive import DIM_LABEL, recommend
from .config import STARTER_COUNT
from .games import GAME_CLASSES, create, trials_for
from .input_manager import Frame
from .thumbs import thumbnail
from .ui import Button, FocusGroup, draw_cursor


class Scene:
    def __init__(self, app):
        self.app = app

    def enter(self) -> None:
        pass

    def update(self, dt: float, frame: Frame) -> None:
        pass

    def draw(self, s: pygame.Surface) -> None:
        pass


# --------------------------------------------------------------- shared bits
STATUS_LABEL = {
    "ok": ("Movement tracking is steady", T.TEAL),
    "starting": ("Starting the camera…", T.CHAMPAGNE),
    "lost": ("I can't see you right now", T.AMBER),
    "low_light": ("It's a little dark", T.AMBER),
    "no_camera": ("No camera found", T.MUTE),
    "error": ("Camera isn't responding", T.AMBER),
    "unsupported": ("Movement tracking unavailable", T.MUTE),
    "off": ("Mouse, touch and keyboard", T.MUTE),
}


def preview_surface(arr: np.ndarray, size: tuple, landmarks=None, connections=None) -> pygame.Surface:
    surf = pygame.surfarray.make_surface(np.ascontiguousarray(arr.swapaxes(0, 1)))
    surf = pygame.transform.smoothscale(surf, size)
    if landmarks:
        w, h = size
        for a, b in connections or []:
            if a < len(landmarks) and b < len(landmarks):
                pygame.draw.line(surf, (255, 255, 255), (landmarks[a][0] * w, landmarks[a][1] * h), (landmarks[b][0] * w, landmarks[b][1] * h), 2)
        for x, y in landmarks:
            pygame.draw.circle(surf, T.AMBER, (int(x * w), int(y * h)), 3)
    return surf


def tracking_chip(s: pygame.Surface, app, frame: Frame, bottomleft=(24, 696), preview: bool = True) -> None:
    ts = frame.track
    label, col = STATUS_LABEL.get(ts.status, STATUS_LABEL["off"])
    cam = app.tracker.mode != "none"
    f = T.font("body", 19)
    x, y = bottomleft
    if cam and preview:
        arr = app.tracker.preview()
        if arr is not None:
            pv = preview_surface(arr, (176, 132), ts.landmarks, ts.connections)
            frame_rect = pygame.Rect(x, y - 132 - 44, 176, 132)
            gfx.draw_rrect(s, frame_rect.inflate(8, 8), T.PAPER, radius=16, shadow=8)
            mask = pygame.Surface((176, 132), pygame.SRCALPHA)
            pygame.draw.rect(mask, (255, 255, 255, 255), (0, 0, 176, 132), border_radius=12)
            pv = pv.convert_alpha()
            pv.blit(mask, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)
            s.blit(pv, frame_rect)
    tw = f.size(label)[0]
    r = pygame.Rect(x, y - 36, tw + 52, 36)
    gfx.draw_rrect(s, r, T.PAPER, radius=18, shadow=6, alpha=240)
    gfx.circle(s, col, (r.x + 20, r.centery), 6)
    gfx.text(s, label, f, T.INK_SOFT, (r.x + 36, r.centery), "midleft")


def eyebrow(s, text: str, pos, color=T.TEAL) -> None:
    gfx.text(s, text.upper(), T.font("strong", 16), color, pos)


def progress_dots(s, n_done: int, n_total: int, center, active=T.TEAL) -> None:
    for i in range(n_total):
        x = center[0] - (n_total - 1) * 14 + i * 28
        gfx.circle(s, active if i < n_done else T.LINE, (x, center[1]), 7)


# ------------------------------------------------------------------ cards
class GameCard(Button):
    def __init__(self, rect, game: dict, reason: str = "", badge: str = "", big: bool = True):
        super().__init__(rect, game["name"], "tile")
        self.game, self.reason, self.badge, self.big = game, reason, badge, big

    def draw(self, s, hovered, focused, dt=0.016):
        self.hover += ((1.0 if hovered or focused else 0.0) - self.hover) * min(1, dt * 12)
        r = self.rect.move(0, -int(4 * self.hover))
        gfx.draw_rrect(s, r, T.PAPER, radius=22, shadow=16 if self.big else 10, border=T.TEAL if focused else T.LINE, border_w=3 if focused else 2)
        if self.big:
            th = thumbnail(self.game["id"], r.w - 16, 104)
            s.blit(th, (r.x + 8, r.y + 8))
            y = r.y + 122
            gfx.text(s, self.game["name"], T.font("display", 27), T.INK, (r.x + 18, y))
            gfx.text(s, self.game["skill"], T.font("body", 16), T.TEAL, (r.x + 18, y + 34))
            if self.reason:
                gfx.paragraph(s, self.reason, T.font("body", 17), T.INK_SOFT, (r.x + 18, y + 60), r.w - 36, 1.3)
        else:
            th = thumbnail(self.game["id"], 104, 76)
            s.blit(th, (r.x + 8, r.y + 8))
            gfx.text(s, self.game["name"], T.font("display", 21), T.INK, (r.x + 124, r.y + 20))
            f = T.font("body", 15)
            for j, line in enumerate(gfx.wrap(self.game["skill"], f, r.w - 136)[:2]):
                gfx.text(s, line, f, T.TEAL, (r.x + 124, r.y + 48 + j * 19))
        if self.badge:
            f = T.font("strong", 14)
            bw = f.size(self.badge)[0] + 22
            br = pygame.Rect(r.right - bw - 14, r.y + 16, bw, 26)
            gfx.draw_rrect(s, br, T.PAPER, radius=13, alpha=235)
            gfx.text(s, self.badge, f, T.TEAL_DEEP, br.center, "center")


# -------------------------------------------------------------------- home
class HomeScene(Scene):
    def enter(self) -> None:
        a = self.app
        self.recs = recommend(a.profile, a.progress, a.catalog, 3)
        rec_ids = [r["game"]["id"] for r in self.recs]
        self.cards: list[GameCard] = []
        phase = a.engine.phase
        for i, r in enumerate(self.recs):
            badge = "Recommended" if i == 0 else "For you"
            self.cards.append(GameCard((64 + i * 400, 196, 368, 236), r["game"], r["reason"], badge, True))
        others = [g for g in a.catalog["games"] if g["id"] not in rec_ids]
        for i, g in enumerate(others):
            col, row = i % 4, i // 4
            played = a.progress["games"].get(g["id"], {}).get("sessions", 0)
            self.cards.append(GameCard((64 + col * 300, 478 + row * 104, 284, 92), g, "", "", False))
        mv = {"hands": "Movement: hands", "pose": "Movement: whole body", "none": "Movement: off"}[a.tracker_mode]
        self.btn_move = Button((self.app.size[0] - 360, 28, 230, 46), mv, "chip")
        self.btn_quit = Button((self.app.size[0] - 112, 28, 84, 46), "Quit", "chip")
        self.focus = FocusGroup(self.cards + [self.btn_move, self.btn_quit])

    def update(self, dt, frame):
        hit = self.focus.update(frame)
        if isinstance(hit, GameCard):
            self.app.start_game(hit.game["id"])
        elif hit is self.btn_move:
            self.app.cycle_movement()
            self.enter()
        elif hit is self.btn_quit:
            self.app.running = False
        if frame.pause:
            pass

    def draw(self, s):
        a = self.app
        s.blit(gfx.paper_background(a.size), (0, 0))
        eyebrow(s, "Halcyon", (64, 36))
        name = a.profile.get("name") or "there"
        gfx.text(s, f"Good to see you, {name}.", T.font("display", 50), T.INK, (64, 62))
        est = a.progress["estimate"]
        if a.engine.phase == "starter":
            done = min(STARTER_COUNT, a.engine.completed_count)
            r = gfx.text(s, f"Getting to know your pace: {done} of {STARTER_COUNT} games", T.font("body", 22), T.INK_SOFT, (64, 128))
            for i in range(STARTER_COUNT):
                gfx.circle(s, T.TEAL if i < done else T.LINE, (r.right + 30 + i * 24, r.centery), 7)
        else:
            gfx.text(s, f"Adapting to you. Starting level {est.get('level')} of 5. You can change any level in the website's settings.", T.font("body", 22), T.INK_SOFT, (64, 134))
        gfx.text(s, "Chosen for you today", T.font("strong", 20), T.INK, (64, 168))
        gfx.text(s, "More to explore", T.font("strong", 20), T.INK, (64, 448))
        frame = self.app.last_frame
        hov = self.focus.hovered(frame.cursor)
        for i, it in enumerate(self.focus.items):
            foc = self.focus.visible and i == self.focus.index
            it.draw(s, it is hov, foc, 0.016)
        tracking_chip(s, a, frame, (24, 706), preview=False)
        gfx.text(s, "Mouse, touch, keyboard (arrows + Enter), or movement all work.", T.font("body", 17), T.MUTE, (self.app.size[0] - 64, 706), "bottomright")


# ------------------------------------------------------------- calibration
class CalibrateScene(Scene):
    def __init__(self, app, game_id: str):
        super().__init__(app)
        self.game_id = game_id
        self.step = 0
        self.hold = 0.0
        self.rng = {"xmin": 1.0, "xmax": 0.0, "ymin": 1.0, "ymax": 0.0}
        self.tried = False
        self.skip = Button((64, 640, 380, 52), "Skip: use mouse and keyboard", "quiet")
        self.cont = Button((app.size[0] - 340, 640, 276, 52), "Continue", "primary")
        self.test = Button((860, 330, 200, 200), "", "tile")
        self.focus = FocusGroup([self.skip, self.cont])

    def _range_ok(self) -> bool:
        r = self.rng
        return (r["xmax"] - r["xmin"]) > 0.14 and (r["ymax"] - r["ymin"]) > 0.10

    def _finish(self) -> None:
        if self._range_ok():
            r = self.rng
            cal = {"xmin": max(0.0, r["xmin"] - 0.02), "xmax": min(1.0, r["xmax"] + 0.02), "ymin": max(0.0, r["ymin"] - 0.02), "ymax": min(1.0, r["ymax"] + 0.02)}
            storage.save_calibration(cal)
            self.app.tracker.set_calibration(cal)
        self.app.calibrated = True
        self.app.goto(InstructionScene(self.app, self.game_id))

    def update(self, dt, frame):
        ts = frame.track
        failed = ts.status in ("no_camera", "unsupported", "error")
        if failed:
            self.cont.label = "Continue without camera"
        else:
            self.cont.label = "Continue" if self.step < 2 else "Start"
        if self.step == 0:
            self.hold = self.hold + dt if ts.present else 0.0
            self.cont.enabled = self.hold > 1.0
            if self.hold > 1.6:
                self.step, self.hold = 1, 0.0
        elif self.step == 1:
            if ts.raw:
                x, y = ts.raw
                r = self.rng
                r["xmin"], r["xmax"] = min(r["xmin"], x), max(r["xmax"], x)
                r["ymin"], r["ymax"] = min(r["ymin"], y), max(r["ymax"], y)
            self.cont.enabled = self._range_ok()
        else:
            for p in frame.clicks:
                if self.test.hit(p, 20):
                    self.tried = True
            self.cont.enabled = True
        if failed:
            self.cont.enabled = True
        items = [self.skip, self.cont] + ([self.test] if self.step == 2 else [])
        self.focus.items = items
        hit = self.focus.update(frame)
        if hit is self.skip:
            self.app.disable_camera()
            self.app.goto(InstructionScene(self.app, self.game_id))
        elif hit is self.cont and self.cont.enabled:
            if failed:
                self.app.disable_camera()
                self.app.goto(InstructionScene(self.app, self.game_id))
            elif self.step == 0:
                self.step = 1
            elif self.step == 1:
                self.step = 2
            else:
                self._finish()
        if frame.pause:
            self.app.goto(HomeScene(self.app))

    def draw(self, s):
        a = self.app
        s.blit(gfx.paper_background(a.size), (0, 0))
        frame = a.last_frame
        ts = frame.track
        eyebrow(s, "Before we play", (64, 40))
        gfx.text(s, "Let's set up your movement", T.font("display", 46), T.INK, (64, 64))
        # camera preview
        box = pygame.Rect(64, 150, 640, 470)
        gfx.draw_rrect(s, box.inflate(16, 16), T.PAPER, radius=26, shadow=16)
        arr = a.tracker.preview()
        if arr is not None:
            pv = preview_surface(arr, (box.w, box.h), ts.landmarks, ts.connections).convert_alpha()
            mask = pygame.Surface(box.size, pygame.SRCALPHA)
            pygame.draw.rect(mask, (255, 255, 255, 255), (0, 0, *box.size), border_radius=20)
            pv.blit(mask, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)
            s.blit(pv, box)
            if self.step == 1 and self._range_ok():
                r = self.rng
                rr = pygame.Rect(box.x + (1 - r["xmax"]) * 0 + r["xmin"] * box.w, box.y + r["ymin"] * box.h, (r["xmax"] - r["xmin"]) * box.w, (r["ymax"] - r["ymin"]) * box.h)
                pygame.draw.rect(s, T.TEAL, rr, 3, border_radius=12)
        else:
            gfx.draw_rrect(s, box, T.STONE, radius=20)
            gfx.text(s, "Waiting for the camera…" if ts.status == "starting" else "No picture yet", T.font("body", 24), T.INK_SOFT, box.center, "center")
        # steps
        x = 760
        titles = ["Show me one hand", "Show me your comfortable range", "Try selecting"]
        pose = a.tracker.mode == "pose"
        if pose:
            titles[0] = "Step into the picture"
        bodies = [
            "Raise one hand so it shows in the picture. Sit or stand however is comfortable." if not pose else "Stand or sit so your upper body shows. Use whichever arm you like.",
            "Slowly move your hand around the area you find comfortable. Small movements are fine. A teal box shows your range." if not pose else "Slowly move your hand around the area you find comfortable. Small movements are fine.",
            "Move the ring onto the circle, then pinch your thumb and finger together." if not pose else "Move the ring onto the circle and hold still for a moment.",
        ]
        for i in range(3):
            on = i == self.step
            done = i < self.step
            gfx.circle(s, T.TEAL if on or done else T.LINE, (x + 16, 176 + i * 8 + (i * 112)), 16)
            gfx.text(s, str(i + 1), T.font("strong", 18), T.CREAM_TEXT if on or done else T.INK_SOFT, (x + 16, 176 + i * 120), "center")
            gfx.text(s, titles[i], T.font("strong", 24), T.INK if on else T.MUTE, (x + 46, 160 + i * 120))
            if on:
                gfx.paragraph(s, bodies[i], T.font("body", 19), T.INK_SOFT, (x + 46, 194 + i * 120), 440, 1.35)
        if self.step == 2:
            gfx.draw_rrect(s, self.test.rect, T.TEAL_PALE if not self.tried else T.TEAL, radius=100, shadow=14, border=T.TEAL, border_w=3)
            gfx.text(s, "Selected" if self.tried else "Try me", T.font("display", 26), T.TEAL_DEEP if not self.tried else T.CREAM_TEXT, self.test.rect.center, "center")
        # guidance
        msg = ts.message
        gfx.text(s, msg, T.font("body", 20), T.INK_SOFT, (64, 622), "bottomleft")
        hov = self.focus.hovered(frame.cursor)
        for i, it in enumerate(self.focus.items):
            if it is self.test:
                continue
            it.draw(s, it is hov, self.focus.visible and i == self.focus.index)
        tracking_chip(s, a, frame, (704 + 60, 706), preview=False)


# ---------------------------------------------------------------- instructions
class InstructionScene(Scene):
    def __init__(self, app, game_id: str):
        super().__init__(app)
        self.game_id = game_id
        self.meta = app.game_meta[game_id]
        self.start = Button((app.size[0] - 340, 620, 276, 60), "Start", "primary")
        self.back = Button((64, 626, 200, 56), "Back", "quiet")
        self._preview = None
        self.focus = FocusGroup([self.back, self.start])
        self.focus.index = 1

    def _render_preview(self) -> pygame.Surface:
        a = self.app
        g = create(self.game_id, a.ctx, a.engine.dims_for_game(self.game_id), 5, False)
        for _ in range(20):
            g.update(0.03, Frame())
        full = pygame.Surface(a.size)
        g.draw(full)
        small = pygame.transform.smoothscale(full, (560, 420)).convert_alpha()
        mask = pygame.Surface((560, 420), pygame.SRCALPHA)
        pygame.draw.rect(mask, (255, 255, 255, 255), (0, 0, 560, 420), border_radius=20)
        small.blit(mask, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)
        return small

    def update(self, dt, frame):
        hit = self.focus.update(frame)
        if hit is self.start:
            self.app.begin_play(self.game_id)
        elif hit is self.back or frame.pause:
            self.app.goto(HomeScene(self.app))

    def draw(self, s):
        a = self.app
        s.blit(gfx.paper_background(a.size), (0, 0))
        eyebrow(s, self.meta["skill"], (64, 44))
        gfx.text(s, self.meta["name"], T.font("display", 64), T.INK, (64, 68))
        gfx.paragraph(s, self.meta["tagline"], T.font("body", 25), T.INK_SOFT, (64, 150), 560, 1.35)
        style = a.profile["preferences"].get("instructions", "steps")
        steps = self.meta["steps"]
        y = 270
        if style == "short":
            gfx.paragraph(s, steps["short"], T.font("display", 36), T.INK, (64, y), 560, 1.3)
        elif style == "visual":
            for i, word in enumerate(steps["visual"]):
                r = pygame.Rect(64 + i * 196, y, 180, 150)
                gfx.draw_rrect(s, r, T.PAPER, radius=22, shadow=12, border=T.LINE)
                gfx.text(s, str(i + 1), T.font("display", 44), T.TEAL, (r.centerx, r.y + 44), "center")
                for j, line in enumerate(gfx.wrap(word, T.font("strong", 20), 150)[:3]):
                    gfx.text(s, line, T.font("strong", 20), T.INK, (r.centerx, r.y + 92 + j * 24), "center")
        else:
            for i, step in enumerate(steps["steps"]):
                gfx.circle(s, T.TEAL, (80, y + 18 + i * 74), 18)
                gfx.text(s, str(i + 1), T.font("strong", 20), T.CREAM_TEXT, (80, y + 18 + i * 74), "center")
                gfx.paragraph(s, step, T.font("body", 26), T.INK, (116, y + i * 74), 520, 1.3)
        dims = a.engine.dims_for_game(self.game_id)
        mins = a.profile["preferences"].get("session_minutes", 5)
        line = "  ·  ".join(f"{DIM_LABEL[k].capitalize()} {v}" for k, v in dims.items())
        gfx.text(s, f"Today's settings:  {line}", T.font("body", 20), T.INK_SOFT, (64, 540))
        unit = "minute" if mins == 1 else "minutes"
        gfx.text(s, f"About {mins} {unit}. Pause or take a break whenever you like.", T.font("body", 20), T.INK_SOFT, (64, 570))
        # a real first frame of the game, so what you see here is what you will play
        if self._preview is None:
            self._preview = self._render_preview()
        gfx.draw_rrect(s, (664, 102, 576, 432), T.PAPER, radius=26, shadow=18)
        s.blit(self._preview, (672, 110))
        if a.engine.phase == "starter":
            gfx.text(s, f"One of your first {STARTER_COUNT} games: everything stays gentle.", T.font("body", 19), T.TEAL_DEEP, (672, 548))
        frame = a.last_frame
        hov = self.focus.hovered(frame.cursor)
        for i, it in enumerate(self.focus.items):
            it.draw(s, it is hov, self.focus.visible and i == self.focus.index)
        tracking_chip(s, a, frame, (24 + 280, 706), preview=False)


# -------------------------------------------------------------------- play
class PlayScene(Scene):
    def __init__(self, app, game_id: str):
        super().__init__(app)
        self.game_id = game_id
        self.meta = app.game_meta[game_id]
        mins = app.profile["preferences"].get("session_minutes", 5)
        n = trials_for(self.meta["trial_seconds"], mins, 5 if self.meta["trial_seconds"] < 15 else 3, 40 if self.meta["trial_seconds"] < 6 else 24)
        self.game = create(game_id, app.ctx, app.engine.dims_for_game(game_id), n, app.engine.staircase_active())
        self.pause_btn = Button((app.size[0] - 150, 22, 124, 48), "Pause", "chip")
        self.breaks = 0
        self.src = Counter()
        self.ended = False

    def update(self, dt, frame):
        self.src[frame.source] += 1
        if any(self.pause_btn.hit(p) for p in frame.clicks) or frame.pause:
            self.app.goto(PauseScene(self.app, self))
            return
        self.game.update(dt, frame)
        if self.game.done and not self.ended:
            self.ended = True
            self.app.goto(SummaryScene(self.app, self))

    def input_mode(self) -> str:
        total = sum(self.src.values()) or 1
        return "camera" if self.src["camera"] / total > 0.4 else ("keyboard" if self.src["keyboard"] / total > 0.5 else "pointer")

    def reliability(self) -> Optional[float]:
        g = self.game
        if g.cam_frames < 30:
            return None
        return g.cam_good / g.cam_frames

    def draw(self, s):
        frame = self.app.last_frame
        self.game.draw(s)
        done, total = self.game.progress()
        gfx.text(s, f"{done} of {total}", T.font("body", 20), T.INK_SOFT, (32, 28))
        pygame.draw.rect(s, T.LINE, (32, 58, 150, 5), border_radius=3)
        pygame.draw.rect(s, T.TEAL, (32, 58, int(150 * done / max(1, total)), 5), border_radius=3)
        hov = self.pause_btn.hit(frame.cursor, 0)
        self.pause_btn.draw(s, hov, False)
        if frame.palm_hold > 0.05:
            r = pygame.Rect(0, 0, 70, 70)
            r.center = (self.pause_btn.rect.left - 54, self.pause_btn.rect.centery)
            pygame.draw.arc(s, T.CHAMPAGNE, r, math.pi / 2, math.pi / 2 + math.tau * frame.palm_hold, 6)
            gfx.text(s, "Hold to pause", T.font("body", 15), T.INK_SOFT, (r.centerx, r.bottom + 10), "midtop")
        # recovery guidance
        ts = frame.track
        if self.app.input.camera_expected and ts.status in ("lost", "low_light", "error", "no_camera") :
            r = pygame.Rect(0, 0, 760, 56)
            r.midtop = (self.app.size[0] // 2, 118 if self.game.id != "sorting_stones" else 150)
            gfx.draw_rrect(s, r, T.PAPER, radius=20, shadow=10, border=T.AMBER, border_w=2, alpha=245)
            gfx.text(s, ts.message, T.font("body", 19), T.INK, r.center, "center")
        tracking_chip(s, self.app, frame, (24, 706))


class PauseScene(Scene):
    def __init__(self, app, play: PlayScene):
        super().__init__(app)
        self.play = play
        w, h = 420, 64
        x = app.size[0] // 2 - w // 2
        y0 = 250
        self.buttons = [
            Button((x, y0, w, h), "Resume", "primary"),
            Button((x, y0 + 80, w, h), "Take a break", "quiet"),
            Button((x, y0 + 160, w, h), "Restart this game", "quiet"),
            Button((x, y0 + 240, w, h), "Skip this game", "quiet"),
            Button((x, y0 + 320, w, h), "Back to home", "quiet"),
        ]
        self.focus = FocusGroup(self.buttons)

    def update(self, dt, frame):
        hit = self.focus.update(frame)
        b = self.buttons
        if hit is b[0] or frame.pause:
            self.app.scene = self.play
        elif hit is b[1]:
            self.play.breaks += 1
            self.app.goto(BreakScene(self.app, self.play))
        elif hit is b[2]:
            self.app.begin_play(self.play.game_id)
        elif hit is b[3]:
            self.app.goto(HomeScene(self.app))
        elif hit is b[4]:
            self.app.goto(HomeScene(self.app))

    def draw(self, s):
        self.play.draw(s)
        veil = pygame.Surface(self.app.size, pygame.SRCALPHA)
        veil.fill((246, 241, 231, 215))
        s.blit(veil, (0, 0))
        gfx.text(s, "Paused", T.font("display", 54), T.INK, (self.app.size[0] // 2, 170), "center")
        gfx.text(s, "Take all the time you need.", T.font("body", 22), T.INK_SOFT, (self.app.size[0] // 2, 214), "center")
        frame = self.app.last_frame
        hov = self.focus.hovered(frame.cursor)
        for i, it in enumerate(self.buttons):
            it.draw(s, it is hov, self.focus.visible and i == self.focus.index)


class BreakScene(Scene):
    def __init__(self, app, play: PlayScene):
        super().__init__(app)
        self.play = play
        self.t = 0.0
        self.ready = Button((app.size[0] // 2 - 150, 600, 300, 60), "I'm ready", "primary")
        self.home = Button((app.size[0] // 2 - 150, 672, 300, 40), "Back to home", "quiet")
        self.focus = FocusGroup([self.ready, self.home])

    def update(self, dt, frame):
        self.t += dt
        hit = self.focus.update(frame)
        if hit is self.ready:
            self.app.scene = self.play
        elif hit is self.home:
            self.app.goto(HomeScene(self.app))

    def draw(self, s):
        a = self.app
        s.blit(gfx.scenery("steady_beat", a.size), (0, 0))
        cx, cy = a.size[0] // 2, 330
        phase = (self.t % 8) / 8
        k = 0.5 - 0.5 * math.cos(phase * math.tau) if a.motion > 0 else 0.5
        r = 80 + 80 * k
        gfx.glow(s, (cx, cy), 260, (255, 255, 255), 0.5)
        gfx.circle(s, T.TEAL, (cx, cy), r, alpha=230, border=T.PAPER, border_w=6)
        gfx.text(s, "Breathe in" if phase < 0.5 else "Breathe out", T.font("display", 32), T.CREAM_TEXT, (cx, cy), "center")
        gfx.text(s, "Take a break", T.font("display", 54), T.INK, (cx, 80), "center")
        gfx.text(s, "Rest for as long as you like. Your game will wait.", T.font("body", 24), T.INK_SOFT, (cx, 140), "center")
        frame = a.last_frame
        hov = self.focus.hovered(frame.cursor)
        for i, it in enumerate(self.focus.items):
            it.draw(s, it is hov, self.focus.visible and i == self.focus.index)


# ----------------------------------------------------------------- summary
PRAISE = ["Nicely done.", "That was a good session.", "Thank you for playing.", "Well played, and well paced."]


class SummaryScene(Scene):
    def __init__(self, app, play: PlayScene):
        super().__init__(app)
        self.play = play
        self.stage = 0
        self.adj: Optional[dict] = None
        self.feedback: Optional[str] = None
        w = 220
        x0 = app.size[0] // 2 - (3 * w + 40) // 2
        self.fb = [Button((x0 + i * (w + 20), 520, w, 64), t, "quiet") for i, t in enumerate(("Too easy", "Just right", "Too hard"))]
        self.fb_keys = ["easy", "right", "hard"]
        self.skip = Button((app.size[0] // 2 - 110, 604, 220, 44), "Skip", "quiet")
        self.focus = FocusGroup(self.fb + [self.skip])
        self.focus.index = 1
        self.nxt = Button((app.size[0] // 2 + 20, 620, 300, 60), "Next game", "primary")
        self.home = Button((app.size[0] // 2 - 320, 620, 300, 60), "Back to home", "quiet")
        self.praise = random.choice(PRAISE)

    def _finish(self) -> None:
        a = self.app
        g = self.play.game
        rel = self.play.reliability()
        summ = g.summary(self.play.input_mode(), self.play.breaks, self.feedback, rel)
        self.adj = a.engine.finish_session(summ)
        a.save()
        self.stage = 1
        a.recompute_recs()
        self.focus.items = [self.home, self.nxt]
        self.focus.index = 1

    def update(self, dt, frame):
        hit = self.focus.update(frame)
        if self.stage == 0:
            if hit in self.fb:
                self.feedback = self.fb_keys[self.fb.index(hit)]
                self._finish()
            elif hit is self.skip:
                self._finish()
        else:
            if hit is self.nxt:
                recs = recommend(self.app.profile, self.app.progress, self.app.catalog, 1)
                self.app.start_game(recs[0]["game"]["id"])
            elif hit is self.home:
                self.app.goto(HomeScene(self.app))

    def draw(self, s):
        a = self.app
        g = self.play.game
        s.blit(gfx.paper_background(a.size), (0, 0))
        cx = a.size[0] // 2
        eyebrow(s, self.play.meta["name"], (cx - 330, 52))
        gfx.text(s, self.praise, T.font("display", 60), T.INK, (cx - 330, 78))
        valid = [r for r in g.records if r.valid]
        steady = sum(1 for r in valid if r.correct)
        # soft stat cards
        stats = [(str(len(g.records)), "rounds finished"), (f"{steady}", "steady moments"), (self.play.meta["skill"], "skill practised")]
        for i, (big, small) in enumerate(stats):
            r = pygame.Rect(cx - 330 + i * 226, 190, 210, 130)
            gfx.draw_rrect(s, r, T.PAPER, radius=22, shadow=12, border=T.LINE)
            f = T.font("display", 44 if i < 2 else 24)
            if i == 2:
                for j, line in enumerate(gfx.wrap(big, f, 180)[:2]):
                    gfx.text(s, line, f, T.TEAL_DEEP, (r.centerx, r.y + 40 + j * 28), "center")
            else:
                gfx.text(s, big, f, T.TEAL_DEEP, (r.centerx, r.y + 50), "center")
            gfx.text(s, small, T.font("body", 18), T.INK_SOFT, (r.centerx, r.bottom - 26), "center")
        if self.stage == 0:
            gfx.text(s, "How did that feel?", T.font("display", 34), T.INK, (cx, 400), "center")
            gfx.text(s, "Your answer helps us choose what comes next. You can skip this.", T.font("body", 20), T.INK_SOFT, (cx, 448), "center")
            items = self.fb + [self.skip]
        else:
            r = pygame.Rect(cx - 330, 350, 660, 200)
            gfx.draw_rrect(s, r, T.PAPER, radius=24, shadow=14, border=T.TEAL, border_w=2)
            eyebrow(s, "What happens next", (r.x + 28, r.y + 22))
            gfx.paragraph(s, self.adj["explanation"], T.font("body", 24), T.INK, (r.x + 28, r.y + 54), r.w - 56, 1.35)
            items = [self.home, self.nxt]
        frame = a.last_frame
        hov = self.focus.hovered(frame.cursor)
        for i, it in enumerate(items):
            it.selected = self.stage == 0 and it in self.fb and self.fb_keys[self.fb.index(it)] == self.feedback
            it.draw(s, it is hov, self.focus.visible and i == self.focus.index)
        tracking_chip(s, a, frame, (24, 706), preview=False)
