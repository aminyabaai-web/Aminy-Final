/**
 * Streak Service
 * Syncs user streaks with Supabase for persistence across devices
 */

import { supabase } from '../utils/supabase/client';

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  isPaused: boolean;
  pauseReason?: string;
}

/**
 * Fetch streak data from Supabase
 */
export async function getStreak(userId: string): Promise<StreakData | null> {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      userId: data.user_id,
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
      lastActivityDate: data.last_activity_date,
      isPaused: data.is_paused || false,
      pauseReason: data.pause_reason,
    };
  } catch (error) {
    console.error('[StreakService] Error fetching streak:', error);
    return null;
  }
}

/**
 * Save/update streak data to Supabase
 */
export async function saveStreak(streak: StreakData): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_streaks')
      .upsert({
        user_id: streak.userId,
        current_streak: streak.currentStreak,
        longest_streak: streak.longestStreak,
        last_activity_date: streak.lastActivityDate,
        is_paused: streak.isPaused,
        pause_reason: streak.pauseReason,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;

    if (import.meta.env.DEV) console.log('[StreakService] Streak saved successfully');
    return true;
  } catch (error) {
    console.error('[StreakService] Error saving streak:', error);
    return false;
  }
}

/**
 * Increment streak and sync to Supabase
 */
export async function incrementStreak(userId: string): Promise<StreakData> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Get current streak
  const current = await getStreak(userId);

  let newStreak: StreakData;

  if (!current) {
    // First activity ever
    newStreak = {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
      isPaused: false,
    };
  } else {
    const lastDate = current.lastActivityDate ? new Date(current.lastActivityDate) : null;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (current.lastActivityDate === today) {
      // Already logged today
      newStreak = current;
    } else if (current.lastActivityDate === yesterdayStr) {
      // Continuing streak
      const newCurrent = current.currentStreak + 1;
      newStreak = {
        ...current,
        currentStreak: newCurrent,
        longestStreak: Math.max(newCurrent, current.longestStreak),
        lastActivityDate: today,
      };
    } else {
      // Streak broken - start new one
      newStreak = {
        ...current,
        currentStreak: 1,
        lastActivityDate: today,
      };
    }
  }

  // Save to Supabase
  await saveStreak(newStreak);

  return newStreak;
}

/**
 * Check if streak should be reset (called on app load)
 */
export async function checkStreakStatus(userId: string): Promise<StreakData> {
  const current = await getStreak(userId);

  if (!current) {
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isPaused: false,
    };
  }

  // If paused, don't reset
  if (current.isPaused) {
    return current;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if streak should be reset
  if (current.lastActivityDate &&
      current.lastActivityDate !== today &&
      current.lastActivityDate !== yesterdayStr) {
    // Streak broken - reset it
    const resetStreak: StreakData = {
      ...current,
      currentStreak: 0,
      lastActivityDate: current.lastActivityDate, // Keep last activity for reference
    };

    await saveStreak(resetStreak);
    return resetStreak;
  }

  return current;
}

/**
 * Pause streak (no penalty during pause)
 */
export async function pauseStreak(userId: string, reason?: string): Promise<StreakData | null> {
  const current = await getStreak(userId);

  if (!current) return null;

  const paused: StreakData = {
    ...current,
    isPaused: true,
    pauseReason: reason || 'Taking a break',
  };

  await saveStreak(paused);
  return paused;
}

/**
 * Resume streak
 */
export async function resumeStreak(userId: string): Promise<StreakData | null> {
  const current = await getStreak(userId);

  if (!current) return null;

  const resumed: StreakData = {
    ...current,
    isPaused: false,
    pauseReason: undefined,
    lastActivityDate: new Date().toISOString().split('T')[0],
  };

  await saveStreak(resumed);
  return resumed;
}

/**
 * Hook to sync local streak state with Supabase
 * Call this on app load to restore streak from cloud
 */
export async function syncStreakFromCloud(
  userId: string,
  localStreak: { current: number; longest: number; lastActivityDate?: string; isPaused: boolean }
): Promise<StreakData> {
  const cloudStreak = await checkStreakStatus(userId);

  // If cloud has better streak, use cloud
  if (cloudStreak.currentStreak > localStreak.current ||
      cloudStreak.longestStreak > localStreak.longest) {
    if (import.meta.env.DEV) console.log('[StreakService] Using cloud streak (better than local)');
    return cloudStreak;
  }

  // If local has better streak, sync to cloud
  if (localStreak.current > cloudStreak.currentStreak ||
      localStreak.longest > cloudStreak.longestStreak) {
    if (import.meta.env.DEV) console.log('[StreakService] Syncing local streak to cloud');
    const merged: StreakData = {
      userId,
      currentStreak: Math.max(localStreak.current, cloudStreak.currentStreak),
      longestStreak: Math.max(localStreak.longest, cloudStreak.longestStreak),
      lastActivityDate: localStreak.lastActivityDate || cloudStreak.lastActivityDate || null,
      isPaused: localStreak.isPaused || cloudStreak.isPaused,
    };
    await saveStreak(merged);
    return merged;
  }

  return cloudStreak;
}

export default {
  getStreak,
  saveStreak,
  incrementStreak,
  checkStreakStatus,
  pauseStreak,
  resumeStreak,
  syncStreakFromCloud,
};
