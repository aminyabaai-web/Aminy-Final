// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Special Time — daily 10-minute child-led play ideas.
 *
 * This content is deliberately NON-CLINICAL. No goals, no trials, no scoring,
 * no skill targets. The whole point is connection: the child leads, the parent
 * joins and narrates without directing, nobody fixes anything, and laughter
 * counts. Every `whyItConnects` line is about following the child's lead —
 * never a therapeutic outcome.
 *
 * All ideas are original to Aminy. Do not reference shows, characters, or
 * branded games here or anywhere in Special Time copy.
 */

export type AgeBand = '3-5' | '6-8' | '9-12';

export type InterestTag =
  | 'sensory'
  | 'movement'
  | 'pretend'
  | 'building'
  | 'music'
  | 'quiet'
  | 'outdoors'
  | 'water';

export interface SpecialTimeIdea {
  id: string;
  /** Short, warm name for the idea. */
  title: string;
  /** Parent-facing setup, warm voice, at most 2 sentences. */
  oneLiner: string;
  /** Age bands this idea tends to land with (a guide, never a gate). */
  ageBands: AgeBand[];
  interests: InterestTag[];
  /** 'none' = walk in empty-handed; 'household' = grab-what-you-have. */
  materials: 'none' | 'household';
  /** One warm sentence about following the child's lead — never a goal. */
  whyItConnects: string;
}

export const INTEREST_LABELS: Record<InterestTag, string> = {
  sensory: 'Sensory',
  movement: 'Movement',
  pretend: 'Pretend',
  building: 'Building',
  music: 'Music',
  quiet: 'Quiet',
  outdoors: 'Outdoors',
  water: 'Water',
};

export function ageBandForAge(age?: number | null): AgeBand {
  if (typeof age !== 'number' || Number.isNaN(age)) return '6-8';
  if (age <= 5) return '3-5';
  if (age <= 8) return '6-8';
  return '9-12';
}

