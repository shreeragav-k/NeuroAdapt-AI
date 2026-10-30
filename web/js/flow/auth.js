// Create account / sign in. Uses Firebase when it is configured, otherwise accounts kept in this browser
// (the password is stored only as a salted PBKDF2 hash). Both return { profile } or { error }.
import * as L from "./logic.js";
import * as Cloud from "./cloud.js";

// Local accounts only keep casual users out (the hash sits in the same browser storage); Firebase is the secure option.
// The round count is saved with each account, so it can be raised later without breaking old accounts.
const ITER = 20000;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPassword(password, saltHex, iter) {
  if (!globalThis.crypto || !crypto.subtle) throw new Error("This browser cannot protect passwords here. Open the site on localhost or over https.");
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, key, 256));
}

// `state` = { profiles, accounts }  (the storage state)
export async function createAccount(state, input, now = new Date().toISOString(), cloud = Cloud) {
  const v = L.validateSignup(input);
  if (v.error) return { error: v.error };
  state.accounts ||= {};
  try {
    let id;
    if (cloud.enabled) {
      const r = await cloud.signUp(v.email, v.password);
      if (r.error) return r;
      id = r.uid;
    } else {
      if (state.accounts[v.email]) return { error: "An account with this email already exists. Please sign in instead." };
      id = "a" + randomHex(8);
      const salt = randomHex(16);
      state.accounts[v.email] = { id, salt, iter: ITER, hash: await hashPassword(v.password, salt, ITER) };
    }
    const profile = L.newProfile(v, id, now);
    state.profiles[id] = profile;
    return { profile };
  } catch (e) { return { error: e.message }; }
}

export async function signInAccount(state, input, cloud = Cloud) {
  const v = L.validateSignin(input);
  if (v.error) return { error: v.error };
  state.accounts ||= {};
  try {
    if (cloud.enabled) {
      const r = await cloud.signIn(v.email, v.password);
      if (r.error) return r;
      const local = state.profiles[r.uid], remote = await cloud.pullById(r.uid);
      if (remote.status === "found" && (!local || (remote.profile.updated || 0) >= (local.updated || 0))) state.profiles[r.uid] = remote.profile;
      if (!state.profiles[r.uid]) return { error: remote.status === "error" ? "The cloud could not be reached. Please try again." : "This account has no saved details yet. Please create the account again with a different email." };
      return { profile: state.profiles[r.uid] };
    }
    const acc = state.accounts[v.email];
    const wrong = { error: "The email or password is not right." };
    if (!acc) return wrong;
    if ((await hashPassword(v.password, acc.salt, acc.iter || ITER)) !== acc.hash) return wrong;
    const profile = state.profiles[acc.id];
    return profile ? { profile } : { error: "This account has no saved details on this device." };
  } catch (e) { return { error: e.message }; }
}
