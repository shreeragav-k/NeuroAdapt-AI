// Game engines: pure trial generators (no DOM). Each returns plain descriptors
// that play.js draws. A game = one engine + one content set + one age tier.
//
//   makeGame(game, rng) -> { rounds(isTest), trial(i, step) }
//
// `step` is the difficulty step 1 (gentlest) to 6 (hardest). `tier` is the age
// tier 0/1/2, which scales ranges (counts, lengths, speed) for the age group.

import {
  GROUPS, WORD_LISTS, FOILS, OPPOSITES, LOOKALIKE_DIGITS, NAMES, GREEK, SYLLOGISMS, STORIES, ANALOGIES,
} from "./data.js";
import { sessionPlay } from "./fruitcatcher.js";
import { LEVEL_SHAPES, SHAPES, secondsFor, toleranceFor } from "./tracepath.js";
import { SEQUENCES, FEED_PLAY } from "./feedanimal.js";
import { faceSettings } from "./expressions.js";
import { sliceSettings } from "./slicerules.js";
import { pictureSvg, ANIMALS, FRUITS, VEHICLES, THINGS, ALL_PICTURES, PICTURE_SETS } from "./art.js";

// -------------------------------------------------------------- small helpers
const rint = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
function shuffle(rng, a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
const take = (rng, a, n) => shuffle(rng, a).slice(0, n);
const ramp = (tier, step, lo, hi) => Math.round(lo[tier] + ((hi[tier] - lo[tier]) * (step - 1)) / 5);
const at = (arr, step) => arr[step - 1];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const txt = (s, cls = "") => `<span class="tx ${cls}">${esc(s)}</span>`;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Build the options of a choice: one correct, the rest unique wrong ones.
function choose(rng, correct, wrongs, n) {
  const seen = new Set([correct.key]);
  const pool = [];
  for (const w of wrongs) if (!seen.has(w.key)) { seen.add(w.key); pool.push(w); }
  if (pool.length < n - 1) throw new Error(`Not enough distinct wrong options (${pool.length}) for ${n}`);
  const opts = shuffle(rng, [correct, ...pool.slice(0, n - 1)]);
  return { options: opts, answer: opts.findIndex((o) => o.key === correct.key) };
}
// Same, but the wrong options are shuffled first (for a candidate list that is only a pool).
const chooseFrom = (rng, correct, pool, n) => choose(rng, correct, shuffle(rng, pool), n);

function numOptions(rng, correct, cands, n, min = 0) {
  const o = (v) => ({ key: String(v), html: txt(String(v), "num") });
  const wrongs = cands.filter((v) => Number.isInteger(v) && v >= min && v !== correct).map(o);
  return chooseFrom(rng, o(correct), wrongs, n);
}
const nearOffsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 10, -10];
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Letter options around the right one: neighbours first, then random letters if needed.
function letterOptions(rng, idx, extra, n) {
  const o = (i) => ({ key: ALPHA[i], html: txt(ALPHA[i], "big") });
  const near = [1, -1, 2, -2, 3, ...extra].map((d) => idx + d).filter((i) => i >= 0 && i <= 25 && i !== idx);
  const rest = shuffle(rng, Array.from({ length: 26 }, (_, i) => i).filter((i) => i !== idx));
  return choice_(rng, o(idx), [...near, ...rest].map(o), n);
}
// choose() for a pool already in preference order (no extra shuffle).
function choice_(rng, correct, wrongs, n) { return choose(rng, correct, wrongs, n); }

// ---------------------------------------------------------------- visuals
export const COLORS = { red: "#d64545", blue: "#3a6fd8", green: "#3f9d5a", yellow: "#e8b923", orange: "#ec8a2f", purple: "#8a58c9", pink: "#e57fae", brown: "#8b5e3c" };
const COLOR_NAMES = Object.keys(COLORS);
const star = (cx, cy, ro, ri) => Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const poly = (cx, cy, r, n, off = -Math.PI / 2) => Array.from({ length: n }, (_, i) => { const a = off + (i * 2 * Math.PI) / n; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const SHAPE_SVG = {
  circle: `<circle cx="50" cy="50" r="42"/>`,
  square: `<rect x="12" y="12" width="76" height="76" rx="7"/>`,
  triangle: `<polygon points="50,10 93,86 7,86"/>`,
  star: `<polygon points="${star(50, 53, 46, 19)}"/>`,
  heart: `<path d="M50 88 C8 58 6 28 28 20 C40 16 50 25 50 34 C50 25 60 16 72 20 C94 28 92 58 50 88Z"/>`,
  diamond: `<polygon points="50,5 93,50 50,95 7,50"/>`,
  hexagon: `<polygon points="${poly(50, 50, 44, 6, 0)}"/>`,
  pentagon: `<polygon points="${poly(50, 54, 44, 5)}"/>`,
  cross: `<polygon points="35,8 65,8 65,35 92,35 92,65 65,65 65,92 35,92 35,65 8,65 8,35 35,35"/>`,
  crescent: `<path d="M64 8 A44 44 0 1 0 64 92 A34 34 0 1 1 64 8Z"/>`,
};
export const SHAPE_NAMES = Object.keys(SHAPE_SVG);
const TOT_SHAPES = ["circle", "square", "triangle", "star", "heart", "diamond"];
const shapePool = (tier) => (tier === 0 ? TOT_SHAPES : SHAPE_NAMES);
const NEUTRAL = "#2b6e6a";
export const shapeSvg = (name, color = NEUTRAL, px = 64, rot = 0) =>
  `<svg class="sh" viewBox="0 0 100 100" width="${px}" height="${px}" role="img" aria-label="${name}" style="${rot ? `transform:rotate(${rot}deg)` : ""}"><g fill="${color}">${SHAPE_SVG[name]}</g></svg>`;
const swatch = (name, px = 64) => `<span class="sw" role="img" aria-label="${name}" style="background:${COLORS[name]};width:${px}px;height:${px}px"></span>`;
const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;

// 0/1 patterns on an n x n board
const patKey = (c) => c.join("");
const randPattern = (rng, n) => { const cells = Array.from({ length: n * n }, () => (rng() < 0.5 ? 1 : 0)); const on = cells.reduce((a, b) => a + b, 0); return on < 2 || on > n * n - 2 ? randPattern(rng, n) : cells; };
const toGrid = (c, n) => Array.from({ length: n }, (_, r) => c.slice(r * n, r * n + n));
const flat = (g) => g.flat();
const flipH = (c, n) => flat(toGrid(c, n).map((r) => [...r].reverse()));
const flipV = (c, n) => flat([...toGrid(c, n)].reverse());
const rotCW = (c, n) => { const g = toGrid(c, n); return flat(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, k) => g[n - 1 - k][r]))); };
const rot = (c, n, times) => { let x = c; for (let i = 0; i < times; i++) x = rotCW(x, n); return x; };
function mutate(rng, c, k) { const x = [...c]; for (const i of take(rng, x.map((_, i) => i), k)) x[i] = 1 - x[i]; return x; }
export const patternSvg = (c, n, px = 72, rotDeg = 0, mirror = false) =>
  `<svg class="pat" viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" role="img" aria-label="pattern" style="${rotDeg || mirror ? `transform:${mirror ? "scaleX(-1) " : ""}rotate(${rotDeg}deg)` : ""}"><rect width="${n}" height="${n}" fill="#fff" stroke="#d9d0bd" stroke-width=".06"/>${c.map((v, i) => (v ? `<rect x="${i % n + 0.06}" y="${Math.floor(i / n) + 0.06}" width=".88" height=".88" rx=".1" fill="${NEUTRAL}"/>` : "")).join("")}</svg>`;

