// Skills, games and how they map to developmental domains. Pure data and lookups (no screen code), so it is tested on its own.
// SKILL_CATALOG and the first 14 entries of GAME_CATALOG come unchanged from the PediaSense project. Two games were added
// for the motor skills the therapist session also looks at: Tiny Dots (fine motor) and Big Reach (gross motor).

export const DOMAINS = ["Cognitive", "Communication", "Social-Emotional", "Fine Motor", "Gross Motor"];
export const DOMAIN_META = {
  "Cognitive":        { emoji: "🧠", slug: "cognitive", blurb: "Thinking, memory, attention and problem solving" },
  "Communication":    { emoji: "💬", slug: "communication", blurb: "Understanding words and saying what you want" },
  "Social-Emotional": { emoji: "💛", slug: "social", blurb: "Feelings, taking turns and copying others" },
  "Fine Motor":       { emoji: "✋", slug: "fine", blurb: "Small hand movements: tapping, tracing, placing" },
  "Gross Motor":      { emoji: "🏃", slug: "gross", blurb: "Big arm and body movements: reaching, hopping" },
};

export const SKILL_CATALOG = [
    { id: 'attention', name: 'Attention / Sustained Attention', childLabel: 'Focus Fun', domain: 'Cognitive', gameId: 'find_the_object', hasGame: true },
    { id: 'working_memory', name: 'Working Memory', childLabel: 'Memory Games', domain: 'Cognitive', gameId: 'memory_match', hasGame: true },
    { id: 'visual_memory', name: 'Visual Memory', childLabel: 'What Changed', domain: 'Cognitive', gameId: 'what_changed', hasGame: true },
    { id: 'sequencing', name: 'Sequencing', childLabel: 'Story Time', domain: 'Cognitive', gameId: 'story_sequence', hasGame: true },
    { id: 'pattern_recognition', name: 'Pattern Recognition', childLabel: 'Pattern Play', domain: 'Cognitive', gameId: 'pattern_complete', hasGame: true },
    { id: 'categorization', name: 'Categorization', childLabel: 'Sorting Fun', domain: 'Cognitive', gameId: 'sort_it', hasGame: true },
    { id: 'problem_solving', name: 'Problem Solving', childLabel: 'Puzzle Time', domain: 'Cognitive', gameId: 'puzzle_builder', hasGame: true },
    { id: 'cognitive_flexibility', name: 'Cognitive Flexibility', childLabel: 'Switch It Up', domain: 'Cognitive', gameId: 'rule_switch', hasGame: false },
    { id: 'planning', name: 'Planning', childLabel: 'Plan the Path', domain: 'Cognitive', gameId: 'reach_the_goal', hasGame: false },
    { id: 'cause_effect_understanding', name: 'Cause & Effect Understanding', childLabel: 'What Happens Next', domain: 'Cognitive', gameId: 'what_happens_next', hasGame: false },
    { id: 'concept_understanding', name: 'Concept Understanding', childLabel: 'Big & Small', domain: 'Cognitive', gameId: 'big_small', hasGame: false },
    { id: 'task_persistence', name: 'Task Persistence', childLabel: 'Mission Complete', domain: 'Cognitive', gameId: 'complete_the_mission', hasGame: false },
    { id: 'response_inhibition', name: 'Response Inhibition / Impulse Control', childLabel: 'Stop & Go', domain: 'Cognitive', gameId: 'stop_and_go', hasGame: false },
    { id: 'choice_making', name: 'Choice Making', childLabel: 'Pick One', domain: 'Cognitive', gameId: 'pick_the_right_one', hasGame: false },
    { id: 'auditory_processing', name: 'Auditory Processing', childLabel: 'Sound Match', domain: 'Cognitive', gameId: 'sound_match', hasGame: false },

    { id: 'following_instructions', name: 'Following Instructions', childLabel: 'Simon Says', domain: 'Communication', gameId: 'do_what_i_say', hasGame: false },
    { id: 'receptive_language', name: 'Receptive Language', childLabel: 'Listen & Choose', domain: 'Communication', gameId: 'listen_and_choose', hasGame: true },
    { id: 'expressive_language', name: 'Expressive Language', childLabel: 'Picture Talk', domain: 'Communication', gameId: 'picture_talk', hasGame: true },
    { id: 'vocabulary', name: 'Vocabulary', childLabel: 'Word Hunt', domain: 'Communication', gameId: 'word_hunt', hasGame: false },

    { id: 'social_joint_attention', name: 'Social Attention / Joint Attention', childLabel: 'Look & Find', domain: 'Social-Emotional', gameId: 'look_and_find', hasGame: false },
    { id: 'emotion_recognition', name: 'Emotion Recognition', childLabel: 'Feelings Match', domain: 'Social-Emotional', gameId: 'emotion_match', hasGame: true },
    { id: 'emotion_regulation', name: 'Emotion Regulation', childLabel: 'Calm Choice', domain: 'Social-Emotional', gameId: 'calm_choice', hasGame: false },
    { id: 'social_interaction', name: 'Social Interaction', childLabel: 'What Would You Do', domain: 'Social-Emotional', gameId: 'social_scenario', hasGame: false },
    { id: 'turn_taking', name: 'Turn Taking', childLabel: 'My Turn Your Turn', domain: 'Social-Emotional', gameId: 'my_turn_your_turn', hasGame: false },
    { id: 'imitation', name: 'Imitation', childLabel: 'Copy Me', domain: 'Social-Emotional', gameId: 'copy_movement', hasGame: true },

    { id: 'fine_motor_control', name: 'Fine Motor / Hand Control', childLabel: 'Trace & Match', domain: 'Fine Motor', gameId: 'trace_and_match', hasGame: true },
    { id: 'visual_spatial_skills', name: 'Visual-Spatial Skills', childLabel: 'Shape Builder', domain: 'Fine Motor', gameId: 'shape_builder', hasGame: true },

    { id: 'gross_motor_coordination', name: 'Gross Motor / Coordination', childLabel: 'Move & Match', domain: 'Gross Motor', gameId: 'move_and_match', hasGame: true }
  ];

