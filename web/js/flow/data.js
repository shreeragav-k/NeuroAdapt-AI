// Workflow constants and the game catalogue.
//
// Every game is a standard cognitive task (working memory, delayed recall, spatial memory, associative
// memory, selective attention, inhibition, flexibility, reasoning, processing speed) set for one age group.
// Every game belongs to exactly ONE age group and ONE set:
//   test      the 5 games of the initial assessment (before adaptive learning)
//   easy      the 10 games suggested at the Easy level
//   medium    the 10 games suggested at the Medium level
//   hard      the 10 games suggested at the Hard level
// 3 groups x (5 + 10 + 10 + 10) = 105 games. No game appears in two sets.

export const GROUPS = [
  { id: "g1", tier: 0, min: 1,  max: 5,  label: "Ages 1 to 5",   name: "Little Explorers" },
  { id: "g2", tier: 1, min: 6,  max: 17, label: "Ages 6 to 17",  name: "Young Learners" },
  { id: "g3", tier: 2, min: 18, max: 60, label: "Ages 18 to 60", name: "Adult Minds" },
];

export const LEVELS = ["easy", "medium", "hard"];
export const LEVEL_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

// Each trial of a game has a difficulty step from 1 (gentlest) to 6 (hardest).
// A level plays inside a band of steps, alternating low / high.
export const BANDS = { easy: [1, 2], medium: [3, 4], hard: [5, 6] };

export const RULES = {
  testGames: 5,
  testRounds: 3,          // trials per assessment game
  sessionRounds: 3,       // default trials per practice game
  sessionGames: 10,       // games per daily session (= games per level)
  startStep: 3,           // assessment staircase starts in the middle
  minStep: 1,
  maxStep: 6,
  easyBelow: 2.5,         // ability < 2.5          -> Easy
  hardFrom: 4.5,          // ability >= 4.5         -> Hard, otherwise Medium
  promoteAt: 85,          // accuracy % needed to move up
  demoteBelow: 50,        // accuracy % below which we move down
  dropTolerance: 5,       // points the score may fall versus the last session at this level and still move up
};

