// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Junior Insights Bridge — Child → Parent Data Flow
 *
 * Collects Junior session data (activities, accuracy, time-on-task, domains,
 * sensory load tolerance, engagement patterns), generates human-readable
 * summaries, detects patterns, and produces proactive alerts.
 *
 * This module sits BETWEEN the raw session data in parent-junior-bridge.ts
 * and the Ask Aminy AI. It transforms raw progress entries into:
 *   1. Structured insight snapshots the AI can query
 *   2. Natural-language summaries parents can read at a glance
 *   3. Proactive alerts when patterns or gaps are detected
 *
 * Architecture:
 *   JuniorInsightsBridge (class, singleton)
 *     - collectSessionSnapshot(childId)   → SessionSnapshot
 *     - generateReadableSummary(childId)   → string
 *     - detectPatterns(childId)            → PatternAlert[]
 *     - getProactiveAlerts(childId)        → ProactiveAlert[]
 *     - getEngagementMetrics(childId)      → EngagementMetrics
 *     - persistSnapshot(snapshot)          → Supabase upsert
 *
 * Data sources:
 *   - parent-junior-bridge.ts (localStorage progress, focus areas)
 *   - adaptive_difficulty table (Supabase — rolling accuracy, levels)
 *   - junior_difficulty_history table (Supabase — per-attempt records)
 */

import { supabase } from '../utils/supabase/client';
import {
  getRecentProgress,
  generateWeeklySummary,
  getFocusAreas,
  type JuniorProgressEntry,
  type JuniorWeeklySummary,
  type FocusDomain,
} from './parent-junior-bridge';

// ============================================================================
// Types
// ============================================================================

export interface SessionSnapshot {
  childId: string;
  generatedAt: string;
  /** Rolling 7-day window */
  window: {
    startDate: string;
    endDate: string;
  };
  totalSessions: number;
  totalMinutes: number;
  activeDays: number;
  domainStats: DomainStat[];
  engagementMetrics: EngagementMetrics;
  sensoryProfile: SensoryLoadProfile;
  patterns: PatternAlert[];
  proactiveAlerts: ProactiveAlert[];
  readableSummary: string;
}

export interface DomainStat {
  domain: FocusDomain;
  sessions: number;
  avgAccuracy: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  avgDurationSeconds: number;
  lastPracticed: string | null;
  daysSinceLastPractice: number;
  level: number;
}

export interface EngagementMetrics {
  /** Average time between first tap and activity completion (seconds) */
  avgTimeOnTask: number;
  /** Percentage of started activities that were completed */
  completionRate: number;
  /** Average number of activities per session day */
  activitiesPerDay: number;
  /** Longest streak of consecutive practice days */
  currentStreak: number;
  /** Average prompt level (0 = independent, 5 = full support) */
  avgPromptLevel: number;
  /** Number of sessions where child stopped before completion */
  earlyExitCount: number;
  /** Average minutes before engagement drops (based on accuracy decline) */
  optimalSessionLength: number;
}

export interface SensoryLoadProfile {
  /** Estimated tolerance level based on session patterns */
  toleranceLevel: 'low' | 'moderate' | 'high';
  /** Average session duration before accuracy drops below 60% */
  maxEffectiveMinutes: number;
  /** Domains where sensory load seems highest (longer times, lower accuracy) */
  highLoadDomains: FocusDomain[];
  /** Whether child uses calm corner frequently (>2x/week) */
  frequentCalmCornerUser: boolean;
  /** Top emotion before calm corner visits */
  topPreCalmEmotion: string | null;
}

export interface PatternAlert {
  type:
    | 'domain_avoidance'     // child avoiding a domain for 3+ days
    | 'accuracy_drop'        // accuracy dropped 15%+ in a week
    | 'engagement_decline'   // completion rate or time-on-task declining
    | 'sensory_overload'     // patterns suggesting overstimulation
    | 'frustration_pattern'  // short sessions + low accuracy + early exits
    | 'mastery_plateau'      // high accuracy but no level progression
    | 'domain_imbalance';    // practicing one domain at expense of others
  domain?: FocusDomain;
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  description: string;
  suggestedAction: string;
  data: Record<string, unknown>;
  detectedAt: string;
}