function dotsHtml(n, color = NEUTRAL, cols = 4, px = 20) {
  return `<span class="dotbox" style="grid-template-columns:repeat(${cols},${px + 6}px)">${Array.from({ length: n }, () => `<i style="width:${px}px;height:${px}px;background:${color}"></i>`).join("")}</span>`;
}
// Scatter `count` items over a cols x rows grid of slots (percent coordinates).
function scatter(rng, count, cols, rows) {
  const slots = shuffle(rng, Array.from({ length: cols * rows }, (_, i) => i)).slice(0, count);
  return slots.map((s) => ({ x: ((s % cols) + 0.5 + (rng() - 0.5) * 0.4) * (100 / cols), y: (Math.floor(s / cols) + 0.5 + (rng() - 0.5) * 0.4) * (100 / rows) }));
}
const scatterHtml = (items) => `<div class="field">${items.map((it) => `<span class="at" style="left:${it.x.toFixed(1)}%;top:${it.y.toFixed(1)}%">${it.html}</span>`).join("")}</div>`;

const choice = (o) => ({ kind: "choice", showMs: 0, ...o });

// ------------------------------------------------------------------- engines
const E = {};

// ---- match: find the identical picture
E.match = ({ tier, rng, content }) => ({
  trial(i, s) {
    if (content !== "pictures") throw new Error("match: " + content);
    const nOpt = at([[2, 2, 3, 3, 4, 4], [3, 3, 4, 4, 5, 5], [4, 4, 5, 5, 6, 6]][tier], s);
    const sample = pick(rng, ALL_PICTURES);
    const group = [ANIMALS, FRUITS, VEHICLES, THINGS].find((g) => g.includes(sample));
    const pool = (s >= 3 ? group : ALL_PICTURES).filter((x) => x !== sample);
    const rest = ALL_PICTURES.filter((x) => x !== sample && !pool.includes(x));
    const wrong = [...take(rng, pool, nOpt - 1), ...take(rng, rest, nOpt)].map((n) => ({ key: n, html: pictureSvg(n, 74) }));
    return choice({ prompt: "Tap the same picture.", stimulus: pictureSvg(sample, 110), ...choose(rng, { key: sample, html: pictureSvg(sample, 74) }, wrong, nOpt), size: "lg" });
  },
});

// ---- odd: tap the one that is different
E.odd = ({ tier, rng, content }) => ({
  trial(i, s) {
    const N = at([[3, 4, 4, 6, 6, 9], [4, 6, 9, 9, 12, 12], [6, 9, 9, 12, 12, 16]][tier], s);
    const cols = N <= 4 ? 2 : N <= 9 ? 3 : 4;
    const oddAt = rint(rng, 0, N - 1);
    const cells = (render) => Array.from({ length: N }, (_, j) => render(j === oddAt));
    const out = (html, prompt = "Tap the one that is different.") => choice({ prompt, options: html.map((h, j) => ({ key: String(j), html: h })), answer: oddAt, cols });
    if (content === "animals" || content === "things") {
      const pool = PICTURE_SETS[content], a = pick(rng, pool), b = pick(rng, pool.filter((x) => x !== a));
      const tint = () => (s >= 3 ? COLORS[pick(rng, COLOR_NAMES)] : null);       // from step 3 the colours are a distraction
      return out(cells((isOdd) => pictureSvg(isOdd ? b : a, 62, tint())));
    }
    if (content === "size") {
      const r = at([1.8, 1.6, 1.4, 1.3, 1.22, 1.15], s), big = rng() < 0.5, p = pick(rng, ANIMALS);
      return out(cells((o) => `<span class="slot">${pictureSvg(p, Math.round(o ? (big ? 52 * r : 52 / r) : 52))}</span>`));
    }
    if (content === "rotation") {
      const n = 3; let p, ok = false;
      for (let t = 0; t < 200 && !ok; t++) { p = randPattern(rng, n); ok = [1, 2, 3].every((k) => patKey(rot(p, n, k)) !== patKey(p)); }
      const deg = pick(rng, [90, 180, 270]);
      return out(cells((o) => patternSvg(p, n, 56, o ? deg : 0)), "Tap the one that is turned differently.");
    }
    throw new Error("odd: " + content);
  },
});

// ---- compare: two groups flash for a moment, which had more? (visual short-term memory)
E.compare = ({ rng, content }) => ({
  trial(i, s) {
    if (content !== "glance") throw new Error("compare: " + content);
    const d = at([3, 3, 2, 2, 1, 1], s), M = ramp(0, s, [4, 4, 4], [8, 8, 8]);
    const a = rint(rng, 1 + d, M), b = a - d, left = rng() < 0.5, col = COLORS[pick(rng, COLOR_NAMES)];
    const box = (n) => `<span class="cmpbox">${dotsHtml(n, col, 4, 18)}</span>`;
    return choice({ prompt: "Look quickly!", showMs: 1100, ask: "Which side had MORE?", stimulus: `<div class="pair">${box(left ? a : b)}${box(left ? b : a)}</div>`, options: [{ key: "left", html: txt("Left") }, { key: "right", html: txt("Right") }], answer: left ? 0 : 1, cols: 2 });
  },
});

// ---- recall (seen / missing), delayed recall, memory basket, object location, story recall, paired associates, matrix, analogy
const WORD_POOL = [...WORD_LISTS.animals, ...WORD_LISTS.food, ...WORD_LISTS.nature];
function itemPool(content, tier) {
  if (PICTURE_SETS[content]) return PICTURE_SETS[content];
  if (content === "tinted") return ANIMALS.flatMap((a) => COLOR_NAMES.map((b) => `${a}|${b}`));
  if (content === "digits") return "123456789".split("");
  if (content === "letters") return "BCDFGHJKLMNPQRSTVWXZ".split("");
  if (content === "words") return WORD_POOL;
  if (content === "symbols") return GREEK;
  throw new Error("unknown item kind " + content);
}
function itemHtml(content, v, px = 62) {
  if (PICTURE_SETS[content]) return pictureSvg(v, px);
  if (content === "tinted") { const [a, b] = v.split("|"); return pictureSvg(a, px, COLORS[b], v); }
  return txt(v, content === "words" ? "word" : "big");
}
const rowOf = (content, arr) => `<div class="rowset">${arr.map((v) => itemHtml(content, v)).join("")}</div>`;

function recallTrial({ tier, rng, content, mode }, s) {
  if (content === "positions") {
    const n = s <= 4 ? 3 : 4, k = Math.min(at([3, 3, 4, 4, 5, 5], s), n * n - 1);
    const lit = take(rng, Array.from({ length: n * n }, (_, j) => j), k).sort((a, b) => a - b);
    const mk = (idx) => Array.from({ length: n * n }, (_, j) => (idx.includes(j) ? 1 : 0));
    const base = mk(lit), wrongs = [];
    for (let t = 0; t < 40; t++) { const move = pick(rng, lit); const free = Array.from({ length: n * n }, (_, j) => j).filter((j) => !lit.includes(j)); wrongs.push(mk(lit.filter((j) => j !== move).concat(pick(rng, free)))); }
    const r = choose(rng, { key: patKey(base), html: patternSvg(base, n, 84) }, wrongs.map((w) => ({ key: patKey(w), html: patternSvg(w, n, 84) })), 4);
    return choice({ prompt: "Remember where the squares are.", showMs: 1200 + k * 450, ask: "Which one is the same layout?", stimulus: patternSvg(base, n, 150), ...r, cols: 2 });
  }
  const pool = itemPool(content, tier), nOpt = at([2, 3, 3, 4, 4, 4], s);
  let kk = Math.max(mode === "missing" ? 2 : 1, tier === 0 ? at([1, 2, 2, 3, 3, 4], s) : ramp(tier, s, [0, 3, 4], [0, 6, 7]));
  if (mode !== "missing") kk = Math.min(kk, pool.length - (nOpt - 1));          // leave enough unseen items to choose from
  const set = take(rng, pool, kk), showMs = (tier === 0 ? 2500 : 1500) + kk * 1100;
  if (mode === "missing") {
    const gone = pick(rng, set), rest = set.filter((v) => v !== gone);
    const options = shuffle(rng, set).map((v) => ({ key: v, html: itemHtml(content, v, 56) }));
    return choice({ prompt: "Remember these. One will leave.", showMs, ask: "Which one left?", stimulus: rowOf(content, set), after: rowOf(content, rest), options, answer: options.findIndex((o) => o.key === gone), cols: Math.min(kk, 4) });
  }
  const seen = pick(rng, set);
  const r = choose(rng, { key: seen, html: itemHtml(content, seen, 56) }, take(rng, pool.filter((v) => !set.includes(v)), nOpt - 1).map((v) => ({ key: v, html: itemHtml(content, v, 56) })), nOpt);
  return choice({ prompt: "Remember what you see.", showMs, ask: "Which one was in the picture?", stimulus: rowOf(content, set), ...r, cols: Math.min(nOpt, 4) });
}
E.recall = (ctx) => ({ trial: (i, s) => recallTrial(ctx, s) });

