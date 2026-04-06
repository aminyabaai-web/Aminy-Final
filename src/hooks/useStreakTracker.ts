// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useStreakTracker — Daily Engagement Streak Hook
 *
 * Tracks consecutive days with at least one meaningful action:
 * - Junior session completed
 * - Behavior log entry
 * - Community post / comment
 * - AI chat conversation
 *
 * Milestones:
 * - 7 days  → "First Week" badge + celebration
 * - 14 days → "Fortnight" badge + celebration
 * - 30 days → "Monthly Champion" badge + celebration
 * - 60 days → "Two Month Warrior" badge
 * - 100 days → "Century Club" badge
 *
 * Persistence:
 * - Primary: Supabase (via streak-service.ts) for cross-device sync
 * - Fallback: localStorage for offline-first behavior
 *
 * Integration points:
 * - Dashboard: Show streak count + fire emoji
 * - App.tsx / retention: Call recordAction() on meaningful events
 * - Celebrations: Show milestone modal when streak hits threshold
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  incrementStreak as supabaseIncrementStreak,
  checkStreakStatus,
  syncStreakFromCloud,
  type StreakData,
} from '../lib/streak-service';

// ── Types ─────────────────────────────────────────────────────────────

export type StreakAction =
  | 'junior_session'
  | 'behavior_log'
  | 'community_post'
  | 'ai_chat'
  | 'calm_corner'
  | 'document_upload'
  | 'goal_completed';

export interface StreakMilestone {
  days: number;
  name: string;
  emoji: string;
  description: string;
  bonusType?: 'badge' | 'celebration' | 'reward';
}

export interface UseStreakTrackerReturn {
  /** Current consecutive-day streak count */
  currentStreak: number;
  /** All-time longest streak */
  longestStreak: number;
  /** Whether the user has already logged activity today */
  hasActivityToday: boolean;
  /** Whether the streak is currently paused (vacation mode) */
  isPaused: boolean;
  /** Whether streak data is still loading */
  loading: boolean;
  /** Record a meaningful action — increments streak if first action today */
  recordAction: (action: StreakAction) => Promise<void>;
  /** Get the most recently crossed milestone (for celebration UI) */
  pendingMilestone: StreakMilestone | null;
  /** Dismiss the pending milestone celebration */
  dismissMilestone: () => void;
  /** All milestones and whether they've been achieved */
  milestones: Array<StreakMilestone & { achieved: boolean }>;
  /** How many actions logged today */
  todayActionCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────

const LOCAL_KEY = 'aminy_streak_tracker';
const ACTIONS_KEY = 'aminy_streak_actions_today';

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    name: 'Getting Started',
    emoji: '🌱',
    description: '3 days in a row — a habit is forming!',
    bonusType: 'badge',
  },
  {
    days: 7,
    name: 'First Week',
    emoji: '🔥',
    description: 'A full week of engagement — consistency is key!',
    bonusType: 'celebration',
  },
  {
    days: 14,
    name: 'Fortnight',
    emoji: '⚡',
    description: 'Two weeks strong — you are building real momentum.',
    bonusType: 'celebration',
  },
  {
    days: 30,
    name: 'Monthly Champion',
    emoji: '🏆',
    description: 'A full month! Your dedication is making a real difference.',
    bonusType: 'celebration',
  },
  {
    days: 60,
    name: 'Two Month Warrior',
    emoji: '💪',
    description: '60 days of showing up — incredible commitment.',
    bonusType: 'badge',
  },
  {
    days: 100,
    name: 'Century Club',
    emoji: '👑',
    description: '100 days! You are in the top 1% of dedicated parents.',
    bonusType: 'celebration',
  },
];

// ── Local persistence helpers ─────────────────────────────────────────

interface LocalStreakState {
  current: number;
  longest: number;
  lastActivityDate?: string;
  isPaused: boolean;
  celebratedMilestones: number[];
}

function loadLocalState(): LocalStreakState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    current: 0,
    longest: 0,
    isPaused: false,
    celebratedMilestones: [],
  };
}

function saveLocalState(state: LocalStreakState): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch { /* non-critical */ }
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayActions(): { date: string; count: number; actions: StreakAction[] } {
  try {
    const raw = localStorage.getItem(ACTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === getTodayStr()) return parsed;
    }
  } catch { /* ignore */ }
  return { date: getTodayStr(), count: 0, actions: [] };
}