export interface ProactiveAlert {
  type:
    | 'practice_gap'           // no practice in N days for a domain
    | 'session_length_hint'    // suggest shorter/longer sessions
    | 'difficulty_suggestion'  // AI recommends level change
    | 'celebration'            // milestone or streak worth celebrating
    | 'focus_area_progress'    // progress on parent-set focus area
    | 'calm_corner_reminder';  // suggest calm corner before difficult domain
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionScreen?: string;
  data: Record<string, unknown>;
  generatedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ALL_DOMAINS: FocusDomain[] = ['speech', 'social', 'regulation', 'routines', 'sensory', 'executive', 'aac'];

// ============================================================================
// JuniorInsightsBridge Class
// ============================================================================

export class JuniorInsightsBridge {

  // ==========================================================================
  // Full Snapshot Generation
  // ==========================================================================

  /**
   * Collect a comprehensive snapshot of a child's Junior usage over the last 7 days.
   * This is the primary entry point — returns everything the AI needs.
   */
  async collectSessionSnapshot(childId: string, childName?: string): Promise<SessionSnapshot> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

    // Get progress entries from localStorage bridge (last 100 for analysis)
    const recentEntries = getRecentProgress(childId, 100);
    const weekEntries = recentEntries.filter(
      e => new Date(e.completedAt) >= weekAgo
    );

    // Get adaptive difficulty data from Supabase
    const difficultyData = await this.fetchAdaptiveDifficulty(childId);

    // Build domain stats
    const domainStats = this.buildDomainStats(weekEntries, difficultyData);

    // Build engagement metrics
    const engagementMetrics = this.buildEngagementMetrics(weekEntries, recentEntries);

    // Build sensory profile
    const sensoryProfile = this.buildSensoryProfile(weekEntries);

    // Detect patterns
    const patterns = this.detectPatterns(childId, weekEntries, domainStats, engagementMetrics, sensoryProfile);

    // Generate proactive alerts
    const proactiveAlerts = this.generateProactiveAlerts(
      childId, weekEntries, domainStats, engagementMetrics, patterns
    );

    // Build readable summary
    const name = childName || 'your child';
    const readableSummary = this.generateReadableSummary(
      name, weekEntries, domainStats, engagementMetrics, sensoryProfile, patterns
    );

    // Active days count
    const activeDays = new Set(
      weekEntries.map(e => new Date(e.completedAt).toDateString())
    ).size;

    const snapshot: SessionSnapshot = {
      childId,
      generatedAt: now.toISOString(),
      window: {
        startDate: weekAgo.toISOString(),
        endDate: now.toISOString(),
      },
      totalSessions: weekEntries.length,
      totalMinutes: Math.round(
        weekEntries.reduce((s, e) => s + e.durationSeconds, 0) / 60
      ),
      activeDays,
      domainStats,
      engagementMetrics,
      sensoryProfile,
      patterns,
      proactiveAlerts,
      readableSummary,
    };

    // Persist snapshot to Supabase (fire-and-forget)
    this.persistSnapshot(snapshot).catch(err =>
      console.warn('[JuniorInsightsBridge] Snapshot persistence failed:', err)
    );

    return snapshot;
  }

  // ==========================================================================
  // Domain Stats
  // ==========================================================================

