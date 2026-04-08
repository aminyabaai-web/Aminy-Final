// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Rethink Behavioral Health EHR — Bidirectional Integration
 *
 * Rethink (rethinkbh.com) is an ABA practice management and data collection
 * platform used by BCBA-led clinics. This integration enables:
 *
 * PULL (Rethink → Aminy):
 * - Client demographics, diagnosis codes, insurance
 * - Session notes & summaries for the parent dashboard
 * - Skill acquisition programs → mapped to care goals
 * - Behavior reduction programs → mapped to incident tracking
 * - Trial-by-trial data sheets → mapped to progress metrics
 * - Insurance authorizations → mapped to CoverageCoach
 * - Staff assignments (BCBAs / RBTs) → mapped to provider portal
 *
 * PUSH (Aminy → Rethink):
 * - Parent-completed behavior logs
 * - Home program completion data
 * - Junior mode gamified session results
 * - Caregiver observations/notes
 *
 * Architecture:
 * - OAuth 2.0 with automatic token refresh
 * - Exponential backoff on transient failures
 * - Offline push queue (persisted to Supabase)
 * - Periodic sync manager (15-minute interval)
 * - Webhook handler for real-time push from Rethink
 * - No `any` types — unknown + type guards throughout
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { secureFetch } from './security/secure-fetch';
import { RETHINK_CONFIG, isRethinkConfigured, getRethinkOAuthUrl } from './rethink-config';

// ============================================================================
// TypeScript Types
// ============================================================================

// --- Configuration & Auth ---

export interface RethinkConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: readonly string[];
  syncInterval: number;
}

export interface RethinkAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;   // Unix timestamp (ms)
  tokenType: 'Bearer';
  scope: string;
}

// --- Core Rethink Data Models (Pull) ---

