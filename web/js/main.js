import * as S from "./store.js";
import { recommend } from "./recommend.js";

const $main = document.getElementById("main");
const $nav = document.getElementById("nav");
const $foot = document.getElementById("foot");
let cleanup = [];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const go = (h) => { location.hash = h; };

const DIM = { pace: "Speed", load: "Challenge", visual: "Visual detail" };
const SKILL_ORDER = ["Working memory", "Response inhibition", "Cognitive flexibility", "Focused attention", "Planning and sequencing", "Working memory (n-back)", "Pattern reasoning", "Sustained attention and timing", "Visual-spatial reasoning", "Quick counting"];

// ---------------------------------------------------------------- chrome
function applyPrefs() {
  const p = S.active();
  const prefs = p?.preferences || {};
  document.documentElement.classList.toggle("text-large", prefs.text_size === "large");
  document.documentElement.classList.toggle("no-motion", prefs.animation === "off");
}

function renderNav(route) {
  const p = S.active();
  const link = (h, t) => `<a href="${h}" ${route.startsWith(h.slice(1)) && h !== "#/" ? 'aria-current="page"' : ""}>${t}</a>`;
  const links = p
    ? [link("#/home", "Home"), link("#/games", "Games"), link("#/progress", "Progress"), link("#/settings", "Settings"), link("#/privacy", "Privacy")]
    : [`<a href="#/">Overview</a>`, `<a href="#/privacy" ${route === "/privacy" ? 'aria-current="page"' : ""}>Privacy</a>`];
  $nav.innerHTML = `<div class="wrap">
    <a class="brand" href="#/" aria-label="Halcyon home">Halcyon <i>play studio</i></a>
    <nav id="navlinks" aria-label="Main">${links.join("")}</nav>
    <div style="display:flex;align-items:center;gap:1rem">
      ${p ? `<span class="who">${p.guest ? "Guest" : esc(p.name)}</span><a class="btn small quiet" href="#/signin">Switch</a>` : `<a class="btn small" href="#/signin">Begin</a>`}
      <button class="btn small quiet nav-toggle" aria-expanded="false" aria-controls="navlinks" id="navtoggle">Menu</button>
    </div></div>`;
  $("#navtoggle").onclick = (e) => {
    const open = $("#navlinks").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  };
}

function renderFoot() {
  $foot.innerHTML = `<div class="wrap">
    <div class="cols">
      <div><a class="brand" href="#/">Halcyon</a><p class="muted" style="max-width:26rem;margin-top:1rem">Short, calm games for attention, memory and flexible thinking, played with movement or with a mouse, touch and keyboard.</p></div>
      <div><h4>Explore</h4><ul><li><a href="#/signin">Begin</a></li><li><a href="#/games">Games</a></li><li><a href="#/progress">Progress</a></li></ul></div>
      <div><h4>Trust</h4><ul><li><a href="#/privacy">Privacy</a></li><li><a href="#/settings">Settings</a></li></ul></div>
    </div>
    <p class="legal">Halcyon is a prototype for usability and engagement. It does not diagnose, treat or assess any condition, and makes no claim of clinical benefit. Profile choices are entered by the player or caregiver and are used only to tailor suggestions.</p>
  </div>`;
}

const need = () => { if (!S.active()) { go("#/signin"); return false; } return true; };
const setMain = (h, cls = "") => { $main.innerHTML = h; $main.className = cls; window.scrollTo({ top: 0 }); };

// ------------------------------------------------------------- game card
function gameCard(g, { reason = "", actions = "", tag = "" } = {}) {
  return `<article class="card">
    <img src="/img/games/${g.id}.png" alt="" width="704" height="240" loading="lazy">
    <div class="body">
      <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center"><span class="skill">${esc(g.skill)}</span>${tag}</div>
      <h3>${esc(g.name)}</h3>
      ${reason ? `<div class="reason">${esc(reason)}</div>` : ""}
      <p>${esc(g.tagline)}</p>
      ${actions ? `<div class="actions">${actions}</div>` : ""}
    </div></article>`;
}

