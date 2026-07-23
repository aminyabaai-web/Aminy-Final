// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Analytics Tracker
 * Track user events, module usage, retention metrics
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

export type AnalyticsEvent =
  | 'aminyjr_session_start'
  | 'shop_purchase_complete'
  | 'hub_post_created'
  | 'coverage_report_sent'
  | 'notification_opened'
  | 'nav_tab_selected'
  | 'goal_completed'
  | 'routine_started'
  | 'cue_used'
  | 'report_generated'
  | 'paywall_viewed'
  | 'trial_started'
  | 'subscription_upgraded'
  | 'onboarding_completed'
  | 'chat_message_sent'
  | 'document_uploaded'
  | 'telehealth_session_scheduled'
  | 'calm_moment_saved'
  | 'win_shared';

export interface AnalyticsEventData {
  userId: string;
  event: AnalyticsEvent;
  timestamp: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
}

export interface ModuleUsageStats {
  module: string;
  visits: number;
  timeSpent: number; // seconds
  lastVisited: string;
}

export interface RetentionMetrics {
  d7: number; // Day 7 retention %
  d30: number; // Day 30 retention %
  avgSessionDuration: number; // seconds
  avgDailyActiveUsers: number;
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return;
    }

    const sessionId = getOrCreateSessionId();

    const eventData: AnalyticsEventData = {
      userId,
      event,
      timestamp: new Date().toISOString(),
      properties,
      sessionId,
    };

    // Send to server
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/analytics/track`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(eventData),
      }
    );

    // Also log locally for debugging
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

/**
 * Track module visit
 */
export function trackModuleVisit(module: string): (() => void) {
  const startTime = Date.now();
  
  trackEvent('nav_tab_selected', { module });

  // Track time spent when user leaves
  const cleanup = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    updateModuleUsage(module, timeSpent);
  };

  // Save cleanup function
  window.addEventListener('beforeunload', cleanup);
  
  return () => {
    cleanup();
    window.removeEventListener('beforeunload', cleanup);
  };
}

/**
 * Update module usage stats in local storage
 */
function updateModuleUsage(module: string, timeSpent: number): void {
  try {
    const key = 'module_usage_stats';
    const existing = localStorage.getItem(key);
    const stats: Record<string, ModuleUsageStats> = existing ? JSON.parse(existing) : {};

    if (!stats[module]) {
      stats[module] = {
        module,
        visits: 0,
        timeSpent: 0,
        lastVisited: new Date().toISOString(),
      };
    }

    stats[module].visits += 1;
    stats[module].timeSpent += timeSpent;
    stats[module].lastVisited = new Date().toISOString();

    localStorage.setItem(key, JSON.stringify(stats));

    // Sync to server
    syncModuleUsage(stats);
  } catch (error) {
    console.error('Error updating module usage:', error);
  }
}

/**
 * Sync module usage to server
 */
async function syncModuleUsage(stats: Record<string, ModuleUsageStats>): Promise<void> {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/analytics/module-usage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ userId, stats }),
      }
    );
  } catch (error) {
    console.error('Error syncing module usage:', error);
  }
}

/**
 * Get or create session ID
 */
function getOrCreateSessionId(): string {
  const key = 'session_id';
  const existing = sessionStorage.getItem(key);
  
  if (existing) {
    return existing;
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem(key, sessionId);
  return sessionId;
}

/**
 * Get module usage stats
 */
export function getModuleUsageStats(): Record<string, ModuleUsageStats> {
  try {
    const key = 'module_usage_stats';
    const existing = localStorage.getItem(key);
    return existing ? JSON.parse(existing) : {};
  } catch (error) {
    console.error('Error getting module usage stats:', error);
    return {};
  }
}

/**
 * Get analytics summary for dashboard
 */
export async function getAnalyticsSummary(
  timeRange: '7d' | '30d' = '7d'
): Promise<{
  moduleUsage: { module: string; percentage: number }[];
  avgCoinsPerDay: number;
  retention: RetentionMetrics;
  topEvents: { event: string; count: number }[];
}> {
  try {
    // /analytics/summary derives the user from the session JWT (anon key
    // gets a 401). No session → fall through to the empty-data fallback.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/analytics/summary?timeRange=${timeRange}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch analytics summary');
    }

    return response.json();
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    
    // Return empty data
    return {
      moduleUsage: [],
      avgCoinsPerDay: 0,
      retention: {
        d7: 0,
        d30: 0,
        avgSessionDuration: 0,
        avgDailyActiveUsers: 0,
      },
      topEvents: [],
    };
  }
}

/**
 * Track specific high-value events with additional context
 */
export const trackSpecificEvents = {
  jrSessionStart: (childName: string, activityType: string) => {
    trackEvent('aminyjr_session_start', {
      childName,
      activityType,
      timestamp: new Date().toISOString(),
    });
  },

  shopPurchase: (itemName: string, coinCost: number) => {
    trackEvent('shop_purchase_complete', {
      itemName,
      coinCost,
      timestamp: new Date().toISOString(),
    });
  },

  hubPostCreated: (postType: string, hasMedia: boolean) => {
    trackEvent('hub_post_created', {
      postType,
      hasMedia,
      timestamp: new Date().toISOString(),
    });
  },

  coverageReportSent: (recipientType: 'self' | 'provider' | 'school') => {
    trackEvent('coverage_report_sent', {
      recipientType,
      timestamp: new Date().toISOString(),
    });
  },

  notificationOpened: (notificationType: string, deepLink?: string) => {
    trackEvent('notification_opened', {
      notificationType,
      deepLink,
      timestamp: new Date().toISOString(),
    });
  },

  calmMomentSaved: (context: string, mood: string) => {
    trackEvent('calm_moment_saved', {
      context,
      mood,
      timestamp: new Date().toISOString(),
    });
  },

  winShared: (shareTarget: 'family' | 'coach' | 'school') => {
    trackEvent('win_shared', {
      shareTarget,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Export cohort data for analysis
 */
export async function exportCohortData(signupWeek: string): Promise<Blob> {
  try {
    // Auth-required endpoint — needs the user's session JWT.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Sign in required to export cohort data');
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/analytics/cohort/export?week=${signupWeek}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export cohort data');
    }

    return response.blob();
  } catch (error) {
    console.error('Error exporting cohort data:', error);
    throw error;
  }
}
