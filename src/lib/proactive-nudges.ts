// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Proactive Nudges System
 * Provides contextual suggestions and celebrations at the right time
 */

import { CONTENT } from './content';
import { useAminyStore } from './store';
import { supabase } from '../utils/supabase/client';

export interface Nudge {
  id: string;
  type: 'celebration' | 'suggestion' | 'check-in' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible: boolean;
  expiresAt?: Date;
  conditions?: {
    timeOfDay?: { start: number; end: number }; // Hours in 24h format
    dayOfWeek?: number[]; // 0-6
    minStreak?: number;
    maxStreak?: number;
    lowActivity?: boolean;
  };
}

class ProactiveNudgeManager {
  private activeNudges: Nudge[] = [];
  private dismissedNudges: Set<string> = new Set();
  private lastCheckTime: Date | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadDismissedNudges();
  }

  private loadDismissedNudges() {
    try {
      const dismissed = localStorage.getItem('aminy-dismissed-nudges');
      if (dismissed) {
        this.dismissedNudges = new Set(JSON.parse(dismissed));
      }
    } catch (error) {
    }
  }

  private saveDismissedNudges() {
    try {
      localStorage.setItem(
        'aminy-dismissed-nudges',
        JSON.stringify(Array.from(this.dismissedNudges))
      );
    } catch (error) {
    }
  }

  /**
   * Start the nudge scheduler
   */
  start() {
    if (this.checkInterval) {
      return; // Already running
    }

    // Check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkConditions();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkConditions();
  }

  /**
   * Stop the nudge scheduler
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check conditions and generate appropriate nudges
   */
  private async checkConditions() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Clear expired nudges
    this.activeNudges = this.activeNudges.filter(
      nudge => !nudge.expiresAt || nudge.expiresAt > now
    );

    // Get store state
    const state = useAminyStore.getState();
    const { streaks, tasks, sessions, knowledgeGraph } = state;

    // Generate contextual nudges
    const newNudges: Nudge[] = [];

    // 1. Bedtime routine nudge (7-8 PM)
    if (hour >= 19 && hour < 20 && !this.hasActiveNudge('bedtime-routine')) {
      newNudges.push({
        id: 'bedtime-routine',
        type: 'suggestion',
        priority: 'medium',
        message: CONTENT.NUDGES.BEDTIME,
        actionLabel: 'Create routine',
        onAction: () => {
          // Navigate to Jr or Care to create bedtime routine
          useAminyStore.getState().setActiveTab('jr');
        },
        dismissible: true,
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Expires in 2 hours
      });
    }

    // 2. Streak celebration (milestones: 3, 7, 14, 30, 60, 90 days)
    const milestones = [3, 7, 14, 30, 60, 90];
    if (milestones.includes(streaks.current) && !this.hasActiveNudge('streak-celebration')) {
      newNudges.push({
        id: 'streak-celebration',
        type: 'celebration',
        priority: 'high',
        message: CONTENT.NUDGES.STREAK_CELEBRATION(streaks.current),
        actionLabel: 'Share win',
        onAction: () => {
          // Open share win modal
        },
        dismissible: true,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Expires in 24 hours
      });
    }

    // 3. Evening check-in (if activity is low)
    const lastActivityDate = streaks.lastActivityDate 
      ? new Date(streaks.lastActivityDate)
      : null;
    const daysSinceActivity = lastActivityDate
      ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (
      hour >= 18 &&
      hour < 21 &&
      daysSinceActivity > 2 &&
      !this.hasActiveNudge('evening-check')
    ) {
      newNudges.push({
        id: 'evening-check',
        type: 'check-in',
        priority: 'medium',
        message: CONTENT.NUDGES.EVENING_CHECK,
        actionLabel: 'Talk to Aminy',
        onAction: () => {
          // Open Ask Aminy
          useAminyStore.getState().setShowUnloadMindModal(true);
        },
        dismissible: true,
        expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      });
    }

    // 4. Weekly reflection (Sunday evening)
    if (
      dayOfWeek === 0 &&
      hour >= 18 &&
      hour < 21 &&
      !this.hasActiveNudge('weekly-reflection')
    ) {
      newNudges.push({
        id: 'weekly-reflection',
        type: 'suggestion',
        priority: 'medium',
        message: CONTENT.NUDGES.WEEKLY_REFLECTION,
        actionLabel: 'Reflect',
        onAction: () => {
          useAminyStore.getState().setActiveTab('reports');
        },
        dismissible: true,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      });
    }

    // 5. Upcoming session reminder (1 hour before)
    const upcomingSessions = sessions.filter(s => {
      if (s.status !== 'scheduled') return false;
      const sessionTime = new Date(s.scheduledAt);
      const timeDiff = sessionTime.getTime() - now.getTime();
      return timeDiff > 0 && timeDiff <= 60 * 60 * 1000; // Within 1 hour
    });

    upcomingSessions.forEach((session, index) => {
      if (!this.hasActiveNudge(`session-reminder-${session.id}`)) {
        newNudges.push({
          id: `session-reminder-${session.id}`,
          type: 'reminder',
          priority: 'high',
          message: `Your ${session.type} session starts in 1 hour`,
          actionLabel: 'View details',
          onAction: () => {
            useAminyStore.getState().setActiveTab('hub');
          },
          dismissible: false,
          expiresAt: new Date(session.scheduledAt),
        });
      }
    });

    // 6. Pattern-based suggestions from knowledge graph
    const patterns = knowledgeGraph.patterns.slice(-10); // Recent patterns
    const hasEveningTantrums = patterns.some(
      p => p.type === 'tantrum' && new Date(p.detectedAt).getHours() >= 17
    );

    if (
      hasEveningTantrums &&
      hour >= 16 &&
      hour < 18 &&
      !this.hasActiveNudge('tantrum-prevention')
    ) {
      newNudges.push({
        id: 'tantrum-prevention',
        type: 'suggestion',
        priority: 'medium',
        message: 'I noticed evening transitions can be tough. Want help with a calming routine?',
        actionLabel: 'Create routine',
        onAction: () => {
          useAminyStore.getState().setActiveTab('jr');
        },
        dismissible: true,
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      });
    }

    // 7. ABC incident-based suggestions — reference recent logged behaviors
    // Query Supabase for recent ABC entries and generate contextual nudges
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentEntries } = await supabase
          .from('abc_entries')
          .select('behavior_category, antecedent_category, occurred_at, setting, intensity')
          .eq('user_id', user.id)
          .gte('occurred_at', oneWeekAgo)
          .order('occurred_at', { ascending: false })
          .limit(20);

        if (recentEntries && recentEntries.length > 0) {
          // Analyze patterns in recent incidents
          const behaviorCounts: Record<string, number> = {};
          const antecedentCounts: Record<string, number> = {};
          let transitionIncidents = 0;
          let highIntensityCount = 0;

          for (const entry of recentEntries) {
            if (entry.behavior_category) {
              behaviorCounts[entry.behavior_category] = (behaviorCounts[entry.behavior_category] || 0) + 1;
            }
            if (entry.antecedent_category) {
              antecedentCounts[entry.antecedent_category] = (antecedentCounts[entry.antecedent_category] || 0) + 1;
            }
            // Detect transition-related incidents
            const antecedent = (entry.antecedent_category || '').toLowerCase();
            if (antecedent.includes('transition') || antecedent.includes('change') || antecedent.includes('switch')) {
              transitionIncidents++;
            }
            if (entry.intensity && entry.intensity >= 4) {
              highIntensityCount++;
            }
          }

          // Transition-related tantrums — suggest visual schedule
          if (transitionIncidents >= 2 && !this.hasActiveNudge('incident-transition-schedule')) {
            newNudges.push({
              id: 'incident-transition-schedule',
              type: 'suggestion',
              priority: 'high',
              message: `I noticed ${transitionIncidents} transition-related incidents this week. A visual transition schedule could help — would you like to create one?`,
              actionLabel: 'Create visual schedule',
              onAction: () => {
                useAminyStore.getState().setActiveTab('jr');
              },
              dismissible: true,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            });
          }

          // Frequent tantrums/meltdowns — suggest calming strategies
          const tantrumCount = (behaviorCounts['tantrum'] || 0) + (behaviorCounts['meltdown'] || 0) + (behaviorCounts['aggression'] || 0);
          if (tantrumCount >= 3 && !this.hasActiveNudge('incident-calming-strategy')) {
            newNudges.push({
              id: 'incident-calming-strategy',
              type: 'suggestion',
              priority: 'high',
              message: `There have been ${tantrumCount} challenging behavior incidents this week. Let's explore some calming strategies together.`,
              actionLabel: 'Calming strategies',
              onAction: () => {
                useAminyStore.getState().setShowUnloadMindModal(true);
              },
              dismissible: true,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            });
          }

          // High-intensity incidents — suggest professional support
          if (highIntensityCount >= 3 && !this.hasActiveNudge('incident-professional-support')) {
            newNudges.push({
              id: 'incident-professional-support',
              type: 'suggestion',
              priority: 'high',
              message: `I've noticed several high-intensity incidents this week. It might help to talk through strategies with a provider.`,
              actionLabel: 'Find a provider',
              onAction: () => {
                useAminyStore.getState().setActiveTab('hub');
              },
              dismissible: true,
              expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
            });
          }

          // Demand-avoidance patterns — suggest collaborative approaches
          const demandAvoidance = (antecedentCounts['demand'] || 0) + (antecedentCounts['request'] || 0) + (antecedentCounts['task'] || 0);
          if (demandAvoidance >= 3 && !this.hasActiveNudge('incident-demand-avoidance')) {
            newNudges.push({
              id: 'incident-demand-avoidance',
              type: 'suggestion',
              priority: 'medium',
              message: `I see a pattern with task-related triggers. Collaborative problem-solving or offering choices might help reduce resistance.`,
              actionLabel: 'Ask Aminy for tips',
              onAction: () => {
                useAminyStore.getState().setShowUnloadMindModal(true);
              },
              dismissible: true,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            });
          }

          // Sensory-related incidents — suggest sensory tools
          const sensoryAntecedents = (antecedentCounts['sensory'] || 0) + (antecedentCounts['noise'] || 0) + (antecedentCounts['environment'] || 0);
          if (sensoryAntecedents >= 2 && !this.hasActiveNudge('incident-sensory-tools')) {
            newNudges.push({
              id: 'incident-sensory-tools',
              type: 'suggestion',
              priority: 'medium',
              message: `Sensory triggers came up ${sensoryAntecedents} times this week. A sensory toolkit or quiet space might make a big difference.`,
              actionLabel: 'Explore sensory tools',
              onAction: () => {
                useAminyStore.getState().setActiveTab('jr');
              },
              dismissible: true,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            });
          }
        }
      }
    } catch (error) {
      // Non-critical: ABC query failure should not break nudge system
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.warn('[ProactiveNudges] ABC incident query failed:', error);
      }
    }

    // Add new nudges (filter out dismissed ones)
    newNudges.forEach(nudge => {
      if (!this.dismissedNudges.has(nudge.id)) {
        this.activeNudges.push(nudge);
      }
    });

    this.lastCheckTime = now;
  }

  /**
   * Get the current active nudge (highest priority)
   */
  getActiveNudge(): Nudge | null {
    if (this.activeNudges.length === 0) return null;

    // Sort by priority: high > medium > low
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const sorted = [...this.activeNudges].sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    return sorted[0];
  }

  /**
   * Get all active nudges
   */
  getAllNudges(): Nudge[] {
    return [...this.activeNudges];
  }

  /**
   * Dismiss a nudge
   */
  dismissNudge(id: string) {
    this.activeNudges = this.activeNudges.filter(n => n.id !== id);
    this.dismissedNudges.add(id);
    this.saveDismissedNudges();
  }

  /**
   * Check if a nudge is currently active
   */
  private hasActiveNudge(id: string): boolean {
    return this.activeNudges.some(n => n.id === id);
  }

  /**
   * Manually trigger a nudge check
   */
  checkNow() {
    this.checkConditions();
  }

  /**
   * Clear all dismissed nudges (for testing)
   */
  clearDismissed() {
    this.dismissedNudges.clear();
    this.saveDismissedNudges();
  }
}

// Singleton instance
export const proactiveNudges = new ProactiveNudgeManager();

// React hook
import { useState, useEffect } from 'react';

export function useProactiveNudges() {
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);

  useEffect(() => {
    // Start the scheduler
    proactiveNudges.start();

    // Check for nudges every minute
    const interval = setInterval(() => {
      setActiveNudge(proactiveNudges.getActiveNudge());
    }, 60 * 1000);

    // Initial check
    setActiveNudge(proactiveNudges.getActiveNudge());

    return () => {
      clearInterval(interval);
    };
  }, []);

  const dismiss = (id: string) => {
    proactiveNudges.dismissNudge(id);
    setActiveNudge(proactiveNudges.getActiveNudge());
  };

  return {
    activeNudge,
    dismiss,
  };
}

// Dev tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as Record<string, unknown>).aminyNudges = {
    check: () => proactiveNudges.checkNow(),
    getActive: () => proactiveNudges.getActiveNudge(),
    getAll: () => proactiveNudges.getAllNudges(),
    clearDismissed: () => proactiveNudges.clearDismissed(),
  };
}
