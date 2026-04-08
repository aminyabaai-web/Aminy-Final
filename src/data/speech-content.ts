// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// =============================================================================
// Speech Content — Clinically-appropriate phoneme word lists for ages 2-8
// Organized by difficulty level (CV → CVC → Blends → Multisyllabic)
// Based on standard SLP articulation therapy progressions
// =============================================================================

export interface PhonemeWordList {
  phoneme: string;
  displayName: string;
  description: string;
  words: {
    cv: string[];
    cvc: string[];
    blends: string[];
    multisyllabic: string[];
  };
  tips: string[]; // SLP-style tips for parents
}

export const PHONEME_WORD_LISTS: PhonemeWordList[] = [
  // =========================================================================
  // /p/ — Bilabial Stop (typically mastered by age 3)
  // =========================================================================
  {
    phoneme: '/p/',
    displayName: 'P Sound',
    description: 'Pop your lips together! The /p/ sound is one of the first sounds kids learn.',
    words: {
      cv: [
        'pa', 'pea', 'pie', 'poo', 'pay', 'pow', 'po', 'paw'
      ],
      cvc: [
        'pop', 'pig', 'pan', 'pin', 'pot', 'pad', 'pup', 'pit',
        'pen', 'pat', 'peg', 'pet', 'pod', 'pug', 'pip'
      ],
      blends: [
        'play', 'plan', 'plum', 'plug', 'plus', 'pray', 'press',
        'prize', 'prop', 'spot', 'spin', 'spit', 'spoon', 'spring'
      ],
      multisyllabic: [
        'puppy', 'paper', 'pizza', 'pumpkin', 'penguin', 'potato',
        'pancake', 'popcorn', 'purple', 'pretzel', 'parrot',
        'pineapple', 'pajamas', 'dinosaur', 'airplane'
      ]
    },
    tips: [
      'Place a tissue in front of your child\'s mouth — they should see it puff when saying /p/!',
      'The /p/ sound is voiceless — no buzzing in the throat. Try holding your hand on your throat to feel the difference.',
      'Practice at the beginning of words first, then move to the end (cup, top).',
      'Make it fun: pop bubbles and say "pop!" each time.'
    ]
  },

  // =========================================================================
  // /b/ — Bilabial Stop (typically mastered by age 3)
  // =========================================================================
  {
    phoneme: '/b/',
    displayName: 'B Sound',
    description: 'Buzz your lips! The /b/ sound is like /p/ but with your voice turned on.',
    words: {
      cv: [
        'be', 'boo', 'bow', 'bye', 'bay', 'ba', 'bee', 'bo'
      ],
      cvc: [
        'bat', 'bed', 'big', 'bug', 'bus', 'ball', 'box', 'bag',
        'bin', 'bit', 'bun', 'bell', 'book', 'bone', 'bowl'
      ],
      blends: [
        'blue', 'blow', 'block', 'black', 'blaze', 'braid',
        'brain', 'brave', 'bread', 'brick', 'bring', 'brown'
      ],
      multisyllabic: [
        'baby', 'bunny', 'banana', 'balloon', 'button', 'basket',
        'bubble', 'blanket', 'butterfly', 'bathrobe', 'baseball',
        'birthday', 'backpack', 'blueberry', 'bumblebee'
      ]
    },
    tips: [
      'Have your child feel their throat — they should feel buzzing for /b/ but not for /p/.',
      'Use a mirror so your child can see their lips pressing together.',
      'Play "B is for Ball" — bounce a ball each time they say a /b/ word correctly.',
      'If your child says "p" instead of "b", practice humming first to turn on the voice.'
    ]
  },

  // =========================================================================
  // /m/ — Bilabial Nasal (typically mastered by age 3)
  // =========================================================================
  {
    phoneme: '/m/',
    displayName: 'M Sound',
    description: 'Hum with your lips closed! The /m/ sound is like humming "mmm".',
    words: {
      cv: [
        'me', 'moo', 'my', 'may', 'ma', 'mow', 'maw', 'mo'
      ],
      cvc: [
        'mom', 'map', 'mat', 'mud', 'mug', 'man', 'mix', 'milk',
        'miss', 'mitt', 'mice', 'mail', 'moon', 'mad', 'met'
      ],
      blends: [
        'small', 'smell', 'smile', 'smoke', 'smart', 'smooth',
        'smash', 'drum', 'climb', 'plum', 'swim', 'team'
      ],
      multisyllabic: [
        'mama', 'monkey', 'monster', 'muffin', 'mitten', 'magnet',
        'music', 'mushroom', 'marble', 'mermaid', 'mountain',
        'marshmallow', 'macaroni', 'motorcycle', 'watermelon'
      ]
    },
    tips: [
      'Start with humming — "mmmmm" — and then open to a vowel: "mmm-ah" = "ma".',
      'The /m/ sound should tickle the lips and nose! Have your child feel it.',
      'Practice during meals: "Mmm, yummy!" is a natural /m/ practice.',
      'If your child opens their mouth during /m/, gently remind them lips stay together.'
    ]
  },

  // =========================================================================
  // /s/ — Alveolar Fricative (typically mastered by age 7-8)
  // =========================================================================
  {
    phoneme: '/s/',
    displayName: 'S Sound',
    description: 'The snake sound! Keep your tongue behind your teeth and blow air out.',
    words: {
      cv: [
        'see', 'so', 'say', 'sue', 'sea', 'saw', 'sew', 'sigh'
      ],
      cvc: [
        'sun', 'sit', 'sat', 'set', 'sip', 'sad', 'six', 'sand',
        'sock', 'sing', 'soap', 'seal', 'seed', 'soup', 'safe'
      ],
      blends: [
        'stop', 'star', 'step', 'stem', 'stick', 'store', 'stump',
        'skip', 'skin', 'snap', 'snack', 'slide', 'slow', 'sleep',
        'smell', 'smile', 'swing', 'swim', 'sweet', 'spot'
      ],
      multisyllabic: [
        'sunny', 'silly', 'sunset', 'seven', 'sister', 'sandwich',
        'soccer', 'spider', 'seashell', 'snowflake', 'strawberry',
        'sunflower', 'dinosaur', 'superhero', 'spaghetti'
      ]
    },
    tips: [
      'Have your child smile slightly — the /s/ sound needs the teeth close together.',
      'Try the "snake sound" game: see who can hold the "sssss" longest.',
      'If they produce a "lisp" (tongue between teeth), use a straw to guide air over the tongue tip.',
      'Practice /s/ blends only after the single /s/ is consistent — st, sp, sk are great starters.',
      'Use a mirror: tongue tip should be behind (not between) the front teeth.'
    ]
  },

  // =========================================================================
  // /r/ — Alveolar Approximant (typically mastered by age 6-8)
  // =========================================================================
  {
    phoneme: '/r/',
    displayName: 'R Sound',
    description: 'The growling sound! Curl your tongue back like a pirate saying "arrr".',
    words: {
      cv: [
        'ray', 'row', 'rue', 'raw', 'rye', 'roe', 'rah', 'ree'
      ],
      cvc: [
        'run', 'red', 'rug', 'rat', 'rock', 'rain', 'ring', 'road',
        'ride', 'rip', 'rub', 'roof', 'rose', 'rake', 'rope'
      ],
      blends: [
        'tree', 'train', 'truck', 'trip', 'trap', 'track', 'drum',
        'draw', 'dress', 'drip', 'dry', 'dream', 'green', 'grow',
        'grab', 'grape', 'grass', 'frog', 'free', 'friend'
      ],
      multisyllabic: [
        'rabbit', 'robot', 'rainbow', 'rocket', 'river', 'reindeer',
        'rooster', 'racecar', 'rectangle', 'dinosaur', 'treasure',
        'strawberry', 'umbrella', 'butterfly', 'refrigerator'
      ]
    },
    tips: [
      'The /r/ sound is one of the hardest — most children don\'t master it until age 6-8.',
      'Try the "growling tiger" cue: "grrr" often helps kids find the right tongue position.',
      'If your child says "w" for "r" (wabbit for rabbit), this is very normal until age 6.',
      'Practice vocalic /r/ (ear, air, or) alongside initial /r/ — they use different tongue shapes.',
      'Don\'t overcorrect — frustration makes /r/ harder. Keep practice playful and short.'
    ]
  },

  // =========================================================================
  // /l/ — Alveolar Lateral (typically mastered by age 6)
  // =========================================================================
  {
    phoneme: '/l/',
    displayName: 'L Sound',
    description: 'Tongue up! Touch your tongue to the bumpy spot behind your top teeth.',
    words: {
      cv: [
        'la', 'lee', 'low', 'lay', 'lie', 'law', 'Lou', 'lye'
      ],
      cvc: [
        'lip', 'lap', 'log', 'leg', 'lid', 'lot', 'let', 'love',
        'lake', 'leaf', 'lamp', 'lock', 'line', 'lime', 'lace'
      ],
      blends: [
        'play', 'plan', 'plate', 'plum', 'plug', 'clock', 'clap',
        'clam', 'cloud', 'clean', 'climb', 'blue', 'blow', 'block',
        'flat', 'flag', 'flip', 'float', 'floor', 'slow'
      ],
      multisyllabic: [
        'lemon', 'letter', 'ladder', 'lollipop', 'lion', 'lizard',
        'lantern', 'library', 'ladybug', 'lemonade', 'lightning',
        'umbrella', 'elephant', 'caterpillar', 'helicopter'
      ]
    },
    tips: [
      'Have your child practice touching the "alveolar ridge" — the bumpy spot right behind the top teeth.',
      'Try the "la la la" song game to get the tongue moving to the right spot.',
      'If your child says "w" for "l" (wion for lion), gently hold down the lower lip to block the /w/.',
      'Practice dark /l/ (ball, full) separately — it\'s a different tongue position than light /l/ (lamp, let).',
      'Peanut butter on the alveolar ridge can help kids find the right spot!'
    ]
  },

  // =========================================================================
  // /th/ — Dental Fricative (typically mastered by age 6-8)
  // =========================================================================
  {
    phoneme: '/th/',
    displayName: 'TH Sound',
    description: 'Silly tongue out! Stick your tongue between your teeth and blow.',
    words: {
      cv: [
        'the', 'thee', 'thou', 'thaw', 'they', 'tho'
      ],
      cvc: [
        'thin', 'this', 'that', 'them', 'then', 'bath', 'math',
        'path', 'with', 'moth', 'tooth', 'thumb'
      ],
      blends: [
        'three', 'throw', 'threw', 'throat', 'throne', 'thrill',
        'thread', 'throb', 'think', 'thump', 'thank', 'thing'
      ],
      multisyllabic: [
        'birthday', 'bathtub', 'toothbrush', 'thunder', 'thankful',
        'theater', 'Thursday', 'thirteen', 'thousand', 'nothing',
        'something', 'feather', 'weather', 'together', 'panther'
      ]
    },
    tips: [
      'Have your child look in a mirror — they should see their tongue tip peeking out between the teeth.',
      'Voiced /th/ (this, that) vs. voiceless /th/ (thin, think) — start with voiceless, it\'s easier.',
      'If they say "f" for "th", remind them: "tongue out like a silly lizard!"',
      'The /th/ sound is not expected to be consistent until age 6-8, so be patient.',
      'Practice with a mirror and make it a game: "Can I see your tongue?"'
    ]
  },

  // =========================================================================
  // /sh/ — Palatal Fricative (typically mastered by age 6)
  // =========================================================================
  {
    phoneme: '/sh/',
    displayName: 'SH Sound',
    description: 'The quiet sound! Like telling someone "shhh" in the library.',
    words: {
      cv: [
        'she', 'shoe', 'show', 'shy', 'shaw', 'shoo'
      ],
      cvc: [
        'ship', 'shop', 'shut', 'shed', 'shelf', 'shell', 'shin',
        'dish', 'fish', 'wish', 'wash', 'bush', 'push', 'rush'
      ],
      blends: [
        'shred', 'shrub', 'shrimp', 'shrink', 'splash', 'fresh',
        'crash', 'crush', 'brush', 'trash', 'flash', 'squash'
      ],
      multisyllabic: [
        'shadow', 'shower', 'shovel', 'seashell', 'sunshine',
        'mushroom', 'milkshake', 'fishbowl', 'bushes', 'eyelashes',
        'marshmallow', 'shamrock', 'shape', 'shoulder', 'sharing'
      ]
    },
    tips: [
      'Cup your hands around your mouth like a megaphone — this helps shape the /sh/ sound.',
      'Contrast /s/ and /sh/: "sip" vs "ship" — can your child hear and feel the difference?',
      'The tongue should be pulled back slightly compared to /s/ — wider and flatter.',
      'Play the "library game" — whisper "shhh" and then practice /sh/ words in a quiet voice.',
      'Rounding the lips slightly helps produce a clearer /sh/ sound.'
    ]
  },

  // =========================================================================
  // /ch/ — Palatal Affricate (typically mastered by age 6)
  // =========================================================================
  {
    phoneme: '/ch/',
    displayName: 'CH Sound',
    description: 'The choo-choo sound! Like a little train: "ch-ch-ch-ch".',
    words: {
      cv: [
        'chew', 'chi', 'chow', 'cha'
      ],
      cvc: [
        'chin', 'chip', 'chat', 'check', 'chick', 'chain', 'chalk',
        'chest', 'chill', 'chop', 'much', 'such', 'rich', 'each',
        'beach', 'catch', 'match', 'watch', 'ditch', 'lunch'
      ],
      blends: [
        'church', 'change', 'charge', 'charm', 'chart', 'chapter',
        'choose', 'chunk', 'French', 'ranch', 'branch', 'crunch'
      ],
      multisyllabic: [
        'cherry', 'chicken', 'children', 'chocolate', 'teacher',
        'catcher', 'ketchup', 'sandwich', 'kitchen', 'cheetah',
        'checkers', 'chipmunk', 'champion', 'adventure', 'enchilada'
      ]
    },
    tips: [
      'Think of /ch/ as a quick /t/ + /sh/ combination — "t-sh" said fast.',
      'Practice the "choo choo train" — kids love pretending to be trains!',
      'If your child says "sh" instead of "ch", have them start with a strong /t/ sound first.',
      'The /ch/ sound has a burst of air — hold a tissue in front to see the puff.',
      'Pair with actions: "chomp" while pretending to eat, "chop" while pretending to cook.'
    ]
  }
];

