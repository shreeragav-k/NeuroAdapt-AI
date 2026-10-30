"""Adaptive difficulty and recommendations.

How it works, in plain terms
----------------------------
Phase 1: "Getting to know your pace"
    The first five completed games all start at a gentle setting. Inside each
    game a very small staircase nudges difficulty up after two steady answers
    and down after a miss. Where the staircase settles is that game's
    estimate. After the fifth game, the five estimates (plus comfort signals:
    break requests and "too hard / too easy" answers) become a starting pace
    for every game. This is a *usability estimate*, not a clinical threshold,
    and five games is not a validated measure of anything.

Phase 2: "Adapting to you"
    After each game we look at accuracy on *valid* trials (a missed movement
    while tracking was unreliable is not counted as a thinking mistake),
    response time, whether the game was completed, tracking reliability,
    break requests, and the player's own feedback. We then change at most ONE
    dimension (pace, challenge, or visual detail) by ONE step and say why, in
    plain language. Easing is never framed as a penalty. Players and
    caregivers can override any level at any time.
"""
from __future__ import annotations

import statistics
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional

from .config import DIMENSIONS, STARTER_COUNT

BASE_DIMS = {"pace": 2, "load": 2, "visual": 1}
DIM_WORDS = {
    "pace": ("a touch quicker", "a little slower"),
    "load": ("a little more to hold in mind", "a little less to hold in mind"),
    "visual": ("a little more to look at", "a little calmer to look at"),
}
DIM_LABEL = {"pace": "speed", "load": "challenge", "visual": "visual detail"}


def clamp(v: float, lo: float = 1, hi: float = 5) -> float:
    return max(lo, min(hi, v))


def lerp5(level: float, a: float, b: float) -> float:
    """Map a 1..5 level onto the range a..b."""
    t = (clamp(level) - 1) / 4
    return a + (b - a) * t


@dataclass
class SessionSummary:
    game_id: str
    trials: int
    valid_trials: int
    correct: int
    median_rt: Optional[float]          # seconds, valid correct trials
    target_rt: float                    # seconds the game considers comfortable
    completed: bool
    tracking_reliability: Optional[float]   # None when no camera was used
    break_requests: int = 0
    feedback: Optional[str] = None      # easy | right | hard | None
    final_level_f: float = 2.0          # staircase result during phase 1
    input_mode: str = "pointer"
    dims_used: dict = field(default_factory=dict)

    @property
    def accuracy(self) -> float:
        return self.correct / self.valid_trials if self.valid_trials else 0.0


