// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useJuniorAchievements — Gamification Badge System
 *
 * Defines 16 achievement badges, tracks progress toward each,
 * persists to Supabase `junior_achievements` with localStorage fallback.
 *
 * Badge categories:
 *   - Engagement: First Word, Practice Pioneer, Session Superstar, Century Club
 *   - Consistency: Streak Master, Daily Hero, Weekend Warrior
 *   - Skills: Speech Star, Social Star, Sensory Explorer, Executive Eagle, AAC Ace
 *   - Wellness: Calm Champion, Emotion Expert
 *   - Mastery: Level Legend, Badge Collector
 *
 * Usage:
 *   const achievements = useJuniorAchievements('child-123', 'parent-uuid', progressData);
 *   achievements.checkForNewBadges();
 *   achievements.badges        → all badge definitions
 *   achievements.unlockedBadges → only unlocked ones
 *   achievements.celebrateBadge('streak-master') → returns badge data for celebration UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import type { JuniorProgressEntry, FocusDomain } from '../lib/parent-junior-bridge';

// =============================================================================
// Types
// =============================================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'engagement' | 'consistency' | 'skills' | 'wellness' | 'mastery';
  target: number;           // Number needed to unlock
  current: number;          // Current progress
  unlocked: boolean;
  unlockedAt?: string;      // ISO timestamp
}

export interface AchievementsState {
  /** All badge definitions with current progress */
  badges: Badge[];
  /** Only badges that have been unlocked */
  unlockedBadges: Badge[];
  /** Badges not yet unlocked (with progress) */
  lockedBadges: Badge[];
  /** Check progress data for newly unlocked badges. Returns array of newly unlocked badge IDs. */
  checkForNewBadges: () => string[];
  /** Get a specific badge for celebration display */
  celebrateBadge: (badgeId: string) => Badge | undefined;
  /** Manually award a badge (admin/therapist override) */
  awardBadge: (badgeId: string) => Promise<void>;
  /** Loading state */
  loading: boolean;
}

// =============================================================================
// Badge Definitions
// =============================================================================

function createBadgeDefinitions(): Omit<Badge, 'current' | 'unlocked' | 'unlockedAt'>[] {
  return [
    // --- Engagement ---
    {
      id: 'first-word',
      name: 'First Word',
      description: 'Complete your very first speech activity',
      emoji: '🎉',
      category: 'engagement',
      target: 1,
    },
    {
      id: 'practice-pioneer',
      name: 'Practice Pioneer',
      description: 'Complete 10 activities across any track',
      emoji: '🚀',
      category: 'engagement',
      target: 10,
    },
    {
      id: 'session-superstar',
      name: 'Session Superstar',
      description: 'Complete 50 total activities',
      emoji: '⭐',
      category: 'engagement',
      target: 50,
    },
    {
      id: 'century-club',
      name: 'Century Club',
      description: 'Complete 100 total activities',
      emoji: '💯',
      category: 'engagement',
      target: 100,
    },

    // --- Consistency ---
    {
      id: 'streak-master',
      name: 'Streak Master',
      description: 'Maintain a 7-day practice streak',
      emoji: '🔥',
      category: 'consistency',
      target: 7,
    },
    {
      id: 'daily-hero',
      name: 'Daily Hero',
      description: 'Practice 3 activities in one day',
      emoji: '🦸',
      category: 'consistency',
      target: 3,
    },
    {
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Practice on both Saturday and Sunday in one weekend',
      emoji: '⚔️',
      category: 'consistency',
      target: 2,
    },

    // --- Skills ---
    {
      id: 'speech-star',
      name: 'Speech Star',
      description: 'Complete 10 speech activities with 80%+ accuracy',
      emoji: '🗣️',
      category: 'skills',
      target: 10,
    },
    {
      id: 'social-star',
      name: 'Social Star',
      description: 'Complete 3 social skill activities',
      emoji: '🤝',
      category: 'skills',
      target: 3,
    },
    {
      id: 'sensory-explorer',
      name: 'Sensory Explorer',
      description: 'Complete 5 sensory activities',
      emoji: '🧩',
      category: 'skills',
      target: 5,
    },
    {
      id: 'executive-eagle',
      name: 'Executive Eagle',
      description: 'Complete 5 executive function activities',
      emoji: '🦅',
      category: 'skills',
      target: 5,
    },
    {
      id: 'aac-ace',
      name: 'AAC Ace',
      description: 'Complete 3 AAC activities',
      emoji: '💬',
      category: 'skills',
      target: 3,
    },

    // --- Wellness ---
    {
      id: 'calm-champion',
      name: 'Calm Champion',
      description: 'Use the Calm Corner 5 times',
      emoji: '💚',
      category: 'wellness',
      target: 5,
    },
    {
      id: 'emotion-expert',
      name: 'Emotion Expert',
      description: 'Complete 5 emotion/regulation activities',
      emoji: '🌈',
      category: 'wellness',
      target: 5,
    },

    // --- Mastery ---
    {
      id: 'level-legend',
      name: 'Level Legend',
      description: 'Reach level 3 in any skill domain',
      emoji: '👑',
      category: 'mastery',
      target: 3,
    },
    {
      id: 'badge-collector',
      name: 'Badge Collector',
      description: 'Unlock 10 different badges',
      emoji: '🏅',
      category: 'mastery',
      target: 10,
    },
  ];
}

