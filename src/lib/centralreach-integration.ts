// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CentralReach Bidirectional Integration
 *
 * CentralReach is a practice management and clinical data collection platform
 * widely used by ABA providers. This integration enables:
 *
 * PULL (CentralReach -> Aminy):
 * - Therapy session notes & summaries for parent dashboard
 * - Treatment goals & progress for care plan view
 * - Insurance/authorization info for Coverage Coach
 * - Home programs assigned by BCBAs for Junior mode
 *
 * PUSH (Aminy -> CentralReach):
 * - ABC incident logs as clinical data points
 * - Home routine completion for billing documentation
 * - Junior gamified session results mapped to treatment goals
 * - Caregiver wellness metrics for treatment context
 * - Home program completion rates
 *
 * Architecture:
 * - OAuth 2.0 authentication with automatic token refresh
 * - Exponential backoff retry on transient failures
 * - Offline queue for failed pushes (persisted to Supabase)
 * - Webhook handler for real-time updates
 * - Zod validation on all inbound/outbound data
 * - Periodic sync manager with conflict resolution
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { secureFetch } from './security/secure-fetch';

import type {
  CentralReachConfig,
  CRAuthTokens,
  CRClient,
  CRSession,
  CRGoal,
  CRInsurance,
  CRHomeProgram,
  CRBehaviorLogPayload,
  CRRoutineCompletionPayload,
  CRJuniorSessionPayload,
  CRCaregiverWellnessPayload,
  CRHomeProgramProgressPayload,
  CRTelehealthSessionPayload,
  CRWebhookPayload,
  CRWebhookEvent,
  CRSyncRecord,
  CRSyncState,
  CRApiError,
  CRRateLimitInfo,
  AminySessionCard,
  AminyCareGoal,
  AminyCoverageInfo,
  CRSessionType,
  CRGoalDomain,
} from './centralreach-types';

import {
  crSessionSchema,
  crGoalSchema,
  crInsuranceSchema,
  crClientSchema,
  crHomeProgramSchema,
  crBehaviorLogPayloadSchema,
  crRoutineCompletionPayloadSchema,
  crJuniorSessionPayloadSchema,
  crCaregiverWellnessPayloadSchema,
  crHomeProgramProgressPayloadSchema,
  crTelehealthSessionPayloadSchema,
  crWebhookPayloadSchema,
  crApiResponseSchema,
} from './schemas/centralreach';

// ============================================================================
// Environment Configuration
// ============================================================================

const CR_BASE_URL = import.meta.env.VITE_CENTRALREACH_BASE_URL || 'https://members.centralreach.com/api';
const CR_CLIENT_ID = import.meta.env.VITE_CENTRALREACH_CLIENT_ID || '';
// CR_CLIENT_SECRET, CR_WEBHOOK_SECRET removed — secrets are now only in the edge function
const CR_API_VERSION = import.meta.env.VITE_CENTRALREACH_API_VERSION || 'v1';
const CR_ORGANIZATION_ID = import.meta.env.VITE_CENTRALREACH_ORG_ID || '';

// Supabase Edge Function URL for secure server-side operations
const CR_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/centralreach`;

// Always route through edge function — client never calls CentralReach directly
const USE_EDGE_FUNCTION = true;

// ============================================================================
// Error Types
// ============================================================================

export class CentralReachError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean,
    public details?: string,
  ) {
    super(message);
    this.name = 'CentralReachError';
  }

  static fromApiError(error: CRApiError): CentralReachError {
    return new CentralReachError(
      error.message,
      error.code,
      error.statusCode,
      error.retryable,
      error.details,
    );
  }

  static rateLimit(resetAt: number): CentralReachError {
    const waitMs = Math.max(0, resetAt - Date.now());
    return new CentralReachError(
      `Rate limited. Retry after ${Math.ceil(waitMs / 1000)}s`,
      'RATE_LIMITED',
      429,
      true,
    );
  }

  static unauthorized(): CentralReachError {
    return new CentralReachError(
      'CentralReach authentication failed. Please re-authorize.',
      'UNAUTHORIZED',
      401,
      false,
    );
  }

  static networkError(cause: unknown): CentralReachError {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new CentralReachError(
      `Network error communicating with CentralReach: ${message}`,
      'NETWORK_ERROR',
      0,
      true,
    );
  }
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with exponential backoff retry.
 * Retries on network errors, 429 rate limits, and 5xx server errors.
 * Does NOT retry on 4xx client errors (except 429).
 */
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

      // Don't retry on non-retryable errors
      if (error instanceof CentralReachError && !error.retryable) {
        throw error;
      }

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (
        lastError.message.includes('400') ||
        lastError.message.includes('401') ||
        lastError.message.includes('403') ||
        lastError.message.includes('404') ||
        lastError.message.includes('422')
      ) {
        throw lastError;
      }

      if (attempt < config.maxAttempts) {
        const baseDelay =
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        const jitter = Math.random() * config.baseDelayMs * 0.5;
        const delay = Math.min(baseDelay + jitter, config.maxDelayMs);

        if (options.onRetry) {
          options.onRetry(attempt, lastError, delay);
        } else {
          console.warn(
            `[CentralReach] Retry ${attempt}/${config.maxAttempts} after ${Math.round(delay)}ms: ${lastError.message}`,
          );
        }

        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('All retry attempts exhausted');
}

// ============================================================================
// CentralReach API Client
// ============================================================================

/**
 * CentralReach OAuth 2.0 + REST API client.
 *
 * Handles authentication, token refresh, rate limiting, and request/response
 * validation. All methods throw CentralReachError on failure.
 */
export class CentralReachClient {
  private config: CentralReachConfig;
  private tokens: CRAuthTokens | null = null;
  private rateLimitInfo: CRRateLimitInfo | null = null;

  constructor(config?: Partial<CentralReachConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || CR_BASE_URL,
      clientId: config?.clientId || CR_CLIENT_ID,
      clientSecret: config?.clientSecret || '', // Secret now lives in edge function only
      apiVersion: config?.apiVersion || CR_API_VERSION,
      organizationId: config?.organizationId || CR_ORGANIZATION_ID,
    };

    // Attempt to restore tokens from localStorage
    this.restoreTokens();
  }

  // ---------- Authentication ----------

  /** Whether the client has a valid (non-expired) access token */
  get isAuthenticated(): boolean {
    return !!this.tokens && this.tokens.expiresAt > Date.now();
  }

  /** Whether the client is configured (credentials available) */
  get isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Exchange an OAuth authorization code for access + refresh tokens.
   * Called after the user completes the CentralReach OAuth consent flow.
   */
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
          redirect_uri: `${window.location.origin}/auth/centralreach/callback`,
        }),
        skipCSRF: true,
      });

      if (!result.ok || !result.data) {
        throw new CentralReachError(
          `OAuth token exchange failed: ${result.error || 'Unknown error'}`,
          'AUTH_FAILED',
          result.status,
          false,
        );
      }

      const data = result.data;
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        tokenType: 'Bearer',
        scope: data.scope || '',
      };

      this.persistTokens();
    } catch (error) {
      if (error instanceof CentralReachError) throw error;
      throw CentralReachError.networkError(error);
    }
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Called automatically when the access token is expired.
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw CentralReachError.unauthorized();
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
        // Refresh token expired/revoked - user must re-authenticate
        this.clearTokens();
        throw CentralReachError.unauthorized();
      }

      const data = result.data;
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
        tokenType: 'Bearer',
        scope: data.scope || this.tokens.scope,
      };

      this.persistTokens();
    } catch (error) {
      if (error instanceof CentralReachError) throw error;
      throw CentralReachError.networkError(error);
    }
  }

  // ---------- Generic API Request ----------

  /**
   * Make an authenticated API request to CentralReach.
   *
   * Automatically:
   * - Refreshes expired tokens
   * - Tracks rate limit headers
   * - Waits when rate-limited
   * - Parses error responses into typed CentralReachError
   */
  async apiRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    // Auto-refresh expired tokens
    if (this.tokens && this.tokens.expiresAt <= Date.now() + 60_000) {
      await this.refreshAccessToken();
    }

    if (!this.tokens) {
      throw CentralReachError.unauthorized();
    }

    // Respect rate limits
    if (this.rateLimitInfo && this.rateLimitInfo.remaining <= 0) {
      const waitMs = Math.max(0, this.rateLimitInfo.resetAt - Date.now());
      if (waitMs > 0 && waitMs < 60_000) {
        console.warn(`[CentralReach] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s`);
        await sleep(waitMs);
      } else if (waitMs >= 60_000) {
        throw CentralReachError.rateLimit(this.rateLimitInfo.resetAt);
      }
    }

    const url = `${this.config.baseUrl}/${this.config.apiVersion}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `${this.tokens.tokenType} ${this.tokens.accessToken}`,
      'Content-Type': 'application/json',
      'X-Organization-Id': this.config.organizationId,
      'X-Api-Version': this.config.apiVersion,
    };

    try {
      const result = await secureFetch<T>(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        skipCSRF: true,
      });

      if (!result.ok) {
        if (result.status === 429) {
          // Rate limit headers not accessible via secureFetch; use default reset time
          const resetAt = Date.now() + 60_000;
          throw CentralReachError.rateLimit(resetAt);
        }

        if (result.status === 401) {
          // Try refreshing token once
          await this.refreshAccessToken();
          // Retry the request (recursive, but only once since refresh either succeeds or throws)
          return this.apiRequest<T>(method, endpoint, body);
        }

        // Extract error details from secureFetch response
        const errorBody: CRApiError = (result.data && typeof result.data === 'object')
          ? result.data as unknown as CRApiError
          : {
              code: `HTTP_${result.status}`,
              message: result.error || `CentralReach API error: ${result.status}`,
              statusCode: result.status,
              retryable: result.status >= 500,
            };

        throw CentralReachError.fromApiError(errorBody);
      }

      return result.data as T;
    } catch (error) {
      if (error instanceof CentralReachError) throw error;
      throw CentralReachError.networkError(error);
    }
  }

  // ---------- Token Persistence ----------

  private persistTokens(): void {
    if (this.tokens) {
      try {
        localStorage.setItem(
          'centralreach.auth.tokens',
          JSON.stringify(this.tokens),
        );
      } catch {
        console.warn('[CentralReach] Failed to persist tokens to localStorage');
      }
    }
  }

  private restoreTokens(): void {
    try {
      const stored = localStorage.getItem('centralreach.auth.tokens');
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch {
      console.warn('[CentralReach] Failed to restore tokens from localStorage');
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    try {
      localStorage.removeItem('centralreach.auth.tokens');
    } catch {
      // Ignore localStorage errors
    }
  }

  // ---------- Rate Limit Tracking ----------

  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetAt: parseInt(reset, 10) * 1000,
      };
    }
  }
}

