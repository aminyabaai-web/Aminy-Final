// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Streak Celebration Component
 * Celebrates user consistency and engagement
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Trophy,
  Star,
  Heart,
  Sparkles,
  PartyPopper,
  Calendar,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface StreakCelebrationProps {
  streakDays: number;
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
  milestone?: 'first' | 'week' | 'month' | 'hundred' | 'year' | null;
}

const milestoneMessages = {
  first: {
    title: "You're officially on a streak! 🔥",
    subtitle: "Day 2 - You came back! That's huge.",
    message: "Consistency is the secret sauce. You're building something beautiful.",
    emoji: '🌱',
  },
  week: {
    title: "One week strong! 🎯",
    subtitle: "7 days of showing up",
    message: "A full week! You're proving that you're committed to this journey. Keep it going!",
    emoji: '🌟',
  },
  month: {
    title: "30 days! You're amazing! 🏆",
    subtitle: "A whole month of dedication",
    message: "One month of consistent engagement. You're building lasting habits that will make a real difference.",
    emoji: '🎖️',
  },
  hundred: {
    title: "100 DAYS! Legend status! 👑",
    subtitle: "Triple digits!",
    message: "100 days. You're not just a user, you're a champion. This dedication will change everything.",
    emoji: '💎',
  },
  year: {
    title: "365 days! Incredible! 🎊",
    subtitle: "A full year of growth",
    message: "A whole year of consistent engagement. You've built something truly special. We're honored to be part of your journey.",
    emoji: '🏅',
  },
};

export function StreakCelebration({
  streakDays,
  isOpen,
  onClose,
  childName = 'your child',
  milestone,
}: StreakCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && milestone) {
      setShowConfetti(true);
      triggerHaptic('success');

      // Fire confetti for milestones
      if (typeof window !== 'undefined' && confetti) {
        const duration = milestone === 'hundred' || milestone === 'year' ? 3000 : 1500;
        const end = Date.now() + duration;

        const colors = ['#6B9080', '#90BE6D', '#F9C74F', '#F8961E', '#F94144'];

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      }
    }
  }, [isOpen, milestone]);

  const milestoneData = milestone ? milestoneMessages[milestone] : null;

  // Get appropriate icon based on streak
  const getStreakIcon = () => {
    if (streakDays >= 365) return Trophy;
    if (streakDays >= 100) return Star;
    if (streakDays >= 30) return Trophy;
    if (streakDays >= 7) return Star;
    return Flame;
  };

  const StreakIcon = getStreakIcon();

  // Get streak color
  const getStreakColor = () => {
    if (streakDays >= 100) return 'from-yellow-400 to-orange-500';
    if (streakDays >= 30) return 'from-purple-400 to-pink-500';
    if (streakDays >= 7) return 'from-accent to-teal-400';
    return 'from-orange-400 to-red-500';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Header with gradient */}
            <div className={cn(
              "relative p-8 text-center text-white bg-gradient-to-br",
              getStreakColor()
            )}>
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Animated icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, damping: 10 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <StreakIcon className="w-10 h-10" />
                </motion.div>
              </motion.div>

              {/* Streak number */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-5xl font-bold mb-1">{streakDays}</div>
                <div className="text-white/80 text-sm">day streak</div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              {milestoneData ? (
                <>
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl font-bold text-primary mb-2"
                  >
                    {milestoneData.title}
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-muted-foreground mb-4"
                  >
                    {milestoneData.message}
                  </motion.p>
                </>
              ) : (
                <>
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl font-bold text-primary mb-2"
                  >
                    Keep it up! 🔥
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-muted-foreground mb-4"
                  >
                    You're making great progress with {childName}. Every day counts!
                  </motion.p>
                </>
              )}

              {/* Next milestone hint */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-[#FAF7F2] rounded-lg p-3 mb-4"
              >
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    {streakDays < 7
                      ? `${7 - streakDays} days until your first week!`
                      : streakDays < 30
                        ? `${30 - streakDays} days until your first month!`
                        : streakDays < 100
                          ? `${100 - streakDays} days until triple digits!`
                          : streakDays < 365
                            ? `${365 - streakDays} days until a full year!`
                            : "You've achieved legendary status!"}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={onClose}
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Keep Going
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Mini streak indicator for dashboard
 */
export function StreakBadge({
  streakDays,
  onClick,
  className,
}: {
  streakDays: number;
  onClick?: () => void;
  className?: string;
}) {
  if (streakDays < 1) return null;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r",
        streakDays >= 100
          ? "from-yellow-400 to-orange-500"
          : streakDays >= 30
            ? "from-purple-400 to-pink-500"
            : streakDays >= 7
              ? "from-accent to-teal-400"
              : "from-orange-400 to-red-500",
        "text-white text-sm font-medium shadow-md",
        className
      )}
    >
      <Flame className="w-4 h-4" />
      <span>{streakDays}</span>
    </motion.button>
  );
}

export default StreakCelebration;
