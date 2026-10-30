// Draws one game and reports each round back. No workflow decisions in here.
//
//   playGame({ host, game, rounds, stepFor, onRound, onDone })
//
//   stepFor(trialsSoFar) -> difficulty step for the next round
//   onRound(trial)       -> called after every round with { step, correct, rt }
//   onDone(trials)       -> called when all rounds are finished
//
// The player can leave with the Back button of the page; a half-played game is
// simply played again from its first round.

import { makeGame, shapeSvg } from "./engines.js";
import * as Sound from "./sound.js";

const $ = (sel, root) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function playGame({ host, game, rounds, stepFor, onRound, onDone, rng = Math.random, tier = 0 }) {
  const inst = makeGame(game, rng);
  const total = inst.rounds(rounds.isTest, rounds.defaults);
  const trials = [];
  let dead = false, timers = [], offKey = null, streak = 0;

  const later = (fn, ms) => { const t = setTimeout(() => { if (!dead) fn(); }, ms); timers.push(t); return t; };
  const stop = () => { dead = true; timers.forEach((t) => (t && t.cancel ? t.cancel() : clearTimeout(t))); offKey && offKey(); host.replaceChildren(); };

  const frame = (i, prompt, body, extra = "") => {
    host.innerHTML = `<div class="play tier${tier}">
      <div class="play-head"><span class="muted small">Round ${i + 1} of ${total}${streak >= 2 ? `<b class="streak"> · ${streak} in a row</b>` : ""}</span><span class="dots" aria-hidden="true">${Array.from({ length: total }, (_, k) => `<i class="${k < i ? "on" : ""}"></i>`).join("")}</span></div>
      <p class="prompt" id="prompt" role="status">${esc(prompt)}</p>${extra}
      <div class="stage" id="stage">${body}</div></div>`;
    return $("#stage", host);
  };

  const timerBar = (ms) => `<div class="timerbar" aria-hidden="true"><i style="animation-duration:${ms}ms"></i></div>`;

  function finishRound(i, step, ok, started, feedback = "") {
    if (dead) return;
    const rt = Math.max(0, Math.round(performance.now() - started));
    const t = { step, correct: !!ok, rt };
    trials.push(t);
    streak = ok ? streak + 1 : 0;
    Sound.chime(!!ok);
    onRound && onRound(t);
    const stage = $("#stage", host);
    if (stage) {
      stage.classList.add(ok ? "right" : "wrong");
      const note = document.createElement("p");
      note.className = "feedback"; note.setAttribute("role", "status");
      note.textContent = feedback || (ok ? "Got it." : "Not quite. On to the next one.");
      stage.appendChild(note);
    }
    later(() => (i + 1 >= total ? onDone(trials) : next(i + 1)), ok ? 650 : 1000);
  }

  // ---------------------------------------------------------------- choice
  function runChoice(i, step, d) {
    let started = 0, locked = false;
    const optHtml = () => `<div class="opts cols${d.cols || d.options.length} ${d.layout || ""} ${d.size || ""}">${d.options.map((o, k) => `<button type="button" class="opt" data-k="${k}" aria-label="Option ${k + 1}"${d.multi ? ' aria-pressed="false"' : ""}><span class="n" aria-hidden="true">${k + 1}</span>${o.html}</button>`).join("")}</div>${d.multi ? `<button type="button" class="btn" id="done">Done</button>` : ""}`;
    const wire = (stage) => {
      started = performance.now();
      stage.querySelectorAll(".opt").forEach((b) => (b.onclick = () => pick(Number(b.dataset.k))));
      const dn = $("#done", stage); if (dn) dn.onclick = submitMulti;
      offKey && offKey();
      const onKey = (e) => { const k = Number(e.key) - 1; if (k >= 0 && k < d.options.length) pick(k); };
      document.addEventListener("keydown", onKey); offKey = () => document.removeEventListener("keydown", onKey);
    };
    const pick = (k) => {
      if (locked || dead) return;
      const stage = $("#stage", host);
      if (d.multi) { const b = stage.querySelectorAll(".opt")[k]; b.classList.toggle("picked"); b.setAttribute("aria-pressed", b.classList.contains("picked")); return; }
      locked = true; offKey && offKey(); offKey = null;
      stage.querySelectorAll(".opt").forEach((b, j) => { b.disabled = true; if (j === d.answer) b.classList.add("is-right"); else if (j === k) b.classList.add("is-wrong"); });
      finishRound(i, step, k === d.answer, started);
    };
    // memory basket: pick everything that was shown, then press Done
    const submitMulti = () => {
      if (locked || dead) return; locked = true; offKey && offKey(); offKey = null;
      const stage = $("#stage", host), opts = [...stage.querySelectorAll(".opt")];
      const chosen = opts.map((b, j) => (b.classList.contains("picked") ? j : -1)).filter((j) => j >= 0);
      const hits = chosen.filter((j) => d.answers.includes(j)).length, extra = chosen.length - hits;
      opts.forEach((b, j) => { b.disabled = true; if (d.answers.includes(j)) b.classList.add(b.classList.contains("picked") ? "is-right" : "is-missed"); else if (b.classList.contains("picked")) b.classList.add("is-wrong"); });
      const dn = $("#done", stage); if (dn) dn.disabled = true;
      const ok = hits === d.answers.length && extra <= (d.allowed || 0);
      finishRound(i, step, ok, started, ok ? "You remembered them all." : `You found ${hits} of ${d.answers.length}${extra ? ` and picked ${extra} that ${extra === 1 ? "was" : "were"} not there` : ""}.`);
    };
    const banner = d.banner ? `<p class="banner">${esc(d.banner)}</p>` : "";
    const stim = (h, cls = "") => (h ? `<div class="stim ${cls}">${h}</div>` : "");
    const showOptions = () => {
      const stage = frame(i, d.ask || d.prompt, `${banner}${d.showMs && d.after ? stim(d.after) : d.showMs ? "" : stim(d.stimulus)}${optHtml()}`);
      wire(stage);
    };
    const run = async () => {
      if (d.preface) {
        for (const h of d.preface) {
          frame(i, d.prefaceCaption || "Remember", stim(h)); await sleep(1100); if (dead) return;
        }
      }
      if (d.showMs) {
        // the shrinking bar shows how long the study time lasts
        frame(i, d.prompt, `${banner}${stim(d.stimulus)}`, timerBar(d.showMs));
        // delayed recall: a short distraction fills the gap before the question
        later(d.delayMs ? () => { frame(i, d.delayText, `<div class="stim"><span class="tx huge">…</span></div>`, timerBar(d.delayMs)); later(showOptions, d.delayMs); } : showOptions, d.showMs);
      } else {
        const stage = frame(i, d.prompt, `${banner}${stim(d.stimulus)}${optHtml()}`);
        wire(stage);
      }
    };
    run();
  }

  // -------------------------------------------------------------- sequence
  function runSequence(i, step, d) {
    const padHtml = (p, k) => `<button type="button" class="pad ${d.layout}" data-id="${esc(p.id)}" ${d.layout === "scatter" ? `style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%"` : ""} disabled aria-label="${esc(p.id)}">${p.html}</button>`;
    const stage = frame(i, d.prompt, `<div class="centre" id="centre" aria-live="polite"></div><div class="pads ${d.layout}" id="pads">${d.pads.map(padHtml).join("")}</div>`);
    const pads = [...stage.querySelectorAll(".pad")], centre = $("#centre", stage);
    const byId = (id) => pads.find((p) => p.dataset.id === id);
    let k = 0, started = 0, done = false;
    const showNext = () => {
      if (k >= d.items.length) { centre.textContent = ""; $("#prompt", host).textContent = d.ask; pads.forEach((p) => (p.disabled = false)); started = performance.now(); return; }
      const id = d.items[k++], pad = byId(id);
      if (d.centre) { centre.innerHTML = pad.innerHTML; } else { pad.classList.add("lit"); Sound.tone(Sound.padFreq(pads.indexOf(pad)), Math.min(d.onMs, 420)); }
      later(() => { pad.classList.remove("lit"); centre.textContent = ""; later(showNext, 260); }, d.onMs);
    };
    later(showNext, 700);
    let got = 0;
    pads.forEach((p) => (p.onclick = () => {
      if (done || p.disabled) return;
      p.classList.add("lit"); later(() => p.classList.remove("lit"), 200);
      if (!d.centre) Sound.tone(Sound.padFreq(pads.indexOf(p)), 220);
      if (p.dataset.id !== d.expected[got]) { done = true; pads.forEach((x) => (x.disabled = true)); return finishRound(i, step, false, started, "That was a different one."); }
      got++;
      if (got === d.expected.length) { done = true; pads.forEach((x) => (x.disabled = true)); finishRound(i, step, true, started, "Every one in the right order."); }
    }));
  }

  // ----------------------------------------------------------------- order
  // In order (d.anyOrder false) the targets must be tapped one after another; in a search (anyOrder) every
  // target must be found in any order. Wrong taps are counted; a round is right with at most d.allowed of them.
  function runOrder(i, step, d) {
    const stage = frame(i, d.prompt, `<div class="field big">${d.targets.map((t) => `<button type="button" class="target ${t.cls}" data-id="${esc(t.id)}" style="left:${t.x.toFixed(1)}%;top:${t.y.toFixed(1)}%">${t.html}</button>`).join("")}</div>`);
    const started = performance.now(), allowed = d.allowed || 0; let got = 0, mistakes = 0, done = false;
    stage.querySelectorAll(".target").forEach((b) => (b.onclick = () => {
      if (done || b.classList.contains("hit")) return;
      const right = d.anyOrder ? d.expected.includes(b.dataset.id) : b.dataset.id === d.expected[got];
      if (right) {
        b.classList.add("hit"); got++;
        if (got === d.expected.length) { done = true; const ok = mistakes <= allowed; finishRound(i, step, ok, started, mistakes ? `Found them all, with ${mistakes} wrong ${mistakes === 1 ? "tap" : "taps"}.` : "Found them all."); }
      } else { mistakes++; b.classList.add("shake"); later(() => b.classList.remove("shake"), 300); }
    }));
  }

  // ---------------------------------------------------------------- gonogo
  function runGoNoGo(i, step, d) {
    const stage = frame(i, d.prompt, `<button type="button" class="gng" id="gng" aria-label="Tap area"><span class="ready">Get ready</span></button>`);
    const btn = $("#gng", stage); let started = 0, shown = false, tapped = false, over = false;
    later(() => {
      shown = true; btn.innerHTML = d.stim.html; btn.classList.add("live"); started = performance.now();
      later(() => {
        if (over) return; over = true; btn.disabled = true;
        const ok = d.stim.go ? tapped : !tapped;
        finishRound(i, step, ok, started, ok ? (d.stim.go ? "Quick tap." : "Well waited.") : d.stim.go ? "That one needed a tap." : "That one needed a wait.");
      }, d.windowMs);
    }, d.waitMs);
    btn.onclick = () => { if (shown && !over) { tapped = true; btn.classList.add("tapped"); } };
  }

  // ----------------------------------------------------------------- pairs
  function runPairs(i, step, d) {
    const stage = frame(i, d.prompt, `<div class="cards cols${d.cols}">${d.cards.map((c, k) => `<button type="button" class="card-f" data-k="${k}" aria-label="Hidden card ${k + 1}"><span class="back"></span><span class="face">${c.html}</span></button>`).join("")}</div>`);
    const els = [...stage.querySelectorAll(".card-f")], started = performance.now();
    let open = [], matched = 0, mism = 0, busy = false;
    els.forEach((el) => (el.onclick = () => {
      if (busy || el.classList.contains("up") || el.classList.contains("done")) return;
      el.classList.add("up"); open.push(el);
      if (open.length < 2) return;
      const [a, b] = open, same = d.cards[a.dataset.k].pair === d.cards[b.dataset.k].pair; busy = true;
      if (same) { a.classList.add("done"); b.classList.add("done"); open = []; busy = false; matched++; if (matched === d.pairs) finishRound(i, step, mism <= d.maxMismatch, started, mism <= d.maxMismatch ? `All pairs found with ${mism} wrong tries.` : `All pairs found, after ${mism} wrong tries.`); }
      else { mism++; later(() => { a.classList.remove("up"); b.classList.remove("up"); open = []; busy = false; }, 900); }
    }));
  }

  // ---------------------------------------------------------------- timing
  function runTiming(i, step, d) {
    const stage = frame(i, d.prompt, `<div class="track"><span class="zone" style="left:${d.zone[0] * 100}%;width:${(d.zone[1] - d.zone[0]) * 100}%"></span><span class="mover${d.icon ? " icon" : ""}" id="mover">${d.icon || ""}</span></div><button type="button" class="btn stopbtn" id="stop">Stop</button>`);
    const mover = $("#mover", stage), t0 = performance.now(); let raf = 0, done = false;
    const pos = () => { const ph = ((performance.now() - t0) / d.periodMs) % 2; return ph < 1 ? ph : 2 - ph; };
    const tick = () => {
      if (done || dead) return;
      mover.style.left = `${pos() * 100}%`;
      if (performance.now() - t0 > d.periodMs * 2 * d.maxPasses) { done = true; return finishRound(i, step, false, t0, "The bus drove past."); }
      raf = requestAnimationFrame(tick);
    };
    tick();
    $("#stop", stage).onclick = () => { if (done) return; done = true; cancelAnimationFrame(raf); const p = pos(); mover.style.left = `${p * 100}%`; const ok = p >= d.zone[0] && p <= d.zone[1]; finishRound(i, step, ok, t0, ok ? "Right on the stop." : "Just missed the stop."); };
    timers.push({ cancel: () => cancelAnimationFrame(raf) });
  }

  // ------------------------------------------------------------------ grid
  function runGrid(i, step, d) {
    const cells = Array.from({ length: d.size * d.size }, (_, k) => `<button type="button" class="gcell" data-k="${k}" disabled aria-label="Square ${k + 1}"></button>`).join("");
    const stage = frame(i, d.prompt, `<div class="gridsq" style="grid-template-columns:repeat(${d.size},1fr)">${cells}</div>`);
    const els = [...stage.querySelectorAll(".gcell")];
    d.lit.forEach((k) => els[k].classList.add("lit"));
    let started = 0, got = new Set(), done = false;
    later(() => {
      els.forEach((e) => { e.classList.remove("lit"); e.disabled = false; }); $("#prompt", host).textContent = d.ask; started = performance.now();
    }, d.showMs);
    els.forEach((el) => (el.onclick = () => {
      if (done || el.disabled) return; const k = Number(el.dataset.k);
      if (!d.lit.includes(k)) { done = true; el.classList.add("bad"); els.forEach((e) => (e.disabled = true)); d.lit.forEach((j) => els[j].classList.add("lit")); return finishRound(i, step, false, started, "That square was not lit."); }
      got.add(k); el.classList.add("lit");
      if (got.size === d.lit.length) { done = true; els.forEach((e) => (e.disabled = true)); finishRound(i, step, true, started, "You found them all."); }
    }));
  }

  // -------------------------------------------------------------- reaction
  function runReaction(i, step, d) {
    const stage = frame(i, d.prompt, `<button type="button" class="gng" id="gng" aria-label="Tap area"><span class="ready">Wait…</span></button>`);
    const btn = $("#gng", stage); let started = 0, live = false, done = false;
    const wait = later(() => { live = true; btn.innerHTML = d.html; btn.classList.add("live"); started = performance.now(); later(() => { if (!done) { done = true; finishRound(i, step, false, started, "Too slow this time."); } }, d.limitMs); }, d.waitMs);
    btn.onclick = () => {
      if (done) return; done = true; clearTimeout(wait);
      if (!live) return finishRound(i, step, false, performance.now(), "That was too early. Wait for the star.");
      finishRound(i, step, true, started, "Quick tap.");
    };
  }

  const RUN = { choice: runChoice, sequence: runSequence, order: runOrder, gonogo: runGoNoGo, pairs: runPairs, timing: runTiming, grid: runGrid, reaction: runReaction };

  function next(i) {
    if (dead) return;
    const step = stepFor(trials), d = inst.trial(i, step);
    RUN[d.kind](i, step, d);
  }
  next(0);
  return { stop, get trials() { return trials; } };
}

export { shapeSvg };
