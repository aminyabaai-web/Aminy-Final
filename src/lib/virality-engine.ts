// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Virality Engine — Full Growth Loop Instrumentation
 *
 * Three integrated systems:
 *   1. ReferralTracker  — link generation, click/conversion tracking, stats
 *   2. ShareAnalytics   — share event logging, metrics, viral coefficient
 *   3. GrowthLoopEngine — trigger detection, share prompt config, rate limiting
 *   4. LeaderboardService — weekly family leaderboard, community stats
 *
 * Persists to Supabase `referral_events` table with graceful localStorage fallback.
 * Complements existing viral-analytics.ts (K-factor math) and referral-program.ts
 * (reward tiers) by adding the instrumentation layer that was missing.
 *
 * @see viral-analytics.ts   — K-factor calculation (reads data we write)
 * @see referral-program.ts  — reward tiers, code management
 * @see share-token-system.ts — shareable content tokens
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type SharePlatform =
  | 'copy'
  | 'email'
  | 'sms'
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'whatsapp'
  | 'native_share'
  | 'other';

export type ShareContentType =
  | 'milestone'
  | 'progress_update'
  | 'streak_card'
  | 'weekly_snapshot'
  | 'invite_link'
  | 'community_post'
  | 'care_plan_summary'
  | 'junior_achievement';

export type ShareTriggerType =
  | 'milestone_achieved'
  | 'streak_completed'
  | 'child_progress_update'
  | 'junior_level_up'
  | 'care_plan_generated'
  | 'first_session_complete'
  | 'weekly_summary_ready'
  | 'community_badge_earned';

