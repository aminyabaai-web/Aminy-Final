// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useDashboardData Hook
 * Loads real data for the dashboard from database and engines
 *
 * This hook replaces hardcoded sample data with real database queries
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { dataService } from '../lib/supabase-data';
import {
  completePlanItem as completeWorkflowPlanItem,
  getOrGenerateDailyPlan,
  mapSnapshotToRoutineGroups,
  WORKFLOW_EVENTS,
} from '../lib/caregiver-workflow';
import { calmToolsTracking, type CalmToolStats } from '../lib/calm-tools-tracking';
import { aiMemoryEngine, type MemoryContext } from '../lib/ai-memory-engine';
import { billingEngine } from '../lib/billing-engine';
import { retentionEngine } from '../lib/retention-engine';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeQueryableChildId(childId?: string | null): string | undefined {
  if (!childId) return undefined;
  return UUID_PATTERN.test(childId) ? childId : undefined;
}

// ============================================================================
// Types
// ============================================================================

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  photoUrl?: string;
  isPrimary?: boolean;
  goals: {
    id: string;
    name: string;
    percentMet: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface UpcomingEvent {
  id: string;
  title: string;
  time: string;
  type: 'telehealth' | 'reminder' | 'appointment' | 'task';
}

export interface DailyTaskItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  timeEstimate: string;
}

export interface RoutineData {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  label: string;
  tasks: DailyTaskItem[];
  completedCount: number;
  totalCount: number;
}

/** Raw goal row from the Supabase goals table */
interface GoalRow {
  id?: string;
  title?: string;
  name?: string;
  progress?: number;
  trend?: 'up' | 'down' | 'stable';
  child_id?: string;
  is_active?: boolean;
  user_id?: string;
  created_at?: string;
}

/** Raw child row from the Supabase children table */
interface ChildRow {
  id?: string;
  name?: string;
  age?: number;
  age_years?: number;
  photo_url?: string;
  is_primary?: boolean;
  user_id?: string;
  is_active?: boolean;
}

/** Raw routine from the routines engine */
interface RawRoutine {
  period?: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  name?: string;
  steps?: RawRoutineStep[];
}

/** Raw routine step */
interface RawRoutineStep {
  id?: string;
  title?: string;
  description?: string;
  abaSkillArea?: string;
  status?: string;
  durationMinutes?: number;
}

/** Raw appointment row from the Supabase appointments table */
interface AppointmentRow {
  id?: string;
  start_time?: string;
  visit_type?: string;
  status?: string;
  user_id?: string;
  providers?: {
    first_name?: string;
    last_name?: string;
  };
}

/** A milestone celebration earned by the user */
export interface Celebration {
  id: string;
  milestone_key?: string;
  milestone_name?: string;
  celebrated_at?: string;
  [key: string]: unknown;
}

export interface DashboardData {
  // Core data
  childProfile: ChildProfile | null;
  children: ChildProfile[];

  // Routines
  todaysRoutines: RoutineData[];
  activePlanSnapshotId: string | null;
  routineAdherence: number;
  streak: number;

  // Goals
  activeGoals: {
    id: string;
    name: string;
    progress: number;
    trend: 'up' | 'down' | 'stable';
  }[];

  // Upcoming
  upcomingEvents: UpcomingEvent[];
  nextAppointment?: {
    providerName: string;
    time: string;
    type: string;
  };

  // Calm tools
  calmToolStats: CalmToolStats[];
  totalCalmMinutes: number;

  // AI Memory
  memoryContext: MemoryContext | null;
  recentConversationCount: number;

  // Trial/Billing
  trialStatus: {
    isActive: boolean;
    daysRemaining: number;
    conversationsUsed: number;
    showSoftPaywall: boolean;
    showHardPaywall: boolean;
  } | null;

  // Engagement
  milestonesEarned: number;
  pendingCelebrations: Celebration[];

