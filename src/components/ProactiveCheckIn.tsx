// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Proactive Check-In Component
 * AI-initiated engagement based on user patterns
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  Cloud,
  Calendar,
  TrendingUp,
  MessageCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import { useAminyStore } from '../lib/store';

type CheckInType =
  | 'morning_greeting'
  | 'evening_reflection'
  | 'missed_you'
  | 'weekly_review'
  | 'milestone_celebration'
  | 'encouragement'
  | 'stress_check'
  | 'win_prompt';

type CheckInAction = 'chat' | 'log' | 'review' | 'close' | 'checkin';

interface CheckInConfig {
  icon: React.ElementType;
  title: string;
  messages: string[];
  cta: string;
  ctaAction: CheckInAction;
  gradient: string;
}

const checkInConfigs: Record<CheckInType, CheckInConfig> = {
  morning_greeting: {
    icon: Sun,
    title: 'Good morning!',
    messages: [
      "Ready to make today great for {childName}?",
      "What's on the plan for you and {childName} today?",
      "Hope you got some rest! How can I help today?",
    ],
    cta: "Let's chat",
    ctaAction: 'chat',
    gradient: 'from-amber-400 to-orange-400',
  },
  evening_reflection: {
    icon: Moon,
    title: 'Evening check-in',
    messages: [
      "How did today go with {childName}?",
      "Take a moment to reflect on today's wins",
      "Before you wind down, any wins to celebrate?",
    ],
    cta: 'Log a win',
    ctaAction: 'log',
    gradient: 'from-indigo-400 to-purple-500',
  },
  missed_you: {
    icon: Heart,
    title: "We've missed you!",
    messages: [
      "It's been a few days - how are you and {childName}?",
      "Just checking in - everything okay?",
      "We're here whenever you need us 💙",
    ],
    cta: 'Catch up',
    ctaAction: 'chat',
    gradient: 'from-pink-400 to-rose-500',
  },
  weekly_review: {
    icon: Calendar,
    title: 'Weekly review time!',
    messages: [
      "Let's look at this week's progress",
      "Time to celebrate your weekly wins!",
      "See how far {childName} has come this week",
    ],
    cta: 'View progress',
    ctaAction: 'review',
    gradient: 'from-[#6B9080] to-[#7BA7BC]',
  },
  milestone_celebration: {
    icon: TrendingUp,
    title: 'Milestone reached!',
    messages: [
      "{childName} hit a new milestone! 🎉",
      "Progress alert: Something amazing happened!",
      "Time to celebrate growth! 🌟",
    ],
    cta: 'See details',
    ctaAction: 'review',
    gradient: 'from-green-400 to-emerald-500',
  },
  encouragement: {
    icon: Sparkles,
    title: "You're doing great!",
    messages: [
      "Just a reminder: You're an amazing parent",
      "The progress you're making matters",
      "Every small step counts 💪",
    ],
    cta: 'Thanks!',
    ctaAction: 'close',
    gradient: 'from-violet-400 to-purple-500',
  },
  stress_check: {
    icon: Cloud,
    title: 'How are you holding up?',
    messages: [
      "Quick one, just about you — not the to-do list.",
      "You check on everyone else. This one's for you.",
      "One tap, ten seconds. How's your tank today?",
    ],
    cta: 'One-tap check-in',
    ctaAction: 'checkin',
    gradient: 'from-blue-400 to-indigo-500',
  },
  win_prompt: {
    icon: Coffee,
    title: 'Any wins today?',
    messages: [
      "Even small victories matter!",
      "What went well today?",
      "Let's capture today's successes",
    ],
    cta: 'Log a win',
    ctaAction: 'log',
    gradient: 'from-yellow-400 to-amber-500',
  },
};

interface ProactiveCheckInProps {
  type: CheckInType;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: CheckInAction) => void;
  childName?: string;
}

// ─── Gentle cadence for the "how are YOU?" check-in ─────────────────────────
// At most ~2x/week, never two days in a row, never within 24h of a
// crisis-resources visit, and never once the parent opts out. All
// localStorage-throttled, matching the existing check-in pattern.

const STRESS_CHECKIN_DAYS_KEY = 'aminy_stress_checkin_days';
const CRISIS_VISIT_KEY = 'aminy_crisis_resource_visit';
const PARENT_CHECKIN_OPTOUT_KEY = 'aminy_parent_checkin_optout';

export function canOfferStressCheckIn(now: Date = new Date()): boolean {
  try {
    if (localStorage.getItem(PARENT_CHECKIN_OPTOUT_KEY) === 'true') return false;

    // Never right after a crisis-resources visit
    const crisisTs = Number(localStorage.getItem(CRISIS_VISIT_KEY) || 0);
    if (crisisTs && now.getTime() - crisisTs < 24 * 60 * 60 * 1000) return false;

    const days: string[] = JSON.parse(localStorage.getItem(STRESS_CHECKIN_DAYS_KEY) || '[]');
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (days.includes(today)) return false;
    if (days.includes(yesterday)) return false; // never two days in a row

    // At most 2 offers in the trailing 7 days
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const offersThisWeek = days.filter(
      (d) => new Date(`${d}T12:00:00`).getTime() >= weekAgo
    );
    return offersThisWeek.length < 2;
  } catch {
    return false; // if storage is unreadable, err on the quiet side
  }
}

