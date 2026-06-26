// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Lightbulb, X, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface ProactiveNudgeProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export function ProactiveNudge({ 
  message, 
  actionLabel, 
  onAction, 
  onDismiss,
  icon 
}: ProactiveNudgeProps) {
  return (
    <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon || <Lightbulb className="w-4 h-4 text-amber-600" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#132F43] mb-3">{message}</p>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onAction}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white h-8 px-4 gap-2"
            >
              {actionLabel}
              <ChevronRight className="w-3 h-3" />
            </Button>
            
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[#5A6B7A] hover:text-[#132F43]"
              >
                Not now
              </Button>
            )}
          </div>
        </div>

        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" />
          </Button>
        )}
      </div>
    </Card>
  );
}
