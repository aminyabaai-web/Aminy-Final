// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';

interface StarDisplayProps {
  totalStars: number;
  streak: number;
  size?: 'sm' | 'lg';
}

export function StarDisplay({ totalStars, streak, size = 'sm' }: StarDisplayProps) {
  const isLarge = size === 'lg';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 bg-amber-50 rounded-full px-3 py-1.5">
        <svg
          width={isLarge ? 24 : 18}
          height={isLarge ? 24 : 18}
          viewBox="0 0 24 24"
          fill="#F59E0B"
          stroke="#D97706"
          strokeWidth="1"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className={`font-bold text-amber-700 ${isLarge ? 'text-xl' : 'text-sm'}`}>
          {totalStars}
        </span>
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-1 bg-orange-50 rounded-full px-2.5 py-1.5">
          <span className={isLarge ? 'text-lg' : 'text-xs'}>🔥</span>
          <span className={`font-semibold text-orange-600 ${isLarge ? 'text-lg' : 'text-xs'}`}>
            {streak}d
          </span>
        </div>
      )}
    </div>
  );
}
