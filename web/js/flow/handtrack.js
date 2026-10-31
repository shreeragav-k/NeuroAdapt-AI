// Hand tracking in the browser: the webcam plus MediaPipe's Hand Landmarker (files in /vendor/mediapipe,
// so it works offline). The video is analysed on this device and is never recorded or sent anywhere.
//
//   const t = await startHandTracking(videoEl, { onStatus, cancelled })   // asks for the camera, then loads the model
//   t.read()   -> wrist x across the mirrored picture (0 left .. 1 right), or null if no hand is seen
//   t.stop()   -> switches the camera off
//
// startHandTracking never throws: it returns { ok: false, reason } with a plain-language reason instead,
// so the game can carry on with the keyboard or touch.
//
// Played again and again: only one camera stream exists at a time (an earlier one is released first, because
// a camera that is still "in use" cannot be opened a second time), a busy camera is retried, and the hand
// model is loaded once and kept for every later game instead of being rebuilt.

const BASE = new URL("../../vendor/mediapipe", import.meta.url).href;

let activeStream = null;          // the one open camera stream
let landmarker = null;            // the hand model, kept between games
let landmarkerLoading = null;

function releaseCamera() {
  if (activeStream) { activeStream.getTracks().forEach((t) => t.stop()); activeStream = null; }
}

async function loadModel() {
  if (landmarker) return landmarker;
  if (!landmarkerLoading) {
    landmarkerLoading = (async () => {
      const { FilesetResolver, HandLandmarker } = await import(`${BASE}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      const make = (delegate) => HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/hand_landmarker.task`, delegate },
        runningMode: "VIDEO", numHands: 1, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6,
      });
      try { landmarker = await make("GPU"); } catch { landmarker = await make("CPU"); }
      return landmarker;
    })().finally(() => { landmarkerLoading = null; });
  }
  return landmarkerLoading;
}
// Build the hand model ahead of time (no camera is touched), e.g. while the player reads the game card, so the
// heavy start-up does not happen in the middle of a game.
export function preloadHandModel() {
  if (landmarker || landmarkerLoading || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return;
  setTimeout(() => { loadModel().catch(() => {}); }, 400);
}
const dropModel = () => { try { landmarker && landmarker.close(); } catch { /* already closed */ } landmarker = null; };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function openCamera(onStatus) {
  const want = { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false };
  let err;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await navigator.mediaDevices.getUserMedia(want); } catch (e) {
      err = e;
      const busy = e && (e.name === "NotReadableError" || e.name === "AbortError" || e.name === "TrackStartError");
      if (!busy) break;                                   // blocked or missing: retrying will not help
      onStatus("The camera is busy, trying again…");
      await wait(700);
    }
  }
  throw err;
}

// Opens the camera for another tracker (the face tracker) with the same care: one stream at a time, a busy camera
// is retried, and the stream is stopped if the player has already left. -> { ok: true, stop() } | { ok: false, reason }
export async function acquireStream(video, { onStatus = () => {}, cancelled = () => false } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return { ok: false, reason: "This browser cannot use a camera here. Use the mouse or a finger." };
  releaseCamera();
  let stream;
  try { onStatus("Asking for the camera…"); stream = await openCamera(onStatus); } catch (e) {
    const name = e && e.name;
    return { ok: false, reason: name === "NotAllowedError" || name === "SecurityError" ? "The camera is blocked. Allow it in the browser, or play without the camera."
      : name === "NotReadableError" || name === "AbortError" || name === "TrackStartError" ? "The camera is busy. Close other apps or tabs that use it, then try again."
      : "No camera was found. Play without the camera." };
  }
  activeStream = stream;
  const stop = () => { stream.getTracks().forEach((t) => t.stop()); if (activeStream === stream) activeStream = null; video.srcObject = null; };
  if (cancelled()) { stop(); return { ok: false, reason: "cancelled" }; }
  video.muted = true; video.playsInline = true; video.srcObject = stream;
  try { await video.play(); } catch { /* the picture still arrives */ }
  if (cancelled()) { stop(); return { ok: false, reason: "cancelled" }; }
  return { ok: true, stop };
}

export async function startHandTracking(video, { onStatus = () => {}, onPreview = () => {}, cancelled = () => false } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { ok: false, reason: "This browser cannot use a camera here. Use the arrow keys or tap the screen." };
  }
  releaseCamera();                                        // never hold two streams at once
  let stream;
  try {
    onStatus("Asking for the camera…");
    stream = await openCamera(onStatus);
  } catch (e) {
    const name = e && e.name;
    const reason = name === "NotAllowedError" || name === "SecurityError" ? "The camera is blocked. Allow it in the browser, or use the arrow keys or tap the screen."
      : name === "NotReadableError" || name === "AbortError" || name === "TrackStartError" ? "The camera is busy. Close other apps or tabs that use it, then choose Try the camera again. The arrow keys work meanwhile."
      : "No camera was found. Use the arrow keys or tap the screen.";
    return { ok: false, reason };
  }
  activeStream = stream;
  const stopStream = () => { stream.getTracks().forEach((t) => t.stop()); if (activeStream === stream) activeStream = null; };
  if (cancelled()) { stopStream(); return { ok: false, reason: "cancelled" }; }
  try {
    video.muted = true; video.playsInline = true; video.srcObject = stream;
    try { await video.play(); } catch { /* the picture still arrives; play() can be refused while the element is changing */ }
    if (cancelled()) { stopStream(); video.srcObject = null; return { ok: false, reason: "cancelled" }; }
    onPreview();                                          // the picture is live: show the preview while the model finishes loading
    onStatus(landmarker ? "Starting hand tracking…" : "Loading hand tracking. You can start now with the arrow keys; your hand takes over when it is ready.");
    const lm = await loadModel();
    if (cancelled()) { stopStream(); video.srcObject = null; return { ok: false, reason: "cancelled" }; }
    let lastTime = -1, lastFrame = null, lastAt = 0, fails = 0;
    // Looks at the camera picture about 30 times a second. All it keeps is a handful of numbers about the hand
    // (never the picture): the wrist, the index fingertip, and how far thumb and index are apart.
    const look = () => {
      const now = performance.now();
      if (video.readyState < 2 || video.currentTime === lastTime || now - lastAt < 33) return;
      lastTime = video.currentTime; lastAt = now;
      try {
        const res = lm.detectForVideo(video, now), h = res.landmarks && res.landmarks[0];
        lastFrame = h ? { wristX: 1 - h[0].x, x: 1 - h[8].x, y: h[8].y, pinch: Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y) } : null;   // mirrored for the player
        fails = 0;
      } catch { lastFrame = null; if (++fails > 30) { dropModel(); fails = 0; } }   // a model that keeps failing is rebuilt next game
    };
    return {
      ok: true,
      read() { look(); return lastFrame ? lastFrame.wristX : null; },     // wrist x, 0 left .. 1 right (Fruit Catcher)
      frame() { look(); return lastFrame; },                              // { wristX, x, y, pinch } or null (the other games)
      stop() { stopStream(); video.srcObject = null; },
    };
  } catch (e) {
    stopStream(); video.srcObject = null; dropModel();
    return { ok: false, reason: "Hand tracking could not start on this device. Use the arrow keys or tap the screen." };
  }
}