export const GAME_CATALOG = [
    {
      id: 'memory_match',
      name: 'Memory Match',
      skillId: 'working_memory',
      category: 'Cognitive',
      description: 'Flip cards and find matching pairs.',
      module: 'MemoryMatchGame',
      levels: {
        1: { pairs: 2, label: '2 pairs' },
        2: { pairs: 5, label: '5 pairs' },
        3: { pairs: 7, label: '7 pairs' }
      }
    },
    {
      id: 'find_the_object',
      name: 'Find the Object',
      skillId: 'attention',
      category: 'Cognitive',
      description: 'Find the target object among distractors.',
      module: 'FindTheObjectGame',
      levels: {
        1: { objectCount: 3, targetCount: 1, label: '1 target among 3 objects' },
        2: { objectCount: 6, targetCount: 1, label: '1 target among 6 objects' },
        3: { objectCount: 9, targetCount: 2, label: '2 targets among 9 objects' }
      }
    },
    {
      id: 'pattern_complete',
      name: 'Pattern Complete',
      skillId: 'pattern_recognition',
      category: 'Cognitive',
      description: 'Work out the pattern and pick the missing piece.',
      module: 'PatternCompleteGame',
      levels: {
        1: { patternType: 'AB', length: 4, label: 'AB pattern' },
        2: { patternType: 'AAB', length: 6, label: 'AAB pattern' },
        3: { patternType: 'MIXED', length: 8, label: 'mixed pattern' }
      }
    },
    {
      id: 'sort_it',
      name: 'Sort It!',
      skillId: 'categorization',
      category: 'Cognitive',
      description: 'Sort objects into the correct group.',
      module: 'SortItGame',
      levels: {
        1: { rule: 'color', switchRule: false, itemCount: 6, label: 'sort by color' },
        2: { rule: 'shape', switchRule: false, itemCount: 8, label: 'sort by shape' },
        3: { rule: 'color', switchRule: true, itemCount: 8, label: 'sort, rule switches mid-game' }
      }
    },
    {
      id: 'story_sequence',
      name: 'Story Sequence',
      skillId: 'sequencing',
      category: 'Cognitive',
      description: 'Put the story steps in the right order.',
      module: 'StorySequenceGame',
      levels: {
        1: { stepCount: 2, label: '2 steps' },
        2: { stepCount: 4, label: '4 steps' },
        3: { stepCount: 6, label: '6 steps' }
      }
    },
    {
      id: 'copy_movement',
      name: 'Copy My Movement',
      skillId: 'imitation',
      category: 'Social-Emotional',
      description: 'Watch PediaSense AI, then copy the movement in front of your camera!',
      module: 'CopyMovementGame',
      usesCamera: true,
      levels: {
        1: { reps: 3, label: 'copy 3 movements' },
        2: { reps: 5, label: 'copy 5 movements' },
        3: { reps: 7, label: 'copy 7 movements' }
      }
    },
    {
      id: 'what_changed',
      name: 'What Changed?',
      skillId: 'visual_memory',
      category: 'Cognitive',
      description: 'Remember the objects, then spot what changed.',
      module: 'WhatChangedGame',
      levels: {
        1: { objectCount: 3, viewMs: 4000, label: '3 objects' },
        2: { objectCount: 5, viewMs: 3500, label: '5 objects' },
        3: { objectCount: 7, viewMs: 3000, label: '7 objects' }
      }
    },
    {
      id: 'puzzle_builder',
      name: 'Puzzle Builder',
      skillId: 'problem_solving',
      category: 'Cognitive',
      description: 'Tap the pieces into place to solve the puzzle.',
      module: 'PuzzleBuilderGame',
      levels: {
        1: { pieceCount: 4, label: '4 pieces' },
        2: { pieceCount: 6, label: '6 pieces' },
        3: { pieceCount: 9, label: '9 pieces' }
      }
    },
    {
      id: 'listen_and_choose',
      name: 'Listen & Choose',
      skillId: 'receptive_language',
      category: 'Communication',
      description: 'Listen to PediaSense AI and tap the matching picture.',
      module: 'ListenAndChooseGame',
      levels: {
        1: { choiceCount: 3, label: '3 choices' },
        2: { choiceCount: 4, label: '4 choices' },
        3: { choiceCount: 5, label: '5 choices' }
      }
    },
    {
      id: 'picture_talk',
      name: 'Picture Talk',
      skillId: 'expressive_language',
      category: 'Communication',
      description: 'Look at the picture and tell PediaSense AI what you see.',
      module: 'PictureTalkGame',
      usesCamera: false,
      levels: {
        1: { cardCount: 1, label: '1 picture' },
        2: { cardCount: 2, label: '2 pictures' },
        3: { cardCount: 3, label: '3 pictures' }
      }
    },
    {
      id: 'emotion_match',
      name: 'Emotion Match',
      skillId: 'emotion_recognition',
      category: 'Social-Emotional',
      description: 'Read the scene and pick how they feel.',
      module: 'EmotionMatchGame',
      levels: {
        1: { choiceCount: 3, label: '3 feelings' },
        2: { choiceCount: 4, label: '4 feelings' },
        3: { choiceCount: 5, label: '5 feelings' }
      }
    },
    {
      id: 'trace_and_match',
      name: 'Shape Tracing',
      skillId: 'fine_motor_control',
      category: 'Fine Motor',
      description: 'Trace the dotted path with your finger or mouse.',
      module: 'TraceAndMatchGame',
      levels: {
        1: { shape: 'line', tolerance: 36, label: 'trace a line' },
        2: { shape: 'circle', tolerance: 28, label: 'trace a circle' },
        3: { shape: 'zigzag', tolerance: 22, label: 'trace a zigzag' }
      }
    },
    {
      id: 'shape_builder',
      name: 'Shape Builder',
      skillId: 'visual_spatial_skills',
      category: 'Fine Motor',
      description: 'Tap shapes into the matching outline to build the picture.',
      module: 'ShapeBuilderGame',
      levels: {
        1: { pieceCount: 3, label: '3 shapes' },
        2: { pieceCount: 4, label: '4 shapes' },
        3: { pieceCount: 6, label: '6 shapes' }
      }
    },
    {
      id: 'move_and_match',
      name: 'Follow the Bunny',
      skillId: 'gross_motor_coordination',
      category: 'Gross Motor',
      description: 'Use the arrow buttons to hop the bunny to the carrot.',
      module: 'MoveAndMatchGame',
      levels: {
        1: { gridSize: 4, label: '4x4 hop' },
        2: { gridSize: 5, label: '5x5 hop' },
        3: { gridSize: 6, label: '6x6 hop' }
      }
    }
  ];