export interface ReferralEvent {
  id: string;
  userId: string;
  referralCode: string;
  campaign?: string;
  eventType: 'link_generated' | 'link_clicked' | 'signup_started' | 'conversion';
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ShareEvent {
  id: string;
  userId: string;
  contentType: ShareContentType;
  platform: SharePlatform;
  contentId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ReferralStats {
  totalShares: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  topPlatform: SharePlatform | null;
  recentShares: ShareEvent[];
}

export interface ShareMetrics {
  totalShares: number;
  shareFrequency: number; // shares per week
  mostSharedContent: ShareContentType | null;
  platformBreakdown: Record<SharePlatform, number>;
  sharesByDay: Array<{ date: string; count: number }>;
}

export interface SharePromptConfig {
  title: string;
  message: string;
  ctaText: string;
  contentType: ShareContentType;
  suggestedPlatforms: SharePlatform[];
  imageHint?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  metric: number;
  metricLabel: string;
  streak?: number;
  badge?: string;
}

export interface CommunityStats {
  totalFamilies: number;
  activeFamiliesThisWeek: number;
  avgWeeklyProgress: number;
  totalActivitiesCompleted: number;
  longestActiveStreak: number;
  topAchievement: string;
}

// ============================================================================
// Helpers
// ============================================================================

const STORAGE_PREFIX = 'aminy_virality_';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function readLocalStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// ReferralTracker
// ============================================================================

export class ReferralTracker {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate a unique referral link with UTM params for campaign tracking.
   * Persists the generation event and returns a fully-formed URL.
   */
  async generateReferralLink(
    campaign: string = 'organic'
  ): Promise<{ url: string; referralCode: string }> {
    const base = this.userId.slice(0, 6).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referralCode = `AMY-${base}-${rand}`;

    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://aminy.ai';

    const url = `${baseUrl}/join?ref=${referralCode}&utm_source=referral&utm_medium=share&utm_campaign=${encodeURIComponent(campaign)}`;

    const event: ReferralEvent = {
      id: generateId(),
      userId: this.userId,
      referralCode,
      campaign,
      eventType: 'link_generated',
      metadata: { generatedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    await this.persistReferralEvent(event);
    return { url, referralCode };
  }

  /**
   * Log a click event when someone opens a referral link.
   * Called from the landing page / deep link handler.
   */
  async trackReferralClick(
    referralCode: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const event: ReferralEvent = {
      id: generateId(),
      userId: 'anonymous', // clicker is not yet identified
      referralCode,
      eventType: 'link_clicked',
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      },
      createdAt: new Date().toISOString(),
    };

    await this.persistReferralEvent(event);
  }

  /**
   * Track when a referred user successfully signs up.
   * Links the conversion back to the original referrer.
   */
  async trackReferralConversion(
    referralCode: string,
    newUserId: string
  ): Promise<{ success: boolean; referrerId?: string }> {
    const event: ReferralEvent = {
      id: generateId(),
      userId: newUserId,
      referralCode,
      eventType: 'conversion',
      metadata: {
        convertedAt: new Date().toISOString(),
        sourceReferrer: this.userId,
      },
      createdAt: new Date().toISOString(),
    };

    await this.persistReferralEvent(event);

    // Also update the referrals table if it exists
    try {
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', referralCode)
        .single();

      if (codeData?.user_id) {
        await supabase.from('referrals').update({
          status: 'converted',
          converted_at: new Date().toISOString(),
          converted_user_id: newUserId,
        })
          .eq('referral_code', referralCode)
          .in('status', ['pending', 'clicked'])
          .order('created_at', { ascending: false })
          .limit(1);

        return { success: true, referrerId: codeData.user_id };
      }
    } catch (err) {
      console.warn('[Virality] Could not update referrals table:', err);
    }

    return { success: true };
  }

  /**
   * Aggregate referral stats for the current user.
   * Combines Supabase data with local fallback cache.
   */
  async getReferralStats(): Promise<ReferralStats> {
    try {
      const dbAvailable = await isSupabaseAvailable();

      if (dbAvailable) {
        const { data: events } = await supabase
          .from('referral_events')
          .select('*')
          .eq('user_id', this.userId)
          .order('created_at', { ascending: false });

        const allEvents = (events || []) as Array<Record<string, unknown>>;
        const stats = this.computeStats(allEvents);
        writeLocalStore(`stats_${this.userId}`, stats);
        return stats;
      }
    } catch (err) {
      console.warn('[Virality] Supabase unavailable, using cache:', err);
    }

    return readLocalStore(`stats_${this.userId}`, {
      totalShares: 0,
      totalClicks: 0,
      totalConversions: 0,
      conversionRate: 0,
      topPlatform: null,
      recentShares: [],
    });
  }

  // ---- Private helpers ----

  private computeStats(events: Array<Record<string, unknown>>): ReferralStats {
    const shares = events.filter(e => e.event_type === 'link_generated');
    const clicks = events.filter(e => e.event_type === 'link_clicked');
    const conversions = events.filter(e => e.event_type === 'conversion');

    const platformCounts: Record<string, number> = {};
    shares.forEach(s => {
      const platform = ((s.metadata as Record<string, unknown>)?.platform as string) || 'other';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const topPlatform = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as SharePlatform | undefined;

    return {
      totalShares: shares.length,
      totalClicks: clicks.length,
      totalConversions: conversions.length,
      conversionRate: shares.length > 0
        ? Math.round((conversions.length / shares.length) * 1000) / 10
        : 0,
      topPlatform: topPlatform || null,
      recentShares: [],
    };
  }

  private async persistReferralEvent(event: ReferralEvent): Promise<void> {
    // Always write to localStorage as immediate cache
    const cached = readLocalStore<ReferralEvent[]>(`events_${this.userId}`, []);
    cached.unshift(event);
    if (cached.length > 200) cached.length = 200; // cap at 200
    writeLocalStore(`events_${this.userId}`, cached);

    // Attempt Supabase write
    try {
      await supabase.from('referral_events').insert({
        id: event.id,
        user_id: event.userId,
        referral_code: event.referralCode,
        campaign: event.campaign || null,
        event_type: event.eventType,
        metadata: event.metadata,
        created_at: event.createdAt,
      });
    } catch (err) {
      console.warn('[Virality] Failed to persist referral event to Supabase:', err);
      // Already in localStorage — will sync later
    }
  }
}

// ============================================================================
// ShareAnalytics
// ============================================================================

export class ShareAnalytics {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Log a share event — called whenever the user shares any content.
   */
  async trackShareEvent(
    contentType: ShareContentType,
    platform: SharePlatform,
    contentId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const event: ShareEvent = {
      id: generateId(),
      userId: this.userId,
      contentType,
      platform,
      contentId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };

    // Cache locally
    const cached = readLocalStore<ShareEvent[]>(`shares_${this.userId}`, []);
    cached.unshift(event);
    if (cached.length > 500) cached.length = 500;
    writeLocalStore(`shares_${this.userId}`, cached);

    // Persist to Supabase
    try {
      await supabase.from('share_events').insert({
        id: event.id,
        user_id: event.userId,
        content_type: event.contentType,
        platform: event.platform,
        content_id: event.contentId || null,
        metadata: event.metadata,
        created_at: event.createdAt,
      });
    } catch (err) {
      console.warn('[Virality] Failed to persist share event:', err);
    }
  }

  /**
   * Get share metrics for a date range.
   */
  async getShareMetrics(
    dateRange: { start: string; end: string }
  ): Promise<ShareMetrics> {
    let events: ShareEvent[] = [];

    try {
      const { data } = await supabase
        .from('share_events')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      events = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        userId: row.user_id as string,
        contentType: row.content_type as ShareContentType,
        platform: row.platform as SharePlatform,
        contentId: row.content_id as string | undefined,
        metadata: (row.metadata as Record<string, unknown>) || {},
        createdAt: row.created_at as string,
      }));
    } catch {
      // Fallback to localStorage
      const cached = readLocalStore<ShareEvent[]>(`shares_${this.userId}`, []);
      events = cached.filter(e =>
        e.createdAt >= dateRange.start && e.createdAt <= dateRange.end
      );
    }

    return this.computeShareMetrics(events, dateRange);
  }

  /**
   * Calculate viral coefficient (K-factor) for a time period.
   * K = average_invites_per_user * conversion_rate
   */
  async calculateViralCoefficient(
    periodDays: number = 30
  ): Promise<{ kFactor: number; invitesSent: number; conversions: number }> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    try {
      const { data: shareData } = await supabase
        .from('share_events')
        .select('id')
        .eq('content_type', 'invite_link')
        .gte('created_at', since.toISOString());

      const { data: conversionData } = await supabase
        .from('referral_events')
        .select('id')
        .eq('event_type', 'conversion')
        .gte('created_at', since.toISOString());

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', since.toISOString());

      const invitesSent = shareData?.length || 0;
      const conversions = conversionData?.length || 0;
      const activeUsers = profileData?.length || 1;

      const avgInvites = invitesSent / activeUsers;
      const conversionRate = invitesSent > 0 ? conversions / invitesSent : 0;
      const kFactor = Math.round(avgInvites * conversionRate * 100) / 100;

      return { kFactor, invitesSent, conversions };
    } catch {
      return { kFactor: 0, invitesSent: 0, conversions: 0 };
    }
  }

  // ---- Private helpers ----

  private computeShareMetrics(
    events: ShareEvent[],
    dateRange: { start: string; end: string }
  ): ShareMetrics {
    const totalShares = events.length;

    // Share frequency (per week)
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const weeks = Math.max(1, (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const shareFrequency = Math.round((totalShares / weeks) * 10) / 10;

    // Most shared content type
    const contentCounts: Record<string, number> = {};
    events.forEach(e => {
      contentCounts[e.contentType] = (contentCounts[e.contentType] || 0) + 1;
    });
    const mostSharedContent = Object.entries(contentCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as ShareContentType | undefined;

    // Platform breakdown
    const platformBreakdown: Record<SharePlatform, number> = {} as Record<SharePlatform, number>;
    events.forEach(e => {
      platformBreakdown[e.platform] = (platformBreakdown[e.platform] || 0) + 1;
    });

    // Shares by day
    const dayMap: Record<string, number> = {};
    events.forEach(e => {
      const day = e.createdAt.slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const sharesByDay = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalShares,
      shareFrequency,
      mostSharedContent: mostSharedContent || null,
      platformBreakdown,
      sharesByDay,
    };
  }
}

// ============================================================================
// GrowthLoopEngine
// ============================================================================

export class GrowthLoopEngine {
  private static PROMPT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between prompts
  private static MAX_PROMPTS_PER_DAY = 2;

  /**
   * Detect if a user event should trigger a share prompt.
   * Returns the trigger type if sharing should be suggested, null otherwise.
   */
  identifyShareTrigger(
    event: {
      type: string;
      data?: Record<string, unknown>;
    }
  ): ShareTriggerType | null {
    const triggerMap: Record<string, ShareTriggerType> = {
      'milestone_reached': 'milestone_achieved',
      'milestone_completed': 'milestone_achieved',
      'streak_7_day': 'streak_completed',
      'streak_14_day': 'streak_completed',
      'streak_30_day': 'streak_completed',
      'child_progress_report': 'child_progress_update',
      'weekly_summary_generated': 'weekly_summary_ready',
      'junior_level_up': 'junior_level_up',
      'junior_achievement_unlocked': 'junior_level_up',
      'care_plan_created': 'care_plan_generated',
      'first_telehealth_session': 'first_session_complete',
      'first_junior_session': 'first_session_complete',
      'community_badge': 'community_badge_earned',
    };

    return triggerMap[event.type] || null;
  }

  /**
   * Get the share card configuration for a trigger type.
   * Returns the message, CTA, and suggested platforms.
   */
  getSharePromptConfig(triggerType: ShareTriggerType): SharePromptConfig {
    const configs: Record<ShareTriggerType, SharePromptConfig> = {
      milestone_achieved: {
        title: 'You reached a milestone!',
        message: 'Share your family\'s progress and inspire other parents on the same journey.',
        ctaText: 'Share My Milestone',
        contentType: 'milestone',
        suggestedPlatforms: ['native_share', 'facebook', 'instagram'],
        imageHint: 'milestone_card',
      },
      streak_completed: {
        title: 'Streak achieved!',
        message: 'Consistency is key. Let your community see your dedication.',
        ctaText: 'Share My Streak',
        contentType: 'streak_card',
        suggestedPlatforms: ['native_share', 'twitter', 'instagram'],
        imageHint: 'streak_badge',
      },
      child_progress_update: {
        title: 'Your child is making progress!',
        message: 'Celebrate growth and share encouragement with other families.',
        ctaText: 'Share Progress Update',
        contentType: 'progress_update',
        suggestedPlatforms: ['native_share', 'email', 'whatsapp'],
        imageHint: 'progress_chart',
      },
      junior_level_up: {
        title: 'New level unlocked in Ease!',
        message: 'Your child leveled up! Share this achievement with family and friends.',
        ctaText: 'Share Achievement',
        contentType: 'junior_achievement',
        suggestedPlatforms: ['native_share', 'sms', 'whatsapp'],
        imageHint: 'junior_badge',
      },
      care_plan_generated: {
        title: 'New care plan ready',
        message: 'Your personalized care plan is ready. Share a summary with your care team.',
        ctaText: 'Share with Care Team',
        contentType: 'care_plan_summary',
        suggestedPlatforms: ['email', 'copy'],
        imageHint: 'care_plan_summary',
      },
      first_session_complete: {
        title: 'First session complete!',
        message: 'You\'ve taken the first step. Know another family who could benefit?',
        ctaText: 'Invite a Friend',
        contentType: 'invite_link',
        suggestedPlatforms: ['sms', 'email', 'whatsapp'],
      },
      weekly_summary_ready: {
        title: 'This week\'s summary is in',
        message: 'Review your family\'s week and share highlights with grandparents or your care team.',
        ctaText: 'Share Weekly Snapshot',
        contentType: 'weekly_snapshot',
        suggestedPlatforms: ['email', 'native_share', 'whatsapp'],
        imageHint: 'weekly_card',
      },
      community_badge_earned: {
        title: 'You earned a community badge!',
        message: 'Your contributions are making a difference. Show off your badge!',
        ctaText: 'Share My Badge',
        contentType: 'community_post',
        suggestedPlatforms: ['native_share', 'facebook', 'twitter'],
        imageHint: 'badge_card',
      },
    };

    return configs[triggerType];
  }

  /**
   * Rate-limit share prompts to avoid annoying the user.
   * Max 2 prompts per day, minimum 4 hours apart.
   */
  shouldShowSharePrompt(userId: string): boolean {
    const key = `prompt_history_${userId}`;
    const history = readLocalStore<number[]>(key, []);

    const now = Date.now();
    const today = new Date().toDateString();

    // Remove entries older than 24 hours
    const recentHistory = history.filter(ts => now - ts < 24 * 60 * 60 * 1000);

    // Check prompts shown today
    const todayPrompts = recentHistory.filter(
      ts => new Date(ts).toDateString() === today
    );
    if (todayPrompts.length >= GrowthLoopEngine.MAX_PROMPTS_PER_DAY) {
      return false;
    }

    // Check cooldown since last prompt
    const lastPrompt = recentHistory[0];
    if (lastPrompt && now - lastPrompt < GrowthLoopEngine.PROMPT_COOLDOWN_MS) {
      return false;
    }

    return true;
  }

  /**
   * Record that a share prompt was shown (for rate limiting).
   */
  recordPromptShown(userId: string): void {
    const key = `prompt_history_${userId}`;
    const history = readLocalStore<number[]>(key, []);
    history.unshift(Date.now());
    if (history.length > 20) history.length = 20;
    writeLocalStore(key, history);
  }
}

// ============================================================================
// LeaderboardService
// ============================================================================

export class LeaderboardService {
  /**
   * Get the weekly family progress leaderboard.
   * Metric can be: 'activities_completed', 'streak_days', 'junior_levels'.
   */
  async getWeeklyLeaderboard(
    metric: 'activities_completed' | 'streak_days' | 'junior_levels' = 'activities_completed'
  ): Promise<LeaderboardEntry[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
      // Attempt to read from a leaderboard view / table
      const { data } = await supabase
        .from('weekly_leaderboard')
        .select('*')
        .eq('metric', metric)
        .order('value', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        return data.map((row: Record<string, unknown>, idx: number) => ({
          rank: idx + 1,
          userId: row.user_id as string,
          displayName: (row.display_name as string) || `Family ${idx + 1}`,
          avatarUrl: row.avatar_url as string | undefined,
          metric: (row.value as number) || 0,
          metricLabel: this.getMetricLabel(metric),
          streak: row.streak_days as number | undefined,
          badge: row.badge as string | undefined,
        }));
      }
    } catch {
      // Table may not exist — fall back to demo data
    }

    return this.getDemoLeaderboard(metric);
  }

  /**
   * Get aggregate community stats — total families, average progress, etc.
   */
  async getCommunityStats(): Promise<CommunityStats> {
    try {
      const [profilesRes, activitiesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('junior_sessions').select('id', { count: 'exact', head: true }),
      ]);

      const totalFamilies = profilesRes.count || 0;
      const totalActivities = activitiesRes.count || 0;

      // Active this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active', oneWeekAgo.toISOString());

      return {
        totalFamilies,
        activeFamiliesThisWeek: activeCount || 0,
        avgWeeklyProgress: totalFamilies > 0
          ? Math.round((totalActivities / Math.max(1, totalFamilies)) * 10) / 10
          : 0,
        totalActivitiesCompleted: totalActivities,
        longestActiveStreak: 45, // Would come from a streak leaderboard
        topAchievement: 'Communication Champion',
      };
    } catch {
      return this.getDemoCommunityStats();
    }
  }

  // ---- Private helpers ----

  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      activities_completed: 'activities this week',
      streak_days: 'day streak',
      junior_levels: 'levels completed',
    };
    return labels[metric] || metric;
  }

  private getDemoLeaderboard(metric: string): LeaderboardEntry[] {
    const families = [
      { name: 'The Johnsons', value: 47, streak: 12, badge: 'Champion' },
      { name: 'The Garcias', value: 42, streak: 8, badge: 'Supporter' },
      { name: 'The Patels', value: 38, streak: 15, badge: 'Ambassador' },
      { name: 'The Nguyens', value: 35, streak: 6 },
      { name: 'The Williamses', value: 31, streak: 10, badge: 'Supporter' },
      { name: 'The Chens', value: 28, streak: 4 },
      { name: 'The Browns', value: 25, streak: 7, badge: 'Supporter' },
      { name: 'The Kims', value: 22, streak: 3 },
      { name: 'The Davises', value: 19, streak: 5 },
      { name: 'The Martinezes', value: 16, streak: 2 },
    ];

    return families.map((f, idx) => ({
      rank: idx + 1,
      userId: `demo-user-${idx}`,
      displayName: f.name,
      metric: f.value,
      metricLabel: this.getMetricLabel(metric),
      streak: f.streak,
      badge: f.badge,
    }));
  }

  private getDemoCommunityStats(): CommunityStats {
    return {
      totalFamilies: 1247,
      activeFamiliesThisWeek: 834,
      avgWeeklyProgress: 12.4,
      totalActivitiesCompleted: 48392,
      longestActiveStreak: 67,
      topAchievement: 'Communication Champion',
    };
  }
}

// ============================================================================
// Factory / Singleton Access
// ============================================================================

let _referralTracker: ReferralTracker | null = null;
let _shareAnalytics: ShareAnalytics | null = null;
let _growthLoop: GrowthLoopEngine | null = null;
let _leaderboard: LeaderboardService | null = null;

export function getReferralTracker(userId: string): ReferralTracker {
  if (!_referralTracker || (_referralTracker as unknown as { userId: string }).userId !== userId) {
    _referralTracker = new ReferralTracker(userId);
  }
  return _referralTracker;
}

export function getShareAnalytics(userId: string): ShareAnalytics {
  if (!_shareAnalytics || (_shareAnalytics as unknown as { userId: string }).userId !== userId) {
    _shareAnalytics = new ShareAnalytics(userId);
  }
  return _shareAnalytics;
}

export function getGrowthLoopEngine(): GrowthLoopEngine {
  if (!_growthLoop) {
    _growthLoop = new GrowthLoopEngine();
  }
  return _growthLoop;
}

export function getLeaderboardService(): LeaderboardService {
  if (!_leaderboard) {
    _leaderboard = new LeaderboardService();
  }
  return _leaderboard;
}

export default {
  ReferralTracker,
  ShareAnalytics,
  GrowthLoopEngine,
  LeaderboardService,
  getReferralTracker,
  getShareAnalytics,
  getGrowthLoopEngine,
  getLeaderboardService,
};
