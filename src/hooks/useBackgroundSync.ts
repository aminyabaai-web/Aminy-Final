/**
 * Background Sync Hook
 *
 * Queues failed mutations (behavior logs, Junior results, conversation messages)
 * in IndexedDB and retries when connectivity returns.
 *
 * Uses the Background Sync API when available, falls back to
 * online/offline event listeners + periodic retry.
 */

import { useEffect, useCallback, useRef } from 'react';

// Sync queue types
export type SyncAction = 'behavior_log' | 'junior_result' | 'conversation' | 'routine_completion' | 'care_plan_update';

interface SyncQueueItem {
  id: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  retries: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
}

const SYNC_QUEUE_KEY = 'aminy_sync_queue';
const MAX_RETRIES = 5;

// ---- Queue Management (localStorage-based, upgradeable to IndexedDB) ----

function getQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncQueueItem[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(item: Omit<SyncQueueItem, 'id' | 'retries' | 'createdAt' | 'maxRetries'>) {
  const queue = getQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    retries: 0,
    maxRetries: MAX_RETRIES,
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
  return queue.length;
}

function removeFromQueue(id: string) {
  const queue = getQueue().filter(item => item.id !== id);
  saveQueue(queue);
}

function updateRetry(id: string) {
  const queue = getQueue().map(item =>
    item.id === id
      ? { ...item, retries: item.retries + 1, lastAttempt: new Date().toISOString() }
      : item
  );
  // Remove items that exceeded max retries
  const filtered = queue.filter(item => item.retries <= item.maxRetries);
  saveQueue(filtered);
}

// ---- Sync Processing ----

async function processQueue(): Promise<{ synced: number; failed: number; remaining: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        removeFromQueue(item.id);
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error — remove (won't succeed on retry)
        removeFromQueue(item.id);
        failed++;
      } else {
        // Server error — retry later
        updateRetry(item.id);
        failed++;
      }
    } catch {
      // Network error — retry later
      updateRetry(item.id);
      failed++;
    }
  }

  return { synced, failed, remaining: getQueue().length };
}

// ---- Hook ----

export function useBackgroundSync() {
  const processingRef = useRef(false);

  // Process queue when coming online
  const processSync = useCallback(async () => {
    if (processingRef.current || !navigator.onLine) return;
    processingRef.current = true;

    try {
      const result = await processQueue();
      if (result.synced > 0) {
        window.dispatchEvent(new CustomEvent('sync-completed', { detail: result }));
      }
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Queue a mutation for background sync
  const queueMutation = useCallback((
    action: SyncAction,
    endpoint: string,
    payload: Record<string, unknown>,
    method: 'POST' | 'PUT' | 'PATCH' = 'POST'
  ): { queued: boolean; queueLength: number } => {
    const length = addToQueue({ action, endpoint, payload, method });

    // If online, try immediately
    if (navigator.onLine) {
      setTimeout(processSync, 100);
    }

    // Register background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        (reg as unknown as { sync: { register: (tag: string) => Promise<void> } })
          .sync.register('aminy-background-sync').catch(() => {});
      });
    }

    return { queued: true, queueLength: length };
  }, [processSync]);

  // Get current queue status
  const getQueueStatus = useCallback(() => {
    const queue = getQueue();
    return {
      pending: queue.length,
      items: queue.map(({ id, action, retries, createdAt }) => ({
        id, action, retries, createdAt,
      })),
    };
  }, []);

  // Listen for online events
  useEffect(() => {
    window.addEventListener('online', processSync);

    // Also retry periodically (every 30s)
    const interval = setInterval(() => {
      if (navigator.onLine && getQueue().length > 0) {
        processSync();
      }
    }, 30000);

    // Process on mount if online
    if (navigator.onLine) {
      processSync();
    }

    return () => {
      window.removeEventListener('online', processSync);
      clearInterval(interval);
    };
  }, [processSync]);

  return {
    queueMutation,
    processSync,
    getQueueStatus,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

/**
 * Offline indicator component data
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncs, setPendingSyncs] = useState(getQueue().length);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setPendingSyncs(getQueue().length); };
    const handleOffline = () => { setIsOnline(false); setPendingSyncs(getQueue().length); };
    const handleSyncComplete = () => { setPendingSyncs(getQueue().length); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-completed', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncComplete);
    };
  }, []);

  return { isOnline, pendingSyncs };
}

// Need useState for useOnlineStatus
import { useState } from 'react';

export default useBackgroundSync;
