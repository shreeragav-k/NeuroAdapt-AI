/**
 * PediaSense - Shared Interactive Game UI helpers
 * Used by every game in js/games/*.js so the child sees a consistent,
 * simple, large-button, non-clinical interface regardless of which skill
 * game is running.
 */
(function (global) {
  'use strict';

  const POSITIVE_MESSAGES = ['Great job! 🌟', 'Awesome work! 🎉', "You did it! 🚀", 'Super star! ⭐', 'Fantastic! 🏆'];
  const ENCOURAGING_MESSAGES = ["Nice try! Let's try again.", "You're getting closer!", "Let's try one more time!", "Good effort! Keep going!"];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const GameUI = {
    renderHeader(container, { title, methodConfig, onExit }) {
      const bannerHtml = methodConfig && methodConfig.showPromptBeforeStart
        ? `<div class="game-method-banner">${methodConfig.showStepIndicator ? '🧭 ' : '💬 '}${methodConfig.promptText}</div>`
        : '';
      const header = document.createElement('div');
      header.className = 'game-header';
      header.innerHTML = `
        <button class="btn btn-sm btn-secondary game-exit-btn">← Back</button>
        <h1 class="game-title">${title}</h1>
        ${bannerHtml}
      `;
      container.appendChild(header);
      header.querySelector('.game-exit-btn').addEventListener('click', () => onExit && onExit());
      return header;
    },

    renderRewardScreen(container, { success, timeTakenSec, hintsUsed, errors, score, leveledUp, onNext, onExit }) {
      container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'reward-celebration-overlay';
      const message = success ? 'Awesome! You earned Stars!' : 'Great effort! Keep shining!';
      const adaptiveNote = leveledUp
        ? `<div class="adaptive-decision-banner" style="margin: 1rem 0; text-align: left;"><div class="adaptive-badge">LEVEL UP!</div><div><strong>You're ready for a bigger challenge!</strong><p style="margin:0; font-size:0.85rem;">Advancing to Level ${leveledUp}!</p></div></div>`
        : '';

      wrap.innerHTML = `
        <div class="reward-celebration-card">
          <div class="giant-reward-star">⭐</div>
          <div class="reward-points-pill">+10 Stars</div>
          <h2 class="reward-celebration-title">${message}</h2>
          <p class="reward-celebration-sub">Time: ${timeTakenSec}s • Score: ${Math.round(score)} pts</p>
          ${adaptiveNote}
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn-reward-collect" id="rewardNextBtn">
              Collect & Next 🌟
            </button>
            <button class="btn btn-secondary" id="rewardExitBtn" style="border-radius: 9999px; padding: 0.85rem 1.8rem;">
              Back to Home
            </button>
          </div>
        </div>
      `;
      container.appendChild(wrap);
      const nextBtn = wrap.querySelector ? wrap.querySelector('#rewardNextBtn') : null;
      if (nextBtn && nextBtn.addEventListener) nextBtn.addEventListener('click', () => onNext && onNext());
      const exitBtn = wrap.querySelector ? wrap.querySelector('#rewardExitBtn') : null;
      if (exitBtn && exitBtn.addEventListener) exitBtn.addEventListener('click', () => onExit && onExit());
    },

    // Simple deterministic scoring shared by every game: fewer errors/hints = higher score.
    computeScore(errors, hintsUsed) {
      return Math.max(0, 100 - (errors * 15) - (hintsUsed * 5));
    },

    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  };

  global.GameUI = GameUI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameUI;
  }
})(typeof window !== 'undefined' ? window : global);
