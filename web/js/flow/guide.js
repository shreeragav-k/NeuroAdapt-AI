// "Halo", a 3D guide character. It walks to the button you should press next, points at it and says what to do.
// Click it for a gesture. The body is built from three.js primitives (no model file). If WebGL or three.js is
// not available, a flat 2D bot stands in, so the hints still work.
import * as L from "./logic.js";
import * as S from "./storage.js";

const KEY = "neuroadapt:guide:off";
const W = 150, H = 190;                 // character canvas, in px
const SPEED = 300;                      // walking speed, px per second
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const off = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const setOff = (v) => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* storage blocked */ } };

// ------------------------------------------------------------------ hints
function hint(name, p) {
  const first = p ? p.name.trim().split(/\s+/)[0] : "";
  switch (name) {
    case "login":
      return { text: "Hi, I'm Halo! New here? Tap Create account. Already have one? Sign in with your email and password.", target: "#tab-new" };
    case "test": {
      const total = L.testGames(p.groupId).length, done = p.test.done.length;
      if (done === 0) return { text: `Welcome, ${first}! First, a short 5-game warm-up. Tap Begin the assessment.`, target: "#b" };
      return { text: `Assessment game ${Math.min(done + 1, total)} of ${total}. Do your best. There is no pass or fail!`, target: null };
    }
    case "assessment":
      return { text: "Great work! Read your report, then tap the big button at the bottom to see your plan.", target: "#plan" };
    case "plan": {
      const st = L.sessionState(p, S.today());
      if (st === "ready") return { text: `Ready, ${first}? Tap Start today's session to play your 10 games.`, target: "#start" };
      if (st === "resume") return { text: "You're part way through today. Tap Resume to carry on where you stopped.", target: "#start" };
      return { text: "Today's session is done. Amazing! Check your Reports, or try a suggested game. Come back tomorrow for the next level.", target: "#suggested a.btn, a[href='#/reports']" };
    }
    case "session":
      return { text: "Play each game in order. Take a break whenever you need one.", target: null };
    case "reports":
      return { text: "Here are your daily reports. Open one to see how your accuracy changes day by day.", target: ".reports-list a, .reports-list .btn" };
    case "report":
      return { text: "This report compares today with earlier days. When you're done, go back to Plan for your next step.", target: "a[href='#/plan']" };
    case "extra":
      return { text: "A bonus game! It won't change your level, so just have fun.", target: null };
    case "privacy":
      return { text: "Your camera video is never saved. Everything is processed on your device.", target: null };
    default:
      return null;
  }
}
const CHATTER = ["Hi there! 👋", "Wheee!", "You're doing great!", "High five! ✋", "Let's go!", "Need a hint? Just ask me!", "Look at me go!"];

// ------------------------------------------------------------- 3D character
let THREE = null, scene, camera, renderer, rig = null;      // rig: the named joints of the character

async function loadThree() {
  try {
    THREE = await import(new URL("../../vendor/three/three.module.min.js", import.meta.url).href);
    return true;
  } catch { return false; }
}