// ----------------------------------------------------------------- catalogue
// Row: [id, engine, content, mode, title, skill, difficulty, how-to-play]
// `difficulty` ranks the games inside a set from the gentlest (1) to the most demanding. Each set is shown
// in that order, so the assessment and every daily session start with a warm-up and build up.
const G1 = {
  test: [
    ["t1", "reaction", "butterfly", "", "Catch the Butterfly", "Reaction speed", 1, "Wait for the butterfly to appear, then tap it as fast as you can."],
    ["t2", "odd", "animals", "", "Odd Animal Out", "Visual attention", 2, "One animal is different from the others. Find it and tap it."],
    ["t3", "gonogo", "animals", "", "Cat, Not Dog", "Response inhibition", 3, "Tap the cat. When any other animal shows up, hold still."],
    ["t4", "recall", "animals", "", "Spot What You Saw", "Visual memory", 4, "Look at the animals. They hide. Then tap the animal you saw."],
    ["t5", "sequence", "animals", "", "Animal Echo", "Short-term memory", 5, "Watch the animals light up and sing. Then tap them in the same order."],
  ],
  easy: [
    ["e01", "fruit", "lanes", "g1-easy", "Fruit Catcher", "Response inhibition", 1, "Move to catch the falling fruit. Let the chocolate fall past. 3 rounds, and you have 3 lives."],
    ["e02", "trace", "path", "g1-easy", "Paint the Path", "Visuomotor control", 2, "Move your finger along the dotted path, from the glowing start to the star. Stay on the line. Two shapes: a line and a circle."],
    ["e03", "feed", "animals", "g1-easy", "Feed the Animal", "Associative memory", 3, "Pinch a food, drag it to the animal's mouth and let go. Three animals, each with a favourite food, and a hint tells you which."],
    ["e04", "order", "numbers", "", "Number Walk", "Attention and sequencing", 4, "Tap the numbers in order: 1, 2, 3 and on."],
    ["e05", "pairs", "pictures", "", "Picture Pairs", "Visual memory", 5, "Turn two cards at a time. Remember where the matching pictures are."],
    ["e06", "objloc", "pictures", "", "Where Did It Hide", "Spatial memory", 6, "Look where each picture sits. Then tap the place where this one was."],
    ["e07", "basket", "fruits", "", "Fruit Basket", "Visual memory", 7, "Remember the fruit in the basket. Then tap all of it among the others."],
    ["e08", "delayed", "pictures", "", "Wait and Choose", "Delayed memory", 8, "Look at the pictures. Clap while you wait. Then tap the one you saw."],
    ["e09", "grid", "cells", "", "Light-Up Squares", "Spatial memory", 9, "Watch which squares light up, then tap them."],
    ["e10", "sequence", "fruits", "", "Fruit Echo", "Short-term memory", 10, "Watch the fruit light up and play a note. Tap them in the same order."],
  ],
  medium: [
    ["m01", "fruit", "lanes", "g1-medium", "Fruit Catcher", "Response inhibition", 1, "Catch the fruit, dodge the chocolate. It falls faster now. 3 rounds, and you have 3 lives."],
    ["m02", "trace", "path", "g1-medium", "Paint the Path", "Visuomotor control", 2, "Follow the dotted path from the glowing start to the star and stay close to the line. Two shapes: a circle and a zigzag."],
    ["m03", "feed", "animals", "g1-medium", "Feed the Animal", "Associative memory", 3, "Feed three animals the food each one loves. The hint shows only for a moment, so remember it. Four foods to choose from."],
    ["m04", "order", "size", "", "Small to Big", "Attention and sequencing", 4, "Tap the circles from the smallest to the biggest."],
    ["m05", "recall", "fruits", "", "Fruit Memory", "Visual memory", 5, "Look at the fruit. It hides. Then tap the fruit you saw."],
    ["m06", "sequence", "positions", "", "Dance Steps", "Spatial memory", 6, "Watch the squares light up, then tap them in the same order."],
    ["m07", "pairs", "animals", "", "Animal Pairs", "Visual memory", 7, "Turn two cards at a time. Remember where the matching animals are."],
    ["m08", "basket", "animals", "", "Animal Basket", "Visual memory", 8, "Remember the animals in the basket. Then tap all of them among the others."],
    ["m09", "assoc", "animalcolor", "", "Colour of the Animal", "Associative memory", 9, "Remember which colour each animal was. Then tap the colour."],
    ["m10", "delayed", "animals", "", "Remember and Wait", "Delayed memory", 10, "Look at the animals. Count while you wait. Then tap the one you saw."],
  ],
  hard: [
    ["h01", "fruit", "lanes", "g1-hard", "Fruit Catcher", "Response inhibition", 1, "Catch the fruit, dodge the chocolate, and keep up as it falls faster. 3 rounds, 3 lives."],
    ["h02", "trace", "path", "g1-hard", "Paint the Path", "Visuomotor control", 2, "Trace the path from start to star as exactly as you can; the line is narrow. Two shapes: a zigzag and a crown."],
    ["h03", "feed", "animals", "g1-hard", "Feed the Animal", "Associative memory", 3, "Feed each animal its favourite food with no hint, from five foods. Three animals."],
    ["h04", "switch", "animalcolor", "", "Colour or Animal", "Mental flexibility", 4, "Follow the rule at the top. It changes, so read it each time."],
    ["h05", "pairs", "numbers", "", "Number and Dots Pairs", "Associative memory", 5, "Match each number with the group of dots that shows it."],
    ["h06", "recall", "animals", "missing", "What Went Missing", "Visual memory", 6, "Look at the animals. One goes missing. Tap the one that left."],
    ["h07", "objloc", "animals", "", "Animal Spots", "Spatial memory", 7, "Look where each animal sits. Then tap the place where this one was."],
    ["h08", "basket", "things", "", "Toy Box", "Visual memory", 8, "Remember the things in the box. Then tap all of them among the others."],
    ["h09", "delayed", "tinted", "", "Remember the Pair", "Delayed memory", 9, "Look at the coloured animals. Count while you wait. Then tap the one you saw."],
    ["h10", "nback", "animal", "", "Same as Before?", "Working memory", 10, "Is this animal the same as the one just before? Answer yes or no."],
  ],
};

