// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useSupabaseSync — Generic localStorage-to-Supabase Sync Hook
 *
 * Provides a robust offline-first sync pattern:
 * 1. Reads from localStorage immediately (fast cold-start)
 * 2. Fetches from Supabase in background (authoritative cloud state)
 * 3. Merges cloud → local using configurable strategy
 * 4. Writes back to both on mutation
 *
 * Usage:
 *   const { data, setData, isSyncing, lastSyncedAt, syncNow } = useSupabaseSync<MyType>({
 *     table: 'user_preferences',
 *     localStorageKey: 'aminy-user-prefs',
 *     userIdColumn: 'user_id',
 *     defaultValue: { theme: 'light' },
 *     mergeStrategy: 'cloud-wins',
 *   });
 *
 * Designed for:
 * - Settings / preferences (theme, notification prefs, app config)
 * - Streak data (with streak-service as the primary sync layer)
 * - Junior session history
 * - Any user-scoped data that benefits from offline-first behavior
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────

export type MergeStrategy =
  /** Cloud data always wins on conflict (safest for settings) */
  | 'cloud-wins'
  /** Local data always wins on conflict (safest for drafts) */
  | 'local-wins'
  /** Use the most recently updated version */
  | 'latest-wins'
  /** Custom merge function */
  | 'custom';

export interface UseSupabaseSyncOptions<T> {
  /** Supabase table name */
  table: string;
  /** localStorage key for offline cache */
  localStorageKey: string;
  /** Column name that holds the user identifier (default: 'user_id') */
  userIdColumn?: string;
  /** Default value when no data exists anywhere */
  defaultValue: T;
  /** How to resolve conflicts between local and cloud data */
  mergeStrategy?: MergeStrategy;
  /** Custom merge function (required when mergeStrategy is 'custom') */
  customMerge?: (local: T, cloud: T) => T;
  /** Whether the record is a single row per user (default: true) */
  singleRow?: boolean;
  /** Column to use for "latest wins" comparison (default: 'updated_at') */
  timestampColumn?: string;
  /** Whether to auto-sync on mount (default: true) */
  autoSync?: boolean;
  /** Disable sync entirely (for when user is not authenticated) */
  disabled?: boolean;
}

export interface UseSupabaseSyncReturn<T> {
  /** Current data (merged local + cloud) */
  data: T;
  /** Update data (writes to both localStorage and Supabase) */
  setData: (updater: T | ((prev: T) => T)) => Promise<void>;
  /** Whether a sync operation is in progress */
  isSyncing: boolean;
  /** Last successful sync timestamp */
  lastSyncedAt: Date | null;
  /** Manually trigger a sync from cloud */
  syncNow: () => Promise<void>;
  /** Any error from the last sync attempt */
  error: string | null;
}

// ── Helper: Safe localStorage access ─────────────────────────────────

function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