// delayed recall: the same, but a short distraction fills the gap before the answer
const DELAY_MS = [[1500, 2000, 2500, 3000, 3500, 4000], [2500, 3000, 3500, 4000, 4500, 5000], [3000, 4000, 5000, 6000, 7000, 8000]];
const DELAY_TEXT = ["Clap your hands three times while you wait!", "Count backwards from 10 in your head.", "Count backwards from 50 in threes in your head."];
E.delayed = (ctx) => ({
  trial(i, s) {
    return { ...recallTrial({ ...ctx, mode: "seen" }, s), delayMs: at(DELAY_MS[ctx.tier], s), delayText: DELAY_TEXT[ctx.tier] };
  },
});

// memory basket: study several items, then tap ALL of them among look-alikes
E.basket = ({ tier, rng, content }) => ({
  trial(i, s) {
    const pool = content === "words" ? WORD_POOL : PICTURE_SETS[content];
    if (!pool) throw new Error("basket: " + content);
    const kind = content === "words" ? "words" : content, k = Math.min(at([[2, 2, 2, 3, 3, 3], [3, 3, 4, 4, 5, 5], [4, 4, 5, 5, 6, 6]][tier], s), Math.floor(pool.length / 2));
    const seen = take(rng, pool, k), unseen = take(rng, pool.filter((v) => !seen.includes(v)), k);
    const options = shuffle(rng, [...seen, ...unseen]).map((v) => ({ key: v, html: itemHtml(kind, v, tier === 0 ? 72 : 60) }));
    const answers = options.map((o, j) => (seen.includes(o.key) ? j : -1)).filter((j) => j >= 0);
    return choice({
      prompt: "Remember everything in the basket.", showMs: (tier === 0 ? 2500 : 1500) + k * 1200, ask: `Tap all ${k} things you saw, then press Done.`,
      stimulus: rowOf(kind, seen), options, multi: true, answers, answer: answers[0], allowed: tier === 0 || s <= 2 ? 1 : 0,
      cols: options.length <= 4 ? 2 : options.length <= 6 ? 3 : 4, meta: { seen },
    });
  },
});

// object location: which cell held this item?
E.objloc = ({ tier, rng, content }) => ({
  trial(i, s) {
    const n = at([[2, 2, 3, 3, 3, 3], [3, 3, 3, 4, 4, 4], [3, 4, 4, 4, 5, 5]][tier], s), k = at([[1, 2, 2, 2, 3, 3], [2, 2, 3, 3, 4, 4], [3, 3, 3, 4, 4, 5]][tier], s);
    const items = take(rng, itemPool(content, tier), k), all = Array.from({ length: n * n }, (_, j) => j), cells = take(rng, all, k);
    const grid = `<div class="locgrid" style="grid-template-columns:repeat(${n},1fr)">${all.map((c) => { const j = cells.indexOf(c); return `<span class="lc">${j >= 0 ? itemHtml(content, items[j], 52) : ""}</span>`; }).join("")}</div>`;
    const t = rint(rng, 0, k - 1), want = cells[t];
    const mini = (c) => patternSvg(all.map((j) => (j === c ? 1 : 0)), n, 74);
    const r = choose(rng, { key: String(want), html: mini(want) }, shuffle(rng, all.filter((c) => c !== want)).map((c) => ({ key: String(c), html: mini(c) })), 4);
    return choice({ prompt: "Remember where each one is.", showMs: 1800 + k * 1300, ask: "Where was this one?", stimulus: grid, after: `<div class="stim-item">${itemHtml(content, items[t], 72)}</div>`, ...r, cols: 2, meta: { n, cells, want } });
  },
});

// story recall: read, then answer a question about a detail
E.story = ({ rng, content }) => ({
  trial(i, s) {
    const e = pick(rng, STORIES[content]), words = e.t.split(/\s+/).length, o = (v) => ({ key: v, html: txt(v, "stmt") });
    return choice({ prompt: "Read carefully. You will be asked about it.", showMs: Math.round((2500 + words * 380) * at([1.3, 1.2, 1.1, 1, 0.9, 0.8], s)), ask: e.q, stimulus: `<div class="story">${esc(e.t)}</div>`, ...choose(rng, o(e.a), e.w.map(o), 4), cols: 1, meta: { q: e.q } });
  },
});

// paired associates: learn which goes with which, then answer from the cue
E.assoc = ({ tier, rng, content }) => ({
  trial(i, s) {
    const k = at([[2, 2, 2, 3, 3, 3], [3, 3, 4, 4, 5, 5], [4, 4, 5, 5, 6, 6]][tier], s), nOpt = tier === 0 ? 3 : 4;
    const row = (a, b) => `<div class="studyrow">${a}<i>→</i>${b}</div>`;
    let pairs, pool, ask;
    if (content === "animalcolor") {
      const an = take(rng, ANIMALS, k), co = take(rng, COLOR_NAMES, k);
      pairs = an.map((a, j) => ({ cue: { key: a, html: pictureSvg(a, 84, "#cfc9bb") }, ans: { key: co[j], html: swatch(co[j], 56) }, study: `<div class="studyrow">${pictureSvg(a, 72, COLORS[co[j]], `${a}|${co[j]}`)}</div>` }));
      pool = COLOR_NAMES.map((c) => ({ key: c, html: swatch(c, 56) })); ask = "What colour was this animal?";
    } else if (content === "wordnumber") {
      const ws = take(rng, WORD_POOL, k), ns = take(rng, "123456789".split(""), k);
      pairs = ws.map((w, j) => ({ cue: { key: w, html: txt(w, "huge") }, ans: { key: ns[j], html: txt(ns[j], "big") }, study: row(txt(w, "word"), txt(ns[j], "big")) }));
      pool = "123456789".split("").map((d) => ({ key: d, html: txt(d, "big") })); ask = "Which number went with this word?";
    } else if (content === "namejob") {
      const nm = take(rng, NAMES, k), jb = take(rng, WORD_LISTS.professions, k);
      pairs = nm.map((n, j) => ({ cue: { key: n, html: txt(n, "huge") }, ans: { key: jb[j], html: txt(jb[j], "word") }, study: row(txt(n, "word"), txt(jb[j], "word")) }));
      pool = WORD_LISTS.professions.map((w) => ({ key: w, html: txt(w, "word") })); ask = "What was this person's job?";
    } else if (content === "wordpair") {
      const ws = take(rng, WORD_POOL, 2 * k);
      pairs = Array.from({ length: k }, (_, j) => ({ cue: { key: ws[2 * j], html: txt(ws[2 * j], "huge") }, ans: { key: ws[2 * j + 1], html: txt(ws[2 * j + 1], "word") }, study: row(txt(ws[2 * j], "word"), txt(ws[2 * j + 1], "word")) }));
      pool = WORD_POOL.map((w) => ({ key: w, html: txt(w, "word") })); ask = "Which word went with this one?";
    } else throw new Error("assoc: " + content);
    const t = pick(rng, pairs), others = pairs.filter((p) => p !== t).map((p) => p.ans), fresh = pool.filter((o) => !pairs.some((p) => p.ans.key === o.key));
    const r = choose(rng, t.ans, [...shuffle(rng, others), ...shuffle(rng, fresh)], nOpt);
    return choice({ prompt: "Remember which goes with which.", showMs: 1500 + k * 2200, ask, stimulus: `<div class="studylist">${pairs.map((p) => p.study).join("")}</div>`, after: `<div class="stim-item">${t.cue.html}</div>`, ...r, cols: nOpt, meta: { cue: t.cue.key, ans: t.ans.key, pairs: pairs.map((p) => [p.cue.key, p.ans.key]) } });
  },
});

