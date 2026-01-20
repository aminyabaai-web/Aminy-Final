/**
 * Child Profiles System
 *
 * Supports multiple children per family with:
 * - Multiple neurodivergent conditions (Autism, ADHD, Anxiety, etc.)
 * - Condition-specific tracking and goals
 * - Provider access permissions
 * - Living intake document (Insight Navigator)
 */

// Supported neurodivergent conditions
export type ConditionType =
  | 'autism'
  | 'adhd'
  | 'anxiety'
  | 'sensory-processing'
  | 'learning-disability'
  | 'speech-delay'
  | 'developmental-delay'
  | 'ocd'
  | 'depression'
  | 'other';

export const conditionLabels: Record<ConditionType, string> = {
  'autism': 'Autism Spectrum',
  'adhd': 'ADHD',
  'anxiety': 'Anxiety',
  'sensory-processing': 'Sensory Processing',
  'learning-disability': 'Learning Disability',
  'speech-delay': 'Speech/Language Delay',
  'developmental-delay': 'Developmental Delay',
  'ocd': 'OCD',
  'depression': 'Depression',
  'other': 'Other'
};

export const conditionDescriptions: Record<ConditionType, string> = {
  'autism': 'Autism Spectrum Disorder (ASD) - differences in social communication, sensory processing, and behavioral patterns',
  'adhd': 'Attention-Deficit/Hyperactivity Disorder - challenges with attention, impulse control, and/or hyperactivity',
  'anxiety': 'Anxiety disorders - excessive worry, fear, or nervousness affecting daily life',
  'sensory-processing': 'Sensory Processing Disorder - difficulty processing sensory information',
  'learning-disability': 'Learning disabilities including dyslexia, dyscalculia, dysgraphia',
  'speech-delay': 'Speech and language delays or disorders',
  'developmental-delay': 'General developmental delays across multiple areas',
  'ocd': 'Obsessive-Compulsive Disorder - unwanted thoughts and repetitive behaviors',
  'depression': 'Depression or mood disorders',
  'other': 'Other neurodevelopmental or behavioral conditions'
};

// Recommended provider types per condition
export const conditionProviderMap: Record<ConditionType, string[]> = {
  'autism': ['bcba', 'rbt', 'slp', 'ot', 'lpc', 'psychiatrist'],
  'adhd': ['lpc', 'psychiatrist', 'bcba', 'ot'],
  'anxiety': ['lpc', 'psychiatrist', 'bcba'],
  'sensory-processing': ['ot', 'bcba', 'rbt'],
  'learning-disability': ['slp', 'ot', 'lpc'],
  'speech-delay': ['slp', 'bcba', 'rbt'],
  'developmental-delay': ['bcba', 'rbt', 'slp', 'ot', 'psychiatrist'],
  'ocd': ['lpc', 'psychiatrist', 'bcba'],
  'depression': ['lpc', 'psychiatrist'],
  'other': ['bcba', 'lpc', 'psychiatrist']
};

// Child profile interface
export interface ChildProfile {
  id: string;
  familyId: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  dateOfBirth: string;
  age: number;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  profileImage?: string;

  // Conditions and diagnoses
  conditions: ConditionType[];
  primaryCondition?: ConditionType;
  diagnosisDate?: string;
  diagnosingProvider?: string;
  formalDiagnosis: boolean;

  // Current support
  currentProviders: CurrentProvider[];
  currentMedications: Medication[];
  schoolInfo?: SchoolInfo;

