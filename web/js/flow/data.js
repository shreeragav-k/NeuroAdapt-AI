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
  testRounds: 6,          // trials per assessment game
  sessionRounds: 8,       // default trials per practice game
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
// Row: [id, engine, content, mode, title, skill, how-to-play]
const G1 = {
  test: [
    ["t1", "sequence", "colors", "", "Colour Echo", "Short-term memory", "Watch the colours light up, then tap them in the same order."],
    ["t2", "recall", "shapes", "", "Spot What You Saw", "Visual memory", "Look at the shapes. They hide. Then tap the shape you saw."],
    ["t3", "odd", "shape", "", "Odd Shape Out", "Visual attention", "One shape is different. Tap it."],
    ["t4", "gonogo", "color", "", "Green Means Go", "Response inhibition", "Tap when it is green. Do not tap when it is red."],
    ["t5", "reaction", "shape", "", "Quick Tap", "Reaction speed", "Wait for the star to appear, then tap it as fast as you can."],
  ],
  easy: [
    ["e01", "pairs", "shapes", "", "Shape Pairs", "Visual memory", "Turn two cards at a time. Remember where the matching shapes are."],
    ["e02", "grid", "cells", "", "Light-Up Squares", "Spatial memory", "Watch which squares light up, then tap them."],
    ["e03", "delayed", "shapes", "", "Wait and Choose", "Delayed memory", "Look at the shapes. Clap while you wait. Then tap the shape you saw."],
    ["e04", "objloc", "shapes", "", "Where Did It Hide", "Spatial memory", "Look where the shapes sit. Then tap the place where this shape was."],
    ["e05", "sequence", "shapes", "", "Shape Echo", "Short-term memory", "Watch the shapes light up, then tap them in the same order."],
    ["e06", "match", "shape", "", "Shape Twins", "Visual perception", "Tap the shape that is the same as the one at the top."],
    ["e07", "odd", "color", "", "Odd Colour Out", "Visual attention", "One colour is different. Tap it."],
    ["e08", "series", "color", "", "Colour Train", "Pattern reasoning", "Look at the colour pattern and tap the colour that comes next."],
    ["e09", "search", "shapes", "", "Find the Stars", "Selective attention", "Tap every star. Leave the other shapes alone."],
    ["e10", "order", "numbers", "", "Number Walk", "Attention and sequencing", "Tap the numbers in order: 1, 2, 3 and on."],
  ],
  medium: [
    ["m01", "pairs", "colors", "", "Colour Pairs", "Visual memory", "Turn two cards at a time. Remember where the matching colours are."],
    ["m02", "sequence", "positions", "", "Dance Steps", "Spatial memory", "Watch the squares light up, then tap them in the same order."],
    ["m03", "recall", "colors", "", "Colour Memory", "Visual memory", "Look at the colours. They hide. Then tap the colour you saw."],
    ["m04", "delayed", "colors", "", "Remember and Wait", "Delayed memory", "Look at the colours. Count while you wait. Then tap the colour you saw."],
    ["m05", "assoc", "shapecolor", "", "Shape and Its Colour", "Associative memory", "Remember which colour each shape had. Then tap the colour."],
    ["m06", "odd", "size", "", "Odd Size Out", "Visual attention", "One is a different size. Tap it."],
    ["m07", "gonogo", "shape", "", "Catch the Circles", "Response inhibition", "Tap the circles. Do not tap any other shape."],
    ["m08", "series", "shape", "", "Shape Train", "Pattern reasoning", "Look at the shape pattern and tap the shape that comes next."],
    ["m09", "timing", "bar", "", "Stop the Bus", "Timing", "Tap to stop the bus when it is on the green stop."],
    ["m10", "order", "size", "", "Small to Big", "Attention and sequencing", "Tap the circles from the smallest to the biggest."],
  ],
  hard: [
    ["h01", "nback", "shape", "", "Same as Before?", "Working memory", "Is this shape the same as the one just before? Answer yes or no."],
    ["h02", "recall", "shapes", "missing", "What Went Missing", "Visual memory", "Look at the shapes. One goes missing. Tap the one that left."],
    ["h03", "pairs", "numbers", "", "Number and Dots Pairs", "Associative memory", "Match each number with the group of dots that shows it."],
    ["h04", "objloc", "colors", "", "Colour Spots", "Spatial memory", "Look where each colour sits. Then tap the place where this colour was."],
    ["h05", "delayed", "shapecolor", "", "Remember the Pair", "Delayed memory", "Look at the coloured shapes. Count while you wait. Then tap the one you saw."],
    ["h06", "switch", "colorshape", "", "Colour or Shape", "Mental flexibility", "Follow the rule at the top. It changes, so read it each time."],
    ["h07", "odd", "pattern", "", "Odd Pattern Out", "Visual attention", "One pattern is different. Tap it."],
    ["h08", "series", "shapecolor", "", "Double Train", "Pattern reasoning", "The shape and colour follow a pattern. Tap what comes next."],
    ["h09", "search", "conjunction", "", "Find the Red Stars", "Selective attention", "Tap every star that is red. Leave the rest."],
    ["h10", "compare", "glance", "", "Quick Glance", "Short-term memory", "Two groups flash for a moment. Tap the side that had more."],
  ],
};

