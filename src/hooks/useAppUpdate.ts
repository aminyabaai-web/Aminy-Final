// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useAppUpdate Hook
 *
 * Detects service worker updates and provides a clean API for the UI
 * to display an update notification and trigger the update.
 *
 * Extracts the detection logic from UpdateBanner into a reusable hook
 * so any component (toast, banner, modal) can respond to updates.
 *
 * Detection strategy:
 *   1. Check for an already-waiting service worker on mount
 *   2. Listen for `updatefound` events on the registration
 *   3. Poll for updates every 5 minutes (catches quiet/push updates)
 *   4. On `applyUpdate()`, send SKIP_WAITING to the new SW and reload
 *
 * Usage:
 *   const { updateAvailable, applyUpdate, dismissUpdate } = useAppUpdate();
 *   if (updateAvailable) { ... }
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AppUpdateState {
  /** Whether a new service worker version is waiting to activate */
  updateAvailable: boolean;
  /** Whether the user has dismissed the current update notification */
  dismissed: boolean;
  /** Whether the update is currently being applied (reload in progress) */
  applying: boolean;
  /** Timestamp when the update was first detected */
  detectedAt: string | null;
}

export interface UseAppUpdateReturn {
  /** True when a new version is ready and not dismissed */
  updateAvailable: boolean;
  /** True while the update is being applied (skip-waiting + reload) */
  applying: boolean;
  /** Timestamp when the update was detected (ISO 8601) */
  detectedAt: string | null;
  /** Trigger the update: sends SKIP_WAITING to the new SW, then reloads */
  applyUpdate: () => void;
  /** Dismiss the update notification (re-appears on next detection) */
  dismissUpdate: () => void;
  /** Manually check for updates (triggers registration.update()) */
  checkForUpdate: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

/** How often to poll for SW updates (ms) */
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Hook
// ============================================================================

export function useAppUpdate(): UseAppUpdateReturn {
  const [state, setState] = useState<AppUpdateState>({
    updateAvailable: false,
    dismissed: false,
    applying: false,
    detectedAt: null,
  });

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // ---- Setup update detection ----
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let checkInterval: ReturnType<typeof setInterval>;

    function onWaitingFound(sw: ServiceWorker) {
      waitingWorkerRef.current = sw;
      setState((prev) => ({
        ...prev,
        updateAvailable: true,
        dismissed: false,
        detectedAt: prev.detectedAt ?? new Date().toISOString(),
      }));
    }

    async function setup() {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      registrationRef.current = registration;

      // 1. Already-waiting worker (e.g., detected before this mount)
      if (registration.waiting) {
        onWaitingFound(registration.waiting);
      }

      // 2. Listen for new service workers being installed
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            onWaitingFound(installing);
          }
        });
      });

      // 3. Poll for updates
      checkInterval = setInterval(() => {
        registration.update().catch(() => {
          // Update check failed (offline, etc.) — silent
        });
      }, UPDATE_CHECK_INTERVAL);
    }

    setup().catch(() => {
      // SW setup failed — non-fatal
    });

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // ---- Apply update ----
  const applyUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, applying: true }));

    const waitingWorker = waitingWorkerRef.current;

    if (!waitingWorker) {
      // No waiting worker — fallback to hard reload
      window.location.reload();
      return;
    }

    // Listen for the new SW to take control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Tell the waiting SW to activate immediately
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    // Safety net: if controllerchange doesn't fire within 3s, reload anyway
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }, []);

  // ---- Dismiss notification ----
  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, dismissed: true }));
  }, []);

  // ---- Manual check ----
  const checkForUpdate = useCallback(async () => {
    if (!registrationRef.current) {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          registrationRef.current = reg;
        }
      }
    }

    if (registrationRef.current) {
      await registrationRef.current.update();
    }
  }, []);

  return {
    updateAvailable: state.updateAvailable && !state.dismissed,
    applying: state.applying,
    detectedAt: state.detectedAt,
    applyUpdate,
    dismissUpdate,
    checkForUpdate,
  };
}

export default useAppUpdate;
