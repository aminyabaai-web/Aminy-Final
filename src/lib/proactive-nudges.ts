/**
 * Proactive Nudges System
 * Provides contextual suggestions and celebrations at the right time
 */

import { CONTENT } from './content';
import { useAminyStore } from './store';

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
  private checkConditions() {
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
  (window as any).aminyNudges = {
    check: () => proactiveNudges.checkNow(),
    getActive: () => proactiveNudges.getActiveNudge(),
    getAll: () => proactiveNudges.getAllNudges(),
    clearDismissed: () => proactiveNudges.clearDismissed(),
  };
}