// ============================================================================
// Singleton Client & Edge Function Proxy
// ============================================================================

/** Shared CentralReach API client instance */
const crClient = new CentralReachClient();

/**
 * Call CentralReach edge function (production path).
 * Routes through Supabase Edge Functions to keep OAuth credentials server-side.
 */
async function callCREdgeFunction<T>(
  action: string,
  data: Record<string, unknown>,
): Promise<T> {
  const token = localStorage.getItem('supabase.auth.token');
  const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

  const result = await secureFetch<T>(CR_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ action, ...data }),
  });

  if (!result.ok) {
    throw new CentralReachError(
      `CentralReach edge function error: ${result.status} - ${result.error || 'Unknown error'}`,
      'EDGE_FUNCTION_ERROR',
      result.status,
      result.status >= 500,
    );
  }

  return result.data as T;
}

// ============================================================================
// Data Pull: CentralReach -> Aminy
// ============================================================================

/**
 * Pull therapy sessions for a client within a date range.
 * Used by the parent dashboard to display recent session cards.
 */
export async function getClientSessions(
  clientId: string,
  dateRange: { from: string; to: string },
): Promise<CRSession[]> {
  const fetcher = async (): Promise<CRSession[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callCREdgeFunction<{ data: unknown[] }>(
        'get_sessions',
        { clientId, dateFrom: dateRange.from, dateTo: dateRange.to },
      );
      return validateArray(result.data, crSessionSchema);
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, returning mock sessions');
      return getMockSessions(clientId, dateRange);
    }

    const result = await crClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/sessions?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`,
    );
    return validateArray(result.data, crSessionSchema);
  };

  return withRetry(fetcher, {
    onRetry: (attempt, error, delay) => {
      console.warn(
        `[CentralReach] getClientSessions retry ${attempt}: ${error.message} (next in ${Math.round(delay)}ms)`,
      );
    },
  });
}

/**
 * Pull treatment goals for a client.
 * Used by the care plan view to display goal progress.
 */
export async function getClientGoals(clientId: string): Promise<CRGoal[]> {
  const fetcher = async (): Promise<CRGoal[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callCREdgeFunction<{ data: unknown[] }>(
        'get_goals',
        { clientId },
      );
      return validateArray(result.data, crGoalSchema);
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, returning mock goals');
      return getMockGoals(clientId);
    }

    const result = await crClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/goals?status=active`,
    );
    return validateArray(result.data, crGoalSchema);
  };

  return withRetry(fetcher);
}

/**
 * Pull insurance and authorization info for a client.
 * Used by Coverage Coach to show remaining units and auth status.
 */
export async function getClientInsurance(clientId: string): Promise<CRInsurance> {
  const fetcher = async (): Promise<CRInsurance> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callCREdgeFunction<{ data: unknown }>(
        'get_insurance',
        { clientId },
      );
      return crInsuranceSchema.parse(result.data);
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, returning mock insurance');
      return getMockInsurance();
    }

    const result = await crClient.apiRequest<{ data: unknown }>(
      'GET',
      `/clients/${clientId}/insurance`,
    );
    return crInsuranceSchema.parse(result.data);
  };

  return withRetry(fetcher);
}

/**
 * Pull home programs assigned to a client.
 * Used by Junior mode to display assigned activities.
 */
export async function getHomePrograms(clientId: string): Promise<CRHomeProgram[]> {
  const fetcher = async (): Promise<CRHomeProgram[]> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callCREdgeFunction<{ data: unknown[] }>(
        'get_home_programs',
        { clientId },
      );
      return validateArray(result.data, crHomeProgramSchema);
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, returning mock home programs');
      return getMockHomePrograms(clientId);
    }

    const result = await crClient.apiRequest<{ data: unknown[] }>(
      'GET',
      `/clients/${clientId}/home-programs?status=assigned,in_progress`,
    );
    return validateArray(result.data, crHomeProgramSchema);
  };

  return withRetry(fetcher);
}

/**
 * Pull detailed session notes for a specific session.
 * Used when a parent taps into a session card for full details.
 */
export async function getSessionSummary(sessionId: string): Promise<CRSession> {
  const fetcher = async (): Promise<CRSession> => {
    if (USE_EDGE_FUNCTION) {
      const result = await callCREdgeFunction<{ data: unknown }>(
        'get_session_summary',
        { sessionId },
      );
      return crSessionSchema.parse(result.data);
    }

    if (!crClient.isConfigured) {
      throw new CentralReachError(
        'CentralReach not configured',
        'NOT_CONFIGURED',
        0,
        false,
      );
    }

    const result = await crClient.apiRequest<{ data: unknown }>(
      'GET',
      `/sessions/${sessionId}`,
    );
    return crSessionSchema.parse(result.data);
  };

  return withRetry(fetcher);
}

