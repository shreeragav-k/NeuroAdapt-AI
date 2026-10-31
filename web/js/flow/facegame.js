// Make a Face inside the page. A face is shown; make the same face in front of the camera and hold it before
// the time runs out. Without the camera, tap the matching face instead. The rules are in expressions.js.
//
//   mountMakeAFace(host, { session: { level, tier, steps }, onContinue(trials, summary) })
//
// The camera picture is read on this device by the face model and never recorded or sent; only a list of
// numbers about the face is used (see facetrack.js).
import { createShell, COL, FONT, roundRect } from "./moveshell.js";
import { startFaceTracking } from "./facetrack.js";
import { EXPRESSIONS, FaceRounds, faceSettings, classify, FACE_ROUNDS } from "./expressions.js";
import { icon } from "./icons.js";

// A face drawn from shapes (no emoji): a round face, eyes, brows and a mouth that change with the expression.
export function drawFace(ctx, id, cx, cy, r, { fill = "#f2dfa4", ink = COL.ink, glow = null } = {}) {
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (glow) { ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill(); }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.045); ctx.strokeStyle = ink; ctx.stroke();
  const u = r / 100, lw = Math.max(2.5, 5.5 * u), eyeY = cy - 18 * u, ex = 34 * u;
  const dot = (x, y, rad) => { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); };
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke(); };
  const arc = (x, y, rad, a0, a1) => { ctx.beginPath(); ctx.arc(x, y, rad, a0, a1); ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke(); };
  const smileMouth = () => arc(cx, cy + 6 * u, 40 * u, 0.15 * Math.PI, 0.85 * Math.PI);
  switch (id) {
    case "SMILE": dot(cx - ex, eyeY, 7 * u); dot(cx + ex, eyeY, 7 * u); arc(cx, cy + 2 * u, 46 * u, 0.12 * Math.PI, 0.88 * Math.PI); break;
    case "SURPRISE":
      arc(cx - ex, eyeY - 24 * u, 16 * u, 1.15 * Math.PI, 1.85 * Math.PI); arc(cx + ex, eyeY - 24 * u, 16 * u, 1.15 * Math.PI, 1.85 * Math.PI);
      dot(cx - ex, eyeY, 9 * u); dot(cx + ex, eyeY, 9 * u); ctx.beginPath(); ctx.ellipse(cx, cy + 40 * u, 17 * u, 24 * u, 0, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); break;
    case "WINK": dot(cx - ex, eyeY, 7 * u); line(cx + ex - 12 * u, eyeY, cx + ex + 12 * u, eyeY); smileMouth(); break;
    case "PUFF":
      dot(cx - ex, eyeY, 7 * u); dot(cx + ex, eyeY, 7 * u);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 62 * u, cy + 24 * u, 26 * u, 0, Math.PI * 2); ctx.fillStyle = "rgba(230,130,110,.45)"; ctx.fill(); }
      line(cx - 14 * u, cy + 36 * u, cx + 14 * u, cy + 36 * u); break;
    case "PUCKER": dot(cx - ex, eyeY, 7 * u); dot(cx + ex, eyeY, 7 * u); ctx.beginPath(); ctx.arc(cx, cy + 38 * u, 13 * u, 0, Math.PI * 2); ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke(); break;
    case "NEUTRAL": dot(cx - ex, eyeY, 7 * u); dot(cx + ex, eyeY, 7 * u); line(cx - 28 * u, cy + 36 * u, cx + 28 * u, cy + 36 * u); break;
    case "ANGRY":
      dot(cx - ex, eyeY + 4 * u, 7 * u); dot(cx + ex, eyeY + 4 * u, 7 * u);
      line(cx - ex - 18 * u, eyeY - 18 * u, cx - ex + 16 * u, eyeY - 6 * u); line(cx + ex + 18 * u, eyeY - 18 * u, cx + ex - 16 * u, eyeY - 6 * u);
      arc(cx, cy + 58 * u, 34 * u, 1.18 * Math.PI, 1.82 * Math.PI); break;
    default: dot(cx - ex, eyeY, 7 * u); dot(cx + ex, eyeY, 7 * u); line(cx - 22 * u, cy + 36 * u, cx + 22 * u, cy + 36 * u);
  }
  ctx.restore();
}

