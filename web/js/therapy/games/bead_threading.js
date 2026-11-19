/**
 * Bead Threading (Fine Motor: pincer grip, hand-eye coordination). Copy the pattern on the card by dragging beads onto the string, in order.
 * Beads can also be tapped (they go to the next place) for children who cannot drag yet.
 * Level 1: 4 beads, large | Level 2: 5 beads | Level 3: 6 small beads.
 */
(function (global) {
  'use strict';
  const COLORS = ['#e5484d', '#2478e5', '#f5c542', '#2fb344', '#9b59d0'];
  const BeadThreadingGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const n = levelConfig.beads, size = levelConfig.size;
      const pattern = Array.from({ length: n }, () => COLORS[Math.floor(Math.random() * Math.min(COLORS.length, 3 + (n > 4 ? 1 : 0) + (n > 5 ? 1 : 0)))]);
      let next = 0, errors = 0, done = false;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const msg = document.createElement('p'); msg.className = 'bt-msg'; msg.textContent = 'Copy the pattern: drag each bead onto the string, in order (or tap it).'; container.appendChild(msg);
      const card = document.createElement('div'); card.className = 'bt-card'; card.innerHTML = `<small>Pattern</small><div>${pattern.map((c) => `<i class="bt-dot" style="background:${c};width:${Math.round(size * 0.6)}px;height:${Math.round(size * 0.6)}px"></i>`).join('')}</div>`; container.appendChild(card);
      const string = document.createElement('div'); string.className = 'bt-string'; container.appendChild(string);
      const slots = pattern.map(() => { const s = document.createElement('span'); s.className = 'bt-slot'; s.style.cssText = `width:${size}px;height:${size}px`; string.appendChild(s); return s; });
      const tray = document.createElement('div'); tray.className = 'bt-tray'; container.appendChild(tray);
      global.GameUI.shuffle(pattern.map((c, i) => c).concat(COLORS.slice(0, 2))).forEach((c) => tray.appendChild(makeBead(c)));

      function place(bead, c) {
        if (done) return false;
        if (c === pattern[next]) {
          const slot = slots[next]; slot.style.background = c; slot.classList.add('on'); next++; bead.remove();
          msg.textContent = next < n ? 'Good! Next bead.' : 'You finished the pattern!';
          if (next === n) finish(); return true;
        }
        errors++; bead.classList.add('bt-no'); setTimeout(() => bead.classList.remove('bt-no'), 400); msg.textContent = 'That is not the next colour. Look at the pattern.'; return false;
      }
      function makeBead(c) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'bt-bead'; b.style.cssText = `background:${c};width:${size}px;height:${size}px;touch-action:none`; b.setAttribute('aria-label', 'Bead');
        let sx, sy, moved = false, drag = false;
        b.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; moved = false; drag = true; b.setPointerCapture(e.pointerId); b.classList.add('bt-drag'); });
        b.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 8) moved = true; b.style.transform = `translate(${dx}px,${dy}px)`; });
        b.addEventListener('pointerup', (e) => {
          if (!drag) return; drag = false; b.classList.remove('bt-drag');
          const r = slots[next] ? slots[next].getBoundingClientRect() : null, pad = size * 0.5;
          const onSlot = r && e.clientX > r.left - pad && e.clientX < r.right + pad && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
          b.style.transform = '';
          if (!moved) place(b, c);                       // a tap: send it to the next place
          else if (onSlot) place(b, c);                  // a drag that ended on the next place
          else if (string.contains(document.elementFromPoint(e.clientX, e.clientY)) || (document.elementFromPoint(e.clientX, e.clientY) || {}).className === 'bt-slot') place(b, c);
        });
        b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(b, c); } });
        return b;
      }
      function finish() {
        done = true; const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        setTimeout(() => onComplete({ score: global.GameUI.computeScore(errors, 0), errors, timeTakenSec, hintsUsed: 0, attempts: n + errors, completed: true }), 600);
      }
    }
  };
  global.BeadThreadingGame = BeadThreadingGame;
})(typeof window !== 'undefined' ? window : global);
