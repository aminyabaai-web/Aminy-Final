// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Preferred Provider Button
 * Star/heart button to mark a provider as favorite
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Heart, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface PreferredProviderButtonProps {
  providerId: string;
  isPreferred: boolean;
  onToggle: (providerId: string) => Promise<boolean>;
  variant?: 'star' | 'heart';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function PreferredProviderButton({
  providerId,
  isPreferred,
  onToggle,
  variant = 'star',
  size = 'md',
  showLabel = false,
  className
}: PreferredProviderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [localPreferred, setLocalPreferred] = useState(isPreferred);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click events
    e.preventDefault();

    setLoading(true);
    try {
      const newState = await onToggle(providerId);
      setLocalPreferred(newState);
    } finally {
      setLoading(false);
    }
  };

  const Icon = variant === 'star' ? Star : Heart;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSizes = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        buttonSizes[size],
        'rounded-full transition-all hover:scale-110',
        localPreferred
          ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
          : 'text-[#8A9BA8] hover:text-amber-500 hover:bg-[#EDF4F7]',
        className
      )}
      aria-label={localPreferred ? 'Remove from favorites' : 'Add to favorites'}
    >
      {loading ? (
        <Loader2 className={cn(sizeClasses[size], 'animate-spin')} />
      ) : (
        <motion.div
          initial={false}
          animate={{
            scale: localPreferred ? [1, 1.3, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon
            className={cn(
              sizeClasses[size],
              localPreferred && 'fill-current'
            )}
          />
        </motion.div>
      )}
      {showLabel && (
        <span className="ml-1 text-sm">
          {localPreferred ? 'Favorited' : 'Add to favorites'}
        </span>
      )}
    </Button>
  );
}

/**
 * Badge shown on provider cards for preferred status
 */
export function PreferredProviderBadge({
  className
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-amber-100 text-amber-700 text-sm font-medium',
        className
      )}
    >
      <Star className="w-3 h-3 fill-amber-500" />
      Preferred
    </div>
  );
}

export default PreferredProviderButton;
