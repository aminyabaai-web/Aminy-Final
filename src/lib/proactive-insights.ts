// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Proactive AI Insights Engine
 *
 * Analyzes Junior progress, behavior patterns, and conversation history
 * to generate contextual, actionable insights for parents.
 *
 * This is distinct from:
 *   - proactive-nudges.ts — time-based nudges (bedtime, streaks, session reminders)
 *   - ai-memory-engine.ts — fact storage and retrieval
 *
 * This module focuses on DATA-DRIVEN insight generation:
 *   - Junior progress trends (accuracy, streaks, level-ups)
 *   - Behavior pattern detection (ABC entries, triggers, timing)
 *   - Daily personalized insights with specific action recommendations
 *
 * Architecture:
 *   AnalyticsInsightEngine:
 *     - analyzeJuniorProgress(childId) → skill celebrations, difficulty suggestions
 *     - analyzeBehaviorPatterns(childId) → trigger patterns, time-of-day analysis
 *     - generateDailyInsight(userId) → one best insight per day
 *     - persistInsight() → saves to ai_insights table
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type InsightType =
  | 'progress_celebration'
  | 'skill_suggestion'
  | 'behavior_pattern_alert'
  | 'routine_recommendation'
  | 'self_care_reminder'
  | 'milestone_approaching';

export type InsightPriority = 'low' | 'medium' | 'high';

export interface Insight {
  id: string;
  userId: string;
  childId?: string;
  type: InsightType;
  title: string;
  body: string;
  actionType?: string; // Screen name to navigate to
  priority: InsightPriority;
  sourceData: Record<string, unknown>;
  confidence: number; // 0.0 – 1.0
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface JuniorProgressAnalysis {
  childId: string;
  skillBreakdown: Array<{
    domain: string;
    accuracy: number;
    level: number;
    trend: 'improving' | 'stable' | 'declining';
    recentAttempts: number;
  }>;
  overallAccuracy: number;
  strongestSkill: string | null;
  weakestSkill: string | null;
  insights: Insight[];
}

export interface BehaviorPatternAnalysis {
  childId: string;
  totalIncidents: number;
  topTriggers: Array<{ trigger: string; count: number }>;
  timePatterns: Array<{ hour: number; count: number }>;
  settingPatterns: Array<{ setting: string; count: number }>;
  weekOverWeekTrend: 'increasing' | 'stable' | 'decreasing';
  insights: Insight[];
}

// ============================================================================
// AnalyticsInsightEngine Class
// ============================================================================

export class AnalyticsInsightEngine {

  // ==========================================================================
  // Junior Progress Analysis
  // ==========================================================================

  /**
   * Analyze a child's Junior activity progress across all skill domains.
   * Generates celebration and suggestion insights.
   */
  async analyzeJuniorProgress(childId: string, userId: string): Promise<JuniorProgressAnalysis> {
    const result: JuniorProgressAnalysis = {
      childId,
      skillBreakdown: [],
      overallAccuracy: 0,
      strongestSkill: null,
      weakestSkill: null,
      insights: [],
    };

    try {
      // Fetch adaptive difficulty data for this child
      const { data: difficultyData } = await supabase
        .from('adaptive_difficulty')
        .select('*')
        .eq('child_id', childId);

      if (!difficultyData || difficultyData.length === 0) {
        return result;
      }

      // Process each skill domain
      let totalAccuracy = 0;
      let domainCount = 0;

      for (const row of difficultyData) {
        const recentAttempts = Array.isArray(row.recent_attempts) ? row.recent_attempts : [];
        const accuracy = row.rolling_accuracy || 0;

        // Determine trend from recent attempts
        const trend = this.calculateTrend(recentAttempts);

        result.skillBreakdown.push({
          domain: row.skill_domain,
          accuracy,
          level: row.current_level || 0,
          trend,
          recentAttempts: row.total_attempts || 0,
        });

        totalAccuracy += accuracy;
        domainCount++;
      }

      if (domainCount > 0) {
        result.overallAccuracy = totalAccuracy / domainCount;
      }

      // Identify strongest/weakest
      const sorted = [...result.skillBreakdown].sort((a, b) => b.accuracy - a.accuracy);
      if (sorted.length > 0) {
        result.strongestSkill = sorted[0].domain;
        result.weakestSkill = sorted[sorted.length - 1].domain;
      }

      // Generate insights from analysis
      result.insights = this.generateProgressInsights(userId, childId, result);

    } catch (err) {
      console.warn('[ProactiveInsights] Junior progress analysis failed:', err);
    }

    return result;
  }

