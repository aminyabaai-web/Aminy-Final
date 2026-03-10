/**
 * UpgradePrompt.tsx
 *
 * Component for displaying contextual upgrade prompts.
 * Supports modal, banner, inline, and toast variants.
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  X,
  Sparkles,
  Crown,
  Zap,
  Gift,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { UpgradeTrigger as UpgradePromptType } from '../lib/upgrade-triggers';
import { recordTriggerShown as trackPromptShown, recordTriggerDismissed as trackPromptDismissed } from '../lib/upgrade-triggers';
import { tierPricing } from '../lib/tier-utils';

interface UpgradePromptProps {
  prompt: UpgradePromptType;
  userId: string;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

// Prices derived from tier-utils.ts (single source of truth)
const TIER_PRICES: Record<string, string> = {
  starter: `$${tierPricing.starter.monthly}`,
  core: `$${tierPricing.core.monthly}`,
  pro: `$${tierPricing.pro.monthly}`,
};

const TIER_COLORS: Record<string, string> = {
  starter: 'from-blue-500 to-indigo-600',
  core: 'from-purple-500 to-violet-600',
  pro: 'from-amber-500 to-orange-600',
};

export function UpgradePrompt({
  prompt,
  userId,
  onDismiss,
  onUpgrade,
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Track that prompt was shown
    trackPromptShown(prompt.type);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    trackPromptDismissed(prompt.type);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    window.location.href = prompt.ctaLink ?? '/upgrade';
    onUpgrade?.();
  };

  const recTier = prompt.recommendedTier ?? 'core';

  if (!isVisible) return null;

  // Inline variant
  if (prompt.variant === 'inline') {
    return (
      <Card className={`p-4 border-2 ${
        prompt.urgency === 'high'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
          : 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${TIER_COLORS[recTier]} flex items-center justify-center flex-shrink-0`}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
              {prompt.title}
            </h4>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mb-3">
              {prompt.description}
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              >
                <Zap className="w-4 h-4 mr-1" />
                {prompt.ctaText}
              </Button>
              {prompt.showFreeTrial && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <Gift className="w-3 h-3 mr-1" />
                  7-day free trial
                </Badge>
              )}
              {prompt.dismissable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-neutral-500"
                >
                  Maybe later
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Banner variant
  if (prompt.variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`relative overflow-hidden ${
            prompt.urgency === 'high'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-teal-600 to-cyan-600'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="w-5 h-5" />
                <p className="font-medium">
                  {prompt.title}
                </p>
                <span className="hidden sm:inline text-white/80">
                  {(prompt.description ?? '').substring(0, 60)}...
                </span>
              </div>
              <div className="flex items-center gap-2">
                {prompt.showFreeTrial && (
                  <Badge className="bg-white/20 text-white border-0">
                    Free trial
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={handleUpgrade}
                  className="bg-white text-teal-700 hover:bg-white/90"
                >
                  {prompt.ctaText}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                {prompt.dismissable && (
                  <button
                    onClick={handleDismiss}
                    className="text-white/80 hover:text-white p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Modal variant
  if (prompt.variant === 'modal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={prompt.dismissable ? handleDismiss : (e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <Card className="w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className={`bg-gradient-to-br ${TIER_COLORS[recTier]} p-6 text-white text-center`}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                  <Crown className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-1">{prompt.title}</h3>
                <p className="text-white/80">
                  Upgrade to {recTier.charAt(0).toUpperCase() + recTier.slice(1)}
                </p>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-neutral-600 dark:text-slate-400 mb-6 text-center">
                  {prompt.description}
                </p>

                {/* Price */}
                <div className="text-center mb-6">
                  <span className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {TIER_PRICES[recTier]}
                  </span>
                  <span className="text-neutral-500">/month</span>
                </div>

                {/* Free trial badge */}
                {prompt.showFreeTrial && (
                  <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Gift className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      Start with a 7-day free trial
                    </span>
                  </div>
                )}

                {/* CTA */}
                <Button
                  onClick={handleUpgrade}
                  className={`w-full h-12 bg-gradient-to-r ${TIER_COLORS[recTier]} hover:opacity-90`}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {prompt.ctaText}
                </Button>

                {/* Dismiss */}
                {prompt.dismissable && (
                  <button
                    onClick={handleDismiss}
                    className="w-full mt-3 text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Maybe later
                  </button>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Toast variant (simplified)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="p-4 shadow-lg max-w-sm">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${TIER_COLORS[recTier]} flex items-center justify-center flex-shrink-0`}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-neutral-900 dark:text-white text-sm">
                {prompt.title}
              </h4>
              <Button
                size="sm"
                onClick={handleUpgrade}
                className="mt-2 h-8 text-xs bg-teal-600 hover:bg-teal-700"
              >
                {prompt.ctaText}
              </Button>
            </div>
            {prompt.dismissable && (
              <button onClick={handleDismiss} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export default UpgradePrompt;
