/**
 * Junior Content Service — CMS-lite
 *
 * Fetches activity definitions from Supabase `junior_activities` table.
 * Falls back to hardcoded activities when Supabase is unavailable.
 * Caches fetched activities in localStorage with a 1-hour TTL.
 *
 * Usage:
 *   import { fetchActivities, JuniorActivity } from '../lib/junior-content-service';
 *   const activities = await fetchActivities('Speech');          // by track
 *   const activities = await fetchActivities(undefined, 2);      // by level
 *   const activities = await fetchActivities();                   // all
 */

import { supabase } from '../utils/supabase/client';
import { EXTENDED_ACTIVITIES } from '../data/junior-activities-extended';

// =============================================================================
// Types
// =============================================================================

export interface JuniorActivity {
  id: string;
  title: string;
  description: string;
  icon: string;           // emoji or lucide icon name (serializable, unlike React.ReactNode)
  duration: string;       // e.g. "5-10 min"
  skillType: 'speech' | 'social' | 'routines' | 'sensory' | 'executive' | 'aac';
  level: 0 | 1 | 2 | 3;
  sessionSize: 'micro' | 'standard' | 'extended';
  unlocked: boolean;
  tier: 'starter' | 'core' | 'pro';
  voiceReady: boolean;
  track: string;
}

// =============================================================================
// Cache config
// =============================================================================

const CACHE_KEY = 'aminy-junior-activities-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  activities: JuniorActivity[];
  cachedAt: number;
}

// =============================================================================
// Hardcoded fallback activities (core set from JuniorPageEnhancedPro)
// =============================================================================

const HARDCODED_ACTIVITIES: JuniorActivity[] = [
  {
    id: 'sound-safari',
    title: 'Sound Safari',
    description: 'Practice individual sounds with fun animal friends',
    icon: 'volume-2',
    duration: '2-4 min',
    skillType: 'speech',
    level: 0,
    sessionSize: 'micro',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 's-blend-builder',
    title: 'S-Blend Builder',
    description: 'Master tricky "st", "sp", "sc" sounds with visual mouth cues',
    icon: 'zap',
    duration: '4-6 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Articulation',
  },
  {
    id: 'prosody-playground',
    title: 'Prosody Playground',
    description: 'Master rhythm, stress, and melody in speech',
    icon: 'radio',
    duration: '5-7 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Prosody',
  },
  {
    id: 'multilingual-bridge',
    title: 'Language Bridge',
    description: 'Practice sounds in home language + English',
    icon: 'languages',
    duration: '4-6 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Multilingual',
  },
  {
    id: 'friendship-fix-it',
    title: 'Friendship Fix-It',
    description: 'Repair social misunderstandings with real scenarios',
    icon: 'users',
    duration: '7-9 min',
    skillType: 'social',
    level: 3,
    sessionSize: 'extended',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Social Problem-Solving',
  },
  {
    id: 'self-advocacy-coach',
    title: 'Self-Advocacy Coach',
    description: 'Practice asking "Can I have space?" and more',
    icon: 'shield',
    duration: '5-7 min',
    skillType: 'social',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Self-Advocacy',
  },
  {
    id: 'interoception-explorer',
    title: 'Body Signals Explorer',
    description: 'Understand what your body is telling you',
    icon: 'activity',
    duration: '4-6 min',
    skillType: 'sensory',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'Interoception',
  },
  {
    id: 'calm-corner',
    title: 'Calm Corner',
    description: 'Breathing bubbles and co-regulation',
    icon: 'brain',
    duration: '2-4 min',
    skillType: 'sensory',
    level: 0,
    sessionSize: 'micro',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Calm',
  },
  {
    id: 'aac-bridge-pro',
    title: 'AAC Bridge Pro',
    description: 'Core word practice with board integration',
    icon: 'layers',
    duration: '3-5 min',
    skillType: 'aac',
    level: 1,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'pro',
    voiceReady: true,
    track: 'AAC Integration',
  },
  {
    id: 'rhyme-time',
    title: 'Rhyme Time',
    description: 'Find words that rhyme! Build phonological awareness with fun rhyming games.',
    icon: 'book-open',
    duration: '3-5 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Phonological Awareness',
  },
  {
    id: 'story-retell',
    title: 'Story Retell',
    description: 'Listen to a short story and retell key events in your own words.',
    icon: 'message-square',
    duration: '5-8 min',
    skillType: 'speech',
    level: 2,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Narrative Skills',
  },
  {
    id: 'following-directions',
    title: 'Following Directions',
    description: 'Practice multi-step directions with spatial concepts.',
    icon: 'compass',
    duration: '3-5 min',
    skillType: 'executive',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: false,
    track: 'Receptive Language',
  },
  {
    id: 'vocabulary-builder',
    title: 'Vocabulary Builder',
    description: 'Name items in categories, build word associations, and expand your word bank!',
    icon: 'lightbulb',
    duration: '4-6 min',
    skillType: 'speech',
    level: 1,
    sessionSize: 'standard',
    unlocked: false,
    tier: 'core',
    voiceReady: true,
    track: 'Expressive Language',
  },
  {
    id: 'emotion-labels',
    title: 'Emotion Labels',
    description: 'Identify emotions from real-life scenarios. How would YOU feel?',
    icon: 'heart',
    duration: '4-6 min',
    skillType: 'social',
    level: 1,
    sessionSize: 'standard',
    unlocked: true,
    tier: 'starter',
    voiceReady: true,
    track: 'Social Communication',
  },
];