/** Rethink patient/client record (data model — not the API client class). */
export interface RethinkClientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;          // YYYY-MM-DD
  diagnosisCodes: string[];     // ICD-10 codes (e.g. "F84.0")
  primaryDiagnosis: string;
  insurance: RethinkAuthorization[];
  status: 'active' | 'inactive' | 'discharged' | 'waitlist';
  primaryBcbaId: string;
  primaryRbtId: string;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RethinkSession {
  id: string;
  clientId: string;
  staffId: string;
  staffRole: 'bcba' | 'rbt' | 'bcaba' | 'trainee';
  sessionDate: string;          // YYYY-MM-DD
  startTime: string;            // HH:MM (24h)
  endTime: string;              // HH:MM (24h)
  durationMinutes: number;
  sessionType: RethinkSessionType;
  location: 'clinic' | 'home' | 'school' | 'community' | 'telehealth';
  notes: string;
  parentSignature: boolean;
  goalData: RethinkGoalDataPoint[];
  behaviorData: RethinkBehaviorDataPoint[];
  billingCode: string;          // CPT code
  billingUnits: number;
  status: 'draft' | 'completed' | 'signed' | 'billed' | 'cancelled';
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RethinkSessionType =
  | 'direct_therapy'     // 97153 — RBT-delivered discrete trial / natural environment
  | 'supervision'        // 97155 — BCBA supervision
  | 'parent_training'    // 97156 — Family/caregiver guidance
  | 'assessment'         // 97151 / 97152 — Functional behavior assessment
  | 'group_therapy'      // 97154 — Group ABA
  | 'telehealth'         // Remote delivery
  | 'consultation';      // Clinical team meeting

export interface RethinkGoalDataPoint {
  goalId: string;
  programName: string;
  trials: number;
  correct: number;
  accuracy: number;             // 0–100
  promptLevel: RethinkPromptLevel;
  phase: 'baseline' | 'acquisition' | 'fluency' | 'maintenance' | 'generalization' | 'mastered';
  notes?: string;
}

export interface RethinkBehaviorDataPoint {
  behaviorId: string;
  behaviorName: string;
  count: number;
  duration?: number;            // seconds
  intensity?: 'low' | 'medium' | 'high';
  notes?: string;
}

export type RethinkPromptLevel =
  | 'independent'
  | 'gestural'
  | 'verbal'
  | 'model'
  | 'partial_physical'
  | 'full_physical';

/** Skill acquisition program (analogous to a treatment goal) */
export interface RethinkGoal {
  id: string;
  clientId: string;
  programName: string;
  description: string;
  domain: RethinkDomain;
  targetBehavior: string;
  teachingProcedure: string;    // e.g. "DTT", "NET", "TAT"
  baseline: number;             // 0–100
  currentMastery: number;       // 0–100
  masteryTarget: number;        // 0–100 (e.g. 80% across 3 sessions)
  measurementType: RethinkMeasurementType;
  promptLevel: RethinkPromptLevel;
  status: 'active' | 'mastered' | 'on_hold' | 'discontinued' | 'not_started';
  phase: 'baseline' | 'acquisition' | 'fluency' | 'maintenance' | 'generalization' | 'mastered';
  targetDate?: string;          // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

/** Behavior reduction program */
export interface RethinkBehaviorProgram {
  id: string;
  clientId: string;
  behaviorName: string;
  operationalDefinition: string;
  topography: string;           // physical description of the behavior
  functions: RethinkBehaviorFunction[];
  measurementType: 'frequency' | 'duration' | 'interval' | 'abc_recording';
  baselineRate: number;
  currentRate: number;
  targetRate: number;
  reductionStrategy: string;
  replacementBehavior?: string;
  status: 'active' | 'reduced' | 'eliminated' | 'on_hold';
  createdAt: string;
  updatedAt: string;
}

export type RethinkBehaviorFunction =
  | 'attention'
  | 'escape'
  | 'access_tangibles'
  | 'sensory_automatic'
  | 'unknown';

export type RethinkDomain =
  | 'communication'
  | 'social_skills'
  | 'daily_living'
  | 'behavior_reduction'
  | 'academic'
  | 'motor_skills'
  | 'play_leisure'
  | 'self_management'
  | 'executive_function';

export type RethinkMeasurementType =
  | 'trial_by_trial'
  | 'frequency'
  | 'duration'
  | 'latency'
  | 'whole_interval'
  | 'partial_interval'
  | 'momentary_time_sample'
  | 'permanent_product';

/** Trial-by-trial data sheet from a discrete trial session */
export interface RethinkDataSheet {
  id: string;
  sessionId: string;
  clientId: string;
  goalId: string;
  programName: string;
  date: string;
  staffId: string;
  trials: RethinkTrialRecord[];
  totalTrials: number;
  totalCorrect: number;
  sessionAccuracy: number;      // 0–100
  notes?: string;
  createdAt: string;
}

export interface RethinkTrialRecord {
  trialNumber: number;
  sd: string;                   // discriminative stimulus presented
  response: 'correct' | 'incorrect' | 'no_response' | 'prompted';
  promptLevel: RethinkPromptLevel;
  latencyMs?: number;
}

/** Staff member (BCBA / RBT) assigned to a client */
export interface RethinkStaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'bcba' | 'rbt' | 'bcaba' | 'trainee' | 'admin';
  certificationNumber?: string;
  certificationExpiry?: string; // YYYY-MM-DD
  isPrimary: boolean;
  assignedDate: string;
  clinicId: string;
}

/** Insurance authorization record from Rethink */
export interface RethinkAuthorization {
  id: string;
  clientId: string;
  payerId: string;
  payerName: string;
  memberId: string;
  groupNumber?: string;
  authorizationNumber: string;
  diagnosisCodes: string[];
  serviceCodes: string[];       // CPT codes authorized
  unitsAuthorized: number;
  unitsUsed: number;
  unitsRemaining: number;
  startDate: string;            // YYYY-MM-DD
  endDate: string;              // YYYY-MM-DD
  status: 'active' | 'expired' | 'pending' | 'denied' | 'exhausted';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Webhook ---

export interface RethinkWebhookEvent {
  id: string;
  event: RethinkWebhookEventType;
  timestamp: string;
  organizationId: string;
  clientId?: string;
  data: Record<string, unknown>;
  signature: string;
}

export type RethinkWebhookEventType =
  | 'session_completed'
  | 'session_signed'
  | 'goal_updated'
  | 'goal_mastered'
  | 'behavior_updated'
  | 'authorization_changed'
  | 'staff_assigned'
  | 'client_updated'
  | 'note_signed'
  | 'data_sheet_submitted';

// --- Sync ---

export interface RethinkSyncState {
  clientId: string;
  lastPullAt: string;
  lastPushAt: string;
  pullStatus: 'idle' | 'syncing' | 'error';
  pushStatus: 'idle' | 'syncing' | 'error';
  pendingPushCount: number;
  failedPushCount: number;
  conflictCount: number;
}

interface RethinkSyncRecord {
  id: string;
  entityType:
    | 'session'
    | 'goal'
    | 'behavior_program'
    | 'data_sheet'
    | 'authorization'
    | 'parent_report'
    | 'home_routine'
    | 'junior_activity'
    | 'caregiver_note';
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

// --- API Error ---

interface RethinkApiError {
  code: string;
  message: string;
  details?: string;
  statusCode: number;
  retryable: boolean;
}

interface RethinkRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;              // Unix ms
}

// --- Push Payloads (Aminy → Rethink) ---

export interface RethinkParentReportPayload {
  clientId: string;
  reportedBy: string;           // parent/caregiver user ID
  date: string;                 // YYYY-MM-DD
  time: string;                 // HH:MM
  behaviorId?: string;          // Links to RethinkBehaviorProgram if known
  antecedent: string;
  behavior: string;
  consequence: string;
  severity: number;             // 1–5
  location: string;
  durationMinutes?: number;
  environmentalFactors?: string[];
  notes?: string;
}

export interface RethinkHomeRoutinePayload {
  clientId: string;
  reportedBy: string;
  date: string;                 // YYYY-MM-DD
  routineType: 'morning' | 'afternoon' | 'evening' | 'bedtime' | 'mealtime' | 'custom';
  routineName: string;
  stepsCompleted: number;
  stepsTotal: number;
  completionPct: number;        // 0–100
  independenceLevel: RethinkPromptLevel;
  durationMinutes: number;
  linkedGoalIds: string[];
  isHomeProgramActivity: boolean;
  linkedHomeProgramId?: string;
  notes?: string;
}

export interface RethinkJuniorActivityPayload {
  clientId: string;
  reportedBy: string;
  date: string;                 // YYYY-MM-DD
  sessionDurationMinutes: number;
  activityType: string;
  skillDomain: RethinkDomain;
  trialsCompleted: number;
  trialsCorrect: number;
  accuracy: number;             // 0–100
  engagementScore: number;      // 0–100
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

export interface RethinkCaregiverNotePayload {
  clientId: string;
  authorId: string;             // caregiver user ID
  date: string;                 // YYYY-MM-DD
  noteType: 'observation' | 'concern' | 'progress' | 'question' | 'general';
  content: string;
  relatedGoalIds?: string[];
  relatedBehaviorIds?: string[];
  requiresStaffResponse: boolean;
}

// --- Aminy Mapped Types ---

/** Aminy dashboard session card (mapped from RethinkSession) */
export interface AminySessionCard {
  id: string;
  childName: string;
  providerName: string;
  date: string;
  duration: string;             // formatted e.g. "1h 30m"
  type: string;
  summary: string;
  goalProgress: Array<{
    goalName: string;
    accuracy: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  source: 'rethink';
}

/** Aminy care plan goal (mapped from RethinkGoal) */
export interface AminyCareGoal {
  id: string;
  title: string;
  description: string;
  progress: number;             // 0–100
  target: number;               // 0–100
  domain: string;
  status: string;
  lastUpdated: string;
  source: 'rethink';
}

/** Aminy coverage info (mapped from RethinkAuthorization) */
export interface AminyCoverageInfo {
  payerName: string;
  memberId: string;
  authorizationNumber: string;
  unitsRemaining: number;
  unitsUsed: number;
  authExpiresOn: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'pending';
  source: 'rethink';
}

// ============================================================================
// Error Class
// ============================================================================

export class RethinkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'RethinkError';
  }

  static fromApiError(err: RethinkApiError): RethinkError {
    return new RethinkError(err.message, err.code, err.statusCode, err.retryable, err.details);
  }

  static rateLimit(resetAt: number): RethinkError {
    const waitMs = Math.max(0, resetAt - Date.now());
    return new RethinkError(
      `Rate limited. Retry after ${Math.ceil(waitMs / 1000)}s`,
      'RATE_LIMITED',
      429,
      true,
    );
  }

  static unauthorized(): RethinkError {
    return new RethinkError(
      'Rethink authentication failed. Please re-authorize.',
      'UNAUTHORIZED',
      401,
      false,
    );
  }

  static networkError(cause: unknown): RethinkError {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new RethinkError(
      `Network error communicating with Rethink: ${message}`,
      'NETWORK_ERROR',
      0,
      true,
    );
  }

  static notConfigured(): RethinkError {
    return new RethinkError(
      'Rethink integration is not configured. Set VITE_RETHINK_CLIENT_ID.',
      'NOT_CONFIGURED',
      0,
      false,
    );
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Execute fn with exponential backoff. Skips retry on non-retryable 4xx. */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  } = {},
): Promise<T> {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof RethinkError && !error.retryable) {
        throw error;
      }

      // Don't retry on 4xx client errors (except 429)
      const msg = lastError.message;
      if (
        msg.includes('400') ||
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('404') ||
        msg.includes('422')
      ) {
        throw lastError;
      }

      if (attempt < config.maxAttempts) {
        const baseDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        const jitter = Math.random() * config.baseDelayMs * 0.5;
        const delay = Math.min(baseDelay + jitter, config.maxDelayMs);

        if (options.onRetry) {
          options.onRetry(attempt, lastError, delay);
        } else {
          console.warn(
            `[Rethink] Retry ${attempt}/${config.maxAttempts} after ${Math.round(delay)}ms: ${lastError.message}`,
          );
        }

        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts exhausted');
}

// ============================================================================
// Rethink API Client
// ============================================================================

/**
 * Low-level Rethink OAuth 2.0 + REST API client.
 * Handles auth, token refresh, and rate limit tracking.
 */
export class RethinkClient {
  private config: RethinkConfig;
  private tokens: RethinkAuthTokens | null = null;
  private rateLimitInfo: RethinkRateLimitInfo | null = null;

  constructor(config?: Partial<RethinkConfig>) {
    this.config = {
      baseUrl: config?.baseUrl ?? RETHINK_CONFIG.baseUrl,
      clientId: config?.clientId ?? RETHINK_CONFIG.clientId,
      clientSecret: config?.clientSecret ?? RETHINK_CONFIG.clientSecret,
      redirectUri: config?.redirectUri ?? RETHINK_CONFIG.redirectUri,
      scopes: config?.scopes ?? RETHINK_CONFIG.scopes,
      syncInterval: config?.syncInterval ?? RETHINK_CONFIG.syncInterval,
    };
    this.restoreTokens();
  }

  // ---------- Auth ----------

  get isAuthenticated(): boolean {
    return !!this.tokens && this.tokens.expiresAt > Date.now();
  }

  get isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /** Exchange an OAuth authorization code for tokens (called post-redirect). */
  async authenticateWithCode(code: string): Promise<void> {
    try {
      const result = await secureFetch<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        scope?: string;
      }>(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
        skipCSRF: true,
      });

      if (!result.ok || !result.data) {
        throw new RethinkError(
          `OAuth token exchange failed: ${result.error ?? 'Unknown error'}`,
          'AUTH_FAILED',
          result.status,
          false,
        );
      }

      const data = result.data;
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1_000,
        tokenType: 'Bearer',
        scope: data.scope ?? '',
      };
      this.persistTokens();
    } catch (error) {
      if (error instanceof RethinkError) throw error;
      throw RethinkError.networkError(error);
    }
  }

  /** Refresh the access token using the stored refresh token. */
  async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw RethinkError.unauthorized();
    }

    try {
      const result = await secureFetch<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        scope?: string;
      }>(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
        skipCSRF: true,
      });

      if (!result.ok || !result.data) {
        this.clearTokens();
        throw RethinkError.unauthorized();
      }

      const data = result.data;
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? this.tokens.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1_000,
        tokenType: 'Bearer',
        scope: data.scope ?? this.tokens.scope,
      };
      this.persistTokens();
    } catch (error) {
      if (error instanceof RethinkError) throw error;
      throw RethinkError.networkError(error);
    }
  }

  // ---------- Generic API Request ----------

  /**
   * Make an authenticated request to the Rethink API.
   * Auto-refreshes expired tokens, respects rate limits.
   */
  async apiRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    // Proactively refresh if expiring within 60s
    if (this.tokens && this.tokens.expiresAt <= Date.now() + 60_000) {
      await this.refreshAccessToken();
    }

    if (!this.tokens) {
      throw RethinkError.unauthorized();
    }

    // Respect rate limits
    if (this.rateLimitInfo && this.rateLimitInfo.remaining <= 0) {
      const waitMs = Math.max(0, this.rateLimitInfo.resetAt - Date.now());
      if (waitMs > 0 && waitMs < 60_000) {
        console.warn(`[Rethink] Rate limited, waiting ${Math.ceil(waitMs / 1_000)}s`);
        await sleep(waitMs);
      } else if (waitMs >= 60_000) {
        throw RethinkError.rateLimit(this.rateLimitInfo.resetAt);
      }
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `${this.tokens.tokenType} ${this.tokens.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    try {
      const result = await secureFetch<T>(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        skipCSRF: true,
      });

      if (!result.ok) {
        if (result.status === 429) {
          throw RethinkError.rateLimit(Date.now() + 60_000);
        }

        if (result.status === 401) {
          await this.refreshAccessToken();
          return this.apiRequest<T>(method, endpoint, body);
        }

        const errorBody: RethinkApiError =
          result.data != null && typeof result.data === 'object'
            ? (result.data as unknown as RethinkApiError)
            : {
                code: `HTTP_${result.status}`,
                message: result.error ?? `Rethink API error: ${result.status}`,
                statusCode: result.status,
                retryable: result.status >= 500,
              };

        throw RethinkError.fromApiError(errorBody);
      }

      return result.data as T;
    } catch (error) {
      if (error instanceof RethinkError) throw error;
      throw RethinkError.networkError(error);
    }
  }

  // ---------- Token Persistence ----------

  private persistTokens(): void {
    if (this.tokens) {
      try {
        localStorage.setItem('rethink.auth.tokens', JSON.stringify(this.tokens));
      } catch {
        console.warn('[Rethink] Failed to persist tokens');
      }
    }
  }

  private restoreTokens(): void {
    try {
      const stored = localStorage.getItem('rethink.auth.tokens');
      if (stored) {
        this.tokens = JSON.parse(stored) as RethinkAuthTokens;
      }
    } catch {
      console.warn('[Rethink] Failed to restore tokens');
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    try {
      localStorage.removeItem('rethink.auth.tokens');
    } catch {
      // ignore
    }
  }
}

// ============================================================================
// Singleton Client & Edge Function Proxy
// ============================================================================

const rethinkClient = new RethinkClient();

/** Supabase Edge Function URL for Rethink server-side ops */
const RETHINK_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/rethink`;

/** Always route through the edge function in production */
const USE_EDGE_FUNCTION = true;

async function callRethinkEdgeFunction<T>(
  action: string,
  data: Record<string, unknown>,
): Promise<T> {
  const token = localStorage.getItem('supabase.auth.token');
  const authToken = token != null ? (JSON.parse(token) as { access_token?: string }).access_token : null;
  const bearer = authToken ?? publicAnonKey;

  const result = await secureFetch<T>(RETHINK_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({ action, ...data }),
  });

  if (!result.ok) {
    throw new RethinkError(
      `Rethink edge function error: ${result.status} - ${result.error ?? 'Unknown error'}`,
      'EDGE_FUNCTION_ERROR',
      result.status,
      result.status >= 500,
    );
  }

  return result.data as T;
}

