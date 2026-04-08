// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useAdaptiveDifficulty — ML-adaptive difficulty hook
 *
 * Tracks accuracy over the last 10 attempts per skill domain.
 * Uses a sigmoid threshold to auto-adjust level:
 *   - >80% accuracy over 10 attempts → level up
 *   - <50% accuracy over 10 attempts → level down
 *
 * Data is persisted to Supabase `junior_difficulty_history` table
 * with localStorage as offline cache.
 *
 * Replaces the existing rule-based level 0-3 system with data-driven
 * progression that adapts to each child's actual performance.
 *
 * Usage:
 *   const adaptive = useAdaptiveDifficulty('child-123', 'parent-uuid', 'speech');
 *   adaptive.recordAttempt(true);  // correct
 *   adaptive.recordAttempt(false); // incorrect
 *   // adaptive.currentLevel  → 0 | 1 | 2 | 3
 *   // adaptive.accuracy      → 0.0 - 1.0
 *   // adaptive.shouldLevelUp → boolean
 *   // adaptive.shouldLevelDown → boolean
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase/client';

// =============================================================================
// Types
// =============================================================================

export type SkillDomain = 'speech' | 'social' | 'routines' | 'sensory' | 'executive' | 'aac';

interface AttemptRecord {
  correct: boolean;
  levelAtTime: number;
  recordedAt: string;
}

interface DomainState {
  attempts: AttemptRecord[];
  currentLevel: number;
}

export interface AdaptiveDifficultyState {
  /** Current difficulty level (0-3) for this domain */
  currentLevel: 0 | 1 | 2 | 3;
  /** Rolling accuracy over last 10 attempts (0.0 - 1.0) */
  accuracy: number;
  /** True when accuracy > 80% over 10+ attempts — ready for harder content */
  shouldLevelUp: boolean;
  /** True when accuracy < 50% over 10+ attempts — should simplify */
  shouldLevelDown: boolean;
  /** Total attempts recorded for this domain */
  totalAttempts: number;
  /** Record a new attempt result */
  recordAttempt: (correct: boolean) => Promise<void>;
  /** Force level to a specific value (parent/therapist override) */
  setLevel: (level: 0 | 1 | 2 | 3) => void;
  /** True while initial data is loading */
  loading: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const WINDOW_SIZE = 10;           // Number of attempts for rolling accuracy
const LEVEL_UP_THRESHOLD = 0.80;  // 80% accuracy → level up
const LEVEL_DOWN_THRESHOLD = 0.50;// 50% accuracy → level down
const MIN_LEVEL = 0;
const MAX_LEVEL = 3;
const CACHE_PREFIX = 'aminy-adaptive-difficulty-';

// =============================================================================
// Sigmoid helper — smooth transition probability
// =============================================================================

/**
 * Sigmoid function mapping accuracy to a 0-1 "readiness" score.
 * At accuracy = threshold, output = 0.5.
 * Steepness controls how sharp the transition is.
 */
function sigmoid(accuracy: number, threshold: number, steepness: number = 20): number {
  return 1 / (1 + Math.exp(-steepness * (accuracy - threshold)));
}

// =============================================================================
// Cache helpers
// =============================================================================

function getCacheKey(childId: string, domain: SkillDomain): string {
  return `${CACHE_PREFIX}${childId}-${domain}`;
}

function readDomainCache(childId: string, domain: SkillDomain): DomainState | null {
  try {
    const raw = localStorage.getItem(getCacheKey(childId, domain));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDomainCache(childId: string, domain: SkillDomain, state: DomainState): void {
  try {
    localStorage.setItem(getCacheKey(childId, domain), JSON.stringify(state));
  } catch {
    // Storage full or blocked
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAdaptiveDifficulty(
  childId: string | undefined,
  parentId: string | undefined,
  domain: SkillDomain,
): AdaptiveDifficultyState {
  const [domainState, setDomainState] = useState<DomainState>({
    attempts: [],
    currentLevel: 0,
  });
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // -------------------------------------------------------------------------
  // Load history from Supabase + localStorage fallback
  // -------------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    async function loadHistory() {
      if (!childId) {
        setLoading(false);
        return;
      }

      // Try localStorage cache first for instant render
      const cached = readDomainCache(childId, domain);
      if (cached) {
        setDomainState(cached);
      }

      // Then try Supabase for latest data
      if (parentId) {
        try {
          const { data, error } = await supabase
            .from('junior_difficulty_history')
            .select('correct, level_at_time, recorded_at')
            .eq('child_id', childId)
            .eq('skill_domain', domain)
            .order('recorded_at', { ascending: false })
            .limit(50);

          if (!error && data && data.length > 0 && isMounted.current) {
            const attempts: AttemptRecord[] = data
              .reverse()
              .map((row: Record<string, unknown>) => ({
                correct: row.correct as boolean,
                levelAtTime: (row.level_at_time as number) || 0,
                recordedAt: row.recorded_at as string,
              }));

            // Derive current level from the most recent attempt's level
            const lastLevel = attempts[attempts.length - 1]?.levelAtTime ?? 0;
            const state: DomainState = {
              attempts,
              currentLevel: Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, lastLevel)) as number,
            };

            setDomainState(state);
            writeDomainCache(childId, domain, state);
          }
        } catch (err) {
          console.warn(`[AdaptiveDifficulty] Supabase load failed for ${domain}:`, err);
          // Keep using cached data
        }
      }

      if (isMounted.current) setLoading(false);
    }

    loadHistory();

    return () => {
      isMounted.current = false;
    };
  }, [childId, parentId, domain]);

