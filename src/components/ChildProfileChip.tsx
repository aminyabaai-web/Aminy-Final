import React from 'react';
import { useDisplayNames } from '../lib/name-store';

interface ChildProfileChipProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  photoUrl?: string;
}

export function ChildProfileChip({ 
  size = 'md', 
  showName = false, 
  className = '',
  photoUrl 
}: ChildProfileChipProps) {
  const { childShort, child } = useDisplayNames();
  
  // Get first letter of child's name for avatar
  const initials = childShort.charAt(0).toUpperCase();
  
  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      nameText: 'text-xs ml-2'
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
        bg-gradient-to-br from-teal-400 to-teal-600 
        rounded-full 
        flex items-center justify-center 
        text-white 
        font-semibold 
        ${sizes.text}
        shadow-sm
        border-2 border-white/20
        ring-1 ring-teal-200/50
      `}>
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={`${child}'s photo`}
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
          text-slate-700 dark:text-slate-200
          ${sizes.nameText}
        `}>
          {childShort}
        </span>
      )}
    </div>
  );
}