// Added for NeuroAdapt: the two motor games the session uses to look at fine and gross motor skills.
SKILL_CATALOG.push(
  { id: "precision_tapping", name: "Precision Tapping", childLabel: "Tiny Dots", domain: "Fine Motor", gameId: "tiny_dots", hasGame: true },
  { id: "reach_and_cross", name: "Reaching / Crossing the Midline", childLabel: "Big Reach", domain: "Gross Motor", gameId: "big_reach", hasGame: true },
);
GAME_CATALOG.push(
  { id: "tiny_dots", name: "Tiny Dots", skillId: "precision_tapping", category: "Fine Motor", description: "Tap each small dot as it appears.", module: "TinyDotsGame",
    levels: { 1: { dots: 5, size: 84, ms: 6000, label: "5 big dots" }, 2: { dots: 6, size: 60, ms: 5000, label: "6 smaller dots" }, 3: { dots: 7, size: 42, ms: 4000, label: "7 tiny dots" } } },
  { id: "big_reach", name: "Big Reach", skillId: "reach_and_cross", category: "Gross Motor", description: "Reach across the screen and pop each balloon with a big arm movement.", module: "BigReachGame",
    levels: { 1: { balloons: 5, size: 130, ms: 8000, label: "5 big balloons" }, 2: { balloons: 6, size: 100, ms: 6500, label: "6 balloons" }, 3: { balloons: 8, size: 76, ms: 5000, label: "8 smaller balloons" } } },
);

