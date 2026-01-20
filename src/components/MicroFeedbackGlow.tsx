/**
 * Micro-Feedback Glow - Intelligent reinforcement after task completion
 * Shows warm encouragement from warm-messages.ts
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart } from 'lucide-react';

export type FeedbackTrigger = 'jr_session' | 'shop_purchase' | 'hub_post' | 'plan_complete' | 'calm_moment';

interface MicroFeedbackGlowProps {
  trigger?: FeedbackTrigger;
  onDismiss?: () => void;
}

const WARM_MESSAGES: Record<FeedbackTrigger, string[]> = {
  jr_session: [
    "Small wins build big calm 🌿",
    "You're building progress, one cue at a time",
    "Every moment of practice matters",
    "Celebrating this win with you ✨"
  ],
  shop_purchase: [
    "Smart choice — you're investing in calm 💚",
    "Every tool you add is a step toward ease",
    "You're building your support toolkit",
    "This is how change happens, one resource at a time"
  ],
  hub_post: [
    "Your voice matters here 💙",
    "Sharing your story helps others feel less alone",
    "Community connection is powerful",
    "Thank you for being here"
  ],
  plan_complete: [
    "Look at you showing up 🌟",
    "Progress over perfection, always",
    "You did it — that's what matters",
    "One step at a time, you're moving forward"
  ],
  calm_moment: [
    "You found calm — that's worth celebrating",
    "Moments like these build lasting change",
    "Noticing the calm is progress itself",
    "You're learning what works for you"
  ]
};

export function MicroFeedbackGlow({ trigger, onDismiss }: MicroFeedbackGlowProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (trigger) {
      // Pick random warm message
      const messages = WARM_MESSAGES[trigger];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setMessage(randomMessage);
      setIsVisible(true);

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Gentle Glow Line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 h-1 origin-left"
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.6), rgba(251, 191, 36, 0.6), rgba(196, 181, 253, 0.6))',
              boxShadow: '0 2px 12px rgba(16, 185, 129, 0.3)'
            }}
          />

          {/* Feedback Message Card */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 px-6 py-4 flex items-center gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="shrink-0"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-violet-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 font-medium">
                  {message}
                </p>
              </div>

              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to trigger micro-feedback
 */
export function useMicroFeedback() {
  const [currentTrigger, setCurrentTrigger] = useState<FeedbackTrigger | undefined>();

  const showFeedback = (trigger: FeedbackTrigger) => {
    setCurrentTrigger(trigger);
  };

  const clearFeedback = () => {
    setCurrentTrigger(undefined);
  };

  return {
    currentTrigger,
    showFeedback,
    clearFeedback
  };
}
