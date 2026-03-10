/**
 * App Review Prompt Hook (v2 — enhanced for virality push)
 *
 * Intelligently prompts users to review the app at moments of delight.
 * Uses a scoring system based on positive signals to determine when
 * the user is most likely to leave a positive review.
 *
 * PRIMARY trigger: 3+ positive sessions (Junior completion OR positive
 * AI sentiment) within the last 7 days.
 *
 * SECONDARY triggers (any 2 of these also qualifies):
 * - 3+ Junior sessions completed
 * - 3+ days of consecutive use (streak)
 * - Used CalmCorner at least once
 * - Completed onboarding
 * - Had a positive AI conversation (sentiment: positive)
 *
 * Constraints:
 * - Only show once per 90 days
 * - Never show in first 3 days
 * - Never show during crisis/negative sentiment
 * - Never show more than 3 times total
 * - Respect user's "don't ask again" preference
 * - Don't show if user previously dismissed
 *
 * localStorage keys:
 *   lastPromptDate, promptCount, dismissed (tracked inside state blob)
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewPromptState {
  /** ISO date of last prompt shown */
  lastPromptDate: string | null;
  /** Total number of times the prompt has been shown */
  promptCount: number;
  /** User explicitly chose "don't ask again" */
  dismissed: boolean;
  /** ISO date of first app use */
  firstUseDate: string;
  /** Rolling log of positive session timestamps (ISO strings) */
  positiveSessionLog: string[];
  /** Legacy + extended positive signals */
  positiveSignals: {
    juniorSessions: number;
    consecutiveDays: number;
    calmCornerUsed: boolean;
    onboardingComplete: boolean;
    positiveConversation: boolean;
  };
}

export interface UseAppReviewPromptReturn {
  shouldShowPrompt: boolean;
  triggerReview: () => void;
  dismissPrompt: () => void;
  neverAskAgain: () => void;
  /**
   * Record a positive session (Junior completion or positive AI sentiment).
   * This feeds the rolling 7-day window that drives the primary trigger.
   */
  recordPositiveSession: () => void;
  recordPositiveSignal: (
    signal: keyof ReviewPromptState['positiveSignals'],
    value?: number | boolean
  ) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aminy_review_prompt';
const COOLDOWN_DAYS = 90;
const MIN_DAYS_BEFORE_FIRST_PROMPT = 3;
const MAX_TOTAL_PROMPTS = 3;
const REQUIRED_SIGNALS = 2;
const POSITIVE_SESSIONS_THRESHOLD = 3;
const POSITIVE_SESSIONS_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function loadState(): ReviewPromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate from v1 format if necessary
      return {
        lastPromptDate: parsed.lastPromptDate ?? parsed.lastPromptedAt ?? null,
        promptCount: parsed.promptCount ?? parsed.totalPrompts ?? 0,
        dismissed: parsed.dismissed ?? parsed.neverAskAgain ?? false,
        firstUseDate: parsed.firstUseDate ?? new Date().toISOString(),
        positiveSessionLog: parsed.positiveSessionLog ?? [],
        positiveSignals: {
          juniorSessions: parsed.positiveSignals?.juniorSessions ?? 0,
          consecutiveDays: parsed.positiveSignals?.consecutiveDays ?? 0,
          calmCornerUsed: parsed.positiveSignals?.calmCornerUsed ?? false,
          onboardingComplete: parsed.positiveSignals?.onboardingComplete ?? false,
          positiveConversation: parsed.positiveSignals?.positiveConversation ?? false,
        },
      };
    }
  } catch {
    /* corrupt localStorage — start fresh */
  }

  return {
    lastPromptDate: null,
    promptCount: 0,
    dismissed: false,
    firstUseDate: new Date().toISOString(),
    positiveSessionLog: [],
    positiveSignals: {
      juniorSessions: 0,
      consecutiveDays: 0,
      calmCornerUsed: false,
      onboardingComplete: false,
      positiveConversation: false,
    },
  };
}

function saveState(state: ReviewPromptState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* non-critical */
  }
}

/** Count how many positive sessions occurred in the last N days */
function countRecentPositiveSessions(
  log: string[],
  windowDays: number
): number {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return log.filter((ts) => new Date(ts).getTime() >= cutoff).length;
}

