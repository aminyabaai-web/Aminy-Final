// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Video, Mic, VideoOff, Phone, Info } from 'lucide-react';
import { FocusTrap } from './FocusTrap';

interface LiveAIVideoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: 'core' | 'pro' | 'pro-plus';
  remainingMinutes: number;
}

export function LiveAIVideoSheet({ 
  open, 
  onOpenChange, 
  tier, 
  remainingMinutes 
}: LiveAIVideoSheetProps) {
  const tierLimits = {
    core: { sessionLength: 3, badge: 'Short sessions' },
    pro: { sessionLength: 10, badge: '10-min sessions' },
    'pro-plus': { sessionLength: 20, badge: '20-min sessions' }
  };

  const currentLimit = tierLimits[tier];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <FocusTrap active={open} onEscape={() => onOpenChange(false)}>
          <SheetHeader>
            <SheetTitle>Live AI Video – I'll guide you in real time</SheetTitle>
            <SheetDescription>
              {currentLimit.badge} • {remainingMinutes} minutes remaining this month
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {/* Video Preview */}
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <Button variant="outline" size="lg" className="rounded-full w-14 h-14">
                <Mic className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-full w-14 h-14">
                <VideoOff className="w-5 h-5" />
              </Button>
              <Button variant="destructive" size="lg" className="rounded-full w-14 h-14">
                <Phone className="w-5 h-5" />
              </Button>
            </div>

            {/* Session Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  All video sessions are analyzed by AI to provide personalized insights within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </FocusTrap>
      </SheetContent>
    </Sheet>
  );
}
