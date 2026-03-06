/**
 * ABC Trend Analysis Component
 *
 * Advanced visualization and trend analysis for ABC data.
 * Shows patterns over time, correlations, and actionable insights.
 */

import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Brain,
  Target,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';

interface ABCEntry {
  id: string;
  occurredAt: string;
  antecedent: string;
  antecedentCategory: string;
  behavior: string;
  behaviorCategory: string;
  consequence: string;
  consequenceCategory: string;
  setting: string;
  durationSeconds?: number;
  intensity: 'low' | 'medium' | 'high';
}

interface ABCTrendAnalysisProps {
  entries: ABCEntry[];
  childName: string;
  dateRange?: '7d' | '30d' | '90d' | 'all';
}

interface TrendData {
  label: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface HourlyPattern {
  hour: number;
  count: number;
  percentage: number;
  label: string;
}

interface DailyPattern {
  day: string;
  count: number;
  percentage: number;
}

interface CorrelationInsight {
  type: 'strong' | 'moderate' | 'weak';
  antecedent: string;
  behavior: string;
  consequence: string;
  count: number;
  percentage: number;
  insight: string;
}

const BEHAVIOR_LABELS: Record<string, string> = {
  tantrum: 'Tantrum/Crying',
  aggression: 'Physical Aggression',
  self_injury: 'Self-Injury',
  elopement: 'Elopement/Running',
  property_destruction: 'Property Destruction',
  noncompliance: 'Noncompliance',
  verbal_outburst: 'Verbal Outburst',
  stimming: 'Stimming/Repetitive',
  other: 'Other'
};

const ANTECEDENT_LABELS: Record<string, string> = {
  demand: 'Demand/Request',
  transition: 'Transition',
  denied_access: 'Denied Access',
  sensory: 'Sensory Overload',
  social: 'Social Situation',
  attention: 'Low Attention',
  unexpected: 'Unexpected Event',
  other: 'Other'
};

const CONSEQUENCE_LABELS: Record<string, string> = {
  attention: 'Attention Given',
  escape: 'Escape/Avoidance',
  access_tangible: 'Got Item/Activity',
  sensory: 'Sensory Input',
  natural: 'Natural Consequence',
  planned_ignore: 'Planned Ignore',
  redirect: 'Redirected',
  other: 'Other'
};

const FUNCTION_MAP: Record<string, string> = {
  escape: 'Escape/Avoidance',
  attention: 'Social Attention',
  access_tangible: 'Access to Tangibles',
  sensory: 'Automatic/Sensory'
};

export function ABCTrendAnalysis({
  entries,
  childName,
  dateRange = '30d'
}: ABCTrendAnalysisProps) {
  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }

    const now = new Date();
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    // Split into current and previous period for trend comparison
    const midpoint = Math.floor(entries.length / 2);
    const currentPeriod = sortedEntries.slice(midpoint);
    const previousPeriod = sortedEntries.slice(0, midpoint);

