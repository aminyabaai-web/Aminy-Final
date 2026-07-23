// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * AACT village seeding kit — first-village density content (Wave 3).
 *
 * A forum with no posts is worse than none: density must come before features.
 * The AACT pilot families (Phoenix metro) are the natural first village, so
 * partner admins get a one-tap "Seed the community" action that inserts:
 *
 *   - 6 realistic starter EVENTS (Phoenix-metro park meetups, parent coffee,
 *     sensory-friendly library hour, plus 2 virtual circles)
 *   - 8 warm starter POSTS (introductions, wins, IEP-season support, respite
 *     tips, sensory-friendly spots, etc.)
 *
 * ALL of this is SEED CONTENT, clearly authored as "Aminy Team" / the AACT
 * partner voice — never fake parent personas. Events are inserted with
 * is_seed = true; posts carry the team display name. The events tab shows an
 * honest "partner-hosted to start" note whenever seed events are present.
 *
 * Inserts go through the normal service paths (community-service createPost /
 * createEvent) so RLS, counters, and triggers behave exactly as they do for
 * real users. Idempotent: a DB marker (the welcome post title) + localStorage
 * flag prevent double-seeding.
 */

import { supabase } from '../utils/supabase/client';
import {
  createEvent,
  createPost,
  type CreateEventInput,
} from '../lib/community-service';

// ── Authorship ────────────────────────────────────────────────────────

/** Display name used for every seeded post — honest team voice, no fake parents. */
export const SEED_AUTHOR_NAME = 'Aminy Team';
/** Host label for seeded events (partner-run to start). */
export const SEED_EVENT_HOST = 'Aminy × AACT Family Team';

/** DB idempotency marker: the welcome post's exact title. */
export const SEED_MARKER_TITLE = 'Welcome! Introduce yourself here 👋';
/** localStorage fallback marker (covers offline / RLS-restricted reads). */
export const SEED_LOCALSTORAGE_KEY = 'aminy-aact-village-seeded';

// ── Date helpers — seed events always land in the upcoming weeks ─────

/** Next occurrence of `weekday` (0=Sun..6=Sat) at local hour:minute, at least `minDaysOut` away. */
function nextOccurrence(weekday: number, hour: number, minute = 0, minDaysOut = 2): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  let delta = (weekday - d.getDay() + 7) % 7;
  if (delta < minDaysOut || (delta === 0 && d.getTime() <= Date.now())) delta += 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString();
}

// ── Starter events (Phoenix metro + virtual) ──────────────────────────

export interface SeedEvent extends Omit<CreateEventInput, 'date'> {
  /** Computed lazily so seeding always produces upcoming dates. */
  getDate: () => string;
}

export const AACT_SEED_EVENTS: SeedEvent[] = [
  {
    title: 'Sensory-Friendly Park Meetup',
    description:
      'Low-key morning at the park before the heat sets in. Shaded playground, room to move, zero expectations — come for 20 minutes or two hours. Siblings welcome. Look for the teal Aminy sign.',
    location: 'Encanto Park area — shaded playground near the lagoon',
    locationType: 'park',
    city: 'Phoenix',
    state: 'AZ',
    capacity: 15,
    getDate: () => nextOccurrence(6, 8, 30), // Saturday 8:30am
    hostName: SEED_EVENT_HOST,
    isSeed: true,
  },
  {
    title: 'Parent Coffee & Connect',
    description:
      'An hour of grown-up conversation with parents who get it. No agenda, no presentations — just coffee and honest talk. First round is on the AACT team.',
    location: 'Coffee shop near Gilbert Town Square (details shared with attendees)',
    locationType: 'other',
    city: 'Gilbert',
    state: 'AZ',
    capacity: 10,
    getDate: () => nextOccurrence(3, 9, 0), // Wednesday 9:00am
    hostName: SEED_EVENT_HOST,
    isSeed: true,
  },
  {
    title: 'Sensory-Friendly Library Hour',
    description:
      'A quiet-room story time and free play hour arranged with library staff: lights low, sound down, movement OK. Fidgets and headphones available.',
    location: 'Tempe Public Library — community room (lower level)',
    locationType: 'library',
    city: 'Tempe',
    state: 'AZ',
    capacity: 12,
    getDate: () => nextOccurrence(2, 10, 0, 4), // Tuesday 10:00am
    hostName: SEED_EVENT_HOST,
    isSeed: true,
  },
  {
    title: 'Saturday Playground Meetup (West Valley)',
    description:
      'West-side families asked, so here it is: casual playground meetup with plenty of open space. Come and go as your morning allows.',
    location: 'Rio Vista Community Park — playground by the splash pad',
    locationType: 'park',
    city: 'Peoria',
    state: 'AZ',
    capacity: 15,
    getDate: () => nextOccurrence(6, 9, 0, 8), // the following Saturday
    hostName: SEED_EVENT_HOST,
    isSeed: true,
  },
  {
    title: 'Virtual: New-Diagnosis Parent Circle',
    description:
      'For parents in the first year after a diagnosis. Small group, cameras optional, no advice unless you ask for it. Facilitated by the AACT family support team.',
    location: 'Video call — link sent to attendees',
    locationType: 'virtual',
    city: undefined,
    state: undefined,
    capacity: 20,
    getDate: () => nextOccurrence(4, 19, 30), // Thursday 7:30pm
    hostName: SEED_EVENT_HOST,
    isSeed: true,
  },
  {
    title: 'Virtual: IEP Season Prep Q&A',
    description:
      'Bring your questions about upcoming school meetings — what to ask for, what to bring, and how to keep the meeting on track. Hosted by the AACT team with an experienced parent advocate.',
    location: 'Video call — link sent to attendees',
    locationType: 'virtual',
    city: undefined,
    state: undefined,
    capacity: 25,
    getDate: () => nextOccurrence(1, 19, 0, 5), // Monday 7:00pm
    hostName: SEED_EVENT_HOST,
    isSeed: true,
  },
];

