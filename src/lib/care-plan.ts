/**
 * Care Plan Service
 *
 * Manages visit summaries, action items, and care plan goals.
 * Connected to Supabase with localStorage fallback for offline support.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
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
  // Joined data
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
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

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
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
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

export interface CarePlanSummary {
  totalSummaries: number;
  totalActionItems: number;
  completedActionItems: number;
  activeGoals: number;
  lastVisitDate?: string;
}

// ============================================================================
// localStorage Keys
// ============================================================================

const STORAGE_KEYS = {
  VISIT_SUMMARIES: 'aminy_visit_summaries',
  ACTION_ITEMS: 'aminy_action_items',
  GOALS: 'aminy_care_goals',
};

// ============================================================================
// Converters
// ============================================================================

function dbRowToVisitSummary(row: any): VisitSummary {
  return {
    id: row.id,
    userId: row.user_id,
    appointmentId: row.appointment_id,
    providerId: row.provider_id,
    reasonForVisit: row.reason_for_visit,
    whatWeDiscussed: row.what_we_discussed || [],
    planForNext7Days: row.plan_for_next_7_days || [],
    whatToTrack: row.what_to_track || [],
    followUpRecommendation: row.follow_up_recommendation,
    childId: row.child_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provider: row.providers ? {
      id: row.providers.id,
      firstName: row.providers.first_name,
      lastName: row.providers.last_name,
      title: row.providers.title,
      specialty: row.providers.specialty,
      avatarUrl: row.providers.avatar_url,
    } : undefined,
  };
}

function dbRowToActionItem(row: any): ActionItem {
  return {
    id: row.id,
    userId: row.user_id,
    visitSummaryId: row.visit_summary_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority || 'medium',
    completed: row.completed || false,
    completedAt: row.completed_at,
    source: row.source,
    childId: row.child_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbRowToGoal(row: any): CarePlanGoal {
  return {
    id: row.id,
    userId: row.user_id,
    childId: row.child_id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetFrequency: row.target_frequency,
    currentProgress: row.current_progress || 0,
    targetProgress: row.target_progress || 100,
    unit: row.unit,
    status: row.status || 'active',
    startedAt: row.started_at,
    completedAt: row.completed_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// localStorage Fallback Functions
// ============================================================================

function getLocalVisitSummaries(userId: string): VisitSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VISIT_SUMMARIES);
    const all = stored ? JSON.parse(stored) : [];
    return all.filter((s: VisitSummary) => s.userId === userId);
  } catch {
    return [];
  }
}

function saveLocalVisitSummaries(summaries: VisitSummary[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.VISIT_SUMMARIES, JSON.stringify(summaries));
}

function getLocalActionItems(userId: string): ActionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTION_ITEMS);
    const all = stored ? JSON.parse(stored) : [];
    return all.filter((item: ActionItem) => item.userId === userId);
  } catch {
    return [];
  }
}

function saveLocalActionItems(items: ActionItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACTION_ITEMS, JSON.stringify(items));
}

function getLocalGoals(userId: string): CarePlanGoal[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GOALS);
    const all = stored ? JSON.parse(stored) : [];
    return all.filter((g: CarePlanGoal) => g.userId === userId);
  } catch {
    return [];
  }
}

function saveLocalGoals(goals: CarePlanGoal[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
}

// ============================================================================
// Visit Summaries
// ============================================================================

/**
 * Get all visit summaries for a user
 */
