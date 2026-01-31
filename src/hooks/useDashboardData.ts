/**
 * useDashboardData Hook
 * Loads real data for the dashboard from database and engines
 *
 * This hook replaces hardcoded sample data with real database queries
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { routinesEngine, type DailyRoutine, type RoutineCompletion } from '../lib/routines-engine';
import { calmToolsTracking, type CalmToolStats } from '../lib/calm-tools-tracking';
import { aiMemoryEngine, type MemoryContext } from '../lib/ai-memory-engine';
import { billingEngine } from '../lib/billing-engine';
import { retentionEngine } from '../lib/retention-engine';

// ============================================================================
// Types
// ============================================================================

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  photoUrl?: string;
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

export interface DashboardData {
  // Core data
  childProfile: ChildProfile | null;
  children: ChildProfile[];

  // Routines
  todaysRoutines: RoutineData[];
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
  pendingCelebrations: any[];

  // Loading states
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDashboardData(userId?: string): DashboardData & {
  refresh: () => Promise<void>;
  completeRoutineStep: (routineId: string, stepId: string) => Promise<void>;
  startRoutine: (routineId: string) => Promise<void>;
} {
  const [data, setData] = useState<DashboardData>({
    childProfile: null,
    children: [],
    todaysRoutines: [],
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

      // Parallel fetch all data sources
      const [
        profileResult,
        childrenResult,
        routinesResult,
        goalsResult,
        appointmentsResult,
        calmStats,
        memoryContext,
        trialStatus,
        streakResult,
        milestonesResult,
        celebrationsResult,
      ] = await Promise.all([
        // Get user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),

        // Get all children for this user
        supabase
          .from('children')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false }),

        // Get today's routines
        routinesEngine.getTodaysRoutines(userId).catch(() => []),

        // Get active goals
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5),

        // Get upcoming appointments
        supabase
          .from('appointments')
          .select('*, providers(first_name, last_name)')
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3),

        // Get calm tool stats
        calmToolsTracking.getToolStats(userId, undefined, 7).catch(() => []),

        // Get AI memory context
        aiMemoryEngine.buildContext(userId).catch(() => null),

        // Get trial status
        billingEngine.getTrialStatus(userId).catch(() => null),

        // Get streak
        retentionEngine.getPrimaryStreak(userId).catch(() => null),

        // Get milestones
        retentionEngine.getEarnedMilestones(userId).catch(() => []),

        // Get pending celebrations
        retentionEngine.getPendingCelebrations(userId).catch(() => []),
      ]);

      // Process profile
      const profile = profileResult.data;

      // Process goals first (needed for child profiles)
      const goals = (goalsResult.data || []).map((g: any) => ({
        id: g.id,
        name: g.title || g.name,
        progress: g.progress || 0,
        percentMet: g.progress || 0,
        trend: g.trend || 'stable',
        childId: g.child_id,
      }));

      // Build children array from the children table
      const childrenFromTable: ChildProfile[] = (childrenResult.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        age: c.age || 5,
        photoUrl: c.photo_url,
        goals: goals.filter(g => g.childId === c.id).map(g => ({
          id: g.id,
          name: g.name,
          percentMet: g.progress,
          trend: g.trend,
        })),
      }));

      // Fallback to profile-based child if no children in table
      const childProfile: ChildProfile | null = childrenFromTable.length > 0
        ? childrenFromTable[0]  // Primary child (sorted first)
        : profile ? {
            id: profile.child_id || `child-${userId.substring(0, 8)}`,
            name: profile.child_name || 'Your Child',
            age: profile.child_age || 5,
            photoUrl: profile.child_photo_url,
            goals: goals.map(g => ({
              id: g.id,
              name: g.name,
              percentMet: g.progress,
              trend: g.trend,
            })),
          } : null;

      // Build full children array
      const children: ChildProfile[] = childrenFromTable.length > 0
        ? childrenFromTable
        : (childProfile ? [childProfile] : []);

      // Process routines
      const todaysRoutines: RoutineData[] = (routinesResult as DailyRoutine[]).map(r => ({
        timeOfDay: r.period,
        label: r.name,
        tasks: r.steps.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          icon: getRoutineIcon(s.abaSkillArea),
          completed: s.status === 'completed',
          timeEstimate: `${s.durationMinutes}m`,
        })),
        completedCount: r.steps.filter(s => s.status === 'completed').length,
        totalCount: r.steps.length,
      }));

      // Process upcoming events
      const upcomingEvents: UpcomingEvent[] = (appointmentsResult.data || []).map((a: any) => ({
        id: a.id,
        title: a.providers
          ? `Session with ${a.providers.first_name} ${a.providers.last_name}`
          : 'Upcoming Appointment',
        time: new Date(a.start_time).toLocaleString(),
        type: 'telehealth' as const,
      }));

      const nextAppt = appointmentsResult.data?.[0];

      // Calculate totals
      const totalCalmMinutes = calmStats.reduce((sum, s) => sum + s.totalMinutes, 0);
      const routineAdherence = todaysRoutines.length > 0
        ? Math.round(
            todaysRoutines.reduce((sum, r) => sum + (r.completedCount / Math.max(r.totalCount, 1)), 0) /
            todaysRoutines.length * 100
          )
        : 0;

      // Count recent conversations
      const { count: recentConversationCount } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      setData({
        childProfile,
        children,
        todaysRoutines,
        routineAdherence,
        streak: streakResult?.currentStreak || 0,
        activeGoals: goals,
        upcomingEvents,
        nextAppointment: nextAppt ? {
          providerName: nextAppt.providers
            ? `${nextAppt.providers.first_name} ${nextAppt.providers.last_name}`
            : 'Provider',
          time: new Date(nextAppt.start_time).toLocaleString(),
          type: nextAppt.visit_type || 'session',
        } : undefined,
        calmToolStats: calmStats,
        totalCalmMinutes,
        memoryContext,
        recentConversationCount: recentConversationCount || 0,
        trialStatus,
        milestonesEarned: milestonesResult.length,
        pendingCelebrations: celebrationsResult,
        isLoading: false,
        error: null,
      });

      // Record activity for streak tracking
      await retentionEngine.recordActivity(userId, 'daily_checkin').catch(() => {});

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load data',
      }));
    }
  }, [userId]);

  // Complete a routine step
  const completeRoutineStep = useCallback(async (routineId: string, stepId: string) => {
    if (!userId) return;

    try {
      // Find or create completion record
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('routine_completions')
        .select('id')
        .eq('routine_id', routineId)
        .eq('scheduled_date', today)
        .single();

      const completionId = existing?.id || await (async () => {
        const completion = await routinesEngine.startRoutine(routineId, userId, '');
        return completion.id;
      })();

      await routinesEngine.completeStep(completionId, stepId);

      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  }, [userId, loadData]);

  // Start a routine
  const startRoutine = useCallback(async (routineId: string) => {
    if (!userId) return;

    try {
      await routinesEngine.startRoutine(routineId, userId, '');
      await loadData();
    } catch (error) {
      console.error('Failed to start routine:', error);
    }
  }, [userId, loadData]);

  // Load data on mount and when userId changes
  useEffect(() => {
    loadData();
  }, [loadData]);

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
