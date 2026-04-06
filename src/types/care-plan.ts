// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Care Plan Types
 * Extracted from PlanTabEnhanced for reuse and maintainability.
 */

export interface PlanTabEnhancedProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string | null;
  connectorData?: Record<string, unknown>;
  publishEvent?: (eventName: string, payload: Record<string, unknown>) => void;
  onConnectorNavigation?: (destination: string) => void;
}

export interface BaselineData {
  id: string;
  goalId: string;
  startingLevel: number;
  startingDate: Date;
  description: string;
  assessmentMethod: string;
}

export interface CaregiverFeedback {
  id: string;
  goalId?: string;
  routineId?: string;
  date: Date;
  difficulty: 'too_easy' | 'just_right' | 'too_hard';
  effectiveness: number;
  notes?: string;
  recommendedAdjustment?: string;
}

export interface CoachingTouchpoint {
  id: string;
  date: Date;
  coachName: string;
  sessionType: 'review' | 'training' | 'consultation';
  goalsWorkedOn: string[];
  coachNotes: string;
  parentNotes?: string;
  recommendedTweaks: string[];
  nextSessionDate?: Date;
}

export interface RiskSafetyData {
  triggers: Array<{
    id: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    frequency: string;
    strategies: string[];
  }>;
  safetyPlans: Array<{
    id: string;
    title: string;
    trigger: string;
    steps: string[];
    emergencyContacts: string[];
  }>;
  crisisNotes: Array<{
    id: string;
    date: Date;
    description: string;
    actionTaken: string;
    outcome: string;
  }>;
}

export interface LongitudinalData {
  monthlyProgress: Array<{
    month: string;
    goalsProgress: { [goalId: string]: number };
    routinesCompleted: number;
    strategiesUsed: number;
    parentParticipation: number;
  }>;
  trendData: {
    communication: number[];
    social: number[];
    adaptive: number[];
    overall: number[];
  };
}

export interface FamilyIntegration {
  teacherReports: Array<{
    id: string;
    date: Date;
    teacherName: string;
    observations: string;
    recommendations: string;
    goals: string[];
  }>;
  siblingTracking?: Array<{
    id: string;
    name: string;
    activities: string[];
    consistency: number;
  }>;
}

export interface AIInsightData {
  patternRecognition: Array<{
    pattern: string;
    confidence: number;
    recommendation: string;
  }>;
  optimizationSuggestions: Array<{
    area: string;
    suggestion: string;
    expectedImpact: number;
  }>;
  riskAlerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    action: string;
  }>;
  motivationChecks: Array<{
    area: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  }>;
}

export interface OutcomeMetrics {
  goalsPercentageMastered: number;
  routinesCompletionRate: number;
  caregiverParticipationRate: number;
  monthlyProgressRate: number;
  costEffectiveness: number;
  roi: number;
}

export interface DailyCoachingTask {
  id: string;
  title: string;
  description: string;
  goalId: string;
  estimatedTime: string;
  completed: boolean;
  feedback?: string;
}

export interface ParentStreak {
  currentStreak: number;
  longestStreak: number;
  streakType: 'logging' | 'routines' | 'feedback';
  lastActivity: Date;
}

export interface EnhancedGoal {
  id: string;
  title: string;
  description: string;
  category: 'speech' | 'social' | 'sensory' | 'routines';
  timeline: 'short' | 'medium' | 'long';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  baselineData: BaselineData;
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate?: Date;
    completedDate?: Date;
  }>;
  feedback: CaregiverFeedback[];
  trends: number[];
}

export interface EnhancedRoutine {
  id: string;
  title: string;
  description: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  duration: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    order: number;
  }>;
  frequency: string;
  active: boolean;
  feedback: CaregiverFeedback[];
  completionRate: number;
  adaptations: string[];
}