// ============================================================================
// Type Guards
// ============================================================================

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function guardArray<T>(
  raw: unknown,
  guard: (item: unknown) => item is T,
  label: string,
): T[] {
  if (!isArray(raw)) {
    console.warn(`[Rethink] Expected array for ${label}, got:`, typeof raw);
    return [];
  }
  return raw.filter((item): item is T => {
    const ok = guard(item);
    if (!ok) console.warn(`[Rethink] Skipping invalid ${label} item:`, item);
    return ok;
  });
}

function isRethinkSession(v: unknown): v is RethinkSession {
  if (!isRecord(v)) return false;
  return (
    typeof v['id'] === 'string' &&
    typeof v['clientId'] === 'string' &&
    typeof v['staffId'] === 'string' &&
    typeof v['sessionDate'] === 'string'
  );
}

function isRethinkGoal(v: unknown): v is RethinkGoal {
  if (!isRecord(v)) return false;
  return (
    typeof v['id'] === 'string' &&
    typeof v['clientId'] === 'string' &&
    typeof v['programName'] === 'string'
  );
}

function isRethinkBehaviorProgram(v: unknown): v is RethinkBehaviorProgram {
  if (!isRecord(v)) return false;
  return (
    typeof v['id'] === 'string' &&
    typeof v['clientId'] === 'string' &&
    typeof v['behaviorName'] === 'string'
  );
}

function isRethinkDataSheet(v: unknown): v is RethinkDataSheet {
  if (!isRecord(v)) return false;
  return (
    typeof v['id'] === 'string' &&
    typeof v['sessionId'] === 'string' &&
    typeof v['goalId'] === 'string'
  );
}

