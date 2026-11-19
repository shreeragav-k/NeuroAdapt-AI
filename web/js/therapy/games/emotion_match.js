/**
 * PediaSense - Emotion Match Game (Emotion Recognition)
 * Level 1: 3 choices | Level 2: 4 choices | Level 3: 5 choices
 * Read a short scenario, look at the face, pick the matching feeling word.
 */
(function (global) {
  'use strict';

  const SCENARIOS = [
    { emoji: '😀', text: 'Maya just got a fluffy new puppy!', emotion: 'Happy' },
    { emoji: '😢', text: "Sam's ice cream fell right on the ground.", emotion: 'Sad' },
    { emoji: '😠', text: "Jake's tower got knocked down by his brother.", emotion: 'Angry' },
    { emoji: '😲', text: 'Lily saw a giant rainbow for the first time!', emotion: 'Surprised' },
    { emoji: '😴', text: "It's been a long day and Ben can barely keep his eyes open.", emotion: 'Tired' },
    { emoji: '😨', text: 'Zoe heard a really loud thunder clap.', emotion: 'Scared' },
    { emoji: '🥳', text: "It's Mia's birthday party today!", emotion: 'Excited' },
    { emoji: '😌', text: 'Leo is relaxing quietly in a hammock.', emotion: 'Calm' }
  ];

  const EmotionMatchGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const choiceCount = levelConfig.choiceCount;

      const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
      const distractors = global.GameUI.shuffle(SCENARIOS.filter(s => s.emotion !== scenario.emotion).map(s => s.emotion));
      const uniqueDistractors = [...new Set(distractors)].slice(0, choiceCount - 1);
      const options = global.GameUI.shuffle([scenario.emotion, ...uniqueDistractors]);

      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const card = document.createElement('div');
      card.className = 'emotion-scenario-card';
      card.innerHTML = `
        <div class="emotion-scenario-emoji">${scenario.emoji}</div>
        <p class="emotion-scenario-text">${scenario.text}</p>
      `;
      container.appendChild(card);

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'How do they feel?';
      container.appendChild(instruction);

      const optionsRow = document.createElement('div');
      optionsRow.className = 'pattern-options';
      container.appendChild(optionsRow);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'pattern-option-btn emotion-option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => handlePick(opt, btn));
        optionsRow.appendChild(btn);
      });

      function handlePick(opt, btn) {
        attempts++;
        if (opt === scenario.emotion) {
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

  global.EmotionMatchGame = EmotionMatchGame;
})(typeof window !== 'undefined' ? window : global);
