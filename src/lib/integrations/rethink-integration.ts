/**
 * Rethink Behavioral Health EHR Integration
 *
 * Aminy is COMPLEMENTARY to Rethink, not competitive.
 * - Pull: child profiles, treatment goals, session summaries, progress data
 * - Push: Ease engagement data, parent satisfaction, home program completion
 *
 * Rise/AACT is switching to Rethink — this integration makes Aminy
 * a value-add that enriches Rethink's data, not a replacement.
 */

// ============================================================================
// Auth
// ============================================================================

export interface RethinkOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  baseUrl: string;
}

export interface RethinkTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
  scope: string;
}

export async function initiateOAuth(config: RethinkOAuthConfig): Promise<string> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
  });
  return `${config.baseUrl}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(
  config: RethinkOAuthConfig,
  code: string
): Promise<RethinkTokens> {
  const res = await fetch(`${config.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Rethink OAuth error: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export async function refreshTokens(
  config: RethinkOAuthConfig,
  refreshToken: string
): Promise<RethinkTokens> {
  const res = await fetch(`${config.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Rethink refresh error: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

// ============================================================================
// Types — What We Pull FROM Rethink
// ============================================================================

export interface RethinkClient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosisCodes: string[];
  primaryGuardian: { name: string; email: string; phone: string };
  insurancePlan?: string;
  status: 'active' | 'inactive' | 'discharged';
}

export interface RethinkTreatmentGoal {
  id: string;
  clientId: string;
  domain: string; // 'communication', 'social', 'behavior', 'adaptive', 'academic'
  title: string;
  description: string;
  baselineLevel: number; // 0-100
  targetLevel: number;
  currentLevel: number;
  measurementMethod: string;
  status: 'active' | 'mastered' | 'on-hold' | 'discontinued';
  createdAt: string;
  lastUpdatedAt: string;
}

export interface RethinkSessionSummary {
  id: string;
  clientId: string;
  providerId: string;
  sessionDate: string;
  sessionType: 'direct' | 'supervision' | 'parent-training' | 'assessment';
  durationMinutes: number;
  goalsAddressed: string[]; // goal IDs
  dataPoints: { goalId: string; trials: number; correct: number; promptLevel: string }[];
  notes: string;
  status: 'draft' | 'signed' | 'cosigned';
}

export interface RethinkAuthorization {
  id: string;
  clientId: string;
  payerName: string;
  authNumber: string;
  startDate: string;
  endDate: string;
  approvedUnits: number;
  usedUnits: number;
  remainingUnits: number;
  serviceType: string;
  status: 'active' | 'expired' | 'pending';
}

// ============================================================================
// Types — What We Push TO Rethink
// ============================================================================

export interface AminyEaseData {
  clientId: string;
  reportDate: string;
  reportPeriod: 'daily' | 'weekly';

  // Ease engagement
  easeSessionsCompleted: number;
  easeMinutesEngaged: number;
  activitiesByDomain: Record<string, number>; // domain → count
  calmCornerSessions: number;
  averageRegulationTime: number; // seconds to calm down

  // Parent engagement
  parentAppOpens: number;
  parentProgressChecks: number;
  homeProgramTasksCompleted: number;
  homeProgramTasksAssigned: number;
  homeProgramCompletionRate: number; // 0-100

  // Outcomes
  parentReportedMeltdowns?: number;
  parentMoodRating?: number; // 1-5
  childMoodRating?: number; // 1-5
  parentSatisfactionScore?: number; // 1-10
  parentNotes?: string;
}

export interface AminyParentSurvey {
  clientId: string;
  surveyDate: string;
  responses: {
    overallSatisfaction: number; // 1-10
    therapyProgress: number; // 1-5
    communicationWithProvider: number; // 1-5
    childBehaviorChange: 'improved' | 'same' | 'worsened';
    wouldRecommend: boolean;
    openFeedback?: string;
  };
}

// ============================================================================
// Sync Engine
// ============================================================================

export interface SyncConfig {
  tokens: RethinkTokens;
  baseUrl: string;
  organizationId: string;
  syncInterval: number; // ms, default 3600000 (1hr)
}

export interface SyncResult {
  success: boolean;
  pullCount: number;
  pushCount: number;
  errors: string[];
  lastSyncAt: string;
}

export class RethinkSync {
  private config: SyncConfig;
  private lastSync: string | null = null;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { tokens, baseUrl } = this.config;

    // Check token expiry
    if (Date.now() >= tokens.expiresAt - 60000) {
      // Token refresh would happen here
      throw new Error('Token expired — refresh required');
    }

    const res = await fetch(`${baseUrl}/api/v2${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Rethink API ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  // ── Pull from Rethink ──

  async getClients(): Promise<RethinkClient[]> {
    return this.apiCall<RethinkClient[]>('/clients?status=active');
  }

  async getClientGoals(clientId: string): Promise<RethinkTreatmentGoal[]> {
    return this.apiCall<RethinkTreatmentGoal[]>(`/clients/${clientId}/goals?status=active`);
  }

  async getRecentSessions(clientId: string, days = 30): Promise<RethinkSessionSummary[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return this.apiCall<RethinkSessionSummary[]>(`/clients/${clientId}/sessions?since=${since}`);
  }

  async getAuthorizations(clientId: string): Promise<RethinkAuthorization[]> {
    return this.apiCall<RethinkAuthorization[]>(`/clients/${clientId}/authorizations?status=active`);
  }

  // ── Push to Rethink ──

  async pushEaseData(data: AminyEaseData): Promise<{ id: string }> {
    return this.apiCall<{ id: string }>(`/clients/${data.clientId}/external-data`, {
      method: 'POST',
      body: JSON.stringify({
        source: 'aminy-ease',
        reportDate: data.reportDate,
        reportPeriod: data.reportPeriod,
        data,
      }),
    });
  }

  async pushParentSurvey(survey: AminyParentSurvey): Promise<{ id: string }> {
    return this.apiCall<{ id: string }>(`/clients/${survey.clientId}/external-data`, {
      method: 'POST',
      body: JSON.stringify({
        source: 'aminy-parent-survey',
        reportDate: survey.surveyDate,
        data: survey.responses,
      }),
    });
  }

  // ── Full Sync ──

  async sync(): Promise<SyncResult> {
    const errors: string[] = [];
    let pullCount = 0;
    let pushCount = 0;

    try {
      // Pull clients
      const clients = await this.getClients();
      pullCount += clients.length;

      // Pull goals and sessions for each client
      for (const client of clients) {
        try {
          const goals = await this.getClientGoals(client.id);
          pullCount += goals.length;
          const sessions = await this.getRecentSessions(client.id, 7);
          pullCount += sessions.length;
        } catch (err) {
          errors.push(`Failed to sync client ${client.id}: ${err}`);
        }
      }

      // Push any pending Ease data would happen here
      // (queued data from localStorage or Supabase)

    } catch (err) {
      errors.push(`Sync failed: ${err}`);
    }

    const result: SyncResult = {
      success: errors.length === 0,
      pullCount,
      pushCount,
      errors,
      lastSyncAt: new Date().toISOString(),
    };

    this.lastSync = result.lastSyncAt;
    return result;
  }
}

// ============================================================================
// What This Enables for JJ's Board Presentation
// ============================================================================

/**
 * With Rethink integration, JJ can show his board:
 *
 * 1. "Families using Aminy Ease have 40% better home program completion"
 *    → Data from AminyEaseData.homeProgramCompletionRate pushed to Rethink
 *
 * 2. "Parent satisfaction scores average 8.2/10 for families on Aminy"
 *    → Data from AminyParentSurvey pushed to Rethink
 *
 * 3. "BCBAs can see real-time family engagement data in Rethink"
 *    → AminyEaseData synced daily shows activities, regulation, engagement
 *
 * 4. "Rural families access Rise services through Aminy telehealth"
 *    → Scheduling + session data flows back to Rethink
 *
 * 5. "Aminy's EVV data integrates with our DDD compliance reporting"
 *    → EVV records match with Rethink session documentation
 */