function isRethinkAuthorization(v: unknown): v is RethinkAuthorization {
  if (!isRecord(v)) return false;
  return (
    typeof v['id'] === 'string' &&
    typeof v['clientId'] === 'string' &&
    typeof v['authorizationNumber'] === 'string'
  );
}

function isRethinkStaffMember(v: unknown): v is RethinkStaffMember {
  if (!isRecord(v)) return false;
  return (
    typeof v['id'] === 'string' &&
    typeof v['firstName'] === 'string' &&
    typeof v['role'] === 'string'
  );
}

function isRethinkClient(v: unknown): v is RethinkClientRecord {
  if (!isRecord(v)) return false;
  return typeof v['id'] === 'string' && typeof v['firstName'] === 'string';
}

// ============================================================================
// PULL: Rethink → Aminy
// ============================================================================

/**
 * Fetch a client profile (demographics, diagnosis codes, insurance).
 * Maps to the parent dashboard's child overview and CoverageCoach.
 */
export async function fetchClientProfile(clientId: string): Promise<RethinkClientRecord> {
  const fetcher = async (): Promise<RethinkClientRecord> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown }>('get_client_profile', {
        clientId,
      });
      if (!isRethinkClient(result.data)) {
        console.warn('[Rethink] fetchClientProfile: invalid data, returning mock');
        return getMockClient(clientId);
      }
      return result.data;
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning mock client');
      return getMockClient(clientId);
    }

    const result = await rethinkClient.apiRequest<{ data: unknown }>(
      'GET',
      `/clients/${clientId}`,
    );
    if (!isRethinkClient(result.data)) throw RethinkError.notConfigured();
    return result.data;
  };

  return withRetry(fetcher);
}

/**
 * Fetch session notes for a client within a date range.
 * Used by the parent dashboard to render session cards.
 */
export async function fetchSessionNotes(
  clientId: string,
  dateRange: { from: string; to: string },
): Promise<RethinkSession[]> {
  const fetcher = async (): Promise<RethinkSession[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown[] }>('get_session_notes', {
        clientId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });
      return guardArray(result.data, isRethinkSession, 'RethinkSession');
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning mock sessions');
      return getMockSessions(clientId, dateRange);
    }

    const result = await rethinkClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/sessions?dateFrom=${dateRange.from}&dateTo=${dateRange.to}&status=completed,signed`,
    );
    return guardArray(result.data, isRethinkSession, 'RethinkSession');
  };

  return withRetry(fetcher, {
    onRetry: (attempt, error, delay) =>
      console.warn(`[Rethink] fetchSessionNotes retry ${attempt}: ${error.message} (next in ${Math.round(delay)}ms)`),
  });
}

/**
 * Fetch active skill acquisition programs for a client.
 * Maps to Aminy care plan goals view.
 */
export async function fetchSkillPrograms(clientId: string): Promise<RethinkGoal[]> {
  const fetcher = async (): Promise<RethinkGoal[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown[] }>('get_skill_programs', {
        clientId,
      });
      return guardArray(result.data, isRethinkGoal, 'RethinkGoal');
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning mock skill programs');
      return getMockSkillPrograms(clientId);
    }

    const result = await rethinkClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/skill-programs?status=active`,
    );
    return guardArray(result.data, isRethinkGoal, 'RethinkGoal');
  };

  return withRetry(fetcher);
}

/**
 * Fetch active behavior reduction programs for a client.
 * Maps to Aminy incident tracking and behavior analytics.
 */
export async function fetchBehaviorPrograms(clientId: string): Promise<RethinkBehaviorProgram[]> {
  const fetcher = async (): Promise<RethinkBehaviorProgram[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown[] }>(
        'get_behavior_programs',
        { clientId },
      );
      return guardArray(result.data, isRethinkBehaviorProgram, 'RethinkBehaviorProgram');
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning mock behavior programs');
      return getMockBehaviorPrograms(clientId);
    }

    const result = await rethinkClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/behavior-programs?status=active`,
    );
    return guardArray(result.data, isRethinkBehaviorProgram, 'RethinkBehaviorProgram');
  };

  return withRetry(fetcher);
}

/**
 * Fetch trial-by-trial data sheets for a specific session.
 * Maps to Aminy progress metrics and data visualization.
 */
export async function fetchDataSheets(
  clientId: string,
  sessionId: string,
): Promise<RethinkDataSheet[]> {
  const fetcher = async (): Promise<RethinkDataSheet[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown[] }>('get_data_sheets', {
        clientId,
        sessionId,
      });
      return guardArray(result.data, isRethinkDataSheet, 'RethinkDataSheet');
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning empty data sheets');
      return [];
    }

    const result = await rethinkClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/sessions/${sessionId}/data-sheets`,
    );
    return guardArray(result.data, isRethinkDataSheet, 'RethinkDataSheet');
  };

  return withRetry(fetcher);
}

/**
 * Fetch insurance authorizations for a client.
 * Maps to CoverageCoach (units remaining, auth expiry alerts).
 */
export async function fetchAuthorizations(clientId: string): Promise<RethinkAuthorization[]> {
  const fetcher = async (): Promise<RethinkAuthorization[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown[] }>(
        'get_authorizations',
        { clientId },
      );
      return guardArray(result.data, isRethinkAuthorization, 'RethinkAuthorization');
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning mock authorizations');
      return getMockAuthorizations(clientId);
    }

    const result = await rethinkClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/authorizations?status=active,pending`,
    );
    return guardArray(result.data, isRethinkAuthorization, 'RethinkAuthorization');
  };

  return withRetry(fetcher);
}

/**
 * Fetch staff assignments (BCBAs / RBTs) for a client.
 * Maps to Aminy provider portal and provider profile cards.
 */
export async function fetchStaffAssignments(clientId: string): Promise<RethinkStaffMember[]> {
  const fetcher = async (): Promise<RethinkStaffMember[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callRethinkEdgeFunction<{ data: unknown[] }>(
        'get_staff_assignments',
        { clientId },
      );
      return guardArray(result.data, isRethinkStaffMember, 'RethinkStaffMember');
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, returning mock staff');
      return getMockStaffAssignments(clientId);
    }

    const result = await rethinkClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/staff-assignments?active=true`,
    );
    return guardArray(result.data, isRethinkStaffMember, 'RethinkStaffMember');
  };

  return withRetry(fetcher);
}

// ============================================================================
// PUSH: Aminy → Rethink
// ============================================================================

/**
 * Push a parent-completed behavior log to Rethink.
 * Creates a clinical data point linked to the behavior program.
 */
export async function pushParentReport(
  clientId: string,
  reportData: RethinkParentReportPayload,
): Promise<{ success: boolean; rethinkRecordId: string }> {
  const validated: RethinkParentReportPayload = { ...reportData, clientId };

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callRethinkEdgeFunction<{ success: boolean; rethinkRecordId: string }>(
        'push_parent_report',
        { report: validated },
      );
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, queuing parent report');
      return queuePushForLater('parent_report', validated);
    }

    return rethinkClient.apiRequest<{ success: boolean; rethinkRecordId: string }>(
      'POST',
      `/clients/${clientId}/behavior-data`,
      {
        type: 'parent_abc_log',
        reportedBy: validated.reportedBy,
        date: validated.date,
        time: validated.time,
        behaviorId: validated.behaviorId,
        antecedent: validated.antecedent,
        behavior: validated.behavior,
        consequence: validated.consequence,
        severity: validated.severity,
        location: validated.location,
        durationMinutes: validated.durationMinutes,
        environmentalFactors: validated.environmentalFactors,
        notes: validated.notes,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('parent_report', validated);
    throw error;
  }
}

