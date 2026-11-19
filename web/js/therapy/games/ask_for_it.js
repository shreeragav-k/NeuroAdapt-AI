/**
 * Ask for It (Communication: functional requesting, picture-board style). A need is shown ("You are thirsty").
 * The child builds a request from picture tiles ("I want" + item + "please") and presses Say it; Dr. Sarah's voice reads it out.
 * Works by tapping, so it also suits children who do not yet speak.
 * Level 1: 3 rounds, 3 items | Level 2: 4 rounds, 4 items, "please" needed | Level 3: 5 rounds, 5 items, "please" needed.
 */
(function (global) {
  'use strict';
  const NEEDS = [
    { need: 'You are thirsty.', emoji: '😮‍💨', item: ['🥛', 'water'] }, { need: 'You are hungry.', emoji: '😋', item: ['🍎', 'an apple'] },
    { need: 'You want to play outside.', emoji: '🌳', item: ['⚽', 'the ball'] }, { need: 'You are tired.', emoji: '🥱', item: ['🛏️', 'my bed'] },
    { need: 'You want to read.', emoji: '📚', item: ['📖', 'a book'] }, { need: 'You want to draw.', emoji: '🖍️', item: ['🖍️', 'the crayons'] },
    { need: 'It is cold.', emoji: '🥶', item: ['🧥', 'my coat'] }, { need: 'You want to hear music.', emoji: '🎶', item: ['🎧', 'the music'] },
  ];
  const AskForItGame = {
    render(container, opts) {
      const { levelConfig, gameTitle, methodConfig, onComplete, onExit } = opts;
      const rounds = levelConfig.rounds, nItems = levelConfig.items, needPlease = levelConfig.please;
      const order = global.GameUI.shuffle(NEEDS);
      let round = 0, errors = 0, hints = 0, cur = null, words = [], locked = false;
      const startTime = Date.now();
      container.innerHTML = '';
      global.GameUI.renderHeader(container, { title: gameTitle, methodConfig, onExit });
      const scene = document.createElement('div'); scene.className = 'af-scene'; container.appendChild(scene);
      const strip = document.createElement('div'); strip.className = 'af-strip'; strip.setAttribute('aria-live', 'polite'); container.appendChild(strip);
      const board = document.createElement('div'); board.className = 'af-board'; container.appendChild(board);
      const acts = document.createElement('div'); acts.className = 'af-acts'; container.appendChild(acts);
      const say = (t) => { if (global.voiceService) global.voiceService.speak(t); };

      function newRound() {
        locked = false; words = [];
        cur = order[round % order.length]; round++;
        const distract = global.GameUI.shuffle(NEEDS.filter((n) => n !== cur)).slice(0, nItems - 1).map((n) => n.item);
        cur.tiles = global.GameUI.shuffle([cur.item, ...distract]);
        scene.innerHTML = `<div class="af-emoji" aria-hidden="true">${cur.emoji}</div><div><b>Round ${round} of ${rounds}</b><p>${cur.need} Ask for what you need${needPlease ? ' politely' : ''}.</p></div>`;
        say(cur.need);
        draw();
      }
      function draw() {
        strip.innerHTML = words.length ? words.map((w) => `<span class="af-word">${w.e} ${w.t}</span>`).join(' ') : '<span class="muted">Tap the pictures to build your sentence.</span>';
        board.innerHTML = '';
        const add = (e, t, cls, kind) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'af-tile ' + cls; b.innerHTML = `<span>${e}</span><small>${t}</small>`; b.onclick = () => tap({ e, t, kind }); board.appendChild(b); };
        add('🙋', 'I want', 'af-start', 'want');
        cur.tiles.forEach(([e, t]) => add(e, t, '', 'item'));
        add('🙏', 'please', 'af-please', 'please');
        acts.innerHTML = '';
        const sayBtn = document.createElement('button'); sayBtn.type = 'button'; sayBtn.className = 'btn lg'; sayBtn.textContent = '🔊 Say it'; sayBtn.onclick = submit;
        const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn quiet'; clr.textContent = 'Start again'; clr.onclick = () => { words = []; draw(); };
        const hb = document.createElement('button'); hb.type = 'button'; hb.className = 'btn quiet'; hb.textContent = '💡 Hint'; hb.onclick = () => { hints++; strip.insertAdjacentHTML('beforeend', `<p class="af-hint">Start with "I want", then pick what you need${needPlease ? ', then "please"' : ''}.</p>`); };
        acts.append(sayBtn, clr, hb);
      }
      function tap(w) { if (locked) return; if (!words.some((x) => x.t === w.t)) words.push(w); say(w.t); draw(); }
      function submit() {
        if (locked) return;
        const hasWant = words[0] && words[0].kind === 'want';
        const items = words.filter((w) => w.kind === 'item');
        const good = hasWant && items.length === 1 && items[0].t === cur.item[1] && (!needPlease || words[words.length - 1].kind === 'please');
        say(words.map((w) => w.t).join(' '));
        if (good) { locked = true; strip.classList.add('af-ok'); setTimeout(() => { strip.classList.remove('af-ok'); round >= rounds ? finish() : newRound(); }, 900); }
        else { errors++; strip.insertAdjacentHTML('beforeend', `<p class="af-hint">Almost. ${!hasWant ? 'Begin with "I want". ' : ''}${items.length !== 1 || (items[0] && items[0].t !== cur.item[1]) ? 'Pick the one that fits what you need. ' : ''}${needPlease && !(words.length && words[words.length - 1].kind === 'please') ? 'End with "please".' : ''}</p>`); words = []; setTimeout(draw, 1800); }
      }
      function finish() {
        const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
        onComplete({ score: global.GameUI.computeScore(errors, hints), errors, timeTakenSec, hintsUsed: hints, attempts: rounds + errors, completed: true });
      }
      newRound();
    }
  };
  global.AskForItGame = AskForItGame;
})(typeof window !== 'undefined' ? window : global);