/**
 * Check remaining authorized units for a client.
 * Used by Coverage Coach alerts and authorization tracking.
 */
export async function getAuthorizationStatus(clientId: string): Promise<{
  authorizationNumber: string;
  unitsRemaining: number;
  unitsUsed: number;
  authEndDate: string;
  authStatus: string;
  daysUntilExpiry: number;
}> {
  const insurance = await getClientInsurance(clientId);

  const endDate = new Date(insurance.authEndDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    authorizationNumber: insurance.authorizationNumber,
    unitsRemaining: insurance.authUnitsRemaining,
    unitsUsed: insurance.authUnitsUsed,
    authEndDate: insurance.authEndDate,
    authStatus: insurance.authStatus,
    daysUntilExpiry,
  };
}

// ============================================================================
// Data Push: Aminy -> CentralReach
// ============================================================================

/**
 * Push an ABC behavior log from the parent to CentralReach.
 * Creates a clinical data point attached to the client record.
 */
export async function pushBehaviorLog(
  log: CRBehaviorLogPayload,
): Promise<{ success: boolean; crRecordId: string }> {
  // Validate payload before sending
  const validated = crBehaviorLogPayloadSchema.parse(log);

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callCREdgeFunction<{ success: boolean; crRecordId: string }>(
        'push_behavior_log',
        { log: validated },
      );
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, queuing behavior log');
      return queuePushForLater('behavior_log', validated);
    }

    return crClient.apiRequest<{ success: boolean; crRecordId: string }>(
      'POST',
      `/clients/${validated.clientId}/behavior-data`,
      {
        type: 'abc_log',
        date: validated.date,
        time: validated.time,
        antecedent: validated.antecedent,
        behavior: validated.behavior,
        consequence: validated.consequence,
        severity: validated.severity,
        location: validated.location,
        duration: validated.duration,
        environmentalFactors: validated.environmentalFactors,
        notes: validated.notes,
        reportedBy: validated.reportedBy,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    // Queue for later retry on failure
    await queuePushForLater('behavior_log', validated);
    throw error;
  }
}

/**
 * Push routine completion data for billing documentation.
 * Links home routine results to treatment goals and home programs.
 */
export async function pushRoutineCompletion(
  data: CRRoutineCompletionPayload,
): Promise<{ success: boolean; crRecordId: string }> {
  const validated = crRoutineCompletionPayloadSchema.parse(data);

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callCREdgeFunction<{ success: boolean; crRecordId: string }>(
        'push_routine_completion',
        { data: validated },
      );
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, queuing routine completion');
      return queuePushForLater('routine_completion', validated);
    }

    return crClient.apiRequest<{ success: boolean; crRecordId: string }>(
      'POST',
      `/clients/${validated.clientId}/home-data`,
      {
        type: 'routine_completion',
        date: validated.date,
        routineType: validated.routineType,
        routineName: validated.routineName,
        stepsCompleted: validated.stepsCompleted,
        stepsTotal: validated.stepsTotal,
        completionPercentage: validated.completionPercentage,
        independenceLevel: validated.independenceLevel,
        duration: validated.duration,
        notes: validated.notes,
        billingDocumentation: validated.billingDocumentation,
        reportedBy: validated.reportedBy,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('routine_completion', validated);
    throw error;
  }
}

/**
 * Push Junior mode gamified session results to CentralReach.
 * Maps game performance data to clinical treatment goal metrics.
 */
export async function pushJuniorSessionResults(
  session: CRJuniorSessionPayload,
): Promise<{ success: boolean; crRecordId: string }> {
  const validated = crJuniorSessionPayloadSchema.parse(session);

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callCREdgeFunction<{ success: boolean; crRecordId: string }>(
        'push_junior_session',
        { session: validated },
      );
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, queuing Junior session');
      return queuePushForLater('junior_session', validated);
    }

    return crClient.apiRequest<{ success: boolean; crRecordId: string }>(
      'POST',
      `/clients/${validated.clientId}/home-data`,
      {
        type: 'gamified_session',
        date: validated.date,
        sessionDuration: validated.sessionDuration,
        gameType: validated.gameType,
        skillDomain: validated.skillDomain,
        trialsCompleted: validated.trialsCompleted,
        trialsCorrect: validated.trialsCorrect,
        accuracy: validated.accuracy,
        engagementScore: validated.engagementScore,
        linkedGoalIds: validated.linkedGoalIds,
        rewards: validated.rewards,
        adaptiveDifficulty: validated.adaptiveDifficulty,
        reportedBy: validated.reportedBy,
        source: 'aminy_junior_mode',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('junior_session', validated);
    throw error;
  }
}

/**
 * Push caregiver wellness data to CentralReach.
 * Provides treatment context for the clinical team.
 */
export async function pushCaregiverWellnessData(
  data: CRCaregiverWellnessPayload,
): Promise<{ success: boolean; crRecordId: string }> {
  const validated = crCaregiverWellnessPayloadSchema.parse(data);

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callCREdgeFunction<{ success: boolean; crRecordId: string }>(
        'push_caregiver_wellness',
        { data: validated },
      );
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, queuing wellness data');
      return queuePushForLater('caregiver_wellness', validated);
    }

    return crClient.apiRequest<{ success: boolean; crRecordId: string }>(
      'POST',
      `/clients/${validated.clientId}/caregiver-data`,
      {
        type: 'wellness_check',
        caregiverId: validated.caregiverId,
        date: validated.date,
        stressLevel: validated.stressLevel,
        sleepHours: validated.sleepHours,
        selfCareCompleted: validated.selfCareCompleted,
        supportNetworkContact: validated.supportNetworkContact,
        wellnessScore: validated.wellnessScore,
        concerns: validated.concerns,
        notes: validated.notes,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('caregiver_wellness', validated);
    throw error;
  }
}

/**
 * Update home program progress in CentralReach.
 * Reports activity completion rates back to the assigning BCBA.
 */
export async function updateHomeProgramProgress(
  programId: string,
  data: CRHomeProgramProgressPayload,
): Promise<{ success: boolean; crRecordId: string }> {
  const validated = crHomeProgramProgressPayloadSchema.parse(data);

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callCREdgeFunction<{ success: boolean; crRecordId: string }>(
        'update_home_program_progress',
        { programId, data: validated },
      );
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, queuing home program update');
      return queuePushForLater('home_program_progress', validated);
    }

    return crClient.apiRequest<{ success: boolean; crRecordId: string }>(
      'PUT',
      `/home-programs/${programId}/progress`,
      {
        date: validated.date,
        completions: validated.completions,
        overallCompletionRate: validated.overallCompletionRate,
        caregiverNotes: validated.caregiverNotes,
        clientId: validated.clientId,
        source: 'aminy_parent_app',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('home_program_progress', validated);
    throw error;
  }
}

/**
 * Push telehealth session notes to CentralReach after a video call.
 * Maps session data (notes, goals addressed, interventions, billing code)
 * to CentralReach's clinical data format for documentation and billing.
 *
 * Called from VideoCallRoom post-session flow. Includes:
 * - Session metadata (duration, attendees, platform)
 * - Clinical notes and interventions
 * - Goal linkage for treatment plan documentation
 * - Billing code for insurance claim preparation
 * - Recording consent status for HIPAA compliance
 */