  private buildDomainStats(
    weekEntries: JuniorProgressEntry[],
    difficultyData: Array<{ skill_domain: string; rolling_accuracy: number; current_level: number }>,
  ): DomainStat[] {
    const now = Date.now();

    return ALL_DOMAINS.map(domain => {
      const domainEntries = weekEntries.filter(e => e.domain === domain);
      const sessions = domainEntries.length;

      // Accuracy from entries
      const withAccuracy = domainEntries.filter(e => e.accuracy !== undefined);
      const avgAccuracy = withAccuracy.length > 0
        ? withAccuracy.reduce((s, e) => s + (e.accuracy || 0), 0) / withAccuracy.length
        : 0;

      // Trend: first half vs second half
      const mid = Math.floor(withAccuracy.length / 2);
      let accuracyTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (withAccuracy.length >= 4) {
        const firstHalf = withAccuracy.slice(0, mid);
        const secondHalf = withAccuracy.slice(mid);
        const firstAvg = firstHalf.reduce((s, e) => s + (e.accuracy || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, e) => s + (e.accuracy || 0), 0) / secondHalf.length;
        if (secondAvg > firstAvg + 8) accuracyTrend = 'improving';
        else if (secondAvg < firstAvg - 8) accuracyTrend = 'declining';
      }

      // Duration
      const avgDurationSeconds = sessions > 0
        ? domainEntries.reduce((s, e) => s + e.durationSeconds, 0) / sessions
        : 0;

      // Last practiced
      const lastEntry = domainEntries[domainEntries.length - 1];
      const lastPracticed = lastEntry?.completedAt || null;
      const daysSinceLastPractice = lastPracticed
        ? Math.floor((now - new Date(lastPracticed).getTime()) / (24 * 60 * 60 * 1000))
        : 999;

      // Level from adaptive difficulty
      const diffRow = difficultyData.find(d => d.skill_domain === domain);
      const level = diffRow?.current_level || 0;

      return {
        domain,
        sessions,
        avgAccuracy: Math.round(avgAccuracy),
        accuracyTrend,
        avgDurationSeconds: Math.round(avgDurationSeconds),
        lastPracticed,
        daysSinceLastPractice,
        level,
      };
    });
  }

  // ==========================================================================
  // Engagement Metrics
  // ==========================================================================

