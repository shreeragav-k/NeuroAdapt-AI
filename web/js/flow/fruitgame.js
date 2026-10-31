// Fruit Catcher inside the page: a canvas for the playing field, small HTML pieces for the score,
// the camera preview and the cards. Controls: your hand (camera), the arrow keys / A S D, or the mouse and touch
// (left, middle or right third of the field). The rules are in fruitcatcher.js.
import { Round, DURATIONS, LAYOUT, STEP, LIVES, laneFromX, laneFromPointer } from "./fruitcatcher.js";
import { startHandTracking } from "./handtrack.js";
import { createCamera, cameraSupported } from "./camera.js";
import { icon } from "./icons.js";

const IMG = "img/fruit/";
const BEST_KEY = "neuroadapt:fruit:best";
const COL = { ivory: "#f6f1e7", stone: "#eae3d5", line: "#d6cdbc", teal: "#2b6e6a", pale: "#d6e6e2", ink: "#181b1f", clay: "#a64a3a" };
const FONT = '600 28px "Hanken Grotesk", "Segoe UI", system-ui, sans-serif';

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const writeBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* storage blocked */ } };
// The sprites are loaded once and kept for every later game. A picture that fails to load is tried again
// (with a fresh URL, in case a bad copy was cached), and while it is missing a plain shape is drawn instead,
// so the field is never empty.
const load = (src, retry = true) => new Promise((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => (retry ? load(`${src}?r=${Date.now()}`, false).then(res) : res(null));
  i.src = src;
});
const ASSETS = { char: null, choc: null, fruit: [], loading: null };
const complete = () => ASSETS.char && ASSETS.choc && ASSETS.fruit.length === 4 && ASSETS.fruit.every(Boolean);
function ensureAssets() {
  if (complete()) return Promise.resolve(ASSETS);
  if (!ASSETS.loading) {
    ASSETS.loading = Promise.all([load(IMG + "character.png"), load(IMG + "chocolate.png"), ...[1, 2, 3, 4].map((n) => load(`${IMG}fruit${n}.png`))])
      .then(([c, ch, ...f]) => { ASSETS.char = c; ASSETS.choc = ch; ASSETS.fruit = f; })
      .finally(() => { ASSETS.loading = null; });
  }
  return ASSETS.loading.then(() => ASSETS);
}
const FRUIT_COLOURS = ["#c0463a", "#9c2f4a", "#4f8a4b", "#d8932f"];

