// Cut the Fruit: the rules, with no drawing and no camera, so they can be tested on their own.
// Ported from the supplied PyGame game (settings.py, slicing.py, fruit.py, game.py).
//
// Fruit and bombs are thrown up from the bottom of the field in waves. Swipe through a fruit to cut it and keep
// clear of the bomb. The daily game is 3 waves (rounds). Every thing thrown is one right / wrong trial:
//   fruit cut = right, fruit left to fall = wrong, bomb cut = wrong (and costs a life), bomb left alone = right.

export const ARENA = Object.freeze({ width: 1000, height: 600 });
export const SLICE_ROUNDS = 3;
export const LIVES = 3;
export const MIN_SLICE_SPEED = 160;          // px per second: a swipe, not a hand resting on the field
export const TOUCH = 16;                     // extra reach around each thing, in px
export const PAUSE_BETWEEN_WAVES = 1.0;      // seconds

// points and size of each fruit, as in the original game
export const FRUITS = Object.freeze({
  watermelon: Object.freeze({ points: 10, r: 52 }), apple: Object.freeze({ points: 5, r: 44 }), orange: Object.freeze({ points: 5, r: 46 }),
  pineapple: Object.freeze({ points: 15, r: 50 }), banana: Object.freeze({ points: 5, r: 45 }), strawberry: Object.freeze({ points: 10, r: 42 }),
  kiwi: Object.freeze({ points: 10, r: 44 }), coconut: Object.freeze({ points: 10, r: 48 }), mango: Object.freeze({ points: 10, r: 46 }),
  grapes: Object.freeze({ points: 15, r: 45 }),
});
export const FRUIT_NAMES = Object.freeze(Object.keys(FRUITS));
export const BOMB = Object.freeze({ r: 40 });

// What one wave holds, how long a throw stays in the air (s) and the gap between throws (s). Slower than the
// original on purpose, so a hand in front of a camera can follow.
export const SLICE_LEVELS = Object.freeze({
  easy:   Object.freeze({ fruits: 2, bombs: 1, flight: 2.6, spacing: 1.5 }),
  medium: Object.freeze({ fruits: 3, bombs: 1, flight: 2.2, spacing: 1.2 }),
  hard:   Object.freeze({ fruits: 4, bombs: 2, flight: 1.9, spacing: 0.9 }),
});
export const sliceSettings = (level, tier) => ({ ...SLICE_LEVELS[level], flight: SLICE_LEVELS[level].flight + (tier === 0 ? 0.4 : 0), rounds: SLICE_ROUNDS, lives: LIVES });

// does the segment p1 -> p2 pass within `radius` of `centre`?
export function segmentHits(p1, p2, c, radius) {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], l2 = dx * dx + dy * dy;
  if (l2 === 0) return (c[0] - p1[0]) ** 2 + (c[1] - p1[1]) ** 2 <= radius * radius;
  const t = Math.max(0, Math.min(1, ((c[0] - p1[0]) * dx + (c[1] - p1[1]) * dy) / l2));
  return (c[0] - (p1[0] + t * dx)) ** 2 + (c[1] - (p1[1] + t * dy)) ** 2 <= radius * radius;
}

