// The therapy workflow with no screen code in it, so it can be tested on its own.
//
//   virtual therapist session (7 spoken questions + 4 short motor tasks)
//     -> domain scores, strengths, practice areas and the lagging domains (below 75)
//     -> adaptive plan: a daily queue of 10 to 15 activities, weak domains first
//     -> each game result moves that skill's difficulty (3 successes up, 2 misses down)
//     -> progress and improvement worked out from the saved results only
//
// Rules and numbers come from the PediaSense project (therapist session, adaptive learning screen, adaptive difficulty
// service). Where this file differs, the comment says so.

import { QUESTIONS_I18N, QUICK_CHOICES } from "./questions.js";
import { DOMAINS, ASSESSMENT_DOMAINS, ASSESSMENT_DOMAIN_GAMES, DOMAIN_GAMES, GAME_CATALOG, getGameById, getGamesForSkill, getSkillById, toCatalogDomain } from "./catalog.js";

export const LAGGING_BELOW = 75;             // a domain scoring below this is flagged for practice
export const STRONG_FROM = 85;
export const SUCCESS_SCORE = 70, SUCCESS_MAX_ERRORS = 2;     // a game round counts as a success: completed, score >= 70, at most 2 errors
export const UP_AFTER = 3, DOWN_AFTER = 2;                    // 3 successes in a row: level up. 2 misses in a row: level down
export const QUEUE_MIN = 10, QUEUE_MAX = 15;
export const LEVEL_NAME = { 1: "Level 1 · gentle", 2: "Level 2 · medium", 3: "Level 3 · challenge" };

// The four short games played inside the session: they are how fine and gross motor skills are looked at.
export const SESSION_MOTOR = [
  { gameId: "tiny_dots", level: 2, domain: "Fine Motor" },
  { gameId: "trace_and_match", level: 1, domain: "Fine Motor" },
  { gameId: "big_reach", level: 2, domain: "Gross Motor" },
  { gameId: "move_and_match", level: 1, domain: "Gross Motor" },
];

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const rnd = (x) => (x == null ? null : Math.round(x));
export const questionsFor = (lang) => QUESTIONS_I18N[lang] || QUESTIONS_I18N.en;
export const choicesFor = (lang, id) => ((QUICK_CHOICES[lang] || QUICK_CHOICES.en)[id]) || [];
export const labelFor = (score) => (score == null ? "Not enough information" : score >= STRONG_FROM ? "Strength" : score >= LAGGING_BELOW ? "On track" : score >= 50 ? "Needs practice" : "Needs support");

// ----------------------------------------------------------------- scoring one answer
// ans: { text, kind: "typed" | "spoken" | "tapped" | "skipped", correct? }
// The rubric is the PediaSense one (8+ words 92, 3 to 7 words 80, shorter 68, +10 for the riddle's keyword). Differences:
//   - a skipped question is "not scored" (null), not 55, so a child who stays quiet is not marked as weak by the rubric;
//   - a tapped picture/phrase counts as a clear answer (80), because many children answer by pointing rather than speaking.
export function scoreAnswer(q, ans) {
  const text = String((ans && ans.text) || "").trim();
  if (!ans || ans.kind === "skipped" || !text) return { score: null, skipped: true, note: "The question was shown; no answer was given." };
  const hit = q.targetKeywords ? q.targetKeywords.some((k) => text.toLowerCase().includes(String(k).toLowerCase())) : false;
  let score, note;
  if (ans.kind === "tapped") {
    score = 80; note = `Chose an answer: "${text}"`;
    if (q.targetKeywords) score = hit ? 90 : 68;
  } else {
    const words = text.split(/\s+/).length;
    if (words >= 8) { score = 92; note = `Detailed answer (${words} words): "${text}"`; }
    else if (words >= 3) { score = 80; note = `Clear, direct answer: "${text}"`; }
    else { score = 68; note = `Brief answer: "${text}"`; }
    if (hit) score = Math.min(100, score + 10);
  }
  return { score, skipped: false, note };
}

