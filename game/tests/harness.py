"""Headless helpers: play any game with a synthetic player and render frames."""
from __future__ import annotations

import os
import random

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

import pygame

from halcyon_game.games import GAME_CLASSES, Ctx
from halcyon_game.input_manager import Frame
from halcyon_game.config import Config


class QuietSounds:
    def __getattr__(self, name):
        return lambda *a, **k: None


def make_ctx(motion: float = 1.0) -> Ctx:
    return Ctx(size=(1280, 720), sounds=QuietSounds(), motion=motion, prefs={}, cfg=Config.load())


def bot_frame(game, rng: random.Random, accuracy: float = 0.8) -> Frame:
    """A synthetic player: sometimes selects the right thing, sometimes not."""
    f = Frame()
    game.ensure_started()
    if game.done or game._wait > 0:
        return f
    gid = game.id
    t = game.trial_t
    if gid == "sorting_stones":
        if t > 0.6 and game.lock_t <= 0 and not game.answered:
            side = game._expected() if rng.random() < accuracy else ("left" if game._expected() == "right" else "right")
            f.clicks.append(next(x for x in game.targets if x.id == side).rect.center)
            f.anywhere = True
    elif gid == "echo_garden":
        if not game.warm and t > 0.5 and not game.answered:
            ok = rng.random() < accuracy
            side = "left" if (game._is_match() == ok) else "right"
            f.clicks.append(next(x for x in game.targets if x.id == side).rect.center)
            f.anywhere = True
    elif gid == "steady_beat":
        if game.t > game.t0 - 0.5:
            dt = game.t - game.beat_time(game.beat)
            if abs(dt) < 0.03 or (rng.random() > accuracy and abs(dt) < 0.15 and dt > 0.0):
                f.anywhere = True
    elif gid == "quiet_signals":
        if game.shown and not game.resolved:
            go = [i for i, s in enumerate(game.stims) if s["kind"] == "go"]
            if go and game.trial_t - game.t_show > 0.5 and rng.random() < 0.5 + accuracy * 0.4:
                f.clicks.append(game.targets[go[0]].rect.center)
            elif not go and rng.random() > accuracy and game.trial_t - game.t_show > 0.4:
                f.clicks.append(game.targets[0].rect.center)
    elif gid == "lantern_memory":
        if game.state == "recall" and int(game.t * 5) % 3 == 0 and not f.clicks:
            idx = game.seq[game.recall_i]
            if rng.random() > (1 - accuracy) * 0.25:
                f.clicks.append(game.targets[idx].rect.center)
            else:
                f.clicks.append(game.targets[(idx + 1) % len(game.targets)].rect.center)
    elif gid == "meadow_search":
        if t > 1.0 and not game.resolved:
            i = game.odd if rng.random() < accuracy else (game.odd + 1) % len(game.targets)
            f.clicks.append(game.targets[i].rect.center)
    elif gid == "constellation_trace":
        if int(game.t * 8) % 2 == 0 and not game.resolved and t > 0.4:
            f.clicks.append(game.targets[min(game.idx, len(game.targets) - 1)].rect.center)
    elif gid == "pattern_loom":
        if t > 1.0 and not game.resolved:
            i = game.correct if rng.random() < accuracy else (game.correct + 1) % len(game.targets)
            f.clicks.append(game.targets[i].rect.center)
    elif gid == "mirror_match":
        if t > 1.0 and not game.resolved:
            i = game.correct if rng.random() < accuracy else (game.correct + 1) % len(game.targets)
            f.clicks.append(game.targets[i].rect.center)
    elif gid == "firefly_count":
        if game.phase == "answer" and not game.resolved and game.trial_t - game.answer_t0 > 0.5:
            v = game.n if rng.random() < accuracy else game.options[0] if game.options[0] != game.n else game.options[-1]
            f.clicks.append(next(b for b in game.btns if b.id == v).rect.center)
    if f.clicks:
        f.anywhere = True
    return f


def play(game_id: str, dims=None, trials: int = 6, accuracy: float = 0.8, staircase: bool = False, seed: int = 1, max_seconds: float = 400, shots=None, screen=None):
    """Run a full session headlessly. Returns the finished game."""
    pygame.init()
    screen = screen or pygame.display.set_mode((1280, 720))
    rng = random.Random(seed)
    ctx = make_ctx()
    dims = dims or {"pace": 2, "load": 2, "visual": 1}
    g = GAME_CLASSES[game_id](ctx, dims, trials, staircase)
    g.rng.seed(seed)
    dt, elapsed, shot_i = 1 / 30, 0.0, 0
    g.update(dt, Frame())      # first update builds the first trial
    while not g.done and elapsed < max_seconds:
        f = bot_frame(g, rng, accuracy)
        g.update(dt, f)
        if shots and shot_i < len(shots) and elapsed >= shots[shot_i][0]:
            g.draw(screen)
            pygame.image.save(screen, shots[shot_i][1])
            shot_i += 1
        elapsed += dt
    g.draw(screen)
    g.elapsed = elapsed
    return g