// ── Helper: Get current user ID ──────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSupabaseSync<T>(
  options: UseSupabaseSyncOptions<T>
): UseSupabaseSyncReturn<T> {
  const {
    table,
    localStorageKey,
    userIdColumn = 'user_id',
    defaultValue,
    mergeStrategy = 'cloud-wins',
    customMerge,
    singleRow = true,
    timestampColumn = 'updated_at',
    autoSync = true,
    disabled = false,
  } = options;

  // State
  const [data, setDataState] = useState<T>(() => getLocalData(localStorageKey, defaultValue));
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures
  const dataRef = useRef(data);
  dataRef.current = data;

  // ── Merge logic ──────────────────────────────────────────────────

  const merge = useCallback(
    (local: T, cloud: T): T => {
      switch (mergeStrategy) {
        case 'cloud-wins':
          return cloud;
        case 'local-wins':
          return local;
        case 'latest-wins': {
          const localTs =
            local && typeof local === 'object' && timestampColumn in (local as Record<string, unknown>)
              ? new Date((local as Record<string, unknown>)[timestampColumn] as string).getTime()
              : 0;
          const cloudTs =
            cloud && typeof cloud === 'object' && timestampColumn in (cloud as Record<string, unknown>)
              ? new Date((cloud as Record<string, unknown>)[timestampColumn] as string).getTime()
              : 0;
          return cloudTs >= localTs ? cloud : local;
        }
        case 'custom':
          if (customMerge) return customMerge(local, cloud);
          return cloud;
        default:
          return cloud;
      }
    },
    [mergeStrategy, customMerge, timestampColumn]
  );

  // ── Sync from cloud ──────────────────────────────────────────────

  const syncFromCloud = useCallback(async (): Promise<void> => {
    if (disabled) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    setIsSyncing(true);
    setError(null);

    try {
      const query = supabase
        .from(table)
        .select('*')
        .eq(userIdColumn, userId);

      if (singleRow) {
        const { data: cloudData, error: fetchError } = await query.maybeSingle();
        if (fetchError) throw fetchError;

        if (cloudData) {
          const merged = merge(dataRef.current, cloudData as T);
          setDataState(merged);
          setLocalData(localStorageKey, merged);
        }
      } else {
        const { data: cloudData, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        if (cloudData && cloudData.length > 0) {
          const merged = merge(dataRef.current, cloudData as T);
          setDataState(merged);
          setLocalData(localStorageKey, merged);
        }
      }

      setLastSyncedAt(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      if (import.meta.env.DEV) {
        console.warn(`[useSupabaseSync] Sync failed for ${table}:`, message);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [disabled, table, userIdColumn, singleRow, merge, localStorageKey]);

  // ── Write to cloud + local ───────────────────────────────────────

  const setData = useCallback(
    async (updater: T | ((prev: T) => T)): Promise<void> => {
      const newValue =
        typeof updater === 'function'
          ? (updater as (prev: T) => T)(dataRef.current)
          : updater;

      // Optimistic local update
      setDataState(newValue);
      setLocalData(localStorageKey, newValue);
      dataRef.current = newValue;

      if (disabled) return;

      // Persist to Supabase
      const userId = await getCurrentUserId();
      if (!userId) return;

      try {
        if (singleRow) {
          const payload = {
            ...(typeof newValue === 'object' && newValue !== null ? newValue : { data: newValue }),
            [userIdColumn]: userId,
            updated_at: new Date().toISOString(),
          };

          const { error: upsertError } = await supabase
            .from(table)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(payload as any, { onConflict: userIdColumn });

          if (upsertError) throw upsertError;
        } else {
          // For array data, the caller should manage individual rows
          // This path handles bulk replacement
          const { error: upsertError } = await supabase
            .from(table)
            .upsert(
              newValue as Record<string, unknown>[],
              { onConflict: 'id' }
            );

          if (upsertError) throw upsertError;
        }

        setLastSyncedAt(new Date());
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Write failed';
        setError(message);
        if (import.meta.env.DEV) {
          console.warn(`[useSupabaseSync] Write failed for ${table}:`, message);
        }
        // Data is still saved locally — will sync next time
      }
    },
    [disabled, table, userIdColumn, singleRow, localStorageKey]
  );

  // ── Auto-sync on mount ───────────────────────────────────────────

  useEffect(() => {
    if (autoSync && !disabled) {
      syncFromCloud();
    }
  }, [autoSync, disabled, syncFromCloud]);

  // ── Listen for auth state changes ────────────────────────────────

  useEffect(() => {
    if (disabled) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        syncFromCloud();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [disabled, syncFromCloud]);

  return {
    data,
    setData,
    isSyncing,
    lastSyncedAt,
    syncNow: syncFromCloud,
    error,
  };
}

// ── Convenience: Typed presets for common sync targets ────────────────

/**
 * Sync user preferences (theme, language, notification settings)
 */
export function usePreferencesSync<T extends Record<string, unknown>>(
  defaultValue: T
) {
  return useSupabaseSync<T>({
    table: 'user_preferences',
    localStorageKey: 'aminy-user-preferences',
    defaultValue,
    mergeStrategy: 'cloud-wins',
    singleRow: true,
  });
}

/**
 * Sync streak data with cloud
 */
export function useStreakSync<T extends Record<string, unknown>>(
  defaultValue: T
) {
  return useSupabaseSync<T>({
    table: 'user_streaks',
    localStorageKey: 'aminy-streak-data',
    defaultValue,
    mergeStrategy: 'latest-wins',
    singleRow: true,
    timestampColumn: 'updated_at',
  });
}

/**
 * Sync vault document list
 */
export function useVaultSync<T extends Record<string, unknown>[]>(
  defaultValue: T
) {
  return useSupabaseSync<T>({
    table: 'vault_documents',
    localStorageKey: 'aminy-vault-cache',
    defaultValue,
    mergeStrategy: 'cloud-wins',
    singleRow: false,
  });
}

export default useSupabaseSync;