const G2 = {
  test: [
    ["t1", "span", "digits", "", "Digit Echo", "Working memory", "Watch the numbers appear one by one, then tap them in the same order."],
    ["t2", "recall", "words", "", "Word Memory", "Verbal memory", "Read the words. They hide. Then tap the word that was in the list."],
    ["t3", "search", "letters", "", "Letter Hunt", "Selective attention", "Tap every letter B. Ignore the other letters."],
    ["t4", "gonogo", "letter", "", "Not the X", "Response inhibition", "Tap every letter, but never the letter X."],
    ["t5", "series", "number", "", "Number Pattern", "Pattern reasoning", "Find the rule and choose the next number."],
  ],
  easy: [
    ["e01", "pairs", "words", "", "Opposite Pairs", "Associative memory", "Turn two cards at a time. Find each word and its opposite."],
    ["e02", "objloc", "digits", "", "Where Was the Number", "Spatial memory", "Study where the numbers sit. Then tap the place where this number was."],
    ["e03", "delayed", "letters", "", "Letters After a Pause", "Delayed memory", "Study the letters. Count backwards while you wait. Then pick a letter you saw."],
    ["e04", "span", "letters", "", "Letter Span", "Working memory", "Watch the letters appear one by one, then tap them in the same order."],
    ["e05", "odd", "number", "", "Odd Digit", "Visual attention", "One number is different. Tap it."],
    ["e06", "order", "countdown", "", "Count Down", "Attention and sequencing", "Tap the numbers backwards, from the biggest to 1."],
    ["e07", "gonogo", "digit", "", "Even Numbers Only", "Response inhibition", "Tap even numbers. Do not tap odd numbers."],
    ["e08", "series", "letter", "", "Letter Pattern", "Pattern reasoning", "Find the rule and choose the next letter."],
    ["e09", "category", "animals", "", "Animal Odd One Out", "Concept formation", "Find the word that does NOT belong with the animals."],
    ["e10", "mirror", "mirror", "", "Mirror Image", "Spatial reasoning", "Choose the pattern that is the mirror image."],
  ],
  medium: [
    ["m01", "span", "revdigits", "", "Digits Backwards", "Working memory", "Watch the numbers, then tap them in REVERSE order."],
    ["m02", "recall", "letters", "missing", "Vanishing Letter", "Verbal memory", "Look at the letters. One disappears. Tap the one that left."],
    ["m03", "story", "short", "", "Story Detail", "Episodic memory", "Read the short story. Then answer a question about it."],
    ["m04", "assoc", "wordnumber", "", "Word and Number", "Associative memory", "Learn which number goes with each word. Then answer from the word."],
    ["m05", "sequence", "letters", "", "Letter Echo", "Short-term memory", "Watch the letters light up, then tap them in the same order."],
    ["m06", "stroop", "color", "", "Ink Colour", "Response inhibition", "Tap the COLOUR the word is written in, not what it says."],
    ["m07", "search", "digits", "", "Number Hunt", "Selective attention", "Tap every number 7. Ignore the other numbers."],
    ["m08", "switch", "parity", "", "Odd, Even, Big, Small", "Mental flexibility", "Follow the rule at the top. It changes, so read it each time."],
    ["m09", "matrix", "shapes", "", "Missing Piece", "Abstract reasoning", "Find the rule in the grid and choose the piece that completes it."],
    ["m10", "mirror", "rotate", "", "Turn It Around", "Spatial reasoning", "Choose the pattern after it is turned a quarter turn clockwise."],
  ],
  hard: [
    ["h01", "nback", "letter", "", "Letter One-Back", "Working memory", "Is this letter the same as the one just before it?"],
    ["h02", "span", "revletters", "", "Letters Backwards", "Working memory", "Watch the letters, then tap them in REVERSE order."],
    ["h03", "story", "long", "", "Story Questions", "Episodic memory", "Read the longer story. Then answer a question about a detail."],
    ["h04", "symbolcode", "digits", "", "Symbol Code", "Processing speed", "Use the key to find the number for each symbol."],
    ["h05", "objloc", "letters", "", "Where Was the Letter", "Spatial memory", "Study where the letters sit. Then tap the place where this letter was."],
    ["h06", "delayed", "digits", "", "Numbers After a Pause", "Delayed memory", "Study the numbers. Count backwards while you wait. Then pick a number you saw."],
    ["h07", "flanker", "arrows", "", "Arrow Focus", "Selective attention", "Choose the direction of the middle arrow only."],
    ["h08", "route", "arrows", "", "Map Moves", "Spatial working memory", "Follow the arrows from the start square and say where you finish."],
    ["h09", "logic", "order", "", "Who Is Tallest", "Logical reasoning", "Read the clues and work out who it is."],
    ["h10", "analogy", "words", "", "Word Analogies", "Verbal reasoning", "Find the word that completes the pair in the same way."],
  ],
};