  private buildEngagementMetrics(
    weekEntries: JuniorProgressEntry[],
    allRecentEntries: JuniorProgressEntry[],
  ): EngagementMetrics {
    // Average time on task
    const avgTimeOnTask = weekEntries.length > 0
      ? weekEntries.reduce((s, e) => s + e.durationSeconds, 0) / weekEntries.length
      : 0;

    // Completion rate — proxy: if accuracy > 0 or tokens earned, consider completed
    const completed = weekEntries.filter(e => (e.accuracy !== undefined && e.accuracy > 0) || e.tokensEarned > 0);
    const completionRate = weekEntries.length > 0
      ? completed.length / weekEntries.length
      : 0;

    // Activities per day
    const dayMap = new Map<string, number>();
    weekEntries.forEach(e => {
      const day = new Date(e.completedAt).toDateString();
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    const activeDays = dayMap.size;
    const activitiesPerDay = activeDays > 0
      ? weekEntries.length / activeDays
      : 0;

    // Streak: consecutive days from today going backwards
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();
      if (dayMap.has(dateStr) || (i === 0 && !dayMap.has(dateStr))) {
        // Allow today to not have entries yet
        if (dayMap.has(dateStr)) currentStreak++;
        else if (i === 0) continue;
        else break;
      } else {
        break;
      }
    }

    // Average prompt level
    const withPrompt = weekEntries.filter(e => e.promptLevel !== undefined);
    const avgPromptLevel = withPrompt.length > 0
      ? withPrompt.reduce((s, e) => s + (e.promptLevel || 0), 0) / withPrompt.length
      : 0;

    // Early exits: sessions shorter than 60 seconds with no accuracy
    const earlyExitCount = weekEntries.filter(
      e => e.durationSeconds < 60 && (e.accuracy === undefined || e.accuracy === 0)
    ).length;

    // Optimal session length: find when accuracy starts declining
    const optimalSessionLength = this.calculateOptimalSessionLength(allRecentEntries);

    return {
      avgTimeOnTask: Math.round(avgTimeOnTask),
      completionRate: Math.round(completionRate * 100) / 100,
      activitiesPerDay: Math.round(activitiesPerDay * 10) / 10,
      currentStreak,
      avgPromptLevel: Math.round(avgPromptLevel * 10) / 10,
      earlyExitCount,
      optimalSessionLength,
    };
  }

  private calculateOptimalSessionLength(entries: JuniorProgressEntry[]): number {
    if (entries.length < 5) return 10; // Default 10 minutes

    // Group entries by session day, sort by time within day
    const dayGroups = new Map<string, JuniorProgressEntry[]>();
    entries.forEach(e => {
      const day = new Date(e.completedAt).toDateString();
      if (!dayGroups.has(day)) dayGroups.set(day, []);
      dayGroups.get(day)!.push(e);
    });

    // For each day, find when accuracy drops below 60% (fatigue point)
    const fatiguePoints: number[] = [];
    dayGroups.forEach(dayEntries => {
      dayEntries.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
      let cumulativeMinutes = 0;

      for (let i = 0; i < dayEntries.length; i++) {
        cumulativeMinutes += dayEntries[i].durationSeconds / 60;
        if (dayEntries[i].accuracy !== undefined && dayEntries[i].accuracy! < 60 && i > 0) {
          fatiguePoints.push(cumulativeMinutes);
          break;
        }
      }
    });

    if (fatiguePoints.length === 0) return 15; // No fatigue detected
    const avgFatigue = fatiguePoints.reduce((s, v) => s + v, 0) / fatiguePoints.length;
    return Math.max(5, Math.round(avgFatigue));
  }

  // ==========================================================================
  // Sensory Profile
  // ==========================================================================

  private buildSensoryProfile(weekEntries: JuniorProgressEntry[]): SensoryLoadProfile {
    // Max effective minutes — when accuracy drops
    const optimalMinutes = this.calculateOptimalSessionLength(weekEntries);

    // High load domains: domains where avg duration is high but accuracy is low
    const domainLoad = ALL_DOMAINS.map(domain => {
      const entries = weekEntries.filter(e => e.domain === domain);
      if (entries.length === 0) return { domain, load: 0 };
      const avgDur = entries.reduce((s, e) => s + e.durationSeconds, 0) / entries.length;
      const avgAcc = entries.filter(e => e.accuracy !== undefined).reduce((s, e) => s + (e.accuracy || 0), 0) /
        Math.max(entries.filter(e => e.accuracy !== undefined).length, 1);
      // High load = long duration + low accuracy
      const load = avgAcc < 60 ? avgDur / 60 : 0;
      return { domain, load };
    });
    const highLoadDomains = domainLoad
      .filter(d => d.load > 2)
      .sort((a, b) => b.load - a.load)
      .map(d => d.domain);

    // Calm corner usage
    const calmEntries = weekEntries.filter(e => e.domain === 'regulation');
    const frequentCalmCornerUser = calmEntries.length >= 2;

    const emotionsBefore = calmEntries
      .map(e => e.emotionBefore)
      .filter(Boolean) as string[];
    const topPreCalmEmotion = emotionsBefore.length > 0
      ? this.mode(emotionsBefore)
      : null;

    // Tolerance level heuristic
    let toleranceLevel: 'low' | 'moderate' | 'high' = 'moderate';
    if (optimalMinutes <= 8 || highLoadDomains.length >= 3 || frequentCalmCornerUser) {
      toleranceLevel = 'low';
    } else if (optimalMinutes >= 15 && highLoadDomains.length === 0) {
      toleranceLevel = 'high';
    }

    return {
      toleranceLevel,
      maxEffectiveMinutes: optimalMinutes,
      highLoadDomains,
      frequentCalmCornerUser,
      topPreCalmEmotion,
    };
  }

  // ==========================================================================
  // Pattern Detection
  // ==========================================================================

  detectPatterns(
    childId: string,
    weekEntries: JuniorProgressEntry[],
    domainStats: DomainStat[],
    engagement: EngagementMetrics,
    sensory: SensoryLoadProfile,
  ): PatternAlert[] {
    const alerts: PatternAlert[] = [];
    const now = new Date().toISOString();
    const focusAreas = getFocusAreas(childId);
    const focusDomains = new Set(focusAreas.map(f => f.domain));

    // 1. Domain avoidance — focus domains not practiced for 3+ days
    domainStats.forEach(stat => {
      if (stat.daysSinceLastPractice >= 3 && (focusDomains.has(stat.domain) || stat.sessions > 0)) {
        alerts.push({
          type: 'domain_avoidance',
          domain: stat.domain,
          severity: focusDomains.has(stat.domain) ? 'warning' : 'info',
          title: `${formatDomain(stat.domain)} has been quiet`,
          description: `It's been ${stat.daysSinceLastPractice} days since any ${formatDomain(stat.domain).toLowerCase()} practice${focusDomains.has(stat.domain) ? ' — and this is a focus area' : ''}.`,
          suggestedAction: `Would you like me to prioritize ${formatDomain(stat.domain).toLowerCase()} activities?`,
          data: { domain: stat.domain, daysSince: stat.daysSinceLastPractice },
          detectedAt: now,
        });
      }
    });

    // 2. Accuracy drop — any domain dropped 15%+
    domainStats.forEach(stat => {
      if (stat.accuracyTrend === 'declining' && stat.sessions >= 3) {
        alerts.push({
          type: 'accuracy_drop',
          domain: stat.domain,
          severity: 'warning',
          title: `${formatDomain(stat.domain)} accuracy is slipping`,
          description: `${formatDomain(stat.domain)} accuracy dropped to ${stat.avgAccuracy}% this week. This could mean the difficulty is too high or your child may need more support.`,
          suggestedAction: `Consider lowering the difficulty for ${formatDomain(stat.domain).toLowerCase()} or adding a sensory break before these activities.`,
          data: { domain: stat.domain, avgAccuracy: stat.avgAccuracy, trend: 'declining' },
          detectedAt: now,
        });
      }
    });

    // 3. Engagement decline — high early exit rate
    if (engagement.earlyExitCount >= 3 && weekEntries.length >= 5) {
      alerts.push({
        type: 'engagement_decline',
        severity: 'warning',
        title: 'Multiple sessions ended early',
        description: `${engagement.earlyExitCount} activities were abandoned this week. Your child may be feeling frustrated or overstimulated.`,
        suggestedAction: 'Try shorter sessions with more breaks, or focus on preferred activities to rebuild momentum.',
        data: { earlyExits: engagement.earlyExitCount, total: weekEntries.length },
        detectedAt: now,
      });
    }

    // 4. Sensory overload signals
    if (sensory.toleranceLevel === 'low' && sensory.frequentCalmCornerUser) {
      alerts.push({
        type: 'sensory_overload',
        severity: 'warning',
        title: 'Sensory load may be too high',
        description: `Your child is using the calm corner frequently and shows signs of sensory fatigue after about ${sensory.maxEffectiveMinutes} minutes. ${sensory.topPreCalmEmotion ? `Most common feeling before calm corner: "${sensory.topPreCalmEmotion}".` : ''}`,
        suggestedAction: 'Consider shorter sessions, enabling Sensory Mode, or scheduling activities at lower-energy times.',
        data: { toleranceLevel: sensory.toleranceLevel, maxMinutes: sensory.maxEffectiveMinutes },
        detectedAt: now,
      });
    }

    // 5. Frustration pattern — short sessions + low accuracy + early exits together
    const shortLowAccuracy = weekEntries.filter(
      e => e.durationSeconds < 120 && e.accuracy !== undefined && e.accuracy < 50
    );
    if (shortLowAccuracy.length >= 3) {
      alerts.push({
        type: 'frustration_pattern',
        severity: 'urgent',
        title: 'Possible frustration pattern detected',
        description: `${shortLowAccuracy.length} activities this week were very short with low accuracy — your child may be getting frustrated. This is completely normal and something we can address.`,
        suggestedAction: 'Lower the difficulty across affected domains, introduce more frequent rewards, and keep sessions to 5 minutes or less.',
        data: { count: shortLowAccuracy.length },
        detectedAt: now,
      });
    }

    // 6. Domain imbalance — one domain has 70%+ of all sessions
    if (weekEntries.length >= 5) {
      const domainCounts = new Map<string, number>();
      weekEntries.forEach(e => domainCounts.set(e.domain, (domainCounts.get(e.domain) || 0) + 1));
      domainCounts.forEach((count, domain) => {
        if (count / weekEntries.length >= 0.7) {
          alerts.push({
            type: 'domain_imbalance',
            domain: domain as FocusDomain,
            severity: 'info',
            title: `Heavy focus on ${formatDomain(domain)}`,
            description: `${Math.round(count / weekEntries.length * 100)}% of this week's activities were ${formatDomain(domain).toLowerCase()}. A balanced practice across domains can support broader development.`,
            suggestedAction: `Mix in some ${ALL_DOMAINS.filter(d => d !== domain).slice(0, 2).map(formatDomain).join(' and ').toLowerCase()} activities.`,
            data: { domain, percentage: Math.round(count / weekEntries.length * 100) },
            detectedAt: now,
          });
        }
      });
    }

    return alerts;
  }

  // ==========================================================================
  // Proactive Alerts
  // ==========================================================================

  generateProactiveAlerts(
    childId: string,
    weekEntries: JuniorProgressEntry[],
    domainStats: DomainStat[],
    engagement: EngagementMetrics,
    patterns: PatternAlert[],
  ): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];
    const now = new Date().toISOString();
    const focusAreas = getFocusAreas(childId);

