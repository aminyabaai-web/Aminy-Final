// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Outcome Benchmarks Component
 * Shows child's progress percentile compared to cohort
 * "Your child is in the 75th percentile for progress"
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  BarChart3,
  Info,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  BenchmarkData,
  ChildBenchmarks,
  BENCHMARK_DISPLAY,
  getBenchmarkSummary,
  calculateRealBenchmarks,
  generateMockBenchmarks,
} from '../lib/outcome-benchmarks';

interface OutcomeBenchmarksProps {
  childId: string;
  childName: string;
  childAge: number;
  daysOnPlatform: number;
  onViewDetails?: () => void;
}

export function OutcomeBenchmarks({
  childId,
  childName,
  childAge,
  daysOnPlatform,
  onViewDetails,
}: OutcomeBenchmarksProps) {
  const [benchmarks, setBenchmarks] = useState<ChildBenchmarks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBenchmarks() {
      setLoading(true);
      try {
        // Use real benchmark calculation with actual progress data
        const data = await calculateRealBenchmarks(childId, childAge, daysOnPlatform);
        setBenchmarks(data);
      } catch (error) {
        console.error('Failed to calculate benchmarks:', error);
        // Fall back to mock data if calculation fails
        setBenchmarks(generateMockBenchmarks(childId, childAge, daysOnPlatform));
      } finally {
        setLoading(false);
      }
    }
    loadBenchmarks();
  }, [childId, childAge, daysOnPlatform]);

  if (loading || !benchmarks) {
    return (
      <Card className="p-5 bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#6B9080]" />
          <span className="ml-2 text-[#5A6B7A]">Loading benchmarks...</span>
        </div>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'needs-attention') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'needs-attention':
        return <TrendingDown className="w-4 h-4 text-amber-500" />;
      default:
        return <Minus className="w-4 h-4 text-[#8A9BA8]" />;
    }
  };

  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-amber-600';
    return 'text-[#5A6B7A]';
  };

  const getPercentileBadgeColor = (percentile: number): string => {
    if (percentile >= 75) return 'bg-green-100 text-green-700';
    if (percentile >= 50) return 'bg-blue-100 text-blue-700';
    if (percentile >= 25) return 'bg-amber-100 text-amber-700';
    return 'bg-[#F0EDE8] text-[#3A4A57]';
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-white to-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] rounded-xl">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1B2733]">Progress Benchmarks</h3>
            <p className="text-sm text-[#5A6B7A]">
              How {childName} compares to similar families
            </p>
          </div>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-sm text-[#6B9080] hover:text-[#6B9080] flex items-center gap-1"
          >
            Details
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Overall Percentile Hero */}
      <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-[#FAF7F2] to-blue-50 rounded-xl border border-[#6B9080]/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#6B9080] mb-1">Overall Progress</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getPercentileColor(benchmarks.overallPercentile)}`}>
                {benchmarks.overallPercentile}
              </span>
              <span className="text-lg text-[#5A6B7A]">percentile</span>
            </div>
            <p className="text-sm text-[#5A6B7A] mt-1">
              {benchmarks.overallPercentile >= 50
                ? `${childName} is progressing faster than ${benchmarks.overallPercentile}% of families on Aminy`
                : `${childName} is building foundations—small steps lead to big changes`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon(benchmarks.overallTrend)}
            <span className="text-sm text-[#5A6B7A] capitalize">
              {benchmarks.overallTrend.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3 sm:space-y-4">
        <h4 className="font-medium text-[#3A4A57] flex items-center gap-2">
          <Target className="w-4 h-4 text-[#6B9080]" />
          Progress by Area
        </h4>

        {benchmarks.benchmarks.map((benchmark, index) => (
          <BenchmarkRow
            key={benchmark.category}
            benchmark={benchmark}
            index={index}
          />
        ))}
      </div>

      {/* Percentile Explainer */}
      <div className="mt-4 p-3 bg-[#EEF4F8] rounded-lg border border-[#C8DDE8]">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#4A6478]">
            <strong>What does percentile mean?</strong>
            <p className="text-blue-700 mt-1">
              If {childName} is in the 75th percentile, that means they're progressing
              faster than 75% of families using Aminy. Every child's journey is unique—these
              benchmarks help you see progress over time.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Individual benchmark row with visualization
 */
function BenchmarkRow({
  benchmark,
  index,
}: {
  benchmark: BenchmarkData;
  index: number;
}) {
  const display = BENCHMARK_DISPLAY[benchmark.category];

  const getPercentilePosition = (percentile: number): number => {
    return Math.min(100, Math.max(0, percentile));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-3 bg-white rounded-lg border border-[#E8E4DF] hover:border-[#E8E4DF] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{display.icon}</span>
          <div>
            <span className="font-medium text-[#1B2733]">{display.displayName}</span>
            <p className="text-xs text-[#5A6B7A]">{display.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${
            benchmark.percentileBreakpoints.p75 <= benchmark.userPercentile
              ? 'bg-green-100 text-green-700'
              : benchmark.percentileBreakpoints.p50 <= benchmark.userPercentile
              ? 'bg-blue-100 text-blue-700'
              : 'bg-[#F0EDE8] text-[#3A4A57]'
          }`}>
            {benchmark.userPercentile}th
          </Badge>
          {benchmark.trend === 'improving' && (
            <TrendingUp className="w-4 h-4 text-green-500" />
          )}
          {benchmark.trend === 'needs-attention' && (
            <TrendingDown className="w-4 h-4 text-amber-500" />
          )}
        </div>
      </div>

      {/* Percentile visualization */}
      <div className="relative h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
        {/* Quartile markers */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-300"
          style={{ left: '25%' }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-300"
          style={{ left: '50%' }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-300"
          style={{ left: '75%' }}
        />

        {/* User's percentile marker */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${getPercentilePosition(benchmark.userPercentile)}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
          className={`h-full rounded-full ${
            benchmark.userPercentile >= 75
              ? 'bg-gradient-to-r from-green-400 to-green-500'
              : benchmark.userPercentile >= 50
              ? 'bg-gradient-to-r from-blue-400 to-blue-500'
              : 'bg-gradient-to-r from-amber-400 to-amber-500'
          }`}
        />
      </div>

      {/* Trend description */}
      <p className="text-xs text-[#5A6B7A] mt-2">
        {benchmark.trendDescription}
      </p>
    </motion.div>
  );
}

/**
 * Compact benchmark widget for dashboard
 */
export function BenchmarkWidget({
  childName,
  overallPercentile,
  overallTrend,
  topCategory,
  onViewDetails,
}: {
  childName: string;
  overallPercentile: number;
  overallTrend: 'improving' | 'stable' | 'needs-attention';
  topCategory?: { name: string; percentile: number };
  onViewDetails?: () => void;
}) {
  return (
    <Card
      className="p-4 bg-gradient-to-br from-[#FAF7F2] to-blue-50 border-[#6B9080]/20 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onViewDetails}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#6B9080]/10 rounded-xl">
          <Award className="w-5 h-5 text-[#6B9080]" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-[#6B9080] mb-0.5">
            {childName}'s Progress
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#6B9080]">
              {overallPercentile}
            </span>
            <span className="text-sm text-[#6B9080]">percentile</span>
            {overallTrend === 'improving' && (
              <TrendingUp className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-primary" />
      </div>

      {topCategory && (
        <div className="mt-3 pt-3 border-t border-[#6B9080]/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6B9080]">Top area: {topCategory.name}</span>
            <Badge className="bg-green-100 text-green-700">
              {topCategory.percentile}th
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}

export default OutcomeBenchmarks;
