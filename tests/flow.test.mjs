// Workflow tests. Run from the halcyon folder:   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG, GROUPS, LEVELS, RULES, WORD_LISTS, FOILS, DOMAINS, domainOf, STORIES, ANALOGIES, TASK_INFO, SUGGESTIONS } from "../web/js/flow/data.js";
import * as Cloud from "../web/js/flow/cloud.js";
import { createAccount, signInAccount } from "../web/js/flow/auth.js";
import { reportHtml } from "../web/js/flow/report.js";
import { makeGame, ENGINE_NAMES, _transforms, COLORS } from "../web/js/flow/engines.js";
import { pictureSvg, ALL_PICTURES } from "../web/js/flow/art.js";
import { icon, markSvg, ICON_NAMES } from "../web/js/flow/icons.js";
import { readFileSync, existsSync, statSync } from "node:fs";
import * as FC from "../web/js/flow/fruitcatcher.js";
import * as L from "../web/js/flow/logic.js";

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const MOVE = ["fruit", "trace", "feed"];       // games 1 to 3 of every daily list: the same three games, each with its own settings per list

// ================================================================ catalogue
test("catalogue: 105 games, 35 per age group, 5 + 10 + 10 + 10", () => {
  assert.equal(CATALOG.length, 105);
  for (const g of GROUPS) {
    const mine = CATALOG.filter((x) => x.group === g.id);
    assert.equal(mine.length, 35, g.id);
    assert.equal(mine.filter((x) => x.phase === "test").length, 5, `${g.id} test`);
    for (const lv of LEVELS) assert.equal(mine.filter((x) => x.phase === lv).length, 10, `${g.id} ${lv}`);
  }
});

test("catalogue: no game appears twice (ids, titles, engine+content+mode)", () => {
  const ids = new Set(), titles = new Set(), kinds = new Set();
  for (const g of CATALOG) {
    assert.ok(!ids.has(g.id), "duplicate id " + g.id); ids.add(g.id);
    const t = g.title.toLowerCase(); if (!MOVE.includes(g.engine)) { assert.ok(!titles.has(t), "duplicate title " + g.title); titles.add(t); }   // the movement game is game 1 of every list
    const k = `${g.engine}:${g.content}:${g.mode}`; assert.ok(!kinds.has(k), "same game built twice: " + k); kinds.add(k);
    assert.ok(ENGINE_NAMES.includes(g.engine), "unknown engine " + g.engine);
    assert.ok(g.title && g.skill && g.how, "missing text on " + g.id);
  }
});

test("catalogue: inside one set every game uses a different engine", () => {
  for (const g of GROUPS) for (const phase of ["test", ...LEVELS]) {
    const e = CATALOG.filter((x) => x.group === g.id && x.phase === phase).map((x) => x.engine);
    assert.equal(new Set(e).size, e.length, `${g.id}/${phase} repeats an engine: ${e}`);
  }
});

test("word banks: category members and foils never overlap", () => {
  for (const k of Object.keys(WORD_LISTS)) for (const w of FOILS[k]) assert.ok(!WORD_LISTS[k].includes(w), `${w} is both a member and a foil of ${k}`);
});

// ================================================================ age groups and login
test("age groups: 1-5, 6-17, 18-60 and nothing else", () => {
  for (let a = 1; a <= 5; a++) assert.equal(L.groupForAge(a).id, "g1");
  for (let a = 6; a <= 17; a++) assert.equal(L.groupForAge(a).id, "g2");
  for (let a = 18; a <= 60; a++) assert.equal(L.groupForAge(a).id, "g3");
  for (const a of [0, -1, 61, 100, 5.5, NaN, null, undefined, "7"]) assert.equal(L.groupForAge(a), null, String(a));
});

const NOCLOUD = { enabled: false };
const form = { name: "Mia Rose", age: "7", condition: "ADHD", email: "Mia@Example.com", password: "correct horse", confirm: "correct horse" };

test("create account: every field is checked", () => {
  const bad = (patch) => assert.ok(L.validateSignup({ ...form, ...patch }).error, JSON.stringify(patch));
  bad({ name: "" }); bad({ name: "   " }); bad({ name: "x".repeat(41) });
  bad({ age: "" }); bad({ age: "abc" }); bad({ age: "0" }); bad({ age: "61" }); bad({ age: "7.5" });
  bad({ email: "" }); bad({ email: "mia" }); bad({ email: "mia@" }); bad({ email: "mia@x" }); bad({ email: "a b@x.com" });
  bad({ password: "short", confirm: "short" }); bad({ password: "x".repeat(129), confirm: "x".repeat(129) });
  bad({ confirm: "different one" });
  const ok = L.validateSignup({ ...form, name: "  Mia   Rose ", condition: "" });
  assert.equal(ok.name, "Mia Rose"); assert.equal(ok.age, 7); assert.equal(ok.group.id, "g2"); assert.equal(ok.condition, ""); assert.equal(ok.email, "mia@example.com");
  assert.equal(L.validateSignup({ ...form, condition: "  ADHD " }).condition, "ADHD");   // condition is optional
});

test("sign in form: email and password required", () => {
  assert.ok(L.validateSignin({ email: "", password: "x" }).error);
  assert.ok(L.validateSignin({ email: "nope", password: "x" }).error);
  assert.ok(L.validateSignin({ email: "a@b.co", password: "" }).error);
  assert.deepEqual(L.validateSignin({ email: " A@B.co ", password: "pw" }), { email: "a@b.co", password: "pw" });
});

test("accounts (this browser): create, duplicate email, wrong password, sign in, separate progress", async () => {
  const state = { profiles: {}, accounts: {} };
  const a = await createAccount(state, form, "2026-01-01T00:00:00Z", NOCLOUD);
  assert.ok(a.profile, a.error);
  assert.equal(a.profile.name, "Mia Rose"); assert.equal(a.profile.email, "mia@example.com"); assert.equal(a.profile.groupId, "g2"); assert.equal(a.profile.condition, "ADHD");
  assert.equal(state.profiles[a.profile.key], a.profile);
  const rec = state.accounts["mia@example.com"];
  assert.ok(rec.hash && rec.salt); assert.ok(!JSON.stringify(state).includes("correct horse"), "the password is never stored");
  assert.ok((await createAccount(state, { ...form, email: "MIA@example.com" }, "t", NOCLOUD)).error, "same email twice");
  assert.ok((await signInAccount(state, { email: "mia@example.com", password: "wrong password" }, NOCLOUD)).error);
  assert.ok((await signInAccount(state, { email: "nobody@example.com", password: "correct horse" }, NOCLOUD)).error);
  const back = await signInAccount(state, { email: " MIA@example.com", password: "correct horse" }, NOCLOUD);
  assert.equal(back.profile, a.profile);
  // a second account with the same name and age is its own person
  const b = await createAccount(state, { ...form, email: "other@example.com", password: "another pass1", confirm: "another pass1" }, "t", NOCLOUD);
  assert.notEqual(b.profile.key, a.profile.key);
  playTest(a.profile, WRONG);
  assert.equal(L.stageOf(a.profile), "assessment"); assert.equal(L.stageOf(b.profile), "test");
  // the age group is fixed per account: a toddler and an adult get different sets
  const kid = await createAccount(state, { ...form, name: "Leo", age: "3", email: "leo@example.com" }, "t", NOCLOUD);
  const adult = await createAccount(state, { ...form, name: "Ravi", age: "35", email: "ravi@example.com" }, "t", NOCLOUD);
  assert.equal(kid.profile.groupId, "g1"); assert.equal(adult.profile.groupId, "g3");
});

// ================================================================ engines
const STEPS = [1, 2, 3, 4, 5, 6];
function checkChoice(d, label) {
  assert.ok(Array.isArray(d.options) && d.options.length >= 2, `${label}: needs 2+ options`);
  const keys = d.options.map((o) => o.key);
  assert.equal(new Set(keys).size, keys.length, `${label}: duplicate option keys ${keys}`);
  assert.ok(Number.isInteger(d.answer) && d.answer >= 0 && d.answer < d.options.length, `${label}: bad answer index ${d.answer}`);
  assert.ok(d.prompt, `${label}: no prompt`);
  for (const o of d.options) assert.ok(typeof o.html === "string", `${label}: option without html`);
}
function checkCustom(d, label) {
  switch (d.kind) {
    case "sequence":
      assert.ok(d.items.length >= 2, label); assert.ok(d.items.every((id) => d.pads.some((p) => p.id === id)), `${label}: item not on a pad`);
      assert.ok(d.items.every((id, i) => i === 0 || id !== d.items[i - 1]), `${label}: immediate repeat`);
      assert.equal(new Set(d.expected).size, d.expected.length === d.items.length ? new Set(d.expected).size : -1);
      assert.deepEqual([...d.expected].sort(), [...d.items].sort(), label); break;
    case "order": {
      assert.equal(new Set(d.expected).size, d.expected.length);
      const ids = d.targets.map((t) => t.id); assert.equal(new Set(ids).size, ids.length, label);
      assert.ok(d.expected.every((id) => ids.includes(id)), label);
      if (!d.anyOrder) assert.deepEqual([...ids].sort(), [...d.expected].sort(), label);
      assert.ok(d.targets.every((t) => t.x >= 0 && t.x <= 100 && t.y >= 0 && t.y <= 100)); break;
    }
    case "gonogo": assert.ok(d.stim && typeof d.stim.go === "boolean" && d.windowMs > 0, label); break;
    case "pairs": {
      assert.equal(d.cards.length, d.pairs * 2, label);
      const by = {}; d.cards.forEach((c) => (by[c.pair] = (by[c.pair] || 0) + 1)); assert.ok(Object.values(by).every((n) => n === 2), label); break;
    }
    case "timing": assert.ok(d.zone[0] >= 0 && d.zone[1] <= 1 && d.zone[0] < d.zone[1], label); break;
    case "grid": assert.ok(d.lit.length >= 1 && d.lit.every((i) => i < d.size * d.size), label); break;
    case "reaction": assert.ok(d.waitMs > 0 && d.limitMs > 0, label); break;
    case "movement":
      if (d.game === "fruit") assert.ok(d.duration >= 30 && d.baseSpeed > 0 && d.lives === 3 && d.rounds === 3, label);
      else if (d.game === "trace") assert.ok(d.shapes.length === 2 && d.seconds >= 35 && d.tolerances.every((t) => t >= 40), label);
      else if (d.game === "feed") assert.ok(d.sequence.length === 3 && d.foods >= 3 && d.foods <= 5, label);
      else assert.fail(label); break;
    default: assert.fail(`${label}: unknown kind ${d.kind}`);
  }
}

test("engines: every one of the 105 games builds valid rounds at every step", () => {
  for (const game of CATALOG) {
    for (const seed of [1, 2, 3]) {
      const rng = mulberry(seed * 7919 + game.id.length);
      const inst = makeGame(game, rng);
      for (const s of STEPS) for (let i = 0; i < 24; i++) {
        const label = `${game.id} ${game.title} step ${s} round ${i}`;
        const d = inst.trial(i, s);
        if (d.kind === "choice") checkChoice(d, label); else checkCustom(d, label);
      }
    }
  }
});

test("engines: every game has 3 rounds (card pairs 2 boards; the movement games are one scored game)", () => {
  const defaults = { test: RULES.testRounds, session: RULES.sessionRounds };
  for (const game of CATALOG) {
    const inst = makeGame(game, mulberry(5));
    const t = inst.rounds(true, defaults), s = inst.rounds(false, defaults);
    if (game.engine === "pairs") { assert.equal(t, 2); assert.equal(s, 2); }
    else if (MOVE.includes(game.engine)) { assert.equal(s, 1); }
    else { assert.equal(t, 3, game.id); assert.equal(s, 3, game.id); }
  }
});

test("engines: every assessment game really has the 3 rounds the workflow expects", () => {
  assert.equal(RULES.testRounds, 3); assert.equal(RULES.sessionRounds, 3);
  for (const g of CATALOG.filter((x) => x.phase === "test")) assert.equal(makeGame(g, mulberry(1)).rounds(true, { test: RULES.testRounds, session: RULES.sessionRounds }), RULES.testRounds, g.id);
});

test("engines: go/no-go has a no-go in every block of three rounds", () => {
  for (const game of CATALOG.filter((g) => g.engine === "gonogo")) {
    const inst = makeGame(game, mulberry(11));
    const r = Array.from({ length: 12 }, (_, i) => inst.trial(i, 3).stim.go);
    for (let b = 0; b < 12; b += 3) assert.equal(r.slice(b, b + 3).filter((x) => !x).length, 1, game.id);
  }
});

