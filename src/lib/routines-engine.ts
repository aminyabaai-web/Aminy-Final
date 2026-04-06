// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Daily Routines Engine
 * AI-generated routines from ABA goals, customizable, persistent
 *
 * This is the core engine for creating, managing, and tracking daily routines
 * that are tailored to each child's ABA therapy goals.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type RoutinePeriod = 'morning' | 'afternoon' | 'evening' | 'bedtime';
export type RoutineStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'partial';
export type RoutineDifficulty = 'easy' | 'moderate' | 'challenging';

export interface RoutineStep {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  order: number;
  isOptional: boolean;
  abaSkillArea?: string; // e.g., "self-care", "communication", "social"
  promptLevel?: 'independent' | 'verbal' | 'gestural' | 'physical';
  visualSupport?: string; // URL to visual aid
  completedAt?: string;
  status: RoutineStatus;
  notes?: string;
}

export interface DailyRoutine {
  id: string;
  userId: string;
  childId: string;
  period: RoutinePeriod;
  name: string;
  description?: string;
  steps: RoutineStep[];
  scheduledTime: string; // HH:MM format
  estimatedDuration: number; // minutes
  isAiGenerated: boolean;
  linkedGoalIds: string[]; // ABA goals this routine supports
  difficulty: RoutineDifficulty;
  isActive: boolean;
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
  createdAt: string;
  updatedAt: string;
}

export interface RoutineCompletion {
  id: string;
  routineId: string;
  userId: string;
  childId: string;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  status: RoutineStatus;
  stepsCompleted: number;
  totalSteps: number;
  adherenceScore: number; // 0-100
  notes?: string;
  moodBefore?: 'calm' | 'neutral' | 'agitated';
  moodAfter?: 'calm' | 'neutral' | 'agitated';
  challengesNoted?: string[];
}

export interface ABAGoal {
  id: string;
  userId: string;
  childId: string;
  title: string;
  description: string;
  targetBehavior: string;
  currentBaseline: string;
  targetCriteria: string;
  skillArea: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// AI Routine Generation
// ============================================================================

interface GenerateRoutineParams {
  userId: string;
  childId: string;
  childName: string;
  childAge: number;
  period: RoutinePeriod;
  goals: ABAGoal[];
  challenges?: string[];
  preferences?: {
    wakeTim?: string;
    bedTime?: string;
    transitionWarningMinutes?: number;
    visualSupportsPreferred?: boolean;
  };
}

/**
 * Generate an AI-powered routine based on ABA goals and child profile
 */
export async function generateAIRoutine(params: GenerateRoutineParams): Promise<DailyRoutine> {
  const { userId, childId, childName, childAge, period, goals, challenges, preferences } = params;

  // Build prompt for AI
  const prompt = buildRoutinePrompt(childName, childAge, period, goals, challenges, preferences);

  // Call AI service
  const response = await fetch('/api/ai/generate-routine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, period, goals }),
  });

  if (!response.ok) {
    // Fallback to template-based routine
    return createTemplateRoutine(userId, childId, period, goals);
  }

  const aiRoutine = await response.json();

  // Create routine in database
  const routine = await createRoutine({
    userId,
    childId,
    period,
    name: aiRoutine.name || getDefaultRoutineName(period),
    description: aiRoutine.description,
    steps: aiRoutine.steps.map((step: { title: string; description?: string; duration?: number; isOptional?: boolean; skillArea?: string; promptLevel?: string }, index: number) => ({
      id: `step-${Date.now()}-${index}`,
      title: step.title,
      description: step.description,
      durationMinutes: step.duration || 5,
      order: index,
      isOptional: step.isOptional || false,
      abaSkillArea: step.skillArea,
      promptLevel: step.promptLevel || 'verbal',
      status: 'pending' as RoutineStatus,
    })),
    scheduledTime: getDefaultTime(period, preferences),
    isAiGenerated: true,
    linkedGoalIds: goals.map(g => g.id),
    difficulty: aiRoutine.difficulty || 'moderate',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day by default
  });

  return routine;
}

