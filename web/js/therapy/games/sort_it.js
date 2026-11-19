/**
 * PediaSense - Sort It! Game (Categorization)
 * Level 1: sort by color (3 bins, 6 items) | Level 2: sort by shape (2 bins, 8 items)
 * Level 3: sort by color, then rule switches to shape mid-game (8 items)
 * Uses a fixed colored-shape item bank so the sort logic is unambiguous;
 * the screen title/reward text is still fully themed.
 */
(function (global) {
  'use strict';

  const ITEM_BANK = [
    { emoji: '🔴', color: 'Red', shape: 'Circle' },
    { emoji: '🔵', color: 'Blue', shape: 'Circle' },
    { emoji: '🟢', color: 'Green', shape: 'Circle' },
    { emoji: '🟡', color: 'Yellow', shape: 'Circle' },
    { emoji: '🟥', color: 'Red', shape: 'Square' },
    { emoji: '🟦', color: 'Blue', shape: 'Square' },
    { emoji: '🟩', color: 'Green', shape: 'Square' },
    { emoji: '🟨', color: 'Yellow', shape: 'Square' }
  ];

  function buildRound(rule, items) {
    const bins = [...new Set(items.map(i => i[rule]))];
    return { rule, items: global.GameUI.shuffle(items), bins };
  }

  const SortItGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;

      let rounds;
      if (levelConfig.switchRule) {
        const colorItems = ITEM_BANK.filter(i => ['Red', 'Blue', 'Green', 'Yellow'].includes(i.color)).slice(0, 4);
        const shapeItems = ITEM_BANK.filter(i => !colorItems.includes(i)).slice(0, 4);
        rounds = [buildRound('color', colorItems), buildRound('shape', shapeItems)];
      } else if (levelConfig.rule === 'color') {
        rounds = [buildRound('color', ITEM_BANK.filter(i => ['Red', 'Blue', 'Green'].includes(i.color)))];
      } else {
        rounds = [buildRound('shape', ITEM_BANK)];
      }

      let roundIdx = 0;
      let itemIdx = 0;
      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const ruleBanner = document.createElement('div');
      ruleBanner.className = 'game-instruction';
      container.appendChild(ruleBanner);

      const currentItemEl = document.createElement('div');
      currentItemEl.className = 'sort-current-item';
      container.appendChild(currentItemEl);

      const binsRow = document.createElement('div');
      binsRow.className = 'sort-bins-row';
      container.appendChild(binsRow);

      function renderRound() {
        const round = rounds[roundIdx];
        ruleBanner.textContent = roundIdx > 0 ? `🔄 Rule changed! Now sort by ${round.rule}` : `Sort by ${round.rule}`;
        renderItem();
        renderBins();
      }

      function renderItem() {
        const round = rounds[roundIdx];
        if (itemIdx >= round.items.length) { nextRoundOrFinish(); return; }
        currentItemEl.textContent = round.items[itemIdx].emoji;
      }

      function renderBins() {
        const round = rounds[roundIdx];
        binsRow.innerHTML = '';
        round.bins.forEach(binValue => {
          const btn = document.createElement('button');
          btn.className = 'sort-bin-btn';
          btn.textContent = binValue;
          btn.addEventListener('click', () => handleDrop(binValue));
          binsRow.appendChild(btn);
        });
      }

      function handleDrop(binValue) {
        const round = rounds[roundIdx];
        const item = round.items[itemIdx];
        attempts++;
        if (item[round.rule] === binValue) {
          itemIdx++;
          renderItem();
        } else {
          errors++;
        }
      }

      function nextRoundOrFinish() {
        if (roundIdx < rounds.length - 1) {
          roundIdx++;
          itemIdx = 0;
          renderRound();
        } else {
          finish();
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts, completed: true });
      }

      renderRound();
    }
  };

  global.SortItGame = SortItGame;
})(typeof window !== 'undefined' ? window : global);
