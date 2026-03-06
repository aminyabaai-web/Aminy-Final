/**
 * Core TypeScript Interfaces for Aminy
 * Strong typing for all major data structures
 */

// ============================================================================
// USER & PROFILE
// ============================================================================

export type Tier = 'starter' | 'core' | 'complete';

export interface UserProfile {
  id: string;
  caregiverName: string;
  email: string;
  childName: string;
  childAge?: number;
  childDiagnosis?: string[];
  tier: Tier;
  trialEndsAt?: string;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  timezone?: string;
  notifications: boolean;
  proactiveNudges: boolean;
  voiceInput: boolean;
  photoInput: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  role: 'primary' | 'secondary' | 'provider';
  permissions: CaregiverPermissions;
  invitedAt: string;
  acceptedAt?: string;
}

export interface CaregiverPermissions {
  viewReports: boolean;
  editPlan: boolean;
  schedulesSessions: boolean;
  manageVault: boolean;
}

// ============================================================================
// GOALS & TASKS
// ============================================================================

export type GoalLevel = 'vision' | 'year' | 'quarter' | 'month' | 'week' | 'today';
export type GoalStatus = 'active' | 'completed' | 'declined' | 'pending' | 'archived';
export type SkillType = 'speech' | 'social' | 'sensory' | 'routine' | 'behavior' | 'academic';

