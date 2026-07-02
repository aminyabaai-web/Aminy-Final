// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Store Recommendations — AI-driven personalized product picks
 *
 * The store's value proposition: the AI picks products for THIS child from
 * everything Amazon sells, monetized via Amazon Associates affiliate SEARCH
 * links (amazon.com/s?k=...&tag=TAG earns commission on anything bought in
 * the click session). No catalog to maintain.
 *
 * Two paths, always resolving to 4-6 recs:
 *  - getAIRecs()        → calls the existing /ai/brain edge route, parses a
 *                         strict-JSON response defensively
 *  - getRuleBasedRecs() → deterministic child-signal → product mapping,
 *                         used offline and as the fallback for ANY AI failure
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// Types
// ============================================================================

export type RecCategory =
  | 'sensory'
  | 'visual-supports'
  | 'communication'
  | 'motor'
  | 'sleep'
  | 'safety'
  | 'play';

export type PriceBand = '$' | '$$' | '$$$';

export interface ProductRec {
  title: string;
  /** Warm, parent-voice sentence referencing the child's specific signal. */
  why: string;
  /** Plain Amazon search phrase — fed into amazonSearchUrl(). */
  searchQuery: string;
  category: RecCategory;
  priceBand?: PriceBand;
}

export interface ChildRecContext {
  childName?: string;
  childAge?: number;
  /** Normalized lowercase condition signals: 'autism', 'adhd', 'speech', 'anxiety'... */
  conditions: string[];
  /** Normalized struggle signals: 'transitions', 'meltdowns', 'sleep', 'focus', 'elopement'... */
  struggles: string[];
  sensoryProfile?: 'seeking' | 'avoiding' | 'mixed';
}

export const REC_CATEGORIES: readonly RecCategory[] = [
  'sensory',
  'visual-supports',
  'communication',
  'motor',
  'sleep',
  'safety',
  'play',
] as const;

export const REC_CATEGORY_LABELS: Record<RecCategory, string> = {
  sensory: 'Sensory',
  'visual-supports': 'Visual supports',
  communication: 'Communication',
  motor: 'Motor',
  sleep: 'Sleep',
  safety: 'Safety',
  play: 'Play',
};

// ============================================================================
// Amazon affiliate search links (single source of truth — StoreMarketplace
// imports these instead of keeping its own copy)
// ============================================================================

// When the Amazon Associates account is approved, set the tag here.
export const AMAZON_AFFILIATE_TAG = ''; // e.g. 'aminy-20'