  private calculateTrend(
    attempts: Array<{ correct?: boolean; timestamp?: string }>
  ): 'improving' | 'stable' | 'declining' {
    if (attempts.length < 4) return 'stable';

    const half = Math.floor(attempts.length / 2);
    const firstHalf = attempts.slice(0, half);
    const secondHalf = attempts.slice(half);

    const firstAccuracy = firstHalf.filter(a => a.correct).length / firstHalf.length;
    const secondAccuracy = secondHalf.filter(a => a.correct).length / secondHalf.length;

    const delta = secondAccuracy - firstAccuracy;
    if (delta > 0.15) return 'improving';
    if (delta < -0.15) return 'declining';
    return 'stable';
  }

  private generateProgressInsights(
    userId: string,
    childId: string,
    analysis: JuniorProgressAnalysis
  ): Insight[] {
    const insights: Insight[] = [];
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 1. High overall accuracy → celebration
    if (analysis.overallAccuracy >= 0.8 && analysis.skillBreakdown.some(s => s.recentAttempts >= 5)) {
      insights.push({
        id: `insight-prog-${Date.now()}-${rand()}`,
        userId,
        childId,
        type: 'progress_celebration',
        title: 'Amazing progress!',
        body: `Overall accuracy is at ${Math.round(analysis.overallAccuracy * 100)}% across all skills. Keep up the great work — consistency is key!`,
        actionType: 'junior-progress',
        priority: 'medium',
        sourceData: { overallAccuracy: analysis.overallAccuracy },
        confidence: 0.85,
        createdAt: now,
        expiresAt: tomorrow,
        isRead: false,
        isDismissed: false,
      });
    }

    // 2. Strongest skill doing great → celebrate specific domain
    for (const skill of analysis.skillBreakdown) {
      if (skill.accuracy >= 0.9 && skill.recentAttempts >= 10 && skill.trend === 'improving') {
        insights.push({
          id: `insight-skill-${Date.now()}-${rand()}`,
          userId,
          childId,
          type: 'progress_celebration',
          title: `${formatDomain(skill.domain)} skills are soaring!`,
          body: `${Math.round(skill.accuracy * 100)}% accuracy in ${formatDomain(skill.domain)} — and still improving. Consider leveling up for a new challenge.`,
          actionType: 'junior-session',
          priority: 'low',
          sourceData: { domain: skill.domain, accuracy: skill.accuracy, level: skill.level },
          confidence: 0.9,
          createdAt: now,
          expiresAt: tomorrow,
          isRead: false,
          isDismissed: false,
        });
        break; // Only one per analysis
      }
    }

    // 3. Declining skill → gentle suggestion
    for (const skill of analysis.skillBreakdown) {
      if (skill.trend === 'declining' && skill.recentAttempts >= 6) {
        insights.push({
          id: `insight-decline-${Date.now()}-${rand()}`,
          userId,
          childId,
          type: 'skill_suggestion',
          title: `${formatDomain(skill.domain)} could use some love`,
          body: `Recent accuracy in ${formatDomain(skill.domain)} has dipped. Sometimes a sensory break before practice helps — or try shorter sessions with more rewards.`,
          actionType: 'junior-session',
          priority: 'medium',
          sourceData: { domain: skill.domain, accuracy: skill.accuracy, trend: 'declining' },
          confidence: 0.75,
          createdAt: now,
          expiresAt: tomorrow,
          isRead: false,
          isDismissed: false,
        });
        break;
      }
    }

    // 4. Milestone approaching (near level-up)
    for (const skill of analysis.skillBreakdown) {
      if (skill.accuracy >= 0.75 && skill.accuracy < 0.8 && skill.level < 3) {
        insights.push({
          id: `insight-milestone-${Date.now()}-${rand()}`,
          userId,
          childId,
          type: 'milestone_approaching',
          title: `Almost at the next level!`,
          body: `${formatDomain(skill.domain)} accuracy is ${Math.round(skill.accuracy * 100)}% — just a bit more practice to reach 80% and unlock Level ${skill.level + 1}.`,
          actionType: 'junior-session',
          priority: 'medium',
          sourceData: { domain: skill.domain, accuracy: skill.accuracy, nextLevel: skill.level + 1 },
          confidence: 0.85,
          createdAt: now,
          expiresAt: tomorrow,
          isRead: false,
          isDismissed: false,
        });
        break;
      }
    }

    return insights;
  }