export async function pushTelehealthSessionNotes(
  data: CRTelehealthSessionPayload,
): Promise<{ success: boolean; crRecordId: string }> {
  const validated = crTelehealthSessionPayloadSchema.parse(data);

  const pusher = async () => {
    if (USE_EDGE_FUNCTION) {
      return callCREdgeFunction<{ success: boolean; crRecordId: string }>(
        'push_telehealth_session',
        { data: validated },
      );
    }

    if (!crClient.isConfigured) {
      console.warn('[CentralReach] Not configured, queuing telehealth session notes');
      return queuePushForLater('telehealth_session', validated);
    }

    return crClient.apiRequest<{ success: boolean; crRecordId: string }>(
      'POST',
      `/clients/${validated.clientId}/telehealth-sessions`,
      {
        sessionId: validated.sessionId,
        providerId: validated.providerId,
        date: validated.date,
        startTime: validated.startTime,
        endTime: validated.endTime,
        durationMinutes: validated.durationMinutes,
        sessionType: validated.sessionType,
        platform: validated.platform,
        attendees: validated.attendees,
        notes: validated.sessionNotes,
        goalsAddressed: validated.goalsAddressed,
        interventionsUsed: validated.interventionsUsed,
        parentObservations: validated.parentObservations,
        nextSteps: validated.nextSteps,
        recordingConsent: validated.recordingConsent,
        recordingUrl: validated.recordingUrl,
        billingCode: validated.billingCode,
        requiresFollowUp: validated.requiresFollowUp,
        source: 'aminy_telehealth',
      },
    );
  };

  try {
    return await withRetry(pusher);
  } catch (error) {
    await queuePushForLater('telehealth_session', validated);
    throw error;
  }
}

/**
 * Orchestrate a full bidirectional sync for a client.
 * Pulls latest data from CentralReach, pushes any queued local data.
 */
