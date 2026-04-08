// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Nudge Engine Hook
 * Provides smart nudges and encouragement based on user state
 */

import { useCallback } from 'react';
import { useAIContext } from '../context/AIContext';

const STRESS_NUDGES = [
  "You're doing great! Remember to take breaks.",
  "It's okay to feel overwhelmed. One step at a time.",
  "Consider a 5-minute mindfulness break.",
  "You're making progress, even when it doesn't feel like it.",
];

const GOAL_NUDGES = [
  "Great job setting goals! Small steps lead to big changes.",
  "Consistency is key. You've got this!",
  "Celebrate small wins along the way.",
  "Remember why you started this journey.",
];

export function useNudgeEngine() {
  const { parentStress, currentGoals, childProfile } = useAIContext();

  const getNudge = useCallback(() => {
    // No goals? Encourage adding one
    if (currentGoals.length === 0) {
      return null;
    }

    // High stress? Offer support
    if (parentStress >= 7) {
      const index = Math.floor(Math.random() * STRESS_NUDGES.length);
      return STRESS_NUDGES[index];
    }

    // Regular nudge based on goals
    const index = currentGoals.length % GOAL_NUDGES.length;
    return GOAL_NUDGES[index];
  }, [parentStress, currentGoals]);

  const getPersonalizedTip = useCallback((): string | null => {
    if (!childProfile.neuroType) {
      return null;
    }

    const tips: Record<string, string> = {
      'adhd': 'Visual timers can help with task transitions.',
      'autism': 'Predictable routines reduce anxiety.',
      'anxiety': 'Deep breathing exercises before challenging activities.',
    };

    const type = childProfile.neuroType.toLowerCase();
    for (const [key, tip] of Object.entries(tips)) {
      if (type.includes(key)) {
        return tip;
      }
    }

    return 'Consistency and patience are your best tools.';
  }, [childProfile]);

  return {
    getNudge,
    getPersonalizedTip,
  };
}
