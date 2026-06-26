// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Emotion Tracker
 * Weekly feeling slider + 90-day heatmap with activity correlation
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface EmotionEntry {
  week: string;
  feeling: number; // 1-5 scale
  timestamp: string;
}

interface EmotionInsight {
  week: string;
  feeling: number;
  jrSessions: number;
  cuesUsed: string[];
  coinsEarned: number;
  improvement?: string;
}

// Warmer, more supportive feeling labels
const FEELING_LABELS = ['Feeling a lot', 'Heavy day', 'Finding balance', 'Feeling steady', 'Feeling strong'];
const FEELING_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export function EmotionTracker({ userId }: { userId: string }) {
  const [currentFeeling, setCurrentFeeling] = useState<number>(3);
  const [emotionHistory, setEmotionHistory] = useState<EmotionEntry[]>([]);
  const [insights, setInsights] = useState<EmotionInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmotionHistory();
  }, [userId]);

  async function loadEmotionHistory() {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/emotion/history?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmotionHistory(data.history || []);
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Error loading emotion history:', error);
      toast.error('Unable to load your emotion history. Please try again.');
    }
    setLoading(false);
  }

  async function saveWeeklyFeeling() {
    try {
      const entry: EmotionEntry = {
        week: getWeekString(),
        feeling: currentFeeling,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/emotion/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId, entry }),
        }
      );

      if (response.ok) {
        toast.success('Week feeling saved 💙');
        await loadEmotionHistory();
      } else {
        toast.error('Failed to save feeling');
      }
    } catch (error) {
      console.error('Error saving feeling:', error);
      toast.error('Failed to save feeling');
    }
  }

  function getWeekString(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  function generateHeatmapData(): { week: string; feeling: number; color: string }[] {
    const weeks = [];
    const now = new Date();
    
    // Generate last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - (i * 7));
      const weekStr = getWeekStringForDate(weekDate);
      
      const entry = emotionHistory.find(e => e.week === weekStr);
      const feeling = entry ? entry.feeling : 0;
      
      weeks.push({
        week: weekStr,
        feeling,
        color: feeling > 0 ? FEELING_COLORS[feeling - 1] : '#e2e8f0',
      });
    }
    
    return weeks;
  }

  function getWeekStringForDate(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  const heatmapData = generateHeatmapData();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Weekly Check-in */}
      <Card>
        <CardHeader>
          <CardTitle>How did this week feel?</CardTitle>
          <CardDescription>
            Your feelings matter. Let's notice the patterns together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-2">
              {currentFeeling === 1 && '😰'}
              {currentFeeling === 2 && '😟'}
              {currentFeeling === 3 && '😐'}
              {currentFeeling === 4 && '🙂'}
              {currentFeeling === 5 && '😊'}
            </div>
            <p className="text-lg font-semibold text-[#132F43]">
              {FEELING_LABELS[currentFeeling - 1]}
            </p>
          </div>

          <Slider
            value={[currentFeeling]}
            onValueChange={(value) => setCurrentFeeling(value[0])}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-sm text-[#5A6B7A]">
            <span>Feeling a lot</span>
            <span>Feeling strong</span>
          </div>

          <Button onClick={saveWeeklyFeeling} className="w-full" size="lg">
            Save This Week
          </Button>
        </CardContent>
      </Card>

      {/* 12-Week Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Your 12-Week Journey
          </CardTitle>
          <CardDescription>
            Look at your path—you're building something
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {heatmapData.map((week, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg transition-all hover:scale-110 cursor-pointer"
                style={{ backgroundColor: week.color }}
                title={`${week.week}: ${week.feeling > 0 ? FEELING_LABELS[week.feeling - 1] : 'No data'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-[#5A6B7A]">
            <span>12 weeks ago</span>
            <span>This week</span>
          </div>
        </CardContent>
      </Card>

      {/* Insights & Correlations */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              What We're Seeing
            </CardTitle>
            <CardDescription>
              Patterns that might be helping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-accent/5 border border-accent/20 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#132F43]">{insight.week}</span>
                  <span className="text-sm text-accent">
                    {FEELING_LABELS[insight.feeling - 1]}
                  </span>
                </div>
                
                {insight.improvement && (
                  <div className="flex items-start gap-2 text-sm text-[#3A4A57]">
                    <Activity className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <p>{insight.improvement}</p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {insight.jrSessions > 0 && (
                    <span className="px-2 py-1 bg-white rounded-full">
                      {insight.jrSessions} Jr sessions
                    </span>
                  )}
                  {insight.coinsEarned > 0 && (
                    <span className="px-2 py-1 bg-white rounded-full">
                      {insight.coinsEarned} coins
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