// =============================================================================
// Cache helpers
// =============================================================================

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(activities: JuniorActivity[]): void {
  try {
    const entry: CacheEntry = { activities, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or blocked
  }
}

// =============================================================================
// Supabase row → JuniorActivity mapper
// =============================================================================

function mapRow(row: Record<string, unknown>): JuniorActivity {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    icon: row.icon as string,
    duration: row.duration as string,
    skillType: row.skill_type as JuniorActivity['skillType'],
    level: (row.level ?? 0) as JuniorActivity['level'],
    sessionSize: row.session_size as JuniorActivity['sessionSize'],
    unlocked: row.unlocked as boolean,
    tier: row.tier as JuniorActivity['tier'],
    voiceReady: row.voice_ready as boolean,
    track: row.track as string,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch activities from Supabase with optional track/level filters.
 * Falls back to hardcoded + extended activities if Supabase is unavailable.
 * Results are cached in localStorage for 1 hour.
 */
export async function fetchActivities(
  track?: string,
  level?: number,
): Promise<JuniorActivity[]> {
  // 1. Try localStorage cache first
  const cached = readCache();
  if (cached) {
    return applyFilters(cached.activities, track, level);
  }

  // 2. Try Supabase
  try {
    let query = supabase
      .from('junior_activities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (track) {
      query = query.ilike('track', `%${track}%`);
    }
    if (level !== undefined) {
      query = query.eq('level', level);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      const activities = data.map(mapRow);
      // Cache the full unfiltered set
      if (!track && level === undefined) {
        writeCache(activities);
      }
      return activities;
    }

    // Supabase returned empty — fall back to hardcoded
    throw new Error('No activities found in Supabase');
  } catch (err) {
    console.warn('[JuniorContentService] Supabase unavailable, using hardcoded fallback:', err);
  }

  // 3. Fallback: merge hardcoded + extended
  const allFallback = [...HARDCODED_ACTIVITIES, ...EXTENDED_ACTIVITIES];
  writeCache(allFallback);
  return applyFilters(allFallback, track, level);
}

/**
 * Get all activities synchronously from cache or hardcoded fallback.
 * Useful for initial render before async fetch completes.
 */
export function getActivitiesSync(): JuniorActivity[] {
  const cached = readCache();
  if (cached) return cached.activities;
  return [...HARDCODED_ACTIVITIES, ...EXTENDED_ACTIVITIES];
}

/**
 * Force-refresh the cache by fetching from Supabase.
 */
export async function refreshActivitiesCache(): Promise<JuniorActivity[]> {
  localStorage.removeItem(CACHE_KEY);
  return fetchActivities();
}

// =============================================================================
// Internal helpers
// =============================================================================

function applyFilters(
  activities: JuniorActivity[],
  track?: string,
  level?: number,
): JuniorActivity[] {
  let filtered = activities;
  if (track) {
    const t = track.toLowerCase();
    filtered = filtered.filter(a => a.track.toLowerCase().includes(t));
  }
  if (level !== undefined) {
    filtered = filtered.filter(a => a.level === level);
  }
  return filtered;
}
