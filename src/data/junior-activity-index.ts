/**
 * Junior Activity Master Index
 *
 * Aggregates all activity modules into a single queryable library.
 * 140+ clinically informed activities for neurodivergent children.
 *
 * Base-type activities (speech, social, sensory, executive) use JuniorActivity
 * from junior-content-service.ts. Extended-type activities (motor, cognitive,
 * emotional, daily-living) use ExtendedJuniorActivity which adds those skill types.
 *
 * Exports:
 *   ALL_JUNIOR_ACTIVITIES         — combined array of every activity
 *   getActivitiesBySkillType()    — filter by skill domain
 *   getActivitiesByDifficulty()   — filter by easy/medium/hard
 *   getActivitiesByAgeRange()     — filter by target age
 *   getActivitiesByTrack()        — filter by therapeutic track
 *   getActivitiesByTier()         — filter by subscription tier
 *   getRecommendedActivities()    — personalized recommendations
 *   getActivityById()             — single activity lookup
 *   getActivityCounts()           — summary statistics
 */

import type { JuniorActivity } from '../lib/junior-content-service';
import type {
  ExtendedJuniorActivity,
  ExtendedSkillType,
  Difficulty,
  ChildProfile,
} from './junior-activity-types';
import { difficultyToLevels, levelToAgeRange, levelToDifficulty } from './junior-activity-types';

import { SPEECH_ACTIVITIES } from './junior-activities-speech';
import { SOCIAL_ACTIVITIES } from './junior-activities-social';
import { SENSORY_ACTIVITIES } from './junior-activities-sensory';
import { EXECUTIVE_ACTIVITIES } from './junior-activities-executive';
import { MOTOR_ACTIVITIES } from './junior-activities-motor';
import { COGNITIVE_ACTIVITIES } from './junior-activities-cognitive';
import { DAILY_LIVING_ACTIVITIES } from './junior-activities-daily-living';
import { EMOTIONAL_ACTIVITIES } from './junior-activities-emotional';

// =============================================================================
// Widening helper
// =============================================================================

/**
 * Widen a base JuniorActivity[] to ExtendedJuniorActivity[].
 * Base skill types (speech, social, etc.) are a subset of ExtendedSkillType,
 * so this is structurally safe.
 */
function widenActivities(activities: JuniorActivity[]): ExtendedJuniorActivity[] {
  return activities as unknown as ExtendedJuniorActivity[];
}

// =============================================================================
// Combined activity library
// =============================================================================

/**
 * All junior activities from every domain.
 * As of initial creation: 140 activities.
 */
export const ALL_JUNIOR_ACTIVITIES: readonly ExtendedJuniorActivity[] = [
  ...widenActivities(SPEECH_ACTIVITIES),
  ...widenActivities(SOCIAL_ACTIVITIES),
  ...widenActivities(SENSORY_ACTIVITIES),
  ...widenActivities(EXECUTIVE_ACTIVITIES),
  ...MOTOR_ACTIVITIES,
  ...COGNITIVE_ACTIVITIES,
  ...DAILY_LIVING_ACTIVITIES,
  ...EMOTIONAL_ACTIVITIES,
] as const;

// =============================================================================
// Query functions
// =============================================================================

/**
 * Filter activities by skill type (domain).
 */
export function getActivitiesBySkillType(
  skillType: ExtendedSkillType,
): ExtendedJuniorActivity[] {
  return ALL_JUNIOR_ACTIVITIES.filter((a) => a.skillType === skillType);
}

/**
 * Filter activities by difficulty level.
 *   easy   = level 0
 *   medium = level 1
 *   hard   = level 2 or 3
 */
export function getActivitiesByDifficulty(
  difficulty: Difficulty,
): ExtendedJuniorActivity[] {
  const levels = difficultyToLevels(difficulty);
  return ALL_JUNIOR_ACTIVITIES.filter((a) => levels.includes(a.level));
}

/**
 * Filter activities by target age range.
 * Returns activities whose mapped level-based age range overlaps [minAge, maxAge].
 */
export function getActivitiesByAgeRange(
  minAge: number,
  maxAge: number,
): ExtendedJuniorActivity[] {
  return ALL_JUNIOR_ACTIVITIES.filter((a) => {
    const [ageMin, ageMax] = levelToAgeRange(a.level);
    return ageMin <= maxAge && ageMax >= minAge;
  });
}

/**
 * Filter activities by therapeutic track name.
 * Case-insensitive partial match.
 */
export function getActivitiesByTrack(track: string): ExtendedJuniorActivity[] {
  const lower = track.toLowerCase();
  return ALL_JUNIOR_ACTIVITIES.filter((a) =>
    a.track.toLowerCase().includes(lower),
  );
}

/**
 * Filter activities by subscription tier.
 * Includes activities at or below the given tier:
 *   starter = starter only
 *   core    = starter + core
 *   pro     = starter + core + pro
 */