export const SPECIAL_TIME_IDEAS: SpecialTimeIdea[] = [
  {
    id: 'flashlight-cave',
    title: 'Flashlight Cave',
    oneLiner:
      'Drape a blanket over two chairs, hand them the flashlight, and crawl in. They decide what lives in the cave — you just live there too.',
    ageBands: ['3-5', '6-8'],
    interests: ['quiet', 'pretend', 'sensory'],
    materials: 'household',
    whyItConnects:
      'In a small dark space with the light in their hands, they run the world and you get to be a guest in it.',
  },
  {
    id: 'sock-puppet-breakfast',
    title: 'Sock-Puppet Breakfast',
    oneLiner:
      'Two socks become two very opinionated diners. Let their puppet order anything — yours just repeats the order back in a silly voice.',
    ageBands: ['3-5', '6-8'],
    interests: ['pretend', 'quiet'],
    materials: 'household',
    whyItConnects:
      'A puppet says what a child sometimes can\'t, and a parent who plays along hears all of it.',
  },
  {
    id: 'bubble-mirror',
    title: 'Bubble Mirror Show',
    oneLiner:
      'Blow bubbles in front of the bathroom mirror and watch every bubble arrive twice. They pop, you narrate the ones that get away.',
    ageBands: ['3-5'],
    interests: ['sensory', 'water'],
    materials: 'household',
    whyItConnects:
      'Popping what they choose to pop, at their speed, tells them their choices are the whole show.',
  },
  {
    id: 'cardboard-spaceship',
    title: 'Cardboard Spaceship',
    oneLiner:
      'A big box, a marker for the control panel, and a captain who is not you. Ask where you\'re flying and buckle in.',
    ageBands: ['3-5', '6-8', '9-12'],
    interests: ['building', 'pretend'],
    materials: 'household',
    whyItConnects:
      'When they hold the controls and you take orders, the whole trip runs on their imagination.',
  },
  {
    id: 'dance-freeze',
    title: 'Dance & Freeze',
    oneLiner:
      'Put on the song they love — yes, that one, again — and dance until they hit pause. They control the music; you control nothing.',
    ageBands: ['3-5', '6-8', '9-12'],
    interests: ['music', 'movement'],
    materials: 'none',
    whyItConnects:
      'Handing over the pause button is a small way of saying: you set the rhythm, I\'ll follow it.',
  },
  {
    id: 'parallel-drawing',
    title: 'Side-by-Side Drawing',
    oneLiner:
      'Two papers, one pile of crayons, zero instructions. Draw next to them and, if they let you peek, draw what they\'re drawing.',
    ageBands: ['3-5', '6-8', '9-12'],
    interests: ['quiet'],
    materials: 'household',
    whyItConnects:
      'Copying their picture instead of correcting it says their way of seeing things is worth borrowing.',
  },
  {
    id: 'pillow-mountain',
    title: 'Pillow Mountain',
    oneLiner:
      'Every pillow and cushion in the house, one glorious pile. They decide if it\'s for climbing, crashing, or hiding — you supply pillows.',
    ageBands: ['3-5', '6-8'],
    interests: ['movement', 'sensory'],
    materials: 'household',
    whyItConnects:
      'Building the pile they asked for, exactly how they asked, is following their lead in its purest form.',
  },
  {
    id: 'kitchen-band',
    title: 'Kitchen Band',
    oneLiner:
      'Pots, lids, and wooden spoons on the floor. They\'re the conductor; you play only when pointed at.',
    ageBands: ['3-5', '6-8'],
    interests: ['music', 'sensory'],
    materials: 'household',
    whyItConnects:
      'Waiting for their cue — and only their cue — puts them in charge of the noise and the joy.',
  },
  {
    id: 'shadow-wall',
    title: 'Shadow Wall',
    oneLiner:
      'Lamp on, lights off, hands up. They make a shape on the wall; you guess wrong on purpose until you both crack up.',
    ageBands: ['3-5', '6-8'],
    interests: ['pretend', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Guessing playfully instead of naming it right away keeps them the expert on their own shadows.',
  },
  {
    id: 'water-painting',
    title: 'Water Painting',
    oneLiner:
      'A cup of water, a real paintbrush, and the fence or sidewalk as canvas. It disappears as it dries, so nothing can ever be wrong.',
    ageBands: ['3-5', '6-8'],
    interests: ['water', 'outdoors', 'sensory'],
    materials: 'household',
    whyItConnects:
      'Art that vanishes has no way to be judged — just two people painting whatever they feel like.',
  },
  {
    id: 'their-route-walk',
    title: 'They Pick the Way',
    oneLiner:
      'A walk where every turn is their call, including the turn back into the driveway. Stop wherever they stop, for as long as they stop.',
    ageBands: ['3-5', '6-8', '9-12'],
    interests: ['outdoors', 'quiet'],
    materials: 'none',
    whyItConnects:
      'Standing beside them while they study a crack in the sidewalk says their attention is worth your time.',
  },
  {
    id: 'tape-roads',
    title: 'Tape Roads',
    oneLiner:
      'Masking tape becomes roads across the floor — for toy cars, sock feet, or whatever they decide travels here. You\'re the road crew; they\'re city planning.',
    ageBands: ['3-5', '6-8'],
    interests: ['building', 'pretend'],
    materials: 'household',
    whyItConnects:
      'Laying tape exactly where they point, no suggestions, makes the whole map theirs.',
  },
  {
    id: 'cloud-naming',
    title: 'Cloud Naming',
    oneLiner:
      'Lie on the grass or hang out a window and let them tell you what the clouds are. Agree with every single one.',
    ageBands: ['3-5', '6-8', '9-12'],
    interests: ['outdoors', 'quiet'],
    materials: 'none',
    whyItConnects:
      'Seeing the dragon because they said it\'s a dragon is what being in their world actually means.',
  },
  {
    id: 'scoop-station',
    title: 'Scoop Station',
    oneLiner:
      'Dry rice or beans in a big bowl, plus cups and spoons. Pouring, scooping, burying your hand on request — that\'s it, and it\'s enough.',
    ageBands: ['3-5'],
    interests: ['sensory', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Letting them fill your hands over and over, without hurrying it, honors the way they like to play.',
  },
  {
    id: 'balloon-keep-up',
    title: 'Balloon Keep-Up',
    oneLiner:
      'One balloon, one rule they invent, and the floor is whatever they say it is. Count the saves out loud if they like counting — or don\'t.',
    ageBands: ['3-5', '6-8'],
    interests: ['movement'],
    materials: 'household',
    whyItConnects:
      'Playing by rules they made up — even when the rules change mid-game — is pure follow-the-leader.',
  },
  {
    id: 'stuffed-animal-checkup',
    title: 'Stuffed-Animal Checkup',
    oneLiner:
      'Their stuffed animals need a doctor, and the doctor is them. You\'re the worried parent in the waiting room, asking how the patient is doing.',
    ageBands: ['3-5', '6-8'],
    interests: ['pretend', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Being the helper in their story, instead of the director of it, flips the usual script in the best way.',
  },
  {
    id: 'hallway-parade',
    title: 'Hallway Parade',
    oneLiner:
      'They pick what everyone carries, wears, and chants; you march behind them down the hall. Second lap optional, always granted.',
    ageBands: ['3-5'],
    interests: ['movement', 'music', 'pretend'],
    materials: 'household',
    whyItConnects:
      'Marching second in a parade they invented tells them leading feels this good.',
  },
  {
    id: 'sink-harbor',
    title: 'Sink Harbor',
    oneLiner:
      'Fill the sink and let them launch cups, lids, and spoons as a fleet. They\'re the harbor master; you\'re just the tugboat.',
    ageBands: ['3-5', '6-8'],
    interests: ['water', 'sensory'],
    materials: 'household',
    whyItConnects:
      'Splashes and sunk ships are all part of a harbor they command — no outcomes, just water.',
  },
  {
    id: 'blanket-burrito',
    title: 'Blanket Burrito',
    oneLiner:
      'Roll them up in a blanket exactly as snug or as loose as they order. Add "toppings" — pillows, stuffed animals — only on request.',
    ageBands: ['3-5', '6-8'],
    interests: ['sensory', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Asking "tighter or looser?" and doing exactly that lets them run a moment that\'s all about how their body feels.',
  },
  {
    id: 'animal-follow',
    title: 'Animal Follow-Along',
    oneLiner:
      'They pick an animal; you both become it. When they switch to a new one mid-gallop, you switch too — no questions.',
    ageBands: ['3-5', '6-8'],
    interests: ['movement', 'pretend'],
    materials: 'none',
    whyItConnects:
      'Copying their moves — not teaching better ones — makes them the choreographer of the whole zoo.',
  },
  {
    id: 'brick-architect',
    title: 'You Build, They Boss',
    oneLiner:
      'Dump out the building bricks or blocks and take orders: they design, you assemble. Your only line is "like this?"',
    ageBands: ['6-8', '9-12'],
    interests: ['building', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Building their blueprint with your hands says their ideas are good enough to be someone\'s whole job.',
  },
  {
    id: 'living-room-course',
    title: 'Their Obstacle Course',
    oneLiner:
      'They design an obstacle course out of couch cushions and chairs; you attempt it. Dramatic wobbling is encouraged.',
    ageBands: ['6-8', '9-12'],
    interests: ['movement', 'building'],
    materials: 'household',
    whyItConnects:
      'Watching a grown-up take their course seriously — and struggle a little — is a kind of respect kids can feel.',
  },
  {
    id: 'secret-handshake',
    title: 'Secret Handshake',
    oneLiner:
      'Invent a handshake together, one move at a time — but every move starts with them. Practice until it\'s muscle memory for both of you.',
    ageBands: ['6-8', '9-12'],
    interests: ['movement', 'quiet'],
    materials: 'none',
    whyItConnects:
      'A handshake built from their moves becomes a private language only the two of you speak.',
  },
  {
    id: 'fort-flashlight-stories',
    title: 'Fort Stories',
    oneLiner:
      'Build the fort they spec out, crawl in with a flashlight, and let them start a story. You only add a line when they hand you the light.',
    ageBands: ['6-8'],
    interests: ['quiet', 'pretend', 'building'],
    materials: 'household',
    whyItConnects:
      'Passing the flashlight means they decide when your voice joins their story — and when it doesn\'t.',
  },
  {
    id: 'living-room-campsite',
    title: 'Living-Room Campsite',
    oneLiner:
      'Blanket tent, a snack in a bowl, lights low. They decide what campers do next; you\'re just glad to be at their campsite.',
    ageBands: ['6-8', '9-12'],
    interests: ['pretend', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Ten minutes of camping in their imagination beats an itinerary every time.',
  },
  {
    id: 'chalk-world',
    title: 'Chalk World',
    oneLiner:
      'Sidewalk chalk and a patch of driveway: they draw a world, you get drawn into it. Ask what the rules are where you\'re standing.',
    ageBands: ['3-5', '6-8', '9-12'],
    interests: ['outdoors', 'building', 'pretend'],
    materials: 'household',
    whyItConnects:
      'Asking the rules of their world — instead of setting any — makes you a visitor somewhere they made.',
  },
  {
    id: 'slow-motion-race',
    title: 'Slow-Motion Race',
    oneLiner:
      'Race across the room in the slowest motion possible — slowest wins, and they\'re the judge. Expect the rules to change; that\'s the game.',
    ageBands: ['3-5', '6-8'],
    interests: ['movement'],
    materials: 'none',
    whyItConnects:
      'Accepting their calls, even the outrageous ones, tells them play doesn\'t need a referee.',
  },
  {
    id: 'paper-airline',
    title: 'Paper Airline',
    oneLiner:
      'Fold paper airplanes together and let them run the airport: which plane boards, where it flies, what counts as a landing. You\'re ground crew.',
    ageBands: ['6-8', '9-12'],
    interests: ['building'],
    materials: 'household',
    whyItConnects:
      'Crashes become funny instead of frustrating when the air-traffic controller is seven and in charge.',
  },
  {
    id: 'mystery-bag',
    title: 'Mystery Bag',
    oneLiner:
      'They secretly load a bag with small objects; you guess each one by touch. Then swap — if they want to.',
    ageBands: ['6-8', '9-12'],
    interests: ['sensory', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Letting them stump you, and loving it, puts them on the winning side of a game they built.',
  },
  {
    id: 'their-playlist',
    title: 'DJ for Ten',
    oneLiner:
      'They DJ for ten minutes and you actually listen — no skipping, no reviews. If they say dance, you dance.',
    ageBands: ['6-8', '9-12'],
    interests: ['music', 'quiet'],
    materials: 'none',
    whyItConnects:
      'Taking their music seriously is taking them seriously — their soundtrack, your full attention.',
  },
  {
    id: 'puddle-run',
    title: 'Puddle Run',
    oneLiner:
      'Rain boots on (or not) and straight into the puddles or sprinkler. They pick which ones; biggest splash gets narrated like the news.',
    ageBands: ['3-5', '6-8'],
    interests: ['water', 'outdoors', 'movement'],
    materials: 'none',
    whyItConnects:
      'Getting wet on purpose, because they chose it, is the opposite of "be careful" — and they\'ll remember it.',
  },
  {
    id: 'ice-treasure',
    title: 'Ice Treasure Dig',
    oneLiner:
      'Freeze a few small toys in a bowl of water, then hand over warm water and a spoon. They excavate; you gasp at every find.',
    ageBands: ['3-5', '6-8'],
    interests: ['sensory', 'water'],
    materials: 'household',
    whyItConnects:
      'Cheering their patience without hurrying it lets a slow, drippy job stay entirely theirs.',
  },
  {
    id: 'talk-show-host',
    title: 'They Host, You Guest',
    oneLiner:
      'They host a talk show about their favorite topic and you\'re the guest — which mostly means asking one question and then really listening.',
    ageBands: ['9-12'],
    interests: ['pretend', 'quiet'],
    materials: 'none',
    whyItConnects:
      'Ten uninterrupted minutes on the thing they love, with you leaning in, is the interview of their year.',
  },
  {
    id: 'chain-reaction',
    title: 'Chain Reaction',
    oneLiner:
      'Line up dominoes, books, or anything that tips — their design, your steady hands where invited. The topple is the whole reward.',
    ageBands: ['6-8', '9-12'],
    interests: ['building', 'quiet'],
    materials: 'household',
    whyItConnects:
      'When it falls early and you laugh together instead of sighing, they learn mistakes can be the fun part.',
  },
  {
    id: 'dusk-walk',
    title: 'Dusk Walk',
    oneLiner:
      'A short walk right as it gets dark, route entirely theirs. Streetlights, moths, and whatever they feel like saying — or not saying.',
    ageBands: ['9-12'],
    interests: ['outdoors', 'quiet'],
    materials: 'none',
    whyItConnects:
      'Side-by-side in the half-dark, with no agenda, is where older kids tend to start talking.',
  },
  {
    id: 'snack-inventor',
    title: 'Snack Inventor',
    oneLiner:
      'They invent a snack; you\'re the line cook who follows the recipe exactly, even the weird parts. Then you both taste the creation.',
    ageBands: ['6-8', '9-12'],
    interests: ['sensory', 'pretend'],
    materials: 'household',
    whyItConnects:
      'Eating the crackers-with-jam-and-raisins they designed, with a straight face and a thumbs up, is love with a flavor.',
  },
  {
    id: 'pass-the-comic',
    title: 'Pass-the-Pen Comic',
    oneLiner:
      'One paper, one pen, passed back and forth: they draw a panel, you add the next — but they own the plot. Twist endings are their call.',
    ageBands: ['9-12'],
    interests: ['quiet'],
    materials: 'household',
    whyItConnects:
      'Adding to their story without steering it shows them their ideas can hold the pen.',
  },
  {
    id: 'they-teach-you',
    title: 'They Teach, You Learn',
    oneLiner:
      'They teach you their favorite game — video game, card game, playground game — and you get to be the beginner. Ask real questions; lose gracefully.',
    ageBands: ['9-12'],
    interests: ['quiet'],
    materials: 'none',
    whyItConnects:
      'Being the student flips the whole day\'s power balance — suddenly they\'re the patient one explaining things to you.',
  },
  {
    id: 'photo-safari',
    title: 'Photo Safari',
    oneLiner:
      'Hand over the phone camera and follow them on a safari of the house or block. They shoot what they notice; you carry the gear.',
    ageBands: ['6-8', '9-12'],
    interests: ['outdoors', 'quiet'],
    materials: 'household',
    whyItConnects:
      'Scrolling their photos together afterward shows you the world at their eye level — literally.',
  },
  {
    id: 'tape-line-gym',
    title: 'Tape-Line Gymnastics',
    oneLiner:
      'One line of tape on the floor becomes a balance beam. They\'re the judge and the star; your routine scores whatever they say it scores.',
    ageBands: ['3-5', '6-8'],
    interests: ['movement'],
    materials: 'household',
    whyItConnects:
      'Wobbling through their event and accepting their score keeps every ounce of authority where it belongs — with them.',
  },
  {
    id: 'mud-kitchen',
    title: 'Mud Kitchen',
    oneLiner:
      'Old pot, spoon, dirt, water. They\'re the chef; you\'re the customer who ordered exactly what they\'re making.',
    ageBands: ['3-5', '6-8'],
    interests: ['outdoors', 'water', 'sensory', 'pretend'],
    materials: 'household',
    whyItConnects:
      'Ordering seconds of mud soup tells them messy play is welcome when you\'re around.',
  },
  {
    id: 'blanket-stargaze',
    title: 'Blanket Stargaze',
    oneLiner:
      'One blanket, outside or by a window, lights off. Whatever they want to talk about is the topic; silence counts as a topic too.',
    ageBands: ['9-12'],
    interests: ['outdoors', 'quiet'],
    materials: 'household',
    whyItConnects:
      'No eye contact, no agenda, shoulder to shoulder — the easiest room a kid will ever talk in.',
  },
];

// ---------------------------------------------------------------------------
// Deterministic daily pick
// ---------------------------------------------------------------------------

/** Days an idea stays out of rotation after being shown. */
export const NO_REPEAT_DAYS = 14;

/** Local-date key (YYYY-MM-DD) — local, not UTC, so "today" matches the parent's day. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Small deterministic string hash (FNV-1a), always >= 0. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface PickOptions {
  date?: Date;
  ageBand?: AgeBand;
  interest?: InterestTag | null;
  /** Idea ids shown recently (within NO_REPEAT_DAYS) — avoided when possible. */
  excludeIds?: string[];
  /** 0 = today's first idea; 1, 2, … = "Something else" reshuffles. */
  offset?: number;
}

/**
 * Pick today's idea deterministically: same date + age band + interest +
 * offset always yields the same idea. Recently-shown ideas are skipped unless
 * that would empty the pool (filters relax gracefully — an idea is always
 * returned).
 */
export function pickDailyIdea(options: PickOptions = {}): SpecialTimeIdea {
  const { date = new Date(), ageBand = '6-8', interest = null, excludeIds = [], offset = 0 } = options;

  const byBand = SPECIAL_TIME_IDEAS.filter((idea) => idea.ageBands.includes(ageBand));
  const byInterest = interest
    ? byBand.filter((idea) => idea.interests.includes(interest))
    : byBand;
  // Relax in order: interest+band → band only → everything.
  const base = byInterest.length > 0 ? byInterest : byBand.length > 0 ? byBand : SPECIAL_TIME_IDEAS;

  const excluded = new Set(excludeIds);
  const fresh = base.filter((idea) => !excluded.has(idea.id));
  const pool = fresh.length > 0 ? fresh : base;

  const seed = hashString(`${dateKey(date)}:${ageBand}:${interest ?? 'all'}`);
  const index = (seed + offset) % pool.length;
  return pool[index];
}

// ---------------------------------------------------------------------------
// Shared localStorage state (read helpers)
// ---------------------------------------------------------------------------
// The SpecialTime screen owns all WRITES; these read-only helpers are shared
// so surfaces like the dashboard card can show the exact same idea the screen
// will open with. All storage access is best-effort (never throws).

export const SPECIAL_TIME_HISTORY_KEY = 'aminy-special-time-history';
export const SPECIAL_TIME_INTEREST_KEY = 'aminy-special-time-interest';

export interface SpecialTimeHistoryEntry {
  date: string; // YYYY-MM-DD
  ideaId: string;
}

export function readSpecialTimeHistory(): SpecialTimeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SPECIAL_TIME_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readSpecialTimeInterest(): InterestTag | null {
  try {
    const raw = localStorage.getItem(SPECIAL_TIME_INTEREST_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed === 'string' && parsed in INTEREST_LABELS ? (parsed as InterestTag) : null;
  } catch {
    return null;
  }
}

/** Idea ids shown within the last NO_REPEAT_DAYS (before today). */
export function recentSpecialTimeIdeaIds(
  history: SpecialTimeHistoryEntry[],
  today: string = dateKey()
): string[] {
  const cutoff = Date.now() - NO_REPEAT_DAYS * 24 * 60 * 60 * 1000;
  return history
    .filter((e) => e.date !== today && new Date(`${e.date}T12:00:00`).getTime() >= cutoff)
    .map((e) => e.ideaId);
}

/**
 * What idea would today show? Read-only (never writes history) — safe for
 * teasers on the dashboard. Matches the SpecialTime screen exactly: today's
 * recorded pick wins; otherwise the deterministic daily pick.
 */
export function peekTodaysIdea(ageBand: AgeBand): SpecialTimeIdea {
  const today = dateKey();
  const history = readSpecialTimeHistory();
  const todays = history.filter((e) => e.date === today);
  if (todays.length > 0) {
    const existing = SPECIAL_TIME_IDEAS.find((i) => i.id === todays[todays.length - 1].ideaId);
    if (existing) return existing;
  }
  return pickDailyIdea({
    ageBand,
    interest: readSpecialTimeInterest(),
    excludeIds: recentSpecialTimeIdeaIds(history, today),
  });
}