// ------------------------------------------------------------------ views
async function viewWelcome() {
  const cat = await S.catalog();
  const group = (phase) => cat.games.filter((g) => g.phase === phase);
  setMain(`
  <section class="hero">
    <img src="/img/hero.jpg" alt="" width="1920" height="1080">
    <div class="wrap reveal">
      <div class="eyebrow">Cognitive play, gently adapted</div>
      <h1>Play that meets you <em>where you are.</em></h1>
      <p class="lede">Ten short games for attention, memory and flexible thinking. Play with your hands, your whole body, or a mouse and keyboard. Everything is calm, predictable and adjustable.</p>
      <div class="cta"><a class="btn" href="#/signin">Begin</a><button class="btn secondary" id="guest">Explore as a guest</button></div>
      <p class="note">A prototype for usability and engagement. It is not a diagnostic or clinical tool.</p>
    </div>
  </section>

  <section class="block"><div class="wrap">
    <div class="eyebrow">How it works</div>
    <h2>Set up once. Then play at your pace.</h2>
    <div class="cols3">
      <article><span class="num">01</span><h3>Tell us how you like to play</h3><p>Choose movement or mouse and keyboard, sound, how much motion on screen, and how long each session lasts. Add anything about yourself you would like us to consider, or skip it. All of it can change at any time.</p></article>
      <article><span class="num">02</span><h3>Five games to find your pace</h3><p>Your first five games are five different ones, kept gentle. Together they give us a comfortable starting level. It is a usability estimate, not a measurement of ability.</p></article>
      <article><span class="num">03</span><h3>One small step at a time</h3><p>After that, games adjust by one thing at a time (speed, challenge or visual detail) and tell you why in plain words. You can override any level, pause, skip or take a break.</p></article>
    </div>
  </div></section>

  <section class="block"><div class="wrap split">
    <div>
      <div class="eyebrow">Movement, if you want it</div>
      <h2>Move in the way that suits you.</h2>
      <p class="lede">Every game can be played with camera movement, and every game can be played without it. Nothing ever requires a camera.</p>
      <ul class="rules">
        <li><b>Hands, seated</b><span>Small movements. Point with your fingertips and pinch to select.</span></li>
        <li><b>Whole body</b><span>Standing play with a larger range. Hold still to select, lean to choose left or right.</span></li>
        <li><b>No camera</b><span>Mouse, touch or keyboard. Arrow keys and Enter work everywhere.</span></li>
      </ul>
    </div>
    <img src="/img/games/steady_beat.png" alt="A closing ring around a teal circle on a pale sea" width="704" height="240" loading="lazy" style="aspect-ratio:4/3;object-fit:cover">
  </div></section>

  <section class="block" id="games"><div class="wrap">
    <div class="eyebrow">The games</div>
    <h2>Ten games, many ways of thinking.</h2>
    <div class="group-head"><h2>Getting to know your pace</h2><span class="muted small">Your first five games</span></div>
    <div class="grid g5">${group("starter").map((g) => gameCard(g)).join("")}</div>
    <div class="group-head"><h2>Adapting to you</h2><span class="muted small">After your first five</span></div>
    <div class="grid g5">${group("adaptive").map((g) => gameCard(g)).join("")}</div>
  </div></section>

  <section class="block" style="border-bottom:0"><div class="wrap">
    <div class="eyebrow">Made with care</div>
    <h2>Calm by design.</h2>
    <div class="cols3">
      <article><span class="num">Predictable</span><h3>The same steps every time</h3><p>Clear goals, short rounds, signals before anything changes. No surprise sounds, no flashing.</p></article>
      <article><span class="num">Kind</span><h3>No shame, no penalties</h3><p>Missed a round? The next one is a fresh start. Easing a level is never framed as failing.</p></article>
      <article><span class="num">Private</span><h3>Stays on your computer</h3><p>Camera video is processed live and never recorded or sent anywhere. <a href="#/privacy">Read the privacy notice.</a></p></article>
    </div>
  </div></section>`);
  $("#guest").onclick = () => { S.startGuest(); go("#/home"); };
}

async function viewSignin() {
  const profiles = Object.values(S.state.profiles).filter((p) => !p.guest);
  setMain(`<div class="page"><div class="wrap onb">
    <aside><img src="/img/hero.jpg" alt="" width="640" height="800"><p class="muted small">Profiles are stored only on this computer. There is no account, password reset or cloud.</p></aside>
    <div class="reveal">
      <header><div class="eyebrow">Welcome</div><h1>Who is playing today?</h1></header>
      ${profiles.length ? `<fieldset><legend>Continue as</legend><div class="grid" id="plist">${profiles.map((p) => `
        <div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1.2rem 1.5rem">
          <div><b style="font-family:var(--serif);font-size:1.4rem;font-weight:420">${esc(p.name)}</b><div class="muted small">Age ${esc(p.age)}${p.pin ? " · protected by a PIN" : ""}</div></div>
          <div style="display:flex;gap:.6rem"><button class="btn small" data-use="${esc(p.id)}">Continue</button></div>
        </div>`).join("")}</div></fieldset>` : ""}
      <div class="panel" style="display:grid;gap:1.4rem">
        <div><h3 style="font-size:1.6rem;margin-bottom:.4rem">Create a profile</h3><p class="muted" style="margin:0">Takes about two minutes. Everything except a name and age is optional.</p></div>
        <div><a class="btn" href="#/onboarding">Set up a new player</a></div>
        <hr style="border:0;border-top:1px solid var(--line);width:100%">
        <div><h3 style="font-size:1.6rem;margin-bottom:.4rem">Just looking?</h3><p class="muted" style="margin:0 0 1rem">Guest mode lets you explore with sample content. Nothing is saved to a profile.</p><button class="btn secondary" id="guest">Continue as a guest</button></div>
      </div>
    </div></div></div>
    <dialog id="pin"><form method="dialog"><h3 style="font-size:1.6rem;margin-bottom:.8rem">Enter the PIN</h3><input type="password" id="pinin" inputmode="numeric" autocomplete="off" aria-label="PIN"><p class="small" id="pinerr" style="color:#8d3b2b;min-height:1.4em;margin:.6rem 0 0"></p><div class="nav-row" style="margin-top:1rem"><button class="btn quiet" value="x">Cancel</button><button class="btn" id="pinok" value="ok">Continue</button></div></form></dialog>`);
  $("#guest").onclick = () => { S.startGuest(); go("#/home"); };
  const dlg = $("#pin");
  let pending = null;
  $$("[data-use]").forEach((b) => (b.onclick = () => {
    const p = S.state.profiles[b.dataset.use];
    if (!p.pin) { S.setActive(p.id); go("#/home"); return; }
    pending = p; $("#pinerr").textContent = ""; $("#pinin").value = ""; dlg.showModal(); $("#pinin").focus();
  }));
  $("#pinok")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const h = await S.hashPin($("#pinin").value, pending.id);
    if (h === pending.pin) { dlg.close(); S.setActive(pending.id); go("#/home"); } else $("#pinerr").textContent = "That PIN doesn't match. Try again.";
  });
}

