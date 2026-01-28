/**
 * Analytics Tracking System
 *
 * Comprehensive tracking for:
 * - DAU/WAU/MAU metrics
 * - Retention cohorts (D1, D7, D30, D90)
 * - Conversion funnels (Free → Trial → Core → Pro)
 * - Viral coefficient (K-factor)
 * - Feature adoption
 * - Session engagement
 */

import { supabase } from '../utils/supabase/client';

// Types
export interface DailyMetrics {
  date: string;
  dau: number;
  wau: number;
  mau: number;
  newUsers: number;
  returningUsers: number;
  avgSessionDuration: number;
  sessionsPerUser: number;
}

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  d1: number;
  d7: number;
  d14: number;
  d30: number;
  d60: number;
  d90: number;
}

export interface ConversionFunnel {
  date: string;
  visitors: number;
  signups: number;
  onboardingStarted: number;
  onboardingCompleted: number;
  trialStarted: number;
  trialConverted: number;
  coreSubscribers: number;
  proSubscribers: number;
  proplusSubscribers: number;
}

export interface ViralMetrics {
  date: string;
  referralsSent: number;
  referralsAccepted: number;
  kFactor: number; // viral coefficient
  invitesPerUser: number;
  conversionRate: number;
}

export interface FeatureAdoption {
  featureName: string;
  totalUsers: number;
  usersAdopted: number;
  adoptionRate: number;
  avgUsagePerUser: number;
  lastUsed: string;
}

// Event types for tracking
export type AnalyticsEvent =
  | 'page_view'
  | 'session_start'
  | 'session_end'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_step'
  | 'onboarding_completed'
  | 'trial_started'
  | 'subscription_started'
  | 'subscription_upgraded'
  | 'subscription_cancelled'
  | 'feature_used'
  | 'ai_chat_sent'
  | 'ai_chat_received'
  | 'provider_booked'
  | 'session_completed'
  | 'document_uploaded'
  | 'goal_created'
  | 'goal_completed'
  | 'task_completed'
  | 'community_post_created'
  | 'referral_sent'
  | 'referral_accepted'
  | 'nps_submitted'
  | 'error_occurred';

interface TrackEventParams {
  event: AnalyticsEvent;
  userId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

// Analytics singleton
class AnalyticsTracker {
  private sessionId: string;
  private sessionStart: Date;
  private userId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.initSession();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initSession() {
    // Track session start
    await this.track({ event: 'session_start' });

    // Set up session end tracking
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.endSession();
      });

      // Track visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.track({ event: 'session_end' });
        }
      });
    }
  }

  setUser(userId: string) {
    this.userId = userId;
  }

  async track({ event, userId, properties = {}, timestamp }: TrackEventParams) {
    const eventData = {
      event,
      user_id: userId || this.userId,
      session_id: this.sessionId,
      timestamp: (timestamp || new Date()).toISOString(),
      properties: {
        ...properties,
        session_duration_ms: Date.now() - this.sessionStart.getTime(),
        url: typeof window !== 'undefined' ? window.location.pathname : null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    };

    // Log locally in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventData);
    }

    // Send to Supabase
    try {
      await supabase.from('analytics_events').insert(eventData);
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
      // Queue for retry
      this.queueFailedEvent(eventData);
    }
  }

  private queueFailedEvent(event: any) {
    try {
      const queue = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
      queue.push(event);
      localStorage.setItem('analytics_queue', JSON.stringify(queue.slice(-100))); // Keep last 100
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  async flushQueue() {
    try {
      const queue = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
      if (queue.length > 0) {
        await supabase.from('analytics_events').insert(queue);
        localStorage.removeItem('analytics_queue');
      }
    } catch (e) {
      // Ignore errors
    }
  }

  private async endSession() {
    const duration = Date.now() - this.sessionStart.getTime();
    await this.track({
      event: 'session_end',
      properties: { session_duration_ms: duration },
    });
  }

  // Convenience methods
  trackPageView(page: string, properties?: Record<string, any>) {
    return this.track({
      event: 'page_view',
      properties: { page, ...properties },
    });
  }

  trackFeatureUsed(feature: string, properties?: Record<string, any>) {
    return this.track({
      event: 'feature_used',
      properties: { feature, ...properties },
    });
  }

  trackOnboardingStep(step: number, stepName: string, completed: boolean) {
    return this.track({
      event: 'onboarding_step',
      properties: { step, step_name: stepName, completed },
    });
  }

  trackAIChat(messageCount: number, responseTime?: number) {
    return this.track({
      event: 'ai_chat_sent',
      properties: { message_count: messageCount, response_time_ms: responseTime },
    });
  }

  trackConversion(fromTier: string, toTier: string, revenue?: number) {
    return this.track({
      event: 'subscription_upgraded',
      properties: { from_tier: fromTier, to_tier: toTier, revenue },
    });
  }

  trackReferral(type: 'sent' | 'accepted', referralCode: string) {
    return this.track({
      event: type === 'sent' ? 'referral_sent' : 'referral_accepted',
      properties: { referral_code: referralCode },
    });
  }

  trackNPS(score: number, feedback?: string) {
    return this.track({
      event: 'nps_submitted',
      properties: { score, feedback, category: score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor' },
    });
  }

  trackError(error: Error, context?: Record<string, any>) {
    return this.track({
      event: 'error_occurred',
      properties: {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack?.slice(0, 500),
        ...context,
      },
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsTracker();

// Helper functions for admin dashboard
export async function getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
  const { data, error } = await supabase.rpc('get_daily_metrics', { days_back: days });
  if (error) throw error;
  return data || [];
}

export async function getRetentionCohorts(weeks: number = 12): Promise<RetentionCohort[]> {
  const { data, error } = await supabase.rpc('get_retention_cohorts', { weeks_back: weeks });
  if (error) throw error;
  return data || [];
}

export async function getConversionFunnel(days: number = 30): Promise<ConversionFunnel[]> {
  const { data, error } = await supabase.rpc('get_conversion_funnel', { days_back: days });
  if (error) throw error;
  return data || [];
}

export async function getViralMetrics(days: number = 30): Promise<ViralMetrics[]> {
  const { data, error } = await supabase.rpc('get_viral_metrics', { days_back: days });
  if (error) throw error;
  return data || [];
}

export async function getFeatureAdoption(): Promise<FeatureAdoption[]> {
  const { data, error } = await supabase.rpc('get_feature_adoption');
  if (error) throw error;
  return data || [];
}

// NPS calculation
export async function getNPSMetrics(days: number = 30): Promise<{
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  responseRate: number;
}> {
  const { data, error } = await supabase.rpc('get_nps_metrics', { days_back: days });
  if (error) throw error;
  return data || { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0, responseRate: 0 };
}

// K-factor (viral coefficient) calculation
export function calculateKFactor(
  invitesSent: number,
  invitesAccepted: number,
  activeUsers: number
): number {
  if (activeUsers === 0) return 0;
  const invitesPerUser = invitesSent / activeUsers;
  const conversionRate = invitesSent > 0 ? invitesAccepted / invitesSent : 0;
  return invitesPerUser * conversionRate;
}

// Export types for components
export type { TrackEventParams };
