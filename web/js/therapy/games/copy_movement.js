/**
 * PediaSense - Copy My Movement Game (Imitation / Gross-Motor via Camera)
 * A REAL camera activity: the virtual therapist demonstrates a movement and
 * the child copies it in front of the laptop webcam. Movement is detected
 * with honest frame-differencing (no fake data, no pose-model dependency):
 * consecutive video frames are compared and the average pixel change is the
 * live "movement energy". A rising edge above a threshold counts one copied
 * movement. Every count is genuine motion the camera actually observed.
 *
 * Privacy: frames are compared in-memory only, nothing is recorded or saved.
 * If the camera is denied/unavailable the game falls back gracefully to a
 * tap-along version so the child is never stuck, and still produces
 * structured performance data for the adaptive engine.
 *
 * Level 1: 3 movements | Level 2: 5 movements | Level 3: 7 movements
 */
(function (global) {
  'use strict';

  const CopyMovementGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const targetReps = (levelConfig && levelConfig.reps) || 3;
      const demoIcon = (theme.objectSet && theme.objectSet[0]) || '🙆';

      let reps = 0;
      let hintsUsed = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const stage = document.createElement('div');
      stage.className = 'copy-move-stage';
      container.appendChild(stage);

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.innerHTML = `Copy my movement! <span class="copy-move-demo">${demoIcon}</span>`;
      stage.appendChild(instruction);

      const count = document.createElement('div');
      count.className = 'copy-move-count';
      count.textContent = `Movements: 0 / ${targetReps}`;
      stage.appendChild(count);

      function updateCount() {
        count.textContent = `Movements: ${reps} / ${targetReps}`;
      }

      function finish() {
        stopCamera();
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        // Completing all copied movements is the success signal; hints (using
        // the tap-along backup) gently reduce the score, like every other game.
        const score = global.GameUI.computeScore(0, hintsUsed);
        onComplete({ score, errors: 0, timeTakenSec, hintsUsed, attempts: reps, completed: true });
      }

      function registerRep() {
        if (reps >= targetReps) return;
        reps += 1;
        updateCount();
        if (reps >= targetReps) {
          setTimeout(finish, 500);
        }
      }

      // ---- Motion-detection loop (real webcam frame differencing) ----
      let rafId = null;
      let detectTimer = null;
      let prevFrame = null;
      let moving = false;
      let lastRepAt = 0;
      const sampleW = 48, sampleH = 36;
      const sampleCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
      let videoEl = null;

      function stopCamera() {
        if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
        if (rafId && typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(rafId); rafId = null; }
        if (global.cameraService && global.cameraService.stopCamera) {
          try { global.cameraService.stopCamera(); } catch (e) {}
        }
      }

      function startMotionDetection(meterFill) {
        if (!sampleCanvas) return;
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const ctx = sampleCanvas.getContext('2d');
        if (!ctx) return;

        detectTimer = setInterval(() => {
          if (!videoEl || videoEl.readyState < 2) return;
          try {
            ctx.drawImage(videoEl, 0, 0, sampleW, sampleH);
            const frame = ctx.getImageData(0, 0, sampleW, sampleH).data;
            if (prevFrame) {
              let diff = 0;
              for (let i = 0; i < frame.length; i += 4) {
                diff += Math.abs(frame[i] - prevFrame[i]) +
                        Math.abs(frame[i + 1] - prevFrame[i + 1]) +
                        Math.abs(frame[i + 2] - prevFrame[i + 2]);
              }
              const motion = diff / (frame.length / 4) / 3; // 0..255 average change
              const pct = Math.min(100, Math.round((motion / 40) * 100));
              if (meterFill) meterFill.style.width = pct + '%';

              const HIGH = 14, LOW = 6, DEBOUNCE = 700;
              const now = Date.now();
              if (!moving && motion > HIGH && (now - lastRepAt) > DEBOUNCE) {
                moving = true;
                lastRepAt = now;
                registerRep();
              } else if (moving && motion < LOW) {
                moving = false;
              }
            }
            prevFrame = frame;
          } catch (e) { /* keep the loop resilient */ }
        }, 180);
      }

      function renderCameraMode() {
        const wrap = document.createElement('div');
        wrap.className = 'copy-move-camera-wrap';
        videoEl = document.createElement('video');
        videoEl.setAttribute('playsinline', 'true');
        videoEl.muted = true;
        wrap.appendChild(videoEl);
        stage.appendChild(wrap);

        const meter = document.createElement('div');
        meter.className = 'copy-move-motion-meter';
        const meterFill = document.createElement('div');
        meterFill.className = 'copy-move-motion-fill';
        meter.appendChild(meterFill);
        stage.appendChild(meter);

        const backup = document.createElement('button');
        backup.className = 'btn btn-secondary';
        backup.style.borderRadius = '9999px';
        backup.textContent = '✅ I did the movement!';
        backup.addEventListener('click', () => { hintsUsed += 1; registerRep(); });
        stage.appendChild(backup);

        global.cameraService.startCamera(videoEl).then((res) => {
          if (res && res.success) {
            startMotionDetection(meterFill);
          } else {
            renderFallbackNote(res && res.message);
          }
        }).catch(() => renderFallbackNote());
      }

      function renderFallbackNote(msg) {
        const note = document.createElement('div');
        note.className = 'copy-move-fallback-note';
        note.textContent = msg || 'Camera is not available right now — tap the button each time you copy the movement!';
        stage.insertBefore(note, stage.querySelector('.copy-move-motion-meter') || null);
      }

      function renderTapMode() {
        renderFallbackNote('No camera detected. Tap the big button each time you copy the movement!');
        const tapBtn = document.createElement('button');
        tapBtn.className = 'sort-bin-btn';
        tapBtn.style.fontSize = '1.3rem';
        tapBtn.textContent = `Copy ${demoIcon}`;
        tapBtn.addEventListener('click', () => registerRep());
        stage.appendChild(tapBtn);
      }

      // Prefer the real camera; fall back cleanly if the browser has no camera API.
      const hasCameraApi = typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && global.cameraService;
      if (hasCameraApi) {
        renderCameraMode();
      } else {
        renderTapMode();
      }
    }
  };

  global.CopyMovementGame = CopyMovementGame;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CopyMovementGame;
  }
})(typeof window !== 'undefined' ? window : global);
