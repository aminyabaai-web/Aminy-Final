/**
 * CentralReach Test Harness
 *
 * Provides a testing interface for CentralReach webhook processing,
 * sync cycle simulation, and dashboard data population without requiring
 * a live CentralReach sandbox.
 *
 * Usage:
 *   import { CRTestHarness } from './centralreach-test-harness';
 *   const harness = new CRTestHarness();
 *   await harness.simulateWebhook('session_completed', customPayload);
 *   const dashboard = harness.getTestDashboardData();
 *
 * Dev tools:
 *   window.__crTestHarness = new CRTestHarness();
 *   window.__crTestHarness.simulateWebhook('session_completed');
 */

import type { CRWebhookPayload, CRWebhookEvent } from './centralreach-types';
import type { WebhookPayload } from './centralreach-webhooks';
import {
  DEMO_CR_CLIENTS,
  DEMO_CR_SESSIONS,
  DEMO_CR_AUTHORIZATIONS,
  DEMO_WEBHOOK_PAYLOADS,
  DEMO_SYNC_STATUS,
  DEMO_CR_BILLING_CODES,
  type DemoSyncStatus,
  type DemoCRAuthorization,
  type DemoCRBillingCode,
} from './demo-data/centralreach-demo-data';
import type { CRClient, CRSession } from './centralreach-types';

// ============================================================================
// Types
// ============================================================================

export type WebhookSimulationType =
  | 'client_updated'
  | 'session_completed'
  | 'session_cancelled'
  | 'authorization_changed'
  | 'note_signed';

export interface SimulatedWebhookResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processedAt: string;
  payload: CRWebhookPayload;
  error?: string;
}

export interface SyncCycleResult {
  pullResults: SyncStepResult[];
  pushResults: SyncStepResult[];
  totalDurationMs: number;
  recordsSynced: number;
  errors: string[];
}

export interface SyncStepResult {
  dataType: string;
  direction: 'pull' | 'push';
  status: 'success' | 'error' | 'skipped';
  records: number;
  durationMs: number;
  error?: string;
}

export interface TestDashboardData {
  clients: CRClient[];
  sessions: CRSession[];
  authorizations: DemoCRAuthorization[];
  syncStatus: DemoSyncStatus;
  billingCodes: DemoCRBillingCode[];
  webhookLog: SimulatedWebhookResult[];
  summary: {
    totalClients: number;
    activeClients: number;
    sessionsThisWeek: number;
    completedSessions: number;
    cancelledSessions: number;
    activeAuthorizations: number;
    expiringAuthorizations: number;
    pendingSyncItems: number;
  };
}

export interface WebhookValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Test Harness Class
// ============================================================================

export class CRTestHarness {
  private webhookLog: SimulatedWebhookResult[] = [];
  private webhookListeners: Array<(result: SimulatedWebhookResult) => void> = [];
  private syncListeners: Array<(result: SyncCycleResult) => void> = [];

  // --------------------------------------------------------------------------
  // Webhook Simulation
  // --------------------------------------------------------------------------

  /**
   * Simulate a CentralReach webhook event.
   * Fires the corresponding demo payload and notifies listeners.
   *
   * @param type - The webhook event type to simulate
   * @param customPayload - Optional partial payload to override defaults
   * @returns The simulated webhook result
   */
  async simulateWebhook(
    type: WebhookSimulationType,
    customPayload?: Partial<CRWebhookPayload>,
  ): Promise<SimulatedWebhookResult> {
    // Find matching demo payload
    const demoPayload = DEMO_WEBHOOK_PAYLOADS.find(
      (p) => p.eventType === type,
    );

    if (!demoPayload) {
      const result: SimulatedWebhookResult = {
        success: false,
        eventId: '',
        eventType: type,
        processedAt: new Date().toISOString(),
        payload: {
          event: type as CRWebhookEvent,
          timestamp: new Date().toISOString(),
          organizationId: '',
          data: {},
          signature: '',
        },
        error: `No demo payload found for event type: ${type}`,
      };
      this.webhookLog.push(result);
      return result;
    }

    // Merge custom payload with demo payload
    const payload: CRWebhookPayload = {
      ...demoPayload.payload,
      ...customPayload,
      timestamp: new Date().toISOString(),
      data: {
        ...demoPayload.payload.data,
        ...(customPayload?.data ?? {}),
      },
    };

    const eventId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Simulate processing delay (50-200ms)
    await new Promise((resolve) =>
      setTimeout(resolve, 50 + Math.random() * 150),
    );

    const result: SimulatedWebhookResult = {
      success: true,
      eventId,
      eventType: type,
      processedAt: new Date().toISOString(),
      payload,
    };

    this.webhookLog.push(result);

    // Notify listeners
    for (const listener of this.webhookListeners) {
      try {
        listener(result);
      } catch (err) {
        console.warn('[CRTestHarness] Webhook listener error:', err);
      }
    }

    console.log(
      `[CRTestHarness] Simulated webhook: ${type} (${eventId})`,
    );

    return result;
  }

