// Paint the Path inside the page. Trace a dotted path with your fingertip (camera), a mouse or a finger,
// from the glowing start to the star. The rules are in tracepath.js.
//
//   mountPaintPath(host, { session: { level, tier, steps }, onContinue(trials, summary) })
//
// In the daily list it is one scored game of two shapes; each shape becomes 10 right / wrong "stretches".
import { createShell, COL, FONT, star } from "./moveshell.js";
import { buildShape, LEVEL_SHAPES, SHAPES, ARENA, secondsFor, toleranceFor, STRETCHES } from "./tracepath.js";
import { icon } from "./icons.js";
import { esc } from "./report.js";

const starSvg = (on) => `<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><polygon points="12,1.8 15,8.6 22.4,9.3 16.8,14.1 18.5,21.3 12,17.5 5.5,21.3 7.2,14.1 1.6,9.3 9,8.6" fill="${on ? "#e8b923" : "#d9d0bd"}"/></svg>`;
const stars = (n) => `<span class="fc-stars" role="img" aria-label="${n} of 3 stars">${[1, 2, 3].map((k) => starSvg(k <= n)).join("")}</span>`;

export function mountPaintPath(host, { session, onContinue = () => {}, tracker, useCamera = true } = {}) {
  const level = session.level, tier = session.tier, shapes = LEVEL_SHAPES[level], seconds = secondsFor(level, tier);
  const shell = createShell(host, {
    width: ARENA.width, height: ARENA.height, tracker, useCamera,
    hud: { left: "Points", mid: "seconds", right: "Shape", aria: "Paint the Path playing area. Trace the dotted line with your fingertip, a mouse or a finger." },
    help: "Put your fingertip on the glowing start, then follow the dotted line to the star. With a mouse, move it along the line. On a touch screen, drag a finger along it.",
  });
  const S = { idx: 0, shape: null, left: seconds, points: 0, results: [], trials: [], camera: false, pulse: 0, lastEv: null, flash: 0 };

  const hud = () => shell.hud({
    left: S.points, mid: Math.ceil(S.left), bar: S.left / seconds, low: S.left <= 8, right: `${Math.min(S.idx + 1, shapes.length)} of ${shapes.length}`,
  });

  function begin() {
    S.idx = 0; S.points = 0; S.results = []; S.trials = []; loadShape();
  }
  function loadShape() {
    const id = shapes[S.idx];
    S.shape = { id, ...buildShape(id, toleranceFor(id, tier)) }; S.left = seconds;
    shell.setPhase("play"); shell.overlay(""); shell.canvas.focus({ preventScroll: true });
    shell.say(`${SHAPES[id].title}. ${SHAPES[id].hint}`); hud();
  }

  function endShape(timedOut) {
    const t = S.shape.tracer, r = t.result(1);
    S.results.push({ shape: S.shape.id, ...r, timedOut });
    S.points += r.points; S.trials.push(...t.trials(session.steps || [1, 2]));
    const last = S.idx + 1 >= shapes.length;
    shell.setPhase("between"); hud();
    if (last) shell.cam.disable("round finished");
    shell.overlay(`<div class="fc-card"><div class="eyebrow">${esc(SHAPES[S.shape.id].title)}</div><h2>${esc(r.label)}</h2>
      ${stars(r.stars)}
      <div class="fc-big"><span>${r.accuracy}%</span><small>tracing accuracy</small></div>
      <p class="fc-note">${r.completion}% of the path followed${timedOut ? " (time ran out)" : ""} · ${r.points} points</p>
      <button class="btn lg" id="mv-next" type="button">${last ? "See the result" : "Next shape"}${icon("arrow", 18)}</button></div>`);
    shell.overlay().querySelector("#mv-next").onclick = () => (last ? result() : (S.idx += 1, loadShape()));
  }

  function result() {
    shell.setPhase("over");
    const total = S.results.reduce((a, r) => a + r.stars, 0), avg = Math.round(S.results.reduce((a, r) => a + r.accuracy, 0) / S.results.length);
    const right = S.trials.filter((t) => t.correct).length, pathAcc = Math.round((100 * right) / S.trials.length);
    const summary = { points: S.points, stars: total, maxStars: 3 * shapes.length, accuracy: avg, pathAccuracy: pathAcc, shapes: S.results, camera: S.camera };
    shell.overlay(`<div class="fc-card"><div class="eyebrow">Round finished</div><h2>Paint the Path</h2>
      <div class="fc-big"><span>${pathAcc}%</span><small>of the path traced well</small></div>
      <table class="fc-table"><tbody>${S.results.map((r) => `<tr><td>${esc(SHAPES[r.shape].title)}</td><td>${stars(r.stars)}</td><td>${r.accuracy}%</td><td>${r.points} pts</td></tr>`).join("")}</tbody></table>
      <p class="fc-note">${S.points} points · ${total} of ${3 * shapes.length} stars</p>
      <button class="btn lg" id="mv-done" type="button">Continue${icon("arrow", 18)}</button></div>`);
    shell.overlay().querySelector("#mv-done").onclick = () => onContinue(S.trials, summary);
  }

  shell.onUpdate = (dt, cur) => {
    const t = S.shape.tracer;
    if (!cur) { shell.say(shell.cam.on ? "Hand not found. Hold your fingertip up in front of the camera." : "Move the mouse onto the field, or touch it with a finger."); return; }
    S.left -= dt;
    S.lastEv = t.update([cur.x, cur.y]);
    if (S.lastEv.started) shell.say("Good. Now follow the dotted line to the star.");
    S.flash = t.offPath ? 1 : Math.max(0, S.flash - dt * 3);
    hud();
    if (t.done) endShape(false); else if (S.left <= 0) { S.left = 0; endShape(true); }
  };

  shell.onDraw = (ctx, cur) => {
    const W = ARENA.width, H = ARENA.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.ivory; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(214,205,188,.5)"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (!S.shape) return;
    const { path, tracer } = S.shape, pts = path.points;
    S.pulse += 0.06;
    const line = (arr, width, style, dash) => {
      ctx.beginPath(); arr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineWidth = width; ctx.strokeStyle = style; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    };
    line(pts, tracer.tolerance * 2, "rgba(43,110,106,.09)");                  // the corridor to stay inside
    line(pts, 6, COL.line, [2, 14]);                                        // the dotted path
    if (tracer.started && tracer.index > 0) line(pts.slice(0, tracer.index + 1), 11, COL.teal);   // what has been traced
    const [sx, sy] = path.start, [ex, ey] = path.end;
    if (!tracer.started) {                                                   // glowing start
      const r = 20 + Math.sin(S.pulse) * 4;
      ctx.beginPath(); ctx.arc(sx, sy, r + 8, 0, Math.PI * 2); ctx.fillStyle = "rgba(232,185,35,.25)"; ctx.fill();
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fillStyle = COL.amber; ctx.fill();
      ctx.fillStyle = COL.ink; ctx.font = FONT(18); ctx.textAlign = "center"; ctx.fillText("START", sx, sy - r - 14);
    }
    const closed = Math.hypot(ex - sx, ey - sy) < 40;                         // circle and crown end where they start
    if (!closed || tracer.started) star(ctx, ex, ey, 30 + Math.sin(S.pulse * 1.3) * 2, COL.amber);
    if (cur) {                                                               // the fingertip
      ctx.beginPath(); ctx.arc(cur.x, cur.y, 20, 0, Math.PI * 2); ctx.fillStyle = tracer.offPath ? "rgba(166,74,58,.25)" : "rgba(43,110,106,.25)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cur.x, cur.y, 11, 0, Math.PI * 2); ctx.fillStyle = tracer.offPath ? COL.clay : COL.teal; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
    } else if (shell.phase === "play") {
      ctx.fillStyle = "rgba(246,241,231,.8)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COL.ink; ctx.font = FONT(30); ctx.textAlign = "center"; ctx.fillText(shell.cam.on ? "Hand not found" : "Move onto the field to start", W / 2, H / 2);
    }
  };

  hud();
  shell.readyCard({
    title: "Paint the Path",
    text: "Trace the dotted path with your fingertip, from the glowing start to the star, and stay close to the line.",
    facts: `<b>${shapes.length} shapes</b> · ${seconds} seconds each · ${STRETCHES} stretches per shape are scored`,
    onStart: ({ camera }) => { S.camera = camera; begin(); },
  });
  return { shell, state: S, destroy: () => shell.destroy() };
}