export function amazonSearchUrl(searchQuery: string, tag: string = AMAZON_AFFILIATE_TAG): string {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`;
  return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
}

// ============================================================================
// buildChildRecContext — assemble a context from whatever the store screen
// can cheaply access: an optional childProfile prop + pre/post-signup
// localStorage caches. Graceful when everything is sparse.
// ============================================================================

interface StoreChildProfile {
  name?: string;
  age?: number;
  diagnoses?: string[];
  treatmentGoals?: string[];
}

const CONDITION_KEYWORDS: Record<string, string[]> = {
  autism: ['autism', 'asd', 'spectrum'],
  adhd: ['adhd', 'attention deficit', 'hyperactiv'],
  speech: ['speech', 'language delay', 'nonverbal', 'non-verbal', 'not talking', 'few words', 'aac'],
  anxiety: ['anxiety', 'anxious', 'worries', 'worried'],
  'sensory-processing': ['sensory processing', 'spd'],
};

const STRUGGLE_KEYWORDS: Record<string, string[]> = {
  transitions: ['transition', 'switching activities', 'leaving', 'stopping an activity', 'change in routine', 'changes in routine'],
  meltdowns: ['meltdown', 'tantrum', 'big feelings', 'outburst', 'aggression', 'hitting'],
  sleep: ['sleep', 'bedtime', 'night waking', 'falling asleep', 'stays up'],
  focus: ['focus', 'attention', 'sitting still', 'distract', 'homework'],
  elopement: ['elope', 'runs away', 'wander', 'bolts', 'runs off'],
  'picky-eating': ['picky eat', 'food refusal', 'limited foods', 'mealtime'],
};

const SEEKING_KEYWORDS = ['sensory seeking', 'seeks', 'crashes', 'crashing', 'chews', 'chewing', 'spinning', 'jumping', 'rough play', 'climbs'];
const AVOIDING_KEYWORDS = ['sensory avoiding', 'covers ears', 'loud noises', 'noise sensitive', 'overwhelmed by', 'avoids touch', 'hates tags', 'bright lights'];

function scanText(text: string, ctx: ChildRecContext): void {
  const t = text.toLowerCase();
  for (const [signal, keywords] of Object.entries(CONDITION_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k)) && !ctx.conditions.includes(signal)) {
      ctx.conditions.push(signal);
    }
  }
  for (const [signal, keywords] of Object.entries(STRUGGLE_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k)) && !ctx.struggles.includes(signal)) {
      ctx.struggles.push(signal);
    }
  }
  const seeking = SEEKING_KEYWORDS.some((k) => t.includes(k));
  const avoiding = AVOIDING_KEYWORDS.some((k) => t.includes(k));
  if (seeking && avoiding) ctx.sensoryProfile = 'mixed';
  else if (seeking) ctx.sensoryProfile = ctx.sensoryProfile === 'avoiding' ? 'mixed' : 'seeking';
  else if (avoiding) ctx.sensoryProfile = ctx.sensoryProfile === 'seeking' ? 'mixed' : 'avoiding';
}

function readLocalJSON<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Build a ChildRecContext from an optional childProfile (as passed to
 * StoreMarketplace) plus cached screening/onboarding data. Never throws.
 */
export function buildChildRecContext(input?: { childProfile?: StoreChildProfile | null }): ChildRecContext {
  const ctx: ChildRecContext = { conditions: [], struggles: [] };

  // 1) Explicit child profile (richest source when present)
  const profile = input?.childProfile;
  if (profile) {
    if (typeof profile.name === 'string' && profile.name.trim()) ctx.childName = profile.name.trim();
    if (typeof profile.age === 'number' && Number.isFinite(profile.age)) ctx.childAge = profile.age;
    for (const d of profile.diagnoses ?? []) if (typeof d === 'string') scanText(d, ctx);
    for (const g of profile.treatmentGoals ?? []) if (typeof g === 'string') scanText(g, ctx);
  }

  // 2) Pre-signup screening answers (localStorage `aminy_screening_results`)
  const screening = readLocalJSON<Array<{ question?: unknown; answer?: unknown }>>('aminy_screening_results');
  if (Array.isArray(screening)) {
    for (const r of screening) {
      scanText(`${r?.question ?? ''} ${r?.answer ?? ''}`, ctx);
    }
  }

  // 3) Onboarding progress cache (child name/age/concerns)
  const progress = readLocalJSON<{ childName?: unknown; childAge?: unknown; concerns?: unknown }>(
    'aminy-onboarding-progress',
  );
  if (progress) {
    if (!ctx.childName && typeof progress.childName === 'string' && progress.childName.trim()) {
      ctx.childName = progress.childName.trim();
    }
    if (ctx.childAge === undefined && typeof progress.childAge === 'number' && Number.isFinite(progress.childAge)) {
      ctx.childAge = progress.childAge;
    }
    if (Array.isArray(progress.concerns)) {
      for (const c of progress.concerns) if (typeof c === 'string') scanText(c, ctx);
    }
  }

  return ctx;
}

/** True when we know anything at all about this child. */
export function hasChildSignals(ctx: ChildRecContext): boolean {
  return Boolean(
    ctx.childName ||
    ctx.childAge !== undefined ||
    ctx.conditions.length > 0 ||
    ctx.struggles.length > 0 ||
    ctx.sensoryProfile,
  );
}

// ============================================================================
// Rule-based recommendations — deterministic, zero-AI, offline-safe
// ============================================================================

const MIN_RECS = 4;
const MAX_RECS = 6;

/**
 * Map child signals → 4-6 warm, personalized recs. This is both the
 * offline experience and the fallback for any AI failure.
 */
export function getRuleBasedRecs(ctx: ChildRecContext): ProductRec[] {
  const name = ctx.childName?.trim() || 'your child';
  const age = ctx.childAge;
  const has = (signal: string) => ctx.conditions.includes(signal) || ctx.struggles.includes(signal);

  const recs: ProductRec[] = [];
  const add = (rec: ProductRec) => {
    if (recs.length < MAX_RECS && !recs.some((r) => r.searchQuery === rec.searchQuery)) {
      recs.push(rec);
    }
  };

  if (has('transitions')) {
    add({
      title: 'Visual countdown timer',
      why: `Transitions have been tough — visual timers give ${name} a countdown they can see, so "5 more minutes" actually means something.`,
      searchQuery: 'visual timer for kids',
      category: 'visual-supports',
      priceBand: '$$',
    });
  }

  if (has('meltdowns')) {
    add({
      title: 'Calm-down sensory kit',
      why: `For the big-feelings moments — a small kit of calming tools ${name} can reach for before things boil over.`,
      searchQuery: 'calm down sensory kit kids',
      category: 'sensory',
      priceBand: '$$',
    });
  }

  if (has('sleep')) {
    if (age !== undefined && age < 4) {
      // Weighted blankets aren't recommended for very young children.
      add({
        title: 'White noise sound machine',
        why: `Bedtime has been a battle — steady, familiar sound helps little ones like ${name} settle and stay settled.`,
        searchQuery: 'white noise machine kids',
        category: 'sleep',
        priceBand: '$',
      });
    } else {
      add({
        title: 'Kids weighted blanket',
        why: `Sleep has been hard-won — many kids find the gentle, even pressure of a weighted blanket helps their body settle at bedtime.`,
        searchQuery: 'kids weighted blanket',
        category: 'sleep',
        priceBand: '$$',
      });
    }
  }

  if (ctx.sensoryProfile === 'seeking' || ctx.sensoryProfile === 'mixed') {
    add({
      title: 'Indoor sensory swing',
      why: `${name} seeks out big movement — a sensory swing gives that spinning, swinging input safely at home.`,
      searchQuery: 'indoor sensory swing kids',
      category: 'motor',
      priceBand: '$$$',
    });
    add({
      title: 'Chewable sensory necklace',
      why: `If ${name} chews on shirts and sleeves, a chew-safe necklace gives that input somewhere sturdy and washable.`,
      searchQuery: 'chew necklace sensory kids',
      category: 'sensory',
      priceBand: '$',
    });
  }

  if (ctx.sensoryProfile === 'avoiding' || ctx.sensoryProfile === 'mixed') {
    add({
      title: 'Kids ear protection earmuffs',
      why: `Loud places can be a lot for ${name} — kid-sized ear protection makes stores, gyms, and gatherings easier to be in.`,
      searchQuery: 'noise reduction earmuffs kids',
      category: 'sensory',
      priceBand: '$',
    });
  }

  if (has('speech')) {
    add({
      title: 'Picture communication cards',
      why: `While ${name}'s words are still growing, picture cards give them a way to be understood right now — fewer frustrated moments for everyone.`,
      searchQuery: 'picture communication cards kids',
      category: 'communication',
      priceBand: '$',
    });
    add({
      title: 'Recordable talking buttons',
      why: `Recordable buttons let ${name} "say" the things they need most — a fun, low-pressure first step into communication.`,
      searchQuery: 'recordable answer buttons kids',
      category: 'communication',
      priceBand: '$$',
    });
  }

  if (has('adhd') || has('focus')) {
    add({
      title: 'Wobble cushion seat',
      why: `Wiggly bodies focus better when they can move — a wobble cushion lets ${name} wiggle while staying in the seat.`,
      searchQuery: 'wobble cushion kids seat',
      category: 'motor',
      priceBand: '$',
    });
    add({
      title: 'Quiet fidget kit',
      why: `A pouch of quiet fidgets gives ${name}'s hands something to do during homework, car rides, and waiting rooms.`,
      searchQuery: 'fidget toy pack kids',
      category: 'play',
      priceBand: '$',
    });
  }

  if (has('autism')) {
    add({
      title: 'Visual schedule board',
      why: `Knowing what comes next lowers the stress — a picture schedule makes ${name}'s day predictable at a glance.`,
      searchQuery: 'visual schedule board kids autism',
      category: 'visual-supports',
      priceBand: '$$',
    });
  }

  if (has('anxiety')) {
    add({
      title: 'Weighted lap pad',
      why: `On the worried days, a weighted lap pad gives ${name} steady, grounding pressure — at the table, in the car, anywhere.`,
      searchQuery: 'weighted lap pad kids',
      category: 'sensory',
      priceBand: '$',
    });
  }

  if (has('elopement')) {
    add({
      title: 'Door and window alarms',
      why: `If ${name} is a door-dasher, simple chime alarms buy you the seconds that matter most.`,
      searchQuery: 'door alarm child safety',
      category: 'safety',
      priceBand: '$',
    });
  }

  if (has('picky-eating')) {
    add({
      title: 'Divided sensory-friendly plates',
      why: `Foods that don't touch are foods that get tried — divided plates keep mealtime lower-stakes for ${name}.`,
      searchQuery: 'divided plates picky eaters kids',
      category: 'play',
      priceBand: '$',
    });
  }

  // Top up to MIN_RECS with universal family favorites.
  const generics: ProductRec[] = [
    {
      title: 'Visual schedule board',
      why: `Predictable days are calmer days — a picture schedule shows ${name} what's next without a negotiation.`,
      searchQuery: 'visual schedule board kids',
      category: 'visual-supports',
      priceBand: '$$',
    },
    {
      title: 'Kids ear protection earmuffs',
      why: `A favorite of many Aminy families — kid-sized ear protection turns overwhelming outings back into doable ones.`,
      searchQuery: 'noise reduction earmuffs kids',
      category: 'sensory',
      priceBand: '$',
    },
    {
      title: 'Quiet fidget kit',
      why: `Busy hands, calmer body — a small fidget kit earns its keep in every waiting room and car ride.`,
      searchQuery: 'fidget toy pack kids',
      category: 'play',
      priceBand: '$',
    },
    {
      title: 'Tactile sensory bin kit',
      why: `Open-ended sensory play ${name} can sink their hands into — great for rainy afternoons and after-school decompression.`,
      searchQuery: 'sensory bin kit kids',
      category: 'play',
      priceBand: '$$',
    },
    {
      title: 'First-then magnetic board',
      why: `"First bath, then story" lands better when ${name} can see it — a first-then board makes the deal concrete.`,
      searchQuery: 'first then board kids',
      category: 'visual-supports',
      priceBand: '$',
    },
    {
      title: 'Emotion flashcards',
      why: `Naming a feeling is the first step to riding it out — emotion cards give ${name} the words (and faces) to point to.`,
      searchQuery: 'emotion flashcards kids',
      category: 'communication',
      priceBand: '$',
    },
  ];
  for (const g of generics) {
    if (recs.length >= MIN_RECS) break;
    add(g);
  }

  return recs.slice(0, MAX_RECS);
}

