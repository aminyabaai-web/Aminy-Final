/**
 * Background Sync Manager
 *
 * Extends the OfflineQueue with service worker Background Sync API
 * integration, providing true offline-first capability:
 *
 *   - Registers service worker sync events for automatic retry
 *   - Queues failed API calls with priority-based processing
 *   - Conflict resolution with last-write-wins + timestamp strategy
 *   - Syncs when connectivity returns (even if app is backgrounded)
 *
 * Sync priorities:
 *   critical — Auth tokens, billing operations (processed first, more retries)
 *   high     — Appointments, messages, care plan updates
 *   normal   — Analytics, preferences, non-urgent data
 *
 * Architecture:
 *   - Builds on top of the existing OfflineQueue (IndexedDB persistence)
 *   - Registers Background Sync tags with the service worker
 *   - Falls back to online/offline event listeners when Background Sync
 *     is not available (Safari, Firefox)
 *   - Fires custom events for UI sync indicators
 *
 * Usage:
 *   import { BackgroundSyncManager, getBackgroundSyncManager } from './background-sync';
 *   const sync = await getBackgroundSyncManager();
 *   await sync.queue({ tag: 'appointment-update', endpoint: '/api/...', payload: {...} });
 *   const status = await sync.getQueueStatus();
 */

import {
  OfflineQueue,
  getOfflineQueue,
  type QueuePriority,
  type QueueStatus,
  type QueueProcessResult,
  type QueueAction,
  type QueueEntry,
} from './offline-queue';

// ============================================================================
// Service Worker Type Augmentation
// ============================================================================

/** Minimal type for SW global scope — full types live in @types/serviceworker */
interface SWGlobalScope {
  clients: {
    matchAll(options?: { type?: string }): Promise<SWClient[]>;
    openWindow?(url: string): Promise<SWClient | null>;
  };
  registration: { showNotification(title: string, options?: NotificationOptions): Promise<void> };
}

interface SWClient {
  postMessage(message: unknown): void;
  focus?(): Promise<SWClient>;
}

// ============================================================================
// Types
// ============================================================================

export type SyncTag =
  | 'aminy-sync-critical'
  | 'aminy-sync-high'
  | 'aminy-sync-normal';

export interface SyncItem {
  /** Unique tag for this sync operation */
  tag?: string;
  /** API endpoint to call */
  endpoint: string;
  /** HTTP method (default: POST) */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request payload */
  payload: Record<string, unknown>;
  /** Sync priority (inferred from type if not provided) */
  priority?: QueuePriority;
  /** Action type for the offline queue */
  type?: QueueAction['type'];
  /** Optional headers */
  headers?: Record<string, string>;
  /** Timestamp for conflict resolution (default: now) */
  timestamp?: string;
}

export interface ConflictResolution {
  /** Strategy for handling conflicts */
  strategy: 'last-write-wins' | 'server-wins' | 'manual';
  /** Timestamp of the local change */
  localTimestamp: string;
  /** Timestamp of the server version (if known) */
  serverTimestamp?: string;
  /** Whether the local version should be applied */
  applyLocal: boolean;
}

export interface SyncStatus extends QueueStatus {
  /** Whether Background Sync API is supported */
  backgroundSyncSupported: boolean;
  /** Whether a sync is currently registered with the SW */
  syncRegistered: boolean;
  /** Whether the app is currently online */
  isOnline: boolean;
  /** Timestamp of the last successful sync */
  lastSyncAt: string | null;
}

export type SyncEventCallback = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'item-synced' | 'item-failed' | 'conflict';
  detail: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

const SYNC_TAGS: Record<QueuePriority, SyncTag> = {
  critical: 'aminy-sync-critical',
  high: 'aminy-sync-high',
  normal: 'aminy-sync-normal',
};

const DOM_EVENT_NAME = 'aminy-background-sync';

const STORAGE_KEY_LAST_SYNC = 'aminy-last-sync-at';

/** Minimum interval between sync attempts (ms) */
const MIN_SYNC_INTERVAL = 5_000;

// ============================================================================
// BackgroundSyncManager
// ============================================================================

