/**
 * CentralReach Integration - TypeScript Types
 *
 * All CentralReach-specific data models for the bidirectional integration:
 * - CentralReach -> Aminy: session notes, goals, behavior data, insurance
 * - Aminy -> CentralReach: ABC logs, routine completions, Junior session results
 *
 * CentralReach is a practice management and clinical data collection platform
 * widely used by ABA (Applied Behavior Analysis) providers.
 */

// ============================================================================
// Configuration
// ============================================================================

/** CentralReach API configuration */
export interface CentralReachConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  organizationId: string;
}

/** OAuth 2.0 token pair returned by CentralReach */
export interface CRAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
  tokenType: 'Bearer';
  scope: string;
}

// ============================================================================
// Client & Insurance Models (CentralReach -> Aminy)
// ============================================================================

/** CentralReach client (patient/child) record */
export interface CRClient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  diagnosis: string[]; // ICD-10 codes
  insuranceInfo: CRInsurance;
  status: 'active' | 'inactive' | 'discharged';
  primaryProviderId: string;
  createdAt: string;
  updatedAt: string;
}

/** CentralReach insurance/authorization information */
export interface CRInsurance {
  payerId: string;
  payerName: string;
  memberId: string;
  groupNumber: string;
  authorizationNumber: string;
  authUnitsRemaining: number;
  authUnitsUsed: number;
  authStartDate: string; // YYYY-MM-DD
  authEndDate: string;   // YYYY-MM-DD
  authStatus: 'active' | 'expired' | 'pending' | 'denied';
}

// ============================================================================
// Session & Goal Models (CentralReach -> Aminy)
// ============================================================================

