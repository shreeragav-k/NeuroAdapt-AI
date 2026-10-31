// Screens and routing. The rules themselves live in flow/logic.js.
//
//   sign in -> assessment -> report -> plan -> daily session (10 games, game 1 is the movement game) -> daily reports
//
// A player can only be on the screen that matches their stage; anything else
// redirects (see `allowed`).
import * as S from "./flow/storage.js";
import { GROUPS, LEVEL_LABEL, BANDS, RULES, DOMAINS, domainOf } from "./flow/data.js";
import * as Sound from "./flow/sound.js";
import * as L from "./flow/logic.js";
import { playGame, shapeSvg } from "./flow/play.js";
import * as Cloud from "./flow/cloud.js";
import { createAccount, signInAccount } from "./flow/auth.js";
import { reportHtml, reportTitle, reportSummary, esc, VERDICT } from "./flow/report.js";
import { icon, markSvg } from "./flow/icons.js";
import { mountFruitCatcher } from "./flow/fruitgame.js";
import { mountPaintPath } from "./flow/paintgame.js";
import { mountFeedAnimal } from "./flow/feedgame.js";
import { mountMakeAFace } from "./flow/facegame.js";
import { mountCutTheFruit } from "./flow/slicegame.js";
import { startFaceTracking, preloadFaceModel } from "./flow/facetrack.js";
import { makeGame } from "./flow/engines.js";
import { cameraLog } from "./flow/camera.js";
import { preloadHandModel } from "./flow/handtrack.js";

const $main = document.getElementById("main");
const $nav = document.getElementById("nav");
const $foot = document.getElementById("foot");
const $ = (sel, root = document) => root.querySelector(sel);
let stopGame = null, fruitGame = null;

const nav = (h) => { if (location.hash === h) route(); else location.hash = h; };
const setMain = (html) => { $main.innerHTML = html; window.scrollTo({ top: 0 }); };
const groupOf = (p) => GROUPS.find((g) => g.id === p.groupId);
const initials = (name) => (String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
const slug = (skill) => (domainOf(skill) || "other").toLowerCase().replace(/[^a-z]+/g, "-");
const areaSlug = (area) => area.toLowerCase().replace(/[^a-z]+/g, "-");
const chip = (skill, soft = false) => `<span class="chip ${soft ? "soft" : ""} area-${slug(skill)}">${esc(domainOf(skill))}</span>`;
const diffDots = (n, of) => `<span class="dots" aria-label="difficulty ${n} of ${of}">${Array.from({ length: of }, (_, k) => `<i class="${k < n ? "on" : ""}"></i>`).join("")}</span>`;
const longestRun = (trials) => { let best = 0, run = 0; for (const t of trials) { run = t.correct ? run + 1 : 0; best = Math.max(best, run); } return best; };
const setTitle = (t) => { document.title = t ? `${t} · Halcyon` : "Halcyon · adaptive play"; };

// ------------------------------------------------------------------ chrome
function renderNav(p, stage, name) {
  const links = stage === "learning"
    ? `<nav class="topnav" aria-label="Main"><a href="#/plan" ${["plan", "session"].includes(name) ? 'aria-current="page"' : ""}>${icon("calendar", 18)}Plan</a><a href="#/reports" ${["reports", "report"].includes(name) ? 'aria-current="page"' : ""}>${icon("chart", 18)}Reports</a></nav>`
    : "";
  const right = p ? `
    ${Cloud.enabled ? `<span class="cloudstat" id="cloudstat" role="status"></span>` : ""}
    <button class="iconbtn" id="mute" type="button" aria-pressed="${!Sound.isMuted()}" aria-label="${Sound.isMuted() ? "Sound is off. Turn it on" : "Sound is on. Turn it off"}" title="Sound">${icon(Sound.isMuted() ? "mute" : "volume", 18)}</button>
    <div class="userchip"><span class="avatar" aria-hidden="true">${esc(initials(p.name))}</span><span class="who-text"><span class="who-name">${esc(p.name)}</span><br><span class="who-sub">${esc(groupOf(p).label)}</span></span></div>
    <button class="btn small quiet" id="signout" type="button" aria-label="Sign out">${icon("logout", 16)}<span class="so-text">Sign out</span></button>` : "";
  $nav.innerHTML = `<div class="wrap appbar-in"><a class="brand" href="#/" aria-label="Halcyon home">${markSvg(34)}<b>Halcyon</b><i>play studio</i></a>${links}<div class="appbar-right">${right}</div></div>`;
  const so = $("#signout"); if (so) so.onclick = async () => { await Cloud.signOut(); S.signOut(); mode = "signin"; nav("#/login"); };
  const mu = $("#mute");
  if (mu) mu.onclick = () => {
    Sound.setMuted(!Sound.isMuted());
    mu.innerHTML = icon(Sound.isMuted() ? "mute" : "volume", 18); mu.setAttribute("aria-pressed", !Sound.isMuted());
    mu.setAttribute("aria-label", Sound.isMuted() ? "Sound is off. Turn it on" : "Sound is on. Turn it off");
  };
  paintCloud();
}
$foot.innerHTML = `<div class="wrap"><span class="brandline">${markSvg(22)}Halcyon</span><p>A prototype for practice and engagement. Reports describe performance in these games only and are not a medical assessment or a diagnosis. Everything stays in this browser unless you switch on cloud storage. <a href="#/privacy">Privacy and the camera</a></p></div>`;

// The path a player follows, shown above the main screens.
const STEPS = ["Assessment", "Report", "Day 1", "Daily practice"];
function journey(p) {
  const st = L.stageOf(p), cur = st === "test" ? 0 : st === "assessment" ? 1 : p.sessions.length === 0 ? 2 : 3;
  return `<ol class="journey" aria-label="Your progress">${STEPS.map((s, i) => `<li class="${i < cur ? "done" : i === cur ? "current" : ""}" ${i === cur ? 'aria-current="step"' : ""}><span class="dot">${i < cur ? icon("check", 14) : i + 1}</span><span class="jl">${s}</span></li>`).join("")}</ol>`;
}

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
  if (name === "privacy") return true;
  if (!p) return name === "login";
  const stage = L.stageOf(p);
  if (stage === "test") return name === "test";
  if (stage === "assessment") return name === "assessment";
  return ["plan", "session", "reports", "report", "extra"].includes(name);
}

