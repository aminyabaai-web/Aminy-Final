// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Offline Queue
 *
 * Priority-based action queue backed by IndexedDB for reliable offline
 * persistence. Queues form submissions, session data, analytics events,
 * and data syncs, then processes them with retry logic once connectivity
 * returns.
 *
 * Differs from useBackgroundSync (which is a React hook) by being a
 * standalone class suitable for use outside React components — in
 * service workers, event handlers, or library code.
 *
 * Priority levels:
 *   critical — Session data, behavior logs (processed first, more retries)
 *   high     — Form submissions, care plan updates
 *   normal   — Analytics, preference syncs, non-urgent data
 *
 * Usage:
 *   import { OfflineQueue } from './offline-queue';
 *   const queue = new OfflineQueue();
 *   await queue.open();
 *   await queue.enqueue({ type: 'behavior_log', endpoint: '/api/logs', payload: { ... } });
 *   const status = await queue.getQueueStatus();
 */

// ============================================================================
// Types
// ============================================================================

export type QueuePriority = 'critical' | 'high' | 'normal';

export type QueueActionType =
  | 'behavior_log'
  | 'session_data'
  | 'form_submission'
  | 'care_plan_update'
  | 'junior_result'
  | 'conversation_message'
  | 'analytics_event'
  | 'preference_sync'
  | 'routine_completion';

export interface QueueAction {
  type: QueueActionType;
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  priority?: QueuePriority;
  /** Optional headers to include with the request */
  headers?: Record<string, string>;
  /** Maximum number of retry attempts (overrides default for priority) */
  maxRetries?: number;
}

export interface QueueEntry {
  id: string;
  type: QueueActionType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  priority: QueuePriority;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
  createdAt: string;
  lastAttempt?: string;
  lastError?: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
  total: number;
  lastProcessed: string | null;
  oldestEntry: string | null;
  byPriority: Record<QueuePriority, number>;
}

export interface QueueProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  durationMs: number;
}

export type QueueChangeCallback = (status: QueueStatus) => void;

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'aminy-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

/** Default retry limits by priority */
const DEFAULT_MAX_RETRIES: Record<QueuePriority, number> = {
  critical: 10,
  high: 5,
  normal: 3,
};

/** Priority sort order (lower = processed first) */
const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

/** Infer priority from action type when not explicitly set */
const TYPE_PRIORITY_MAP: Record<QueueActionType, QueuePriority> = {
  session_data: 'critical',
  behavior_log: 'critical',
  junior_result: 'high',
  form_submission: 'high',
  care_plan_update: 'high',
  conversation_message: 'high',
  routine_completion: 'high',
  analytics_event: 'normal',
  preference_sync: 'normal',
};

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 1000;

/** Maximum delay between retries (ms) */
const MAX_RETRY_DELAY = 60_000;

// ============================================================================
// OfflineQueue
// ============================================================================

