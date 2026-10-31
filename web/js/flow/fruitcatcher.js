// Fruit Catcher rules, with no drawing and no camera, so they can be tested on their own.
// The same rules as game/fruit_catcher/logic.py (the PyGame window), played here inside the website.
//
// A fruit and a chocolate fall together in the two outer lanes. Be in the lane of the fruit (+1);
// a chocolate costs a life. The middle lane is always safe. A round ends when time is up or lives run out.

export const DURATIONS = [30, 60, 90];
export const LIVES = 3;
export const BASE_FALL_SPEED = 8;        // pixels per step; one step is 1/60 s
export const MAX_SPEED_BONUS = 7;        // +1 speed for every 3 fruit caught, up to this much
export const FRUIT_KINDS = 4;            // apple, cherries, watermelon, mango
export const STEP = 1 / 60;

// The game inside a daily session: one scored round, set by the player's level and age group.
// Easy 30 s, Medium 45 s, Hard 60 s. The fall is slow enough to follow with a hand in front of a camera
// (4, 5 and 6 pixels a step, against 8 in free play), a little faster again after every 5 fruit (at most +2),
// and slower still for ages 1 to 5.
export const SESSION_PLAY = Object.freeze({
  easy: Object.freeze({ duration: 30, baseSpeed: 4 }),
  medium: Object.freeze({ duration: 45, baseSpeed: 5 }),
  hard: Object.freeze({ duration: 60, baseSpeed: 6 }),
});
export const SESSION_SPEED_UP = Object.freeze({ every: 5, max: 2 });
export const SESSION_ROUNDS = 3;          // a round is one fall (a fruit and a chocolate); the daily game is 3 of them
export const sessionPlay = (level, tier) => {
  const p = SESSION_PLAY[level];
  return { duration: p.duration, baseSpeed: p.baseSpeed - (tier === 0 ? 1 : 0), lives: LIVES, speedUp: SESSION_SPEED_UP, rounds: SESSION_ROUNDS };
};

export const LAYOUT = Object.freeze({
  width: 1180, height: 760, charW: 150, charH: 225, item: 128, bottomMargin: 36,
  laneX: Object.freeze([1180 / 4, 1180 / 2, (3 * 1180) / 4]),
  charTop: 760 - 225 - 36,
});

// x of the wrist across the mirrored camera picture (0 = left edge, 1 = right edge) -> lane
export const laneFromX = (x) => (x < 0.4 ? 0 : x > 0.6 ? 2 : 1);

// pointer position across the playing area (0..1) -> lane (thirds), for mouse and touch
export const laneFromPointer = (fx) => (fx < 1 / 3 ? 0 : fx > 2 / 3 ? 2 : 1);

export class Round {
  constructor(duration = 60, rng = Math.random, layout = LAYOUT, { baseSpeed = BASE_FALL_SPEED, lives = LIVES, speedUp = { every: 3, max: MAX_SPEED_BONUS }, rounds = null } = {}) {
    this.maxFalls = rounds;                 // null = play until time or lives run out
    this.duration = duration; this.rng = rng; this.layout = layout; this.baseSpeed = baseSpeed; this.speedUp = speedUp;
    this.outcomes = [];                     // one entry per fall: "caught" | "missed" | "hit" (a chocolate that was touched)
    this.lives = lives; this.caught = 0; this.hit = 0; this.missed = 0;
    this.elapsed = 0; this.frame = 0;
    this.lane = 1; this.charX = layout.laneX[1];
    this.over = null;                       // null | "TIME_UP" | "OUT_OF_LIVES"
    [this.fruit, this.choc] = this.spawn();
  }

  get score() { return this.caught; }
  get remaining() { return Math.max(0, Math.floor(this.duration - this.elapsed)); }
  get speed() { return this.baseSpeed + Math.min(Math.floor(this.caught / this.speedUp.every), this.speedUp.max); }
  get speedFactor() { return Math.round((this.speed / this.baseSpeed) * 10) / 10; }

  spawn() {
    const side = this.rng() < 0.5 ? 0 : 2, top = -this.layout.item;
    return [{ lane: side, y: top, kind: Math.floor(this.rng() * FRUIT_KINDS) }, { lane: 2 - side, y: top, kind: 0 }];
  }

  // does the item overlap the player (a box around the player's body, a little forgiving at the edges)?
  touching(item) {
    const L = this.layout;
    const horizontal = Math.abs(this.charX - L.laneX[item.lane]) < (L.charW + L.item) / 2 - 18;
    const vertical = item.y + L.item > L.charTop + 24 && item.y < L.charTop + L.charH;
    return horizontal && vertical;
  }

  // Advance one step. `lane` = where the player wants to be (null keeps the last lane).
  // Returns events for the screen: { type: "caught" | "hit" | "missed", x, y }.
  update(dt = STEP, lane = null) {
    if (this.over) return [];
    if (lane !== null && lane !== undefined) this.lane = lane;
    const L = this.layout;
    this.elapsed += dt; this.frame += 1;
    this.charX += (L.laneX[this.lane] - this.charX) * 0.28;
    const events = [], step = this.speed;
    this.fruit.y += step; this.choc.y += step;
    let respawn = false;
    if (this.touching(this.fruit)) { this.caught += 1; this.outcomes.push("caught"); events.push({ type: "caught", x: L.laneX[this.fruit.lane], y: this.fruit.y }); respawn = true; }
    if (this.touching(this.choc)) { this.lives -= 1; this.hit += 1; this.outcomes.push("hit"); events.push({ type: "hit", x: L.laneX[this.choc.lane], y: this.choc.y }); respawn = true; }
    if (!respawn && this.fruit.y > L.height) { this.missed += 1; this.outcomes.push("missed"); events.push({ type: "missed", x: L.laneX[this.fruit.lane], y: L.height - 60 }); respawn = true; }
    if (respawn) [this.fruit, this.choc] = this.spawn();
    if (this.maxFalls && this.outcomes.length >= this.maxFalls) this.over = "ROUNDS_DONE";
    else if (this.remaining <= 0) this.over = "TIME_UP";
    else if (this.lives <= 0) this.over = "OUT_OF_LIVES";
    return events;
  }

  // The round as game trials, the same shape as every other game: a fruit caught is right; a fruit missed
  // or a chocolate touched is wrong. `step` is the level's step, alternating low and high like the other games.
  trials(steps = [1, 2]) {
    const list = this.outcomes.map((o, i) => ({ step: steps[i % steps.length], correct: o === "caught", rt: null, outcome: o }));
    return list.length ? list : [{ step: steps[0], correct: false, rt: null, outcome: "missed" }];
  }

  summary() {
    return {
      score: this.score, caught: this.caught, hit: this.hit, missed: this.missed,
      duration_s: this.duration, played_s: Math.round(this.elapsed * 10) / 10, ended: this.over || "QUIT",
    };
  }
}