/** CentralReach therapy session record */
export interface CRSession {
  id: string;
  clientId: string;
  providerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  duration: number;  // minutes
  sessionType: CRSessionType;
  notes: string;
  goals: CRGoalData[];
  billingCode: string; // CPT code (e.g. '97153')
  billingUnits: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  signedOff: boolean;
  signedOffBy: string;
  signedOffAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Session type classification */
export type CRSessionType =
  | 'direct_therapy'       // 97153 - RBT-delivered
  | 'supervision'          // 97155 - BCBA supervision
  | 'parent_training'      // 97156 - Family guidance
  | 'assessment'           // 97151/97152 - Evaluation
  | 'group_therapy'        // 97154 - Group session
  | 'telehealth'           // Remote delivery
  | 'consultation';        // Clinical meeting

/** Goal data recorded during a session */
export interface CRGoalData {
  goalId: string;
  trials: number;
  successes: number;
  accuracy: number;       // 0-100 percentage
  promptLevel: CRPromptLevel;
  notes: string;
  phase: 'baseline' | 'acquisition' | 'mastery' | 'maintenance' | 'generalization';
}

/** Treatment goal definition */
export interface CRGoal {
  id: string;
  clientId: string;
  description: string;
  targetBehavior: string;
  baseline: number;       // 0-100
  currentLevel: number;   // 0-100
  target: number;         // 0-100
  measurementMethod: CRMeasurementMethod;
  domain: CRGoalDomain;
  status: 'active' | 'mastered' | 'on_hold' | 'discontinued';
  targetDate: string;     // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

/** Prompt level hierarchy (least-to-most intrusive) */
export type CRPromptLevel =
  | 'independent'
  | 'gestural'
  | 'verbal'
  | 'model'
  | 'partial_physical'
  | 'full_physical';

/** How progress is measured */
export type CRMeasurementMethod =
  | 'trial_by_trial'      // Discrete trial data
  | 'frequency'           // Count per interval
  | 'duration'            // Time-based
  | 'latency'             // Response time
  | 'interval_recording'  // Whole/partial interval
  | 'permanent_product';  // Work sample

/** Treatment goal domain */
export type CRGoalDomain =
  | 'communication'
  | 'social_skills'
  | 'daily_living'
  | 'behavior_reduction'
  | 'academic'
  | 'motor_skills'
  | 'play_leisure'
  | 'self_management';

// ============================================================================
// Home Program Models (CentralReach -> Aminy)
// ============================================================================

/** Home program assigned by BCBA for parent implementation */
export interface CRHomeProgram {
  id: string;
  clientId: string;
  providerId: string;     // BCBA who assigned it
  assignedDate: string;   // YYYY-MM-DD
  activities: CRActivity[];
  dueDate: string;        // YYYY-MM-DD
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  instructions: string;
  frequencyPerWeek: number;
  createdAt: string;
  updatedAt: string;
}

/** Individual activity within a home program */
export interface CRActivity {
  id: string;
  name: string;
  instructions: string;
  targetTrials: number;
  targetAccuracy: number; // 0-100
  materials: string[];
  domain: CRGoalDomain;
  linkedGoalId: string;
  videoUrl?: string;      // Instructional video for parent
}

// ============================================================================
// Data Push Models (Aminy -> CentralReach)
// ============================================================================

/** ABC (Antecedent-Behavior-Consequence) log from parent/caregiver */
export interface CRBehaviorLogPayload {
  clientId: string;
  reportedBy: string;       // Parent/caregiver ID
  date: string;             // YYYY-MM-DD
  time: string;             // HH:MM
  antecedent: string;
  behavior: string;
  consequence: string;
  severity: number;         // 1-5
  location: string;
  duration?: number;        // minutes
  environmentalFactors?: string[];
  notes?: string;
}

/** Routine completion data from Aminy daily routines */
export interface CRRoutineCompletionPayload {
  clientId: string;
  reportedBy: string;
  date: string;             // YYYY-MM-DD
  routineType: 'morning' | 'afternoon' | 'evening' | 'bedtime' | 'mealtime' | 'custom';
  routineName: string;
  stepsCompleted: number;
  stepsTotal: number;
  completionPercentage: number; // 0-100
  independenceLevel: CRPromptLevel;
  duration: number;         // minutes
  notes?: string;
  billingDocumentation: {
    isHomeProgramActivity: boolean;
    linkedHomeProgramId?: string;
    linkedGoalIds: string[];
    parentTrainingMinutes: number;
  };
}

/** Junior mode gamified session results */
export interface CRJuniorSessionPayload {
  clientId: string;
  reportedBy: string;
  date: string;             // YYYY-MM-DD
  sessionDuration: number;  // minutes
  gameType: string;
  skillDomain: CRGoalDomain;
  trialsCompleted: number;
  trialsCorrect: number;
  accuracy: number;         // 0-100
  engagementScore: number;  // 0-100
  linkedGoalIds: string[];
  rewards: {
    starsEarned: number;
    badgesEarned: string[];
  };
  adaptiveDifficulty: {
    startLevel: number;
    endLevel: number;
    adjustments: number;
  };
}

/** Caregiver wellness data for treatment context */
export interface CRCaregiverWellnessPayload {
  caregiverId: string;
  clientId: string;
  date: string;             // YYYY-MM-DD
  stressLevel: number;      // 1-10
  sleepHours: number;
  selfCareCompleted: boolean;
  supportNetworkContact: boolean;
  wellnessScore: number;    // 0-100 composite
  concerns?: string;
  notes?: string;
}

/** Home program progress update pushed back to CentralReach */
export interface CRHomeProgramProgressPayload {
  homeProgramId: string;
  clientId: string;
  date: string;             // YYYY-MM-DD
  completions: CRActivityCompletion[];
  overallCompletionRate: number; // 0-100
  caregiverNotes: string;
}

/** Individual activity completion within a home program */
export interface CRActivityCompletion {
  activityId: string;
  completed: boolean;
  trials: number;
  successes: number;
  accuracy: number;         // 0-100
  promptLevel: CRPromptLevel;
  duration: number;         // minutes
  notes?: string;
}

// ============================================================================
// Webhook Models
// ============================================================================

/** Incoming webhook payload from CentralReach */
export interface CRWebhookPayload {
  event: CRWebhookEvent;
  timestamp: string;
  organizationId: string;
  data: Record<string, unknown>;
  signature: string;
}

/** CentralReach webhook event types */
export type CRWebhookEvent =
  | 'session_completed'
  | 'goal_updated'
  | 'authorization_changed'
  | 'home_program_assigned'
  | 'client_updated'
  | 'session_cancelled'
  | 'note_signed';

// ============================================================================
// Sync & Error Models
// ============================================================================

/** Sync status for a single entity */
export interface CRSyncRecord {
  id: string;
  entityType: 'session' | 'goal' | 'behavior_log' | 'routine' | 'routine_completion' | 'junior_session' | 'wellness' | 'caregiver_wellness' | 'home_program' | 'home_program_progress';
  entityId: string;
  direction: 'pull' | 'push';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'conflict';
  lastSyncAt: string;
  localTimestamp: string;
  remoteTimestamp: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  createdAt: string;
}

/** Overall sync state for a client */
export interface CRSyncState {
  clientId: string;
  lastPullAt: string;
  lastPushAt: string;
  pullStatus: 'idle' | 'syncing' | 'error';
  pushStatus: 'idle' | 'syncing' | 'error';
  pendingPushCount: number;
  failedPushCount: number;
  conflictCount: number;
}

/** CentralReach API error response */
export interface CRApiError {
  code: string;
  message: string;
  details?: string;
  statusCode: number;
  retryable: boolean;
}

/** Rate limit info from API response headers */
export interface CRRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp (ms)
}

// ============================================================================
// Mapped Types (CentralReach <-> Aminy conversions)
// ============================================================================

/** Aminy dashboard session card (mapped from CRSession) */
export interface AminySessionCard {
  id: string;
  childName: string;
  providerName: string;
  date: string;
  duration: string;       // formatted e.g. "1h 30m"
  type: string;           // human-readable
  summary: string;
  goalProgress: Array<{
    goalName: string;
    accuracy: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  source: 'centralreach';
}

/** Aminy care plan goal (mapped from CRGoal) */
export interface AminyCareGoal {
  id: string;
  title: string;
  description: string;
  progress: number;       // 0-100
  target: number;         // 0-100
  domain: string;
  status: string;
  lastUpdated: string;
  source: 'centralreach';
}

/** Aminy coverage info (mapped from CRInsurance) */
export interface AminyCoverageInfo {
  payerName: string;
  memberId: string;
  authorizationNumber: string;
  unitsRemaining: number;
  unitsUsed: number;
  authExpiresOn: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'pending';
  source: 'centralreach';
}
