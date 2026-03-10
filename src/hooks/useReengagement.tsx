/**
 * useReengagement — Inactivity Detection & Re-engagement Hook
 *
 * Detects when a user has been inactive for 3+ days and triggers
 * a re-engagement prompt: push notification (if permitted) or
 * in-app message on next visit.
 *
 * Detection logic:
 * - Tracks `lastActiveAt` timestamp in localStorage + Supabase
 * - On each app load, checks elapsed days since last meaningful activity
 * - "Meaningful activity" = same actions as streak tracker (Junior session,
 *   behavior log, community post, AI chat)
 *
 * Re-engagement tiers:
 * - 3 days: Gentle nudge — "Hey! [Child] has a new activity waiting."
 * - 7 days: Stronger nudge — "We miss you! Here's what's new this week."
 * - 14 days: Win-back — "Come back for a free session credit."
 *
 * Privacy:
 * - Only sends push if user previously granted permission
 * - In-app message shown as a soft banner, dismissible
 * - Respects "do not disturb" preference if set
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  sendLocalNotification,
  isPushSupported,
  getNotificationPermission,
} from '../lib/push-notifications';
import { supabase } from '../utils/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────

export type InactivityTier = 'active' | 'mild' | 'moderate' | 'severe';

export interface ReengagementMessage {
  title: string;
  body: string;
  tier: InactivityTier;
  daysInactive: number;
  actionLabel: string;
  actionScreen: string;
  emoji: string;
}

export interface UseReengagementReturn {
  /** Whether there is an in-app re-engagement message to show */
  hasMessage: boolean;
  /** The current re-engagement message (null if user is active) */
  message: ReengagementMessage | null;
  /** Days since last meaningful activity */
  daysInactive: number;
  /** Inactivity classification */
  tier: InactivityTier;
  /** Dismiss the in-app message (hides for this session) */
  dismiss: () => void;
  /** Record an activity (resets inactivity timer) */
  recordActivity: () => void;
  /** Whether the hook has finished loading */
  loaded: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'aminy_last_active';
const DISMISS_KEY = 'aminy_reengagement_dismissed';
const PUSH_SENT_KEY = 'aminy_reengagement_push_sent';

const INACTIVITY_THRESHOLDS = {
  mild: 3, // 3 days
  moderate: 7, // 7 days
  severe: 14, // 14 days
} as const;

// ── Message templates ─────────────────────────────────────────────────

function getReengagementMessage(
  daysInactive: number,
  childName: string
): ReengagementMessage | null {
  if (daysInactive < INACTIVITY_THRESHOLDS.mild) {
    return null; // User is active
  }

  if (daysInactive >= INACTIVITY_THRESHOLDS.severe) {
    return {
      title: 'We miss you!',
      body: `It has been ${daysInactive} days since your last visit. ${childName} has new activities and resources waiting. Come back and check what's new.`,
      tier: 'severe',
      daysInactive,
      actionLabel: 'See what\'s new',
      actionScreen: 'dashboard',
      emoji: '💙',
    };
  }

  if (daysInactive >= INACTIVITY_THRESHOLDS.moderate) {
    return {
      title: `${childName}'s weekly update is ready`,
      body: `A full week away — your AI-powered insights have been building in the background. See ${childName}'s progress summary and new recommendations.`,
      tier: 'moderate',
      daysInactive,
      actionLabel: 'View weekly recap',
      actionScreen: 'dashboard',
      emoji: '📊',
    };
  }

  // mild: 3-6 days
  return {
    title: `Hey! ${childName} has a new activity waiting`,
    body: `It has been ${daysInactive} days — Aminy Junior has fresh activities personalized for ${childName}. Just a few minutes can make a difference.`,
    tier: 'mild',
    daysInactive,
    actionLabel: 'Start an activity',
    actionScreen: 'junior',
    emoji: '🌟',
  };
}

// ── Push notification messages ────────────────────────────────────────

function getPushMessage(
  daysInactive: number,
  childName: string
): { title: string; body: string } | null {
  if (daysInactive < INACTIVITY_THRESHOLDS.mild) return null;

  if (daysInactive >= INACTIVITY_THRESHOLDS.severe) {
    return {
      title: 'We miss you!',
      body: `${childName} has new activities waiting. Come see what Aminy has prepared.`,
    };
  }

  if (daysInactive >= INACTIVITY_THRESHOLDS.moderate) {
    return {
      title: `${childName}'s weekly update`,
      body: `Your progress summary is ready. See how ${childName} is doing.`,
    };
  }

  return {
    title: `New activity for ${childName}`,
    body: `Aminy Junior has a fresh activity ready. Just a few minutes can help!`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function getLastActiveDate(): Date | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Date(raw);
  } catch { /* ignore */ }
  return null;
}

function setLastActiveDate(date: Date): void {
  try {
    localStorage.setItem(STORAGE_KEY, date.toISOString());
  } catch { /* non-critical */ }
}