const G3 = {
  test: [
    ["t1", "sequence", "corsi", "", "Block Memory", "Spatial working memory", "Watch the blocks light up, then tap them in the same order."],
    ["t2", "delayed", "words", "", "Delayed Word Recall", "Delayed memory", "Study the words. Count backwards while you wait. Then pick a word you saw."],
    ["t3", "search", "lookalike", "", "Find the b's", "Selective attention", "Tap every lowercase b. Beware of letters that look like it."],
    ["t4", "stroop", "reverse", "", "Read the Word", "Response inhibition", "Choose the colour the word NAMES, ignoring the ink it is written in."],
    ["t5", "symbolcode", "letters", "", "Letter Code", "Processing speed", "Use the key to find the letter for each symbol."],
  ],
  easy: [
    ["e01", "pairs", "symbols", "", "Symbol Pairs", "Visual memory", "Turn two cards at a time. Remember where the matching symbols are."],
    ["e02", "objloc", "words", "", "Where Was the Word", "Spatial memory", "Study where the words sit. Then tap the place where this word was."],
    ["e03", "recall", "positions", "", "Where Was It", "Spatial memory", "Study the lit squares, then choose the same layout."],
    ["e04", "assoc", "namejob", "", "Name and Job", "Associative memory", "Learn each person's job. Then say what a person does from their name."],
    ["e05", "story", "news", "", "Short Story Recall", "Episodic memory", "Read the short news item. Then answer a question about it."],
    ["e06", "odd", "rotation", "", "Tilted One Out", "Visual attention", "One shape is turned differently. Tap it."],
    ["e07", "gonogo", "wordcategory", "", "Animals Only", "Response inhibition", "Tap the animal words. Do not tap any other word."],
    ["e08", "category", "professions", "", "Odd Profession Out", "Concept formation", "Find the word that is NOT a profession."],
    ["e09", "series", "numberalt", "", "Two-Track Series", "Pattern reasoning", "Two rules alternate. Choose the next number."],
    ["e10", "mirror", "flip", "", "Flip Check", "Spatial reasoning", "Choose the pattern after it is flipped upside down."],
  ],
  medium: [
    ["m01", "nback", "position", "", "Position One-Back", "Working memory", "Is this square in the same place as the one just before?"],
    ["m02", "delayed", "symbols", "", "Symbols After a Pause", "Delayed memory", "Study the symbols. Count backwards while you wait. Then pick a symbol you saw."],
    ["m03", "recall", "digits", "missing", "Missing Number", "Working memory", "Look at the numbers. One disappears. Tap the one that left."],
    ["m04", "sequence", "greek", "", "Greek Echo", "Short-term memory", "Watch the symbols light up, then tap them in the same order."],
    ["m05", "assoc", "wordpair", "", "Word Pairs", "Associative memory", "Learn the word pairs. Then pick the partner of the word shown."],
    ["m06", "flanker", "letters", "", "Letter Flanker", "Selective attention", "Choose the middle letter only."],
    ["m07", "matrix", "rotation", "", "Turning Matrix", "Abstract reasoning", "Find the rule in the grid and choose the piece that completes it."],
    ["m08", "switch", "letternumber", "", "Letter or Number", "Mental flexibility", "Follow the rule at the top. It changes, so read it each time."],
    ["m09", "mirror", "mentalrotation", "", "Mental Rotation", "Spatial reasoning", "Choose the pattern that is the same shape, just turned."],
    ["m10", "logic", "syllogism", "", "Valid Conclusion", "Logical reasoning", "Choose the statement that must be true."],
  ],
  hard: [
    ["h01", "nback", "digit", "", "Digit Two-Back", "Working memory", "Is this number the same as the one two steps ago?"],
    ["h02", "span", "letternumber", "", "Letter-Number Sequencing", "Working memory", "Watch the mix, then tap the numbers in order, then the letters in alphabet order."],
    ["h03", "story", "schedule", "", "Appointment Recall", "Episodic memory", "Read the schedule. Then answer a question about a detail."],
    ["h04", "objloc", "symbols", "", "Where Was the Symbol", "Spatial memory", "Study where the symbols sit. Then tap the place where this symbol was."],
    ["h05", "recall", "words", "missing", "Missing Word", "Verbal memory", "Look at the words. One disappears. Tap the one that left."],
    ["h06", "route", "words", "", "Grid Directions", "Spatial working memory", "Follow the directions from the start square and say where you finish."],
    ["h07", "symbolcode", "reverse", "", "Reverse Code", "Processing speed", "Use the key to find the symbol for each letter."],
    ["h08", "analogy", "abstract", "", "Relationship Analogies", "Abstract reasoning", "Find the word that completes the pair in the same way."],
    ["h09", "arith", "serial", "", "Serial Subtraction", "Working memory", "Keep subtracting by the same amount. Choose the next number."],
    ["h10", "timing", "dot", "", "Stop in the Zone", "Timing", "Tap to stop the moving dot inside the green zone."],
  ],
};

