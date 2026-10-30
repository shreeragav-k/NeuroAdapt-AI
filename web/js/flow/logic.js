// The workflow, with no screen code in it, so it can be tested on its own.
//
//   login -> assessment (5 games of the player's age group)
//         -> assessment report (Easy / Medium / Hard)
//         -> adaptive learning: one session a day = the 10 games of the current level
//         -> daily report (compared with earlier days) -> level kept, raised or lowered
//
// A profile is a plain object. Every function that changes a profile either
// throws when the workflow would be broken or leaves the profile consistent.

import { GROUPS, LEVELS, LEVEL_LABEL, RULES, BANDS, CATALOG, DOMAINS, domainOf } from "./data.js";

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
  };
  p.sessions.push(session);
  p.level = decision.newLevel;
  p.current = null;
  p.reports.push(report);
  return report;
}

// ----------------------------------------------------------------- dates
export function dayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export const shiftDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
