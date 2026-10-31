// Local-first storage. Everything stays in this browser.
import { dayKey, shiftDays } from "./logic.js";

const KEY = "neuroadapt:flow:v1";
// Bumping this value wipes every account and result saved in a browser, once, the next time the site opens there.
// (It is how "reset all accounts" works for browsers the developer cannot reach.)
export const RESET_EPOCH = "2026-10-31-reset-all-accounts";
const EPOCH_KEY = "neuroadapt:flow:epoch", OLD_KEYS = ["neuroadapt:fruit:best"];
export const state = { profiles: {}, accounts: {}, activeKey: null, dayOffset: 0 };   // accounts: local sign-in records (only used without Firebase)

export function load() {
  try {
    if (localStorage.getItem(EPOCH_KEY) !== RESET_EPOCH) {                 // a reset was ordered: start clean
      localStorage.removeItem(KEY); OLD_KEYS.forEach((k) => localStorage.removeItem(k)); localStorage.setItem(EPOCH_KEY, RESET_EPOCH);
    }
  } catch { /* storage blocked: nothing to reset */ }
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
