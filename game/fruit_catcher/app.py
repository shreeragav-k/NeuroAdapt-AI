"""Fruit Catcher window: menu, round, result. Drawn with Halcyon's own look (ivory, ink, one teal accent).

    python -m fruit_catcher                # opens the menu (hand tracking if a camera is found)
    python -m fruit_catcher --no-camera    # arrow keys only
    python -m fruit_catcher --snapshot DIR # draw the screens to PNG files and exit (for checking the look)
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

import pygame

from halcyon_game import gfx, theme as T
from halcyon_game.ui import Button

from . import store
from .logic import DURATIONS, FRUIT_KINDS, LIVES, Layout, Round, lane_from_x
from .tracker import HandTracker

ASSETS = Path(__file__).resolve().parent / "assets"
LAYOUT = Layout()
W, H = LAYOUT.width, LAYOUT.height
FPS = 60
CLAY = T.CLAY
LANE_NAMES = ("Left", "Centre", "Right")


# ---------------------------------------------------------------- pictures
class Art:
    """The player, the chocolate and four fruits. Fruit sheets are squash-and-stretch strips, so a fruit
    wobbles as it falls instead of showing a random frame."""

    def __init__(self, layout: Layout) -> None:
        char = pygame.image.load(str(ASSETS / "character.png")).convert_alpha()
        self.char = pygame.transform.smoothscale(char, (layout.char_w, layout.char_h))
        choc = pygame.image.load(str(ASSETS / "chocolate.png")).convert_alpha()
        self.choc = pygame.transform.smoothscale(choc, (layout.item, layout.item))
        self.fruit: list[list[pygame.Surface]] = []
        for f in sorted((ASSETS / "fruits").glob("*.png"))[:FRUIT_KINDS]:
            sheet = pygame.image.load(str(f)).convert_alpha()
            size = sheet.get_height()
            frames = [pygame.transform.scale(sheet.subsurface(pygame.Rect(i * size, 0, size, size)), (layout.item, layout.item))
                      for i in range(sheet.get_width() // size)]
            self.fruit.append(frames)

    def fruit_frame(self, kind: int, tick: int) -> pygame.Surface:
        frames = self.fruit[kind % len(self.fruit)]
        return frames[(tick // 3) % len(frames)]


# ----------------------------------------------------------------- drawing
def pill(surf, text, font, fill, color, pos, anchor="topleft", border=None) -> pygame.Rect:
    img = font.render(text, True, color)
    r = pygame.Rect(0, 0, img.get_width() + 28, img.get_height() + 12)
    setattr(r, anchor, pos)
    gfx.draw_rrect(surf, r, fill, radius=r.h // 2, border=border, border_w=1)
    surf.blit(img, img.get_rect(center=r.center))
    return r


def draw_lanes(surf, layout: Layout, active: int) -> None:
    lane_w = layout.char_w + 90
    for i, cx in enumerate(layout.lane_x):
        r = pygame.Rect(int(cx - lane_w / 2), 0, lane_w, layout.height)
        if i == active:
            gfx.draw_rrect(surf, r, T.TEAL_PALE, radius=22, border=T.TEAL, border_w=2, alpha=150)
        else:
            gfx.draw_rrect(surf, r, T.STONE, radius=22, border=T.LINE, border_w=1, alpha=90)


def draw_camera_card(surf, rect, frame, wrist, lane, tracker: HandTracker) -> None:
    gfx.draw_rrect(surf, rect, T.PAPER, radius=16, border=T.LINE, border_w=1, shadow=8)
    img_rect = pygame.Rect(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 52)
    if frame is not None:
        try:
            h, w = frame.shape[:2]
            cam = pygame.image.frombuffer(frame.tobytes(), (w, h), "RGB")
            surf.blit(pygame.transform.smoothscale(cam, img_rect.size), img_rect)
        except Exception:
            frame = None
    if frame is None:
        pygame.draw.rect(surf, T.STONE, img_rect, border_radius=10)
        reason = "Starting the camera…" if tracker.starting else (tracker.reason or "Camera is off. Use the arrow keys.")
        y = img_rect.y + 14
        for line in gfx.wrap(reason, T.font("body", 15), img_rect.w - 20):
            gfx.text(surf, line, T.font("body", 15), T.INK_SOFT, (img_rect.centerx, y), "midtop")
            y += 20
    if tracker.available:
        found = wrist is not None
        pill(surf, "Hand found" if found else "Looking for your hand", T.font("strong", 13), T.TEAL if found else T.mix(T.AMBER, T.PAPER, 0.35),
             T.CREAM_TEXT if found else T.INK, (img_rect.x + 8, img_rect.y + 8))
    seg_w = (rect.w - 16 - 8) // 3
    for i, name in enumerate(LANE_NAMES):
        seg = pygame.Rect(rect.x + 8 + i * (seg_w + 4), rect.bottom - 36, seg_w, 28)
        on = i == lane
        gfx.draw_rrect(surf, seg, T.TEAL if on else T.STONE, radius=14)
        gfx.text(surf, name, T.font("strong", 14), T.CREAM_TEXT if on else T.MUTE, seg.center, "center")


def draw_hud(surf, rnd: Round) -> None:
    card = pygame.Rect(40, 22, W - 80, 86)
    gfx.draw_rrect(surf, card, T.PAPER, radius=20, border=T.LINE, border_w=1, shadow=10)
    gfx.text(surf, "SCORE", T.font("strong", 13), T.MUTE, (70, 38))
    gfx.text(surf, str(rnd.score), T.font("display", 46), T.TEAL_DEEP, (70, 52))

    left = rnd.remaining
    colour = T.CLAY if left <= 5 else T.TEAL
    gfx.text(surf, f"{left}", T.font("display", 40), T.INK, (W // 2 - 4, 58), "midright")
    gfx.text(surf, "seconds", T.font("body", 16), T.MUTE, (W // 2 + 2, 66), "midleft")
    bar = pygame.Rect(W // 2 - 110, 84, 220, 8)
    gfx.draw_rrect(surf, bar, T.STONE, radius=4)
    fill = bar.copy(); fill.w = max(0, int(bar.w * left / max(1, rnd.duration)))
    if fill.w > 2:
        gfx.draw_rrect(surf, fill, colour, radius=4)

    gfx.text(surf, "LIVES", T.font("strong", 13), T.MUTE, (W - 70, 38), "topright")
    for i in range(LIVES):
        c = (W - 70 - 22 - (LIVES - 1 - i) * 34, 74)
        if i < rnd.lives:
            gfx.circle(surf, T.TEAL, c, 12)
        else:
            gfx.circle(surf, T.STONE, c, 12, border=T.LINE, border_w=2)
    pill(surf, f"Speed {rnd.speed_factor}x", T.font("strong", 14), T.TEAL_PALE, T.TEAL_DEEP, (W - 300, 54), "midright")


def draw_popups(surf, popups: list[dict]) -> None:
    for p in popups[:]:
        p["y"] -= 2
        p["t"] -= 1
        if p["t"] <= 0:
            popups.remove(p)
            continue
        gfx.text(surf, p["text"], T.font("strong", 28), p["color"], (p["x"], p["y"]), "center", alpha=min(255, p["t"] * 9))


# ------------------------------------------------------------------ window
def raise_window() -> None:
    """Bring the game window in front of the browser that opened it (best effort; Windows only)."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        hwnd = pygame.display.get_wm_info().get("window")
        if hwnd:
            u = ctypes.windll.user32
            u.ShowWindow(hwnd, 9)               # restore if minimised
            u.BringWindowToTop(hwnd)
            u.SetForegroundWindow(hwnd)
    except Exception:
        pass