export class BackgroundSyncManager {
  private offlineQueue: OfflineQueue | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: SyncEventCallback[] = [];
  private backgroundSyncSupported = false;
  private lastSyncAt: string | null = null;
  private syncInProgress = false;
  private syncRegistered = false;
  private initialized = false;

  /**
   * Initialize the sync manager.
   * Must be called before any other method.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Get the shared offline queue
    this.offlineQueue = await getOfflineQueue();

    // Check for Background Sync support
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        // Check if SyncManager is available
        this.backgroundSyncSupported = 'sync' in this.registration;
      } catch {
        // Service worker not available
        this.backgroundSyncSupported = false;
      }
    }

    // Load last sync timestamp
    try {
      this.lastSyncAt = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    } catch {
      // localStorage unavailable
    }

    // Listen for online events as fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }

    // Listen for messages from service worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage);
    }

    this.initialized = true;
    console.log(
      `[BackgroundSync] Initialized (Background Sync: ${this.backgroundSyncSupported ? 'supported' : 'fallback mode'})`,
    );
  }

  /**
   * Register a sync event with the service worker.
   *
   * @param priority - The priority level determines the sync tag
   */
  async register(priority: QueuePriority = 'normal'): Promise<void> {
    if (!this.backgroundSyncSupported || !this.registration) {
      // Fallback: process immediately if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await this.processQueue();
      }
      return;
    }

