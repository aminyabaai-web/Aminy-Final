/**
 * Plan Tab Types
 * Shared interfaces for the Plan Tab component system
 */

// ============================================
// Base Data Types
// ============================================

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
  effectiveness: number; // 1-5 rating
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

// ============================================
// Safety & Risk Types
// ============================================

export interface RiskTrigger {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  frequency: string;
  strategies: string[];
}

export interface SafetyPlan {
  id: string;
  title: string;
  trigger: string;
  steps: string[];
  emergencyContacts: string[];
}

export interface CrisisNote {
  id: string;
  date: Date;
  description: string;
  actionTaken: string;
  outcome: string;
}

export interface RiskSafetyData {
  triggers: RiskTrigger[];
  safetyPlans: SafetyPlan[];
  crisisNotes: CrisisNote[];
}

// ============================================
// Analytics & Progress Types
// ============================================

export interface MonthlyProgress {
  month: string;
  goalsProgress: { [goalId: string]: number };
  routinesCompleted: number;
  strategiesUsed: number;
  parentParticipation: number;
}

export interface TrendData {
  communication: number[];
  social: number[];
  adaptive: number[];
  overall: number[];
}

export interface LongitudinalData {
  monthlyProgress: MonthlyProgress[];
  trendData: TrendData;
}

// ============================================
// Family & School Integration Types
// ============================================

export interface TeacherReport {
  id: string;
  date: Date;
  teacherName: string;
  observations: string;
  recommendations: string;
  goals: string[];
}

export interface SiblingTracking {
  id: string;
  name: string;
  activities: string[];
  consistency: number;
}

export interface FamilyIntegration {
  teacherReports: TeacherReport[];
  siblingTracking?: SiblingTracking[];
}

// ============================================
// AI Insights Types
// ============================================

export interface PatternRecognition {
  pattern: string;
  confidence: number;
  recommendation: string;
}

export interface OptimizationSuggestion {
  area: string;
  suggestion: string;
  expectedImpact: number;
}

export interface RiskAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  action: string;
}

export interface MotivationCheck {
  area: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
}

export interface AIInsightData {
  patternRecognition: PatternRecognition[];
  optimizationSuggestions: OptimizationSuggestion[];
  riskAlerts: RiskAlert[];
  motivationChecks: MotivationCheck[];
}

// ============================================
// Metrics Types
// ============================================

export interface OutcomeMetrics {
  goalsPercentageMastered: number;
  routinesCompletionRate: number;
  caregiverParticipationRate: number;
  monthlyProgressRate: number;
  costEffectiveness: number;
  roi: number;
}

// ============================================
// Coaching Types
// ============================================

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

// ============================================
// Goal & Routine Types
// ============================================

export type GoalCategory = 'speech' | 'social' | 'sensory' | 'routines';
export type GoalTimeline = 'short' | 'medium' | 'long';
export type Priority = 'high' | 'medium' | 'low';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  completedDate?: Date;
}

export interface EnhancedGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  timeline: GoalTimeline;
  priority: Priority;
  progress: number;
  baselineData: BaselineData;
  milestones: Milestone[];
  feedback: CaregiverFeedback[];
  trends: number[]; // Weekly progress over time
}

export interface RoutineStep {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface EnhancedRoutine {
  id: string;
  title: string;
  description: string;
  timeOfDay: TimeOfDay;
  duration: string;
  steps: RoutineStep[];
  frequency: string;
  active: boolean;
  feedback: CaregiverFeedback[];
  completionRate: number;
  adaptations: string[];
}

// ============================================
// Strategy Types
// ============================================

export interface Strategy {
  id: string;
  title: string;
  description: string;
  category: string;
  forBehaviors: string[];
  steps: string[];
  whenToUse: string;
  tips: string[];
  usageCount: number;
  effectiveness: number;
}

// ============================================
// Resource Library Types
// ============================================

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAge: string;
  materials: string[];
  duration: string;
  skills: string[];
  saved: boolean;
}

export interface VideoResource {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail: string;
  url: string;
  saved: boolean;
}

export interface PrintableResource {
  id: string;
  title: string;
  description: string;
  category: string;
  pages: number;
  format: string;
  downloadUrl: string;
  saved: boolean;
}

export interface BookResource {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  ageRange: string;
  coverUrl: string;
  purchaseUrl: string;
  saved: boolean;
}

export interface AppResource {
  id: string;
  name: string;
  description: string;
  category: string;
  platform: 'ios' | 'android' | 'both';
  price: string;
  rating: number;
  iconUrl: string;
  storeUrl: string;
  saved: boolean;
}

// ============================================
// Component Props Types
// ============================================

export interface PlanTabEnhancedProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string | null;
  connectorData?: unknown;
  publishEvent?: (eventName: string, payload: unknown) => void;
  onConnectorNavigation?: (destination: string) => void;
}

export interface SectionProps {
  childName: string;
  caregiverName: string;
  userTier?: string | null;
}

// ============================================
// Navigation Types
// ============================================

export interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tierRequired?: 'pro' | 'premium';
}

export type ActiveSection =
  | 'overview'
  | 'goals'
  | 'routines'
  | 'strategies'
  | 'tracking'
  | 'rewards'
  | 'library'
  | 'coaching'
  | 'safety'
  | 'insights'
  | 'outcomes'
  | 'family'
  | 'sharing';
