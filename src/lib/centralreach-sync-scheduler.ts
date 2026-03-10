/**
 * CentralReach Batch Sync Scheduler
 *
 * Manages automated bidirectional syncing between Aminy and CentralReach.
 * Runs periodic pulls (CR -> Aminy) and pushes queued data (Aminy -> CR).
 *
 * Features:
 * - Configurable sync intervals per data type
 * - Default schedule: sessions (4h), goals (6h), authorizations (daily), insurance (weekly)
 * - Backoff on failures with exponential retry
 * - Sync status tracking in Supabase cr_sync_status table
 * - Sync history logging in cr_sync_log table (30-day retention)
 * - Conflict resolution: CR data wins for clinical, Aminy wins for parent-reported
 * - Webhook event processing for real-time updates
 * - Individual error tracking in cr_sync_errors for retry/recovery
 *
 * Conflict Resolution Policy:
 *   Clinical data (sessions, goals, authorizations): CentralReach data wins.
 *   The provider system is the source of truth for clinical records.
 *
 *   Parent-reported data (behavior logs, routines, wellness, junior results):
 *   Aminy data wins. Parents own their observational data.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type SyncDataType =
  | 'sessions'
  | 'goals'
  | 'insurance'
  | 'home_programs'
  | 'auth_status'
  | 'behavior_logs'
  | 'routine_completions'
  | 'junior_results'
  | 'wellness_data';

export type SyncDirection = 'pull' | 'push';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'backoff';

/** Conflict resolution strategy for a data type */
export type ConflictStrategy = 'cr_wins' | 'aminy_wins' | 'newest_wins';

export interface SyncRecord {
  dataType: SyncDataType;
  direction: SyncDirection;
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  nextSyncAt: string | null;
  recordsSynced: number;
}

export interface SyncConfig {
  dataType: SyncDataType;
  direction: SyncDirection;
  intervalMinutes: number;
  enabled: boolean;
  conflictStrategy: ConflictStrategy;
  label: string;
}

/** Entry in the cr_sync_log table */
export interface SyncLogEntry {
  id: string;
  user_id: string;
  child_id: string | null;
  data_type: string;
  direction: string;
  status: 'started' | 'success' | 'error' | 'partial';
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  error_code: string | null;
  duration_ms: number | null;
  sync_metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

/** Entry in the cr_sync_errors table */
export interface SyncErrorEntry {
  id: string;
  user_id: string;
  sync_log_id: string | null;
  data_type: string;
  direction: string;
  record_id: string | null;
  error_code: string | null;
  error_message: string;
  error_details: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Summary of sync history for display */
export interface SyncHistorySummary {
  totalSyncs: number;
  successCount: number;
  errorCount: number;
  partialCount: number;
  totalRecordsProcessed: number;
  totalRecordsFailed: number;
  avgDurationMs: number;
  entries: SyncLogEntry[];
}

// ============================================================================
// Default Sync Schedule
// ============================================================================

/**
 * Default sync configuration per data type.
 * Intervals follow the spec: sessions (4h), goals (6h), auth (daily), insurance (weekly).
 * Push types sync more frequently since parent-reported data flows outbound.
 */
const DEFAULT_SYNC_CONFIGS: SyncConfig[] = [
  // Pull from CentralReach (CR -> Aminy) — clinical data, CR wins
  {
    dataType: 'sessions',
    direction: 'pull',
    intervalMinutes: 240,
    enabled: true,
    conflictStrategy: 'cr_wins',
    label: 'Therapy Sessions',
  },
  {
    dataType: 'goals',
    direction: 'pull',
    intervalMinutes: 360,
    enabled: true,
    conflictStrategy: 'cr_wins',
    label: 'Treatment Goals',
  },
  {
    dataType: 'insurance',
    direction: 'pull',
    intervalMinutes: 10_080, // weekly (7 * 24 * 60)
    enabled: true,
    conflictStrategy: 'cr_wins',
    label: 'Insurance Coverage',
  },
  {
    dataType: 'auth_status',
    direction: 'pull',
    intervalMinutes: 1_440, // daily
    enabled: true,
    conflictStrategy: 'cr_wins',
    label: 'Authorization Status',
  },
  {
    dataType: 'home_programs',
    direction: 'pull',
    intervalMinutes: 360,
    enabled: true,
    conflictStrategy: 'cr_wins',
    label: 'Home Programs',
  },

  // Push to CentralReach (Aminy -> CR) — parent-reported data, Aminy wins
  {
    dataType: 'behavior_logs',
    direction: 'push',
    intervalMinutes: 30,
    enabled: true,
    conflictStrategy: 'aminy_wins',
    label: 'Behavior Logs (ABC)',
  },
  {
    dataType: 'routine_completions',
    direction: 'push',
    intervalMinutes: 30,
    enabled: true,
    conflictStrategy: 'aminy_wins',
    label: 'Routine Completions',
  },
  {
    dataType: 'junior_results',
    direction: 'push',
    intervalMinutes: 60,
    enabled: true,
    conflictStrategy: 'aminy_wins',
    label: 'Junior Session Results',
  },
  {
    dataType: 'wellness_data',
    direction: 'push',
    intervalMinutes: 120,
    enabled: true,
    conflictStrategy: 'aminy_wins',
    label: 'Caregiver Wellness',
  },
];

// Exponential backoff constants
const BASE_BACKOFF_MS = 60_000; // 1 minute
const MAX_BACKOFF_MS = 3_600_000; // 1 hour
const MAX_CONSECUTIVE_FAILURES = 10;

// ============================================================================
// Sync Scheduler Class
// ============================================================================

export class SyncScheduler {
  private syncRecords = new Map<string, SyncRecord>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private configs: SyncConfig[] = [...DEFAULT_SYNC_CONFIGS];
  private isRunning = false;
  private userId: string | null = null;
  private childId: string | null = null;

