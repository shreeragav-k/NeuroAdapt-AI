// The camera for the movement games, with its whole life in one place.
//
//   - It is only asked for after the player chooses "Start with camera" (never on its own).
//   - The picture is shown as a small preview and read by the hand tracker on this device. It is never recorded,
//     saved or sent anywhere (see handtrack.js; a test checks the code for any recording or upload call).
//   - It is switched off when the round ends, when the player turns it off, or when they leave the page.
//   - Only one camera stream exists at a time, and asking again after a failure is a button, not an automatic retry.
//
// `cameraLog` lists what the camera did this visit (event names and times only, never any picture), for the
// Privacy page.
import { startHandTracking } from "./handtrack.js";

export const cameraLog = [];
const log = (event) => { cameraLog.push({ at: new Date().toISOString(), event }); if (cameraLog.length > 100) cameraLog.shift(); };
export const cameraSupported = () => !!(typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// panel = { box, video }  (the small preview in the corner of the game)
export function createCamera({ panel, onNote = () => {}, onChange = () => {}, tracker = startHandTracking }) {
  let state = "off", t = null, dead = false, note = "";
  const set = (s) => { state = s; if (panel.box) panel.box.hidden = !(s === "starting" || s === "on"); onChange(s); };
  const say = (text) => { note = text; onNote(text); };

  const api = {
    get state() { return state; },
    get on() { return state === "on"; },
    get note() { return note; },
    // Called only from a button the player pressed.
    async enable() {
      if (dead || state === "starting" || state === "on") return;
      set("starting"); log("camera requested (player chose Start with camera)");
      const tracked = await tracker(panel.video, { onStatus: say, onPreview: () => { if (!dead && panel.box) panel.box.hidden = false; }, cancelled: () => dead || state === "off" });
      if (dead || state === "off") { if (tracked.ok) tracked.stop(); return; }
      if (tracked.ok) { t = tracked; set("on"); log("camera on, hand tracking running on this device"); say("Hand tracking is ready. Hold your hand up in front of the camera. Nothing is recorded."); }
      else { set("blocked"); log(`camera not started: ${tracked.reason}`); say(tracked.reason); }
    },
    disable(why = "camera turned off") {
      if (t) { try { t.stop(); } catch { /* already stopped */ } t = null; }
      if (state !== "off") { log(`${why}, every camera track stopped`); }
      set("off");
    },
    // { wristX, x, y, pinch } across the mirrored picture, or null. Only numbers, never pictures.
    frame() { return t ? t.frame() : null; },
    read() { return t ? t.read() : null; },
    destroy() { dead = true; api.disable("page closed"); },
  };
  return api;
}

// Fingertip position in the picture (0..1) -> position in the game (pixels), with the outer 10% of the picture
// left out so the edges of the game can be reached, and light smoothing so the cursor does not jitter.
export class CursorMap {
  constructor(width, height, alpha = 0.65) { this.w = width; this.h = height; this.alpha = alpha; this.last = null; }
  map(frame) {
    if (!frame) { this.last = null; return null; }
    const c = (v) => Math.max(0, Math.min(1, (v - 0.1) / 0.8));
    const x = c(frame.x) * this.w, y = c(frame.y) * this.h;
    this.last = this.last ? { x: this.alpha * x + (1 - this.alpha) * this.last.x, y: this.alpha * y + (1 - this.alpha) * this.last.y } : { x, y };
    return this.last;
  }
}
