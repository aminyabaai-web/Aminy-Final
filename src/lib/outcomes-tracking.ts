// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Real Outcomes Tracking System
 * Collects, stores, and analyzes actual user outcomes
 *
 * This replaces all mocked metrics with real data collection
 */

import { supabase } from '../utils/supabase/client';
import { syncEncryptedStorage } from './security/encrypted-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface OutcomeEvent {
  id?: string;
  user_id: string;
  child_id?: string;
  event_type: OutcomeEventType;
  metric_name: string;
  metric_value: number;
  context?: Record<string, unknown>;
  created_at?: string;
}

export type OutcomeEventType =
  | 'behavior_incident'
  | 'behavior_success'
  | 'goal_progress'
  | 'goal_completed'
  | 'caregiver_stress'
  | 'engagement_session'
  | 'ai_interaction'
  | 'routine_adherence'
  | 'skill_acquisition'
  | 'sleep_quality'
  | 'meltdown_duration'
  | 'transition_success';

export interface UserBaseline {
  user_id: string;
  child_id?: string;
  metric_name: string;
  baseline_value: number;
  baseline_date: string;
  target_value?: number;
  target_date?: string;
}

export interface OutcomeSummary {
  user_id: string;
  period_start: string;
  period_end: string;
  metrics: {
    behavior_incidents: number;
    behavior_successes: number;
    goals_completed: number;
    avg_stress_level: number;
    total_sessions: number;
    ai_interactions: number;
    routine_adherence_rate: number;
  };
  improvement_vs_baseline: Record<string, number>;
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track any outcome event - this is the main entry point
 */
export async function trackOutcome(event: Omit<OutcomeEvent, 'id' | 'created_at'>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('outcome_events')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error tracking outcome:', error);
      // Fallback to localStorage if Supabase fails
      saveToLocalStorage(event);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error tracking outcome:', err);
    saveToLocalStorage(event);
    return false;
  }
}

/**
 * Track a behavior incident (meltdown, tantrum, aggression, etc.)
 */
export async function trackBehaviorIncident(
  userId: string,
  childId: string,
  data: {
    behavior_type: string;
    intensity: 'low' | 'medium' | 'high';
    duration_seconds?: number;
    antecedent?: string;
    consequence?: string;
    setting?: string;
  }
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    child_id: childId,
    event_type: 'behavior_incident',
    metric_name: data.behavior_type,
    metric_value: data.intensity === 'high' ? 3 : data.intensity === 'medium' ? 2 : 1,
    context: {
      duration_seconds: data.duration_seconds,
      antecedent: data.antecedent,
      consequence: data.consequence,
      setting: data.setting
    }
  });
}

/**
 * Track a positive behavior or skill demonstration
 */
export async function trackBehaviorSuccess(
  userId: string,
  childId: string,
  data: {
    behavior_type: string;
    prompted: boolean;
    setting?: string;
  }
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    child_id: childId,
    event_type: 'behavior_success',
    metric_name: data.behavior_type,
    metric_value: data.prompted ? 1 : 2, // Independent = higher value
    context: {
      prompted: data.prompted,
      setting: data.setting
    }
  });
}

/**
 * Track goal progress (percentage)
 */
export async function trackGoalProgress(
  userId: string,
  goalId: string,
  progressPercent: number,
  notes?: string
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    event_type: 'goal_progress',
    metric_name: goalId,
    metric_value: progressPercent,
    context: { notes }
  });
}

/**
 * Track caregiver stress/burnout level (1-10 scale)
 */
export async function trackCaregiverStress(
  userId: string,
  stressLevel: number,
  factors?: string[]
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    event_type: 'caregiver_stress',
    metric_name: 'daily_stress',
    metric_value: Math.min(10, Math.max(1, stressLevel)),
    context: { factors }
  });
}

/**
 * Track app engagement session
 */
export async function trackEngagementSession(
  userId: string,
  sessionType: 'chat' | 'logging' | 'jr_mode' | 'community' | 'telehealth',
  durationSeconds: number
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    event_type: 'engagement_session',
    metric_name: sessionType,
    metric_value: durationSeconds,
    context: { session_type: sessionType }
  });
}

/**
 * Track AI interaction quality
 */
export async function trackAIInteraction(
  userId: string,
  data: {
    helpful: boolean;
    response_type: 'advice' | 'support' | 'crisis' | 'information';
    topic?: string;
  }
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    event_type: 'ai_interaction',
    metric_name: data.response_type,
    metric_value: data.helpful ? 1 : 0,
    context: { topic: data.topic }
  });
}

/**
 * Track routine adherence
 */
export async function trackRoutineAdherence(
  userId: string,
  childId: string,
  routineName: string,
  completedSteps: number,
  totalSteps: number
): Promise<boolean> {
  return trackOutcome({
    user_id: userId,
    child_id: childId,
    event_type: 'routine_adherence',
    metric_name: routineName,
    metric_value: Math.round((completedSteps / totalSteps) * 100),
    context: { completed_steps: completedSteps, total_steps: totalSteps }
  });
}