// =============================================================================
// Cache helpers
// =============================================================================

const CACHE_KEY_PREFIX = 'aminy-achievements-';

function getCacheKey(childId: string): string {
  return `${CACHE_KEY_PREFIX}${childId}`;
}

function readAchievementsCache(childId: string): Badge[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(childId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAchievementsCache(childId: string, badges: Badge[]): void {
  try {
    localStorage.setItem(getCacheKey(childId), JSON.stringify(badges));
  } catch {
    // Storage full
  }
}

// =============================================================================
// Progress computation helpers
// =============================================================================

function computeStreak(entries: JuniorProgressEntry[]): number {
  if (entries.length === 0) return 0;

  const days = new Set(
    entries.map(e => new Date(e.completedAt).toDateString())
  );
  const sortedDays = Array.from(days)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDays.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    expected.setHours(0, 0, 0, 0);

    const actual = new Date(sortedDays[i]);
    actual.setHours(0, 0, 0, 0);

    if (actual.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function countActivitiesToday(entries: JuniorProgressEntry[]): number {
  const today = new Date().toDateString();
  return entries.filter(e => new Date(e.completedAt).toDateString() === today).length;
}

function hasWeekendPair(entries: JuniorProgressEntry[]): boolean {
  // Check if any week has both Saturday + Sunday
  const weekends = new Map<string, Set<number>>();
  entries.forEach(e => {
    const d = new Date(e.completedAt);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      // Get week key (Sunday of that week)
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - day);
      const key = weekStart.toDateString();
      if (!weekends.has(key)) weekends.set(key, new Set());
      weekends.get(key)!.add(day);
    }
  });
  return Array.from(weekends.values()).some(days => days.size === 2);
}

function countByDomain(entries: JuniorProgressEntry[], domain: FocusDomain): number {
  return entries.filter(e => e.domain === domain).length;
}

function countByDomainWithAccuracy(
  entries: JuniorProgressEntry[],
  domain: FocusDomain,
  minAccuracy: number,
): number {
  return entries.filter(e =>
    e.domain === domain && (e.accuracy ?? 0) >= minAccuracy
  ).length;
}

function countCalmCorner(entries: JuniorProgressEntry[]): number {
  return entries.filter(e =>
    e.domain === 'regulation' ||
    e.activityTitle.toLowerCase().includes('calm') ||
    e.activityTitle.toLowerCase().includes('breathing')
  ).length;
}

function countEmotionActivities(entries: JuniorProgressEntry[]): number {
  return entries.filter(e =>
    e.domain === 'regulation' ||
    e.domain === 'sensory' ||
    e.activityTitle.toLowerCase().includes('emotion') ||
    e.activityTitle.toLowerCase().includes('feeling')
  ).length;
}

function getMaxLevel(entries: JuniorProgressEntry[]): number {
  // Derive from prompt levels (lower prompt = higher independence = higher effective level)
  // Simple heuristic: count sessions with 80%+ accuracy at each prompt level
  const highAccSessions = entries.filter(e => (e.accuracy ?? 0) >= 80);
  if (highAccSessions.length >= 15) return 3;
  if (highAccSessions.length >= 8) return 2;
  if (highAccSessions.length >= 3) return 1;
  return 0;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useJuniorAchievements(
  childId: string | undefined,
  parentId: string | undefined,
  progressEntries: JuniorProgressEntry[],
): AchievementsState {
  const [badges, setBadges] = useState<Badge[]>(() => {
    const defs = createBadgeDefinitions();
    return defs.map(d => ({ ...d, current: 0, unlocked: false }));
  });
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // -------------------------------------------------------------------------
  // Load saved achievements from Supabase + cache
  // -------------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    async function loadSaved() {
      if (!childId) {
        setLoading(false);
        return;
      }

      // Try cache first
      const cached = readAchievementsCache(childId);
      if (cached && cached.length > 0) {
        setBadges(cached);
      }

      // Try Supabase
      if (parentId) {
        try {
          const { data, error } = await supabase
            .from('junior_achievements')
            .select('badge_id, unlocked_at, progress')
            .eq('child_id', childId);

          if (!error && data && data.length > 0 && isMounted.current) {
            const defs = createBadgeDefinitions();
            const unlockedMap = new Map(
              data.map((row: Record<string, unknown>) => [
                row.badge_id as string,
                {
                  unlockedAt: row.unlocked_at as string,
                  progress: row.progress as { current?: number },
                },
              ])
            );

            const merged: Badge[] = defs.map(d => {
              const saved = unlockedMap.get(d.id);
              return {
                ...d,
                current: saved?.progress?.current ?? 0,
                unlocked: !!saved,
                unlockedAt: saved?.unlockedAt,
              };
            });

            setBadges(merged);
            writeAchievementsCache(childId, merged);
          }
        } catch (err) {
          console.warn('[JuniorAchievements] Supabase load failed:', err);
        }
      }

      if (isMounted.current) setLoading(false);
    }

    loadSaved();
    return () => { isMounted.current = false; };
  }, [childId, parentId]);

  // -------------------------------------------------------------------------
  // Check for new badges based on current progress data
  // -------------------------------------------------------------------------
  const checkForNewBadges = useCallback((): string[] => {
    if (!childId) return [];

    const entries = progressEntries;
    const totalSessions = entries.length;
    const streak = computeStreak(entries);
    const todayCount = countActivitiesToday(entries);
    const weekendDone = hasWeekendPair(entries);

    const speechHighAcc = countByDomainWithAccuracy(entries, 'speech', 80);
    const socialCount = countByDomain(entries, 'social');
    const sensoryCount = countByDomain(entries, 'sensory');
    const executiveCount = countByDomain(entries, 'executive');
    const aacCount = countByDomain(entries, 'aac');
    const calmCount = countCalmCorner(entries);
    const emotionCount = countEmotionActivities(entries);
    const maxLevel = getMaxLevel(entries);
    const speechCount = countByDomain(entries, 'speech');

    // Map badge IDs to their current progress value
    const progressMap: Record<string, number> = {
      'first-word': speechCount > 0 ? 1 : 0,
      'practice-pioneer': totalSessions,
      'session-superstar': totalSessions,
      'century-club': totalSessions,
      'streak-master': streak,
      'daily-hero': todayCount,
      'weekend-warrior': weekendDone ? 2 : 0,
      'speech-star': speechHighAcc,
      'social-star': socialCount,
      'sensory-explorer': sensoryCount,
      'executive-eagle': executiveCount,
      'aac-ace': aacCount,
      'calm-champion': calmCount,
      'emotion-expert': emotionCount,
      'level-legend': maxLevel,
      'badge-collector': 0, // Computed after other badges
    };

    const newlyUnlocked: string[] = [];

    const updated = badges.map(badge => {
      const current = progressMap[badge.id] ?? badge.current;
      const wasUnlocked = badge.unlocked;
      const isNowUnlocked = wasUnlocked || current >= badge.target;

      if (isNowUnlocked && !wasUnlocked) {
        newlyUnlocked.push(badge.id);
      }

      return {
        ...badge,
        current,
        unlocked: isNowUnlocked,
        unlockedAt: isNowUnlocked && !wasUnlocked
          ? new Date().toISOString()
          : badge.unlockedAt,
      };
    });

    // Compute badge-collector progress (count of unlocked badges)
    const unlockedCount = updated.filter(b => b.unlocked && b.id !== 'badge-collector').length;
    const collectorIdx = updated.findIndex(b => b.id === 'badge-collector');
    if (collectorIdx >= 0) {
      updated[collectorIdx].current = unlockedCount;
      if (unlockedCount >= updated[collectorIdx].target && !badges[collectorIdx].unlocked) {
        updated[collectorIdx].unlocked = true;
        updated[collectorIdx].unlockedAt = new Date().toISOString();
        newlyUnlocked.push('badge-collector');
      }
    }

    setBadges(updated);
    writeAchievementsCache(childId, updated);

    // Persist newly unlocked to Supabase
    if (parentId && newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(badgeId => {
        const badge = updated.find(b => b.id === badgeId);
        supabase
          .from('junior_achievements')
          .upsert(
            {
              child_id: childId,
              parent_id: parentId,
              badge_id: badgeId,
              unlocked_at: badge?.unlockedAt || new Date().toISOString(),
              progress: { current: badge?.current ?? 0, target: badge?.target ?? 0 },
            },
            { onConflict: 'child_id,badge_id' }
          )
          .then(({ error }) => {
            if (error) {
              console.warn(`[JuniorAchievements] Failed to persist badge ${badgeId}:`, error);
            }
          });
      });
    }

    return newlyUnlocked;
  }, [childId, parentId, progressEntries, badges]);

  // -------------------------------------------------------------------------
  // Get badge for celebration
  // -------------------------------------------------------------------------
  const celebrateBadge = useCallback((badgeId: string): Badge | undefined => {
    return badges.find(b => b.id === badgeId);
  }, [badges]);

  // -------------------------------------------------------------------------
  // Manually award a badge
  // -------------------------------------------------------------------------
  const awardBadge = useCallback(async (badgeId: string) => {
    if (!childId) return;

    const updated = badges.map(b => {
      if (b.id === badgeId && !b.unlocked) {
        return {
          ...b,
          unlocked: true,
          current: b.target,
          unlockedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    setBadges(updated);
    writeAchievementsCache(childId, updated);

    if (parentId) {
      const badge = updated.find(b => b.id === badgeId);
      if (badge) {
        await supabase
          .from('junior_achievements')
          .upsert(
            {
              child_id: childId,
              parent_id: parentId,
              badge_id: badgeId,
              unlocked_at: badge.unlockedAt,
              progress: { current: badge.current, target: badge.target },
            },
            { onConflict: 'child_id,badge_id' }
          );
      }
    }
  }, [childId, parentId, badges]);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  return {
    badges,
    unlockedBadges,
    lockedBadges,
    checkForNewBadges,
    celebrateBadge,
    awardBadge,
    loading,
  };
}

export default useJuniorAchievements;
