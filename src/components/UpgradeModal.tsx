/**
 * UpgradeModal — Contextual upgrade prompt
 *
 * Small, focused modal that fires at the right moment (not just on paywall).
 * 300px wide max. Dismissal suppresses for 48hrs per trigger.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import {
  ContextualTrigger,
  ContextualUpgradePrompt,
  dismissContextualUpgrade,
} from '../lib/upgrade-triggers';

interface UpgradeModalProps {
  prompt: ContextualUpgradePrompt | null;
  trigger: ContextualTrigger | null;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function UpgradeModal({
  prompt,
  trigger,
  onUpgrade,
  onDismiss,
}: UpgradeModalProps) {
  const handleDismiss = () => {
    if (trigger) dismissContextualUpgrade(trigger);
    onDismiss();
  };

  const handleUpgrade = () => {
    if (trigger) dismissContextualUpgrade(trigger);
    onUpgrade();
  };

  return (
    <AnimatePresence>
      {prompt && (
        <>
          {/* Backdrop */}
          <motion.div
            key="upgrade-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={handleDismiss}
          >
            {/* Modal card — stop propagation so clicks inside don't close */}
            <motion.div
              key="upgrade-modal-card"
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative bg-white rounded-2xl shadow-2xl p-5 w-full"
              style={{ maxWidth: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 mb-3">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </div>

              {/* Tier badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${
                  prompt.targetTier === 'pro'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-teal-100 text-teal-700'
                }`}
              >
                {prompt.targetTier === 'pro' ? 'Pro Feature' : 'Core Feature'}
              </span>

              {/* Headline */}
              <h3 className="text-base font-bold text-slate-900 mb-1 pr-4">
                {prompt.headline}
              </h3>

              {/* Subtext */}
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                {prompt.subtext}
              </p>

              {/* Value prop */}
              <div className="bg-teal-50 rounded-xl px-3 py-2 mb-4">
                <p className="text-xs font-medium text-teal-700">
                  {prompt.valueProp}
                </p>
              </div>

              {/* CTA */}
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold h-10 rounded-xl"
                onClick={handleUpgrade}
              >
                {prompt.ctaLabel}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              {/* Maybe later */}
              <button
                onClick={handleDismiss}
                className="w-full text-center text-xs text-slate-400 mt-2.5 hover:text-slate-600 transition-colors py-1"
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