    // 1. Practice gap alerts for focus domains
    const focusDomains = focusAreas.map(f => f.domain);
    focusDomains.forEach(domain => {
      const stat = domainStats.find(s => s.domain === domain);
      if (stat && stat.daysSinceLastPractice >= 2 && stat.daysSinceLastPractice < 999) {
        alerts.push({
          type: 'practice_gap',
          title: `Time for ${formatDomain(domain).toLowerCase()} practice`,
          message: `It's been ${stat.daysSinceLastPractice} days since any ${formatDomain(domain).toLowerCase()} practice — would you like me to prioritize ${formatDomain(domain).toLowerCase()} activities?`,
          priority: stat.daysSinceLastPractice >= 3 ? 'high' : 'medium',
          actionScreen: 'junior-session',
          data: { domain, daysSince: stat.daysSinceLastPractice },
          generatedAt: now,
        });
      }
    });

    // 2. Session length hints based on engagement data
    if (engagement.optimalSessionLength < 8 && weekEntries.length >= 5) {
      alerts.push({
        type: 'session_length_hint',
        title: 'Consider shorter sessions',
        message: `Based on engagement patterns, your child does best in sessions under ${engagement.optimalSessionLength} minutes. Shorter, more frequent practice beats long sessions.`,
        priority: 'medium',
        data: { optimalMinutes: engagement.optimalSessionLength },
        generatedAt: now,
      });
    }