  /**
   * Initialize the scheduler for a specific user/child.
   * Loads last sync states from Supabase and initializes missing records.
   */
  async init(userId: string, childId?: string): Promise<void> {
    this.userId = userId;
    this.childId = childId || null;

    // Load last sync states from Supabase
    await this.loadSyncStates();

    // Initialize any missing records
    for (const config of this.configs) {
      const key = this.getKey(config.dataType, config.direction);
      if (!this.syncRecords.has(key)) {
        this.syncRecords.set(key, {
          dataType: config.dataType,
          direction: config.direction,
          status: 'idle',
          lastSyncAt: null,
          lastError: null,
          consecutiveFailures: 0,
          nextSyncAt: null,
          recordsSynced: 0,
        });
      }
    }
  }

  /**
   * Update sync interval for a specific data type.
   * Useful for user-configurable sync frequency.
   */
  setInterval(dataType: SyncDataType, direction: SyncDirection, intervalMinutes: number): void {
    const config = this.configs.find(
      (c) => c.dataType === dataType && c.direction === direction,
    );
    if (config) {
      config.intervalMinutes = intervalMinutes;
      // Reschedule if running
      if (this.isRunning) {
        this.scheduleSync(config);
      }
    }
  }

  /**
   * Start all scheduled syncs.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const config of this.configs) {
      if (!config.enabled) continue;
      this.scheduleSync(config);
    }

    console.log(
      '[CRSync] Scheduler started with',
      this.configs.filter((c) => c.enabled).length,
      'active syncs',
    );
  }

  /**
   * Stop all scheduled syncs.
   */
  stop(): void {
    this.isRunning = false;
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    console.log('[CRSync] Scheduler stopped');
  }

  /**
   * Trigger an immediate sync for a specific data type.
   */
  async startSync(dataType: SyncDataType, direction?: SyncDirection): Promise<SyncRecord> {
    // If direction not specified, use the configured direction
    const config = this.configs.find(
      (c) => c.dataType === dataType && (direction ? c.direction === direction : true),
    );
    if (!config) {
      throw new Error(`No sync config for ${dataType}${direction ? `/${direction}` : ''}`);
    }

    const key = this.getKey(config.dataType, config.direction);
    const record = this.syncRecords.get(key);

    if (!record) {
      throw new Error(`No sync record for ${dataType}/${config.direction}`);
    }

    if (record.status === 'syncing') {
      return record; // Already in progress
    }

    return this.executeSync(config.dataType, config.direction);
  }

  /**
   * Sync all data types immediately.
   */
  async syncAll(): Promise<SyncRecord[]> {
    const results: SyncRecord[] = [];

    for (const config of this.configs) {
      if (!config.enabled) continue;
      try {
        const result = await this.executeSync(config.dataType, config.direction);
        results.push(result);
      } catch (err) {
        console.error(`[CRSync] syncAll failed for ${config.dataType}/${config.direction}:`, err);
      }
    }

    return results;
  }

