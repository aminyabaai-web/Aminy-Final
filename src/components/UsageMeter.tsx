// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Usage Meter Component
 * Shows users their current usage and encourages upgrades
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, ArrowRight, Clock, MessageCircle, FileText, Brain } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { getTierLimits, getTierDisplayName, normalizeTierName, type TierType } from '../lib/tier-utils';
import { cn } from '../lib/utils';

interface UsageMeterProps {
  tier: string;
  messagesUsedToday: number;
  documentsUploaded: number;
  memoryFactsStored: number;
  trialDaysLeft?: number;
  onUpgrade: () => void;
  className?: string;
  variant?: 'compact' | 'full' | 'inline';
}

export function UsageMeter({
  tier,
  messagesUsedToday,
  documentsUploaded,
  memoryFactsStored,
  trialDaysLeft,
  onUpgrade,
  className,
  variant = 'compact'
}: UsageMeterProps) {
  const normalizedTier = normalizeTierName(tier) as TierType;
  const limits = getTierLimits(normalizedTier);
  const tierName = getTierDisplayName(normalizedTier);

  // Calculate percentages
  const messagePercent = !limits.messagesPerDay || limits.messagesPerDay === Infinity
    ? 0
    : Math.min(100, (messagesUsedToday / limits.messagesPerDay) * 100);
  const documentPercent = !limits.documents || limits.documents === Infinity
    ? 0
    : Math.min(100, (documentsUploaded / limits.documents) * 100);

  const isNearLimit = messagePercent >= 80;
  const isAtLimit = messagePercent >= 100;

  // Inline variant for dashboard
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>
            {limits.messagesPerDay === Infinity
              ? 'Unlimited'
              : `${messagesUsedToday}/${limits.messagesPerDay}`}
          </span>
        </div>
        {normalizedTier !== 'pro' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUpgrade}
            className="text-accent hover:text-accent/80 h-7 px-2"
          >
            <Zap className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  // Compact variant for floating display
  if (variant === 'compact') {
    if (normalizedTier === 'pro') {
      return null; // Pro users don't need to see usage
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "fixed bottom-24 left-4 right-4 z-20 md:left-auto md:right-4 md:w-80",
          className
        )}
      >
        <Card className={cn(
          "p-3 shadow-lg border",
          isAtLimit ? "border-red-200 bg-red-50/80" : isNearLimit ? "border-amber-200 bg-amber-50/80" : "border-accent/20 bg-white/95"
        )}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className={cn("w-4 h-4", isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-accent")} />
                <span className="text-sm font-medium text-primary truncate">
                  {isAtLimit
                    ? "Daily limit reached"
                    : isNearLimit
                      ? `${(limits.messagesPerDay ?? 0) - messagesUsedToday} messages left`
                      : `${messagesUsedToday}/${limits.messagesPerDay ?? 'Unlimited'} messages`}
                </span>
              </div>
              <Progress
                value={messagePercent}
                className={cn(
                  "h-1.5",
                  isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-accent"
                )}
              />
            </div>
            <Button
              size="sm"
              onClick={onUpgrade}
              className={cn(
                "shrink-0",
                isAtLimit ? "bg-red-600 hover:bg-red-700" : "bg-accent hover:bg-accent/90"
              )}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {isAtLimit ? "Unlock" : "Upgrade"}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Full variant for settings/subscription page
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-primary">Your Usage</h3>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          normalizedTier === 'pro' ? "bg-purple-100 text-purple-700" :
          normalizedTier === 'core' ? "bg-accent/10 text-accent" :
          "bg-[#F0EDE8] text-[#5A6B7A]"
        )}>
          {tierName}
        </span>
      </div>

      {/* Trial Banner */}
      {trialDaysLeft !== undefined && trialDaysLeft > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">
              {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left in your trial
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {/* Messages */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">AI Messages Today</span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              isAtLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-primary"
            )}>
              {limits.messagesPerDay === Infinity
                ? 'Unlimited'
                : `${messagesUsedToday} / ${limits.messagesPerDay}`}
            </span>
          </div>
          {limits.messagesPerDay !== Infinity && (
            <Progress
              value={messagePercent}
              className={cn(
                "h-2",
                isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-accent"
              )}
            />
          )}
        </div>

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vault Documents</span>
            </div>
            <span className="text-sm font-medium text-primary">
              {limits.documents === Infinity
                ? `${documentsUploaded} stored`
                : `${documentsUploaded} / ${limits.documents}`}
            </span>
          </div>
          {limits.documents !== Infinity && (
            <Progress value={documentPercent} className="h-2" />
          )}
        </div>

        {/* Memory */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Memory</span>
            </div>
            <span className="text-sm font-medium text-primary">
              {limits.memoryFacts === Infinity
                ? `${memoryFactsStored.toLocaleString()} facts · Unlimited`
                : limits.memoryFacts === 0
                  ? 'None'
                  : `${memoryFactsStored.toLocaleString()} / ${(limits.memoryFacts ?? 0).toLocaleString()} facts`}
            </span>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      {normalizedTier !== 'pro' && (
        <div className="mt-5 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {isAtLimit
                  ? "Need more messages?"
                  : normalizedTier === 'free'
                    ? "Unlock AI memories"
                    : "Go unlimited"}
              </p>
              <p className="text-sm text-muted-foreground">
                {normalizedTier === 'free'
                  ? "Upgrade for unlimited chat & memory"
                  : "Pro includes unlimited everything"}
              </p>
            </div>
            <Button onClick={onUpgrade} className="bg-accent hover:bg-accent/90">
              Upgrade
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Social Proof Banner - Shows other users upgrading
 */
export function UpgradeUrgencyBanner({
  recentUpgrades = 47,
  onUpgrade,
  className
}: {
  recentUpgrades?: number;
  onUpgrade: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-r from-accent/5 via-purple-50/50 to-accent/5 border border-accent/10 rounded-lg p-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-500 border-2 border-white flex items-center justify-center"
              >
                <span className="text-sm text-white font-medium">
                  {['S', 'M', 'J'][i]}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">{recentUpgrades} parents</span> upgraded this week
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUpgrade}
          className="text-accent hover:text-accent/80"
        >
          See plans
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