// ----------------------------------------------------------------- scoring a whole session
// input: { lang, answers: { questionId: ans }, motor: [{ gameId, domain, score, errors, timeTakenSec, completed } | null], assessmentAccuracy }
export function scoreSession({ lang = "en", answers = {}, motor = [], assessmentAccuracy = null }) {
  const qs = questionsFor(lang), scores = {}, responses = [], strengths = [], practice = [];
  for (const q of qs) {
    const r = scoreAnswer(q, answers[q.id]);
    scores[q.domain] = r.score;
    responses.push({ questionId: q.id, domain: q.domain, title: q.title, question: q.text, answer: r.skipped ? "" : String(answers[q.id].text).trim(), kind: r.skipped ? "skipped" : answers[q.id].kind, score: r.score, observation: r.note });
    if (r.score == null) practice.push({ domain: q.domain, tip: `No answer yet. Try again another day with a gentle prompt like "${q.title}".` });
    else if (r.score >= 80) strengths.push({ domain: q.domain, summary: q.sampleStrength });
    else practice.push({ domain: q.domain, tip: q.samplePractice });
  }
  // fine and gross motor: the mean score of the motor tasks that were played
  const motorBy = { "Fine Motor": [], "Gross Motor": [] }, motorRows = [];
  for (const m of motor) {
    if (!m) continue;
    motorBy[m.domain].push(m.score);
    motorRows.push({ gameId: m.gameId, domain: m.domain, score: Math.round(m.score), errors: m.errors, timeTakenSec: m.timeTakenSec });
  }
  for (const d of ["Fine Motor", "Gross Motor"]) {
    scores[d] = motorBy[d].length ? rnd(mean(motorBy[d])) : null;
    if (scores[d] == null) practice.push({ domain: d, tip: "The movement tasks were skipped, so this skill could not be looked at yet." });
    else if (scores[d] >= 80) strengths.push({ domain: d, summary: d === "Fine Motor" ? "Small, controlled hand movements went well." : "Big arm and body movements went well." });
    else practice.push({ domain: d, tip: d === "Fine Motor" ? "Practise small movements: bead threading, tracing, placing shapes." : "Practise big movements: reaching, hopping, throwing and catching soft balls." });
  }
  // the five catalog domains, from the nine observed ones; the first assessment's accuracy counts once toward Cognitive
  const catalogScores = {};
  for (const d of DOMAINS) {
    const vals = ASSESSMENT_DOMAINS.filter((a) => toCatalogDomain(a) === d).map((a) => scores[a]).filter((v) => v != null);
    if (d === "Cognitive" && assessmentAccuracy != null) vals.push(assessmentAccuracy);
    catalogScores[d] = vals.length ? rnd(mean(vals)) : null;
  }
  const known = Object.values(scores).filter((v) => v != null);
  const lagging = ASSESSMENT_DOMAINS.filter((d) => scores[d] != null && scores[d] < LAGGING_BELOW).sort((a, b) => scores[a] - scores[b]);
  const laggingCatalog = [...new Set(lagging.map(toCatalogDomain))];
  return { scores, catalogScores, lagging, laggingCatalog, overall: known.length ? rnd(mean(known)) : null, responses, motor: motorRows, strengths, practice, answered: responses.filter((r) => r.score != null).length };
}

// ----------------------------------------------------------------- the profile's therapy data
export function ensurePedia(p) {
  if (!p.pedia || typeof p.pedia !== "object") p.pedia = {};
  const x = p.pedia;
  x.lang ||= "en"; x.theme ||= "nature";
  x.sessions ||= []; x.skillState ||= {}; x.results ||= [];
  return x;
}
export const therapyDone = (p) => !!(p.pedia && p.pedia.sessions && p.pedia.sessions.length);
export const therapyReports = (p) => p.reports.filter((r) => r.type === "therapy");
export const latestTherapy = (p) => therapyReports(p).slice(-1)[0] || null;

// The starting level of each skill: lagging domains start gentle (1), on-track medium (2), strong ones at the challenge level (3).
export const startLevel = (score) => (score == null || score < LAGGING_BELOW ? 1 : score < 90 ? 2 : 3);

