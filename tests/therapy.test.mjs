import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../web/js/therapy/engine.js";
import { GAME_CATALOG, ASSESSMENT_DOMAIN_GAMES } from "../web/js/therapy/catalog.js";
import { QUESTIONS_I18N, QUICK_CHOICES } from "../web/js/therapy/questions.js";

const profile = () => ({ name: "A", age: 5, reports: [], pedia: null });
const motor = (f, g) => [{ gameId: "tiny_dots", domain: "Fine Motor", score: f, errors: 1, timeTakenSec: 10 }, { gameId: "big_reach", domain: "Gross Motor", score: g, errors: 1, timeTakenSec: 10 }];

test("every question has quick choices in all three languages", () => {
  for (const l of ["en", "hi", "ta"]) for (const q of QUESTIONS_I18N[l]) assert.ok(QUICK_CHOICES[l][q.id].length >= 3, `${l}/${q.id}`);
});
test("skipped questions are not scored", () => {
  assert.equal(E.scoreAnswer(QUESTIONS_I18N.en[0], { kind: "skipped" }).score, null);
});
test("rubric: word counts and riddle keyword", () => {
  const q = QUESTIONS_I18N.en[0];
  assert.equal(E.scoreAnswer(q, { text: "yes", kind: "typed" }).score, 68);
  assert.equal(E.scoreAnswer(q, { text: "I like to play", kind: "typed" }).score, 80);
  assert.equal(E.scoreAnswer(q, { text: "I like to play with my toy cars outside today", kind: "spoken" }).score, 92);
});
test("motor scores below 75 are lagging and sorted weakest first", () => {
  const s = E.scoreSession({ answers: {}, motor: motor(50, 70) });
  assert.deepEqual(s.lagging, ["Fine Motor", "Gross Motor"]);
  assert.equal(s.catalogScores["Fine Motor"], 50);
});
test("adaptive difficulty: 3 successes up, 2 misses down, bounded 1..3", () => {
  let st = { difficulty: 1, cs: 0, cf: 0 };
  for (let i = 0; i < 3; i++) st = E.nextState(st, { completed: true, score: 90, errors: 0 }).state;
  assert.equal(st.difficulty, 2);
  for (let i = 0; i < 2; i++) st = E.nextState(st, { completed: true, score: 40, errors: 4 }).state;
  assert.equal(st.difficulty, 1);
  st = E.nextState(st, { completed: true, score: 40, errors: 4 }).state;
  st = E.nextState(st, { completed: true, score: 40, errors: 4 }).state;
  assert.equal(st.difficulty, 1);
});
test("daily queue has 10 to 15 items, weak domain first", () => {
  const p = profile(); E.recordTherapy(p, { answers: {}, motor: motor(40, 95) }, "2026-11-19");
  const { queue } = E.dailyQueue(p, "2026-11-19");
  assert.ok(queue.length >= 10 && queue.length <= 15);
  assert.ok(ASSESSMENT_DOMAIN_GAMES["Fine Motor"].includes(queue[0].gameId));
  assert.equal(queue[0].weak, true);
});
test("recordGame logs a result and rejects bad data", () => {
  const p = profile(); E.recordTherapy(p, { answers: {}, motor: motor(40, 95) }, "2026-11-19");
  const r = E.recordGame(p, "tiny_dots", { score: 88, errors: 0, timeTakenSec: 9, completed: true }, "2026-11-19");
  assert.equal(r.success, true);
  assert.equal(E.dailyQueue(p, "2026-11-19").doneCount, 1);
  assert.throws(() => E.recordGame(p, "tiny_dots", { score: NaN, errors: 0, timeTakenSec: 1 }, "2026-11-19"));
});
test("improvement needs two sessions and uses real numbers", () => {
  const p = profile(); E.recordTherapy(p, { answers: {}, motor: motor(40, 60) }, "2026-11-01");
  assert.equal(E.improvement(p), null);
  E.recordTherapy(p, { answers: {}, motor: motor(70, 60) }, "2026-11-19");
  assert.equal(E.improvement(p).rows.find((r) => r.domain === "Fine Motor").change, 30);
});
test("catalog has the new motor games", () => assert.ok(["tiny_dots", "big_reach"].every((id) => GAME_CATALOG.some((g) => g.id === id))));

test("autism-focused games exist for every area and every weak area is offered one first", async () => {
  const { ASSESSMENT_DOMAIN_GAMES: M, GAME_CATALOG: G } = await import("../web/js/therapy/catalog.js");
  const ids = ["routine_memory", "odd_one_out", "ask_for_it", "bead_threading", "big_beat"];
  for (const id of ids) assert.ok(G.find((g) => g.id === id && [1, 2, 3].every((l) => g.levels[l])), id);
  assert.equal(M["Memory"][0], "routine_memory"); assert.equal(M["Communication"][0], "ask_for_it");
  assert.equal(M["Fine Motor"][0], "bead_threading"); assert.equal(M["Gross Motor"][0], "big_beat");
});
test("each queue item says why it was suggested", () => {
  const p = profile(); E.recordTherapy(p, { answers: {}, motor: motor(40, 95) }, "2026-11-19");
  const { queue } = E.dailyQueue(p, "2026-11-19");
  assert.match(queue[0].why, /Fine Motor scored 40%/);
  assert.ok(queue.every((q) => q.why));
});
