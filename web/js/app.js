// Screens and routing. The rules themselves live in flow/logic.js.
//
//   login -> test -> assessment report -> plan <-> session -> daily report
//
// A player can only be on the screen that matches their stage; anything else
// redirects (see `allowed`).
import * as S from "./flow/storage.js";
import { GROUPS, LEVEL_LABEL, RULES } from "./flow/data.js";
import * as L from "./flow/logic.js";
import { playGame } from "./flow/play.js";
import * as Cloud from "./flow/cloud.js";
import { createAccount, signInAccount } from "./flow/auth.js";
import { reportHtml, reportTitle, reportSummary, esc } from "./flow/report.js";

const $main = document.getElementById("main");
const $nav = document.getElementById("nav");
const $foot = document.getElementById("foot");
const $ = (sel, root = document) => root.querySelector(sel);
let stopGame = null;

const nav = (h) => { if (location.hash === h) route(); else location.hash = h; };
const setMain = (html) => { $main.innerHTML = html; window.scrollTo({ top: 0 }); };
const groupOf = (p) => GROUPS.find((g) => g.id === p.groupId);

// ------------------------------------------------------------------ chrome
function renderNav(p, stage) {
  const links = stage === "learning" ? `<a href="#/plan">Plan</a><a href="#/reports">Reports</a>` : "";
  $nav.innerHTML = `<div class="wrap">
    <a class="brand" ${p ? 'href="#/"' : ""} aria-label="Halcyon">Halcyon <i>play studio</i></a>
    <nav aria-label="Main">${links}</nav>
    <div style="display:flex;align-items:center;gap:1rem">${p ? `${Cloud.enabled ? `<span class="muted small" id="cloudstat" role="status"></span>` : ""}<span class="who">${esc(p.name)} · ${esc(groupOf(p).label)}</span><button class="btn small quiet" id="signout" type="button">Sign out</button>` : ""}</div></div>`;
  const so = $("#signout"); if (so) so.onclick = async () => { await Cloud.signOut(); S.signOut(); mode = "signin"; nav("#/login"); };
  paintCloud();
}
$foot.innerHTML = `<div class="wrap"><p class="legal" style="margin-top:0;border-top:0;padding-top:0">Halcyon is a prototype for engagement and practice. Reports describe performance in these games only. They are not a medical assessment and make no diagnosis. Everything stays in this browser.</p></div>`;

// ------------------------------------------------------------ cloud (optional)
const CLOUD_TEXT = { saving: "Saving…", saved: "Saved to the cloud", ready: "Cloud connected", error: "Cloud unreachable. Saved on this device." };
let cloudState = "";
function paintCloud() { const el = $("#cloudstat"); if (el) el.textContent = CLOUD_TEXT[cloudState] || ""; }
if (Cloud.enabled) {
  S.hooks.afterSave = (p) => Cloud.push(p);
  Cloud.onStatus((st) => { cloudState = st; paintCloud(); });
}

// ------------------------------------------------------------------- router
const canonical = (p) => (!p ? "#/login" : { test: "#/test", assessment: "#/assessment", learning: "#/plan" }[L.stageOf(p)]);
function allowed(name, p) {
  if (!p) return name === "login";
  const stage = L.stageOf(p);
  if (stage === "test") return name === "test";
  if (stage === "assessment") return name === "assessment";
  return ["plan", "session", "reports", "report"].includes(name);
}

function route() {
  stopGame && stopGame(); stopGame = null;
  const [, name = "login", arg] = (location.hash.slice(1) || "/login").split("/");
  const p = S.active();
  if (!allowed(name, p)) { const to = canonical(p); if (location.hash !== to) { location.hash = to; return; } }
  const stage = p ? L.stageOf(p) : null;
  renderNav(p, stage);
  const view = { login: viewLogin, test: viewTest, assessment: viewAssessment, plan: viewPlan, session: viewSession, reports: viewReports, report: viewReport }[name];
  if (!view) return nav(canonical(p));
  view(p, arg);
}

