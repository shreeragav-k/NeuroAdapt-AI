// Local-first state. Profiles live in this browser only; the active profile is
// mirrored to halcyon/data/profile.json by the local server so the PyGame
// runtime can read it. Nothing leaves this computer.

const KEY = "halcyon:v1";

export const DEFAULT_PREFS = {
  movement_mode: "hands",   // hands | pose | none
  posture: "seated",        // seated | standing
  sound: true,
  volume: 0.5,
  animation: "gentle",      // off | gentle | full
  instructions: "steps",    // short | steps | visual
  session_minutes: 5,
  select_method: "pinch",   // pinch | dwell | both
  text_size: "normal",      // normal | large
};

export const state = { profiles: {}, activeId: null };
const subs = new Set();

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      state.profiles = raw.profiles || {};
      state.activeId = raw.activeId || null;
    }
  } catch { /* corrupted storage: start fresh */ }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  subs.forEach((f) => f());
  scheduleSync();
}

export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const active = () => (state.activeId ? state.profiles[state.activeId] || null : null);

export function newId() {
  return "p" + Math.random().toString(36).slice(2, 9);
}

export function createProfile(p) {
  const id = newId();
  state.profiles[id] = {
    id, guest: false, name: "", age: 9, role: "player",
    profile: { self_described: "prefer_not", traits: [], notes: "" },
    preferences: { ...DEFAULT_PREFS }, overrides: {}, pin: null, created: new Date().toISOString(),
    ...p,
  };
  state.profiles[id].preferences = { ...DEFAULT_PREFS, ...(p.preferences || {}) };
  state.activeId = id;
  persist();
  return state.profiles[id];
}

export function startGuest() {
  state.profiles.guest = {
    id: "guest", guest: true, name: "Guest", age: 9, role: "player",
    profile: { self_described: "prefer_not", traits: [], notes: "" },
    preferences: { ...DEFAULT_PREFS }, overrides: {}, pin: null,
  };
  state.activeId = "guest";
  persist();
}

export function update(mutator) {
  const p = active();
  if (!p) return;
  mutator(p);
  persist();
}

export function setActive(id) { state.activeId = id; persist(); }
export function signOut() { state.activeId = null; persist(); }

export function removeProfile(id) {
  delete state.profiles[id];
  if (state.activeId === id) state.activeId = null;
  persist();
}

export function wipeLocal() {
  state.profiles = {}; state.activeId = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

// ---- PIN (optional, stored as a salted hash; protects switching on a shared computer)
export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ":" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- server link (optional: the site still works without it)
let timer = null;
function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const p = active();
    if (!p) return;
    const { pin, ...safe } = p;      // never send the PIN hash anywhere
    try {
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(safe) });
    } catch { /* offline: fine */ }
  }, 350);
}

export async function api(path, opts) {
  try {
    const r = await fetch(path, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export const post = (path, body = {}) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

let catalogCache = null;
export async function catalog() {
  if (!catalogCache) catalogCache = (await api("/catalog.json")) || { games: [], phases: {}, age_range: [5, 17], profile_options: { self_described: [], traits: [] } };
  return catalogCache;
}

// ---- progress: real data from the game, or clearly-labelled sample data for guests
export async function progress() {
  const real = await api("/api/progress");
  if (real && Array.isArray(real.sessions) && real.sessions.length) return { ...real, sample: false };
  return null;
}

export function sampleProgress(cat) {
  const ids = cat.games.map((g) => g.id);
  const rows = [];
  const base = Date.now() - 9 * 86400000;
  const plan = [
    ["lantern_memory", 0.83, 2.0, null], ["quiet_signals", 0.78, 2.2, null], ["sorting_stones", 0.72, 2.0, null],
    ["meadow_search", 0.9, 2.4, null], ["constellation_trace", 0.8, 2.4, "estimate"],
    ["echo_garden", 0.86, 3, "load"], ["pattern_loom", 0.7, 3, null], ["steady_beat", 0.91, 3, "pace"],
  ];
  plan.forEach(([g, acc, lv, changed], i) => {
    rows.push({
      game: g, date: new Date(base + i * 86400000 * 1.1).toISOString(), phase: i < 5 ? "starter" : "adaptive",
      trials: 8, valid_trials: 8, accuracy: acc, median_rt: 2.1, completed: true, tracking_reliability: i % 2 ? 0.9 : null,
      break_requests: 0, feedback: i % 3 === 0 ? "right" : null, dims: { pace: Math.round(lv), load: Math.round(lv), visual: Math.max(1, Math.round(lv) - 1) },
      level_f: lv, input_mode: i % 2 ? "camera" : "pointer", changed,
      adjustment: i < 4 ? "Thank you. We're still getting to know your pace, so everything stays gentle." : i === 4 ? "Thank you for playing five games. A comfortable starting level looks like 3 out of 5." : "That went smoothly, so next time will be a little more to hold in mind. Only this one thing changes.",
    });
  });
  return { completed_count: rows.length, estimate: { done: true, level: 3 }, sessions: rows, games: {}, sample: true, ids };
}
