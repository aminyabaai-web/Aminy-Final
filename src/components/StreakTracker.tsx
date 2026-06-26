// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useMemo } from 'react';
import { Flame, Calendar, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
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

// Calculate hours until midnight
function getHoursUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
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
  // Calculate streak warning state
  const streakWarning = useMemo(() => {
    if (isPaused || currentStreak === 0) return null;
    if (hasCheckedInToday(lastCheckIn)) return null;

    const hoursLeft = getHoursUntilMidnight();

    if (hoursLeft <= 2) {
      return { level: 'critical', hoursLeft, message: 'Your streak expires soon!' };
    } else if (hoursLeft <= 6) {
      return { level: 'warning', hoursLeft, message: 'Don\'t forget to check in' };
    } else if (hoursLeft <= 12) {
      return { level: 'gentle', hoursLeft, message: 'Check in when you\'re ready' };
    }
    return null;
  }, [currentStreak, isPaused, lastCheckIn]);

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
      <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg mb-3">
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
                  : 'bg-[#F0EDE8] border border-[#E8E4DF]'
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

      {/* Streak Warning Banner */}
      {streakWarning && (
        <div
          className={`p-3 rounded-lg mb-3 flex items-center justify-between ${
            streakWarning.level === 'critical'
              ? 'bg-red-50 border border-red-200'
              : streakWarning.level === 'warning'
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-[#EEF4F8] border border-[#C8DDE8]'
          }`}
        >
          <div className="flex items-center gap-2">
            {streakWarning.level === 'critical' ? (
              <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  streakWarning.level === 'critical'
                    ? 'text-red-700'
                    : streakWarning.level === 'warning'
                    ? 'text-amber-700'
                    : 'text-blue-700'
                }`}
              >
                {streakWarning.message}
              </p>
              <p className="text-sm text-muted-foreground">
                {streakWarning.hoursLeft}h left today
              </p>
            </div>
          </div>
          {onQuickCheckIn && (
            <button
              onClick={onQuickCheckIn}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                streakWarning.level === 'critical'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              Check in
            </button>
          )}
        </div>
      )}

      {/* Encouraging Message */}
      {isPaused ? (
        <div className="p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
          <p className="text-sm text-blue-700">
            Taking a breather today. I'll keep things light.
          </p>
        </div>
      ) : hasCheckedInToday(lastCheckIn) ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            You kept at it this week—small steps count.
          </p>
        </div>
      ) : currentStreak > 0 && !streakWarning ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            Great progress! Keep the momentum going.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-[#FAF7F2] border border-[#E8E4DF] rounded-lg">
          <p className="text-sm text-[#5A6B7A]">
            Start your streak today with a quick check-in.
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
