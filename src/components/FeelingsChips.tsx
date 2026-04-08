// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Smile, Meh, Frown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feeling {
  Icon: LucideIcon;
  label: string;
  color: string;
}

const feelings: Feeling[] = [
  { Icon: Smile, label: 'Great', color: 'text-green-500' },
  { Icon: Meh, label: 'Okay', color: 'text-amber-500' },
  { Icon: Frown, label: 'Tough', color: 'text-red-400' }
];

interface FeelingsChipsProps {
  onFeelingSelected: (feeling: string) => void;
}

export function FeelingsChips({ onFeelingSelected }: FeelingsChipsProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (label: string) => {
    setSelected(label);
    onFeelingSelected(label);
  };

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 contain-layout">
      <p className="text-xs text-muted-foreground mb-2">How are you feeling?</p>
      <div className="flex gap-2" style={{ minHeight: '44px' }}>
        {feelings.map((feeling) => (
          <button
            key={feeling.label}
            onClick={() => handleSelect(feeling.label)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
              border transition-all duration-200 min-h-[44px]
              ${selected === feeling.label
                ? 'bg-accent/10 border-accent/30'
                : 'bg-white border-gray-200 hover:border-accent/30'
              }
            `}
          >
            <feeling.Icon className={`w-5 h-5 ${selected === feeling.label ? 'text-accent' : feeling.color}`} />
            <span className="text-xs font-medium">{feeling.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
