/**
 * Daily Nudge Component
 * Personalized, time-sensitive notifications to drive daily engagement
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Coffee,
  Sunrise,
  Sunset,
  Clock,
  Lightbulb,
  Heart,
  Sparkles,
  ChevronRight,
  X,
  Brain,
  Target,
  CheckCircle,
  Bell,
  Calendar,
  Star,
  Flame,
  Zap,
  Trophy,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

type NudgeType =
  | 'morning_tip'
  | 'afternoon_check'
  | 'evening_reflection'
  | 'streak_reminder'
  | 'skill_practice'
  | 'parent_self_care'
  | 'upcoming_routine'
  | 'win_prompt'
  | 'conversation_starter'
  | 'weekend_activity';

interface NudgeContent {
  icon: React.ElementType;
  gradient: string;
  getTitle: (childName: string) => string;
  getMessages: (childName: string, data?: any) => string[];
  cta: string;
  action: 'chat' | 'log' | 'activity' | 'routine' | 'dismiss';
}

const NUDGE_CONTENT: Record<NudgeType, NudgeContent> = {
  morning_tip: {
    icon: Sunrise,
    gradient: 'from-amber-400 to-orange-400',
    getTitle: () => "Good morning! Here's today's tip",
    getMessages: (childName) => [
      `Try starting {childName}'s day with a 2-minute sensory activity to improve focus.`,
      `Morning routines work best when {childName} can see what's coming next - try a visual schedule today!`,
      `A calm morning sets the tone. Try playing soft music during {childName}'s breakfast.`,
      `Did you know? Movement before learning helps {childName}'s brain focus better.`,
    ],
    cta: 'See today\'s plan',
    action: 'routine',
  },
  afternoon_check: {
    icon: Sun,
    gradient: 'from-blue-400 to-cyan-400',
    getTitle: (childName) => `How's ${childName} doing?`,
    getMessages: (childName) => [
      `Mid-day check: Has {childName} had any wins today? Even small ones count!`,
      `Afternoon energy dip? Try a 5-minute movement break with {childName}.`,
      `Quick tip: Afternoon transitions are tough. Give {childName} a 5-minute warning before activities end.`,
    ],
    cta: 'Log a win',
    action: 'log',
  },
  evening_reflection: {
    icon: Moon,
    gradient: 'from-indigo-500 to-purple-500',
    getTitle: () => 'Before the day ends...',
    getMessages: (childName) => [
      `What went well with {childName} today? Celebrating wins builds momentum!`,
      `Take a moment to reflect: What made {childName} smile today?`,
      `Evening ritual idea: Tell {childName} one specific thing you're proud of them for today.`,
    ],
    cta: 'Reflect now',
    action: 'log',
  },
  streak_reminder: {
    icon: Flame,
    gradient: 'from-orange-500 to-red-500',
    getTitle: () => "You've been showing up",
    getMessages: (childName, data) => [
      `${data?.streakDays || 0} days of consistency! Your presence matters to {childName}.`,
      `${data?.streakDays || 0} days and counting! Your steady effort is making a real difference for {childName}.`,
      `You've shown up ${data?.streakDays || 0} days in a row. That consistency is powerful.`,
    ],
    cta: 'Continue',
    action: 'log',
  },
  skill_practice: {
    icon: Target,
    gradient: 'from-emerald-400 to-teal-500',
    getTitle: (childName) => `Practice time with ${childName}`,
    getMessages: (childName, data) => [
      `Time to practice "${data?.skillName || 'the skill'}" with {childName}. Just 5 minutes makes a difference!`,
      `Research shows: Short, frequent practice beats long, occasional sessions. Try 5 minutes now!`,
    ],
    cta: 'Start practice',
    action: 'activity',
  },
  parent_self_care: {
    icon: Heart,
    gradient: 'from-rose-400 to-pink-500',
    getTitle: () => 'A moment for you',
    getMessages: () => [
      `You can't pour from an empty cup. Have you taken a break today?`,
      `Parenting is hard. You're doing an amazing job. Take a deep breath.`,
      `Quick self-care: Close your eyes for 30 seconds and breathe deeply.`,
      `Remember: Taking care of yourself isn't selfish - it makes you a better parent.`,
    ],
    cta: 'I needed this',
    action: 'dismiss',
  },
  upcoming_routine: {
    icon: Clock,
    gradient: 'from-violet-400 to-purple-500',
    getTitle: (childName) => `${childName}'s routine coming up`,
    getMessages: (childName, data) => [
      `${data?.routineName || 'Routine'} starts in ${data?.minutesUntil || 30} minutes. Start the transition early!`,
      `Heads up: ${data?.routineName || 'Activity'} is coming. Give {childName} a 10-minute warning.`,
    ],
    cta: 'View routine',
    action: 'routine',
  },
  win_prompt: {
    icon: Trophy,
    gradient: 'from-yellow-400 to-amber-500',
    getTitle: () => 'Capture a win!',
    getMessages: (childName) => [
      `Has {childName} done something great today? Small wins add up to big progress!`,
      `Even tiny victories matter. What's {childName} done well today?`,
      `Pro tip: Logging wins helps you see patterns in what works for {childName}.`,
    ],
    cta: 'Log win',
    action: 'log',
  },
  conversation_starter: {
    icon: Sparkles,
    gradient: 'from-fuchsia-500 to-pink-500',
    getTitle: (childName) => `Talk idea for ${childName}`,
    getMessages: (childName, data) => [
      `Try asking {childName}: "What was the best part of today?" - give wait time for response!`,
      `Conversation starter: Show {childName} a photo from last week and talk about what you see.`,
      `Connection idea: Let {childName} lead play for 5 minutes. Follow their interests completely.`,
    ],
    cta: 'Try it',
    action: 'dismiss',
  },
  weekend_activity: {
    icon: Star,
    gradient: 'from-cyan-400 to-blue-500',
    getTitle: () => 'Weekend activity idea',
    getMessages: (childName) => [
      `Weekends are great for sensory play! Try making slime or playing with water beads with {childName}.`,
      `Family activity idea: Create a simple obstacle course at home for {childName}.`,
      `Nature time: Even 15 minutes outside can regulate {childName}'s sensory system.`,
    ],
    cta: 'See activities',
    action: 'activity',
  },
};

interface DailyNudgeProps {
  type: NudgeType;
  childName: string;
  data?: {
    streakDays?: number;
    skillName?: string;
    routineName?: string;
    minutesUntil?: number;
  };
  onAction: (action: 'chat' | 'log' | 'activity' | 'routine' | 'dismiss') => void;
  onDismiss: () => void;
  variant?: 'card' | 'banner' | 'notification';
}

export function DailyNudge({
  type,
  childName,
  data,
  onAction,
  onDismiss,
  variant = 'card',
}: DailyNudgeProps) {
  const content = NUDGE_CONTENT[type];
  const Icon = content.icon;

  // Get random message
  const [message] = useState(() => {
    const messages = content.getMessages(childName, data);
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex].replace(/{childName}/g, childName);
  });

  const title = content.getTitle(childName);

  const handleAction = () => {
    triggerHaptic('medium');
    onAction(content.action);
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    onDismiss();
  };

  if (variant === 'notification') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -50, x: '50%' }}
        animate={{ opacity: 1, y: 0, x: '50%' }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-1/2 translate-x-1/2 z-50 max-w-sm w-full px-4"
      >
        <Card className="overflow-hidden shadow-xl border-0">
          <div className={cn(
            "flex items-center gap-3 p-4 text-white bg-gradient-to-r",
            content.gradient
          )}>
            <div className="p-2 bg-white/20 rounded-full">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{title}</p>
              <p className="text-xs text-white/80 truncate">{message}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className={cn(
          "p-4 text-white bg-gradient-to-r",
          content.gradient
        )}>
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-white/80 truncate">{message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleAction}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                {content.cta}
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/20 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default card variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden shadow-lg border-0">
        <div className={cn(
          "p-4 text-white bg-gradient-to-r",
          content.gradient
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold">{title}</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-white">
          <p className="text-muted-foreground mb-4">{message}</p>
          <Button
            onClick={handleAction}
            className={cn(
              "w-full text-white bg-gradient-to-r",
              content.gradient
            )}
          >
            {content.cta}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Hook to determine which nudge to show based on time and user data
 */