// Options: `session` = { duration, baseSpeed, lives } plays ONE scored round with those settings and then offers
// "Continue" (`onContinue(trials, summary)`), which is how the game appears in the daily list of ten.
// Without it, the game is free play: pick a round length and play as often as you like.
export function mountFruitCatcher(host, { onRound = () => {}, onContinue = () => {}, session = null, useCamera = true, tracker = startHandTracking } = {}) {
  host.innerHTML = `<div class="fc" data-state="ready">
    <div class="fc-hud">
      <div><span class="fc-lab">Score</span><span class="fc-score" id="fc-score">0</span></div>
      <div class="fc-time"><span><b id="fc-secs">${session && session.rounds ? 1 : session ? session.duration : 60}</b> <span class="fc-unit" id="fc-unit">${session && session.rounds ? `of ${session.rounds} rounds` : "seconds"}</span></span><span class="fc-bar" aria-hidden="true"><i id="fc-barfill"></i></span></div>
      <div class="fc-livesbox"><span class="fc-lab">Lives</span><span class="fc-lives" id="fc-lives" role="img" aria-label="${LIVES} lives left">${Array.from({ length: LIVES }, () => "<i></i>").join("")}</span></div>
    </div>
    <div class="fc-stage">
      <canvas class="fc-canvas" id="fc-canvas" width="${LAYOUT.width}" height="${LAYOUT.height}" tabindex="0" aria-label="Fruit Catcher playing area. Use the arrow keys, your hand, or tap the left, middle or right of the area."></canvas>
      <div class="fc-overlay" id="fc-overlay"></div>
      <div class="fc-cam" id="fc-cam" hidden><video id="fc-video" muted playsinline></video><span class="fc-pill" id="fc-pill"><i class="fc-dot"></i>Live · not recorded</span><div class="fc-lanes" id="fc-lanes"><i>Left</i><i>Centre</i><i>Right</i></div><button class="fc-camoff" id="fc-camoff" type="button">Turn camera off</button></div>
    </div>
    <p class="fc-help">Move your hand left, centre or right in front of the camera. Or press the arrow keys, or tap the left, middle or right of the field.</p>
    <p class="fc-privacy">${icon("lock", 16)}<span><b>The video is never recorded.</b> The camera picture stays on this device, is read only to find your hand, and is not saved or sent anywhere. It switches off when the game ends. <a href="#/privacy">How this works</a></span></p>
  </div>`;
  const $ = (id) => host.querySelector(`#${id}`);
  const root = host.querySelector(".fc"), canvas = $("fc-canvas"), ctx = canvas.getContext("2d");
  const state = { phase: "ready", duration: session ? session.duration : 60, round: null, camNote: "", manual: null, hand: null, popups: [], acc: 0, last: 0, raf: 0, rounds: 0, dead: false, starting: false };
  const imgs = ASSETS;
  ensureAssets();

  // ------------------------------------------------------------ cards
  const setPhase = (p) => { state.phase = p; root.dataset.state = p; };
  const overlay = (html) => { const o = $("fc-overlay"); o.innerHTML = html; o.hidden = !html; const b = o.querySelector("button.btn"); if (b) b.focus({ preventScroll: true }); };
  function readyCard() {
    setPhase("ready");
    const canCam = useCamera && cameraSupported();
    overlay(`<div class="fc-card">
      <div class="eyebrow">Movement game</div><h2>Fruit Catcher</h2>
      <p>Catch the fruit and let the chocolate fall past. A chocolate costs a life, and the middle lane is always safe.</p>
      ${session ? `<p class="fc-fixed"><b>${session.rounds} rounds</b> · ${session.lives} lives · a fruit and a chocolate fall each round</p>` : `<div class="seg" role="group" aria-label="Round length">${DURATIONS.map((d) => `<button type="button" data-d="${d}" aria-pressed="${d === state.duration}" ${d === state.duration ? 'aria-selected="true"' : ""}>${d} s</button>`).join("")}</div>`}
      <div class="fc-choices">${canCam ? `<button class="btn lg" data-go="cam" type="button">${icon("camera", 18)}Start with camera</button><button class="btn quiet" data-go="plain" type="button">Play without camera</button>` : `<button class="btn lg" data-go="plain" type="button">${icon("play", 18)}Start</button>`}</div>
      <p class="fc-note" id="fc-note" role="status">${canCam ? "Camera: your hand is followed on this device and the video is never recorded. You can also use the arrow keys or tap the field." : "Use the arrow keys or tap the field."}</p>
      <p class="fc-note"><a href="#/privacy">Learn about camera privacy</a></p>
      ${session ? "" : `<p class="fc-best">Best score: ${readBest()}</p>`}</div>`);
    host.querySelectorAll(".fc-card .seg button").forEach((b) => (b.onclick = () => { state.duration = Number(b.dataset.d); host.querySelectorAll(".fc-card .seg button").forEach((x) => { const on = x === b; x.setAttribute("aria-pressed", on); on ? x.setAttribute("aria-selected", "true") : x.removeAttribute("aria-selected"); }); }));
    host.querySelectorAll(".fc-card [data-go]").forEach((b) => (b.onclick = () => { if (b.dataset.go === "cam") cam.enable(); start(); }));   // the camera is only asked for here
  }
  function resultCard(s, isBest) {
    setPhase("over");
    const title = s.ended === "ROUNDS_DONE" ? "All rounds done" : s.ended === "TIME_UP" ? "Time's up" : "No lives left";
    if (session) {
      const total = s.caught + s.hit + s.missed, acc = total ? Math.round((100 * s.caught) / total) : 0;
      overlay(`<div class="fc-card"><div class="eyebrow">Round finished</div><h2>${title}</h2>
        <div class="fc-big"><span>${acc}%</span><small>of your moves were right</small></div>
        <p class="fc-note">${s.caught} fruit caught · ${s.missed} missed · ${s.hit} ${s.hit === 1 ? "chocolate" : "chocolates"} touched</p>
        <button class="btn lg" id="fc-next" type="button">Continue${icon("arrow", 18)}</button></div>`);
      $("fc-next").onclick = () => onContinue(state.round.trials(session.steps), s);
      return;
    }
    overlay(`<div class="fc-card"><div class="eyebrow">Round finished</div><h2>${title}</h2>
      ${isBest ? `<span class="badge">New best score</span>` : ""}
      <div class="fc-big"><span>${s.score}</span><small>fruit caught</small></div>
      <p class="fc-note">Best: ${readBest()} · Chocolates hit: ${s.hit} · Fruit missed: ${s.missed}</p>
      <button class="btn lg" id="fc-again" type="button">${icon("play", 18)}Play again</button></div>`);
    $("fc-again").onclick = readyCard;      // asks about the camera again
  }

  // ------------------------------------------------------------ rounds
  function start() {
    state.round = new Round(state.duration, Math.random, LAYOUT, session ? { baseSpeed: session.baseSpeed, lives: session.lives, speedUp: session.speedUp, rounds: session.rounds } : {}); state.popups = []; state.acc = 0; state.manual = null;
    setPhase("play"); overlay(""); canvas.focus({ preventScroll: true }); hud();
  }
  function finish() {
    const r = state.round, s = { ...r.summary(), camera: cam.on };
    cam.disable("round finished");
    const isBest = s.score > readBest(); if (isBest) writeBest(s.score);
    state.rounds += 1; onRound(s); resultCard(s, isBest);
  }

  // ------------------------------------------------------------ the loop
  function frame(ts) {
    if (state.dead) return;
    state.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - state.last) / 1000); state.last = ts;
    if (state.phase === "play" && !document.hidden) {
      const r = state.round, hx = cam.on ? cam.read() : null;
      state.hand = hx === null || hx === undefined ? null : laneFromX(hx);
      state.acc += dt;
      while (state.acc >= STEP && !r.over) {
        state.acc -= STEP;
        for (const e of r.update(STEP, state.hand ?? state.manual)) {
          state.popups.push(e.type === "caught" ? { text: "+1", x: e.x, y: e.y, t: 36, c: COL.teal } : e.type === "hit" ? { text: "Chocolate: one life lost", x: e.x, y: e.y, t: 48, c: COL.clay } : null);
        }
        state.popups = state.popups.filter(Boolean);
      }
      if (r.over) finish();
      hud();
    }
    draw();
  }

  function hud() {
    const r = state.round; if (!r) return;
    $("fc-score").textContent = r.score;
    if (session && session.rounds) {                                           // the daily game counts rounds, not seconds
      const done = Math.min(r.outcomes.length, session.rounds);
      $("fc-secs").textContent = Math.min(done + 1, session.rounds); $("fc-unit").textContent = `of ${session.rounds} rounds`;
      $("fc-barfill").style.width = `${(100 * done) / session.rounds}%`;
    } else { $("fc-secs").textContent = r.remaining; $("fc-barfill").style.width = `${(100 * r.remaining) / r.duration}%`; $("fc-barfill").classList.toggle("low", r.remaining <= 5); }
    const lives = $("fc-lives"); [...lives.children].forEach((el, i) => el.classList.toggle("lost", i >= r.lives)); lives.setAttribute("aria-label", `${r.lives} lives left`);
    [...$("fc-lanes").children].forEach((el, i) => el.classList.toggle("on", i === r.lane));
  }

  function draw() {
    const L = LAYOUT, r = state.round;
    ctx.clearRect(0, 0, L.width, L.height); ctx.fillStyle = COL.ivory; ctx.fillRect(0, 0, L.width, L.height);
    const active = r ? r.lane : 1, laneW = L.charW + 90;
    L.laneX.forEach((cx, i) => {
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - laneW / 2, -20, laneW, L.height + 40, 22); else ctx.rect(cx - laneW / 2, -20, laneW, L.height + 40);
      ctx.fillStyle = i === active && r ? "rgba(214,230,226,.7)" : "rgba(234,227,213,.55)"; ctx.fill();
      ctx.lineWidth = i === active && r ? 2 : 1; ctx.strokeStyle = i === active && r ? COL.teal : COL.line; ctx.stroke();
    });
    if (!r) return;
    const shadow = (cx, cy, w, h, a) => { ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(30,28,24,${a})`; ctx.fill(); };
    const fx = L.laneX[r.fruit.lane] - L.item / 2, cxp = L.laneX[r.choc.lane] - L.item / 2;
    shadow(fx + L.item / 2, r.fruit.y + L.item - 8, L.item - 24, 18, 0.16); shadow(cxp + L.item / 2, r.choc.y + L.item - 8, L.item - 24, 18, 0.16);
    const sheet = imgs.fruit[r.fruit.kind];
    if (sheet) { ctx.imageSmoothingEnabled = false; const frames = Math.max(1, Math.floor(sheet.width / sheet.height)); ctx.drawImage(sheet, (Math.floor(r.frame / 3) % frames) * sheet.height, 0, sheet.height, sheet.height, fx, r.fruit.y, L.item, L.item); ctx.imageSmoothingEnabled = true; }
    else { ctx.beginPath(); ctx.arc(fx + L.item / 2, r.fruit.y + L.item / 2, L.item * 0.36, 0, Math.PI * 2); ctx.fillStyle = FRUIT_COLOURS[r.fruit.kind % 4]; ctx.fill(); }
    if (imgs.choc) ctx.drawImage(imgs.choc, cxp, r.choc.y, L.item, L.item);
    else { ctx.fillStyle = "#5b3a29"; ctx.fillRect(cxp + L.item * 0.2, r.choc.y + L.item * 0.18, L.item * 0.6, L.item * 0.64); }
    shadow(r.charX, L.charTop + L.charH - 6, L.charW - 10, 24, 0.2);
    if (imgs.char) ctx.drawImage(imgs.char, r.charX - L.charW / 2, L.charTop, L.charW, L.charH);
    else { ctx.fillStyle = COL.teal; ctx.fillRect(r.charX - L.charW * 0.3, L.charTop + L.charH * 0.4, L.charW * 0.6, L.charH * 0.6); ctx.beginPath(); ctx.arc(r.charX, L.charTop + L.charH * 0.26, L.charW * 0.24, 0, Math.PI * 2); ctx.fillStyle = "#e3c4a0"; ctx.fill(); }
    ctx.font = FONT; ctx.textAlign = "center";
    for (const p of state.popups) { p.y -= 2; p.t -= 1; ctx.globalAlpha = Math.max(0, Math.min(1, p.t / 28)); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y); }
    ctx.globalAlpha = 1; state.popups = state.popups.filter((p) => p.t > 0);
  }

  // ------------------------------------------------------------ input
  const KEYS = { ArrowLeft: 0, a: 0, A: 0, ArrowDown: 1, ArrowUp: 1, s: 1, S: 1, w: 1, W: 1, ArrowRight: 2, d: 2, D: 2 };
  const onKey = (e) => {
    if (e.key in KEYS && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement)) { state.manual = KEYS[e.key]; if (state.phase === "play") e.preventDefault(); }
  };
  const pointer = (e) => { const b = canvas.getBoundingClientRect(); state.manual = laneFromPointer((e.clientX - b.left) / b.width); };
  window.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", pointer); canvas.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType === "touch") pointer(e); });
  canvas.style.touchAction = "none";

  // ------------------------------------------------------------ camera (only after the player chooses it)
  const cam = createCamera({
    panel: { box: $("fc-cam"), video: $("fc-video") }, tracker,
    onNote: (t) => { state.camNote = t; const n = $("fc-note"); if (n) n.textContent = t; },
  });
  $("fc-camoff").onclick = () => { cam.disable("player turned the camera off"); state.hand = null; state.camNote = "The camera is off. Use the arrow keys or tap the field."; const n = $("fc-note"); if (n) n.textContent = state.camNote; };

  readyCard(); draw();
  state.raf = requestAnimationFrame((ts) => { state.last = ts; state.raf = requestAnimationFrame(frame); });

  return {
    get rounds() { return state.rounds; },
    get tracking() { return cam.on; },
    get cam() { return cam; },
    get state() { return state; },
    destroy() {
      state.dead = true; cancelAnimationFrame(state.raf); window.removeEventListener("keydown", onKey);
      cam.destroy();
      host.replaceChildren();
    },
  };
}
