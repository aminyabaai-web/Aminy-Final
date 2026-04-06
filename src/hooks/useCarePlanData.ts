// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useCarePlanData Hook
 * Loads care plan data (visit summaries, action items, goals) from Supabase
 * with localStorage fallback.
 *
 * Wraps the existing service functions in src/lib/care-plan.ts into a React hook.
 * Tables: visit_summaries, care_plan_action_items, care_plan_goals
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types (re-export from care-plan.ts for convenience)
// ============================================================================

export interface VisitSummary {
  id: string;
  userId: string;
  appointmentId?: string;
  providerId?: string;
  reasonForVisit: string;
  whatWeDiscussed: string[];
  planForNext7Days: string[];
  whatToTrack: string[];
  followUpRecommendation?: string;
  childId?: string;
  createdAt: string;
  updatedAt: string;
  provider?: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
    specialty: string;
    avatarUrl?: string;
  };
}

export interface ActionItem {
  id: string;
  userId: string;
  visitSummaryId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completedAt?: string;
  source: 'visit-summary' | 'ai-suggestion' | 'self-created' | 'provider';
  childId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory =
  | 'daily-routine'
  | 'communication'
  | 'sensory'
  | 'social'
  | 'self-care'
  | 'behavior'
  | 'academic'
  | 'motor'
  | 'other';

export interface CarePlanGoal {
  id: string;
  userId: string;
  childId?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetFrequency?: string;
  currentProgress: number;
  targetProgress: number;
  unit?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  orderIndex?: number;
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanSummary {
  totalSummaries: number;
  totalActionItems: number;
  completedActionItems: number;
  activeGoals: number;
  lastVisitDate?: string;
}

export interface CarePlanData {
  visitSummaries: VisitSummary[];
  actionItems: ActionItem[];
  goals: CarePlanGoal[];
  summary: CarePlanSummary | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEYS = {
  VISIT_SUMMARIES: 'aminy_visit_summaries',
  ACTION_ITEMS: 'aminy_action_items',
  GOALS: 'aminy_care_goals',
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

function mapVisitSummary(row: Record<string, unknown>): VisitSummary {
  const providers = row.providers as { id: string; first_name: string; last_name: string; title: string; specialty: string; avatar_url?: string } | null;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    appointmentId: row.appointment_id as string | undefined,
    providerId: row.provider_id as string | undefined,
    reasonForVisit: (row.reason_for_visit as string) || '',
    whatWeDiscussed: (row.what_we_discussed || []) as string[],
    planForNext7Days: (row.plan_for_next_7_days || []) as string[],
    whatToTrack: (row.what_to_track || []) as string[],
    followUpRecommendation: row.follow_up_recommendation as string | undefined,
    childId: row.child_id as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    provider: providers ? {
      id: providers.id,
      firstName: providers.first_name,
      lastName: providers.last_name,
      title: providers.title,
      specialty: providers.specialty,
      avatarUrl: providers.avatar_url,
    } : undefined,
  };
}

function mapActionItem(row: Record<string, unknown>): ActionItem {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    visitSummaryId: row.visit_summary_id as string | undefined,
    title: (row.title as string) || '',
    description: row.description as string | undefined,
    dueDate: row.due_date as string | undefined,
    priority: ((row.priority as string) || 'medium') as 'low' | 'medium' | 'high',
    completed: (row.completed as boolean) || false,
    completedAt: row.completed_at as string | undefined,
    source: (row.source as ActionItem['source']) || 'self-created',
    childId: row.child_id as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

function mapGoal(row: Record<string, unknown>): CarePlanGoal {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    childId: row.child_id as string | undefined,
    title: (row.title as string) || '',
    description: row.description as string | undefined,
    category: (row.category as GoalCategory) || 'other',
    targetFrequency: row.target_frequency as string | undefined,
    currentProgress: (row.current_progress as number) || 0,
    targetProgress: (row.target_progress as number) || 100,
    unit: row.unit as string | undefined,
    status: ((row.status as string) || 'active') as CarePlanGoal['status'],
    orderIndex: row.order_index as number | undefined,
    startedAt: (row.started_at as string) || new Date().toISOString(),
    completedAt: row.completed_at as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useCarePlanData(userId?: string, childId?: string): CarePlanData & {
  refresh: () => Promise<void>;
  createVisitSummary: (summary: Omit<VisitSummary, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<VisitSummary | null>;
  createActionItem: (item: Omit<ActionItem, 'id' | 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>) => Promise<ActionItem | null>;
  toggleActionItem: (itemId: string) => Promise<void>;
  deleteActionItem: (itemId: string) => Promise<void>;
  createGoal: (goal: Omit<CarePlanGoal, 'id' | 'userId' | 'currentProgress' | 'status' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'>) => Promise<CarePlanGoal | null>;
  updateGoalProgress: (goalId: string, progress: number) => Promise<void>;
  updateGoalStatus: (goalId: string, status: CarePlanGoal['status']) => Promise<void>;
  reorderGoals: (goalIds: string[]) => Promise<void>;
} {
  const [data, setData] = useState<CarePlanData>({
    visitSummaries: [],
    actionItems: [],
    goals: [],
    summary: null,
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

      // Build queries
      let actionQuery = supabase
        .from('care_plan_action_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      let goalsQuery = supabase
        .from('care_plan_goals')
        .select('*')
        .eq('user_id', userId)
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (childId) {
        actionQuery = actionQuery.eq('child_id', childId);
        goalsQuery = goalsQuery.eq('child_id', childId);
      }

      const [summariesResult, itemsResult, goalsResult] = await Promise.all([
        supabase
          .from('visit_summaries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .then(null, (err: unknown) => {
            console.warn('[CarePlanData] visit_summaries fetch failed:', err);
            return { data: null, error: err };
          }),
        actionQuery
          .then(null, (err: unknown) => {
            console.warn('[CarePlanData] action_items fetch failed:', err);
            return { data: null, error: err };
          }),
        goalsQuery
          .then(null, (err: unknown) => {
            console.warn('[CarePlanData] goals fetch failed:', err);
            return { data: null, error: err };
          }),
      ]);

      const visitSummaries = Array.isArray(summariesResult?.data)
        ? summariesResult.data.map((r: Record<string, unknown>) => mapVisitSummary(r))
        : [];
      const actionItems = Array.isArray(itemsResult?.data)
        ? itemsResult.data.map((r: Record<string, unknown>) => mapActionItem(r))
        : [];
      const goals = Array.isArray(goalsResult?.data)
        ? goalsResult.data.map((r: Record<string, unknown>) => mapGoal(r))
        : [];

      const summary: CarePlanSummary = {
        totalSummaries: visitSummaries.length,
        totalActionItems: actionItems.length,
        completedActionItems: actionItems.filter(i => i.completed).length,
        activeGoals: goals.filter(g => g.status === 'active').length,
        lastVisitDate: visitSummaries[0]?.createdAt,
      };

      // Cache for offline
      writeCache(CACHE_KEYS.VISIT_SUMMARIES, visitSummaries);
      writeCache(CACHE_KEYS.ACTION_ITEMS, actionItems);
      writeCache(CACHE_KEYS.GOALS, goals);

      setData({ visitSummaries, actionItems, goals, summary, loading: false, error: null });
    } catch (error: unknown) {
      console.error('[CarePlanData] Load failed, using cache:', error);

      const visitSummaries = readCache<VisitSummary[]>(CACHE_KEYS.VISIT_SUMMARIES, [])
        .filter(s => s.userId === userId);
      const actionItems = readCache<ActionItem[]>(CACHE_KEYS.ACTION_ITEMS, [])
        .filter(i => i.userId === userId);
      const goals = readCache<CarePlanGoal[]>(CACHE_KEYS.GOALS, [])
        .filter(g => g.userId === userId);

      const summary: CarePlanSummary = {
        totalSummaries: visitSummaries.length,
        totalActionItems: actionItems.length,
        completedActionItems: actionItems.filter(i => i.completed).length,
        activeGoals: goals.filter(g => g.status === 'active').length,
        lastVisitDate: visitSummaries[0]?.createdAt,
      };

      setData({
        visitSummaries,
        actionItems,
        goals,
        summary,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load care plan data',
      });
    }
  }, [userId, childId]);

  const createVisitSummary = useCallback(async (
    summary: Omit<VisitSummary, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<VisitSummary | null> => {
    if (!userId) return null;

    try {
      const { data: row, error } = await supabase
        .from('visit_summaries')
        .insert({
          user_id: userId,
          appointment_id: summary.appointmentId,
          provider_id: summary.providerId,
          reason_for_visit: summary.reasonForVisit,
          what_we_discussed: summary.whatWeDiscussed,
          plan_for_next_7_days: summary.planForNext7Days,
          what_to_track: summary.whatToTrack,
          follow_up_recommendation: summary.followUpRecommendation,
          child_id: summary.childId || childId || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSummary = mapVisitSummary(row as Record<string, unknown>);
      setData(prev => {
        const visitSummaries = [newSummary, ...prev.visitSummaries];
        writeCache(CACHE_KEYS.VISIT_SUMMARIES, visitSummaries);
        return { ...prev, visitSummaries };
      });
      return newSummary;
    } catch (err) {
      console.error('[CarePlanData] Create visit summary failed:', err);
      return null;
    }
  }, [userId, childId]);

  const createActionItem = useCallback(async (
    item: Omit<ActionItem, 'id' | 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>,
  ): Promise<ActionItem | null> => {
    if (!userId) return null;

    try {
      const { data: row, error } = await supabase
        .from('care_plan_action_items')
        .insert({
          user_id: userId,
          visit_summary_id: item.visitSummaryId,
          title: item.title,
          description: item.description,
          due_date: item.dueDate,
          priority: item.priority || 'medium',
          source: item.source,
          child_id: item.childId || childId || null,
          metadata: item.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem = mapActionItem(row as Record<string, unknown>);
      setData(prev => {
        const actionItems = [newItem, ...prev.actionItems];
        writeCache(CACHE_KEYS.ACTION_ITEMS, actionItems);
        return { ...prev, actionItems };
      });
      return newItem;
    } catch (err) {
      console.error('[CarePlanData] Create action item failed:', err);
      return null;
    }
  }, [userId, childId]);

  const toggleActionItem = useCallback(async (itemId: string) => {
    if (!userId) return;

    try {
      const current = data.actionItems.find(i => i.id === itemId);
      if (!current) return;

      const newCompleted = !current.completed;
      const { data: row, error } = await supabase
        .from('care_plan_action_items')
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const updated = mapActionItem(row as Record<string, unknown>);
      setData(prev => {
        const actionItems = prev.actionItems.map(i => i.id === itemId ? updated : i);
        writeCache(CACHE_KEYS.ACTION_ITEMS, actionItems);
        return { ...prev, actionItems };
      });
    } catch (err) {
      console.error('[CarePlanData] Toggle action item failed:', err);
    }
  }, [userId, data.actionItems]);

  const deleteActionItem = useCallback(async (itemId: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('care_plan_action_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      setData(prev => {
        const actionItems = prev.actionItems.filter(i => i.id !== itemId);
        writeCache(CACHE_KEYS.ACTION_ITEMS, actionItems);
        return { ...prev, actionItems };
      });
    } catch (err) {
      console.error('[CarePlanData] Delete action item failed:', err);
    }
  }, [userId]);

  const createGoal = useCallback(async (
    goal: Omit<CarePlanGoal, 'id' | 'userId' | 'currentProgress' | 'status' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'>,
  ): Promise<CarePlanGoal | null> => {
    if (!userId) return null;

    try {
      const { data: row, error } = await supabase
        .from('care_plan_goals')
        .insert({
          user_id: userId,
          child_id: goal.childId || childId || null,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          target_frequency: goal.targetFrequency,
          target_progress: goal.targetProgress,
          unit: goal.unit,
          metadata: goal.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      const newGoal = mapGoal(row as Record<string, unknown>);
      setData(prev => {
        const goals = [newGoal, ...prev.goals];
        writeCache(CACHE_KEYS.GOALS, goals);
        return { ...prev, goals };
      });
      return newGoal;
    } catch (err) {
      console.error('[CarePlanData] Create goal failed:', err);
      return null;
    }
  }, [userId, childId]);

  const updateGoalProgress = useCallback(async (goalId: string, progress: number) => {
    if (!userId) return;

    try {
      const goal = data.goals.find(g => g.id === goalId);
      if (!goal) return;

      const isCompleted = progress >= goal.targetProgress;
      const { data: row, error } = await supabase
        .from('care_plan_goals')
        .update({
          current_progress: progress,
          status: isCompleted ? 'completed' : 'active',
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', goalId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const updated = mapGoal(row as Record<string, unknown>);
      setData(prev => {
        const goals = prev.goals.map(g => g.id === goalId ? updated : g);
        writeCache(CACHE_KEYS.GOALS, goals);
        return { ...prev, goals };
      });
    } catch (err) {
      console.error('[CarePlanData] Update goal progress failed:', err);
    }
  }, [userId, data.goals]);

  const updateGoalStatus = useCallback(async (goalId: string, status: CarePlanGoal['status']) => {
    if (!userId) return;

    try {
      const { data: row, error } = await supabase
        .from('care_plan_goals')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', goalId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      const updated = mapGoal(row as Record<string, unknown>);
      setData(prev => {
        const goals = prev.goals.map(g => g.id === goalId ? updated : g);
        writeCache(CACHE_KEYS.GOALS, goals);
        return { ...prev, goals };
      });
    } catch (err) {
      console.error('[CarePlanData] Update goal status failed:', err);
    }
  }, [userId]);

  const reorderGoals = useCallback(async (goalIds: string[]) => {
    if (!userId) return;

    try {
      const updates = goalIds.map((goalId, index) =>
        supabase
          .from('care_plan_goals')
          .update({ order_index: index })
          .eq('id', goalId)
          .eq('user_id', userId)
      );

      await Promise.all(updates);

      // Optimistically reorder local state
      setData(prev => {
        const goalMap = new Map(prev.goals.map(g => [g.id, g]));
        const reordered = goalIds
          .map((id, idx) => {
            const g = goalMap.get(id);
            return g ? { ...g, orderIndex: idx } : null;
          })
          .filter(Boolean) as CarePlanGoal[];
        // Add any goals not in the goalIds list at the end
        const remaining = prev.goals.filter(g => !goalIds.includes(g.id));
        const goals = [...reordered, ...remaining];
        writeCache(CACHE_KEYS.GOALS, goals);
        return { ...prev, goals };
      });
    } catch (err) {
      console.error('[CarePlanData] Reorder goals failed:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    createVisitSummary,
    createActionItem,
    toggleActionItem,
    deleteActionItem,
    createGoal,
    updateGoalProgress,
    updateGoalStatus,
    reorderGoals,
  };
}

export default useCarePlanData;
