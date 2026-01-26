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
    gradient: 'from-blue-500 to-cyan-500',
  },
  tuesday: {
    theme: 'Build Momentum',
    greeting: "You're doing great. Keep it up!",
    icon: Target,
    gradient: 'from-emerald-500 to-teal-500',
  },
  wednesday: {
    theme: 'Midweek Check-in',
    greeting: "Halfway there! How's it going?",
    icon: Brain,
    gradient: 'from-violet-500 to-purple-500',
  },
  thursday: {
    theme: 'Practice Time',
    greeting: 'Consistency is key. Small steps matter.',
    icon: Star,
    gradient: 'from-amber-500 to-orange-500',
  },
  friday: {
    theme: 'Celebrate Progress',
    greeting: "Almost weekend! Let's celebrate wins.",
    icon: Sparkles,
    gradient: 'from-pink-500 to-rose-500',
  },
  saturday: {
    theme: 'Weekend Connection',
    greeting: 'Weekend time for special moments.',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-500',
  },
  sunday: {
    theme: 'Prep & Reflect',
    greeting: 'Rest and prepare for the week ahead.',
    icon: Coffee,
    gradient: 'from-indigo-500 to-blue-500',
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
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className={cn(
            "p-6 text-white bg-gradient-to-r text-center",
            template.gradient
          )}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex p-4 bg-white/20 rounded-full mb-4"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">Morning Mission Complete!</h3>
            <p className="text-white/80">
              You're set for a great day with {childName}
            </p>
            {streakDays > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
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
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Header */}
        <div className={cn(
          "p-4 text-white bg-gradient-to-r",
          template.gradient
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ThemeIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">{template.theme}</p>
              <h3 className="text-lg font-bold">
                {getTimeOfDayGreeting()}, {parentName.split(' ')[0]}!
              </h3>
            </div>
          </div>
          <p className="text-white/80 text-sm">{template.greeting}</p>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Morning Mission</span>
              <span>{completedSteps.size}/{missionSteps.length} complete</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-white rounded-full"
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Mission Steps */}
        <div className="p-4 bg-white space-y-3">
          {missionSteps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  step.completed
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  step.completed
                    ? "bg-green-100"
                    : "bg-white border border-gray-200"
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <StepIcon className="w-5 h-5 text-gray-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    step.completed && "text-green-700"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                {!step.completed && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickComplete(step.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Mark as done"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStepAction(step)}
                      className="text-gray-600"
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
              className={cn(
                "w-full text-white bg-gradient-to-r",
                template.gradient
              )}
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