    // Frequency trends
    const frequencyTrend: TrendData = {
      label: 'Total Incidents',
      current: currentPeriod.length,
      previous: previousPeriod.length,
      change: previousPeriod.length > 0
        ? ((currentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100
        : 0,
      trend: currentPeriod.length > previousPeriod.length * 1.1 ? 'up' :
             currentPeriod.length < previousPeriod.length * 0.9 ? 'down' : 'stable'
    };

    // Intensity trends
    const currentHighIntensity = currentPeriod.filter(e => e.intensity === 'high').length;
    const previousHighIntensity = previousPeriod.filter(e => e.intensity === 'high').length;
    const intensityTrend: TrendData = {
      label: 'High Intensity',
      current: currentHighIntensity,
      previous: previousHighIntensity,
      change: previousHighIntensity > 0
        ? ((currentHighIntensity - previousHighIntensity) / previousHighIntensity) * 100
        : 0,
      trend: currentHighIntensity > previousHighIntensity * 1.1 ? 'up' :
             currentHighIntensity < previousHighIntensity * 0.9 ? 'down' : 'stable'
    };

    // Hourly distribution
    const hourCounts: Record<number, number> = {};
    entries.forEach(e => {
      const hour = new Date(e.occurredAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const hourlyPatterns: HourlyPattern[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
      percentage: entries.length > 0 ? ((hourCounts[i] || 0) / entries.length) * 100 : 0,
      label: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`
    }));

    const peakHours = hourlyPatterns
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Daily distribution
    const dayCounts: Record<string, number> = {};
    const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    entries.forEach(e => {
      const day = dayOrder[new Date(e.occurredAt).getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const dailyPatterns: DailyPattern[] = dayOrder.map(day => ({
      day,
      count: dayCounts[day] || 0,
      percentage: entries.length > 0 ? ((dayCounts[day] || 0) / entries.length) * 100 : 0
    }));

    const peakDays = dailyPatterns
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    // Behavior frequency
    const behaviorCounts: Record<string, number> = {};
    entries.forEach(e => {
      behaviorCounts[e.behaviorCategory] = (behaviorCounts[e.behaviorCategory] || 0) + 1;
    });

    const topBehaviors = Object.entries(behaviorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([behavior, count]) => ({
        behavior,
        label: BEHAVIOR_LABELS[behavior] || behavior,
        count,
        percentage: (count / entries.length) * 100
      }));

    // Antecedent frequency
    const antecedentCounts: Record<string, number> = {};
    entries.forEach(e => {
      antecedentCounts[e.antecedentCategory] = (antecedentCounts[e.antecedentCategory] || 0) + 1;
    });

    const topAntecedents = Object.entries(antecedentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([antecedent, count]) => ({
        antecedent,
        label: ANTECEDENT_LABELS[antecedent] || antecedent,
        count,
        percentage: (count / entries.length) * 100
      }));

    // Consequence frequency (function indication)
    const consequenceCounts: Record<string, number> = {};
    entries.forEach(e => {
      consequenceCounts[e.consequenceCategory] = (consequenceCounts[e.consequenceCategory] || 0) + 1;
    });

    const functionAnalysis = Object.entries(consequenceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([consequence, count]) => ({
        consequence,
        label: CONSEQUENCE_LABELS[consequence] || consequence,
        function: FUNCTION_MAP[consequence] || 'Other',
        count,
        percentage: (count / entries.length) * 100
      }));

    const likelyFunction = functionAnalysis[0];

    // A-B-C Correlations (patterns)
    const correlations: CorrelationInsight[] = [];
    const patternCounts: Record<string, { count: number; entries: ABCEntry[] }> = {};

    entries.forEach(e => {
      const pattern = `${e.antecedentCategory}|${e.behaviorCategory}|${e.consequenceCategory}`;
      if (!patternCounts[pattern]) {
        patternCounts[pattern] = { count: 0, entries: [] };
      }
      patternCounts[pattern].count++;
      patternCounts[pattern].entries.push(e);
    });

    Object.entries(patternCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .forEach(([pattern, data]) => {
        const [ant, beh, con] = pattern.split('|');
        const percentage = (data.count / entries.length) * 100;
        let insight = '';

        // Generate insight based on pattern
        if (con === 'escape' && (ant === 'demand' || ant === 'transition')) {
          insight = `${childName} may be using ${BEHAVIOR_LABELS[beh]?.toLowerCase()} to escape ${ANTECEDENT_LABELS[ant]?.toLowerCase()}. Consider teaching functional communication for breaks.`;
        } else if (con === 'attention') {
          insight = `${BEHAVIOR_LABELS[beh]} appears to be reinforced by attention. Consider planned ignoring and differential reinforcement.`;
        } else if (con === 'access_tangible' && ant === 'denied_access') {
          insight = `Pattern suggests behavior functions to gain access to items/activities. Teach appropriate requesting skills.`;
        } else {
          insight = `This pattern accounts for ${percentage.toFixed(0)}% of incidents. Monitor for changes.`;
        }

        correlations.push({
          type: percentage >= 20 ? 'strong' : percentage >= 10 ? 'moderate' : 'weak',
          antecedent: ANTECEDENT_LABELS[ant] || ant,
          behavior: BEHAVIOR_LABELS[beh] || beh,
          consequence: CONSEQUENCE_LABELS[con] || con,
          count: data.count,
          percentage,
          insight
        });
      });

    // Setting analysis
    const settingCounts: Record<string, number> = {};
    entries.forEach(e => {
      settingCounts[e.setting] = (settingCounts[e.setting] || 0) + 1;
    });

    const settingAnalysis = Object.entries(settingCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([setting, count]) => ({
        setting,
        count,
        percentage: (count / entries.length) * 100
      }));

    // Timeline data (daily counts for the period)
    const timelineCounts: Record<string, number> = {};
    entries.forEach(e => {
      const date = new Date(e.occurredAt).toISOString().split('T')[0];
      timelineCounts[date] = (timelineCounts[date] || 0) + 1;
    });

    const timeline = Object.entries(timelineCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return {
      totalEntries: entries.length,
      frequencyTrend,
      intensityTrend,
      hourlyPatterns,
      peakHours,
      dailyPatterns,
      peakDays,
      topBehaviors,
      topAntecedents,
      functionAnalysis,
      likelyFunction,
      correlations,
      settingAnalysis,
      timeline
    };
  }, [entries, childName]);

  if (!analytics) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data to Analyze</h3>
        <p className="text-gray-500 dark:text-slate-400">
          Start logging ABC entries to see trend analysis and insights.
        </p>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', inverse = false) => {
    // For behavior frequency, down is good (green), up is bad (red)
    if (inverse) {
      if (trend === 'up') return 'text-green-600';
      if (trend === 'down') return 'text-red-600';
    }
    if (trend === 'up') return 'text-red-600';
    if (trend === 'down') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Clinical Disclaimer */}
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
        <span className="text-amber-600 flex-shrink-0">📊</span>
        <span className="text-amber-800">
          Trend analysis is for educational tracking. Clinical interpretation requires a licensed BCBA or behavior analyst.
        </span>
      </div>

      {/* Summary Header */}
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Trend Analysis for {childName}
            </h2>
            <p className="text-gray-600 dark:text-slate-400">
              Based on {analytics.totalEntries} recorded incidents
            </p>
          </div>
          <Brain className="w-8 h-8 text-teal-600" />
        </div>
      </Card>

      {/* Trend Cards */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Frequency Trend</span>
            {getTrendIcon(analytics.frequencyTrend.trend)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {analytics.frequencyTrend.current}
            </span>
            <span className={`text-sm ${getTrendColor(analytics.frequencyTrend.trend)}`}>
              {analytics.frequencyTrend.change > 0 ? '+' : ''}{analytics.frequencyTrend.change.toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            vs {analytics.frequencyTrend.previous} in previous period
          </p>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">High Intensity</span>
            {getTrendIcon(analytics.intensityTrend.trend)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {analytics.intensityTrend.current}
            </span>
            <span className={`text-sm ${getTrendColor(analytics.intensityTrend.trend)}`}>
              {analytics.intensityTrend.change > 0 ? '+' : ''}{analytics.intensityTrend.change.toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            high intensity incidents
          </p>
        </Card>
      </div>

      {/* Peak Times */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          Peak Times
        </h3>

        <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
          {/* Hourly Distribution */}
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">By Hour</p>
            <div className="flex items-end gap-1 h-24">
              {analytics.hourlyPatterns.map((h) => (
                <div
                  key={h.hour}
                  className="flex-1 bg-teal-200 dark:bg-teal-700 rounded-t transition-all hover:bg-teal-300"
                  style={{ height: `${Math.max(4, h.percentage * 3)}%` }}
                  title={`${h.label}: ${h.count} incidents (${h.percentage.toFixed(1)}%)`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>12am</span>
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
              <span>12am</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {analytics.peakHours.map((h) => (
                <Badge key={h.hour} className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {h.label}: {h.count} ({h.percentage.toFixed(0)}%)
                </Badge>
              ))}
            </div>
          </div>

          {/* Daily Distribution */}
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">By Day of Week</p>
            <div className="space-y-2">
              {analytics.dailyPatterns.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-10 text-sm text-gray-600 dark:text-slate-400">{d.day}</span>
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400 w-8">{d.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {analytics.peakDays.map((d) => (
                <Badge key={d.day} className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {d.day}: {d.count} ({d.percentage.toFixed(0)}%)
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Function Analysis */}
      <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-600" />
          Likely Function of Behavior
        </h3>

        {analytics.likelyFunction && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-400">
                {analytics.likelyFunction.function}
              </div>
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                {analytics.likelyFunction.percentage.toFixed(0)}% of consequences
              </Badge>
            </div>
            <p className="text-sm text-violet-600 dark:text-violet-400">
              The most common consequence following behaviors suggests a {analytics.likelyFunction.function.toLowerCase()} function.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analytics.functionAnalysis.slice(0, 4).map((f) => (
            <div
              key={f.consequence}
              className="p-3 bg-white dark:bg-slate-800 rounded-lg text-center"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{f.count}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">{f.label}</div>
              <div className="text-xs text-violet-600 dark:text-violet-400">{f.percentage.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Patterns (Correlations) */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-teal-600" />
          Pattern Analysis & Insights
        </h3>

        <div className="space-y-3 sm:space-y-4">
          {analytics.correlations.map((corr, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                corr.type === 'strong'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : corr.type === 'moderate'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-blue-100 text-blue-700">{corr.antecedent}</Badge>
                  <span className="text-gray-400">→</span>
                  <Badge className="bg-red-100 text-red-700">{corr.behavior}</Badge>
                  <span className="text-gray-400">→</span>
                  <Badge className="bg-purple-100 text-purple-700">{corr.consequence}</Badge>
                </div>
                <Badge
                  className={
                    corr.type === 'strong' ? 'bg-red-600 text-white' :
                    corr.type === 'moderate' ? 'bg-yellow-600 text-white' :
                    'bg-gray-500 text-white'
                  }
                >
                  {corr.count}x ({corr.percentage.toFixed(0)}%)
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  corr.type === 'strong' ? 'text-red-500' : 'text-yellow-500'
                }`} />
                {corr.insight}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Triggers & Behaviors */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        {/* Top Antecedents */}
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Triggers</h3>
          <div className="space-y-3">
            {analytics.topAntecedents.map((a, i) => (
              <div key={a.antecedent} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-6">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {a.label}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {a.count} ({a.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${a.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Behaviors */}
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Behaviors</h3>
          <div className="space-y-3">
            {analytics.topBehaviors.map((b, i) => (
              <div key={b.behavior} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-6">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {b.label}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {b.count} ({b.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Clinical Recommendations */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Recommendations Based on Data
        </h3>

        <div className="space-y-3">
          {analytics.likelyFunction?.consequence === 'escape' && (
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Teach Break Requesting</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Since escape appears to be a primary function, teach {childName} to appropriately request breaks using words, signs, or a break card.
                </p>
              </div>
            </div>
          )}

          {analytics.likelyFunction?.consequence === 'attention' && (
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Increase Positive Attention</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Provide frequent positive attention when {childName} is engaged appropriately. Consider planned ignoring for minor attention-seeking behaviors.
                </p>
              </div>
            </div>
          )}

          {analytics.peakHours.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Address Peak Times</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Incidents peak at {analytics.peakHours.map(h => h.label).join(', ')}. Consider environmental modifications, increased support, or schedule adjustments during these times.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-sm font-bold">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Continue Data Collection</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Keep collecting ABC data consistently. Share these trends with {childName}'s BCBA or behavior specialist for a comprehensive functional behavior assessment.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-green-600 dark:text-green-400 mt-4">
          Note: These recommendations are based on data patterns. Always consult with qualified professionals before implementing behavior interventions.
        </p>
      </Card>
    </div>
  );
}

export default ABCTrendAnalysis;
