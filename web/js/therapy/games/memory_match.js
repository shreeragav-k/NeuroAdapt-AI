/**
 * PediaSense - Memory Match Game (Working Memory)
 * Level 1: 2 pairs | Level 2: 5 pairs | Level 3: 7 pairs
 */
(function (global) {
  'use strict';

  const MemoryMatchGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const pairs = levelConfig.pairs;
      const icons = global.GameUI.shuffle(theme.objectSet).slice(0, pairs);
      let deck = global.GameUI.shuffle([...icons, ...icons]).map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));

      let firstPick = null;
      let lock = false;
      let errors = 0;
      let hintsUsed = 0;
      let matchesFound = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const grid = document.createElement('div');
      grid.className = 'memory-grid';
      grid.style.setProperty('--cols', Math.min(pairs * 2, 6) < 1 ? 4 : Math.ceil(Math.sqrt(pairs * 2)));
      container.appendChild(grid);

      function renderGrid() {
        grid.innerHTML = '';
        deck.forEach(card => {
          const cardEl = document.createElement('button');
          cardEl.className = 'memory-card' + (card.flipped || card.matched ? ' flipped' : '') + (card.matched ? ' matched' : '');
          cardEl.textContent = (card.flipped || card.matched) ? card.icon : '❔';
          cardEl.disabled = card.matched || lock;
          cardEl.addEventListener('click', () => handlePick(card.id));
          grid.appendChild(cardEl);
        });
      }

      function handlePick(id) {
        const card = deck.find(c => c.id === id);
        if (!card || card.flipped || card.matched || lock) return;
        card.flipped = true;
        renderGrid();

        if (firstPick === null) {
          firstPick = card;
          return;
        }

        lock = true;
        const second = card;
        setTimeout(() => {
          if (firstPick.icon === second.icon) {
            firstPick.matched = true;
            second.matched = true;
            matchesFound++;
          } else {
            firstPick.flipped = false;
            second.flipped = false;
            errors++;
          }
          firstPick = null;
          lock = false;
          renderGrid();

          if (matchesFound === pairs) finish();
        }, 700);
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        const result = { score, errors, timeTakenSec, hintsUsed, attempts: matchesFound + errors, completed: true };
        onComplete(result);
      }

      renderGrid();
    }
  };

  global.MemoryMatchGame = MemoryMatchGame;
})(typeof window !== 'undefined' ? window : global);