const G2 = {
  test: [
    ["t1", "search", "letters", "", "Letter Hunt", "Selective attention", 1, "Tap every letter B. Ignore the other letters."],
    ["t2", "gonogo", "letter", "", "Not the X", "Response inhibition", 2, "Tap every letter, but never the letter X."],
    ["t3", "span", "digits", "", "Digit Echo", "Working memory", 3, "Watch the numbers appear one by one, then tap them in the same order."],
    ["t4", "recall", "words", "", "Word Memory", "Verbal memory", 4, "Read the words. They hide. Then tap the word that was in the list."],
    ["t5", "series", "number", "", "Number Pattern", "Pattern reasoning", 5, "Find the rule and choose the next number."],
  ],
  easy: [
    ["e01", "fruit", "lanes", "g2-easy", "Fruit Catcher", "Response inhibition", 1, "Move to catch the falling fruit. Let the chocolate fall past. 3 rounds, and you have 3 lives."],
    ["e02", "trace", "path", "g2-easy", "Paint the Path", "Visuomotor control", 2, "Move your finger along the dotted path, from the glowing start to the star. Stay on the line. Two shapes: a line and a circle."],
    ["e03", "feed", "animals", "g2-easy", "Feed the Animal", "Associative memory", 3, "Pinch a food, drag it to the animal's mouth and let go. Three animals, each with a favourite food, and a hint tells you which."],
    ["e04", "mirror", "mirror", "", "Mirror Image", "Spatial reasoning", 4, "Choose the pattern that is the mirror image."],
    ["e05", "analogy", "words", "", "Word Analogies", "Verbal reasoning", 5, "Find the word that completes the pair in the same way."],
    ["e06", "pairs", "words", "", "Opposite Pairs", "Associative memory", 6, "Turn two cards at a time. Find each word and its opposite."],
    ["e07", "basket", "mixed", "", "Market Basket", "Visual memory", 7, "Remember the pictures in the basket. Then tap all of them among the others."],
    ["e08", "objloc", "digits", "", "Where Was the Number", "Spatial memory", 8, "Study where the numbers sit. Then tap the place where this number was."],
    ["e09", "span", "letters", "", "Letter Span", "Working memory", 9, "Watch the letters appear one by one, then tap them in the same order."],
    ["e10", "delayed", "letters", "", "Letters After a Pause", "Delayed memory", 10, "Study the letters. Count backwards while you wait. Then pick a letter you saw."],
  ],
  medium: [
    ["m01", "fruit", "lanes", "g2-medium", "Fruit Catcher", "Response inhibition", 1, "Catch the fruit, dodge the chocolate. It falls faster now. 3 rounds, and you have 3 lives."],
    ["m02", "trace", "path", "g2-medium", "Paint the Path", "Visuomotor control", 2, "Follow the dotted path from the glowing start to the star and stay close to the line. Two shapes: a circle and a zigzag."],
    ["m03", "feed", "animals", "g2-medium", "Feed the Animal", "Associative memory", 3, "Feed three animals the food each one loves. The hint shows only for a moment, so remember it. Four foods to choose from."],
    ["m04", "mirror", "rotate", "", "Turn It Around", "Spatial reasoning", 4, "Choose the pattern after it is turned a quarter turn clockwise."],
    ["m05", "matrix", "shapes", "", "Missing Piece", "Abstract reasoning", 5, "Find the rule in the grid and choose the piece that completes it."],
    ["m06", "sequence", "letters", "", "Letter Echo", "Short-term memory", 6, "Watch the letters light up and play a note, then tap them in the same order."],
    ["m07", "recall", "letters", "missing", "Vanishing Letter", "Verbal memory", 7, "Look at the letters. One disappears. Tap the one that left."],
    ["m08", "assoc", "wordnumber", "", "Word and Number", "Associative memory", 8, "Learn which number goes with each word. Then answer from the word."],
    ["m09", "story", "short", "", "Story Detail", "Episodic memory", 9, "Read the short story. Then answer a question about it."],
    ["m10", "span", "revdigits", "", "Digits Backwards", "Working memory", 10, "Watch the numbers, then tap them in REVERSE order."],
  ],
  hard: [
    ["h01", "fruit", "lanes", "g2-hard", "Fruit Catcher", "Response inhibition", 1, "Catch the fruit, dodge the chocolate, and keep up as it falls faster. 3 rounds, 3 lives."],
    ["h02", "trace", "path", "g2-hard", "Paint the Path", "Visuomotor control", 2, "Trace the path from start to star as exactly as you can; the line is narrow. Two shapes: a zigzag and a crown."],
    ["h03", "feed", "animals", "g2-hard", "Feed the Animal", "Associative memory", 3, "Feed each animal its favourite food with no hint, from five foods. Three animals."],
    ["h04", "route", "arrows", "", "Map Moves", "Spatial working memory", 4, "Follow the arrows from the start square and say where you finish."],
    ["h05", "order", "trail", "", "Trail Making", "Mental flexibility", 5, "Tap in order, switching between numbers and letters: 1, A, 2, B, 3, C."],
    ["h06", "objloc", "letters", "", "Where Was the Letter", "Spatial memory", 6, "Study where the letters sit. Then tap the place where this letter was."],
    ["h07", "delayed", "digits", "", "Numbers After a Pause", "Delayed memory", 7, "Study the numbers. Count backwards while you wait. Then pick a number you saw."],
    ["h08", "story", "long", "", "Story Questions", "Episodic memory", 8, "Read the longer story. Then answer a question about a detail."],
    ["h09", "nback", "letter", "", "Letter One-Back", "Working memory", 9, "Is this letter the same as the one just before it?"],
    ["h10", "span", "revletters", "", "Letters Backwards", "Working memory", 10, "Watch the letters, then tap them in REVERSE order."],
  ],
};