function buildRoutinePrompt(
  childName: string,
  childAge: number,
  period: RoutinePeriod,
  goals: ABAGoal[],
  challenges?: string[],
  preferences?: Record<string, unknown>
): string {
  const goalDescriptions = goals.map(g => `- ${g.title}: ${g.description}`).join('\n');
  const challengeList = challenges?.join(', ') || 'none specified';

  return `Create a ${period} routine for ${childName}, age ${childAge}.

ABA Goals to incorporate:
${goalDescriptions}

Known challenges: ${challengeList}

Preferences:
- Visual supports preferred: ${preferences?.visualSupportsPreferred ? 'Yes' : 'No'}
- Transition warning time: ${preferences?.transitionWarningMinutes || 5} minutes

Generate a structured routine with:
1. Clear, achievable steps
2. Realistic time estimates for a ${childAge}-year-old
3. Built-in transition cues
4. Opportunities to practice target skills
5. Positive reinforcement moments

Return as JSON with: name, description, difficulty, steps (title, description, duration, skillArea, promptLevel, isOptional)`;
}

function createTemplateRoutine(
  userId: string,
  childId: string,
  period: RoutinePeriod,
  goals: ABAGoal[]
): DailyRoutine {
  const templates: Record<RoutinePeriod, Omit<RoutineStep, 'id' | 'status'>[]> = {
    morning: [
      { title: 'Wake up and stretch', description: 'Gentle wake-up with stretching', durationMinutes: 3, order: 0, isOptional: false, abaSkillArea: 'self-regulation' },
      { title: 'Use bathroom', description: 'Independent bathroom routine', durationMinutes: 10, order: 1, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Get dressed', description: 'Choose and put on clothes', durationMinutes: 10, order: 2, isOptional: false, abaSkillArea: 'self-care', promptLevel: 'verbal' },
      { title: 'Eat breakfast', description: 'Sit and eat breakfast', durationMinutes: 20, order: 3, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Brush teeth', description: 'Brush teeth for 2 minutes', durationMinutes: 5, order: 4, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Pack bag / prepare for day', description: 'Gather needed items', durationMinutes: 5, order: 5, isOptional: false, abaSkillArea: 'executive-function' },
      { title: 'Transition time', description: 'Deep breaths before leaving', durationMinutes: 2, order: 6, isOptional: true, abaSkillArea: 'self-regulation' },
    ],
    afternoon: [
      { title: 'Arrive home / transition', description: 'Calm down time after school', durationMinutes: 10, order: 0, isOptional: false, abaSkillArea: 'self-regulation' },
      { title: 'Healthy snack', description: 'Have a nutritious snack', durationMinutes: 15, order: 1, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Homework or learning time', description: 'Focus on educational activities', durationMinutes: 30, order: 2, isOptional: false, abaSkillArea: 'executive-function' },
      { title: 'Break / free play', description: 'Preferred activity break', durationMinutes: 20, order: 3, isOptional: false, abaSkillArea: 'play-skills' },
      { title: 'Structured activity', description: 'Therapy exercises or skill practice', durationMinutes: 20, order: 4, isOptional: true, abaSkillArea: 'varies' },
    ],
    evening: [
      { title: 'Family dinner', description: 'Eat dinner together', durationMinutes: 30, order: 0, isOptional: false, abaSkillArea: 'social' },
      { title: 'Help with cleanup', description: 'Clear plate, help with dishes', durationMinutes: 10, order: 1, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Calm activity time', description: 'Quiet play, reading, or screen time', durationMinutes: 30, order: 2, isOptional: false, abaSkillArea: 'self-regulation' },
      { title: 'Prepare for tomorrow', description: 'Lay out clothes, pack bag', durationMinutes: 10, order: 3, isOptional: true, abaSkillArea: 'executive-function' },
    ],
    bedtime: [
      { title: 'First warning (30 min)', description: 'Announce bedtime is coming', durationMinutes: 1, order: 0, isOptional: false, abaSkillArea: 'transition' },
      { title: 'Screen off / quiet transition', description: 'Turn off screens, start calming', durationMinutes: 10, order: 1, isOptional: false, abaSkillArea: 'self-regulation' },
      { title: 'Bath or shower', description: 'Hygiene routine', durationMinutes: 15, order: 2, isOptional: true, abaSkillArea: 'self-care' },
      { title: 'Put on pajamas', description: 'Change into sleepwear', durationMinutes: 5, order: 3, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Brush teeth', description: 'Nighttime tooth brushing', durationMinutes: 5, order: 4, isOptional: false, abaSkillArea: 'self-care' },
      { title: 'Story time or quiet activity', description: 'Read together or listen to calm music', durationMinutes: 15, order: 5, isOptional: false, abaSkillArea: 'bonding' },
      { title: 'Goodnight routine', description: 'Hugs, kisses, tuck in', durationMinutes: 5, order: 6, isOptional: false, abaSkillArea: 'social' },
    ],
  };

  const steps = templates[period].map((step, index) => ({
    ...step,
    id: `step-${Date.now()}-${index}`,
    status: 'pending' as RoutineStatus,
  }));

  const now = new Date().toISOString();

  return {
    id: `routine-${Date.now()}`,
    userId,
    childId,
    period,
    name: getDefaultRoutineName(period),
    steps,
    scheduledTime: getDefaultTime(period),
    estimatedDuration: steps.reduce((sum, s) => sum + s.durationMinutes, 0),
    isAiGenerated: false,
    linkedGoalIds: goals.map(g => g.id),
    difficulty: 'moderate',
    isActive: true,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    createdAt: now,
    updatedAt: now,
  };
}

function getDefaultRoutineName(period: RoutinePeriod): string {
  const names: Record<RoutinePeriod, string> = {
    morning: 'Morning Routine',
    afternoon: 'After School Routine',
    evening: 'Evening Routine',
    bedtime: 'Bedtime Routine',
  };
  return names[period];
}

function getDefaultTime(period: RoutinePeriod, preferences?: Record<string, unknown>): string {
  const defaults: Record<RoutinePeriod, string> = {
    morning: (preferences?.wakeTime as string) || '07:00',
    afternoon: '15:30',
    evening: '18:00',
    bedtime: preferences?.bedTime ? subtractMinutes(preferences.bedTime as string, 45) : '20:00',
  };
  return defaults[period];
}

function subtractMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMins = hours * 60 + mins - minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new routine
 */
export async function createRoutine(
  data: Omit<DailyRoutine, 'id' | 'createdAt' | 'updatedAt' | 'estimatedDuration' | 'isActive'>
): Promise<DailyRoutine> {
  const now = new Date().toISOString();
  const estimatedDuration = data.steps.reduce((sum, s) => sum + s.durationMinutes, 0);

  const routine: DailyRoutine = {
    ...data,
    id: `routine-${Date.now()}`,
    estimatedDuration,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('daily_routines')
    .insert({
      id: routine.id,
      user_id: routine.userId,
      child_id: routine.childId,
      period: routine.period,
      name: routine.name,
      description: routine.description,
      steps: routine.steps,
      scheduled_time: routine.scheduledTime,
      estimated_duration: routine.estimatedDuration,
      is_ai_generated: routine.isAiGenerated,
      linked_goal_ids: routine.linkedGoalIds,
      difficulty: routine.difficulty,
      is_active: routine.isActive,
      days_of_week: routine.daysOfWeek,
      created_at: routine.createdAt,
      updated_at: routine.updatedAt,
    });

  if (error) {
    console.error('Failed to save routine:', error);
    // Still return the routine for local use
  }

  return routine;
}

/**
 * Get all routines for a user/child
 */
export async function getRoutines(userId: string, childId?: string): Promise<DailyRoutine[]> {
  let query = supabase
    .from('daily_routines')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('period');

  if (childId) {
    query = query.eq('child_id', childId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch routines:', error);
    return [];
  }

  return (data || []).map(mapDbRoutine);
}

/**
 * Get routines for today
 */
export async function getTodaysRoutines(userId: string, childId?: string): Promise<DailyRoutine[]> {
  const today = new Date().getDay(); // 0-6
  const routines = await getRoutines(userId, childId);
  return routines.filter(r => r.daysOfWeek.includes(today));
}

/**
 * Update a routine
 */
export async function updateRoutine(
  routineId: string,
  updates: Partial<Pick<DailyRoutine, 'name' | 'description' | 'steps' | 'scheduledTime' | 'daysOfWeek' | 'difficulty'>>
): Promise<DailyRoutine | null> {
  const { data, error } = await supabase
    .from('daily_routines')
    .update({
      ...updates,
      steps: updates.steps,
      scheduled_time: updates.scheduledTime,
      days_of_week: updates.daysOfWeek,
      estimated_duration: updates.steps?.reduce((sum, s) => sum + s.durationMinutes, 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', routineId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update routine:', error);
    return null;
  }

  return mapDbRoutine(data);
}

/**
 * Delete (deactivate) a routine
 */
export async function deleteRoutine(routineId: string): Promise<boolean> {
  const { error } = await supabase
    .from('daily_routines')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', routineId);

  return !error;
}

/**
 * Reorder routine steps
 */
export async function reorderSteps(routineId: string, stepIds: string[]): Promise<boolean> {
  // Fetch current routine
  const { data: routine } = await supabase
    .from('daily_routines')
    .select('steps')
    .eq('id', routineId)
    .single();

  if (!routine) return false;

  const steps = routine.steps as RoutineStep[];
  const reorderedSteps = stepIds.map((id, index) => {
    const step = steps.find(s => s.id === id);
    return step ? { ...step, order: index } : null;
  }).filter(Boolean);

  const { error } = await supabase
    .from('daily_routines')
    .update({ steps: reorderedSteps, updated_at: new Date().toISOString() })
    .eq('id', routineId);

  return !error;
}

// ============================================================================
// Completion Tracking
// ============================================================================

/**
 * Start a routine
 */
export async function startRoutine(routineId: string, userId: string, childId: string): Promise<RoutineCompletion> {
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  // Get routine to count steps
  const { data: routine } = await supabase
    .from('daily_routines')
    .select('steps')
    .eq('id', routineId)
    .single();

  const totalSteps = (routine?.steps as RoutineStep[])?.length || 0;

  const completion: RoutineCompletion = {
    id: `completion-${Date.now()}`,
    routineId,
    userId,
    childId,
    scheduledDate: today,
    startedAt: now,
    status: 'in_progress',
    stepsCompleted: 0,
    totalSteps,
    adherenceScore: 0,
  };

  await supabase.from('routine_completions').insert({
    id: completion.id,
    routine_id: completion.routineId,
    user_id: completion.userId,
    child_id: completion.childId,
    scheduled_date: completion.scheduledDate,
    started_at: completion.startedAt,
    status: completion.status,
    steps_completed: completion.stepsCompleted,
    total_steps: completion.totalSteps,
    adherence_score: completion.adherenceScore,
  });

  return completion;
}

/**
 * Complete a step in a routine
 */
export async function completeStep(
  completionId: string,
  stepId: string,
  notes?: string
): Promise<{ stepsCompleted: number; totalSteps: number }> {
  // Get current completion
  const { data: completion } = await supabase
    .from('routine_completions')
    .select('*, daily_routines(steps)')
    .eq('id', completionId)
    .single();

  if (!completion) {
    throw new Error('Completion not found');
  }

  const steps = (completion.daily_routines as { steps?: RoutineStep[] })?.steps || [];
  const stepIndex = steps.findIndex(s => s.id === stepId);

  if (stepIndex !== -1) {
    steps[stepIndex].status = 'completed';
    steps[stepIndex].completedAt = new Date().toISOString();
    if (notes) steps[stepIndex].notes = notes;
  }

  const stepsCompleted = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const adherenceScore = Math.round((stepsCompleted / totalSteps) * 100);

  // Update completion
  await supabase
    .from('routine_completions')
    .update({
      steps_completed: stepsCompleted,
      adherence_score: adherenceScore,
      status: stepsCompleted === totalSteps ? 'completed' : 'in_progress',
      completed_at: stepsCompleted === totalSteps ? new Date().toISOString() : null,
    })
    .eq('id', completionId);

  // Update routine with step progress
  await supabase
    .from('daily_routines')
    .update({ steps, updated_at: new Date().toISOString() })
    .eq('id', completion.routine_id);

  return { stepsCompleted, totalSteps };
}

/**
 * Skip a step
 */
export async function skipStep(completionId: string, stepId: string, reason?: string): Promise<void> {
  const { data: completion } = await supabase
    .from('routine_completions')
    .select('*, daily_routines(steps)')
    .eq('id', completionId)
    .single();

  if (!completion) return;

  const steps = (completion.daily_routines as { steps?: RoutineStep[] })?.steps || [];
  const stepIndex = steps.findIndex(s => s.id === stepId);

  if (stepIndex !== -1) {
    steps[stepIndex].status = 'skipped';
    steps[stepIndex].notes = reason;
  }

  await supabase
    .from('daily_routines')
    .update({ steps, updated_at: new Date().toISOString() })
    .eq('id', completion.routine_id);
}

/**
 * Complete a routine
 */
export async function completeRoutine(
  completionId: string,
  moodAfter?: 'calm' | 'neutral' | 'agitated',
  notes?: string
): Promise<RoutineCompletion> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('routine_completions')
    .update({
      status: 'completed',
      completed_at: now,
      mood_after: moodAfter,
      notes,
    })
    .eq('id', completionId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to complete routine');
  }

  return mapDbCompletion(data);
}

/**
 * Get completion history
 */
export async function getCompletionHistory(
  userId: string,
  childId?: string,
  startDate?: string,
  endDate?: string
): Promise<RoutineCompletion[]> {
  let query = supabase
    .from('routine_completions')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: false });

  if (childId) {
    query = query.eq('child_id', childId);
  }
  if (startDate) {
    query = query.gte('scheduled_date', startDate);
  }
  if (endDate) {
    query = query.lte('scheduled_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch completion history:', error);
    return [];
  }

  return (data || []).map(mapDbCompletion);
}

/**
 * Get adherence stats for a time period
 */
export async function getAdherenceStats(
  userId: string,
  childId?: string,
  days: number = 7
): Promise<{
  averageAdherence: number;
  completedCount: number;
  partialCount: number;
  skippedCount: number;
  streak: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const completions = await getCompletionHistory(
    userId,
    childId,
    startDate.toISOString().split('T')[0]
  );

  const completed = completions.filter(c => c.status === 'completed').length;
  const partial = completions.filter(c => c.status === 'partial').length;
  const skipped = completions.filter(c => c.status === 'skipped').length;

  const avgAdherence = completions.length > 0
    ? completions.reduce((sum, c) => sum + c.adherenceScore, 0) / completions.length
    : 0;

  // Calculate streak (consecutive days with at least one completion)
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasCompletion = completions.some(
      c => c.scheduledDate === dateStr && c.status === 'completed'
    );
    if (hasCompletion) {
      streak++;
    } else if (i > 0) {
      break; // Streak broken
    }
  }

  return {
    averageAdherence: Math.round(avgAdherence),
    completedCount: completed,
    partialCount: partial,
    skippedCount: skipped,
    streak,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDbRoutine(data: Record<string, unknown>): DailyRoutine {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    childId: data.child_id as string,
    period: data.period as RoutinePeriod,
    name: data.name as string,
    description: data.description as string | undefined,
    steps: (data.steps || []) as RoutineStep[],
    scheduledTime: data.scheduled_time as string,
    estimatedDuration: data.estimated_duration as number,
    isAiGenerated: data.is_ai_generated as boolean,
    linkedGoalIds: (data.linked_goal_ids || []) as string[],
    difficulty: data.difficulty as DailyRoutine['difficulty'],
    isActive: data.is_active as boolean,
    daysOfWeek: (data.days_of_week || [0, 1, 2, 3, 4, 5, 6]) as number[],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapDbCompletion(data: Record<string, unknown>): RoutineCompletion {
  return {
    id: data.id as string,
    routineId: data.routine_id as string,
    userId: data.user_id as string,
    childId: data.child_id as string,
    scheduledDate: data.scheduled_date as string,
    startedAt: data.started_at as string | undefined,
    completedAt: data.completed_at as string | undefined,
    status: data.status as RoutineCompletion['status'],
    stepsCompleted: data.steps_completed as number,
    totalSteps: data.total_steps as number,
    adherenceScore: data.adherence_score as number,
    notes: data.notes as string | undefined,
    moodBefore: data.mood_before as RoutineCompletion['moodBefore'],
    moodAfter: data.mood_after as RoutineCompletion['moodAfter'],
    challengesNoted: data.challenges_noted as string[] | undefined,
  };
}

// ============================================================================
// Export
// ============================================================================

export const routinesEngine = {
  // AI Generation
  generateAIRoutine,

  // CRUD
  createRoutine,
  getRoutines,
  getTodaysRoutines,
  updateRoutine,
  deleteRoutine,
  reorderSteps,

  // Completion Tracking
  startRoutine,
  completeStep,
  skipStep,
  completeRoutine,
  getCompletionHistory,
  getAdherenceStats,
};

export default routinesEngine;
