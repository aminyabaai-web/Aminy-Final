// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { supabase } from '../utils/supabase/client';

interface BehaviorInsightsCardProps {
  childId?: string;
  childName: string;
  onOpenChat?: (prompt: string) => void;
  onNavigate?: (screen: string) => void;
}

interface WeeklyInsight {
  topBehavior: string | null;
  behaviorCount: number;
  prevWeekCount: number;
  bestTimeOfDay: string | null;
  totalThisWeek: number;
  trend: 'up' | 'down' | 'stable';
}

const TIME_LABELS: Record<string, string> = {
  morning: 'mornings',
  afternoon: 'afternoons',
  evening: 'evenings',
  night: 'nights',
};

export function BehaviorInsightsCard({ childId, childName, onOpenChat, onNavigate }: BehaviorInsightsCardProps) {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) { setLoading(false); return; }

    const fetchInsights = async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const { data: thisWeek } = await supabase
        .from('behavior_logs')
        .select('behavior_type, created_at')
        .eq('child_id', childId)
        .gte('created_at', weekAgo.toISOString());

      const { data: prevWeek } = await supabase
        .from('behavior_logs')
        .select('id')
        .eq('child_id', childId)
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      if (!thisWeek || thisWeek.length === 0) { setLoading(false); return; }

      // Find most frequent behavior
      const counts: Record<string, number> = {};
      const hourCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };

      for (const log of thisWeek) {
        if (log.behavior_type) counts[log.behavior_type] = (counts[log.behavior_type] || 0) + 1;
        const hour = new Date(log.created_at).getHours();
        if (hour >= 6 && hour < 12) hourCounts.morning++;
        else if (hour >= 12 && hour < 17) hourCounts.afternoon++;
        else if (hour >= 17 && hour < 21) hourCounts.evening++;
        else hourCounts.night++;
      }

      const topBehavior = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const bestTime = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const prevCount = prevWeek?.length ?? 0;
      const trend = thisWeek.length > prevCount * 1.1 ? 'up' : thisWeek.length < prevCount * 0.9 ? 'down' : 'stable';

      setInsight({
        topBehavior: topBehavior?.[0] ?? null,
        behaviorCount: topBehavior?.[1] ?? 0,
        prevWeekCount: prevCount,
        bestTimeOfDay: bestTime?.[1] > 0 ? bestTime[0] : null,
        totalThisWeek: thisWeek.length,
        trend,
      });
      setLoading(false);
    };

    fetchInsights();
  }, [childId]);

  if (loading || !insight) return null;

  const TrendIcon = insight.trend === 'up' ? TrendingUp : insight.trend === 'down' ? TrendingDown : Minus;
  const trendColor = insight.trend === 'up' ? 'text-amber-600' : insight.trend === 'down' ? 'text-green-600' : 'text-[#5A6B7A]';
  const trendLabel = insight.trend === 'up' ? 'More incidents than last week' : insight.trend === 'down' ? 'Fewer incidents than last week' : 'Stable compared to last week';

  const aiPrompt = `Based on ${childName}'s behavior data this week (${insight.totalThisWeek} incidents logged${insight.topBehavior ? `, most frequent: ${insight.topBehavior}` : ''}, trend: ${insight.trend}), what patterns do you see and what's one thing I can try this week?`;

  return (
    <Card className="p-4 bg-white dark:bg-slate-800 shadow-sm border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#132F43] dark:text-white text-sm flex items-center gap-2">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          This Week's Pattern
        </h3>
        <span className={`text-sm font-medium ${trendColor} flex items-center gap-1`}>
          {trendLabel}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#5A6B7A] dark:text-slate-400">Incidents logged</span>
          <span className="font-semibold text-[#132F43] dark:text-white">{insight.totalThisWeek}</span>
        </div>
        {insight.topBehavior && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#5A6B7A] dark:text-slate-400">Most frequent</span>
            <span className="font-semibold text-[#132F43] dark:text-white capitalize">{insight.topBehavior.replace(/_/g, ' ')}</span>
          </div>
        )}
        {insight.bestTimeOfDay && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#5A6B7A] dark:text-slate-400">Peaks in</span>
            <span className="font-semibold text-[#132F43] dark:text-white">{TIME_LABELS[insight.bestTimeOfDay] ?? insight.bestTimeOfDay}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => onOpenChat ? onOpenChat(aiPrompt) : onNavigate?.('ask-aminy')}
        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#6B9080]/10 hover:bg-[#6B9080]/15 transition-colors"
      >
        <span className="text-sm text-[#6B9080] font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Ask Aminy what to try this week
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-[#6B9080]" />
      </button>
    </Card>
  );
}