// ============================================================================
// BASELINE MANAGEMENT
// ============================================================================

/**
 * Set baseline measurement for a user (done at onboarding)
 */
export async function setBaseline(baseline: Omit<UserBaseline, 'baseline_date'>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_baselines')
      .upsert({
        ...baseline,
        baseline_date: new Date().toISOString()
      }, {
        onConflict: 'user_id,metric_name'
      });

    if (error) {
      console.error('Error setting baseline:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error setting baseline:', err);
    return false;
  }
}

/**
 * Get all baselines for a user
 */
export async function getBaselines(userId: string): Promise<UserBaseline[]> {
  try {
    const { data, error } = await supabase
      .from('user_baselines')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting baselines:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting baselines:', err);
    return [];
  }
}

// ============================================================================
// OUTCOME SUMMARIES & ANALYTICS
// ============================================================================

/**
 * Calculate outcome summary for a time period
 */
export async function calculateOutcomeSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<OutcomeSummary | null> {
  try {
    const { data: events, error } = await supabase
      .from('outcome_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !events) {
      console.error('Error calculating summary:', error);
      return null;
    }

    // Calculate metrics
    const behaviorIncidents = events.filter(e => e.event_type === 'behavior_incident').length;
    const behaviorSuccesses = events.filter(e => e.event_type === 'behavior_success').length;
    const goalsCompleted = events.filter(e => e.event_type === 'goal_completed').length;

    const stressEvents = events.filter(e => e.event_type === 'caregiver_stress');
    const avgStress = stressEvents.length > 0
      ? stressEvents.reduce((sum, e) => sum + e.metric_value, 0) / stressEvents.length
      : 0;

    const sessions = events.filter(e => e.event_type === 'engagement_session').length;
    const aiInteractions = events.filter(e => e.event_type === 'ai_interaction').length;

    const routineEvents = events.filter(e => e.event_type === 'routine_adherence');
    const routineAdherence = routineEvents.length > 0
      ? routineEvents.reduce((sum, e) => sum + e.metric_value, 0) / routineEvents.length
      : 0;

    // Get baselines for improvement calculation
    const baselines = await getBaselines(userId);
    const improvements: Record<string, number> = {};

    for (const baseline of baselines) {
      const currentEvents = events.filter(e => e.metric_name === baseline.metric_name);
      if (currentEvents.length > 0) {
        const currentAvg = currentEvents.reduce((sum, e) => sum + e.metric_value, 0) / currentEvents.length;
        const improvement = ((currentAvg - baseline.baseline_value) / baseline.baseline_value) * 100;
        improvements[baseline.metric_name] = Math.round(improvement);
      }
    }

    return {
      user_id: userId,
      period_start: startDate.toISOString(),
      period_end: endDate.toISOString(),
      metrics: {
        behavior_incidents: behaviorIncidents,
        behavior_successes: behaviorSuccesses,
        goals_completed: goalsCompleted,
        avg_stress_level: Math.round(avgStress * 10) / 10,
        total_sessions: sessions,
        ai_interactions: aiInteractions,
        routine_adherence_rate: Math.round(routineAdherence)
      },
      improvement_vs_baseline: improvements
    };
  } catch (err) {
    console.error('Error calculating summary:', err);
    return null;
  }
}

/**
 * Get aggregated metrics for admin dashboard (REAL DATA)
 */
export async function getAggregatedMetrics(): Promise<{
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  totalBehaviorLogs: number;
  avgStressReduction: number;
  goalsCompletedThisMonth: number;
  aiInteractionsToday: number;
} | null> {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get counts in parallel
    const [
      { count: totalUsers },
      { data: todayEvents },
      { data: weekEvents },
      { count: behaviorLogs },
      { data: stressEvents },
      { count: goalsCompleted },
      { count: aiToday }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('outcome_events').select('user_id').gte('created_at', todayStart),
      supabase.from('outcome_events').select('user_id').gte('created_at', weekAgo),
      supabase.from('outcome_events').select('*', { count: 'exact', head: true }).eq('event_type', 'behavior_incident'),
      supabase.from('outcome_events').select('metric_value').eq('event_type', 'caregiver_stress').gte('created_at', monthAgo),
      supabase.from('outcome_events').select('*', { count: 'exact', head: true }).eq('event_type', 'goal_completed').gte('created_at', monthAgo),
      supabase.from('outcome_events').select('*', { count: 'exact', head: true }).eq('event_type', 'ai_interaction').gte('created_at', todayStart)
    ]);

    // Calculate unique active users
    const activeToday = new Set(todayEvents?.map(e => e.user_id) || []).size;
    const activeWeek = new Set(weekEvents?.map(e => e.user_id) || []).size;

    // Calculate average stress reduction (comparing first week to last week)
    let avgStressReduction = 0;
    if (stressEvents && stressEvents.length > 0) {
      const sorted = stressEvents.sort((a, b) => a.metric_value - b.metric_value);
      const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
      const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

      const firstAvg = firstHalf.reduce((sum, e) => sum + e.metric_value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + e.metric_value, 0) / secondHalf.length;

      if (firstAvg > 0) {
        avgStressReduction = Math.round(((firstAvg - secondAvg) / firstAvg) * 100);
      }
    }

    return {
      totalUsers: totalUsers || 0,
      activeUsersToday: activeToday,
      activeUsersWeek: activeWeek,
      totalBehaviorLogs: behaviorLogs || 0,
      avgStressReduction: Math.max(0, avgStressReduction),
      goalsCompletedThisMonth: goalsCompleted || 0,
      aiInteractionsToday: aiToday || 0
    };
  } catch (err) {
    console.error('Error getting aggregated metrics:', err);
    return null;
  }
}

