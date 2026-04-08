// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Rate Limit Badge
 * Shows remaining AI messages in a subtle, non-intrusive way
 * Highlights when running low to prompt upgrade consideration
 */

import React from 'react';
import { MessageCircle, Sparkles, Clock } from 'lucide-react';
import {
  useRateLimitStore,
  getTimeUntilReset,
  getUsagePercentage,
  isRunningLow,
  hasReachedLimit,
} from '../lib/rate-limit-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { cn } from './ui/utils';
import { trackUpgradeClicked } from '../lib/analytics-engine';

interface RateLimitBadgeProps {
  variant?: 'compact' | 'expanded';
  className?: string;
  onUpgradeClick?: () => void;
}

export function RateLimitBadge({
  variant = 'compact',
  className,
  onUpgradeClick,
}: RateLimitBadgeProps) {
  const { dailyUsage, isLoading } = useRateLimitStore();

  if (isLoading || !dailyUsage) {
    return null;
  }

  // Don't show for unlimited users (core/pro tiers have 999999 limit)
  if (dailyUsage.limit >= 999999) {
    return null;
  }

  const runningLow = isRunningLow(dailyUsage);
  const reachedLimit = hasReachedLimit(dailyUsage);
  const usagePercent = getUsagePercentage(dailyUsage);
  const timeUntilReset = getTimeUntilReset(dailyUsage.resetsAt);

  if (variant === 'expanded') {
    return (
      <div
        className={cn(
          'rounded-lg border p-3',
          reachedLimit
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
            : runningLow
            ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700',
          className
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle
              className={cn(
                'w-4 h-4',
                reachedLimit
                  ? 'text-red-600 dark:text-red-400'
                  : runningLow
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Daily Messages
            </span>
          </div>
          <span
            className={cn(
              'text-sm font-semibold',
              reachedLimit
                ? 'text-red-600 dark:text-red-400'
                : runningLow
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-white'
            )}
          >
            {dailyUsage.remaining}/{dailyUsage.limit}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              reachedLimit
                ? 'bg-red-500'
                : runningLow
                ? 'bg-amber-500'
                : 'bg-accent'
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Resets in {timeUntilReset}</span>
          </div>
          {(runningLow || reachedLimit) && onUpgradeClick && (
            <button
              onClick={() => {
                trackUpgradeClicked({
                  location: 'rate_limit_badge',
                  feature: 'ai_chat',
                });
                onUpgradeClick();
              }}
              className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium"
            >
              <Sparkles className="w-3 h-3" />
              Get unlimited
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={reachedLimit && onUpgradeClick ? onUpgradeClick : () => {}}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
              reachedLimit
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                : runningLow
                ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
              className
            )}
          >
            <MessageCircle className="w-3 h-3" />
            <span>
              {reachedLimit ? 'Limit reached' : `${dailyUsage.remaining} left`}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {reachedLimit
                ? "You've used all your messages today"
                : runningLow
                ? "You're running low on messages"
                : `${dailyUsage.remaining} of ${dailyUsage.limit} messages remaining`}
            </p>
            <p className="text-xs text-muted-foreground">
              Resets in {timeUntilReset}
            </p>
            {(reachedLimit || runningLow) && (
              <p className="text-xs text-accent">
                Upgrade to Core or Pro for unlimited messages
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline rate limit indicator for chat interfaces
 */
export function RateLimitInline({
  className,
  onUpgradeClick,
}: {
  className?: string;
  onUpgradeClick?: () => void;
}) {
  const { dailyUsage } = useRateLimitStore();

  if (!dailyUsage || dailyUsage.limit >= 999999) {
    return null;
  }

  const runningLow = isRunningLow(dailyUsage);
  const reachedLimit = hasReachedLimit(dailyUsage);

  return (
    <div
      className={cn(
        'text-xs text-center py-1',
        reachedLimit
          ? 'text-red-600 dark:text-red-400'
          : runningLow
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-slate-500 dark:text-slate-400',
        className
      )}
    >
      {reachedLimit ? (
        <span>
          Daily limit reached.{' '}
          {onUpgradeClick && (
            <button
              onClick={() => {
                trackUpgradeClicked({
                  location: 'rate_limit_inline',
                  feature: 'ai_chat',
                });
                onUpgradeClick();
              }}
              className="underline hover:no-underline font-medium"
            >
              Upgrade for unlimited
            </button>
          )}
        </span>
      ) : (
        <span>
          {dailyUsage.remaining} message{dailyUsage.remaining !== 1 ? 's' : ''}{' '}
          remaining today
        </span>
      )}
    </div>
  );
}