    // 3. Celebration alerts — streaks and milestones
    if (engagement.currentStreak >= 3) {
      alerts.push({
        type: 'celebration',
        title: `${engagement.currentStreak}-day streak!`,
        message: `Amazing consistency! ${engagement.currentStreak} days in a row using Ease. Consistency is what makes the biggest difference.`,
        priority: 'low',
        data: { streak: engagement.currentStreak },
        generatedAt: now,
      });
    }

    // High accuracy celebration
    const highAccuracyDomains = domainStats.filter(
      s => s.avgAccuracy >= 85 && s.sessions >= 3 && s.accuracyTrend === 'improving'
    );
    highAccuracyDomains.forEach(stat => {
      alerts.push({
        type: 'celebration',
        title: `${formatDomain(stat.domain)} is soaring!`,
        message: `${stat.avgAccuracy}% accuracy in ${formatDomain(stat.domain).toLowerCase()} and still improving! This is excellent progress.`,
        priority: 'low',
        data: { domain: stat.domain, accuracy: stat.avgAccuracy },
        generatedAt: now,
      });
    });

    // 4. Focus area progress reporting
    focusAreas.forEach(area => {
      const stat = domainStats.find(s => s.domain === area.domain);
      if (stat && stat.sessions >= 3) {
        const goalsSummary = area.goals.slice(0, 2).join(' and ');
        alerts.push({
          type: 'focus_area_progress',
          title: `Focus area update: ${formatDomain(area.domain)}`,
          message: `This week: ${stat.sessions} sessions, ${stat.avgAccuracy}% accuracy (${stat.accuracyTrend}). Goals: ${goalsSummary}.`,
          priority: 'medium',
          data: { domain: area.domain, sessions: stat.sessions, accuracy: stat.avgAccuracy, trend: stat.accuracyTrend },
          generatedAt: now,
        });
      }
    });

    // 5. Calm corner reminder before difficult domains
    const frustrationPatterns = patterns.filter(p => p.type === 'frustration_pattern' || p.type === 'accuracy_drop');
    if (frustrationPatterns.length > 0) {
      alerts.push({
        type: 'calm_corner_reminder',
        title: 'Try a calm moment first',
        message: 'Based on recent patterns, starting with a quick calm corner visit before harder activities may help. A 2-minute breathing exercise can make a big difference.',
        priority: 'medium',
        actionScreen: 'junior-session',
        data: { relatedPatterns: frustrationPatterns.map(p => p.type) },
        generatedAt: now,
      });
    }

