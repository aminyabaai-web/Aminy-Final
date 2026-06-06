// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TrialCountdown.tsx
 *
 * Shows trial days remaining with urgency UI as trial end approaches.
 * Creates urgency and drives conversion without being aggressive.
 */

import React, { useState, useEffect } from 'react';
import { Clock, Sparkles, ArrowRight, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface TrialCountdownProps {
  trialStartDate: Date | string;
  trialDays?: number; // Default 7 days
  onUpgrade: () => void;
  currentTier?: string;
  compact?: boolean; // For navbar display
  dismissible?: boolean;
}

export function TrialCountdown({
  trialStartDate,
  trialDays = 7,
  onUpgrade,
  currentTier = 'free',
  compact = false,
  dismissible = true,
}: TrialCountdownProps) {
  const [dismissed, setDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number>(trialDays);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const start = new Date(trialStartDate);
      const endDate = new Date(start.getTime() + trialDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const msRemaining = endDate.getTime() - now.getTime();

      if (msRemaining <= 0) {
        setDaysRemaining(0);
        setHoursRemaining(0);
        return;
      }

      const days = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      setDaysRemaining(days);
      setHoursRemaining(hours);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60 * 1000); // Update every minute
    return () => clearInterval(interval);
  }, [trialStartDate, trialDays]);

  // Don't show if not on trial or dismissed
  if (currentTier !== 'free' || dismissed || daysRemaining > trialDays) {
    return null;
  }

  // Urgency levels based on days remaining
  const urgencyLevel =
    daysRemaining <= 1 ? 'critical' :
    daysRemaining <= 3 ? 'high' :
    daysRemaining <= 5 ? 'medium' : 'low';

  const gradients = {
    critical: 'from-red-500 via-orange-500 to-amber-500',
    high: 'from-amber-500 via-orange-400 to-yellow-400',
    medium: 'from-teal-500 via-cyan-500 to-blue-500',
    low: 'from-violet-500 via-purple-500 to-indigo-500',
  };

  const bgColors = {
    critical: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    high: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    medium: 'bg-[#6B9080]/10 dark:bg-teal-950/30 border-[#6B9080]/20 dark:border-teal-800',
    low: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
  };

  // Compact version for navbar
  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 ${
          urgencyLevel === 'critical' ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white' :
          urgencyLevel === 'high' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900' :
          'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        {daysRemaining === 0 ? (
          <span>{hoursRemaining}h left</span>
        ) : (
          <span>{daysRemaining}d left</span>
        )}
      </button>
    );
  }

  // Full banner version
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative rounded-xl border p-4 ${bgColors[urgencyLevel]}`}
      >
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Countdown Display */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[urgencyLevel]} flex items-center justify-center shadow-lg`}>
              {daysRemaining === 0 ? (
                <span className="text-xl font-bold text-white">{hoursRemaining}h</span>
              ) : (
                <span className="text-xl font-bold text-white">{daysRemaining}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {daysRemaining === 0
                  ? `${hoursRemaining} hours left in your trial`
                  : daysRemaining === 1
                    ? '1 day left in your trial'
                    : `${daysRemaining} days left in your trial`
                }
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {urgencyLevel === 'critical'
                  ? 'Subscribe now to keep all your data and memories'
                  : urgencyLevel === 'high'
                    ? 'Lock in your personalized experience'
                    : "You're making great progress!"
                }
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="sm:ml-auto">
            <Button
              onClick={onUpgrade}
              className={`w-full sm:w-auto bg-gradient-to-r ${gradients[urgencyLevel]} text-white hover:opacity-90 transition-opacity`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {urgencyLevel === 'critical' ? 'Subscribe Now' : 'See Plans'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Progress bar showing trial progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span>Trial started</span>
            <span>Trial ends</span>
          </div>
          <div className="h-2 bg-white/50 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${gradients[urgencyLevel]} transition-all duration-500`}
              style={{ width: `${Math.max(0, 100 - (daysRemaining / trialDays) * 100)}%` }}
            />
          </div>
        </div>

        {/* Urgency messaging for critical level */}
        {urgencyLevel === 'critical' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
          >
            <p className="text-xs text-red-700 dark:text-red-300 text-center">
              After your trial ends, you'll lose access to AI memories, care plan features, and more.
              Subscribe to keep everything.
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to get trial status for current user
 */
export function useTrialStatus(userId: string) {
  const [trialStatus, setTrialStatus] = useState<{
    isOnTrial: boolean;
    trialStartDate: Date | null;
    daysRemaining: number;
    tier: string;
  }>({
    isOnTrial: false,
    trialStartDate: null,
    daysRemaining: 0,
    tier: 'free',
  });

  useEffect(() => {
    // Check localStorage for trial start date
    const stored = localStorage.getItem(`aminy_trial_${userId}`);
    if (stored) {
      const data = JSON.parse(stored);
      const startDate = new Date(data.startDate);
      const now = new Date();
      const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const daysRemaining = Math.max(0, 7 - daysElapsed);

      setTrialStatus({
        isOnTrial: daysRemaining > 0 && data.tier === 'free',
        trialStartDate: startDate,
        daysRemaining,
        tier: data.tier || 'free',
      });
    } else {
      // Start trial for new users
      const now = new Date();
      localStorage.setItem(`aminy_trial_${userId}`, JSON.stringify({
        startDate: now.toISOString(),
        tier: 'free',
      }));
      setTrialStatus({
        isOnTrial: true,
        trialStartDate: now,
        daysRemaining: 7,
        tier: 'free',
      });
    }
  }, [userId]);

  return trialStatus;
}

export default TrialCountdown;
