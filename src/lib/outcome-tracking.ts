// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Outcome Tracking System
 *
 * Tracks treatment outcomes, progress metrics, and efficacy data
 * for providers and payors. Enables evidence-based care and
 * insurance documentation.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type OutcomeCategory =
  | 'behavior'
  | 'communication'
  | 'social'
  | 'self-care'
  | 'academic'
  | 'motor'
  | 'emotional';

export type MeasurementType =
  | 'frequency'
  | 'duration'
  | 'percentage'
  | 'rating'
  | 'milestone';

export interface OutcomeGoal {
  id: string;
  childId: string;
  providerId?: string;
  category: OutcomeCategory;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  measurementType: MeasurementType;
  unit: string;
  baselineValue: number;
  baselineDate: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeDataPoint {
  id: string;
  goalId: string;
  value: number;
  notes?: string;
  recordedBy: 'parent' | 'provider' | 'system';
  recordedAt: string;
  context?: {
    environment?: string;
    antecedent?: string;
    intervention?: string;
  };
}

export interface ProgressReport {
  goalId: string;
  goal: OutcomeGoal;
  dataPoints: OutcomeDataPoint[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  percentToGoal: number;
  averageValue: number;
  changeFromBaseline: number;
  projectedCompletionDate?: string;
  insights: string[];
}

export interface AggregateOutcomes {
  providerId: string;
  period: { start: string; end: string };
  totalPatients: number;
  activeGoals: number;
  completedGoals: number;
  averageProgressPercent: number;
  categoryBreakdown: Record<OutcomeCategory, {
    goals: number;
    avgProgress: number;
    completionRate: number;
  }>;
  patientImprovementRate: number;
}

// ============================================================================
// GOAL MANAGEMENT
// ============================================================================

/**
 * Create a new outcome goal
 */
export async function createOutcomeGoal(
  goal: Omit<OutcomeGoal, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>
): Promise<{ success: boolean; goal?: OutcomeGoal; error?: string }> {
  try {
    const now = new Date().toISOString();
    const newGoal: OutcomeGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      currentValue: goal.baselineValue,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase
      .from('outcome_goals')
      .insert({
        id: newGoal.id,
        child_id: newGoal.childId,
        provider_id: newGoal.providerId,
        category: newGoal.category,
        title: newGoal.title,
        description: newGoal.description,
        target_value: newGoal.targetValue,
        current_value: newGoal.currentValue,
        measurement_type: newGoal.measurementType,
        unit: newGoal.unit,
        baseline_value: newGoal.baselineValue,
        baseline_date: newGoal.baselineDate,
        target_date: newGoal.targetDate,
        status: newGoal.status,
        created_at: newGoal.createdAt,
        updated_at: newGoal.updatedAt,
      });

    if (error) {
      console.error('[OutcomeTracking] Error creating goal:', error);
      return { success: false, error: error.message };
    }

    return { success: true, goal: newGoal };
  } catch (err) {
    console.error('[OutcomeTracking] Error:', err);
    return { success: false, error: 'Failed to create goal' };
  }
}

/**
 * Get all goals for a child
 */
export async function getChildGoals(childId: string): Promise<OutcomeGoal[]> {
  try {
    const { data, error } = await supabase
      .from('outcome_goals')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[OutcomeTracking] Error fetching goals:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      childId: row.child_id,
      providerId: row.provider_id,
      category: row.category,
      title: row.title,
      description: row.description,
      targetValue: row.target_value,
      currentValue: row.current_value,
      measurementType: row.measurement_type,
      unit: row.unit,
      baselineValue: row.baseline_value,
      baselineDate: row.baseline_date,
      targetDate: row.target_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('[OutcomeTracking] Error:', err);
    return [];
  }
}

/**
 * Get all goals for a provider's patients
 */
export async function getProviderGoals(providerId: string): Promise<OutcomeGoal[]> {
  try {
    const { data, error } = await supabase
      .from('outcome_goals')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[OutcomeTracking] Error fetching provider goals:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      childId: row.child_id,
      providerId: row.provider_id,
      category: row.category,
      title: row.title,
      description: row.description,
      targetValue: row.target_value,
      currentValue: row.current_value,
      measurementType: row.measurement_type,
      unit: row.unit,
      baselineValue: row.baseline_value,
      baselineDate: row.baseline_date,
      targetDate: row.target_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('[OutcomeTracking] Error:', err);
    return [];
  }
}

// ============================================================================
// DATA POINT RECORDING
// ============================================================================

/**
 * Record a new data point for a goal
 */
export async function recordDataPoint(
  goalId: string,
  value: number,
  recordedBy: 'parent' | 'provider' | 'system',
  notes?: string,
  context?: OutcomeDataPoint['context']
): Promise<{ success: boolean; dataPoint?: OutcomeDataPoint; error?: string }> {
  try {
    const dataPoint: OutcomeDataPoint = {
      id: `dp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      goalId,
      value,
      notes,
      recordedBy,
      recordedAt: new Date().toISOString(),
      context,
    };

    const { error } = await supabase
      .from('outcome_data_points')
      .insert({
        id: dataPoint.id,
        goal_id: dataPoint.goalId,
        value: dataPoint.value,
        notes: dataPoint.notes,
        recorded_by: dataPoint.recordedBy,
        recorded_at: dataPoint.recordedAt,
        context: dataPoint.context,
      });

    if (error) {
      console.error('[OutcomeTracking] Error recording data point:', error);
      return { success: false, error: error.message };
    }

    // Update current value on goal
    await supabase
      .from('outcome_goals')
      .update({
        current_value: value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId);

    return { success: true, dataPoint };
  } catch (err) {
    console.error('[OutcomeTracking] Error:', err);
    return { success: false, error: 'Failed to record data point' };
  }
}

/**
 * Get data points for a goal
 */
export async function getGoalDataPoints(
  goalId: string,
  limit?: number
): Promise<OutcomeDataPoint[]> {
  try {
    let query = supabase
      .from('outcome_data_points')
      .select('*')
      .eq('goal_id', goalId)
      .order('recorded_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[OutcomeTracking] Error fetching data points:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      goalId: row.goal_id,
      value: row.value,
      notes: row.notes,
      recordedBy: row.recorded_by,
      recordedAt: row.recorded_at,
      context: row.context,
    }));
  } catch (err) {
    console.error('[OutcomeTracking] Error:', err);
    return [];
  }
}

// ============================================================================
// PROGRESS ANALYSIS
// ============================================================================

/**
 * Calculate trend from data points
 */
function calculateTrend(
  dataPoints: OutcomeDataPoint[],
  goalDirection: 'increase' | 'decrease' = 'increase'
): 'improving' | 'declining' | 'stable' | 'insufficient_data' {
  if (dataPoints.length < 3) return 'insufficient_data';

  // Get last 7 data points
  const recent = dataPoints.slice(0, 7);
  const older = dataPoints.slice(7, 14);

  if (older.length === 0) return 'insufficient_data';

  const recentAvg = recent.reduce((sum, dp) => sum + dp.value, 0) / recent.length;
  const olderAvg = older.reduce((sum, dp) => sum + dp.value, 0) / older.length;

  const change = recentAvg - olderAvg;
  const changePercent = Math.abs(change / olderAvg) * 100;

  // Less than 5% change is considered stable
  if (changePercent < 5) return 'stable';

  if (goalDirection === 'increase') {
    return change > 0 ? 'improving' : 'declining';
  } else {
    return change < 0 ? 'improving' : 'declining';
  }
}

/**
 * Generate a progress report for a goal
 */
export async function generateProgressReport(goalId: string): Promise<ProgressReport | null> {
  try {
    // Fetch goal
    const { data: goalData, error: goalError } = await supabase
      .from('outcome_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError || !goalData) {
      console.error('[OutcomeTracking] Error fetching goal:', goalError);
      return null;
    }

    const goal: OutcomeGoal = {
      id: goalData.id,
      childId: goalData.child_id,
      providerId: goalData.provider_id,
      category: goalData.category,
      title: goalData.title,
      description: goalData.description,
      targetValue: goalData.target_value,
      currentValue: goalData.current_value,
      measurementType: goalData.measurement_type,
      unit: goalData.unit,
      baselineValue: goalData.baseline_value,
      baselineDate: goalData.baseline_date,
      targetDate: goalData.target_date,
      status: goalData.status,
      createdAt: goalData.created_at,
      updatedAt: goalData.updated_at,
    };

    // Fetch data points
    const dataPoints = await getGoalDataPoints(goalId, 30);

    // Calculate metrics
    const avgValue = dataPoints.length > 0
      ? dataPoints.reduce((sum, dp) => sum + dp.value, 0) / dataPoints.length
      : goal.baselineValue;

    const progressNeeded = goal.targetValue - goal.baselineValue;
    const progressMade = goal.currentValue - goal.baselineValue;
    const percentToGoal = progressNeeded !== 0
      ? Math.round((progressMade / progressNeeded) * 100)
      : (goal.currentValue >= goal.targetValue ? 100 : 0);

    const changeFromBaseline = goal.currentValue - goal.baselineValue;

    // Determine goal direction (for behaviors we want to reduce, direction is decrease)
    const goalDirection = goal.targetValue > goal.baselineValue ? 'increase' : 'decrease';
    const trend = calculateTrend(dataPoints, goalDirection);

    // Generate insights
    const insights: string[] = [];

    if (trend === 'improving') {
      insights.push(`Showing positive progress toward ${goal.title}`);
    } else if (trend === 'declining') {
      insights.push(`May need intervention adjustment for ${goal.title}`);
    }

    if (percentToGoal >= 75) {
      insights.push('Near goal completion - consider setting a new target');
    } else if (percentToGoal < 25 && dataPoints.length > 10) {
      insights.push('Progress slower than expected - review intervention strategies');
    }

    if (goal.measurementType === 'frequency' && changeFromBaseline < 0) {
      insights.push(`Frequency reduced by ${Math.abs(changeFromBaseline)} ${goal.unit}`);
    }

    // Project completion date based on current rate
    let projectedCompletionDate: string | undefined;
    if (dataPoints.length >= 5 && trend === 'improving') {
      const daysOfData = dataPoints.length;
      const progressPerDay = progressMade / daysOfData;
      if (progressPerDay > 0) {
        const remainingProgress = goal.targetValue - goal.currentValue;
        const daysToComplete = Math.ceil(remainingProgress / progressPerDay);
        const projectedDate = new Date();
        projectedDate.setDate(projectedDate.getDate() + daysToComplete);
        projectedCompletionDate = projectedDate.toISOString();
      }
    }

    return {
      goalId,
      goal,
      dataPoints,
      trend,
      percentToGoal: Math.max(0, Math.min(100, percentToGoal)),
      averageValue: Math.round(avgValue * 100) / 100,
      changeFromBaseline: Math.round(changeFromBaseline * 100) / 100,
      projectedCompletionDate,
      insights,
    };
  } catch (err) {
    console.error('[OutcomeTracking] Error generating report:', err);
    return null;
  }
}

// ============================================================================
// AGGREGATE REPORTING (for Payors and Providers)
// ============================================================================

/**
 * Generate aggregate outcomes for a provider
 */
export async function getProviderAggregateOutcomes(
  providerId: string,
  startDate: string,
  endDate: string
): Promise<AggregateOutcomes | null> {
  try {
    // Fetch all goals for this provider in the period
    const { data: goalsData, error: goalsError } = await supabase
      .from('outcome_goals')
      .select('*')
      .eq('provider_id', providerId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (goalsError) {
      console.error('[OutcomeTracking] Error:', goalsError);
      return null;
    }

    const goals = goalsData || [];

    // Get unique patients
    const uniquePatients = new Set(goals.map(g => g.child_id));

    // Calculate category breakdown
    const categoryBreakdown: AggregateOutcomes['categoryBreakdown'] = {
      behavior: { goals: 0, avgProgress: 0, completionRate: 0 },
      communication: { goals: 0, avgProgress: 0, completionRate: 0 },
      social: { goals: 0, avgProgress: 0, completionRate: 0 },
      'self-care': { goals: 0, avgProgress: 0, completionRate: 0 },
      academic: { goals: 0, avgProgress: 0, completionRate: 0 },
      motor: { goals: 0, avgProgress: 0, completionRate: 0 },
      emotional: { goals: 0, avgProgress: 0, completionRate: 0 },
    };

    let totalProgress = 0;
    let completedGoals = 0;
    let goalsWithProgress = 0;

    for (const goal of goals) {
      const category = goal.category as OutcomeCategory;
      if (categoryBreakdown[category]) {
        categoryBreakdown[category].goals++;

        const progressNeeded = goal.target_value - goal.baseline_value;
        const progressMade = goal.current_value - goal.baseline_value;
        const progress = progressNeeded !== 0
          ? (progressMade / progressNeeded) * 100
          : (goal.current_value >= goal.target_value ? 100 : 0);

        categoryBreakdown[category].avgProgress += progress;
        totalProgress += progress;
        goalsWithProgress++;

        if (goal.status === 'completed') {
          completedGoals++;
          categoryBreakdown[category].completionRate++;
        }
      }
    }

    // Calculate averages
    Object.keys(categoryBreakdown).forEach(cat => {
      const c = categoryBreakdown[cat as OutcomeCategory];
      if (c.goals > 0) {
        c.avgProgress = Math.round(c.avgProgress / c.goals);
        c.completionRate = Math.round((c.completionRate / c.goals) * 100);
      }
    });

    // Calculate patient improvement rate (patients with at least one improving goal)
    let patientsImproving = 0;
    for (const patientId of uniquePatients) {
      const patientGoals = goals.filter(g => g.child_id === patientId);
      const hasImprovement = patientGoals.some(g => {
        const progressNeeded = g.target_value - g.baseline_value;
        const progressMade = g.current_value - g.baseline_value;
        return progressNeeded > 0 ? progressMade > 0 : progressMade < 0;
      });
      if (hasImprovement) patientsImproving++;
    }

    return {
      providerId,
      period: { start: startDate, end: endDate },
      totalPatients: uniquePatients.size,
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals,
      averageProgressPercent: goalsWithProgress > 0
        ? Math.round(totalProgress / goalsWithProgress)
        : 0,
      categoryBreakdown,
      patientImprovementRate: uniquePatients.size > 0
        ? Math.round((patientsImproving / uniquePatients.size) * 100)
        : 0,
    };
  } catch (err) {
    console.error('[OutcomeTracking] Error:', err);
    return null;
  }
}

// ============================================================================
// COMMON GOAL TEMPLATES
// ============================================================================

export const GOAL_TEMPLATES: Array<{
  category: OutcomeCategory;
  title: string;
  description: string;
  measurementType: MeasurementType;
  unit: string;
  typicalBaseline: number;
  typicalTarget: number;
}> = [
  {
    category: 'behavior',
    title: 'Reduce meltdown frequency',
    description: 'Decrease the number of meltdowns per week',
    measurementType: 'frequency',
    unit: 'per week',
    typicalBaseline: 5,
    typicalTarget: 1,
  },
  {
    category: 'behavior',
    title: 'Increase independent self-regulation',
    description: 'Child uses calming strategies independently before escalating',
    measurementType: 'percentage',
    unit: '% of opportunities',
    typicalBaseline: 20,
    typicalTarget: 80,
  },
  {
    category: 'communication',
    title: 'Increase spontaneous requests',
    description: 'Number of unprompted verbal or AAC requests per day',
    measurementType: 'frequency',
    unit: 'per day',
    typicalBaseline: 5,
    typicalTarget: 20,
  },
  {
    category: 'communication',
    title: 'Response to name',
    description: 'Child responds within 5 seconds when name is called',
    measurementType: 'percentage',
    unit: '% of trials',
    typicalBaseline: 30,
    typicalTarget: 90,
  },
  {
    category: 'social',
    title: 'Peer interaction duration',
    description: 'Total minutes of appropriate peer interaction during play',
    measurementType: 'duration',
    unit: 'minutes',
    typicalBaseline: 5,
    typicalTarget: 20,
  },
  {
    category: 'social',
    title: 'Joint attention episodes',
    description: 'Initiates or responds to joint attention with others',
    measurementType: 'frequency',
    unit: 'per session',
    typicalBaseline: 2,
    typicalTarget: 10,
  },
  {
    category: 'self-care',
    title: 'Independent morning routine',
    description: 'Completes morning routine steps independently',
    measurementType: 'percentage',
    unit: '% of steps',
    typicalBaseline: 30,
    typicalTarget: 90,
  },
  {
    category: 'self-care',
    title: 'Toileting success',
    description: 'Uses toilet appropriately without accidents',
    measurementType: 'percentage',
    unit: '% of day',
    typicalBaseline: 50,
    typicalTarget: 95,
  },
  {
    category: 'emotional',
    title: 'Anxiety management',
    description: 'Uses coping strategies when feeling anxious',
    measurementType: 'rating',
    unit: 'rating 1-5',
    typicalBaseline: 2,
    typicalTarget: 4,
  },
  {
    category: 'emotional',
    title: 'Emotional identification',
    description: 'Correctly identifies own emotions',
    measurementType: 'percentage',
    unit: '% correct',
    typicalBaseline: 40,
    typicalTarget: 85,
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createOutcomeGoal,
  getChildGoals,
  getProviderGoals,
  recordDataPoint,
  getGoalDataPoints,
  generateProgressReport,
  getProviderAggregateOutcomes,
  GOAL_TEMPLATES,
};