const G3 = {
  test: [
    ["t1", "search", "lookalike", "", "Find the b's", "Selective attention", 1, "Tap every lowercase b. Beware of letters that look like it."],
    ["t2", "stroop", "reverse", "", "Read the Word", "Response inhibition", 2, "Choose the colour the word NAMES, ignoring the ink it is written in."],
    ["t3", "symbolcode", "letters", "", "Letter Code", "Processing speed", 3, "Use the key to find the letter for each symbol."],
    ["t4", "sequence", "corsi", "", "Block Memory", "Spatial working memory", 4, "Watch the blocks light up, then tap them in the same order."],
    ["t5", "delayed", "words", "", "Delayed Word Recall", "Delayed memory", 5, "Study the words. Count backwards while you wait. Then pick a word you saw."],
  ],
  easy: [
    ["e01", "fruit", "lanes", "g3-easy", "Fruit Catcher", "Response inhibition", 1, "Move to catch the falling fruit. Let the chocolate fall past. 3 rounds, and you have 3 lives."],
    ["e02", "trace", "path", "g3-easy", "Paint the Path", "Visuomotor control", 2, "Move your finger along the dotted path, from the glowing start to the star. Stay on the line. Two shapes: a line and a circle."],
    ["e03", "feed", "animals", "g3-easy", "Feed the Animal", "Associative memory", 3, "Pinch a food, drag it to the animal's mouth and let go. Three animals, each with a favourite food, and a hint tells you which."],
    ["e04", "series", "numberalt", "", "Two-Track Series", "Pattern reasoning", 4, "Two rules alternate. Choose the next number."],
    ["e05", "pairs", "symbols", "", "Symbol Pairs", "Visual memory", 5, "Turn two cards at a time. Remember where the matching symbols are."],
    ["e06", "recall", "positions", "", "Where Was It", "Spatial memory", 6, "Study the lit squares, then choose the same layout."],
    ["e07", "basket", "words", "", "Word Basket", "Verbal memory", 7, "Remember the words. Then tap all of them among the others."],
    ["e08", "objloc", "words", "", "Where Was the Word", "Spatial memory", 8, "Study where the words sit. Then tap the place where this word was."],
    ["e09", "assoc", "namejob", "", "Name and Job", "Associative memory", 9, "Learn each person's job. Then say what a person does from their name."],
    ["e10", "story", "news", "", "Short Story Recall", "Episodic memory", 10, "Read the short news item. Then answer a question about it."],
  ],
  medium: [
    ["m01", "fruit", "lanes", "g3-medium", "Fruit Catcher", "Response inhibition", 1, "Catch the fruit, dodge the chocolate. It falls faster now. 3 rounds, and you have 3 lives."],
    ["m02", "trace", "path", "g3-medium", "Paint the Path", "Visuomotor control", 2, "Follow the dotted path from the glowing start to the star and stay close to the line. Two shapes: a circle and a zigzag."],
    ["m03", "feed", "animals", "g3-medium", "Feed the Animal", "Associative memory", 3, "Feed three animals the food each one loves. The hint shows only for a moment, so remember it. Four foods to choose from."],
    ["m04", "mirror", "mentalrotation", "", "Mental Rotation", "Spatial reasoning", 4, "Choose the pattern that is the same shape, just turned."],
    ["m05", "matrix", "rotation", "", "Turning Matrix", "Abstract reasoning", 5, "Find the rule in the grid and choose the piece that completes it."],
    ["m06", "sequence", "greek", "", "Greek Echo", "Short-term memory", 6, "Watch the symbols light up and play a note, then tap them in the same order."],
    ["m07", "recall", "digits", "missing", "Missing Number", "Working memory", 7, "Look at the numbers. One disappears. Tap the one that left."],
    ["m08", "assoc", "wordpair", "", "Word Pairs", "Associative memory", 8, "Learn the word pairs. Then pick the partner of the word shown."],
    ["m09", "delayed", "symbols", "", "Symbols After a Pause", "Delayed memory", 9, "Study the symbols. Count backwards while you wait. Then pick a symbol you saw."],
    ["m10", "nback", "position", "", "Position One-Back", "Working memory", 10, "Is this square in the same place as the one just before?"],
  ],
  hard: [
    ["h01", "fruit", "lanes", "g3-hard", "Fruit Catcher", "Response inhibition", 1, "Catch the fruit, dodge the chocolate, and keep up as it falls faster. 3 rounds, 3 lives."],
    ["h02", "trace", "path", "g3-hard", "Paint the Path", "Visuomotor control", 2, "Trace the path from start to star as exactly as you can; the line is narrow. Two shapes: a zigzag and a crown."],
    ["h03", "feed", "animals", "g3-hard", "Feed the Animal", "Associative memory", 3, "Feed each animal its favourite food with no hint, from five foods. Three animals."],
    ["h04", "arith", "serial", "", "Serial Subtraction", "Working memory", 4, "Keep subtracting by the same amount. Choose the next number."],
    ["h05", "route", "words", "", "Grid Directions", "Spatial working memory", 5, "Follow the directions from the start square and say where you finish."],
    ["h06", "recall", "words", "missing", "Missing Word", "Verbal memory", 6, "Look at the words. One disappears. Tap the one that left."],
    ["h07", "objloc", "symbols", "", "Where Was the Symbol", "Spatial memory", 7, "Study where the symbols sit. Then tap the place where this symbol was."],
    ["h08", "story", "schedule", "", "Appointment Recall", "Episodic memory", 8, "Read the schedule. Then answer a question about a detail."],
    ["h09", "span", "letternumber", "", "Letter-Number Sequencing", "Working memory", 9, "Watch the mix, then tap the numbers in order, then the letters in alphabet order."],
    ["h10", "nback", "digit", "", "Digit Two-Back", "Working memory", 10, "Is this number the same as the one two steps ago?"],
  ],
};

const SOURCE = { g1: G1, g2: G2, g3: G3 };

