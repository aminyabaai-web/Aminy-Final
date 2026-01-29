/**
 * Report Data Aggregation Service
 *
 * Fetches and aggregates data from Supabase for report generation.
 * Provides structured data for different report types.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportData {
  period: DateRange;
  childName: string;
  childAge?: number;
  diagnosis?: string[];
  parentName?: string;

  // Activity metrics
  totalActivities: number;
  completedActivities: number;
  completionRate: number;

  // Goal metrics
  totalGoals: number;
  goalsAchieved: number;
  goalsInProgress: number;
  goalProgress: GoalProgress[];

  // Behavior tracking
  behaviors: BehaviorSummary[];
  behaviorTrends: BehaviorTrend[];

  // Outcome metrics
  outcomeMetrics: OutcomeMetric[];
  weeklyMetrics: WeeklyMetric[];

  // Observations and notes
  observations: Observation[];
  highlights: string[];
  challenges: string[];
  recommendations: string[];

  // Provider info (if applicable)
  providers?: ProviderInfo[];
  sessionSummary?: SessionSummary;
}

export interface GoalProgress {
  id: string;
  title: string;
  category: string;
  status: 'not-started' | 'in-progress' | 'achieved' | 'paused';
  currentProgress: number;
  targetProgress: number;
  startDate: string;
  lastUpdated: string;
}

export interface BehaviorSummary {
  behavior: string;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  averageIntensity?: number;
  triggers?: string[];
  successfulInterventions?: string[];
}

export interface BehaviorTrend {
  date: string;
  behaviorCount: number;
  positiveCount: number;
  challengingCount: number;
}

export interface OutcomeMetric {
  name: string;
  value: number;
  unit: string;
  change: number; // Percentage change from previous period
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean; // Whether "up" is good for this metric
}

export interface WeeklyMetric {
  weekStart: string;
  completionRate: number;
  moodAverage: number;
  stressLevel: number;
  activitiesCompleted: number;
}

export interface Observation {
  date: string;
  type: 'note' | 'milestone' | 'concern' | 'win';
  content: string;
  source: 'parent' | 'provider' | 'ai';
}

export interface ProviderInfo {
  name: string;
  title: string;
  specialty: string;
  sessionsCount: number;
  lastSession: string;
}

export interface SessionSummary {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalMinutes: number;
}

// ============================================================================
// localStorage Fallback
// ============================================================================

const STORAGE_KEY = 'aminy_report_data_cache';

function getCachedData(childId: string, key: string): any {
  if (typeof window === 'undefined') return null;
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const cacheKey = `${childId}_${key}`;
    const entry = cache[cacheKey];
    if (entry && Date.now() - entry.timestamp < 5 * 60 * 1000) { // 5 min cache
      return entry.data;
    }
  } catch {
    return null;
  }
  return null;
}

function setCachedData(childId: string, key: string, data: any): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    cache[`${childId}_${key}`] = { data, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch activity data for a child within a date range
 */
