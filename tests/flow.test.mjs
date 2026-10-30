// Workflow tests. Run from the halcyon folder:   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG, GROUPS, LEVELS, RULES, WORD_LISTS, FOILS, DOMAINS, domainOf, STORIES, ANALOGIES } from "../web/js/flow/data.js";
import * as Cloud from "../web/js/flow/cloud.js";
import { createAccount, signInAccount } from "../web/js/flow/auth.js";
import { reportHtml } from "../web/js/flow/report.js";
import { makeGame, ENGINE_NAMES, _transforms, COLORS } from "../web/js/flow/engines.js";
import * as L from "../web/js/flow/logic.js";

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

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
    const t = g.title.toLowerCase(); assert.ok(!titles.has(t), "duplicate title " + g.title); titles.add(t);
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

test("engines: round counts (6 in the assessment, 8 in practice, special cases)", () => {
  const defaults = { test: RULES.testRounds, session: RULES.sessionRounds };
  for (const game of CATALOG) {
    const inst = makeGame(game, mulberry(5));
    const t = inst.rounds(true, defaults), s = inst.rounds(false, defaults);
    if (game.engine === "pairs") { assert.equal(t, 2); assert.equal(s, 2); }
    else if (game.engine === "gonogo") { assert.equal(t, 6); assert.equal(s, 12); }
    else { assert.equal(t, 6, game.id); assert.equal(s, 8, game.id); }
  }
});

test("engines: every assessment game really has the 6 rounds the workflow expects", () => {
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
  assert.ok(g, `no ${engine}:${content}:${mode} game in the catalogue`);
  const inst = makeGame(g, mulberry(42)), out = [];
  for (let i = 0; i < n; i++) out.push(inst.trial(i, STEPS[i % 6]));
  return out;
}
const right = (d) => d.options[d.answer].key;
const hexToColour = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [v, k]));
// every thing drawn in a piece of html, as a comparable key ("star|red", "dog", "7", ...)
const tokensOf = (h) => [...h.matchAll(/aria-label="([^"]+)"[^>]*><g fill="([^"]+)"|aria-label="([^"]+)"|class="tx[^"]*">([^<]+)/g)].map((m) => (m[1] ? (hexToColour[m[2]] ? `${m[1]}|${hexToColour[m[2]]}` : m[1]) : m[3] || m[4]));

test("answers: serial subtraction continues the same step", () => {
  for (const d of sampleGames("arith", "serial")) { const t = d.meta.expr.split(", ").slice(0, 3).map(Number); assert.equal(t[0] - t[1], t[1] - t[2]); assert.equal(Number(right(d)), t[2] - (t[0] - t[1])); assert.ok(Number(right(d)) > 0); }
});

test("answers: number and letter series", () => {
  for (const d of sampleGames("series", "number")) assert.equal(Number(right(d)), d.meta.seq[d.meta.seq.length - 1] + d.meta.d);
  for (const d of sampleGames("series", "numberalt")) { const q = d.meta.seq, n = q.length; assert.equal(Number(right(d)), q[n - 2] + (q[n - 2] - q[n - 4])); }
  for (const d of sampleGames("series", "letter")) assert.equal(right(d), d.meta.next);
});

