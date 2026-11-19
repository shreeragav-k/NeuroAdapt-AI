// Runs the PediaSense game widgets (classic scripts) inside NeuroAdapt: loads them on demand, gives them the two
// helpers they expect (voiceService, cameraService) and mounts a game with its theme and level.
//   - Speech: the browser's own speechSynthesis (reads aloud) and, only if the browser has it, SpeechRecognition
//     (the child can answer by voice). Nothing is recorded or stored by this site; speech recognition is done by
//     the browser, which may use its vendor's speech service. Every use is optional and there is always a tap/type way.
//   - Camera: the same shared opener as every other game (flow/handtrack.js), picture analysed on this device only.
import { acquireStream } from "../flow/handtrack.js";
import { getGameById } from "./catalog.js";

const BASE = new URL("./", import.meta.url).href;
const loaded = new Map();
function loadScript(rel) {
  if (!loaded.has(rel)) loaded.set(rel, new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = BASE + rel; s.async = false;
    s.onload = ok; s.onerror = () => { loaded.delete(rel); no(new Error("Could not load " + rel)); };
    document.head.appendChild(s);
  }));
  return loaded.get(rel);
}

// ---------------------------------------------------------------- speech
const LANG_TAG = { en: "en-IN", hi: "hi-IN", ta: "ta-IN" };
let muted = false, lang = "en", rec = null;
const synth = () => (typeof window !== "undefined" && window.speechSynthesis) || null;
function pickVoice(l) {
  const s = synth(); if (!s) return null;
  const vs = s.getVoices(), pre = l.split("-")[0];
  const mine = vs.filter((v) => v.lang && v.lang.toLowerCase().startsWith(pre));
  return mine.find((v) => /female|zira|heera|veena|valluvar|neerja|swara|pallavi|samantha|google/i.test(v.name)) || mine[0] || null;
}
export const voice = {
  supported: () => !!synth(),
  canListen: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  setLang(l) { lang = LANG_TAG[l] ? l : "en"; },
  setMuted(m) { muted = !!m; if (m) this.stopSpeaking(); },
  isMuted: () => muted,
  speak(text, onEnd, onStart, l) {
    const s = synth(); this.stopSpeaking();
    if (!s || muted || !text) { onStart && onStart(); onEnd && setTimeout(onEnd, 0); return; }
    const u = new SpeechSynthesisUtterance(String(text)), tag = LANG_TAG[l || lang] || "en-IN";
    u.lang = tag; u.rate = 0.9; u.pitch = 1.1;
    const v = pickVoice(tag); if (v) u.voice = v;
    let finished = false; const end = () => { if (!finished) { finished = true; onEnd && onEnd(); } };
    u.onstart = () => onStart && onStart(); u.onend = end; u.onerror = end;
    s.speak(u);
  },
  stopSpeaking() { const s = synth(); if (s) s.cancel(); },
  startRecording(cb, l) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return false;
    this.stopRecording();
    rec = new R(); rec.lang = LANG_TAG[l || lang] || "en-IN"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => { let t = "", fin = false; for (const r of e.results) { t += r[0].transcript; fin = fin || r.isFinal; } cb(t.trim(), fin); };
    rec.onerror = () => cb("", true); rec.onend = () => { rec = null; };
    try { rec.start(); } catch { return false; }
    return true;
  },
  stopRecording() { if (rec) { try { rec.stop(); } catch { /* already stopped */ } rec = null; } },
};

// ---------------------------------------------------------------- camera (copy_movement only)
let camStop = null;
export const camera = {
  async startCamera(video) {
    const r = await acquireStream(video, {});
    if (r.ok) camStop = r.stop;
    return { success: r.ok, message: r.reason || "" };
  },
  stopCamera() { if (camStop) { camStop(); camStop = null; } },
};

// ---------------------------------------------------------------- games
let ready = null;
export function loadRuntime() {
  if (!ready) {
    window.voiceService = voice; window.cameraService = camera;
    ready = loadScript("games/shared.js").then(() => loadScript("data/theme_catalog.js"));
  }
  return ready;
}
export function themes() { return window.THEME_CATALOG || []; }

// mountGame(container, gameId, { level, themeId, onComplete, onExit }) -> stop()
export async function mountGame(container, gameId, { level = 1, themeId = "nature", onComplete, onExit }) {
  const game = getGameById(gameId); if (!game) throw new Error("Unknown game " + gameId);
  await loadRuntime(); await loadScript(`games/${gameId}.js`);
  const mod = window[game.module]; if (!mod) throw new Error(game.module + " did not load");
  const theme = window.ThemeCatalog.getThemeById(themeId);
  const gameTitle = window.ThemeCatalog.getGameTitle(themeId, gameId, game.name);
  const levelConfig = game.levels[level] || game.levels[1];
  container.classList.add("pg");
  mod.render(container, { levelConfig, theme, gameTitle, methodConfig: null, level, onComplete, onExit });
  return () => { voice.stopSpeaking(); voice.stopRecording(); camera.stopCamera(); container.classList.remove("pg"); container.innerHTML = ""; };
}
