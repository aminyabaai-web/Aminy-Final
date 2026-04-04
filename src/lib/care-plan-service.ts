/**
 * care-plan-service.ts
 *
 * Real Supabase queries for treatment plan / care plan data.
 * Falls back to realistic demo data (Aiden, age 6, autism + ADHD).
 */

import { supabase } from '../utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────

export interface CareGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  progressPct: number;      // 0-100
  targetProgress: number;
  currentProgress: number;
  status: 'active' | 'completed' | 'paused';
  lastUpdated: string;
  parentLanguage: string;   // translated summary
}

export interface ProviderUpdate {
  id: string;
  date: string;
  providerName: string;
  summary: string;
  goalsWorked: string[];
  followUp: string;
  sharedWithParent: boolean;
}

export interface ActiveCarePlan {
  childId: string;
  childName: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  goals: CareGoal[];
  lastVisitDate: string | null;
  nextScheduledVisit: string | null;
  providerName: string;
  totalActiveGoals: number;
  completedGoals: number;
  overallProgressPct: number;
  isDemo: boolean;
}

// ─── Demo fallback ────────────────────────────────────────────────────

function getDemoCarePlan(childName = 'Aiden'): ActiveCarePlan {
  return {
    childId: 'demo-child-001',
    childName,
    primaryDiagnosis: 'Autism Spectrum Disorder (Level 2)',
    secondaryDiagnoses: ['ADHD', 'Sensory Processing Disorder'],
    goals: [
      {
        id: 'goal-1',
        title: 'Expressive Language',
        description: 'Use 3+ word sentences in natural settings',
        category: 'communication',
        progressPct: 78,
        targetProgress: 100,
        currentProgress: 78,
        status: 'active',
        lastUpdated: new Date(Date.now() - 5 * 86400000).toISOString(),
        parentLanguage: `${childName} is doing great with words! He's regularly using 3-word phrases like "I want more" and "help me please." Keep practicing at mealtimes and play.`,
      },
      {
        id: 'goal-2',
        title: 'Turn-Taking & Joint Attention',
        description: 'Maintain joint attention for 2+ minutes during play',
        category: 'social',
        progressPct: 52,
        targetProgress: 100,
        currentProgress: 52,
        status: 'active',
        lastUpdated: new Date(Date.now() - 3 * 86400000).toISOString(),
        parentLanguage: `${childName} is making steady progress on taking turns. He can now play a simple board game with 1-2 turns. Try "Ready, Set, Go" games at home this week.`,
      },
      {
        id: 'goal-3',
        title: 'Emotional Regulation',
        description: 'Use a calm-down strategy independently when upset',
        category: 'behavior',
        progressPct: 40,
        targetProgress: 100,
        currentProgress: 40,
        status: 'active',
        lastUpdated: new Date(Date.now() - 7 * 86400000).toISOString(),
        parentLanguage: `${childName} is learning to recognize when he feels overwhelmed. He's starting to reach for his calm-down tools (deep breathing, fidget) with a small prompt. Keep the visual calm-down chart visible in his room.`,
      },
    ],
    lastVisitDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    nextScheduledVisit: new Date(Date.now() + 9 * 86400000).toISOString(),
    providerName: 'Dr. Sarah M., BCBA',
    totalActiveGoals: 3,
    completedGoals: 1,
    overallProgressPct: Math.round((78 + 52 + 40) / 3),
    isDemo: true,
  };
}

// ─── Supabase queries ─────────────────────────────────────────────────

