// Feed the Animal: the rules, with no drawing and no camera, so they can be tested on their own.
// Ported from the supplied PyGame game (levels.py, pinch_detection.py, scoring.py).
//
// Each animal has one favourite food. The player pinches a food (or drags it with a mouse or finger), carries it
// to the animal's mouth and lets go. The right food is eaten; the wrong food goes back to the shelf with no
// penalty except that the try is counted. Every try that reaches the mouth is one trial of the daily score.

export const ANIMALS = Object.freeze({
  rabbit: Object.freeze({ name: "Rabbit", food: "carrot", distractors: ["banana", "apple", "fish"], hint: "Rabbits love carrots!" }),
  monkey: Object.freeze({ name: "Monkey", food: "banana", distractors: ["carrot", "apple", "bone"], hint: "Monkeys love bananas!" }),
  cat:    Object.freeze({ name: "Cat",    food: "fish",   distractors: ["bone", "carrot", "banana"], hint: "Cats love fish!" }),
  dog:    Object.freeze({ name: "Dog",    food: "bone",   distractors: ["carrot", "banana", "fish"], hint: "Dogs love bones!" }),
});
export const FOODS = Object.freeze(["carrot", "banana", "apple", "bone", "fish"]);
export const FOOD_NAMES = Object.freeze({ carrot: "Carrot", banana: "Banana", apple: "Apple", bone: "Bone", fish: "Fish" });

// The rotating orders of the original game: never the same animal twice in a row.
export const SEQUENCES = Object.freeze({
  easy: Object.freeze(["rabbit", "monkey", "cat"]),
  medium: Object.freeze(["monkey", "cat", "dog"]),
  hard: Object.freeze(["cat", "rabbit", "dog"]),
});
// foods on the shelf, and how long the hint is shown (null = always, 0 = never)
export const FEED_PLAY = Object.freeze({
  easy: Object.freeze({ foods: 3, hintMs: null }),
  medium: Object.freeze({ foods: 4, hintMs: 3500 }),
  hard: Object.freeze({ foods: 5, hintMs: 0 }),
});
export const POINTS_PER_FEED = 10;
export const PINCH = Object.freeze({ on: 0.085, off: 0.13, onFrames: 1, offFrames: 2 });

const shuffle = (rng, xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// The right food plus (n - 1) others, in a random order. The animal's usual look-alike foods come first.
export function foodsFor(animal, n, rng = Math.random) {
  const a = ANIMALS[animal];
  const others = [...shuffle(rng, a.distractors), ...FOODS.filter((f) => f !== a.food && !a.distractors.includes(f))];
  return shuffle(rng, [a.food, ...others.slice(0, Math.max(1, n - 1))]);
}

// Thumb-to-index distance (0..1 across the picture) -> pinching or not, with a gap between "pinch" and "let go"
// so a food is not dropped by accident.
export class PinchDetector {
  constructor({ on, off, onFrames, offFrames } = PINCH) { Object.assign(this, { on, off, onFrames, offFrames }); this.reset(); }
  reset() { this.pinching = false; this._a = 0; this._b = 0; }
  // -> { pinching, justPinched, justReleased }
  update(distance) {
    let justPinched = false, justReleased = false;
    if (distance == null) {                                    // hand lost for a moment
      this._b += 1; this._a = 0;
      if (this.pinching && this._b >= this.offFrames) { this.pinching = false; justReleased = true; this._b = 0; }
    } else if (!this.pinching) {
      if (distance < this.on) { if (++this._a >= this.onFrames) { this.pinching = true; justPinched = true; this._a = 0; this._b = 0; } } else this._a = 0;
    } else if (distance > this.off) {
      if (++this._b >= this.offFrames) { this.pinching = false; justReleased = true; this._b = 0; }
    } else this._b = 0;
    return { pinching: this.pinching, justPinched, justReleased };
  }
}

export class Feeder {
  constructor(level, rng = Math.random) {
    this.level = level; this.rng = rng; this.play = FEED_PLAY[level]; this.sequence = SEQUENCES[level];
    this.step = 0; this.correct = 0; this.wrong = 0; this.score = 0; this.log = [];
    this.foods = foodsFor(this.animal, this.play.foods, rng);
  }
  get animal() { return this.sequence[Math.min(this.step, this.sequence.length - 1)]; }
  get profile() { return ANIMALS[this.animal]; }
  get done() { return this.step >= this.sequence.length; }
  get attempts() { return this.correct + this.wrong; }
  get accuracy() { return this.attempts ? Math.round((100 * this.correct) / this.attempts) : 0; }

  // The player let go of `food` at the animal's mouth. -> { correct, done, animal, food }
  drop(food) {
    if (this.done) throw new Error("The game is finished.");
    const animal = this.animal, ok = food === ANIMALS[animal].food;
    this.log.push({ animal, food, correct: ok });
    if (ok) {
      this.correct += 1; this.score += POINTS_PER_FEED; this.step += 1;
      if (!this.done) this.foods = foodsFor(this.animal, this.play.foods, this.rng);
    } else this.wrong += 1;
    return { correct: ok, done: this.done, animal, food };
  }
  // stars as in the other games: from accuracy
  get stars() { return this.accuracy >= 85 ? 3 : this.accuracy >= 60 ? 2 : 1; }
  trials(steps = [1, 2]) {
    return this.log.map((l, i) => ({ step: steps[i % steps.length], correct: l.correct, rt: null, animal: l.animal }));
  }
}