  // Loading states
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDashboardData(userId?: string, childId?: string): DashboardData & {
  refresh: () => Promise<void>;
  completeRoutineStep: (routineId: string, stepId: string) => Promise<void>;
  startRoutine: (routineId: string) => Promise<void>;
} {
  const [data, setData] = useState<DashboardData>({
    childProfile: null,
    children: [],
    todaysRoutines: [],
    activePlanSnapshotId: null,
    routineAdherence: 0,
    streak: 0,
    activeGoals: [],
    upcomingEvents: [],
    calmToolStats: [],
    totalCalmMinutes: 0,
    memoryContext: null,
    recentConversationCount: 0,
    trialStatus: null,
    milestonesEarned: 0,
    pendingCelebrations: [],
    isLoading: true,
    error: null,
  });

  // Load all dashboard data
  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const [
        profileResult,
        childrenRows,
        goalsResult,
        appointmentsResult,
        calmStats,
        memoryContext,
        trialStatus,
        streakResult,
        milestonesResult,
        celebrationsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
          .then(null, (err: unknown) => {
            console.warn('[Dashboard] Profile fetch failed:', err);
            return { data: null, error: err };
          }),
        dataService.getChildren().catch((err) => {
          console.warn('[Dashboard] Children fetch failed:', err);
          return [];
        }),
        (() => {
          let query = supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);
          if (childId) query = query.eq('child_id', childId);
          return query.then(null, (err: unknown) => {
            console.warn('[Dashboard] Goals fetch failed:', err);
            return { data: [], error: err };
          });
        })(),
        supabase
          .from('appointments')
          .select('id, provider_id, concern_id, concern_label, visit_type, visit_format, start_time, duration_minutes, status, video_room_url, notes, cancellation_reason, created_at')
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3)
          .then(null, (err: unknown) => {
            console.warn('[Dashboard] Appointments fetch failed:', err);
            return { data: [], error: err };
          }),
        calmToolsTracking.getToolStats(userId, undefined, 7).catch(() => []),
        aiMemoryEngine.buildContext(userId).catch(() => null),
        billingEngine.getTrialStatus(userId).catch(() => null),
        retentionEngine.getPrimaryStreak(userId).catch(() => null),
        retentionEngine.getEarnedMilestones(userId).catch(() => []),
        retentionEngine.getPendingCelebrations(userId).catch(() => []),
      ]);

      const profile = profileResult.data;
      const safeGoalsData: GoalRow[] = Array.isArray(goalsResult?.data) ? goalsResult.data : [];
      const goals = safeGoalsData.map((g) => ({
        id: g?.id || '',
        name: g?.title || g?.name || 'Goal',
        progress: g?.progress || 0,
        percentMet: g?.progress || 0,
        trend: (g?.trend || 'stable') as 'up' | 'down' | 'stable',
        childId: g?.child_id,
      }));

      const safeChildrenData: ChildRow[] = Array.isArray(childrenRows) ? childrenRows as ChildRow[] : [];
      const childrenFromTable: ChildProfile[] = safeChildrenData.map((childRow) => ({
        id: childRow?.id || '',
        name: childRow?.name || 'Child',
        age: childRow?.age_years || childRow?.age || 5,
        photoUrl: childRow?.photo_url,
        isPrimary: childRow?.is_primary,
        goals: goals.filter((goal) => goal.childId === childRow?.id).map((goal) => ({
          id: goal.id,
          name: goal.name,
          percentMet: goal.progress,
          trend: goal.trend,
        })),
      }));

      const selectedChildId = childId
        || childrenFromTable.find((entry) => entry.isPrimary)?.id
        || childrenFromTable[0]?.id;

      const childProfile: ChildProfile | null = childrenFromTable.find((entry) => entry.id === selectedChildId)
        || (childrenFromTable.length > 0 ? childrenFromTable[0] : null)
        || (profile ? {
          id: (profile.child_id || selectedChildId || `child-${userId.substring(0, 8)}`) as string,
          name: (profile.child_name || 'Your Child') as string,
          age: Number(profile.child_age || 5),
          photoUrl: profile.child_photo_url as string | undefined,
          goals: goals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            percentMet: goal.progress,
            trend: goal.trend,
          })),
        } : null);

      const children: ChildProfile[] = childrenFromTable.length > 0
        ? childrenFromTable
        : (childProfile ? [childProfile] : []);

      const activeChildId = childProfile?.id || selectedChildId;
      const queryableChildId = normalizeQueryableChildId(activeChildId);
      const dailyPlanSnapshot = queryableChildId
        ? await getOrGenerateDailyPlan({ userId, childId: queryableChildId }).catch((err) => {
            console.warn('[Dashboard] Daily plan load failed:', err);
            return null;
          })
        : null;

      const todaysRoutines: RoutineData[] = mapSnapshotToRoutineGroups(dailyPlanSnapshot).map((group) => ({
        timeOfDay: group.timeOfDay,
        label: group.label,
        tasks: group.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          icon: getRoutineIcon(task.description),
          completed: task.completed,
          timeEstimate: task.timeEstimate,
        })),
        completedCount: group.completedCount,
        totalCount: group.totalCount,
      }));

      const safeAppointmentsData = Array.isArray(appointmentsResult?.data) ? appointmentsResult.data : [];
      const safeAppointments: AppointmentRow[] = safeAppointmentsData;
      const upcomingEvents: UpcomingEvent[] = safeAppointments.map((appointment) => ({
        id: appointment?.id || '',
        title: appointment?.providers
          ? `Session with ${appointment.providers.first_name || ''} ${appointment.providers.last_name || ''}`
          : 'Upcoming Appointment',
        time: appointment?.start_time ? new Date(appointment.start_time).toLocaleString() : 'TBD',
        type: 'telehealth' as const,
      }));

      const nextAppt = safeAppointmentsData[0];
      const safeCalmStats = Array.isArray(calmStats) ? calmStats : [];
      const totalCalmMinutes = safeCalmStats.reduce((sum, stat) => sum + (stat?.totalMinutes || 0), 0);
      const routineAdherence = todaysRoutines.length > 0
        ? Math.round(
            todaysRoutines.reduce((sum, routine) => sum + (routine.completedCount / Math.max(routine.totalCount, 1)), 0) /
            todaysRoutines.length * 100,
          )
        : 0;

      let recentConversationCount = 0;
      try {
        let conversationCountQuery = supabase
          .from('ai_conversations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        if (queryableChildId) {
          conversationCountQuery = conversationCountQuery.eq('child_id', queryableChildId);
        }
        const { count } = await conversationCountQuery;
        recentConversationCount = count || 0;
      } catch (err) {
        console.warn('[Dashboard] Conversation count failed:', err);
      }

      const safeMilestones = Array.isArray(milestonesResult) ? milestonesResult : [];
      const safeCelebrations = Array.isArray(celebrationsResult) ? celebrationsResult as Celebration[] : [];

      setData({
        childProfile,
        children,
        todaysRoutines,
        activePlanSnapshotId: dailyPlanSnapshot?.id || null,
        routineAdherence,
        streak: streakResult?.currentStreak || 0,
        activeGoals: goals,
        upcomingEvents,
        nextAppointment: nextAppt ? {
          providerName: nextAppt.provider_id ? 'Care team provider' : 'Provider',
          time: nextAppt.start_time ? new Date(nextAppt.start_time).toLocaleString() : 'TBD',
          type: nextAppt.visit_type || 'session',
        } : undefined,
        calmToolStats: safeCalmStats,
        totalCalmMinutes,
        memoryContext,
        recentConversationCount,
        trialStatus,
        milestonesEarned: safeMilestones.length,
        pendingCelebrations: safeCelebrations,
        isLoading: false,
        error: null,
      });

      await retentionEngine.recordActivity(userId, 'daily_checkin').catch((err) => {
        if (import.meta.env.DEV) console.warn('Streak tracking failed:', err);
      });
    } catch (error: unknown) {
      console.error('Failed to load dashboard data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  }, [userId, childId]);

  // Complete a routine step
  const completeRoutineStep = useCallback(async (_routineId: string, stepId: string) => {
    if (!userId) return;

    try {
      const snapshot = await getOrGenerateDailyPlan({ userId, childId });
      if (!snapshot) return;
      await completeWorkflowPlanItem({
        snapshotId: snapshot.id,
        itemId: stepId,
        userId,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  }, [userId, childId, loadData]);

  // Start a routine
  const startRoutine = useCallback(async (_routineId: string) => {
    if (!userId) return;

    try {
      await getOrGenerateDailyPlan({ userId, childId });
      await loadData();
    } catch (error) {
      console.error('Failed to start routine:', error);
    }
  }, [userId, childId, loadData]);

  // Load data on mount and when userId changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;

    const handleWorkflowRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; childId?: string }>).detail;
      if (!detail || detail.userId !== userId) return;
      if (childId && detail.childId && detail.childId !== childId) return;
      void loadData();
    };

    window.addEventListener(WORKFLOW_EVENTS.dailyPlanUpdated, handleWorkflowRefresh as EventListener);
    window.addEventListener(WORKFLOW_EVENTS.juniorProgressUpdated, handleWorkflowRefresh as EventListener);
    window.addEventListener(WORKFLOW_EVENTS.caregiverSummaryUpdated, handleWorkflowRefresh as EventListener);

    return () => {
      window.removeEventListener(WORKFLOW_EVENTS.dailyPlanUpdated, handleWorkflowRefresh as EventListener);
      window.removeEventListener(WORKFLOW_EVENTS.juniorProgressUpdated, handleWorkflowRefresh as EventListener);
      window.removeEventListener(WORKFLOW_EVENTS.caregiverSummaryUpdated, handleWorkflowRefresh as EventListener);
    };
  }, [childId, loadData, userId]);

  return {
    ...data,
    refresh: loadData,
    completeRoutineStep,
    startRoutine,
  };
}

