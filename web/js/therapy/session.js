// The virtual therapist session: Dr. Sarah asks 7 short questions (read aloud, answered by tapping, typing or
// speaking), then the child plays 4 short movement games that look at fine and gross motor skills.
// Nothing here scores or saves; it collects `data` and hands it to onDone(data) (the engine scores it).
import { QUESTIONS_I18N, LANGS } from "./questions.js";
import { SESSION_MOTOR, choicesFor } from "./engine.js";
import { getGameById } from "./catalog.js";
import { voice, mountGame } from "./runtime.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const T = {
  en: { hello: (n) => `Hello ${n}! I'm Dr. Sarah, your virtual therapist. I'll ask a few easy questions, then we'll play some tiny games. There are no wrong answers.`, start: "Start the session", say: "Say it", listening: "Listening…", send: "Send answer", skip: "Skip", repeat: "Hear again", ph: "Type your answer here", games: "Now let's play a few small games with your hand and arms. Ready?", go: "Play", skipg: "Skip this game", next: "Next", done: "All done! Thank you. You did really well.", q: "Question", of: "of", g: "Game", pause: "Pause" },
  hi: { hello: (n) => `नमस्ते ${n}! मैं डॉ. सारा हूँ, आपकी वर्चुअल थेरेपिस्ट। मैं कुछ आसान सवाल पूछूँगी, फिर हम छोटे खेल खेलेंगे। कोई जवाब गलत नहीं होता।`, start: "सत्र शुरू करें", say: "बोलकर बताएँ", listening: "सुन रही हूँ…", send: "जवाब भेजें", skip: "छोड़ें", repeat: "फिर सुनें", ph: "अपना जवाब यहाँ लिखें", games: "अब हाथ और बाँहों से कुछ छोटे खेल खेलते हैं। तैयार?", go: "खेलें", skipg: "यह खेल छोड़ें", next: "आगे", done: "बहुत बढ़िया! धन्यवाद। आपने अच्छा किया।", q: "सवाल", of: "में से", g: "खेल", pause: "रोकें" },
  ta: { hello: (n) => `வணக்கம் ${n}! நான் டாக்டர் சாரா, உங்கள் வெர்ச்சுவல் தெரபிஸ்ட். சில எளிய கேள்விகள் கேட்பேன், பிறகு சிறிய விளையாட்டுகள் விளையாடுவோம். தவறான பதில் என்று எதுவும் இல்லை.`, start: "அமர்வைத் தொடங்கு", say: "பேசி சொல்லுங்கள்", listening: "கேட்கிறேன்…", send: "பதிலை அனுப்பு", skip: "தவிர்", repeat: "மீண்டும் கேள்", ph: "உங்கள் பதிலை இங்கே எழுதுங்கள்", games: "இப்போது கை மற்றும் கைகளால் சில சிறிய விளையாட்டுகள் விளையாடுவோம். தயாரா?", go: "விளையாடு", skipg: "இந்த விளையாட்டைத் தவிர்", next: "அடுத்து", done: "முடிந்தது! நன்றி. நீங்கள் மிகவும் நன்றாகச் செய்தீர்கள்.", q: "கேள்வி", of: "/", g: "விளையாட்டு", pause: "நிறுத்து" },
};
const IMG = { idle: "img/therapist/room.jpg", talk: "img/therapist/room-speaking.jpg" };

