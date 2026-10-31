// The workflow, with no screen code in it, so it can be tested on its own.
//
//   login -> assessment (5 games of the player's age group)
//         -> assessment report (Easy / Medium / Hard)
//         -> adaptive learning: one session a day = the 10 games of the current level
//         -> daily report (compared with earlier days) -> level kept, raised or lowered
//
// A profile is a plain object. Every function that changes a profile either
// throws when the workflow would be broken or leaves the profile consistent.

import { GROUPS, LEVELS, LEVEL_LABEL, RULES, BANDS, CATALOG, DOMAINS, domainOf, SUGGESTIONS, suggestionById, TASK_INFO } from "./data.js";

// ------------------------------------------------------------------- groups
export function groupForAge(age) {
  if (!Number.isInteger(age)) return null;
  return GROUPS.find((g) => age >= g.min && age <= g.max) || null;
}
export const groupById = (id) => GROUPS.find((g) => g.id === id) || null;

// ---------------------------------------------------------------- accounts
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normEmail = (e) => String(e ?? "").trim().toLowerCase();
export const PASSWORD_MIN = 8;

function checkDetails({ name, age, condition }) {
  const n = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!n) return { error: "Please enter a name." };
  if (n.length > 40) return { error: "Please use a name of 40 characters or fewer." };
  const raw = String(age ?? "").trim();
  if (!/^\d+$/.test(raw)) return { error: "Please enter the age as a whole number." };
  const a = Number(raw);
  const group = groupForAge(a);
  if (!group) return { error: `Ages ${GROUPS[0].min} to ${GROUPS[GROUPS.length - 1].max} are supported.` };
  const c = String(condition ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return { name: n, age: a, group, condition: c };
}

// Create-account form. The age group is fixed from this age for the life of the account.
export function validateSignup({ name, age, condition, email, password, confirm }) {
  const d = checkDetails({ name, age, condition });
  if (d.error) return d;
  const em = normEmail(email);
  if (!EMAIL.test(em) || em.length > 120) return { error: "Please enter a valid email address." };
  const pw = String(password ?? "");
  if (pw.length < PASSWORD_MIN) return { error: `Please choose a password of at least ${PASSWORD_MIN} characters.` };
  if (pw.length > 128) return { error: "Please use a password of 128 characters or fewer." };
  if (pw !== String(confirm ?? "")) return { error: "The two passwords do not match." };
  return { ...d, email: em, password: pw };
}

export function validateSignin({ email, password }) {
  const em = normEmail(email);
  if (!EMAIL.test(em)) return { error: "Please enter the email address of your account." };
  if (!String(password ?? "")) return { error: "Please enter your password." };
  return { email: em, password: String(password) };
}

// ------------------------------------------------------------------ catalogue
export const gameById = (id) => CATALOG.find((g) => g.id === id) || null;
export const testGames = (groupId) => CATALOG.filter((g) => g.group === groupId && g.phase === "test");
export const levelGames = (groupId, level) => CATALOG.filter((g) => g.group === groupId && g.phase === level);

// Every game handed to a player passes through this check.
export function assertInGroup(game, groupId) {
  if (!game || game.group !== groupId) throw new Error(`Game ${game ? game.id : "?"} does not belong to age group ${groupId}.`);
  return game;
}

// ---------------------------------------------------------------- measuring
export const pct = (correct, total) => (total > 0 ? Math.round((100 * correct) / total) : 0);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const r2 = (x) => Math.round(x * 100) / 100;

// Staircase used in the assessment: up one step after a right answer, down one after a wrong one.
export const nextStep = (step, correct) => Math.max(RULES.minStep, Math.min(RULES.maxStep, step + (correct ? 1 : -1)));

// Step for the next assessment round, given the rounds already played.
export const assessmentStep = (trials) => (trials.length ? nextStep(trials[trials.length - 1].step, trials[trials.length - 1].correct) : RULES.startStep);

// Steps visited by a session game: the level's band, low and high alternating.
export const sessionStep = (level, i) => BANDS[level][i % 2];

