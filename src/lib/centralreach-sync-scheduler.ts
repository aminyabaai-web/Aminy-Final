/**
 * CentralReach Sync Scheduler
 *
 * Manages automated bidirectional syncing between Aminy and CentralReach.
 * Runs periodic pulls (CR → Aminy) and pushes queued data (Aminy → CR).
 *
 * Features:
 * - Configurable sync intervals per data type
 * - Backoff on failures
 * - Sync status tracking in Supabase
 * - Conflict detection for stale data
 * - Webhook event processing for real-time updates
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// Types
// ============================================

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

interface SyncRecord {
  dataType: SyncDataType;
  direction: SyncDirection;
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  nextSyncAt: string | null;
  recordsSynced: number;
}

interface SyncConfig {
  dataType: SyncDataType;
  direction: SyncDirection;
  intervalMinutes: number;
  enabled: boolean;
}

// ============================================
// Default Sync Schedule
// ============================================

const DEFAULT_SYNC_CONFIGS: SyncConfig[] = [
  // Pull from CentralReach (CR → Aminy)
  { dataType: 'sessions', direction: 'pull', intervalMinutes: 60, enabled: true },
  { dataType: 'goals', direction: 'pull', intervalMinutes: 120, enabled: true },
  { dataType: 'insurance', direction: 'pull', intervalMinutes: 360, enabled: true },
  { dataType: 'home_programs', direction: 'pull', intervalMinutes: 120, enabled: true },
  { dataType: 'auth_status', direction: 'pull', intervalMinutes: 1440, enabled: true }, // Daily

  // Push to CentralReach (Aminy → CR)
  { dataType: 'behavior_logs', direction: 'push', intervalMinutes: 30, enabled: true },
  { dataType: 'routine_completions', direction: 'push', intervalMinutes: 30, enabled: true },
  { dataType: 'junior_results', direction: 'push', intervalMinutes: 60, enabled: true },
  { dataType: 'wellness_data', direction: 'push', intervalMinutes: 120, enabled: true },
];

// Exponential backoff constants
const BASE_BACKOFF_MS = 60_000; // 1 minute
const MAX_BACKOFF_MS = 3_600_000; // 1 hour
const MAX_CONSECUTIVE_FAILURES = 10;

// ============================================
// Sync State Manager
// ============================================

class SyncScheduler {
  private syncRecords = new Map<string, SyncRecord>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private isRunning = false;
  private userId: string | null = null;
  private childId: string | null = null;

  /**
   * Initialize the scheduler for a specific user/child.
   */
  async init(userId: string, childId?: string): Promise<void> {
    this.userId = userId;
    this.childId = childId || null;

    // Load last sync states from Supabase
    await this.loadSyncStates();

    // Initialize any missing records
    for (const config of DEFAULT_SYNC_CONFIGS) {
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
   * Start all scheduled syncs.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const config of DEFAULT_SYNC_CONFIGS) {
      if (!config.enabled) continue;
      this.scheduleSync(config);
    }

    console.log('[CRSync] Scheduler started with', DEFAULT_SYNC_CONFIGS.filter(c => c.enabled).length, 'active syncs');
  }

  /**
   * Stop all scheduled syncs.
   */
  stop(): void {
    this.isRunning = false;
    for (const [key, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    console.log('[CRSync] Scheduler stopped');
  }

  /**
   * Trigger an immediate sync for a specific data type.
   */
  async syncNow(dataType: SyncDataType, direction: SyncDirection): Promise<SyncRecord> {
    const key = this.getKey(dataType, direction);
    const record = this.syncRecords.get(key);

    if (!record) {
      throw new Error(`No sync config for ${dataType}/${direction}`);
    }

    if (record.status === 'syncing') {
      return record; // Already in progress
    }

    return this.executeSync(dataType, direction);
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
  getSyncStatus(dataType: SyncDataType, direction: SyncDirection): SyncRecord | undefined {
    return this.syncRecords.get(this.getKey(dataType, direction));
  }

  // ============================================
  // Internal Methods
  // ============================================

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
        MAX_BACKOFF_MS
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
    direction: SyncDirection
  ): Promise<SyncRecord> {
    const key = this.getKey(dataType, direction);
    const record = this.syncRecords.get(key)!;

    // Update status
    record.status = 'syncing';
    this.syncRecords.set(key, record);

    try {
      // Call the appropriate Supabase edge function
      const { data, error } = await supabase.functions.invoke('centralreach-sync', {
        body: {
          userId: this.userId,
          childId: this.childId,
          dataType,
          direction,
          lastSyncAt: record.lastSyncAt,
        },
      });

      if (error) throw error;

      // Success
      record.status = 'success';
      record.lastSyncAt = new Date().toISOString();
      record.lastError = null;
      record.consecutiveFailures = 0;
      record.recordsSynced = data?.recordsProcessed || 0;

      console.log(`[CRSync] ${direction} ${dataType}: ${record.recordsSynced} records`);
    } catch (err) {
      // Failure
      record.status = 'error';
      record.lastError = err instanceof Error ? err.message : 'Unknown error';
      record.consecutiveFailures++;

      if (record.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        record.status = 'backoff';
        console.error(`[CRSync] ${direction} ${dataType}: Max failures reached, backing off`);
      }

      console.error(`[CRSync] ${direction} ${dataType} failed:`, record.lastError);
    }

    // Persist state
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
      await supabase.from('cr_sync_status').upsert({
        user_id: this.userId,
        data_type: record.dataType,
        direction: record.direction,
        status: record.status,
        last_sync_at: record.lastSyncAt,
        last_error: record.lastError,
        consecutive_failures: record.consecutiveFailures,
        next_sync_at: record.nextSyncAt,
        records_synced: record.recordsSynced,
      }, {
        onConflict: 'user_id,data_type,direction',
      });
    } catch {
      // Non-critical
    }
  }
}

// ============================================
// Webhook Event Handler
// ============================================

export interface CRWebhookEvent {
  type: string;
  clientId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Process incoming CentralReach webhook events.
 * Called by the Supabase edge function that receives CR webhooks.
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
      event_type: event.type,
      client_id: event.clientId,
      payload: event.data,
      received_at: new Date().toISOString(),
      processed: false,
    });
  } catch (err) {
    console.error('[CRWebhook] Failed to store event:', err);
  }
}

// ============================================
// Singleton Export
// ============================================

export const syncScheduler = new SyncScheduler();

export default syncScheduler;
