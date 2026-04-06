// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Parent Focus Bridge — Parent → Child Data Flow
 *
 * Accepts parent-set focus areas and therapist-set goals, converts them
 * into Junior activity weights, integrates with the ML-adaptive difficulty
 * system, and manages session/sensory configuration per child.
 *
 * This module sits BETWEEN the parent's Ask Aminy chat / settings UI
 * and Junior's activity recommender. It translates human intentions
 * ("work on 'r' sounds", "keep it easy this week") into machine-readable
 * activity weights, difficulty ceilings, and session constraints.
 *
 * Architecture:
 *   ParentFocusBridge (class, singleton)
 *     - setParentFocusArea(childId, domain, goals, priority)
 *     - setTherapistGoals(childId, goals) — from care plans
 *     - getActivityWeights(childId) → weighted domain map for recommender
 *     - setDifficultyCeiling(childId, ceiling, reason)
 *     - setSessionConstraints(childId, constraints)
 *     - getSensoryLimits(childId) → SensoryLimits
 *     - getRecommendedActivities(childId) → ranked activity IDs
 *
 * Integrates with:
 *   - parent-junior-bridge.ts (setFocusAreas, setJuniorDifficultyFromParent)
 *   - useAdaptiveDifficulty.ts (difficulty levels)
 *   - junior-content-service.ts (activity catalog)
 *   - ai-care-plan-generator.ts (therapist goals from care plans)
 */

import { supabase } from '../utils/supabase/client';
import {
  setFocusAreas,
  getFocusAreas,
  setJuniorDifficultyFromParent,
  getJuniorDifficultyOverrides,
  addJuniorAvoidanceTrigger,
  getJuniorAvoidanceTriggers,
  type FocusArea,
  type FocusDomain,
  type DifficultyLevel,
} from './parent-junior-bridge';
import { getActivitiesSync, type JuniorActivity } from './junior-content-service';

// ============================================================================
// Types
// ============================================================================

export interface ActivityWeight {
  domain: FocusDomain;
  /** Multiplier applied to recommendation scoring. 1.0 = normal, 3.0 = high priority */
  weight: number;
  /** Why this weight was set */
  reason: string;
}

export interface DifficultyCeiling {
  /** Maximum difficulty level (0-3). Adaptive system won't exceed this. */
  maxLevel: 0 | 1 | 2 | 3;
  /** Optional per-domain overrides */
  domainOverrides: Map<FocusDomain, 0 | 1 | 2 | 3>;
  /** When this ceiling was set */
  setAt: string;
  /** Why — e.g., "keep it easy this week, he's stressed" */
  reason: string;
  /** When to automatically lift the ceiling (null = indefinite until parent changes) */
  expiresAt: string | null;
}

export interface SessionConstraints {
  /** Max minutes per session */
  maxSessionMinutes: number;
  /** Max total minutes per day */
  maxDailyMinutes: number;
  /** Minimum break between activities (seconds) */
  breakBetweenActivities: number;
  /** How many activities before a mandatory break */
  activitiesBeforeBreak: number;
  /** Sensory load limit per session */
  sensoryLoadLimit: 'low' | 'moderate' | 'high';
}

export interface SensoryLimits {
  /** Maximum concurrent sensory channels (audio + visual + haptic) */
  maxChannels: number;
  /** Whether audio should be muted or reduced */
  audioMode: 'full' | 'reduced' | 'muted';
  /** Whether animations should be reduced */
  reduceMotion: boolean;
  /** Whether to use muted color palette */
  mutedColors: boolean;
  /** Whether to increase touch target sizes */
  enlargeTargets: boolean;
  /** Whether to show visual timers for transitions */
  showTimers: boolean;
}

export interface RecommendedActivity {
  activity: JuniorActivity;
  score: number;
  reasons: string[];
}

export interface TherapistGoal {
  domain: FocusDomain;
  goalText: string;
  targetMetric?: string;
  source: 'care_plan' | 'provider_note' | 'manual';
  providerId?: string;
  providerRole?: string;
  setAt: string;
}