const shuffle = (rng, xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const APEX = 340;                            // how high a throw rises, in px

export class SliceGame {
  constructor(settings, rng = Math.random) {
    this.s = settings; this.rng = rng; this.lives = settings.lives; this.points = 0;
    this.wave = 0; this.queue = []; this.things = []; this.halves = []; this.outcomes = []; this.events = [];
    this.t = 0; this.clock = 0; this.rest = 0; this.prev = null; this.over = null;
    this.g = (8 * APEX) / (settings.flight * settings.flight);       // px/s^2 so that a throw rises APEX and lands after `flight` s
    this.v0 = (4 * APEX) / settings.flight;
    this.startWave();
  }
  get done() { return !!this.over; }
  get round() { return Math.min(this.wave + 1, this.s.rounds); }
  startWave() {
    const kinds = shuffle(this.rng, [...Array(this.s.fruits).fill("fruit"), ...Array(this.s.bombs).fill("bomb")]);
    this.queue = kinds.map((kind, i) => ({ kind, at: 0.5 + i * this.s.spacing }));
    this.t = 0;
  }
  launch(kind) {
    const W = ARENA.width, H = ARENA.height, name = kind === "fruit" ? FRUIT_NAMES[Math.floor(this.rng() * FRUIT_NAMES.length)] : "bomb", r = kind === "fruit" ? FRUITS[name].r : BOMB.r;
    const x = 170 + this.rng() * (W - 340), vx = (this.rng() - 0.5) * 140;
    this.things.push({ kind, name, r, x, y: H + r, vx, vy: -this.v0, angle: 0, spin: (this.rng() - 0.5) * 4, state: "air" });
  }
  _record(thing, correct) { this.outcomes.push({ kind: thing.kind, name: thing.name, correct }); }

  // cursor = { x, y } in field pixels, or null when nothing is touching the field. Returns the events of this step.
  update(dt, cursor) {
    this.events = [];
    if (this.done) return this.events;
    this.clock += dt;
    // pause between waves
    if (this.rest > 0) { this.rest -= dt; if (this.rest <= 0) { this.wave += 1; if (this.wave >= this.s.rounds) this.over = "ROUNDS_DONE"; else this.startWave(); } this.prev = cursor ? [cursor.x, cursor.y] : null; this._halves(dt); return this.events; }
    this.t += dt;
    while (this.queue.length && this.queue[0].at <= this.t) this.launch(this.queue.shift().kind);
    // the swipe: from where the fingertip was to where it is now
    const now = cursor ? [cursor.x, cursor.y] : null;
    const swipe = this.prev && now && Math.hypot(now[0] - this.prev[0], now[1] - this.prev[1]) / Math.max(dt, 1e-3) >= MIN_SLICE_SPEED;
    for (const th of this.things) {
      if (th.state !== "air") continue;
      th.x += th.vx * dt; th.y += th.vy * dt; th.vy += this.g * dt; th.angle += th.spin * dt;
      if (swipe && segmentHits(this.prev, now, [th.x, th.y], th.r + TOUCH)) {
        th.state = "cut";
        if (th.kind === "fruit") {
          this.points += FRUITS[th.name].points; this._record(th, true); this.events.push({ type: "cut", thing: th });
          for (const d of [-1, 1]) this.halves.push({ name: th.name, side: d, x: th.x, y: th.y, vx: th.vx + d * 130, vy: th.vy * 0.4 - 90, angle: th.angle, spin: d * 3, life: 1.4 });
        } else { this.lives -= 1; th.cutAt = this.clock; this._record(th, false); this.events.push({ type: "bomb", thing: th }); }
      } else if (th.vy > 0 && th.y - th.r > ARENA.height) {                       // fell out of the bottom
        th.state = "gone";
        if (th.kind === "fruit") { this._record(th, false); this.events.push({ type: "missed", thing: th }); } else { this._record(th, true); this.events.push({ type: "avoided", thing: th }); }
      }
    }
    this.things = this.things.filter((th) => th.state === "air" || (th.state === "cut" && th.kind === "bomb" && this.clock - th.cutAt < 0.5));
    this._halves(dt);
    this.prev = now;
    if (this.lives <= 0) { this.over = "NO_LIVES"; return this.events; }
    if (!this.queue.length && !this.things.some((th) => th.state === "air")) this.rest = PAUSE_BETWEEN_WAVES;
    return this.events;
  }
  _halves(dt) { for (const h of this.halves) { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += this.g * dt; h.angle += h.spin * dt; h.life -= dt; } this.halves = this.halves.filter((h) => h.life > 0 && h.y < ARENA.height + 120); }

  trials(steps = [1, 2]) {
    const list = this.outcomes.length ? this.outcomes : [{ kind: "fruit", name: "apple", correct: false }];
    return list.map((o, i) => ({ step: steps[i % steps.length], correct: o.correct, rt: null, outcome: o.correct ? (o.kind === "fruit" ? "cut" : "avoided") : (o.kind === "fruit" ? "missed" : "bomb") }));
  }
  get accuracy() { return this.outcomes.length ? Math.round((100 * this.outcomes.filter((o) => o.correct).length) / this.outcomes.length) : 0; }
  get stars() { return this.accuracy >= 85 ? 3 : this.accuracy >= 60 ? 2 : 1; }
}