// ============================================================================
// AI response parsing — defensive by design
// ============================================================================

const CATEGORY_SYNONYMS: Record<string, RecCategory> = {
  visual: 'visual-supports',
  'visual supports': 'visual-supports',
  'visual-aids': 'visual-supports',
  'visual aids': 'visual-supports',
  'communication-aids': 'communication',
  'communication aids': 'communication',
  speech: 'communication',
  aac: 'communication',
  'sensory tools': 'sensory',
  'sensory-tools': 'sensory',
  calming: 'sensory',
  'gross-motor': 'motor',
  'fine-motor': 'motor',
  movement: 'motor',
  bedtime: 'sleep',
  toys: 'play',
  games: 'play',
  toy: 'play',
};

const PRICE_BANDS: readonly PriceBand[] = ['$', '$$', '$$$'];

// Injection-ish / junk markers — any hit disqualifies the item entirely.
const JUNK_PATTERN = /https?:|www\.|javascript:|<|>|\{\{|ignore\s+(all\s+)?(previous|prior|above)|system\s+prompt|&tag=/i;

function normalizeCategory(raw: unknown): RecCategory | null {
  if (typeof raw !== 'string') return null;
  const c = raw.trim().toLowerCase();
  if ((REC_CATEGORIES as readonly string[]).includes(c)) return c as RecCategory;
  return CATEGORY_SYNONYMS[c] ?? null;
}

function validateRec(raw: unknown): ProductRec | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;

  const title = typeof item.title === 'string' ? item.title.replace(/\s+/g, ' ').trim() : '';
  const why = typeof item.why === 'string' ? item.why.replace(/\s+/g, ' ').trim() : '';
  const searchQuery = typeof item.searchQuery === 'string' ? item.searchQuery.replace(/\s+/g, ' ').trim() : '';

  if (!title || !why || !searchQuery) return null;
  if (JUNK_PATTERN.test(title) || JUNK_PATTERN.test(why) || JUNK_PATTERN.test(searchQuery)) return null;
  if (title.length > 90 || why.length > 280 || searchQuery.length > 80) return null;

  const category = normalizeCategory(item.category);
  if (!category) return null;

  const priceBand = PRICE_BANDS.includes(item.priceBand as PriceBand)
    ? (item.priceBand as PriceBand)
    : undefined;

  return { title, why, searchQuery, category, priceBand };
}

/**
 * Extract and validate a ProductRec[] from raw AI text. Handles fenced code
 * blocks and surrounding prose. Returns null when fewer than 3 valid recs
 * survive validation (callers then fall back to rule-based recs).
 */
export function parseAIRecs(raw: unknown): ProductRec[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const candidates: string[] = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);
  candidates.push(raw);

  for (const candidate of candidates) {
    const start = candidate.indexOf('[');
    const end = candidate.lastIndexOf(']');
    if (start === -1 || end <= start) continue;
    try {
      const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
      if (!Array.isArray(parsed)) continue;
      const recs = parsed.map(validateRec).filter((r): r is ProductRec => r !== null);
      if (recs.length >= 3) return recs.slice(0, MAX_RECS);
    } catch {
      // Try next candidate
    }
  }
  return null;
}