export function useDailyNudge(userData: {
  childName: string;
  streakDays?: number;
  lastActivity?: string;
  upcomingRoutine?: { name: string; time: Date };
  currentSkillFocus?: string;
}) {
  const [currentNudge, setCurrentNudge] = useState<NudgeType | null>(null);
  const [nudgeData, setNudgeData] = useState<any>(null);

  const determineNudge = (): { type: NudgeType; data?: any } | null => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check for streak at risk (evening)
    if (hour >= 19 && hour < 22 && userData.streakDays && userData.streakDays > 0) {
      const lastActivityDate = userData.lastActivity ? new Date(userData.lastActivity) : null;
      const isToday = lastActivityDate?.toDateString() === now.toDateString();

      if (!isToday) {
        return { type: 'streak_reminder', data: { streakDays: userData.streakDays } };
      }
    }

    // Check for upcoming routine
    if (userData.upcomingRoutine) {
      const minutesUntil = Math.floor(
        (userData.upcomingRoutine.time.getTime() - now.getTime()) / 60000
      );
      if (minutesUntil > 0 && minutesUntil <= 30) {
        return {
          type: 'upcoming_routine',
          data: { routineName: userData.upcomingRoutine.name, minutesUntil },
        };
      }
    }

    // Time-based nudges
    if (hour >= 6 && hour < 9) {
      return { type: 'morning_tip' };
    }

    if (hour >= 12 && hour < 14) {
      return { type: 'afternoon_check' };
    }

    if (hour >= 14 && hour < 17) {
      // Alternate between skill practice and win prompt
      if (userData.currentSkillFocus && Math.random() > 0.5) {
        return { type: 'skill_practice', data: { skillName: userData.currentSkillFocus } };
      }
      return { type: 'win_prompt' };
    }

    if (hour >= 17 && hour < 19) {
      // Parent self-care in late afternoon
      if (Math.random() > 0.7) {
        return { type: 'parent_self_care' };
      }
      return { type: 'conversation_starter' };
    }

    if (hour >= 19 && hour < 21) {
      return { type: 'evening_reflection' };
    }

    // Weekend special
    if (isWeekend && hour >= 9 && hour < 12) {
      return { type: 'weekend_activity' };
    }

    return null;
  };

  const showNudge = () => {
    const nudge = determineNudge();
    if (nudge) {
      setCurrentNudge(nudge.type);
      setNudgeData(nudge.data);
    }
  };

  const dismissNudge = () => {
    setCurrentNudge(null);
    setNudgeData(null);

    // Store dismissal time to avoid re-showing too soon
    localStorage.setItem('aminy_last_nudge_dismissed', new Date().toISOString());
  };

  const canShowNudge = (): boolean => {
    const lastDismissed = localStorage.getItem('aminy_last_nudge_dismissed');
    if (!lastDismissed) return true;

    const hoursSince = (Date.now() - new Date(lastDismissed).getTime()) / (1000 * 60 * 60);
    return hoursSince >= 2; // At least 2 hours between nudges
  };

  return {
    currentNudge,
    nudgeData,
    showNudge,
    dismissNudge,
    canShowNudge,
    childName: userData.childName,
  };
}

