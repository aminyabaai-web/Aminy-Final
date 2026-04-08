// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Background Sync Hook
 *
 * Queues failed mutations (behavior logs, Junior results, conversation messages)
 * in IndexedDB and retries when connectivity returns.
 *
 * Uses the Background Sync API when available, falls back to
 * online/offline event listeners + periodic retry.
 *
 * Storage: IndexedDB (async, high-capacity, works in service workers).
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ---- Types ----

export type SyncAction =
  | 'behavior_log'
  | 'junior_result'
  | 'conversation'
  | 'routine_completion'
  | 'care_plan_update';

export interface SyncQueueItem {
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

// ---- Constants ----

const DB_NAME = 'aminy-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-mutations';
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 30_000; // 30 seconds

// ---- IndexedDB Helpers ----

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('action', 'action', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

async function addToQueue(
  item: Omit<SyncQueueItem, 'id' | 'retries' | 'createdAt' | 'maxRetries'>
): Promise<number> {
  const db = await openDB();
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    retries: 0,
    maxRetries: MAX_RETRIES,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(entry);

    // Count total items after adding
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => reject(countReq.error);
    tx.oncomplete = () => db.close();
  });
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function updateRetry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as SyncQueueItem | undefined;
      if (!item) {
        resolve();
        return;
      }

      item.retries += 1;
      item.lastAttempt = new Date().toISOString();

      if (item.retries > item.maxRetries) {
        // Exceeded max retries -- discard
        store.delete(id);
      } else {
        store.put(item);
      }
      resolve();
    };

    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

// ---- Sync Processing ----

async function processQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        await removeFromQueue(item.id);
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error -- will never succeed on retry, remove
        await removeFromQueue(item.id);
        failed++;
      } else {
        // Server error -- retry later
        await updateRetry(item.id);
        failed++;
      }
    } catch {
      // Network error -- retry later
      await updateRetry(item.id);
      failed++;
    }
  }

  const remaining = await getQueue();
  return { synced, failed, remaining: remaining.length };
}

// ---- Hook ----

export function useBackgroundSync() {
  const processingRef = useRef(false);

  const processSync = useCallback(async () => {
    if (processingRef.current || !navigator.onLine) return;
    processingRef.current = true;

    try {
      const result = await processQueue();
      if (result.synced > 0) {
        window.dispatchEvent(
          new CustomEvent('sync-completed', { detail: result })
        );
      }
    } finally {
      processingRef.current = false;
    }
  }, []);

  const queueMutation = useCallback(
    (
      action: SyncAction,
      endpoint: string,
      payload: Record<string, unknown>,
      method: 'POST' | 'PUT' | 'PATCH' = 'POST'
    ): { queued: boolean; queueLength: Promise<number> } => {
      const lengthPromise = addToQueue({ action, endpoint, payload, method });

      // If online, try immediately
      if (navigator.onLine) {
        setTimeout(processSync, 100);
      }

      // Register Background Sync API if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then((reg) => {
            (
              reg as unknown as {
                sync: { register: (tag: string) => Promise<void> };
              }
            ).sync
              .register('aminy-background-sync')
              .catch(() => {});
          })
          .catch(() => {});
      }

      return { queued: true, queueLength: lengthPromise };
    },
    [processSync]
  );

  const getQueueStatus = useCallback(async () => {
    const queue = await getQueue();
    return {
      pending: queue.length,
      items: queue.map(({ id, action, retries, createdAt }) => ({
        id,
        action,
        retries,
        createdAt,
      })),
    };
  }, []);

  // Listen for online events + periodic retry
  useEffect(() => {
    window.addEventListener('online', processSync);

    const interval = setInterval(async () => {
      const queue = await getQueue();
      if (navigator.onLine && queue.length > 0) {
        processSync();
      }
    }, RETRY_INTERVAL_MS);

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

// ---- Online Status Hook ----

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    // Load initial pending count
    getQueue().then((q) => setPendingSyncs(q.length));

    const handleOnline = () => {
      setOnline(true);
      getQueue().then((q) => setPendingSyncs(q.length));
    };
    const handleOffline = () => {
      setOnline(false);
      getQueue().then((q) => setPendingSyncs(q.length));
    };
    const handleSyncComplete = () => {
      getQueue().then((q) => setPendingSyncs(q.length));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-completed', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncComplete);
    };
  }, []);

  return { isOnline: online, pendingSyncs };
}

export default useBackgroundSync;
