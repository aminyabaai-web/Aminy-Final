/**
 * Form Data Types
 * Type definitions for onboarding and form flows
 */

// Onboarding form data
export interface OnboardingFormData {
  // Parent/caregiver info
  parentName: string;
  email?: string;
  phone?: string;
  state?: string;
  relationship?: 'parent' | 'guardian' | 'grandparent' | 'other';

  // Child info
  childName: string;
  childAge?: number;
  childBirthdate?: string;
  childGender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  childDiagnosis?: string[];
  diagnosisDate?: string;

  // Current support
  currentServices?: string[];
  currentProviders?: ProviderInfo[];
  hasIEP?: boolean;

  // Goals & priorities
  primaryGoals?: string[];
  topConcerns?: string[];
  immediateNeeds?: string[];

  // Preferences
  communicationPreference?: 'email' | 'text' | 'app' | 'phone';
  sessionTimePreference?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  preferredDays?: string[];

  // Insurance
  hasInsurance?: boolean;
  insuranceProvider?: string;
  memberId?: string;
  groupNumber?: string;

  // Child details for Jr.
  childInterests?: string[];
  childTriggers?: string[];
  childStrengths?: string[];
  sensoryPreferences?: SensoryPreferences;

  // Assessment results
  assessmentResults?: AssessmentResults;

  // Mental health & capacity
  childMentalHealth?: MentalHealthData;
  parentCapacity?: ParentCapacityData;

  // Consent & agreements
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  hipaaAccepted?: boolean;
  consentTimestamp?: string;
}

export interface ProviderInfo {
  name: string;
  type: string;
  frequency?: string;
  contact?: string;
}

export interface SensoryPreferences {
  visual?: 'low' | 'medium' | 'high';
  auditory?: 'low' | 'medium' | 'high';
  tactile?: 'low' | 'medium' | 'high';
  vestibular?: 'low' | 'medium' | 'high';
  proprioceptive?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface AssessmentResults {
  speechLevel?: 'emerging' | 'developing' | 'advanced';
  socialSkills?: 'emerging' | 'developing' | 'advanced';
  selfRegulation?: 'emerging' | 'developing' | 'advanced';
  academicReadiness?: 'emerging' | 'developing' | 'advanced';
  completedAt?: string;
  version?: string;
}

export interface MentalHealthData {
  anxietyLevel?: 'none' | 'mild' | 'moderate' | 'severe';
  moodConcerns?: string[];
  sleepIssues?: boolean;
  eatingConcerns?: boolean;
  behavioralConcerns?: string[];
  currentMedications?: string[];
  therapyHistory?: string;
}

export interface ParentCapacityData {
  stressLevel?: 'low' | 'moderate' | 'high' | 'very-high';
  supportNetwork?: 'none' | 'limited' | 'moderate' | 'strong';
  availableHoursPerWeek?: number;
  primaryConcern?: string;
  copingStrategies?: string[];
  needsRespite?: boolean;
}

// Care plan form data
export interface CarePlanFormData {
  childName: string;
  goals: CarePlanGoal[];
  tasks: CarePlanTask[];
  schedule?: WeeklySchedule;
  reinforcement?: ReinforcementPlan;
  generatedAt?: string;
}

export interface CarePlanGoal {
  id: string;
  domain: 'speech' | 'social' | 'sensory' | 'routines' | 'behavior' | 'academic';
  title: string;
  description: string;
  targetBehavior?: string;
  baseline?: string;
  target?: string;
  timeline?: string;
  priority: 'high' | 'medium' | 'low';
  selected?: boolean;
}

export interface CarePlanTask {
  id: string;
  goalId: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'as-needed';
  duration?: number; // minutes
  materials?: string[];
  instructions?: string[];
}

export interface WeeklySchedule {
  monday?: ScheduleSlot[];
  tuesday?: ScheduleSlot[];
  wednesday?: ScheduleSlot[];
  thursday?: ScheduleSlot[];
  friday?: ScheduleSlot[];
  saturday?: ScheduleSlot[];
  sunday?: ScheduleSlot[];
}

export interface ScheduleSlot {
  time: string; // HH:mm
  taskId: string;
  duration: number; // minutes
  notes?: string;
}

export interface ReinforcementPlan {
  type: 'token' | 'praise' | 'activity' | 'tangible';
  schedule: 'immediate' | 'delayed' | 'variable';
  rewards: Reward[];
}

export interface Reward {
  id: string;
  name: string;
  cost?: number; // tokens
  description?: string;
  imageUrl?: string;
}

// Coverage chat flow
export interface CoverageResponses {
  hasInsurance?: boolean;
  insuranceType?: 'private' | 'medicaid' | 'tricare' | 'other' | 'none';
  insuranceName?: string;
  state?: string;
  hasDiagnosis?: boolean;
  diagnosisType?: string[];
  currentServices?: string[];
  seekingServices?: string[];
  priorDenials?: boolean;
  priorDenialReason?: string;
  urgency?: 'immediate' | 'soon' | 'planning';
}

export interface CoverageChatQuestion {
  id: string;
  question: string;
  options?: CoverageChatOption[];
  type: 'single' | 'multi' | 'text' | 'yes-no';
  field: string;
  followUpQuestion?: (answer: unknown) => string | null;
}

export interface CoverageChatOption {
  value: string;
  label: string;
  description?: string;
}

// Generic form step props
export interface FormStepProps<T> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  onNext?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

// Preferences step (commonly used)
export interface PreferencesStepProps {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
}

// Summary step props
export interface SummaryStepProps {
  formData: OnboardingFormData;
  onEdit?: (step: string) => void;
  onConfirm?: () => void;
}
