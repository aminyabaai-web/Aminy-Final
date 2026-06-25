// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Offline Indicator
 *
 * Shows a banner when the user goes offline with:
 *   - Pending sync count (from useBackgroundSync queue)
 *   - Quick access to crisis resources (always cached)
 *   - Brief "Back online" toast when connectivity returns
 *   - Syncing status when reconnection triggers queue processing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, Phone, ChevronRight, X, RefreshCw } from 'lucide-react';

// ---- Sync queue helpers (reads from the same localStorage key as useBackgroundSync) ----

const SYNC_QUEUE_KEY = 'aminy_sync_queue';

function getPendingSyncCount(): number {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return 0;
    const queue = JSON.parse(raw);
    return Array.isArray(queue) ? queue.length : 0;
  } catch {
    return 0;
  }
}

// ---- Component ----

interface OfflineIndicatorProps {
  onCrisisResourcesClick?: () => void;
}

export function OfflineIndicator({ onCrisisResourcesClick }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(getPendingSyncCount);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh pending count periodically while offline
  const refreshPendingCount = useCallback(() => {
    setPendingSyncs(getPendingSyncCount());
  }, []);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let pendingInterval: ReturnType<typeof setInterval>;

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setIsSyncing(true);

      // Show "Back online — syncing..." briefly, then "Back online"
      setShowReconnected(true);
      reconnectTimeout = setTimeout(() => {
        setShowReconnected(false);
        setIsSyncing(false);
      }, 3000);

      // Refresh count after a short delay (queue processing is async)
      setTimeout(refreshPendingCount, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
      refreshPendingCount();
    };

    const handleSyncCompleted = () => {
      refreshPendingCount();
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-completed', handleSyncCompleted);

    // Poll pending count every 5s while offline
    pendingInterval = setInterval(() => {
      if (!navigator.onLine) {
        refreshPendingCount();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncCompleted);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pendingInterval);
    };
  }, [refreshPendingCount]);

  // ---- Reconnected toast ----

  if (showReconnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-3"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
          {isSyncing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <p className="text-sm font-medium">
                Back online {pendingSyncs > 0 ? `— syncing ${pendingSyncs} item${pendingSyncs !== 1 ? 's' : ''}` : '— syncing...'}
              </p>
            </>
          ) : (
            <>
              <Wifi className="w-5 h-5" />
              <p className="text-sm font-medium">Back online</p>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // ---- Hidden when online or dismissed ----

  if (isOnline || dismissed) {
    return null;
  }

  // ---- Offline banner ----

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white"
        role="alert"
        aria-live="polite"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  You're offline
                </p>
                <p className="text-sm text-white/80">
                  {pendingSyncs > 0
                    ? `${pendingSyncs} pending sync${pendingSyncs !== 1 ? 's' : ''} — will retry when connected`
                    : 'Crisis resources still available'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onCrisisResourcesClick && (
                <button
                  onClick={onCrisisResourcesClick}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Crisis Help</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss offline notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick emergency contacts */}
        <div className="bg-amber-600 px-4 py-2">
          <div className="flex items-center justify-center gap-4 text-sm max-w-4xl mx-auto">
            <a href="tel:911" className="flex items-center gap-1 hover:underline">
              <Phone className="w-3 h-3" />
              911
            </a>
            <span className="text-white/50">|</span>
            <a href="tel:988" className="flex items-center gap-1 hover:underline">
              <Phone className="w-3 h-3" />
              988 Crisis Line
            </a>
            <span className="text-white/50">|</span>
            <a href="sms:741741?body=HOME" className="flex items-center gap-1 hover:underline">
              Text HOME to 741741
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default OfflineIndicator;