// ---- shared preference controls
const choices = (name, value, opts) => `<div class="choices" role="radiogroup">${opts.map(([v, t, d]) => `<div class="choice"><input type="radio" name="${name}" id="${name}-${v}" value="${v}" ${String(value) === String(v) ? "checked" : ""}><label for="${name}-${v}"><b>${t}</b>${d ? `<span>${d}</span>` : ""}</label></div>`).join("")}</div>`;

const movementFields = (pr) => `
  <fieldset><legend>How would you like to move?</legend><p class="hint">You can switch at any time, and every game also works with mouse, touch or keyboard.</p>
    ${choices("movement_mode", pr.movement_mode, [["hands", "Hands, seated", "Small movements in front of the camera."], ["pose", "Whole body", "Standing or larger movements."], ["none", "No camera", "Mouse, touch or keyboard only."]])}</fieldset>
  <div class="row"><fieldset><legend>Seated or standing</legend>${choices("posture", pr.posture, [["seated", "Seated", ""], ["standing", "Standing", ""]])}</fieldset>
  <fieldset><legend>Selecting with movement</legend>${choices("select_method", pr.select_method, [["pinch", "Pinch", "Thumb and finger together."], ["dwell", "Hold still", "Pause over a target."], ["both", "Either", ""]])}</fieldset></div>`;

const comfortFields = (pr) => `
  <div class="row"><fieldset><legend>Sound</legend>${choices("sound", String(pr.sound), [["true", "On, soft", "Gentle tones only."], ["false", "Off", "Silent."]])}
    <div class="rng" style="margin-top:.8rem"><label for="volume">Volume</label><input type="range" id="volume" name="volume" min="0" max="1" step="0.05" value="${pr.volume}"><output>${Math.round(pr.volume * 100)}</output></div></fieldset>
  <fieldset><legend>Movement on screen</legend>${choices("animation", pr.animation, [["off", "None", "Still backgrounds."], ["gentle", "Gentle", "Slow drifting."], ["full", "Full", "Slow, but more of it."]])}</fieldset></div>
  <fieldset><legend>Instructions</legend>${choices("instructions", pr.instructions, [["short", "Few words", "One short sentence."], ["steps", "Step by step", "Three short steps."], ["visual", "Pictures first", "Big numbered cards."]])}</fieldset>
  <div class="row"><fieldset><legend>Session length</legend>${choices("session_minutes", pr.session_minutes, [[3, "3 min", ""], [5, "5 min", ""], [10, "10 min", ""]])}</fieldset>
  <fieldset><legend>Text size on this website</legend>${choices("text_size", pr.text_size || "normal", [["normal", "Standard", ""], ["large", "Larger", ""]])}</fieldset></div>`;

function readPrefs(root, prefs) {
  const val = (n) => $(`input[name="${n}"]:checked`, root)?.value;
  const next = { ...prefs };
  ["movement_mode", "posture", "select_method", "animation", "instructions", "text_size"].forEach((n) => { const v = val(n); if (v) next[n] = v; });
  const snd = val("sound"); if (snd) next.sound = snd === "true";
  const mins = val("session_minutes"); if (mins) next.session_minutes = Number(mins);
  const vol = $('input[name="volume"]', root); if (vol) next.volume = Number(vol.value);
  return next;
}

// ---- onboarding
const ob = { step: 0, role: "player", name: "", age: "", self: "prefer_not", traits: new Set(), prefs: { ...S.DEFAULT_PREFS }, pin: "" };

