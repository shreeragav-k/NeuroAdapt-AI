// Cut the Fruit inside the page. Swipe your fingertip (camera), a mouse or a finger through the fruit as it
// flies up, and keep clear of the bomb. The rules are in slicerules.js.
//
//   mountCutTheFruit(host, { session: { level, tier, steps }, onContinue(trials, summary) })
//
// In the daily extras it is one scored game of three waves (rounds); every thing thrown is one right / wrong trial.
import { createShell, COL, FONT, loadImage, star } from "./moveshell.js";
import { SliceGame, sliceSettings, ARENA, FRUITS, FRUIT_NAMES, BOMB, SLICE_ROUNDS, LIVES } from "./slicerules.js";
import { icon } from "./icons.js";

const W = ARENA.width, H = ARENA.height;
const PIC = { whole: {}, half: {}, bomb: null, loading: null };
const total = FRUIT_NAMES.length * 3 + 1;
const have = () => Object.values(PIC.whole).filter(Boolean).length + Object.values(PIC.half).filter(Boolean).length + (PIC.bomb ? 1 : 0);
function ensurePictures() {
  if (have() === total) return Promise.resolve();
  if (!PIC.loading) {
    PIC.loading = Promise.all([
      ...FRUIT_NAMES.map((n) => loadImage(`/img/slice/whole/${n}.png`).then((i) => { PIC.whole[n] = i; })),
      ...FRUIT_NAMES.flatMap((n) => [1, 2].map((k) => loadImage(`/img/slice/half/${n}_half_${k}.png`).then((i) => { PIC.half[`${n}${k}`] = i; }))),
      loadImage("/img/slice/grenade.png").then((i) => { PIC.bomb = i; }),
    ]).finally(() => { PIC.loading = null; });
  }
  return PIC.loading;
}
const JUICE = { watermelon: "#e0455a", apple: "#e8dcc0", orange: "#f19a2a", pineapple: "#f1d24a", banana: "#f4e6a8", strawberry: "#d93a52", kiwi: "#7fc15a", coconut: "#f4f1e8", mango: "#f3a52b", grapes: "#8c4aa0" };
const starsHtml = (n) => `<span class="fc-stars" role="img" aria-label="${n} of 3 stars">${[1, 2, 3].map((k) => `<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><polygon points="12,1.8 15,8.6 22.4,9.3 16.8,14.1 18.5,21.3 12,17.5 5.5,21.3 7.2,14.1 1.6,9.3 9,8.6" fill="${k <= n ? "#e8b923" : "#d9d0bd"}"/></svg>`).join("")}</span>`;

