// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Badge } from './badge';
import { AlertTriangle, FlaskConical, Lock, MapPin, Rocket } from 'lucide-react';
import { type LaunchState } from '../../lib/product-truth';

interface LaunchStateBadgeProps {
  state: LaunchState;
  label?: string;
  className?: string;
}

const STYLES = {
  hidden: 'border-[#E8E4DF] bg-[#F0EDE8] text-[#3A4A57]',
  internal: 'border-amber-200 bg-amber-50 text-amber-700',
  pilot: 'border-violet-200 bg-violet-50 text-violet-700',
  limited_launch: 'border-sky-200 bg-sky-50 text-sky-700',
  live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const;

const ICONS = {
  hidden: Lock,
  internal: FlaskConical,
  pilot: MapPin,
  limited_launch: AlertTriangle,
  live: Rocket,
} as const;

export function LaunchStateBadge({ state, label, className }: LaunchStateBadgeProps) {
  const Icon = ICONS[state];

  return (
    <Badge
      variant="outline"
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        STYLES[state],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label || state.replace('_', ' ')}</span>
    </Badge>
  );
}

export default LaunchStateBadge;
