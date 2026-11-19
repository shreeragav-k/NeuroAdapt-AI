/**
 * PediaSense - Trace & Match Game (Fine Motor Control)
 * Level 1: straight line | Level 2: circle | Level 3: zigzag
 * Child drags a finger/pointer along a dotted guide path on a canvas;
 * score reflects how much of the path was traced within tolerance.
 */
(function (global) {
  'use strict';

  const CANVAS_W = 360;
  const CANVAS_H = 260;

  function buildPath(shape) {
    const N = 36;
    const pts = [];
    if (shape === 'circle') {
      const cx = CANVAS_W / 2, cy = CANVAS_H / 2, r = Math.min(CANVAS_W, CANVAS_H) * 0.32;
      for (let i = 0; i < N; i++) {
        const a = (i / (N - 1)) * Math.PI * 2 - Math.PI / 2;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
    } else if (shape === 'zigzag') {
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const seg = Math.floor(t * 5);
        const localT = (t * 5) - seg;
        const y = seg % 2 === 0 ? CANVAS_H * 0.25 + localT * CANVAS_H * 0.5 : CANVAS_H * 0.75 - localT * CANVAS_H * 0.5;
        pts.push({ x: CANVAS_W * 0.1 + CANVAS_W * 0.8 * t, y });
      }
    } else {
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        pts.push({ x: CANVAS_W * 0.12 + CANVAS_W * 0.76 * t, y: CANVAS_H * 0.5 });
      }
    }
    return pts;
  }

  const TraceAndMatchGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const shape = levelConfig.shape;
      const tolerance = levelConfig.tolerance || 30;
      const points = buildPath(shape);
      const covered = new Array(points.length).fill(false);
      let coveredCount = 0;
      let tracing = false;
      const hintsUsed = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Trace the dotted path with your finger or mouse!';
      container.appendChild(instruction);

      const wrap = document.createElement('div');
      wrap.className = 'trace-canvas-wrap';
      container.appendChild(wrap);

      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      canvas.className = 'trace-canvas';
      wrap.appendChild(canvas);

      const progressWrap = document.createElement('div');
      progressWrap.className = 'trace-progress-bar';
      progressWrap.innerHTML = '<div class="trace-progress-fill" style="width:0%"></div>';
      container.appendChild(progressWrap);
      const progressFill = progressWrap.querySelector('.trace-progress-fill');

      const finishBtn = document.createElement('button');
      finishBtn.className = 'btn btn-primary trace-finish-btn';
      finishBtn.textContent = "I'm Done!";
      container.appendChild(finishBtn);

      const ctx = canvas.getContext('2d');

      function draw() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = covered[i] ? '#10b981' : '#cbd5e1';
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      function pointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
      }

      function handleMove(e) {
        if (!tracing) return;
        e.preventDefault();
        const pos = pointerPos(e);
        points.forEach((p, i) => {
          if (covered[i]) return;
          const dx = p.x - pos.x, dy = p.y - pos.y;
          if (Math.sqrt(dx * dx + dy * dy) <= tolerance) {
            covered[i] = true;
            coveredCount++;
          }
        });
        progressFill.style.width = Math.round((coveredCount / points.length) * 100) + '%';
        draw();
      }

      function startTracing(e) { tracing = true; handleMove(e); }
      function stopTracing() { tracing = false; }

      canvas.addEventListener('mousedown', startTracing);
      canvas.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', stopTracing);
      canvas.addEventListener('touchstart', startTracing, { passive: false });
      canvas.addEventListener('touchmove', handleMove, { passive: false });
      canvas.addEventListener('touchend', stopTracing);

      finishBtn.addEventListener('click', finish);

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const coverage = coveredCount / points.length;
        const score = Math.round(coverage * 100);
        const errors = Math.max(0, points.length - coveredCount > points.length * 0.3 ? 1 : 0);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts: 1, completed: true });
      }

      draw();
    }
  };

  global.TraceAndMatchGame = TraceAndMatchGame;
})(typeof window !== 'undefined' ? window : global);