// -------------------------------------------------------------------- login
let mode = "signin";
function viewLogin() {
  const create = mode === "create";
  setMain(`<div class="page"><div class="wrap onb">
    <aside><img src="/img/hero.jpg" alt="" width="640" height="800"><p class="muted small">${Cloud.enabled ? "Your account and every result are saved securely in the cloud." : "Accounts are kept in this browser on this computer."} Your age decides which set of games you will see.</p></aside>
    <div class="reveal"><header><div class="eyebrow">${create ? "Create an account" : "Welcome back"}</div><h1>${create ? "Let's set you up." : "Sign in to play."}</h1></header>
    <div class="tabs" role="tablist"><button type="button" role="tab" id="tab-in" aria-selected="${!create}">Sign in</button><button type="button" role="tab" id="tab-new" aria-selected="${create}">Create account</button></div>
    <form id="login" novalidate class="panel" style="display:grid;gap:.4rem">
      ${create ? `
      <fieldset><label class="lbl" for="name">Name</label><input type="text" id="name" maxlength="40" autocomplete="name" required></fieldset>
      <div class="row"><fieldset><label class="lbl" for="age">Age</label><p class="hint">In years, 1 to 60.</p><input type="text" id="age" inputmode="numeric" maxlength="2" autocomplete="off" required style="max-width:9rem"><p class="small" id="agegroup" style="color:var(--teal-deep);min-height:1.5em;margin:.6rem 0 0"></p></fieldset>
      <fieldset><label class="lbl" for="cond">Health condition <span class="muted" style="font-family:var(--sans);font-size:1rem">(if applicable)</span></label><p class="hint">Optional. Shown on the reports.</p><input type="text" id="cond" maxlength="80" autocomplete="off" placeholder="Leave empty if not applicable"></fieldset></div>` : ""}
      <fieldset><label class="lbl" for="email">Email</label><input type="text" id="email" inputmode="email" autocomplete="email" maxlength="120" required></fieldset>
      <fieldset><label class="lbl" for="pw">Password</label>${create ? `<p class="hint">At least ${L.PASSWORD_MIN} characters.</p>` : ""}<input type="password" id="pw" autocomplete="${create ? "new-password" : "current-password"}" maxlength="128" required></fieldset>
      ${create ? `<fieldset><label class="lbl" for="pw2">Confirm password</label><input type="password" id="pw2" autocomplete="new-password" maxlength="128" required></fieldset>` : ""}
      <p class="small" id="err" role="alert" style="color:#8d3b2b;min-height:1.4em;margin:0"></p>
      <div><button class="btn" type="submit">${create ? "Create account" : "Sign in"}</button></div>
    </form></div></div></div>`);
  $("#tab-in").onclick = () => { mode = "signin"; viewLogin(); };
  $("#tab-new").onclick = () => { mode = "create"; viewLogin(); };
  const age = $("#age");
  if (age) age.oninput = () => {
    const g = L.groupForAge(/^\d+$/.test(age.value.trim()) ? Number(age.value) : NaN);
    $("#agegroup").textContent = g ? `Age group: ${g.label}` : "";
  };
  $("#login").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#login button[type=submit]"), label = btn.textContent;
    btn.disabled = true; btn.textContent = create ? "Creating…" : "Signing in…"; $("#err").textContent = "";
    const val = (id) => ($(id) ? $(id).value : "");
    const r = create
      ? await createAccount(S.state, { name: val("#name"), age: val("#age"), condition: val("#cond"), email: val("#email"), password: val("#pw"), confirm: val("#pw2") }, new Date().toISOString())
      : await signInAccount(S.state, { email: val("#email"), password: val("#pw") });
    if (r.error) { $("#err").textContent = r.error; btn.disabled = false; btn.textContent = label; return; }
    S.state.activeKey = r.profile.key; S.save(); mode = "signin";
    if (create && Cloud.enabled && !(await Cloud.flush())) alert("Your account was created, but saving your details to the cloud did not work yet. They will be saved again with your next change.");
    nav(canonical(r.profile));
  };
}

