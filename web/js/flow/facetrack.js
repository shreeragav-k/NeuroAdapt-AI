// Face tracking in the browser for Make a Face: the webcam plus MediaPipe's Face Landmarker (files in
// /vendor/mediapipe, so it works offline). The video is analysed on this device and is never recorded or sent
// anywhere. All that leaves the model is a list of numbers ("blendshapes": how far the mouth smiles, the jaw is
// open, an eye is closed ...); the picture itself is not kept.
//
//   const t = await startFaceTracking(videoEl, { onStatus, onPreview, cancelled })
//   t.frame()  -> { mouthSmileLeft: 0.4, jawOpen: 0.1, ... } averaged over the last pictures, or null (no face)
//   t.stop()
import { acquireStream } from "./handtrack.js";
import { Smoother } from "./expressions.js";

const BASE = "/vendor/mediapipe";
let model = null, loading = null;

async function loadModel() {
  if (model) return model;
  if (!loading) {
    loading = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import(`${BASE}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      const make = (delegate) => FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/face_landmarker.task`, delegate },
        runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: false,
      });
      try { model = await make("GPU"); } catch { model = await make("CPU"); }
      return model;
    })().finally(() => { loading = null; });
  }
  return loading;
}
const dropModel = () => { try { model && model.close(); } catch { /* already closed */ } model = null; };

// Build the face model ahead of time (no camera is touched), e.g. while the player reads the game card.
export function preloadFaceModel() {
  if (model || loading || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return;
  setTimeout(() => { loadModel().catch(() => {}); }, 600);
}

export async function startFaceTracking(video, { onStatus = () => {}, onPreview = () => {}, cancelled = () => false } = {}) {
  const cam = await acquireStream(video, { onStatus, cancelled });
  if (!cam.ok) return cam;
  try {
    onPreview();
    onStatus(model ? "Starting face tracking…" : "Loading face tracking. This can take a few seconds the first time.");
    const lm = await loadModel();
    if (cancelled()) { cam.stop(); return { ok: false, reason: "cancelled" }; }
    const smooth = new Smoother();
    let lastTime = -1, lastAt = 0, last = null, fails = 0;
    return {
      ok: true,
      frame() {
        const now = performance.now();
        if (video.readyState < 2 || video.currentTime === lastTime || now - lastAt < 33) return last;
        lastTime = video.currentTime; lastAt = now;
        try {
          const res = lm.detectForVideo(video, now), cats = res.faceBlendshapes && res.faceBlendshapes[0] && res.faceBlendshapes[0].categories;
          last = cats ? smooth.push(Object.fromEntries(cats.map((c) => [c.categoryName, c.score]))) : smooth.push(null);
          fails = 0;
        } catch { last = null; if (++fails > 30) { dropModel(); fails = 0; } }
        return last;
      },
      read() { return null; },
      stop() { cam.stop(); },
    };
  } catch {
    cam.stop(); dropModel();
    return { ok: false, reason: "Face tracking could not start on this device. Play without the camera." };
  }
}
