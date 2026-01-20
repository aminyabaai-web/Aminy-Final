/**
 * Bevel-Style Chat FAB - Fixed bottom-right with soft pulse
 * Quiet luxury aesthetic with emotional warmth
 */

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BevelChatOverlay } from './BevelChatOverlay';

interface BevelChatFABProps {
  userId: string;
  currentPath: string;
  hasInsight?: boolean;
}

export function BevelChatFAB({
  userId,
  currentPath,
  hasInsight = false
}: BevelChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50"
          >
            {/* Soft Pulse Ring (when has insight) */}
            {hasInsight && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
                  filter: 'blur(8px)'
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0, 0.4]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}

            {/* Main Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="relative w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-full flex items-center justify-center group"
              style={{
                boxShadow: '0 4px 12px rgba(120, 120, 120, 0.15)'
              }}
              aria-label="Ask Aminy"
            >
              <MessageCircle className="w-6 h-6" strokeWidth={2} />

              {/* Insight Badge */}
              {hasInsight && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full border-2 border-white"
                  animate={{
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity
                  }}
                />
              )}

              {/* Tooltip */}
              <div 
                className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
              >
                Ask Aminy 💬
                <div className="absolute top-full right-4 -mt-1">
                  <div className="w-2 h-2 bg-slate-900 transform rotate-45"></div>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Overlay */}
      <BevelChatOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        currentPath={currentPath}
      />
    </>
  );
}