function buildCharacter() {
  const T = THREE;
  const mat = (color, rough = .45) => new T.MeshStandardMaterial({ color, roughness: rough, metalness: .05 });
  const teal = mat(0x2b8f89), tealDark = mat(0x1d504d), white = mat(0xf4fffb, .35), pink = mat(0xff8fb1, .6), sun = mat(0xffc83d, .3), ink = mat(0x14312f, .5);
  const mesh = (geo, m, x = 0, y = 0, z = 0, parent) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); if (parent) parent.add(o); return o; };
  const grp = (x, y, z, parent) => { const g = new T.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };

  const root = new T.Group();                        // moves and turns the whole character
  const hips = grp(0, 0, 0, root);                   // bobs while walking
  // legs
  const mkLeg = (x) => { const pivot = grp(x, .62, 0, hips); mesh(new T.CapsuleGeometry(.13, .3, 6, 12), tealDark, 0, -.25, 0, pivot); const foot = mesh(new T.SphereGeometry(.19, 16, 12), ink, 0, -.55, .07, pivot); foot.scale.set(1, .6, 1.4); return pivot; };
  const legL = mkLeg(-.23), legR = mkLeg(.23);
  // body
  const body = mesh(new T.SphereGeometry(.56, 32, 24), teal, 0, 1.05, 0, hips); body.scale.set(1, 1.1, .85);
  const belly = mesh(new T.SphereGeometry(.34, 24, 16), white, 0, 1.0, .3, hips); belly.scale.set(1, 1.1, .5);
  const badge = mesh(new T.SphereGeometry(.09, 16, 12), sun, 0, 1.25, .42, hips); badge.scale.z = .5;
  // arms
  const mkArm = (x) => { const pivot = grp(x, 1.35, 0, hips); mesh(new T.CapsuleGeometry(.1, .32, 6, 12), teal, 0, -.26, 0, pivot); mesh(new T.SphereGeometry(.13, 16, 12), white, 0, -.55, 0, pivot); return pivot; };
  const armL = mkArm(-.6), armR = mkArm(.6);
  // head
  const head = grp(0, 2.0, 0, hips);
  mesh(new T.SphereGeometry(.62, 32, 24), teal, 0, 0, 0, head);
  const face = mesh(new T.SphereGeometry(.5, 32, 24), white, 0, -.02, .2, head); face.scale.set(1, .85, .68);
  const eyes = [-.2, .2].map((x) => { const e = mesh(new T.SphereGeometry(.085, 16, 12), ink, x, .04, .56, head); e.scale.set(1, 1.25, .5); return e; });
  mesh(new T.SphereGeometry(.07, 12, 10), pink, -.34, -.12, .5, head).scale.set(1, .6, .4);
  mesh(new T.SphereGeometry(.07, 12, 10), pink, .34, -.12, .5, head).scale.set(1, .6, .4);
  const smile = mesh(new T.TorusGeometry(.13, .028, 8, 20, Math.PI), ink, 0, -.1, .57, head); smile.rotation.z = Math.PI;
  mesh(new T.CylinderGeometry(.03, .03, .26, 8), tealDark, 0, .72, 0, head);
  const ball = mesh(new T.SphereGeometry(.1, 16, 12), sun, 0, .88, 0, head);
  // ears
  mesh(new T.SphereGeometry(.14, 16, 12), tealDark, -.62, 0, 0, head).scale.set(.6, 1, 1);
  mesh(new T.SphereGeometry(.14, 16, 12), tealDark, .62, 0, 0, head).scale.set(.6, 1, 1);

  scene.add(root);
  return { root, hips, head, armL, armR, legL, legR, eyes, smile, ball };
}

async function initThree() {
  if (!(await loadThree())) return false;
  try {
    const canvas = document.createElement("canvas");
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, W / H, .1, 50);
    camera.position.set(0, 1.45, 7.6);
    camera.lookAt(0, 1.4, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd9d4, 1.25));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.1); sunLight.position.set(3, 5, 6); scene.add(sunLight);
    rig = buildCharacter();
    el.canvasHost.appendChild(canvas);
    return true;
  } catch { renderer = null; rig = null; return false; }
}

// ---------------------------------------------------------------- animation
// Position is in viewport px (the character's feet). It eases toward whatever the current goal is.
const st = { x: 40, y: 0, tx: 40, ty: 0, face: 0, walking: false, phase: 0, gesture: null, last: 0, idleAt: 0, blink: 0, goal: null };
const GESTURES = ["wave", "jump", "spin", "dance", "cheer", "flip", "bow"];
let lastGesture = "";

function startGesture(name) {
  if (REDUCED && name !== "wave") name = "wave";
  const dur = { wave: 1.8, jump: .9, spin: 1.1, dance: 2.6, cheer: 1.8, flip: 1.1, bow: 1.4, point: 99 }[name] || 1.5;
  st.gesture = { name, t0: performance.now() / 1000, dur };
}
function clickGesture() {
  let g; do { g = GESTURES[Math.floor(Math.random() * GESTURES.length)]; } while (g === lastGesture);
  lastGesture = g;
  startGesture(g);
  say(CHATTER[Math.floor(Math.random() * CHATTER.length)], 3500);
}

