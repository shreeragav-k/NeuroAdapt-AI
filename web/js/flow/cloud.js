// Optional Firebase backend: Authentication (email + password) and Firestore (one document per account).
// Off until firebase-config.js has a config. Functions return { error } instead of throwing.
import { FIREBASE_CONFIG } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
export const enabled = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

let ready = null, listeners = [], timer = null, pending = null, inflight = Promise.resolve(true);
const say = (status, detail = "") => listeners.forEach((f) => f(status, detail));
export const onStatus = (f) => { listeners.push(f); return () => (listeners = listeners.filter((x) => x !== f)); };

function init() {
  ready ||= (async () => {
    const [app, auth, fs] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    return { auth: auth.getAuth(a), A: auth, db: fs.getFirestore(a), doc: fs.doc, getDoc: fs.getDoc, setDoc: fs.setDoc };
  })();
  return ready;
}

const MESSAGES = {
  "auth/email-already-in-use": "An account with this email already exists. Please sign in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Please choose a stronger password (at least 8 characters).",
  "auth/user-not-found": "The email or password is not right.",
  "auth/wrong-password": "The email or password is not right.",
  "auth/invalid-credential": "The email or password is not right.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "The cloud could not be reached. Check the internet connection.",
  "auth/operation-not-allowed": "Email and password sign-in is not switched on in the Firebase project (see FIREBASE.md, step 2).",
};
const fail = (e) => ({ error: MESSAGES[e && e.code] || `Something went wrong with the cloud (${(e && (e.code || e.message)) || "unknown"}).` });

// ---- accounts
export async function signUp(email, password) {
  try { const f = await init(); const c = await f.A.createUserWithEmailAndPassword(f.auth, email, password); return { uid: c.user.uid }; } catch (e) { return fail(e); }
}
export async function signIn(email, password) {
  try { const f = await init(); const c = await f.A.signInWithEmailAndPassword(f.auth, email, password); return { uid: c.user.uid }; } catch (e) { return fail(e); }
}
export async function signOut() {
  if (!enabled) return;
  try { await flush(); const f = await init(); await f.A.signOut(f.auth); say("off"); } catch { /* already signed out */ }
}
// Who is still signed in from an earlier visit? -> uid or null
export async function restore() {
  if (!enabled) return null;
  try {
    const f = await init();
    return await new Promise((res) => { const t = setTimeout(() => res(null), 6000); const un = f.A.onAuthStateChanged(f.auth, (u) => { clearTimeout(t); un(); res(u ? u.uid : null); }); });
  } catch { return null; }
}

// ---- the account's saved details
export async function pullById(uid) {
  try {
    const f = await init(), snap = await f.getDoc(f.doc(f.db, "players", uid));
    say("ready");
    return snap.exists() ? { status: "found", profile: JSON.parse(snap.data().data) } : { status: "new" };
  } catch (e) { say("error", e.message); return { status: "error" }; }
}

// Save the profile (0.6 s after the last change, so a burst of changes is one write).
export function push(profile) {
  if (!enabled || !profile) return;
  pending = profile; say("saving");
  clearTimeout(timer);
  timer = setTimeout(flush, 600);
}

// Resolves true when everything pending has been written.
export function flush() {
  clearTimeout(timer);
  const p = pending; pending = null;
  if (!enabled || !p) return inflight;
  inflight = inflight.then(async () => {
    try {
      const f = await init();
      await f.setDoc(f.doc(f.db, "players", p.key), {
        key: p.key, email: p.email || "", name: p.name, age: p.age, groupId: p.groupId, condition: p.condition || "",
        level: p.level, stage: p.test.completed ? "learning" : "assessment", sessions: p.sessions.length,
        updated: p.updated || Date.now(), data: JSON.stringify(p),
      });
      say("saved"); return true;
    } catch (e) { say("error", e.message); return false; }
  });
  return inflight;
}
