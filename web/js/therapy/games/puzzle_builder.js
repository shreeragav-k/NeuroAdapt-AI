/**
 * PediaSense - Puzzle Builder Game (Problem Solving)
 * Level 1: 4 pieces | Level 2: 6 pieces | Level 3: 9 pieces
 * Tap a tray piece, then tap its matching board slot (click-based, not
 * drag-and-drop, to match the rest of the game library's interaction style).
 */
(function (global) {
  'use strict';

  const PuzzleBuilderGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const n = levelConfig.pieceCount;
      const targetIcons = global.GameUI.shuffle(theme.objectSet).slice(0, n);
      let tray = global.GameUI.shuffle(targetIcons.map((icon, i) => ({ icon, correctIndex: i, placed: false })));
      const board = new Array(n).fill(null);

      let selectedTrayId = null;
      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Tap a puzzle piece, then tap where it belongs!';
      container.appendChild(instruction);

      const boardEl = document.createElement('div');
      boardEl.className = 'puzzle-board';
      container.appendChild(boardEl);

      const trayEl = document.createElement('div');
      trayEl.className = 'puzzle-tray';
      container.appendChild(trayEl);

      function renderBoard() {
        boardEl.innerHTML = '';
        board.forEach((icon, idx) => {
          const slot = document.createElement('button');
          slot.className = 'puzzle-slot' + (icon ? ' filled' : '');
          slot.textContent = icon || (idx + 1);
          slot.disabled = !!icon;
          slot.addEventListener('click', () => handleSlotTap(idx, slot));
          boardEl.appendChild(slot);
        });
      }

      function renderTray() {
        trayEl.innerHTML = '';
        tray.filter(p => !p.placed).forEach(piece => {
          const btn = document.createElement('button');
          btn.className = 'puzzle-tile-btn' + (piece === selectedTrayId ? ' selected' : '');
          btn.textContent = piece.icon;
          btn.addEventListener('click', () => handleTrayTap(piece, btn));
          trayEl.appendChild(btn);
        });
      }

      function handleTrayTap(piece) {
        selectedTrayId = selectedTrayId === piece ? null : piece;
        renderTray();
      }

      function handleSlotTap(idx, slotEl) {
        if (board[idx] || !selectedTrayId) return;
        attempts++;
        if (selectedTrayId.correctIndex === idx) {
          board[idx] = selectedTrayId.icon;
          selectedTrayId.placed = true;
          selectedTrayId = null;
          renderBoard();
          renderTray();
          if (board.every(v => v !== null)) finish();
        } else {
          errors++;
          slotEl.classList.add('shake-slot');
          setTimeout(() => slotEl.classList.remove('shake-slot'), 400);
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

  global.PuzzleBuilderGame = PuzzleBuilderGame;
})(typeof window !== 'undefined' ? window : global);
