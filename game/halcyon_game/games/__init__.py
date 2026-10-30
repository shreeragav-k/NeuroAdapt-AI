from __future__ import annotations

from .base import Ctx, Game, trials_for
from .constellation_trace import ConstellationTrace
from .echo_garden import EchoGarden
from .firefly_count import FireflyCount
from .lantern_memory import LanternMemory
from .meadow_search import MeadowSearch
from .mirror_match import MirrorMatch
from .pattern_loom import PatternLoom
from .quiet_signals import QuietSignals
from .sorting_stones import SortingStones
from .steady_beat import SteadyBeat

# Order matches catalog.json: the first five are the "getting to know your pace" set.
GAME_CLASSES: dict[str, type[Game]] = {
    c.id: c
    for c in (
        LanternMemory, QuietSignals, SortingStones, MeadowSearch, ConstellationTrace,
        EchoGarden, PatternLoom, SteadyBeat, MirrorMatch, FireflyCount,
    )
}


def create(game_id: str, ctx: Ctx, dims: dict, trials: int, staircase: bool = False) -> Game:
    return GAME_CLASSES[game_id](ctx, dims, trials, staircase)


__all__ = ["GAME_CLASSES", "Ctx", "Game", "create", "trials_for"]
