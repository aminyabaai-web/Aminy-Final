/**
 * useAnalyticsData Hook
 * Loads analytics events and outcome data from Supabase with localStorage fallback.
 *
 * Bridges the class-based AnalyticsEngine (analytics-engine.ts) and outcomes
 * tracking (outcomes-tracking.ts) into a React hook with Supabase-first reads.
 *
 * Tables: outcome_events, user_baselines, daily_metrics
 * localStorage keys replaced: aminy_analytics, aminy_offline_outcome_events
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

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

export interface OutcomeEvent {
  id: string;
  userId: string;
  childId?: string;
  eventType: OutcomeEventType;
  metricName: string;
  metricValue: number;
  context?: Record<string, unknown>;
  createdAt: string;
}

export interface UserBaseline {
  userId: string;
  childId?: string;
  metricName: string;
  baselineValue: number;
  baselineDate: string;
  targetValue?: number;
  targetDate?: string;
}

export interface OutcomeSummary {
  behaviorIncidents: number;
  behaviorSuccesses: number;
  goalsCompleted: number;
  avgStressLevel: number;
  totalSessions: number;
  aiInteractions: number;
  routineAdherenceRate: number;
  improvementVsBaseline: Record<string, number>;
}

export interface AnalyticsData {
  outcomeEvents: OutcomeEvent[];
  baselines: UserBaseline[];
  summary: OutcomeSummary | null;
  offlineQueueSize: number;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEYS = {
  ANALYTICS: 'aminy_analytics',
  OFFLINE_EVENTS: 'aminy_offline_outcome_events',
  BASELINES: 'aminy_baselines_cache',
};

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ============================================================================
// Row mappers
// ============================================================================

function mapOutcomeEvent(row: Record<string, unknown>): OutcomeEvent {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    childId: row.child_id as string | undefined,
    eventType: (row.event_type as OutcomeEventType) || 'engagement_session',
    metricName: (row.metric_name as string) || '',
    metricValue: (row.metric_value as number) || 0,
    context: row.context as Record<string, unknown> | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function mapBaseline(row: Record<string, unknown>): UserBaseline {
  return {
    userId: (row.user_id as string) || '',
    childId: row.child_id as string | undefined,
    metricName: (row.metric_name as string) || '',
    baselineValue: (row.baseline_value as number) || 0,
    baselineDate: (row.baseline_date as string) || new Date().toISOString(),
    targetValue: row.target_value as number | undefined,
    targetDate: row.target_date as string | undefined,
  };
}

function buildSummary(events: OutcomeEvent[], baselines: UserBaseline[]): OutcomeSummary {
  const behaviorIncidents = events.filter(e => e.eventType === 'behavior_incident').length;
  const behaviorSuccesses = events.filter(e => e.eventType === 'behavior_success').length;
  const goalsCompleted = events.filter(e => e.eventType === 'goal_completed').length;

  const stressEvents = events.filter(e => e.eventType === 'caregiver_stress');
  const avgStressLevel = stressEvents.length > 0
    ? stressEvents.reduce((sum, e) => sum + e.metricValue, 0) / stressEvents.length
    : 0;

  const totalSessions = events.filter(e => e.eventType === 'engagement_session').length;
  const aiInteractions = events.filter(e => e.eventType === 'ai_interaction').length;

  const routineEvents = events.filter(e => e.eventType === 'routine_adherence');
  const routineAdherenceRate = routineEvents.length > 0
    ? routineEvents.reduce((sum, e) => sum + e.metricValue, 0) / routineEvents.length
    : 0;

  // Calculate improvement vs baselines
  const improvements: Record<string, number> = {};
  for (const baseline of baselines) {
    const currentEvents = events.filter(e => e.metricName === baseline.metricName);
    if (currentEvents.length > 0) {
      const currentAvg = currentEvents.reduce((s, e) => s + e.metricValue, 0) / currentEvents.length;
      if (baseline.baselineValue !== 0) {
        improvements[baseline.metricName] = Math.round(
          ((currentAvg - baseline.baselineValue) / baseline.baselineValue) * 100
        );
      }
    }
  }

  return {
    behaviorIncidents,
    behaviorSuccesses,
    goalsCompleted,
    avgStressLevel: Math.round(avgStressLevel * 10) / 10,
    totalSessions,
    aiInteractions,
    routineAdherenceRate: Math.round(routineAdherenceRate),
    improvementVsBaseline: improvements,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useAnalyticsData(userId?: string, days: number = 30): AnalyticsData & {
  refresh: () => Promise<void>;
  trackOutcome: (event: Omit<OutcomeEvent, 'id' | 'createdAt'>) => Promise<boolean>;
  setBaseline: (baseline: Omit<UserBaseline, 'baselineDate'>) => Promise<boolean>;
  syncOfflineEvents: () => Promise<number>;
} {
  const [data, setData] = useState<AnalyticsData>({
    outcomeEvents: [],
    baselines: [],
    summary: null,
    offlineQueueSize: 0,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [eventsResult, baselinesResult] = await Promise.all([
        supabase
          .from('outcome_events')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false })
          .limit(500)
          .then(null, (err: unknown) => {
            console.warn('[AnalyticsData] outcome_events fetch failed:', err);
            return { data: null, error: err };
          }),
        supabase
          .from('user_baselines')
          .select('*')
          .eq('user_id', userId)
          .then(null, (err: unknown) => {
            console.warn('[AnalyticsData] user_baselines fetch failed:', err);
            return { data: null, error: err };
          }),
      ]);

      const outcomeEvents = Array.isArray(eventsResult?.data)
        ? eventsResult.data.map((r: Record<string, unknown>) => mapOutcomeEvent(r))
        : [];
      const baselines = Array.isArray(baselinesResult?.data)
        ? baselinesResult.data.map((r: Record<string, unknown>) => mapBaseline(r))
        : [];

      const summary = buildSummary(outcomeEvents, baselines);

      // Check offline queue size
      const offlineQueue = readCache<unknown[]>(CACHE_KEYS.OFFLINE_EVENTS, []);

      // Cache for offline
      writeCache(CACHE_KEYS.ANALYTICS, outcomeEvents.slice(0, 500));
      writeCache(CACHE_KEYS.BASELINES, baselines);

      setData({
        outcomeEvents,
        baselines,
        summary,
        offlineQueueSize: offlineQueue.length,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[AnalyticsData] Load failed, using cache:', error);

      const cachedEvents = readCache<OutcomeEvent[]>(CACHE_KEYS.ANALYTICS, []);
      const cachedBaselines = readCache<UserBaseline[]>(CACHE_KEYS.BASELINES, []);
      const offlineQueue = readCache<unknown[]>(CACHE_KEYS.OFFLINE_EVENTS, []);
      const summary = buildSummary(cachedEvents, cachedBaselines);

      setData({
        outcomeEvents: cachedEvents,
        baselines: cachedBaselines,
        summary,
        offlineQueueSize: offlineQueue.length,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics data',
      });
    }
  }, [userId, days]);

  const trackOutcome = useCallback(async (
    event: Omit<OutcomeEvent, 'id' | 'createdAt'>,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('outcome_events')
        .insert({
          user_id: event.userId,
          child_id: event.childId || null,
          event_type: event.eventType,
          metric_name: event.metricName,
          metric_value: event.metricValue,
          context: event.context || null,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state optimistically
      const newEvent: OutcomeEvent = {
        ...event,
        id: crypto.randomUUID?.() || `oe-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      setData(prev => {
        const outcomeEvents = [newEvent, ...prev.outcomeEvents];
        const summary = buildSummary(outcomeEvents, prev.baselines);
        writeCache(CACHE_KEYS.ANALYTICS, outcomeEvents.slice(0, 500));
        return { ...prev, outcomeEvents, summary };
      });

      return true;
    } catch (err) {
      console.warn('[AnalyticsData] Track outcome failed, saving offline:', err);

      // Save to offline queue
      const offlineQueue = readCache<unknown[]>(CACHE_KEYS.OFFLINE_EVENTS, []);
      offlineQueue.push({
        user_id: event.userId,
        child_id: event.childId || null,
        event_type: event.eventType,
        metric_name: event.metricName,
        metric_value: event.metricValue,
        context: event.context || null,
        created_at: new Date().toISOString(),
        _offline: true,
      });
      writeCache(CACHE_KEYS.OFFLINE_EVENTS, offlineQueue);

      setData(prev => ({ ...prev, offlineQueueSize: offlineQueue.length }));
      return false;
    }
  }, []);

  const setBaseline = useCallback(async (
    baseline: Omit<UserBaseline, 'baselineDate'>,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_baselines')
        .upsert({
          user_id: baseline.userId,
          child_id: baseline.childId || null,
          metric_name: baseline.metricName,
          baseline_value: baseline.baselineValue,
          baseline_date: new Date().toISOString(),
          target_value: baseline.targetValue || null,
          target_date: baseline.targetDate || null,
        }, {
          onConflict: 'user_id,metric_name',
        });

      if (error) throw error;

      // Update local state
      const newBaseline: UserBaseline = {
        ...baseline,
        baselineDate: new Date().toISOString(),
      };

      setData(prev => {
        const existing = prev.baselines.findIndex(
          b => b.userId === baseline.userId && b.metricName === baseline.metricName
        );
        const baselines = [...prev.baselines];
        if (existing >= 0) {
          baselines[existing] = newBaseline;
        } else {
          baselines.push(newBaseline);
        }
        writeCache(CACHE_KEYS.BASELINES, baselines);
        return { ...prev, baselines };
      });

      return true;
    } catch (err) {
      console.error('[AnalyticsData] Set baseline failed:', err);
      return false;
    }
  }, []);

  const syncOfflineEvents = useCallback(async (): Promise<number> => {
    try {
      const offlineQueue = readCache<Record<string, unknown>[]>(CACHE_KEYS.OFFLINE_EVENTS, []);
      if (offlineQueue.length === 0) return 0;

      const { error } = await supabase
        .from('outcome_events')
        .insert(offlineQueue.map(e => {
          const { _offline, ...rest } = e;
          void _offline;
          return rest;
        }));

      if (!error) {
        localStorage.removeItem(CACHE_KEYS.OFFLINE_EVENTS);
        setData(prev => ({ ...prev, offlineQueueSize: 0 }));
        return offlineQueue.length;
      }

      return 0;
    } catch (err) {
      console.error('[AnalyticsData] Sync offline events failed:', err);
      return 0;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    trackOutcome,
    setBaseline,
    syncOfflineEvents,
  };
}

export default useAnalyticsData;