// matrix reasoning: which piece completes the grid?
E.matrix = ({ tier, rng, content }) => ({
  trial(i, s) {
    const nOpt = at([3, 3, 4, 4, 5, 5], s), mr = rint(rng, 0, 2), mc = rint(rng, 0, 2);
    const table = (cellHtml) => `<table class="matrix">${[0, 1, 2].map((r) => `<tr>${[0, 1, 2].map((c) => `<td class="${r === mr && c === mc ? "q" : ""}">${r === mr && c === mc ? "?" : cellHtml(r, c)}</td>`).join("")}</tr>`).join("")}</table>`;
    if (content === "shapes") {
      const S = take(rng, shapePool(tier), 3), Cs = take(rng, COLOR_NAMES, 3);
      const tok = (r, c) => `${S[(r + c) % 3]}|${Cs[c]}`, html = (t) => { const [a, b] = t.split("|"); return shapeSvg(a, COLORS[b], 48); };
      const correct = tok(mr, mc), [cs, cc] = correct.split("|");
      const near = [];
      for (const x of S) if (x !== cs) near.push(`${x}|${cc}`);
      for (const y of Cs) if (y !== cc) near.push(`${cs}|${y}`);
      const rest = []; for (const x of S) for (const y of Cs) if (`${x}|${y}` !== correct) rest.push(`${x}|${y}`);
      const extra = take(rng, shapePool(tier).filter((x) => !S.includes(x)), 2).map((x) => `${x}|${cc}`);
      return choice({ prompt: "Which piece completes the grid?", stimulus: table((r, c) => html(tok(r, c))), ...choose(rng, { key: correct, html: html(correct) }, [...shuffle(rng, near), ...shuffle(rng, rest), ...extra].map((t) => ({ key: t, html: html(t) })), nOpt), cols: Math.min(nOpt, 5), meta: { mr, mc, correct } });
    }
    if (content === "rotation") {
      const n = 3;
      for (let t = 0; t < 400; t++) {
        const P = [0, 1, 2].map(() => randPattern(rng, n));
        if (!P.every((p) => [1, 2, 3].every((k) => patKey(rot(p, n, k)) !== patKey(p)))) continue;
        if (new Set(P.map(patKey)).size < 3) continue;
        const cell = (r, c) => rot(P[r], n, c), correct = cell(mr, mc);
        const cands = [rot(P[mr], n, (mc + 1) % 4), rot(P[mr], n, (mc + 2) % 4), rot(P[mr], n, (mc + 3) % 4), cell((mr + 1) % 3, mc), cell((mr + 2) % 3, mc), flipH(correct, n), mutate(rng, correct, 1)];
        const seen = new Set([patKey(correct)]), wrongs = [];
        for (const w of cands) if (!seen.has(patKey(w))) { seen.add(patKey(w)); wrongs.push(w); }
        if (wrongs.length < nOpt - 1) continue;
        const h = (c) => patternSvg(c, n, 52);
        return choice({ prompt: "Each row turns the same way. Which piece completes the grid?", stimulus: table((r, c) => h(cell(r, c))), ...choose(rng, { key: patKey(correct), html: h(correct) }, wrongs.map((w) => ({ key: patKey(w), html: h(w) })), nOpt), cols: Math.min(nOpt, 5), meta: { n, P, mr, mc, correct } });
      }
      throw new Error("matrix: could not build");
    }
    throw new Error("matrix: " + content);
  },
});

// analogies: A is to B as C is to ?
E.analogy = ({ rng, content }) => ({
  trial(i, s) {
    const e = pick(rng, ANALOGIES[content]), o = (v) => ({ key: v, html: txt(v, "word") });
    return choice({ prompt: "Which word completes the pair?", stimulus: `<div class="analogy">${esc(e.q)}</div>`, ...choose(rng, o(e.a), e.w.map(o), 4), cols: 2 });
  },
});

// ---- series: what comes next?
E.series = ({ tier, rng, content }) => ({
  trial(i, s) {
    const nOpt = at([3, 3, 3, 4, 4, 4], s);
    const showSeq = (arr) => `<div class="rowset">${arr.join("")}<span class="qmark">?</span></div>`;
    if (content === "animals" || content === "tinted") {
      const units = at([["AB"], ["AB", "ABB"], ["AAB", "ABB"], ["ABC", "AABB"], ["ABC", "ABAC"], ["ABCB", "AABB", "ABAC"]], s);
      const unit = pick(rng, units), len = unit.length;
      const L = 2 * len + rint(rng, 0, len - 1);
      const letters = [...new Set(unit)];
      let tokens, render, allTokens;
      if (content === "animals") { const an = take(rng, ANIMALS, letters.length); tokens = Object.fromEntries(letters.map((l, j) => [l, an[j]])); render = (a) => pictureSvg(a, 56); allTokens = ANIMALS; }
      else {
        const an = take(rng, ANIMALS, letters.length), cs = take(rng, COLOR_NAMES, letters.length);
        tokens = Object.fromEntries(letters.map((l, j) => [l, `${an[j]}|${cs[j]}`]));
        render = (t) => { const [a, b] = t.split("|"); return pictureSvg(a, 56, COLORS[b], t); };
        allTokens = ANIMALS.flatMap((a) => COLOR_NAMES.map((b) => `${a}|${b}`));
      }
      const seq = Array.from({ length: L }, (_, j) => tokens[unit[j % len]]), next = tokens[unit[L % len]];
      const inUnit = Object.values(tokens).filter((t) => t !== next);
      const wrongs = shuffle(rng, inUnit).concat(shuffle(rng, allTokens.filter((t) => !Object.values(tokens).includes(t))));
      return choice({ prompt: "What comes next?", stimulus: showSeq(seq.map(render)), ...choose(rng, { key: next, html: render(next) }, wrongs.map((t) => ({ key: t, html: render(t) })), nOpt), size: "lg", meta: { unit, L } });
    }
    if (content === "number") {
      const d = pick(rng, at([[1, 2], [2, 3], [3, 4, 5], [4, 5, 6], [6, 7, 8], [7, 9, 11]], s)), len = s <= 2 ? 4 : 5, up = s <= 2 || rng() < 0.6;
      const start = up ? rint(rng, 1, 20) : d * (len + 1) + rint(rng, 0, 15);
      const sign = up ? 1 : -1, seq = Array.from({ length: len }, (_, j) => start + sign * d * j), next = start + sign * d * len;
      const r = numOptions(rng, next, [next + d, next - d, next + 1, next - 1, next + 2 * d, next - 2 * d, next + 10, next + 2], 4, 0);
      return choice({ prompt: "Find the rule. What number comes next?", stimulus: showSeq(seq.map((n) => txt(String(n), "big"))), ...r, meta: { seq, d: sign * d } });
    }
    if (content === "numberalt") {
      const [da, db] = pick(rng, at([[[1, 10]], [[2, 10], [3, 5]], [[2, -3], [3, 5]], [[4, -2], [5, -3]], [[3, 7], [-2, 6]], [[-3, 8], [5, -4]]], s));
      const xs = rint(rng, 30, 60), ys = rint(rng, 30, 60), shown = s <= 2 ? 5 : 6;
      const track = (n) => (n % 2 === 0 ? xs + da * (n / 2) : ys + db * ((n - 1) / 2));
      const seq = Array.from({ length: shown }, (_, j) => track(j)), next = track(shown);
      const r = numOptions(rng, next, [next + 1, next - 1, next + da, next + db, next - da, next - db, next + 2, next - 2, next + 10], 4, 0);
      return choice({ prompt: "Two rules take turns. What comes next?", stimulus: showSeq(seq.map((n) => txt(String(n), "big"))), ...r, meta: { seq } });
    }
    throw new Error("series: " + content);
  },
});