export interface ChildFocusProfile {
  childId: string;
  activityWeights: ActivityWeight[];
  difficultyCeiling: DifficultyCeiling | null;
  sessionConstraints: SessionConstraints;
  sensoryLimits: SensoryLimits;
  therapistGoals: TherapistGoal[];
  lastUpdated: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_PREFIX = 'aminy-parent-focus-';

const DEFAULT_SESSION_CONSTRAINTS: SessionConstraints = {
  maxSessionMinutes: 15,
  maxDailyMinutes: 45,
  breakBetweenActivities: 30,
  activitiesBeforeBreak: 3,
  sensoryLoadLimit: 'moderate',
};

const DEFAULT_SENSORY_LIMITS: SensoryLimits = {
  maxChannels: 3,
  audioMode: 'full',
  reduceMotion: false,
  mutedColors: false,
  enlargeTargets: false,
  showTimers: false,
};

const ALL_DOMAINS: FocusDomain[] = ['speech', 'social', 'regulation', 'routines', 'sensory', 'executive', 'aac'];

const PRIORITY_WEIGHTS: Record<string, number> = {
  high: 3.0,
  medium: 2.0,
  low: 1.0,
};

// ============================================================================
// Cache Helpers
// ============================================================================

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch { /* storage full or blocked */ }
}

// ============================================================================
// ParentFocusBridge Class
// ============================================================================

export class ParentFocusBridge {

  // ==========================================================================
  // Focus Area Management
  // ==========================================================================

  /**
   * Parent sets or updates a focus area for a child.
   * This is the primary way parents communicate "work on this" to Junior.
   */
  setParentFocusArea(
    childId: string,
    domain: FocusDomain,
    goals: string[],
    priority: 'high' | 'medium' | 'low' = 'medium',
  ): void {
    const existing = getFocusAreas(childId);

    // Update existing or add new
    const idx = existing.findIndex(a => a.domain === domain && a.setBy === 'parent');
    const area: FocusArea = {
      domain,
      goals,
      priority,
      setBy: 'parent',
    };

    if (idx >= 0) {
      existing[idx] = area;
    } else {
      existing.push(area);
    }

    // Persist via the parent-junior-bridge (which stores in localStorage + MemoryFacts)
    setFocusAreas(childId, existing);

    // Also persist to Supabase for cross-device sync
    this.persistFocusToSupabase(childId, existing).catch(err =>
      console.warn('[ParentFocusBridge] Supabase sync failed:', err)
    );
  }

  /**
   * Remove a parent-set focus area for a domain.
   */
  removeParentFocusArea(childId: string, domain: FocusDomain): void {
    const existing = getFocusAreas(childId);
    const filtered = existing.filter(a => !(a.domain === domain && a.setBy === 'parent'));
    setFocusAreas(childId, filtered);
    this.persistFocusToSupabase(childId, filtered).catch(() => {});
  }

  // ==========================================================================
  // Therapist Goal Integration
  // ==========================================================================

  /**
   * Import goals from a therapist's care plan into Junior's recommendation engine.
   * Called when a care plan is generated or updated.
   */
  setTherapistGoals(childId: string, goals: TherapistGoal[]): void {
    // Store therapist goals locally
    writeStore(`therapist-goals-${childId}`, goals);

    // Convert therapist goals into focus areas tagged as provider-set
    const existing = getFocusAreas(childId);
    const parentAreas = existing.filter(a => a.setBy === 'parent');

    const providerAreas: FocusArea[] = goals.map(g => ({
      domain: g.domain,
      goals: [g.goalText],
      priority: 'high' as const, // Therapist goals are always high priority
      setBy: 'provider' as const,
      providerRole: g.providerRole,
    }));

    // Merge: group by domain, combine goals
    const mergedProviderAreas: FocusArea[] = [];
    const domainMap = new Map<FocusDomain, FocusArea>();

    providerAreas.forEach(area => {
      const existing = domainMap.get(area.domain);
      if (existing) {
        existing.goals = [...new Set([...existing.goals, ...area.goals])];
      } else {
        domainMap.set(area.domain, { ...area });
      }
    });

    domainMap.forEach(area => mergedProviderAreas.push(area));

    // Combine parent + provider areas
    setFocusAreas(childId, [...parentAreas, ...mergedProviderAreas]);
  }

