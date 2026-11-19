/**
 * Big Reach (Gross Motor: reaching across the body). Balloons rise from alternating sides of the screen;
 * pop each with a big arm movement (mouse or touch). A balloon that floats away is an error.
 * Level 1: 5 big | Level 2: 6 | Level 3: 8 smaller.
 */
(function (global) {
  'use strict';
  const BigReachGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const total = levelConfig.balloons, size = levelConfig.size, ms = levelConfig.ms;
      const colors = ['🎈', '🎈', '🎈'];
      let shown = 0, popped = 0, errors = 0, done = false, timer = null;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const info = document.createElement('p');
      info.className = 'br-info';
      container.appendChild(info);
      const sky = document.createElement('div');
      sky.className = 'br-sky';
      container.appendChild(sky);

      function setInfo() { info.textContent = `Balloon ${Math.min(shown, total)} of ${total} · popped ${popped}`; }
      function next() {
        if (done) return;
        if (shown >= total) return finish();
        shown++; setInfo();
        const w = sky.clientWidth || 320, h = sky.clientHeight || 300;
        const left = shown % 2 === 1 ? 4 : Math.max(4, w - size - 4);   // alternate sides so the child reaches across
        const b = document.createElement('button');
        b.className = 'br-balloon';
        b.textContent = colors[shown % colors.length];
        b.setAttribute('aria-label', 'Balloon');
        b.style.cssText = `width:${size}px;height:${size}px;left:${left}px;top:${Math.max(0, h - size)}px;font-size:${Math.round(size * 0.8)}px;transition:top ${ms}ms linear`;
        sky.appendChild(b);
        requestAnimationFrame(() => requestAnimationFrame(() => { b.style.top = '-' + size + 'px'; }));
        let settled = false;
        const settle = (hit) => {
          if (settled) return; settled = true; clearTimeout(timer);
          if (hit) { popped++; b.textContent = '💥'; } else { errors++; b.classList.add('br-gone'); }
          setTimeout(() => { b.remove(); next(); }, 300);
        };
        b.addEventListener('click', () => settle(true));
        timer = setTimeout(() => settle(false), ms);
      }
      function finish() {
        if (done) return; done = true; clearTimeout(timer);
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        onComplete({ score: global.GameUI.computeScore(errors, 0), errors, timeTakenSec, hintsUsed: 0, attempts: total, completed: true });
      }
      setTimeout(next, 400);
    }
  };
  global.BigReachGame = BigReachGame;
})(typeof window !== 'undefined' ? window : global);