async function fetchActivityData(
  childId: string,
  dateRange: DateRange
): Promise<{ total: number; completed: number; byCategory: Record<string, number> }> {
  const cacheKey = `activities_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
  const cached = getCachedData(childId, cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('child_id', childId)
      .gte('logged_at', dateRange.start.toISOString())
      .lte('logged_at', dateRange.end.toISOString());

    if (error) throw error;

    const activities = data || [];
    const total = activities.length;
    const completed = activities.filter(a => a.completed).length;
    const byCategory: Record<string, number> = {};

    activities.forEach(a => {
      const cat = a.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const result = { total, completed, byCategory };
    setCachedData(childId, cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[ReportData] Error fetching activities:', error);
    return { total: 0, completed: 0, byCategory: {} };
  }
}

/**
 * Fetch goal progress for a child
 */
async function fetchGoalProgress(childId: string): Promise<GoalProgress[]> {
  const cached = getCachedData(childId, 'goals');
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('care_plan_goals')
      .select('*')
      .eq('child_id', childId)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const goals: GoalProgress[] = (data || []).map(g => ({
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status === 'completed' ? 'achieved' : 'in-progress',
      currentProgress: g.current_progress || 0,
      targetProgress: g.target_progress || 100,
      startDate: g.started_at,
      lastUpdated: g.updated_at,
    }));

    setCachedData(childId, 'goals', goals);
    return goals;
  } catch (error) {
    console.warn('[ReportData] Error fetching goals:', error);
    return [];
  }
}

/**
 * Fetch behavior tracking data
 */
async function fetchBehaviorData(
  childId: string,
  dateRange: DateRange
): Promise<{ summaries: BehaviorSummary[]; trends: BehaviorTrend[] }> {
  const cacheKey = `behaviors_${dateRange.start.toISOString()}`;
  const cached = getCachedData(childId, cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('behavior_logs')
      .select('*')
      .eq('child_id', childId)
      .gte('logged_at', dateRange.start.toISOString())
      .lte('logged_at', dateRange.end.toISOString())
      .order('logged_at', { ascending: true });

    if (error) throw error;

    const logs = data || [];

    // Aggregate by behavior type
    const behaviorCounts: Record<string, { count: number; intensities: number[]; triggers: string[] }> = {};
    logs.forEach(log => {
      const behavior = log.behavior_type || 'unspecified';
      if (!behaviorCounts[behavior]) {
        behaviorCounts[behavior] = { count: 0, intensities: [], triggers: [] };
      }
      behaviorCounts[behavior].count++;
      if (log.intensity) behaviorCounts[behavior].intensities.push(log.intensity);
      if (log.trigger) behaviorCounts[behavior].triggers.push(log.trigger);
    });

    const summaries: BehaviorSummary[] = Object.entries(behaviorCounts).map(([behavior, data]) => ({
      behavior,
      frequency: data.count,
      trend: 'stable' as const,
      averageIntensity: data.intensities.length > 0
        ? data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length
        : undefined,
      triggers: [...new Set(data.triggers)].slice(0, 5),
    }));

    // Build daily trends
    const dailyCounts: Record<string, { total: number; positive: number; challenging: number }> = {};
    logs.forEach(log => {
      const date = log.logged_at.split('T')[0];
      if (!dailyCounts[date]) {
        dailyCounts[date] = { total: 0, positive: 0, challenging: 0 };
      }
      dailyCounts[date].total++;
      if (log.is_positive) dailyCounts[date].positive++;
      else dailyCounts[date].challenging++;
    });

    const trends: BehaviorTrend[] = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        behaviorCount: counts.total,
        positiveCount: counts.positive,
        challengingCount: counts.challenging,
      }));

    const result = { summaries, trends };
    setCachedData(childId, cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[ReportData] Error fetching behaviors:', error);
    return { summaries: [], trends: [] };
  }
}

/**
 * Fetch outcome metrics
 */
async function fetchOutcomeMetrics(
  childId: string,
  dateRange: DateRange
): Promise<OutcomeMetric[]> {
  try {
    // This would fetch from outcome_tracking table
    // For now, calculate from available data
    const activities = await fetchActivityData(childId, dateRange);
    const goals = await fetchGoalProgress(childId);

    const completionRate = activities.total > 0
      ? Math.round((activities.completed / activities.total) * 100)
      : 0;

    const goalsAchieved = goals.filter(g => g.status === 'achieved').length;
    const totalGoals = goals.length;
    const goalRate = totalGoals > 0
      ? Math.round((goalsAchieved / totalGoals) * 100)
      : 0;

    return [
      {
        name: 'Activity Completion',
        value: completionRate,
        unit: '%',
        change: 0, // Would compare to previous period
        trend: 'stable',
        isPositive: true,
      },
      {
        name: 'Goals Achieved',
        value: goalsAchieved,
        unit: 'goals',
        change: 0,
        trend: 'stable',
        isPositive: true,
      },
      {
        name: 'Goal Progress Rate',
        value: goalRate,
        unit: '%',
        change: 0,
        trend: 'stable',
        isPositive: true,
      },
    ];
  } catch (error) {
    console.warn('[ReportData] Error calculating outcome metrics:', error);
    return [];
  }
}

/**
 * Fetch observations and notes
 */
async function fetchObservations(
  childId: string,
  dateRange: DateRange
): Promise<Observation[]> {
  try {
    // Fetch from multiple sources
    const [visitNotes, parentNotes] = await Promise.all([
      supabase
        .from('visit_summaries')
        .select('created_at, what_we_discussed')
        .eq('child_id', childId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString()),
      supabase
        .from('activity_logs')
        .select('logged_at, notes')
        .eq('child_id', childId)
        .not('notes', 'is', null)
        .gte('logged_at', dateRange.start.toISOString())
        .lte('logged_at', dateRange.end.toISOString()),
    ]);

    const observations: Observation[] = [];

    // Add visit notes
    (visitNotes.data || []).forEach(v => {
      (v.what_we_discussed || []).forEach((note: string) => {
        observations.push({
          date: v.created_at,
          type: 'note',
          content: note,
          source: 'provider',
        });
      });
    });

    // Add parent notes
    (parentNotes.data || []).forEach(n => {
      observations.push({
        date: n.logged_at,
        type: 'note',
        content: n.notes,
        source: 'parent',
      });
    });

    return observations.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.warn('[ReportData] Error fetching observations:', error);
    return [];
  }
}

/**
 * Fetch provider and session info
 */
async function fetchProviderInfo(
  childId: string,
  dateRange: DateRange
): Promise<{ providers: ProviderInfo[]; sessions: SessionSummary }> {
  try {
    const { data, error } = await supabase
      .from('provider_patients')
      .select(`
        *,
        providers (
          first_name,
          last_name,
          title,
          provider_type
        )
      `)
      .eq('child_id', childId)
      .eq('profile_access', 'granted');

    if (error) throw error;

    const providers: ProviderInfo[] = (data || []).map(p => ({
      name: `${p.providers?.first_name || ''} ${p.providers?.last_name || ''}`.trim(),
      title: p.providers?.title || '',
      specialty: p.providers?.provider_type || '',
      sessionsCount: p.total_sessions || 0,
      lastSession: p.next_session_at || '',
    }));

    // Get session summary
    const { data: sessionData } = await supabase
      .from('provider_sessions')
      .select('status, duration_minutes')
      .eq('patient_id', childId)
      .gte('scheduled_at', dateRange.start.toISOString())
      .lte('scheduled_at', dateRange.end.toISOString());

    const sessions = sessionData || [];
    const sessionSummary: SessionSummary = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      upcomingSessions: sessions.filter(s => s.status === 'scheduled').length,
      totalMinutes: sessions
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    };

    return { providers, sessions: sessionSummary };
  } catch (error) {
    console.warn('[ReportData] Error fetching provider info:', error);
    return {
      providers: [],
      sessions: { totalSessions: 0, completedSessions: 0, upcomingSessions: 0, totalMinutes: 0 },
    };
  }
}

// ============================================================================
// Main Aggregation Function
// ============================================================================

/**
 * Aggregate all report data for a child within a date range
 */
export async function aggregateReportData(
  childId: string,
  userId: string,
  dateRange: DateRange,
  options?: {
    includeProviders?: boolean;
    childName?: string;
    parentName?: string;
  }
): Promise<ReportData> {
  // Fetch all data in parallel
  const [
    activities,
    goals,
    behaviors,
    outcomes,
    observations,
    providerInfo,
  ] = await Promise.all([
    fetchActivityData(childId, dateRange),
    fetchGoalProgress(childId),
    fetchBehaviorData(childId, dateRange),
    fetchOutcomeMetrics(childId, dateRange),
    fetchObservations(childId, dateRange),
    options?.includeProviders
      ? fetchProviderInfo(childId, dateRange)
      : Promise.resolve({ providers: [], sessions: undefined }),
  ]);

  // Calculate summary metrics
  const goalsAchieved = goals.filter(g => g.status === 'achieved').length;
  const goalsInProgress = goals.filter(g => g.status === 'in-progress').length;

  // Extract highlights (positive observations)
  const highlights = observations
    .filter(o => o.type === 'win' || o.type === 'milestone')
    .slice(0, 5)
    .map(o => o.content);

  // Extract challenges
  const challenges = observations
    .filter(o => o.type === 'concern')
    .slice(0, 5)
    .map(o => o.content);

  // Generate recommendations based on data
  const recommendations = generateRecommendations(goals, behaviors.summaries, activities);

  return {
    period: dateRange,
    childName: options?.childName || 'Child',
    parentName: options?.parentName,

    totalActivities: activities.total,
    completedActivities: activities.completed,
    completionRate: activities.total > 0
      ? Math.round((activities.completed / activities.total) * 100)
      : 0,

    totalGoals: goals.length,
    goalsAchieved,
    goalsInProgress,
    goalProgress: goals,

    behaviors: behaviors.summaries,
    behaviorTrends: behaviors.trends,

    outcomeMetrics: outcomes,
    weeklyMetrics: [], // Would be calculated from weekly data

    observations,
    highlights,
    challenges,
    recommendations,

    providers: providerInfo.providers,
    sessionSummary: providerInfo.sessions,
  };
}

/**
 * Generate recommendations based on collected data
 */
function generateRecommendations(
  goals: GoalProgress[],
  behaviors: BehaviorSummary[],
  activities: { total: number; completed: number; byCategory: Record<string, number> }
): string[] {
  const recommendations: string[] = [];

  // Activity-based recommendations
  const completionRate = activities.total > 0
    ? activities.completed / activities.total
    : 0;

  if (completionRate < 0.7) {
    recommendations.push('Consider simplifying daily routines to improve activity completion');
  }

  // Goal-based recommendations
  const pausedGoals = goals.filter(g => g.status === 'paused');
  if (pausedGoals.length > 0) {
    recommendations.push(`Review ${pausedGoals.length} paused goal(s) and consider resuming or adjusting`);
  }

  // Behavior-based recommendations
  const challengingBehaviors = behaviors.filter(b => b.frequency > 5 && b.trend !== 'decreasing');
  if (challengingBehaviors.length > 0) {
    recommendations.push('Consider consulting with a provider about persistent behavioral challenges');
  }

  // Default recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue current strategies - progress is on track');
    recommendations.push('Schedule regular check-ins with care team');
  }

  return recommendations;
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useReportData(
  childId: string,
  userId: string,
  dateRange?: DateRange
) {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultRange: DateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  };

  const loadData = useCallback(async (range?: DateRange) => {
    if (!childId || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const reportData = await aggregateReportData(
        childId,
        userId,
        range || dateRange || defaultRange
      );
      setData(reportData);
    } catch (err) {
      console.error('[useReportData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [childId, userId, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh: loadData,
  };
}

export default {
  aggregateReportData,
  useReportData,
};