// Ability of one assessment game = mean of the steps played plus the step the staircase would play next.
export function gameAbility(trials) {
  if (!trials.length) return RULES.startStep;
  const last = trials[trials.length - 1];
  const steps = trials.map((t) => t.step).concat(nextStep(last.step, last.correct));
  return r2(mean(steps));
}

export function levelFromAbility(ability) {
  if (ability < RULES.easyBelow) return "easy";
  if (ability >= RULES.hardFrom) return "hard";
  return "medium";
}

export function summarizeGame(game, trials) {
  const correct = trials.filter((t) => t.correct).length;
  const rts = trials.map((t) => t.rt).filter((x) => Number.isFinite(x));
  return {
    gameId: game.id, title: game.title, skill: game.skill,
    rounds: trials.length, correct, accuracy: pct(correct, trials.length),
    medianRt: rts.length ? Math.round(median(rts)) : null,
  };
}

// Average accuracy per cognitive skill area, from report rows ({ skill, accuracy }).
export function domainScores(rows) {
  const by = {};
  for (const r of rows) {
    const d = domainOf(r.skill);
    if (!d) throw new Error(`Skill "${r.skill}" has no skill area.`);
    (by[d] ||= []).push(r.accuracy);
  }
  return Object.fromEntries(DOMAINS.filter((d) => by[d]).map((d) => [d, Math.round(mean(by[d]))]));
}

// The skill areas to build next: the lowest scores in the latest report (the assessment until a daily report exists).
export function focusAreas(p, n = 2) {
  const daily = [...p.reports].reverse().find((r) => r.type === "daily");
  const assessment = p.reports.find((r) => r.id === "assessment");
  const scores = daily ? Object.fromEntries((daily.skills || []).filter((k) => k.today != null).map((k) => [k.area, k.today])) : (assessment && assessment.domains) || {};
  return Object.entries(scores).filter(([, v]) => v < RULES.promoteAt).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, n).map(([area, score]) => ({ area, score }));
}

// ------------------------------------------------------------ suggested games
// A suggested game is an optional extra beside the 10 games of the level. Both are always offered once the
// assessment is done; the reason on the card says why this one fits the player best:
//   - one of the player's lowest skill areas (latest report, below the promotion line) is one the game trains, or
//   - the health condition they gave at sign-up contains a word that points to it, or
//   - neither: it is offered as a general extra, and the ones that fit come first.
// It never changes the level: its score is kept and shown in the report, and that is all.
export const suggestionGame = (def, groupId, level) => ({
  id: `${groupId}-x-${def.id}`, group: groupId, phase: "suggested", order: 0, difficulty: null,
  engine: def.engine, content: def.content, mode: `${groupId}-${level}`, title: def.title, skill: def.skill, how: def.how,
  task: TASK_INFO[def.engine][0], trains: TASK_INFO[def.engine][1],
});
const listWords = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export function suggestionsFor(p) {
  if (stageOf(p) !== "learning") return [];
  const level = p.level || "easy", weak = focusAreas(p, 3).map((f) => f.area), out = [];
  for (const def of SUGGESTIONS) {
    const hits = def.areas.filter((a) => weak.includes(a)), byCondition = !!(p.condition && def.condition.test(p.condition));
    const why = [hits.length ? `${listWords(hits)} ${hits.length === 1 ? "is" : "are"} among your lowest skill areas` : "", byCondition ? "of the condition you told us about" : ""].filter(Boolean);
    const reason = hits.length && byCondition ? `${why[0]}, and it also fits the condition you told us about.` : hits.length ? `${why[0]}, and this game trains ${hits.length === 1 ? "it" : "them"}.` : byCondition ? "It is suggested because of the condition you told us about." : `An extra to try. It trains ${listWords(def.areas.map((a) => a.toLowerCase()))}.`;
    out.push({ id: def.id, title: def.title, skill: def.skill, reason, byArea: hits, byCondition, game: suggestionGame(def, p.groupId, level) });
  }
  return out.sort((a, b) => (b.byArea.length + (b.byCondition ? 1 : 0)) - (a.byArea.length + (a.byCondition ? 1 : 0)));
}