// ============================================================================
// AI recommendations via the existing /ai/brain edge route
// ============================================================================

function buildRecPrompt(ctx: ChildRecContext): { systemPrompt: string; userMessage: string } {
  const lines: string[] = [];
  if (ctx.childName) lines.push(`Name: ${ctx.childName}`);
  if (ctx.childAge !== undefined) lines.push(`Age: ${ctx.childAge}`);
  if (ctx.conditions.length > 0) lines.push(`Conditions/signals: ${ctx.conditions.join(', ')}`);
  if (ctx.struggles.length > 0) lines.push(`Current struggles: ${ctx.struggles.join(', ')}`);
  if (ctx.sensoryProfile) lines.push(`Sensory profile: ${ctx.sensoryProfile}`);
  const contextBlock = lines.length > 0 ? lines.join('\n') : 'A neurodivergent child; no details shared yet.';

  return {
    systemPrompt:
      "You are Aminy's product recommendation engine for families of neurodivergent children. " +
      'You respond with ONLY a strict JSON array — no prose, no markdown fences, no explanations.',
    userMessage: `Child context:
${contextBlock}

Recommend exactly 5 product types sold on Amazon that would genuinely help this child day-to-day.
Rules:
- Generic product TYPES only (e.g. "visual timer"), never brand names.
- "why" is one warm sentence in a parent's voice, referencing this child's specific situation${ctx.childName ? ` and using the name ${ctx.childName}` : ''}. No medical or therapeutic-outcome claims.
- "searchQuery" is a plain Amazon search phrase (3-6 words). No URLs.
- "category" must be exactly one of: sensory, visual-supports, communication, motor, sleep, safety, play.
- "priceBand" is "$" (under $20), "$$" ($20-60), or "$$$" (over $60).
Return STRICT JSON only:
[{"title":"...","why":"...","searchQuery":"...","category":"...","priceBand":"..."}]`,
  };
}