  /**
   * Register a listener for simulated webhook events.
   *
   * @param callback - Function called when a webhook is simulated
   * @returns Unsubscribe function
   */
  onWebhook(callback: (result: SimulatedWebhookResult) => void): () => void {
    this.webhookListeners.push(callback);
    return () => {
      const idx = this.webhookListeners.indexOf(callback);
      if (idx >= 0) this.webhookListeners.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Sync Cycle Simulation
  // --------------------------------------------------------------------------

  /**
   * Simulate a full sync cycle with realistic timing.
   * Processes pull operations (CR -> Aminy) then push operations (Aminy -> CR).
   *
   * @returns Full sync cycle results
   */
  async simulateSyncCycle(): Promise<SyncCycleResult> {
    const startTime = Date.now();
    const pullResults: SyncStepResult[] = [];
    const pushResults: SyncStepResult[] = [];
    const errors: string[] = [];

    const pullTypes = ['sessions', 'goals', 'insurance', 'auth_status', 'home_programs'];
    const pushTypes = ['behavior_logs', 'routine_completions', 'junior_results', 'wellness_data'];

    // Simulate pull operations
    for (const dataType of pullTypes) {
      const stepStart = Date.now();
      // Simulate variable processing time (100-500ms)
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 400),
      );

      // 10% chance of error for realistic testing
      const hasError = Math.random() < 0.1;
      const records = hasError ? 0 : Math.floor(Math.random() * 50) + 5;

      const stepResult: SyncStepResult = {
        dataType,
        direction: 'pull',
        status: hasError ? 'error' : 'success',
        records,
        durationMs: Date.now() - stepStart,
        error: hasError ? `Timeout fetching ${dataType} from CentralReach` : undefined,
      };

      pullResults.push(stepResult);
      if (hasError) {
        errors.push(stepResult.error!);
      }
    }

    // Simulate push operations
    for (const dataType of pushTypes) {
      const stepStart = Date.now();
      await new Promise((resolve) =>
        setTimeout(resolve, 50 + Math.random() * 300),
      );

      const hasError = Math.random() < 0.05;
      const records = hasError ? 0 : Math.floor(Math.random() * 30) + 2;

      const stepResult: SyncStepResult = {
        dataType,
        direction: 'push',
        status: hasError ? 'error' : 'success',
        records,
        durationMs: Date.now() - stepStart,
        error: hasError ? `CR API rejected push for ${dataType}` : undefined,
      };

      pushResults.push(stepResult);
      if (hasError) {
        errors.push(stepResult.error!);
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const recordsSynced = [...pullResults, ...pushResults].reduce(
      (sum, r) => sum + r.records,
      0,
    );

    const result: SyncCycleResult = {
      pullResults,
      pushResults,
      totalDurationMs,
      recordsSynced,
      errors,
    };

    // Notify listeners
    for (const listener of this.syncListeners) {
      try {
        listener(result);
      } catch (err) {
        console.warn('[CRTestHarness] Sync listener error:', err);
      }
    }

    console.log(
      `[CRTestHarness] Sync cycle complete: ${recordsSynced} records in ${totalDurationMs}ms` +
        (errors.length > 0 ? ` (${errors.length} errors)` : ''),
    );

    return result;
  }

  /**
   * Register a listener for sync cycle completions.
   */
  onSyncComplete(callback: (result: SyncCycleResult) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      const idx = this.syncListeners.indexOf(callback);
      if (idx >= 0) this.syncListeners.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Dashboard Data
  // --------------------------------------------------------------------------

  /**
   * Return fully populated dashboard data for demo/test mode.
   * Combines all demo data sources into a single dashboard payload.
   */
  getTestDashboardData(): TestDashboardData {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const sessionsThisWeek = DEMO_CR_SESSIONS.filter(
      (s) => s.date >= weekAgoStr,
    );

    return {
      clients: DEMO_CR_CLIENTS,
      sessions: DEMO_CR_SESSIONS,
      authorizations: DEMO_CR_AUTHORIZATIONS,
      syncStatus: DEMO_SYNC_STATUS,
      billingCodes: DEMO_CR_BILLING_CODES,
      webhookLog: this.webhookLog,
      summary: {
        totalClients: DEMO_CR_CLIENTS.length,
        activeClients: DEMO_CR_CLIENTS.filter((c) => c.status === 'active').length,
        sessionsThisWeek: sessionsThisWeek.length,
        completedSessions: DEMO_CR_SESSIONS.filter((s) => s.status === 'completed').length,
        cancelledSessions: DEMO_CR_SESSIONS.filter((s) => s.status === 'cancelled').length,
        activeAuthorizations: DEMO_CR_AUTHORIZATIONS.filter((a) => a.status === 'active').length,
        expiringAuthorizations: DEMO_CR_AUTHORIZATIONS.filter(
          (a) => a.status === 'expiring_soon',
        ).length,
        pendingSyncItems: DEMO_SYNC_STATUS.pendingItems,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Webhook Payload Validation
  // --------------------------------------------------------------------------

  /**
   * Validate a webhook payload structure.
   * Checks for required fields, valid event types, and data consistency.
   *
   * @param payload - The webhook payload to validate
   * @returns Validation result with errors and warnings
   */
  validateWebhookPayload(payload: unknown): WebhookValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload || typeof payload !== 'object') {
      return { valid: false, errors: ['Payload must be a non-null object'], warnings };
    }

    const p = payload as Record<string, unknown>;

    // Required fields
    if (!p.event && !p.eventType) {
      errors.push('Missing required field: event or eventType');
    }

    if (!p.timestamp) {
      errors.push('Missing required field: timestamp');
    } else if (typeof p.timestamp === 'string') {
      const ts = new Date(p.timestamp);
      if (isNaN(ts.getTime())) {
        errors.push('Invalid timestamp format — must be ISO 8601');
      }
    }

    if (!p.organizationId) {
      errors.push('Missing required field: organizationId');
    }

    if (!p.data) {
      errors.push('Missing required field: data');
    } else if (typeof p.data !== 'object') {
      errors.push('Field "data" must be an object');
    }

    if (!p.signature) {
      warnings.push('Missing signature field — will fail production validation');
    }

    // Validate event type
    const eventType = (p.event ?? p.eventType) as string | undefined;
    const validEvents: string[] = [
      'session_completed',
      'session_cancelled',
      'goal_updated',
      'authorization_changed',
      'client_updated',
      'home_program_assigned',
      'note_signed',
    ];
    if (eventType && !validEvents.includes(eventType)) {
      warnings.push(`Unknown event type: ${eventType}. Known types: ${validEvents.join(', ')}`);
    }

    // Validate data payload based on event type
    if (eventType && p.data && typeof p.data === 'object') {
      const data = p.data as Record<string, unknown>;

      if (eventType.startsWith('session_') && !data.sessionId) {
        warnings.push(`Session event missing data.sessionId`);
      }

      if (eventType === 'authorization_changed' && !data.authorizationNumber) {
        warnings.push('Authorization event missing data.authorizationNumber');
      }

      if (eventType === 'client_updated' && !data.clientId) {
        warnings.push('Client event missing data.clientId');
      }

      if (eventType === 'note_signed' && !data.signedBy) {
        warnings.push('Note signed event missing data.signedBy');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // Utility
  // --------------------------------------------------------------------------

  /** Get the simulated webhook history */
  getWebhookLog(): SimulatedWebhookResult[] {
    return [...this.webhookLog];
  }

  /** Clear the simulated webhook history */
  clearWebhookLog(): void {
    this.webhookLog = [];
  }

  /** Get all available demo webhook types with descriptions */
  getAvailableWebhookTypes(): Array<{ type: string; label: string; description: string }> {
    return DEMO_WEBHOOK_PAYLOADS.map((p) => ({
      type: p.eventType,
      label: p.label,
      description: p.description,
    }));
  }
}

// ============================================================================
// Dev Tools Integration
// ============================================================================

if (typeof window !== 'undefined') {
  const harness = new CRTestHarness();
  (window as unknown as Record<string, unknown>).__crTestHarness = harness;
  (window as unknown as Record<string, unknown>).__simulateCRWebhook = (
    type: WebhookSimulationType,
  ) => harness.simulateWebhook(type);
  (window as unknown as Record<string, unknown>).__simulateCRSync = () =>
    harness.simulateSyncCycle();
  (window as unknown as Record<string, unknown>).__getCRTestDashboard = () =>
    harness.getTestDashboardData();
}