const W = 1000, H = 600;
const starsHtml = (n) => `<span class="fc-stars" role="img" aria-label="${n} of 3 stars">${[1, 2, 3].map((k) => `<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><polygon points="12,1.8 15,8.6 22.4,9.3 16.8,14.1 18.5,21.3 12,17.5 5.5,21.3 7.2,14.1 1.6,9.3 9,8.6" fill="${k <= n ? "#e8b923" : "#d9d0bd"}"/></svg>`).join("")}</span>`;

export function mountMakeAFace(host, { session, onContinue = () => {}, tracker = startFaceTracking, useCamera = true, rng = Math.random } = {}) {
  const settings = faceSettings(session.level, session.tier), steps = session.steps || [1, 2];
  const shell = createShell(host, {
    width: W, height: H, tracker, useCamera, fingertip: false,
    hud: { left: "Points", mid: "seconds", right: "Round", aria: "Make a Face. Make the face you see in front of the camera, or tap the matching face." },
    help: "Make the face you see, in front of the camera, and hold it for a moment. With no camera, tap the face that matches.",
  });
  let game = null, camera = false, seen = null, flash = { text: "", color: COL.teal, t: 0 }, wasDown = false, buttons = [];
  const hud = () => shell.hud({ left: game ? game.points : 0, mid: game ? Math.ceil(game.left) : settings.timer, bar: game ? game.left / settings.timer : 1, low: game ? game.left <= 1.5 : false, right: `${game ? game.round : 1} of ${FACE_ROUNDS}` });

  function begin(withCamera) {
    camera = withCamera; game = new FaceRounds(settings, rng); seen = null; wasDown = true;
    shell.setPhase("play"); shell.overlay(""); shell.canvas.focus({ preventScroll: true }); hud();
    shell.say(withCamera ? "Look at the camera and make the face." : "Tap the face that matches.");
  }
  function finish() {
    shell.setPhase("over"); shell.cam.disable("round finished");
    const right = game.log.filter((l) => l.correct).length, summary = { points: game.points, stars: game.stars, accuracy: game.accuracy, matched: right, rounds: FACE_ROUNDS, camera };
    shell.overlay(`<div class="fc-card"><div class="eyebrow">Round finished</div><h2>${right === FACE_ROUNDS ? "Every face matched!" : "Well done!"}</h2>
      ${starsHtml(game.stars)}
      <div class="fc-big"><span>${right} of ${FACE_ROUNDS}</span><small>faces matched</small></div>
      <p class="fc-note">${game.points} points · ${game.log.map((l) => `${EXPRESSIONS[l.target].label}: ${l.correct ? "matched" : "missed"}`).join(" · ")}</p>
      <button class="btn lg" id="mv-done" type="button">Continue${icon("arrow", 18)}</button></div>`);
    shell.overlay().querySelector("#mv-done").onclick = () => onContinue(game.trials(steps), summary);
  }
  const say = (text, color) => { flash = { text, color, t: 1.4 }; };
  const settle = (res) => {
    if (!res) return;
    say(res === "success" ? "Got it!" : "Time is up", res === "success" ? COL.teal : COL.clay); hud();
    if (game.done) setTimeout(() => { if (!shell.dead && shell.phase === "play") finish(); }, 900);
  };

  shell.onUpdate = (dt, cur) => {
    if (!game || game.done) return;
    flash.t = Math.max(0, flash.t - dt);
    if (shell.cam.on) {
      const b = shell.cam.frame();
      seen = b ? classify(b)[0] : null;
      if (!b) { shell.say("I can't see your face. Look at the camera."); hud(); return; }      // the clock waits
      shell.say(`I see: ${seen === "RESTING" ? "a relaxed face" : EXPRESSIONS[seen].label.toLowerCase()}`);
      settle(game.update(dt, seen));
    } else if (camera && !shell.cam.on && shell.cam.state === "starting") {
      shell.say("Starting the camera. You can also tap the matching face."); seen = null;
    } else {
      seen = null;                                                            // no camera: the clock runs and the player taps
      settle(game.update(dt, null));
      if (cur && cur.down && !wasDown) { const hit = buttons.find((b) => Math.hypot(cur.x - b.x, cur.y - b.y) <= b.r + 8); if (hit) settle(game.choose(hit.id)); }
    }
    wasDown = !!(cur && cur.down);
    hud();
  };

  shell.onDraw = (ctx) => {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.ivory; ctx.fillRect(0, 0, W, H);
    if (!game) return;
    const t = game.target, meta = EXPRESSIONS[t], cx = camera ? 330 : W / 2, cy = 255;
    // the face to copy, with a ring that fills while it is being held
    ctx.beginPath(); ctx.arc(cx, cy, 190, 0, Math.PI * 2); ctx.fillStyle = "rgba(214,230,226,.55)"; ctx.fill();
    drawFace(ctx, t, cx, cy, 150, { glow: "rgba(43,110,106,.10)" });
    if (shell.cam.on && game.held > 0) { ctx.beginPath(); ctx.arc(cx, cy, 172, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * game.progress); ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.strokeStyle = COL.teal; ctx.stroke(); }
    ctx.textAlign = "center"; ctx.fillStyle = COL.ink; ctx.font = FONT(38, 700); ctx.fillText(meta.label, cx, cy + 238);
    ctx.fillStyle = COL.ink3; ctx.font = FONT(21, 500); ctx.fillText(meta.hint, cx, cy + 272, 440);
    // what the camera sees, as a small face
    if (camera) {
      const rx = 760;
      roundRect(ctx, rx - 190, 70, 380, 300, 24); ctx.fillStyle = "rgba(234,227,213,.55)"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = COL.line; ctx.stroke();
      ctx.fillStyle = COL.ink3; ctx.font = FONT(20, 600); ctx.fillText("YOUR FACE", rx, 108);
      if (shell.cam.on && seen) { drawFace(ctx, seen === "RESTING" ? "NEUTRAL" : seen, rx, 225, 90, { fill: seen === t ? "#cfe3c9" : "#f2dfa4" }); ctx.fillStyle = seen === t ? COL.tealDeep : COL.ink; ctx.font = FONT(24, 700); ctx.fillText(seen === "RESTING" ? "Relaxed" : EXPRESSIONS[seen].label, rx, 345); }
      else { ctx.fillStyle = COL.ink3; ctx.font = FONT(22, 500); ctx.fillText(shell.cam.on ? "No face found" : "Waiting for the camera", rx, 235); }
    } else {
      // no camera: tap the matching face
      buttons = game.s.pool.map((id, i, a) => ({ id, x: W / 2 + (i - (a.length - 1) / 2) * 150, y: 500, r: 56 }));
      ctx.fillStyle = COL.ink3; ctx.font = FONT(20, 600); ctx.fillText("TAP THE SAME FACE", W / 2, 420);
      for (const b of buttons) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8, 0, Math.PI * 2); ctx.fillStyle = "rgba(234,227,213,.8)"; ctx.fill(); drawFace(ctx, b.id, b.x, b.y, b.r); }
    }
    if (flash.t > 0) { ctx.globalAlpha = Math.min(1, flash.t); ctx.fillStyle = flash.color; ctx.font = FONT(44, 700); ctx.fillText(flash.text, W / 2, 60); ctx.globalAlpha = 1; }
  };

  hud();
  shell.readyCard({
    title: "Make a Face",
    text: "A face is shown. Make the same face in front of the camera and hold it for a moment before the time runs out.",
    facts: `<b>${FACE_ROUNDS} rounds</b> · ${settings.timer} seconds each · hold for ${settings.hold} s · ${settings.pool.length} different faces`,
    onStart: ({ camera: c }) => begin(c),
  });
  return { shell, destroy: () => shell.destroy(), get game() { return game; } };
}