  /**
   * Get therapist goals for a child.
   */
  getTherapistGoals(childId: string): TherapistGoal[] {
    return readStore<TherapistGoal[]>(`therapist-goals-${childId}`, []);
  }

  // ==========================================================================
  // Activity Weights (for Recommender)
  // ==========================================================================

  /**
   * Compute activity weights based on focus areas.
   * When parent says "focus on speech", speech activities get 3x priority weight.
   * When therapist sets goals for social skills, social activities get boosted.
   */
  getActivityWeights(childId: string): ActivityWeight[] {
    const focusAreas = getFocusAreas(childId);
    const weights: ActivityWeight[] = [];

    // Start with baseline weight of 1.0 for all domains
    const weightMap = new Map<FocusDomain, { weight: number; reasons: string[] }>();
    ALL_DOMAINS.forEach(d => weightMap.set(d, { weight: 1.0, reasons: [] }));

    // Apply focus area weights
    focusAreas.forEach(area => {
      const current = weightMap.get(area.domain)!;
      const multiplier = PRIORITY_WEIGHTS[area.priority] || 1.0;

      // Provider goals get an additional 0.5x boost
      const providerBonus = area.setBy === 'provider' ? 0.5 : 0;
      current.weight = Math.max(current.weight, multiplier + providerBonus);

      const source = area.setBy === 'provider'
        ? `Therapist goal${area.providerRole ? ` (${area.providerRole})` : ''}`
        : 'Parent focus area';
      current.reasons.push(`${source}: ${area.goals.join(', ')} (${area.priority})`);
    });

    // Apply avoidance triggers — reduce weight for avoided domains
    const triggers = getJuniorAvoidanceTriggers(childId);
    triggers.forEach(trigger => {
      // Map trigger text to domains if possible
      const lowerTrigger = trigger.trigger.toLowerCase();
      ALL_DOMAINS.forEach(domain => {
        if (lowerTrigger.includes(domain)) {
          const current = weightMap.get(domain)!;
          current.weight *= 0.3; // Reduce to 30%
          current.reasons.push(`Avoidance trigger: "${trigger.trigger}"`);
        }
      });
    });

    // Build final weights array
    weightMap.forEach((value, domain) => {
      weights.push({
        domain,
        weight: Math.round(value.weight * 10) / 10,
        reason: value.reasons.join('; ') || 'Default baseline',
      });
    });

    return weights;
  }

  // ==========================================================================
  // Difficulty Ceiling
  // ==========================================================================

  /**
   * Set a global difficulty ceiling.
   * When parent says "keep it easy this week", the ML system won't go above this level.
   */
  setDifficultyCeiling(
    childId: string,
    maxLevel: 0 | 1 | 2 | 3,
    reason: string,
    expiresInDays?: number,
  ): void {
    const ceiling: DifficultyCeiling = {
      maxLevel,
      domainOverrides: new Map(),
      setAt: new Date().toISOString(),
      reason,
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
    };

    writeStore(`difficulty-ceiling-${childId}`, {
      ...ceiling,
      domainOverrides: Object.fromEntries(ceiling.domainOverrides),
    });

    // Apply as difficulty overrides for each domain
    ALL_DOMAINS.forEach(domain => {
      const levelStr: DifficultyLevel = maxLevel <= 1 ? 'easier' : maxLevel >= 3 ? 'harder' : 'same';
      setJuniorDifficultyFromParent(childId, domain, levelStr, reason);
    });
  }

