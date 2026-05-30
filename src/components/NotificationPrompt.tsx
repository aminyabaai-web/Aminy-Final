// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Notification Prompt Component
 *
 * Prompts users to enable push notifications at the right moment.
 * Shows personalized value proposition based on child's needs.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  Check,
  Clock,
  Heart,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
} from '../lib/push-notifications';
import { supabase } from '../utils/supabase/client';

interface NotificationPromptProps {
  childName: string;
  onDismiss?: () => void;
  onEnable?: () => void;
  variant?: 'modal' | 'banner' | 'card';
}

// Personalized value propositions based on time of day
function getValueProposition(childName: string): { icon: typeof Bell; text: string } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) {
    return {
      icon: Sun,
      text: `Get morning tips to start ${childName}'s day right`,
    };
  } else if (hour >= 10 && hour < 15) {
    return {
      icon: Sparkles,
      text: `Receive timely strategies for ${childName}'s afternoon`,
    };
  } else if (hour >= 15 && hour < 19) {
    return {
      icon: Heart,
      text: `Get support for evening routines with ${childName}`,
    };
  } else {
    return {
      icon: Moon,
      text: `Receive bedtime tips for ${childName}'s sleep`,
    };
  }
}

export function NotificationPrompt({
  childName,
  onDismiss,
  onEnable,
  variant = 'card',
}: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'loading'>('loading');
  const [isEnabling, setIsEnabling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const valueProposition = getValueProposition(childName);
  const ValueIcon = valueProposition.icon;

  useEffect(() => {
    if (isPushSupported()) {
      setPermission(getNotificationPermission());
    } else {
      setPermission('denied');
    }
  }, []);

  // Don't show if already granted or not supported
  if (permission === 'granted' || permission === 'denied' || permission === 'loading') {
    return null;
  }

  const handleEnable = async () => {
    setIsEnabling(true);

    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === 'granted') {
        // Subscribe to push notifications
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await subscribeToPush(user.id);
        }

        setShowSuccess(true);
        onEnable?.();

        // Hide after success animation
        setTimeout(() => {
          onDismiss?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    // Remember dismissal for 7 days
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
    onDismiss?.();
  };

  // Success state
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-green-50 border border-green-200 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-900">Notifications enabled!</p>
            <p className="text-sm text-green-700">
              We'll send you helpful tips for {childName}.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-3"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <p className="text-sm">
              <strong>Stay connected:</strong> {valueProposition.text}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleEnable}
              disabled={isEnabling}
              size="sm"
              className="bg-white text-teal-700 hover:bg-teal-50"
            >
              {isEnabling ? 'Enabling...' : 'Enable'}
            </Button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification prompt"
              className="h-12 w-12 p-2.5 hover:bg-white/20 rounded flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Stay in the Loop</h2>
            <p className="text-purple-100">
              Get personalized tips and reminders for {childName}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {[
                { icon: Clock, text: 'Timely routine reminders' },
                { icon: Sparkles, text: 'Personalized strategies' },
                { icon: Heart, text: 'Celebration of wins' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleEnable}
              disabled={isEnabling}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
            >
              {isEnabling ? 'Enabling...' : 'Enable Notifications'}
            </Button>

            <button
              onClick={handleDismiss}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Card variant (default)
  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <ValueIcon className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            Never miss a moment
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {valueProposition.text}
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleEnable}
              disabled={isEnabling}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Bell className="w-4 h-4 mr-1" />
              {isEnabling ? 'Enabling...' : 'Enable'}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Hook to check if we should show the notification prompt
 */
export function useShouldShowNotificationPrompt(): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if push is supported
    if (!isPushSupported()) {
      setShouldShow(false);
      return;
    }

    // Check if already granted
    if (getNotificationPermission() === 'granted') {
      setShouldShow(false);
      return;
    }

    // Check if recently dismissed
    const dismissedAt = localStorage.getItem('notification-prompt-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (dismissedTime > sevenDaysAgo) {
        setShouldShow(false);
        return;
      }
    }

    // Show the prompt
    setShouldShow(true);
  }, []);

  return shouldShow;
}

export default NotificationPrompt;
