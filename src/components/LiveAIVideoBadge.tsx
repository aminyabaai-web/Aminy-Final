// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Video, Clock, Star, Infinity as InfinityIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { TierType, getLiveAIVideoLimit, hasLiveAIVideo, getTierDisplayName } from '../lib/tier-utils';

interface LiveAIVideoBadgeProps {
  tier: TierType;
  variant?: 'default' | 'minimal' | 'compact';
}

/**
 * Live AI Video Badge
 * Displays the user's Live AI Video access level based on tier
 *
 * Limits per tier (from tier-utils.ts):
 * - Free: No access
 * - Starter: No access
 * - Core: No included access (pay per use via marketplace)
 * - Pro: 30 minutes/month included
 * - Pro+: Unlimited
 */
export function LiveAIVideoBadge({ tier, variant = 'default' }: LiveAIVideoBadgeProps) {
  const limit = getLiveAIVideoLimit(tier);
  const hasAccess = hasLiveAIVideo(tier);

  if (!hasAccess) {
    // Show upgrade prompt for non-Pro tiers
    if (variant === 'compact') return null;

    return (
      <Badge
        variant="outline"
        className="bg-gray-50 border-gray-200 text-gray-500 inline-flex items-center gap-1 font-medium"
      >
        <Video className="w-3 h-3" />
        Upgrade to Pro for Live AI Video
      </Badge>
    );
  }

  // Pro tier: 30 min/month
  if (tier === 'pro') {
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 border-blue-200 text-blue-700 inline-flex items-center gap-1 font-medium"
      >
        <Video className="w-3 h-3" />
        {variant === 'minimal' || variant === 'compact'
          ? '30 min/mo'
          : 'Live AI Video: 30 min/month'}
      </Badge>
    );
  }

  // Pro+ tier: Unlimited
  if (tier === 'proplus') {
    return (
      <Badge
        variant="outline"
        className="bg-purple-50 border-purple-200 text-purple-700 inline-flex items-center gap-1 font-medium"
      >
        {variant === 'compact' ? (
          <InfinityIcon className="w-3 h-3" />
        ) : (
          <Star className="w-3 h-3" />
        )}
        {variant === 'minimal' || variant === 'compact'
          ? 'Unlimited Video'
          : 'Live AI Video: Unlimited'}
      </Badge>
    );
  }

  return null;
}

interface RemainingMinutesBadgeProps {
  usedMinutes: number;
  tier: TierType;
}

/**
 * Remaining Minutes Badge
 * Shows how many Live AI Video minutes the user has left this month
 */
export function RemainingMinutesBadge({ usedMinutes, tier }: RemainingMinutesBadgeProps) {
  const limit = getLiveAIVideoLimit(tier);

  // No limit tracking for tiers without limits or with unlimited access
  if (limit === null || limit === 0) {
    if (tier === 'proplus') {
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 border-purple-200 text-purple-700 inline-flex items-center gap-1 font-medium"
        >
          <InfinityIcon className="w-3 h-3" />
          Unlimited minutes
        </Badge>
      );
    }
    return null;
  }

  const remainingMinutes = Math.max(0, limit - usedMinutes);
  const percentage = (remainingMinutes / limit) * 100;

  let bgColor = 'bg-green-50';
  let borderColor = 'border-green-200';
  let textColor = 'text-green-700';

  if (percentage < 25) {
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
    textColor = 'text-red-700';
  } else if (percentage < 50) {
    bgColor = 'bg-amber-50';
    borderColor = 'border-amber-200';
    textColor = 'text-amber-700';
  }

  return (
    <Badge
      variant="outline"
      className={`${bgColor} ${borderColor} ${textColor} inline-flex items-center gap-1 font-medium`}
    >
      <Clock className="w-3 h-3" />
      {remainingMinutes} of {limit} min left
    </Badge>
  );
}

interface VideoAccessStatusProps {
  tier: TierType;
  usedMinutes?: number;
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * Combined Video Access Status Component
 * Shows both the tier's video access level and remaining minutes
 */
export function VideoAccessStatus({
  tier,
  usedMinutes = 0,
  showUpgrade = true,
  onUpgradeClick
}: VideoAccessStatusProps) {
  const hasAccess = hasLiveAIVideo(tier);
  const limit = getLiveAIVideoLimit(tier);
  const isUnlimited = limit === null && hasAccess;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <LiveAIVideoBadge tier={tier} variant="default" />
        {hasAccess && !isUnlimited && (
          <RemainingMinutesBadge usedMinutes={usedMinutes} tier={tier} />
        )}
      </div>

      {!hasAccess && showUpgrade && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="text-sm text-cyan-600 hover:text-[#4a6478] font-medium transition-colors"
        >
          Upgrade to {getTierDisplayName('pro')} for Live AI Video coaching →
        </button>
      )}

      {tier === 'pro' && showUpgrade && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
        >
          Upgrade to {getTierDisplayName('proplus')} for unlimited video →
        </button>
      )}
    </div>
  );
}