export function mountSession(root, { name = "friend", lang = "en", theme = "nature", onDone, onExit }) {
  const data = { lang, answers: {}, motor: [] };
  let step = -1, stopGame = null, gone = false, blink = null, listening = false;
  const first = String(name).trim().split(/\s+/)[0] || "friend";
  const t = () => T[lang] || T.en;
  const qs = () => QUESTIONS_I18N[lang] || QUESTIONS_I18N.en;
  const total = () => qs().length + SESSION_MOTOR.length;

  root.innerHTML = `<div class="th">
    <div class="th-top"><div class="th-langs" role="group" aria-label="Language"></div>
      <div class="th-tools"><button class="btn small quiet" id="th-mute" type="button" aria-pressed="false"></button><button class="btn small quiet" id="th-exit" type="button">Leave session</button></div></div>
    <div class="th-grid"><figure class="th-room"><img id="th-img" src="${IMG.idle}" alt="Dr. Sarah, a friendly therapist, sitting in a bright room"><figcaption>Dr. Sarah</figcaption></figure>
      <section class="th-panel" aria-live="polite"><div class="th-dots" id="th-dots"></div><div id="th-body"></div></section></div>
    <p class="th-note">This is a play-based screening to choose games. It is not a diagnosis or a medical assessment.</p></div>`;
  const $ = (s) => root.querySelector(s), body = $("#th-body"), img = $("#th-img");

  // ---- speaking: swap the picture while Dr. Sarah talks
  function say(text, then) {
    clearInterval(blink); img.src = IMG.idle;
    voice.setLang(lang);
    voice.speak(text, () => { clearInterval(blink); img.src = IMG.idle; then && then(); },
      () => { let o = false; blink = setInterval(() => { o = !o; img.src = o ? IMG.talk : IMG.idle; }, 280); }, lang);
  }
  const bubble = (text) => `<div class="th-bubble" role="status"><b>Dr. Sarah</b><p>${esc(text)}</p></div>`;

  function paintTop() {
    $(".th-langs").innerHTML = LANGS.map(([c, l]) => `<button type="button" class="chip ${c === lang ? "" : "soft"}" data-l="${c}" aria-pressed="${c === lang}">${esc(l)}</button>`).join("");
    $(".th-langs").querySelectorAll("button").forEach((b) => (b.onclick = () => { lang = b.dataset.l; data.lang = lang; paintTop(); render(); }));
    const m = $("#th-mute"); m.textContent = voice.isMuted() ? "🔇 Voice off" : "🔊 Voice on"; m.setAttribute("aria-pressed", voice.isMuted());
    m.onclick = () => { voice.setMuted(!voice.isMuted()); paintTop(); };
    $("#th-dots").innerHTML = step < 0 ? "" : Array.from({ length: total() }, (_, i) => `<i class="${i < step ? "done" : i === step ? "now" : ""}"></i>`).join("");
  }

  function render() {
    if (gone) return;
    paintTop();
    if (step < 0) return renderIntro();
    if (step < qs().length) return renderQuestion();
    const k = step - qs().length;
    if (k < SESSION_MOTOR.length) return renderMotor(k);
    return renderFinish();
  }

  function renderIntro() {
    const msg = t().hello(first);
    body.innerHTML = `${bubble(msg)}<div class="th-actions"><button class="btn lg" id="th-start" type="button">${esc(t().start)}</button></div>`;
    $("#th-start").onclick = () => { voice.stopSpeaking(); step = 0; render(); };
    say(msg);
  }

  function renderQuestion() {
    const q = qs()[step], tt = t(), choices = choicesFor(lang, q.id), canListen = voice.canListen();
    body.innerHTML = `<p class="th-count">${esc(tt.q)} ${step + 1} ${esc(tt.of)} ${qs().length}</p>${bubble(q.text)}
      <div class="th-choices" role="group" aria-label="Quick answers">${choices.map((c) => `<button type="button" class="btn quiet th-choice">${esc(c)}</button>`).join("")}</div>
      <form class="th-form" id="th-form"><label class="sr-only" for="th-ans">${esc(tt.ph)}</label><input id="th-ans" type="text" maxlength="200" autocomplete="off" placeholder="${esc(tt.ph)}">
        <button class="btn" type="submit">${esc(tt.send)}</button>${canListen ? `<button class="btn quiet" type="button" id="th-mic">🎤 ${esc(tt.say)}</button>` : ""}</form>
      <div class="th-actions"><button class="btn small quiet" type="button" id="th-again">🔁 ${esc(tt.repeat)}</button><button class="btn small quiet" type="button" id="th-skip">${esc(tt.skip)}</button></div>`;
    const input = $("#th-ans"), answer = (text, kind) => { voice.stopSpeaking(); voice.stopRecording(); data.answers[q.id] = { text, kind }; step++; render(); };
    body.querySelectorAll(".th-choice").forEach((b) => (b.onclick = () => answer(b.textContent, "tapped")));
    $("#th-form").onsubmit = (e) => { e.preventDefault(); const v = input.value.trim(); if (v) answer(v, listening ? "spoken" : "typed"); else input.focus(); };
    $("#th-skip").onclick = () => answer("", "skipped");
    $("#th-again").onclick = () => say(q.text);
    const mic = $("#th-mic");
    if (mic) mic.onclick = () => {
      if (listening) { voice.stopRecording(); listening = false; mic.textContent = `🎤 ${tt.say}`; return; }
      voice.stopSpeaking(); listening = true; mic.textContent = `⏹ ${tt.listening}`;
      voice.startRecording((text, fin) => { input.value = text; if (fin) { listening = false; mic.textContent = `🎤 ${tt.say}`; if (text) { data.answers[q.id] = { text, kind: "spoken" }; setTimeout(() => { if (!gone && qs()[step] === q) { step++; render(); } }, 700); } } }, lang);
    };
    say(q.text);
  }

  function renderMotor(k) {
    const m = SESSION_MOTOR[k], g = getGameById(m.gameId), tt = t();
    body.innerHTML = `<p class="th-count">${esc(tt.g)} ${k + 1} ${esc(tt.of)} ${SESSION_MOTOR.length}</p>${bubble(k === 0 ? `${tt.games} ${g.name}: ${g.description}` : `${g.name}: ${g.description}`)}
      <div class="th-actions"><button class="btn lg" id="th-go" type="button">${esc(tt.go)}</button><button class="btn quiet" id="th-skipg" type="button">${esc(tt.skipg)}</button></div>`;
    const skipIt = () => { voice.stopSpeaking(); data.motor.push(null); step++; render(); };
    $("#th-skipg").onclick = skipIt;
    $("#th-go").onclick = async () => {
      voice.stopSpeaking();
      body.innerHTML = `<div class="th-game" id="th-game"><p class="muted">Loading…</p></div>`;
      const box = $("#th-game");
      try {
        stopGame = await mountGame(box, m.gameId, { level: m.level, themeId: theme,
          onComplete: (r) => { stopGame && stopGame(); stopGame = null; data.motor.push({ gameId: m.gameId, domain: m.domain, score: r.score, errors: r.errors, timeTakenSec: r.timeTakenSec, completed: !!r.completed }); step++; render(); },
          onExit: () => { stopGame && stopGame(); stopGame = null; skipIt(); } });
      } catch { skipIt(); }
    };
    say(k === 0 ? `${tt.games} ${g.name}. ${g.description}` : `${g.name}. ${g.description}`);
  }

  function renderFinish() {
    const msg = t().done;
    body.innerHTML = `${bubble(msg)}<div class="th-actions"><button class="btn lg" id="th-fin" type="button">See the results</button></div>`;
    $("#th-fin").onclick = () => { voice.stopSpeaking(); stop(); onDone(data); };
    say(msg);
  }

  function stop() { gone = true; clearInterval(blink); voice.stopSpeaking(); voice.stopRecording(); stopGame && stopGame(); stopGame = null; }
  $("#th-exit").onclick = () => { stop(); onExit && onExit(); };
  render();
  return stop;
}