// ---- serial subtraction (working memory under load)
E.arith = ({ rng, content }) => ({
  trial(i, s) {
    if (content !== "serial") throw new Error("arith: " + content);
    const d = pick(rng, at([[2, 3], [3, 4], [4, 5, 6], [6, 7], [7, 8, 9], [7, 8, 9]], s)), start = rint(rng, d * 6 + 20, d * 6 + at([40, 50, 70, 90, 120, 150], s));
    const shown = [start, start - d, start - 2 * d], v = start - 3 * d, expr = `${shown.join(", ")}, ?`;
    return { ...choice({ prompt: "Keep going. What comes next?", stimulus: txt(expr, "huge"), ...numOptions(rng, v, [v + d, v - d, v + 1, v - 1, v + 2 * d, v - 2, v + 2, v + 10], 4, 0), layout: "numbers" }), meta: { expr, value: v } };
  },
});

// ---- mirror / rotate / flip / mental rotation
E.mirror = ({ rng, content }) => ({
  trial(i, s) {
    const n = s <= 3 ? 3 : 4, nOpt = at([3, 3, 4, 4, 4, 4], s);
    for (let t = 0; t < 400; t++) {
      const P = randPattern(rng, n);
      let T, wrongs, prompt;
      if (content === "mirror") { T = flipH(P, n); prompt = "Which one is the MIRROR image, with LEFT and RIGHT swapped?"; wrongs = [P, flipV(P, n), rot(P, n, 2), mutate(rng, T, 1), mutate(rng, T, 2), mutate(rng, T, 1)]; }
      else if (content === "flip") { T = flipV(P, n); prompt = "Which one is the pattern flipped UPSIDE DOWN?"; wrongs = [P, flipH(P, n), rot(P, n, 2), mutate(rng, T, 1), mutate(rng, T, 2), mutate(rng, T, 1)]; }
      else if (content === "rotate") { T = rot(P, n, 1); prompt = "Which one is the pattern turned a QUARTER TURN CLOCKWISE?"; wrongs = [rot(P, n, 3), rot(P, n, 2), flipH(rot(P, n, 1), n), P, mutate(rng, T, 1), mutate(rng, T, 2)]; }
      else if (content === "mentalrotation") {
        const k = rint(rng, 1, 3); T = rot(P, n, k); prompt = "Which one is the SAME pattern, just turned?";
        const rots = [0, 1, 2, 3].map((j) => patKey(rot(P, n, j)));
        const mir = flipH(P, n), cands = [0, 1, 2, 3].map((j) => rot(mir, n, j));
        if (cands.some((c) => rots.includes(patKey(c)))) continue;       // pattern is not chiral: skip
        wrongs = cands;
      } else throw new Error("mirror: " + content);
      const keys = new Set([patKey(T)]), uniq = [];
      for (const w of wrongs) if (!keys.has(patKey(w))) { keys.add(patKey(w)); uniq.push(w); }
      if (patKey(T) === patKey(P)) continue;   // symmetric: the answer would look like the question
      if (uniq.length < nOpt - 1) continue;
      const r = choose(rng, { key: patKey(T), html: patternSvg(T, n, 80) }, uniq.map((w) => ({ key: patKey(w), html: patternSvg(w, n, 80) })), nOpt);
      return choice({ prompt, stimulus: patternSvg(P, n, 120), ...r, cols: 2, meta: { n, P, T } });
    }
    throw new Error("mirror: could not build");
  },
});

// ---- stroop
E.stroop = ({ rng, content }) => ({
  trial(i, s) {
    const names = COLOR_NAMES.slice(0, at([4, 4, 5, 5, 6, 6], s)), word = pick(rng, names);
    const congruent = s <= 2 && rng() < 0.4, ink = congruent ? word : pick(rng, names.filter((x) => x !== word));
    const opts = take(rng, names.filter((x) => x !== word && x !== ink), 2).concat([word, ink]);
    const optList = [...new Set(opts)].map((n) => ({ key: n, html: txt(cap(n), "big") }));
    const target = content === "reverse" ? word : ink;
    const options = shuffle(rng, optList);
    return choice({
      prompt: content === "reverse" ? "Choose the colour the word NAMES." : "Choose the colour of the INK.",
      stimulus: `<span class="stroop" style="color:${COLORS[ink]}">${cap(word)}</span>`,
      options, answer: options.findIndex((o) => o.key === target), cols: 2, meta: { word, ink },
    });
  },
});

// ---- n-back (stateful stream)
E.nback = ({ tier, rng, content }) => {
  if (!["animal", "letter", "digit", "position"].includes(content)) throw new Error("nback: " + content);
  const seq = [];
  const fresh = () => (content === "letter" ? pick(rng, "BDGKPQTVZ".split("")) : content === "animal" ? pick(rng, ANIMALS) : content === "digit" ? rint(rng, 1, 9) : rint(rng, 0, 8));
  const show = (v) => (content === "letter" ? txt(v, "huge") : content === "digit" ? txt(String(v), "giant") : content === "animal" ? pictureSvg(v, 120) : patternSvg(Array.from({ length: 9 }, (_, j) => (j === v ? 1 : 0)), 3, 120));
  return {
    trial(i, s) {
      const n = tier === 2 && s >= 5 ? 2 : 1, preface = [];
      while (seq.length < n) { const v = fresh(); seq.push(v); preface.push(show(v)); }
      const isMatch = rng() < 0.4;
      let v = isMatch ? seq[seq.length - n] : fresh();
      if (!isMatch) { let guard = 0; while (v === seq[seq.length - n] && guard++ < 50) v = fresh(); }
      const answer = v === seq[seq.length - n] ? 0 : 1;
      seq.push(v);
      return choice({ prompt: n === 1 ? "Is it the SAME as the one just before?" : "Is it the SAME as TWO steps ago?", preface: preface.length ? preface : undefined, prefaceCaption: "Remember", stimulus: show(v), options: [{ key: "yes", html: txt("Yes, same") }, { key: "no", html: txt("No, different") }], answer, cols: 2 });
    },
  };
};

// ---- symbol code (key lookup)
E.symbolcode = ({ tier, rng, content }) => {
  const size = 6, shapes = take(rng, SHAPE_NAMES, size);
  const vals = content === "digits" ? take(rng, "123456789".split(""), size) : take(rng, "ABCDEFGHJKLMNPRSTUVWXYZ".split(""), size);
  const key = `<div class="codekey">${shapes.map((sh, j) => `<span class="kc">${shapeSvg(sh, NEUTRAL, 34)}<b>${vals[j]}</b></span>`).join("")}</div>`;
  return {
    trial(i, s) {
      const j = rint(rng, 0, size - 1), nOpt = at([3, 3, 4, 4, 5, 5], s);
      if (content === "reverse") {
        const o = (k) => ({ key: shapes[k], html: shapeSvg(shapes[k], NEUTRAL, 52) });
        return choice({ prompt: "Which symbol goes with this letter?", stimulus: `${key}<div class="codetarget">${txt(vals[j], "huge")}</div>`, ...choose(rng, o(j), shuffle(rng, shapes.map((_, k) => k).filter((k) => k !== j)).map(o), nOpt), cols: nOpt > 4 ? 3 : nOpt });
      }
      const o = (v) => ({ key: v, html: txt(v, "big") });
      return choice({ prompt: content === "digits" ? "Which number goes with this symbol?" : "Which letter goes with this symbol?", stimulus: `${key}<div class="codetarget">${shapeSvg(shapes[j], NEUTRAL, 76)}</div>`, ...choose(rng, o(vals[j]), shuffle(rng, vals.filter((v) => v !== vals[j])).map(o), nOpt), cols: nOpt > 4 ? 3 : nOpt });
    },
  };
};