export interface GetAIRecsOptions {
  /** Abort the AI call after this many ms (default 8000) and fall back. */
  timeoutMs?: number;
}

/**
 * Ask the AI to pick products for this child via the existing /ai/brain
 * edge route (anon key + session JWT when signed in — same pattern as
 * BevelChatOverlay). On ANY failure — network, timeout, non-OK, junk
 * response — resolves with getRuleBasedRecs(ctx). Never rejects.
 */
export async function getAIRecs(ctx: ChildRecContext, opts: GetAIRecsOptions = {}): Promise<ProductRec[]> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Session JWT when signed in (paid users get paid AI limits); anon key otherwise.
    let token = publicAnonKey;
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) token = data.session.access_token;
    } catch {
      // Anon key is fine
    }

    const { systemPrompt, userMessage } = buildRecPrompt(ctx);
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userMessage,
          conversationHistory: [],
          systemPrompt,
          temperature: 0.7,
          max_tokens: 900,
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`AI recs request failed: ${response.status}`);

    const data: unknown = await response.json();
    const text =
      (data as Record<string, unknown>)?.message ??
      (data as Record<string, unknown>)?.response ??
      (data as Record<string, unknown>)?.content;

    const recs = parseAIRecs(text);
    if (recs) return recs;
    throw new Error('AI recs response failed validation');
  } catch {
    return getRuleBasedRecs(ctx);
  } finally {
    clearTimeout(timer);
  }
}