export class OfflineQueue {
  private db: IDBDatabase | null = null;
  private listeners: QueueChangeCallback[] = [];
  private isProcessing = false;
  private lastProcessedAt: string | null = null;
  private processTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Open the IndexedDB database. Must be called before any other method.
   */
  async open(): Promise<void> {
    if (this.db) return;

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Listen for connectivity changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }
  }

  /**
   * Enqueue an action for later processing.
   *
   * @param action - The action to enqueue
   * @returns The created queue entry
   */
  async enqueue(action: QueueAction): Promise<QueueEntry> {
    this.ensureOpen();

    const priority = action.priority ?? TYPE_PRIORITY_MAP[action.type] ?? 'normal';
    const maxRetries = action.maxRetries ?? DEFAULT_MAX_RETRIES[priority];

    const entry: QueueEntry = {
      id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: action.type,
      endpoint: action.endpoint,
      method: action.method ?? 'POST',
      payload: action.payload,
      headers: action.headers ?? {},
      priority,
      retries: 0,
      maxRetries,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await this.put(entry);
    this.notifyChange();

    // If online, schedule immediate processing
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.scheduleProcess(100);
    }

    if (import.meta.env.DEV) console.log(
      `[OfflineQueue] Enqueued ${action.type} (${priority}) -> ${action.endpoint}`,
    );

    return entry;
  }

  /**
   * Process all pending items in priority order.
   * Critical items are processed first, then high, then normal.
   *
   * @returns Processing results
   */
  async processQueue(): Promise<QueueProcessResult> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0, remaining: 0, durationMs: 0 };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    let succeeded = 0;
    let failed = 0;

    try {
      const entries = await this.getAllPending();

      // Sort by priority (critical first), then by creation time (oldest first)
      entries.sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.localeCompare(b.createdAt);
      });

      for (const entry of entries) {
        // Mark as processing
        entry.status = 'processing';
        await this.put(entry);

        try {
          const response = await fetch(entry.endpoint, {
            method: entry.method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''}`,
              ...entry.headers,
            },
            body: JSON.stringify(entry.payload),
          });

          if (response.ok) {
            // Success: remove from queue
            await this.remove(entry.id);
            succeeded++;
          } else if (response.status >= 400 && response.status < 500) {
            // Client error: will never succeed on retry
            entry.status = 'failed';
            entry.lastAttempt = new Date().toISOString();
            entry.lastError = `HTTP ${response.status}: ${response.statusText}`;
            await this.put(entry);
            failed++;
          } else {
            // Server error: retry later
            await this.markForRetry(entry, `HTTP ${response.status}`);
            failed++;
          }
        } catch (err) {
          // Network error: retry later
          const message = err instanceof Error ? err.message : 'Network error';
          await this.markForRetry(entry, message);
          failed++;

          // If we're offline, stop processing
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            break;
          }
        }
      }

      this.lastProcessedAt = new Date().toISOString();
      const remaining = await this.getCount('pending');

      // If there are still pending items, schedule a retry
      if (remaining > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
        this.scheduleProcess(BASE_RETRY_DELAY * 5);
      }

      const result: QueueProcessResult = {
        processed: succeeded + failed,
        succeeded,
        failed,
        remaining,
        durationMs: Date.now() - startTime,
      };

      if (succeeded > 0 && import.meta.env.DEV) {
        console.log(
          `[OfflineQueue] Processed ${succeeded} items (${failed} failed, ${remaining} remaining)`,
        );
      }

      this.notifyChange();
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the current queue status.
   */
  async getQueueStatus(): Promise<QueueStatus> {
    this.ensureOpen();

    const all = await this.getAll();

    const pending = all.filter((e) => e.status === 'pending').length;
    const processing = all.filter((e) => e.status === 'processing').length;
    const failedCount = all.filter((e) => e.status === 'failed').length;

    const byPriority: Record<QueuePriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
    };

    for (const entry of all.filter((e) => e.status === 'pending')) {
      byPriority[entry.priority]++;
    }

    const sorted = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      pending,
      processing,
      failed: failedCount,
      total: all.length,
      lastProcessed: this.lastProcessedAt,
      oldestEntry: sorted.length > 0 ? sorted[0].createdAt : null,
      byPriority,
    };
  }

  /**
   * Register a listener for queue state changes.
   *
   * @param callback - Called when the queue changes
   * @returns Unsubscribe function
   */
  onQueueChange(callback: QueueChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Remove permanently failed items from the queue.
   *
   * @returns Number of items removed
   */
  async clearFailed(): Promise<number> {
    this.ensureOpen();
    const all = await this.getAll();
    const failed = all.filter((e) => e.status === 'failed');

    for (const entry of failed) {
      await this.remove(entry.id);
    }

    if (failed.length > 0) {
      this.notifyChange();
    }

    return failed.length;
  }

  /**
   * Retry all failed items by resetting their status.
   *
   * @returns Number of items queued for retry
   */
  async retryFailed(): Promise<number> {
    this.ensureOpen();
    const all = await this.getAll();
    const failed = all.filter((e) => e.status === 'failed');

    for (const entry of failed) {
      entry.status = 'pending';
      entry.retries = 0;
      entry.lastError = undefined;
      await this.put(entry);
    }

    if (failed.length > 0) {
      this.notifyChange();
      this.scheduleProcess(100);
    }

    return failed.length;
  }

  /**
   * Get all queue entries (for debugging / admin UI).
   */
  async getEntries(): Promise<QueueEntry[]> {
    return this.getAll();
  }

  /**
   * Remove a specific entry by ID.
   */
  async removeEntry(id: string): Promise<void> {
    await this.remove(id);
    this.notifyChange();
  }

  /**
   * Close the database and clean up listeners.
   */
  close(): void {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.listeners = [];
  }

  // --------------------------------------------------------------------------
  // Internal: IndexedDB Operations
  // --------------------------------------------------------------------------

  private ensureOpen(): void {
    if (!this.db) {
      throw new Error('[OfflineQueue] Database not open. Call open() first.');
    }
  }

  private put(entry: QueueEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private remove(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private getAll(): Promise<QueueEntry[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  private getAllPending(): Promise<QueueEntry[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const req = index.getAll('pending');
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  private getCount(status: QueueEntry['status']): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const req = index.count(status);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --------------------------------------------------------------------------
  // Internal: Retry & Scheduling
  // --------------------------------------------------------------------------

  private async markForRetry(entry: QueueEntry, error: string): Promise<void> {
    entry.retries++;
    entry.lastAttempt = new Date().toISOString();
    entry.lastError = error;

    if (entry.retries >= entry.maxRetries) {
      entry.status = 'failed';
      console.warn(
        `[OfflineQueue] ${entry.type} exceeded max retries (${entry.maxRetries}): ${error}`,
      );
    } else {
      entry.status = 'pending';
    }

    await this.put(entry);
  }

  private scheduleProcess(delayMs: number): void {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
    }
    this.processTimer = setTimeout(() => {
      this.processTimer = null;
      this.processQueue().catch((err) => {
        console.warn('[OfflineQueue] Auto-process error:', err);
      });
    }, delayMs);
  }

  private handleOnline = (): void => {
    if (import.meta.env.DEV) console.log('[OfflineQueue] Back online — processing queue');
    this.scheduleProcess(500);
  };

  // --------------------------------------------------------------------------
  // Internal: Notifications
  // --------------------------------------------------------------------------

  private notifyChange(): void {
    this.getQueueStatus()
      .then((status) => {
        for (const listener of this.listeners) {
          try {
            listener(status);
          } catch (err) {
            console.warn('[OfflineQueue] Listener error:', err);
          }
        }

        // Dispatch a DOM event for non-listener consumers
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('offline-queue-change', { detail: status }),
          );
        }
      })
      .catch(() => {
        // Notification failed — non-fatal
      });
  }
}

// ============================================================================
// Singleton + Dev Tools
// ============================================================================

let _instance: OfflineQueue | null = null;

/**
 * Get or create the shared OfflineQueue instance.
 * The instance is auto-opened on first access.
 */
export async function getOfflineQueue(): Promise<OfflineQueue> {
  if (!_instance) {
    _instance = new OfflineQueue();
    await _instance.open();
  }
  return _instance;
}

if (typeof window !== 'undefined') {
  // Expose for dev tools
  getOfflineQueue().then((queue) => {
    (window as unknown as Record<string, unknown>).__offlineQueue = queue;
  });
}