  /**
   * Set difficulty ceiling for a specific domain.
   */
  setDomainDifficultyCeiling(
    childId: string,
    domain: FocusDomain,
    maxLevel: 0 | 1 | 2 | 3,
    reason: string,
  ): void {
    const levelStr: DifficultyLevel = maxLevel <= 1 ? 'easier' : maxLevel >= 3 ? 'harder' : 'same';
    setJuniorDifficultyFromParent(childId, domain, levelStr, reason);
  }

  /**
   * Get current difficulty ceiling for a child.
   * Returns null if no ceiling is set or it has expired.
   */
  getDifficultyCeiling(childId: string): DifficultyCeiling | null {
    const raw = readStore<Record<string, unknown> | null>(`difficulty-ceiling-${childId}`, null);
    if (!raw) return null;

    // Check expiry
    if (raw.expiresAt && new Date(raw.expiresAt as string) < new Date()) {
      // Expired — clear it
      writeStore(`difficulty-ceiling-${childId}`, null);
      return null;
    }

    return {
      maxLevel: raw.maxLevel as 0 | 1 | 2 | 3,
      domainOverrides: new Map(Object.entries(raw.domainOverrides as Record<string, number> || {})) as Map<FocusDomain, 0 | 1 | 2 | 3>,
      setAt: raw.setAt as string,
      reason: raw.reason as string,
      expiresAt: (raw.expiresAt as string) || null,
    };
  }

  /**
   * Remove the difficulty ceiling (return to adaptive mode).
   */
  clearDifficultyCeiling(childId: string): void {
    writeStore(`difficulty-ceiling-${childId}`, null);
  }

  // ==========================================================================
  // Session Constraints
  // ==========================================================================

  /**
   * Parent sets session constraints: duration limits, break frequency, etc.
   */
  setSessionConstraints(childId: string, constraints: Partial<SessionConstraints>): void {
    const current = this.getSessionConstraints(childId);
    const merged: SessionConstraints = { ...current, ...constraints };
    writeStore(`session-constraints-${childId}`, merged);

    // Persist to Supabase
    this.persistConstraintsToSupabase(childId, merged).catch(() => {});
  }

  /**
   * Get session constraints for a child.
   */
  getSessionConstraints(childId: string): SessionConstraints {
    return readStore<SessionConstraints>(
      `session-constraints-${childId}`,
      DEFAULT_SESSION_CONSTRAINTS,
    );
  }

  // ==========================================================================
  // Sensory Limits
  // ==========================================================================

  /**
   * Parent configures sensory limits per child.
   * e.g., "William needs low sensory, Eddie is fine with standard"
   */
  setSensoryLimits(childId: string, limits: Partial<SensoryLimits>): void {
    const current = this.getSensoryLimits(childId);
    const merged: SensoryLimits = { ...current, ...limits };
    writeStore(`sensory-limits-${childId}`, merged);
  }

  /**
   * Get sensory limits for a child. Falls back to defaults.
   */
  getSensoryLimits(childId: string): SensoryLimits {
    return readStore<SensoryLimits>(
      `sensory-limits-${childId}`,
      DEFAULT_SENSORY_LIMITS,
    );
  }

  /**
   * Apply a predefined sensory profile.
   * Shorthand for parents: "set low sensory mode for William"
   */
  applySensoryProfile(childId: string, profile: 'low' | 'moderate' | 'high'): void {
    const profiles: Record<string, SensoryLimits> = {
      low: {
        maxChannels: 1,
        audioMode: 'reduced',
        reduceMotion: true,
        mutedColors: true,
        enlargeTargets: true,
        showTimers: true,
      },
      moderate: {
        maxChannels: 2,
        audioMode: 'reduced',
        reduceMotion: false,
        mutedColors: false,
        enlargeTargets: true,
        showTimers: true,
      },
      high: DEFAULT_SENSORY_LIMITS,
    };

    this.setSensoryLimits(childId, profiles[profile]);
  }

