/**
 * Extended Junior Activity Type Definitions
 *
 * Extends the base JuniorActivity from junior-content-service.ts with
 * additional skill types for comprehensive neurodivergent support:
 *   - motor: fine motor, gross motor, visual-motor, handwriting prep
 *   - cognitive: matching, sorting, pattern recognition, problem solving
 *   - emotional: zones of regulation, coping skills, self-advocacy
 *   - daily-living: self-care, kitchen skills, safety, community skills
 *
 * These new skill types supplement the existing:
 *   speech, social, routines, sensory, executive, aac
 *
 * The base JuniorActivity type uses a narrow skillType union.
 * ExtendedJuniorActivity widens skillType to include the new domains
 * while keeping all other fields identical.
 */

import type { JuniorActivity } from '../lib/junior-content-service';

/** All skill type values (base + extended) */
export type ExtendedSkillType =
  | 'speech'
  | 'social'
  | 'routines'
  | 'sensory'
  | 'executive'
  | 'aac'
  | 'motor'
  | 'cognitive'
  | 'emotional'
  | 'daily-living';

/**
 * Extended Junior Activity — same shape as JuniorActivity but with
 * additional skillType options for motor, cognitive, emotional, and daily-living.
 */
export interface ExtendedJuniorActivity extends Omit<JuniorActivity, 'skillType'> {
  skillType: ExtendedSkillType;
}

/**
 * Age range tuple for activity filtering.
 * [minYears, maxYears] inclusive.
 */
export type AgeRange = [number, number];

/**
 * Difficulty mapped from level numbers:
 *   0 = easy, 1 = medium, 2 = hard, 3 = hard
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Child profile for recommendation engine.
 */
export interface ChildProfile {
  /** Child's age in years */
  age: number;
  /** Skill areas the child needs most help with */
  focusAreas?: ExtendedSkillType[];
  /** Current skill levels by domain (0-3) */
  skillLevels?: Partial<Record<ExtendedSkillType, 0 | 1 | 2 | 3>>;
  /** IDs of recently completed activities (to avoid repetition) */
  recentActivityIds?: string[];
  /** Subscription tier */
  tier?: 'starter' | 'core' | 'pro';
}

/**
 * Map difficulty string to level numbers.
 */
export function difficultyToLevels(difficulty: Difficulty): (0 | 1 | 2 | 3)[] {
  switch (difficulty) {
    case 'easy':
      return [0];
    case 'medium':
      return [1];
    case 'hard':
      return [2, 3];
  }
}

/**
 * Map level number to difficulty string.
 */
export function levelToDifficulty(level: 0 | 1 | 2 | 3): Difficulty {
  if (level === 0) return 'easy';
  if (level === 1) return 'medium';
  return 'hard';
}

/**
 * Map level number to approximate age range.
 */
export function levelToAgeRange(level: 0 | 1 | 2 | 3): AgeRange {
  switch (level) {
    case 0:
      return [2, 5];
    case 1:
      return [4, 7];
    case 2:
      return [6, 10];
    case 3:
      return [8, 13];
  }
}