test("answers: colour / shape pattern series continue the unit", () => {
  for (const c of ["color", "shape", "shapecolor"]) for (const d of sampleGames("series", c)) {
    const { unit, L: len } = d.meta, shown = (d.stimulus.match(/<(?:span class="sw"|svg class="sh")[^>]*>/g) || []).length;
    assert.equal(shown, len, c);
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
  for (const c of ["arrows", "letters"]) for (const d of sampleGames("flanker", c)) assert.equal(d.options[d.answer].key, d.meta.c);
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
      const sig = d.options.map((o) => (g.content === "shape" ? o.html.replace(/fill="[^"]*"/g, "") : o.html));
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
      const d = inst.trial(i, STEPS[i % 6]), shown = tokensOf(d.stimulus);
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
      const d = inst.trial(i, STEPS[i % 6]), a = tokensOf(d.stimulus), b = tokensOf(d.after);
      assert.equal(a.length - 1, b.length); assert.deepEqual(a.filter((x) => !b.includes(x)), [right(d)]);
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
function playSession(p, accuracy, today) {      // accuracy 0..1 over 8 rounds
  L.startSession(p, today);
  let report = null;
  while (p.current) {
    const g = L.expectedSessionGame(p), n = RULES.sessionRounds, ok = Math.round(accuracy * n);
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
    for (const g of r.games) { assert.equal(g.rounds, 6); assert.equal(g.accuracy, Math.round((100 * g.correct) / 6)); assert.ok(g.ability >= 1 && g.ability <= 6); }
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
  for (let i = 0; i < 9; i++) assert.equal(L.recordSessionGame(p, plan[i].id, Array.from({ length: 8 }, (_, k) => ({ step: 1, correct: k < 6, rt: 1 }))), null);
  assert.equal(p.sessions.length, 0);
  const r = L.recordSessionGame(p, plan[9].id, Array.from({ length: 8 }, (_, k) => ({ step: 1, correct: k < 6, rt: 1 })));
  assert.ok(r); assert.equal(r.id, "day-1"); assert.equal(r.day, 1); assert.equal(r.games.length, 10); assert.equal(r.accuracy, 75);
  assert.equal(p.current, null); assert.equal(p.sessions.length, 1); assert.equal(p.reports.length, 2);
  assert.equal(L.sessionState(p, "2026-04-01"), "done_today");
  assert.throws(() => L.startSession(p, "2026-04-01"), /already complete/);
  assert.equal(L.sessionState(p, "2026-04-02"), "ready");
});

test("daily report: compares with the previous day and moves the level when needed", () => {
  const p = login("Kai", 9); playTest(p, WRONG); L.markAssessmentViewed(p);       // Easy
  const d1 = playSession(p, 0.75, "2026-05-01");
  assert.equal(d1.accuracy, 75); assert.equal(d1.previous, null); assert.equal(d1.trend, "first");
  assert.equal(d1.decision.action, "stay"); assert.equal(p.level, "easy");
  assert.deepEqual(d1.games.map((g) => g.previous), Array(10).fill(null));

  const d2 = playSession(p, 0.875, "2026-05-02");                                // 88 -> up
  assert.equal(d2.accuracy, 88); assert.equal(d2.previous.accuracy, 75); assert.equal(d2.difference, 13); assert.equal(d2.trend, "improved");
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

  const d5 = playSession(p, 0.25, "2026-05-05");                                 // 25% -> down
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
  playSession(p, 0.25, "2026-06-02");                                             // 25 -> back to medium
  const r = playSession(p, 0.875, "2026-06-03");                                  // 88 vs last medium 100 -> repeat
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
  const d1 = playSession(p, 0.5, "2026-08-01"), d2 = playSession(p, 0.75, "2026-08-02");
  assert.equal(d1.baseline.accuracy, a.overallAccuracy);
  for (const k of d1.skills) { assert.equal(k.previous, null); assert.equal(k.assessment, a.domains[k.area] ?? null); }
  assert.ok(d1.skills.some((k) => k.today === 50));
  for (const k of d2.skills) { assert.equal(k.previous, d1.skills.find((x) => x.area === k.area)?.today ?? null); }
  assert.ok(d2.skills.every((k) => k.today == null || k.today === 75));
  assert.deepEqual(d2.history.map((h) => h.accuracy), [50, 75]);
});

test("reports draw charts (svg) with the numbers in them", () => {
  const p = login("Svg", 9); playTest(p, ALT); L.markAssessmentViewed(p);
  playSession(p, 0.5, "2026-09-01"); playSession(p, 0.75, "2026-09-02");
  const a = reportHtml(p.reports[0]), d = reportHtml(p.reports[2]);
  assert.match(a, /<svg class="chart"/); assert.match(a, /Cognitive skills at the start/);
  assert.equal((d.match(/<svg class="chart"/g) || []).length, 2);
  assert.match(d, /Accuracy before and after/); assert.match(d, /Cognitive skills: before and after/);
  assert.match(d, /Assessment/); assert.match(d, /Day 1/); assert.match(d, /Day 2/); assert.match(d, />75%</); assert.match(d, />50%</);
  assert.ok(!/NaN|undefined/.test(a + d));
});

test("cloud storage is off without a Firebase config and never throws", async () => {
  assert.equal(Cloud.enabled, false);
  assert.equal(await Cloud.restore(), null);
  Cloud.push({ key: "x" }); assert.equal(await Cloud.flush(), true); await Cloud.signOut();
});
