// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI Planner Hook
 * Manages AI-powered planning and suggestions
 */

import { useCallback } from 'react';
import { useAIContext } from '../context/AIContext';

const GOAL_RECOMMENDATIONS = [
  'Practice morning routine independently',
  'Work on communication skills during meals',
  'Build social skills through play dates',
  'Develop self-regulation techniques',
  'Create a visual schedule for transitions',
];

export function useAIPlanner() {
  const { currentGoals, parentStress, childProfile } = useAIContext();

  const recommendGoals = useCallback(() => {
    // Don't recommend if they have 3+ goals
    if (currentGoals.length >= 3) {
      return null;
    }

    // Pick a recommendation based on current state
    const existingTitles = currentGoals.map(g => g.title.toLowerCase());
    const available = GOAL_RECOMMENDATIONS.filter(
      rec => !existingTitles.some(t => t.includes(rec.toLowerCase().split(' ')[0]))
    );

    if (available.length === 0) {
      return 'Keep practicing your current goals!';
    }

    // Pick based on stress level and child profile
    const index = (parentStress + (childProfile.age || 5)) % available.length;
    return available[index];
  }, [currentGoals, parentStress, childProfile]);

  const generateDailyPlan = useCallback(() => {
    return {
      date: new Date(),
      items: currentGoals.map((goal, i) => ({
        id: `plan_${i}`,
        title: goal.title,
        time: `${9 + i}:00 AM`,
        duration: '30 min',
        completed: false,
      })),
    };
  }, [currentGoals]);

  return {
    recommendGoals,
    generateDailyPlan,
  };
}
