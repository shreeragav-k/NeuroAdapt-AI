/**
 * PediaSense - Pattern Complete Game (Pattern Recognition)
 * Level 1: AB pattern | Level 2: AAB pattern | Level 3: mixed/ABC pattern
 */
(function (global) {
  'use strict';

  function buildSequence(patternType, length, icons) {
    const seq = [];
    if (patternType === 'AB') {
      for (let i = 0; i < length; i++) seq.push(icons[i % 2]);
    } else if (patternType === 'AAB') {
      const unit = [icons[0], icons[0], icons[1]];
      for (let i = 0; i < length; i++) seq.push(unit[i % unit.length]);
    } else {
      // MIXED: ABC repeating
      const unit = [icons[0], icons[1], icons[2]];
      for (let i = 0; i < length; i++) seq.push(unit[i % unit.length]);
    }
    return seq;
  }

  const PatternCompleteGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const iconsNeeded = levelConfig.patternType === 'MIXED' ? 3 : 2;
      const icons = global.GameUI.shuffle(theme.objectSet).slice(0, iconsNeeded);
      const fullSequence = buildSequence(levelConfig.patternType, levelConfig.length, icons);
      const correctAnswer = fullSequence[fullSequence.length - 1];
      const visibleSequence = fullSequence.slice(0, -1);

      const distractorPool = theme.objectSet.filter(i => !icons.includes(i));
      const options = global.GameUI.shuffle([correctAnswer, ...global.GameUI.shuffle(distractorPool).slice(0, 3)]);

      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const seqRow = document.createElement('div');
      seqRow.className = 'pattern-sequence';
      seqRow.innerHTML = visibleSequence.map(i => `<span class="pattern-item">${i}</span>`).join('') + `<span class="pattern-item pattern-blank">❓</span>`;
      container.appendChild(seqRow);

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'What comes next?';
      container.appendChild(instruction);

      const optionsRow = document.createElement('div');
      optionsRow.className = 'pattern-options';
      container.appendChild(optionsRow);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'pattern-option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => handlePick(opt, btn));
        optionsRow.appendChild(btn);
      });

      function handlePick(opt, btn) {
        attempts++;
        if (opt === correctAnswer) {
          btn.classList.add('correct');
          setTimeout(finish, 500);
        } else {
          errors++;
          btn.classList.add('incorrect');
          btn.disabled = true;
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts, completed: true });
      }
    }
  };

  global.PatternCompleteGame = PatternCompleteGame;
})(typeof window !== 'undefined' ? window : global);
