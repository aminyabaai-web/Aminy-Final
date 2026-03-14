/**
 * Morning Mission Component
 * Drives daily engagement with a "morning anchor ritual"
 * Shown prominently when user opens app in the morning
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Target,
  Brain,
  Heart,
  Zap,
  Star,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

interface MissionStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: 'quick_check' | 'set_intention' | 'review_plan' | 'chat';
  completed: boolean;
}

interface MorningMissionProps {
  childName: string;
  parentName: string;
  streakDays: number;
  onComplete: () => void;
  onOpenChat: () => void;
  onViewPlan: () => void;
  className?: string;
}

// Daily mission templates based on day of week
const MISSION_TEMPLATES = {
  monday: {
    theme: 'Fresh Start',
    greeting: "Let's start the week strong!",
    icon: Zap,
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    iconSurface: 'bg-sky-100 text-sky-700',
    progress: 'bg-sky-500',
  },
  tuesday: {
    theme: 'Build Momentum',
    greeting: "You're doing great. Keep it up!",
    icon: Target,
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconSurface: 'bg-emerald-100 text-emerald-700',
    progress: 'bg-emerald-500',
  },
  wednesday: {
    theme: 'Midweek Check-in',
    greeting: "Halfway there! How's it going?",
    icon: Brain,
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    iconSurface: 'bg-violet-100 text-violet-700',
    progress: 'bg-violet-500',
  },
  thursday: {
    theme: 'Practice Time',
    greeting: 'Consistency is key. Small steps matter.',
    icon: Star,
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    iconSurface: 'bg-amber-100 text-amber-700',
    progress: 'bg-amber-500',
  },
  friday: {
    theme: 'Celebrate Progress',
    greeting: "Almost weekend! Let's celebrate wins.",
    icon: Sparkles,
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    iconSurface: 'bg-rose-100 text-rose-700',
    progress: 'bg-rose-500',
  },
  saturday: {
    theme: 'Weekend Connection',
    greeting: 'Weekend time for special moments.',
    icon: Heart,
    badge: 'border-pink-200 bg-pink-50 text-pink-700',
    iconSurface: 'bg-pink-100 text-pink-700',
    progress: 'bg-pink-500',
  },
  sunday: {
    theme: 'Prep & Reflect',
    greeting: 'Rest and prepare for the week ahead.',
    icon: Coffee,
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    iconSurface: 'bg-indigo-100 text-indigo-700',
    progress: 'bg-indigo-500',
  },
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getMissionStorageKey(): string {
  const today = new Date().toISOString().split('T')[0];
  return `aminy_morning_mission_${today}`;
}

export function MorningMission({
  childName,
  parentName,
  streakDays,
  onComplete,
  onOpenChat,
  onViewPlan,
  className,
}: MorningMissionProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(getMissionStorageKey());
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [showCelebration, setShowCelebration] = useState(false);

  const dayOfWeek = DAY_NAMES[new Date().getDay()];
  const template = MISSION_TEMPLATES[dayOfWeek];
  const ThemeIcon = template.icon;

  const missionSteps: MissionStep[] = useMemo(() => [
    {
      id: 'quick_check',
      title: 'Quick Check-in',
      description: `How did ${childName} sleep? How are you feeling?`,
      icon: Coffee,
      action: 'quick_check' as const,
      completed: completedSteps.has('quick_check'),
    },
    {
      id: 'set_intention',
      title: 'Set Today\'s Intention',
      description: 'One small goal for today',
      icon: Target,
      action: 'set_intention' as const,
      completed: completedSteps.has('set_intention'),
    },
    {
      id: 'review_plan',
      title: 'Review the Day',
      description: 'Glance at today\'s routines',
      icon: Clock,
      action: 'review_plan' as const,
      completed: completedSteps.has('review_plan'),
    },
  ], [childName, completedSteps]);

  const allCompleted = missionSteps.every(step => step.completed);
  const progress = (completedSteps.size / missionSteps.length) * 100;

  useEffect(() => {
    localStorage.setItem(getMissionStorageKey(), JSON.stringify([...completedSteps]));
  }, [completedSteps]);

  useEffect(() => {
    if (allCompleted && !showCelebration) {
      setShowCelebration(true);
      triggerHaptic('success');
      onComplete();
    }
  }, [allCompleted, showCelebration, onComplete]);

  const handleStepAction = (step: MissionStep) => {
    triggerHaptic('light');

    switch (step.action) {
      case 'quick_check':
      case 'set_intention':
        onOpenChat();
        break;
      case 'review_plan':
        onViewPlan();
        break;
      case 'chat':
        onOpenChat();
        break;
    }

    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, step.id]));
  };

  const handleQuickComplete = (stepId: string) => {
    triggerHaptic('medium');
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  if (allCompleted && showCelebration) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={className}
      >
        <Card className="overflow-hidden border border-teal-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
          <div className="border-b border-teal-100 bg-[linear-gradient(180deg,#f8fffe_0%,#eefbf8_100%)] p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mb-4 inline-flex rounded-full bg-teal-100 p-4 text-teal-700"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Morning Mission Complete!</h3>
            <p className="text-sm text-slate-600">
              You're set for a great day with {childName}
            </p>
            {streakDays > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-teal-700">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">{streakDays} day streak!</span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
        {/* Header */}
        <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f7fb_100%)] p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className={cn('rounded-2xl p-2.5 shadow-sm', template.iconSurface)}>
              <ThemeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]', template.badge)}>
                {template.theme}
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                {getTimeOfDayGreeting()}, {parentName.split(' ')[0]}!
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{template.greeting}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-2 flex justify-between text-sm text-slate-500">
              <span className="font-medium text-slate-700">Morning Mission</span>
              <span>{completedSteps.size}/{missionSteps.length} complete</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn('h-full rounded-full', template.progress)}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Mission Steps */}
        <div className="space-y-3 bg-white p-4">
          {missionSteps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-center gap-3 rounded-2xl p-3 transition-all',
                  step.completed
                    ? 'border border-emerald-200 bg-emerald-50/80'
                    : 'border border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-white'
                )}
              >
                <div className={cn(
                  'rounded-xl p-2',
                  step.completed
                    ? 'bg-emerald-100'
                    : 'border border-slate-200 bg-white'
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <StepIcon className="w-5 h-5 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-sm',
                    step.completed ? 'text-emerald-700' : 'text-slate-900'
                  )}>
                    {step.title}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {step.description}
                  </p>
                </div>

                {!step.completed && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickComplete(step.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                      aria-label={`Mark ${step.title} as done`}
                      title="Mark as done"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStepAction(step)}
                      className="h-11 w-11 text-gray-600"
                      aria-label={`Open ${step.title}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Quick Chat CTA */}
          <div className="pt-2">
            <Button
              onClick={onOpenChat}
              className="h-12 w-full rounded-2xl bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] hover:bg-slate-800"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with Aminy
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Hook to determine if we should show the morning mission
 */
export function useMorningMission(): {
  shouldShow: boolean;
  isCompleted: boolean;
  markAsSeen: () => void;
} {
  const [shouldShow, setShouldShow] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;

    const storageKey = getMissionStorageKey();
    const stored = localStorage.getItem(storageKey);
    const completedSteps = stored ? new Set(JSON.parse(stored)) : new Set();

    // Show if it's morning and mission not fully completed
    setIsCompleted(completedSteps.size >= 3);
    setShouldShow(isMorning && completedSteps.size < 3);
  }, []);

  const markAsSeen = () => {
    setShouldShow(false);
  };

  return { shouldShow, isCompleted, markAsSeen };
}

export default MorningMission;