export function recordTherapy(p, data, date) {
  const x = ensurePedia(p), prev = latestTherapy(p);
  const s = scoreSession({ ...data, assessmentAccuracy: (p.reports.find((r) => r.id === "assessment") || {}).overallAccuracy ?? null });
  const n = x.sessions.length + 1;
  const report = {
    id: `therapy-${n}`, type: "therapy", n, date, name: p.name, age: p.age, groupId: p.groupId, band: p.band, condition: p.condition, lang: data.lang || "en",
    scores: s.scores, catalogScores: s.catalogScores, overall: s.overall, lagging: s.lagging, laggingCatalog: s.laggingCatalog,
    strengths: s.strengths, practice: s.practice, responses: s.responses, motor: s.motor, answered: s.answered, mood: data.mood || null,
    previous: prev ? { n: prev.n, date: prev.date, catalogScores: prev.catalogScores, overall: prev.overall } : null,
  };
  report.plan = dailyQueue({ ...p, reports: [...p.reports, report], pedia: x }, date).queue.map((q) => ({ gameId: q.gameId, title: q.game.name, domain: q.domain, level: q.level, weak: q.weak, why: q.why }));
  // start each skill at a level that suits its domain's result; skills that already have play history keep theirs
  for (const sk of Object.values(skillMap())) {
    if (!x.skillState[sk.id]) x.skillState[sk.id] = { difficulty: startLevel(s.catalogScores[sk.domain]), cs: 0, cf: 0 };
  }
  x.sessions.push({ id: report.id, date });
  p.reports.push(report);
  return report;
}
let _skills = null;
const skillMap = () => (_skills ||= Object.fromEntries(GAME_CATALOG.map((g) => { const s = getSkillById(g.skillId); return [s.id, s]; })));

// ----------------------------------------------------------------- adaptive difficulty
export const isSuccess = (r) => !!r.completed && r.score >= SUCCESS_SCORE && r.errors <= SUCCESS_MAX_ERRORS;
export function nextState(state, result) {
  let { difficulty, cs, cf } = state, up = false, down = false;
  const success = isSuccess(result);
  if (success) { cs += 1; cf = 0; if (cs >= UP_AFTER && difficulty < 3) { difficulty += 1; cs = 0; up = true; } }
  else { cf += 1; cs = 0; if (cf >= DOWN_AFTER && difficulty > 1) { difficulty -= 1; cf = 0; down = true; } }
  return { state: { difficulty, cs, cf }, success, up, down };
}
export const skillLevel = (p, skillId) => ((p.pedia && p.pedia.skillState && p.pedia.skillState[skillId]) || { difficulty: 1 }).difficulty;

// ----------------------------------------------------------------- the daily queue
// Weak domains first (their games, at the skill's current level), then the rest, then a harder step of the weak games, until
// there are 10 to 15 activities (12, or 14 when more than two domains are weak). Differences from PediaSense: the level of an
// activity is that skill's own adaptive level (not "Day 1 = level 1, Day 2 = level 2"), and a game result is what marks it done.
export function dailyQueue(p, today) {
  const x = p.pedia || {}, last = latestTherapy(p);
  const lagging = last ? last.lagging : [];
  const laggingCat = [...new Set(lagging.map(toCatalogDomain))];
  const target = Math.max(QUEUE_MIN, Math.min(QUEUE_MAX, 12 + (lagging.length > 2 ? 2 : 0)));
  const queue = [], seen = new Set();
  const add = (gameId, domain, weak, level, why) => {
    if (queue.length >= target) return;
    const game = getGameById(gameId); if (!game) return;
    const key = `${gameId}@${level}`; if (seen.has(key)) return; seen.add(key);
    queue.push({ gameId, key, game, domain: domain || game.category, weak: !!weak, level, levelLabel: (game.levels[level] || {}).label || `Level ${level}`,
      why: why || (weak ? `Helps ${domain || game.category} skills, which need practice.` : `Keeps ${domain || game.category} skills growing.`) });
  };
  const lv = (gameId) => skillLevel(p, getGameById(gameId).skillId);
  for (const d of lagging) for (const g of ASSESSMENT_DOMAIN_GAMES[d] || []) add(g, toCatalogDomain(d), true, lv(g), `Suggested because ${d} scored ${last.scores[d]}% in the session.`);
  const order = [...laggingCat, ...DOMAINS.filter((d) => !laggingCat.includes(d))];
  for (const d of order) for (const g of DOMAIN_GAMES[d] || []) add(g, d, laggingCat.includes(d), lv(g));
  for (const g of GAME_CATALOG) add(g.id, g.category, false, lv(g.id));
  for (const d of lagging) for (const g of ASSESSMENT_DOMAIN_GAMES[d] || []) add(g, toCatalogDomain(d), true, Math.min(3, lv(g) + 1), `A harder step for ${d} (scored ${last.scores[d]}%).`);
  const done = {};
  for (const r of x.results || []) if (r.date === today) done[r.gameId] = r;
  const inQueue = new Set(queue.map((q) => q.gameId));
  const extra = GAME_CATALOG.filter((g) => !inQueue.has(g.id)).map((g) => ({ gameId: g.id, game: g, domain: g.category, level: lv(g.id) }));
  return { queue, extra, done, lagging, laggingCat, target, doneCount: queue.filter((q) => done[q.gameId]).length };
}