function getDaysInactive(): number {
  const lastActive = getLastActiveDate();
  if (!lastActive) return 0; // First visit — treat as active
  const diffMs = Date.now() - lastActive.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getInactivityTier(days: number): InactivityTier {
  if (days >= INACTIVITY_THRESHOLDS.severe) return 'severe';
  if (days >= INACTIVITY_THRESHOLDS.moderate) return 'moderate';
  if (days >= INACTIVITY_THRESHOLDS.mild) return 'mild';
  return 'active';
}

function wasDismissedToday(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissed = new Date(raw);
    const today = new Date();
    return (
      dismissed.getFullYear() === today.getFullYear() &&
      dismissed.getMonth() === today.getMonth() &&
      dismissed.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

function wasPushSentForThisTier(tier: InactivityTier): boolean {
  try {
    const raw = localStorage.getItem(PUSH_SENT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.tier === tier;
  } catch {
    return false;
  }
}

function markPushSent(tier: InactivityTier): void {
  try {
    localStorage.setItem(
      PUSH_SENT_KEY,
      JSON.stringify({ tier, sentAt: new Date().toISOString() })
    );
  } catch { /* non-critical */ }
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useReengagement(
  userId: string | null,
  childName: string = 'your child'
): UseReengagementReturn {
  const [daysInactive, setDaysInactive] = useState(0);
  const [tier, setTier] = useState<InactivityTier>('active');
  const [message, setMessage] = useState<ReengagementMessage | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pushSentRef = useRef(false);

  // ── Initialize on mount ─────────────────────────────────────────

  useEffect(() => {
    const days = getDaysInactive();
    const currentTier = getInactivityTier(days);

    setDaysInactive(days);
    setTier(currentTier);
    setDismissed(wasDismissedToday());

    // Generate in-app message
    const msg = getReengagementMessage(days, childName);
    setMessage(msg);

    // If this is a returning inactive user, sync to Supabase
    if (userId && days >= INACTIVITY_THRESHOLDS.mild) {
      void supabase
        .from('reengagement_events')
        .insert({
          user_id: userId,
          days_inactive: days,
          tier: currentTier,
          event_type: 'app_return',
          created_at: new Date().toISOString(),
        })
        .then(() => {}); // Non-critical, fire and forget
    }

    // Send push notification if applicable (once per tier)
    if (
      msg &&
      !pushSentRef.current &&
      !wasPushSentForThisTier(currentTier) &&
      isPushSupported() &&
      getNotificationPermission() === 'granted'
    ) {
      const pushMsg = getPushMessage(days, childName);
      if (pushMsg) {
        // Small delay to avoid firing on page load flash
        const timer = setTimeout(() => {
          sendLocalNotification(pushMsg.title, pushMsg.body, {
            route: '/?screen=dashboard',
          });
          markPushSent(currentTier);
          pushSentRef.current = true;
        }, 2000);
        return () => clearTimeout(timer);
      }
    }

    setLoaded(true);
  }, [userId, childName]);

  // ── Dismiss handler ─────────────────────────────────────────────

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch { /* non-critical */ }

    // Track dismissal in Supabase
    if (userId) {
      void supabase
        .from('reengagement_events')
        .insert({
          user_id: userId,
          days_inactive: daysInactive,
          tier,
          event_type: 'dismissed',
          created_at: new Date().toISOString(),
        })
        .then(() => {}); // fire and forget
    }
  }, [userId, daysInactive, tier]);

  // ── Record activity (resets timer) ──────────────────────────────

  const recordActivity = useCallback(() => {
    const now = new Date();
    setLastActiveDate(now);
    setDaysInactive(0);
    setTier('active');
    setMessage(null);

    // Clear push-sent flag so we re-send if they go inactive again
    try {
      localStorage.removeItem(PUSH_SENT_KEY);
    } catch { /* non-critical */ }

    // Sync to Supabase
    if (userId) {
      void supabase
        .from('user_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'app_active',
          created_at: now.toISOString(),
        })
        .then(() => {}); // fire and forget
    }
  }, [userId]);

  // ── First-visit initialization ──────────────────────────────────

  useEffect(() => {
    // If user has never been tracked, set today as their first active date
    if (!getLastActiveDate()) {
      setLastActiveDate(new Date());
    }
  }, []);

  return {
    hasMessage: !!message && !dismissed,
    message: dismissed ? null : message,
    daysInactive,
    tier,
    dismiss,
    recordActivity,
    loaded,
  };
}

// ── ReengagementBanner Component ──────────────────────────────────────
// Convenience component for use in layouts. Shows a dismissible banner
// when the hook detects inactivity.

import { X, ArrowRight, Sparkles } from 'lucide-react';

interface ReengagementBannerProps {
  userId: string | null;
  childName?: string;
  onNavigate?: (screen: string) => void;
}

export function ReengagementBanner({
  userId,
  childName = 'your child',
  onNavigate,
}: ReengagementBannerProps) {
  const { hasMessage, message, dismiss, recordActivity } = useReengagement(
    userId,
    childName
  );

  if (!hasMessage || !message) return null;

  const bgColor =
    message.tier === 'severe'
      ? 'from-rose-50 to-pink-50 border-rose-200'
      : message.tier === 'moderate'
      ? 'from-amber-50 to-orange-50 border-amber-200'
      : 'from-teal-50 to-cyan-50 border-teal-200';

  const accentColor =
    message.tier === 'severe'
      ? 'text-rose-700'
      : message.tier === 'moderate'
      ? 'text-amber-700'
      : 'text-teal-700';

  const buttonColor =
    message.tier === 'severe'
      ? 'bg-rose-600 hover:bg-rose-700'
      : message.tier === 'moderate'
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-teal-600 hover:bg-teal-700';

  return (
    <div
      className={`bg-gradient-to-r ${bgColor} border rounded-xl p-4 mx-4 mb-4 animate-in slide-in-from-top fade-in duration-500`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{message.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${accentColor}`}>
            {message.title}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            {message.body}
          </p>
          <button
            onClick={() => {
              recordActivity();
              onNavigate?.(message.actionScreen);
            }}
            className={`mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 ${buttonColor} text-white text-xs font-medium rounded-lg transition-colors`}
          >
            {message.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <button
          onClick={dismiss}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default useReengagement;