// =============================================================================
// Utility: Get words for a specific phoneme and difficulty level
// =============================================================================
export type DifficultyLevel = 'cv' | 'cvc' | 'blends' | 'multisyllabic';

export function getWordsForPhoneme(
  phoneme: string,
  difficulty?: DifficultyLevel
): string[] {
  const list = PHONEME_WORD_LISTS.find(
    (p) => p.phoneme === phoneme || p.displayName === phoneme
  );
  if (!list) return [];
  if (difficulty) return list.words[difficulty];
  return [
    ...list.words.cv,
    ...list.words.cvc,
    ...list.words.blends,
    ...list.words.multisyllabic,
  ];
}

// =============================================================================
// Utility: Get a random word set for a practice session
// =============================================================================
export function getRandomPracticeSet(
  phoneme: string,
  difficulty: DifficultyLevel,
  count: number = 10
): string[] {
  const words = getWordsForPhoneme(phoneme, difficulty);
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// =============================================================================
// Utility: Get all phoneme names for UI display
// =============================================================================
export function getAllPhonemes(): { phoneme: string; displayName: string }[] {
  return PHONEME_WORD_LISTS.map((p) => ({
    phoneme: p.phoneme,
    displayName: p.displayName,
  }));
}

// =============================================================================
// Utility: Get tips for a specific phoneme
// =============================================================================
export function getTipsForPhoneme(phoneme: string): string[] {
  const list = PHONEME_WORD_LISTS.find(
    (p) => p.phoneme === phoneme || p.displayName === phoneme
  );
  return list?.tips ?? [];
}

// Total word count across all phonemes
export const TOTAL_WORD_COUNT = PHONEME_WORD_LISTS.reduce(
  (total, list) =>
    total +
    list.words.cv.length +
    list.words.cvc.length +
    list.words.blends.length +
    list.words.multisyllabic.length,
  0
);
