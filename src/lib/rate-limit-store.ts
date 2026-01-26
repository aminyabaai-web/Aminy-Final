/**
 * Rate Limit Store
 * Tracks user's daily AI message usage and displays remaining quota
 */

import { create } from 'zustand';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface DailyUsage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string; // ISO timestamp
}

interface RateLimitState {
  dailyUsage: DailyUsage | null;
  isLoading: boolean;
  lastUpdated: string | null;

  // Actions
  setDailyUsage: (usage: DailyUsage) => void;
  fetchUsage: () => Promise<void>;
  resetUsage: () => void;
}

export const useRateLimitStore = create<RateLimitState>((set, get) => ({
  dailyUsage: null,
  isLoading: false,
  lastUpdated: null,

  setDailyUsage: (usage: DailyUsage) => {
    set({
      dailyUsage: usage,
      lastUpdated: new Date().toISOString(),
    });
  },

  fetchUsage: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/usage`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.dailyUsage) {
          set({
            dailyUsage: data.dailyUsage,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  resetUsage: () => {
    set({
      dailyUsage: null,
      lastUpdated: null,
    });
  },
}));

/**
 * Calculate time until reset in human-readable format
 */
export function getTimeUntilReset(resetsAt: string): string {
  const now = Date.now();
  const resetTime = new Date(resetsAt).getTime();
  const diffMs = resetTime - now;

  if (diffMs <= 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get usage percentage (0-100)
 */
export function getUsagePercentage(usage: DailyUsage): number {
  if (usage.limit === 0) return 0;
  return Math.min(100, Math.round((usage.used / usage.limit) * 100));
}

/**
 * Check if user is running low on messages
 */
export function isRunningLow(usage: DailyUsage): boolean {
  return usage.remaining <= 2 && usage.remaining > 0;
}

/**
 * Check if user has reached limit
 */
export function hasReachedLimit(usage: DailyUsage): boolean {
  return usage.remaining === 0;
}