export function getActivitiesByTier(
  tier: 'starter' | 'core' | 'pro',
): ExtendedJuniorActivity[] {
  const allowed: Set<string> = new Set(['starter']);
  if (tier === 'core' || tier === 'pro') allowed.add('core');
  if (tier === 'pro') allowed.add('pro');
  return ALL_JUNIOR_ACTIVITIES.filter((a) => allowed.has(a.tier));
}

/**
 * Get a single activity by ID.
 * Returns undefined if not found.
 */
export function getActivityById(
  id: string,
): ExtendedJuniorActivity | undefined {
  return ALL_JUNIOR_ACTIVITIES.find((a) => a.id === id);
}

/**
 * Personalized activity recommendations based on child profile.
 *
 * Scoring algorithm considers:
 *   1. Age appropriateness (must match)
 *   2. Focus area match (high weight)
 *   3. Skill level match (activities at or just above current level)
 *   4. Recency penalty (avoid recently completed activities)
 *   5. Tier gating (only recommend activities the child can access)
 *
 * Returns up to `limit` activities sorted by relevance score (highest first).
 */
export function getRecommendedActivities(
  profile: ChildProfile,
  limit: number = 10,
): ExtendedJuniorActivity[] {
  const tier = profile.tier ?? 'starter';
  const recentIds = new Set(profile.recentActivityIds ?? []);

  // Tier filter
  const tierAllowed: Set<string> = new Set(['starter']);
  if (tier === 'core' || tier === 'pro') tierAllowed.add('core');
  if (tier === 'pro') tierAllowed.add('pro');

  const scored = ALL_JUNIOR_ACTIVITIES
    .filter((a) => tierAllowed.has(a.tier))
    .map((activity) => {
      let score = 0;

      // Age match (required — filter out non-matching)
      const [ageMin, ageMax] = levelToAgeRange(activity.level);
      if (profile.age < ageMin - 1 || profile.age > ageMax + 1) {
        return { activity, score: -1 };
      }
      // Perfect age match bonus
      if (profile.age >= ageMin && profile.age <= ageMax) {
        score += 10;
      } else {
        score += 5; // Within tolerance
      }

      // Focus area match (high weight)
      if (profile.focusAreas?.includes(activity.skillType)) {
        score += 20;
      }

      // Skill level match
      const currentLevel = profile.skillLevels?.[activity.skillType];
      if (currentLevel !== undefined) {
        if (activity.level === currentLevel) {
          score += 15; // At current level — reinforcement
        } else if (activity.level === currentLevel + 1) {
          score += 12; // Just above current — zone of proximal development
        } else if (activity.level < currentLevel) {
          score += 5; // Below current — easy win / maintenance
        } else {
          score += 2; // Far above — stretch goal
        }
      } else {
        score += 8; // No data — moderate recommendation
      }

      // Recency penalty
      if (recentIds.has(activity.id)) {
        score -= 25; // Strong penalty for recently completed
      }

      // Unlocked bonus
      if (activity.unlocked) {
        score += 3;
      }

      // Voice-ready bonus (engagement)
      if (activity.voiceReady) {
        score += 2;
      }

      return { activity, score };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => item.activity);
}

// =============================================================================
// Statistics
// =============================================================================

export interface ActivityCounts {
  total: number;
  bySkillType: Record<string, number>;
  byDifficulty: Record<Difficulty, number>;
  byTier: Record<string, number>;
  byTrack: Record<string, number>;
}

/**
 * Get summary statistics about the activity library.
 */
export function getActivityCounts(): ActivityCounts {
  const bySkillType: Record<string, number> = {};
  const byDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const byTier: Record<string, number> = {};
  const byTrack: Record<string, number> = {};

  for (const activity of ALL_JUNIOR_ACTIVITIES) {
    // Skill type
    bySkillType[activity.skillType] = (bySkillType[activity.skillType] ?? 0) + 1;

    // Difficulty
    const diff = levelToDifficulty(activity.level);
    byDifficulty[diff] += 1;

    // Tier
    byTier[activity.tier] = (byTier[activity.tier] ?? 0) + 1;

    // Track
    byTrack[activity.track] = (byTrack[activity.track] ?? 0) + 1;
  }

  return {
    total: ALL_JUNIOR_ACTIVITIES.length,
    bySkillType,
    byDifficulty,
    byTier,
    byTrack,
  };
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ExtendedJuniorActivity, ExtendedSkillType, Difficulty, ChildProfile };
export { SPEECH_ACTIVITIES } from './junior-activities-speech';
export { SOCIAL_ACTIVITIES } from './junior-activities-social';
export { SENSORY_ACTIVITIES } from './junior-activities-sensory';
export { EXECUTIVE_ACTIVITIES } from './junior-activities-executive';
export { MOTOR_ACTIVITIES } from './junior-activities-motor';
export { COGNITIVE_ACTIVITIES } from './junior-activities-cognitive';
export { DAILY_LIVING_ACTIVITIES } from './junior-activities-daily-living';
export { EMOTIONAL_ACTIVITIES } from './junior-activities-emotional';