  // ==========================================================================
  // Behavior Pattern Analysis
  // ==========================================================================

  /**
   * Analyze behavior patterns from ABC entries for a child.
   * Detects trigger patterns, time-of-day correlations, and weekly trends.
   */
  async analyzeBehaviorPatterns(childId: string, userId: string): Promise<BehaviorPatternAnalysis> {
    const result: BehaviorPatternAnalysis = {
      childId,
      totalIncidents: 0,
      topTriggers: [],
      timePatterns: [],
      settingPatterns: [],
      weekOverWeekTrend: 'stable',
      insights: [],
    };

    try {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: entries } = await supabase
        .from('abc_entries')
        .select('behavior_category, antecedent_category, occurred_at, setting, intensity')
        .eq('child_id', childId)
        .gte('occurred_at', twoWeeksAgo)
        .order('occurred_at', { ascending: true });

      if (!entries || entries.length === 0) {
        return result;
      }

      result.totalIncidents = entries.length;

      // Trigger frequency
      const triggerCounts: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};
      const settingCounts: Record<string, number> = {};
      let week1Count = 0;
      let week2Count = 0;
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        // Triggers
        if (entry.antecedent_category) {
          triggerCounts[entry.antecedent_category] = (triggerCounts[entry.antecedent_category] || 0) + 1;
        }

        // Time of day
        if (entry.occurred_at) {
          const hour = new Date(entry.occurred_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;

          // Week-over-week
          if (new Date(entry.occurred_at).getTime() >= oneWeekAgo) {
            week2Count++;
          } else {
            week1Count++;
          }
        }

        // Setting
        if (entry.setting) {
          settingCounts[entry.setting] = (settingCounts[entry.setting] || 0) + 1;
        }
      }

      // Top triggers
      result.topTriggers = Object.entries(triggerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([trigger, count]) => ({ trigger, count }));