  // -------------------------------------------------------------------------
  // Computed values from rolling window
  // -------------------------------------------------------------------------
  const recentAttempts = domainState.attempts.slice(-WINDOW_SIZE);
  const totalAttempts = domainState.attempts.length;

  const accuracy = recentAttempts.length > 0
    ? recentAttempts.filter(a => a.correct).length / recentAttempts.length
    : 0;

  const hasEnoughData = recentAttempts.length >= WINDOW_SIZE;

  // Sigmoid-smoothed readiness scores
  const levelUpReadiness = sigmoid(accuracy, LEVEL_UP_THRESHOLD);
  const levelDownReadiness = sigmoid(1 - accuracy, 1 - LEVEL_DOWN_THRESHOLD);

  const shouldLevelUp = hasEnoughData
    && levelUpReadiness > 0.5
    && domainState.currentLevel < MAX_LEVEL;

  const shouldLevelDown = hasEnoughData
    && levelDownReadiness > 0.5
    && domainState.currentLevel > MIN_LEVEL;

  // -------------------------------------------------------------------------
  // Record a new attempt
  // -------------------------------------------------------------------------
  const recordAttempt = useCallback(async (correct: boolean) => {
    if (!childId) return;

    const newAttempt: AttemptRecord = {
      correct,
      levelAtTime: domainState.currentLevel,
      recordedAt: new Date().toISOString(),
    };

    // Compute new level based on updated attempts
    const updatedAttempts = [...domainState.attempts, newAttempt];
    const recent = updatedAttempts.slice(-WINDOW_SIZE);
    const newAccuracy = recent.length > 0
      ? recent.filter(a => a.correct).length / recent.length
      : 0;
    const enoughData = recent.length >= WINDOW_SIZE;

    let newLevel = domainState.currentLevel;

    if (enoughData) {
      const upReady = sigmoid(newAccuracy, LEVEL_UP_THRESHOLD);
      const downReady = sigmoid(1 - newAccuracy, 1 - LEVEL_DOWN_THRESHOLD);

      if (upReady > 0.5 && newLevel < MAX_LEVEL) {
        newLevel = (newLevel + 1) as 0 | 1 | 2 | 3;
      } else if (downReady > 0.5 && newLevel > MIN_LEVEL) {
        newLevel = (newLevel - 1) as 0 | 1 | 2 | 3;
      }
    }

    // Update the attempt's level to reflect auto-adjustment
    newAttempt.levelAtTime = newLevel;

    const newState: DomainState = {
      attempts: updatedAttempts.slice(-50), // Keep last 50 for history
      currentLevel: newLevel,
    };

    setDomainState(newState);
    writeDomainCache(childId, domain, newState);

    // Persist to Supabase (fire-and-forget for snappy UX)
    if (parentId) {
      supabase
        .from('junior_difficulty_history')
        .insert({
          child_id: childId,
          parent_id: parentId,
          skill_domain: domain,
          correct,
          level_at_time: newLevel,
        })
        .then(({ error }) => {
          if (error) {
            console.warn(`[AdaptiveDifficulty] Failed to persist attempt for ${domain}:`, error);
          }
        });
    }
  }, [childId, parentId, domain, domainState]);

  // -------------------------------------------------------------------------
  // Manual level override
  // -------------------------------------------------------------------------
  const setLevel = useCallback((level: 0 | 1 | 2 | 3) => {
    if (!childId) return;

    const newState: DomainState = {
      ...domainState,
      currentLevel: level,
    };

    setDomainState(newState);
    writeDomainCache(childId, domain, newState);
  }, [childId, domain, domainState]);

  return {
    currentLevel: domainState.currentLevel as 0 | 1 | 2 | 3,
    accuracy,
    shouldLevelUp,
    shouldLevelDown,
    totalAttempts,
    recordAttempt,
    setLevel,
    loading,
  };
}

export default useAdaptiveDifficulty;
