// The frame that the movement games share: the score bar, the playing field (a canvas), the cards over it
// (start, between shapes, result), the camera preview, and the one cursor that comes from either your hand
// (camera), a mouse or a finger. Each game supplies only its rules and its drawing.
//
//   const shell = createShell(host, { hud, help, tracker, useCamera });
//   shell.onUpdate = (dt, cursor) => {};   // cursor: { x, y, down, hand } in field pixels, or null
//   shell.onDraw = (ctx) => {};
//   shell.readyCard({ ... , onStart })     // "Start with camera" / "Play without camera"
//   shell.hud({ left, mid, bar, right });  shell.say("status text");  shell.destroy();
import { createCamera, CursorMap, cameraSupported } from "./camera.js";
import { startHandTracking } from "./handtrack.js";
import { icon } from "./icons.js";
import { esc } from "./report.js";

export function createShell(host, { width = 1000, height = 600, hud = {}, help = "", tracker = startHandTracking, useCamera = true, fingertip = true } = {}) {
  const H = { left: "Score", mid: "seconds", right: "", ...hud };
  host.innerHTML = `<div class="fc" data-state="ready">
    <div class="fc-hud">
      <div><span class="fc-lab">${esc(H.left)}</span><span class="fc-score" data-h="left">0</span></div>
      <div class="fc-time"><span><b data-h="mid">0</b> <span class="fc-unit">${esc(H.mid)}</span></span><span class="fc-bar" aria-hidden="true"><i data-h="bar"></i></span></div>
      <div class="fc-livesbox"><span class="fc-lab">${esc(H.right)}</span><span class="fc-val" data-h="right"></span></div>
    </div>
    <div class="fc-stage">
      <canvas class="fc-canvas" width="${width}" height="${height}" tabindex="0" aria-label="${esc(H.aria || "Playing area")}"></canvas>
      <div class="fc-overlay"></div>
    </div>
    <div class="fc-cam inline" hidden><video muted playsinline></video><span class="fc-pill"><i class="fc-dot"></i>Live · not recorded</span><button class="fc-camoff" type="button">Turn camera off</button></div>
    <p class="fc-help">${esc(help)}</p>
    <p class="fc-status" role="status"></p>
    <p class="fc-privacy">${icon("lock", 16)}<span><b>The video is never recorded.</b> The camera is optional. If you use it, the picture stays on this device, is read only to find your hand, and is not saved or sent anywhere. It switches off when the round ends. <a href="#/privacy">How this works</a></span></p>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const root = $(".fc"), canvas = $("canvas"), ctx = canvas.getContext("2d"), overlayEl = $(".fc-overlay"), statusEl = $(".fc-status");
  const camBox = $(".fc-cam"), video = $("video");

  const shell = { canvas, ctx, width, height, phase: "ready", dead: false, onUpdate: null, onDraw: null };
  const pointer = { x: 0, y: 0, down: false, type: "mouse", inside: false };
  const map = new CursorMap(width, height);
  let raf = 0, last = 0, startedAt = 0;

  // ------------------------------------------------------------------ camera
  const cam = createCamera({
    panel: { box: camBox, video },
    tracker,
    onNote: (t) => shell.say(t),
    onChange: () => {},
  });
  shell.cam = cam;
  $(".fc-camoff").onclick = () => { cam.disable("player turned the camera off"); shell.say("The camera is off. Use the mouse or a finger instead."); };

  // ------------------------------------------------------------------ cards
  shell.say = (t) => { const v = t || ""; if (statusEl.textContent !== v) statusEl.textContent = v; };
  shell.setPhase = (p) => { shell.phase = p; root.dataset.state = p; };
  shell.overlay = (html) => { if (html === undefined) return overlayEl; overlayEl.innerHTML = html; overlayEl.hidden = !html; const b = overlayEl.querySelector("button.btn"); if (b) b.focus({ preventScroll: true }); return overlayEl; };

  // Start card with the camera choice. Nothing touches the camera until a button is pressed.
  shell.readyCard = ({ eyebrow = "Movement game", title, text, facts = "", onStart }) => {
    shell.setPhase("ready");
    const canCam = useCamera && cameraSupported();
    shell.overlay(`<div class="fc-card">
      <div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>
      ${facts ? `<p class="fc-fixed">${facts}</p>` : ""}
      <div class="fc-choices">
        ${canCam ? `<button class="btn lg" data-go="cam" type="button">${icon("camera", 18)}Start with camera</button><button class="btn quiet" data-go="plain" type="button">Play without camera</button>`
          : `<button class="btn lg" data-go="plain" type="button">${icon("play", 18)}Start</button>`}
      </div>
      <p class="fc-note">${canCam ? "The camera is optional, and the video is never recorded." : "Play with a mouse or a finger."} <a href="#/privacy">Learn about camera privacy</a></p></div>`);
    overlayEl.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => {
      const withCam = b.dataset.go === "cam";
      if (withCam) cam.enable();
      startedAt = performance.now();
      onStart({ camera: withCam });
    }));
  };

  // ------------------------------------------------------------------ the field and the HUD
  shell.hud = ({ left, mid, bar, right, low } = {}) => {
    const set = (k, v) => { const el = $(`[data-h="${k}"]`); if (el && v !== undefined) el.textContent = v; };
    set("left", left); set("mid", mid); set("right", right);
    if (bar !== undefined) { const b = $('[data-h="bar"]'); b.style.width = `${Math.max(0, Math.min(1, bar)) * 100}%`; b.classList.toggle("low", !!low); }
  };

  // The cursor: your hand when the camera has found it, otherwise the mouse or finger.
  shell.cursor = () => {
    if (cam.on) {
      if (!fingertip) return null;                           // the face game reads the face, not a cursor
      const f = cam.frame();
      if (f) { const p = map.map(f); return { x: p.x, y: p.y, down: false, hand: true, pinch: f.pinch }; }
      map.map(null);
      return null;                                           // camera on but no hand in view
    }
    if (pointer.inside) return { x: pointer.x, y: pointer.y, down: pointer.down, hand: false, pinch: null };
    return null;
  };

  const place = (e) => { const b = canvas.getBoundingClientRect(); pointer.x = ((e.clientX - b.left) / b.width) * width; pointer.y = ((e.clientY - b.top) / b.height) * height; pointer.type = e.pointerType; };
  canvas.style.touchAction = "none"; canvas.style.aspectRatio = `${width} / ${height}`;
  canvas.addEventListener("pointermove", (e) => { place(e); pointer.inside = e.pointerType === "mouse" || pointer.down; });
  canvas.addEventListener("pointerdown", (e) => { place(e); pointer.down = true; pointer.inside = true; try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ } });
  const lift = (e) => { place(e); pointer.down = false; if (e.pointerType !== "mouse") pointer.inside = false; };
  canvas.addEventListener("pointerup", lift); canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("pointerleave", () => { if (!pointer.down) pointer.inside = false; });

  // ------------------------------------------------------------------ the loop
  const frame = (ts) => {
    if (shell.dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    const cur = shell.cursor();                         // read once a frame, so the hand is smoothed once
    shell.current = cur;
    if (shell.phase === "play" && !document.hidden && shell.onUpdate) shell.onUpdate(dt, cur);
    if (shell.onDraw) shell.onDraw(ctx, cur);
  };
  raf = requestAnimationFrame((ts) => { last = ts; raf = requestAnimationFrame(frame); });

  shell.destroy = () => {
    shell.dead = true; cancelAnimationFrame(raf); cam.destroy(); host.replaceChildren();
  };
  return shell;
}

// small drawing helpers shared by the games (Halcyon colours)
export const COL = { ivory: "#f6f1e7", stone: "#eae3d5", line: "#d6cdbc", teal: "#2b6e6a", tealDeep: "#1f5753", pale: "#d6e6e2", ink: "#181b1f", ink3: "#6b7077", clay: "#a64a3a", amber: "#e8b923" };
export const FONT = (px, weight = 600) => `${weight} ${px}px "Hanken Grotesk", "Segoe UI", system-ui, sans-serif`;
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
export function star(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
export const loadImage = (src, retry = true) => new Promise((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => (retry ? loadImage(`${src}?r=${Date.now()}`, false).then(res) : res(null));
  i.src = src;
});