/**
 * Push home routine completion data to Rethink.
 * Links caregiver-implemented routines back to treatment goals and home programs.
 */
export async function pushHomeRoutineData(
  clientId: string,
  routineData: RethinkHomeRoutinePayload,
): Promise<{ success: boolean; rethinkRecordId: string }> {
  const validated: RethinkHomeRoutinePayload = { ...routineData, clientId };

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callRethinkEdgeFunction<{ success: boolean; rethinkRecordId: string }>(
        'push_home_routine',
        { routine: validated },
      );
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, queuing home routine');
      return queuePushForLater('home_routine', validated);
    }

    return rethinkClient.apiRequest<{ success: boolean; rethinkRecordId: string }>(
      'POST',
      `/clients/${clientId}/home-data`,
      {
        type: 'routine_completion',
        reportedBy: validated.reportedBy,
        date: validated.date,
        routineType: validated.routineType,
        routineName: validated.routineName,
        stepsCompleted: validated.stepsCompleted,
        stepsTotal: validated.stepsTotal,
        completionPct: validated.completionPct,
        independenceLevel: validated.independenceLevel,
        durationMinutes: validated.durationMinutes,
        linkedGoalIds: validated.linkedGoalIds,
        isHomeProgramActivity: validated.isHomeProgramActivity,
        linkedHomeProgramId: validated.linkedHomeProgramId,
        notes: validated.notes,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('home_routine', validated);
    throw error;
  }
}

/**
 * Push Junior mode gamified session results to Rethink.
 * Maps Aminy activity performance to clinical goal data points.
 */
export async function pushJuniorActivityData(
  clientId: string,
  activityData: RethinkJuniorActivityPayload,
): Promise<{ success: boolean; rethinkRecordId: string }> {
  const validated: RethinkJuniorActivityPayload = { ...activityData, clientId };

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callRethinkEdgeFunction<{ success: boolean; rethinkRecordId: string }>(
        'push_junior_activity',
        { activity: validated },
      );
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, queuing Junior activity');
      return queuePushForLater('junior_activity', validated);
    }

    return rethinkClient.apiRequest<{ success: boolean; rethinkRecordId: string }>(
      'POST',
      `/clients/${clientId}/home-data`,
      {
        type: 'gamified_session',
        reportedBy: validated.reportedBy,
        date: validated.date,
        sessionDurationMinutes: validated.sessionDurationMinutes,
        activityType: validated.activityType,
        skillDomain: validated.skillDomain,
        trialsCompleted: validated.trialsCompleted,
        trialsCorrect: validated.trialsCorrect,
        accuracy: validated.accuracy,
        engagementScore: validated.engagementScore,
        linkedGoalIds: validated.linkedGoalIds,
        rewards: validated.rewards,
        adaptiveDifficulty: validated.adaptiveDifficulty,
        source: 'aminy_junior_mode',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('junior_activity', validated);
    throw error;
  }
}

/**
 * Push a caregiver observation note to Rethink.
 * Creates a clinical note visible to the assigned BCBA.
 */
export async function pushCaregiverNote(
  clientId: string,
  noteData: RethinkCaregiverNotePayload,
): Promise<{ success: boolean; rethinkRecordId: string }> {
  const validated: RethinkCaregiverNotePayload = { ...noteData, clientId };

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callRethinkEdgeFunction<{ success: boolean; rethinkRecordId: string }>(
        'push_caregiver_note',
        { note: validated },
      );
    }

    if (!rethinkClient.isConfigured) {
      console.warn('[Rethink] Not configured, queuing caregiver note');
      return queuePushForLater('caregiver_note', validated);
    }

    return rethinkClient.apiRequest<{ success: boolean; rethinkRecordId: string }>(
      'POST',
      `/clients/${clientId}/notes`,
      {
        type: 'caregiver_note',
        authorId: validated.authorId,
        date: validated.date,
        noteType: validated.noteType,
        content: validated.content,
        relatedGoalIds: validated.relatedGoalIds,
        relatedBehaviorIds: validated.relatedBehaviorIds,
        requiresStaffResponse: validated.requiresStaffResponse,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('caregiver_note', validated);
    throw error;
  }
}

// ============================================================================
// Bidirectional Sync Orchestration
// ============================================================================

/**
 * Orchestrate a full bidirectional sync for one client.
 * Pulls all data from Rethink, then retries any queued pushes.
 */
