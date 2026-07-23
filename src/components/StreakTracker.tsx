// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Flame, TrendingUp, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  isPaused: boolean;
  lastCheckIn?: string; // ISO date string of last check-in
  onViewDetails?: () => void;
  onQuickCheckIn?: () => void;
}

// Check if user has checked in today
function hasCheckedInToday(lastCheckIn?: string): boolean {
  if (!lastCheckIn) return false;
  const lastDate = new Date(lastCheckIn);
  const today = new Date();
  return (
    lastDate.getFullYear() === today.getFullYear() &&
    lastDate.getMonth() === today.getMonth() &&
    lastDate.getDate() === today.getDate()
  );
}

export function StreakTracker({
  currentStreak,
  longestStreak,
  isPaused,
  lastCheckIn,
  onViewDetails,
  onQuickCheckIn
}: StreakTrackerProps) {
  // No countdowns, no expiry pressure — at most one soft, optional nudge.
  const checkedInToday = hasCheckedInToday(lastCheckIn);
  const showGentleNudge = !isPaused && currentStreak > 0 && !checkedInToday;

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold mb-1">Gentle Streak</h3>
          <p className="text-sm text-muted-foreground">
            Consistency without pressure
          </p>
        </div>
        {isPaused && (
          <Badge variant="outline" className="bg-[#EEF4F8] text-blue-700 border-[#C8DDE8]">
            Paused
          </Badge>
        )}
      </div>

      {/* Current Streak */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
          <Flame className="w-8 h-8 text-orange-600" />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-[#132F43]">{currentStreak}</p>
          <p className="text-sm text-muted-foreground">
            {currentStreak === 1 ? 'day' : 'days'} this week
          </p>
        </div>
      </div>

      {/* Longest Streak */}
      <div className="flex items-center justify-between p-3 bg-[#F6FBFB] rounded-lg mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Longest streak</span>
        </div>
        <span className="font-semibold">{longestStreak} days</span>
      </div>

      {/* Week Progress */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
          const isActive = index < currentStreak;
          return (
            <div
              key={`${day}-${index}`}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center
                ${isActive 
                  ? 'bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200' 
                  : 'bg-[#EDF4F7] border border-[#E8E4DF]'
                }
              `}
            >
              <span className={`text-sm font-medium ${isActive ? 'text-orange-700' : 'text-[#5A6B7A]'}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Encouraging Message — never a countdown, never red */}
      {isPaused ? (
        <div className="p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
          <p className="text-sm text-blue-700">
            Life happens — your streak is safe. I'll keep things light.
          </p>
        </div>
      ) : checkedInToday ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            You kept at it this week—small steps count.
          </p>
        </div>
      ) : showGentleNudge ? (
        <div className="p-3 bg-[#F6FBFB] border border-[#E8E4DF] rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2A7D99] flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-[#3A4A57]">
              A tiny moment today keeps your rhythm going.
            </p>
          </div>
          {onQuickCheckIn && (
            <button
              onClick={onQuickCheckIn}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#2A7D99] text-white transition-colors flex-shrink-0"
            >
              Check in
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 bg-[#F6FBFB] border border-[#E8E4DF] rounded-lg">
          <p className="text-sm text-[#5A6B7A]">
            Whenever you're ready — one small check-in starts your rhythm.
          </p>
        </div>
      )}

      {/* Microcopy */}
      <p className="text-sm text-muted-foreground mt-3 text-center">
        Streaks pause automatically during tough weeks. No pressure, just support.
      </p>
    </Card>
  );
}