const SOURCE = { g1: G1, g2: G2, g3: G3 };

function build() {
  const out = [];
  for (const g of GROUPS) {
    for (const phase of ["test", ...LEVELS]) {
      SOURCE[g.id][phase].forEach(([n, engine, content, mode, title, skill, how], i) => {
        out.push(Object.freeze({
          id: `${g.id}-${n}`, group: g.id, phase, order: i,
          engine, content, mode: mode || "", title, skill, how,
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
export const CATEGORY_PROMPT = {
  animals: "Which one is NOT an animal?",
  food: "Which one is NOT a food?",
  nature: "Which one is NOT part of nature?",
  professions: "Which one is NOT a profession?",
  geography: "Which one is NOT a country?",
  science: "Which one is NOT a chemical element?",
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
export const DOMAINS = ["Memory", "Attention", "Self-control", "Reasoning", "Flexible thinking", "Spatial thinking", "Processing speed"];
const AREA = {
  Memory: ["Short-term memory", "Working memory", "Spatial working memory", "Visual memory", "Spatial memory", "Verbal memory", "Associative memory", "Episodic memory", "Delayed memory"],
  Attention: ["Visual attention", "Selective attention", "Attention and sequencing", "Visual perception"],
  "Self-control": ["Response inhibition"],
  Reasoning: ["Pattern reasoning", "Abstract reasoning", "Logical reasoning", "Verbal reasoning", "Concept formation"],
  "Flexible thinking": ["Mental flexibility"],
  "Spatial thinking": ["Spatial reasoning"],
  "Processing speed": ["Processing speed", "Reaction speed", "Timing"],
};
export const DOMAIN_OF = Object.freeze(Object.fromEntries(Object.entries(AREA).flatMap(([d, skills]) => skills.map((s) => [s, d]))));
export const domainOf = (skill) => DOMAIN_OF[skill] || null;