// The classic cognitive task behind each kind of game, and what it trains (shown before every game).
export const TASK_INFO = {
  face: ["Facial expression imitation", "Social cognition: telling expressions apart and making them yourself, with some self-monitoring and quick switching between faces. Played in front of the camera; without a camera you pick the matching face."],
  slice: ["Go / No-Go with moving targets", "Hand-eye coordination and response inhibition: cutting what flies past (fruit) and keeping clear of what must be left alone (the bomb), at speed. Played with your fingertip in front of the camera, a mouse or a finger."],
  trace: ["Pursuit tracing (path tracing)", "Visuomotor control and sustained attention: guiding your hand along a path and keeping to it, the skill behind drawing and writing. Played with your fingertip in front of the camera, a mouse or a finger on the screen."],
  feed: ["Paired-associate learning with movement", "Associative memory: knowing which food goes with which animal, then picking it from several foods and carrying it to the right place. Played by pinching in front of the camera, or with a mouse or finger."],
  fruit: ["Go / No-Go with movement", "Response inhibition and attention: acting on the fruit, holding back from the chocolate, and moving the whole body to meet what falls. Played with your hand in front of the camera, the arrow keys or a finger."],
  reaction: ["Simple reaction time", "How fast you notice and respond. Speed of processing underlies every other skill."],
  odd: ["Visual discrimination", "Spotting what differs, which sharpens attention to detail."],
  gonogo: ["Go / No-Go task", "Response inhibition: acting on cue and holding back on cue, the basis of self-control."],
  recall: ["Recognition memory", "Encoding what you see and recognising it once it has disappeared."],
  sequence: ["Corsi / Simon sequence task", "Short-term memory for order: hold a sequence in mind and repeat it."],
  span: ["Span task", "Working memory: keep items in mind in order, sometimes re-ordering them. The classic digit-span test."],
  search: ["Visual search / cancellation", "Selective attention: finding targets among distractors."],
  series: ["Pattern completion", "Fluid reasoning: finding the rule and applying it to what comes next."],
  order: ["Trail-making task", "Attention and mental sequencing, the basis of planning and flexibility."],
  pairs: ["Concentration (card pairs)", "Visual memory and learning where things are."],
  objloc: ["Object-location memory", "Binding what to where, the memory you use to find your keys."],
  basket: ["Multi-item recognition", "Holding several items at once and picking them out among look-alikes."],
  delayed: ["Delayed match-to-sample", "Keeping a memory alive through a distraction, as in everyday remembering."],
  grid: ["Visuospatial pattern memory", "Remembering and reproducing a pattern in space."],
  assoc: ["Paired-associate learning", "Linking two things so that one brings back the other; strongly tied to everyday memory."],
  switch: ["Task-switching", "Mental flexibility: shifting between rules and updating what you do."],
  nback: ["N-back task", "Updating working memory continuously, one of the most widely used working-memory tests."],
  story: ["Story recall", "Episodic memory: remembering the details of what you read or heard."],
  mirror: ["Mental transformation", "Imagining shapes mirrored, turned or flipped: visuospatial reasoning."],
  stroop: ["Stroop task", "Selective attention and inhibition: ignoring the automatic reading of a word."],
  symbolcode: ["Symbol-digit coding", "Processing speed with a short-term memory load, a standard speed test."],
  route: ["Route following", "Spatial working memory: tracking where moves take you."],
  analogy: ["Analogical reasoning", "Seeing how two things relate and applying that relation to a new pair."],
  matrix: ["Matrix reasoning", "Abstract reasoning in the style of Raven's matrices."],
  arith: ["Serial subtraction", "Working memory and attention under mental load."],
};

function build() {
  const out = [];
  for (const g of GROUPS) {
    for (const phase of ["test", ...LEVELS]) {
      const rows = SOURCE[g.id][phase].map((r, i) => ({ r, i })).sort((a, b) => a.r[6] - b.r[6] || a.i - b.i);
      rows.forEach(({ r: [n, engine, content, mode, title, skill, difficulty, how] }, i) => {
        const [task, trains] = TASK_INFO[engine];
        out.push(Object.freeze({
          id: `${g.id}-${n}`, group: g.id, phase, order: i, difficulty,
          engine, content, mode: mode || "", title, skill, how, task, trains,
        }));
      });
    }
  }
  return Object.freeze(out);
}

export const CATALOG = build();