// ----------------------------------------------------------------- recording a played game
export function recordGame(p, gameId, result, date) {
  const x = ensurePedia(p), game = getGameById(gameId);
  if (!game) throw new Error(`Unknown game ${gameId}.`);
  if (![result.score, result.errors, result.timeTakenSec].every(Number.isFinite)) throw new Error("A game result needs a score, errors and a time.");
  const skill = getSkillById(game.skillId), before = x.skillState[skill.id] || { difficulty: 1, cs: 0, cf: 0 };
  const level = before.difficulty, upd = nextState(before, result);
  x.skillState[skill.id] = upd.state;
  const score = Math.round(result.score);
  const note = upd.up ? `Moved up from level ${level} to ${upd.state.difficulty} after ${UP_AFTER} good rounds in a row.`
    : upd.down ? `Moved from level ${level} down to ${upd.state.difficulty} to rebuild confidence. It is not a penalty.`
    : upd.success ? `Went well at level ${level} (${score}%). ${UP_AFTER - upd.state.cs} more in a row moves up.` : `Practised at level ${level} (${score}%). It stays at this level for now.`;
  const rec = { id: `g-${x.results.length + 1}`, date, gameId, skillId: skill.id, domain: game.category, level, score, errors: result.errors, timeSec: result.timeTakenSec, hints: result.hintsUsed || 0, attempts: result.attempts || 0, success: upd.success, change: upd.up ? "up" : upd.down ? "down" : "same", note, after: upd.state.difficulty };
  x.results.push(rec);
  const day = [...p.reports].reverse().find((r) => r.type === "daily" && r.date === date);
  if (day) (day.skillPlay ||= []).push(rec);
  return rec;
}

// ----------------------------------------------------------------- progress (real data only)
const lastN = (xs, n) => xs.slice(-n);
export function domainProgress(p) {
  const x = p.pedia || { results: [] }, first = therapyReports(p)[0] || null, last = latestTherapy(p);
  return DOMAINS.map((d) => {
    const plays = (x.results || []).filter((r) => r.domain === d), scores = plays.map((r) => r.score);
    const base = first ? first.catalogScores[d] : null, latest = last ? last.catalogScores[d] : null;
    const recent = scores.length ? rnd(mean(lastN(scores, 5))) : null;
    const now = recent ?? latest;
    // a change is only claimed when there are at least 6 plays: the first 3 against the latest 3
    const trend = scores.length >= 6 ? rnd(mean(lastN(scores, 3)) - mean(scores.slice(0, 3))) : null;
    return { domain: d, baseline: base, latest, recent, now, plays: plays.length, trend, level: levelOfDomain(p, d), weak: !!last && last.laggingCatalog.includes(d) };
  });
}
export function levelOfDomain(p, d) {
  const sks = Object.values(skillMap()).filter((s) => s.domain === d && p.pedia && p.pedia.skillState && p.pedia.skillState[s.id]);
  return sks.length ? rnd(mean(sks.map((s) => p.pedia.skillState[s.id].difficulty))) : null;
}
export function improvement(p) {
  const rs = therapyReports(p);
  if (rs.length < 2) return null;
  const a = rs[0], b = rs[rs.length - 1];
  const rows = DOMAINS.filter((d) => a.catalogScores[d] != null && b.catalogScores[d] != null).map((d) => ({ domain: d, before: a.catalogScores[d], after: b.catalogScores[d], change: b.catalogScores[d] - a.catalogScores[d] }));
  return { from: a, to: b, rows };
}

export { getGameById, getGamesForSkill, getSkillById };
