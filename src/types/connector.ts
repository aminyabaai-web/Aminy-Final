// Aminy MVP - Connector Hub Data Models
// Lightweight types for the integrated Connector system

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  state: string;
  insurance?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Child {
  id: string;
  name: string;
  dateOfBirth: Date;
  locale: string;
  dx_flags: string[];
  interests: string[];
  triggers: string[];
  caregiverId: string;
  createdAt: Date;
}

export interface Device {
  id: string;
  childId: string;
  platform: 'ios' | 'android' | 'web';
  lastSeenAt: Date;
  revokedAt?: Date;
  deviceToken?: string;
  name: string;
}

export interface JrProfile {
  childId: string;
  speechLevel: 'emerging' | 'developing' | 'advanced';
  targetSetId: string;
  targetSet?: string;
  targetBand?: string;
  difficultyBand?: string;
  difficultyLevel?: number;
  maxSessionMin?: number;
  voiceMode?: 'off' | 'auto-captions' | 'voice-only';
  contentLevel?: 'gentle' | 'standard';
  defaultRewardCost?: number;
  topRewards?: string[];
  tokenBalance?: number;
  status?: 'active' | 'paused';
  baselineCompleted?: boolean;
  calibratedAt?: string;
  fatigueRules: {
    maxSessionMinutes: number;
    breakAfterErrors: number;
    cooldownMinutes: number;
  };
  calibration: {
    difficulty: number;
    preferredActivities: string[];
    motivators: string[];
  };
  lastUpdated: Date;
}

export interface Plan {
  childId: string;
  version: string;
  goals: Goal[];
  dailyTasks: DailyTask[];
  reinforcement: {
    type: 'visual' | 'auditory' | 'tactile';
    frequency: 'immediate' | 'delayed' | 'weekly';
    preferences: string[];
  };
  generatedAt: Date;
  lastUpdated: Date;
}

export interface Goal {
  id: string;
  domain: 'speech' | 'social' | 'sensory' | 'routines';
  title: string;
  description: string;
  targetBehavior: string;
  timeline: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'completed' | 'paused';
  progress: number; // 0-100
}

export interface DailyTask {
  id: string;
  goalId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface Session {
  id: string;
  childId: string;
  type: 'parent' | 'jr';
  minutes: number;
  targets: string[];
  accuracy?: number; // for jr sessions
  errors?: string[]; // for jr sessions
  notes?: string; // for parent sessions
  timestamp: Date;
  metadata?: {
    mediaUploaded?: string[];
    conversationLength?: number;
    fatigueLevel?: 'low' | 'medium' | 'high';
  };
}

export interface InsightSnapshot {
  childId: string;
  screeners: {
    name: string;
    score: number;
    completedAt: Date;
  }[];
  flags: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  confidence: number; // 0-100
  recommendations: string[];
  generatedAt: Date;
  version: string;
}

export interface CoverageCase {
  childId: string;
  state: string;
  insurer: string;
  dx_present: boolean;
  telehealth_eligible: boolean;
  status: 'pending' | 'approved' | 'denied' | 'under_review';
  eligibilityCheckedAt: Date;
  benefits?: {
    sessionsPerYear: number;
    copayAmount: number;
    deductibleMet: boolean;
  };
}

export interface Referral {
  id: string;
  childId: string;
  providerId: string;
  route: 'directory' | 'care_coach' | 'insurance';
  timestamp: Date;
  status: 'sent' | 'acknowledged' | 'scheduled' | 'completed';
  metadata?: {
    providerName: string;
    specialty: string;
    contactMethod: string;
  };
}

export interface Report {
  id: string;
  childId: string;
  type: 'starter' | 'core' | 'pro';
  period: {
    startDate: Date;
    endDate: Date;
  };
  adherence: number; // percentage
  dosageMinutes: number; // weekly total
  goalSuccess: number; // percentage
  incidentsPerWeek: number;
  exports: {
    format: 'pdf' | 'json' | 'csv';
    generatedAt: Date;
    downloadUrl?: string;
  }[];
  generatedAt: Date;
}

// Event Bus Types
export interface ConnectorEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
  source: string;
}

export type EventHandler = (event: ConnectorEvent) => void;

// Connector Status Types
export interface ConnectorStatus {
  device: {
    paired: boolean;
    deviceName?: string;
    lastSeen?: Date;
  };
  insight: {
    completed: boolean;
    confidence?: number;
    lastUpdated?: Date;
  };
  benefits: {
    eligible: boolean;
    status?: string;
    checkedAt?: Date;
  };
  providers: {
    available: boolean;
    count?: number;
  };
}

// Sample seed data interfaces
export interface SeedData {
  caregivers: Caregiver[];
  children: Child[];
  devices: Device[];
  jrProfiles: JrProfile[];
  plans: Plan[];
  sessions: Session[];
  insights: InsightSnapshot[];
  coverage: CoverageCase[];
  referrals: Referral[];
  reports: Report[];
}