// Keep the result of a suggested game. It goes in the player's list and in that day's daily report (if there is one).
export function recordExtra(p, id, trials, date) {
  const def = suggestionById(id);
  if (!def) throw new Error(`Unknown suggested game ${id}.`);
  if (!trials.length) throw new Error("A game needs at least one round.");
  const level = p.level || "easy", row = summarizeGame(suggestionGame(def, p.groupId, level), trials);
  const rec = { id: `x-${(p.extras || []).length + 1}`, date, gameId: def.id, title: def.title, skill: def.skill, level, rounds: row.rounds, correct: row.correct, accuracy: row.accuracy };
  (p.extras ||= []).push(rec);
  const day = [...p.reports].reverse().find((r) => r.type === "daily" && r.date === date);
  if (day) (day.extras ||= []).push(rec);
  return rec;
}

// --------------------------------------------------------------- the profile
// One profile per account. `id` is the account id (Firebase uid, or a local id).
export function newProfile({ name, age, group, condition, email = "" }, id, now = new Date().toISOString()) {
  return {
    key: id, email, name, age, groupId: group.id, condition,
    created: now,
    test: { done: [], completed: false },
    assessmentViewed: false,
    level: null,
    sessions: [],
    current: null,
    reports: [],
    extras: [],            // suggested games played: { id, date, gameId, title, skill, level, rounds, correct, accuracy }
  };
}

export function stageOf(p) {
  if (!p.test.completed) return "test";
  if (!p.assessmentViewed) return "assessment";
  return "learning";
}

export function expectedTestGame(p) {
  if (stageOf(p) !== "test") return null;
  return assertInGroup(testGames(p.groupId)[p.test.done.length] || null, p.groupId);
}

export function recordTestGame(p, gameId, trials, date) {
  const g = expectedTestGame(p);
  if (!g) throw new Error("The assessment is not in progress.");
  if (g.id !== gameId) throw new Error(`Expected assessment game ${g.id}, got ${gameId}.`);
  if (trials.length !== RULES.testRounds) throw new Error(`An assessment game has ${RULES.testRounds} rounds.`);
  p.test.done.push({ gameId, trials });
  return p.test.done.length === RULES.testGames ? finishTest(p, date) : null;
}

// ------------------------------------------------------------ the assessment
function finishTest(p, date) {
  const rows = p.test.done.map(({ gameId, trials }) => {
    const g = assertInGroup(gameById(gameId), p.groupId);
    return { ...summarizeGame(g, trials), ability: gameAbility(trials) };
  });
  const ability = r2(mean(rows.map((r) => r.ability)));
  const overall = Math.round(mean(rows.map((r) => r.accuracy)));
  const level = levelFromAbility(ability);
  const report = {
    id: "assessment", type: "assessment", date,
    name: p.name, age: p.age, groupId: p.groupId, condition: p.condition,
    games: rows, overallAccuracy: overall, ability, level,
    domains: domainScores(rows),
    plan: levelGames(p.groupId, level).map(({ id, title, skill }) => ({ id, title, skill })),
  };
  p.test.completed = true;
  p.level = level;
  p.reports.push(report);
  return report;
}

export const markAssessmentViewed = (p) => { if (stageOf(p) === "assessment") p.assessmentViewed = true; };

// ------------------------------------------------------------- daily sessions
export const sessionState = (p, today) => {
  if (stageOf(p) !== "learning") return "locked";
  if (p.current) return "resume";
  const last = p.sessions[p.sessions.length - 1];
  return last && last.date === today ? "done_today" : "ready";
};

export function startSession(p, today) {
  const s = sessionState(p, today);
  if (s === "resume") return p.current;
  if (s !== "ready") throw new Error(s === "done_today" ? "Today's session is already complete." : "Finish the assessment first.");
  p.current = { date: today, level: p.level, done: [] };
  return p.current;
}

export function expectedSessionGame(p) {
  if (!p.current) return null;
  return assertInGroup(levelGames(p.groupId, p.current.level)[p.current.done.length] || null, p.groupId);
}

export function recordSessionGame(p, gameId, trials) {
  const g = expectedSessionGame(p);
  if (!g) throw new Error("No session is in progress.");
  if (g.id !== gameId) throw new Error(`Expected session game ${g.id}, got ${gameId}.`);
  if (!trials.length) throw new Error("A game needs at least one round.");
  p.current.done.push({ gameId, trials });
  return p.current.done.length === RULES.sessionGames ? finishSession(p) : null;
}