// ---------------------------------------------------- generic "play a set"
// Plays `games` one after another from `cfg.index()`; records each with `cfg.record`.
function runSet(p, cfg) {
  const games = cfg.games, tier = groupOf(p).tier;
  const step = () => {
    const i = cfg.index(), g = games[i];
    L.assertInGroup(g, p.groupId);
    setMain(`<div class="page"><div class="wrap narrow reveal">
      <div class="eyebrow">${esc(cfg.label)} · Game ${i + 1} of ${games.length}</div>
      <h1>${esc(g.title)}</h1><p class="lede">${esc(g.how)}</p>
      <p class="muted small">Skill: ${esc(g.skill)}${tier === 0 ? ". A grown-up can read the instructions aloud and help with tapping." : ""}</p>
      <div class="steps" aria-hidden="true">${games.map((_, k) => `<i class="${k < i ? "on" : ""}"></i>`).join("")}</div>
      <button class="btn" id="go" type="button">Start game</button></div></div>`);
    $("#go").onclick = () => play(i, g);
  };
  const play = (i, g) => {
    setMain(`<div class="page"><div class="wrap narrow"><div class="eyebrow">${esc(cfg.label)} · Game ${i + 1} of ${games.length}</div><h1 class="game-title">${esc(g.title)}</h1><div id="host"></div></div></div>`);
    const handle = playGame({
      host: $("#host"), game: g, tier, rounds: { isTest: cfg.isTest, defaults: { test: RULES.testRounds, session: RULES.sessionRounds } },
      stepFor: cfg.stepFor,
      onDone: (trials) => {
        stopGame = null;
        let report = null;
        try { report = cfg.record(g, trials); S.save(); } catch (err) { setMain(`<div class="page"><div class="wrap narrow"><div class="callout warm">Something went wrong saving this game: ${esc(err.message)}</div></div></div>`); return; }
        finished(i, g, trials, report);
      },
    });
    stopGame = handle.stop;
  };
  const finished = (i, g, trials, report) => {
    const last = i + 1 === games.length, acc = L.pct(trials.filter((t) => t.correct).length, trials.length);
    setMain(`<div class="page"><div class="wrap narrow reveal">
      <div class="eyebrow">${esc(cfg.label)} · Game ${i + 1} of ${games.length} complete</div>
      <h1>${esc(g.title)}</h1>
      ${cfg.showScore ? `<p class="lede">You got ${trials.filter((t) => t.correct).length} of ${trials.length} right (${acc}%).</p>` : `<p class="lede">Well done. That game is finished.</p>`}
      <div class="steps" aria-hidden="true">${games.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
      <button class="btn" id="nx" type="button">${last ? "See the report" : "Next game"}</button></div></div>`);
    $("#nx").onclick = () => (last ? nav(cfg.afterLast(report)) : step());
  };
  step();
}

// --------------------------------------------------------------- assessment
function viewTest(p) {
  const games = L.testGames(p.groupId), done = p.test.done.length;
  const begin = () => runSet(p, {
    games, label: "Assessment", isTest: true, showScore: false,
    index: () => p.test.done.length,
    stepFor: (trials) => L.assessmentStep(trials),
    record: (g, trials) => L.recordTestGame(p, g.id, trials, S.today()),
    afterLast: () => "#/assessment",
  });
  if (done > 0) return begin();
  setMain(`<div class="page"><div class="wrap narrow reveal">
    <div class="eyebrow">Step 1 · Assessment</div><h1>Hello, ${esc(p.name)}.</h1>
    <p class="lede">First, five short games for ${esc(groupOf(p).label.toLowerCase())}. They start in the middle and get a little easier or harder depending on how you do, so there is nothing to pass or fail. Afterwards you will get a report and a plan.</p>
    <ol class="plan">${games.map((g) => `<li><b>${esc(g.title)}</b><span>${esc(g.skill)}</span></li>`).join("")}</ol>
    <button class="btn" id="b" type="button">Begin the assessment</button></div></div>`);
  $("#b").onclick = begin;
}

function viewAssessment(p) {
  const r = p.reports.find((x) => x.id === "assessment");
  setMain(`<div class="page"><div class="wrap">${reportHtml(r)}
    <div class="nav-row no-print"><button class="btn quiet" type="button" onclick="window.print()">Print this report</button><button class="btn" id="plan" type="button">Continue to adaptive learning</button></div></div></div>`);
  $("#plan").onclick = () => { L.markAssessmentViewed(p); S.save(); nav("#/plan"); };
}