function route() {
  stopGame && stopGame(); stopGame = null;
  if (fruitGame) { fruitGame.destroy(); fruitGame = null; }
  const [, name = "login", arg] = (location.hash.slice(1) || "/login").split("/");
  const p = S.active();
  if (!allowed(name, p)) { const to = canonical(p); if (location.hash !== to) { location.hash = to; return; } }
  const stage = p ? L.stageOf(p) : null;
  renderNav(p, stage, name);
  const view = { login: viewLogin, test: viewTest, assessment: viewAssessment, plan: viewPlan, session: viewSession, reports: viewReports, report: viewReport, extra: viewExtra, privacy: viewPrivacy }[name];
  if (!view) return nav(canonical(p));
  setTitle({ login: "Sign in", test: "Assessment", assessment: "Assessment report", plan: "Your plan", session: "Daily session", reports: "Reports", report: "Report", extra: "Suggested game", privacy: "Privacy and camera" }[name]);
  view(p, arg);
}

// -------------------------------------------------------------------- sign in
let mode = "signin";
function viewLogin() {
  const create = mode === "create";
  const pwField = (id, label, extra = "") => `<div class="fgroup"><label for="${id}">${label}</label>${extra}<div class="pwwrap"><input type="password" id="${id}" autocomplete="${id === "pw" && !create ? "current-password" : "new-password"}" maxlength="128" required><button type="button" class="pwtoggle" data-for="${id}" aria-label="Show password">${icon("eye", 18)}</button></div></div>`;
  setMain(`<div class="auth">
    <section class="brandpanel" aria-label="About Halcyon">
      <div>
        <div class="eyebrow">Cognitive and memory training</div>
        <h1>Train memory and attention, <em>one calm game at a time.</em></h1>
        <p class="lede">A short assessment finds a comfortable starting level. Then a daily session of ten games adapts to you, with a clear report after every day.</p>
        <ul>
          <li><span class="ic-wrap">${icon("target", 20)}</span><div><b>Games matched to age</b><span>Separate sets for ages 1 to 5, 6 to 17 and 18 to 60, built on classic memory and attention tasks.</span></div></li>
          <li><span class="ic-wrap">${icon("chart", 20)}</span><div><b>Progress you can see</b><span>Charts compare each day with the assessment, skill by skill, and move the level up or down.</span></div></li>
          <li><span class="ic-wrap">${icon("shield", 20)}</span><div><b>Private by design</b><span>${Cloud.enabled ? "Your account and results are saved securely in your own cloud project." : "Accounts and results stay in this browser on this computer."}</span></div></li>
        </ul>
      </div>
      <div class="groups" aria-label="Age groups"><span>Ages 1 to 5</span><span>Ages 6 to 17</span><span>Ages 18 to 60</span></div>
    </section>
    <section class="authside"><div class="authcard reveal">
      <h2>${create ? "Create your account" : "Welcome back"}</h2>
      <p class="sub">${create ? "It takes a minute. Your age decides which set of games you will see." : "Sign in to carry on where you stopped."}</p>
      <div class="seg" role="tablist" aria-label="Sign in or create an account"><button type="button" role="tab" id="tab-in" aria-selected="${!create}">Sign in</button><button type="button" role="tab" id="tab-new" aria-selected="${create}">Create account</button></div>
      <form id="login" novalidate>
        ${create ? `
        <div class="fgroup"><label for="name">Name</label><input type="text" id="name" maxlength="40" autocomplete="name" required></div>
        <div class="fields-2">
          <div class="fgroup"><label for="age">Age</label><input type="text" id="age" inputmode="numeric" maxlength="2" autocomplete="off" required><p class="help" id="agegroup">In years, 1 to 60.</p></div>
          <div class="fgroup"><label for="cond">Health condition <span class="optional">(optional)</span></label><input type="text" id="cond" maxlength="80" autocomplete="off" placeholder="Leave empty if not applicable"><p class="help">Shown on your reports.</p></div>
        </div>` : ""}
        <div class="fgroup"><label for="email">Email</label><input type="email" id="email" inputmode="email" autocomplete="email" maxlength="120" required></div>
        ${pwField("pw", "Password", create ? `<p class="help">At least ${L.PASSWORD_MIN} characters.</p>` : "")}
        ${create ? pwField("pw2", "Confirm password") : ""}
        <div class="form-err" id="err" role="alert" hidden>${icon("info", 18)}<span id="errtext"></span></div>
        <button class="btn lg" type="submit" style="width:100%">${create ? "Create account" : "Sign in"}</button>
      </form>
      <p class="fineprint">${icon("lock", 16)}<span>${Cloud.enabled ? "Passwords are handled by Firebase and never stored by this site." : "Passwords are stored only as a salted hash in this browser."}</span></p>
    </div></section></div>`);
  $("#tab-in").onclick = () => { mode = "signin"; viewLogin(); };
  $("#tab-new").onclick = () => { mode = "create"; viewLogin(); };
  document.querySelectorAll(".pwtoggle").forEach((b) => (b.onclick = () => {
    const inp = $(`#${b.dataset.for}`), show = inp.type === "password";
    inp.type = show ? "text" : "password"; b.innerHTML = icon(show ? "eyeoff" : "eye", 18); b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));
  const age = $("#age");
  if (age) age.oninput = () => {
    const g = L.groupForAge(/^\d+$/.test(age.value.trim()) ? Number(age.value) : NaN), h = $("#agegroup");
    h.textContent = g ? `Age group: ${g.label}` : "In years, 1 to 60."; h.classList.toggle("ok", !!g);
  };
  const showErr = (msg) => { const e = $("#err"); e.hidden = !msg; $("#errtext").textContent = msg || ""; };
  $("#login").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#login button[type=submit]"), label = btn.textContent;
    btn.classList.add("loading"); btn.textContent = create ? "Creating…" : "Signing in…"; showErr("");
    const val = (id) => ($(id) ? $(id).value : "");
    const r = create
      ? await createAccount(S.state, { name: val("#name"), age: val("#age"), condition: val("#cond"), email: val("#email"), password: val("#pw"), confirm: val("#pw2") }, new Date().toISOString())
      : await signInAccount(S.state, { email: val("#email"), password: val("#pw") });
    if (r.error) { showErr(r.error); btn.classList.remove("loading"); btn.textContent = label; return; }
    S.state.activeKey = r.profile.key; S.save(); mode = "signin";
    if (create && Cloud.enabled && !(await Cloud.flush())) alert("Your account was created, but saving your details to the cloud did not work yet. They will be saved again with your next change.");
    nav(canonical(r.profile));
  };
}