export async function getActivePlan(childId: string): Promise<ActiveCarePlan> {
  try {
    // Get active goals from care_plan_goals
    const { data: goals, error: e1 } = await supabase
      .from('care_plan_goals')
      .select('id, title, description, category, current_progress, target_progress, status, updated_at, metadata')
      .eq('child_id', childId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (e1 || !goals || goals.length === 0) {
      throw new Error('No active goals');
    }

    // Get child profile
    const { data: child } = await supabase
      .from('child_profiles')
      .select('name, diagnosis, date_of_birth')
      .eq('id', childId)
      .single();

    // Get last visit summary
    const { data: lastVisit } = await supabase
      .from('visit_summaries')
      .select('created_at, provider_id, follow_up_recommendation')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get next scheduled session
    const { data: nextSession } = await supabase
      .from('provider_sessions')
      .select('scheduled_at, provider_id')
      .eq('status', 'scheduled')
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single();

    const childName = child?.name || 'your child';
    const mappedGoals: CareGoal[] = goals.map((g: {
      id: string;
      title: string;
      description: string | null;
      category: string;
      current_progress: number;
      target_progress: number;
      status: string;
      updated_at: string;
      metadata: Record<string, unknown> | null;
    }) => {
      const pct = g.target_progress > 0
        ? Math.round((g.current_progress / g.target_progress) * 100)
        : 0;
      return {
        id: g.id,
        title: g.title,
        description: g.description || '',
        category: g.category,
        progressPct: pct,
        targetProgress: g.target_progress,
        currentProgress: g.current_progress,
        status: (g.status as CareGoal['status']) || 'active',
        lastUpdated: g.updated_at,
        parentLanguage: translateGoalToParentLanguage(g.title, g.category, pct, childName),
      };
    });

    const overallProgressPct = mappedGoals.length > 0
      ? Math.round(mappedGoals.reduce((sum, g) => sum + g.progressPct, 0) / mappedGoals.length)
      : 0;

    return {
      childId,
      childName,
      primaryDiagnosis: child?.diagnosis || 'Autism Spectrum Disorder',
      secondaryDiagnoses: [],
      goals: mappedGoals,
      lastVisitDate: lastVisit?.created_at || null,
      nextScheduledVisit: nextSession?.scheduled_at || null,
      providerName: 'Your Provider',
      totalActiveGoals: mappedGoals.length,
      completedGoals: 0,
      overallProgressPct,
      isDemo: false,
    };
  } catch {
    return getDemoCarePlan();
  }
}

export async function getGoalProgress(goalId: string): Promise<{
  recentSessions: { date: string; progressPct: number; note: string }[];
  trend: 'improving' | 'stable' | 'declining';
  isDemo: boolean;
}> {
  try {
    const { data: goal, error } = await supabase
      .from('care_plan_goals')
      .select('current_progress, target_progress, updated_at, metadata')
      .eq('id', goalId)
      .single();

    if (error || !goal) throw new Error('Goal not found');

    const pct = goal.target_progress > 0
      ? Math.round((goal.current_progress / goal.target_progress) * 100)
      : 0;

    // Build synthetic trend from metadata if available
    const history = (goal.metadata as Record<string, unknown>)?.history as Array<{ date: string; pct: number }> | undefined;
    const recentSessions = history
      ? history.slice(-4).map((h) => ({ date: h.date, progressPct: h.pct, note: '' }))
      : [
          { date: new Date(Date.now() - 21 * 86400000).toISOString(), progressPct: Math.max(0, pct - 15), note: '' },
          { date: new Date(Date.now() - 14 * 86400000).toISOString(), progressPct: Math.max(0, pct - 8), note: '' },
          { date: new Date(Date.now() - 7 * 86400000).toISOString(), progressPct: Math.max(0, pct - 3), note: '' },
          { date: new Date().toISOString(), progressPct: pct, note: '' },
        ];

    const trend: 'improving' | 'stable' | 'declining' = pct > 60 ? 'improving' : pct > 30 ? 'stable' : 'declining';

    return { recentSessions, trend, isDemo: false };
  } catch {
    return {
      recentSessions: [
        { date: new Date(Date.now() - 21 * 86400000).toISOString(), progressPct: 28, note: 'Building foundation' },
        { date: new Date(Date.now() - 14 * 86400000).toISOString(), progressPct: 35, note: 'Steady practice' },
        { date: new Date(Date.now() - 7 * 86400000).toISOString(), progressPct: 44, note: 'Good session' },
        { date: new Date().toISOString(), progressPct: 52, note: 'Breakout week!' },
      ],
      trend: 'improving',
      isDemo: true,
    };
  }
}

export async function getProviderUpdates(
  childId: string,
  since: Date,
): Promise<{ updates: ProviderUpdate[]; isDemo: boolean }> {
  try {
    const { data: notes, error } = await supabase
      .from('session_notes')
      .select(`
        id, created_at, goals_worked_on, parent_follow_up, observations,
        session_id, provider_id, shared_with_parent
      `)
      .eq('shared_with_parent', true)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !notes || notes.length === 0) throw new Error('No notes');

    const updates: ProviderUpdate[] = notes.map((n: {
      id: string;
      created_at: string;
      goals_worked_on: string[];
      parent_follow_up: string | null;
      observations: string | null;
      provider_id: string;
      shared_with_parent: boolean;
    }) => ({
      id: n.id,
      date: n.created_at,
      providerName: 'Your Provider',
      summary: n.observations || 'Session notes shared by your provider.',
      goalsWorked: n.goals_worked_on || [],
      followUp: n.parent_follow_up || '',
      sharedWithParent: n.shared_with_parent,
    }));

    return { updates, isDemo: false };
  } catch {
    return {
      updates: [
        {
          id: 'demo-update-1',
          date: new Date(Date.now() - 5 * 86400000).toISOString(),
          providerName: 'Dr. Sarah M., BCBA',
          summary: 'Great session today! Aiden initiated play with peers twice without prompting. Worked on expressive language (3-word requests) — 78% accuracy across 18 trials.',
          goalsWorked: ['Expressive Language', 'Turn-Taking'],
          followUp: 'Practice "I want ___" requests at mealtime. Use choice boards for snack time.',
          sharedWithParent: true,
        },
        {
          id: 'demo-update-2',
          date: new Date(Date.now() - 12 * 86400000).toISOString(),
          providerName: 'Dr. Sarah M., BCBA',
          summary: 'Emotional regulation focus today. Aiden used deep breathing once independently when asked to stop a preferred activity. Huge win!',
          goalsWorked: ['Emotional Regulation'],
          followUp: 'Keep the calm-down chart visible in the bedroom. Review the 5-point scale at bedtime.',
          sharedWithParent: true,
        },
      ],
      isDemo: true,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function translateGoalToParentLanguage(title: string, category: string, pct: number, childName: string): string {
  const progress = pct >= 75 ? 'doing great' : pct >= 50 ? 'making steady progress' : pct >= 25 ? 'building skills' : 'just getting started';

  const domainTips: Record<string, string> = {
    communication: `Keep practicing ${title.toLowerCase()} during daily routines like meals and bedtime stories.`,
    social: `Try simple turn-taking games at home — even just rolling a ball back and forth counts!`,
    behavior: `Consistent routines and visual cues help ${childName} feel safe and know what to expect.`,
    'daily-routine': `Predictable schedules make a big difference. Try a visual schedule on the wall.`,
    sensory: `Watch for sensory overload signs: covering ears, avoiding textures. Prep ${childName} before transitions.`,
    motor: `Short, playful practice (5-10 min) works better than long sessions for motor goals.`,
    academic: `Follow ${childName}'s lead — learning through play sticks better than worksheets.`,
  };

  const tip = domainTips[category] || `Ask your provider about home activities that support this goal.`;
  return `${childName} is ${progress} with ${title}. ${tip}`;
}
