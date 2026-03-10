/**
 * UpdateBanner
 *
 * Shows an "Update available" toast when a new service worker is waiting.
 * The "Refresh" button sends SKIP_WAITING to the new SW, which triggers
 * a `controllerchange` event and reloads the page.
 *
 * Detection strategy:
 *   1. On mount, check if a SW is already waiting
 *   2. Listen for `updatefound` on the active registration
 *   3. When the installing SW moves to `waiting`, show the banner
 *   4. Also poll for updates every 5 minutes (in case push/quiet updates)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let updateCheckInterval: ReturnType<typeof setInterval>;

    async function setupUpdateDetection() {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // Helper: when a waiting worker is detected
      function onWaitingFound(sw: ServiceWorker) {
        waitingWorkerRef.current = sw;
        setUpdateAvailable(true);
      }

      // 1. Check if there's already a waiting worker (e.g., from a previous page load)
      if (registration.waiting) {
        onWaitingFound(registration.waiting);
      }

      // 2. Listen for new service workers being installed
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          // When the new SW reaches `waiting`, it's ready to activate
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            onWaitingFound(installing);
          }
        });
      });

      // 3. Poll for updates every 5 minutes
      updateCheckInterval = setInterval(() => {
        registration.update().catch(() => {
          // Update check failed (offline, etc.) — silent
        });
      }, 5 * 60 * 1000);
    }

    setupUpdateDetection().catch(() => {
      // SW detection setup failed — non-fatal
    });

    return () => {
      if (updateCheckInterval) clearInterval(updateCheckInterval);
    };
  }, []);

  // When user clicks "Refresh", tell the waiting SW to skip waiting.
  // Once it activates, the `controllerchange` event fires and we reload.
  const handleUpdate = useCallback(() => {
    const waitingWorker = waitingWorkerRef.current;
    if (!waitingWorker) {
      // Fallback: just reload
      window.location.reload();
      return;
    }

    // Listen for the new SW to take control, then reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Tell the waiting SW to activate
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-blue-50 border-b border-blue-200 px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 flex-1">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-medium text-blue-900">
            A new version of Aminy is available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateBanner;