/**
 * Nudge Provider Component
 */
export function DailyNudgeProvider({
  children,
  userData,
  onChat,
  onLog,
  onActivity,
  onRoutine,
}: {
  children: React.ReactNode;
  userData: {
    childName: string;
    streakDays?: number;
    lastActivity?: string;
    upcomingRoutine?: { name: string; time: Date };
    currentSkillFocus?: string;
  };
  onChat?: () => void;
  onLog?: () => void;
  onActivity?: () => void;
  onRoutine?: () => void;
}) {
  const { currentNudge, nudgeData, showNudge, dismissNudge, canShowNudge, childName } =
    useDailyNudge(userData);

  useEffect(() => {
    // Check for nudge on mount after delay
    const timeout = setTimeout(() => {
      if (canShowNudge()) {
        showNudge();
      }
    }, 5000);

    // Check periodically
    const interval = setInterval(() => {
      if (canShowNudge() && !currentNudge) {
        showNudge();
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const handleAction = (action: 'chat' | 'log' | 'activity' | 'routine' | 'dismiss') => {
    dismissNudge();

    switch (action) {
      case 'chat':
        onChat?.();
        break;
      case 'log':
        onLog?.();
        break;
      case 'activity':
        onActivity?.();
        break;
      case 'routine':
        onRoutine?.();
        break;
    }
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {currentNudge && (
          <div className="fixed bottom-24 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
            <DailyNudge
              type={currentNudge}
              childName={childName}
              data={nudgeData}
              onAction={handleAction}
              onDismiss={dismissNudge}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyNudge;