// ---------------------------------------------------------------- word banks
export const WORD_LISTS = {
  animals: ["dog", "cat", "horse", "tiger", "rabbit", "elephant", "zebra", "monkey", "sheep", "camel", "dolphin", "eagle"],
  food: ["bread", "rice", "apple", "cheese", "noodles", "carrot", "butter", "potato", "banana", "pizza", "honey", "lemon"],
  nature: ["river", "mountain", "forest", "ocean", "desert", "cloud", "rainbow", "valley", "volcano", "island", "waterfall", "meadow"],
  professions: ["doctor", "teacher", "pilot", "farmer", "engineer", "nurse", "carpenter", "painter", "chef", "lawyer", "tailor", "plumber"],
  geography: ["India", "Brazil", "Kenya", "Japan", "Norway", "Egypt", "Canada", "Peru", "Greece", "Spain", "Chile", "Nepal"],
  science: ["oxygen", "carbon", "iron", "helium", "sodium", "neon", "gold", "copper", "silver", "zinc", "nitrogen", "calcium"],
};
const OBJECTS = ["pencil", "chair", "window", "bicycle", "guitar", "candle", "ladder", "helmet", "umbrella", "bottle"];
export const FOILS = {
  animals: OBJECTS, food: OBJECTS, nature: OBJECTS,
  professions: ["river", "pencil", "banana", "mountain", "candle", "window", "bicycle", "ladder"],
  geography: ["Paris", "Mumbai", "Sydney", "Nairobi", "Kyoto", "Lima", "Toronto", "Madrid", "Cairo", "Oslo"],
  science: ["water", "salt", "air", "steel", "sugar", "bronze", "brass", "glass", "concrete", "soap"],
};

export const OPPOSITES = [["hot", "cold"], ["up", "down"], ["big", "small"], ["day", "night"], ["happy", "sad"], ["fast", "slow"], ["open", "close"], ["early", "late"], ["full", "empty"], ["young", "old"], ["light", "dark"], ["wet", "dry"]];
export const LOOKALIKE_DIGITS = [["6", "9"], ["5", "2"], ["3", "8"], ["1", "7"], ["0", "6"], ["2", "7"], ["4", "9"], ["13", "31"], ["68", "86"], ["15", "51"]];
export const NAMES = ["Asha", "Ben", "Chitra", "Dev", "Eli", "Farah", "Gita", "Hari"];
export const GREEK = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ"];

export const SYLLOGISMS = [
  { p: "All engineers in the team can code. Priya is an engineer in the team.", a: "Priya can code.", w: ["Priya is not an engineer.", "Everyone who can code is an engineer.", "Priya cannot code."] },
  { p: "No reptiles have fur. A gecko is a reptile.", a: "A gecko has no fur.", w: ["A gecko has fur.", "Every animal without fur is a reptile.", "Some reptiles have fur."] },
  { p: "If the alarm rings, the guard wakes up. The alarm rang.", a: "The guard woke up.", w: ["The guard stayed asleep.", "The alarm rings whenever the guard wakes.", "The alarm did not ring."] },
  { p: "If the road is wet, the match is delayed. The match was not delayed.", a: "The road was not wet.", w: ["The road was wet.", "The match was cancelled.", "The road is always dry."] },
  { p: "Every student who passed the test got a certificate. Arjun did not get a certificate.", a: "Arjun did not pass the test.", w: ["Arjun passed the test.", "Nobody passed the test.", "Arjun did not take the test."] },
  { p: "All metals conduct electricity. Copper is a metal.", a: "Copper conducts electricity.", w: ["Copper does not conduct electricity.", "Every conductor is a metal.", "Only copper conducts electricity."] },
  { p: "No dogs in the hotel are allowed upstairs. Rex is a dog in the hotel.", a: "Rex is not allowed upstairs.", w: ["Rex is allowed upstairs.", "Only dogs are allowed upstairs.", "Rex is not a dog."] },
  { p: "If a number is divisible by 6, it is divisible by 3. 24 is divisible by 6.", a: "24 is divisible by 3.", w: ["24 is not divisible by 3.", "Every number divisible by 3 is divisible by 6.", "24 is not divisible by 6."] },
  { p: "If the server is down, the site is offline. The site is online.", a: "The server is not down.", w: ["The server is down.", "The site never goes offline.", "The server was restarted."] },
];