async function viewOnboarding() {
  const cat = await S.catalog();
  const [amin, amax] = cat.age_range;
  const total = 5;
  const step = ob.step;
  const titles = ["Who is setting up?", "About the player", "How would you like to play?", "Comfort and routine", "Review and privacy"];
  let body = "";
  if (step === 0) {
    body = `<fieldset><legend>I am…</legend>${choices("role", ob.role, [["player", "The player", "I'm setting this up for myself."], ["caregiver", "A caregiver or educator", "I'm setting this up for someone else."]])}</fieldset>
    <div class="row"><fieldset><label class="lbl" for="name">Name or nickname</label><p class="hint">Only used to say hello. It can be anything.</p><input type="text" id="name" maxlength="30" value="${esc(ob.name)}" autocomplete="off"></fieldset>
    <fieldset><label class="lbl" for="age">Age of the player</label><p class="hint">Used to choose wording and starting suggestions, never to decide ability. Ages ${amin} to ${amax}.</p><select id="age"><option value="">Choose…</option>${Array.from({ length: amax - amin + 1 }, (_, i) => amin + i).map((a) => `<option ${String(ob.age) === String(a) ? "selected" : ""}>${a}</option>`).join("")}</select></fieldset></div>`;
  } else if (step === 1) {
    const po = cat.profile_options;
    body = `<div class="callout" style="margin-bottom:2rem">Everything on this page is optional. It is described by the player or caregiver, used only to tailor game suggestions and settings, and is <b>not a diagnosis</b>. Halcyon never infers or changes it from how someone plays or from camera data.</div>
    <fieldset><legend>How would you describe the player?</legend>${choices("self", ob.self, po.self_described.map((o) => [o.id, o.label, ""]))}</fieldset>
    <fieldset><legend>Anything that helps us suggest the right games</legend><p class="hint">Choose any that fit. Skip them if you prefer.</p><div class="chips">${po.traits.map((t) => `<div class="chip"><input type="checkbox" id="t-${t.id}" value="${t.id}" ${ob.traits.has(t.id) ? "checked" : ""}><label for="t-${t.id}">${esc(t.label)}</label></div>`).join("")}</div></fieldset>`;
  } else if (step === 2) body = movementFields(ob.prefs);
  else if (step === 3) body = comfortFields(ob.prefs) + `<fieldset><label class="lbl" for="pin">Optional PIN</label><p class="hint">Stops others on a shared computer switching into this profile. Leave empty for none.</p><input type="password" id="pin" inputmode="numeric" maxlength="8" autocomplete="off" value="${esc(ob.pin)}" style="max-width:12rem"></fieldset>`;
  else body = `<div class="panel" style="margin-bottom:1.6rem"><h3 style="font-size:1.5rem;margin-bottom:1rem">Your choices</h3><dl style="display:grid;grid-template-columns:11rem 1fr;gap:.6rem 1rem;margin:0">
      <dt class="muted">Player</dt><dd style="margin:0">${esc(ob.name)}, age ${esc(ob.age)}</dd>
      <dt class="muted">Movement</dt><dd style="margin:0">${{ hands: "Hands, seated", pose: "Whole body", none: "No camera" }[ob.prefs.movement_mode]}</dd>
      <dt class="muted">Sound</dt><dd style="margin:0">${ob.prefs.sound ? "On, soft" : "Off"}</dd>
      <dt class="muted">Motion</dt><dd style="margin:0">${{ off: "None", gentle: "Gentle", full: "Full" }[ob.prefs.animation]}</dd>
      <dt class="muted">Sessions</dt><dd style="margin:0">${ob.prefs.session_minutes} minutes</dd></dl></div>
    <ul class="rules" style="margin-bottom:2rem"><li><b>What we keep</b><span>Your profile, your settings and game results, on this computer only.</span></li><li><b>The camera</b><span>Only if you choose movement. Video is processed live, never recorded or sent anywhere.</span></li><li><b>Your control</b><span>Change or clear any of it, any time, from Settings.</span></li></ul>`;
  setMain(`<div class="page"><div class="wrap onb">
    <aside><img src="/img/hero.jpg" alt="" width="640" height="800"><p class="muted small">A short setup. Skip anything optional. You can change every answer later.</p></aside>
    <div class="reveal"><header><div class="eyebrow">Step ${step + 1} of ${total}</div><h1>${titles[step]}</h1></header>
      <div class="steps" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
      <form id="obform" novalidate>${body}<p class="small" id="err" role="alert" style="color:#8d3b2b;min-height:1.4em"></p>
      <div class="nav-row"><button type="button" class="btn quiet" id="back">${step === 0 ? "Cancel" : "Back"}</button><button type="submit" class="btn">${step === total - 1 ? "Finish and begin" : "Continue"}</button></div></form></div>
  </div></div>`);
  const form = $("#obform");
  const readStep = () => {
    if (step === 0) { ob.role = $('input[name="role"]:checked').value; ob.name = $("#name").value.trim(); ob.age = $("#age").value; }
    if (step === 1) { ob.self = $('input[name="self"]:checked')?.value || "prefer_not"; ob.traits = new Set($$('.chips input:checked').map((i) => i.value)); }
    if (step === 2 || step === 3) ob.prefs = readPrefs(form, ob.prefs);
    if (step === 3) ob.pin = $("#pin").value.trim();
  };
  $$('input[type=range]', form).forEach((r) => r.addEventListener("input", () => (r.nextElementSibling.textContent = Math.round(r.value * 100))));
  $("#back").onclick = () => { readStep(); if (ob.step === 0) go("#/signin"); else { ob.step--; viewOnboarding(); } };
  form.onsubmit = async (e) => {
    e.preventDefault(); readStep();
    if (step === 0 && (!ob.name || !ob.age)) { $("#err").textContent = "Please add a name or nickname, and an age."; return; }
    if (step < total - 1) { ob.step++; viewOnboarding(); return; }
    const p = S.createProfile({ name: ob.name, age: Number(ob.age), role: ob.role, profile: { self_described: ob.self, traits: [...ob.traits], notes: "" }, preferences: ob.prefs });
    if (ob.pin) { const h = await S.hashPin(ob.pin, p.id); S.update((x) => { x.pin = h; }); }
    Object.assign(ob, { step: 0, name: "", age: "", traits: new Set(), pin: "", prefs: { ...S.DEFAULT_PREFS } });
    go("#/home");
  };
}