const ease = (t) => t * t * (3 - 2 * t);
const wave = (t, f, a) => Math.sin(t * f) * a;

function pose(now) {
  const r = rig; if (!r) return;
  const t = now / 1000, g = st.gesture, k = g ? Math.min(1, (t - g.t0) / g.dur) : 0;
  // base pose
  let rootY = 0, rootRotY = st.face, rootRotX = 0, hipsRotZ = 0, aL = 0, aR = 0, aLx = 0, aRx = 0, lL = 0, lR = 0, headRX = 0, headRZ = 0, scaleY = 1;
  if (st.walking) {                                      // walk cycle
    const s = Math.sin(st.phase);
    lL = s * .75; lR = -s * .75; aLx = -s * .6; aRx = s * .6;
    rootY = Math.abs(Math.cos(st.phase)) * .08; hipsRotZ = s * .04;
  } else {                                               // idle: breathe, look around
    scaleY = 1 + Math.sin(t * 2.2) * .012;
    headRZ = Math.sin(t * .8) * .05; aL = -.12; aR = .12;
  }
  if (g) {
    const e = ease(k), env = Math.sin(k * Math.PI);       // env: 0 → 1 → 0 across the gesture
    switch (g.name) {
      case "wave": aR = 2.6 + wave(t, 14, .35) * env; aRx = 0; headRZ = -.1 * env; break;
      case "jump": rootY = Math.sin(k * Math.PI) * 1.1; aL = -2.4 * env; aR = 2.4 * env; scaleY = 1 - .12 * (1 - env) * (k < .15 ? 1 : 0); break;
      case "spin": rootRotY = st.face + e * Math.PI * 2; rootY = env * .35; aL = -1.2 * env; aR = 1.2 * env; break;
      case "dance": hipsRotZ = Math.sin(t * 10) * .12; rootY = Math.abs(Math.sin(t * 10)) * .12; aL = -1.6 + Math.sin(t * 10) * .8; aR = 1.6 + Math.sin(t * 10 + Math.PI) * .8; lL = Math.sin(t * 10) * .35; lR = -Math.sin(t * 10) * .35; headRZ = Math.sin(t * 10) * .15; break;
      case "cheer": rootY = Math.abs(Math.sin(t * 9)) * .3 * env; aL = -(2.5 + Math.sin(t * 9) * .3) * env; aR = (2.5 + Math.sin(t * 9 + 1) * .3) * env; headRX = -.2 * env; break;
      case "flip": rootY = Math.sin(k * Math.PI) * 1.2; rootRotX = -e * Math.PI * 2; aL = -2.2 * env; aR = 2.2 * env; break;
      case "bow": headRX = .5 * env; rootRotX = .35 * env; aL = -.3 * env; aR = .3 * env; break;
      case "point": {                                      // arm out toward the target, with a small bounce
        const side = st.pointSide || 1;
        if (side > 0) aR = 1.55 + wave(t, 8, .12); else aL = -(1.55 + wave(t, 8, .12));
        rootRotY = st.face + side * .5; headRZ = -side * .08; rootY = Math.abs(Math.sin(t * 5)) * .04; break;
      }
    }
    if (g.name !== "point" && k >= 1) st.gesture = null;
  }
  r.root.position.y = rootY; r.root.rotation.set(rootRotX, rootRotY, 0); r.root.scale.y = scaleY;
  r.hips.rotation.z = hipsRotZ;
  r.armL.rotation.set(aLx, 0, aL); r.armR.rotation.set(aRx, 0, aR);
  r.legL.rotation.x = lL; r.legR.rotation.x = lR;
  r.head.rotation.set(headRX, 0, headRZ);
  const blink = (t % 4) > 3.9 ? .1 : 1; r.eyes.forEach((e) => { e.scale.y = 1.25 * blink; });
  r.ball.position.y = .88 + Math.sin(t * 3) * .02;
}