// Autism-focused games added for NeuroAdapt, one or more per area the therapist session looks at.
SKILL_CATALOG.push(
  { id: "routine_memory", name: "Routine Memory", childLabel: "Remember the Routine", domain: "Cognitive", gameId: "routine_memory", hasGame: true },
  { id: "flexible_thinking", name: "Flexible Thinking / Categories", childLabel: "Odd One Out", domain: "Cognitive", gameId: "odd_one_out", hasGame: true },
  { id: "functional_requesting", name: "Functional Requesting", childLabel: "Ask for It", domain: "Communication", gameId: "ask_for_it", hasGame: true },
  { id: "bead_control", name: "Pincer Grip and Hand-Eye Coordination", childLabel: "Bead Threading", domain: "Fine Motor", gameId: "bead_threading", hasGame: true },
  { id: "rhythm_bilateral", name: "Rhythm and Both-Sides Coordination", childLabel: "Big Beat", domain: "Gross Motor", gameId: "big_beat", hasGame: true },
);
GAME_CATALOG.push(
  { id: "routine_memory", name: "Remember the Routine", skillId: "routine_memory", category: "Cognitive", description: "Remember the steps of a daily routine and put them back in order.", module: "RoutineMemoryGame",
    levels: { 1: { steps: 3, seconds: 6, label: "3 steps" }, 2: { steps: 4, seconds: 6, label: "4 steps" }, 3: { steps: 5, seconds: 6, label: "5 steps" } } },
  { id: "odd_one_out", name: "Odd One Out", skillId: "flexible_thinking", category: "Cognitive", description: "Find the picture that does not belong with the others.", module: "OddOneOutGame",
    levels: { 1: { items: 4, rounds: 4, label: "4 pictures" }, 2: { items: 5, rounds: 5, label: "5 pictures" }, 3: { items: 6, rounds: 6, label: "6 pictures" } } },
  { id: "ask_for_it", name: "Ask for It", skillId: "functional_requesting", category: "Communication", description: "Build a request with picture tiles and hear it said out loud.", module: "AskForItGame",
    levels: { 1: { rounds: 3, items: 3, please: false, label: "3 choices" }, 2: { rounds: 4, items: 4, please: true, label: "4 choices, say please" }, 3: { rounds: 5, items: 5, please: true, label: "5 choices, say please" } } },
  { id: "bead_threading", name: "Bead Threading", skillId: "bead_control", category: "Fine Motor", description: "Copy a bead pattern by dragging beads onto the string.", module: "BeadThreadingGame",
    levels: { 1: { beads: 4, size: 64, label: "4 big beads" }, 2: { beads: 5, size: 52, label: "5 beads" }, 3: { beads: 6, size: 42, label: "6 small beads" } } },
  { id: "big_beat", name: "Big Beat", skillId: "rhythm_bilateral", category: "Gross Motor", description: "Watch the pads light up, then tap the same beat with big arm movements.", module: "BigBeatGame",
    levels: { 1: { pads: 2, beats: 4, gap: 800, label: "2 pads, 4 beats" }, 2: { pads: 2, beats: 6, gap: 700, label: "2 pads, 6 beats" }, 3: { pads: 3, beats: 8, gap: 650, label: "3 pads, 8 beats" } } },
);

