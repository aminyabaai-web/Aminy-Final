// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Proactive Nudge System
 * Implements the "proactive system" that reaches out to users
 * Addresses: "Generic AI is reactive; Aminy reaches out proactively"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Heart,
  Clock,
  Target,
  Sparkles,
  X,
  ChevronRight,
  Zap,
  Calendar,
  TrendingUp,
  AlertCircle,
  Coffee,
  Moon,
  Sun,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { triggerHaptic } from '../lib/haptics';

interface Nudge {
  id: string;
  type: 'check_in' | 'reminder' | 'celebration' | 'insight' | 'self_care' | 'action';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: {
    label: string;
    target: string;
  };
  icon: React.ElementType;
  gradient: string;
  dismissable: boolean;
  expiresAt?: Date;
}

interface ProactiveNudgeSystemProps {
  userId?: string;
  childName?: string;
  parentName?: string;
  userTier?: string;
  lastActivity?: Date;
  currentStreak?: number;
  stressLevel?: number;
  routineAdherence?: number;
  onAction?: (nudge: Nudge) => void;
}

// Smart nudge generation based on user context
function generateContextualNudges(props: ProactiveNudgeSystemProps): Nudge[] {
  const nudges: Nudge[] = [];
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  const {
    childName = 'your child',
    parentName = 'there',
    lastActivity,
    currentStreak = 0,
    stressLevel = 5,
    routineAdherence = 70,
  } = props;

  // Time-based nudges
  if (hour >= 6 && hour < 9) {
    nudges.push({
      id: 'morning_checkin',
      type: 'check_in',
      priority: 'medium',
      title: `Good morning, ${parentName}!`,
      message: `How are you feeling about today? A quick check-in helps us tailor ${childName}'s activities.`,
      action: { label: 'Check in', target: 'stress_check' },
      icon: Sun,
      gradient: 'from-amber-400 to-orange-400',
      dismissable: true,
    });
  }

  if (hour >= 20 && hour < 22) {
    nudges.push({
      id: 'evening_reflection',
      type: 'check_in',
      priority: 'low',
      title: 'How did today go?',
      message: `Take a moment to reflect on ${childName}'s day. What worked? What was challenging?`,
      action: { label: 'Reflect', target: 'daily_log' },
      icon: Moon,
      gradient: 'from-indigo-500 to-purple-500',
      dismissable: true,
    });
  }

  // Activity-based nudges
  if (lastActivity) {
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (hoursSinceActivity > 24 && hoursSinceActivity < 48) {
      nudges.push({
        id: 'gentle_reminder',
        type: 'reminder',
        priority: 'medium',
        title: 'We miss you!',
        message: `${childName}'s progress continues when you do. Just 2 minutes with Aminy keeps the momentum going.`,
        action: { label: 'Quick activity', target: 'quick_activity' },
        icon: Heart,
        gradient: 'from-rose-400 to-pink-500',
        dismissable: true,
      });
    }
  }

  // Streak-based nudges
  if (currentStreak > 0 && currentStreak % 7 === 0) {
    nudges.push({
      id: 'streak_celebration',
      type: 'celebration',
      priority: 'high',
      title: `${currentStreak}-day streak! 🔥`,
      message: `You've been showing up for ${childName} consistently. That's real progress, measured and tracked.`,
      action: { label: 'See progress', target: 'outcomes' },
      icon: Zap,
      gradient: 'from-amber-500 to-red-500',
      dismissable: true,
    });
  }

  // Stress-based nudges (proactive self-care)
  if (stressLevel >= 7) {
    nudges.push({
      id: 'self_care_alert',
      type: 'self_care',
      priority: 'high',
      title: 'You deserve a break',
      message: `Your stress has been elevated. Taking care of yourself isn't selfish—it makes you a better parent.`,
      action: { label: 'Breathing exercise', target: 'calm_tools' },
      icon: Coffee,
      gradient: 'from-[#6B9080] to-[#7BA7BC]',
      dismissable: false, // Important - don't let them dismiss self-care
    });
  }

  // Routine adherence nudges
  if (routineAdherence < 60) {
    nudges.push({
      id: 'routine_help',
      type: 'insight',
      priority: 'medium',
      title: 'Routines getting tough?',
      message: `We noticed routine completion has dipped. Would you like to simplify or adjust ${childName}'s schedule?`,
      action: { label: 'Adjust routines', target: 'routines' },
      icon: Target,
      gradient: 'from-blue-400 to-indigo-500',
      dismissable: true,
    });
  }

  // Data-driven insights
  if (dayOfWeek === 1) {
    nudges.push({
      id: 'weekly_insight',
      type: 'insight',
      priority: 'low',
      title: 'Your weekly progress is ready',
      message: `See how ${childName} did last week—stress trends, routine wins, and what's working.`,
      action: { label: 'View report', target: 'weekly_report' },
      icon: TrendingUp,
      gradient: 'from-green-400 to-emerald-500',
      dismissable: true,
    });
  }

  return nudges;
}

