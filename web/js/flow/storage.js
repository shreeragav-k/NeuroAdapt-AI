// Local-first storage. Everything stays in this browser.
import { dayKey, shiftDays } from "./logic.js";

const KEY = "neuroadapt:flow:v1";
export const state = { profiles: {}, accounts: {}, activeKey: null, dayOffset: 0 };   // accounts: local sign-in records (only used without Firebase)

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      state.profiles = raw.profiles && typeof raw.profiles === "object" ? raw.profiles : {};
      state.accounts = raw.accounts && typeof raw.accounts === "object" ? raw.accounts : {};
      state.activeKey = raw.activeKey && state.profiles[raw.activeKey] ? raw.activeKey : null;
      state.dayOffset = Number.isInteger(raw.dayOffset) ? raw.dayOffset : 0;
    }
  } catch { /* unreadable storage: start fresh */ }
}
export const hooks = { afterSave: null };      // the app plugs cloud saving in here
export function save() {
  const p = active(); if (p) p.updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep working in memory */ }
  if (hooks.afterSave && p) hooks.afterSave(p);
}
export const active = () => (state.activeKey ? state.profiles[state.activeKey] || null : null);
export const today = () => dayKey(shiftDays(new Date(), state.dayOffset));
export function skipToNextDay() { state.dayOffset += 1; save(); }
export function signOut() { state.activeKey = null; save(); }
export function wipe() { state.profiles = {}; state.accounts = {}; state.activeKey = null; state.dayOffset = 0; try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