  // ==========================================================================
  // Activity Recommendation Engine
  // ==========================================================================

  /**
   * Get recommended activities ranked by focus areas, weights, difficulty,
   * avoidance triggers, and recent progress.
   *
   * This is what Junior calls on the activity selection screen.
   */
  getRecommendedActivities(
    childId: string,
    limit: number = 10,
  ): RecommendedActivity[] {
    const weights = this.getActivityWeights(childId);
    const ceiling = this.getDifficultyCeiling(childId);
    const constraints = this.getSessionConstraints(childId);
    const triggers = getJuniorAvoidanceTriggers(childId);
    const overrides = getJuniorDifficultyOverrides(childId);
    const allActivities = getActivitiesSync();

    // Build avoidance keyword set
    const avoidKeywords = new Set(
      triggers.map(t => t.trigger.toLowerCase())
    );

    // Score each activity
    const scored: RecommendedActivity[] = allActivities.map(activity => {
      let score = 1.0;
      const reasons: string[] = [];

      // 1. Apply domain weight
      const domainWeight = weights.find(w => w.domain === activity.skillType as FocusDomain);
      if (domainWeight) {
        score *= domainWeight.weight;
        if (domainWeight.weight > 1.0) {
          reasons.push(`Focus area: ${formatDomain(activity.skillType)} (${domainWeight.weight}x weight)`);
        }
      }

      // 2. Apply difficulty ceiling
      if (ceiling && activity.level > ceiling.maxLevel) {
        score *= 0.1; // Heavily penalize above-ceiling activities
        reasons.push(`Above difficulty ceiling (max: ${ceiling.maxLevel})`);
      }

      // 3. Apply per-domain difficulty overrides
      const domainOverride = overrides.find(o => o.domain === activity.skillType);
      if (domainOverride) {
        if (domainOverride.level === 'easier' && activity.level >= 2) {
          score *= 0.3;
          reasons.push(`Domain set to easier`);
        } else if (domainOverride.level === 'harder' && activity.level <= 1) {
          score *= 0.5;
          reasons.push(`Domain set to harder — prioritizing advanced`);
        }
      }

      // 4. Check avoidance triggers against activity description
      const descLower = (activity.description + ' ' + activity.title + ' ' + activity.track).toLowerCase();
      let avoided = false;
      avoidKeywords.forEach(keyword => {
        if (descLower.includes(keyword)) {
          score *= 0.05; // Nearly eliminate avoided activities
          reasons.push(`Matches avoidance trigger: "${keyword}"`);
          avoided = true;
        }
      });

      // 5. Sensory load matching
      if (constraints.sensoryLoadLimit === 'low') {
        // Prefer micro and standard session sizes, penalize extended
        if (activity.sessionSize === 'extended') {
          score *= 0.4;
          reasons.push('Long session — low sensory mode active');
        }
        if (activity.sessionSize === 'micro') {
          score *= 1.5;
          reasons.push('Short session — good for low sensory mode');
        }
      }

      // 6. Boost unlocked activities
      if (activity.unlocked) {
        score *= 1.2;
        reasons.push('Already unlocked');
      }

      // 7. Voice-ready bonus for speech domain focus
      const speechFocus = weights.find(w => w.domain === 'speech');
      if (speechFocus && speechFocus.weight > 1.5 && activity.voiceReady) {
        score *= 1.3;
        reasons.push('Voice-ready activity (speech focus active)');
      }

      return { activity, score, reasons };
    });

    // Sort by score descending, return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ==========================================================================
  // Full Profile
  // ==========================================================================

  /**
   * Get the complete focus profile for a child.
   * Useful for the parent settings screen or AI context.
   */
  getChildFocusProfile(childId: string): ChildFocusProfile {
    return {
      childId,
      activityWeights: this.getActivityWeights(childId),
      difficultyCeiling: this.getDifficultyCeiling(childId),
      sessionConstraints: this.getSessionConstraints(childId),
      sensoryLimits: this.getSensoryLimits(childId),
      therapistGoals: this.getTherapistGoals(childId),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Build an AI-readable summary of the focus profile.
   * Injected into Ask Aminy context so the AI can reference settings.
   */
  buildAIContextSummary(childId: string, childName: string): string {
    const profile = this.getChildFocusProfile(childId);
    const parts: string[] = [];

    parts.push(`**Parent Settings for ${childName}'s Junior:**`);

    // Activity weights (only non-default)
    const boosted = profile.activityWeights.filter(w => w.weight > 1.0);
    if (boosted.length > 0) {
      parts.push('Focus areas (prioritized):');
      boosted.forEach(w => {
        parts.push(`  - ${formatDomain(w.domain)}: ${w.weight}x priority — ${w.reason}`);
      });
    }

    // Difficulty ceiling
    if (profile.difficultyCeiling) {
      parts.push(`Difficulty ceiling: Level ${profile.difficultyCeiling.maxLevel} max (reason: ${profile.difficultyCeiling.reason})${profile.difficultyCeiling.expiresAt ? ` — expires ${new Date(profile.difficultyCeiling.expiresAt).toLocaleDateString()}` : ''}`);
    }

    // Session constraints
    const c = profile.sessionConstraints;
    parts.push(`Session limits: ${c.maxSessionMinutes} min/session, ${c.maxDailyMinutes} min/day, break every ${c.activitiesBeforeBreak} activities, sensory: ${c.sensoryLoadLimit}`);

    // Sensory mode
    const s = profile.sensoryLimits;
    if (s.reduceMotion || s.mutedColors || s.enlargeTargets) {
      const modes = [];
      if (s.reduceMotion) modes.push('reduced motion');
      if (s.mutedColors) modes.push('muted colors');
      if (s.enlargeTargets) modes.push('larger targets');
      if (s.audioMode !== 'full') modes.push(`audio: ${s.audioMode}`);
      parts.push(`Sensory accommodations: ${modes.join(', ')}`);
    }

    // Therapist goals
    if (profile.therapistGoals.length > 0) {
      parts.push('Therapist-set goals:');
      profile.therapistGoals.forEach(g => {
        parts.push(`  - ${formatDomain(g.domain)}: ${g.goalText}${g.providerRole ? ` (${g.providerRole})` : ''}`);
      });
    }

    return parts.join('\n');
  }

  // ==========================================================================
  // Supabase Persistence
  // ==========================================================================

  private async persistFocusToSupabase(childId: string, areas: FocusArea[]): Promise<void> {
    try {
      await supabase.from('junior_focus_areas').upsert(
        areas.map(a => ({
          child_id: childId,
          domain: a.domain,
          goals: a.goals,
          priority: a.priority,
          set_by: a.setBy,
          provider_role: a.providerRole || null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'child_id,domain,set_by' },
      );
    } catch (err) {
      console.warn('[ParentFocusBridge] Focus area Supabase sync failed:', err);
    }
  }

  private async persistConstraintsToSupabase(childId: string, constraints: SessionConstraints): Promise<void> {
    try {
      await supabase.from('junior_session_constraints').upsert({
        child_id: childId,
        max_session_minutes: constraints.maxSessionMinutes,
        max_daily_minutes: constraints.maxDailyMinutes,
        break_between_activities: constraints.breakBetweenActivities,
        activities_before_break: constraints.activitiesBeforeBreak,
        sensory_load_limit: constraints.sensoryLoadLimit,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'child_id' });
    } catch (err) {
      console.warn('[ParentFocusBridge] Constraints Supabase sync failed:', err);
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatDomain(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _bridge: ParentFocusBridge | null = null;

export function getParentFocusBridge(): ParentFocusBridge {
  if (!_bridge) _bridge = new ParentFocusBridge();
  return _bridge;
}

export default ParentFocusBridge;