// Short texts for story recall. Each has one clearly stated detail that the question asks about.
export const STORIES = {
  short: [
    { t: "Tom has a red kite. He flies it in the park on Saturday.", q: "What colour was the kite?", a: "Red", w: ["Blue", "Green", "Yellow"] },
    { t: "Mina buys three apples and two pears at the market.", q: "How many apples did Mina buy?", a: "Three", w: ["Two", "Four", "Five"] },
    { t: "A small brown dog called Rex sleeps under the table.", q: "Where does Rex sleep?", a: "Under the table", w: ["On the sofa", "In the garden", "Under the bed"] },
    { t: "Priya rides her bike to school every Monday and Thursday.", q: "On which days does Priya ride?", a: "Monday and Thursday", w: ["Tuesday and Friday", "Monday and Wednesday", "Every day"] },
    { t: "The bus leaves at eight o'clock. Sam sits next to the window.", q: "Where does Sam sit?", a: "Next to the window", w: ["At the front", "Next to the door", "At the back"] },
    { t: "Lena paints a blue boat and a yellow sun on her picture.", q: "What did Lena paint yellow?", a: "The sun", w: ["The boat", "The sea", "The sky"] },
    { t: "At the zoo, Arjun saw two lions, one zebra and four monkeys.", q: "How many monkeys did Arjun see?", a: "Four", w: ["Two", "One", "Three"] },
    { t: "It rained all morning, so Nila stayed home and baked cookies.", q: "What did Nila do at home?", a: "Baked cookies", w: ["Watched a film", "Read a book", "Painted a picture"] },
  ],
  long: [
    { t: "On Friday, Kabir's class went to the science museum by bus. They saw the skeleton of a giant whale, tried a space simulator and ate lunch at ten past twelve.", q: "What time did they eat lunch?", a: "Ten past twelve", w: ["Half past twelve", "Ten to one", "Quarter past eleven"] },
    { t: "Maya's grandmother lives in a yellow house by the river. Every summer Maya stays for two weeks and helps to pick plums from the old tree.", q: "What does Maya pick?", a: "Plums", w: ["Apples", "Cherries", "Pears"] },
    { t: "Four friends shared a pizza. Ravi ate two slices, Zoya ate three, Ben ate one and Asha ate two.", q: "Who ate the most slices?", a: "Zoya", w: ["Ravi", "Ben", "Asha"] },
    { t: "The school fair starts at ten. There is a book stall near the gate, a face-painting tent by the stage and a cake sale in the hall.", q: "Where is the cake sale?", a: "In the hall", w: ["By the stage", "Near the gate", "In the tent"] },
    { t: "Omar packed a torch, a blue raincoat, two sandwiches and a map for the hike. He left his water bottle on the kitchen table.", q: "What did Omar leave behind?", a: "His water bottle", w: ["The map", "The torch", "The raincoat"] },
    { t: "A farmer has twelve hens and five ducks. Each morning he collects eggs from the hens and feeds the ducks bread.", q: "What does the farmer feed the ducks?", a: "Bread", w: ["Corn", "Rice", "Seeds"] },
  ],
  news: [
    { t: "The city council approved a new tram line on Tuesday. It will link the airport with the central station, with six stops and a ten-minute ride.", q: "How many stops will the line have?", a: "Six", w: ["Four", "Eight", "Ten"] },
    { t: "Heavy fog closed the coastal highway on Monday morning. Drivers were redirected through the town of Marlow, adding about forty minutes to the trip.", q: "Through which town were drivers redirected?", a: "Marlow", w: ["Dalton", "Pembry", "Ashford"] },
    { t: "A local bakery won the regional award for best sourdough. The owner, Ms Okafor, said she will use the prize money to open a second shop near the university.", q: "Where will the second shop open?", a: "Near the university", w: ["Near the station", "In the old market", "Beside the harbour"] },
    { t: "Researchers counted 214 nesting pairs of terns on the island this spring, up from 180 last year, after rats were removed in 2022.", q: "How many nesting pairs were counted this spring?", a: "214", w: ["180", "241", "2022"] },
    { t: "The museum will stay open until nine on Fridays during July. Tickets are twelve euros, and children under six enter free.", q: "Until what time is the museum open on Fridays in July?", a: "Nine o'clock", w: ["Eight o'clock", "Ten o'clock", "Six o'clock"] },
    { t: "Engineers will repair the old stone bridge in March. The work takes five weeks, and only pedestrians may cross during that time.", q: "Who may cross the bridge during the work?", a: "Only pedestrians", w: ["Pedestrians and cyclists", "Nobody", "Buses only"] },
  ],
  schedule: [
    { t: "Your appointments: dentist on Tuesday at 9:30, a meeting with Priya on Wednesday at 2:15, and the car service on Friday at 8:00.", q: "When is the meeting with Priya?", a: "Wednesday at 2:15", w: ["Tuesday at 9:30", "Wednesday at 9:15", "Friday at 2:15"] },
    { t: "Flight 408 leaves from Gate 14 at 6:45 and lands at 9:10. Your seat is 23C, next to the aisle.", q: "Which gate does the flight leave from?", a: "Gate 14", w: ["Gate 23", "Gate 41", "Gate 9"] },
    { t: "Meeting room B is booked for the team on Thursday from 11:00 to 12:30. The projector is in room C, and lunch is served at 12:45 in the canteen.", q: "When is lunch served?", a: "12:45", w: ["12:30", "11:45", "1:15"] },
    { t: "Shopping list: two litres of milk, a loaf of rye bread, six eggs, a jar of honey and three lemons.", q: "How many eggs are on the list?", a: "Six", w: ["Three", "Two", "Twelve"] },
    { t: "The workshop is on the second floor, room 204. Registration opens at 8:30 and the first talk, by Dr Lindqvist, begins at 9:00.", q: "Who gives the first talk?", a: "Dr Lindqvist", w: ["Dr Okafor", "Dr Marlow", "Dr Ahmed"] },
    { t: "Pick up Dev from football at 5:40, drop the parcel at the post office before 5:00, and buy flowers on the way home.", q: "By what time must the parcel be dropped off?", a: "Before 5:00", w: ["Before 5:40", "Before 6:00", "Before 4:00"] },
  ],
};

