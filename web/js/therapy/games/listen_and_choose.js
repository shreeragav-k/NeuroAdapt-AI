/**
 * PediaSense - Listen & Choose Game (Receptive Language)
 * Level 1: 3 choices | Level 2: 4 choices | Level 3: 5 choices
 * PediaSense AI speaks "Find the ___", child taps the matching icon.
 */
(function (global) {
  'use strict';

  const LISTEN_TEMPLATES = ['Find the {name}!', 'Where is the {name}?', 'Can you tap the {name}?'];

  const ICON_NAMES = {
    '🦌': 'deer', '🌸': 'flower', '🍃': 'leaf', '🦋': 'butterfly', '🌻': 'sunflower', '🐝': 'bee', '🍄': 'mushroom', '🌈': 'rainbow', '🌼': 'daisy', '🌳': 'tree',
    '🚀': 'rocket', '🌟': 'star', '🌙': 'moon', '🪐': 'planet', '☄️': 'comet', '👨‍🚀': 'astronaut', '🛰️': 'satellite', '🌌': 'galaxy', '⭐': 'star', '🔭': 'telescope',
    '🐠': 'fish', '🐳': 'whale', '🐙': 'octopus', '🐢': 'turtle', '🦀': 'crab', '🐬': 'dolphin', '🦈': 'shark', '🐚': 'seashell', '🌊': 'wave',
    '🏰': 'castle', '✨': 'sparkle', '🪄': 'wand', '🦄': 'unicorn', '👑': 'crown', '🔮': 'crystal ball', '🐉': 'dragon', '💎': 'gem',
    '🐶': 'dog', '🐱': 'cat', '🐼': 'panda', '🦁': 'lion', '🐵': 'monkey', '🐰': 'rabbit', '🐨': 'koala', '🐯': 'tiger', '🐷': 'pig', '🦊': 'fox',
    '🚗': 'car', '🏎️': 'race car', '🚙': 'jeep', '🚕': 'taxi', '🚓': 'police car', '🚌': 'bus', '🛻': 'truck', '🚚': 'delivery truck', '🛞': 'wheel', '🚦': 'traffic light',
    '🦖': 'dinosaur', '🦕': 'long-neck dinosaur', '🥚': 'egg', '🌋': 'volcano', '🌿': 'plant', '🦴': 'bone', '🐊': 'crocodile', '🌴': 'palm tree', '⛰️': 'mountain',
    '🚂': 'train', '🚃': 'train car', '🚋': 'tram', '🛤️': 'train tracks', '🚉': 'train station', '🎫': 'ticket', '🌉': 'bridge', '🧳': 'suitcase'
  };

  function nameFor(icon) {
    return ICON_NAMES[icon] || 'picture';
  }

  const ListenAndChooseGame = {
    render(container, opts) {
      const { levelConfig, theme, gameTitle, methodConfig, onComplete, onExit } = opts;
      const choiceCount = levelConfig.choiceCount;

      const pool = global.GameUI.shuffle(theme.objectSet).slice(0, choiceCount);
      const targetIcon = pool[Math.floor(Math.random() * pool.length)];
      const prompt = LISTEN_TEMPLATES[Math.floor(Math.random() * LISTEN_TEMPLATES.length)].replace('{name}', nameFor(targetIcon));

      let errors = 0;
      const hintsUsed = 0;
      let attempts = 0;
      const startTime = Date.now();

      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });

      const instruction = document.createElement('div');
      instruction.className = 'game-instruction';
      instruction.textContent = 'Listen carefully...';
      container.appendChild(instruction);

      const replayBtn = document.createElement('button');
      replayBtn.className = 'btn-speech-audio listen-replay-btn';
      replayBtn.innerHTML = '<span>🔊</span> Hear it again';
      container.appendChild(replayBtn);

      const grid = document.createElement('div');
      grid.className = 'find-object-grid';
      container.appendChild(grid);

      function speakPrompt() {
        if (global.voiceService) {
          global.voiceService.speak(prompt);
        }
      }

      function renderGrid() {
        grid.innerHTML = '';
        global.GameUI.shuffle(pool).forEach(icon => {
          const el = document.createElement('button');
          el.className = 'find-object-tile';
          el.textContent = icon;
          el.addEventListener('click', () => handlePick(icon, el));
          grid.appendChild(el);
        });
      }

      function handlePick(icon, el) {
        attempts++;
        if (icon === targetIcon) {
          el.classList.add('found');
          el.disabled = true;
          setTimeout(finish, 400);
        } else {
          errors++;
          el.classList.add('incorrect');
          setTimeout(() => el.classList.remove('incorrect'), 400);
        }
      }

      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        const score = global.GameUI.computeScore(errors, hintsUsed);
        onComplete({ score, errors, timeTakenSec, hintsUsed, attempts, completed: true });
      }

      replayBtn.addEventListener('click', speakPrompt);
      renderGrid();
      instruction.textContent = prompt;
      setTimeout(speakPrompt, 400);
    }
  };

  global.ListenAndChooseGame = ListenAndChooseGame;
})(typeof window !== 'undefined' ? window : global);