// ---- home / recommendations
const ui = { mood: new Set(), dismissed: new Set() };
async function viewHome() {
  if (!need()) return;
  const p = S.active();
  const cat = await S.catalog();
  const real = await S.progress();
  const prog = real || (p.guest ? S.sampleProgress(cat) : { estimate: { done: false }, sessions: [], completed_count: 0 });
  const recs = recommend(p, prog, cat, { mood: ui.mood, dismissed: ui.dismissed });
  const top = recs.slice(0, 3);
  const done = Math.min(5, prog.completed_count || 0);
  const est = prog.estimate || {};
  const moods = [["calmer", "Calmer"], ["quicker", "Quicker"], ["visual", "More pictures"], ["notime", "No time pressure"], ["movement", "Uses movement"]];
  setMain(`<div class="page"><div class="wrap reveal">
    <header><div class="eyebrow">${p.guest ? "Guest preview" : "Today"}</div><h1>Good to see you, ${esc(p.guest ? "there" : p.name)}.</h1></header>
    ${p.guest ? `<div class="callout warm" style="margin-bottom:2rem">You're exploring as a guest. Progress shown here is sample content. <a href="#/onboarding">Create a profile</a> to keep your own.</div>` : ""}
    <div class="panel" style="margin-bottom:3rem;display:grid;grid-template-columns:1fr auto;gap:2rem;align-items:center">
      <div>
        <div class="eyebrow" style="margin-bottom:.6rem">${est.done ? "Adapting to you" : "Getting to know your pace"}</div>
        ${est.done ? `<p style="margin:0;font-size:1.15rem">Your five starter games are done. A comfortable starting level looks like <b>${est.level} of 5</b>. Games now adjust one small step at a time, and you can change any level yourself in <a href="#/games">Games</a>.</p>`
          : `<p style="margin:0;font-size:1.15rem">Play five different games and we'll suggest a comfortable starting level. Everything stays gentle until then.</p><div class="dots" aria-label="${done} of 5 games played">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < done ? "on" : ""}"></i>`).join("")}</div><span class="muted small">${done} of 5 games</span>`}
      </div>
      <a class="btn" href="#/play/${top[0]?.game.id}">Play ${esc(top[0]?.game.name || "")}</a>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem"><h2 style="font-size:2rem">Chosen for you</h2></div>
    <p class="hint" style="max-width:44rem">Based on what you told us and what you've played. Not what you're capable of. Change what we suggest any time.</p>
    <fieldset style="margin-bottom:1.6rem"><legend class="small muted" style="font-family:var(--sans);font-size:.9rem">I'd rather something…</legend><div class="chips">${moods.map(([k, t]) => `<div class="chip"><input type="checkbox" id="m-${k}" value="${k}" ${ui.mood.has(k) ? "checked" : ""}><label for="m-${k}">${t}</label></div>`).join("")}</div></fieldset>
    <div class="grid g5" id="recs">${top.map((r, i) => gameCard(r.game, { reason: r.reason, tag: i === 0 ? '<span class="tag">Suggested</span>' : "", actions: `<a class="btn small" href="#/play/${r.game.id}">Play</a><button class="btn small quiet" data-skip="${r.game.id}">Not now</button>` })).join("")}</div>
    <div class="group-head"><h2>More to explore</h2><a href="#/games">All games and settings</a></div>
    <div class="grid g5">${recs.slice(3, 6).map((r) => gameCard(r.game, { reason: r.reason, actions: `<a class="btn small quiet" href="#/play/${r.game.id}">Play</a>` })).join("")}</div>
  </div></div>`);
  $$('.chips input').forEach((i) => (i.onchange = () => { i.checked ? ui.mood.add(i.value) : ui.mood.delete(i.value); viewHome(); }));
  $$('[data-skip]').forEach((b) => (b.onclick = () => { ui.dismissed.add(b.dataset.skip); viewHome(); }));
}

// ---- games library + per-game settings
async function viewGames() {
  if (!need()) return;
  const p = S.active();
  const cat = await S.catalog();
  const real = await S.progress();
  const gp = real?.games || {};
  const card = (g) => {
    const ov = p.overrides?.[g.id];
    const dims = { pace: 2, load: 2, visual: 1, ...(gp[g.id]?.dims || {}), ...(ov || {}) };
    return gameCard(g, {
      tag: `<span class="tag plain">${g.phase === "starter" ? "Starter" : "Adaptive"}</span>`,
      actions: `<a class="btn small" href="#/play/${g.id}">Play</a>`,
    }).replace("</div></article>", `
      <details class="opts"><summary>Customise this game</summary>
        <label class="small" style="display:flex;gap:.6rem;align-items:center;margin:.8rem 0"><input type="checkbox" data-auto="${g.id}" ${ov ? "" : "checked"}> Let Halcyon adjust this game automatically</label>
        ${Object.entries(DIM).map(([k, t]) => `<div class="rng"><label for="${g.id}-${k}">${t}</label><input type="range" id="${g.id}-${k}" data-dim="${g.id}:${k}" min="1" max="5" step="1" value="${dims[k]}" ${ov ? "" : "disabled"}><output>${dims[k]}</output></div>`).join("")}
        <p class="hint small" style="margin:.4rem 0 0">1 is gentlest, 5 is the most to do. Your choice is kept exactly.</p>
      </details></div></article>`);
  };
  setMain(`<div class="page"><div class="wrap reveal">
    <header><div class="eyebrow">Library</div><h1>Ten games. Choose any.</h1><p class="lede" style="margin-top:1.2rem">Set speed, challenge and visual detail for each game, or leave it to Halcyon. Sound, motion and session length are in <a href="#/settings">Settings</a>.</p></header>
    <div class="group-head"><h2>Getting to know your pace</h2><span class="muted small">Your first five games</span></div>
    <div class="grid g5">${cat.games.filter((g) => g.phase === "starter").map(card).join("")}</div>
    <div class="group-head"><h2>Adapting to you</h2><span class="muted small">After your first five</span></div>
    <div class="grid g5">${cat.games.filter((g) => g.phase === "adaptive").map(card).join("")}</div>
  </div></div>`);
  $$("[data-auto]").forEach((c) => (c.onchange = () => {
    const id = c.dataset.auto;
    S.update((x) => { x.overrides = x.overrides || {}; if (c.checked) delete x.overrides[id]; else x.overrides[id] = { pace: 2, load: 2, visual: 1 }; });
    viewGames();
  }));
  $$("[data-dim]").forEach((r) => (r.oninput = () => {
    const [id, k] = r.dataset.dim.split(":");
    r.nextElementSibling.textContent = r.value;
    S.update((x) => { x.overrides = x.overrides || {}; x.overrides[id] = { pace: 2, load: 2, visual: 1, ...(x.overrides[id] || {}), [k]: Number(r.value) }; });
  }));
}

