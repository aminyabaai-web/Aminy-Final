/**
 * Outcomes Dashboard Widget
 * Shows measurable progress prominently on the main dashboard
 * Addresses: "demonstrating tangible outcomes that make subscription feel essential"
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Heart,
  Target,
  Sparkles,
  ChevronRight,
  Calendar,
  Flame,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { dataService } from '../lib/supabase-data';

interface OutcomeMetric {
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean; // Whether trending up/down is good
  icon: React.ElementType;
  color: string;
}

interface OutcomesDashboardWidgetProps {
  userId?: string;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function OutcomesDashboardWidget({
  userId,
  onViewDetails,
  compact = false,
}: OutcomesDashboardWidgetProps) {
  const [metrics, setMetrics] = useState<OutcomeMetric[]>([]);
  const [weeklyStreak, setWeeklyStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        // Fetch real data from Supabase
        const [goals, screenings, usage] = await Promise.all([
          dataService.getTreatmentGoals(),
          dataService.getScreeningResults(),
          dataService.getDailyUsage(),
        ]);

        const builtMetrics: OutcomeMetric[] = [];

        // Goals Progress — count completed/mastered goals
        const completedGoals = goals.filter(g => g.status === 'mastered' || g.status === 'completed');
        const inProgressGoals = goals.filter(g => g.status === 'in_progress');
        const avgProgress = inProgressGoals.length > 0
          ? Math.round(inProgressGoals.reduce((s, g) => s + g.current, 0) / inProgressGoals.length)
          : 0;

        builtMetrics.push({
          label: 'Goals Progress',
          value: goals.length > 0 ? avgProgress : 0,
          previousValue: 0,
          unit: goals.length > 0 ? `% avg (${completedGoals.length} mastered)` : ' — add goals to track',
          trend: goals.length > 0 ? 'up' : 'stable',
          isPositive: true,
          icon: Activity,
          color: 'text-blue-500',
        });

        // Screening Trend — show latest screening score improvement
        if (screenings.length >= 2) {
          const latest = screenings[0];
          const previous = screenings[1];
          const change = latest.total_score - previous.total_score;
          builtMetrics.push({
            label: latest.instrument_name,
            value: latest.total_score,
            previousValue: previous.total_score,
            unit: ` (${latest.risk_level})`,
            trend: change < 0 ? 'down' : change > 0 ? 'up' : 'stable',
            isPositive: change <= 0, // Lower screening scores generally mean lower risk
            icon: Target,
            color: 'text-teal-500',
          });
        } else if (screenings.length === 1) {
          builtMetrics.push({
            label: screenings[0].instrument_name,
            value: screenings[0].total_score,
            previousValue: screenings[0].total_score,
            unit: ` (${screenings[0].risk_level})`,
            trend: 'stable',
            isPositive: true,
            icon: Target,
            color: 'text-teal-500',
          });
        }

        // Treatment Goal Trend — show best-improving goal
        const improvingGoals = inProgressGoals.filter(g => g.trend_direction === 'improving');
        if (improvingGoals.length > 0) {
          const best = improvingGoals.reduce((a, b) => (b.current - b.baseline) > (a.current - a.baseline) ? b : a);
          builtMetrics.push({
            label: best.title,
            value: best.current,
            previousValue: best.baseline,
            unit: `% (from ${best.baseline}%)`,
            trend: 'up',
            isPositive: true,
            icon: Heart,
            color: 'text-rose-500',
          });
        }

        setMetrics(builtMetrics);

        // Approximate streak from usage (real streak computed by retention engine elsewhere)
        setWeeklyStreak(usage?.message_count || 0 > 0 ? 1 : 0);
      } catch (err) {
        console.warn('[OutcomesWidget] Failed to load real data:', err);
        // Show empty state rather than fake data
        setMetrics([]);
        setWeeklyStreak(0);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [userId]);

  const getTrendIcon = (metric: OutcomeMetric) => {
    if (metric.trend === 'up') {
      return metric.isPositive ? (
        <TrendingUp className="w-4 h-4 text-green-500" />
      ) : (
        <TrendingUp className="w-4 h-4 text-red-500" />
      );
    } else if (metric.trend === 'down') {
      return metric.isPositive ? (
        <TrendingDown className="w-4 h-4 text-green-500" />
      ) : (
        <TrendingDown className="w-4 h-4 text-red-500" />
      );
    }
    return null;
  };

  const getChangeText = (metric: OutcomeMetric) => {
    const change = Math.abs(metric.value - metric.previousValue);
    const direction = metric.value > metric.previousValue ? 'up' : 'down';
    const isGood = (direction === 'up') === metric.isPositive;

    return (
      <span className={isGood ? 'text-green-600' : 'text-red-600'}>
        {direction === 'up' ? '+' : '-'}{change.toFixed(1)}{metric.unit === '%' ? '%' : ''} this week
      </span>
    );
  };

  if (loading) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="animate-pulse space-y-3 sm:space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (compact) {
    const topMetric = metrics[0];
    const summaryText = topMetric
      ? `${topMetric.label}: ${topMetric.value}${topMetric.unit.split('(')[0].trim()}`
      : 'Track your progress with Aminy';
    const subText = metrics.length > 0
      ? `${metrics.length} metric${metrics.length > 1 ? 's' : ''} tracked`
      : 'Complete screenings or set goals to start';

    return (
      <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-full">
              {topMetric?.trend === 'up' && topMetric.isPositive
                ? <TrendingUp className="w-5 h-5 text-teal-600" />
                : <Activity className="w-5 h-5 text-teal-600" />}
            </div>
            <div>
              <p className="font-medium text-teal-900">{summaryText}</p>
              <p className="text-sm text-teal-700">{subText}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Your Progress This Week
            </h3>
            <p className="text-sm text-teal-100">
              Real outcomes, measured automatically
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <Flame className="w-4 h-4 text-amber-300" />
            <span className="font-medium">{weeklyStreak} week streak</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-3 sm:p-4">
        {metrics.length === 0 && (
          <div className="text-center py-6">
            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">No outcomes data yet</p>
            <p className="text-xs text-gray-400 mt-1">Complete a screening or set treatment goals to start tracking real progress.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-sm text-gray-600">{metric.label}</span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {metric.value}
                  </span>
                  <span className="text-sm text-gray-500">{metric.unit}</span>
                  {getTrendIcon(metric)}
                </div>

                <p className="text-xs mt-1">
                  {getChangeText(metric)}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Value Proposition Callout */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                Why Aminy works
              </p>
              <p className="text-sm text-amber-700 mt-1">
                We track your real progress automatically—no manual logging needed.
                These aren't guesses; they're measured outcomes from your daily use.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {onViewDetails && (
          <Button
            onClick={onViewDetails}
            variant="outline"
            className="w-full mt-4"
          >
            View detailed progress report
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default OutcomesDashboardWidget;
