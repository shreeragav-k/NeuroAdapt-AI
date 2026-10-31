// Feed the Animal inside the page. Pinch a food (hand in front of the camera), or press and drag it with a
// mouse or finger, carry it to the animal's mouth and let go. The rules are in feedanimal.js.
//
//   mountFeedAnimal(host, { session: { level, steps }, onContinue(trials, summary) })
//
// In the daily list it is one scored game: every try that reaches the mouth is one right / wrong trial.
import { createShell, COL, FONT, roundRect, loadImage } from "./moveshell.js";
import { Feeder, PinchDetector, ANIMALS, FOODS, FOOD_NAMES, FEED_PLAY, SEQUENCES, POINTS_PER_FEED } from "./feedanimal.js";
import { icon } from "./icons.js";
import { esc } from "./report.js";

const W = 1000, H = 600;
const SHELF = { x: 30, y: 30, w: 230, h: 540 };
const CARD = { x: 560, y: 30, w: 410, h: 540 };
const MOUTH = { x: CARD.x + CARD.w / 2, y: CARD.y + 325, rx: 150, ry: 125 };       // generous: easy to hit for small hands
const GRAB = 80;

// pictures are loaded once and kept; a plain shape stands in for any picture that fails to load
const PIC = { animals: {}, food: {}, loading: null };
const need = () => Object.keys(ANIMALS).length + FOODS.length;
const loaded = () => Object.values(PIC.animals).filter(Boolean).length + Object.values(PIC.food).filter(Boolean).length === need();
function ensurePictures() {
  if (loaded()) return Promise.resolve();
  if (!PIC.loading) {
    PIC.loading = Promise.all([
      ...Object.keys(ANIMALS).map((a) => loadImage(`/img/feed/${a}.png`).then((i) => { PIC.animals[a] = i; })),
      ...FOODS.map((f) => loadImage(`/img/feed/${f}.png`).then((i) => { PIC.food[f] = i; })),
    ]).finally(() => { PIC.loading = null; });
  }
  return PIC.loading;
}
const FALLBACK = { carrot: "#d9822b", banana: "#e5c04a", apple: "#b23a3a", bone: "#e7dcc6", fish: "#6f8fa8", rabbit: "#cdbfae", monkey: "#9c7b5a", cat: "#8a8a8a", dog: "#c49a6c" };

function fit(img, boxW, boxH) { const k = Math.min(boxW / img.width, boxH / img.height); return [img.width * k, img.height * k]; }

