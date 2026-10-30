// Soft tones for the memory games (each pad has its own note) and a quiet right / wrong chime.
// Off switch: setMuted(true). The choice is remembered in this browser.
const KEY = "neuroadapt:muted";
let ctx = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked */ }

export const isMuted = () => muted;
export function setMuted(v) { muted = !!v; try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch { /* ignore */ } }

function audio() {
  if (muted) return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx ||= new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

export function tone(freq, ms = 240, type = "sine", vol = 0.11) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + ms / 1000 + 0.05);
}

// a pentatonic scale, so any order of pads still sounds pleasant
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 988, 1047];
export const padFreq = (i) => SCALE[i % SCALE.length];

export function chime(ok) {
  if (ok) { tone(523, 120); setTimeout(() => tone(784, 220), 110); }
  else tone(220, 260, "triangle", 0.08);
}
