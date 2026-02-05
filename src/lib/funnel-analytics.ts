/**
 * Funnel Analytics System
 *
 * Tracks user journey through the conversion funnel:
 * Landing → Signup → Onboarding → Trial → Conversion → Retention
 *
 * Enables analysis of:
 * - Drop-off points
 * - Feature adoption
 * - Conversion rates by cohort
 * - Retention curves
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export type FunnelStage =
  | 'landing_view'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_child_added'
  | 'onboarding_completed'
  | 'trial_started'
  | 'first_ai_message'
  | 'first_calm_cue'
  | 'first_abc_entry'
  | 'first_community_view'
  | 'first_provider_view'
  | 'paywall_viewed'
  | 'payment_started'
  | 'payment_completed'
  | 'day_1_return'
  | 'day_7_return'
  | 'day_30_return';

export type FeatureEvent =
  | 'ai_chat_opened'
  | 'ai_message_sent'
  | 'calm_cue_used'
  | 'calm_cue_helpful'
  | 'abc_entry_logged'
  | 'care_plan_viewed'
  | 'care_page_opened'
  | 'community_post_created'
  | 'community_post_liked'
  | 'community_comment_added'
  | 'provider_profile_viewed'
  | 'provider_booking_started'
  | 'provider_booking_completed'
  | 'vault_document_uploaded'
  | 'video_call_started'
  | 'streak_achieved'
  | 'badge_earned'
  | 'referral_sent'
  | 'referral_completed'
  | 'push_notification_enabled'
  | 'settings_opened'
  | 'profile_updated';

export interface FunnelEvent {
  userId: string;
  stage: FunnelStage;
  timestamp: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  source?: string; // utm_source
  medium?: string; // utm_medium
  campaign?: string; // utm_campaign
}

export interface FeatureUsageEvent {
  userId: string;
  event: FeatureEvent;
  timestamp: string;
  metadata?: Record<string, any>;
  duration?: number; // For time-based events
}

export interface UserCohort {
  userId: string;
  signupDate: string;
  signupSource?: string;
  tier: string;
  firstPurchaseDate?: string;
  lastActiveDate: string;
  totalSessions: number;
  totalAiMessages: number;
  totalCalmCues: number;
}

// ============================================
// STORAGE
// ============================================

const FUNNEL_STORAGE_KEY = 'aminy_funnel_events';
const FEATURE_STORAGE_KEY = 'aminy_feature_events';
const SESSION_STORAGE_KEY = 'aminy_session_id';

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

function getLocalFunnelEvents(): FunnelEvent[] {
  try {
    const stored = localStorage.getItem(FUNNEL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalFunnelEvent(event: FunnelEvent): void {
  const events = getLocalFunnelEvents();
  events.push(event);
  // Keep only last 1000 events locally
  if (events.length > 1000) {
    events.shift();
  }
  localStorage.setItem(FUNNEL_STORAGE_KEY, JSON.stringify(events));
}

function getLocalFeatureEvents(): FeatureUsageEvent[] {
  try {
    const stored = localStorage.getItem(FEATURE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalFeatureEvent(event: FeatureUsageEvent): void {
  const events = getLocalFeatureEvents();
  events.push(event);
  // Keep only last 1000 events locally
  if (events.length > 1000) {
    events.shift();
  }
  localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(events));
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

/**
 * Track a funnel stage event
 */
export async function trackFunnelStage(
  userId: string,
  stage: FunnelStage,
  metadata?: Record<string, any>
): Promise<void> {
  const event: FunnelEvent = {
    userId,
    stage,
    timestamp: new Date().toISOString(),
    metadata,
    sessionId: getSessionId(),
    source: getUtmParam('utm_source'),
    medium: getUtmParam('utm_medium'),
    campaign: getUtmParam('utm_campaign'),
  };

  // Save locally first
  saveLocalFunnelEvent(event);

  // Try to save to Supabase
  try {
    await supabase.from('funnel_events').insert({
      user_id: userId,
      stage,
      timestamp: event.timestamp,
      metadata: metadata || {},
      session_id: event.sessionId,
      source: event.source,
      medium: event.medium,
      campaign: event.campaign,
    });
  } catch {
    // Silent fail - analytics should not break the app
  }
}

