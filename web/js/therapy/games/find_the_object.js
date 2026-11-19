/**
 * PediaSense - Find the Object Game (Attention / Sustained Attention)
 * Level 1: 1 target among 3 | Level 2: 1 target among 6 | Level 3: 2 targets among 9
 */
(function (global) {
  'use strict';

  const FindTheObjectGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const pool = global.GameUI.shuffle(theme.objectSet);
      const targets = pool.slice(0, levelConfig.targetCount);
      const distractorsNeeded = levelConfig.objectCount - targets.length;
      const distractorPool = pool.slice(levelConfig.targetCount).slice(0, distractorsNeeded);
      let board = global.GameUI.shuffle([
        ...targets.map(icon => ({ icon, isTarget: true, found: false })),
        ...distractorPool.map(icon => ({ icon, isTarget: false }))
      ]);

      let foundCount = 0;
      let errors = 0;
      const hintsUsed = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.innerHTML = `Find ${targets.length > 1 ? 'these' : 'this'}: <span class="game-target-preview">${targets.join(' ')}</span>`;
      container.appendChild(instruction);

      const grid = document.createElement('div');
      grid.className = 'find-object-grid';
      container.appendChild(grid);

      function renderGrid() {
        grid.innerHTML = '';
        board.forEach((item, idx) => {
          const el = document.createElement('button');
          el.className = 'find-object-tile' + (item.found ? ' found' : '');
          el.textContent = item.icon;
          el.disabled = !!item.found;
          el.addEventListener('click', () => handleTap(idx));
          grid.appendChild(el);
        });
      }

      function handleTap(idx) {
        const item = board[idx];
        if (item.found) return;
        if (item.isTarget) {
          item.found = true;
          foundCount++;
          renderGrid();
          if (foundCount === targets.length) finish();
        } else {
          errors++;
          renderGrid();
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        const result = { score, errors, timeTakenSec, hintsUsed, attempts: foundCount + errors, completed: true };
        onComplete(result);
      }

      renderGrid();
    }
  };

  global.FindTheObjectGame = FindTheObjectGame;
})(typeof window !== 'undefined' ? window : global);