function saveTodayAction(action: StreakAction): void {
  const current = getTodayActions();
  const updated = {
    date: getTodayStr(),
    count: current.count + 1,
    actions: [...current.actions, action],
  };
  try {
    localStorage.setItem(ACTIONS_KEY, JSON.stringify(updated));
  } catch { /* non-critical */ }
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useStreakTracker(userId: string | null): UseStreakTrackerReturn {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [hasActivityToday, setHasActivityToday] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingMilestone, setPendingMilestone] = useState<StreakMilestone | null>(null);
  const [todayActionCount, setTodayActionCount] = useState(0);
  const [celebratedMilestones, setCelebratedMilestones] = useState<number[]>([]);

  const localStateRef = useRef<LocalStreakState>(loadLocalState());

  // ── Initialize: sync local <-> cloud ────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const local = loadLocalState();
      localStateRef.current = local;
      setCelebratedMilestones(local.celebratedMilestones);

      // Set initial state from localStorage (fast)
      setCurrentStreak(local.current);
      setLongestStreak(local.longest);
      setIsPaused(local.isPaused);

      const todayData = getTodayActions();
      setTodayActionCount(todayData.count);
      setHasActivityToday(todayData.count > 0 && todayData.date === getTodayStr());

      // If user is logged in, sync with cloud
      if (userId) {
        try {
          const cloudStreak = await syncStreakFromCloud(userId, local);
          if (!cancelled) {
            setCurrentStreak(cloudStreak.currentStreak);
            setLongestStreak(cloudStreak.longestStreak);
            setIsPaused(cloudStreak.isPaused);
            setHasActivityToday(cloudStreak.lastActivityDate === getTodayStr());

            // Update local
            const updated: LocalStreakState = {
              ...local,
              current: cloudStreak.currentStreak,
              longest: cloudStreak.longestStreak,
              lastActivityDate: cloudStreak.lastActivityDate || undefined,
              isPaused: cloudStreak.isPaused,
            };
            saveLocalState(updated);
            localStateRef.current = updated;
          }
        } catch {
          // Cloud sync failed — local state is fine as fallback
        }
      }

      if (!cancelled) setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, [userId]);

  // ── Record action ───────────────────────────────────────────────

  const recordAction = useCallback(
    async (action: StreakAction) => {
      const today = getTodayStr();
      const local = localStateRef.current;
      const isFirstToday = local.lastActivityDate !== today;

      // Always track the action
      saveTodayAction(action);
      setTodayActionCount((prev) => prev + 1);

      // Only increment streak on first action of the day
      if (!isFirstToday) {
        setHasActivityToday(true);
        return;
      }

      // Calculate new streak
      let newCurrent: number;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (local.lastActivityDate === yesterdayStr) {
        // Continuing streak
        newCurrent = local.current + 1;
      } else if (local.lastActivityDate === today) {
        // Already counted today
        newCurrent = local.current;
      } else {
        // Streak broken — start fresh
        newCurrent = 1;
      }

      const newLongest = Math.max(newCurrent, local.longest);

      // Update local state
      const updated: LocalStreakState = {
        ...local,
        current: newCurrent,
        longest: newLongest,
        lastActivityDate: today,
      };
      saveLocalState(updated);
      localStateRef.current = updated;

      // Update React state
      setCurrentStreak(newCurrent);
      setLongestStreak(newLongest);
      setHasActivityToday(true);

      // Check for milestone
      const milestone = STREAK_MILESTONES.find(
        (m) =>
          newCurrent >= m.days &&
          !localStateRef.current.celebratedMilestones.includes(m.days)
      );

      if (milestone) {
        setPendingMilestone(milestone);
      }

      // Sync to Supabase
      if (userId) {
        try {
          await supabaseIncrementStreak(userId);
        } catch {
          // Non-critical — local state is already updated
        }
      }
    },
    [userId]
  );

  // ── Dismiss milestone ───────────────────────────────────────────

  const dismissMilestone = useCallback(() => {
    if (!pendingMilestone) return;

    const updated = [
      ...localStateRef.current.celebratedMilestones,
      pendingMilestone.days,
    ];
    localStateRef.current = {
      ...localStateRef.current,
      celebratedMilestones: updated,
    };
    saveLocalState(localStateRef.current);
    setCelebratedMilestones(updated);
    setPendingMilestone(null);
  }, [pendingMilestone]);

  // ── Milestones with achieved status ─────────────────────────────

  const milestones = STREAK_MILESTONES.map((m) => ({
    ...m,
    achieved: currentStreak >= m.days,
  }));

  return {
    currentStreak,
    longestStreak,
    hasActivityToday,
    isPaused,
    loading,
    recordAction,
    pendingMilestone,
    dismissMilestone,
    milestones,
    todayActionCount,
  };
}

export default useStreakTracker;
