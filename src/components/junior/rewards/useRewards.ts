// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { useState, useEffect, useCallback } from 'react';

export interface RewardState {
  totalStars: number;
  streak: number;
  lastActivityDate: string | null;
  activitiesCompleted: string[];
  milestonesCelebrated: number[];
  customRewards: { starCount: number; label: string }[];
  weeklyLog: { date: string; stars: number; activityId: string }[];
}

const STORAGE_KEY = 'aminy-junior-rewards';

const defaultState: RewardState = {
  totalStars: 0,
  streak: 0,
  lastActivityDate: null,
  activitiesCompleted: [],
  milestonesCelebrated: [],
  customRewards: [],
  weeklyLog: [],
};

function loadState(): RewardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

function saveState(state: RewardState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail if storage full
  }
}

function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function isYesterday(prev: string, now: string): boolean {
  const p = new Date(prev);
  const n = new Date(now);
  const diff = Math.floor((n.getTime() - p.getTime()) / 86400000);
  return diff === 1;
}

const MILESTONES = [10, 25, 50, 100, 200, 500];

export function useRewards() {
  const [state, setState] = useState<RewardState>(loadState);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const earnStars = useCallback((count: number, activityId: string) => {
    setState(prev => {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      let newStreak = prev.streak;

      if (!prev.lastActivityDate || !isSameDay(prev.lastActivityDate, now)) {
        if (prev.lastActivityDate && isYesterday(prev.lastActivityDate, now)) {
          newStreak = prev.streak + 1;
        } else if (!prev.lastActivityDate) {
          newStreak = 1;
        } else if (!isSameDay(prev.lastActivityDate, now)) {
          // Check if it's been more than 1 day gap
          const diffDays = Math.floor(
            (new Date(now).getTime() - new Date(prev.lastActivityDate).getTime()) / 86400000
          );
          newStreak = diffDays > 1 ? 1 : prev.streak + 1;
        }
      }

      const newTotal = prev.totalStars + count;

      // Check for new milestones
      for (const m of MILESTONES) {
        if (newTotal >= m && prev.totalStars < m && !prev.milestonesCelebrated.includes(m)) {
          setPendingMilestone(m);
          break;
        }
      }

      const logEntry = { date: today, stars: count, activityId };
      const weeklyLog = [...prev.weeklyLog, logEntry].slice(-50);

      return {
        ...prev,
        totalStars: newTotal,
        streak: newStreak,
        lastActivityDate: now,
        activitiesCompleted: [...new Set([...prev.activitiesCompleted, activityId])],
        weeklyLog,
      };
    });
  }, []);

  const dismissMilestone = useCallback(() => {
    if (pendingMilestone !== null) {
      setState(prev => ({
        ...prev,
        milestonesCelebrated: [...prev.milestonesCelebrated, pendingMilestone],
      }));
      setPendingMilestone(null);
    }
  }, [pendingMilestone]);

  const setCustomReward = useCallback((starCount: number, label: string) => {
    setState(prev => ({
      ...prev,
      customRewards: [
        ...prev.customRewards.filter(r => r.starCount !== starCount),
        { starCount, label },
      ],
    }));
  }, []);

  const getStarsToday = useCallback((): number => {
    const today = new Date().toISOString().slice(0, 10);
    return state.weeklyLog
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + e.stars, 0);
  }, [state.weeklyLog]);

  const getWeeklyStars = useCallback((): { date: string; stars: number }[] => {
    const now = new Date();
    const days: { date: string; stars: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayStars = state.weeklyLog
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.stars, 0);
      days.push({ date: dateStr, stars: dayStars });
    }
    return days;
  }, [state.weeklyLog]);

  return {
    ...state,
    pendingMilestone,
    earnStars,
    dismissMilestone,
    setCustomReward,
    getStarsToday,
    getWeeklyStars,
    MILESTONES,
  };
}