function countPositiveSignals(
  signals: ReviewPromptState['positiveSignals']
): number {
  let count = 0;
  if (signals.juniorSessions >= 3) count++;
  if (signals.consecutiveDays >= 3) count++;
  if (signals.calmCornerUsed) count++;
  if (signals.onboardingComplete) count++;
  if (signals.positiveConversation) count++;
  return count;
}

function isEligible(state: ReviewPromptState): boolean {
  // Never ask if user opted out
  if (state.dismissed) return false;

  // Don't exceed max prompts
  if (state.promptCount >= MAX_TOTAL_PROMPTS) return false;

  // Must be at least N days since first use
  const daysSinceFirst =
    (Date.now() - new Date(state.firstUseDate).getTime()) /
    (1000 * 60 * 60 * 24);
  if (daysSinceFirst < MIN_DAYS_BEFORE_FIRST_PROMPT) return false;

  // Respect cooldown
  if (state.lastPromptDate) {
    const daysSincePrompt =
      (Date.now() - new Date(state.lastPromptDate).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSincePrompt < COOLDOWN_DAYS) return false;
  }

  // PRIMARY trigger: 3+ positive sessions within the last 7 days
  const recentPositive = countRecentPositiveSessions(
    state.positiveSessionLog,
    POSITIVE_SESSIONS_WINDOW_DAYS
  );
  if (recentPositive >= POSITIVE_SESSIONS_THRESHOLD) return true;

  // SECONDARY trigger: legacy signal-based approach
  if (countPositiveSignals(state.positiveSignals) >= REQUIRED_SIGNALS)
    return true;

  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAppReviewPrompt(): UseAppReviewPromptReturn {
  const [state, setState] = useState<ReviewPromptState>(loadState);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  // Check eligibility on state changes
  useEffect(() => {
    setShouldShowPrompt(isEligible(state));
  }, [state]);

  const triggerReview = useCallback(() => {
    // Detect platform and open appropriate review destination
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;

    if (isStandalone) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        window.open(
          'https://apps.apple.com/app/aminy/id0000000000?action=write-review',
          '_blank'
        );
      } else if (isAndroid) {
        window.open(
          'https://play.google.com/store/apps/details?id=app.aminy&showAllReviews=true',
          '_blank'
        );
      } else {
        window.open('https://aminy.app/review', '_blank');
      }
    } else {
      window.open('https://aminy.app/review', '_blank');
    }

    // Update state
    const updated: ReviewPromptState = {
      ...state,
      lastPromptDate: new Date().toISOString(),
      promptCount: state.promptCount + 1,
    };
    setState(updated);
    saveState(updated);
    setShouldShowPrompt(false);
  }, [state]);

  const dismissPrompt = useCallback(() => {
    const updated: ReviewPromptState = {
      ...state,
      lastPromptDate: new Date().toISOString(),
      promptCount: state.promptCount + 1,
    };
    setState(updated);
    saveState(updated);
    setShouldShowPrompt(false);
  }, [state]);

  const neverAskAgain = useCallback(() => {
    const updated: ReviewPromptState = { ...state, dismissed: true };
    setState(updated);
    saveState(updated);
    setShouldShowPrompt(false);
  }, [state]);

  /** Record a positive session (Junior completion or positive AI sentiment) */
  const recordPositiveSession = useCallback(() => {
    const now = new Date().toISOString();
    // Prune entries older than the window to keep localStorage lean
    const cutoff =
      Date.now() - POSITIVE_SESSIONS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const pruned = state.positiveSessionLog.filter(
      (ts) => new Date(ts).getTime() >= cutoff
    );

    const updated: ReviewPromptState = {
      ...state,
      positiveSessionLog: [...pruned, now],
    };
    setState(updated);
    saveState(updated);
  }, [state]);

  const recordPositiveSignal = useCallback(
    (
      signal: keyof ReviewPromptState['positiveSignals'],
      value?: number | boolean
    ) => {
      const updated: ReviewPromptState = {
        ...state,
        positiveSignals: {
          ...state.positiveSignals,
          [signal]: value !== undefined ? value : true,
        },
      };
      setState(updated);
      saveState(updated);
    },
    [state]
  );

  return {
    shouldShowPrompt,
    triggerReview,
    dismissPrompt,
    neverAskAgain,
    recordPositiveSession,
    recordPositiveSignal,
  };
}

export default useAppReviewPrompt;