// What happens to the level after a session. `previous` = accuracy of the last session played at this level (or null).
export function decide(level, accuracy, previous) {
  const i = LEVELS.indexOf(level);
  const steady = previous == null || accuracy >= previous - RULES.dropTolerance;
  if (accuracy >= RULES.promoteAt && steady) {
    if (i === LEVELS.length - 1) return { action: "stay", newLevel: level, reason: `Accuracy of ${accuracy}% is at or above ${RULES.promoteAt}% and Hard is the top level, so the next session stays at Hard.` };
    const up = LEVELS[i + 1];
    const cmp = previous == null ? "this was the first session at this level" : `it is not lower than the last ${LEVEL_LABEL[level]} session (${previous}%)`;
    return { action: "promote", newLevel: up, reason: `Accuracy of ${accuracy}% is at or above ${RULES.promoteAt}% and ${cmp}, so the next session moves up to ${LEVEL_LABEL[up]}.` };
  }
  if (accuracy < RULES.demoteBelow && i > 0) {
    const down = LEVELS[i - 1];
    return { action: "demote", newLevel: down, reason: `Accuracy of ${accuracy}% is below ${RULES.demoteBelow}%, so the next session moves back to ${LEVEL_LABEL[down]} to rebuild confidence.` };
  }
  if (accuracy >= RULES.promoteAt) {
    return { action: "stay", newLevel: level, reason: `Accuracy of ${accuracy}% is high, but it fell by more than ${RULES.dropTolerance} points from the last ${LEVEL_LABEL[level]} session (${previous}%). The same level is repeated to confirm the result.` };
  }
  if (accuracy < RULES.demoteBelow) {
    return { action: "stay", newLevel: level, reason: `Accuracy of ${accuracy}% is below ${RULES.demoteBelow}%, but Easy is the gentlest level, so the next session stays at Easy.` };
  }
  return { action: "stay", newLevel: level, reason: `Accuracy of ${accuracy}% is between ${RULES.demoteBelow}% and ${RULES.promoteAt - 1}%, so the next session stays at ${LEVEL_LABEL[level]}. ${RULES.promoteAt}% or more is needed to move up.` };
}

export const trendOf = (diff) => (diff == null ? "first" : diff >= 3 ? "improved" : diff <= -3 ? "declined" : "steady");

function finishSession(p) {
  const cur = p.current;
  const n = p.sessions.length + 1;
  const rows = cur.done.map(({ gameId, trials }) => summarizeGame(assertInGroup(gameById(gameId), p.groupId), trials));
  const accuracy = Math.round(mean(rows.map((r) => r.accuracy)));

  const prevAny = p.sessions[p.sessions.length - 1] || null;
  const prevSame = [...p.sessions].reverse().find((s) => s.level === cur.level) || null;
  const prevByGame = new Map((prevSame ? prevSame.games : []).map((g) => [g.gameId, g.accuracy]));
  const games = rows.map((r) => {
    const before = prevByGame.has(r.gameId) ? prevByGame.get(r.gameId) : null;
    return { ...r, previous: before, change: before == null ? null : r.accuracy - before };
  });

  const decision = decide(cur.level, accuracy, prevSame ? prevSame.accuracy : null);
  const diff = prevAny ? accuracy - prevAny.accuracy : null;

  // cognitive skill areas: assessment (before), previous session, today
  const assessment = p.reports.find((r) => r.id === "assessment");
  const prevDaily = [...p.reports].reverse().find((r) => r.type === "daily") || null;
  const today = domainScores(rows), before = assessment ? assessment.domains || domainScores(assessment.games) : {}, last = prevDaily ? domainScores(prevDaily.games) : {};
  const skills = DOMAINS.filter((d) => today[d] != null || before[d] != null || last[d] != null)
    .map((d) => ({ area: d, assessment: before[d] ?? null, previous: last[d] ?? null, today: today[d] ?? null }));

  const session = {
    n, date: cur.date, level: cur.level, accuracy,
    games: rows.map((r) => ({ gameId: r.gameId, accuracy: r.accuracy })),
    action: decision.action, newLevel: decision.newLevel,
  };
  const report = {
    id: `day-${n}`, type: "daily", day: n, date: cur.date,
    name: p.name, age: p.age, groupId: p.groupId, condition: p.condition,
    level: cur.level, games, accuracy,
    previous: prevAny ? { day: prevAny.n, date: prevAny.date, level: prevAny.level, accuracy: prevAny.accuracy } : null,
    previousSameLevel: prevSame ? { day: prevSame.n, accuracy: prevSame.accuracy } : null,
    difference: diff, trend: trendOf(diff),
    decision,
    baseline: assessment ? { accuracy: assessment.overallAccuracy, date: assessment.date } : null,
    skills,
    history: [...p.sessions, session].map((s) => ({ day: s.n, date: s.date, level: s.level, accuracy: s.accuracy })),
    nextLevel: decision.newLevel,
    nextPlan: levelGames(p.groupId, decision.newLevel).map(({ id, title, skill }) => ({ id, title, skill })),
    extras: (p.extras || []).filter((e) => e.date === cur.date),       // suggested games already played today
  };
  report.progress = progressFrom(assessment, [...p.reports.filter((r) => r.type === "daily"), report], decision.newLevel);
  p.sessions.push(session);
  p.level = decision.newLevel;
  p.current = null;
  p.reports.push(report);
  return report;
}

