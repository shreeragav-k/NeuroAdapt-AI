/**
 * Odd One Out (Cognitive: flexible thinking and categorising). Three pictures belong together, one does not: tap the one that does not belong.
 * Level 1: 4 pictures, 4 rounds | Level 2: 5 pictures, 5 rounds | Level 3: 6 pictures, 6 rounds.
 */
(function (global) {
  'use strict';
  const GROUPS = {
    Animals: ['🐶', '🐱', '🐰', '🐻', '🐼', '🦁'], Fruit: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍐'], Vehicles: ['🚗', '🚌', '🚲', '🚂', '✈️', '🚢'],
    Clothes: ['👕', '👖', '🧦', '🧢', '🧤', '👗'], Food: ['🍞', '🧀', '🥕', '🍪', '🥛', '🍚'], Toys: ['🧸', '⚽', '🪁', '🎲', '🧩', '🪀'],
  };
  const OddOneOutGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const rounds = levelConfig.rounds, count = levelConfig.items;
      const names = Object.keys(GROUPS);
      let round = 0, errors = 0, hints = 0, locked = false;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const msg = document.createElement('p'); msg.className = 'oo-msg'; container.appendChild(msg);
      const grid = document.createElement('div'); grid.className = 'oo-grid'; container.appendChild(grid);
      const hintBtn = document.createElement('button'); hintBtn.type = 'button'; hintBtn.className = 'btn quiet'; hintBtn.textContent = '💡 Give me a hint'; container.appendChild(hintBtn);
      let current = null;

      function newRound() {
        locked = false; round++;
        const main = names[Math.floor(Math.random() * names.length)];
        const other = names.filter((x) => x !== main)[Math.floor(Math.random() * (names.length - 1))];
        const same = global.GameUI.shuffle(GROUPS[main]).slice(0, count - 1), odd = global.GameUI.shuffle(GROUPS[other])[0];
        current = { items: global.GameUI.shuffle([...same.map((e) => ({ e, odd: false })), { e: odd, odd: true }]), main };
        msg.textContent = `Round ${round} of ${rounds}: three go together. Which one does not belong?`;
        grid.innerHTML = '';
        current.items.forEach((it) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'oo-item'; b.textContent = it.e; b.setAttribute('aria-label', 'Picture');
          b.onclick = () => choose(it, b); grid.appendChild(b);
        });
      }
      function choose(it, b) {
        if (locked) return;
        if (it.odd) { locked = true; b.classList.add('oo-ok'); msg.textContent = 'Yes! That one is different.'; setTimeout(() => (round >= rounds ? finish() : newRound()), 700); }
        else { errors++; b.classList.add('oo-no'); b.disabled = true; msg.textContent = 'Look again. Which one is different?'; }
      }
      hintBtn.onclick = () => { if (!current || locked) return; hints++; msg.textContent = `Hint: most of these are ${current.main.toLowerCase()}.`; };
      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        onComplete({ score: global.GameUI.computeScore(errors, hints), errors, timeTakenSec, hintsUsed: hints, attempts: rounds + errors, completed: true });
      }
      newRound();
    }
  };
  global.OddOneOutGame = OddOneOutGame;
})(typeof window !== 'undefined' ? window : global);
