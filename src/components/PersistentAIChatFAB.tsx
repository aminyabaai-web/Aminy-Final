// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Persistent AI Chat FAB - Available on every screen
 * With gentle mint-amber-lavender pulse when AI has new insights
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PersistentAIChatOverlay } from './PersistentAIChatOverlay';

interface PersistentAIChatFABProps {
  userId: string;
  currentPath: string;
  hasNewInsight?: boolean;
}

export function PersistentAIChatFAB({
  userId,
  currentPath,
  hasNewInsight = false
}: PersistentAIChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(hasNewInsight);

  useEffect(() => {
    setShowPulse(hasNewInsight);
  }, [hasNewInsight]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowPulse(false); // Clear pulse when opened
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-400 dark:to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Aminy"
          >
            {/* Gentle Pulse Animation */}
            {showPulse && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(251, 191, 36, 0.4), rgba(196, 181, 253, 0.4))'
                  }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0, 0.6]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(251, 191, 36, 0.3), rgba(196, 181, 253, 0.3))'
                  }}
                  animate={{
                    scale: [1, 1.6, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5
                  }}
                />
              </>
            )}

            {/* Icon */}
            <div className="relative z-10">
              <MessageCircle className="w-6 h-6" />
              
              {/* New Insight Badge */}
              {showPulse && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-emerald-400 via-amber-400 to-violet-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                />
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Aminy 💬
              <div className="absolute top-full right-4 -mt-1">
                <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 transform rotate-45"></div>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Overlay */}
      <PersistentAIChatOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        currentPath={currentPath}
        hasNewInsight={hasNewInsight}
      />
    </>
  );
}
