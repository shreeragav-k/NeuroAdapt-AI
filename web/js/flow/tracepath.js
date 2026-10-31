// Paint the Path: the tracing rules, with no drawing and no camera, so they can be tested on their own.
// Ported from the supplied PyGame game (path_manager.py, tracing_engine.py, scoring.py, levels.py).
//
// A path is drawn as a dotted line from a glowing start to a star. The player moves a fingertip (or a mouse,
// or a finger on the screen) along it. The path must be followed in order; skipping ahead is not possible.
// Accuracy is how close the fingertip stays to the line. For the daily score the path is cut into 10 stretches
// and each stretch is right or wrong (see Tracer.trials).

export const ARENA = Object.freeze({ width: 1000, height: 600 });
export const BOUNDS = Object.freeze({ x: 70, y: 60, w: 860, h: 480 });
export const STRETCHES = 10;
export const STEP_PX = 3.5;               // distance between the points the path is cut into
export const LOOKAHEAD = 36;              // how many points ahead the fingertip may jump in one move
export const STRETCH_QUALITY = 0.7;       // a stretch is right if the fingertip stayed within 70% of the tolerance on average

// Tolerances are in arena pixels (the arena is 1000 x 600, shown scaled to the page).
export const SHAPES = Object.freeze({
  line:   Object.freeze({ id: "line",   title: "Straight line",   tolerance: 68, hint: "Trace gently along the path from the start to the star." }),
  circle: Object.freeze({ id: "circle", title: "Magic circle",    tolerance: 54, hint: "Follow the circle all the way around." }),
  zigzag: Object.freeze({ id: "zigzag", title: "Zigzag mountain", tolerance: 46, hint: "Go up and down the peaks and valleys." }),
  crown:  Object.freeze({ id: "crown",  title: "Golden crown",    tolerance: 40, hint: "Follow the crown and its pointed peaks." }),
});

// Two shapes in each list level, building up.
export const LEVEL_SHAPES = Object.freeze({ easy: ["line", "circle"], medium: ["circle", "zigzag"], hard: ["zigzag", "crown"] });
// Seconds allowed for each shape (a little more for ages 1 to 5).
export const LEVEL_SECONDS = Object.freeze({ easy: 45, medium: 40, hard: 35 });
export const toleranceFor = (shape, tier) => Math.round(SHAPES[shape].tolerance * (tier === 0 ? 1.35 : 1));
export const secondsFor = (level, tier) => LEVEL_SECONDS[level] + (tier === 0 ? 15 : 0);

// ------------------------------------------------------------------ geometry
export function waypoints(shape, b = BOUNDS) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, out = [];
  if (shape === "line") {
    const x0 = b.x + b.w * 0.15, x1 = b.x + b.w * 0.85, n = 10;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push([x0 + (x1 - x0) * t, cy - Math.sin(t * Math.PI) * b.h * 0.08]); }
  } else if (shape === "circle") {
    const r = Math.min(b.w, b.h) * 0.38, n = 48;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * 2 * Math.PI; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  } else if (shape === "zigzag") {
    const x0 = b.x + b.w * 0.12, x1 = b.x + b.w * 0.88, top = cy - b.h * 0.32, bot = cy + b.h * 0.32;
    for (const [t, y] of [[0, bot], [0.15, top], [0.3, bot], [0.48, top], [0.65, bot], [0.82, top], [1, bot]]) out.push([x0 + (x1 - x0) * t, y]);
  } else if (shape === "crown") {
    const w = b.w * 0.76, h = b.h * 0.65, left = cx - w / 2, bottom = cy + h * 0.38, base = cy + h * 0.22;
    const P = (fx, fy) => [left + w * fx, base - h * fy];
    out.push(
      [left + w * 0.08, bottom], P(0.05, 0.35), P(0.03, 0.55), P(0.07, 0.6), P(0.11, 0.55), P(0.18, 0.25),
      P(0.23, 0.55), P(0.26, 0.75), P(0.3, 0.7), P(0.38, 0.3), P(0.46, 0.65), [cx, base - h * 0.95], P(0.54, 0.65), P(0.62, 0.3),
      P(0.7, 0.7), P(0.74, 0.75), P(0.77, 0.55), P(0.82, 0.25), P(0.89, 0.55), P(0.93, 0.6), P(0.97, 0.55), P(0.95, 0.35),
      [left + w * 0.92, bottom], [left + w * 0.5, bottom + h * 0.08], [left + w * 0.08, bottom],
    );
  } else throw new Error("Unknown shape " + shape);
  return out;
}