function goalPoint() {
  const g = st.goal; if (!g || !g.target) return { x: 24, y: innerHeight - 16, side: 0 };   // home: bottom-left
  const el = document.querySelector(g.target);
  if (!el) return { x: 24, y: innerHeight - 16, side: 0 };
  const r = el.getBoundingClientRect();
  const midY = Math.min(innerHeight - 16, Math.max(H + 12, r.top + r.height / 2 + 70));   // feet a little below the target's middle
  // the figure fills the middle of its frame, so the frame may overlap the target's edge a little
  if (r.left - W + 30 > 8) return { x: r.left - W + 30, y: midY, side: 1 };               // stand on its left, pointing right
  if (r.right - 30 + W < innerWidth) return { x: r.right - 30, y: midY, side: -1 };        // or on its right, pointing left
  return { x: Math.min(innerWidth - W - 8, Math.max(8, r.left)), y: Math.min(innerHeight - 16, r.bottom + H + 40), side: 0 };
}

let raf = 0;
function frame(nowMs) {
  raf = requestAnimationFrame(frame);
  if (!el.root || el.root.hidden || document.hidden) { st.last = nowMs; return; }
  const dt = Math.min(.05, (nowMs - (st.last || nowMs)) / 1000); st.last = nowMs;
  const gp = goalPoint(); st.tx = gp.x; st.ty = gp.y;
  const dx = st.tx - st.x, dy = st.ty - st.y, dist = Math.hypot(dx, dy);
  if (dist > 6) {
    const step = Math.min(dist, (REDUCED ? 5000 : SPEED) * dt);
    st.x += (dx / dist) * step; st.y += (dy / dist) * step;
    if (!st.walking) { st.walking = true; if (st.gesture && st.gesture.name === "point") st.gesture = null; }
    st.phase += dt * 11;
    const want = Math.abs(dx) > 8 ? Math.sign(dx) * .85 : 0;     // turn toward the way we are going
    st.face += (want - st.face) * Math.min(1, dt * 10);
  } else {
    st.x = st.tx; st.y = st.ty;
    if (st.walking) {                                           // just arrived
      st.walking = false; st.pointSide = gp.side;
      if (gp.side) startGesture("point"); else startGesture("wave");
    }
    st.face += (0 - st.face) * Math.min(1, dt * 8);
  }
  el.root.style.transform = `translate(${st.x.toFixed(1)}px, ${(st.y - H).toFixed(1)}px)`;
  placeBubble();
  if (rig && renderer) { pose(nowMs); renderer.render(scene, camera); }
  else if (el.fallback) el.fallback.classList.toggle("walk", st.walking);
}

// -------------------------------------------------------------------- DOM
const el = { root: null, canvasHost: null, bubble: null, text: null, fallback: null };
let hideTimer = null, typeTimer = null, current = null;

const BOT_SVG = `<svg viewBox="0 0 64 64" width="96" height="96" aria-hidden="true">
  <line x1="32" y1="6" x2="32" y2="14" stroke="#1d504d" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="6" r="4" fill="#ffc83d"/>
  <rect x="10" y="14" width="44" height="34" rx="14" fill="#2b6e6a" stroke="#1d504d" stroke-width="3"/><rect x="16" y="20" width="32" height="22" rx="10" fill="#e8fbf7"/>
  <circle cx="25" cy="31" r="4" fill="#1d504d"/><circle cx="39" cy="31" r="4" fill="#1d504d"/><path d="M26 37q6 5 12 0" fill="none" stroke="#1d504d" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="20" y="50" width="24" height="9" rx="4" fill="#1d504d"/></svg>`;

