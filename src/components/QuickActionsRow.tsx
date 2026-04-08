// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { PlayCircle, Heart, MessageCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface QuickActionsRowProps {
  onStartRoutine: () => void;
  onLogWin: () => void;
  onMessageCoach: () => void;
  onExportReport: () => void;
}

export function QuickActionsRow({
  onStartRoutine,
  onLogWin,
  onMessageCoach,
  onExportReport
}: QuickActionsRowProps) {
  const actions = [
    { label: 'Start routine', icon: PlayCircle, onClick: onStartRoutine },
    { label: 'Log win', icon: Heart, onClick: onLogWin },
    { label: 'Message coach', icon: MessageCircle, onClick: onMessageCoach },
    { label: 'Export report', icon: FileText, onClick: onExportReport }
  ];

  return (
    <div className="bg-white border-t border-gray-100 px-4 py-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="flex flex-col items-center gap-1 h-auto py-2 min-h-[44px]"
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
