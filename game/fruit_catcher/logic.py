"""Fruit Catcher rules, with no drawing and no camera, so they can be tested on their own.

Two things fall in the two outer lanes at the same time: a fruit and a chocolate.
Be in the lane of the fruit (+1), keep out of the lane of the chocolate (-1 life).
The middle lane is always safe. A round ends when the time is up or the lives are gone.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field

LANES = (0, 1, 2)                      # left, centre, right
DURATIONS = (30, 60, 90)               # seconds a round can last
LIVES = 3
BASE_FALL_SPEED = 8                    # pixels per frame at 60 frames a second
MAX_SPEED_BONUS = 7                    # speeds up by 1 for every 3 fruit caught, up to this much
FRUIT_KINDS = 4                        # apple, cherries, watermelon, mango


@dataclass(frozen=True)
class Layout:
    """Sizes of the playing field, in pixels."""
    width: int = 1180
    height: int = 760
    char_w: int = 150
    char_h: int = 225
    item: int = 128
    bottom_margin: int = 36

    @property
    def lane_x(self) -> tuple[float, float, float]:
        return (self.width / 4, self.width / 2, 3 * self.width / 4)

    @property
    def char_top(self) -> int:
        return self.height - self.char_h - self.bottom_margin


def lane_from_x(x: float) -> int:
    """Camera x of the wrist (0 = left edge of the picture, 1 = right edge, already mirrored) -> lane."""
    if x < 0.4:
        return 0
    if x > 0.6:
        return 2
    return 1


@dataclass
class Falling:
    lane: int
    y: float
    kind: int = 0                      # which fruit (ignored for the chocolate)


@dataclass
class Round:
    duration: int = 60
    layout: Layout = field(default_factory=Layout)
    rng: random.Random = field(default_factory=random.Random)

    def __post_init__(self) -> None:
        lx = self.layout.lane_x
        self.lives = LIVES
        self.caught = 0                # fruit caught = the score
        self.hit = 0                   # chocolates that touched the player
        self.missed = 0                # fruit that fell past
        self.elapsed = 0.0
        self.frame = 0
        self.lane = 1                  # lane the player is aiming for
        self.char_x = lx[1]            # centre of the player, glides to the lane
        self.over: str | None = None   # None | "TIME_UP" | "OUT_OF_LIVES"
        self.fruit, self.choc = self._spawn()

    # ------------------------------------------------------------------ state
    @property
    def score(self) -> int:
        return self.caught

    @property
    def remaining(self) -> int:
        return max(0, int(self.duration - self.elapsed))

    @property
    def speed(self) -> int:
        return BASE_FALL_SPEED + min(self.caught // 3, MAX_SPEED_BONUS)

    @property
    def speed_factor(self) -> float:
        return round(self.speed / BASE_FALL_SPEED, 1)

    def _spawn(self) -> tuple[Falling, Falling]:
        side = self.rng.choice((0, 2))
        top = -self.layout.item
        return Falling(side, top, self.rng.randrange(FRUIT_KINDS)), Falling(2 - side, top)

    # ----------------------------------------------------------------- update
    def touching(self, item: Falling) -> bool:
        """Does the item overlap the player (a box around the player's body)?"""
        L = self.layout
        lx = L.lane_x[item.lane]
        horizontal = abs(self.char_x - lx) < (L.char_w + L.item) / 2 - 18      # a little forgiving at the edges
        vertical = item.y + L.item > L.char_top + 24 and item.y < L.char_top + L.char_h
        return horizontal and vertical

    def update(self, dt: float = 1 / 60, lane: int | None = None) -> list[tuple[str, float, float]]:
        """Advance one frame. `lane` = where the player wants to be (None keeps the last lane).
        Returns events for the screen: ("caught" | "hit" | "missed", x, y)."""
        if self.over:
            return []
        if lane is not None:
            self.lane = lane
        L = self.layout
        self.elapsed += dt
        self.frame += 1
        self.char_x += (L.lane_x[self.lane] - self.char_x) * 0.28

        events: list[tuple[str, float, float]] = []
        step = self.speed
        self.fruit.y += step
        self.choc.y += step

        respawn = False
        if self.touching(self.fruit):
            self.caught += 1
            events.append(("caught", L.lane_x[self.fruit.lane], self.fruit.y))
            respawn = True
        if self.touching(self.choc):
            self.lives -= 1
            self.hit += 1
            events.append(("hit", L.lane_x[self.choc.lane], self.choc.y))
            respawn = True
        if not respawn and self.fruit.y > L.height:
            self.missed += 1
            events.append(("missed", L.lane_x[self.fruit.lane], L.height - 60))
            respawn = True
        if respawn:
            self.fruit, self.choc = self._spawn()

        if self.remaining <= 0:
            self.over = "TIME_UP"
        elif self.lives <= 0:
            self.over = "OUT_OF_LIVES"
        return events

    def summary(self) -> dict:
        return {
            "score": self.score, "caught": self.caught, "hit": self.hit, "missed": self.missed,
            "duration_s": self.duration, "played_s": round(self.elapsed, 1), "ended": self.over or "QUIT",
        }