    return alerts;
  }

  // ==========================================================================
  // Readable Summary Generation
  // ==========================================================================

  generateReadableSummary(
    childName: string,
    weekEntries: JuniorProgressEntry[],
    domainStats: DomainStat[],
    engagement: EngagementMetrics,
    sensory: SensoryLoadProfile,
    patterns: PatternAlert[],
  ): string {
    if (weekEntries.length === 0) {
      return `${childName} hasn't used Ease this week yet. When they do, I'll track their progress here.`;
    }

    const totalMinutes = Math.round(
      weekEntries.reduce((s, e) => s + e.durationSeconds, 0) / 60
    );
    const activeDays = new Set(
      weekEntries.map(e => new Date(e.completedAt).toDateString())
    ).size;

    const parts: string[] = [];

    // Overview
    parts.push(
      `${childName} completed ${weekEntries.length} activit${weekEntries.length === 1 ? 'y' : 'ies'} across ${activeDays} day${activeDays === 1 ? '' : 's'} this week (${totalMinutes} minutes total).`
    );

    // Domain highlights
    const activeDomains = domainStats.filter(s => s.sessions > 0);
    if (activeDomains.length > 0) {
      const domainParts = activeDomains
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 3)
        .map(s => {
          const trendEmoji = s.accuracyTrend === 'improving' ? ' and improving' :
            s.accuracyTrend === 'declining' ? ' but declining' : '';
          return `${formatDomain(s.domain)} (${s.avgAccuracy}% accuracy${trendEmoji})`;
        });
      parts.push(`Domains practiced: ${domainParts.join(', ')}.`);
    }

    // Engagement note
    if (engagement.currentStreak >= 3) {
      parts.push(`They're on a ${engagement.currentStreak}-day streak — great consistency!`);
    }

    // Sensory insight
    if (sensory.toleranceLevel === 'low') {
      parts.push(`Engagement tends to drop after about ${sensory.maxEffectiveMinutes} minutes — consider shorter sessions.`);
    }

    // Key patterns (top 2)
    const urgentPatterns = patterns.filter(p => p.severity === 'urgent' || p.severity === 'warning');
    urgentPatterns.slice(0, 2).forEach(p => {
      parts.push(p.description);
    });

    return parts.join(' ');
  }

  // ==========================================================================
  // Supabase Helpers
  // ==========================================================================

  private async fetchAdaptiveDifficulty(childId: string): Promise<Array<{
    skill_domain: string;
    rolling_accuracy: number;
    current_level: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('adaptive_difficulty')
        .select('skill_domain, rolling_accuracy, current_level')
        .eq('child_id', childId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[JuniorInsightsBridge] Adaptive difficulty fetch failed:', err);
      return [];
    }
  }

  private async persistSnapshot(snapshot: SessionSnapshot): Promise<void> {
    try {
      await supabase.from('junior_insight_snapshots').upsert({
        child_id: snapshot.childId,
        generated_at: snapshot.generatedAt,
        window_start: snapshot.window.startDate,
        window_end: snapshot.window.endDate,
        total_sessions: snapshot.totalSessions,
        total_minutes: snapshot.totalMinutes,
        active_days: snapshot.activeDays,
        domain_stats: snapshot.domainStats,
        engagement_metrics: snapshot.engagementMetrics,
        sensory_profile: snapshot.sensoryProfile,
        patterns: snapshot.patterns,
        proactive_alerts: snapshot.proactiveAlerts,
        readable_summary: snapshot.readableSummary,
      }, { onConflict: 'child_id' });
    } catch (err) {
      // Non-critical — snapshot is used from memory anyway
      console.warn('[JuniorInsightsBridge] Snapshot persistence failed:', err);
    }
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  private mode(arr: string[]): string {
    const counts: Record<string, number> = {};
    arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatDomain(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _bridge: JuniorInsightsBridge | null = null;

export function getInsightsBridge(): JuniorInsightsBridge {
  if (!_bridge) _bridge = new JuniorInsightsBridge();
  return _bridge;
}

/**
 * Quick helper: get a full session snapshot for a child.
 */
export async function collectJuniorSnapshot(
  childId: string,
  childName?: string,
): Promise<SessionSnapshot> {
  return getInsightsBridge().collectSessionSnapshot(childId, childName);
}

export default JuniorInsightsBridge;