// ── Starter posts (warm, honest team voice) ───────────────────────────

export interface SeedPost {
  title: string;
  body: string;
  category: 'wins' | 'questions' | 'tips' | 'support' | 'resources';
}

export const AACT_SEED_POSTS: SeedPost[] = [
  {
    // NOTE: title doubles as the DB idempotency marker (SEED_MARKER_TITLE).
    title: SEED_MARKER_TITLE,
    body: "This community is brand new, and you're one of the first families here. Tell us whatever you feel like sharing — your child's age, what made you smile this week, or just \"hi.\" No pressure to share more than you want. We're glad you're here. — the Aminy Team",
    category: 'support',
  },
  {
    title: 'Share a win from this week — tiny ones count',
    body: "A new food tried. A haircut survived. Shoes on without a battle. Around here, small wins are big wins, and nobody will say \"that's just what kids do.\" What went right this week?",
    category: 'wins',
  },
  {
    title: 'IEP season support thread',
    body: "School meetings can feel like a second job. Use this thread to swap what's worked: questions that got real answers, accommodations worth asking for, and how you keep your cool when the meeting runs long. Venting also counts as participating.",
    category: 'support',
  },
  {
    title: 'Respite: what has actually worked for your family?',
    body: "Finding a break you can trust is one of the hardest parts. Have you found respite through DDD, a family member, a sitter who just gets it, or a program worth recommending? Share what worked — and what to watch out for.",
    category: 'questions',
  },
  {
    title: 'Favorite sensory-friendly spots around the Valley',
    body: "Building a parent-tested list: quiet parks, splash pads with shade, sensory hours at museums and theaters, restaurants that don't blink at a kid wearing headphones. Drop your favorites and we'll keep this thread updated.",
    category: 'resources',
  },
  {
    title: 'What do you wish someone had told you in year one?',
    body: "For the parents just starting out: what's the one thing you'd go back and tell yourself? The practical stuff, the paperwork stuff, the heart stuff — all of it helps someone who's a few steps behind you.",
    category: 'tips',
  },
  {
    title: 'Hard day? Vent here — no advice unless you ask',
    body: "Some days are just heavy, and you shouldn't need a silver lining to talk about them. This thread is for getting it off your chest. If you want ideas, say so; otherwise we'll just listen.",
    category: 'support',
  },
  {
    title: 'Picky eating — what helped at your table?',
    body: "The beige-food phase is real. What's helped at your house — new textures, letting them help cook, backing off entirely? No judgment here; every kid's list of safe foods is different.",
    category: 'questions',
  },
];

// ── Seeding orchestration (idempotent) ────────────────────────────────

export interface SeedResult {
  alreadySeeded: boolean;
  postsCreated: number;
  eventsCreated: number;
  errors: number;
}

/** True if the village has already been seeded (DB marker post or local flag). */
export async function isVillageSeeded(): Promise<boolean> {
  try {
    if (localStorage.getItem(SEED_LOCALSTORAGE_KEY) === '1') return true;
  } catch { /* storage unavailable — fall through to DB check */ }
  try {
    const { data } = await supabase
      .from('community_posts')
      .select('id')
      .eq('title', SEED_MARKER_TITLE)
      .limit(1);
    if (data && data.length > 0) {
      try { localStorage.setItem(SEED_LOCALSTORAGE_KEY, '1'); } catch { /* best-effort */ }
      return true;
    }
  } catch { /* offline / RLS — treat as not seeded; inserts are still safe */ }
  return false;
}

/**
 * Seed the AACT village: 8 starter posts + 6 starter events, inserted through
 * the normal community-service paths as the signed-in partner admin
 * (`adminUserId` must be their auth UUID — RLS requires it). Skips entirely
 * if the marker shows we've already seeded.
 */
export async function seedAactVillage(adminUserId: string): Promise<SeedResult> {
  if (await isVillageSeeded()) {
    return { alreadySeeded: true, postsCreated: 0, eventsCreated: 0, errors: 0 };
  }

  let postsCreated = 0;
  let eventsCreated = 0;
  let errors = 0;

  for (const post of AACT_SEED_POSTS) {
    const created = await createPost(
      adminUserId,
      post.title,
      post.body,
      post.category,
      false,
      SEED_AUTHOR_NAME
    );
    if (created) postsCreated += 1; else errors += 1;
  }

  for (const event of AACT_SEED_EVENTS) {
    const { getDate, ...rest } = event;
    const created = await createEvent(adminUserId, { ...rest, date: getDate() });
    if (created) eventsCreated += 1; else errors += 1;
  }

  // Only set the marker if the marker post itself made it in — otherwise a
  // retry should be allowed to run again.
  if (postsCreated > 0) {
    try { localStorage.setItem(SEED_LOCALSTORAGE_KEY, '1'); } catch { /* best-effort */ }
  }

  return { alreadySeeded: false, postsCreated, eventsCreated, errors };
}
