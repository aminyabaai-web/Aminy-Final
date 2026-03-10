/**
 * useNetworkStatus Hook
 *
 * Provides real-time network connectivity and quality information using
 * the Navigator.connection API (Network Information API) with graceful
 * fallback for browsers that don't support it.
 *
 * Features:
 *   - Online/offline detection via navigator.onLine + events
 *   - Connection type and effective type via Navigator.connection
 *   - Estimated downlink bandwidth
 *   - Save-data preference detection
 *   - Debounced state changes (avoids rapid flip-flop)
 *   - onStatusChange callback for non-React consumers
 *
 * Usage:
 *   const { isOnline, effectiveType, downlink } = useNetworkStatus();
 *   if (!isOnline) showOfflineBanner();
 *   if (effectiveType === '2g') reduceBandwidthUsage();
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Network Information API connection types */
export type ConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'wifi'
  | 'wimax'
  | 'other'
  | 'none'
  | 'unknown';

/** Effective connection type (bandwidth-based classification) */
export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkStatus {
  /** Whether the device has network connectivity */
  isOnline: boolean;
  /** Physical connection type (wifi, cellular, ethernet, etc.) */
  connectionType: ConnectionType;
  /** Effective bandwidth classification (2g, 3g, 4g) */
  effectiveType: EffectiveType;
  /** Estimated downlink speed in Mbps (0 if unavailable) */
  downlink: number;
  /** Estimated round-trip time in ms (0 if unavailable) */
  rtt: number;
  /** Whether the user has requested reduced data usage */
  saveData: boolean;
  /** Timestamp of last status change */
  lastChanged: string;
}

export type NetworkStatusCallback = (status: NetworkStatus) => void;

export interface UseNetworkStatusOptions {
  /** Debounce delay for status changes in ms (default: 300) */
  debounceMs?: number;
  /** Callback fired on every status change (useful for logging/analytics) */
  onStatusChange?: NetworkStatusCallback;
}

// ============================================================================
// Navigator.connection type augmentation
// ============================================================================

interface NetworkInformation extends EventTarget {
  readonly type?: ConnectionType;
  readonly effectiveType?: EffectiveType;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  onchange?: EventListener;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}

// ============================================================================
// Helpers
// ============================================================================

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function buildStatus(): NetworkStatus {
  const connection = getConnection();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    isOnline,
    connectionType: connection?.type ?? 'unknown',
    effectiveType: connection?.effectiveType ?? 'unknown',
    downlink: connection?.downlink ?? 0,
    rtt: connection?.rtt ?? 0,
    saveData: connection?.saveData ?? false,
    lastChanged: new Date().toISOString(),
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useNetworkStatus(
  options: UseNetworkStatusOptions = {},
): NetworkStatus {
  const { debounceMs = 300, onStatusChange } = options;

  const [status, setStatus] = useState<NetworkStatus>(buildStatus);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const updateStatus = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const newStatus = buildStatus();

      setStatus((prev) => {
        // Only update if something actually changed
        if (
          prev.isOnline === newStatus.isOnline &&
          prev.connectionType === newStatus.connectionType &&
          prev.effectiveType === newStatus.effectiveType &&
          prev.downlink === newStatus.downlink &&
          prev.saveData === newStatus.saveData
        ) {
          return prev;
        }
        return newStatus;
      });

      if (onStatusChangeRef.current) {
        try {
          onStatusChangeRef.current(newStatus);
        } catch (err) {
          console.warn('[useNetworkStatus] Callback error:', err);
        }
      }
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Online/offline events
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Network Information API change event
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);

      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [updateStatus]);

  return status;
}

export default useNetworkStatus;
