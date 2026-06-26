// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Stress Check-In Component
 * Daily stress tracking for measurable parent wellness outcomes
 *
 * Features:
 * - Morning/evening check-ins
 * - 1-10 scale with visual representation
 * - Trend visualization over time
 * - Contextual encouragement
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  X,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  Moon,
  Sparkles,
  Calendar
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface StressCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  context: 'morning' | 'evening';
  onComplete?: (stressLevel: number) => void;
}

interface StressLog {
  id: string;
  stress_level: number;
  context: 'morning' | 'evening';
  created_at: string;
  notes?: string;
}

export function StressCheckIn({
  isOpen,
  onClose,
  context,
  onComplete
}: StressCheckInProps) {
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentLogs, setRecentLogs] = useState<StressLog[]>([]);
  const [showTrend, setShowTrend] = useState(false);

  // Load recent stress logs
  useEffect(() => {
    if (isOpen) {
      loadRecentLogs();
    }
  }, [isOpen]);

  const loadRecentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('stress_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(14); // Last 7 days * 2 (morning/evening)

      if (data && !error) {
        setRecentLogs(data);
      }
    } catch (error) {
      console.error('Error loading stress logs:', error);
    }
  };

  const handleSubmit = async () => {
    if (stressLevel === null) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('stress_logs')
        .insert({
          user_id: user.id,
          stress_level: stressLevel,
          context: context
        });

      if (error) throw error;

      toast.success(getEncouragementMessage(stressLevel));
      onComplete?.(stressLevel);
      onClose();
    } catch (error) {
      console.error('Error saving stress log:', error);
      toast.error('Could not save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEncouragementMessage = (level: number): string => {
    if (level <= 3) {
      return "Wonderful! Keep nurturing that calm. 🌟";
    } else if (level <= 5) {
      return "You're doing great. Every day is a new opportunity. 💪";
    } else if (level <= 7) {
      return "I see you're carrying a lot. Remember, you're not alone. 💙";
    } else {
      return "Today is hard, and that's okay. Let's take it one moment at a time. 🤗";
    }
  };

  const getStressDescription = (level: number): string => {
    if (level <= 2) return "Very calm";
    if (level <= 4) return "Manageable";
    if (level <= 6) return "Somewhat stressed";
    if (level <= 8) return "Quite stressed";
    return "Overwhelmed";
  };

  const getStressColor = (level: number): string => {
    if (level <= 3) return "bg-green-500";
    if (level <= 5) return "bg-yellow-500";
    if (level <= 7) return "bg-orange-500";
    return "bg-red-500";
  };

  const calculateTrend = (): 'improving' | 'stable' | 'worsening' | null => {
    if (recentLogs.length < 4) return null;

    const recentAvg = recentLogs.slice(0, 4).reduce((sum, log) => sum + log.stress_level, 0) / 4;
    const olderAvg = recentLogs.slice(4, 8).reduce((sum, log) => sum + log.stress_level, 0) / Math.min(4, recentLogs.length - 4);

    if (recentAvg < olderAvg - 0.5) return 'improving';
    if (recentAvg > olderAvg + 0.5) return 'worsening';
    return 'stable';
  };

  const getAverageStress = (): number => {
    if (recentLogs.length === 0) return 0;
    return recentLogs.reduce((sum, log) => sum + log.stress_level, 0) / recentLogs.length;
  };

  if (!isOpen) return null;

  const trend = calculateTrend();
  const average = getAverageStress();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className={`p-6 ${context === 'morning' ? 'bg-gradient-to-r from-amber-100 to-orange-100' : 'bg-gradient-to-r from-indigo-100 to-purple-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {context === 'morning' ? (
                <Sun className="w-6 h-6 text-amber-600" />
              ) : (
                <Moon className="w-6 h-6 text-[#6B9080]" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-[#132F43]">
                  {context === 'morning' ? 'Good Morning' : 'Evening Reflection'}
                </h2>
                <p className="text-sm text-[#5A6B7A]">
                  {context === 'morning' ? 'How are you feeling today?' : 'How was your day?'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stress Scale */}
        <div className="p-4 sm:p-5 md:p-6">
          <p className="text-center text-[#5A6B7A] mb-4 sm:mb-6">
            On a scale of 1-10, how stressed are you feeling?
          </p>

          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                onClick={() => setStressLevel(level)}
                className={`
                  w-9 h-9 rounded-full font-medium text-sm transition-all
                  ${stressLevel === level
                    ? `${getStressColor(level)} text-white scale-110 shadow-lg`
                    : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                  }
                `}
              >
                {level}
              </button>
            ))}
          </div>

          {stressLevel !== null && (
            <div className="text-center mb-4 sm:mb-6 animate-in fade-in-50">
              <Badge className={`${getStressColor(stressLevel)} text-white`}>
                {getStressDescription(stressLevel)}
              </Badge>
            </div>
          )}

          {/* Scale Labels */}
          <div className="flex justify-between text-sm text-[#5A6B7A] mb-4 sm:mb-6">
            <span>Calm & peaceful</span>
            <span>Overwhelmed</span>
          </div>

          {/* Trend Summary */}
          {recentLogs.length > 0 && (
            <button
              onClick={() => setShowTrend(!showTrend)}
              className="w-full p-3 bg-[#FAF7F2] rounded-lg hover:bg-[#F0EDE8] transition-colors mb-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5A6B7A]">Your recent trend</span>
                <div className="flex items-center gap-2">
                  {trend === 'improving' && (
                    <>
                      <TrendingDown className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Improving</span>
                    </>
                  )}
                  {trend === 'worsening' && (
                    <>
                      <TrendingUp className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Higher stress</span>
                    </>
                  )}
                  {trend === 'stable' && (
                    <>
                      <Minus className="w-4 h-4 text-[#5A6B7A]" />
                      <span className="text-sm font-medium text-[#5A6B7A]">Stable</span>
                    </>
                  )}
                  {trend === null && (
                    <span className="text-sm text-[#5A6B7A]">Need more data</span>
                  )}
                </div>
              </div>

              {showTrend && (
                <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A6B7A]">7-day average:</span>
                    <span className="font-medium text-[#3A4A57]">{average.toFixed(1)}/10</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-[#5A6B7A]">Check-ins this week:</span>
                    <span className="font-medium text-[#3A4A57]">{Math.min(recentLogs.length, 14)}</span>
                  </div>
                </div>
              )}
            </button>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={stressLevel === null || isSubmitting}
            className="w-full bg-accent hover:bg-accent/90 gap-2"
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Heart className="w-4 h-4" />
                Log How I'm Feeling
              </>
            )}
          </Button>

          {/* Encouragement */}
          {stressLevel !== null && stressLevel >= 7 && (
            <div className="mt-4 p-3 bg-[#EEF4F8] rounded-lg">
              <p className="text-sm text-[#4A6478] flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Remember: Asking for help is strength, not weakness. Would you like to talk to Aminy about what's on your mind?
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Stress Check-In Trigger Hook
 * Determines when to show check-in prompts
 */
export function useStressCheckIn() {
  const [shouldShowMorning, setShouldShowMorning] = useState(false);
  const [shouldShowEvening, setShouldShowEvening] = useState(false);

  useEffect(() => {
    const checkTiming = async () => {
      const now = new Date();
      const hour = now.getHours();

      // Morning window: 6am - 10am
      const isMorningWindow = hour >= 6 && hour < 10;
      // Evening window: 6pm - 10pm
      const isEveningWindow = hour >= 18 && hour < 22;

      if (!isMorningWindow && !isEveningWindow) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = now.toISOString().split('T')[0];
        const context = isMorningWindow ? 'morning' : 'evening';

        // Check if already logged today for this context
        const { data, error } = await supabase
          .from('stress_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('context', context)
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);

        if (data && data.length === 0) {
          if (isMorningWindow) {
            setShouldShowMorning(true);
          } else {
            setShouldShowEvening(true);
          }
        }
      } catch (error) {
        console.error('Error checking stress log status:', error);
      }
    };

    checkTiming();
  }, []);

  return {
    shouldShowMorning,
    shouldShowEvening,
    dismissMorning: () => setShouldShowMorning(false),
    dismissEvening: () => setShouldShowEvening(false)
  };
}

export default StressCheckIn;