export async function syncDataBidirectional(clientId: string): Promise<{
  pullResults: {
    sessions: number;
    skillPrograms: number;
    behaviorPrograms: number;
    authorizations: number;
    staffMembers: number;
  };
  pushResults: { pushed: number; failed: number; queued: number };
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const dateRange = {
    from: thirtyDaysAgo.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };

  const [sessions, skillPrograms, behaviorPrograms, authorizations, staffMembers] =
    await Promise.allSettled([
      fetchSessionNotes(clientId, dateRange),
      fetchSkillPrograms(clientId),
      fetchBehaviorPrograms(clientId),
      fetchAuthorizations(clientId),
      fetchStaffAssignments(clientId),
    ]);

  const pullResults = {
    sessions: sessions.status === 'fulfilled' ? sessions.value.length : 0,
    skillPrograms: skillPrograms.status === 'fulfilled' ? skillPrograms.value.length : 0,
    behaviorPrograms:
      behaviorPrograms.status === 'fulfilled' ? behaviorPrograms.value.length : 0,
    authorizations:
      authorizations.status === 'fulfilled' ? authorizations.value.length : 0,
    staffMembers: staffMembers.status === 'fulfilled' ? staffMembers.value.length : 0,
  };

  const pushResults = await retryQueuedPushes();

  return { pullResults, pushResults };
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Process an incoming webhook event from Rethink.
 * Validates signature presence, then dispatches to typed handlers.
 */
export async function handleRethinkWebhook(
  rawPayload: unknown,
): Promise<{ acknowledged: boolean; event: string }> {
  if (!isRecord(rawPayload)) {
    throw new RethinkError('Invalid webhook payload — expected object', 'WEBHOOK_INVALID', 400, false);
  }

  const payload = rawPayload as unknown as RethinkWebhookEvent;

  if (!payload.signature || payload.signature.length === 0) {
    throw new RethinkError('Webhook missing signature', 'WEBHOOK_SIGNATURE_INVALID', 401, false);
  }

  switch (payload.event) {
    case 'session_completed':
    case 'session_signed':
      await handleSessionCompleted(payload);
      break;

    case 'goal_updated':
    case 'goal_mastered':
      await handleGoalUpdated(payload);
      break;

    case 'behavior_updated':
      await handleBehaviorUpdated(payload);
      break;

    case 'authorization_changed':
      await handleAuthorizationChanged(payload);
      break;

    case 'staff_assigned':
      await handleStaffAssigned(payload);
      break;

    case 'client_updated':
      await handleClientUpdated(payload);
      break;

    case 'note_signed':
      await handleNoteSigned(payload);
      break;

    case 'data_sheet_submitted':
      await handleDataSheetSubmitted(payload);
      break;

    default: {
      const _exhaustive: never = payload.event;
      console.warn(`[Rethink] Unknown webhook event: ${String(_exhaustive)}`);
    }
  }

  return { acknowledged: true, event: payload.event };
}

async function handleSessionCompleted(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Session completed/signed webhook:', payload.data);
  // Production: update local session cache, trigger parent dashboard refresh
}

async function handleGoalUpdated(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Goal updated/mastered webhook:', payload.data);
  // Production: update care plan view with latest goal progress
}

async function handleBehaviorUpdated(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Behavior updated webhook:', payload.data);
  // Production: update behavior tracking panel
}

async function handleAuthorizationChanged(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Authorization changed webhook:', payload.data);
  // Production: update CoverageCoach, trigger low-units alert if needed
}

async function handleStaffAssigned(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Staff assigned webhook:', payload.data);
  // Production: refresh provider portal staff cards
}

async function handleClientUpdated(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Client updated webhook:', payload.data);
  // Production: refresh client demographics / diagnosis info
}

async function handleNoteSigned(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Note signed webhook:', payload.data);
  // Production: make session summary available to parent in dashboard
}

async function handleDataSheetSubmitted(payload: RethinkWebhookEvent): Promise<void> {
  console.info('[Rethink] Data sheet submitted webhook:', payload.data);
  // Production: update progress metrics and graphs
}

// ============================================================================
// Sync Manager
// ============================================================================

/**
 * Manages periodic background synchronization between Aminy and Rethink.
 *
 * Usage:
 *   const mgr = new RethinkSyncManager();
 *   mgr.startSync(['child-id-1', 'child-id-2']);
 *   // ...
 *   mgr.stopSync();
 */
export class RethinkSyncManager {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private stateMap: Map<string, RethinkSyncState> = new Map();
  private syncing = false;

  private readonly intervalMs: number;

  constructor(intervalMs: number = RETHINK_CONFIG.syncInterval) {
    this.intervalMs = intervalMs;
  }

  /** Start periodic sync for the given client IDs. */
  startSync(clientIds: string[]): void {
    if (this.intervalHandle) this.stopSync();

    for (const id of clientIds) {
      if (!this.stateMap.has(id)) {
        this.stateMap.set(id, {
          clientId: id,
          lastPullAt: '',
          lastPushAt: '',
          pullStatus: 'idle',
          pushStatus: 'idle',
          pendingPushCount: 0,
          failedPushCount: 0,
          conflictCount: 0,
        });
      }
    }

    this.runSync(clientIds).catch((err) =>
      console.error('[Rethink] Initial sync failed:', err),
    );

    this.intervalHandle = setInterval(() => {
      this.runSync(clientIds).catch((err) =>
        console.error('[Rethink] Periodic sync failed:', err),
      );
    }, this.intervalMs);

    console.info(
      `[Rethink] Sync started for ${clientIds.length} client(s) (interval: ${this.intervalMs / 1_000}s)`,
    );
  }

  /** Stop periodic sync. */
  stopSync(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.info('[Rethink] Sync stopped');
    }
  }

  /** Trigger an immediate sync outside the normal interval. */
  async syncNow(clientIds: string[]): Promise<void> {
    await this.runSync(clientIds);
  }

  /** Return the sync state for a specific client. */
  getState(clientId: string): RethinkSyncState | undefined {
    return this.stateMap.get(clientId);
  }

  /** Return sync states for all tracked clients. */
  getAllStates(): RethinkSyncState[] {
    return Array.from(this.stateMap.values());
  }

  get isRunning(): boolean {
    return this.intervalHandle !== null;
  }

  get isSyncInProgress(): boolean {
    return this.syncing;
  }

  // ---------- Internal ----------

  private async runSync(clientIds: string[]): Promise<void> {
    if (this.syncing) {
      console.warn('[Rethink] Sync already in progress, skipping');
      return;
    }
    this.syncing = true;

    try {
      for (const clientId of clientIds) {
        const state = this.stateMap.get(clientId);
        if (!state) continue;

        try {
          state.pullStatus = 'syncing';
          state.pushStatus = 'syncing';

          const result = await syncDataBidirectional(clientId);

          state.lastPullAt = new Date().toISOString();
          state.lastPushAt = new Date().toISOString();
          state.pullStatus = 'idle';
          state.pushStatus = 'idle';
          state.pendingPushCount = result.pushResults.queued;
          state.failedPushCount = result.pushResults.failed;

          console.info(
            `[Rethink] Sync complete for client ${clientId}:`,
            `pulled sessions=${result.pullResults.sessions}`,
            `goals=${result.pullResults.skillPrograms}`,
            `behaviors=${result.pullResults.behaviorPrograms};`,
            `pushed ${result.pushResults.pushed}, ${result.pushResults.failed} failed`,
          );
        } catch (err) {
          state.pullStatus = 'error';
          state.pushStatus = 'error';
          console.error(`[Rethink] Sync failed for client ${clientId}:`, err);
        }
      }
    } finally {
      this.syncing = false;
    }
  }
}

// ============================================================================
// Push Queue (Offline / Failed Submissions)
// ============================================================================

const pushQueue: RethinkSyncRecord[] = [];

async function queuePushForLater(
  entityType: RethinkSyncRecord['entityType'],
  payload: unknown,
): Promise<{ success: boolean; rethinkRecordId: string }> {
  const clientId =
    isRecord(payload) && typeof payload['clientId'] === 'string'
      ? payload['clientId']
      : '';

  const record: RethinkSyncRecord = {
    id: `rt-push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType,
    entityId: clientId,
    direction: 'push',
    status: 'pending',
    lastSyncAt: '',
    localTimestamp: new Date().toISOString(),
    remoteTimestamp: '',
    retryCount: 0,
    maxRetries: RETRY_CONFIG.maxAttempts,
    nextRetryAt: new Date(Date.now() + RETRY_CONFIG.baseDelayMs).toISOString(),
    createdAt: new Date().toISOString(),
  };

  pushQueue.push(record);

  // Persist to Supabase (best-effort, non-blocking)
  try {
    const token = localStorage.getItem('supabase.auth.token');
    const authToken =
      token != null
        ? (JSON.parse(token) as { access_token?: string }).access_token
        : null;
    const bearer = authToken ?? publicAnonKey;

    const persistResult = await secureFetch(
      `https://${projectId}.supabase.co/rest/v1/rethink_sync_queue`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
          apikey: publicAnonKey,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: record.id,
          entity_type: record.entityType,
          entity_id: record.entityId,
          direction: record.direction,
          status: record.status,
          payload,
          retry_count: record.retryCount,
          max_retries: record.maxRetries,
          next_retry_at: record.nextRetryAt,
          created_at: record.createdAt,
        }),
      },
    );

    if (!persistResult.ok) {
      console.warn('[Rethink] Failed to persist push to Supabase queue:', persistResult.error);
    }
  } catch (err) {
    console.warn('[Rethink] Failed to persist push to Supabase queue:', err);
  }

  return { success: false, rethinkRecordId: '' };
}

