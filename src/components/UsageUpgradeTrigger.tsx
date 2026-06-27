// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * UsageUpgradeTrigger
 *
 * Google-One-style "we noticed you might want to upgrade" prompt. Subscribes to
 * the global rate-limit store (real daily AI usage) and surfaces a contextual
 * upgrade nudge at the moment of need:
 *   - running low  → soft slide-up banner ("1 free message left today")
 *   - at the limit → prominent card ("You've used today's free messages")
 *
 * Mounted once at the app root so it works across every chat surface. Paid /
 * unlimited users never see it (the store reports a 999999 limit for them).
 * Self-gates and self-dismisses (per-day) so it never nags.
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import {
  useRateLimitStore,
  getTimeUntilReset,
  isRunningLow,
  hasReachedLimit,
} from '../lib/rate-limit-store';
import { HAPTICS } from '../lib/mobile-experience-enhancer';

interface UsageUpgradeTriggerProps {
  /** Routes to the paywall/plans screen. */
  onUpgrade: () => void;
}

const DISMISS_KEY = 'aminy_usage_trigger_dismissed';

/** Returns true if the soft (running-low) prompt was already dismissed today. */
function dismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === new Date().toDateString();
  } catch {
    return false;
  }
}

export function UsageUpgradeTrigger({ onUpgrade }: UsageUpgradeTriggerProps) {
  const { dailyUsage, fetchUsage } = useRateLimitStore();
  const [dismissed, setDismissed] = useState(false);

  // Refresh usage once on mount so the prompt reflects the latest count.
  useEffect(() => {
    fetchUsage().catch(() => { /* non-critical */ });
  }, [fetchUsage]);

  if (dismissed || !dailyUsage) return null;

  // Paid / unlimited tiers report a sentinel high limit — never nag them.
  if (dailyUsage.limit >= 999999) return null;

  const reached = hasReachedLimit(dailyUsage);
  const low = isRunningLow(dailyUsage);

  // Nothing worth interrupting for yet.
  if (!reached && !low) return null;

  // Respect a same-day dismissal for the SOFT (running-low) state only. The
  // hard limit is a genuine block, so we still surface it (still dismissable).
  if (low && !reached && dismissedToday()) return null;

  const resetIn = getTimeUntilReset(dailyUsage.resetsAt);

  const handleUpgrade = () => {
    HAPTICS.success();
    onUpgrade();
  };

  const handleDismiss = () => {
    HAPTICS.light();
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    } catch { /* ignore */ }
    setDismissed(true);
  };

  const headline = reached
    ? "You've used today's free messages"
    : `${dailyUsage.remaining} free message${dailyUsage.remaining === 1 ? '' : 's'} left today`;

  const subtext = reached
    ? `Upgrade to Core for unlimited conversations with Aminy${resetIn ? ` — or your free messages reset in ${resetIn}.` : '.'}`
    : 'Upgrade to Core for unlimited chats — Aminy gets smarter the more you talk.';

  return (
    <div
      className="fixed left-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2"
      // Inline positioning avoids the precompiled-Tailwind offset-class trap and
      // clears the fixed bottom nav + iOS home indicator.
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-[#2A7D99]/20 bg-white dark:bg-slate-800 shadow-xl shadow-[#2A7D99]/10 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2A7D99]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#2A7D99]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#132F43] dark:text-white leading-snug">
              {headline}
            </p>
            <p className="mt-0.5 text-sm text-[#5A6B7A] dark:text-slate-300 leading-snug">
              {subtext}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 -mt-1 -mr-1 p-1.5 rounded-full text-[#8A9BA8] hover:text-[#5A6B7A] hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleUpgrade}
          className="w-full flex items-center justify-center gap-1.5 bg-[#2A7D99] hover:bg-[#216982] text-white text-sm font-semibold py-3 transition-colors"
        >
          Upgrade to Core
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