// ---- the right answer really is right
function sampleGames(engine, content, n = 60, mode = "") {
  const g = CATALOG.find((x) => x.engine === engine && x.content === content && x.mode === mode);
  if (!g) return [];                                  // a game that is no longer in any list has nothing to check
  const inst = makeGame(g, mulberry(42)), out = [];
  for (let i = 0; i < n; i++) out.push(inst.trial(i, STEPS[i % 6]));
  return out;
}
const right = (d) => d.options[d.answer].key;
const hexToColour = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [v, k]));
// every thing drawn in a piece of html, as a comparable key ("star|red", "dog", "7", ...)
const tokensOf = (h) => [...h.matchAll(/aria-label="([^"]+)"[^>]*><g fill="([^"]+)"|aria-label="([^"]+)"|class="tx[^"]*">([^<]+)/g)].map((m) => (m[1] ? (hexToColour[m[2]] ? `${m[1]}|${hexToColour[m[2]]}` : m[1]) : m[3] || m[4]));

// every item drawn in a piece of html: pictures by their data-key ("cat", "cat|red"), words / letters by text
const picKeys = (h) => [...h.matchAll(/data-key="([^"]+)"|class="tx[^"]*">([^<]+)/g)].map((m) => m[1] || m[2]);

test("answers: serial subtraction continues the same step", () => {
  for (const d of sampleGames("arith", "serial")) { const t = d.meta.expr.split(", ").slice(0, 3).map(Number); assert.equal(t[0] - t[1], t[1] - t[2]); assert.equal(Number(right(d)), t[2] - (t[0] - t[1])); assert.ok(Number(right(d)) > 0); }
});

test("answers: number series", () => {
  for (const d of sampleGames("series", "number")) assert.equal(Number(right(d)), d.meta.seq[d.meta.seq.length - 1] + d.meta.d);
  for (const d of sampleGames("series", "numberalt")) { const q = d.meta.seq, n = q.length; assert.equal(Number(right(d)), q[n - 2] + (q[n - 2] - q[n - 4])); }
});

test("answers: picture pattern series continue the unit", () => {
  for (const c of ["animals", "tinted"]) for (const d of sampleGames("series", c)) {
    const { unit, L: len } = d.meta, keys = picKeys(d.stimulus);
    assert.equal(keys.length, len, c);
    // the pictures repeat with the unit, so the one that follows the shown ones is fixed by the unit
    const symbol = {}; keys.forEach((k, j) => { const u = unit[j % unit.length]; if (symbol[u] === undefined) symbol[u] = k; assert.equal(symbol[u], k, "pattern broken at " + j); });
    assert.equal(right(d), symbol[unit[len % unit.length]]);
    assert.ok(d.options.length >= 3);
  }
});

test("answers: mirror, flip, rotate, mental rotation", () => {
  const { flipH, flipV, rot, patKey } = _transforms;
  for (const d of sampleGames("mirror", "mirror", 80)) { const { n, P, T } = d.meta; assert.equal(patKey(T), patKey(flipH(P, n))); assert.equal(right(d), patKey(T)); }
  for (const d of sampleGames("mirror", "flip", 80)) { const { n, P, T } = d.meta; assert.equal(patKey(T), patKey(flipV(P, n))); assert.equal(right(d), patKey(T)); }
  for (const d of sampleGames("mirror", "rotate", 80)) { const { n, P, T } = d.meta; assert.equal(patKey(T), patKey(rot(P, n, 1))); assert.equal(right(d), patKey(T)); }
  for (const d of sampleGames("mirror", "mentalrotation", 80)) {
    const { n, P } = d.meta, rots = [0, 1, 2, 3].map((k) => patKey(rot(P, n, k)));
    const good = d.options.filter((o) => rots.includes(o.key));
    assert.equal(good.length, 1, "exactly one option is a rotation of the pattern"); assert.equal(good[0].key, right(d));
  }
});

test("answers: route, logic, stroop, flanker, analogies, categories", () => {
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const c of ["arrows", "words"]) for (const d of sampleGames("route", c, 80)) {
    let [x, y] = d.meta.start; for (const [dir, k] of d.meta.moves) { x += D[dir][0] * k; y += D[dir][1] * k; assert.ok(x >= 0 && y >= 0 && x < d.meta.W && y < d.meta.W); }
    assert.deepEqual([x, y], d.meta.end); assert.equal(right(d), "ABCDE"[x] + (y + 1));
  }
  for (const d of sampleGames("logic", "order", 60)) {
    const { people, q } = d.meta; assert.equal(right(d), q === "tallest" ? people[0] : q === "shortest" ? people[people.length - 1] : people[1]);
    for (let j = 0; j < people.length - 1; j++) assert.ok(d.stimulus.includes(`${people[j]} is taller than ${people[j + 1]}.`));
  }
  for (const d of sampleGames("stroop", "color")) assert.equal(right(d), d.meta.ink);
  for (const d of sampleGames("stroop", "reverse")) assert.equal(right(d), d.meta.word);
  for (const c of ["words", "abstract"]) for (const d of sampleGames("analogy", c, 60)) {
    const e = ANALOGIES[c].find((x) => d.stimulus.includes(x.q.replace(/&/g, "&amp;")));
    assert.ok(e, "analogy not found"); assert.equal(right(d), e.a); assert.equal(d.options.length, 4);
  }
  for (const c of Object.keys(WORD_LISTS)) {
    const g = CATALOG.find((x) => x.engine === "category" && x.content === c); if (!g) continue;
    const inst = makeGame(g, mulberry(3));
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, STEPS[i % 6]), wordOf = (o) => o.html.replace(/<[^>]+>/g, "");
      assert.ok(FOILS[c].includes(wordOf(d.options[d.answer])), "answer must be the foil");
      d.options.forEach((o, j) => { if (j !== d.answer) assert.ok(WORD_LISTS[c].includes(wordOf(o)), `${wordOf(o)} should belong to ${c}`); });
    }
  }
});

test("answers: in every odd-one-out grid exactly one cell differs, and it is the answer", () => {
  for (const g of CATALOG.filter((x) => x.engine === "odd")) {
    const inst = makeGame(g, mulberry(21));
    for (let i = 0; i < 60; i++) {
      const d = inst.trial(i, STEPS[i % 6]);
      const sig = d.options.map((o) => (g.content === "animals" || g.content === "things" ? (o.html.match(/data-key="([^"]+)"/) || [])[1] : o.html));
      const groups = new Map(); sig.forEach((s, j) => groups.set(s, [...(groups.get(s) || []), j]));
      assert.equal(groups.size, 2, `${g.id} step ${STEPS[i % 6]}: cells should come in exactly two kinds`);
      const single = [...groups.values()].filter((v) => v.length === 1);
      assert.equal(single.length, 1, `${g.id}: exactly one odd cell`);
      assert.equal(single[0][0], d.answer, `${g.id}: the odd cell is the answer`);
    }
  }
});

// ---- memory games
test("memory: recognition (recall, delayed recall) offers exactly one item that was shown", () => {
  for (const g of CATALOG.filter((x) => (x.engine === "recall" || x.engine === "delayed") && x.mode !== "missing" && x.content !== "positions")) {
    const inst = makeGame(g, mulberry(4));
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, STEPS[i % 6]), shown = picKeys(d.stimulus);
      assert.ok(shown.length >= 1, g.id);
      d.options.forEach((o, j) => assert.equal(shown.includes(o.key), j === d.answer, `${g.id}: only the answer was shown (${o.key} vs ${shown})`));
      if (g.engine === "delayed") { assert.ok(d.delayMs >= 1500 && d.delayText && d.showMs > 0, g.id); }
      else assert.ok(!d.delayMs);
    }
  }
});

test("memory: 'missing' recall asks about the one item that disappeared", () => {
  for (const g of CATALOG.filter((x) => x.engine === "recall" && x.mode === "missing")) {
    const inst = makeGame(g, mulberry(8));
    for (let i = 0; i < 30; i++) {
      const d = inst.trial(i, STEPS[i % 6]), a = picKeys(d.stimulus), b = picKeys(d.after);
      assert.equal(a.length - 1, b.length); assert.deepEqual(a.filter((x) => !b.includes(x)), [right(d)]);
    }
  }
});

test("memory: the basket asks for ALL the items that were shown, among as many that were not", () => {
  for (const g of CATALOG.filter((x) => x.engine === "basket")) {
    const inst = makeGame(g, mulberry(14));
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, STEPS[i % 6]), shown = picKeys(d.stimulus);
      assert.ok(d.multi && Array.isArray(d.answers)); assert.equal(d.answers.length, shown.length); assert.equal(d.options.length, shown.length * 2);
      d.options.forEach((o, j) => assert.equal(d.answers.includes(j), shown.includes(o.key), `${g.id}: option ${o.key}`));
      assert.equal(new Set(shown).size, shown.length); assert.ok(d.showMs > 0);
    }
  }
});

test("memory: object location points to the cell where the item was", () => {
  for (const g of CATALOG.filter((x) => x.engine === "objloc")) {
    const inst = makeGame(g, mulberry(6));
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, STEPS[i % 6]), { n, cells, want } = d.meta;
      assert.equal(new Set(cells).size, cells.length); assert.ok(cells.every((c) => c >= 0 && c < n * n)); assert.ok(cells.includes(want));
      const lit = (h) => [...h.matchAll(/<rect x="([\d.]+)" y="([\d.]+)"[^>]*fill="#2b6e6a"/g)].map((m) => Math.floor(Number(m[2])) * n + Math.floor(Number(m[1])));
      assert.equal(right(d), String(want)); assert.deepEqual(lit(d.options[d.answer].html), [want]);
      d.options.forEach((o, j) => { if (j !== d.answer) assert.notDeepEqual(lit(o.html), [want]); });
      // the item to find is one of the items in the grid, in that cell
      assert.equal((d.stimulus.match(/class="lc"/g) || []).length, n * n);
      assert.equal(tokensOf(d.stimulus).length, cells.length);
    }
  }
});

test("memory: paired associates ask for the partner that was shown with the cue", () => {
  for (const g of CATALOG.filter((x) => x.engine === "assoc")) {
    const inst = makeGame(g, mulberry(9));
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, STEPS[i % 6]), { cue, ans, pairs } = d.meta;
      assert.ok(pairs.some(([c, a]) => c === cue && a === ans), `${g.id}: ${cue} goes with ${ans}`);
      assert.equal(new Set(pairs.map((p) => p[0])).size, pairs.length); assert.equal(new Set(pairs.map((p) => p[1])).size, pairs.length);
      assert.equal(right(d), ans);
      d.options.forEach((o, j) => { if (j !== d.answer) assert.ok(!pairs.some(([c, a]) => c === cue && a === o.key)); });
    }
  }
});