export interface Goal {
  id: string;
  userId: string;
  level: GoalLevel;
  title: string;
  description?: string;
  status: GoalStatus;
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dueDate?: string;
  parentGoalId?: string;
  childGoalIds?: string[];
  aiSuggested: boolean;
  aiReasoning?: string;
  declineReason?: string;
  milestones?: Milestone[];
  tags?: string[];
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface Task {
  id: string;
  userId: string;
  goalId?: string;
  title: string;
  description?: string;
  skillType?: SkillType;
  priority: number; // 1 = highest
  timeEstimate?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  whyItHelps?: string;
  dueDate?: string;
  recurring?: RecurrenceRule;
  attachments?: Attachment[];
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0-6
  endDate?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

// ============================================================================
// STREAKS & WINS
// ============================================================================

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate?: string;
  isPaused: boolean;
  pauseReason?: string;
  pausedAt?: string;
  history?: StreakHistoryEntry[];
}

export interface StreakHistoryEntry {
  date: string;
  count: number;
  tasksCompleted: number;
}

export interface WinsData {
  weeklyWins: number;
  monthlyWins: number;
  totalWins: number;
  recentWins: Win[];
}

export interface Win {
  id: string;
  title: string;
  description?: string;
  source: 'task' | 'jr' | 'manual' | 'session';
  date: string;
  shared?: boolean;
  reactions?: Reaction[];
}

export interface Reaction {
  userId: string;
  emoji: string;
  timestamp: string;
}

// ============================================================================
// SESSIONS & SCHEDULING
// ============================================================================

export type SessionType = 'telehealth' | 'jr' | 'live-vision' | 'bcba' | 'therapy';
export type SessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';

export interface Session {
  id: string;
  userId: string;
  type: SessionType;
  providerId?: string;
  providerName?: string;
  scheduledAt: string;
  duration: number; // minutes
  status: SessionStatus;
  notes?: string;
  summary?: string;
  actionItems?: ActionItem[];
  recordingUrl?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

export interface Provider {
  id: string;
  name: string;
  title: string;
  specialty: string[];
  avatar?: string;
  bio?: string;
  availability?: Availability[];
  rating?: number;
  reviewCount?: number;
}

export interface Availability {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
}

// ============================================================================
// COVERAGE & INSURANCE
// ============================================================================

export type CoverageStatus = 'unknown' | 'verified' | 'pending' | 'denied' | 'partial';

export interface CoverageData {
  id: string;
  userId: string;
  provider: string;
  planName?: string;
  memberId?: string;
  groupNumber?: string;
  status: CoverageStatus;
  lastChecked?: string;
  verifiedAt?: string;
  summary?: CoverageSummary;
  documentsUploaded: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageSummary {
  eligibleServices: string[];
  copay?: number;
  deductible?: number;
  deductibleMet?: number;
  outOfPocketMax?: number;
  outOfPocketMet?: number;
  preAuthRequired: boolean;
  notes?: string;
  generatedAt: string;
}

export interface InsuranceDocument {
  id: string;
  type: 'card' | 'eob' | 'denial' | 'approval' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
  extractedData?: Record<string, unknown>;
}

// ============================================================================
// REPORTS
// ============================================================================

export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'session' | 'custom';
export type ReportView = 'parent' | 'provider';

export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  view: ReportView;
  title: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  pdfUrl?: string;
  shareLink?: string;
  shareLinkExpires?: string;
  sharedAt?: string;
  sections: ReportSection[];
  metadata?: Record<string, unknown>;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'goals' | 'sessions' | 'wins' | 'recommendations';
  content: string;
  data?: Record<string, unknown> | unknown[];
  visualizations?: Visualization[];
}

export interface Visualization {
  type: 'chart' | 'progress-bar' | 'timeline' | 'stat-card';
  data: Record<string, unknown> | unknown[];
  config?: Record<string, unknown>;
}

// ============================================================================
// VAULT & DOCUMENTS
// ============================================================================

export type DocumentType = 
  | 'insurance-card'
  | 'iep'
  | 'therapy-notes'
  | 'evaluation'
  | 'prescription'
  | 'school-report'
  | 'medical-record'
  | 'other';

export interface VaultDocument {
  id: string;
  userId: string;
  type: DocumentType;
  name: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  lastOpenedAt?: string;
  lastSharedAt?: string;
  tags?: string[];
  metadata?: DocumentMetadata;
  accessLog?: AccessLogEntry[];
}

export interface DocumentMetadata {
  extractedText?: string;
  extractedData?: Record<string, unknown>;
  ocr?: boolean;
  pages?: number;
  version?: number;
}

export interface AccessLogEntry {
  timestamp: string;
  action: 'viewed' | 'downloaded' | 'shared' | 'edited';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// AMINY JR
// ============================================================================

export type JrActivityType = 'speech' | 'calming' | 'social' | 'sensory';
export type JrDifficulty = 'easy' | 'medium' | 'hard';

export interface JrActivity {
  id: string;
  type: JrActivityType;
  title: string;
  description: string;
  difficulty: JrDifficulty;
  estimatedTime: number; // minutes
  stars: number;
  completionCount: number;
  lastCompletedAt?: string;
  content: JrActivityContent;
  prerequisites?: string[];
}

export interface JrActivityContent {
  instructions: string[];
  prompts?: string[];
  targetWords?: string[];
  breathingPattern?: BreathingPattern;
  visualAids?: string[];
}

export interface BreathingPattern {
  inhale: number; // seconds
  hold: number;
  exhale: number;
  cycles: number;
}

export interface JrSession {
  id: string;
  userId: string;
  activityId: string;
  startedAt: string;
  completedAt?: string;
  duration: number;
  starsEarned: number;
  performance?: JrPerformance;
}

export interface JrPerformance {
  accuracy?: number; // 0-100
  attempts: number;
  successes: number;
  notes?: string;
}

// ============================================================================
// LIVE VISION AI
// ============================================================================

export interface LiveVisionSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  duration: number; // seconds
  status: 'active' | 'completed' | 'error';
  microCues: MicroCue[];
  summary?: string;
  savedToReports: boolean;
  errorMessage?: string;
}

export interface MicroCue {
  timestamp: number; // seconds from start
  text: string;
  type: 'suggestion' | 'praise' | 'correction';
}

// ============================================================================
// KNOWLEDGE GRAPH
// ============================================================================

export interface KnowledgeGraph {
  userId: string;
  patterns: Pattern[];
  preferences: Record<string, unknown>;
  insights: Insight[];
  lastUpdated: string;
}

export interface Pattern {
  id: string;
  type: string;
  data: Record<string, unknown>;
  detectedAt: string;
  confidence: number; // 0-1
  occurrences: number;
}

export interface Insight {
  id: string;
  category: 'behavior' | 'sleep' | 'activity' | 'progress' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  generatedAt: string;
  actionable: boolean;
  action?: string;
}

// ============================================================================
// PROACTIVE NUDGES
// ============================================================================

export interface Nudge {
  id: string;
  type: 'celebration' | 'suggestion' | 'check-in' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible: boolean;
  expiresAt?: Date;
  conditions?: NudgeConditions;
}

export interface NudgeConditions {
  timeOfDay?: { start: number; end: number };
  dayOfWeek?: number[];
  minStreak?: number;
  maxStreak?: number;
  lowActivity?: boolean;
  pattern?: string;
}

// ============================================================================
// CHAT & MESSAGING
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'voice' | 'photo' | 'file';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  intent?: string;
  category?: string;
  actionItems?: string[];
  relatedGoals?: string[];
  relatedTasks?: string[];
}

export interface Conversation {
  id: string;
  userId: string;
  type: 'coach' | 'coverage' | 'general';
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// ============================================================================
// AI ORCHESTRATOR
// ============================================================================

export interface AIRequest {
  userId: string;
  type: 'categorize' | 'suggest' | 'summarize' | 'chat';
  input: string;
  context?: AIContext;
}

export interface AIContext {
  currentGoals?: Goal[];
  recentTasks?: Task[];
  userProfile?: UserProfile;
  conversationHistory?: Message[];
  knowledgeGraph?: KnowledgeGraph;
}

export interface AIResponse {
  success: boolean;
  data?: Record<string, unknown> | unknown[];
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CategorizedInput {
  category: 'plan' | 'coach' | 'coverage' | 'general';
  tasks?: Task[];
  questions?: string[];
  priority: number;
  suggestedGoal?: Partial<Goal>;
  reasoning?: string;
}