export class PathManager {
  constructor(points, step = STEP_PX) {
    this.waypoints = points; this.points = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[i + 1], len = Math.hypot(x2 - x1, y2 - y1);
      if (len <= 0.001) continue;
      const n = Math.max(1, Math.round(len / step));
      for (let k = 0; k < n; k++) this.points.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
    }
    this.points.push(points[points.length - 1]);
  }
  get count() { return this.points.length; }
  get start() { return this.points[0]; }
  get end() { return this.points[this.points.length - 1]; }
  point(i) { return this.points[Math.max(0, Math.min(this.points.length - 1, i))]; }
  // closest path point inside a forward window, so the player cannot jump back or far ahead
  closest(px, py, from, window = LOOKAHEAD) {
    let best = Infinity, idx = from;
    for (let i = from; i < Math.min(this.points.length, from + window); i++) {
      const d = Math.hypot(px - this.points[i][0], py - this.points[i][1]);
      if (d < best) { best = d; idx = i; }
    }
    return [idx, best];
  }
}

// ------------------------------------------------------------------ tracing
export class Tracer {
  constructor(path, tolerance) {
    this.path = path; this.tolerance = tolerance; this.reset();
  }
  reset() {
    this.started = false; this.done = false; this.tracing = false; this.offPath = false;
    this.index = 0; this.deviations = []; this.devByStretch = Array.from({ length: STRETCHES }, () => []);
    this.completion = 0; this.accuracy = 100; this.trail = [];
  }
  get target() { return this.path.point(this.index); }
  get stretchSize() { return this.path.count / STRETCHES; }

  // fingertip = [x, y] in arena pixels, or null when no hand / pointer is there.
  // Returns { started, advanced, completed, offPath, tracing }.
  update(fingertip) {
    const ev = { started: false, advanced: false, completed: false, offPath: false, tracing: false };
    if (!fingertip || this.done) { this.tracing = false; this.offPath = false; return ev; }
    const [fx, fy] = fingertip, tol = this.tolerance;
    if (!this.started) {
      const [sx, sy] = this.path.start, d = Math.hypot(fx - sx, fy - sy);
      if (d <= tol * 1.3) { this.started = true; this.index = 0; this.deviations.push(d); this.devByStretch[0].push(d); this.trail.push(fingertip); this.tracing = true; ev.started = ev.tracing = true; }
      return ev;
    }
    const [bestIdx, bestDist] = this.path.closest(fx, fy, this.index);
    const cur = this.path.point(this.index), distCur = Math.hypot(fx - cur[0], fy - cur[1]), eff = Math.min(bestDist, distCur);
    if (eff <= tol) {
      this.offPath = false; this.tracing = true; ev.tracing = true;
      if (bestIdx > this.index) { this.index = bestIdx; ev.advanced = true; }
      this.deviations.push(eff); this.trail.push(fingertip);
      this.devByStretch[Math.min(STRETCHES - 1, Math.floor(this.index / this.stretchSize))].push(eff);
      const n = this.path.count, [ex, ey] = this.path.end, dEnd = Math.hypot(fx - ex, fy - ey);
      if (this.index >= n - 6 || (this.index >= n * 0.94 && dEnd <= tol * 1.2)) { this.index = n - 1; this.done = true; ev.completed = true; }
    } else { this.offPath = true; this.tracing = false; ev.offPath = true; }
    this.completion = this.done ? 100 : Math.min(100, (this.index / Math.max(1, this.path.count - 1)) * 100);
    if (this.deviations.length) {
      const avg = this.deviations.reduce((a, b) => a + b, 0) / this.deviations.length;
      this.accuracy = Math.round(Math.max(60, 100 - (avg / Math.max(1, tol)) * 38) * 10) / 10;
    }
    return ev;
  }

  // Which stretches (of 10) were traced well: reached, and the fingertip stayed close to the line.
  stretches() {
    const size = this.stretchSize;
    return Array.from({ length: STRETCHES }, (_, k) => {
      const end = Math.min(this.path.count - 1, Math.ceil((k + 1) * size) - 1);
      const reached = this.done || (this.started && this.index >= end);
      const d = this.devByStretch[k];
      const mean = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
      return reached && mean <= this.tolerance * STRETCH_QUALITY;
    });
  }
  // The shape as game trials, the same shape as every other game: one right / wrong per stretch.
  trials(steps = [1, 2]) {
    return this.stretches().map((ok, k) => ({ step: steps[k % steps.length], correct: ok, rt: null, shape: true }));
  }

  // Stars and points (as in the original scoring): accuracy and completion decide the stars.
  result(attempt = 1) {
    const acc = this.accuracy, comp = this.completion;
    let stars = 1, label = "Good effort!";
    if (comp < 50) { stars = 0; label = "Keep trying!"; }
    else if (acc >= 88 && comp >= 98) { stars = 3; label = "Perfect!"; }
    else if (acc >= 75 && comp >= 90) { stars = 2; label = "Great tracing!"; }
    const points = Math.round((1000 + Math.floor(acc * 12) + (attempt === 1 ? 200 : 100)) * (comp / 100));
    return { stars, label, accuracy: acc, completion: Math.round(comp), points };
  }
}

// Every shape starts and ends inside the arena, in order, and is long enough to trace.
export function buildShape(shape, tolerance) {
  const path = new PathManager(waypoints(shape));
  return { path, tracer: new Tracer(path, tolerance) };
}
