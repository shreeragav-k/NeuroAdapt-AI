// Make a Face: the rules, with no drawing and no camera, so they can be tested on their own.
// Ported from the supplied PyGame game (make_a_face.py). A face is shown; the player makes the same face and
// holds it for a moment before the time runs out. The camera's face model gives a few numbers ("blendshapes",
// each 0 to 1: how far the mouth is smiling, the jaw open, an eye closed ...). Only those numbers are used.
// Three rounds in the daily game; each round is right (matched in time) or wrong (time ran out).

export const THRESHOLDS = Object.freeze({
  smile: 0.5, surpriseJaw: 0.4, surpriseBrow: 0.4, winkClosed: 0.45, winkOpen: 0.25,
  puff: 0.35, pucker: 0.45, angry: 0.4, neutralMax: 0.2,
});
export const SMOOTHING_FRAMES = 5;              // the camera numbers are averaged over the last 5 pictures

export const EXPRESSIONS = Object.freeze({
  SMILE:    Object.freeze({ id: "SMILE",    label: "Smile",      hint: "Show a big, happy smile." }),
  SURPRISE: Object.freeze({ id: "SURPRISE", label: "Surprise",   hint: "Open your mouth wide and raise your eyebrows." }),
  WINK:     Object.freeze({ id: "WINK",     label: "Wink",       hint: "Close just one eye." }),
  PUFF:     Object.freeze({ id: "PUFF",     label: "Cheek puff", hint: "Fill both cheeks with air." }),
  PUCKER:   Object.freeze({ id: "PUCKER",   label: "Pucker",     hint: "Purse your lips forward, like a kiss or a whistle." }),
  NEUTRAL:  Object.freeze({ id: "NEUTRAL",  label: "Calm face",  hint: "Relax your whole face." }),
  ANGRY:    Object.freeze({ id: "ANGRY",    label: "Cross",      hint: "Pull your eyebrows down and together." }),
});

// The list level decides the pool of faces, the time and the hold (the first three levels of the original game).
export const FACE_LEVELS = Object.freeze({
  easy:   Object.freeze({ timer: 6, hold: 0.5,  pool: Object.freeze(["SMILE", "SURPRISE"]) }),
  medium: Object.freeze({ timer: 5, hold: 0.55, pool: Object.freeze(["SMILE", "SURPRISE", "WINK", "NEUTRAL"]) }),
  hard:   Object.freeze({ timer: 4, hold: 0.6,  pool: Object.freeze(["SMILE", "SURPRISE", "WINK", "PUFF", "PUCKER"]) }),
});
export const FACE_ROUNDS = 3;
export const faceSettings = (level, tier) => ({ ...FACE_LEVELS[level], pool: [...FACE_LEVELS[level].pool], timer: FACE_LEVELS[level].timer + (tier === 0 ? 2 : 0), rounds: FACE_ROUNDS });

// blendshape scores (0..1, by name) -> [expression, score]. "RESTING" means no clear expression.
export function classify(b) {
  const T = THRESHOLDS, g = (k) => b[k] || 0;
  const smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2;
  const jaw = g("jawOpen"), brow = (g("browInnerUp") + g("browOuterUpLeft") + g("browOuterUpRight")) / 3, surprise = (jaw + brow) / 2;
  const bl = g("eyeBlinkLeft"), br = g("eyeBlinkRight");
  const isWink = (bl > T.winkClosed && br < T.winkOpen) || (br > T.winkClosed && bl < T.winkOpen), wink = Math.max(bl, br);
  const puff = g("cheekPuff");
  const pucker = Math.max(g("mouthPucker"), (g("mouthPucker") + g("mouthFunnel")) / 2);
  const angry = (g("browDownLeft") + g("browDownRight")) / 2;
  const peak = Math.max(smile, jaw, brow, wink, puff, pucker, angry);
  const found = [];
  if (smile > T.smile) found.push(["SMILE", smile]);
  if (jaw > T.surpriseJaw && brow > T.surpriseBrow) found.push(["SURPRISE", surprise]);
  if (isWink) found.push(["WINK", wink]);
  if (puff > T.puff) found.push(["PUFF", puff]);
  if (pucker > T.pucker) found.push(["PUCKER", pucker]);
  if (angry > T.angry) found.push(["ANGRY", angry]);
  if (found.length) return found.reduce((a, c) => (c[1] > a[1] ? c : a));
  if (peak < T.neutralMax) return ["NEUTRAL", Math.max(0, 1 - peak / T.neutralMax)];
  return ["RESTING", 0.3];
}

// Averages the last few pictures' numbers so a flicker does not count.
export class Smoother {
  constructor(n = SMOOTHING_FRAMES) { this.n = n; this.h = []; }
  push(b) {
    if (!b) { this.h = []; return null; }
    this.h.push(b); if (this.h.length > this.n) this.h.shift();
    const out = {}; for (const k of Object.keys(b)) out[k] = this.h.reduce((a, x) => a + (x[k] || 0), 0) / this.h.length;
    return out;
  }
}

export class FaceRounds {
  constructor(settings, rng = Math.random) {
    this.s = settings; this.rng = rng; this.index = 0; this.log = []; this.points = 0; this.last = null;
    this.next();
  }
  get done() { return this.index >= this.s.rounds; }
  get round() { return Math.min(this.index + 1, this.s.rounds); }
  get progress() { return this.s.hold > 0 ? Math.min(1, this.held / this.s.hold) : 0; }
  // a new target that is not the one just shown
  next() {
    const pool = this.s.pool.filter((e) => e !== this.last), pick = pool[Math.floor(this.rng() * pool.length)] || this.s.pool[0];
    this.target = pick; this.last = pick; this.left = this.s.timer; this.held = 0;
  }
  _finish(ok) {
    this.log.push({ target: this.target, correct: ok });
    if (ok) this.points += 100 + Math.round((this.left / this.s.timer) * 50);
    this.index += 1;
    if (!this.done) this.next();
    return ok ? "success" : "timeout";
  }
  // `seen` = the expression the camera sees now (or null when there is no face). Returns "success" | "timeout" | null.
  update(dt, seen) {
    if (this.done) return null;
    this.left -= dt;
    this.held = seen === this.target ? this.held + dt : 0;                  // the face must be held without a break
    if (this.held >= this.s.hold) return this._finish(true);
    if (this.left <= 0) { this.left = 0; return this._finish(false); }
    return null;
  }
  // without a camera: the player picks a face
  choose(expression) { return this.done ? null : this._finish(expression === this.target); }
  trials(steps = [1, 2]) { return this.log.map((l, i) => ({ step: steps[i % steps.length], correct: l.correct, rt: null, target: l.target })); }
  get accuracy() { return this.log.length ? Math.round((100 * this.log.filter((l) => l.correct).length) / this.log.length) : 0; }
  get stars() { return this.accuracy >= 85 ? 3 : this.accuracy >= 60 ? 2 : 1; }
}
