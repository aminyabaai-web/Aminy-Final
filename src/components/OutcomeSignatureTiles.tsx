// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Clock, TrendingDown, HelpCircle } from 'lucide-react';
import { Card } from './ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface OutcomeSignatureTilesProps {
  minutesSaved: number;
  deescalationsShortened: number;
}

export function OutcomeSignatureTiles({ 
  minutesSaved, 
  deescalationsShortened 
}: OutcomeSignatureTilesProps) {
  const tooltipText = "I estimate these from your plan activity, fidelity taps, and Calm Corner sessions.";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {/* Minutes Saved Tile */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
          {minutesSaved}
          <span className="text-lg text-muted-foreground ml-1">min</span>
        </p>
        
        <h4 className="font-semibold mb-1">Minutes saved this week</h4>
        <p className="text-xs text-muted-foreground">
          Estimated from shorter routines and fewer retries.
        </p>
      </Card>

      {/* De-escalations Shortened Tile */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-purple-50 rounded-lg">
            <TrendingDown className="w-5 h-5 text-purple-600" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
          -{deescalationsShortened}
          <span className="text-lg text-muted-foreground ml-1">min</span>
        </p>
        
        <h4 className="font-semibold mb-1">De-escalations shortened</h4>
        <p className="text-xs text-muted-foreground">
          Based on average time from trigger to calm.
        </p>
      </Card>
    </div>
  );
}
