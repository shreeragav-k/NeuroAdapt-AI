/**
 * PediaSense - Picture Talk Game (Expressive Language)
 * Level 1: 1 picture card | Level 2: 2 cards | Level 3: 3 cards
 * Child describes each picture by voice (or typed text as a fallback);
 * a simple keyword match against the picture's name counts as success -
 * this mirrors the lightweight scoring style already used by the Virtual
 * Therapist session (js/screens/therapist_session_screen.js).
 */
(function (global) {
  'use strict';

  const ICON_NAMES = {
    '🦌': 'deer', '🌸': 'flower', '🍃': 'leaf', '🦋': 'butterfly', '🌻': 'sunflower', '🐝': 'bee', '🍄': 'mushroom', '🌈': 'rainbow', '🌼': 'daisy', '🌳': 'tree',
    '🚀': 'rocket', '🌟': 'star', '🌙': 'moon', '🪐': 'planet', '☄️': 'comet', '👨‍🚀': 'astronaut', '🛰️': 'satellite', '🌌': 'galaxy', '⭐': 'star', '🔭': 'telescope',
    '🐠': 'fish', '🐳': 'whale', '🐙': 'octopus', '🐢': 'turtle', '🦀': 'crab', '🐬': 'dolphin', '🦈': 'shark', '🐚': 'seashell', '🌊': 'wave',
    '🏰': 'castle', '✨': 'sparkle', '🪄': 'wand', '🦄': 'unicorn', '👑': 'crown', '🔮': 'crystal ball', '🐉': 'dragon', '💎': 'gem',
    '🐶': 'dog', '🐱': 'cat', '🐼': 'panda', '🦁': 'lion', '🐵': 'monkey', '🐰': 'rabbit', '🐨': 'koala', '🐯': 'tiger', '🐷': 'pig', '🦊': 'fox',
    '🚗': 'car', '🏎️': 'race car', '🚙': 'jeep', '🚕': 'taxi', '🚓': 'police car', '🚌': 'bus', '🛻': 'truck', '🚚': 'truck', '🛞': 'wheel', '🚦': 'light',
    '🦖': 'dinosaur', '🦕': 'dinosaur', '🥚': 'egg', '🌋': 'volcano', '🌿': 'plant', '🦴': 'bone', '🐊': 'crocodile', '🌴': 'palm tree', '⛰️': 'mountain',
    '🚂': 'train', '🚃': 'train', '🚋': 'tram', '🛤️': 'tracks', '🚉': 'station', '🎫': 'ticket', '🌉': 'bridge', '🧳': 'suitcase'
  };

  function nameFor(icon) {
    return ICON_NAMES[icon] || 'picture';
  }

  const PictureTalkGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const cardCount = levelConfig.cardCount;
      const cards = global.GameUI.shuffle(theme.objectSet).slice(0, cardCount);

      let cardIdx = 0;
      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Tell Dr. Sarah what you see!';
      container.appendChild(instruction);

      const card = document.createElement('div');
      card.className = 'picture-talk-card';
      container.appendChild(card);

      const micBtn = document.createElement('button');
      micBtn.className = 'picture-talk-mic-btn';
      micBtn.innerHTML = '🎤 Tap to Talk';
      container.appendChild(micBtn);

      const inputRow = document.createElement('div');
      inputRow.className = 'picture-talk-input-row';
      inputRow.innerHTML = `
        <input type="text" class="form-control picture-talk-input" placeholder="Or type what you see..." />
        <button class="btn btn-primary picture-talk-submit-btn">Say it!</button>
      `;
      container.appendChild(inputRow);

      const input = inputRow.querySelector('.picture-talk-input');
      const submitBtn = inputRow.querySelector('.picture-talk-submit-btn');

      function renderCard() {
        card.textContent = cards[cardIdx];
        input.value = '';
        micBtn.classList.remove('listening');
      }

      function startListening() {
        micBtn.classList.add('listening');
        if (!global.voiceService) { micBtn.classList.remove('listening'); return; }
        global.voiceService.startRecording((text, isFinal) => {
          input.value = text;
          if (isFinal) {
            micBtn.classList.remove('listening');
            evaluate(text);
          }
        });
      }

      function evaluate(text) {
        attempts++;
        const expected = nameFor(cards[cardIdx]);
        const said = (text || '').toLowerCase();
        const success = said.includes(expected);
        if (!success) errors++;
        card.classList.add(success ? 'talk-success' : 'talk-try-again');
        setTimeout(() => {
          card.classList.remove('talk-success', 'talk-try-again');
          cardIdx++;
          if (cardIdx >= cards.length) finish();
          else renderCard();
        }, 600);
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts, completed: true });
      }

      micBtn.addEventListener('click', startListening);
      submitBtn.addEventListener('click', () => evaluate(input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') evaluate(input.value); });

      renderCard();
    }
  };

  global.PictureTalkGame = PictureTalkGame;
})(typeof window !== 'undefined' ? window : global);