/**
 * Get retention metrics (REAL DATA)
 */
export async function getRetentionMetrics(): Promise<{
  d1: number;
  d7: number;
  d14: number;
  d30: number;
} | null> {
  try {
    const now = Date.now();

    // Get users who signed up in different cohorts
    const d1Cohort = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    const d7Cohort = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const d14Cohort = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    const d30Cohort = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // For each cohort, check if they have activity after signup
    const calculateRetention = async (cohortDate: string, daysAfter: number): Promise<number> => {
      const cohortEnd = new Date(new Date(cohortDate).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data: cohortUsers } = await supabase
        .from('users')
        .select('id')
        .gte('created_at', cohortDate)
        .lt('created_at', cohortEnd);

      if (!cohortUsers || cohortUsers.length === 0) return 0;

      const userIds = cohortUsers.map(u => u.id);
      const retentionDate = new Date(new Date(cohortDate).getTime() + daysAfter * 24 * 60 * 60 * 1000).toISOString();

      const { data: retainedUsers } = await supabase
        .from('outcome_events')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', retentionDate);

      const retainedUnique = new Set(retainedUsers?.map(e => e.user_id) || []).size;
      return Math.round((retainedUnique / cohortUsers.length) * 100);
    };

    const [d1, d7, d14, d30] = await Promise.all([
      calculateRetention(d1Cohort, 1),
      calculateRetention(d7Cohort, 7),
      calculateRetention(d14Cohort, 14),
      calculateRetention(d30Cohort, 30)
    ]);

    return { d1, d7, d14, d30 };
  } catch (err) {
    console.error('Error getting retention metrics:', err);
    return null;
  }
}

// ============================================================================
// LOCAL STORAGE FALLBACK
// ============================================================================

const OFFLINE_EVENTS_KEY = 'aminy_offline_outcome_events';

function saveToLocalStorage(event: Omit<OutcomeEvent, 'id' | 'created_at'>): void {
  try {
    const existing = syncEncryptedStorage.getItem(OFFLINE_EVENTS_KEY);
    const events = existing ? JSON.parse(existing) : [];
    events.push({
      ...event,
      created_at: new Date().toISOString(),
      _offline: true
    });
    syncEncryptedStorage.setItem(OFFLINE_EVENTS_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

/**
 * Sync offline events to server when back online
 */
export async function syncOfflineEvents(): Promise<number> {
  try {
    const existing = syncEncryptedStorage.getItem(OFFLINE_EVENTS_KEY);
    if (!existing) return 0;

    const events = JSON.parse(existing);
    if (events.length === 0) return 0;

    const { error } = await supabase
      .from('outcome_events')
      .insert(events.map((e: Record<string, unknown>) => {
        const { _offline, ...rest } = e;
        void _offline;
        return rest;
      }));

    if (!error) {
      syncEncryptedStorage.removeItem(OFFLINE_EVENTS_KEY);
      return events.length;
    }

    return 0;
  } catch (err) {
    console.error('Error syncing offline events:', err);
    return 0;
  }
}

// ============================================================================
// HOOKS FOR REACT COMPONENTS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useOutcomeSummary(userId: string | null, days: number = 30) {
  const [summary, setSummary] = useState<OutcomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await calculateOutcomeSummary(userId, startDate, endDate);

      if (result) {
        setSummary(result);
      } else {
        setError('Failed to load outcome summary');
      }

      setLoading(false);
    };

    fetchSummary();
  }, [userId, days]);

  return { summary, loading, error };
}

export function useTrackOutcome() {
  const track = useCallback(async (event: Omit<OutcomeEvent, 'id' | 'created_at'>) => {
    return trackOutcome(event);
  }, []);

  return { track };
}

// Auto-sync offline events when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineEvents().then(count => {
      if (count > 0) {
        if (import.meta.env.DEV) console.log(`Synced ${count} offline outcome events`);
      }
    });
  });
}

export default {
  trackOutcome,
  trackBehaviorIncident,
  trackBehaviorSuccess,
  trackGoalProgress,
  trackCaregiverStress,
  trackEngagementSession,
  trackAIInteraction,
  trackRoutineAdherence,
  setBaseline,
  getBaselines,
  calculateOutcomeSummary,
  getAggregatedMetrics,
  getRetentionMetrics,
  syncOfflineEvents,
  useOutcomeSummary,
  useTrackOutcome
};
