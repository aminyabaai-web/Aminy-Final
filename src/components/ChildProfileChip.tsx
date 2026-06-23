// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { useDisplayNames } from '../lib/name-store';

interface ChildProfileChipProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  photoUrl?: string;
  child?: { name: string; profileImage?: string };
}

export function ChildProfileChip({ 
  size = 'md', 
  showName = false, 
  className = '',
  photoUrl 
}: ChildProfileChipProps) {
  const { childShort } = useDisplayNames();
  
  // Get first letter of child's name for avatar
  const initials = childShort.charAt(0).toUpperCase();
  
  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-sm',
      nameText: 'text-sm ml-2'
    },
    md: {
      container: 'w-10 h-10',
      text: 'text-sm',
      nameText: 'text-sm ml-2'
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      nameText: 'text-base ml-3'
    }
  };
  
  const sizes = sizeClasses[size];
  
  return (
    <div className={`flex items-center ${className}`}>
      {/* Profile Avatar */}
      <div className={`
        ${sizes.container} 
        bg-gradient-to-br from-[#6B9080] to-[#43AA8B] 
        rounded-full 
        flex items-center justify-center 
        text-white 
        font-semibold 
        ${sizes.text}
        shadow-sm
        border-2 border-white/20
        ring-1 ring-[#6B9080]/20
      `}>
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={`${childShort}'s photo`}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="font-semibold tracking-wider">
            {initials}
          </span>
        )}
      </div>
      
      {/* Name Label */}
      {showName && (
        <span className={`
          font-medium 
          text-[#3A4A57] dark:text-slate-200
          ${sizes.nameText}
        `}>
          {childShort}
        </span>
      )}
    </div>
  );
}