import React from 'react';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  isPaused: boolean;
  onViewDetails?: () => void;
}

export function StreakTracker({ 
  currentStreak, 
  longestStreak, 
  isPaused,
  onViewDetails 
}: StreakTrackerProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold mb-1">Gentle Streak</h3>
          <p className="text-sm text-muted-foreground">
            Consistency without pressure
          </p>
        </div>
        {isPaused && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Paused
          </Badge>
        )}
      </div>

      {/* Current Streak */}
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
          <Flame className="w-8 h-8 text-orange-600" />
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-900">{currentStreak}</p>
          <p className="text-sm text-muted-foreground">
            {currentStreak === 1 ? 'day' : 'days'} this week
          </p>
        </div>
      </div>

      {/* Longest Streak */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
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
                  : 'bg-gray-100 border border-gray-200'
                }
              `}
            >
              <span className={`text-xs font-medium ${isActive ? 'text-orange-700' : 'text-gray-500'}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Encouraging Message */}
      {isPaused ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Taking a breather today. I'll keep things light.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            You kept at it this week—small steps count.
          </p>
        </div>
      )}

      {/* Microcopy */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Streaks pause automatically during tough weeks. No pressure, just support.
      </p>
    </Card>
  );
}
