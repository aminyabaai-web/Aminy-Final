// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * family-hangouts — the "village" layer riding the EXISTING group_sessions rails.
 *
 * A Family Hangout is a small, facilitator-led, parent-supervised virtual
 * hangout for kids who share an interest (building, animals, trains…).
 * It is NOT open chat and NOT unsupervised: a facilitator runs the session,
 * families join together, and a parent stays present the whole time.
 *
 * Session kind uses the EXISTING `topic_category` column (free text, no CHECK
 * constraint — see migration 20260608100000_group_sessions.sql), so NO new
 * migration is needed: `topic_category === 'family-hangout'` marks a hangout.
 * `format` stays 'single' (its CHECK only allows single|cohort).
 *
 * The interest theme is a machine-readable tag on the first line of the
 * description — `[interest:building]` — written by the provider template and
 * stripped before anything is shown to families.
 */

export const FAMILY_HANGOUT_CATEGORY = 'family-hangout';

/** Small on purpose: ≤6 families keeps every kid visible to the facilitator. */
export const HANGOUT_MAX_FAMILIES = 6;
export const HANGOUT_MIN_FAMILIES = 2;
/** 30 relaxed minutes — long enough to connect, short enough for any kid. */
export const HANGOUT_DURATION_MINUTES = 30;
export const HANGOUT_DEFAULT_PRICE_DOLLARS = 15;
export const HANGOUT_MIN_PRICE_DOLLARS = 10;

/** Shown on every hangout card, verbatim. */
export const HANGOUT_SAFETY_BADGE = 'Facilitated · Parents present · Small group';

/**
 * The ground rules — shared verbatim between the provider description
 * template and the parent-facing "what to expect" card.
 */
export const HANGOUT_GROUND_RULES: string[] = [
  'A facilitator leads the whole time',
  'A parent stays nearby for every child',
  'Cameras are optional',
  'No pressure to speak — showing up is enough',
];

export interface HangoutInterest {
  id: string;
  /** Short picker/chip label, e.g. "Trains & vehicles" */
  label: string;
  /** Completes "For kids who love …" on parent-facing cards */
  kidPhrase: string;
}

export const HANGOUT_INTERESTS: HangoutInterest[] = [
  { id: 'building', label: 'Building', kidPhrase: 'building things' },
  { id: 'animals', label: 'Animals', kidPhrase: 'animals' },
  { id: 'trains', label: 'Trains & vehicles', kidPhrase: 'trains and things that go' },
  { id: 'drawing', label: 'Drawing & art', kidPhrase: 'drawing and making art' },
  { id: 'music', label: 'Music', kidPhrase: 'music and sounds' },
  { id: 'dinosaurs', label: 'Dinosaurs', kidPhrase: 'dinosaurs' },
  { id: 'games', label: 'Games & puzzles', kidPhrase: 'games and puzzles' },
  { id: 'nature', label: 'Nature & bugs', kidPhrase: 'nature and bugs' },
  { id: 'space', label: 'Space', kidPhrase: 'space and stars' },
];

export function getHangoutInterest(id: string | null | undefined): HangoutInterest | null {
  if (!id) return null;
  return HANGOUT_INTERESTS.find((i) => i.id === id) || null;
}

export function isFamilyHangout(session: { topic_category?: string | null }): boolean {
  return session.topic_category === FAMILY_HANGOUT_CATEGORY;
}

// ---------------------------------------------------------------------------
// Interest tag — machine-readable first line of the description
// ---------------------------------------------------------------------------

const INTEREST_TAG = /^\s*\[interest:([a-z0-9-]+)\]\s*\n?/i;

/** Prefix the description body with the interest tag (stripped before display). */
export function encodeHangoutDescription(interestId: string | null, body: string): string {
  const trimmed = (body || '').trim();
  if (!interestId) return trimmed;
  return `[interest:${interestId}]\n${trimmed}`;
}

/** Strip and return the interest tag from a stored description. */
export function decodeHangoutDescription(description: string | null | undefined): {
  interestId: string | null;
  body: string;
} {
  const raw = description || '';
  const match = raw.match(INTEREST_TAG);
  if (!match) return { interestId: null, body: raw.trim() };
  return { interestId: match[1].toLowerCase(), body: raw.replace(INTEREST_TAG, '').trim() };
}

// ---------------------------------------------------------------------------
// Provider template prefills
// ---------------------------------------------------------------------------

export function buildHangoutTopic(interest: HangoutInterest): string {
  return `${interest.label} hangout`;
}

/**
 * Description template for the provider form — editable, and always states
 * the ground rules so families know exactly what they're joining.
 */
export function buildHangoutDescriptionTemplate(interest: HangoutInterest): string {
  return (
    `A small, relaxed video hangout for kids who love ${interest.kidPhrase} — families join together. ` +
    `A facilitator leads simple, low-pressure fun the whole time. ` +
    `A parent stays nearby for every child, cameras are optional, and no one is put on the spot — showing up is enough.`
  );
}

// ---------------------------------------------------------------------------
// Interest votes — the honest empty state. Votes persist locally and inform
// scheduling; they never book anything or promise a date.
// ---------------------------------------------------------------------------

export const HANGOUT_VOTES_STORAGE_KEY = 'aminy_hangout_interest_votes';

export function getHangoutInterestVotes(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(HANGOUT_VOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

/** Toggle a vote for an interest; returns the new vote list. */
export function toggleHangoutInterestVote(interestId: string): string[] {
  const current = getHangoutInterestVotes();
  const next = current.includes(interestId)
    ? current.filter((v) => v !== interestId)
    : [...current, interestId];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HANGOUT_VOTES_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Storage full/blocked — the vote still applies for this session.
  }
  return next;
}
