// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { GLOBAL_DISCLAIMER_TEXT } from './GlobalDisclaimer';

interface DisclaimerFooterProps {
  className?: string;
  variant?: 'default' | 'compact' | 'card' | 'subtle';
}

export function DisclaimerFooter({ className = '', variant = 'subtle' }: DisclaimerFooterProps) {
  const baseClasses = "text-muted-foreground text-crisp";

  const variantClasses = {
    default: "text-sm leading-relaxed",
    compact: "text-sm leading-tight",
    card: "text-sm leading-relaxed p-3 bg-muted/50 border border-muted rounded-lg",
    subtle: "text-sm leading-tight",
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  // Subtle: tiny "ⓘ Educational guidance" pill with full text revealed on tap.
  // Compliant (text is one tap away) but doesn't shout in your face.
  if (variant === 'subtle') {
    return <SubtleDisclaimer className={className} />;
  }

  if (variant === 'card') {
    return (
      <div className={combinedClasses}>
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-muted-foreground">{GLOBAL_DISCLAIMER_TEXT}</p>
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

function SubtleDisclaimer({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`flex justify-center ${className || ''}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#5A6B7A] px-2 py-1 rounded-full transition-colors"
        aria-label="View educational guidance disclaimer"
      >
        <Info className="w-2.5 h-2.5" />
        <span>{expanded ? GLOBAL_DISCLAIMER_TEXT : 'Educational guidance · learn more'}</span>
      </button>
    </div>
  );
}