// ---- flanker
E.flanker = ({ rng, content }) => ({
  trial(i, s) {
    const side = at([1, 1, 2, 2, 3, 3], s), incong = rng() < at([0.2, 0.3, 0.5, 0.6, 0.7, 0.7], s);
    const dirs = ["left", "right"], ch = content === "arrows" ? { left: "←", right: "→" } : { left: "S", right: "H" };
    const c = pick(rng, dirs), f = incong ? (c === "left" ? "right" : "left") : c;
    const chars = [...Array(side).fill(ch[f]), ch[c], ...Array(side).fill(ch[f])];
    const stim = `<div class="flank">${chars.map((x, j) => `<span class="${j === side ? "mid" : ""}">${x}</span>`).join("")}</div>`;
    const opts = content === "arrows"
      ? [{ key: "left", html: txt("← Left", "big") }, { key: "right", html: txt("Right →", "big") }]
      : [{ key: "left", html: txt("S", "big") }, { key: "right", html: txt("H", "big") }];
    return choice({ prompt: content === "arrows" ? "Which way does the MIDDLE arrow point?" : "Which is the MIDDLE letter?", stimulus: stim, options: opts, answer: c === "left" ? 0 : 1, cols: 2, meta: { c, f } });
  },
});

// ---- route: follow the moves
E.route = ({ rng, content }) => ({
  trial(i, s) {
    const W = s <= 3 ? 4 : 5, cols = "ABCDE".slice(0, W).split("");
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, arrow = { up: "↑", down: "↓", left: "←", right: "→" };
    for (let t = 0; t < 400; t++) {
      const start = [rint(rng, 0, W - 1), rint(rng, 0, W - 1)];
      let [x, y] = start; const moves = [];
      const nMoves = content === "arrows" ? at([2, 2, 3, 4, 5, 6], s) : at([2, 2, 3, 3, 4, 4], s);
      let ok = true;
      for (let m = 0; m < nMoves && ok; m++) {
        const opts = [];
        for (const d of Object.keys(D)) {
          const maxK = content === "arrows" ? 1 : 3;
          for (let k = 1; k <= maxK; k++) { const nx = x + D[d][0] * k, ny = y + D[d][1] * k; if (nx >= 0 && nx < W && ny >= 0 && ny < W) opts.push([d, k]); }
        }
        if (!opts.length) { ok = false; break; }
        const [d, k] = pick(rng, opts); x += D[d][0] * k; y += D[d][1] * k; moves.push([d, k]);
      }
      if (!ok || (x === start[0] && y === start[1])) continue;
      const lab = (cx, cy) => `${cols[cx]}${cy + 1}`;
      const cand = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < W) cand.push(lab(nx, ny)); }
      if (cand.length < 3) continue;
      const o = (v) => ({ key: v, html: txt(v, "big") });
      const grid = `<table class="routegrid"><tr><th></th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${Array.from({ length: W }, (_, r) => `<tr><th>${r + 1}</th>${cols.map((_, c) => `<td class="${c === start[0] && r === start[1] ? "start" : ""}">${c === start[0] && r === start[1] ? "Start" : ""}</td>`).join("")}</tr>`).join("")}</table>`;
      const text = content === "arrows" ? moves.map(([d]) => arrow[d]).join("  ") : moves.map(([d, k]) => `${d} ${k}`).join(", then ");
      return choice({ prompt: "Follow the moves from Start. Where do you finish?", stimulus: `${grid}<div class="moves">${esc(text)}</div>`, ...choose(rng, o(lab(x, y)), shuffle(rng, cand).map(o), 4), cols: 2, meta: { start, moves, end: [x, y], W } });
    }
    throw new Error("route: could not build");
  },
});

// ---- logic
E.logic = ({ rng, content }) => ({
  trial(i, s) {
    if (content === "syllogism") {
      const e = pick(rng, SYLLOGISMS), o = (v) => ({ key: v, html: txt(v, "stmt") });
      return choice({ prompt: "Which statement MUST be true?", stimulus: `<div class="story">${esc(e.p)}</div>`, ...choose(rng, o(e.a), e.w.map(o), 4), cols: 1 });
    }
    const n = at([3, 3, 4, 4, 5, 5], s), people = take(rng, NAMES, n);                 // people[0] is the tallest
    const lines = shuffle(rng, people.slice(0, -1).map((p, j) => `${p} is taller than ${people[j + 1]}.`));
    const q = s >= 5 && n >= 4 ? "second" : s >= 3 && rng() < 0.5 ? "shortest" : "tallest";
    const target = q === "tallest" ? people[0] : q === "shortest" ? people[n - 1] : people[1];
    const opts = shuffle(rng, people).map((p) => ({ key: p, html: txt(p, "big") }));
    return choice({ prompt: q === "tallest" ? "Who is the TALLEST?" : q === "shortest" ? "Who is the SHORTEST?" : "Who is the SECOND tallest?", stimulus: `<div class="story">${lines.map(esc).join("<br>")}</div>`, options: opts, answer: opts.findIndex((x) => x.key === target), cols: n > 3 ? 3 : n, meta: { people, q } });
  },
});

// ---- task switching
E.switch = ({ tier, rng, content }) => {
  let lastCue = null;
  return {
    trial(i, s) {
      const cue = (i >> 1) % 2, changed = lastCue !== null && cue !== lastCue; lastCue = cue;
      const banner = changed ? "The rule has changed!" : "";
      if (content === "animalcolor") {
        const an = pick(rng, ANIMALS), c = pick(rng, COLOR_NAMES), stim = pictureSvg(an, 110, COLORS[c]);
        if (cue === 0) {
          const r = choose(rng, { key: c, html: swatch(c, 64) }, take(rng, COLOR_NAMES.filter((x) => x !== c), 2).map((n) => ({ key: n, html: swatch(n, 64) })), 3);
          return choice({ prompt: "Rule: tap its COLOUR.", banner, stimulus: stim, ...r, size: "lg" });
        }
        const r = choose(rng, { key: an, html: pictureSvg(an, 72) }, take(rng, ANIMALS.filter((x) => x !== an), 2).map((n) => ({ key: n, html: pictureSvg(n, 72) })), 3);
        return choice({ prompt: "Rule: tap which ANIMAL it is.", banner, stimulus: stim, ...r, size: "lg" });
      }
      if (content === "parity") {
        const v = pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
        if (cue === 0) return choice({ prompt: "Rule: is the number ODD or EVEN?", banner, stimulus: txt(String(v), "huge"), options: [{ key: "odd", html: txt("Odd", "big") }, { key: "even", html: txt("Even", "big") }], answer: v % 2 ? 0 : 1, cols: 2 });
        return choice({ prompt: "Rule: is the number BIG (6 to 9) or SMALL (1 to 4)?", banner, stimulus: txt(String(v), "huge"), options: [{ key: "big", html: txt("Big", "big") }, { key: "small", html: txt("Small", "big") }], answer: v > 5 ? 0 : 1, cols: 2 });
      }
      if (content === "letternumber") {
        const L = pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXZ".split("")), d = rint(rng, 1, 9), stim = `<span class="tx huge spaced">${L} ${d}</span>`;
        if (cue === 0) return choice({ prompt: "Rule: is the LETTER a vowel or a consonant?", banner, stimulus: stim, options: [{ key: "vowel", html: txt("Vowel", "big") }, { key: "consonant", html: txt("Consonant", "big") }], answer: "AEIOU".includes(L) ? 0 : 1, cols: 2 });
        return choice({ prompt: "Rule: is the NUMBER odd or even?", banner, stimulus: stim, options: [{ key: "odd", html: txt("Odd", "big") }, { key: "even", html: txt("Even", "big") }], answer: d % 2 ? 0 : 1, cols: 2 });
      }
      throw new Error("switch: " + content);
    },
  };
};

// ================================================================ custom (interactive) engines
const PAD_TIME = [[1000, 950, 900, 850, 800, 750], [850, 800, 750, 700, 650, 600], [800, 750, 700, 650, 600, 550]];