class FruitCatcher:
    def __init__(self, use_camera: bool = True, store_path: Path | None = None, snapshot: bool = False) -> None:
        pygame.init()
        pygame.display.set_caption("Fruit Catcher · Halcyon")
        try:                                    # scales to any window size; not every computer can do it
            self.screen = pygame.display.set_mode((W, H), pygame.SCALED | pygame.RESIZABLE)
        except pygame.error:
            self.screen = pygame.display.set_mode((W, H))
        self.clock = pygame.time.Clock()
        if not snapshot:                        # show something at once; loading pictures and the camera takes a moment
            self.screen.fill(T.IVORY)
            gfx.text(self.screen, "Fruit Catcher", T.font("display", 64), T.INK, (W // 2, H // 2 - 20), "center")
            gfx.text(self.screen, "Starting…", T.font("body", 22), T.INK_SOFT, (W // 2, H // 2 + 40), "center")
            pygame.display.flip()
            raise_window()
        self.art = Art(LAYOUT)
        self.tracker = HandTracker(enabled=use_camera and not snapshot)
        self.store_path = store_path
        self.duration_index = 1
        self.quit = False

    # ---- helpers
    def close(self) -> None:
        self.tracker.close()
        pygame.quit()

    def _poll_quit(self, event) -> bool:
        if event.type == pygame.QUIT:
            self.quit = True
            return True
        if event.type == pygame.KEYDOWN and event.key == pygame.K_F11:
            pygame.display.toggle_fullscreen()
        return False

    # ---- menu
    def draw_menu(self, selected: int, buttons, frame=None, wrist=None, lane=1, dt=0.016) -> None:
        s = self.screen
        s.fill(T.IVORY)
        gfx.text(s, "MOVEMENT GAME", T.font("strong", 15), T.TEAL, (W // 2, 64), "center")
        gfx.text(s, "Fruit Catcher", T.font("display", 78), T.INK, (W // 2, 128), "center")
        gfx.text(s, "Catch the fruit with your hand. Let the chocolate fall past.", T.font("body", 22), T.INK_SOFT, (W // 2, 188), "center")
        pill(s, f"Best score: {store.best(self.store_path)}", T.font("strong", 16), T.PAPER, T.TEAL_DEEP, (W // 2, 214), "midtop", border=T.LINE)

        for i, b in enumerate(buttons):
            b.draw(s, hovered=(i == selected), focused=False, dt=dt)

        how = pygame.Rect(48, H - 196, 470, 150)
        gfx.draw_rrect(s, how, T.PAPER, radius=18, border=T.LINE, border_w=1, shadow=10)
        gfx.text(s, "HOW TO PLAY", T.font("strong", 13), T.TEAL, (how.x + 22, how.y + 16))
        y = gfx.paragraph(s, "Move your hand left, centre or right in front of the camera, or press the arrow keys.", T.font("body", 16), T.INK, (how.x + 22, how.y + 40), how.w - 44, 1.25)
        gfx.paragraph(s, "A fruit and a chocolate fall together. Be under the fruit. The chocolate costs a life. The middle lane is safe.", T.font("body", 14), T.INK_SOFT, (how.x + 22, y + 4), how.w - 44, 1.25)
        cam = pygame.Rect(W - 48 - 250, H - 238, 250, 192)
        draw_camera_card(s, cam, frame, wrist, lane, self.tracker)
        gfx.text(s, "Camera preview. Nothing is recorded.", T.font("body", 13), T.MUTE, (cam.centerx, cam.y - 8), "midbottom")
        pygame.display.flip()

    def menu(self) -> str:
        """-> "play" | "exit" """
        selected = 0
        names = ["Start", "", "Finish and go back"]

        def build():
            return [
                Button((W // 2 - 230, 274, 460, 72), "Start", "primary", sub="Play with your hand or the arrow keys"),
                Button((W // 2 - 230, 356, 460, 72), f"Round: {DURATIONS[self.duration_index]} seconds", "quiet", sub="Left and right arrows change it"),
                Button((W // 2 - 230, 438, 460, 72), "Finish and go back", "quiet", sub="Return to the website"),
            ]

        while not self.quit:
            dt = self.clock.tick(FPS) / 1000
            frame, wrist = self.tracker.read()
            lane = lane_from_x(wrist) if wrist is not None else 1
            buttons = build()
            for event in pygame.event.get():
                if self._poll_quit(event):
                    return "exit"
                if event.type == pygame.MOUSEMOTION:
                    for i, b in enumerate(buttons):
                        if b.rect.collidepoint(event.pos):
                            selected = i
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    for i, b in enumerate(buttons):
                        if b.rect.collidepoint(event.pos):
                            selected = i
                            if i == 0:
                                return "play"
                            if i == 1:
                                self.duration_index = (self.duration_index + 1) % len(DURATIONS)
                            if i == 2:
                                return "exit"
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_UP:
                        selected = (selected - 1) % 3
                    elif event.key == pygame.K_DOWN:
                        selected = (selected + 1) % 3
                    elif event.key in (pygame.K_LEFT, pygame.K_a):
                        self.duration_index = (self.duration_index - 1) % len(DURATIONS)
                    elif event.key in (pygame.K_RIGHT, pygame.K_d):
                        self.duration_index = (self.duration_index + 1) % len(DURATIONS)
                    elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        if selected == 0:
                            return "play"
                        if selected == 1:
                            self.duration_index = (self.duration_index + 1) % len(DURATIONS)
                        if selected == 2:
                            return "exit"
                    elif event.key == pygame.K_ESCAPE:
                        return "exit"
            buttons = build()
            self.draw_menu(selected, buttons, frame, wrist, lane, dt)
        return "exit"

    # ---- a round
    def draw_round(self, rnd: Round, popups, frame, wrist, lane) -> None:
        s = self.screen
        s.fill(T.IVORY)
        draw_lanes(s, LAYOUT, rnd.lane)
        L = LAYOUT
        for item_x, item_y in ((L.lane_x[rnd.fruit.lane], rnd.fruit.y), (L.lane_x[rnd.choc.lane], rnd.choc.y)):
            sh = gfx.ellipse_shadow(L.item - 20, 22, 60)
            s.blit(sh, sh.get_rect(center=(int(item_x), int(item_y + L.item - 8))))
        s.blit(self.art.fruit_frame(rnd.fruit.kind, rnd.frame), (int(L.lane_x[rnd.fruit.lane] - L.item / 2), int(rnd.fruit.y)))
        s.blit(self.art.choc, (int(L.lane_x[rnd.choc.lane] - L.item / 2), int(rnd.choc.y)))
        cs = gfx.ellipse_shadow(L.char_w - 10, 30, 70)
        s.blit(cs, cs.get_rect(center=(int(rnd.char_x), L.char_top + L.char_h - 6)))
        s.blit(self.art.char, (int(rnd.char_x - L.char_w / 2), L.char_top))
        draw_popups(s, popups)
        draw_hud(s, rnd)
        cam = pygame.Rect(40, H - 214, 232, 176)
        draw_camera_card(s, cam, frame, wrist, rnd.lane, self.tracker)
        pygame.display.flip()

    def play(self) -> bool:
        """Play one round. -> True if it finished (so there is a result), False if left early."""
        rnd = Round(DURATIONS[self.duration_index], LAYOUT, random.Random())
        popups: list[dict] = []
        keyed: int | None = None
        while not self.quit:
            self.clock.tick(FPS)
            for event in pygame.event.get():
                if self._poll_quit(event):
                    return False
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        return False
                    if event.key in (pygame.K_LEFT, pygame.K_a):
                        keyed = 0
                    elif event.key in (pygame.K_DOWN, pygame.K_UP, pygame.K_s, pygame.K_w):
                        keyed = 1
                    elif event.key in (pygame.K_RIGHT, pygame.K_d):
                        keyed = 2
            frame, wrist = self.tracker.read()
            lane = lane_from_x(wrist) if wrist is not None else None
            want = lane if lane is not None else keyed
            if lane is not None:
                keyed = None
            for kind, x, y in rnd.update(1 / FPS, want):
                if kind == "caught":
                    popups.append({"text": "+1", "x": x, "y": y, "t": 36, "color": T.TEAL})
                elif kind == "hit":
                    popups.append({"text": "Chocolate: one life lost", "x": x, "y": y, "t": 46, "color": T.CLAY})
            self.draw_round(rnd, popups, frame, wrist, rnd.lane)
            if rnd.over:
                return self.result(rnd)
        return False

    # ---- result
    def result(self, rnd: Round) -> bool:
        summary = rnd.summary()
        new_best = store.save_round(summary, self.tracker.available, self.store_path)
        snap = self.screen.copy()
        dim = pygame.Surface((W, H), pygame.SRCALPHA)
        dim.fill((*T.INK, 110))
        title = "Time's up" if rnd.over == "TIME_UP" else "No lives left"
        modal = pygame.Rect((W - 600) // 2, (H - 470) // 2, 600, 470)
        selected = 0
        while not self.quit:
            dt = self.clock.tick(FPS) / 1000
            self.screen.blit(snap, (0, 0)); self.screen.blit(dim, (0, 0))
            gfx.draw_rrect(self.screen, modal, T.PAPER, radius=26, border=T.LINE, border_w=1, shadow=18)
            gfx.text(self.screen, "ROUND FINISHED", T.font("strong", 13), T.TEAL, (modal.centerx, modal.y + 38), "center")
            gfx.text(self.screen, title, T.font("display", 50), T.INK, (modal.centerx, modal.y + 84), "center")
            if new_best:
                pill(self.screen, "New best score", T.font("strong", 15), T.TEAL_PALE, T.TEAL_DEEP, (modal.centerx, modal.y + 118), "midtop")
            box = pygame.Rect(modal.x + 60, modal.y + 176, modal.w - 120, 120)
            gfx.draw_rrect(self.screen, box, T.IVORY, radius=18, border=T.LINE, border_w=1)
            gfx.text(self.screen, "FRUIT CAUGHT", T.font("strong", 13), T.MUTE, (box.centerx, box.y + 18), "center")
            gfx.text(self.screen, str(summary["score"]), T.font("display", 64), T.TEAL_DEEP, (box.centerx, box.y + 70), "center")
            gfx.text(self.screen, f"Best: {store.best(self.store_path)}   ·   Chocolates hit: {summary['hit']}   ·   Fruit missed: {summary['missed']}", T.font("body", 16), T.INK_SOFT, (modal.centerx, modal.y + 322), "center")
            btns = [Button((modal.x + 50, modal.bottom - 100, 240, 62), "Play again", "primary"), Button((modal.x + 310, modal.bottom - 100, 240, 62), "Back to the website", "quiet")]
            for i, b in enumerate(btns):
                b.draw(self.screen, hovered=(i == selected), focused=False, dt=dt)
            pygame.display.flip()
            for event in pygame.event.get():
                if self._poll_quit(event):
                    return True
                if event.type == pygame.MOUSEMOTION:
                    for i, b in enumerate(btns):
                        if b.rect.collidepoint(event.pos):
                            selected = i
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    for i, b in enumerate(btns):
                        if b.rect.collidepoint(event.pos):
                            self.quit = i == 1
                            return True
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_LEFT, pygame.K_RIGHT, pygame.K_TAB):
                        selected = 1 - selected
                    elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        self.quit = selected == 1
                        return True
                    elif event.key == pygame.K_ESCAPE:
                        self.quit = True
                        return True
        return True

    def run(self) -> None:
        try:
            while not self.quit:
                if self.menu() == "exit":
                    break
                self.play()
        finally:
            self.close()


# ----------------------------------------------------------------- snapshots
def snapshots(out: Path, store_path: Path | None = None) -> list[Path]:
    """Draw the three screens to PNG files without a camera or a player (for checking the look)."""
    out.mkdir(parents=True, exist_ok=True)
    game = FruitCatcher(use_camera=False, store_path=store_path, snapshot=True)
    files: list[Path] = []
    buttons = [Button((W // 2 - 230, 274, 460, 72), "Start", "primary", sub="Play with your hand or the arrow keys"),
               Button((W // 2 - 230, 356, 460, 72), "Round: 60 seconds", "quiet", sub="Left and right arrows change it"),
               Button((W // 2 - 230, 438, 460, 72), "Finish and go back", "quiet", sub="Return to the website")]
    game.draw_menu(0, buttons)
    files.append(out / "menu.png"); pygame.image.save(game.screen, str(files[-1]))
    rnd = Round(60, LAYOUT, random.Random(4))
    popups: list[dict] = []
    for _ in range(190):
        for kind, x, y in rnd.update(1 / FPS, 0 if rnd.fruit.lane == 0 else 2):
            popups.append({"text": "+1" if kind == "caught" else "Chocolate: one life lost", "x": x, "y": y, "t": 30, "color": T.TEAL if kind == "caught" else T.CLAY})
    game.draw_round(rnd, popups, None, None, rnd.lane)
    files.append(out / "play.png"); pygame.image.save(game.screen, str(files[-1]))
    pygame.quit()
    return files


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Fruit Catcher, a movement game for Halcyon.")
    ap.add_argument("--no-camera", action="store_true", help="never open the camera; play with the arrow keys")
    ap.add_argument("--duration", type=int, choices=DURATIONS, help="round length in seconds")
    ap.add_argument("--snapshot", metavar="DIR", help="draw the screens to PNG files and exit")
    args = ap.parse_args(argv)
    if args.snapshot:
        for f in snapshots(Path(args.snapshot)):
            print(f)
        return 0
    game = FruitCatcher(use_camera=not args.no_camera)
    if args.duration:
        game.duration_index = DURATIONS.index(args.duration)
    game.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