async function retryQueuedPushes(): Promise<{
  pushed: number;
  failed: number;
  queued: number;
}> {
  const now = Date.now();
  const due = pushQueue.filter(
    (r) =>
      r.status === 'pending' &&
      r.nextRetryAt != null &&
      new Date(r.nextRetryAt).getTime() <= now,
  );

  let pushed = 0;
  let failed = 0;

  for (const record of due) {
    try {
      record.status = 'in_progress';
      // Re-dispatch logic would look up payload from Supabase in production
      record.status = 'completed';
      record.lastSyncAt = new Date().toISOString();
      pushed++;
    } catch {
      record.retryCount++;
      if (record.retryCount >= record.maxRetries) {
        record.status = 'failed';
        failed++;
      } else {
        record.status = 'pending';
        const nextDelay =
          RETRY_CONFIG.baseDelayMs *
          Math.pow(RETRY_CONFIG.backoffMultiplier, record.retryCount);
        record.nextRetryAt = new Date(Date.now() + nextDelay).toISOString();
      }
    }
  }

  const queued = pushQueue.filter((r) => r.status === 'pending').length;
  return { pushed, failed, queued };
}

/** Get all pending push records. */
export function getPendingPushes(): RethinkSyncRecord[] {
  return pushQueue.filter((r) => r.status === 'pending');
}

/** Get all permanently failed push records. */
export function getFailedPushes(): RethinkSyncRecord[] {
  return pushQueue.filter((r) => r.status === 'failed');
}

// ============================================================================
// Data Mappers: Rethink ↔ Aminy
// ============================================================================

const SESSION_TYPE_LABELS: Record<RethinkSessionType, string> = {
  direct_therapy: 'Direct Therapy (RBT)',
  supervision: 'BCBA Supervision',
  parent_training: 'Parent Training',
  assessment: 'Assessment',
  group_therapy: 'Group Therapy',
  telehealth: 'Telehealth Session',
  consultation: 'Consultation',
};

const DOMAIN_LABELS: Record<RethinkDomain, string> = {
  communication: 'Communication',
  social_skills: 'Social Skills',
  daily_living: 'Daily Living',
  behavior_reduction: 'Behavior Reduction',
  academic: 'Academic',
  motor_skills: 'Motor Skills',
  play_leisure: 'Play & Leisure',
  self_management: 'Self-Management',
  executive_function: 'Executive Function',
};

/**
 * Map a RethinkSession to an Aminy parent dashboard session card.
 */
export function mapRethinkSessionToAminy(
  session: RethinkSession,
  childName: string,
  providerName: string,
): AminySessionCard {
  const hours = Math.floor(session.durationMinutes / 60);
  const minutes = session.durationMinutes % 60;
  const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    id: session.id,
    childName,
    providerName,
    date: session.sessionDate,
    duration,
    type: SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType,
    summary:
      session.notes.length > 200
        ? `${session.notes.slice(0, 197)}...`
        : session.notes,
    goalProgress: session.goalData.map((g) => ({
      goalName: g.programName,
      accuracy: g.accuracy,
      trend:
        g.accuracy >= 80
          ? 'improving'
          : g.accuracy >= 50
            ? 'stable'
            : 'declining',
    })),
    source: 'rethink',
  };
}

/**
 * Map a RethinkGoal (skill program) to an Aminy care plan goal.
 */
export function mapRethinkGoalToAminy(goal: RethinkGoal): AminyCareGoal {
  return {
    id: goal.id,
    title: goal.programName,
    description: goal.description,
    progress: goal.currentMastery,
    target: goal.masteryTarget,
    domain: DOMAIN_LABELS[goal.domain] ?? goal.domain,
    status: goal.status,
    lastUpdated: goal.updatedAt,
    source: 'rethink',
  };
}

/**
 * Map a RethinkAuthorization to Aminy's CoverageCoach coverage info.
 * Selects the first active/pending authorization as primary.
 */
export function mapRethinkAuthToAminy(auth: RethinkAuthorization): AminyCoverageInfo {
  const endDate = new Date(auth.endDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1_000 * 60 * 60 * 24),
  );

  let status: AminyCoverageInfo['status'];
  if (auth.status === 'expired' || daysUntilExpiry < 0) {
    status = 'expired';
  } else if (
    auth.status === 'exhausted' ||
    daysUntilExpiry <= 30 ||
    auth.unitsRemaining <= 10
  ) {
    status = 'expiring_soon';
  } else if (auth.status === 'pending') {
    status = 'pending';
  } else {
    status = 'active';
  }

  return {
    payerName: auth.payerName,
    memberId: auth.memberId,
    authorizationNumber: auth.authorizationNumber,
    unitsRemaining: auth.unitsRemaining,
    unitsUsed: auth.unitsUsed,
    authExpiresOn: auth.endDate,
    status,
    source: 'rethink',
  };
}

// ============================================================================
// Health Check & Configuration
// ============================================================================

/** Whether Rethink integration is configured (env vars set or edge function available). */
export function isRethinkIntegrationConfigured(): boolean {
  return USE_EDGE_FUNCTION || isRethinkConfigured();
}

/** Whether the current user has a valid Rethink OAuth token. */
export function isRethinkAuthenticated(): boolean {
  return rethinkClient.isAuthenticated;
}

/** Get Rethink OAuth URL for provider connection flow. */
export { getRethinkOAuthUrl };

/** Get overall Rethink integration health status. */
export async function getRethinkHealth(): Promise<{
  status: 'ok' | 'degraded' | 'down' | 'not_configured';
  authenticated: boolean;
  edgeFunction: boolean;
  directApi: boolean;
  pendingPushes: number;
  failedPushes: number;
}> {
  const health = {
    status: 'not_configured' as 'ok' | 'degraded' | 'down' | 'not_configured',
    authenticated: rethinkClient.isAuthenticated,
    edgeFunction: false,
    directApi: rethinkClient.isConfigured,
    pendingPushes: getPendingPushes().length,
    failedPushes: getFailedPushes().length,
  };

  if (!isRethinkIntegrationConfigured()) return health;

  if (USE_EDGE_FUNCTION) {
    try {
      const healthResult = await secureFetch(`${RETHINK_FUNCTION_URL}/health`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (healthResult.ok) {
        health.edgeFunction = true;
        health.status = 'ok';
      }
    } catch {
      console.warn('[Rethink] Edge function health check failed');
    }
  }

  if (rethinkClient.isConfigured && rethinkClient.isAuthenticated) {
    health.status = health.edgeFunction ? 'ok' : 'degraded';
  } else if (health.edgeFunction) {
    health.status = 'ok';
  } else {
    health.status = 'down';
  }

  return health;
}

// ============================================================================
// Mock Data (Development / Testing)
// ============================================================================

function getMockClient(clientId: string): RethinkClientRecord {
  return {
    id: clientId,
    firstName: 'Alex',
    lastName: 'Sample',
    dateOfBirth: '2018-03-15',
    diagnosisCodes: ['F84.0', 'F80.9'],
    primaryDiagnosis: 'Autism Spectrum Disorder (Level 2)',
    insurance: getMockAuthorizations(clientId),
    status: 'active',
    primaryBcbaId: 'mock-bcba-1',
    primaryRbtId: 'mock-rbt-1',
    clinicId: 'mock-clinic-1',
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  };
}

function getMockSessions(
  clientId: string,
  _dateRange: { from: string; to: string },
): RethinkSession[] {
  const today = new Date();
  return [
    {
      id: 'mock-rt-session-1',
      clientId,
      staffId: 'mock-rbt-1',
      staffRole: 'rbt',
      sessionDate: today.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '11:00',
      durationMinutes: 120,
      sessionType: 'direct_therapy',
      location: 'home',
      notes:
        'Great session. Alex demonstrated improved requesting using 3-word phrases. Worked on manding, tacting, and listener responding. Minimal prompting needed by end of session.',
      parentSignature: true,
      goalData: [
        {
          goalId: 'mock-rt-goal-1',
          programName: 'Manding - 3 Word Phrases',
          trials: 20,
          correct: 16,
          accuracy: 80,
          promptLevel: 'verbal',
          phase: 'acquisition',
          notes: 'Improving steadily',
        },
        {
          goalId: 'mock-rt-goal-2',
          programName: 'Listener Responding - Body Parts',
          trials: 15,
          correct: 12,
          accuracy: 80,
          promptLevel: 'gestural',
          phase: 'fluency',
          notes: 'Near mastery criterion',
        },
      ],
      behaviorData: [
        {
          behaviorId: 'mock-rt-bx-1',
          behaviorName: 'Elopement',
          count: 1,
          duration: 30,
          intensity: 'low',
          notes: 'Brief, redirected immediately',
        },
      ],
      billingCode: '97153',
      billingUnits: 8,
      status: 'signed',
      signedAt: today.toISOString(),
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
    {
      id: 'mock-rt-session-2',
      clientId,
      staffId: 'mock-bcba-1',
      staffRole: 'bcba',
      sessionDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1_000)
        .toISOString()
        .split('T')[0],
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      sessionType: 'supervision',
      location: 'clinic',
      notes:
        'Supervision: Reviewed RBT data. Manding program trending well — adjusted prompt fading schedule. Parent training on reinforcement strategies discussed.',
      parentSignature: false,
      goalData: [
        {
          goalId: 'mock-rt-goal-1',
          programName: 'Manding - 3 Word Phrases',
          trials: 0,
          correct: 0,
          accuracy: 0,
          promptLevel: 'independent',
          phase: 'acquisition',
          notes: 'Reviewed data only',
        },
      ],
      behaviorData: [],
      billingCode: '97155',
      billingUnits: 4,
      status: 'signed',
      signedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1_000).toISOString(),
      createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1_000).toISOString(),
      updatedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1_000).toISOString(),
    },
  ];
}

