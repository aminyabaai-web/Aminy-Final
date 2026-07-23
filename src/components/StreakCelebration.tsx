// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Streak Celebration Component
 * Celebrates user consistency and engagement
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FocusTrap } from './FocusTrap';
import {
  Flame,
  Trophy,
  Star,
  Sparkles,
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
    title: "Day one — you showed up 🌱",
    subtitle: "The first step is the biggest one",
    message: "Showing up today is the whole win. Small steps, big calm — you're building something beautiful.",
    emoji: '🌱',
  },
  week: {
    title: "One week strong 🌟",
    subtitle: "7 days of showing up",
    message: "A full week of small moments, one day at a time. That kind of consistency is what real change is made of.",
    emoji: '🌟',
  },
  month: {
    title: "30 days — you're amazing 🏆",
    subtitle: "A whole month of showing up",
    message: "One gentle month, day by day. You're building habits that will make a real difference for your family.",
    emoji: '🎖️',
  },
  hundred: {
    title: "100 days! 👑",
    subtitle: "Triple digits of showing up",
    message: "100 days of showing up for your family. That kind of dedication changes everything.",
    emoji: '💎',
  },
  year: {
    title: "365 days — incredible 🎊",
    subtitle: "A full year of growth",
    message: "A whole year of showing up, one day at a time. You've built something truly special, and we're honored to be part of it.",
    emoji: '🏅',
  },
};

/** Confetti is decoration — never fire it when the user asks for less motion. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduced-motion')
  );
}

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

      // Fire confetti for milestones (skipped under prefers-reduced-motion)
      if (typeof window !== 'undefined' && confetti && !prefersReducedMotion()) {
        const duration = milestone === 'hundred' || milestone === 'year' ? 3000 : 1500;
        const end = Date.now() + duration;

        // Brand teal + earned amber/green — no reds (celebration, not alarm)
        const colors = ['#2A7D99', '#6AA9BC', '#90BE6D', '#F6A623', '#F9C74F'];

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

  // Header gradient — teal is the everyday accent; warm amber is reserved
  // for the big earned milestones (30/100/365 days). Inline styles because
  // Tailwind here is precompiled (arbitrary gradient classes may not exist).
  const headerGradient =
    streakDays >= 30
      ? 'linear-gradient(135deg, #F6A623, #E07A5F)'
      : 'linear-gradient(135deg, #2A7D99, #4795AE)';

  // NOTE: plain conditional render (no AnimatePresence exit) — the app-wide
  // WAAPI opacity workaround can keep exit animations from ever completing,
  // which would leave the backdrop stuck on screen after dismissal.
  if (!isOpen) return null;

  return (
    <FocusTrap active onEscape={onClose}>
      {/* role="dialog" lives on the backdrop — the global modal CSS pins
          [role="dialog"] to fixed inset-0, matching this element. */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={milestoneData ? milestoneData.title : `${streakDays} day streak`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Header with gradient */}
            <div
              className="relative p-8 text-center text-white"
              style={{ background: headerGradient }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close celebration"
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
                    You're making great progress with {childName}. Small steps count.
                  </motion.p>
                </>
              )}

              {/* Next milestone hint */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-[#F6FBFB] rounded-lg p-3 mb-4"
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
        </div>
    </FocusTrap>
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