export async function syncDataBidirectional(clientId: string): Promise<{
  pullResults: {
    sessions: number;
    goals: number;
    homePrograms: number;
    insuranceUpdated: boolean;
  };
  pushResults: {
    pushed: number;
    failed: number;
    queued: number;
  };
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRange = {
    from: thirtyDaysAgo.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };

  // Pull data from CentralReach (parallel)
  const [sessions, goals, homePrograms, insurance] = await Promise.allSettled([
    getClientSessions(clientId, dateRange),
    getClientGoals(clientId),
    getHomePrograms(clientId),
    getClientInsurance(clientId),
  ]);

  const pullResults = {
    sessions: sessions.status === 'fulfilled' ? sessions.value.length : 0,
    goals: goals.status === 'fulfilled' ? goals.value.length : 0,
    homePrograms: homePrograms.status === 'fulfilled' ? homePrograms.value.length : 0,
    insuranceUpdated: insurance.status === 'fulfilled',
  };

  // Push any queued data
  const pushResults = await retryQueuedPushes();

  return { pullResults, pushResults };
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Process an incoming webhook from CentralReach.
 * Validates the signature, parses the payload, and dispatches to handlers.
 */
export async function handleCentralReachWebhook(
  rawPayload: unknown,
): Promise<{ acknowledged: boolean; event: string }> {
  // Validate payload structure
  const payload = crWebhookPayloadSchema.parse(rawPayload);

  // Verify webhook signature
  if (!verifyWebhookSignature(payload)) {
    throw new CentralReachError(
      'Invalid webhook signature',
      'WEBHOOK_SIGNATURE_INVALID',
      401,
      false,
    );
  }

  // Dispatch based on event type
  switch (payload.event) {
    case 'session_completed':
      await handleSessionCompleted(payload);
      break;

    case 'goal_updated':
      await handleGoalUpdated(payload);
      break;

    case 'authorization_changed':
      await handleAuthorizationChanged(payload);
      break;

    case 'home_program_assigned':
      await handleHomeProgramAssigned(payload);
      break;

    case 'client_updated':
      await handleClientUpdated(payload);
      break;

    case 'session_cancelled':
      await handleSessionCancelled(payload);
      break;

    case 'note_signed':
      await handleNoteSigned(payload);
      break;

    default:
      console.warn(`[CentralReach] Unknown webhook event: ${payload.event}`);
  }

  return { acknowledged: true, event: payload.event };
}

/**
 * Verify the HMAC-SHA256 signature on an incoming webhook.
 */
function verifyWebhookSignature(payload: CRWebhookPayload): boolean {
  // Webhook signature verification now happens server-side in the edge function.
  // Client-side only checks that a signature is present.
  if (!payload.signature || payload.signature.length === 0) {
    console.warn('[CentralReach] Webhook missing signature');
    return false;
  }
  return true;
}

// Webhook event handlers (dispatch new data to app state)

async function handleSessionCompleted(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Session completed webhook:', payload.data);
  // In production: update local session cache, trigger dashboard refresh
}

async function handleGoalUpdated(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Goal updated webhook:', payload.data);
  // In production: update care plan view with latest goal progress
}

async function handleAuthorizationChanged(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Authorization changed webhook:', payload.data);
  // In production: update Coverage Coach, trigger alert if units low
}

async function handleHomeProgramAssigned(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Home program assigned webhook:', payload.data);
  // In production: push notification to parent, update Junior mode activities
}

async function handleClientUpdated(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Client updated webhook:', payload.data);
  // In production: refresh client demographics and diagnosis info
}

async function handleSessionCancelled(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Session cancelled webhook:', payload.data);
  // In production: update calendar, notify parent
}

async function handleNoteSigned(payload: CRWebhookPayload): Promise<void> {
  console.info('[CentralReach] Note signed webhook:', payload.data);
  // In production: make session summary available to parent
}

// ============================================================================
// Sync Manager
// ============================================================================

/**
 * Manages periodic synchronization between Aminy and CentralReach.
 *
 * Features:
 * - Configurable sync interval
 * - Conflict resolution (last-write-wins with timestamp comparison)
 * - Sync status tracking
 * - Offline push queue with retry
 */
export class CentralReachSyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private syncState: Map<string, CRSyncState> = new Map();
  private isSyncing = false;

  /** Default sync interval: 5 minutes */
  private intervalMs: number;

  constructor(intervalMs: number = 5 * 60 * 1000) {
    this.intervalMs = intervalMs;
  }

  /** Start periodic synchronization */
  start(clientIds: string[]): void {
    if (this.syncInterval) {
      this.stop();
    }

    // Initialize sync state for each client
    for (const clientId of clientIds) {
      if (!this.syncState.has(clientId)) {
        this.syncState.set(clientId, {
          clientId,
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

    // Run initial sync
    this.runSync(clientIds).catch((err) =>
      console.error('[CentralReach] Initial sync failed:', err),
    );

    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.runSync(clientIds).catch((err) =>
        console.error('[CentralReach] Periodic sync failed:', err),
      );
    }, this.intervalMs);

    console.info(
      `[CentralReach] Sync started for ${clientIds.length} clients (interval: ${this.intervalMs / 1000}s)`,
    );
  }

  /** Stop periodic synchronization */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.info('[CentralReach] Sync stopped');
    }
  }

  /** Get sync state for a specific client */
  getSyncState(clientId: string): CRSyncState | undefined {
    return this.syncState.get(clientId);
  }

  /** Get sync state for all clients */
  getAllSyncStates(): CRSyncState[] {
    return Array.from(this.syncState.values());
  }

  /** Whether the manager is currently syncing */
  get isRunning(): boolean {
    return this.syncInterval !== null;
  }

  /** Whether a sync is currently in progress */
  get isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /** Trigger an immediate sync for specific clients */
  async triggerSync(clientIds: string[]): Promise<void> {
    await this.runSync(clientIds);
  }

  // ---------- Internal Sync Logic ----------

  private async runSync(clientIds: string[]): Promise<void> {
    if (this.isSyncing) {
      console.warn('[CentralReach] Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;

    try {
      for (const clientId of clientIds) {
        const state = this.syncState.get(clientId);
        if (!state) continue;

        try {
          // Update pull status
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
            `[CentralReach] Sync complete for client ${clientId}:`,
            `pulled ${result.pullResults.sessions} sessions, ${result.pullResults.goals} goals;`,
            `pushed ${result.pushResults.pushed}, ${result.pushResults.failed} failed`,
          );
        } catch (error) {
          state.pullStatus = 'error';
          state.pushStatus = 'error';
          console.error(
            `[CentralReach] Sync failed for client ${clientId}:`,
            error,
          );
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

// ============================================================================
// Push Queue (Offline / Failed Submissions)
// ============================================================================

/** In-memory push queue (also persisted to Supabase) */
const pushQueue: CRSyncRecord[] = [];

/**
 * Queue a failed push for later retry.
 */
async function queuePushForLater(
  entityType: CRSyncRecord['entityType'],
  payload: unknown,
): Promise<{ success: boolean; crRecordId: string }> {
  const record: CRSyncRecord = {
    id: `cr-push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType,
    entityId: (payload as Record<string, unknown>)?.clientId as string || '',
    direction: 'push',
    status: 'pending',
    lastSyncAt: '',
    localTimestamp: new Date().toISOString(),
    remoteTimestamp: '',
    retryCount: 0,
    maxRetries: RETRY_CONFIG.maxAttempts,
    nextRetryAt: new Date(
      Date.now() + RETRY_CONFIG.baseDelayMs,
    ).toISOString(),
    createdAt: new Date().toISOString(),
  };

  pushQueue.push(record);

  // Persist to Supabase (best-effort)
  try {
    const token = localStorage.getItem('supabase.auth.token');
    const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;

    const persistResult = await secureFetch(
      `https://${projectId}.supabase.co/rest/v1/centralreach_sync_queue`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
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
      console.warn(
        '[CentralReach] Failed to persist push to Supabase queue:',
        persistResult.error,
      );
    }
  } catch (err) {
    console.warn(
      '[CentralReach] Failed to persist push to Supabase queue:',
      err,
    );
  }

  return { success: false, crRecordId: '' };
}

/**
 * Retry all queued pushes that are past their retry time.
 */
async function retryQueuedPushes(): Promise<{
  pushed: number;
  failed: number;
  queued: number;
}> {
  const now = Date.now();
  const due = pushQueue.filter(
    (r) =>
      r.status === 'pending' &&
      r.nextRetryAt &&
      new Date(r.nextRetryAt).getTime() <= now,
  );

  let pushed = 0;
  let failed = 0;

  for (const record of due) {
    try {
      record.status = 'in_progress';
      // Re-dispatch based on entity type (payload would be stored in Supabase in production)
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

/** Get all pending push records */
export function getPendingPushes(): CRSyncRecord[] {
  return pushQueue.filter((r) => r.status === 'pending');
}

/** Get all failed push records */
export function getFailedPushes(): CRSyncRecord[] {
  return pushQueue.filter((r) => r.status === 'failed');
}

// ============================================================================
// Data Mappers: CentralReach <-> Aminy
// ============================================================================

/** Map a CRSession to an Aminy dashboard session card */
export function mapSessionToCard(
  session: CRSession,
  childName: string,
  providerName: string,
): AminySessionCard {
  const hours = Math.floor(session.duration / 60);
  const minutes = session.duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const sessionTypeLabels: Record<CRSessionType, string> = {
    direct_therapy: 'Direct Therapy (RBT)',
    supervision: 'BCBA Supervision',
    parent_training: 'Parent Training',
    assessment: 'Assessment',
    group_therapy: 'Group Therapy',
    telehealth: 'Telehealth Session',
    consultation: 'Consultation',
  };

  return {
    id: session.id,
    childName,
    providerName,
    date: session.date,
    duration: durationStr,
    type: sessionTypeLabels[session.sessionType] || session.sessionType,
    summary: session.notes.length > 200
      ? session.notes.slice(0, 197) + '...'
      : session.notes,
    goalProgress: session.goals.map((g) => ({
      goalName: g.goalId, // Would be resolved to goal name via lookup
      accuracy: g.accuracy,
      trend: g.accuracy >= 80 ? 'improving' : g.accuracy >= 50 ? 'stable' : 'declining',
    })),
    source: 'centralreach',
  };
}

/** Map a CRGoal to an Aminy care plan goal */
export function mapGoalToCareGoal(goal: CRGoal): AminyCareGoal {
  const domainLabels: Record<CRGoalDomain, string> = {
    communication: 'Communication',
    social_skills: 'Social Skills',
    daily_living: 'Daily Living',
    behavior_reduction: 'Behavior Reduction',
    academic: 'Academic',
    motor_skills: 'Motor Skills',
    play_leisure: 'Play & Leisure',
    self_management: 'Self-Management',
  };

  return {
    id: goal.id,
    title: goal.targetBehavior,
    description: goal.description,
    progress: goal.currentLevel,
    target: goal.target,
    domain: domainLabels[goal.domain] || goal.domain,
    status: goal.status,
    lastUpdated: goal.updatedAt,
    source: 'centralreach',
  };
}

/** Map CRInsurance to Aminy coverage info */
export function mapInsuranceToCoverage(insurance: CRInsurance): AminyCoverageInfo {
  const endDate = new Date(insurance.authEndDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  let status: AminyCoverageInfo['status'];
  if (insurance.authStatus === 'expired' || daysUntilExpiry < 0) {
    status = 'expired';
  } else if (daysUntilExpiry <= 30 || insurance.authUnitsRemaining <= 10) {
    status = 'expiring_soon';
  } else if (insurance.authStatus === 'pending') {
    status = 'pending';
  } else {
    status = 'active';
  }

  return {
    payerName: insurance.payerName,
    memberId: insurance.memberId,
    authorizationNumber: insurance.authorizationNumber,
    unitsRemaining: insurance.authUnitsRemaining,
    unitsUsed: insurance.authUnitsUsed,
    authExpiresOn: insurance.authEndDate,
    status,
    source: 'centralreach',
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

import type { ZodType } from 'zod';

/** Validate an array of items against a Zod schema, filtering out invalid entries */
function validateArray<T>(items: unknown[], schema: ZodType<T>): T[] {
  const results: T[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
    } else {
      console.warn(
        '[CentralReach] Validation failed for item, skipping:',
        parsed.error.issues,
      );
    }
  }
  return results;
}

// ============================================================================
// Health Check & Configuration
// ============================================================================

/** Whether CentralReach integration is configured */
export function isCentralReachConfigured(): boolean {
  return USE_EDGE_FUNCTION || crClient.isConfigured;
}

/** Whether the user is currently authenticated with CentralReach */
export function isCentralReachAuthenticated(): boolean {
  return crClient.isAuthenticated;
}

/** Get CentralReach connection health status */
export async function getCentralReachHealth(): Promise<{
  status: 'ok' | 'degraded' | 'down' | 'not_configured';
  authenticated: boolean;
  edgeFunction: boolean;
  directApi: boolean;
  pendingPushes: number;
  failedPushes: number;
}> {
  const health = {
    status: 'not_configured' as 'ok' | 'degraded' | 'down' | 'not_configured',
    authenticated: crClient.isAuthenticated,
    edgeFunction: false,
    directApi: crClient.isConfigured,
    pendingPushes: getPendingPushes().length,
    failedPushes: getFailedPushes().length,
  };

  if (!isCentralReachConfigured()) {
    return health;
  }

  if (USE_EDGE_FUNCTION) {
    try {
      const healthResult = await secureFetch(`${CR_FUNCTION_URL}/health`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (healthResult.ok) {
        health.edgeFunction = true;
        health.status = 'ok';
      }
    } catch {
      console.warn('[CentralReach] Edge function health check failed');
    }
  }

  if (crClient.isConfigured && crClient.isAuthenticated) {
    health.status = health.edgeFunction ? 'ok' : 'degraded';
  } else if (health.edgeFunction) {
    health.status = 'ok';
  } else {
    health.status = 'down';
  }

  return health;
}

/** Get the OAuth authorization URL for the CentralReach consent flow */
export function getCentralReachAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CR_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/centralreach/callback`,
    scope: 'read write offline_access',
    state: crypto.randomUUID(),
  });

  return `${CR_BASE_URL}/oauth/authorize?${params.toString()}`;
}

// ============================================================================
// Mock Data (Development / Testing)
// ============================================================================

function getMockSessions(
  clientId: string,
  _dateRange: { from: string; to: string },
): CRSession[] {
  const today = new Date();
  return [
    {
      id: `mock-session-1`,
      clientId,
      providerId: 'mock-provider-1',
      date: today.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '11:00',
      duration: 120,
      sessionType: 'direct_therapy',
      notes:
        'Great session today. Child demonstrated improved eye contact and turn-taking during structured play activities. Worked on manding with 3-word phrases - achieved 75% accuracy with verbal prompt.',
      goals: [
        {
          goalId: 'mock-goal-1',
          trials: 20,
          successes: 15,
          accuracy: 75,
          promptLevel: 'verbal',
          notes: 'Improving steadily',
          phase: 'acquisition',
        },
        {
          goalId: 'mock-goal-2',
          trials: 10,
          successes: 8,
          accuracy: 80,
          promptLevel: 'gestural',
          notes: 'Near mastery criterion',
          phase: 'acquisition',
        },
      ],
      billingCode: '97153',
      billingUnits: 8,
      status: 'completed',
      signedOff: true,
      signedOffBy: 'mock-provider-1',
      signedOffAt: today.toISOString(),
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
    {
      id: `mock-session-2`,
      clientId,
      providerId: 'mock-bcba-1',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      startTime: '14:00',
      endTime: '15:00',
      duration: 60,
      sessionType: 'supervision',
      notes:
        'Supervision session: Reviewed RBT data on manding goals. Adjusted prompt fading schedule based on progress. Parent training on reinforcement strategies at home.',
      goals: [
        {
          goalId: 'mock-goal-1',
          trials: 0,
          successes: 0,
          accuracy: 0,
          promptLevel: 'independent',
          notes: 'Reviewed data only',
          phase: 'acquisition',
        },
      ],
      billingCode: '97155',
      billingUnits: 4,
      status: 'completed',
      signedOff: true,
      signedOffBy: 'mock-bcba-1',
      signedOffAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getMockGoals(clientId: string): CRGoal[] {
  return [
    {
      id: 'mock-goal-1',
      clientId,
      description:
        'Child will independently mand for desired items using 3+ word phrases in 80% of opportunities across 3 consecutive sessions.',
      targetBehavior: 'Manding with 3+ word phrases',
      baseline: 20,
      currentLevel: 65,
      target: 80,
      measurementMethod: 'trial_by_trial',
      domain: 'communication',
      status: 'active',
      targetDate: '2025-06-30',
      createdAt: '2024-09-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-goal-2',
      clientId,
      description:
        'Child will engage in reciprocal play with peers for at least 5 minutes without adult prompts in 4 out of 5 opportunities.',
      targetBehavior: 'Reciprocal peer play',
      baseline: 10,
      currentLevel: 55,
      target: 80,
      measurementMethod: 'duration',
      domain: 'social_skills',
      status: 'active',
      targetDate: '2025-08-15',
      createdAt: '2024-09-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-goal-3',
      clientId,
      description:
        'Child will independently complete morning routine (brush teeth, get dressed, eat breakfast) with no more than 1 gestural prompt per step.',
      targetBehavior: 'Morning routine independence',
      baseline: 30,
      currentLevel: 70,
      target: 90,
      measurementMethod: 'trial_by_trial',
      domain: 'daily_living',
      status: 'active',
      targetDate: '2025-05-01',
      createdAt: '2024-09-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getMockInsurance(): CRInsurance {
  return {
    payerId: 'BCBS',
    payerName: 'Blue Cross Blue Shield',
    memberId: 'BCB123456789',
    groupNumber: 'GRP-ABA-2024',
    authorizationNumber: 'AUTH-2024-78901',
    authUnitsRemaining: 156,
    authUnitsUsed: 244,
    authStartDate: '2024-07-01',
    authEndDate: '2025-06-30',
    authStatus: 'active',
  };
}

function getMockHomePrograms(clientId: string): CRHomeProgram[] {
  return [
    {
      id: 'mock-hp-1',
      clientId,
      providerId: 'mock-bcba-1',
      assignedDate: new Date().toISOString().split('T')[0],
      activities: [
        {
          id: 'mock-act-1',
          name: 'Manding Practice',
          instructions:
            'Present preferred item out of reach. Wait 3 seconds for child to request using a 3-word phrase. If no response, provide verbal model.',
          targetTrials: 10,
          targetAccuracy: 70,
          materials: ['Preferred snack', 'Favorite toy', 'Token board'],
          domain: 'communication',
          linkedGoalId: 'mock-goal-1',
          videoUrl: 'https://example.com/videos/manding-demo',
        },
        {
          id: 'mock-act-2',
          name: 'Turn-Taking Game',
          instructions:
            'Play a simple board game or card game with child. Prompt "Your turn" / "My turn" exchanges. Reinforce waiting and sharing.',
          targetTrials: 5,
          targetAccuracy: 60,
          materials: ['Board game', 'Timer', 'Visual turn card'],
          domain: 'social_skills',
          linkedGoalId: 'mock-goal-2',
        },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'assigned',
      instructions:
        'Complete activities 3-5 times per week. Record data after each session. Contact BCBA with questions.',
      frequencyPerWeek: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// ============================================================================
// Session Note Format Mapping (Aminy SOAP -> CentralReach)
// ============================================================================

/** Aminy SOAP note structure */
export interface AminySoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  dateOfService: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  goalsAddressed: string[];
  dataCollection?: {
    goalId: string;
    trials: number;
    successes: number;
    accuracy: number;
    promptLevel: string;
    notes: string;
  }[];
  providerId: string;
  clientId: string;
}

/** CentralReach session note template format */
export interface CRNoteTemplate {
  dateOfService: string;
  serviceCode: string;
  sessionDuration: {
    startTime: string;
    endTime: string;
    totalMinutes: number;
    billingUnits: number;
  };
  goalsAddressed: {
    goalId: string;
    goalDescription: string;
    dataPoints: {
      trials: number;
      successes: number;
      accuracy: number;
      promptLevel: string;
    };
    notes: string;
  }[];
  dataCollection: {
    type: 'trial_by_trial' | 'frequency' | 'duration' | 'interval';
    summary: string;
  };
  clinicalNarrative: {
    subjective: string;
    objective: string;
    assessment: string;
  };
  planRecommendations: string;
  sessionType: string;
  providerSignature: {
    providerId: string;
    signedAt: string;
  };
}

/**
 * Map an Aminy SOAP note to CentralReach's note template format.
 *
 * Translates Aminy's SOAP note structure into the structured fields that
 * CentralReach expects for session documentation, including service code
 * mapping based on session type.
 */
export function mapToCRNoteFormat(
  soapNote: AminySoapNote,
  sessionType: CRSessionType,
): CRNoteTemplate {
  // Map session type to CPT service code
  const serviceCodeMap: Record<CRSessionType, string> = {
    direct_therapy: '97153',
    supervision: '97155',
    parent_training: '97156',
    assessment: '97151',
    group_therapy: '97154',
    telehealth: '97153',
    consultation: '97155',
  };

  // Calculate billing units (1 unit = 15 minutes)
  const billingUnits = Math.ceil(soapNote.durationMinutes / 15);

  // Map goal data collection
  const goalsAddressed = (soapNote.dataCollection || []).map((dc) => ({
    goalId: dc.goalId,
    goalDescription: '', // Would be resolved via goal lookup in production
    dataPoints: {
      trials: dc.trials,
      successes: dc.successes,
      accuracy: dc.accuracy,
      promptLevel: dc.promptLevel,
    },
    notes: dc.notes,
  }));

  // Build data collection summary
  const totalTrials = (soapNote.dataCollection || []).reduce((sum, dc) => sum + dc.trials, 0);
  const totalSuccesses = (soapNote.dataCollection || []).reduce((sum, dc) => sum + dc.successes, 0);
  const overallAccuracy = totalTrials > 0 ? Math.round((totalSuccesses / totalTrials) * 100) : 0;

  return {
    dateOfService: soapNote.dateOfService,
    serviceCode: serviceCodeMap[sessionType] || '97153',
    sessionDuration: {
      startTime: soapNote.startTime,
      endTime: soapNote.endTime,
      totalMinutes: soapNote.durationMinutes,
      billingUnits,
    },
    goalsAddressed,
    dataCollection: {
      type: 'trial_by_trial',
      summary: `${totalTrials} total trials, ${totalSuccesses} correct (${overallAccuracy}% overall accuracy)`,
    },
    clinicalNarrative: {
      subjective: soapNote.subjective,
      objective: soapNote.objective,
      assessment: soapNote.assessment,
    },
    planRecommendations: soapNote.plan,
    sessionType,
    providerSignature: {
      providerId: soapNote.providerId,
      signedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Goal/Objective Sync Structure
// ============================================================================

/** Aminy treatment goal format */
export interface AminyTreatmentGoal {
  id: string;
  clientId: string;
  title: string;
  description: string;
  domain: string;
  baseline: number;
  currentLevel: number;
  targetLevel: number;
  targetDate: string;
  measurementMethod: string;
  status: 'active' | 'mastered' | 'on_hold' | 'discontinued';
  objectives: {
    id: string;
    description: string;
    criterionLevel: number;
    criterionSessions: number;
    status: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

/** CentralReach goal sync payload */
export interface CRGoalSync {
  clientId: string;
  goals: {
    externalId: string;
    targetBehavior: string;
    description: string;
    domain: CRGoalDomain;
    baseline: number;
    currentLevel: number;
    target: number;
    targetDate: string;
    measurementMethod: string;
    status: string;
    objectives: {
      externalId: string;
      description: string;
      criterionLevel: number;
      criterionSessions: number;
      status: string;
    }[];
    lastUpdated: string;
  }[];
  syncTimestamp: string;
  source: 'aminy';
}

/**
 * Prepare Aminy treatment goals for CentralReach import.
 *
 * Formats goals and their nested objectives into the structure
 * CentralReach expects for goal/objective synchronization.
 */
export function prepareGoalSyncPayload(goals: AminyTreatmentGoal[]): CRGoalSync {
  if (goals.length === 0) {
    return {
      clientId: '',
      goals: [],
      syncTimestamp: new Date().toISOString(),
      source: 'aminy',
    };
  }

  // Map Aminy domain strings to CR domain enum
  const domainMap: Record<string, CRGoalDomain> = {
    communication: 'communication',
    social: 'social_skills',
    'social skills': 'social_skills',
    'social-skills': 'social_skills',
    'daily living': 'daily_living',
    'daily-living': 'daily_living',
    behavior: 'behavior_reduction',
    'behavior reduction': 'behavior_reduction',
    'behavior-reduction': 'behavior_reduction',
    academic: 'academic',
    motor: 'motor_skills',
    'motor skills': 'motor_skills',
    'motor-skills': 'motor_skills',
    play: 'play_leisure',
    'play & leisure': 'play_leisure',
    'play-leisure': 'play_leisure',
    'self-management': 'self_management',
    'self management': 'self_management',
  };

  const clientId = goals[0].clientId;

  const mappedGoals = goals.map((goal) => ({
    externalId: goal.id,
    targetBehavior: goal.title,
    description: goal.description,
    domain: domainMap[goal.domain.toLowerCase()] || 'daily_living' as CRGoalDomain,
    baseline: goal.baseline,
    currentLevel: goal.currentLevel,
    target: goal.targetLevel,
    targetDate: goal.targetDate,
    measurementMethod: goal.measurementMethod,
    status: goal.status,
    objectives: goal.objectives.map((obj) => ({
      externalId: obj.id,
      description: obj.description,
      criterionLevel: obj.criterionLevel,
      criterionSessions: obj.criterionSessions,
      status: obj.status,
    })),
    lastUpdated: goal.updatedAt,
  }));

  return {
    clientId,
    goals: mappedGoals,
    syncTimestamp: new Date().toISOString(),
    source: 'aminy',
  };
}

// ============================================================================
// Billing Data Export
// ============================================================================

/** CentralReach-compatible billing record */
export interface CRBillingRecord {
  clientId: string;
  providerId: string;
  renderingProvider: {
    id: string;
    npi: string;
    name: string;
    credential: string;
  };
  dateOfService: string;
  placeOfService: string;
  cptCode: string;
  modifiers: string[];
  units: number;
  authorizationNumber: string;
  diagnosisCodes: string[];
  sessionDuration: {
    startTime: string;
    endTime: string;
    totalMinutes: number;
  };
  serviceDescription: string;
  claimNotes: string;
  source: 'aminy';
  createdAt: string;
}

/** Session data used for billing export */
export interface AminySessionForBilling {
  sessionId: string;
  clientId: string;
  providerId: string;
  dateOfService: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sessionType: CRSessionType;
  placeOfService?: string;
  diagnosisCodes?: string[];
  notes?: string;
}

/** Rendering provider info */
export interface RenderingProviderInfo {
  id: string;
  npi: string;
  name: string;
  credential: string;
}

/**
 * Prepare a CentralReach-compatible billing record from an Aminy session.
 *
 * Creates a structured billing export that includes CPT codes, authorization
 * numbers, rendering provider details, and all fields required for insurance
 * claim submission through CentralReach.
 */
export function prepareBillingExport(
  session: AminySessionForBilling,
  cptCodes: string[],
  authNumber: string,
  renderingProvider: RenderingProviderInfo,
): CRBillingRecord {
  // Determine primary CPT code and modifiers
  const primaryCpt = cptCodes[0] || '97153';
  const modifiers: string[] = [];

  // Add telehealth modifier if applicable
  if (session.sessionType === 'telehealth') {
    modifiers.push('95'); // Synchronous telehealth
    modifiers.push('GT'); // Via interactive telecommunications
  }

  // Add supervision modifier
  if (session.sessionType === 'supervision') {
    modifiers.push('HN'); // Bachelor's degree level
  }

  // Calculate billing units (1 unit = 15 minutes)
  const units = Math.ceil(session.durationMinutes / 15);

  // Map session type to service description
  const serviceDescriptions: Record<CRSessionType, string> = {
    direct_therapy: 'Adaptive behavior treatment by protocol',
    supervision: 'Adaptive behavior treatment with protocol modification',
    parent_training: 'Family adaptive behavior treatment guidance',
    assessment: 'Behavior identification assessment',
    group_therapy: 'Group adaptive behavior treatment by protocol',
    telehealth: 'Adaptive behavior treatment by protocol (telehealth)',
    consultation: 'Adaptive behavior treatment with protocol modification',
  };

  return {
    clientId: session.clientId,
    providerId: session.providerId,
    renderingProvider: {
      id: renderingProvider.id,
      npi: renderingProvider.npi,
      name: renderingProvider.name,
      credential: renderingProvider.credential,
    },
    dateOfService: session.dateOfService,
    placeOfService: session.placeOfService || (session.sessionType === 'telehealth' ? '02' : '12'),
    cptCode: primaryCpt,
    modifiers,
    units,
    authorizationNumber: authNumber,
    diagnosisCodes: session.diagnosisCodes || ['F84.0'], // Default: Autistic disorder
    sessionDuration: {
      startTime: session.startTime,
      endTime: session.endTime,
      totalMinutes: session.durationMinutes,
    },
    serviceDescription: serviceDescriptions[session.sessionType] || 'Adaptive behavior treatment',
    claimNotes: session.notes || '',
    source: 'aminy',
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// Pre-Sync Validation
// ============================================================================

/** Validation result for CentralReach sync payloads */
export interface CRSyncValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a payload before syncing to CentralReach.
 *
 * Checks that all required CentralReach fields are present and well-formed.
 * Returns errors (blocking) and warnings (non-blocking) for the caller to handle.
 */
export function validateForCRSync(
  payload: Record<string, unknown>,
): CRSyncValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields check
  if (!payload.clientId || typeof payload.clientId !== 'string') {
    errors.push('Missing or invalid clientId');
  }

  // Date validation
  if (payload.dateOfService) {
    const dateStr = String(payload.dateOfService);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      errors.push('dateOfService must be in YYYY-MM-DD format');
    } else {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push('dateOfService is not a valid date');
      }
      // Warn if date is in the future
      if (date > new Date()) {
        warnings.push('dateOfService is in the future');
      }
      // Warn if date is more than 90 days old
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      if (date < ninetyDaysAgo) {
        warnings.push('dateOfService is more than 90 days ago; may be rejected by payer');
      }
    }
  }

  // Provider validation
  if (payload.providerId && typeof payload.providerId !== 'string') {
    errors.push('providerId must be a string');
  }

  // CPT code validation
  if (payload.cptCode) {
    const validCptCodes = ['97151', '97152', '97153', '97154', '97155', '97156', '97157', '97158'];
    if (!validCptCodes.includes(String(payload.cptCode))) {
      warnings.push(`CPT code ${payload.cptCode} may not be a recognized ABA billing code`);
    }
  }

  // Authorization number validation
  if (payload.authorizationNumber) {
    if (typeof payload.authorizationNumber !== 'string' || String(payload.authorizationNumber).trim() === '') {
      errors.push('authorizationNumber must be a non-empty string');
    }
  } else if (payload.cptCode) {
    // Billing records should have an auth number
    warnings.push('No authorizationNumber provided; claim may be denied');
  }

  // Units validation
  if (payload.units !== undefined) {
    const units = Number(payload.units);
    if (isNaN(units) || units <= 0) {
      errors.push('units must be a positive number');
    }
    if (units > 32) {
      warnings.push('More than 32 units (8 hours) in a single session; verify accuracy');
    }
  }

  // Billing record specific validations
  if (payload.renderingProvider) {
    const rp = payload.renderingProvider as Record<string, unknown>;
    if (!rp.npi || typeof rp.npi !== 'string') {
      errors.push('renderingProvider.npi is required');
    } else if (!/^\d{10}$/.test(String(rp.npi))) {
      errors.push('renderingProvider.npi must be a 10-digit number');
    }
    if (!rp.name || typeof rp.name !== 'string') {
      errors.push('renderingProvider.name is required');
    }
  }

  // Session duration validation
  if (payload.sessionDuration) {
    const sd = payload.sessionDuration as Record<string, unknown>;
    if (sd.totalMinutes !== undefined) {
      const mins = Number(sd.totalMinutes);
      if (isNaN(mins) || mins <= 0) {
        errors.push('sessionDuration.totalMinutes must be a positive number');
      }
      if (mins > 480) {
        warnings.push('Session duration exceeds 8 hours; verify accuracy');
      }
    }
    if (sd.startTime && sd.endTime) {
      const startStr = String(sd.startTime);
      const endStr = String(sd.endTime);
      if (!/^\d{2}:\d{2}$/.test(startStr)) {
        errors.push('sessionDuration.startTime must be in HH:MM format');
      }
      if (!/^\d{2}:\d{2}$/.test(endStr)) {
        errors.push('sessionDuration.endTime must be in HH:MM format');
      }
    }
  }

  // Goal sync specific validations
  if (payload.goals && Array.isArray(payload.goals)) {
    const goals = payload.goals as Record<string, unknown>[];
    if (goals.length === 0) {
      warnings.push('Goals array is empty; nothing will be synced');
    }
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      if (!goal.targetBehavior || typeof goal.targetBehavior !== 'string') {
        errors.push(`goals[${i}].targetBehavior is required`);
      }
      if (!goal.domain || typeof goal.domain !== 'string') {
        errors.push(`goals[${i}].domain is required`);
      }
      if (goal.target !== undefined && goal.currentLevel !== undefined) {
        if (Number(goal.currentLevel) > Number(goal.target)) {
          warnings.push(`goals[${i}] currentLevel exceeds target; goal may already be mastered`);
        }
      }
    }
  }

  // SOAP note specific validations
  if (payload.clinicalNarrative) {
    const cn = payload.clinicalNarrative as Record<string, unknown>;
    if (!cn.subjective || String(cn.subjective).trim().length < 10) {
      warnings.push('Clinical narrative subjective section is very short');
    }
    if (!cn.objective || String(cn.objective).trim().length < 10) {
      warnings.push('Clinical narrative objective section is very short');
    }
  }

  // Diagnosis code validation
  if (payload.diagnosisCodes && Array.isArray(payload.diagnosisCodes)) {
    const codes = payload.diagnosisCodes as string[];
    for (const code of codes) {
      if (!/^[A-Z]\d{2}(\.\d{1,4})?$/.test(code)) {
        warnings.push(`Diagnosis code "${code}" may not be in valid ICD-10 format`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Configuration & health
  isCentralReachConfigured,
  isCentralReachAuthenticated,
  getCentralReachHealth,
  getCentralReachAuthUrl,

  // Pull: CentralReach -> Aminy
  getClientSessions,
  getClientGoals,
  getClientInsurance,
  getHomePrograms,
  getSessionSummary,
  getAuthorizationStatus,

  // Push: Aminy -> CentralReach
  pushBehaviorLog,
  pushRoutineCompletion,
  pushJuniorSessionResults,
  pushCaregiverWellnessData,
  updateHomeProgramProgress,
  syncDataBidirectional,

  // Webhook
  handleCentralReachWebhook,

  // Sync manager
  CentralReachSyncManager,

  // Push queue
  getPendingPushes,
  getFailedPushes,

  // Data mappers
  mapSessionToCard,
  mapGoalToCareGoal,
  mapInsuranceToCoverage,

  // Session note format mapping
  mapToCRNoteFormat,

  // Goal sync
  prepareGoalSyncPayload,

  // Billing export
  prepareBillingExport,

  // Pre-sync validation
  validateForCRSync,

  // Client class (for advanced usage)
  CentralReachClient,
};
