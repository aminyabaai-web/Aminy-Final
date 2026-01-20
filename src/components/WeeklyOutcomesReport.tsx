/**
 * Weekly Outcomes Report
 * Auto-generated summary of parent wellness and child progress
 *
 * Features:
 * - Stress trends comparison
 * - Routine adherence metrics
 * - Goals achieved
 * - AI-generated insights
 * - Shareable summary card
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Target,
  Calendar,
  Share2,
  Download,
  Sparkles,
  CheckCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface WeeklyOutcomesReportProps {
  onShare?: (reportData: ReportData) => void;
  onClose?: () => void;
}

interface ReportData {
  weekStart: string;
  weekEnd: string;
  stressMetrics: {
    currentAvg: number;
    previousAvg: number;
    trend: 'improving' | 'stable' | 'worsening';
    trendPercent: number;
    checkInsCount: number;
  };
  routineMetrics: {
    adherencePercent: number;
    completed: number;
    total: number;
    streak: number;
  };
  goalsMetrics: {
    achieved: number;
    total: number;
    newGoals: number;
  };
  highlights: string[];
  aiInsight: string;
}

export function WeeklyOutcomesReport({ onShare, onClose }: WeeklyOutcomesReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  useEffect(() => {
    loadReportData();
  }, [weekOffset]);

  const getWeekBounds = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToSunday = dayOfWeek;

    // Start of current week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToSunday + (offset * 7));
    weekStart.setHours(0, 0, 0, 0);

    // End of week (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  };

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { weekStart, weekEnd } = getWeekBounds(weekOffset);
      const { weekStart: prevWeekStart, weekEnd: prevWeekEnd } = getWeekBounds(weekOffset - 1);

      // Fetch stress logs for current week
      const { data: currentStress } = await supabase
        .from('stress_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      // Fetch stress logs for previous week
      const { data: previousStress } = await supabase
        .from('stress_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', prevWeekStart.toISOString())
        .lte('created_at', prevWeekEnd.toISOString());

      // Fetch routine completions for current week
      const { data: routines } = await supabase
        .from('routine_completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_at', weekStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString());

      // Fetch goal achievements
      const { data: goals } = await supabase
        .from('goal_achievements')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      // Calculate metrics
      const currentStressAvg = currentStress && currentStress.length > 0
        ? currentStress.reduce((sum, s) => sum + s.stress_level, 0) / currentStress.length
        : 0;

      const previousStressAvg = previousStress && previousStress.length > 0
        ? previousStress.reduce((sum, s) => sum + s.stress_level, 0) / previousStress.length
        : currentStressAvg;

      const stressDiff = previousStressAvg - currentStressAvg;
      const stressTrend = stressDiff > 0.5 ? 'improving' : stressDiff < -0.5 ? 'worsening' : 'stable';
      const stressTrendPercent = previousStressAvg > 0
        ? Math.abs(Math.round((stressDiff / previousStressAvg) * 100))
        : 0;

      const completedRoutines = routines?.filter(r =>
        r.completion_status === 'completed' || r.completion_status === 'partial'
      ).length || 0;
      const totalRoutines = routines?.length || 0;
      const adherencePercent = totalRoutines > 0
        ? Math.round((completedRoutines / totalRoutines) * 100)
        : 0;

      // Calculate streak
      const streak = calculateStreak(routines || []);

      const achievedGoals = goals?.filter(g => g.achieved_at !== null).length || 0;
      const totalGoals = goals?.length || 0;
      const newGoals = goals?.filter(g => {
        const created = new Date(g.created_at);
        return created >= weekStart && created <= weekEnd;
      }).length || 0;

      // Generate highlights
      const highlights = generateHighlights({
        stressTrend,
        adherencePercent,
        streak,
        achievedGoals,
        checkInsCount: currentStress?.length || 0
      });

      // Generate AI insight
      const aiInsight = generateAIInsight({
        stressTrend,
        stressAvg: currentStressAvg,
        adherencePercent,
        streak,
        achievedGoals,
        totalGoals
      });

      setReportData({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        stressMetrics: {
          currentAvg: Math.round(currentStressAvg * 10) / 10,
          previousAvg: Math.round(previousStressAvg * 10) / 10,
          trend: stressTrend,
          trendPercent: stressTrendPercent,
          checkInsCount: currentStress?.length || 0
        },
        routineMetrics: {
          adherencePercent,
          completed: completedRoutines,
          total: totalRoutines,
          streak
        },
        goalsMetrics: {
          achieved: achievedGoals,
          total: totalGoals,
          newGoals
        },
        highlights,
        aiInsight
      });
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Could not load report');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = (routines: any[]): number => {
    if (routines.length === 0) return 0;

    const dayMap = new Map<string, { completed: number; total: number }>();

    routines.forEach(r => {
      const day = new Date(r.scheduled_at).toISOString().split('T')[0];
      const current = dayMap.get(day) || { completed: 0, total: 0 };
      current.total++;
      if (r.completion_status === 'completed' || r.completion_status === 'partial') {
        current.completed++;
      }
      dayMap.set(day, current);
    });

    let streak = 0;
    const sortedDays = Array.from(dayMap.keys()).sort().reverse();

    for (const day of sortedDays) {
      const stats = dayMap.get(day)!;
      if (stats.completed / stats.total >= 0.8) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const generateHighlights = (data: {
    stressTrend: string;
    adherencePercent: number;
    streak: number;
    achievedGoals: number;
    checkInsCount: number;
  }): string[] => {
    const highlights: string[] = [];

    if (data.stressTrend === 'improving') {
      highlights.push('Your stress levels are trending down! Keep it up.');
    }

    if (data.adherencePercent >= 80) {
      highlights.push(`Amazing ${data.adherencePercent}% routine completion this week!`);
    }

    if (data.streak >= 3) {
      highlights.push(`${data.streak}-day streak of consistent routines!`);
    }

    if (data.achievedGoals > 0) {
      highlights.push(`${data.achievedGoals} goal${data.achievedGoals > 1 ? 's' : ''} achieved this week!`);
    }

    if (data.checkInsCount >= 10) {
      highlights.push('Great self-awareness: Regular stress check-ins!');
    }

    if (highlights.length === 0) {
      highlights.push('Every step forward counts. You\'re doing great!');
    }

    return highlights;
  };

  const generateAIInsight = (data: {
    stressTrend: string;
    stressAvg: number;
    adherencePercent: number;
    streak: number;
    achievedGoals: number;
    totalGoals: number;
  }): string => {
    const insights: string[] = [];

    if (data.stressTrend === 'improving' && data.adherencePercent >= 70) {
      return "I'm noticing a beautiful pattern: as your routines become more consistent, your stress is decreasing. This isn't coincidence — predictability and structure are powerful stress regulators. Keep building on this momentum!";
    }

    if (data.stressAvg <= 4 && data.adherencePercent >= 80) {
      return "You're in a really good place this week. Your stress levels are well-managed and your routines are strong. This is exactly the kind of stability that helps children with autism thrive. You're modeling excellent self-regulation.";
    }

    if (data.stressAvg >= 7) {
      return "I can see this was a challenging week. Remember, high stress doesn't mean you're failing — it often means you're carrying a lot. Consider this: what's one small thing you could delegate or let go of next week? Even tiny relief helps.";
    }

    if (data.streak >= 5) {
      return `A ${data.streak}-day streak is impressive! Consistency like this builds neural pathways — for you AND your child. You're not just completing routines; you're rewiring how your family operates. That's powerful.`;
    }

    return "Every week brings new learning. The fact that you're tracking your wellness and routines shows incredible self-awareness and commitment to your family. Keep going — progress isn't always linear, but it's always valuable.";
  };

  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const handleShare = () => {
    if (reportData && onShare) {
      onShare(reportData);
    }
    toast.success('Report ready to share!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">No data available for this week</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(weekOffset - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Weekly Outcomes Report</h2>
          <p className="text-sm text-slate-500">
            {formatDateRange(reportData.weekStart, reportData.weekEnd)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(Math.min(0, weekOffset + 1))}
          disabled={weekOffset >= 0}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Stress Metrics */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold text-slate-900">Stress & Wellness</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-3xl font-bold text-slate-900">
              {reportData.stressMetrics.currentAvg.toFixed(1)}
            </p>
            <p className="text-sm text-slate-500">Average this week</p>
          </div>
          <div className="text-right">
            {reportData.stressMetrics.trend === 'improving' && (
              <div className="flex items-center justify-end gap-1 text-green-600">
                <TrendingDown className="w-5 h-5" />
                <span className="text-lg font-semibold">{reportData.stressMetrics.trendPercent}% better</span>
              </div>
            )}
            {reportData.stressMetrics.trend === 'worsening' && (
              <div className="flex items-center justify-end gap-1 text-red-600">
                <TrendingUp className="w-5 h-5" />
                <span className="text-lg font-semibold">{reportData.stressMetrics.trendPercent}% higher</span>
              </div>
            )}
            {reportData.stressMetrics.trend === 'stable' && (
              <div className="flex items-center justify-end gap-1 text-slate-500">
                <Minus className="w-5 h-5" />
                <span className="text-lg font-semibold">Stable</span>
              </div>
            )}
            <p className="text-sm text-slate-500">vs last week</p>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          {reportData.stressMetrics.checkInsCount} check-ins this week
        </p>
      </Card>

      {/* Routine Metrics */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-slate-900">Routine Adherence</h3>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-bold text-slate-900">
              {reportData.routineMetrics.adherencePercent}%
            </span>
            <div className="flex items-center gap-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-orange-500">
                {reportData.routineMetrics.streak}-day streak
              </span>
            </div>
          </div>
          <Progress value={reportData.routineMetrics.adherencePercent} className="h-3" />
        </div>

        <p className="text-sm text-slate-600">
          {reportData.routineMetrics.completed} of {reportData.routineMetrics.total} routines completed
        </p>
      </Card>

      {/* Goals Metrics */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-slate-900">Goals Progress</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{reportData.goalsMetrics.achieved}</p>
              <p className="text-sm text-slate-500">Achieved</p>
            </div>
          </div>
          <div className="h-12 w-px bg-slate-200"></div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{reportData.goalsMetrics.total}</p>
            <p className="text-sm text-slate-500">Active Goals</p>
          </div>
          <div className="h-12 w-px bg-slate-200"></div>
          <div>
            <p className="text-2xl font-bold text-slate-900">+{reportData.goalsMetrics.newGoals}</p>
            <p className="text-sm text-slate-500">New This Week</p>
          </div>
        </div>
      </Card>

      {/* Highlights */}
      {reportData.highlights.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-accent/10 to-teal-50 border-accent/20">
          <h3 className="font-semibold text-slate-900 mb-3">This Week's Wins</h3>
          <ul className="space-y-2">
            {reportData.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {highlight}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* AI Insight */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Aminy's Insight</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {reportData.aiInsight}
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleShare} className="flex-1 gap-2 bg-accent hover:bg-accent/90">
          <Share2 className="w-4 h-4" />
          Share Report
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>
    </div>
  );
}

export default WeeklyOutcomesReport;