function build() {
  const root = document.createElement("div");
  root.className = "halo3d"; root.setAttribute("role", "complementary"); root.setAttribute("aria-label", "Halo, your guide");
  root.innerHTML = `
    <div class="halo3d-bubble" hidden>
      <button class="halo-x" type="button" aria-label="Hide tip" title="Hide tip">&times;</button>
      <p aria-live="polite"></p>
      <div class="halo-row"><button class="halo-off" type="button">Turn off Halo</button></div>
    </div>
    <button class="halo3d-hit" type="button" aria-label="Halo. Tap me for a surprise" title="Tap me!"><span class="halo3d-canvas"></span><span class="halo3d-shadow"></span></button>`;
  document.body.appendChild(root);
  el.root = root; el.bubble = root.querySelector(".halo3d-bubble"); el.text = el.bubble.querySelector("p"); el.canvasHost = root.querySelector(".halo3d-canvas");
  root.querySelector(".halo-x").onclick = closeBubble;
  root.querySelector(".halo3d-hit").onclick = () => { clickGesture(); };
  root.querySelector(".halo-off").onclick = () => { setOff(true); root.hidden = true; clearPointer(); mountWake(); };
  st.x = st.tx = 24; st.y = st.ty = innerHeight - 16;
  initThree().then((ok) => {
    if (!ok) { el.canvasHost.innerHTML = `<span class="halo3d-flat">${BOT_SVG}</span>`; el.fallback = el.canvasHost.firstChild; }
  });
  addEventListener("resize", () => { if (current) openBubbleIfNeeded(); });
  raf = requestAnimationFrame(frame);
}

function placeBubble() {
  const b = el.bubble; if (!b || b.hidden) return;
  const bw = b.offsetWidth, bh = b.offsetHeight;
  let bx = Math.min(innerWidth - bw - 8, Math.max(8, st.x - 6)), by = st.y - H - bh - 6;
  if (by < 70) by = Math.min(innerHeight - bh - 8, st.y + 8);   // no room above: put it below
  b.style.transform = `translate(${(bx - st.x).toFixed(1)}px, ${(by - (st.y - H)).toFixed(1)}px)`;
}

function mountWake() {
  if (document.getElementById("halo-wake")) return;
  const t = document.createElement("button");
  t.id = "halo-wake"; t.type = "button"; t.className = "halo-wake"; t.textContent = "Halo"; t.title = "Bring the guide back"; t.setAttribute("aria-label", "Bring the guide back");
  t.onclick = () => { setOff(false); t.remove(); el.root.hidden = false; if (current) show(current); };
  document.body.appendChild(t);
}

function type(text, then) {
  clearInterval(typeTimer);
  if (REDUCED) { el.text.textContent = text; return; }
  let i = 0; el.text.textContent = "";
  typeTimer = setInterval(() => { el.text.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeTimer); }, 18);
}
function openBubbleIfNeeded() { if (el.bubble.hidden) el.bubble.hidden = false; }
function closeBubble() { el.bubble.hidden = true; clearTimeout(hideTimer); }
function say(text, ms = 6000) { type(text); el.bubble.hidden = false; clearTimeout(hideTimer); hideTimer = setTimeout(closeBubble, ms); }

function clearPointer() { document.querySelectorAll(".halo-point").forEach((n) => n.classList.remove("halo-point")); }
function point(sel) {
  clearPointer();
  if (!sel) return;
  const t = document.querySelector(sel);
  if (!t) return;
  t.classList.add("halo-point");
  const r = t.getBoundingClientRect();
  if (r.top < 70 || r.bottom > innerHeight - 20) t.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
}

function show(h) {
  el.root.hidden = false;
  st.goal = h;
  st.gesture = null;
  setTimeout(() => point(h.target), 60);
  say(h.text, 14000);
}

// Call after each screen is drawn.
export function update(name, p) {
  let h = null;
  try { h = hint(name, p); } catch { h = null; }
  current = h;
  if (!el.root) build();
  if (!h) { el.root.hidden = true; clearPointer(); return; }
  if (off()) { el.root.hidden = true; clearPointer(); mountWake(); return; }
  const w = document.getElementById("halo-wake"); if (w) w.remove();
  show(h);
}