class AdaptiveEngine:
    def __init__(self, progress: dict, profile: dict):
        self.progress = progress
        self.profile = profile

    # -------------------------------------------------------------- phase
    @property
    def phase(self) -> str:
        return "adaptive" if self.progress["estimate"]["done"] else "starter"

    @property
    def completed_count(self) -> int:
        return int(self.progress["completed_count"])

    @property
    def starter_remaining(self) -> int:
        return max(0, STARTER_COUNT - self.completed_count) if self.phase == "starter" else 0

    # -------------------------------------------------------------- dims
    def override_for(self, game_id: str) -> Optional[dict]:
        ov = (self.profile.get("overrides") or {}).get(game_id)
        return ov if isinstance(ov, dict) and ov else None

    def dims_for(self, game_id: str) -> dict:
        dims = dict(BASE_DIMS)
        g = self.progress["games"].get(game_id)
        if g and "dims" in g:
            dims.update({k: int(v) for k, v in g["dims"].items() if k in DIMENSIONS})
        ov = self.override_for(game_id)
        if ov:
            for k in DIMENSIONS:
                if k in ov:
                    dims[k] = int(clamp(ov[k]))
        return dims

    def staircase_active(self) -> bool:
        return self.phase == "starter"

    # -------------------------------------------------------- sessions
    def finish_session(self, s: SessionSummary) -> dict:
        """Record a finished session; returns the adjustment shown to the player."""
        was_phase = self.phase
        counted = s.completed and s.valid_trials >= 3
        if counted:
            self.progress["completed_count"] += 1

        g = self.progress["games"].setdefault(
            s.game_id, {"dims": dict(BASE_DIMS), "sessions": 0, "last_changed": None, "last_adjustment": ""}
        )
        g["sessions"] += 1

        if was_phase == "starter":
            adj = self._starter_step(s, g, counted)
        else:
            adj = self._adapt(s, g)

        g["last_adjustment"] = adj["explanation"]
        self.progress["sessions"].append(
            {
                "game": s.game_id,
                "date": datetime.now().isoformat(timespec="seconds"),
                "phase": was_phase,
                "trials": s.trials,
                "valid_trials": s.valid_trials,
                "accuracy": round(s.accuracy, 3),
                "median_rt": None if s.median_rt is None else round(s.median_rt, 3),
                "completed": s.completed,
                "tracking_reliability": None if s.tracking_reliability is None else round(s.tracking_reliability, 3),
                "break_requests": s.break_requests,
                "feedback": s.feedback,
                "dims": dict(s.dims_used or g["dims"]),
                "level_f": round(s.final_level_f, 2),
                "input_mode": s.input_mode,
                "adjustment": adj["explanation"],
                "changed": adj.get("changed"),
            }
        )
        return adj

    # ------------------------------------------------------- phase 1
    def _starter_step(self, s: SessionSummary, g: dict, counted: bool) -> dict:
        g["level_f"] = s.final_level_f
        if counted:
            self.progress["estimate"]["basis"].append(
                {
                    "game": s.game_id,
                    "level_f": round(s.final_level_f, 2),
                    "break_requests": s.break_requests,
                    "feedback": s.feedback,
                    "reliability": s.tracking_reliability,
                }
            )
        done_n = len(self.progress["estimate"]["basis"])
        if counted and done_n >= STARTER_COUNT:
            return self._finish_estimate()
        left = max(0, STARTER_COUNT - done_n)
        text = (
            "Thank you. We're still getting to know your pace, so everything stays gentle. "
            f"{left} more {'game' if left == 1 else 'games'} to go."
        )
        if not counted:
            text = "That one finished early, so it won't count towards getting to know your pace. No problem at all."
        return {"explanation": text, "changed": None, "estimate_done": False}

    def _finish_estimate(self) -> dict:
        basis = self.progress["estimate"]["basis"][:STARTER_COUNT]
        m = statistics.median(b["level_f"] for b in basis)
        breaks = sum(1 for b in basis if b["break_requests"])
        hard = sum(1 for b in basis if b["feedback"] == "hard")
        easy = sum(1 for b in basis if b["feedback"] == "easy")
        notes = []
        if breaks >= 2 or hard >= 2:
            m -= 0.5
            notes.append("you took breaks or found some games tricky, so we're starting a little gentler")
        elif easy >= 3:
            m += 0.5
            notes.append("several games felt easy, so we're starting a little higher")
        level = int(round(clamp(m)))
        self.progress["estimate"].update({"done": True, "level": level})
        for gid, g in self.progress["games"].items():
            own = g.get("level_f", level)
            lvl = int(round(clamp((own + level) / 2)))
            g["dims"] = {"pace": lvl, "load": lvl, "visual": max(1, level - 1)}
        # Games not yet played start at the estimate, via dims_for fallbacks:
        self._estimate_level = level
        extra = f" ({'; '.join(notes)})" if notes else ""
        return {
            "explanation": (
                f"Thank you for playing five games. Based on them, a comfortable starting level looks like {level} out of 5{extra}. "
                "From here, games adjust a little at a time, and you can change any level yourself."
            ),
            "changed": "estimate",
            "estimate_done": True,
            "estimate_level": level,
        }

    def initial_dims_for_unplayed(self) -> dict:
        lvl = self.progress["estimate"].get("level")
        if lvl is None:
            return dict(BASE_DIMS)
        return {"pace": lvl, "load": lvl, "visual": max(1, lvl - 1)}

    def dims_for_game(self, game_id: str) -> dict:
        """dims_for, but unplayed games start at the estimate once it exists."""
        if game_id not in self.progress["games"] and self.progress["estimate"]["done"]:
            dims = self.initial_dims_for_unplayed()
            ov = self.override_for(game_id)
            if ov:
                dims.update({k: int(clamp(ov[k])) for k in DIMENSIONS if k in ov})
            return dims
        return self.dims_for(game_id)

    # ------------------------------------------------------- phase 2
    def _adapt(self, s: SessionSummary, g: dict) -> dict:
        dims = g.setdefault("dims", dict(BASE_DIMS))
        if self.override_for(s.game_id):
            return {"explanation": "You've set this level yourself, so we kept it exactly as you chose.", "changed": None}

        camera_used = s.tracking_reliability is not None
        if camera_used and s.tracking_reliability < 0.6:
            return {
                "explanation": (
                    "Movement tracking was patchy this time, so we didn't change the challenge. "
                    "Missed movements weren't counted as mistakes. Better light or seated mode may help."
                ),
                "changed": None,
            }

        fatigue = s.break_requests > 0 or not s.completed
        struggling = s.accuracy < 0.6 or s.feedback == "hard" or fatigue
        rt_ok = s.median_rt is None or s.median_rt <= s.target_rt * 1.3
        strong = s.accuracy >= 0.85 and rt_ok and s.completed and s.break_requests == 0 and s.feedback != "hard"

        if struggling:
            dim = g.get("last_changed") if g.get("last_direction") == "up" and g.get("last_changed") else None
            if dim is None or dims.get(dim, 1) <= 1:
                dim = max(("pace", "load", "visual"), key=lambda d: (dims.get(d, 1), d == "pace"))
            if dims.get(dim, 1) <= 1:
                return {"explanation": "That's a gentle level already, so we'll keep it. Each game is practice, not a test.", "changed": None}
            dims[dim] = int(clamp(dims[dim] - 1))
            g["last_changed"], g["last_direction"] = dim, "down"
            reason = "you took a break" if fatigue else ("you said it felt hard" if s.feedback == "hard" else "a few answers were tricky")
            return {
                "explanation": f"Because {reason}, next time will feel {DIM_WORDS[dim][1]}. That's completely fine.",
                "changed": dim,
                "direction": "down",
            }

        if strong:
            order = list(DIMENSIONS)
            last = g.get("last_changed")
            start = (order.index(last) + 1) % 3 if last in order and g.get("last_direction") == "up" else 0
            for i in range(3):
                dim = order[(start + i) % 3]
                if dims.get(dim, 1) < 5:
                    dims[dim] = int(clamp(dims[dim] + 1))
                    g["last_changed"], g["last_direction"] = dim, "up"
                    return {
                        "explanation": f"That went smoothly, so next time will be {DIM_WORDS[dim][0]}. Only this one thing changes.",
                        "changed": dim,
                        "direction": "up",
                    }
            return {"explanation": "You're at the top level for every setting here. Nicely done. We'll keep it.", "changed": None}

        return {"explanation": "That felt about right, so we'll keep things as they are.", "changed": None}