// ---------------------------------------------------- generic "play a set"
// Plays `games` one after another from `cfg.index()`; records each with `cfg.record`.
const setbar = (cfg, games, i, g, state) => `<div class="setbar area-${slug(g.skill)}"><div class="s-row"><span><b>${esc(cfg.label)}</b></span><span>${state}</span></div><div class="segs" aria-hidden="true">${games.map((_, k) => `<i class="${k < i ? "on" : k === i ? "now" : ""}"></i>`).join("")}</div></div>`;

const MOVEMENT = new Set(["fruit", "trace", "feed", "face", "slice"]);      // games 1 to 3 of every daily list, and the two suggested games: played with the camera, a mouse or a finger
function runSet(p, cfg) {
  const games = cfg.games, tier = groupOf(p).tier;
  const step = () => {
    const i = cfg.index(), g = games[i];
    L.assertInGroup(g, p.groupId);
    const area = domainOf(g.skill);
    setMain(`<div class="page"><div class="wrap narrow reveal">
      ${setbar(cfg, games, i, g, `Game ${i + 1} of ${games.length}`)}
      <article class="card taskcard area-${slug(g.skill)}">
        <div class="tc-head"><span class="chip">${esc(area)}</span><h1>${esc(g.title)}</h1><p class="lede">${esc(g.how)}</p></div>
        <div class="tc-body">
          <dl class="task">
            <div><dt>Cognitive skill</dt><dd>${esc(g.skill)}</dd></div>
            <div><dt>Classic task</dt><dd>${esc(g.task)}</dd></div>
            <div class="wide"><dt>What it trains</dt><dd>${esc(g.trains)}</dd></div>
            ${g.difficulty ? `<div class="wide"><dt>Difficulty</dt><dd>${diffDots(g.difficulty, games.length)} <span class="muted small">game ${g.difficulty} of ${games.length}, from easiest to hardest</span></dd></div>` : `<div class="wide"><dt>Suggested game</dt><dd>An extra, picked for you. It is scored and shown in your report, and it does not change your level.</dd></div>`}
          </dl>
          ${tier === 0 ? `<div class="notice">${icon("info", 18)}<span>A grown-up can read the instructions aloud and help with tapping.</span></div>` : ""}
          ${MOVEMENT.has(g.engine) ? `<div class="notice privacy">${icon("lock", 18)}<span><b>The camera is optional and the video is never recorded.</b> You choose "Start with camera" or "Play without camera" when the game opens. With the camera, your hand is found on this device and nothing is saved or sent. A mouse or a finger works just as well. <a href="#/privacy">More</a></span></div>` : ""}
          <div class="actions"><button class="btn lg" id="go" type="button">${icon("play", 18)}Start game</button></div>
        </div></article></div></div>`);
    $("#go").onclick = () => play(i, g);
    if (g.engine === "face") preloadFaceModel(); else if (MOVEMENT.has(g.engine)) preloadHandModel();      // load the model while the card is being read (no camera is touched)
  };
  const saved = (i, g, trials) => {
    stopGame = null;
    let report = null;
    try { report = cfg.record(g, trials); S.save(); } catch (err) { setMain(`<div class="page"><div class="wrap narrow"><div class="notice warm">${icon("info", 18)}<span>Something went wrong saving this game: ${esc(err.message)}</span></div></div></div>`); return; }
    finished(i, g, trials, report);
  };
  // the movement game has its own player: one scored round, the camera is switched off as soon as it is over
  const playMovement = (i, g) => {
    const level = g.mode.split("-")[1];
    setMain(`<div class="page"><div class="wrap fc-wrap area-${slug(g.skill)}"><h1 class="visually-hidden">${esc(g.title)}</h1>
      ${setbar(cfg, games, i, g, `${esc(g.title)} · game ${i + 1} of ${games.length}`)}
      <div class="card fc-card-wrap"><div id="fc-host"></div></div></div></div>`);
    // the three movement games share one way in: the round's settings come from the catalogue game
    const session = { ...makeGame(g).trial(0, BANDS[level][0]), steps: BANDS[level] };
    const mount = { fruit: mountFruitCatcher, trace: mountPaintPath, feed: mountFeedAnimal, face: (h, o) => mountMakeAFace(h, { ...o, tracker: startFaceTracking }), slice: mountCutTheFruit }[g.engine];
    fruitGame = mount($("#fc-host"), {
      session,
      onContinue: (trials) => { fruitGame && fruitGame.destroy(); fruitGame = null; saved(i, g, trials); },
    });
  };
  const play = (i, g) => {
    if (MOVEMENT.has(g.engine)) return playMovement(i, g);
    setMain(`<div class="page"><div class="wrap narrow play-wrap area-${slug(g.skill)}"><h1 class="visually-hidden">${esc(g.title)}</h1>
      ${setbar(cfg, games, i, g, `${esc(g.title)} · game ${i + 1} of ${games.length}`)}<div id="host"></div></div></div>`);
    const handle = playGame({
      host: $("#host"), game: g, tier, rounds: { isTest: cfg.isTest, defaults: { test: RULES.testRounds, session: RULES.sessionRounds } },
      stepFor: cfg.stepFor,
      onDone: (trials) => saved(i, g, trials),
    });
    stopGame = handle.stop;
  };
  const finished = (i, g, trials, report) => {
    const last = i + 1 === games.length, right = trials.filter((t) => t.correct).length, acc = L.pct(right, trials.length);
    const stars = acc >= 85 ? 3 : acc >= 60 ? 2 : 1;
    setMain(`<div class="page"><div class="wrap narrow reveal">
      ${setbar(cfg, games, i + 1, g, `Game ${i + 1} of ${games.length} complete`)}
      <div class="card finish area-${slug(g.skill)}">
        <span class="chip">${esc(domainOf(g.skill))}</span>
        <h1>${esc(g.title)}</h1>
        ${cfg.showScore
          ? `<div class="stars" role="img" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => shapeSvg("star", n <= stars ? "#e8b923" : "#d9d0bd", 52)).join("")}</div>
             <p class="lede">You got ${right} of ${trials.length} right (${acc}%).${longestRun(trials) >= 3 ? ` Longest run: ${longestRun(trials)} in a row.` : ""}</p>`
          : `<p class="lede">Well done. That game is finished.</p>`}
        <button class="btn lg" id="nx" type="button">${last ? cfg.finishLabel || "See the report" : "Next game"}${icon("arrow", 18)}</button>
      </div></div></div>`);
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
    ${journey(p)}
    <div class="page-head"><div><div class="eyebrow">Step 1 · Assessment</div><h1>Hello, ${esc(p.name)}.</h1>
      <p class="lede">Five short games for ${esc(groupOf(p).label.toLowerCase())}. They find a comfortable starting level and show where your strengths are.</p></div></div>
    <div class="how3">
      <div class="card">${icon("layers", 22)}<b>Easiest to hardest</b><span>The games are in order of difficulty, so you warm up first.</span></div>
      <div class="card">${icon("target", 22)}<b>Adjusts as you play</b><span>Each game gets a little easier or harder depending on how you do.</span></div>
      <div class="card">${icon("shield", 22)}<b>No pass or fail</b><span>Afterwards you get a report and a plan. About five minutes.</span></div>
    </div>
    <div class="card"><div class="card-head"><h2>The five games</h2><span class="sub">in the order you will play them</span></div>
      <ol class="timeline">${games.map((g) => `<li class="tl area-${slug(g.skill)}"><span class="rank">${g.difficulty}</span><div><div class="g-title">${esc(g.title)}</div><div class="g-sub">${esc(g.skill)} · ${esc(g.task)}</div></div>${chip(g.skill)}</li>`).join("")}</ol>
      <div class="actions" style="margin-top:1.4rem"><button class="btn lg" id="b" type="button">${icon("play", 18)}Begin the assessment</button></div>
    </div></div></div>`);
  $("#b").onclick = begin;
}

function viewAssessment(p) {
  const r = p.reports.find((x) => x.id === "assessment");
  setMain(`<div class="page"><div class="wrap">${journey(p)}${reportHtml(r)}
    <div class="report-actions no-print"><button class="btn quiet" type="button" onclick="window.print()">${icon("print", 18)}Print this report</button><button class="btn lg" id="plan" type="button">Continue to adaptive learning${icon("arrow", 18)}</button></div></div></div>`);
  $("#plan").onclick = () => { L.markAssessmentViewed(p); S.save(); nav("#/plan"); };
}

// --------------------------------------------------------------------- plan
// Latest accuracy for each skill area: the last daily report, or the assessment before the first one.
function skillScores(p) {
  const daily = [...p.reports].reverse().find((r) => r.type === "daily"), a = p.reports.find((r) => r.id === "assessment");
  const m = daily ? Object.fromEntries((daily.skills || []).filter((k) => k.today != null).map((k) => [k.area, k.today])) : (a && a.domains) || {};
  return DOMAINS.filter((d) => m[d] != null).map((area) => ({ area, score: m[area] }));
}

function spark(vals, labels) {
  const W = 320, H = 110, Lm = 30, R = 12, T = 12, B = 24, n = vals.length;
  const x = (i) => (n === 1 ? W / 2 : Lm + ((W - Lm - R) * i) / (n - 1)), y = (v) => T + (H - T - B) * (1 - v / 100);
  const grid = [0, 50, 100].map((v) => `<line class="axis" x1="${Lm}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${Lm - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("");
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Accuracy: ${vals.map((v, i) => `${labels[i]} ${v}%`).join(", ")}">${grid}<polyline class="line" points="${pts}"/>${vals.map((v, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5"/>`).join("")}${[0, n - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 && n > 1 ? "start" : n > 1 ? "end" : "middle"}">${esc(labels[i])}</text>`).join("")}</svg>`;
}

function viewPlan(p) {
  const today = S.today(), st = L.sessionState(p, today), level = p.current ? p.current.level : p.level;
  const games = L.levelGames(p.groupId, level), doneIds = new Set(p.current ? p.current.done.map((d) => d.gameId) : []);
  const doneCount = doneIds.size, finishedToday = st === "done_today", day = p.sessions.length + (p.current || st === "ready" ? 1 : 0) || p.sessions.length;
  const nextDay = p.sessions.length + 1, progress = L.progressSummary(p), suggested = L.suggestionsFor(p);
  const lastExtra = (id) => { const e = [...(p.extras || [])].reverse().find((x) => x.gameId === id); return e ? `<span class="small muted">Last time: ${e.accuracy}% (${esc(e.date)})</span>` : ""; };
  const last = p.sessions[p.sessions.length - 1];
  const focus = L.focusAreas(p), focusSet = new Set(focus.map((f) => f.area)), scores = skillScores(p);
  const a = p.reports.find((r) => r.id === "assessment");
  const trend = [...(a ? [{ v: a.overallAccuracy, l: "Start" }] : []), ...p.sessions.map((s) => ({ v: s.accuracy, l: `Day ${s.n}` }))];
  const action = st === "ready" ? `<button class="btn lg" id="start" type="button">${icon("play", 18)}Start today's session</button>`
    : st === "resume" ? `<button class="btn lg" id="start" type="button">${icon("play", 18)}Resume at game ${doneCount + 1} of ${games.length}</button>`
    : `<div class="notice">${icon("check", 18)}<span><b>Today's session is complete.</b> The next one opens tomorrow, with the ${LEVEL_LABEL[p.level]} games.</span></div>
       <p class="small muted" style="margin:.8rem 0 0">Testing aid: <button class="linkbtn" id="skip" type="button">pretend it is tomorrow</button></p>`;
  const firstName = p.name.trim().split(/\s+/)[0];
  setMain(`<div class="page"><div class="wrap reveal">
    ${journey(p)}
    <div class="page-head"><div><div class="eyebrow">Adaptive learning</div><h1>Good to see you, ${esc(firstName)}.</h1>
      <p class="lede">One session a day, made of the ten ${LEVEL_LABEL[level]} games, from a gentle warm-up to the most demanding. A report after each day compares your accuracy with earlier days.</p></div></div>
    <div class="kpis">
      <div class="kpi"><span class="k-top">${icon("layers", 16)}Level</span><span class="k-val">${LEVEL_LABEL[level]}</span><span class="k-sub">${p.sessions.length ? `Updated after Day ${p.sessions.length}` : "Chosen from your assessment"}</span></div>
      <div class="kpi"><span class="k-top">${icon("calendar", 16)}Session</span><span class="k-val">Day ${finishedToday ? p.sessions.length : day}</span><span class="k-sub">${finishedToday ? "Completed today" : "One session a day"}</span></div>
      <div class="kpi"><span class="k-top">${icon("chart", 16)}Last accuracy</span><span class="k-val">${last ? last.accuracy + "%" : "—"}</span><span class="k-sub">${last ? `Day ${last.n}, ${LEVEL_LABEL[last.level]}` : "No sessions yet"}</span></div>
      <div class="kpi"><span class="k-top">${icon("check", 16)}Completed</span><span class="k-val">${p.sessions.length}</span><span class="k-sub">${p.sessions.length === 1 ? "session" : "sessions"} finished</span></div>
    </div>
    <div class="dash">
      <section class="card"><div class="card-head"><div><h2>${finishedToday ? "Tomorrow's session" : "Today's session"}</h2><span class="sub">Day ${finishedToday ? nextDay : day} · ${LEVEL_LABEL[level]} · ${games.length} games</span></div><span class="badge ${level}">${LEVEL_LABEL[level]}</span></div>
        ${finishedToday ? "" : `<div class="progressbar" role="progressbar" aria-valuemin="0" aria-valuemax="${games.length}" aria-valuenow="${doneCount}"><i style="width:${(doneCount / games.length) * 100}%"></i></div>
        <p class="small muted" style="margin:.5rem 0 1rem">${doneCount} of ${games.length} games done today</p>`}
        <div class="notice privacy" style="margin-bottom:1rem">${icon("camera", 18)}<span><b>Games 1 to 3 are movement games</b> (Fruit Catcher, Paint the Path, Feed the Animal). Play them with your hand in front of the camera, a mouse or a finger. <b>The video is never recorded</b> and the camera is optional. <a href="#/privacy">How this works</a></span></div>
        ${action}
        <ol class="glist">${games.map((g, i) => `<li class="grow area-${slug(g.skill)} ${doneIds.has(g.id) ? "done" : i === doneCount && st !== "done_today" ? "next" : ""}"><span class="rank">${doneIds.has(g.id) ? icon("check", 16) : g.difficulty}</span><div><div class="g-title">${esc(g.title)}${focusSet.has(domainOf(g.skill)) ? ` <em class="tag focus">focus</em>` : ""}</div><div class="g-sub">${esc(g.skill)} · ${esc(g.task)}</div></div>${chip(g.skill, true)}</li>`).join("")}</ol>
      </section>
      <div class="stack">
        <section class="card"><div class="card-head"><h3>Skill areas</h3><span class="sub">${p.sessions.length ? "latest day" : "assessment"}</span></div>
          ${scores.length ? `<ul class="skillbars">${scores.map((s) => `<li class="area-${areaSlug(s.area)} ${focusSet.has(s.area) ? "weak" : ""}"><div class="s-top"><b>${esc(s.area)}</b><span>${s.score}%</span></div><div class="progressbar"><i style="width:${s.score}%"></i></div></li>`).join("")}</ul>` : `<p class="empty">Your skill areas appear after the assessment.</p>`}
          ${focus.length ? `<p class="small muted" style="margin:1rem 0 0">Marked "focus": your lowest areas so far. Their games are tagged in today's list.</p>` : ""}
        </section>
        ${suggested.length ? `<section class="card" id="suggested"><div class="card-head"><h3>Suggested for you</h3><span class="sub">optional extras</span></div>
          <ul class="suglist">${suggested.map((s) => `<li class="area-${slug(s.skill)}"><div><b>${esc(s.title)}</b>${chip(s.skill, true)}<p>${esc(s.reason)}</p>${lastExtra(s.id)}</div><a class="btn small" href="#/extra/${esc(s.id)}">${icon("play", 16)}Play</a></li>`).join("")}</ul>
          <p class="small muted" style="margin:.8rem 0 0">Extras do not change your level. Their results appear in your daily report.</p></section>` : ""}
        <section class="card"><div class="card-head"><h3>Accuracy</h3><a class="small" href="#/reports">All reports</a></div>
          ${trend.length >= 2 ? spark(trend.map((t) => t.v), trend.map((t) => t.l)) : `<p class="empty">${trend.length ? "After Day 1 you will see how your accuracy changes from the assessment." : "Your accuracy chart appears after the assessment."}</p>`}
        </section>
        <section class="card"><div class="card-head"><h3>Is it working?</h3><span class="sub">since the assessment</span></div>
          ${progress ? `<div class="verdict ${progress.verdict}"><b>${VERDICT[progress.verdict][0]}</b><span>${VERDICT[progress.verdict][1]}</span></div>
            <dl class="mini-dl"><div><dt>Accuracy</dt><dd>${progress.startAccuracy}% → ${progress.nowAccuracy}%</dd></div><div><dt>Level</dt><dd>${LEVEL_LABEL[progress.startLevel]} → ${LEVEL_LABEL[progress.nowLevel]}</dd></div>${progress.best ? `<div><dt>Biggest gain</dt><dd>${esc(progress.best.area)} (+${progress.best.change})</dd></div>` : ""}</dl>
            <p class="small muted" style="margin:.8rem 0 0">Compares your latest day with the assessment, in these games only. Details are in your daily report.</p>`
          : `<p class="empty">After your first daily report you will see whether your results are moving up.</p>`}
        </section>
      </div>
    </div></div></div>`);
  const b = $("#start"); if (b) b.onclick = () => nav("#/session");
  if (b) preloadHandModel();
  const k = $("#skip"); if (k) k.onclick = () => { S.skipToNextDay(); route(); };
}

// ------------------------------------------------------- suggested games
// An optional extra beside the 10 games, offered on the plan page. It is played like any other game, scored,
// saved in the player's list and in that day's report, and it never changes the level.
function viewExtra(p, id) {
  const hit = L.suggestionsFor(p).find((s) => s.id === id);       // only a game that is suggested to this player
  if (!hit) return nav("#/plan");
  let played = false;
  runSet(p, {
    games: [hit.game], label: "Suggested game", isTest: false, showScore: true, finishLabel: "Back to the plan",
    index: () => (played ? 1 : 0),
    stepFor: (trials) => L.sessionStep(p.level || "easy", trials.length),
    record: (g, trials) => { L.recordExtra(p, hit.game.id.split("-x-")[1], trials, S.today()); played = true; return null; },
    afterLast: () => "#/plan",
  });
}

// ------------------------------------------------------------------ privacy
function viewPrivacy(p) {
  const back = p ? `<a class="btn quiet" href="${canonical(p)}">${icon("arrow", 18)}Back</a>` : `<a class="btn quiet" href="#/login">${icon("arrow", 18)}Back to sign in</a>`;
  setMain(`<div class="page"><div class="wrap narrow reveal">
    <div class="page-head"><div><div class="eyebrow">Privacy</div><h1>The camera is never recorded</h1>
      <p class="lede">Fruit Catcher, Paint the Path and Feed the Animal (games 1 to 3 of every daily session), and the suggested games Cut the Fruit and Make a Face, can use the camera: your hand for the first four and your face for Make a Face. This is exactly what happens to the picture.</p></div></div>
    <div class="card prose">
      <div class="privrow"><span class="ic-wrap">${icon("lock", 20)}</span><div><b>No recording, ever</b><p>The page never saves video, photos or audio. There is no recording code in it, and the microphone is never asked for.</p></div></div>
      <div class="privrow"><span class="ic-wrap">${icon("shield", 20)}</span><div><b>Nothing leaves your device</b><p>The hand-finding model runs inside your browser, from files stored with this site. The camera picture is never uploaded, not even to the cloud project if you switched on cloud storage. Only your game scores are saved.</p></div></div>
      <div class="privrow"><span class="ic-wrap">${icon("camera", 20)}</span><div><b>What is read from the picture</b><p>Only one number per moment: whether your hand is on the left, in the middle or on the right. That decides which lane the character moves to. The picture is dropped right after.</p></div></div>
      <div class="privrow"><span class="ic-wrap">${icon("check", 20)}</span><div><b>You are in control</b><p>The camera is only asked for after you press "Start with camera". "Play without camera" works just as well, and so do the arrow keys, a mouse or a finger. A "Turn camera off" button sits on the preview, and the camera switches off by itself when the round ends or you leave the page. Your browser's camera light shows whenever it is on.</p></div></div>
      <div class="privrow"><span class="ic-wrap">${icon("doc", 20)}</span><div><b>What the camera did on this visit</b><p>Only the names of events, never any picture.</p>
        ${cameraLog.length ? `<ul class="plain">${cameraLog.slice(-8).map((e) => `<li>${esc(new Date(e.at).toLocaleTimeString())} · ${esc(e.event)}</li>`).join("")}</ul>` : `<p class="small muted">The camera has not been used on this visit.</p>`}</div></div>
      <div class="privrow"><span class="ic-wrap">${icon("info", 20)}</span><div><b>What this page cannot promise</b><p>It describes how this site is built: there is no recording or upload code for the camera. It cannot stop a browser extension, the operating system or another device from recording. To check for yourself, open the browser's developer tools, choose Network, start a camera game and watch: no picture or video is sent. Camera permission can be changed from the lock icon next to the address.</p></div></div>
      <p class="small muted">Account details and scores stay in this browser${Cloud.enabled ? ", and are also saved to your own cloud project" : " unless cloud storage is switched on"}. Reports describe performance in the games and are not a medical assessment.</p>
      <div class="actions">${back}</div>
    </div></div></div>`);
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
  const rs = [...p.reports].reverse(), a = p.reports.find((r) => r.id === "assessment");
  const trend = [...(a ? [{ v: a.overallAccuracy, l: "Start" }] : []), ...p.sessions.map((s) => ({ v: s.accuracy, l: `Day ${s.n}` }))];
  setMain(`<div class="page"><div class="wrap reveal">
    <div class="page-head"><div><div class="eyebrow">Reports</div><h1>${esc(p.name.trim().split(/\s+/)[0])}'s reports</h1>
      <p class="lede">Every report is kept here: the assessment and one for each day, each compared with the days before.</p></div></div>
    <div class="dash">
      <section class="card"><div class="card-head"><h2>All reports</h2><span class="sub">${rs.length} ${rs.length === 1 ? "report" : "reports"}</span></div>
        <ul class="reports-list">${rs.map((r) => `<li><a class="rrow" href="#/report/${esc(r.id)}"><span class="r-ic">${icon(r.type === "assessment" ? "target" : "doc", 22)}</span><span><span class="r-title">${esc(reportTitle(r))}</span><br><span class="r-sub">${esc(r.date)} · ${esc(reportSummary(r))}</span></span><span class="r-acc">${r.type === "assessment" ? r.overallAccuracy : r.accuracy}%</span><span class="badge ${r.type === "assessment" ? r.level : r.nextLevel}">${LEVEL_LABEL[r.type === "assessment" ? r.level : r.nextLevel]}</span></a></li>`).join("")}</ul>
      </section>
      <section class="card"><div class="card-head"><h3>Accuracy over time</h3></div>
        ${trend.length >= 2 ? spark(trend.map((t) => t.v), trend.map((t) => t.l)) : `<p class="empty">The chart appears after your first daily report.</p>`}
      </section>
    </div></div></div>`);
}

function viewReport(p, id) {
  const r = p.reports.find((x) => x.id === id);
  if (!r) return nav("#/reports");
  setMain(`<div class="page"><div class="wrap">${reportHtml(r)}
    <div class="report-actions no-print"><a class="btn quiet" href="#/reports">All reports</a><span style="display:flex;gap:.8rem;flex-wrap:wrap"><button class="btn quiet" type="button" onclick="window.print()">${icon("print", 18)}Print this report</button><a class="btn" href="#/plan">Back to the plan${icon("arrow", 18)}</a></span></div></div></div>`);
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
