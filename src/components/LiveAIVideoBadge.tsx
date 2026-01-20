import React from 'react';
import { Video, Clock, Star } from 'lucide-react';
import { Badge } from './ui/badge';

interface LiveAIVideoBadgeProps {
  tier: 'free' | 'core' | 'pro' | 'pro-plus';
  variant?: 'default' | 'minimal';
}

export function LiveAIVideoBadge({ tier, variant = 'default' }: LiveAIVideoBadgeProps) {
  const badges = {
    free: {
      label: 'No Live AI Video',
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-600',
      icon: Video,
      show: false
    },
    core: {
      label: 'Live AI Video (short bursts)',
      shortLabel: 'Short sessions',
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      icon: Video,
      show: true
    },
    pro: {
      label: 'Live AI Video (up to 10 min)',
      shortLabel: '10-min sessions',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      icon: Video,
      show: true
    },
    'pro-plus': {
      label: 'Live AI Video (up to 20 min)',
      shortLabel: '20-min sessions',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      icon: Star,
      show: true
    }
  };

  const badge = badges[tier] || badges.free;
  const Icon = badge.icon;

  if (!badge.show) return null;

  return (
    <Badge 
      variant="outline" 
      className={`${badge.bgColor} ${badge.borderColor} ${badge.textColor} inline-flex items-center gap-1 font-medium`}
    >
      <Icon className="w-3 h-3" />
      {variant === 'minimal' && 'shortLabel' in badge ? badge.shortLabel : badge.label}
    </Badge>
  );
}

interface RemainingMinutesBadgeProps {
  remainingMinutes: number;
  totalMinutes: number;
  tier: 'core' | 'pro' | 'pro-plus';
}

export function RemainingMinutesBadge({ 
  remainingMinutes, 
  totalMinutes,
  tier 
}: RemainingMinutesBadgeProps) {
  const percentage = (remainingMinutes / totalMinutes) * 100;
  
  let color = 'green';
  let bgColor = 'bg-green-50';
  let borderColor = 'border-green-200';
  let textColor = 'text-green-700';
  
  if (percentage < 25) {
    color = 'red';
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
    textColor = 'text-red-700';
  } else if (percentage < 50) {
    color = 'amber';
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
      {remainingMinutes} of {totalMinutes} min remaining
    </Badge>
  );
}