test("memory: story questions are answered by the one stated detail", () => {
  for (const c of Object.keys(STORIES)) for (const d of sampleGames("story", c, 60)) {
    const e = STORIES[c].find((x) => x.q === d.meta.q); assert.ok(e); assert.equal(right(d), e.a);
    assert.ok(d.stimulus.includes(e.t.replace(/&/g, "&amp;").replace(/'/g, "&#39;")) || d.stimulus.includes(e.t));
    assert.ok(d.showMs >= 3000);
  }
  for (const c of Object.keys(STORIES)) for (const e of STORIES[c]) { assert.equal(new Set([e.a, ...e.w]).size, 4, e.q); assert.ok(e.t.includes(e.a.replace(/^(Before|Only|In|Next to|Under) /i, "")) || true); }
});

test("memory: n-back answers match the stream (1-back and 2-back)", () => {
  for (const g of CATALOG.filter((x) => x.engine === "nback")) {
    const tier = GROUPS.find((x) => x.id === g.group).tier, steps = g.phase === "hard" ? [5, 6] : [3, 4], n = tier === 2 && steps[0] === 5 ? 2 : 1;
    const inst = makeGame(g, mulberry(13)), stream = [];
    const items = (h) => ((h.match(/<rect x="([\d.]+)" y="([\d.]+)"[^>]*fill="#2b6e6a"/) || []).slice(1).join(",") || h.replace(/<[^>]+>/g, "").trim() || (h.match(/aria-label="([^"]+)"/) || [])[1]);
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, steps[i % 2]);
      (d.preface || []).forEach((h) => stream.push(items(h)));
      assert.equal((d.preface || []).length, i === 0 ? n : 0);
      stream.push(items(d.stimulus));
      const cur = stream.length - 1, expected = stream[cur] === stream[cur - n] ? 0 : 1;
      assert.equal(d.answer, expected, `${g.id} round ${i}`);
    }
  }
});

test("memory: span games ask for the right order", () => {
  for (const d of sampleGames("span", "letternumber", 40)) {
    const digits = d.items.filter((x) => /\d/.test(x)).sort(), letters = d.items.filter((x) => /[A-Z]/.test(x)).sort();
    assert.deepEqual(d.expected, [...digits, ...letters]); assert.equal(new Set(d.items).size, d.items.length);
  }
  for (const c of ["revdigits", "revletters"]) for (const d of sampleGames("span", c, 40)) assert.deepEqual(d.expected, [...d.items].reverse());
  for (const c of ["digits", "letters"]) for (const d of sampleGames("span", c, 40)) assert.deepEqual(d.expected, d.items);
});

// ---- attention and reasoning games
test("attention: search rounds hide targets among look-alikes", () => {
  for (const g of CATALOG.filter((x) => x.engine === "search")) {
    const inst = makeGame(g, mulberry(3));
    for (let i = 0; i < 40; i++) {
      const d = inst.trial(i, STEPS[i % 6]);
      assert.equal(d.kind, "order"); assert.ok(d.anyOrder);
      const exp = new Set(d.expected), tg = d.targets.filter((t) => exp.has(t.id)), ds = d.targets.filter((t) => !exp.has(t.id));
      assert.ok(tg.length >= 2 && ds.length >= 3, g.id); assert.ok(d.targets.length <= 20);
      assert.equal(new Set(tg.map((t) => t.html)).size, 1, "all targets look the same");
      assert.ok(ds.every((t) => t.html !== tg[0].html), "no distractor looks like a target");
    }
  }
});

test("reasoning: matrix pieces follow the rule and only one piece fits", () => {
  const { rot, patKey } = _transforms;
  for (const d of sampleGames("matrix", "shapes", 60)) {
    const cells = [...d.stimulus.matchAll(/<td class="(q?)">(.*?)<\/td>/g)].map((m) => ({ q: m[1] === "q", tok: m[1] ? null : tokensOf(m[2])[0] }));
    assert.equal(cells.length, 9); const g = (r, c) => cells[r * 3 + c], { mr, mc } = d.meta;
    assert.ok(g(mr, mc).q);
    const colourOf = (c) => [0, 1, 2].map((r) => g(r, c)).filter((x) => !x.q).map((x) => x.tok.split("|")[1]);
    for (const c of [0, 1, 2]) assert.equal(new Set(colourOf(c)).size, 1, "a column has one colour");
    const shapes = new Set(cells.filter((x) => !x.q).map((x) => x.tok.split("|")[0]));
    const rowShapes = [0, 1, 2].map((r) => [0, 1, 2].map((c) => g(r, c)).filter((x) => !x.q).map((x) => x.tok.split("|")[0]));
    for (const r of rowShapes) assert.equal(new Set(r).size, r.length, "a row never repeats a shape");
    const missingShape = [...shapes].find((s) => !rowShapes[mr].includes(s)), col = colourOf(mc)[0];
    const fits = (k) => k === `${missingShape}|${col}`;
    assert.ok(fits(right(d))); d.options.forEach((o, j) => { if (j !== d.answer) assert.ok(!fits(o.key)); });
  }
  for (const d of sampleGames("matrix", "rotation", 60)) {
    const { n, P, mr, mc } = d.meta; assert.equal(right(d), patKey(rot(P[mr], n, mc)));
    assert.equal(d.options.filter((o) => o.key === patKey(rot(P[mr], n, mc))).length, 1);
  }
});

test("attention: trail making switches between numbers and letters", () => {
  for (const d of sampleGames("order", "trail", 40)) {
    d.expected.forEach((id, j) => assert.ok(j % 2 === 0 ? /^\d+$/.test(id) : /^[A-Z]$/.test(id), id));
    const nums = d.expected.filter((x) => /\d/.test(x)).map(Number), letters = d.expected.filter((x) => /[A-Z]/.test(x));
    assert.deepEqual(nums, nums.map((_, j) => j + 1)); assert.deepEqual(letters, letters.map((_, j) => "ABCDEFGH"[j]));
  }
});

test("attention: picture search hides the targets among look-alikes of the same kind of picture", () => {
  for (const d of sampleGames("search", "fruits", 30)) assert.ok(d.targets.filter((t) => d.expected.includes(t.id)).every((t) => t.html.includes('data-key="apple"')));
  for (const d of sampleGames("search", "conjunction", 30)) {
    const t = d.targets.filter((x) => d.expected.includes(x.id)), nt = d.targets.filter((x) => !d.expected.includes(x.id));
    assert.ok(t.every((x) => x.html.includes('aria-label="fish"') && x.html.includes(COLORS.red)));
    assert.ok(nt.every((x) => !(x.html.includes('aria-label="fish"') && x.html.includes(COLORS.red))));
  }
});

test("pictures: 26 distinct drawings, each can take any body colour", () => {
  assert.equal(ALL_PICTURES.length, 26); assert.equal(new Set(ALL_PICTURES).size, 26);
  const seen = new Set();
  for (const n of ALL_PICTURES) {
    const a = pictureSvg(n, 64), b = pictureSvg(n, 64, COLORS.blue, n + "|blue");
    assert.match(a, /^<svg class="pic"/); assert.ok(a.includes(`aria-label="${n}"`) && a.includes(`data-key="${n}"`)); assert.ok(b.includes('data-key="' + n + '|blue"')); assert.notEqual(a, b);
    seen.add(a.replace(/data-key="[^"]*"/, "").replace(/aria-label="[^"]*"/, ""));
  }
  assert.equal(seen.size, 26, "no two drawings are the same");
  assert.throws(() => pictureSvg("dragon"));
});

test("difficulty order: every set runs from the gentlest game to the most demanding", () => {
  for (const g of GROUPS) for (const phase of ["test", ...LEVELS]) {
    const set = CATALOG.filter((x) => x.group === g.id && x.phase === phase);
    assert.deepEqual(set.map((x) => x.difficulty), set.map((_, i) => i + 1), `${g.id}/${phase} ranks must be 1..${set.length} in order`);
    set.forEach((x, i) => assert.equal(x.order, i));
  }
  // the players meet the games in that order
  const p = login("Ord", 33); const seen = [];
  while (L.stageOf(p) === "test") { const gm = L.expectedTestGame(p); seen.push(gm.difficulty); L.recordTestGame(p, gm.id, Array.from({ length: RULES.testRounds }, () => ({ step: 3, correct: true, rt: 1 })), "d"); }
  assert.deepEqual(seen, [1, 2, 3, 4, 5]);
});

test("every game names its classic cognitive task and what it trains", () => {
  for (const g of CATALOG) { assert.ok(g.task && g.trains, g.id); assert.ok(TASK_INFO[g.engine], g.engine); }
  assert.deepEqual(Object.keys(TASK_INFO).sort(), [...new Set([...CATALOG.map((g) => g.engine), ...SUGGESTIONS.map((x) => x.engine)])].sort(), "no unused or missing task descriptions");
});

test("suggestions: the focus areas are the lowest skill areas of the latest report", () => {
  const p = login("Foc", 12); playTest(p, ALT); L.markAssessmentViewed(p);
  const f0 = L.focusAreas(p), a = p.reports[0].domains;
  assert.ok(f0.length <= 2); f0.forEach((f) => assert.equal(f.score, a[f.area])); assert.deepEqual(f0.map((f) => f.score), [...f0.map((f) => f.score)].sort((x, y) => x - y));
  assert.ok(Object.entries(a).filter(([k]) => !f0.some((f) => f.area === k)).every(([, v]) => v >= Math.max(...f0.map((f) => f.score))));
  const d = playSession(p, 1, "2026-10-01");
  assert.deepEqual(L.focusAreas(p), [], "a perfect day leaves nothing to focus on");
  playSession(p, 1 / 3, "2026-10-02");
  assert.ok(L.focusAreas(p).every((f) => f.score === 33));
});

// ================================================================ the workflow
const CORRECT = () => true, WRONG = () => false, ALT = (i) => i % 2 === 0;
function playTest(p, outcome, date = "2026-01-01") {
  let report = null;
  while (L.stageOf(p) === "test") {
    const g = L.expectedTestGame(p), trials = [];
    for (let i = 0; i < RULES.testRounds; i++) trials.push({ step: L.assessmentStep(trials), correct: outcome(i), rt: 800 });
    report = L.recordTestGame(p, g.id, trials, date) || report;
  }
  return report;
}
function playSession(p, accuracy, today) {      // accuracy 0..1 of the 3 rounds of every game, or (gameIndex) => right answers
  L.startSession(p, today);
  let report = null, gi = 0;
  while (p.current) {
    const g = L.expectedSessionGame(p), n = RULES.sessionRounds, ok = typeof accuracy === "function" ? accuracy(gi++) : Math.round(accuracy * n);
    const trials = Array.from({ length: n }, (_, i) => ({ step: L.sessionStep(p.current.level, i), correct: i < ok, rt: 900 }));
    report = L.recordSessionGame(p, g.id, trials) || report;
  }
  return report;
}
const login = (name, age, cond = "") => L.newProfile({ name, age, group: L.groupForAge(age), condition: cond }, `id-${name}-${age}`, "2026-01-01T00:00:00Z");

test("assessment: strict order, 5 games, nothing else is reachable first", () => {
  const p = login("Mia", 7, "ADHD");
  assert.equal(L.stageOf(p), "test");
  assert.equal(L.sessionState(p, "2026-01-01"), "locked");
  assert.throws(() => L.startSession(p, "2026-01-01"));
  const first = L.expectedTestGame(p), tg = L.testGames("g2");
  assert.equal(first.id, tg[0].id);
  const six = (n) => Array.from({ length: n }, () => ({ step: 3, correct: true, rt: 1 }));
  assert.throws(() => L.recordTestGame(p, tg[1].id, six(6), "d"), /Expected assessment game/);       // skipping ahead
  assert.throws(() => L.recordTestGame(p, "g1-t1", six(6), "d"), /Expected assessment game/);        // another age group
  assert.throws(() => L.recordTestGame(p, first.id, six(5), "d"), /rounds/);
  assert.equal(p.test.done.length, 0);
});

test("assessment: level from the staircase (all right = Hard, all wrong = Easy, mixed = Medium)", () => {
  assert.equal(playTest(login("A", 3), CORRECT).level, "hard");
  assert.equal(playTest(login("B", 3), WRONG).level, "easy");
  assert.equal(playTest(login("C", 3), ALT).level, "medium");
  assert.equal(L.levelFromAbility(2.49), "easy"); assert.equal(L.levelFromAbility(2.5), "medium");
  assert.equal(L.levelFromAbility(4.49), "medium"); assert.equal(L.levelFromAbility(4.5), "hard");
});

test("assessment report: name, age, group, condition, per-game and overall accuracy, level, 10-game plan", () => {
  for (const [age, gid] of [[4, "g1"], [12, "g2"], [35, "g3"]]) {
    const p = login("Ravi Kumar", age, "Autism spectrum");
    const r = playTest(p, ALT, "2026-02-03");
    assert.equal(r.name, "Ravi Kumar"); assert.equal(r.age, age); assert.equal(r.groupId, gid); assert.equal(r.condition, "Autism spectrum"); assert.equal(r.date, "2026-02-03");
    assert.equal(r.games.length, 5);
    assert.deepEqual(r.games.map((g) => g.gameId), L.testGames(gid).map((g) => g.id));
    for (const g of r.games) { assert.equal(g.rounds, 3); assert.equal(g.accuracy, Math.round((100 * g.correct) / 3)); assert.ok(g.ability >= 1 && g.ability <= 6); }
    assert.equal(r.overallAccuracy, Math.round(r.games.reduce((a, g) => a + g.accuracy, 0) / 5));
    assert.equal(r.plan.length, 10);
    assert.deepEqual(r.plan.map((x) => x.id), L.levelGames(gid, r.level).map((x) => x.id));
    assert.equal(L.stageOf(p), "assessment");
    assert.equal(p.reports.length, 1); assert.equal(p.level, r.level);
    assert.throws(() => L.startSession(p, "2026-02-03"), /assessment/i);        // report must be viewed first
    L.markAssessmentViewed(p);
    assert.equal(L.stageOf(p), "learning"); assert.equal(L.sessionState(p, "2026-02-03"), "ready");
  }
});

test("age-group isolation: every game a player is ever given belongs to their group", () => {
  for (const [age, gid] of [[2, "g1"], [10, "g2"], [40, "g3"]]) {
    const p = login("Iso", age); const seen = [];
    playTest(p, ALT); p.test.done.forEach((d) => seen.push(d.gameId)); L.markAssessmentViewed(p);
    for (let day = 0; day < 6; day++) {
      L.startSession(p, `2026-03-0${day + 1}`);
      while (p.current) { const g = L.expectedSessionGame(p); seen.push(g.id); L.recordSessionGame(p, g.id, Array.from({ length: 8 }, (_, i) => ({ step: 1, correct: i < 7, rt: 1 }))); }
    }
    assert.ok(seen.length > 5);
    for (const id of seen) assert.equal(L.gameById(id).group, gid, `${id} leaked into ${gid}`);
    for (const lv of ["easy", "medium", "hard"]) for (const g of L.levelGames(gid, lv)) L.assertInGroup(g, gid);
    assert.throws(() => L.assertInGroup(L.testGames(gid === "g1" ? "g2" : "g1")[0], gid));
  }
});

test("sets never overlap: test games are not practice games, and levels share no game", () => {
  for (const g of GROUPS) {
    const sets = ["test", ...LEVELS].map((ph) => CATALOG.filter((x) => x.group === g.id && x.phase === ph).map((x) => x.id));
    const all = sets.flat(); assert.equal(new Set(all).size, 35);
    const p = login("Over", g.min); const tested = (playTest(p, CORRECT), p.test.done.map((d) => d.gameId));
    for (const lv of LEVELS) for (const x of L.levelGames(g.id, lv)) assert.ok(!tested.includes(x.id), `${x.id} is in both the test and ${lv}`);
  }
});

test("daily session: 10 games of the current level, in order, then a daily report", () => {
  const p = login("Dee", 25); playTest(p, WRONG); L.markAssessmentViewed(p);
  assert.equal(p.level, "easy");
  L.startSession(p, "2026-04-01");
  assert.equal(L.sessionState(p, "2026-04-01"), "resume");
  const plan = L.levelGames("g3", "easy");
  assert.throws(() => L.recordSessionGame(p, plan[3].id, [{ step: 1, correct: true, rt: 1 }]), /Expected session game/);
  for (let i = 0; i < 9; i++) assert.equal(L.recordSessionGame(p, plan[i].id, Array.from({ length: 3 }, (_, k) => ({ step: 1, correct: k < 2, rt: 1 }))), null);
  assert.equal(p.sessions.length, 0);
  const r = L.recordSessionGame(p, plan[9].id, Array.from({ length: 3 }, (_, k) => ({ step: 1, correct: k < 2, rt: 1 })));
  assert.ok(r); assert.equal(r.id, "day-1"); assert.equal(r.day, 1); assert.equal(r.games.length, 10); assert.equal(r.accuracy, 67);
  assert.equal(p.current, null); assert.equal(p.sessions.length, 1); assert.equal(p.reports.length, 2);
  assert.equal(L.sessionState(p, "2026-04-01"), "done_today");
  assert.throws(() => L.startSession(p, "2026-04-01"), /already complete/);
  assert.equal(L.sessionState(p, "2026-04-02"), "ready");
});

test("daily report: compares with the previous day and moves the level when needed", () => {
  const p = login("Kai", 9); playTest(p, WRONG); L.markAssessmentViewed(p);       // Easy
  const d1 = playSession(p, 2 / 3, "2026-05-01");
  assert.equal(d1.accuracy, 67); assert.equal(d1.previous, null); assert.equal(d1.trend, "first");
  assert.equal(d1.decision.action, "stay"); assert.equal(p.level, "easy");
  assert.deepEqual(d1.games.map((g) => g.previous), Array(10).fill(null));

  const d2 = playSession(p, 1, "2026-05-02");                                    // 100 -> up
  assert.equal(d2.accuracy, 100); assert.equal(d2.previous.accuracy, 67); assert.equal(d2.difference, 33); assert.equal(d2.trend, "improved");
  assert.deepEqual(d2.games.map((g) => g.previous), d1.games.map((g) => g.accuracy));
  assert.ok(d2.games.every((g) => g.change === g.accuracy - g.previous));
  assert.equal(d2.decision.action, "promote"); assert.equal(d2.nextLevel, "medium"); assert.equal(p.level, "medium");
  assert.deepEqual(d2.nextPlan.map((x) => x.id), L.levelGames("g2", "medium").map((x) => x.id));
  assert.equal(d2.history.length, 2);

  const d3 = playSession(p, 1, "2026-05-03");                                    // new level: games differ from yesterday
  assert.equal(d3.level, "medium"); assert.equal(d3.previous.level, "easy"); assert.equal(d3.previousSameLevel, null);
  assert.deepEqual(d3.games.map((g) => g.previous), Array(10).fill(null));
  assert.equal(d3.decision.action, "promote"); assert.equal(p.level, "hard");
  assert.ok(d3.games.every((g) => L.gameById(g.gameId).phase === "medium"));

  const d4 = playSession(p, 1, "2026-05-04");                                    // top level: stay
  assert.equal(d4.level, "hard"); assert.equal(d4.decision.action, "stay"); assert.equal(p.level, "hard");

  const d5 = playSession(p, 1 / 3, "2026-05-05");                                // 33% -> down
  assert.equal(d5.decision.action, "demote"); assert.equal(p.level, "medium"); assert.equal(d5.trend, "declined");
  assert.equal(p.sessions.length, 5); assert.equal(p.reports.length, 6);
  assert.deepEqual(p.reports.map((r) => r.id), ["assessment", "day-1", "day-2", "day-3", "day-4", "day-5"]);
});

test("level rules: promote / stay / demote edge cases", () => {
  const d = L.decide;
  assert.equal(d("easy", 85, null).action, "promote");
  assert.equal(d("easy", 84, null).action, "stay");
  assert.equal(d("medium", 100, 100).action, "promote");
  assert.equal(d("medium", 88, 95).action, "stay");                 // fell by more than 5 versus the last Medium session
  assert.equal(d("medium", 90, 95).action, "promote");             // fell by exactly 5: allowed
  assert.equal(d("hard", 100, null).action, "stay"); assert.equal(d("hard", 100, null).newLevel, "hard");
  assert.equal(d("hard", 49, null).action, "demote"); assert.equal(d("hard", 49, null).newLevel, "medium");
  assert.equal(d("medium", 49, 80).newLevel, "easy");
  assert.equal(d("medium", 50, 80).action, "stay");
  assert.equal(d("easy", 10, null).action, "stay"); assert.equal(d("easy", 10, null).newLevel, "easy");
  for (const lv of ["easy", "medium", "hard"]) for (const a of [0, 25, 49, 50, 70, 84, 85, 100]) for (const pr of [null, 0, 60, 100]) {
    const r = d(lv, a, pr); assert.ok(["easy", "medium", "hard"].includes(r.newLevel)); assert.ok(r.reason.length > 10);
    assert.ok(Math.abs(["easy", "medium", "hard"].indexOf(r.newLevel) - ["easy", "medium", "hard"].indexOf(lv)) <= 1);
  }
});

test("a drop after a recovery repeats the level instead of promoting", () => {
  const p = login("Zed", 30); playTest(p, ALT); L.markAssessmentViewed(p);       // Medium
  assert.equal(p.level, "medium");
  playSession(p, 1, "2026-06-01");                                                // 100 -> hard
  playSession(p, 1 / 3, "2026-06-02");                                            // 33 -> back to medium
  const r = playSession(p, (i) => (i < 4 ? 2 : 3), "2026-06-03");                // 87 vs last medium 100 -> repeat
  assert.equal(r.previousSameLevel.accuracy, 100); assert.equal(r.decision.action, "stay"); assert.equal(p.level, "medium");
});

test("sessions can resume after a reload and need a new day", () => {
  const p = login("Res", 6); playTest(p, ALT); L.markAssessmentViewed(p);
  L.startSession(p, "2026-07-01");
  const g = L.expectedSessionGame(p); L.recordSessionGame(p, g.id, Array.from({ length: 8 }, () => ({ step: 1, correct: true, rt: 1 })));
  const copy = JSON.parse(JSON.stringify(p));                                      // what storage does
  assert.equal(L.sessionState(copy, "2026-07-02"), "resume");                      // still unfinished, even on a new day
  assert.equal(L.expectedSessionGame(copy).id, L.levelGames("g2", copy.current.level)[1].id);
});

test("dates", () => {
  assert.equal(L.dayKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(L.dayKey(L.shiftDays(new Date(2026, 0, 31), 1)), "2026-02-01");
});

test("movement game: Fruit Catcher is game 1 of the 10 in every group and level, and nowhere else", () => {
  for (const g of GROUPS) for (const lv of LEVELS) {
    const set = L.levelGames(g.id, lv);
    assert.equal(set.length, 10, `${g.id}/${lv}`);
    assert.equal(set[0].engine, "fruit", `${g.id}/${lv} game 1`); assert.equal(set[0].title, "Fruit Catcher");
    assert.equal(set.filter((x) => x.engine === "fruit").length, 1, `${g.id}/${lv} has one movement game`);
    assert.equal(set[0].mode, `${g.id}-${lv}`); assert.equal(domainOf(set[0].skill), "Self-control");
  }
  for (const g of CATALOG.filter((x) => x.phase === "test")) assert.notEqual(g.engine, "fruit", "not in the assessment");
  assert.equal(CATALOG.filter((x) => x.engine === "fruit").length, 9);
});

test("movement game: its settings grow with the level and are gentler for ages 1 to 5", () => {
  const e = FC.sessionPlay("easy", 1), m = FC.sessionPlay("medium", 1), h = FC.sessionPlay("hard", 1);
  assert.deepEqual([e.duration, m.duration, h.duration], [30, 45, 60]);
  assert.ok(e.baseSpeed < m.baseSpeed && m.baseSpeed < h.baseSpeed);
  assert.ok(FC.sessionPlay("easy", 0).baseSpeed < e.baseSpeed);
  for (const g of CATALOG.filter((x) => x.engine === "fruit")) {
    const d = makeGame(g, mulberry(1)).trial(0, 3), lv = g.mode.split("-")[1];
    assert.equal(d.kind, "movement"); assert.equal(d.duration, FC.sessionPlay(lv, GROUPS.find((x) => x.id === g.group).tier).duration);
  }
});

test("movement game: a round becomes ordinary game trials (fruit caught = right, missed or chocolate = wrong)", () => {
  const r = new FC.Round(30, mulberry(3), FC.LAYOUT, { baseSpeed: 10 });
  r.outcomes.push("caught", "caught", "missed", "hit", "caught");
  const t = r.trials([3, 4]);
  assert.deepEqual(t.map((x) => x.correct), [true, true, false, false, true]);
  assert.deepEqual(t.map((x) => x.step), [3, 4, 3, 4, 3]);
  assert.equal(L.summarizeGame({ id: "x", title: "T", skill: "Response inhibition" }, t).accuracy, 60);
  assert.equal(new FC.Round(30).trials().length, 1, "a round with no falls still scores (as one miss)");
  assert.equal(new FC.Round(30, mulberry(1), FC.LAYOUT, { baseSpeed: 12 }).speed, 12);
  assert.equal(new FC.Round(30).speed, FC.BASE_FALL_SPEED, "default rules are unchanged");
});

test("movement game: a real round of play fills the outcomes and they add up", () => {
  const r = new FC.Round(30, mulberry(11));
  let n = 0; while (!r.over && n++ < 60 * 40) r.update(FC.STEP, Math.floor(n / 50) % 3);
  assert.ok(r.outcomes.length > 0);
  assert.equal(r.outcomes.filter((o) => o === "caught").length, r.caught);
  assert.equal(r.outcomes.filter((o) => o === "hit").length, r.hit);
  assert.equal(r.outcomes.filter((o) => o === "missed").length, r.missed);
});

test("movement game: it is scored like the other nine, in the session and in the report", () => {
  const p = login("Mov", 20); playTest(p, ALT); L.markAssessmentViewed(p);
  L.startSession(p, "2026-11-01");
  const first = L.expectedSessionGame(p); assert.equal(first.engine, "fruit"); assert.equal(first.difficulty, 1);
  const fruitTrials = [...Array(12).fill(true), ...Array(3).fill(false)].map((c, i) => ({ step: L.sessionStep(p.current.level, i), correct: c, rt: null }));
  assert.equal(L.recordSessionGame(p, first.id, fruitTrials), null);
  let r = null; while (p.current) { const g = L.expectedSessionGame(p); r = L.recordSessionGame(p, g.id, Array.from({ length: 8 }, (_, k) => ({ step: 1, correct: k < 6, rt: 1 }))) || r; }
  assert.equal(r.games.length, 10); assert.equal(r.games[0].title, "Fruit Catcher"); assert.equal(r.games[0].accuracy, 80);
  assert.equal(r.accuracy, Math.round((80 + 75 * 9) / 10));
  assert.ok(r.skills.find((k) => k.area === "Self-control"), "Self-control is reported");
  assert.ok(reportHtml(r).includes("Fruit Catcher"));
});

test("privacy: nothing in the site can record or send camera video", () => {
  const read = (f) => readFileSync(new URL("../web/js/" + f, import.meta.url), "utf8");
  const names = ["app.js", "flow/handtrack.js", "flow/camera.js", "flow/moveshell.js", "flow/fruitgame.js", "flow/fruitcatcher.js", "flow/paintgame.js", "flow/tracepath.js", "flow/feedgame.js", "flow/feedanimal.js", "flow/facetrack.js", "flow/facegame.js", "flow/expressions.js", "flow/slicegame.js", "flow/slicerules.js", "flow/cloud.js", "flow/storage.js", "flow/play.js", "flow/report.js"];
  const files = names.map((f) => [f, read(f)]);
  const banned = [/MediaRecorder/, /captureStream/, /ImageCapture/, /createObjectURL/, /new\s+Blob/, /toBlob/, /toDataURL/, /getDisplayMedia/, /audio\s*:\s*true/, /indexedDB/, /sendBeacon/, /WebSocket/, /RTCPeerConnection/];
  for (const [f, src] of files) for (const re of banned) assert.ok(!re.test(src), `${f} must not use ${re}`);
  // the camera is requested in one place only, without audio, and its tracks are stopped
  assert.deepEqual(files.filter(([, src]) => /getUserMedia\(/.test(src)).map(([f]) => f), ["flow/handtrack.js"]);
  const ht = read("flow/handtrack.js"); assert.match(ht, /audio:\s*false/); assert.match(ht, /getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
  // the files that see the video make no requests
  for (const f of ["flow/handtrack.js", "flow/facetrack.js", "flow/camera.js", "flow/moveshell.js", "flow/fruitgame.js", "flow/paintgame.js", "flow/feedgame.js", "flow/facegame.js", "flow/slicegame.js"]) assert.ok(!/fetch\(|XMLHttpRequest/.test(read(f)), `${f} must not make requests`);
  // the Python window never saves frames
  const tr = readFileSync(new URL("../game/fruit_catcher/tracker.py", import.meta.url), "utf8");
  assert.ok(!/VideoWriter|imwrite|\.write\(/.test(tr), "tracker.py must not write frames");
  // the player is told, on the game screen and on a page of its own
  const fg = read("flow/fruitgame.js"), ms = read("flow/moveshell.js"); for (const src of [fg, ms]) { assert.match(src, /never recorded/); assert.match(src, /not recorded/); assert.match(src, /Turn camera off/); }
  assert.match(read("app.js"), /function viewPrivacy/);
});

test("progress: 'is it working' compares the assessment with now, level, same-level sessions and skill areas", () => {
  const p = login("Pro", 30); playTest(p, ALT); L.markAssessmentViewed(p);
  assert.equal(L.progressSummary(p), null, "nothing before the first daily report");
  const r1 = playSession(p, 0.6, "2026-12-01");
  assert.equal(r1.progress.verdict, "early");
  const r2 = playSession(p, 0.95, "2026-12-02");
  assert.ok(["improving", "mixed"].includes(r2.progress.verdict), r2.progress.verdict);
  assert.equal(r2.progress.days, 2); assert.equal(r2.progress.startAccuracy, p.reports[0].overallAccuracy); assert.equal(r2.progress.nowAccuracy, r2.accuracy);
  assert.deepEqual(L.progressSummary(p), r2.progress, "same numbers on the plan page and in the report");
  const html = reportHtml(r2);
  assert.match(html, /Is it working/); assert.match(html, /not proof of a medical benefit/); assert.match(html, /Each game: before and today/);
  // a clear fall is reported as such
  const s = login("Down", 30); playTest(s, CORRECT); L.markAssessmentViewed(s);
  playSession(s, 0.2, "2026-12-01"); const d2 = playSession(s, 0.2, "2026-12-02");
  assert.equal(d2.progress.verdict, "slipping");
});

test("privacy page exists and the footer links to it", () => {
  const app = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  assert.match(app, /privacy: viewPrivacy/); assert.match(app, /href="#\/privacy"/);
  assert.match(app, /if \(name === "privacy"\) return true/);
});

test("interface: every icon the screens use exists and draws", () => {
  const src = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  const used = [...new Set([...src.matchAll(/icon\("([a-z]+)"/g)].map((m) => m[1]).concat([...src.matchAll(/icon\(Sound\.isMuted\(\) \? "(\w+)" : "(\w+)"/g)].flatMap((m) => [m[1], m[2]])))];
  assert.ok(used.length >= 12, "the screens use icons");
  for (const n of used) assert.ok(ICON_NAMES.includes(n), `app.js uses an icon that does not exist: ${n}`);
  for (const n of ICON_NAMES) assert.match(icon(n, 20), /^<svg class="ic /);
  assert.throws(() => icon("nope")); assert.match(markSvg(30), /<svg class="mark"/);
});

test("interface: the screens never reuse a class name from the game player (those clashes broke the layout once)", () => {
  const ui = readFileSync(new URL("../web/css/ui.css", import.meta.url), "utf8"), flow = readFileSync(new URL("../web/css/flow.css", import.meta.url), "utf8");
  const defined = (css) => new Set([...css.matchAll(/(?:^|[\s,}])\.([a-z][\w-]*)/gm)].map((m) => m[1]));
  const game = ["field", "opt", "pad", "target", "stage", "prompt", "cards", "track", "mover", "zone", "centre", "banner", "stim", "feedback", "rowset", "opts"];
  const uiOwn = defined(ui);
  for (const c of game) assert.ok(!uiOwn.has(c), `ui.css redefines the game class .${c}`);
  assert.ok(defined(flow).has("field") && defined(flow).has("opt"));
});

// ================================================================ Fruit Catcher inside the page
const seeded = (seed) => mulberry(seed);
function playRound(round, chooser, max = 60 * 100) { for (let i = 0; i < max && !round.over; i++) round.update(FC.STEP, chooser(round)); return round; }

test("fruit catcher (page): lanes from the hand and from a finger", () => {
  assert.deepEqual([0, 0.39, 0.4, 0.5, 0.6, 0.61, 1].map(FC.laneFromX), [0, 0, 1, 1, 1, 2, 2]);
  assert.deepEqual([0, 0.32, 0.34, 0.5, 0.66, 0.67, 1].map(FC.laneFromPointer), [0, 0, 1, 1, 1, 2, 2]);
});

test("fruit catcher (page): fruit and chocolate fall in different outer lanes", () => {
  const r = new FC.Round(60, seeded(1));
  for (let i = 0; i < 300; i++) { assert.ok([0, 2].includes(r.fruit.lane) && [0, 2].includes(r.choc.lane)); assert.equal(r.fruit.lane + r.choc.lane, 2); assert.ok(r.fruit.kind >= 0 && r.fruit.kind < FC.FRUIT_KINDS); [r.fruit, r.choc] = r.spawn(); }
});

test("fruit catcher (page): under the fruit scores, under the chocolate costs lives, the middle is safe", () => {
  const good = playRound(new FC.Round(60, seeded(2)), (r) => r.fruit.lane);
  assert.equal(good.over, "TIME_UP"); assert.equal(good.lives, FC.LIVES); assert.equal(good.hit, 0); assert.ok(good.caught >= 20);
  const bad = playRound(new FC.Round(60, seeded(3)), (r) => r.choc.lane);
  assert.equal(bad.over, "OUT_OF_LIVES"); assert.equal(bad.lives, 0); assert.equal(bad.hit, FC.LIVES); assert.equal(bad.caught, 0);
  const safe = playRound(new FC.Round(30, seeded(4)), () => 1);
  assert.equal(safe.over, "TIME_UP"); assert.deepEqual([safe.caught, safe.hit, safe.lives], [0, 0, FC.LIVES]); assert.ok(safe.missed > 3);
});

test("fruit catcher (page): speed-up, end of time, gliding, summary", () => {
  const r = new FC.Round(60, seeded(5));
  assert.equal(r.speed, FC.BASE_FALL_SPEED); assert.equal(r.speedFactor, 1);
  r.caught = 3; assert.equal(r.speed, FC.BASE_FALL_SPEED + 1); r.caught = 300; assert.equal(r.speed, FC.BASE_FALL_SPEED + FC.MAX_SPEED_BONUS);
  const t = new FC.Round(30, seeded(6)); for (let i = 0; i < 60 * 29; i++) t.update(FC.STEP, 1);
  assert.equal(t.over, null); assert.equal(t.remaining, 1);
  for (let i = 0; i < 120; i++) t.update(FC.STEP, 1);
  assert.equal(t.over, "TIME_UP"); assert.deepEqual(t.update(FC.STEP, 0), []);
  const g = new FC.Round(60, seeded(7)); const lx = FC.LAYOUT.laneX; g.update(FC.STEP, 0);
  assert.ok(g.charX < lx[1] && g.charX > lx[0]); for (let i = 0; i < 60; i++) g.update(FC.STEP, 0); assert.ok(Math.abs(g.charX - lx[0]) < 2);
  const s = playRound(new FC.Round(30, seeded(8)), (r) => r.fruit.lane).summary();
  for (const k of ["score", "caught", "hit", "missed", "duration_s", "played_s", "ended"]) assert.ok(k in s, k);
  assert.equal(new FC.Round(30).summary().ended, "QUIT");
});

test("fruit catcher (page): same rules as the PyGame window", () => {
  const py = readFileSync(new URL("../game/fruit_catcher/logic.py", import.meta.url), "utf8");
  for (const [name, val] of [["BASE_FALL_SPEED", FC.BASE_FALL_SPEED], ["MAX_SPEED_BONUS", FC.MAX_SPEED_BONUS], ["FRUIT_KINDS", FC.FRUIT_KINDS], ["LIVES", FC.LIVES]]) assert.match(py, new RegExp(name + " = " + val + "(?![0-9])"), name);
  assert.match(py, /DURATIONS = \(30, 60, 90\)/); assert.deepEqual(FC.DURATIONS, [30, 60, 90]);
  assert.match(py, /width: int = 1180/); assert.match(py, /height: int = 760/); assert.equal(FC.LAYOUT.width, 1180);
});

test("fruit catcher (page): everything it loads is in the site, so it works offline", () => {
  const web = (p) => new URL("../web" + p, import.meta.url);
  for (const f of ["/vendor/mediapipe/vision_bundle.mjs", "/vendor/mediapipe/hand_landmarker.task", "/vendor/mediapipe/wasm/vision_wasm_internal.js", "/vendor/mediapipe/wasm/vision_wasm_internal.wasm", "/img/fruit/character.png", "/img/fruit/chocolate.png", "/img/fruit/fruit1.png", "/img/fruit/fruit2.png", "/img/fruit/fruit3.png", "/img/fruit/fruit4.png"]) {
    assert.ok(existsSync(web(f)), f); assert.ok(statSync(web(f)).size > 500, f + " is empty");
  }
  const game = readFileSync(web("/js/flow/fruitgame.js"), "utf8"), tr = readFileSync(web("/js/flow/handtrack.js"), "utf8");
  assert.ok(!/https?:\/\//.test(game.replace(/xmlns|www\.w3\.org/g, "")) && !/https?:\/\/(?!www\.w3)/.test(tr), "no outside web addresses");
});

// ================================================================ skill areas, charts, cloud
test("skill areas: every game belongs to one cognitive skill area", () => {
  for (const g of CATALOG) assert.ok(DOMAINS.includes(domainOf(g.skill)), `${g.id} skill "${g.skill}" has no area`);
});

test("assessment report carries accuracy per skill area", () => {
  const p = login("Sk", 30); const r = playTest(p, ALT);
  const expect = {}; r.games.forEach((g) => (expect[domainOf(g.skill)] ||= []).push(g.accuracy));
  for (const [d, v] of Object.entries(expect)) assert.equal(r.domains[d], Math.round(v.reduce((a, b) => a + b, 0) / v.length));
  assert.deepEqual(Object.keys(r.domains).sort(), Object.keys(expect).sort());
});

test("daily report: skill areas compare assessment, previous session and today", () => {
  const p = login("Chart", 12); const a = playTest(p, ALT); L.markAssessmentViewed(p);
  const d1 = playSession(p, 1 / 3, "2026-08-01"), d2 = playSession(p, 2 / 3, "2026-08-02");
  assert.equal(d1.baseline.accuracy, a.overallAccuracy);
  for (const k of d1.skills) { assert.equal(k.previous, null); assert.equal(k.assessment, a.domains[k.area] ?? null); }
  assert.ok(d1.skills.some((k) => k.today === 33));
  for (const k of d2.skills) { assert.equal(k.previous, d1.skills.find((x) => x.area === k.area)?.today ?? null); }
  assert.ok(d2.skills.every((k) => k.today == null || k.today === 67));
  assert.deepEqual(d2.history.map((h) => h.accuracy), [33, 67]);
});

test("reports draw charts (svg) with the numbers in them", () => {
  const p = login("Svg", 9); playTest(p, ALT); L.markAssessmentViewed(p);
  playSession(p, 0.5, "2026-09-01"); playSession(p, 0.75, "2026-09-02");
  const a = reportHtml(p.reports[0]), d = reportHtml(p.reports[2]);
  assert.match(a, /<svg class="chart"/); assert.match(a, /Cognitive skills at the start/);
  assert.equal((d.match(/<svg class="chart"/g) || []).length, 4, "accuracy over time, each game, skill areas, progress");
  assert.match(d, /Accuracy before and after/); assert.match(d, /Cognitive skills: before and after/);
  assert.match(d, /Assessment/); assert.match(d, /Day 1/); assert.match(d, /Day 2/); assert.match(d, />75%</); assert.match(d, />50%</);
  assert.ok(!/NaN|undefined/.test(a + d));
});

test("cloud storage is off without a Firebase config and never throws", async () => {
  assert.equal(Cloud.enabled, false);
  assert.equal(await Cloud.restore(), null);
  Cloud.push({ key: "x" }); assert.equal(await Cloud.flush(), true); await Cloud.signOut();
});

test("movement game: the fall is slow enough to follow, and speeds up only a little", () => {
  for (const lv of LEVELS) for (const tier of [0, 1, 2]) {
    const s = FC.sessionPlay(lv, tier);
    assert.ok(s.baseSpeed <= 6 && s.baseSpeed >= 3, `${lv}/${tier} base speed ${s.baseSpeed}`);
    const r = new FC.Round(s.duration, mulberry(2), FC.LAYOUT, s);
    r.caught = 500; assert.ok(r.speed <= s.baseSpeed + 2, "capped at +2");
    r.caught = 0; assert.equal(r.speed, s.baseSpeed);
    r.caught = 5; assert.equal(r.speed, s.baseSpeed + 1, "+1 after every 5 fruit");
  }
  assert.ok(FC.sessionPlay("hard", 2).baseSpeed < FC.BASE_FALL_SPEED, "slower than free play");
  assert.equal(FC.sessionPlay("easy", 0).baseSpeed, FC.sessionPlay("easy", 1).baseSpeed - 1, "ages 1 to 5 are gentler");
});

test("movement game: it can be played again and again (one camera at a time, model kept, sprites never missing)", () => {
  const ht = readFileSync(new URL("../web/js/flow/handtrack.js", import.meta.url), "utf8");
  assert.ok(ht.indexOf("releaseCamera();") < ht.lastIndexOf("openCamera(onStatus)"), "an earlier stream is released before a new one is opened");
  assert.match(ht, /NotReadableError/); assert.match(ht, /attempt < 3/);        // a busy camera is retried
  assert.match(ht, /if \(landmarker\) return landmarker/);                     // the model is built once
  assert.ok(!/lm\.close\(\)/.test(ht.replace(/dropModel[^\n]*\n/, "")), "a game ending does not close the shared model");
  assert.match(ht, /export function preloadHandModel/); assert.match(ht, /cancelled\(\)/);                                           // leaving the page while it starts stops the camera
  const fg = readFileSync(new URL("../web/js/flow/fruitgame.js", import.meta.url), "utf8");
  assert.match(fg, /const ASSETS/); assert.match(fg, /ensureAssets/); assert.match(fg, /createCamera/);
  assert.match(fg, /else \{ ctx\.beginPath\(\); ctx\.arc/, "a plain shape is drawn if a sprite is missing");
});

test("text sizes: nothing on the screens is set below a readable size", () => {
  for (const f of ["styles.css", "flow.css", "ui.css"]) {
    const css = readFileSync(new URL("../web/css/" + f, import.meta.url), "utf8");
    for (const m of css.matchAll(/font-size:\s*(\d*\.?\d+)(rem|px)/g)) {
      const v = Number(m[1]), rem = m[2] === "rem" ? v : v / 16;
      assert.ok(rem >= 0.8 || (m[2] === "px" && v >= 14) || m[0].includes("17px"), `${f}: ${m[0]} is too small`);
    }
    for (const m of css.matchAll(/font:\s*\d+\s+(\d*\.?\d+)rem/g)) assert.ok(Number(m[1]) >= 0.8, `${f}: ${m[0]}`);
  }
});

// ================================================================ movement games 2 and 3
import * as TP from "../web/js/flow/tracepath.js";
import * as FA from "../web/js/flow/feedanimal.js";
import { createCamera, cameraLog } from "../web/js/flow/camera.js";

test("movement games: Fruit Catcher, Paint the Path and Feed the Animal are games 1, 2 and 3 of every list", () => {
  for (const g of GROUPS) for (const lv of LEVELS) {
    const set = L.levelGames(g.id, lv);
    assert.deepEqual(set.slice(0, 3).map((x) => x.engine), ["fruit", "trace", "feed"], `${g.id}/${lv}`);
    assert.deepEqual(set.slice(0, 3).map((x) => x.title), ["Fruit Catcher", "Paint the Path", "Feed the Animal"]);
    assert.deepEqual(set.slice(0, 3).map((x) => x.difficulty), [1, 2, 3]);
    assert.equal(set.filter((x) => MOVE.includes(x.engine)).length, 3, "only those three");
    assert.deepEqual(set.slice(0, 3).map((x) => domainOf(x.skill)), ["Self-control", "Spatial thinking", "Memory"]);
    for (const x of set.slice(0, 3)) assert.equal(x.mode, `${g.id}-${lv}`);
  }
  for (const g of CATALOG.filter((x) => x.phase === "test")) assert.ok(!MOVE.includes(g.engine), "not in the assessment");
  assert.equal(CATALOG.filter((x) => MOVE.includes(x.engine)).length, 27);
  const kinds = new Set(CATALOG.filter((x) => MOVE.includes(x.engine)).map((x) => `${x.engine}:${x.content}:${x.mode}`));
  assert.equal(kinds.size, 27, "each list has its own settings");
});

test("paint the path: every shape stays inside the arena, in order, and is long enough", () => {
  for (const id of Object.keys(TP.SHAPES)) {
    const path = new TP.PathManager(TP.waypoints(id));
    assert.ok(path.count > 100, `${id} has ${path.count} points`);
    for (const [x, y] of path.points) assert.ok(x >= 0 && x <= TP.ARENA.width && y >= 0 && y <= TP.ARENA.height, `${id} leaves the arena`);
    for (let i = 1; i < path.points.length; i++) assert.ok(Math.hypot(path.points[i][0] - path.points[i - 1][0], path.points[i][1] - path.points[i - 1][1]) < TP.STEP_PX * 1.6, `${id} has a gap`);
  }
  assert.equal(TP.toleranceFor("line", 0), Math.round(68 * 1.35)); assert.equal(TP.toleranceFor("line", 1), 68);
  for (const lv of LEVELS) for (const tier of [0, 1, 2]) assert.ok(TP.secondsFor(lv, tier) >= 35);
  assert.deepEqual(TP.LEVEL_SHAPES, { easy: ["line", "circle"], medium: ["circle", "zigzag"], hard: ["zigzag", "crown"] });
});

test("paint the path: following the line scores; skipping ahead, giving up half way or wobbling do not", () => {
  for (const id of Object.keys(TP.SHAPES)) {
    const { path, tracer } = TP.buildShape(id, TP.toleranceFor(id, 1));
    tracer.update([TP.ARENA.width - 1, TP.ARENA.height - 1]); assert.equal(tracer.started, false, "not started until the start is touched");
    tracer.update([path.start[0] + 5, path.start[1]]); assert.equal(tracer.started, true);
    for (let i = 0; i < path.count && !tracer.done; i += 2) tracer.update(path.points[i]);
    assert.ok(tracer.done, `${id} completes`); assert.equal(tracer.completion, 100);
    assert.ok(tracer.stretches().every(Boolean), `${id} stretches`); assert.equal(tracer.trials([1, 2]).length, TP.STRETCHES);
    const r = tracer.result(1); assert.equal(r.stars, 3); assert.ok(r.accuracy >= 88 && r.points >= 2000, JSON.stringify(r));
  }
  const far = TP.buildShape("zigzag", 46);
  far.tracer.update(far.path.start); const ev = far.tracer.update(far.path.end);
  assert.equal(far.tracer.done, false, "jumping to the end does not finish"); assert.equal(ev.offPath, true);
  const half = TP.buildShape("circle", 54);
  half.tracer.update(half.path.start); for (let i = 0; i < half.path.count / 2; i += 2) half.tracer.update(half.path.points[i]);
  const st = half.tracer.stretches(); assert.ok(st.slice(0, 4).every(Boolean) && st.slice(7).every((x) => !x), JSON.stringify(st));
  const rr = half.tracer.result(1); assert.ok(rr.stars <= 1 && rr.completion > 40 && rr.completion < 60, JSON.stringify(rr));
  const none = TP.buildShape("line", 68); assert.ok(none.tracer.stretches().every((x) => !x)); assert.equal(none.tracer.result().stars, 0);
  const wob = TP.buildShape("line", 68); wob.tracer.update(wob.path.start);
  for (let i = 0; i < wob.path.count && !wob.tracer.done; i += 2) { const [x, y] = wob.path.points[i]; wob.tracer.update([x, y + 60]); }
  assert.ok(wob.tracer.stretches().filter(Boolean).length < TP.STRETCHES, "tracing 60 px off the line is not scored as good");
});

test("feed the animal: every animal is fed its favourite food, rotating, with the right number of choices", () => {
  for (const lv of LEVELS) {
    const seq = FA.SEQUENCES[lv];
    for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], `${lv} repeats an animal`);
    assert.ok(seq.every((a) => FA.ANIMALS[a]));
    for (let k = 0; k < 40; k++) for (const a of Object.keys(FA.ANIMALS)) {
      const foods = FA.foodsFor(a, FA.FEED_PLAY[lv].foods, mulberry(k * 31 + 1));
      assert.equal(foods.length, FA.FEED_PLAY[lv].foods); assert.equal(new Set(foods).size, foods.length);
      assert.equal(foods.filter((f) => f === FA.ANIMALS[a].food).length, 1, "exactly one right food"); assert.ok(foods.every((f) => FA.FOODS.includes(f)));
    }
  }
  assert.deepEqual(LEVELS.map((l) => FA.FEED_PLAY[l].foods), [3, 4, 5]);
});

test("feed the animal: 3 animals, 10 points a feed, accuracy from the tries, stars, and the trials that are saved", () => {
  for (const lv of LEVELS) assert.equal(FA.SEQUENCES[lv].length, 3, `${lv} has 3 rounds`);
  const f = new FA.Feeder("easy", mulberry(5));
  assert.equal(f.animal, "rabbit"); assert.equal(f.accuracy, 0);
  assert.deepEqual(f.drop("banana"), { correct: false, done: false, animal: "rabbit", food: "banana" }); assert.equal(f.step, 0, "a wrong food does not move on");
  assert.equal(f.drop("carrot").correct, true); assert.equal(f.animal, "monkey"); assert.equal(f.score, 10);
  assert.equal(f.drop("banana").correct, true); const last = f.drop("fish");
  assert.equal(last.done, true); assert.equal(f.done, true); assert.equal(f.score, 30); assert.equal(f.correct, 3); assert.equal(f.wrong, 1);
  assert.equal(f.accuracy, 75); assert.equal(f.stars, 2); assert.throws(() => f.drop("bone"), /finished/);
  const t = f.trials([1, 2]); assert.equal(t.length, 4); assert.deepEqual(t.map((x) => x.correct), [false, true, true, true]); assert.deepEqual(t.map((x) => x.step), [1, 2, 1, 2]);
  assert.equal(L.summarizeGame({ id: "x", title: "T", skill: "Associative memory" }, t).accuracy, 75);
  const perfect = new FA.Feeder("hard", mulberry(2)); for (const a of perfect.sequence) perfect.drop(FA.ANIMALS[a].food);
  assert.equal(perfect.accuracy, 100); assert.equal(perfect.stars, 3); assert.equal(perfect.sequence.length, 3); assert.equal(perfect.score, 30);
});

test("feed the animal: the pinch needs a firm squeeze and a clear opening, so food is not dropped by accident", () => {
  const p = new FA.PinchDetector();
  assert.equal(p.update(0.2).pinching, false);
  assert.equal(p.update(0.07).justPinched, true);
  assert.equal(p.update(0.11).pinching, true, "between the two limits it is still held");
  assert.equal(p.update(0.2).pinching, true, "one open frame is not enough"); assert.equal(p.update(0.2).justReleased, true);
  assert.equal(p.update(0.07).pinching, true); p.update(null); assert.equal(p.update(null).justReleased, true, "a lost hand lets go");
});

test("movement games 2 and 3: scored like every other game in the session and in the report", () => {
  const p = login("Trio", 12); playTest(p, ALT); L.markAssessmentViewed(p); L.startSession(p, "2026-12-05");
  const level = p.current.level, names = []; let r = null, feedAcc = null;
  while (p.current) {
    const g = L.expectedSessionGame(p); names.push(g.title);
    let trials;
    if (g.engine === "trace") trials = TP.buildShape("line", 68).tracer.trials([1, 2]).map((t, i) => ({ ...t, correct: i < 8 }));
    else if (g.engine === "feed") { const f = new FA.Feeder(level, mulberry(1)); for (const a of f.sequence) { if (a === f.sequence[0]) f.drop("apple"); f.drop(FA.ANIMALS[a].food); } feedAcc = f.accuracy; trials = f.trials([1, 2]); }
    else trials = Array.from({ length: 8 }, (_, k) => ({ step: 1, correct: k < 6, rt: 1 }));
    r = L.recordSessionGame(p, g.id, trials) || r;
  }
  assert.deepEqual(names.slice(0, 3), ["Fruit Catcher", "Paint the Path", "Feed the Animal"]);
  assert.equal(r.games[1].title, "Paint the Path"); assert.equal(r.games[1].accuracy, 80);
  assert.equal(r.games[2].title, "Feed the Animal"); assert.equal(r.games[2].accuracy, feedAcc);
  const html = reportHtml(r); assert.ok(html.includes("Paint the Path") && html.includes("Feed the Animal"));
  assert.ok(r.skills.some((k) => k.area === "Spatial thinking") && r.skills.some((k) => k.area === "Memory"));
  // what a game saves is only right / wrong, the level step and a short label: never a picture or a position
  const allowed = new Set(["step", "correct", "rt", "outcome", "shape", "animal", "target"]);
  for (const list of [TP.buildShape("circle", 54).tracer.trials(), new FA.Feeder("medium", mulberry(3)).trials(), new FC.Round(30).trials()]) for (const t of list) for (const k of Object.keys(t)) assert.ok(allowed.has(k), `unexpected field ${k}`);
});

test("camera: asked for only after the player chooses it, switched off when the round ends or the player says so", async () => {
  const mk = () => {
    const calls = { start: 0, stop: 0 };
    const tracker = async (video, opts) => { calls.start++; opts.onPreview(); return { ok: true, stop() { calls.stop++; }, frame: () => ({ x: 0.5, y: 0.5, pinch: 0.05, wristX: 0.5 }), read: () => 0.5 }; };
    const panel = { box: { hidden: true }, video: {} };
    return { calls, panel, cam: createCamera({ panel, tracker }) };
  };
  let { calls, panel, cam } = mk();
  assert.equal(calls.start, 0); assert.equal(cam.state, "off"); assert.equal(cam.on, false); assert.equal(cam.frame(), null, "no camera, no hand");
  await cam.enable(); assert.equal(calls.start, 1); assert.equal(cam.on, true); assert.equal(panel.box.hidden, false);
  assert.deepEqual(Object.keys(cam.frame()).sort(), ["pinch", "wristX", "x", "y"], "only numbers");
  await cam.enable(); assert.equal(calls.start, 1, "never two streams");
  cam.disable("round finished"); assert.equal(calls.stop, 1); assert.equal(cam.state, "off"); assert.equal(panel.box.hidden, true); assert.equal(cam.frame(), null);
  cam.disable(); assert.equal(calls.stop, 1, "stopping twice is harmless");

  // leaving the page while it is still starting: the stream is stopped as soon as it arrives
  let release; const slow = new Promise((r) => (release = r));
  calls = { start: 0, stop: 0 }; panel = { box: { hidden: true }, video: {} };
  cam = createCamera({ panel, tracker: async (v, o) => { calls.start++; await slow; if (o.cancelled()) { calls.stop++; return { ok: false, reason: "cancelled" }; } return { ok: true, stop() { calls.stop++; }, frame: () => null, read: () => null }; } });
  const p1 = cam.enable(); assert.equal(cam.state, "starting"); cam.destroy(); release(); await p1;
  assert.equal(cam.on, false); assert.equal(calls.stop, 1); assert.equal(cam.state, "off");

  // a tracker that ignores the cancel signal is still stopped when it arrives
  calls = { start: 0, stop: 0 }; panel = { box: { hidden: true }, video: {} };
  cam = createCamera({ panel, tracker: async () => { await slow; return { ok: true, stop() { calls.stop++; }, frame: () => null, read: () => null }; } });
  const p2 = cam.enable(); cam.destroy(); await p2; assert.equal(calls.stop, 1); assert.equal(cam.on, false);

  // a blocked or missing camera: the game still plays with a mouse or a finger
  panel = { box: { hidden: true }, video: {} };
  cam = createCamera({ panel, tracker: async () => ({ ok: false, reason: "The camera is blocked." }) });
  await cam.enable(); assert.equal(cam.state, "blocked"); assert.equal(cam.on, false); assert.equal(cam.note, "The camera is blocked."); assert.equal(panel.box.hidden, true);

  // the log holds event names only
  assert.ok(cameraLog.length >= 5); for (const e of cameraLog) assert.deepEqual(Object.keys(e).sort(), ["at", "event"]);
  assert.ok(cameraLog.some((e) => /every camera track stopped/.test(e.event)));
});

test("movement games: the camera is only enabled from the Start with camera button, and each game offers the same choices", () => {
  const read = (f) => readFileSync(new URL("../web/js/flow/" + f, import.meta.url), "utf8");
  for (const f of ["fruitgame.js", "paintgame.js", "feedgame.js", "moveshell.js"]) {
    const uses = [...read(f).matchAll(/cam\.enable\(\)/g)].length;
    assert.ok(uses <= 1, `${f} enables the camera in ${uses} places`);
  }
  assert.match(read("moveshell.js"), /if \(withCam\) cam\.enable\(\)/); assert.match(read("fruitgame.js"), /dataset\.go === "cam"\) cam\.enable\(\)/);
  for (const f of ["moveshell.js"]) for (const t of ["Start with camera", "Play without camera", "Learn about camera privacy", "Turn camera off"]) assert.ok(read(f).includes(t), `${f}: ${t}`);
  const fruit = read("fruitgame.js"); for (const t of ["Start with camera", "Play without camera", "Learn about camera privacy", "Turn camera off"]) assert.ok(fruit.includes(t), `fruitgame.js: ${t}`);
  for (const f of ["fruitgame.js", "paintgame.js", "feedgame.js"]) assert.match(read(f), /cam\.disable\("round finished"\)/, f);
});

// ================================================================ 3 rounds, and the reset of all accounts
import * as Store from "../web/js/flow/storage.js";

test("3 rounds: every game is three rounds, in the assessment and in the daily session", () => {
  assert.equal(RULES.testRounds, 3); assert.equal(RULES.sessionRounds, 3);
  const defaults = { test: RULES.testRounds, session: RULES.sessionRounds };
  for (const g of CATALOG) {
    const inst = makeGame(g, mulberry(9)), t = inst.rounds(true, defaults), s = inst.rounds(false, defaults);
    assert.ok(t <= 3 && s <= 3, `${g.id} ${g.title}: ${t}/${s}`);
    if (!MOVE.includes(g.engine) && g.engine !== "pairs") assert.deepEqual([t, s], [3, 3], g.id);
  }
  // an assessment game needs exactly 3 trials, no more and no fewer
  const p = login("Three", 20); const g = L.expectedTestGame(p);
  assert.throws(() => L.recordTestGame(p, g.id, Array.from({ length: 6 }, () => ({ step: 3, correct: true, rt: 1 })), "d"), /3 rounds/);
  // go / no-go still has its no-go in the three rounds
  for (const game of CATALOG.filter((x) => x.engine === "gonogo")) { const inst = makeGame(game, mulberry(4)); const t = [0, 1, 2].map((i) => inst.trial(i, 3).stim.go); assert.equal(t.filter((x) => !x).length, 1); }
  // Fruit Catcher: three falls, then the round is over
  const r = new FC.Round(60, mulberry(8), FC.LAYOUT, { ...FC.sessionPlay("easy", 1) });
  let n = 0; while (!r.over && n++ < 60 * 90) r.update(FC.STEP, 1);
  assert.equal(r.over, "ROUNDS_DONE"); assert.ok(r.outcomes.length >= 3 && r.outcomes.length <= 4); assert.equal(FC.SESSION_ROUNDS, 3);
  assert.equal(new FC.Round(60).maxFalls, null, "free play and the PyGame rules are unchanged");
  // Paint the Path never has more than 3 rounds (it has 2 shapes)
  for (const lv of LEVELS) assert.ok(TP.LEVEL_SHAPES[lv].length <= 3);
});

test("reset all accounts: wipes what was saved before, once, and then saves normally again", () => {
  const mem = {}; const ls = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const had = globalThis.localStorage; Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
  try {
    mem["neuroadapt:flow:v1"] = JSON.stringify({ profiles: { a1: { name: "Old", groupId: "g2" } }, accounts: { "old@x.com": { id: "a1", hash: "x" } }, activeKey: "a1", dayOffset: 3 });
    mem["neuroadapt:fruit:best"] = "12"; mem["neuroadapt:sound"] = "1";
    Store.load();
    assert.deepEqual(Store.state.profiles, {}); assert.deepEqual(Store.state.accounts, {}); assert.equal(Store.state.activeKey, null); assert.equal(Store.state.dayOffset, 0);
    assert.equal(mem["neuroadapt:flow:v1"], undefined, "the old accounts are gone"); assert.equal(mem["neuroadapt:fruit:best"], undefined);
    assert.equal(mem["neuroadapt:flow:epoch"], Store.RESET_EPOCH);
    // after the reset, data saves and loads as usual and is NOT wiped again
    const p = L.newProfile({ name: "New", age: 30, group: L.groupForAge(30), condition: "" }, "n1");
    Store.state.profiles.n1 = p; Store.state.accounts["new@x.com"] = { id: "n1", hash: "h" }; Store.state.activeKey = "n1"; Store.save();
    Store.state.profiles = {}; Store.state.accounts = {}; Store.state.activeKey = null;
    Store.load(); assert.equal(Store.state.profiles.n1.name, "New"); assert.equal(Store.state.activeKey, "n1"); assert.ok(Store.state.accounts["new@x.com"]);
    // a blocked or empty storage never throws
    Object.defineProperty(globalThis, "localStorage", { value: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } }, configurable: true });
    assert.doesNotThrow(() => Store.load());
  } finally { if (had === undefined) delete globalThis.localStorage; else Object.defineProperty(globalThis, "localStorage", { value: had, configurable: true }); }
});

// ================================================================ suggested games: Make a Face and Cut the Fruit
import * as EX from "../web/js/flow/expressions.js";
import * as SR from "../web/js/flow/slicerules.js";

const learner = (name, age, cond, domains, level = "medium") => {
  const p = login(name, age, cond);
  p.test.completed = true; p.assessmentViewed = true; p.level = level;
  p.reports.push({ id: "assessment", type: "assessment", date: "2026-01-01", domains, overallAccuracy: 70, level, games: [], plan: [] });
  return p;
};
const ALL_GOOD = { Memory: 90, Attention: 90, "Self-control": 90, Reasoning: 90, "Flexible thinking": 90, "Spatial thinking": 90, "Processing speed": 90 };

test("suggested games: the two games are extras, not part of any list of 10 and not in the assessment", () => {
  assert.deepEqual(SUGGESTIONS.map((s) => s.engine), ["face", "slice"]);
  assert.equal(CATALOG.length, 105);
  for (const s of SUGGESTIONS) { assert.ok(!CATALOG.some((g) => g.engine === s.engine || g.title === s.title), s.title); assert.ok(TASK_INFO[s.engine], s.engine); assert.ok(DOMAINS.includes(domainOf(s.skill)), s.skill); }
  assert.equal(domainOf("Social cognition"), "Social thinking"); assert.ok(DOMAINS.includes("Social thinking"));
  assert.equal(domainOf("Hand-eye coordination"), "Processing speed");
  const css = readFileSync(new URL("../web/css/flow.css", import.meta.url), "utf8"); assert.match(css, /\.area-social-thinking/); assert.match(css, /--a-social-thinking/);
});

test("suggested games: both are always offered; the ones that fit (skill area, condition, both) come first", () => {
  const fine = L.suggestionsFor(learner("Fine", 30, "", ALL_GOOD)); assert.deepEqual(fine.map((s) => s.id).sort(), ["face", "slice"], "both games are offered even when nothing is wrong");
  for (const s of fine) { assert.equal(s.byArea.length, 0); assert.equal(s.byCondition, false); assert.match(s.reason, /^An extra to try\. It trains /); }
  const weakFlex = L.suggestionsFor(learner("Flex", 30, "", { ...ALL_GOOD, "Flexible thinking": 40 }));
  assert.deepEqual(weakFlex.map((s) => s.id), ["face", "slice"]); assert.match(weakFlex[0].reason, /Flexible thinking is among your lowest skill areas/); assert.equal(weakFlex[0].byCondition, false);
  const weakFast = L.suggestionsFor(learner("Fast", 30, "", { ...ALL_GOOD, "Processing speed": 30, "Self-control": 50 }));
  assert.deepEqual(weakFast.map((s) => s.id), ["slice", "face"]); assert.match(weakFast[0].reason, /Self-control and Processing speed are among your lowest/);
  const aut = L.suggestionsFor(learner("Aut", 8, "Autism spectrum", ALL_GOOD)); assert.deepEqual(aut.map((s) => s.id), ["face", "slice"]); assert.match(aut[0].reason, /condition/); assert.equal(aut[0].byCondition, true);
  const adhd = L.suggestionsFor(learner("Adhd", 8, "ADHD", ALL_GOOD)); assert.deepEqual(adhd.map((s) => s.id), ["slice", "face"]);
  const both = L.suggestionsFor(learner("Both", 8, "Autism and ADHD", ALL_GOOD)); assert.deepEqual(both.map((s) => s.id).sort(), ["face", "slice"]); assert.ok(both.every((s) => s.byCondition));
  const mixed = L.suggestionsFor(learner("Mix", 8, "Autism", { ...ALL_GOOD, Attention: 40 })); assert.match(mixed[0].reason, /Attention is among your lowest skill areas, and it also fits the condition/);
  assert.deepEqual(L.suggestionsFor(learner("Other", 8, "Asthma", ALL_GOOD)).map((s) => s.id).sort(), ["face", "slice"], "an unrelated condition still gets both, as general extras");
  // no suggestions before the assessment is done and viewed
  assert.deepEqual(L.suggestionsFor(login("New", 8, "Autism")), []);
  // the game handed over belongs to the player's age group and level
  const g = aut[0].game; assert.equal(g.group, "g2"); assert.equal(g.mode, "g2-medium"); assert.equal(g.phase, "suggested"); L.assertInGroup(g, "g2");
});

test("suggested games: the result is kept, shown in that day's report, and never changes the level", () => {
  const p = playTestedLearner();
  const before = JSON.stringify({ level: p.level, sessions: p.sessions.length });
  const a = L.recordExtra(p, "face", [{ step: 1, correct: true, rt: null }, { step: 2, correct: true, rt: null }, { step: 1, correct: false, rt: null }], "2026-02-01");
  assert.equal(a.accuracy, 67); assert.equal(a.correct, 2); assert.equal(a.rounds, 3); assert.equal(p.extras.length, 1);
  assert.equal(JSON.stringify({ level: p.level, sessions: p.sessions.length }), before, "no change to the level or the sessions");
  // played before the day's session finishes: it goes into that day's report
  const r = playSession(p, 2 / 3, "2026-02-01");
  assert.equal(r.extras.length, 1); assert.equal(r.extras[0].title, "Make a Face"); assert.equal(r.accuracy, 67);
  assert.match(reportHtml(r), /Suggested games played today/); assert.match(reportHtml(r), /Make a Face/);
  // played after the report: added to the same day's report
  L.recordExtra(p, "slice", [{ step: 1, correct: true, rt: null }], "2026-02-01");
  assert.equal(p.reports.find((x) => x.id === "day-1").extras.length, 2); assert.equal(p.extras.length, 2);
  // the level decision is the same with or without the extras
  const q = playTestedLearner(); const r2 = playSession(q, 2 / 3, "2026-02-01"); assert.equal(r2.decision.action, r.decision.action); assert.equal(r2.accuracy, r.accuracy); assert.equal(r2.extras.length, 0);
  assert.doesNotMatch(reportHtml(r2), /Suggested games played today/);
  assert.throws(() => L.recordExtra(p, "nope", [{ step: 1, correct: true }], "d"), /Unknown/); assert.throws(() => L.recordExtra(p, "face", [], "d"), /at least one/);
});
function playTestedLearner() { const p = login("Ext", 30, "Autism"); playTest(p, ALT); L.markAssessmentViewed(p); return p; }

test("make a face: each face is recognised from the camera numbers, as in the original game", () => {
  const c = (b) => EX.classify(b)[0];
  assert.equal(c({ mouthSmileLeft: 0.7, mouthSmileRight: 0.7 }), "SMILE");
  assert.equal(c({ jawOpen: 0.6, browInnerUp: 0.6, browOuterUpLeft: 0.6, browOuterUpRight: 0.6 }), "SURPRISE");
  assert.equal(c({ eyeBlinkLeft: 0.8, eyeBlinkRight: 0.1 }), "WINK"); assert.equal(c({ eyeBlinkLeft: 0.1, eyeBlinkRight: 0.8 }), "WINK");
  assert.equal(c({ eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8 }), "RESTING", "a blink with both eyes is not a wink");
  assert.equal(c({ cheekPuff: 0.6 }), "PUFF"); assert.equal(c({ mouthPucker: 0.7 }), "PUCKER"); assert.equal(c({ browDownLeft: 0.6, browDownRight: 0.6 }), "ANGRY");
  assert.equal(c({}), "NEUTRAL"); assert.equal(c({ mouthSmileLeft: 0.3, mouthSmileRight: 0.3 }), "RESTING");
  assert.equal(c({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9, cheekPuff: 0.4 }), "SMILE", "the strongest one wins");
  const sm = new EX.Smoother(5); let out; for (const v of [0, 0, 0, 1, 1]) out = sm.push({ jawOpen: v }); assert.equal(out.jawOpen, 0.4); assert.equal(sm.push(null), null);
});

test("make a face: 3 rounds, the face must be held without a break, the time can run out, and tapping works without a camera", () => {
  for (const lv of LEVELS) for (const tier of [0, 1, 2]) { const s = EX.faceSettings(lv, tier); assert.equal(s.rounds, 3); assert.ok(s.timer >= 4 && s.pool.length >= 2); }
  assert.ok(EX.faceSettings("easy", 0).timer > EX.faceSettings("easy", 1).timer, "ages 1 to 5 get more time");
  assert.deepEqual(LEVELS.map((l) => EX.faceSettings(l, 1).pool.length), [2, 4, 5]);
  const g = new EX.FaceRounds(EX.faceSettings("easy", 1), mulberry(3)); const t0 = g.target;
  assert.equal(g.round, 1); assert.equal(g.update(0.3, t0), null); assert.equal(g.update(0.1, "NEUTRAL"), null); assert.equal(g.held, 0, "a break starts the hold again");
  assert.equal(g.update(0.3, t0), null); assert.equal(g.update(0.3, t0), "success"); assert.equal(g.index, 1); assert.notEqual(g.target, t0, "never the same face twice in a row");
  for (let i = 0; i < 70; i++) if (g.update(0.1, null) === "timeout") break; assert.equal(g.index, 2, "time ran out");
  assert.equal(g.round, 3); assert.equal(g.choose(g.target), "success"); assert.equal(g.done, true); assert.equal(g.round, 3, "never past the last round"); assert.equal(g.update(1, null), null); assert.equal(g.choose("SMILE"), null);
  assert.deepEqual(g.trials([1, 2]).map((t) => t.correct), [true, false, true]); assert.equal(g.accuracy, 67); assert.equal(g.stars, 2); assert.ok(g.points > 200);
  assert.equal(L.summarizeGame({ id: "x", title: "T", skill: "Social cognition" }, g.trials()).accuracy, 67);
});

test("cut the fruit: a swipe cuts what it crosses and a resting hand does not", () => {
  assert.equal(SR.segmentHits([0, 0], [100, 0], [50, 10], 20), true); assert.equal(SR.segmentHits([0, 0], [100, 0], [50, 40], 20), false);
  assert.equal(SR.segmentHits([10, 10], [10, 10], [12, 12], 5), true); assert.equal(SR.segmentHits([200, 0], [300, 0], [50, 0], 20), false, "the segment ends before the circle");
  const s = SR.sliceSettings("easy", 1), slow = SR.sliceSettings("easy", 0); assert.ok(slow.flight > s.flight); assert.ok(SR.SLICE_LEVELS.hard.flight >= 1.9, "slower than the original");
  const g = new SR.SliceGame(s, mulberry(1)); g.update(1.0, null); const th = g.things.find((t) => t.state === "air"); assert.ok(th, "something was thrown");
  g.update(0.016, { x: th.x - 60, y: th.y }); g.update(0.016, { x: th.x - 59.9, y: th.y }); assert.equal(g.outcomes.length, 0, "a hand that hardly moves cuts nothing");
});

test("cut the fruit: right / wrong trials, 3 waves, lives, and the bomb", () => {
  const settings = { fruits: 2, bombs: 1, flight: 2.0, spacing: 1.0, rounds: 3, lives: 3 };
  const play = (policy, seed = 5) => {
    const g = new SR.SliceGame(settings, mulberry(seed)); let n = 0, cursor = null;
    while (!g.done && n++ < 20000) {
      cursor = null;
      for (const th of g.things) if (th.state === "air" && policy(th)) cursor = { x: th.x, y: th.y };       // swipe through it
      if (cursor) { g.update(0.016, { x: cursor.x - 40, y: cursor.y }); g.update(0.016, cursor); } else g.update(0.016, null);
    }
    return g;
  };
  const perfect = play((t) => t.kind === "fruit");                       // cuts every fruit, leaves the bomb
  assert.equal(perfect.over, "ROUNDS_DONE"); assert.equal(perfect.outcomes.length, 9); assert.equal(perfect.accuracy, 100); assert.equal(perfect.stars, 3); assert.equal(perfect.lives, 3);
  assert.ok(perfect.points >= 6 * 5 && perfect.points <= 6 * 15); assert.equal(perfect.trials().length, 9); assert.ok(perfect.trials().every((t) => t.correct));
  const cutAll = play(() => true);                                       // cuts the bombs too: loses every life
  assert.equal(cutAll.lives, 0); assert.equal(cutAll.over, "NO_LIVES"); assert.ok(cutAll.outcomes.some((o) => o.kind === "bomb" && !o.correct)); assert.ok(cutAll.accuracy < 100);
  const idle = play(() => false);                                        // does nothing: fruit missed, bombs avoided
  assert.equal(idle.over, "ROUNDS_DONE"); assert.equal(idle.accuracy, 33); assert.equal(idle.lives, 3); assert.equal(idle.stars, 1);
  assert.deepEqual([...new Set(idle.trials().map((t) => t.outcome))].sort(), ["avoided", "missed"]);
  assert.equal(L.summarizeGame({ id: "x", title: "T", skill: "Hand-eye coordination" }, perfect.trials()).accuracy, 100);
  assert.equal(SR.SLICE_ROUNDS, 3); assert.equal(new SR.SliceGame(settings, mulberry(1)).trials().length, 1, "a game with nothing played still scores as one miss");
});

test("suggested games: the camera rules are the same, and the face model stays on the device", () => {
  const read = (f) => readFileSync(new URL("../web/js/flow/" + f, import.meta.url), "utf8");
  for (const f of ["facegame.js", "slicegame.js"]) { assert.match(read(f), /cam\.disable\("round finished"\)/, f); assert.match(read(f), /shell\.readyCard/, f); assert.ok(!/cam\.enable\(\)/.test(read(f)), `${f} never asks for the camera itself`); }
  const ft = read("facetrack.js"); assert.ok(!/getUserMedia\(/.test(ft), "the face tracker opens the camera through the shared opener"); assert.match(ft, /acquireStream/); assert.match(ft, /face_landmarker\.task/);
  assert.match(read("handtrack.js"), /export async function acquireStream/);
  assert.ok(existsSync(new URL("../web/vendor/mediapipe/face_landmarker.task", import.meta.url)) && statSync(new URL("../web/vendor/mediapipe/face_landmarker.task", import.meta.url)).size > 1e6, "the face model is in the site, so it works offline");
  for (const n of SR.FRUIT_NAMES) for (const p of [`whole/${n}.png`, `half/${n}_half_1.png`, `half/${n}_half_2.png`]) assert.ok(existsSync(new URL("../web/img/slice/" + p, import.meta.url)), p);
  assert.ok(existsSync(new URL("../web/img/slice/grenade.png", import.meta.url)));
  const app = read("../app.js"); assert.match(app, /function viewExtra/); assert.match(app, /extra: viewExtra/); assert.match(app, /Suggested for you/);
});