// Sequence repeat. "flash" lights up the pads; "centre" shows each item in the middle (a true span).
function buildSequence({ tier, rng, content }, centre) {
  const lens = centre
    ? { digits: [3, 3, 4, 4, 5, 6], revdigits: [3, 3, 3, 4, 4, 5], letters: [3, 3, 4, 4, 5, 5], revletters: [3, 3, 4, 4, 5, 5], letternumber: [3, 3, 4, 4, 5, 6] }[content]
    : { animals: [2, 2, 3, 3, 3, 4], fruits: [2, 2, 3, 3, 3, 4], positions: [2, 2, 3, 3, 3, 4], letters: [3, 3, 4, 4, 5, 5], corsi: [3, 3, 4, 5, 5, 6], greek: [4, 4, 5, 5, 6, 7] }[content];
  if (!lens) throw new Error((centre ? "span: " : "sequence: ") + content);
  const reverse = content === "revdigits" || content === "revletters", letterPad = take(rng, "BCDFGHJKLMNPRSTVWZ".split(""), 8);
  let pads;
  if (!centre && (content === "animals" || content === "fruits")) pads = take(rng, PICTURE_SETS[content], 4).map((c) => ({ id: c, html: pictureSvg(c, 74) }));
  else if (centre && (content === "digits" || content === "revdigits")) pads = "1234567890".split("").map((c) => ({ id: c, html: txt(c, "big") }));
  else if (content === "letters" || content === "revletters") pads = letterPad.map((c) => ({ id: c, html: txt(c, "big") }));
  else if (content === "letternumber") pads = [..."123456789".split(""), ...letterPad].map((c) => ({ id: c, html: txt(c, "big") }));
  else if (content === "greek") pads = GREEK.slice(0, 6).map((c) => ({ id: c, html: txt(c, "big") }));
  else if (content === "corsi") pads = scatter(rng, 9, 4, 3).map((p, j) => ({ id: String(j), html: "", x: p.x, y: p.y }));
  return {
    trial(i, s) {
      const layout = content === "positions" ? (s <= 4 ? "grid2" : "grid3") : content === "corsi" ? "scatter" : content === "letternumber" ? "grid6" : centre && (content === "digits" || content === "revdigits") ? "keypad" : content === "animals" || content === "fruits" ? "row" : "grid4";
      let use = pads;
      if (content === "positions") { const n = s <= 4 ? 2 : 3; use = Array.from({ length: n * n }, (_, j) => ({ id: String(j), html: "" })); }
      const len = at(lens, s);
      let items = [], expected;
      if (content === "letternumber") {
        const dn = Math.ceil(len / 2), digits = take(rng, "123456789".split(""), dn), letters = take(rng, letterPad, len - dn);
        items = shuffle(rng, [...digits, ...letters]);
        expected = [...[...digits].sort(), ...[...letters].sort()];
      } else {
        for (let j = 0; j < len; j++) { let id; do { id = pick(rng, use).id; } while (j > 0 && id === items[j - 1]); items.push(id); }   // no immediate repeats
        expected = reverse ? [...items].reverse() : items;
      }
      const prompt = content === "letternumber" ? "Watch the numbers and letters." : reverse ? "Watch. Then tap them in REVERSE order." : "Watch carefully.";
      const ask = content === "letternumber" ? "Tap the NUMBERS from smallest to biggest, then the LETTERS in alphabet order." : reverse ? "Now tap them backwards." : "Now you. Tap them in the same order.";
      return { kind: "sequence", prompt, ask, pads: use, layout, items, reverse, centre, onMs: at(PAD_TIME[tier], s), expected };
    },
  };
}
E.sequence = (ctx) => buildSequence(ctx, false);
E.span = (ctx) => buildSequence(ctx, true);

E.order = ({ tier, rng, content }) => ({
  trial(i, s) {
    const nn = content === "countdown" ? at([4, 5, 5, 6, 7, 8], s) : content === "numbers" ? at([3, 3, 3, 4, 4, 5], s) : content === "trail" ? at([6, 6, 8, 8, 10, 10], s) : at([3, 3, 4, 4, 5, 5], s);
    const pos = scatter(rng, nn, 4, 3);
    let targets, expected, prompt;
    if (content === "numbers") { targets = Array.from({ length: nn }, (_, j) => ({ id: String(j + 1), html: txt(String(j + 1), "big"), cls: "bubble" })); expected = targets.map((t) => t.id); prompt = "Tap the numbers in order: 1, 2, 3 and on."; }
    else if (content === "countdown") { targets = Array.from({ length: nn }, (_, j) => ({ id: String(nn - j), html: txt(String(nn - j), "big"), cls: "bubble" })); expected = targets.map((t) => t.id); prompt = `Tap backwards: ${nn} down to 1.`; targets = shuffle(rng, targets); }
    else if (content === "trail") {
      // Trail Making B: 1, A, 2, B, 3, C ... switching between numbers and letters
      targets = Array.from({ length: nn }, (_, j) => { const v = j % 2 === 0 ? String(j / 2 + 1) : "ABCDEFGH"[(j - 1) / 2]; return { id: v, html: txt(v, "big"), cls: j % 2 === 0 ? "bubble" : "bubble alt" }; });
      expected = targets.map((t) => t.id); prompt = "Tap in order, switching: 1, A, 2, B, 3, C and on.";
    } else if (content === "size") {
      const col = COLORS[pick(rng, COLOR_NAMES)];
      targets = Array.from({ length: nn }, (_, j) => ({ id: String(j), html: shapeSvg("circle", col, 34 + j * 16), cls: "free" }));
      expected = targets.map((t) => t.id); prompt = "Tap the circles from the SMALLEST to the BIGGEST.";
    } else throw new Error("order: " + content);
    const shuffled = content === "countdown" ? targets : shuffle(rng, targets);
    return { kind: "order", prompt, targets: shuffled.map((t, j) => ({ ...t, x: pos[j].x, y: pos[j].y })), expected };
  },
});

// visual search / cancellation: tap every target, ignore the look-alikes
E.search = ({ tier, rng, content }) => ({
  trial(i, s) {
    const T = at([[2, 2, 3, 3, 3, 4], [3, 3, 4, 4, 5, 5], [3, 4, 4, 5, 5, 6]][tier], s), D = at([[3, 4, 5, 6, 7, 8], [8, 10, 12, 14, 16, 18], [10, 12, 14, 16, 18, 20]][tier], s);
    const total = Math.min(20, T + D), dn = total - T, px = tier === 0 ? 60 : 46;
    let target, distract, prompt;
    if (content === "fruits") {
      const far = s <= 2 ? [...THINGS, ...VEHICLES] : s <= 4 ? FRUITS.filter((f) => f !== "apple") : ["strawberry", "cherries", "pear", "banana", "carrot"];
      target = () => pictureSvg("apple", px); distract = () => pictureSvg(pick(rng, far), px); prompt = "Tap every apple.";
    }
    else if (content === "conjunction") { target = () => pictureSvg("fish", px, COLORS.red); distract = () => (rng() < 0.5 ? pictureSvg("bird", px, COLORS.red) : pictureSvg("fish", px, COLORS.blue)); prompt = "Tap every RED fish. Not the blue fish, not the red birds."; }
    else if (content === "letters") { const pool = (s <= 2 ? "AMTLKWNS" : "DPREFHK").split(""); target = () => txt("B", "big"); distract = () => txt(pick(rng, pool), "big"); prompt = "Tap every letter B."; }
    else if (content === "digits") { const pool = (s <= 2 ? "134689" : "1234569").split(""); target = () => txt("7", "big"); distract = () => txt(pick(rng, pool), "big"); prompt = "Tap every number 7."; }
    else if (content === "lookalike") { const pool = (s <= 2 ? "mnartek" : "dpqdpqh").split(""); target = () => txt("b", "big"); distract = () => txt(pick(rng, pool), "big"); prompt = "Tap every lowercase b. Beware of letters that look like it."; }
    else throw new Error("search: " + content);
    const items = shuffle(rng, [...Array.from({ length: T }, (_, j) => ({ id: "t" + j, html: target() })), ...Array.from({ length: dn }, (_, j) => ({ id: "d" + j, html: distract() }))]);
    const pos = scatter(rng, total, 5, 4);
    return { kind: "order", anyOrder: true, allowed: tier === 0 ? 2 : 1, prompt, targets: items.map((it, j) => ({ ...it, cls: "free", x: pos[j].x, y: pos[j].y })), expected: items.filter((it) => it.id[0] === "t").map((it) => it.id) };
  },
});