  /**
   * Get the last sync time for a specific data type.
   */
  getLastSyncTime(dataType: SyncDataType, direction?: SyncDirection): string | null {
    if (direction) {
      return this.syncRecords.get(this.getKey(dataType, direction))?.lastSyncAt ?? null;
    }
    // Return the most recent sync time across all directions for this data type
    let latest: string | null = null;
    for (const [, record] of this.syncRecords) {
      if (record.dataType === dataType && record.lastSyncAt) {
        if (!latest || record.lastSyncAt > latest) {
          latest = record.lastSyncAt;
        }
      }
    }
    return latest;
  }

  /**
   * Get sync history from cr_sync_log table.
   *
   * @param days - Number of days of history to fetch (default: 30)
   * @param dataType - Optional filter by data type
   * @returns Summary with aggregated stats and log entries
   */
  async getSyncHistory(
    days = 30,
    dataType?: SyncDataType,
  ): Promise<SyncHistorySummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('cr_sync_log')
      .select('*')
      .eq('user_id', this.userId)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(200);

    if (dataType) {
      query = query.eq('data_type', dataType);
    }

    const { data: entries, error } = await query;

    if (error || !entries) {
      return {
        totalSyncs: 0,
        successCount: 0,
        errorCount: 0,
        partialCount: 0,
        totalRecordsProcessed: 0,
        totalRecordsFailed: 0,
        avgDurationMs: 0,
        entries: [],
      };
    }

    const logs = entries as SyncLogEntry[];

    const successCount = logs.filter((e) => e.status === 'success').length;
    const errorCount = logs.filter((e) => e.status === 'error').length;
    const partialCount = logs.filter((e) => e.status === 'partial').length;
    const totalRecordsProcessed = logs.reduce(
      (sum, e) => sum + (e.records_processed || 0),
      0,
    );
    const totalRecordsFailed = logs.reduce(
      (sum, e) => sum + (e.records_failed || 0),
      0,
    );
    const durations = logs
      .filter((e) => e.duration_ms != null)
      .map((e) => e.duration_ms!);
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      totalSyncs: logs.length,
      successCount,
      errorCount,
      partialCount,
      totalRecordsProcessed,
      totalRecordsFailed,
      avgDurationMs,
      entries: logs,
    };
  }

  /**
   * Get unresolved sync errors for the error recovery dashboard.
   */
  async getUnresolvedErrors(): Promise<SyncErrorEntry[]> {
    const { data, error } = await supabase
      .from('cr_sync_errors')
      .select('*')
      .eq('user_id', this.userId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];
    return data as SyncErrorEntry[];
  }