export function recordStressCheckInOffered(now: Date = new Date()): void {
  try {
    const days: string[] = JSON.parse(localStorage.getItem(STRESS_CHECKIN_DAYS_KEY) || '[]');
    const today = now.toISOString().slice(0, 10);
    if (!days.includes(today)) days.push(today);
    localStorage.setItem(STRESS_CHECKIN_DAYS_KEY, JSON.stringify(days.slice(-10)));
  } catch {
    // ignore
  }
}

export function ProactiveCheckIn({
  type,
  isOpen,
  onClose,
  onAction,
  childName = 'your child',
}: ProactiveCheckInProps) {
  const config = checkInConfigs[type];
  const Icon = config.icon;

  // Get random message
  const [message] = useState(() => {
    const messages = config.messages;
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex].replace('{childName}', childName);
  });

  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
    }
  }, [isOpen]);

  const handleAction = () => {
    triggerHaptic('success');
    onAction(config.ctaAction);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm"
        >
          <Card className="overflow-hidden shadow-xl border-0">
            {/* Header */}
            <div className={cn(
              "relative p-4 text-white bg-gradient-to-r",
              config.gradient
            )}>
              <button
                onClick={onClose}
                className="absolute top-2 right-2 min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{config.title}</h3>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 bg-white">
              <p className="text-muted-foreground mb-4">{message}</p>

              <div className="flex gap-2">
                <Button
                  onClick={handleAction}
                  className={cn(
                    "flex-1 text-white bg-gradient-to-r",
                    config.gradient
                  )}
                >
                  {config.cta}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-muted-foreground"
                >
                  Later
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to determine when to show proactive check-ins
 */
export function useProactiveCheckIns() {
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInType | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);

  useEffect(() => {
    // Load last check-in time from localStorage
    const stored = localStorage.getItem('aminy_last_checkin');
    if (stored) {
      setLastCheckIn(stored);
    }
  }, []);

  const determineCheckIn = (): CheckInType | null => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Don't show check-ins too frequently
    if (lastCheckIn) {
      const lastTime = new Date(lastCheckIn);
      const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) return null; // At least 4 hours between check-ins
    }

    // Get user's last active time from store
    const state = useAminyStore.getState();
    const lastActive = ('lastActiveAt' in state && state.lastActiveAt) ? new Date(state.lastActiveAt as string) : null;
    const daysSinceActive = lastActive
      ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // If user hasn't been active for 3+ days
    if (daysSinceActive >= 3) {
      return 'missed_you';
    }

    // Gentle "how are YOU?" check-in — its own throttle (~2x/week, never
    // consecutive days, never right after a crisis-resources visit).
    if (hour >= 9 && hour < 21 && canOfferStressCheckIn(now)) {
      return 'stress_check';
    }

    // Morning greeting (6am - 10am)
    if (hour >= 6 && hour < 10) {
      return 'morning_greeting';
    }

    // Evening reflection (7pm - 10pm)
    if (hour >= 19 && hour < 22) {
      return 'evening_reflection';
    }

    // Weekly review (Sunday afternoon)
    if (dayOfWeek === 0 && hour >= 14 && hour < 18) {
      return 'weekly_review';
    }

    // Random encouragement (20% chance during day)
    if (hour >= 10 && hour < 19 && Math.random() < 0.2) {
      return 'encouragement';
    }

    return null;
  };

  const showCheckIn = (type: CheckInType) => {
    // Count the offer itself (shown, not answered) so a dismissed prompt
    // still respects "never two days in a row / ~2x per week".
    if (type === 'stress_check') {
      recordStressCheckInOffered();
    }
    setCurrentCheckIn(type);
  };

  const dismissCheckIn = () => {
    setCurrentCheckIn(null);
    const now = new Date().toISOString();
    setLastCheckIn(now);
    localStorage.setItem('aminy_last_checkin', now);
  };

  const triggerCheckIn = () => {
    const type = determineCheckIn();
    if (type) {
      showCheckIn(type);
    }
  };

  return {
    currentCheckIn,
    showCheckIn,
    dismissCheckIn,
    triggerCheckIn,
    determineCheckIn,
  };
}

/**
 * Wrapper component that handles check-in logic automatically
 */
export function ProactiveCheckInProvider({
  children,
  childName,
  onChat,
  onLog,
  onReview,
  onCheckIn,
}: {
  children: React.ReactNode;
  childName?: string;
  onChat?: () => void;
  onLog?: () => void;
  onReview?: () => void;
  onCheckIn?: () => void;
}) {
  const { currentCheckIn, dismissCheckIn, triggerCheckIn } = useProactiveCheckIns();

  // Trigger check-in on mount and periodically
  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(triggerCheckIn, 3000);

    // Check every 30 minutes
    const interval = setInterval(triggerCheckIn, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const handleAction = (action: CheckInAction) => {
    dismissCheckIn();

    switch (action) {
      case 'chat':
        onChat?.();
        break;
      case 'log':
        onLog?.();
        break;
      case 'review':
        onReview?.();
        break;
      case 'checkin':
        // Fall back to chat if no dedicated check-in flow is mounted
        if (onCheckIn) onCheckIn();
        else onChat?.();
        break;
    }
  };

  return (
    <>
      {children}
      {currentCheckIn && (
        <ProactiveCheckIn
          type={currentCheckIn}
          isOpen={true}
          onClose={dismissCheckIn}
          onAction={handleAction}
          childName={childName}
        />
      )}
    </>
  );
}

export default ProactiveCheckIn;