// Helper function to get routine step icon
function getRoutineIcon(skillArea?: string): string {
  const icons: Record<string, string> = {
    'self-care': '🧴',
    'communication': '💬',
    'social': '👥',
    'self-regulation': '🧘',
    'executive-function': '🧠',
    'play-skills': '🎮',
    'transition': '🔄',
    'bonding': '❤️',
  };
  return icons[skillArea || ''] || '✅';
}

// ============================================================================
// Fallback Data (for when database is empty)
// ============================================================================

export function getDefaultRoutines(childName: string): RoutineData[] {
  return [
    {
      timeOfDay: 'morning',
      label: 'Morning Routine',
      tasks: [
        { id: 'm1', title: 'Wake up and stretch', description: 'Gentle morning start', icon: '☀️', completed: false, timeEstimate: '3m' },
        { id: 'm2', title: 'Get dressed', description: 'Choose and put on clothes', icon: '👕', completed: false, timeEstimate: '10m' },
        { id: 'm3', title: 'Eat breakfast', description: 'Healthy morning meal', icon: '🥣', completed: false, timeEstimate: '15m' },
        { id: 'm4', title: 'Brush teeth', description: '2 minute brush', icon: '🦷', completed: false, timeEstimate: '3m' },
      ],
      completedCount: 0,
      totalCount: 4,
    },
    {
      timeOfDay: 'afternoon',
      label: 'After School',
      tasks: [
        { id: 'a1', title: 'Snack time', description: 'Healthy snack', icon: '🍎', completed: false, timeEstimate: '10m' },
        { id: 'a2', title: 'Homework', description: 'Focus time', icon: '📚', completed: false, timeEstimate: '30m' },
        { id: 'a3', title: 'Free play', description: 'Preferred activity', icon: '🎮', completed: false, timeEstimate: '30m' },
      ],
      completedCount: 0,
      totalCount: 3,
    },
    {
      timeOfDay: 'bedtime',
      label: 'Bedtime Routine',
      tasks: [
        { id: 'b1', title: 'Bath time', description: 'Calm bath or shower', icon: '🛁', completed: false, timeEstimate: '15m' },
        { id: 'b2', title: 'Pajamas on', description: 'Get cozy', icon: '🌙', completed: false, timeEstimate: '5m' },
        { id: 'b3', title: 'Story time', description: 'Read together', icon: '📖', completed: false, timeEstimate: '10m' },
        { id: 'b4', title: 'Goodnight', description: 'Hugs and tuck in', icon: '💤', completed: false, timeEstimate: '5m' },
      ],
      completedCount: 0,
      totalCount: 4,
    },
  ];
}

export function getDefaultGoals(childName: string): { id: string; name: string; progress: number; trend: 'up' | 'down' | 'stable' }[] {
  return [
    { id: 'g1', name: 'Communication', progress: 0, trend: 'stable' },
    { id: 'g2', name: 'Self-Regulation', progress: 0, trend: 'stable' },
    { id: 'g3', name: 'Daily Routines', progress: 0, trend: 'stable' },
  ];
}

export default useDashboardData;
