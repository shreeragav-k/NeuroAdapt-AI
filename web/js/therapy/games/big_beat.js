/**
 * Big Beat (Gross Motor: bilateral coordination, rhythm, using both sides of the body). Big pads light up in a beat; tap them in the same order
 * with a big arm movement (left hand for the left pad, right hand for the right pad if two hands are free).
 * Level 1: 2 pads, 4 beats | Level 2: 2 pads, 6 beats | Level 3: 3 pads, 8 beats.
 */
(function (global) {
  'use strict';
  const BigBeatGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const pads = levelConfig.pads, beats = levelConfig.beats, gap = levelConfig.gap || 750;
      const seq = []; for (let i = 0; i < beats; i++) { let p; do { p = Math.floor(Math.random() * pads); } while (i > 0 && pads > 1 && p === seq[i - 1] && Math.random() < 0.5); seq.push(p); }
      const icons = ['🥁', '🔔', '🎵'], colors = ['#2478e5', '#f5a524', '#2fb344'];
      let idx = 0, errors = 0, hints = 0, playing = false, done = false;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const msg = document.createElement('p'); msg.className = 'bb-msg'; container.appendChild(msg);
      const row = document.createElement('div'); row.className = 'bb-row'; container.appendChild(row);
      const padEls = Array.from({ length: pads }, (_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bb-pad'; b.style.setProperty('--c', colors[i]); b.innerHTML = `<span>${icons[i]}</span><small>${pads === 2 ? (i === 0 ? 'Left' : 'Right') : ['Left', 'Middle', 'Right'][i]}</small>`; b.onclick = () => tap(i); row.appendChild(b); return b; });
      const again = document.createElement('button'); again.type = 'button'; again.className = 'btn quiet'; again.textContent = '👂 Show the beat again'; again.onclick = () => { if (!playing && !done) { hints++; play(); } }; container.appendChild(again);

      const flash = (i) => { padEls[i].classList.add('bb-on'); setTimeout(() => padEls[i].classList.remove('bb-on'), gap * 0.6); };
      function play() {
        playing = true; idx = 0; msg.textContent = 'Watch the beat…'; padEls.forEach((p) => (p.disabled = true));
        seq.forEach((p, k) => setTimeout(() => { if (!done) flash(p); }, 500 + k * gap));
        setTimeout(() => { if (done) return; playing = false; padEls.forEach((p) => (p.disabled = false)); msg.textContent = `Your turn! Tap the pads in the same order. (${beats} beats)`; }, 500 + beats * gap);
      }
      function tap(i) {
        if (playing || done) return;
        flash(i);
        if (i === seq[idx]) { idx++; msg.textContent = `Beat ${idx} of ${beats}`; if (idx === beats) finish(); }
        else { errors++; msg.textContent = 'Oops! Watch it once more.'; setTimeout(play, 700); }
      }
      function finish() {
        done = true; const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        setTimeout(() => onComplete({ score: global.GameUI.computeScore(errors, hints), errors, timeTakenSec, hintsUsed: hints, attempts: beats + errors, completed: true }), 500);
      }
      play();
    }
  };
  global.BigBeatGame = BigBeatGame;
})(typeof window !== 'undefined' ? window : global);