export function ProactiveNudgeSystem(props: ProactiveNudgeSystemProps) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showNudges, setShowNudges] = useState(true);

  // Generate nudges based on context
  useEffect(() => {
    const generated = generateContextualNudges(props);
    setNudges(generated);
  }, [props.lastActivity, props.currentStreak, props.stressLevel, props.routineAdherence]);

  // Filter out dismissed nudges
  const activeNudges = nudges.filter((n) => !dismissedIds.has(n.id));

  const dismissNudge = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    triggerHaptic('light');

    // Store dismissal in localStorage
    const dismissed = JSON.parse(localStorage.getItem('aminy_dismissed_nudges') || '{}');
    dismissed[id] = Date.now();
    localStorage.setItem('aminy_dismissed_nudges', JSON.stringify(dismissed));
  };

  const handleAction = (nudge: Nudge) => {
    triggerHaptic('medium');
    props.onAction?.(nudge);
  };

  if (!showNudges || activeNudges.length === 0) {
    return null;
  }

  // Show only the highest priority nudge
  const topNudge = activeNudges.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  })[0];

  const Icon = topNudge.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="mb-4"
      >
        <Card className={`overflow-hidden shadow-lg border-0`}>
          <div className={`p-4 text-white bg-gradient-to-r ${topNudge.gradient}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{topNudge.title}</h3>
                  <p className="text-sm text-white/90 mt-1">{topNudge.message}</p>

                  {/* Proactive support differentiation */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-white/70">
                    <Zap className="w-3 h-3" />
                    <span>Aminy reaches out proactively—you never have to ask.</span>
                  </div>
                </div>
              </div>

              {topNudge.dismissable && (
                <button
                  onClick={() => dismissNudge(topNudge.id)}
                  className="h-11 w-11 hover:bg-white/20 rounded-full flex-shrink-0 flex items-center justify-center"
                  aria-label={`Dismiss ${topNudge.title}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {topNudge.action && (
            <div className="p-3 bg-white">
              <Button
                onClick={() => handleAction(topNudge)}
                className={`w-full h-12 bg-gradient-to-r ${topNudge.gradient} text-white border-0`}
              >
                {topNudge.action.label}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>

        {/* Count indicator if multiple nudges */}
        {activeNudges.length > 1 && (
          <div className="mt-2 text-center">
            <Badge variant="outline" className="text-sm">
              +{activeNudges.length - 1} more notification{activeNudges.length > 2 ? 's' : ''}
            </Badge>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Notification Permission Request
 * Asks for push notification permission to enable real proactive nudges
 */
export function NotificationPermissionRequest({
  onGranted,
  onDenied,
}: {
  onGranted?: () => void;
  onDenied?: () => void;
}) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      onDenied?.();
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      onGranted?.();
      // Register for push notifications here
    } else {
      onDenied?.();
    }
  };

  if (permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-[#FAF7F2] to-[#F5F2EC] border-blue-200">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">
            Get proactive support
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Enable notifications so Aminy can reach out with timely reminders,
            check-ins, and celebrations. This is what makes Aminy uniquely supportive.
          </p>
          <Button
            onClick={requestPermission}
            size="sm"
            className="mt-3 bg-blue-600 hover:bg-blue-700"
          >
            <Bell className="w-4 h-4 mr-2" />
            Enable notifications
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default ProactiveNudgeSystem;