export const getGameById = (id) => GAME_CATALOG.find((g) => g.id === id) || null;
export const getGamesForSkill = (skillId) => GAME_CATALOG.filter((g) => g.skillId === skillId);
export const getSkillById = (id) => SKILL_CATALOG.find((s) => s.id === id) || null;
export const getSkillsForDomain = (d) => SKILL_CATALOG.filter((s) => s.domain === d);

// The therapist session observes 7 conversation domains plus two motor domains (played, not spoken).
export const ASSESSMENT_DOMAINS = ["Communication", "Memory", "Attention", "Problem Solving", "Emotional Expression", "Social Interaction", "Creativity", "Fine Motor", "Gross Motor"];
export const ASSESSMENT_TO_CATALOG = {
  "Communication": "Communication", "Memory": "Cognitive", "Attention": "Cognitive", "Problem Solving": "Cognitive", "Creativity": "Cognitive",
  "Emotional Expression": "Social-Emotional", "Social Interaction": "Social-Emotional", "Fine Motor": "Fine Motor", "Gross Motor": "Gross Motor",
};
// Most relevant games first for each weak assessment domain.
export const ASSESSMENT_DOMAIN_GAMES = {
  "Communication": ["ask_for_it", "picture_talk", "listen_and_choose"],
  "Memory": ["routine_memory", "memory_match", "what_changed"],
  "Attention": ["find_the_object", "sort_it", "odd_one_out"],
  "Problem Solving": ["odd_one_out", "puzzle_builder", "pattern_complete"],
  "Creativity": ["shape_builder", "story_sequence"],
  "Emotional Expression": ["emotion_match"],
  "Social Interaction": ["copy_movement", "emotion_match", "ask_for_it"],
  "Fine Motor": ["bead_threading", "tiny_dots", "trace_and_match", "shape_builder"],
  "Gross Motor": ["big_beat", "big_reach", "move_and_match", "copy_movement"],
};
export const DOMAIN_GAMES = {
  "Cognitive": ["routine_memory", "memory_match", "odd_one_out", "find_the_object", "pattern_complete", "sort_it", "story_sequence", "what_changed", "puzzle_builder"],
  "Communication": ["ask_for_it", "listen_and_choose", "picture_talk"],
  "Social-Emotional": ["emotion_match", "copy_movement"],
  "Fine Motor": ["bead_threading", "tiny_dots", "trace_and_match", "shape_builder"],
  "Gross Motor": ["big_beat", "big_reach", "move_and_match"],
};
export const toCatalogDomain = (d) => (DOMAINS.includes(d) ? d : ASSESSMENT_TO_CATALOG[d] || "Cognitive");
export const GAME_ICONS = {
  memory_match: "🧠", find_the_object: "🔍", pattern_complete: "🧩", sort_it: "🗂️", story_sequence: "📖", copy_movement: "🕺", what_changed: "👀", puzzle_builder: "🖼️",
  listen_and_choose: "👂", picture_talk: "🗣️", emotion_match: "😊", trace_and_match: "✏️", shape_builder: "🔷", move_and_match: "🐇", tiny_dots: "🎯", big_reach: "🎈", routine_memory: "🗓️", odd_one_out: "🔎", ask_for_it: "🙋", bead_threading: "📿", big_beat: "🥁",
};
