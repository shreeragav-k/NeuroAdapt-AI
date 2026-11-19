/**
 * Remember the Routine (Memory). A daily routine (morning, bedtime, school) is shown in order, then hidden;
 * the child taps the pictures back in the same order. Routines are familiar and predictable, which suits many autistic children.
 * Level 1: 3 steps | Level 2: 4 steps | Level 3: 5 steps.
 */
(function (global) {
  'use strict';
  const ROUTINES = [
    [['🛏️', 'Wake up'], ['🪥', 'Brush teeth'], ['👕', 'Get dressed'], ['🥣', 'Eat breakfast'], ['🎒', 'Pack bag']],
    [['🍽️', 'Eat dinner'], ['🛁', 'Take a bath'], ['👚', 'Put on pyjamas'], ['📖', 'Read a story'], ['😴', 'Go to sleep']],
    [['🚌', 'Ride the bus'], ['🏫', 'Enter school'], ['✏️', 'Do class work'], ['🍎', 'Eat lunch'], ['🏠', 'Go home']],
  ];
  const RoutineMemoryGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const n = levelConfig.steps, showSec = levelConfig.seconds;
      const routine = ROUTINES[Math.floor(Math.random() * ROUTINES.length)].slice(0, n);
      let next = 0, errors = 0, hints = 0, phase = 'show', done = false;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const msg = document.createElement('p'); msg.className = 'rm-msg'; container.appendChild(msg);
      const strip = document.createElement('ol'); strip.className = 'rm-strip'; container.appendChild(strip);
      const tray = document.createElement('div'); tray.className = 'rm-tray'; container.appendChild(tray);
      const again = document.createElement('button'); again.className = 'btn quiet rm-again'; again.type = 'button'; again.textContent = '👀 Show me again'; container.appendChild(again);

      function drawStrip() {
        strip.innerHTML = '';
        routine.forEach((r, i) => {
          const li = document.createElement('li');
          li.className = 'rm-slot' + (phase === 'show' || i < next ? ' on' : '');
          li.innerHTML = (phase === 'show' || i < next) ? `<span>${r[0]}</span><small>${r[1]}</small><b>${i + 1}</b>` : `<span>❔</span><b>${i + 1}</b>`;
          strip.appendChild(li);
        });
      }
      function drawTray() {
        tray.innerHTML = '';
        if (phase !== 'recall') return;
        global.GameUI.shuffle(routine.map((r, i) => ({ r, i }))).forEach(({ r, i }) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'rm-card';
          b.disabled = i < next; b.innerHTML = `<span>${r[0]}</span><small>${r[1]}</small>`;
          b.onclick = () => pick(i, b);
          tray.appendChild(b);
        });
      }
      function pick(i, b) {
        if (phase !== 'recall' || done) return;
        if (i === next) { next++; drawStrip(); b.disabled = true; b.classList.add('rm-ok'); if (next === n) finish(); else msg.textContent = `Good! What comes ${next === n - 1 ? 'last' : 'next'}?`; }
        else { errors++; b.classList.add('rm-no'); setTimeout(() => b.classList.remove('rm-no'), 400); msg.textContent = 'Not that one. Try another.'; }
      }
      function startShow() {
        phase = 'show'; next = 0; again.hidden = true; msg.textContent = `Look at the day in order. Remember it! (${showSec} seconds)`; drawStrip(); drawTray();
        setTimeout(() => { if (done) return; phase = 'recall'; msg.textContent = 'What happens first? Tap the pictures in order.'; again.hidden = false; drawStrip(); drawTray(); }, showSec * 1000);
      }
      again.onclick = () => { if (phase === 'recall' && !done) { hints++; startShow(); } };
      function finish() {
        done = true;
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        onComplete({ score: global.GameUI.computeScore(errors, hints), errors, timeTakenSec, hintsUsed: hints, attempts: n + errors, completed: true });
      }
      startShow();
    }
  };
  global.RoutineMemoryGame = RoutineMemoryGame;
})(typeof window !== 'undefined' ? window : global);
