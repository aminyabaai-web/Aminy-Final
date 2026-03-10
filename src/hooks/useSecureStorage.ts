/**
 * useSecureStorage — React hook for encrypted localStorage
 *
 * Routes sensitive keys through encryptedStorage (AES-GCM 256-bit),
 * non-sensitive keys through plain localStorage.
 *
 * Usage:
 *   const [value, setValue, removeValue] = useSecureStorage<UserProfile>('aminy-user');
 *
 * The hook is synchronous for reads (uses SyncEncryptedStorage cache)
 * and fire-and-forget async for writes (encryption happens in background).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { syncEncryptedStorage, SENSITIVE_KEYS } from '../lib/security/encrypted-storage';

// ============================================================================
// ZUSTAND STORAGE ADAPTER
// ============================================================================

/**
 * Drop-in replacement for Zustand's createJSONStorage(() => localStorage)
 * Routes through syncEncryptedStorage for automatic PHI encryption.
 *
 * Usage in store.ts:
 *   import { secureZustandStorage } from '../hooks/useSecureStorage';
 *   persist(storeCreator, { storage: secureZustandStorage })
 */
export const secureZustandStorage = {
  getItem: (name: string): string | null => {
    return syncEncryptedStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    syncEncryptedStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    syncEncryptedStorage.removeItem(name);
  },
};

// ============================================================================
// REACT HOOK
// ============================================================================

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * React hook for type-safe encrypted storage access.
 *
 * - Sensitive keys (matching SENSITIVE_KEYS prefixes) are AES-GCM encrypted
 * - Non-sensitive keys use plain localStorage
 * - Reads are synchronous (from SyncEncryptedStorage cache)
 * - Writes are fire-and-forget async (encryption in background)
 *
 * @param key Storage key
 * @param initialValue Default value if key doesn't exist
 * @returns [value, setValue, removeValue]
 */
export function useSecureStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void] {
  const initialValueRef = useRef(initialValue);

  // Read initial value from storage (sync via cache)
  const readValue = useCallback((): T => {
    try {
      const raw = syncEncryptedStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch (error) {
      console.warn(`useSecureStorage: failed to read "${key}"`, error);
    }
    return initialValueRef.current;
  }, [key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Write to storage when value changes
  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        const valueToStore =
          value instanceof Function ? value(readValue()) : value;
        setStoredValue(valueToStore);
        syncEncryptedStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`useSecureStorage: failed to write "${key}"`, error);
      }
    },
    [key, readValue]
  );

  // Remove from storage
  const removeValue = useCallback(() => {
    try {
      syncEncryptedStorage.removeItem(key);
      setStoredValue(initialValueRef.current);
    } catch (error) {
      console.error(`useSecureStorage: failed to remove "${key}"`, error);
    }
  }, [key]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key || e.key === `enc_${key}`) {
        setStoredValue(readValue());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}

// ============================================================================
// UTILITY — Check if a key is sensitive
// ============================================================================

export function isSensitiveStorageKey(key: string): boolean {
  return SENSITIVE_KEYS.some((prefix) => key.startsWith(prefix));
}

export default useSecureStorage;
