/**
 * Smart Cue - Proactive AI suggestions
 * Appears subtly above chat button, disappears after 6s
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { UserContext } from '../ai/contextLayer';

interface SmartCueProps {
  userContext?: UserContext;
  currentPath: string;
  onAction?: (action: string) => void;
}

export function SmartCue({ userContext, currentPath, onAction }: SmartCueProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentCue, setCurrentCue] = useState<string | null>(null);

  useEffect(() => {
    // Generate smart cue based on context
    const cue = generateSmartCue(userContext, currentPath);
    if (cue) {
      setCurrentCue(cue);
      setIsVisible(true);

      // Auto-dismiss after 6s
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [userContext, currentPath]);

  if (!currentCue) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300
          }}
          className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-40 max-w-xs"
        >
          <div 
            className="bg-white rounded-2xl px-4 py-3 pr-10 border border-slate-200"
            style={{
              boxShadow: '0 4px 12px rgba(120, 120, 120, 0.12)'
            }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
                className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-50 to-violet-50 flex items-center justify-center mt-0.5"
              >
                <Sparkles className="w-4 h-4 text-cyan-600" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 leading-relaxed">
                  {currentCue}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Pointer */}
          <div className="absolute -bottom-2 right-8">
            <div 
              className="w-4 h-4 bg-white border-r border-b border-slate-200 transform rotate-45"
              style={{
                boxShadow: '2px 2px 4px rgba(120, 120, 120, 0.08)'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Generate smart cue based on context and analytics
 */
function generateSmartCue(userContext?: UserContext, currentPath?: string): string | null {
  if (!userContext) return null;

  const path = currentPath?.toLowerCase() || '';

  // Progress-based cues
  if (userContext.progressThisWeek) {
    const { sessionsCompleted, calmMoments } = userContext.progressThisWeek;
    
    if (sessionsCompleted >= 3 && !path.includes('/plan')) {
      return "Want to review your Calm Coins progress? 🌿";
    }
    
    if (calmMoments >= 10) {
      return "You've had 10+ calm moments this week! Want to see your wins?";
    }
  }

  // Activity-based cues
  if (userContext.lastJrSession && !path.includes('/jr')) {
    const hoursSince = getHoursSince(userContext.lastJrSession.timestamp);
    if (hoursSince > 24) {
      return "Ready for another Jr session? Kids love consistency 💙";
    }
  }

  // Struggle-based cues
  if (userContext.strugglingWith && userContext.strugglingWith.length > 0) {
    const struggle = userContext.strugglingWith[0];
    return `I have some calm cues for ${struggle}. Want to chat?`;
  }

  // Celebration-based cues
  if (userContext.celebratingWins && userContext.celebratingWins.length > 0) {
    return "Want to share your recent win with the community? 🎉";
  }

  // Coverage-based cues
  if (userContext.lastCoverageQuestion && !path.includes('/coverage')) {
    return "Need help understanding your coverage? I'm here to clarify.";
  }

  // Time-based cues
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10 && !path.includes('/plan')) {
    return "Morning! Want to build today's calm routine together?";
  }
  
  if (hour >= 19 && hour < 22) {
    return "Evening wind-down time. Need a calm transition cue?";
  }

  return null;
}

/**
 * Helper: Get hours since timestamp
 */
function getHoursSince(timestamp: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - new Date(timestamp).getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Hook to manage smart cue
 */
export function useSmartCue(userContext?: UserContext, currentPath?: string) {
  const [showCue, setShowCue] = useState(false);

  useEffect(() => {
    // Show cue after 3 seconds of being on a page
    const timer = setTimeout(() => {
      const cue = generateSmartCue(userContext, currentPath);
      if (cue) {
        setShowCue(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [userContext, currentPath]);

  return {
    showCue,
    setShowCue
  };
}
