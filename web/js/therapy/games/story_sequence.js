/**
 * PediaSense - Story Sequence Game (Sequencing)
 * Level 1: 2 steps | Level 2: 4 steps | Level 3: 6 steps
 * Child taps the shuffled steps in the correct story order (tap-to-place,
 * touch-friendly rather than drag/drop for reliability).
 */
(function (global) {
  'use strict';

  const StorySequenceGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const correctOrder = theme.storySteps.slice(0, levelConfig.stepCount);
      const shuffled = global.GameUI.shuffle(correctOrder.map((step, idx) => ({ step, correctPos: idx, placed: false })));

      let nextExpectedPos = 0;
      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Tap the steps in the right order, starting from the beginning!';
      container.appendChild(instruction);

      const placedRow = document.createElement('div');
      placedRow.className = 'story-placed-row';
      container.appendChild(placedRow);

      const tileRow = document.createElement('div');
      tileRow.className = 'story-tile-row';
      container.appendChild(tileRow);

      function renderPlaced() {
        placedRow.innerHTML = '';
        for (let i = 0; i < correctOrder.length; i++) {
          const slot = document.createElement('div');
          slot.className = 'story-slot' + (i < nextExpectedPos ? ' filled' : '');
          slot.textContent = i < nextExpectedPos ? correctOrder[i] : (i + 1);
          placedRow.appendChild(slot);
        }
      }

      function renderTiles() {
        tileRow.innerHTML = '';
        shuffled.forEach(item => {
          if (item.placed) return;
          const btn = document.createElement('button');
          btn.className = 'story-tile-btn';
          btn.textContent = item.step;
          btn.addEventListener('click', () => handleTap(item, btn));
          tileRow.appendChild(btn);
        });
      }

      function handleTap(item, btn) {
        attempts++;
        if (item.correctPos === nextExpectedPos) {
          item.placed = true;
          nextExpectedPos++;
          renderPlaced();
          renderTiles();
          if (nextExpectedPos === correctOrder.length) setTimeout(finish, 400);
        } else {
          errors++;
          btn.classList.add('incorrect');
          setTimeout(() => btn.classList.remove('incorrect'), 400);
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts, completed: true });
      }

      renderPlaced();
      renderTiles();
    }
  };

  global.StorySequenceGame = StorySequenceGame;
})(typeof window !== 'undefined' ? window : global);