export function mountFeedAnimal(host, { session, onContinue = () => {}, tracker, useCamera = true, rng = Math.random } = {}) {
  const level = session.level, play = FEED_PLAY[level], steps = session.steps || [1, 2];
  const shell = createShell(host, {
    width: W, height: H, tracker, useCamera,
    hud: { left: "Points", mid: `of ${SEQUENCES[level].length} fed`, right: "Accuracy", aria: "Feed the Animal playing area. Drag the food on the left to the animal's mouth on the right." },
    help: "Pinch a food with your thumb and index finger, move it to the animal's mouth and open your hand. With a mouse or finger, press the food, drag it to the mouth and let go.",
  });
  ensurePictures();
  const pinch = new PinchDetector();
  let locked = false, feeder = null, items = [], drag = null, pressedBefore = false, camera = false;
  let msg = { text: "", color: COL.teal, t: 0 }, anim = { eat: null, bounce: 0, swap: 0 }, pops = [], hintUntil = 0, clock = 0;

  const layout = () => {
    // up to 3 foods stand in one column; 4 or 5 stand in two, so none of them overlaps
    const n = feeder.foods.length, cols = n >= 4 ? 2 : 1, rows = Math.ceil(n / cols), gap = (SHELF.h - 110) / rows, size = Math.min(cols === 2 ? 92 : 112, gap - 34);
    items = feeder.foods.map((food, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = SHELF.x + (SHELF.w * (c + 0.5)) / cols, y = SHELF.y + 96 + gap * (r + 0.5) - 12;
      return { food, bx: x, by: y, x, y, size, scale: 1, back: false, gone: false };
    });
  };
  const newAnimal = () => {
    layout(); drag = null; locked = false; anim.swap = 1;
    hintUntil = play.hintMs === null ? Infinity : play.hintMs === 0 ? 0 : clock + play.hintMs / 1000;
  };
  const hud = () => shell.hud({ left: feeder.score, mid: Math.min(feeder.step, feeder.sequence.length), bar: feeder.step / feeder.sequence.length, right: feeder.attempts ? `${feeder.accuracy}%` : "—" });

  function begin(withCamera) {
    camera = withCamera; feeder = new Feeder(level, rng); pinch.reset(); drag = null; pressedBefore = false; clock = 0; msg = { text: "", color: COL.teal, t: 0 };
    shell.setPhase("play"); shell.overlay(""); shell.canvas.focus({ preventScroll: true });
    newAnimal(); hud(); shell.say(`Feed the ${feeder.profile.name}. Which food does it love?`);
  }

  function say(text, color) { msg = { text, color, t: 2.2 }; }
  function release(item) {
    const dx = (item.x - MOUTH.x) / MOUTH.rx, dy = (item.y - MOUTH.y) / MOUTH.ry;
    if (dx * dx + dy * dy > 1) { item.back = true; return; }                       // let go away from the mouth: it goes back
    const r = feeder.drop(item.food);
    if (r.correct) {
      anim.eat = { item, t: 0 }; anim.bounce = 1; item.gone = true; locked = true;          // the shelf waits while the animal eats
      say("Yummy! Great job!", COL.teal); pops.push({ text: `+${POINTS_PER_FEED}`, x: MOUTH.x, y: MOUTH.y - 40, t: 1 });
      hud();
      if (r.done) setTimeout(() => !shell.dead && finish(), 900); else setTimeout(() => { if (!shell.dead && shell.phase === "play") { newAnimal(); hud(); shell.say(`Now the ${feeder.profile.name}.`); } }, 1000);
    } else { item.back = true; say("Let's try another food!", COL.clay); hud(); }
  }

  function finish() {
    shell.setPhase("over"); shell.cam.disable("round finished");
    const f = feeder, summary = { points: f.score, stars: f.stars, accuracy: f.accuracy, correct: f.correct, tries: f.attempts, animals: f.sequence.length, camera };
    shell.overlay(`<div class="fc-card"><div class="eyebrow">Round finished</div><h2>Everyone is fed!</h2>
      <span class="fc-stars" role="img" aria-label="${f.stars} of 3 stars">${[1, 2, 3].map((k) => `<svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><polygon points="12,1.8 15,8.6 22.4,9.3 16.8,14.1 18.5,21.3 12,17.5 5.5,21.3 7.2,14.1 1.6,9.3 9,8.6" fill="${k <= f.stars ? "#e8b923" : "#d9d0bd"}"/></svg>`).join("")}</span>
      <div class="fc-big"><span>${f.accuracy}%</span><small>of your tries were right</small></div>
      <p class="fc-note">${f.correct} animals fed in ${f.attempts} ${f.attempts === 1 ? "try" : "tries"} · ${f.score} points</p>
      <button class="btn lg" id="mv-done" type="button">Continue${icon("arrow", 18)}</button></div>`);
    shell.overlay().querySelector("#mv-done").onclick = () => onContinue(f.trials(steps), summary);
  }

  shell.onUpdate = (dt, cur) => {
    clock += dt; msg.t = Math.max(0, msg.t - dt); anim.bounce = Math.max(0, anim.bounce - dt * 2.5); anim.swap = Math.max(0, anim.swap - dt * 3);
    pops = pops.filter((p) => (p.t -= dt) > 0);
    if (anim.eat) { anim.eat.t += dt * 2.2; if (anim.eat.t >= 1) anim.eat = null; }
    // is the player "holding"? a pinch with the hand, the button with a mouse or finger
    let pressed = false;
    if (cur && cur.hand) pressed = pinch.update(cur.pinch).pinching;
    else { pinch.update(null); pressed = !!(cur && cur.down); }
    if (!cur) pressed = false;
    if (pressed && !pressedBefore && cur && !drag && !locked) {                                  // just grabbed
      let best = null, bd = GRAB;
      for (const it of items) { if (it.gone) continue; const d = Math.hypot(cur.x - it.x, cur.y - it.y); if (d < bd) { bd = d; best = it; } }
      if (best) { drag = best; best.back = false; best.scale = 1.15; }
    }
    if (drag && cur && pressed) { drag.x += (cur.x - drag.x) * 0.6; drag.y += (cur.y - drag.y) * 0.6; }
    if (drag && (!pressed || !cur) && pressedBefore) { const it = drag; drag = null; it.scale = 1; release(it); }
    pressedBefore = pressed;
    for (const it of items) if (it.back) { it.x += (it.bx - it.x) * 0.25; it.y += (it.by - it.y) * 0.25; if (Math.hypot(it.bx - it.x, it.by - it.y) < 3) { it.x = it.bx; it.y = it.by; it.back = false; } }
    if (!cur) shell.say(shell.cam.on ? "Hand not found. Hold your hand up in front of the camera." : "");
  };

  shell.onDraw = (ctx, cur) => {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.ivory; ctx.fillRect(0, 0, W, H);
    if (!feeder) return;
    const panel = (r, fill) => { roundRect(ctx, r.x, r.y, r.w, r.h, 24); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = COL.line; ctx.stroke(); };
    panel(SHELF, "rgba(234,227,213,.55)"); panel(CARD, "rgba(214,230,226,.45)");
    ctx.textAlign = "center"; ctx.fillStyle = COL.ink; ctx.font = FONT(26, 700); ctx.fillText("Choose a food", SHELF.x + SHELF.w / 2, SHELF.y + 42);
    ctx.fillStyle = COL.ink3; ctx.font = FONT(17, 500); ctx.fillText("pinch and drag to the mouth", SHELF.x + SHELF.w / 2, SHELF.y + 68);
    // the animal
    const a = feeder.profile, key = feeder.animal, bob = Math.sin(clock * 2) * 3 - anim.bounce * 18, appear = 1 - anim.swap * 0.25;
    ctx.fillStyle = COL.ink; ctx.font = FONT(30, 700); ctx.fillText(`Hungry ${a.name.toLowerCase()}`, CARD.x + CARD.w / 2, CARD.y + 48);
    ctx.fillStyle = COL.tealDeep; ctx.font = FONT(20, 600);
    const showHint = clock < hintUntil;
    ctx.fillText(showHint ? a.hint : play.hintMs === 0 ? `Which food does the ${a.name.toLowerCase()} love?` : "Remember what it loves!", CARD.x + CARD.w / 2, CARD.y + 80);
    const img = PIC.animals[key];
    ctx.save(); ctx.globalAlpha = Math.max(0.2, appear);
    if (img) { const [w, h] = fit(img, CARD.w - 50, 360); ctx.drawImage(img, CARD.x + (CARD.w - w) / 2, CARD.y + 110 + (360 - h) + bob, w, h); }
    else { ctx.beginPath(); ctx.arc(CARD.x + CARD.w / 2, CARD.y + 290 + bob, 120, 0, Math.PI * 2); ctx.fillStyle = FALLBACK[key]; ctx.fill(); ctx.fillStyle = COL.ink; ctx.font = FONT(34, 700); ctx.fillText(a.name, CARD.x + CARD.w / 2, CARD.y + 300 + bob); }
    ctx.restore();
    // the mouth: a soft dotted target
    ctx.beginPath(); ctx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, 0, Math.PI * 2); ctx.setLineDash([3, 12]); ctx.lineWidth = 3; ctx.lineCap = "round";
    const over = drag && ((drag.x - MOUTH.x) / MOUTH.rx) ** 2 + ((drag.y - MOUTH.y) / MOUTH.ry) ** 2 <= 1;
    ctx.strokeStyle = over ? COL.teal : "rgba(43,110,106,.35)"; ctx.stroke(); ctx.setLineDash([]);
    if (over) { ctx.fillStyle = "rgba(43,110,106,.10)"; ctx.fill(); }
    // the foods
    const drawFood = (it, scale = 1, alpha = 1) => {
      const im = PIC.food[it.food]; ctx.save(); ctx.globalAlpha = alpha;
      if (im) { const [w, h] = fit(im, it.size * scale, it.size * scale); ctx.drawImage(im, it.x - w / 2, it.y - h / 2, w, h); }
      else { ctx.beginPath(); ctx.arc(it.x, it.y, (it.size / 2) * scale, 0, Math.PI * 2); ctx.fillStyle = FALLBACK[it.food]; ctx.fill(); }
      ctx.restore();
    };
    for (const it of items) {
      if (it.gone || it === drag) continue;
      ctx.beginPath(); ctx.ellipse(it.x, it.y + it.size * 0.4, it.size * 0.38, 7, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(30,28,24,.12)"; ctx.fill();
      drawFood(it);
      ctx.fillStyle = COL.ink3; ctx.font = FONT(17, 600); ctx.fillText(FOOD_NAMES[it.food], it.x, it.y + it.size / 2 + 24);
    }
    if (anim.eat) { const it = anim.eat.item, t = anim.eat.t, e = { ...it, x: it.x + (MOUTH.x - it.x) * Math.min(1, t * 1.4), y: it.y + (MOUTH.y - it.y) * Math.min(1, t * 1.4) }; drawFood(e, 1 - t * 0.8, 1 - t); }
    if (drag) drawFood(drag, 1.18);
    // messages and points
    if (msg.t > 0) { ctx.globalAlpha = Math.min(1, msg.t); ctx.fillStyle = msg.color; ctx.font = FONT(26, 700); ctx.fillText(msg.text, (SHELF.x + SHELF.w + CARD.x) / 2, 72); ctx.globalAlpha = 1; }
    for (const p of pops) { ctx.globalAlpha = Math.min(1, p.t); ctx.fillStyle = COL.teal; ctx.font = FONT(34, 700); ctx.fillText(p.text, p.x, p.y - (1 - p.t) * 60); ctx.globalAlpha = 1; }
    // the cursor (hand or mouse)
    if (cur) { ctx.beginPath(); ctx.arc(cur.x, cur.y, 16, 0, Math.PI * 2); ctx.fillStyle = drag ? "rgba(43,110,106,.35)" : "rgba(43,110,106,.18)"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = COL.teal; ctx.stroke(); }
    else if (shell.phase === "play" && shell.cam.on) { ctx.fillStyle = "rgba(246,241,231,.7)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = COL.ink; ctx.font = FONT(30); ctx.fillText("Hand not found", W / 2, H / 2); }
  };

  shell.hud({ left: 0, mid: 0, bar: 0, right: "—" });
  shell.readyCard({
    title: "Feed the Animal",
    text: "Each animal has one favourite food. Pinch the right food, carry it to the animal's mouth and let go.",
    facts: `<b>${SEQUENCES[level].length} animals (3 rounds)</b> · ${play.foods} foods to choose from · ${play.hintMs === null ? "hint always shown" : play.hintMs === 0 ? "no hints" : "hint shown for a moment"}`,
    onStart: ({ camera: c }) => begin(c),
  });
  return { shell, destroy: () => shell.destroy(), get feeder() { return feeder; }, get items() { return items; } };
}