export function mountCutTheFruit(host, { session, onContinue = () => {}, tracker, useCamera = true, rng = Math.random } = {}) {
  const settings = sliceSettings(session.level, session.tier), steps = session.steps || [1, 2];
  const shell = createShell(host, {
    width: W, height: H, tracker, useCamera,
    hud: { left: "Points", mid: "of 3 rounds", right: "Lives", aria: "Cut the Fruit playing area. Swipe through the fruit and avoid the bomb." },
    help: "Swipe your fingertip through every fruit. Do not touch the bomb. With a mouse, move it quickly across the fruit; on a touch screen, swipe with a finger.",
  });
  ensurePictures();
  let game = null, camera = false, trail = [], splashes = [], shake = 0, msg = { text: "", color: COL.teal, t: 0 };
  const hud = () => shell.hud({ left: game ? game.points : 0, mid: game ? game.round : 1, bar: game ? (game.wave + (game.rest > 0 ? 1 : 0)) / SLICE_ROUNDS : 0, right: game ? "●".repeat(Math.max(0, game.lives)) + "○".repeat(Math.max(0, LIVES - game.lives)) : "●".repeat(LIVES) });

  function begin(withCamera) {
    camera = withCamera; game = new SliceGame(settings, rng); trail = []; splashes = [];
    shell.setPhase("play"); shell.overlay(""); shell.canvas.focus({ preventScroll: true }); hud(); shell.say("Swipe through the fruit. Keep clear of the bomb.");
  }
  function finish() {
    shell.setPhase("over"); shell.cam.disable("round finished");
    const g = game, cut = g.outcomes.filter((o) => o.kind === "fruit" && o.correct).length, fruits = g.outcomes.filter((o) => o.kind === "fruit").length;
    const summary = { points: g.points, stars: g.stars, accuracy: g.accuracy, cut, fruits, lives: g.lives, camera };
    shell.overlay(`<div class="fc-card"><div class="eyebrow">Round finished</div><h2>${g.over === "NO_LIVES" ? "The bombs won this time" : "All rounds done"}</h2>
      ${starsHtml(g.stars)}
      <div class="fc-big"><span>${g.accuracy}%</span><small>of your moves were right</small></div>
      <p class="fc-note">${cut} of ${fruits} fruit cut · ${g.points} points · ${g.lives} ${g.lives === 1 ? "life" : "lives"} left</p>
      <button class="btn lg" id="mv-done" type="button">Continue${icon("arrow", 18)}</button></div>`);
    shell.overlay().querySelector("#mv-done").onclick = () => onContinue(g.trials(steps), summary);
  }
  const say = (text, color) => { msg = { text, color, t: 1.2 }; };

  shell.onUpdate = (dt, cur) => {
    if (!game) return;
    msg.t = Math.max(0, msg.t - dt); shake = Math.max(0, shake - dt);
    if (cur) { trail.push({ x: cur.x, y: cur.y, t: 0.35 }); } else if (shell.cam.on) shell.say("Hand not found. Hold your hand up in front of the camera.");
    trail = trail.filter((p) => (p.t -= dt) > 0);
    for (const ev of game.update(dt, cur)) {
      const th = ev.thing;
      if (ev.type === "cut") { splashes.push({ x: th.x, y: th.y, c: JUICE[th.name] || "#e55", t: 0.6 }); say(`+${FRUITS[th.name].points}`, COL.teal); }
      else if (ev.type === "bomb") { splashes.push({ x: th.x, y: th.y, c: "#a64a3a", t: 0.7, big: true }); shake = 0.35; say("Bomb! One life lost", COL.clay); }
      else if (ev.type === "missed") say("Missed one", COL.ink3);
    }
    splashes = splashes.filter((s) => (s.t -= dt) > 0);
    hud();
    if (game.done) { shell.setPhase("between"); setTimeout(() => { if (!shell.dead) finish(); }, 700); }
  };

  shell.onDraw = (ctx, cur) => {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 14 * shake * 3, (Math.random() - 0.5) * 14 * shake * 3);
    ctx.clearRect(-20, -20, W + 40, H + 40); ctx.fillStyle = COL.ivory; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = "rgba(214,205,188,.45)"; ctx.lineWidth = 1;
    for (let y = 100; y < H; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (game) {
      for (const h of game.halves) { const im = PIC.half[`${h.name}${h.side < 0 ? 1 : 2}`]; if (!im) continue; ctx.save(); ctx.globalAlpha = Math.min(1, h.life); ctx.translate(h.x, h.y); ctx.rotate(h.angle); ctx.drawImage(im, -im.width * 0.55, -im.height * 0.55, im.width * 1.1, im.height * 1.1); ctx.restore(); }
      for (const th of game.things) {
        ctx.save(); ctx.translate(th.x, th.y); ctx.rotate(th.angle);
        const im = th.kind === "bomb" ? PIC.bomb : PIC.whole[th.name], d = th.r * 2.5;
        if (th.state === "cut" && th.kind === "bomb") ctx.globalAlpha = 0.4;
        if (im) { const k = d / Math.max(im.width, im.height); ctx.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); }
        else { ctx.beginPath(); ctx.arc(0, 0, th.r, 0, Math.PI * 2); ctx.fillStyle = th.kind === "bomb" ? "#3b4a3a" : JUICE[th.name] || "#d55"; ctx.fill(); }
        ctx.restore();
      }
      for (const s of splashes) { ctx.globalAlpha = Math.max(0, s.t); ctx.beginPath(); ctx.arc(s.x, s.y, (s.big ? 90 : 50) * (1.3 - s.t), 0, Math.PI * 2); ctx.fillStyle = s.c; ctx.fill(); ctx.globalAlpha = 1; }
      if (msg.t > 0) { ctx.globalAlpha = Math.min(1, msg.t); ctx.textAlign = "center"; ctx.fillStyle = msg.color; ctx.font = FONT(34, 700); ctx.fillText(msg.text, W / 2, 70); ctx.globalAlpha = 1; }
    }
    // the swipe: a teal trail ending in the knife-tip dot
    if (trail.length > 1) { ctx.lineCap = "round"; for (let i = 1; i < trail.length; i++) { ctx.globalAlpha = Math.max(0, trail[i].t / 0.35); ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.lineWidth = 10 * (trail[i].t / 0.35) + 2; ctx.strokeStyle = COL.teal; ctx.stroke(); } ctx.globalAlpha = 1; }
    if (cur) { ctx.beginPath(); ctx.arc(cur.x, cur.y, 18, 0, Math.PI * 2); ctx.fillStyle = "rgba(43,110,106,.22)"; ctx.fill(); ctx.beginPath(); ctx.arc(cur.x, cur.y, 9, 0, Math.PI * 2); ctx.fillStyle = COL.teal; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    else if (game && shell.phase === "play" && shell.cam.on) { ctx.textAlign = "center"; ctx.fillStyle = "rgba(24,27,31,.7)"; ctx.font = FONT(26, 600); ctx.fillText("Hand not found", W / 2, H - 30); }
    ctx.restore();
  };

  hud();
  shell.readyCard({
    title: "Cut the Fruit",
    text: "Fruit flies up the screen. Swipe through every fruit and keep clear of the bomb.",
    facts: `<b>${SLICE_ROUNDS} rounds</b> · ${settings.fruits} fruit and ${settings.bombs} ${settings.bombs === 1 ? "bomb" : "bombs"} a round · ${LIVES} lives`,
    onStart: ({ camera: c }) => begin(c),
  });
  return { shell, destroy: () => shell.destroy(), get game() { return game; } };
}