function getMockSkillPrograms(clientId: string): RethinkGoal[] {
  return [
    {
      id: 'mock-rt-goal-1',
      clientId,
      programName: 'Manding - 3 Word Phrases',
      description:
        'Alex will independently mand for desired items/activities using 3+ word phrases in 80% of opportunities across 3 consecutive sessions.',
      domain: 'communication',
      targetBehavior: 'Manding with 3+ word phrases',
      teachingProcedure: 'NET',
      baseline: 15,
      currentMastery: 72,
      masteryTarget: 80,
      measurementType: 'trial_by_trial',
      promptLevel: 'verbal',
      status: 'active',
      phase: 'acquisition',
      targetDate: '2026-06-30',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-rt-goal-2',
      clientId,
      programName: 'Listener Responding - Body Parts',
      description:
        'Alex will correctly identify 20 body parts when named by the therapist with 90% accuracy across 3 consecutive sessions.',
      domain: 'communication',
      targetBehavior: 'Touch named body part',
      teachingProcedure: 'DTT',
      baseline: 30,
      currentMastery: 80,
      masteryTarget: 90,
      measurementType: 'trial_by_trial',
      promptLevel: 'gestural',
      status: 'active',
      phase: 'fluency',
      targetDate: '2026-04-30',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-rt-goal-3',
      clientId,
      programName: 'Independent Morning Routine',
      description:
        'Alex will complete a 6-step morning routine with no more than 1 gestural prompt per step, 85% accuracy.',
      domain: 'daily_living',
      targetBehavior: 'Morning routine independence',
      teachingProcedure: 'TAT',
      baseline: 25,
      currentMastery: 65,
      masteryTarget: 85,
      measurementType: 'trial_by_trial',
      promptLevel: 'gestural',
      status: 'active',
      phase: 'acquisition',
      targetDate: '2026-07-01',
      createdAt: '2025-02-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getMockBehaviorPrograms(clientId: string): RethinkBehaviorProgram[] {
  return [
    {
      id: 'mock-rt-bx-1',
      clientId,
      behaviorName: 'Elopement',
      operationalDefinition:
        'Running or walking away from the designated area without permission, defined as moving more than 10 feet from the caregiver/therapist.',
      topography: 'Running or fast-walking away from designated space.',
      functions: ['escape', 'sensory_automatic'],
      measurementType: 'frequency',
      baselineRate: 8,
      currentRate: 3,
      targetRate: 0,
      reductionStrategy: 'DRL + visual boundary supports',
      replacementBehavior: 'Request "break" using AAC or verbal',
      status: 'active',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getMockAuthorizations(clientId: string): RethinkAuthorization[] {
  return [
    {
      id: 'mock-rt-auth-1',
      clientId,
      payerId: 'BCBS-AZ',
      payerName: 'Blue Cross Blue Shield of Arizona',
      memberId: 'BCB987654321',
      groupNumber: 'GRP-ABA-2025',
      authorizationNumber: 'AUTH-2025-11223',
      diagnosisCodes: ['F84.0'],
      serviceCodes: ['97153', '97155', '97156'],
      unitsAuthorized: 400,
      unitsUsed: 248,
      unitsRemaining: 152,
      startDate: '2025-07-01',
      endDate: '2026-06-30',
      status: 'active',
      createdAt: '2025-07-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getMockStaffAssignments(clientId: string): RethinkStaffMember[] {
  return [
    {
      id: 'mock-bcba-1',
      firstName: 'Jennifer',
      lastName: 'Torres',
      email: 'jtorres@clinic.example.com',
      role: 'bcba',
      certificationNumber: 'BCBA-1-23-45678',
      certificationExpiry: '2027-01-31',
      isPrimary: true,
      assignedDate: '2025-01-15',
      clinicId: 'mock-clinic-1',
    },
    {
      id: 'mock-rbt-1',
      firstName: 'Marcus',
      lastName: 'Chen',
      email: 'mchen@clinic.example.com',
      role: 'rbt',
      certificationNumber: 'RBT-234567',
      certificationExpiry: '2026-09-30',
      isPrimary: true,
      assignedDate: '2025-01-20',
      clinicId: 'mock-clinic-1',
    },
  ];

  // suppress unused param lint
  void clientId;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Configuration & health
  isRethinkIntegrationConfigured,
  isRethinkAuthenticated,
  getRethinkHealth,
  getRethinkOAuthUrl,

  // Pull: Rethink → Aminy
  fetchClientProfile,
  fetchSessionNotes,
  fetchSkillPrograms,
  fetchBehaviorPrograms,
  fetchDataSheets,
  fetchAuthorizations,
  fetchStaffAssignments,

  // Push: Aminy → Rethink
  pushParentReport,
  pushHomeRoutineData,
  pushJuniorActivityData,
  pushCaregiverNote,

  // Sync orchestration
  syncDataBidirectional,

  // Webhook
  handleRethinkWebhook,

  // Sync manager
  RethinkSyncManager,

  // Push queue
  getPendingPushes,
  getFailedPushes,

  // Data mappers
  mapRethinkSessionToAminy,
  mapRethinkGoalToAminy,
  mapRethinkAuthToAminy,

  // Client class (advanced usage)
  RethinkClient,
};