    try {
      const tag = SYNC_TAGS[priority];
      // TypeScript doesn't include SyncManager types by default
      const reg = this.registration as ServiceWorkerRegistration & {
        sync: { register(tag: string): Promise<void> };
      };
      await reg.sync.register(tag);
      this.syncRegistered = true;
      console.log(`[BackgroundSync] Registered sync: ${tag}`);
    } catch (err) {
      console.warn('[BackgroundSync] Failed to register sync:', err);
      // Fallback: try immediate processing
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await this.processQueue();
      }
    }
  }

  /**
   * Queue an item for background sync.
   *
   * @param item - The sync item to queue
   * @returns The created queue entry
   */
  async queue(item: SyncItem): Promise<QueueEntry> {
    this.ensureInitialized();

    const priority = item.priority ?? 'normal';

    // Add timestamp for conflict resolution
    const payload = {
      ...item.payload,
      _syncTimestamp: item.timestamp ?? new Date().toISOString(),
      _syncTag: item.tag,
    };

    const entry = await this.offlineQueue!.enqueue({
      type: item.type ?? 'preference_sync',
      endpoint: item.endpoint,
      method: item.method ?? 'POST',
      payload,
      priority,
      headers: item.headers,
    });

    // Register a background sync for this priority
    await this.register(priority);

    return entry;
  }

  /**
   * Process all queued items.
   *
   * @returns Processing results
   */
  async processQueue(): Promise<QueueProcessResult> {
    this.ensureInitialized();

    if (this.syncInProgress) {
      return { processed: 0, succeeded: 0, failed: 0, remaining: 0, durationMs: 0 };
    }

    this.syncInProgress = true;
    this.emitEvent({ type: 'sync-start', detail: {}, timestamp: new Date().toISOString() });

    try {
      const result = await this.offlineQueue!.processQueue();

      const now = new Date().toISOString();
      this.lastSyncAt = now;

      try {
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, now);
      } catch {
        // localStorage unavailable
      }

      this.emitEvent({
        type: 'sync-complete',
        detail: {
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          remaining: result.remaining,
          durationMs: result.durationMs,
        },
        timestamp: now,
      });

      return result;
    } catch (err) {
      this.emitEvent({
        type: 'sync-error',
        detail: { error: err instanceof Error ? err.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get the current sync queue status.
   */
  async getQueueStatus(): Promise<SyncStatus> {
    this.ensureInitialized();

    const queueStatus = await this.offlineQueue!.getQueueStatus();

    return {
      ...queueStatus,
      backgroundSyncSupported: this.backgroundSyncSupported,
      syncRegistered: this.syncRegistered,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncAt: this.lastSyncAt,
    };
  }

  /**
   * Resolve a conflict using last-write-wins strategy.
   *
   * @param localTimestamp - Timestamp of local change
   * @param serverTimestamp - Timestamp of server version
   * @returns Resolution decision
   */
  resolveConflict(localTimestamp: string, serverTimestamp?: string): ConflictResolution {
    const localTime = new Date(localTimestamp).getTime();
    const serverTime = serverTimestamp ? new Date(serverTimestamp).getTime() : 0;

    const applyLocal = localTime >= serverTime;

    const resolution: ConflictResolution = {
      strategy: 'last-write-wins',
      localTimestamp,
      serverTimestamp,
      applyLocal,
    };

    this.emitEvent({
      type: 'conflict',
      detail: {
        resolution: resolution.strategy,
        localTimestamp,
        serverTimestamp,
        applyLocal,
      },
      timestamp: new Date().toISOString(),
    });

    return resolution;
  }

  /**
   * Register a listener for sync events.
   *
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  onSyncEvent(callback: SyncEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Get all entries in the queue (for debugging / admin UI).
   */
  async getEntries(): Promise<QueueEntry[]> {
    this.ensureInitialized();
    return this.offlineQueue!.getEntries();
  }

  /**
   * Clear all failed items from the queue.
   */
  async clearFailed(): Promise<number> {
    this.ensureInitialized();
    return this.offlineQueue!.clearFailed();
  }

  /**
   * Retry all failed items.
   */
  async retryFailed(): Promise<number> {
    this.ensureInitialized();
    const count = await this.offlineQueue!.retryFailed();
    if (count > 0) {
      await this.register('normal');
    }
    return count;
  }

  /**
   * Clean up listeners and resources.
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.handleSWMessage);
    }

    this.listeners = [];
    this.initialized = false;
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private ensureInitialized(): void {
    if (!this.initialized || !this.offlineQueue) {
      throw new Error('[BackgroundSync] Not initialized. Call initialize() first.');
    }
  }

  private handleOnline = (): void => {
    console.log('[BackgroundSync] Back online — triggering sync');
    // Small delay to let network stabilize
    setTimeout(() => {
      this.processQueue().catch((err) => {
        console.warn('[BackgroundSync] Auto-sync error:', err);
      });
    }, MIN_SYNC_INTERVAL);
  };

  private handleSWMessage = (event: MessageEvent): void => {
    if (!event.data) return;

    const { type, tag, result } = event.data as {
      type?: string;
      tag?: string;
      result?: Record<string, unknown>;
    };

    if (type === 'SYNC_COMPLETE' && tag) {
      console.log(`[BackgroundSync] SW sync complete: ${tag}`, result);
      this.emitEvent({
        type: 'sync-complete',
        detail: { tag, ...result },
        timestamp: new Date().toISOString(),
      });
    }
  };

  private emitEvent(event: SyncEvent): void {
    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[BackgroundSync] Listener error:', err);
      }
    }

    // Dispatch DOM event for non-listener consumers
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(DOM_EVENT_NAME, { detail: event }),
      );
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: BackgroundSyncManager | null = null;

/**
 * Get or create the shared BackgroundSyncManager instance.
 */
export async function getBackgroundSyncManager(): Promise<BackgroundSyncManager> {
  if (!_instance) {
    _instance = new BackgroundSyncManager();
    await _instance.initialize();
  }
  return _instance;
}

// ============================================================================
// Service Worker Sync Handler
//
// This function should be called from inside the service worker's `sync`
// event listener. It is exported so the SW can import it.
// ============================================================================

/**
 * Handle a Background Sync event inside the service worker.
 * Import this in your service worker:
 *
 *   import { handleBackgroundSync } from './background-sync';
 *   self.addEventListener('sync', (event) => {
 *     event.waitUntil(handleBackgroundSync(event.tag));
 *   });
 */
export async function handleBackgroundSync(tag: string): Promise<void> {
  console.log(`[BackgroundSync SW] Processing sync tag: ${tag}`);

  const queue = new OfflineQueue();
  await queue.open();

  try {
    const result = await queue.processQueue();
    console.log(`[BackgroundSync SW] Sync complete:`, result);

    // Notify the client
    if (typeof self !== 'undefined' && 'clients' in self) {
      const sw = self as unknown as SWGlobalScope;
      const clients = await sw.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          tag,
          result: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            remaining: result.remaining,
          },
        });
      }
    }
  } finally {
    queue.close();
  }
}

export default BackgroundSyncManager;