/**
 * Track a feature usage event
 */
export async function trackFeatureUsage(
  userId: string,
  event: FeatureEvent,
  metadata?: Record<string, any>,
  duration?: number
): Promise<void> {
  const usageEvent: FeatureUsageEvent = {
    userId,
    event,
    timestamp: new Date().toISOString(),
    metadata,
    duration,
  };

  // Save locally first
  saveLocalFeatureEvent(usageEvent);

  // Try to save to Supabase
  try {
    await supabase.from('feature_events').insert({
      user_id: userId,
      event,
      timestamp: usageEvent.timestamp,
      metadata: metadata || {},
      duration,
    });
  } catch {
    // Silent fail - analytics should not break the app
  }
}

/**
 * Track page view
 */
export function trackPageView(userId: string, path: string): void {
  const event = {
    userId,
    path,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  // Store in session storage for current session tracking
  let pageViews: typeof event[] = [];
  try {
    pageViews = JSON.parse(sessionStorage.getItem('aminy_page_views') || '[]');
  } catch {
    // Reset if corrupted
    pageViews = [];
  }
  pageViews.push(event);
  sessionStorage.setItem('aminy_page_views', JSON.stringify(pageViews));
}

/**
 * Get UTM parameter from URL or storage
 */
function getUtmParam(param: string): string | undefined {
  // Check URL first
  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(param);
  if (value) {
    // Store for session
    sessionStorage.setItem(param, value);
    return value;
  }
  // Check session storage
  return sessionStorage.getItem(param) || undefined;
}

// ============================================
// CONVENIENCE TRACKING FUNCTIONS
// ============================================

export const funnel = {
  // Signup flow
  landingViewed: (userId: string) => trackFunnelStage(userId, 'landing_view'),
  signupStarted: (userId: string) => trackFunnelStage(userId, 'signup_started'),
  signupCompleted: (userId: string) => trackFunnelStage(userId, 'signup_completed'),

  // Onboarding flow
  onboardingStarted: (userId: string) => trackFunnelStage(userId, 'onboarding_started'),
  childAdded: (userId: string, childName?: string) =>
    trackFunnelStage(userId, 'onboarding_child_added', { childName }),
  onboardingCompleted: (userId: string, durationSeconds?: number) =>
    trackFunnelStage(userId, 'onboarding_completed', { durationSeconds }),

  // Trial & Conversion
  trialStarted: (userId: string) => trackFunnelStage(userId, 'trial_started'),
  paywallViewed: (userId: string, source?: string) =>
    trackFunnelStage(userId, 'paywall_viewed', { source }),
  paymentStarted: (userId: string, tier: string) =>
    trackFunnelStage(userId, 'payment_started', { tier }),
  paymentCompleted: (userId: string, tier: string, amount?: number) =>
    trackFunnelStage(userId, 'payment_completed', { tier, amount }),

  // Activation events
  firstAiMessage: (userId: string) => trackFunnelStage(userId, 'first_ai_message'),
  firstCalmCue: (userId: string) => trackFunnelStage(userId, 'first_calm_cue'),
  firstAbcEntry: (userId: string) => trackFunnelStage(userId, 'first_abc_entry'),
  firstCommunityView: (userId: string) => trackFunnelStage(userId, 'first_community_view'),
  firstProviderView: (userId: string) => trackFunnelStage(userId, 'first_provider_view'),

  // Retention
  dayReturn: (userId: string, day: 1 | 7 | 30) => {
    const stage = day === 1 ? 'day_1_return' : day === 7 ? 'day_7_return' : 'day_30_return';
    return trackFunnelStage(userId, stage);
  },
};

export const feature = {
  // AI Chat
  chatOpened: (userId: string) => trackFeatureUsage(userId, 'ai_chat_opened'),
  messageSent: (userId: string, messageLength?: number) =>
    trackFeatureUsage(userId, 'ai_message_sent', { messageLength }),
  calmCueUsed: (userId: string) => trackFeatureUsage(userId, 'calm_cue_used'),
  calmCueHelpful: (userId: string, rating?: number) =>
    trackFeatureUsage(userId, 'calm_cue_helpful', { rating }),

  // Data Collection
  abcEntryLogged: (userId: string, behaviorType?: string) =>
    trackFeatureUsage(userId, 'abc_entry_logged', { behaviorType }),

  // Care Plan
  carePlanViewed: (userId: string) => trackFeatureUsage(userId, 'care_plan_viewed'),
  carePageOpened: (userId: string) => trackFeatureUsage(userId, 'care_page_opened'),

  // Community
  postCreated: (userId: string, category?: string) =>
    trackFeatureUsage(userId, 'community_post_created', { category }),
  postLiked: (userId: string) => trackFeatureUsage(userId, 'community_post_liked'),
  commentAdded: (userId: string) => trackFeatureUsage(userId, 'community_comment_added'),

  // Provider
  providerViewed: (userId: string, providerId?: string) =>
    trackFeatureUsage(userId, 'provider_profile_viewed', { providerId }),
  bookingStarted: (userId: string, providerId?: string) =>
    trackFeatureUsage(userId, 'provider_booking_started', { providerId }),
  bookingCompleted: (userId: string, providerId?: string, amount?: number) =>
    trackFeatureUsage(userId, 'provider_booking_completed', { providerId, amount }),

  // Vault
  documentUploaded: (userId: string, docType?: string) =>
    trackFeatureUsage(userId, 'vault_document_uploaded', { docType }),

  // Video Call
  videoCallStarted: (userId: string, duration?: number) =>
    trackFeatureUsage(userId, 'video_call_started', undefined, duration),

  // Engagement
  streakAchieved: (userId: string, days: number) =>
    trackFeatureUsage(userId, 'streak_achieved', { days }),
  badgeEarned: (userId: string, badgeId: string) =>
    trackFeatureUsage(userId, 'badge_earned', { badgeId }),

  // Referral
  referralSent: (userId: string) => trackFeatureUsage(userId, 'referral_sent'),
  referralCompleted: (userId: string, referredUserId?: string) =>
    trackFeatureUsage(userId, 'referral_completed', { referredUserId }),

  // Settings
  pushEnabled: (userId: string) => trackFeatureUsage(userId, 'push_notification_enabled'),
  settingsOpened: (userId: string) => trackFeatureUsage(userId, 'settings_opened'),
  profileUpdated: (userId: string) => trackFeatureUsage(userId, 'profile_updated'),
};

// ============================================
// ANALYTICS QUERIES
// ============================================

/**
 * Get funnel conversion rates
 */
export async function getFunnelConversion(
  startDate?: Date,
  endDate?: Date
): Promise<Record<FunnelStage, number>> {
  try {
    let query = supabase
      .from('funnel_events')
      .select('stage, user_id')
      .order('timestamp', { ascending: true });

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count unique users per stage
    const stageCounts: Record<string, Set<string>> = {};
    (data || []).forEach(row => {
      if (!stageCounts[row.stage]) {
        stageCounts[row.stage] = new Set();
      }
      stageCounts[row.stage].add(row.user_id);
    });

    const result: Record<string, number> = {};
    Object.entries(stageCounts).forEach(([stage, users]) => {
      result[stage] = users.size;
    });

    return result as Record<FunnelStage, number>;
  } catch (err) {
    console.error('[Analytics] Error getting funnel conversion:', err);
    // Return local data as fallback
    const localEvents = getLocalFunnelEvents();
    const stageCounts: Record<string, Set<string>> = {};
    localEvents.forEach(event => {
      if (!stageCounts[event.stage]) {
        stageCounts[event.stage] = new Set();
      }
      stageCounts[event.stage].add(event.userId);
    });

    const result: Record<string, number> = {};
    Object.entries(stageCounts).forEach(([stage, users]) => {
      result[stage] = users.size;
    });

    return result as Record<FunnelStage, number>;
  }
}

/**
 * Get retention cohort data
 */
export async function getRetentionCohorts(
  period: 'day' | 'week' | 'month' = 'week'
): Promise<{ cohort: string; day1: number; day7: number; day30: number }[]> {
  try {
    const { data, error } = await supabase
      .from('funnel_events')
      .select('user_id, stage, timestamp')
      .in('stage', ['signup_completed', 'day_1_return', 'day_7_return', 'day_30_return'])
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Group by cohort (signup week/month)
    const cohorts: Record<string, {
      signups: Set<string>;
      day1: Set<string>;
      day7: Set<string>;
      day30: Set<string>;
    }> = {};

    (data || []).forEach(row => {
      const date = new Date(row.timestamp);
      let cohortKey: string;

      if (period === 'day') {
        cohortKey = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        cohortKey = weekStart.toISOString().split('T')[0];
      } else {
        cohortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = {
          signups: new Set(),
          day1: new Set(),
          day7: new Set(),
          day30: new Set(),
        };
      }

      if (row.stage === 'signup_completed') {
        cohorts[cohortKey].signups.add(row.user_id);
      } else if (row.stage === 'day_1_return') {
        cohorts[cohortKey].day1.add(row.user_id);
      } else if (row.stage === 'day_7_return') {
        cohorts[cohortKey].day7.add(row.user_id);
      } else if (row.stage === 'day_30_return') {
        cohorts[cohortKey].day30.add(row.user_id);
      }
    });

    return Object.entries(cohorts).map(([cohort, data]) => ({
      cohort,
      day1: data.signups.size > 0 ? Math.round((data.day1.size / data.signups.size) * 100) : 0,
      day7: data.signups.size > 0 ? Math.round((data.day7.size / data.signups.size) * 100) : 0,
      day30: data.signups.size > 0 ? Math.round((data.day30.size / data.signups.size) * 100) : 0,
    }));
  } catch (err) {
    console.error('[Analytics] Error getting retention cohorts:', err);
    return [];
  }
}

/**
 * Get feature adoption rates
 */
export async function getFeatureAdoption(): Promise<Record<FeatureEvent, number>> {
  try {
    const { data, error } = await supabase
      .from('feature_events')
      .select('event, user_id');

    if (error) throw error;

    // Count unique users per feature
    const featureCounts: Record<string, Set<string>> = {};
    (data || []).forEach(row => {
      if (!featureCounts[row.event]) {
        featureCounts[row.event] = new Set();
      }
      featureCounts[row.event].add(row.user_id);
    });

    const result: Record<string, number> = {};
    Object.entries(featureCounts).forEach(([feature, users]) => {
      result[feature] = users.size;
    });

    return result as Record<FeatureEvent, number>;
  } catch (err) {
    console.error('[Analytics] Error getting feature adoption:', err);
    // Return local data as fallback
    const localEvents = getLocalFeatureEvents();
    const featureCounts: Record<string, Set<string>> = {};
    localEvents.forEach(event => {
      if (!featureCounts[event.event]) {
        featureCounts[event.event] = new Set();
      }
      featureCounts[event.event].add(event.userId);
    });

    const result: Record<string, number> = {};
    Object.entries(featureCounts).forEach(([feature, users]) => {
      result[feature] = users.size;
    });

    return result as Record<FeatureEvent, number>;
  }
}

// ============================================
// RETENTION CHECK HELPER
// ============================================

/**
 * Check and track user return (call on app load)
 */
export async function checkAndTrackReturn(userId: string): Promise<void> {
  const key = `aminy_last_visit_${userId}`;
  const signupKey = `aminy_signup_date_${userId}`;

  const lastVisit = localStorage.getItem(key);
  const signupDate = localStorage.getItem(signupKey);

  const now = new Date();

  if (signupDate) {
    const signup = new Date(signupDate);
    const daysSinceSignup = Math.floor((now.getTime() - signup.getTime()) / (24 * 60 * 60 * 1000));

    // Track milestone returns
    if (daysSinceSignup >= 1 && daysSinceSignup < 2) {
      await funnel.dayReturn(userId, 1);
    } else if (daysSinceSignup >= 7 && daysSinceSignup < 8) {
      await funnel.dayReturn(userId, 7);
    } else if (daysSinceSignup >= 30 && daysSinceSignup < 31) {
      await funnel.dayReturn(userId, 30);
    }
  } else {
    // First visit - record signup date
    localStorage.setItem(signupKey, now.toISOString());
  }

  // Update last visit
  localStorage.setItem(key, now.toISOString());
}

export default {
  trackFunnelStage,
  trackFeatureUsage,
  trackPageView,
  funnel,
  feature,
  getFunnelConversion,
  getRetentionCohorts,
  getFeatureAdoption,
  checkAndTrackReturn,
};
