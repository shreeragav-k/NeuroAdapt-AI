/**
 * PediaSense - What Changed? Game (Visual Memory)
 * Level 1: 3 objects | Level 2: 5 objects | Level 3: 7 objects
 * Show objects briefly, hide, then re-show with one changed. Child taps it.
 */
(function (global) {
  'use strict';

  const WhatChangedGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const count = levelConfig.objectCount;
      const viewMs = levelConfig.viewMs || 4000;

      const pool = global.GameUI.shuffle(theme.objectSet);
      const original = pool.slice(0, count);
      const spareIcons = theme.objectSet.filter(i => !original.includes(i));
      const changeIdx = Math.floor(Math.random() * count);
      const newIcon = spareIcons.length ? global.GameUI.shuffle(spareIcons)[0] : original[(changeIdx + 1) % count];
      const changed = original.slice();
      changed[changeIdx] = newIcon;

      let errors = 0;
      const hintsUsed = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Look closely! Remember what you see...';
      container.appendChild(instruction);

      const grid = document.createElement('div');
      grid.className = 'find-object-grid';
      container.appendChild(grid);

      function renderTiles(icons, clickable) {
        grid.innerHTML = '';
        icons.forEach((icon, idx) => {
          const el = document.createElement('button');
          el.className = 'find-object-tile';
          el.textContent = icon;
          el.disabled = !clickable;
          if (clickable) el.addEventListener('click', () => handlePick(idx, el));
          grid.appendChild(el);
        });
      }

      renderTiles(original, false);

      setTimeout(() => {
        instruction.textContent = 'What changed? Tap it!';
        renderTiles(changed, true);
      }, viewMs);

      function handlePick(idx, el) {
        if (idx === changeIdx) {
          el.classList.add('found');
          setTimeout(finish, 400);
        } else {
          errors++;
          el.disabled = true;
          el.classList.add('incorrect');
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts: errors + 1, completed: true });
      }
    }
  };

  global.WhatChangedGame = WhatChangedGame;
})(typeof window !== 'undefined' ? window : global);
