// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useOfflineSync Hook
 *
 * React hook for offline-first data management
 * Provides sync status, pending items, and storage info
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initOfflineSync,
  cleanupOfflineSync,
  processSyncQueue,
  getSyncQueueCount,
  getStorageInfo,
  getPendingSyncItems,
  SyncQueueItem,
} from '../lib/offline-sync';

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  storageInfo: {
    used: number;
    available: number;
    profiles: number;
    routines: number;
    progress: number;
    pendingSync: number;
  } | null;
}

interface UseOfflineSyncReturn extends OfflineSyncState {
  syncNow: () => Promise<void>;
  getPendingItems: () => Promise<SyncQueueItem[]>;
  refreshStorageInfo: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    storageInfo: null,
  });

  // Initialize offline sync on mount
  useEffect(() => {
    initOfflineSync();

    // Initial load of pending count and storage info
    loadPendingCount();
    loadStorageInfo();

    return () => {
      cleanupOfflineSync();
    };
  }, []);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      // Trigger sync when coming online
      syncNow();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      const count = await getSyncQueueCount();
      setState((prev) => ({ ...prev, pendingCount: count }));
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await getStorageInfo();
      setState((prev) => ({ ...prev, storageInfo: info }));
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await processSyncQueue();
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.remaining,
        lastSyncTime: new Date(),
      }));

      // Refresh storage info after sync
      await loadStorageInfo();
    } catch (error) {
      console.error('Sync failed:', error);
      setState((prev) => ({ ...prev, isSyncing: false }));
    }
  }, []);

  const getPendingItems = useCallback(async (): Promise<SyncQueueItem[]> => {
    return getPendingSyncItems();
  }, []);

  const refreshStorageInfo = useCallback(async (): Promise<void> => {
    await loadStorageInfo();
    await loadPendingCount();
  }, []);

  return {
    ...state,
    syncNow,
    getPendingItems,
    refreshStorageInfo,
  };
}

/**
 * useOnlineStatus Hook
 *
 * Simple hook for tracking online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOfflineSync;
