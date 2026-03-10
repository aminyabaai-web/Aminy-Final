/**
 * App Review Prompt Hook
 *
 * Intelligently prompts users to review the app at moments of delight.
 * Uses a scoring system based on positive signals to determine when
 * the user is most likely to leave a positive review.
 *
 * Trigger conditions (ANY 2 of these):
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
 */

import { useState, useEffect, useCallback } from 'react';

interface ReviewPromptState {
  lastPromptedAt: string | null;
  totalPrompts: number;
  neverAskAgain: boolean;
  firstUseDate: string;
  positiveSignals: {
    juniorSessions: number;
    consecutiveDays: number;
    calmCornerUsed: boolean;
    onboardingComplete: boolean;
    positiveConversation: boolean;
  };
}

interface UseAppReviewPromptReturn {
  shouldShowPrompt: boolean;
  triggerReview: () => void;
  dismissPrompt: () => void;
  neverAskAgain: () => void;
  recordPositiveSignal: (signal: keyof ReviewPromptState['positiveSignals'], value?: number | boolean) => void;
}

const STORAGE_KEY = 'aminy_review_prompt';
const COOLDOWN_DAYS = 90;
const MIN_DAYS_BEFORE_FIRST_PROMPT = 3;
const MAX_TOTAL_PROMPTS = 3;
const REQUIRED_SIGNALS = 2;

function loadState(): ReviewPromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }

  return {
    lastPromptedAt: null,
    totalPrompts: 0,
    neverAskAgain: false,
    firstUseDate: new Date().toISOString(),
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
  } catch { /* non-critical */ }
}

function countPositiveSignals(signals: ReviewPromptState['positiveSignals']): number {
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
  if (state.neverAskAgain) return false;

  // Don't exceed max prompts
  if (state.totalPrompts >= MAX_TOTAL_PROMPTS) return false;

  // Must have enough positive signals
  if (countPositiveSignals(state.positiveSignals) < REQUIRED_SIGNALS) return false;

  // Must be at least N days since first use
  const daysSinceFirst = (Date.now() - new Date(state.firstUseDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceFirst < MIN_DAYS_BEFORE_FIRST_PROMPT) return false;

  // Respect cooldown
  if (state.lastPromptedAt) {
    const daysSincePrompt = (Date.now() - new Date(state.lastPromptedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePrompt < COOLDOWN_DAYS) return false;
  }

  return true;
}

export function useAppReviewPrompt(): UseAppReviewPromptReturn {
  const [state, setState] = useState<ReviewPromptState>(loadState);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  // Check eligibility on state changes
  useEffect(() => {
    setShouldShowPrompt(isEligible(state));
  }, [state]);

  const triggerReview = useCallback(() => {
    // Check if PWA / standalone mode — use appropriate review mechanism
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      // For PWA: open App Store / Play Store review link
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        // Replace with actual App Store ID when published
        window.open('https://apps.apple.com/app/aminy/id0000000000?action=write-review', '_blank');
      } else if (isAndroid) {
        // Replace with actual Play Store ID when published
        window.open('https://play.google.com/store/apps/details?id=app.aminy&showAllReviews=true', '_blank');
      } else {
        // Desktop PWA — open review page
        window.open('https://aminy.app/review', '_blank');
      }
    } else {
      // Web: open review/feedback page
      window.open('https://aminy.app/review', '_blank');
    }

    // Update state
    const updated = {
      ...state,
      lastPromptedAt: new Date().toISOString(),
      totalPrompts: state.totalPrompts + 1,
    };
    setState(updated);
    saveState(updated);
    setShouldShowPrompt(false);
  }, [state]);

  const dismissPrompt = useCallback(() => {
    const updated = {
      ...state,
      lastPromptedAt: new Date().toISOString(),
      totalPrompts: state.totalPrompts + 1,
    };
    setState(updated);
    saveState(updated);
    setShouldShowPrompt(false);
  }, [state]);

  const neverAskAgain = useCallback(() => {
    const updated = { ...state, neverAskAgain: true };
    setState(updated);
    saveState(updated);
    setShouldShowPrompt(false);
  }, [state]);

  const recordPositiveSignal = useCallback(
    (signal: keyof ReviewPromptState['positiveSignals'], value?: number | boolean) => {
      const updated = {
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
    recordPositiveSignal,
  };
}

export default useAppReviewPrompt;
