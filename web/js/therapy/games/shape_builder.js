/**
 * PediaSense - Shape Builder Game (Visual-Spatial Skills)
 * Level 1: 3 pieces | Level 2: 4 pieces | Level 3: 6 pieces
 * Tap a shape piece in the tray, then tap the outline slot with the
 * matching shape family to build the picture.
 */
(function (global) {
  'use strict';

  const SHAPE_BANK = [
    { emoji: '🔴', shape: 'circle', outline: '○' },
    { emoji: '🔵', shape: 'circle', outline: '○' },
    { emoji: '🟥', shape: 'square', outline: '□' },
    { emoji: '🟦', shape: 'square', outline: '□' },
    { emoji: '🔺', shape: 'triangle', outline: '△' },
    { emoji: '🔻', shape: 'triangle', outline: '△' }
  ];

  const ShapeBuilderGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const n = levelConfig.pieceCount;
      const chosen = global.GameUI.shuffle(SHAPE_BANK).slice(0, n);
      const board = chosen.map((piece, i) => ({ id: i, shape: piece.shape, outline: piece.outline, filled: false }));
      let tray = global.GameUI.shuffle(chosen.map((piece, i) => ({ id: i, emoji: piece.emoji, shape: piece.shape, placed: false })));

      let selected = null;
      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Tap a shape, then tap where it fits!';
      container.appendChild(instruction);

      const boardEl = document.createElement('div');
      boardEl.className = 'shape-target-board';
      container.appendChild(boardEl);

      const trayEl = document.createElement('div');
      trayEl.className = 'shape-tray';
      container.appendChild(trayEl);

      function renderBoard() {
        boardEl.innerHTML = '';
        board.forEach(slot => {
          const el = document.createElement('button');
          el.className = 'shape-target-slot' + (slot.filled ? ' filled' : '');
          el.textContent = slot.filled ? slot.filled : slot.outline;
          el.disabled = !!slot.filled;
          el.addEventListener('click', () => handleSlotTap(slot, el));
          boardEl.appendChild(el);
        });
      }

      function renderTray() {
        trayEl.innerHTML = '';
        tray.filter(p => !p.placed).forEach(piece => {
          const btn = document.createElement('button');
          btn.className = 'shape-tray-btn' + (selected === piece ? ' selected' : '');
          btn.textContent = piece.emoji;
          btn.addEventListener('click', () => handleTrayTap(piece));
          trayEl.appendChild(btn);
        });
      }

      function handleTrayTap(piece) {
        selected = selected === piece ? null : piece;
        renderTray();
      }

      function handleSlotTap(slot, el) {
        if (slot.filled || !selected) return;
        attempts++;
        if (selected.shape === slot.shape) {
          slot.filled = selected.emoji;
          selected.placed = true;
          selected = null;
          renderBoard();
          renderTray();
          if (board.every(s => s.filled)) finish();
        } else {
          errors++;
          el.classList.add('shake-slot');
          setTimeout(() => el.classList.remove('shake-slot'), 400);
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts, completed: true });
      }

      renderBoard();
      renderTray();
    }
  };

  global.ShapeBuilderGame = ShapeBuilderGame;
})(typeof window !== 'undefined' ? window : global);