// ---- launch / calibrate guide
async function viewPlay(id) {
  if (!need()) return;
  const p = S.active();
  const cat = await S.catalog();
  const g = cat.games.find((x) => x.id === id);
  if (!g) { go("#/games"); return; }
  const mode = p.preferences.movement_mode;
  const steps = g.steps[p.preferences.instructions] || g.steps.steps;
  setMain(`<div class="page"><div class="wrap onb reveal">
    <aside><img src="/img/games/${g.id}.png" alt="" style="aspect-ratio:704/240;object-fit:cover"><p class="small muted">${esc(g.tagline)}</p></aside>
    <div>
      <header><div class="eyebrow">${esc(g.skill)}</div><h1>${esc(g.name)}</h1></header>
      <div class="panel" style="margin-bottom:1.6rem">
        <h3 style="font-size:1.5rem;margin-bottom:1rem">How to play</h3>
        ${typeof steps === "string" ? `<p style="font-size:1.25rem;margin:0">${esc(steps)}</p>` : `<ol class="checks" style="margin:0">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`}
      </div>
      <fieldset><legend>Movement for this session</legend>${choices("movement_mode", mode, [["hands", "Hands, seated", ""], ["pose", "Whole body", ""], ["none", "No camera", ""]])}</fieldset>
      <div class="panel" style="margin-bottom:1.6rem"><h3 style="font-size:1.5rem;margin-bottom:.4rem">Before you start</h3>
        <ol class="checks"><li>Place the camera so it can see your upper body. A hand-width of space around you is plenty.</li><li>Light in front of you, rather than behind, helps tracking.</li><li>Sit or stand however is comfortable. A short <b>calibration</b> in the game window finds your comfortable range.</li><li>You can switch to mouse, touch or keyboard at any moment, and pause or take a break with Esc.</li></ol>
        <div class="callout">The camera is used only to follow your hand or body live. Video is never saved or sent anywhere.</div></div>
      <div id="stat" class="status" role="status"><span class="dot"></span><span>Checking the game connection…</span></div>
      <div class="nav-row"><a class="btn quiet" href="#/games">Back</a><button class="btn" id="launch">Open the game window</button></div>
      <p class="small muted" id="fallback" hidden style="margin-top:1.4rem">The local game server isn't running, so the website can't open the window. From the <code>halcyon</code> folder run <code>python run.py</code>, or start the game directly: <code>cd game</code> then <code>python -m halcyon_game --game ${g.id}</code>.</p>
    </div></div></div>`);
  $$('input[name="movement_mode"]').forEach((i) => (i.onchange = () => S.update((x) => { x.preferences.movement_mode = i.value; })));
  const stat = async () => {
    const r = await S.api("/api/status");
    const el = $("#stat");
    if (!el) return;
    if (!r) { el.innerHTML = '<span class="dot warn"></span><span>Not connected to the local game server.</span>'; $("#fallback").hidden = false; $("#launch").disabled = true; return; }
    $("#fallback").hidden = true; $("#launch").disabled = false;
    el.innerHTML = r.game_running ? '<span class="dot ok"></span><span>The game window is open. Calibration comes first if you chose movement.</span>' : '<span class="dot ok"></span><span>Ready. Opening the game starts a calm calibration step if you chose movement.</span>';
  };
  await stat();
  const iv = setInterval(stat, 2500);
  cleanup.push(() => clearInterval(iv));
  $("#launch").onclick = async () => {
    const m = S.active().preferences.movement_mode;
    const r = await S.post("/api/launch", { game: g.id, movement: m });
    $("#stat").innerHTML = r?.ok ? '<span class="dot ok"></span><span>Opening the game window… it may take a few seconds. Esc pauses at any time.</span>' : '<span class="dot warn"></span><span>Couldn\'t open the game window. Check the terminal running run.py.</span>';
  };
}

