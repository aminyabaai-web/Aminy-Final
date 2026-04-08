// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { GLOBAL_DISCLAIMER_TEXT } from './GlobalDisclaimer';

interface DisclaimerFooterProps {
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

export function DisclaimerFooter({ className = '', variant = 'default' }: DisclaimerFooterProps) {
  const baseClasses = "text-muted-foreground text-crisp";
  
  const variantClasses = {
    default: "text-xs leading-relaxed",
    compact: "text-xs leading-tight",
    card: "text-xs leading-relaxed p-3 bg-muted/50 border border-muted rounded-lg"
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (variant === 'card') {
    return (
      <div className={combinedClasses}>
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0">
            ⚠️
          </div>
          <p className="text-muted-foreground">
            {GLOBAL_DISCLAIMER_TEXT}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${combinedClasses} text-center`}>
      {GLOBAL_DISCLAIMER_TEXT.split('.').filter(sentence => sentence.trim()).map((sentence, index) => (
        <div key={index}>{sentence.trim()}{index < GLOBAL_DISCLAIMER_TEXT.split('.').filter(sentence => sentence.trim()).length - 1 ? '.' : ''}</div>
      ))}
    </div>
  );
}