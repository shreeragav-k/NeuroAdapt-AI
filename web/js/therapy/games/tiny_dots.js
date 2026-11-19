/**
 * Tiny Dots (Fine Motor: precise tapping). One dot at a time; tap it before it fades.
 * Level 1: 5 big dots | Level 2: 6 smaller | Level 3: 7 tiny. A miss (tap beside the dot, or the dot fading) is an error.
 */
(function (global) {
  'use strict';
  const TinyDotsGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const total = levelConfig.dots, size = levelConfig.size, ms = levelConfig.ms;
      const icon = (theme && theme.objectSet && theme.objectSet[0]) || '🔵';
      let shown = 0, hits = 0, errors = 0, timer = null, done = false;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const info = document.createElement('p');
      info.className = 'td-info';
      container.appendChild(info);
      const field = document.createElement('div');
      field.className = 'td-field';
      field.setAttribute('role', 'application');
      field.setAttribute('aria-label', 'Tap each dot');
      container.appendChild(field);

      function setInfo() { info.textContent = `Dot ${Math.min(shown, total)} of ${total} · caught ${hits}`; }
      function next() {
        if (done) return;
        if (shown >= total) return finish();
        shown++; setInfo();
        const w = field.clientWidth || 320, h = field.clientHeight || 280;
        const x = Math.random() * Math.max(1, w - size), y = Math.random() * Math.max(1, h - size);
        const dot = document.createElement('button');
        dot.className = 'td-dot';
        dot.textContent = icon;
        dot.setAttribute('aria-label', 'Dot');
        dot.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;font-size:${Math.round(size * 0.55)}px`;
        field.appendChild(dot);
        let settled = false;
        const settle = (hit) => {
          if (settled) return; settled = true; clearTimeout(timer);
          if (hit) { hits++; dot.classList.add('td-pop'); } else { errors++; dot.classList.add('td-miss'); }
          setTimeout(() => { dot.remove(); next(); }, 260);
        };
        dot.addEventListener('click', (e) => { e.stopPropagation(); settle(true); });
        timer = setTimeout(() => settle(false), ms);
        dot._settle = settle;
      }
      // a tap on empty space near the dot counts as a miss for the current dot
      field.addEventListener('click', () => { const d = field.querySelector('.td-dot:not(.td-pop):not(.td-miss)'); if (d && d._settle) d._settle(false); });

      function finish() {
        if (done) return; done = true; clearTimeout(timer);
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, 0);
        onComplete({ score, errors, timeTakenSec, hintsUsed: 0, attempts: total, completed: true });
      }
      setTimeout(next, 400);
    }
  };
  global.TinyDotsGame = TinyDotsGame;
})(typeof window !== 'undefined' ? window : global);