// ---- progress
function levelChart(sessions) {
  const W = 640, H = 260, L = 40, R = 16, T = 18, B = 34;
  const n = sessions.length;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + ((5 - v) * (H - T - B)) / 4;
  const lv = sessions.map((s) => (s.dims ? (s.dims.pace + s.dims.load + s.dims.visual) / 3 : s.level_f || 2));
  const grid = [1, 2, 3, 4, 5].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e6dfcf"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("");
  const path = lv.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const dots = lv.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" fill="${sessions[i].phase === "starter" ? "#fcf9f3" : "#2b6e6a"}" stroke="#2b6e6a" stroke-width="2"/>`).join("");
  const xs = lv.map((_, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${i + 1}</text>`).join("");
  const split = sessions.findIndex((s) => s.phase === "adaptive");
  const line = split > 0 ? `<line x1="${(x(split - 1) + x(split)) / 2}" x2="${(x(split - 1) + x(split)) / 2}" y1="${T}" y2="${H - B}" stroke="#7b8087" stroke-dasharray="3 5"/><text x="${(x(split - 1) + x(split)) / 2 + 8}" y="${T + 10}">starting level chosen</text>` : "";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average difficulty setting across your sessions, from 1 to 5">${grid}${line}<path d="${path}" fill="none" stroke="#2b6e6a" stroke-width="2.5" stroke-linejoin="round"/>${dots}${xs}<text x="${W / 2}" y="${H}" text-anchor="middle" dy="-0">game number</text></svg>`;
}

async function viewProgress() {
  if (!need()) return;
  const p = S.active();
  const cat = await S.catalog();
  const real = await S.progress();
  const prog = real || (p.guest ? S.sampleProgress(cat) : null);
  const byId = Object.fromEntries(cat.games.map((g) => [g.id, g]));
  if (!prog) {
    setMain(`<div class="page"><div class="wrap reveal"><header><div class="eyebrow">Progress</div><h1>Nothing here yet.</h1><p class="lede" style="margin-top:1.2rem">Play a game and a simple picture of what you've practised will appear here.</p></header><a class="btn" href="#/home">Choose a game</a></div></div>`);
    return;
  }
  const ss = prog.sessions;
  const skills = {};
  ss.forEach((s) => { const k = byId[s.game]?.skill || s.game; skills[k] = (skills[k] || 0) + 1; });
  const maxSk = Math.max(1, ...Object.values(skills));
  const diffWord = { pace: "speed", load: "challenge", visual: "visual detail" };
  setMain(`<div class="page"><div class="wrap reveal">
    <header><div class="eyebrow">Progress</div><h1>What you've practised.</h1></header>
    ${prog.sample ? `<div class="callout warm" style="margin-bottom:2rem">Sample content for the guest preview. <a href="#/onboarding">Create a profile</a> to see your own.</div>` : ""}
    <div class="callout" style="margin-bottom:2rem">This shows game practice and the settings we chose, not intelligence, ability or any health condition. Games adapt to be comfortable; a higher setting isn't a better person.</div>
    <div class="stats"><div><b>${prog.completed_count ?? ss.length}</b><span>games played</span></div><div><b>${Object.keys(skills).length}</b><span>different skills practised</span></div><div><b>${prog.estimate?.done ? prog.estimate.level + " / 5" : Math.min(5, prog.completed_count || 0) + " of 5"}</b><span>${prog.estimate?.done ? "starting level" : "starter games played"}</span></div></div>
    <div class="two">
      <div class="panel"><h3 style="font-size:1.5rem;margin-bottom:.4rem">Settings over time</h3><p class="hint">The average of speed, challenge and visual detail for each game. Hollow points are starter games.</p>${levelChart(ss)}</div>
      <div class="panel"><h3 style="font-size:1.5rem;margin-bottom:1rem">Skills practised</h3><div class="bars">${Object.entries(skills).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><i><b style="width:${(v / maxSk) * 100}%"></b></i><span class="muted">${v}×</span></div>`).join("")}</div></div>
    </div>
    <div class="panel" style="margin-top:1.6rem"><h3 style="font-size:1.5rem;margin-bottom:1rem">Recent games</h3><div class="tablewrap"><table><thead><tr><th>When</th><th>Game</th><th>Rounds</th><th>Steady</th><th>What changed</th><th>Played with</th></tr></thead><tbody>
      ${[...ss].reverse().slice(0, 12).map((s) => `<tr><td>${new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td><td><b>${esc(byId[s.game]?.name || s.game)}</b></td><td>${s.trials}</td><td>${Math.round(s.accuracy * 100)}%</td><td style="max-width:24rem">${s.changed && diffWord[s.changed] ? `${esc(diffWord[s.changed])} ${s.adjustment?.includes("easier") || s.adjustment?.includes("slower") || s.adjustment?.includes("less") || s.adjustment?.includes("calmer") ? "eased" : "stepped up"}` : s.changed === "estimate" ? "Starting level chosen" : "Kept the same"}</td><td>${s.input_mode === "camera" ? "Movement" : "Mouse, touch or keys"}</td></tr>`).join("")}
    </tbody></table></div></div>
    ${prog.sample ? "" : `<div style="margin-top:2rem"><button class="btn danger small" id="clr">Clear my progress</button></div>`}
  </div></div>
  <dialog id="dlg"><h3 style="font-size:1.6rem;margin-bottom:.6rem">Clear your progress?</h3><p>This removes your game history and difficulty settings from this computer. Your profile and preferences stay. It can't be undone.</p><div class="nav-row"><button class="btn quiet" id="no">Keep it</button><button class="btn danger" id="yes">Clear progress</button></div></dialog>`);
  const dlg = $("#dlg");
  $("#clr")?.addEventListener("click", () => dlg.showModal());
  $("#no")?.addEventListener("click", () => dlg.close());
  $("#yes")?.addEventListener("click", async () => { await S.post("/api/clear", { what: "progress" }); dlg.close(); viewProgress(); });
}

// ---- settings
async function viewSettings() {
  if (!need()) return;
  const p = S.active();
  setMain(`<div class="page"><div class="wrap reveal"><header><div class="eyebrow">Settings</div><h1>Make it comfortable.</h1><p class="lede" style="margin-top:1.2rem">Changes save automatically and apply the next time a game opens.</p></header>
    <div class="onb" style="grid-template-columns:minmax(0,1fr)"><form id="sf" style="max-width:52rem">
      ${p.guest ? "" : `<div class="row"><fieldset><label class="lbl" for="nm">Name or nickname</label><input type="text" id="nm" maxlength="30" value="${esc(p.name)}"></fieldset><fieldset><label class="lbl" for="ag">Age</label><select id="ag">${Array.from({ length: 13 }, (_, i) => 5 + i).map((a) => `<option ${a === p.age ? "selected" : ""}>${a}</option>`).join("")}</select></fieldset></div>`}
      ${movementFields(p.preferences)}${comfortFields(p.preferences)}
      <fieldset><legend>Your data</legend><p class="hint">Everything is stored on this computer. Clearing is permanent.</p>
        <div style="display:flex;gap:.8rem;flex-wrap:wrap"><button type="button" class="btn danger small" id="clrp">Clear game progress</button><button type="button" class="btn danger small" id="wipe">Delete this profile and all local data</button></div></fieldset>
    </form></div></div></div>
    <dialog id="dlg"><h3 id="dt" style="font-size:1.6rem;margin-bottom:.6rem"></h3><p id="dp"></p><div class="nav-row"><button class="btn quiet" id="no">Cancel</button><button class="btn danger" id="yes">Confirm</button></div></dialog>`);
  const form = $("#sf");
  const save = () => S.update((x) => { x.preferences = readPrefs(form, x.preferences); if (!x.guest) { x.name = $("#nm").value.trim() || x.name; x.age = Number($("#ag").value); } applyPrefs(); });
  form.addEventListener("change", save);
  $('input[name="volume"]').addEventListener("input", (e) => { e.target.nextElementSibling.textContent = Math.round(e.target.value * 100); save(); });
  const dlg = $("#dlg");
  let act = null;
  const ask = (t, d, f) => { $("#dt").textContent = t; $("#dp").textContent = d; act = f; dlg.showModal(); };
  $("#no").onclick = () => dlg.close();
  $("#yes").onclick = async () => { dlg.close(); await act(); };
  $("#clrp").onclick = () => ask("Clear game progress?", "Removes your game history and difficulty settings. Your profile and preferences stay.", async () => { await S.post("/api/clear", { what: "progress" }); });
  $("#wipe").onclick = () => ask("Delete everything?", "Removes this profile, preferences and progress from this computer. It can't be undone.", async () => { await S.post("/api/clear", { what: "all" }); S.removeProfile(p.id); go("#/"); });
}

// ---- privacy
function viewPrivacy() {
  setMain(`<div class="page"><div class="wrap reveal"><header><div class="eyebrow">Privacy</div><h1>What Halcyon keeps, and what it doesn't.</h1></header>
    <div class="prose">
      <p class="lede">Short version: everything stays on this computer, camera video is never saved, and you can clear it all whenever you like.</p>
      <h2>What is stored</h2>
      <ul><li><b>Profile.</b> The name or nickname, age, optional self-description and preferences that you or a caregiver entered.</li>
      <li><b>Game results.</b> For each game: date, rounds finished, how many were steady, and the speed, challenge and visual-detail settings used, plus short plain-language notes about changes.</li>
      <li><b>Movement range.</b> Four numbers describing the comfortable area you showed during calibration. No pictures.</li></ul>
      <p class="small muted">Stored in this browser and in the <code>halcyon/data</code> folder on this computer.</p>
      <h2>The camera</h2>
      <p>If you choose movement, the camera is used live to follow a hand or your upper body. Frames are analysed in memory and discarded. Video and images are never recorded, saved or sent anywhere, and the camera is never used to identify you. Camera tracking is only used to control the game; when it is uncertain, missed movements are not counted as mistakes.</p>
      <h2>What isn't stored</h2>
      <ul><li>No video, photos or audio.</li><li>No diagnosis, and none is ever inferred from play or from camera data.</li><li>No data is sent to any server, advertiser or analytics service.</li></ul>
      <h2>Your controls</h2>
      <ul><li>Change any preference in <a href="#/settings">Settings</a>.</li><li>Clear game progress from <a href="#/progress">Progress</a> or Settings.</li><li>Delete the profile and all local data from Settings.</li></ul>
      <h2>What this is, and isn't</h2>
      <p>Halcyon is a prototype for usability and engagement. It isn't a medical device and doesn't diagnose, treat or assess any condition. Starting levels come from a small number of games and are comfort estimates, not clinical measurements.</p>
    </div></div></div>`);
}

// ----------------------------------------------------------------- router
async function route() {
  cleanup.forEach((f) => f()); cleanup = [];
  const h = (location.hash || "#/").slice(1);
  const [path, arg] = [h.split("/").slice(0, 2).join("/") || "/", h.split("/")[2]];
  applyPrefs();
  renderNav(h);
  renderFoot();
  const views = { "/": viewWelcome, "/signin": viewSignin, "/onboarding": viewOnboarding, "/home": viewHome, "/games": viewGames, "/progress": viewProgress, "/settings": viewSettings, "/privacy": viewPrivacy };
  if (path === "/play") return viewPlay(arg);
  (views[path] || viewWelcome)();
  $main.focus({ preventScroll: true });
}

S.load();
window.addEventListener("hashchange", route);
S.subscribe(() => { applyPrefs(); });
route();