export async function getVisitSummaries(userId: string): Promise<VisitSummary[]> {
  try {
    const { data, error } = await supabase
      .from('visit_summaries')
      .select(`
        *,
        providers (
          id,
          first_name,
          last_name,
          title,
          specialty,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(dbRowToVisitSummary);
  } catch (error) {
    console.warn('[CarePlan] Supabase error, using localStorage:', error);
    return getLocalVisitSummaries(userId);
  }
}

/**
 * Get a single visit summary by ID
 */
export async function getVisitSummary(summaryId: string): Promise<VisitSummary | null> {
  try {
    const { data, error } = await supabase
      .from('visit_summaries')
      .select(`
        *,
        providers (
          id,
          first_name,
          last_name,
          title,
          specialty,
          avatar_url
        )
      `)
      .eq('id', summaryId)
      .single();

    if (error) throw error;
    return data ? dbRowToVisitSummary(data) : null;
  } catch (error) {
    console.warn('[CarePlan] Supabase error getting summary:', error);
    return null;
  }
}

/**
 * Create a new visit summary
 */
export async function createVisitSummary(
  userId: string,
  summary: Omit<VisitSummary, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<VisitSummary> {
  try {
    const { data, error } = await supabase
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
        child_id: summary.childId,
      })
      .select()
      .single();

    if (error) throw error;

    // Create action items from the plan
    if (summary.planForNext7Days.length > 0) {
      const actionItemsToCreate = summary.planForNext7Days.map(item => ({
        user_id: userId,
        visit_summary_id: data.id,
        title: item,
        source: 'visit-summary' as const,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        child_id: summary.childId,
      }));

      await supabase.from('care_plan_action_items').insert(actionItemsToCreate);
    }

    return dbRowToVisitSummary(data);
  } catch (error) {
    console.warn('[CarePlan] Supabase error creating summary, using localStorage:', error);

    // Fallback to localStorage
    const newSummary: VisitSummary = {
      ...summary,
      id: `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = getLocalVisitSummaries(userId);
    saveLocalVisitSummaries([newSummary, ...existing]);

    return newSummary;
  }
}

// ============================================================================
// Action Items
// ============================================================================

/**
 * Get all action items for a user
 */
export async function getActionItems(userId: string, options?: {
  completed?: boolean;
  childId?: string;
}): Promise<ActionItem[]> {
  try {
    let query = supabase
      .from('care_plan_action_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.completed !== undefined) {
      query = query.eq('completed', options.completed);
    }

    if (options?.childId) {
      query = query.eq('child_id', options.childId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(dbRowToActionItem);
  } catch (error) {
    console.warn('[CarePlan] Supabase error, using localStorage:', error);
    let items = getLocalActionItems(userId);

    if (options?.completed !== undefined) {
      items = items.filter(item => item.completed === options.completed);
    }

    if (options?.childId) {
      items = items.filter(item => item.childId === options.childId);
    }

    return items;
  }
}

/**
 * Create a new action item
 */
export async function createActionItem(
  userId: string,
  item: Omit<ActionItem, 'id' | 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>
): Promise<ActionItem> {
  try {
    const { data, error } = await supabase
      .from('care_plan_action_items')
      .insert({
        user_id: userId,
        visit_summary_id: item.visitSummaryId,
        title: item.title,
        description: item.description,
        due_date: item.dueDate,
        priority: item.priority || 'medium',
        source: item.source,
        child_id: item.childId,
        metadata: item.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return dbRowToActionItem(data);
  } catch (error) {
    console.warn('[CarePlan] Supabase error creating action item, using localStorage:', error);

    const newItem: ActionItem = {
      ...item,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      completed: false,
      priority: item.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = getLocalActionItems(userId);
    saveLocalActionItems([newItem, ...existing]);

    return newItem;
  }
}

/**
 * Toggle action item completion
 */
export async function toggleActionItem(itemId: string, userId: string): Promise<ActionItem | null> {
  try {
    // First get the current state
    const { data: current, error: fetchError } = await supabase
      .from('care_plan_action_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newCompleted = !current.completed;

    const { data, error } = await supabase
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
    return dbRowToActionItem(data);
  } catch (error) {
    console.warn('[CarePlan] Supabase error toggling action item, using localStorage:', error);

    // Fallback to localStorage
    const items = getLocalActionItems(userId);
    const itemIndex = items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) return null;

    items[itemIndex] = {
      ...items[itemIndex],
      completed: !items[itemIndex].completed,
      completedAt: !items[itemIndex].completed ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    saveLocalActionItems(items);
    return items[itemIndex];
  }
}

/**
 * Delete an action item
 */
export async function deleteActionItem(itemId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('care_plan_action_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[CarePlan] Supabase error deleting action item, using localStorage:', error);

    const items = getLocalActionItems(userId);
    const filtered = items.filter(i => i.id !== itemId);
    saveLocalActionItems(filtered);
    return true;
  }
}

// ============================================================================
// Goals
// ============================================================================

/**
 * Get all goals for a user
 */
export async function getGoals(userId: string, options?: {
  status?: 'active' | 'completed' | 'paused' | 'archived';
  category?: GoalCategory;
  childId?: string;
}): Promise<CarePlanGoal[]> {
  try {
    let query = supabase
      .from('care_plan_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.childId) {
      query = query.eq('child_id', options.childId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(dbRowToGoal);
  } catch (error) {
    console.warn('[CarePlan] Supabase error getting goals, using localStorage:', error);
    let goals = getLocalGoals(userId);

    if (options?.status) {
      goals = goals.filter(g => g.status === options.status);
    }

    if (options?.category) {
      goals = goals.filter(g => g.category === options.category);
    }

    if (options?.childId) {
      goals = goals.filter(g => g.childId === options.childId);
    }

    return goals;
  }
}

/**
 * Create a new goal
 */
export async function createGoal(
  userId: string,
  goal: Omit<CarePlanGoal, 'id' | 'userId' | 'currentProgress' | 'status' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'>
): Promise<CarePlanGoal> {
  try {
    const { data, error } = await supabase
      .from('care_plan_goals')
      .insert({
        user_id: userId,
        child_id: goal.childId,
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
    return dbRowToGoal(data);
  } catch (error) {
    console.warn('[CarePlan] Supabase error creating goal, using localStorage:', error);

    const newGoal: CarePlanGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      currentProgress: 0,
      targetProgress: goal.targetProgress || 100,
      status: 'active',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = getLocalGoals(userId);
    saveLocalGoals([newGoal, ...existing]);

    return newGoal;
  }
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  goalId: string,
  userId: string,
  progress: number
): Promise<CarePlanGoal | null> {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('care_plan_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const isCompleted = progress >= current.target_progress;

    const { data, error } = await supabase
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
    return dbRowToGoal(data);
  } catch (error) {
    console.warn('[CarePlan] Supabase error updating goal, using localStorage:', error);

    const goals = getLocalGoals(userId);
    const goalIndex = goals.findIndex(g => g.id === goalId);

    if (goalIndex === -1) return null;

    const isCompleted = progress >= goals[goalIndex].targetProgress;
    goals[goalIndex] = {
      ...goals[goalIndex],
      currentProgress: progress,
      status: isCompleted ? 'completed' : 'active',
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    saveLocalGoals(goals);
    return goals[goalIndex];
  }
}

/**
 * Update goal status
 */
export async function updateGoalStatus(
  goalId: string,
  userId: string,
  status: 'active' | 'completed' | 'paused' | 'archived'
): Promise<CarePlanGoal | null> {
  try {
    const { data, error } = await supabase
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
    return dbRowToGoal(data);
  } catch (error) {
    console.warn('[CarePlan] Supabase error updating goal status, using localStorage:', error);

    const goals = getLocalGoals(userId);
    const goalIndex = goals.findIndex(g => g.id === goalId);

    if (goalIndex === -1) return null;

    goals[goalIndex] = {
      ...goals[goalIndex],
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    saveLocalGoals(goals);
    return goals[goalIndex];
  }
}

// ============================================================================
// Summary
// ============================================================================

/**
 * Get care plan summary for a user
 */
export async function getCarePlanSummary(userId: string): Promise<CarePlanSummary> {
  try {
    const { data, error } = await supabase
      .rpc('get_care_plan_summary', { p_user_id: userId })
      .single();

    if (error) throw error;

    return {
      totalSummaries: data.total_summaries || 0,
      totalActionItems: data.total_action_items || 0,
      completedActionItems: data.completed_action_items || 0,
      activeGoals: data.active_goals || 0,
      lastVisitDate: data.last_visit_date,
    };
  } catch (error) {
    console.warn('[CarePlan] Supabase error getting summary, calculating locally:', error);

    const summaries = getLocalVisitSummaries(userId);
    const items = getLocalActionItems(userId);
    const goals = getLocalGoals(userId);

    return {
      totalSummaries: summaries.length,
      totalActionItems: items.length,
      completedActionItems: items.filter(i => i.completed).length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      lastVisitDate: summaries[0]?.createdAt,
    };
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useCarePlan(userId: string) {
  const [visitSummaries, setVisitSummaries] = useState<VisitSummary[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [goals, setGoals] = useState<CarePlanGoal[]>([]);
  const [summary, setSummary] = useState<CarePlanSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [summariesData, itemsData, goalsData, summaryData] = await Promise.all([
        getVisitSummaries(userId),
        getActionItems(userId),
        getGoals(userId),
        getCarePlanSummary(userId),
      ]);

      setVisitSummaries(summariesData);
      setActionItems(itemsData);
      setGoals(goalsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('[CarePlan] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load care plan');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleItem = useCallback(async (itemId: string) => {
    const updated = await toggleActionItem(itemId, userId);
    if (updated) {
      setActionItems(prev =>
        prev.map(item => item.id === itemId ? updated : item)
      );
    }
  }, [userId]);

  const addItem = useCallback(async (
    item: Omit<ActionItem, 'id' | 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>
  ) => {
    const newItem = await createActionItem(userId, item);
    setActionItems(prev => [newItem, ...prev]);
    return newItem;
  }, [userId]);

  const deleteItem = useCallback(async (itemId: string) => {
    await deleteActionItem(itemId, userId);
    setActionItems(prev => prev.filter(item => item.id !== itemId));
  }, [userId]);

  return {
    visitSummaries,
    actionItems,
    goals,
    summary,
    isLoading,
    error,
    refresh: loadData,
    toggleItem,
    addItem,
    deleteItem,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getVisitSummaries,
  getVisitSummary,
  createVisitSummary,
  getActionItems,
  createActionItem,
  toggleActionItem,
  deleteActionItem,
  getGoals,
  createGoal,
  updateGoalProgress,
  updateGoalStatus,
  getCarePlanSummary,
  useCarePlan,
};