  // Aminy-specific
  carePlan?: CarePlan;
  insightNavigator?: InsightNavigator;
  providerPermissions: ProviderPermission[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CurrentProvider {
  id: string;
  name: string;
  type: string;
  specialty: string;
  frequency: string;
  startDate: string;
  isExternal: boolean; // true if not through Aminy
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: string;
  purpose: string;
  notes?: string;
}

export interface SchoolInfo {
  schoolName: string;
  grade: string;
  hasIEP: boolean;
  has504: boolean;
  specialEducation: boolean;
  mainContact?: string;
  notes?: string;
}

export interface CarePlan {
  id: string;
  goals: CarePlanGoal[];
  routines: Routine[];
  strategies: Strategy[];
  lastUpdated: string;
  lastUpdatedBy: string;
}

export interface CarePlanGoal {
  id: string;
  area: string;
  title: string;
  description: string;
  targetDate?: string;
  baseline: number;
  current: number;
  target: number;
  status: 'not-started' | 'in-progress' | 'achieved' | 'paused';
  relatedConditions: ConditionType[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Routine {
  id: string;
  name: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  steps: RoutineStep[];
  isActive: boolean;
}

export interface RoutineStep {
  id: string;
  order: number;
  title: string;
  duration: number; // minutes
  visualSupport?: string;
  notes?: string;
}

export interface Strategy {
  id: string;
  title: string;
  description: string;
  category: 'behavior' | 'communication' | 'sensory' | 'emotional' | 'academic' | 'social';
  source: 'bcba' | 'parent' | 'ai' | 'other';
  effectiveness: 'very-effective' | 'somewhat-effective' | 'not-effective' | 'not-tried';
  relatedConditions: ConditionType[];
}

export interface ProviderPermission {
  providerId: string;
  providerName: string;
  accessLevel: 'full' | 'summary' | 'session-only';
  grantedAt: string;
  expiresAt?: string;
  canViewInsightNavigator: boolean;
  canAddNotes: boolean;
  canUpdateCarePlan: boolean;
}

// Insight Navigator - The Living Intake Document
export interface InsightNavigator {
  id: string;
  childId: string;
  version: number;
  lastUpdated: string;
  lastUpdatedBy: 'parent' | 'provider' | 'ai';

  // Executive Summary (AI-generated, always current)
  executiveSummary: string;

  // Background
  background: {
    familyContext: string;
    developmentalHistory: string;
    medicalHistory: string;
    educationalHistory: string;
  };

  // Current Presentation
  currentPresentation: {
    strengths: string[];
    challenges: string[];
    interests: string[];
    triggers: string[];
    calmingStrategies: string[];
    communicationStyle: string;
    sensoryProfile: string;
  };

  // What's Working / Not Working (from BCBA sessions + AI analysis)
  insights: {
    whatsWorking: InsightItem[];
    whatsNotWorking: InsightItem[];
    opportunities: InsightItem[];
    recommendations: InsightItem[];
  };

  // Progress Over Time
  progressTimeline: ProgressEntry[];

  // For Providers
  providerQuickStart: {
    mustKnow: string[];
    approachGuidance: string[];
    avoidThese: string[];
    familyPreferences: string[];
  };

  // Documents referenced
  documentReferences: DocumentReference[];
}

export interface InsightItem {
  id: string;
  content: string;
  source: 'parent' | 'provider' | 'ai' | 'observation';
  sourceDetail?: string;
  addedAt: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProgressEntry {
  id: string;
  date: string;
  area: string;
  description: string;
  type: 'milestone' | 'observation' | 'setback' | 'change';
  addedBy: string;
}

export interface DocumentReference {
  id: string;
  type: 'iep' | 'evaluation' | 'medical' | 'other';
  name: string;
  date: string;
  keyInsights: string[];
}

// Helper functions

export function getChildAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getRecommendedProviders(conditions: ConditionType[]): string[] {
  const providerSet = new Set<string>();
  conditions.forEach(condition => {
    conditionProviderMap[condition]?.forEach(provider => providerSet.add(provider));
  });
  return Array.from(providerSet);
}

export function getConditionComorbidities(primaryCondition: ConditionType): ConditionType[] {
  const comorbidityMap: Record<ConditionType, ConditionType[]> = {
    'autism': ['adhd', 'anxiety', 'sensory-processing', 'speech-delay'],
    'adhd': ['anxiety', 'learning-disability', 'depression'],
    'anxiety': ['depression', 'ocd', 'adhd'],
    'sensory-processing': ['autism', 'adhd', 'anxiety'],
    'learning-disability': ['adhd', 'anxiety', 'speech-delay'],
    'speech-delay': ['autism', 'developmental-delay'],
    'developmental-delay': ['autism', 'speech-delay', 'learning-disability'],
    'ocd': ['anxiety', 'depression', 'adhd'],
    'depression': ['anxiety', 'adhd'],
    'other': []
  };
  return comorbidityMap[primaryCondition] || [];
}

export function generateInsightNavigatorSummary(child: ChildProfile): string {
  const conditions = child.conditions.map(c => conditionLabels[c]).join(', ');
  const age = child.age;

  return `${child.firstName} is a ${age}-year-old with ${conditions}. ` +
    `This living document provides a comprehensive view of ${child.firstName}'s journey, ` +
    `including what's working, current challenges, and recommended approaches. ` +
    `Last updated: ${new Date().toLocaleDateString()}.`;
}

// Create empty Insight Navigator for new child
export function createEmptyInsightNavigator(childId: string): InsightNavigator {
  return {
    id: `insight-${childId}-${Date.now()}`,
    childId,
    version: 1,
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: 'parent',
    executiveSummary: '',
    background: {
      familyContext: '',
      developmentalHistory: '',
      medicalHistory: '',
      educationalHistory: ''
    },
    currentPresentation: {
      strengths: [],
      challenges: [],
      interests: [],
      triggers: [],
      calmingStrategies: [],
      communicationStyle: '',
      sensoryProfile: ''
    },
    insights: {
      whatsWorking: [],
      whatsNotWorking: [],
      opportunities: [],
      recommendations: []
    },
    progressTimeline: [],
    providerQuickStart: {
      mustKnow: [],
      approachGuidance: [],
      avoidThese: [],
      familyPreferences: []
    },
    documentReferences: []
  };
}

// Provider types for marketplace
export type ProviderType = 'bcba' | 'rbt' | 'lpc' | 'lcsw' | 'slp' | 'ot' | 'psychiatrist' | 'pediatrician';

export interface ProviderTypeInfo {
  type: ProviderType;
  title: string;
  fullTitle: string;
  description: string;
  role: string;
  bestFor: string[];
  sessionTypes: SessionType[];
  color: string;
  icon: string;
}

export interface SessionType {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

export const providerTypes: Record<ProviderType, ProviderTypeInfo> = {
  bcba: {
    type: 'bcba',
    title: 'BCBA',
    fullTitle: 'Board Certified Behavior Analyst',
    description: 'Expert in behavior analysis, treatment planning, and parent coaching. The "architect" of your behavior support plan.',
    role: 'architect',
    bestFor: ['Treatment planning', 'Behavior assessments', 'Parent coaching', 'Goal setting'],
    sessionTypes: [
      { id: 'bcba-consult', name: 'Consultation', duration: 50, price: 99, description: 'Strategy review and parent coaching' },
      { id: 'bcba-assessment', name: 'Assessment', duration: 90, price: 175, description: 'Comprehensive behavior assessment' }
    ],
    color: 'teal',
    icon: 'GraduationCap'
  },
  rbt: {
    type: 'rbt',
    title: 'RBT',
    fullTitle: 'Registered Behavior Technician',
    description: 'Provides direct behavior support under BCBA supervision. The "builder" who implements daily strategies.',
    role: 'builder',
    bestFor: ['Daily skill practice', 'Routine building', 'Play-based learning', 'Consistent support'],
    sessionTypes: [
      { id: 'rbt-checkin', name: 'Check-in', duration: 30, price: 49, description: 'Quick progress check and coaching' },
      { id: 'rbt-session', name: 'Coaching Session', duration: 45, price: 69, description: 'Extended parent coaching' }
    ],
    color: 'blue',
    icon: 'User'
  },
  lpc: {
    type: 'lpc',
    title: 'LPC',
    fullTitle: 'Licensed Professional Counselor',
    description: 'Specializes in emotional wellbeing, anxiety, and mental health support. The "climate specialist" for emotional atmosphere.',
    role: 'climate-specialist',
    bestFor: ['Anxiety management', 'Emotional regulation', 'Coping skills', 'Family dynamics'],
    sessionTypes: [
      { id: 'lpc-therapy', name: 'Therapy Session', duration: 50, price: 99, description: 'Individual or family therapy' },
      { id: 'lpc-brief', name: 'Brief Consultation', duration: 30, price: 59, description: 'Targeted intervention' }
    ],
    color: 'violet',
    icon: 'Heart'
  },
  lcsw: {
    type: 'lcsw',
    title: 'LCSW',
    fullTitle: 'Licensed Clinical Social Worker',
    description: 'Provides therapy and helps navigate systems like schools, insurance, and community resources.',
    role: 'navigator',
    bestFor: ['System navigation', 'Family support', 'Advocacy', 'Resource connection'],
    sessionTypes: [
      { id: 'lcsw-therapy', name: 'Therapy Session', duration: 50, price: 99, description: 'Clinical support and therapy' },
      { id: 'lcsw-advocacy', name: 'Advocacy Session', duration: 45, price: 89, description: 'IEP prep, system navigation' }
    ],
    color: 'pink',
    icon: 'Users'
  },
  slp: {
    type: 'slp',
    title: 'SLP',
    fullTitle: 'Speech-Language Pathologist',
    description: 'Expert in communication, speech, and language development. Essential for 60% of children with ASD.',
    role: 'communication-expert',
    bestFor: ['Speech development', 'Language skills', 'Social communication', 'Feeding/swallowing'],
    sessionTypes: [
      { id: 'slp-session', name: 'Speech Session', duration: 45, price: 89, description: 'Speech and language therapy' },
      { id: 'slp-eval', name: 'Evaluation', duration: 60, price: 150, description: 'Communication assessment' }
    ],
    color: 'green',
    icon: 'MessageSquare'
  },
  ot: {
    type: 'ot',
    title: 'OT',
    fullTitle: 'Occupational Therapist',
    description: 'Addresses sensory processing, motor skills, and daily living activities.',
    role: 'sensory-expert',
    bestFor: ['Sensory processing', 'Fine motor skills', 'Self-care skills', 'Handwriting'],
    sessionTypes: [
      { id: 'ot-session', name: 'OT Session', duration: 45, price: 99, description: 'Occupational therapy' },
      { id: 'ot-sensory', name: 'Sensory Eval', duration: 60, price: 150, description: 'Sensory processing assessment' }
    ],
    color: 'orange',
    icon: 'Hand'
  },
  psychiatrist: {
    type: 'psychiatrist',
    title: 'Child Psychiatrist',
    fullTitle: 'Child & Adolescent Psychiatrist',
    description: 'Medical doctor specializing in mental health, including medication management for symptoms.',
    role: 'medical-expert',
    bestFor: ['Medication evaluation', 'Complex diagnoses', 'Medical management', 'Diagnostic clarity'],
    sessionTypes: [
      { id: 'psych-initial', name: 'Initial Evaluation', duration: 60, price: 275, description: 'Comprehensive psychiatric evaluation' },
      { id: 'psych-followup', name: 'Medication Follow-up', duration: 25, price: 150, description: 'Medication check and adjustment' }
    ],
    color: 'red',
    icon: 'Stethoscope'
  },
  pediatrician: {
    type: 'pediatrician',
    title: 'Dev Pediatrician',
    fullTitle: 'Developmental Pediatrician',
    description: 'Medical specialist in childhood development, behavior, and learning differences.',
    role: 'development-expert',
    bestFor: ['Developmental assessment', 'Diagnosis', 'Medical coordination', 'Growth monitoring'],
    sessionTypes: [
      { id: 'ped-initial', name: 'Developmental Eval', duration: 90, price: 350, description: 'Comprehensive developmental assessment' },
      { id: 'ped-followup', name: 'Follow-up', duration: 30, price: 175, description: 'Progress review' }
    ],
    color: 'cyan',
    icon: 'Baby'
  }
};

// Get provider analogy (for explaining roles to parents)
export function getProviderAnalogy(type: ProviderType): string {
  const analogies: Record<ProviderType, string> = {
    bcba: 'The architect who designs the blueprint for behavior support',
    rbt: 'The builder who helps implement strategies day-to-day',
    lpc: 'The climate specialist who ensures emotional comfort during storms',
    lcsw: 'The navigator who helps you through complex systems',
    slp: 'The communication bridge builder',
    ot: 'The sensory and motor skills craftsperson',
    psychiatrist: 'The medical captain for mental health needs',
    pediatrician: 'The developmental guide who sees the whole child'
  };
  return analogies[type];
}
