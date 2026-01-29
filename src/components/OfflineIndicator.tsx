/**
 * Offline Indicator
 *
 * Shows when the user is offline and provides quick access to crisis resources.
 * Enhanced with animation and crisis resource shortcut.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, Phone, ChevronRight, X } from 'lucide-react';

interface OfflineIndicatorProps {
  onCrisisResourcesClick?: () => void;
}

export function OfflineIndicator({ onCrisisResourcesClick }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      // Show "reconnected" message briefly
      setShowReconnected(true);
      reconnectTimeout = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Show reconnected message
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
          <Wifi className="w-5 h-5" />
          <p className="text-sm font-medium">Back online</p>
        </div>
      </motion.div>
    );
  }

  // Don't show if online or dismissed
  if (isOnline || dismissed) {
    return null;
  }

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
                <p className="text-xs text-white/80">
                  Crisis resources still available
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
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss offline notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick emergency contacts */}
        <div className="bg-amber-600 px-4 py-2">
          <div className="flex items-center justify-center gap-4 text-xs max-w-4xl mx-auto">
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