  /**
   * Retry a specific failed sync error.
   */
  async retryError(errorId: string): Promise<boolean> {
    const { data: errorRow, error: fetchErr } = await supabase
      .from('cr_sync_errors')
      .select('*')
      .eq('id', errorId)
      .single();

    if (fetchErr || !errorRow) return false;

    const entry = errorRow as SyncErrorEntry;
    if (entry.retry_count >= entry.max_retries) {
      console.warn(`[CRSync] Error ${errorId} has exceeded max retries`);
      return false;
    }

    // Trigger a sync for the data type
    try {
      await this.startSync(
        entry.data_type as SyncDataType,
        entry.direction as SyncDirection,
      );

      // Mark error as resolved
      await supabase
        .from('cr_sync_errors')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: 'manual_retry',
          retry_count: entry.retry_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', errorId);

      return true;
    } catch {
      // Increment retry count
      await supabase
        .from('cr_sync_errors')
        .update({
          retry_count: entry.retry_count + 1,
          next_retry_at: new Date(
            Date.now() + BASE_BACKOFF_MS * Math.pow(2, entry.retry_count),
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', errorId);

      return false;
    }
  }

  /**
   * Retry all unresolved errors at once.
   */
  async retryAllErrors(): Promise<{ succeeded: number; failed: number }> {
    const errors = await this.getUnresolvedErrors();
    let succeeded = 0;
    let failed = 0;

    for (const error of errors) {
      const result = await this.retryError(error.id);
      if (result) succeeded++;
      else failed++;
    }

    return { succeeded, failed };
  }

  /**
   * Get current status of all syncs.
   */
  getStatus(): SyncRecord[] {
    return Array.from(this.syncRecords.values());
  }

  /**
   * Get status for a specific sync.
   */
  getSyncStatus(
    dataType: SyncDataType,
    direction: SyncDirection,
  ): SyncRecord | undefined {
    return this.syncRecords.get(this.getKey(dataType, direction));
  }

  /**
   * Get the config for a specific data type.
   */
  getConfig(dataType: SyncDataType, direction: SyncDirection): SyncConfig | undefined {
    return this.configs.find(
      (c) => c.dataType === dataType && c.direction === direction,
    );
  }

  /**
   * Get all sync configs.
   */
  getAllConfigs(): SyncConfig[] {
    return [...this.configs];
  }

  /**
   * Get conflict resolution strategy for a data type.
   * CR data wins for clinical data, Aminy data wins for parent-reported data.
   */
  getConflictStrategy(dataType: SyncDataType, direction: SyncDirection): ConflictStrategy {
    const config = this.getConfig(dataType, direction);
    return config?.conflictStrategy ?? 'newest_wins';
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  private getKey(dataType: SyncDataType, direction: SyncDirection): string {
    return `${dataType}:${direction}`;
  }

  private scheduleSync(config: SyncConfig): void {
    const key = this.getKey(config.dataType, config.direction);
    const record = this.syncRecords.get(key);

    // Calculate delay
    let delayMs = config.intervalMinutes * 60_000;

    // If there's a backoff, use that instead
    if (record && record.consecutiveFailures > 0) {
      const backoff = Math.min(
        BASE_BACKOFF_MS * Math.pow(2, record.consecutiveFailures - 1),
        MAX_BACKOFF_MS,
      );
      delayMs = Math.max(delayMs, backoff);
    }

    // If last sync was recent, adjust delay
    if (record?.lastSyncAt) {
      const elapsed = Date.now() - new Date(record.lastSyncAt).getTime();
      if (elapsed < delayMs) {
        delayMs = delayMs - elapsed;
      }
    }

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Schedule next sync
    const timer = setTimeout(async () => {
      if (!this.isRunning) return;

      await this.executeSync(config.dataType, config.direction);

      // Reschedule
      if (this.isRunning) {
        this.scheduleSync(config);
      }
    }, delayMs);

    this.timers.set(key, timer);

    // Update next sync time
    if (record) {
      record.nextSyncAt = new Date(Date.now() + delayMs).toISOString();
    }
  }

  private async executeSync(
    dataType: SyncDataType,
    direction: SyncDirection,
  ): Promise<SyncRecord> {
    const key = this.getKey(dataType, direction);
    const record = this.syncRecords.get(key)!;
    const startTime = Date.now();

    // Update status
    record.status = 'syncing';
    this.syncRecords.set(key, record);

    // Log sync start to cr_sync_log
    let syncLogId: string | null = null;
    try {
      const { data: logRow } = await supabase
        .from('cr_sync_log')
        .insert({
          user_id: this.userId,
          child_id: this.childId,
          data_type: dataType,
          direction,
          status: 'started',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      syncLogId = logRow?.id ?? null;
    } catch {
      // Non-critical — sync continues even if logging fails
    }

    try {
      // Get conflict strategy for this data type
      const config = this.getConfig(dataType, direction);
      const conflictStrategy = config?.conflictStrategy ?? 'newest_wins';

      // Call the appropriate Supabase edge function
      const { data, error } = await supabase.functions.invoke('centralreach-sync', {
        body: {
          userId: this.userId,
          childId: this.childId,
          dataType,
          direction,
          lastSyncAt: record.lastSyncAt,
          conflictStrategy,
        },
      });

      if (error) throw error;

      const durationMs = Date.now() - startTime;
      const recordsProcessed = data?.recordsProcessed ?? 0;
      const recordsFailed = data?.recordsFailed ?? 0;
      const syncStatus = recordsFailed > 0 ? 'partial' : 'success';

      // Success
      record.status = 'success';
      record.lastSyncAt = new Date().toISOString();
      record.lastError = null;
      record.consecutiveFailures = 0;
      record.recordsSynced = recordsProcessed;

      // Update sync log
      if (syncLogId) {
        await supabase
          .from('cr_sync_log')
          .update({
            status: syncStatus,
            records_processed: recordsProcessed,
            records_failed: recordsFailed,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
            sync_metadata: {
              conflictStrategy,
              childId: this.childId,
            },
          })
          .eq('id', syncLogId)
          .catch(() => {});
      }

      console.log(
        `[CRSync] ${direction} ${dataType}: ${recordsProcessed} records in ${durationMs}ms`,
      );
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      const errorCode =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'UNKNOWN';

      // Failure
      record.status = 'error';
      record.lastError = errorMessage;
      record.consecutiveFailures++;

      if (record.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        record.status = 'backoff';
        console.error(
          `[CRSync] ${direction} ${dataType}: Max failures reached, backing off`,
        );
      }

      // Update sync log
      if (syncLogId) {
        await supabase
          .from('cr_sync_log')
          .update({
            status: 'error',
            error_message: errorMessage,
            error_code: errorCode,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId)
          .catch(() => {});
      }

      // Record individual error for recovery dashboard
      await supabase
        .from('cr_sync_errors')
        .insert({
          user_id: this.userId,
          sync_log_id: syncLogId,
          data_type: dataType,
          direction,
          error_code: errorCode,
          error_message: errorMessage,
          error_details: {
            consecutiveFailures: record.consecutiveFailures,
            lastSyncAt: record.lastSyncAt,
          },
          retry_count: 0,
          max_retries: 3,
          next_retry_at: new Date(
            Date.now() +
              BASE_BACKOFF_MS *
                Math.pow(2, Math.min(record.consecutiveFailures, 10)),
          ).toISOString(),
        })
        .catch(() => {});

      console.error(
        `[CRSync] ${direction} ${dataType} failed:`,
        errorMessage,
      );
    }

    // Persist state to cr_sync_status
    await this.saveSyncState(record);
    this.syncRecords.set(key, record);

    return record;
  }

  private async loadSyncStates(): Promise<void> {
    try {
      const { data } = await supabase
        .from('cr_sync_status')
        .select('*')
        .eq('user_id', this.userId);

      if (data) {
        for (const row of data) {
          const key = this.getKey(row.data_type, row.direction);
          this.syncRecords.set(key, {
            dataType: row.data_type,
            direction: row.direction,
            status: row.status || 'idle',
            lastSyncAt: row.last_sync_at,
            lastError: row.last_error,
            consecutiveFailures: row.consecutive_failures || 0,
            nextSyncAt: row.next_sync_at,
            recordsSynced: row.records_synced || 0,
          });
        }
      }
    } catch {
      // Non-critical — will use defaults
    }
  }

  private async saveSyncState(record: SyncRecord): Promise<void> {
    try {
      await supabase.from('cr_sync_status').upsert(
        {
          user_id: this.userId,
          data_type: record.dataType,
          direction: record.direction,
          status: record.status,
          last_sync_at: record.lastSyncAt,
          last_error: record.lastError,
          consecutive_failures: record.consecutiveFailures,
          next_sync_at: record.nextSyncAt,
          records_synced: record.recordsSynced,
        },
        {
          onConflict: 'user_id,data_type,direction',
        },
      );
    } catch {
      // Non-critical
    }
  }
}

// ============================================================================
// Webhook Event Handler (Legacy — see centralreach-webhooks.ts for new handler)
// ============================================================================

export interface CRWebhookEvent {
  type: string;
  clientId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Process incoming CentralReach webhook events.
 * Called by the Supabase edge function that receives CR webhooks.
 *
 * @deprecated Use WebhookHandler from centralreach-webhooks.ts instead
 */
export async function handleCRWebhook(event: CRWebhookEvent): Promise<void> {
  const eventTypeMap: Record<string, SyncDataType> = {
    'session.created': 'sessions',
    'session.updated': 'sessions',
    'goal.updated': 'goals',
    'goal.completed': 'goals',
    'insurance.verified': 'insurance',
    'authorization.updated': 'auth_status',
    'home_program.assigned': 'home_programs',
  };

  const dataType = eventTypeMap[event.type];
  if (!dataType) {
    console.warn(`[CRWebhook] Unknown event type: ${event.type}`);
    return;
  }

  // Store the webhook event for processing
  try {
    await supabase.from('cr_webhook_events').insert({
      event_id: `legacy_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      event_type: event.type,
      client_id: event.clientId,
      payload: event.data,
      received_at: new Date().toISOString(),
      processed: false,
      retry_count: 0,
    });
  } catch (err) {
    console.error('[CRWebhook] Failed to store event:', err);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const syncScheduler = new SyncScheduler();

export default syncScheduler;
