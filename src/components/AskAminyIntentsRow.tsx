// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Moon, Utensils, School, AlertCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface AskAminyIntentsRowProps {
  onIntentClick: (intent: string) => void;
}

export function AskAminyIntentsRow({ onIntentClick }: AskAminyIntentsRowProps) {
  const intents = [
    { label: 'Sleep', icon: Moon, value: 'sleep' },
    { label: 'Feeding', icon: Utensils, value: 'feeding' },
    { label: 'School', icon: School, value: 'school' },
    { label: 'Behavior', icon: AlertCircle, value: 'behavior' },
    { label: 'Benefits', icon: FileText, value: 'benefits' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-[#3A4A57]">Quick topics</h4>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {intents.map((intent) => {
          const Icon = intent.icon;
          return (
            <Button
              key={intent.value}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => onIntentClick(intent.value)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {intent.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