// Analogies "A : B :: C : ?" with exactly one fitting answer.
export const ANALOGIES = {
  words: [
    { q: "Bird : nest :: bee : ?", a: "hive", w: ["flower", "honey", "wing"] },
    { q: "Fish : swim :: bird : ?", a: "fly", w: ["nest", "feather", "egg"] },
    { q: "Day : night :: hot : ?", a: "cold", w: ["sun", "summer", "warm"] },
    { q: "Pen : write :: knife : ?", a: "cut", w: ["fly", "sleep", "paint"] },
    { q: "Teacher : school :: doctor : ?", a: "hospital", w: ["market", "library", "farm"] },
    { q: "Puppy : dog :: kitten : ?", a: "cat", w: ["bird", "fish", "horse"] },
    { q: "Eye : see :: ear : ?", a: "hear", w: ["smell", "taste", "touch"] },
    { q: "Wheel : car :: wing : ?", a: "plane", w: ["boat", "train", "bicycle"] },
    { q: "Winter : cold :: summer : ?", a: "hot", w: ["snow", "rain", "cool"] },
    { q: "Cow : milk :: hen : ?", a: "eggs", w: ["wool", "honey", "silk"] },
    { q: "Clock : time :: ruler : ?", a: "length", w: ["weight", "heat", "speed"] },
  ],
  abstract: [
    { q: "Seed : tree :: egg : ?", a: "bird", w: ["nest", "feather", "shell"] },
    { q: "Thermometer : temperature :: scale : ?", a: "weight", w: ["length", "speed", "time"] },
    { q: "Author : novel :: composer : ?", a: "symphony", w: ["poem", "portrait", "statue"] },
    { q: "Hot : cold :: expand : ?", a: "contract", w: ["grow", "stretch", "heat"] },
    { q: "Hunger : eat :: thirst : ?", a: "drink", w: ["sleep", "run", "cook"] },
    { q: "Brake : stop :: accelerator : ?", a: "go faster", w: ["turn", "park", "reverse"] },
    { q: "Key : lock :: password : ?", a: "account", w: ["keyboard", "screen", "printer"] },
    { q: "Doctor : patient :: lawyer : ?", a: "client", w: ["judge", "court", "law"] },
    { q: "Sculptor : clay :: weaver : ?", a: "thread", w: ["needle", "loom", "cloth"] },
    { q: "Drought : water :: famine : ?", a: "food", w: ["rain", "money", "heat"] },
    { q: "Telescope : distant :: microscope : ?", a: "small", w: ["bright", "heavy", "loud"] },
  ],
};

// ------------------------------------------------- cognitive skill areas
// Every game's skill label belongs to one broad area. Reports and charts group by area,
// so results can be compared across the assessment and the three levels.
export const DOMAINS = ["Memory", "Attention", "Self-control", "Reasoning", "Flexible thinking", "Spatial thinking", "Processing speed", "Social thinking"];
const AREA = {
  Memory: ["Short-term memory", "Working memory", "Spatial working memory", "Visual memory", "Spatial memory", "Verbal memory", "Associative memory", "Episodic memory", "Delayed memory"],
  Attention: ["Visual attention", "Selective attention", "Attention and sequencing", "Visual perception"],
  "Self-control": ["Response inhibition"],
  Reasoning: ["Pattern reasoning", "Abstract reasoning", "Logical reasoning", "Verbal reasoning", "Concept formation"],
  "Flexible thinking": ["Mental flexibility"],
  "Spatial thinking": ["Spatial reasoning", "Visuomotor control"],
  "Processing speed": ["Processing speed", "Reaction speed", "Timing", "Hand-eye coordination"],
  "Social thinking": ["Social cognition"],
};
export const DOMAIN_OF = Object.freeze(Object.fromEntries(Object.entries(AREA).flatMap(([d, skills]) => skills.map((s) => [s, d]))));
export const domainOf = (skill) => DOMAIN_OF[skill] || null;

// ------------------------------------------------------------ suggested games
// Not part of the 10 games of a level. They are offered as optional extras when the player's results or the
// condition they gave at sign-up point to them:
//   areas      the skill areas that, when they are among the player's lowest, suggest the game
//   condition  words in the (optional) health condition that suggest it
export const SUGGESTIONS = Object.freeze([
  Object.freeze({
    id: "face", engine: "face", content: "expressions", title: "Make a Face", skill: "Social cognition",
    how: "A face is shown. Make the same face in front of the camera and hold it for a moment before time runs out. Three rounds.",
    areas: Object.freeze(["Flexible thinking", "Attention"]),
    condition: /autis|asd\b|asperger|social|emotion|communicat|speech|selective mutism|anxiety/i,
  }),
  Object.freeze({
    id: "slice", engine: "slice", content: "fruits", title: "Cut the Fruit", skill: "Hand-eye coordination",
    how: "Fruit flies up the screen. Swipe through every fruit and keep clear of the bomb. Three rounds.",
    areas: Object.freeze(["Self-control", "Processing speed", "Spatial thinking"]),
    condition: /adhd|attention|hyperactiv|impuls|dyspraxia|coordination|motor|cerebral palsy/i,
  }),
]);
export const suggestionById = (id) => SUGGESTIONS.find((s) => s.id === id) || null;
