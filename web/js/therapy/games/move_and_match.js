/**
 * PediaSense - Follow the Bunny Game (Gross Motor Coordination)
 * Level 1: 4x4 grid | Level 2: 5x5 grid | Level 3: 6x6 grid
 * Large directional buttons move the bunny across the grid to the carrot -
 * no camera required, just big touch-friendly movement controls.
 */
(function (global) {
  'use strict';

  const MoveAndMatchGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const gridSize = levelConfig.gridSize;
      const pos = { x: 0, y: 0 };
      const goal = { x: gridSize - 1, y: gridSize - 1 };

      let moves = 0;
      let errors = 0;
      const hintsUsed = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Help the bunny hop to the carrot!';
      container.appendChild(instruction);

      const board = document.createElement('div');
      board.className = 'move-board';
      board.style.setProperty('--grid-size', gridSize);
      container.appendChild(board);

      const dpad = document.createElement('div');
      dpad.className = 'move-dpad';
      dpad.innerHTML = `
        <div class="move-dpad-row">
          <button class="move-dpad-btn" data-dir="up">⬆️</button>
        </div>
        <div class="move-dpad-row">
          <button class="move-dpad-btn" data-dir="left">⬅️</button>
          <button class="move-dpad-btn" data-dir="down">⬇️</button>
          <button class="move-dpad-btn" data-dir="right">➡️</button>
        </div>
      `;
      container.appendChild(dpad);

      function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

      function renderBoard() {
        board.innerHTML = '';
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'move-cell';
            if (x === goal.x && y === goal.y && !(pos.x === goal.x && pos.y === goal.y)) {
              cell.classList.add('goal');
              cell.textContent = '🥕';
            }
            if (x === pos.x && y === pos.y) {
              cell.classList.add('player');
              cell.textContent = '🐰';
            }
            board.appendChild(cell);
          }
        }
      }

      function move(dx, dy) {
        const next = { x: pos.x + dx, y: pos.y + dy };
        if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize) {
          errors++;
          board.classList.add('shake-board');
          setTimeout(() => board.classList.remove('shake-board'), 350);
          return;
        }
        const before = manhattan(pos, goal);
        pos.x = next.x; pos.y = next.y;
        moves++;
        const after = manhattan(pos, goal);
        if (after >= before) errors++;
        renderBoard();
        if (pos.x === goal.x && pos.y === goal.y) finish();
      }

      dpad.querySelectorAll('.move-dpad-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = btn.dataset.dir;
          if (dir === 'up') move(0, -1);
          else if (dir === 'down') move(0, 1);
          else if (dir === 'left') move(-1, 0);
          else if (dir === 'right') move(1, 0);
        });
      });

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts: moves, completed: true });
      }

      renderBoard();
    }
  };

  global.MoveAndMatchGame = MoveAndMatchGame;
})(typeof window !== 'undefined' ? window : global);