const PERIOD = [[3600, 3300, 3000, 2700, 2400, 2100], [3000, 2700, 2400, 2100, 1800, 1600], [2400, 2100, 1800, 1600, 1400, 1200]];
E.timing = ({ tier, rng, content }) => ({
  trial(i, s) {
    const w = at([0.34, 0.3, 0.26, 0.22, 0.18, 0.15], s), c = 0.25 + rng() * 0.5;
    return { kind: "timing", prompt: content === "dot" ? "Tap to stop the dot inside the green zone." : "Tap to stop the bus on the green stop.", zone: [c - w / 2, c + w / 2], periodMs: at(PERIOD[tier], s), maxPasses: 3, icon: content === "dot" ? null : pictureSvg("bus", 40) };
  },
});

E.gonogo = ({ tier, rng, content }) => {
  const blocks = [];       // every block of 3 rounds holds exactly one no-go
  const WIN = [[3500, 3200, 2900, 2600, 2300, 2000], [1800, 1600, 1400, 1200, 1000, 850], [1600, 1400, 1200, 1000, 850, 700]][tier];
  const tint = () => COLORS[pick(rng, COLOR_NAMES)];
  const stim = (go, s) => {
    if (content === "animals") { const a = go ? "cat" : pick(rng, s <= 2 ? ["dog"] : ANIMALS.filter((x) => x !== "cat")); return { go, html: pictureSvg(a, 130, tint()), label: a }; }
    if (content === "vehicles") { const v = go ? "bus" : pick(rng, s <= 2 ? ["car"] : VEHICLES.filter((x) => x !== "bus")); return { go, html: pictureSvg(v, 130, tint()), label: v }; }
    if (content === "letter") { const L = go ? pick(rng, "ABCDEFGHJKLMNPQRSTUVWYZ".split("")) : "X"; return { go, html: txt(L, "giant"), label: L }; }
    if (content === "digit") { const d = go ? pick(rng, [0, 2, 4, 6, 8]) : pick(rng, [1, 3, 5, 7, 9]); return { go, html: txt(String(d), "giant"), label: String(d) }; }
    if (content === "wordcategory") { const w = go ? pick(rng, WORD_LISTS.animals) : pick(rng, [...FOILS.animals, ...WORD_LISTS.food]); return { go, html: txt(w, "huge"), label: w }; }
    throw new Error("gonogo: " + content);
  };
  const prompts = { animals: "Tap the CAT. Wait for any other animal.", vehicles: "Tap the BUS. Wait for the other vehicles.", letter: "Tap every letter, but NOT the X.", digit: "Tap EVEN numbers only.", wordcategory: "Tap ANIMAL words only." };
  return {
    trial(i, s) {
      const b = Math.floor(i / 3);
      if (!blocks[b]) blocks[b] = shuffle(rng, [true, true, false]);
      const go = blocks[b][i % 3];
      return { kind: "gonogo", prompt: prompts[content], stim: stim(go, s), windowMs: at(WIN, s), waitMs: rint(rng, 500, 1100) };
    },
  };
};

E.pairs = ({ tier, rng, content }) => ({
  rounds: { test: 2, session: 2 },
  trial(i, s) {
    const n = ramp(tier, s, [2, 3, 4], [3, 6, 8]);
    let defs;
    if (content === "pictures" || content === "animals") defs = take(rng, PICTURE_SETS[content], n).map((p) => [pictureSvg(p, 56), pictureSvg(p, 56)]);
    else if (content === "numbers") defs = take(rng, [1, 2, 3, 4, 5], n).map((d) => [txt(String(d), "big"), dotsHtml(d, COLORS.orange, 3, 12)]);
    else if (content === "words") defs = take(rng, OPPOSITES, n).map(([a, b]) => [txt(a, "word"), txt(b, "word")]);
    else if (content === "symbols") defs = take(rng, GREEK, n).map((g) => [txt(g, "big"), txt(g, "big")]);
    else throw new Error("pairs: " + content);
    const cards = shuffle(rng, defs.flatMap((d, p) => [{ pair: p, html: d[0] }, { pair: p, html: d[1] }]));
    return { kind: "pairs", prompt: "Turn two cards. Find the pairs that go together.", cards, pairs: n, maxMismatch: n, cols: cards.length <= 6 ? 3 : 4 };
  },
});

E.grid = ({ rng }) => ({
  trial(i, s) {
    const n = s <= 2 ? 2 : 3, k = at([1, 2, 2, 3, 3, 3], s);
    return { kind: "grid", prompt: "Watch which squares light up.", ask: "Now tap the squares that lit up.", size: n, lit: take(rng, Array.from({ length: n * n }, (_, j) => j), k).sort((a, b) => a - b), showMs: 1500 };
  },
});

E.reaction = ({ tier, rng, content }) => ({
  trial(i, s) {
    if (content !== "butterfly") throw new Error("reaction: " + content);
    return { kind: "reaction", prompt: "Wait for the butterfly, then tap it!", html: pictureSvg("butterfly", 130, COLORS.orange), waitMs: rint(rng, 900, 2200), limitMs: at([4000, 3600, 3200, 2800, 2400, 2000], s) };
  },
});


// Fruit Catcher is a movement game: it has its own player (fruitgame.js) and scores itself, so the trial
// here only tells the screen which round to play. One round, 30 / 45 / 60 s by level.
E.fruit = ({ tier, mode }) => ({
  rounds: { test: 1, session: 1 },
  trial() {
    const level = String(mode).split("-")[1];
    if (!["easy", "medium", "hard"].includes(level)) throw new Error("fruit: " + mode);
    return { kind: "movement", game: "fruit", level, tier, ...sessionPlay(level, tier) };
  },
});

// Paint the Path and Feed the Animal are movement games too: their own players (paintgame.js, feedgame.js)
// score them, so the trial only tells the screen which round to play.
const levelOf = (mode) => {
  const level = String(mode).split("-")[1];
  if (!["easy", "medium", "hard"].includes(level)) throw new Error("movement game: " + mode);
  return level;
};
E.trace = ({ tier, mode }) => ({
  rounds: { test: 1, session: 1 },
  trial() {
    const level = levelOf(mode), shapes = LEVEL_SHAPES[level];
    return { kind: "movement", game: "trace", level, tier, shapes: [...shapes], seconds: secondsFor(level, tier), tolerances: shapes.map((s) => toleranceFor(s, tier)), titles: shapes.map((s) => SHAPES[s].title) };
  },
});
E.feed = ({ tier, mode }) => ({
  rounds: { test: 1, session: 1 },
  trial() {
    const level = levelOf(mode);
    return { kind: "movement", game: "feed", level, tier, sequence: [...SEQUENCES[level]], ...FEED_PLAY[level] };
  },
});

// The two suggested games (Make a Face, Cut the Fruit) are movement games with their own players too.
E.face = ({ tier, mode }) => ({
  rounds: { test: 1, session: 1 },
  trial() { const level = levelOf(mode); return { kind: "movement", game: "face", level, tier, ...faceSettings(level, tier) }; },
});
E.slice = ({ tier, mode }) => ({
  rounds: { test: 1, session: 1 },
  trial() { const level = levelOf(mode); return { kind: "movement", game: "slice", level, tier, ...sliceSettings(level, tier) }; },
});

// -------------------------------------------------------------------- public
export function makeGame(game, rng = Math.random) {
  const tier = GROUPS.find((g) => g.id === game.group).tier;
  const make = E[game.engine];
  if (!make) throw new Error("Unknown engine " + game.engine);
  const inst = make({ tier, rng, content: game.content, mode: game.mode });
  return {
    rounds: (isTest, defaults) => (inst.rounds && inst.rounds[isTest ? "test" : "session"]) || (isTest ? defaults.test : defaults.session),
    trial: (i, step) => inst.trial(i, step),
  };
}
export const ENGINE_NAMES = Object.keys(E);
export const _transforms = { flipH, flipV, rot, patKey };   // exposed for the tests
