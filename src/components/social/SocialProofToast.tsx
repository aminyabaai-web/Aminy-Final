// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Social Proof Toast
 * Non-intrusive notification showing recent platform activity.
 * Slides in from bottom, auto-dismisses, rate-limited to 1 per 60 seconds.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  UserPlus,
  Star,
  Trophy,
  Heart,
  X,
} from 'lucide-react';
import {
  getToastMessage,
  getMilestoneToast,
  type RecentActivity,
} from '../../lib/social-proof';

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_MS = 60_000; // 1 toast per 60 seconds
const AUTO_DISMISS_MS = 4_000; // Auto-dismiss after 4 seconds
const INITIAL_DELAY_MS = 15_000; // Wait 15s after mount before first toast
const DONT_SHOW_KEY = 'aminy_social_proof_dismissed';

// ============================================================================
// Component
// ============================================================================

interface SocialProofToastProps {
  /** Override to disable toasts entirely */
  disabled?: boolean;
}

export function SocialProofToast({ disabled = false }: SocialProofToastProps) {
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<RecentActivity | null>(null);
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const [milestoneIcon, setMilestoneIcon] = useState<'trophy' | 'heart' | 'star'>('trophy');
  const [dontShow, setDontShow] = useState(false);
  const toastIndex = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check "don't show again" preference
  useEffect(() => {
    const stored = localStorage.getItem(DONT_SHOW_KEY);
    if (stored === 'true') {
      setDontShow(true);
    }
  }, []);

  const showNextToast = useCallback(() => {
    if (dontShow || disabled) return;

    // Alternate between activity and milestone toasts
    if (toastIndex.current % 4 === 3) {
      const milestone = getMilestoneToast();
      if (milestone) {
        setMilestoneMessage(milestone.message);
        setMilestoneIcon(milestone.icon);
        setCurrentMessage(null);
      }
    } else {
      const activity = getToastMessage(toastIndex.current);
      setCurrentMessage(activity);
      setMilestoneMessage(null);
    }

    toastIndex.current += 1;
    setVisible(true);

    // Auto-dismiss
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, AUTO_DISMISS_MS);
  }, [dontShow, disabled]);

  // Schedule toasts
  useEffect(() => {
    if (dontShow || disabled) return;

    // Initial delay
    const initialTimer = setTimeout(() => {
      showNextToast();

      // Then show every RATE_LIMIT_MS
      timerRef.current = setInterval(() => {
        showNextToast();
      }, RATE_LIMIT_MS);
    }, INITIAL_DELAY_MS);

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [dontShow, disabled, showNextToast]);

  const handleDismiss = () => {
    setVisible(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  };

  const handleDontShowAgain = () => {
    setDontShow(true);
    setVisible(false);
    localStorage.setItem(DONT_SHOW_KEY, 'true');
    if (timerRef.current) clearInterval(timerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'calendar':
        return <Calendar className="w-4 h-4 text-teal-600" />;
      case 'user-plus':
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'star':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'trophy':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      case 'heart':
        return <Heart className="w-4 h-4 text-pink-500" />;
      default:
        return <Star className="w-4 h-4 text-teal-600" />;
    }
  };

  if (dontShow || disabled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none sm:left-auto sm:right-4 sm:max-w-sm">
      <AnimatePresence>
        {visible && (currentMessage || milestoneMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Teal accent bar */}
              <div className="h-0.5 bg-gradient-to-r from-teal-400 to-teal-600" />

              <div className="p-3 flex items-start gap-3">
                {/* Avatar / Icon */}
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                  {milestoneMessage
                    ? getIcon(milestoneIcon)
                    : currentMessage
                    ? getIcon(currentMessage.icon)
                    : null}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    {milestoneMessage || currentMessage?.message}
                  </p>
                  {currentMessage && !milestoneMessage && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {currentMessage.timeAgo}
                    </p>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-500 flex-shrink-0 p-0.5"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Don't show again */}
              <div className="px-3 pb-2">
                <button
                  onClick={handleDontShowAgain}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Don&apos;t show again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SocialProofToast;