# ----------------------------------------------------------- recommendations
def recommend(profile: dict, progress: dict, catalog: dict, limit: int = 3) -> list[dict]:
    """Explainable recommendations from age, profile choices, preferences and play history."""
    traits = set((profile.get("profile") or {}).get("traits") or [])
    prefs = profile.get("preferences") or {}
    est_done = progress["estimate"]["done"]
    played = {sid: g.get("sessions", 0) for sid, g in progress["games"].items()}
    last_fb = {}
    for sess in progress["sessions"]:
        last_fb[sess["game"]] = sess.get("feedback")
    age = profile.get("age") or 9

    out = []
    for game in catalog["games"]:
        gid = game["id"]
        gt = set(game["traits"])
        score = 0.0
        reasons: list[str] = []
        phase_match = (game["phase"] == "starter") != est_done
        if phase_match and not played.get(gid):
            score += 5
            reasons.append("It's part of getting to know your pace." if not est_done else "It's a new one to try.")
        if not played.get(gid):
            score += 1
        else:
            score += max(0, 2 - played[gid] * 0.5)
            if last_fb.get(gid) == "right":
                score += 1.5
                reasons.append("You said this one felt just right.")
            if not est_done:
                # Getting to know your pace works best across five different games.
                score -= 12
        if "motion_sensitive" in traits and "calm" in gt:
            score += 1.5
            reasons.append("It has gentle, slow movement on screen.")
        if "light_sensitive" in traits and "calm" in gt:
            score += 0.5
        if "predictable_routines" in traits and "predictable" in gt:
            score += 2
            reasons.append("Its steps are the same every time.")
        if "likes_patterns" in traits and game["id"] in ("pattern_loom", "constellation_trace", "mirror_match", "lantern_memory", "steady_beat"):
            score += 2
            reasons.append("You enjoy patterns and sequences.")
        if "fewer_words" in traits and "visual" in gt:
            score += 1
            reasons.append("It uses pictures more than words.")
        if "needs_time" in traits and "no_time_pressure" in gt:
            score += 2
            reasons.append("There's no rush to answer.")
        if "fine_motor" in traits and ("left_right" in gt or game["id"] == "steady_beat"):
            score += 2
            reasons.append("You don't need to point precisely.")
        if prefs.get("movement_mode") in ("hands", "pose") and "movement" in gt:
            score += 1
            reasons.append("It works nicely with movement.")
        if age <= 8 and "quick" in gt:
            score -= 0.5
        if not reasons:
            reasons.append("A good balance of skills.")
        out.append({"game": game, "score": score, "reason": reasons[0], "reasons": reasons})
    out.sort(key=lambda r: -r["score"])
    return out[:limit]