// --------------------------------------------------------------------- plan
function viewPlan(p) {
  const today = S.today(), st = L.sessionState(p, today), level = p.current ? p.current.level : p.level;
  const games = L.levelGames(p.groupId, level), doneIds = new Set(p.current ? p.current.done.map((d) => d.gameId) : []);
  const day = p.sessions.length + (p.current || st === "ready" ? 1 : 0);
  const last = p.sessions[p.sessions.length - 1];
  const action = st === "ready" ? `<button class="btn" id="start" type="button">Start today's session (Day ${day})</button>`
    : st === "resume" ? `<button class="btn" id="start" type="button">Resume today's session (game ${p.current.done.length + 1} of ${games.length})</button>`
    : `<div class="callout">Today's session is complete. The next one opens tomorrow, with the ${LEVEL_LABEL[p.level]} games.</div>
       <p class="small muted" style="margin-top:1rem">Testing aid: <button class="linkbtn" id="skip" type="button">pretend it is tomorrow</button></p>`;
  setMain(`<div class="page"><div class="wrap">
    <header><div class="eyebrow">Adaptive learning</div><h1>${esc(p.name)}, your plan.</h1>
    <p class="lede">Current level: <b>${LEVEL_LABEL[level]}</b>. One session a day, made of these ${games.length} games. After each day a report compares your accuracy with earlier days and decides whether the level stays or changes.</p></header>
    <div class="two"><section class="panel"><h3 style="font-size:1.7rem;margin-bottom:1rem">The ${LEVEL_LABEL[level]} games</h3>
      <ol class="plan">${games.map((g) => `<li class="${doneIds.has(g.id) ? "done" : ""}"><b>${esc(g.title)}</b><span>${esc(g.skill)}${doneIds.has(g.id) ? " · done today" : ""}</span></li>`).join("")}</ol></section>
    <section class="panel" style="align-self:start"><h3 style="font-size:1.7rem;margin-bottom:1rem">Today</h3>
      <p class="muted">${last ? `Last session: Day ${last.n}, ${LEVEL_LABEL[last.level]}, ${last.accuracy}%.` : "No sessions yet. This will be Day 1."}</p>${action}
      ${p.sessions.length ? `<p style="margin-top:1.4rem"><a href="#/reports">All reports</a></p>` : ""}</section></div></div></div>`);
  const b = $("#start"); if (b) b.onclick = () => nav("#/session");
  const k = $("#skip"); if (k) k.onclick = () => { S.skipToNextDay(); route(); };
}

// ------------------------------------------------------------------ session
function viewSession(p) {
  const today = S.today(), st = L.sessionState(p, today);
  if (st !== "ready" && st !== "resume") return nav("#/plan");
  if (st === "ready") { L.startSession(p, today); S.save(); }
  const cur = p.current, games = L.levelGames(p.groupId, cur.level), day = p.sessions.length + 1;
  runSet(p, {
    games, label: `Day ${day} · ${LEVEL_LABEL[cur.level]}`, isTest: false, showScore: true,
    index: () => p.current.done.length,
    stepFor: (trials) => L.sessionStep(cur.level, trials.length),
    record: (g, trials) => L.recordSessionGame(p, g.id, trials),
    afterLast: (report) => `#/report/${report.id}`,
  });
}

// ------------------------------------------------------------------ reports
function viewReports(p) {
  const rs = [...p.reports].reverse();
  setMain(`<div class="page"><div class="wrap"><header><div class="eyebrow">Reports</div><h1>${esc(p.name)}'s reports.</h1></header>
    <div class="panel"><div class="tablewrap"><table><thead><tr><th>Report</th><th>Date</th><th>Result</th><th></th></tr></thead><tbody>
    ${rs.map((r) => `<tr><td><b>${esc(reportTitle(r))}</b></td><td>${esc(r.date)}</td><td>${esc(reportSummary(r))}</td><td><a class="btn small quiet" href="#/report/${esc(r.id)}">Open</a></td></tr>`).join("")}
    </tbody></table></div></div></div></div>`);
}

function viewReport(p, id) {
  const r = p.reports.find((x) => x.id === id);
  if (!r) return nav("#/reports");
  setMain(`<div class="page"><div class="wrap">${reportHtml(r)}
    <div class="nav-row no-print"><a class="btn quiet" href="#/reports">All reports</a><span style="display:flex;gap:1rem;flex-wrap:wrap"><button class="btn quiet" type="button" onclick="window.print()">Print this report</button><a class="btn" href="#/plan">Back to the plan</a></span></div></div></div>`);
}

// -------------------------------------------------------------------- boot
// With Firebase on, trust the cloud about who is still signed in from an earlier visit.
async function restoreSession() {
  const uid = await Cloud.restore();
  if (!uid) { S.state.activeKey = null; return; }
  if (S.state.activeKey !== uid || !S.state.profiles[uid]) {
    const r = await Cloud.pullById(uid), local = S.state.profiles[uid];
    if (r.status === "found" && (!local || (r.profile.updated || 0) >= (local.updated || 0))) S.state.profiles[uid] = r.profile;
    S.state.activeKey = S.state.profiles[uid] ? uid : null;
  }
}

S.load();
if (Cloud.enabled) await restoreSession();
window.addEventListener("hashchange", route);
route();