      // Time patterns
      result.timePatterns = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }));

      // Setting patterns
      result.settingPatterns = Object.entries(settingCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([setting, count]) => ({ setting, count }));

      // Week-over-week trend
      if (week2Count > week1Count * 1.3) {
        result.weekOverWeekTrend = 'increasing';
      } else if (week2Count < week1Count * 0.7) {
        result.weekOverWeekTrend = 'decreasing';
      } else {
        result.weekOverWeekTrend = 'stable';
      }

      // Generate behavior insights
      result.insights = this.generateBehaviorInsights(userId, childId, result);

    } catch (err) {
      console.warn('[ProactiveInsights] Behavior pattern analysis failed:', err);
    }

    return result;
  }

  private generateBehaviorInsights(
    userId: string,
    childId: string,
    analysis: BehaviorPatternAnalysis
  ): Insight[] {
    const insights: Insight[] = [];
    const now = new Date().toISOString();
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // 1. Decreasing incidents → celebration
    if (analysis.weekOverWeekTrend === 'decreasing' && analysis.totalIncidents >= 3) {
      insights.push({
        id: `insight-behav-${Date.now()}-${rand()}`,
        userId,
        childId,
        type: 'progress_celebration',
        title: 'Fewer challenging moments this week!',
        body: 'The strategies you\'ve been using seem to be making a difference. Keep it up — and remember to celebrate the small wins.',
        actionType: 'reports',
        priority: 'medium',
        sourceData: { trend: 'decreasing', total: analysis.totalIncidents },
        confidence: 0.8,
        createdAt: now,
        expiresAt: in48h,
        isRead: false,
        isDismissed: false,
      });
    }

    // 2. Increasing incidents → pattern alert + self-care reminder
    if (analysis.weekOverWeekTrend === 'increasing') {
      insights.push({
        id: `insight-increase-${Date.now()}-${rand()}`,
        userId,
        childId,
        type: 'behavior_pattern_alert',
        title: 'A tougher week — you\'re not alone',
        body: 'Incidents have increased this week. This is normal and doesn\'t mean you\'re doing anything wrong. Would you like to explore what might be contributing?',
        actionType: 'ask-aminy',
        priority: 'high',
        sourceData: { trend: 'increasing', total: analysis.totalIncidents },
        confidence: 0.8,
        createdAt: now,
        expiresAt: in48h,
        isRead: false,
        isDismissed: false,
      });

      // Self-care reminder when incidents increase
      insights.push({
        id: `insight-selfcare-${Date.now()}-${rand()}`,
        userId,
        childId,
        type: 'self_care_reminder',
        title: 'Check in on yourself too',
        body: 'Tough weeks take a toll on caregivers. Even 5 minutes of deep breathing or a short walk can help you reset. You deserve care too.',
        priority: 'low',
        sourceData: { reason: 'increasing_incidents' },
        confidence: 0.9,
        createdAt: now,
        expiresAt: in48h,
        isRead: false,
        isDismissed: false,
      });
    }

    // 3. Top trigger pattern → routine recommendation
    if (analysis.topTriggers.length > 0) {
      const topTrigger = analysis.topTriggers[0];
      if (topTrigger.count >= 3) {
        insights.push({
          id: `insight-trigger-${Date.now()}-${rand()}`,
          userId,
          childId,
          type: 'routine_recommendation',
          title: `"${topTrigger.trigger}" keeps coming up`,
          body: `This trigger appeared ${topTrigger.count} times in the last 2 weeks. A proactive strategy — like a visual schedule or sensory break before this trigger — could help.`,
          actionType: 'ask-aminy',
          priority: 'medium',
          sourceData: { trigger: topTrigger.trigger, count: topTrigger.count },
          confidence: 0.75,
          createdAt: now,
          expiresAt: in48h,
          isRead: false,
          isDismissed: false,
        });
      }
    }

    // 4. Time-of-day pattern → routine recommendation
    if (analysis.timePatterns.length > 0) {
      const peakHour = analysis.timePatterns[0];
      if (peakHour.count >= 3) {
        const timeLabel = formatHour(peakHour.hour);
        insights.push({
          id: `insight-time-${Date.now()}-${rand()}`,
          userId,
          childId,
          type: 'routine_recommendation',
          title: `${timeLabel} is a hot spot`,
          body: `${peakHour.count} incidents happened around ${timeLabel} in the last 2 weeks. Adding a calming activity or transition routine before this time could make a big difference.`,
          actionType: 'junior-session',
          priority: 'medium',
          sourceData: { hour: peakHour.hour, count: peakHour.count },
          confidence: 0.7,
          createdAt: now,
          expiresAt: in48h,
          isRead: false,
          isDismissed: false,
        });
      }
    }

    return insights;
  }

  // ==========================================================================
  // Daily Insight Generation
  // ==========================================================================

  /**
   * Generate the single best daily insight for a user.
   * Combines Junior progress + behavior patterns + conversation context.
   * Returns the highest-priority, highest-confidence insight.
   */
  async generateDailyInsight(userId: string, childId?: string): Promise<Insight | null> {
    const allInsights: Insight[] = [];

    try {
      // Get child IDs for this user if not provided
      const childIds: string[] = [];
      if (childId) {
        childIds.push(childId);
      } else {
        const { data: children } = await supabase
          .from('children')
          .select('id')
          .eq('parent_id', userId);
        if (children) {
          childIds.push(...children.map(c => c.id));
        }
      }

      // Analyze each child
      for (const cid of childIds) {
        const [progressAnalysis, behaviorAnalysis] = await Promise.allSettled([
          this.analyzeJuniorProgress(cid, userId),
          this.analyzeBehaviorPatterns(cid, userId),
        ]);

        if (progressAnalysis.status === 'fulfilled') {
          allInsights.push(...progressAnalysis.value.insights);
        }
        if (behaviorAnalysis.status === 'fulfilled') {
          allInsights.push(...behaviorAnalysis.value.insights);
        }
      }

      // Check if parent hasn't been active recently → self-care
      if (allInsights.length === 0) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', threeDaysAgo);

        if (count === 0 || count === null) {
          allInsights.push({
            id: `insight-checkin-${Date.now()}-${rand()}`,
            userId,
            type: 'self_care_reminder',
            title: 'How are you doing?',
            body: 'It\'s been a few days since we last talked. Even a quick check-in can help you feel supported. I\'m here whenever you need me.',
            actionType: 'ask-aminy',
            priority: 'low',
            sourceData: { reason: 'inactivity', daysSinceLastConv: 3 },
            confidence: 0.6,
            createdAt: new Date().toISOString(),
            isRead: false,
            isDismissed: false,
          });
        }
      }

      if (allInsights.length === 0) return null;

      // Deduplicate: check what we already sent today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingToday } = await supabase
        .from('ai_insights')
        .select('insight_type, source_data')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      const existingTypes = new Set(
        (existingToday || []).map(e => `${e.insight_type}:${JSON.stringify(e.source_data)}`)
      );

      const fresh = allInsights.filter(
        i => !existingTypes.has(`${mapInsightType(i.type)}:${JSON.stringify(i.sourceData)}`)
      );

      if (fresh.length === 0) return null;

      // Rank: priority × confidence
      const priorityWeights: Record<InsightPriority, number> = { high: 3, medium: 2, low: 1 };
      fresh.sort((a, b) => {
        const scoreA = priorityWeights[a.priority] * a.confidence;
        const scoreB = priorityWeights[b.priority] * b.confidence;
        return scoreB - scoreA;
      });

      const best = fresh[0];

      // Persist
      await this.persistInsight(best);

      return best;

    } catch (err) {
      console.warn('[ProactiveInsights] Daily insight generation failed:', err);
      return null;
    }
  }

  // ==========================================================================
  // Get Insights for User
  // ==========================================================================

  /**
   * Retrieve unread insights for a user.
   */
  async getUnreadInsights(userId: string, limit: number = 10): Promise<Insight[]> {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(mapDbInsight);
    } catch (err) {
      console.warn('[ProactiveInsights] Failed to get unread insights:', err);
      return [];
    }
  }

  /**
   * Mark an insight as read.
   */
  async markAsRead(insightId: string): Promise<void> {
    try {
      await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', insightId);
    } catch (err) {
      console.warn('[ProactiveInsights] Failed to mark insight as read:', err);
    }
  }

  /**
   * Dismiss an insight.
   */
  async dismissInsight(insightId: string): Promise<void> {
    try {
      await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId);
    } catch (err) {
      console.warn('[ProactiveInsights] Failed to dismiss insight:', err);
    }
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  private async persistInsight(insight: Insight): Promise<void> {
    try {
      await supabase.from('ai_insights').insert({
        id: insight.id,
        user_id: insight.userId,
        child_id: insight.childId || null,
        insight_type: mapInsightType(insight.type),
        title: insight.title,
        content: insight.body,
        action_url: insight.actionType || null,
        source_data: insight.sourceData,
        confidence: insight.confidence,
        expires_at: insight.expiresAt || null,
        is_read: false,
        is_dismissed: false,
      });
    } catch (err) {
      console.warn('[ProactiveInsights] Failed to persist insight:', err);
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function rand(): string {
  return Math.random().toString(36).slice(2, 6);
}

function formatDomain(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Map our InsightType to the DB enum values in ai_insights.insight_type.
 * DB enum: daily_tip, progress_celebration, strategy_suggestion,
 *          pattern_detected, milestone_approaching, care_plan_update
 */
function mapInsightType(type: InsightType): string {
  const map: Record<InsightType, string> = {
    progress_celebration: 'progress_celebration',
    skill_suggestion: 'strategy_suggestion',
    behavior_pattern_alert: 'pattern_detected',
    routine_recommendation: 'daily_tip',
    self_care_reminder: 'daily_tip',
    milestone_approaching: 'milestone_approaching',
  };
  return map[type] || 'daily_tip';
}

function mapDbInsight(row: Record<string, unknown>): Insight {
  // Reverse-map DB insight_type to our InsightType
  const reverseMap: Record<string, InsightType> = {
    progress_celebration: 'progress_celebration',
    strategy_suggestion: 'skill_suggestion',
    pattern_detected: 'behavior_pattern_alert',
    daily_tip: 'routine_recommendation',
    milestone_approaching: 'milestone_approaching',
    care_plan_update: 'routine_recommendation',
  };

  return {
    id: row.id as string,
    userId: row.user_id as string,
    childId: row.child_id as string | undefined,
    type: reverseMap[(row.insight_type as string)] || 'routine_recommendation',
    title: row.title as string,
    body: row.content as string,
    actionType: row.action_url as string | undefined,
    priority: 'medium', // DB doesn't store priority, default to medium
    sourceData: (row.source_data || {}) as Record<string, unknown>,
    confidence: (row.confidence || 0.5) as number,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string | undefined,
    isRead: (row.is_read || false) as boolean,
    isDismissed: (row.is_dismissed || false) as boolean,
  };
}

// ============================================================================
// Singleton & Convenience
// ============================================================================

let _engine: AnalyticsInsightEngine | null = null;

export function getInsightEngine(): AnalyticsInsightEngine {
  if (!_engine) _engine = new AnalyticsInsightEngine();
  return _engine;
}

/**
 * Quick helper: generate today's best insight for a user.
 */
export async function generateDailyInsight(
  userId: string,
  childId?: string
): Promise<Insight | null> {
  return getInsightEngine().generateDailyInsight(userId, childId);
}

export default AnalyticsInsightEngine;