// ------------------------------------------------------- is it working?
// Change since the assessment, worked out from the saved reports only. Three signals:
//   - the level (has the player moved up since the assessment?)
//   - the same level over time (first against latest session at the level played most recently twice or more:
//     this compares like with like, because the games and their difficulty are the same)
//   - each skill area, assessment against the latest day
// A change of 5 points or more counts as a real move; anything smaller is treated as steady.
export const MEANINGFUL = 5;
export function progressFrom(assessment, dailies, level) {
  if (!assessment || !dailies.length) return null;
  const last = dailies[dailies.length - 1];
  const change = last.accuracy - assessment.overallAccuracy;
  const levelsGained = LEVELS.indexOf(level) - LEVELS.indexOf(assessment.level);

  let sameLevel = null;
  for (const lv of [...LEVELS].reverse()) {
    const at = dailies.filter((d) => d.level === lv);
    if (at.length >= 2) { sameLevel = { level: lv, sessions: at.length, first: at[0].accuracy, latest: at[at.length - 1].accuracy, change: at[at.length - 1].accuracy - at[0].accuracy }; break; }
  }
  const start = assessment.domains || {}, now = Object.fromEntries((last.skills || []).filter((k) => k.today != null).map((k) => [k.area, k.today]));
  const areas = DOMAINS.filter((d) => start[d] != null && now[d] != null).map((d) => ({ area: d, start: start[d], now: now[d], change: now[d] - start[d] }));
  const better = areas.filter((a) => a.change >= MEANINGFUL), worse = areas.filter((a) => a.change <= -MEANINGFUL);
  const best = [...areas].sort((a, b) => b.change - a.change)[0] || null;

  const up = (levelsGained > 0) + (sameLevel && sameLevel.change >= MEANINGFUL ? 1 : 0) + (better.length >= 2 || (better.length === 1 && areas.length <= 2) ? 1 : 0);
  const down = (levelsGained < 0) + (sameLevel && sameLevel.change <= -MEANINGFUL ? 1 : 0) + (worse.length >= 2 ? 1 : 0);
  let verdict = "steady";
  if (dailies.length < 2) verdict = "early";
  else if (up && !down) verdict = "improving";
  else if (up && down) verdict = "mixed";
  else if (down) verdict = "slipping";
  return {
    days: dailies.length, startAccuracy: assessment.overallAccuracy, nowAccuracy: last.accuracy, change,
    startLevel: assessment.level, nowLevel: level, levelsGained, sameLevel, areas, better: better.length, worse: worse.length,
    best: best && best.change > 0 ? best : null, verdict,
  };
}
export const progressSummary = (p) => progressFrom(p.reports.find((r) => r.id === "assessment"), p.reports.filter((r) => r.type === "daily"), p.level);

// ----------------------------------------------------------------- dates
export function dayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export const shiftDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
