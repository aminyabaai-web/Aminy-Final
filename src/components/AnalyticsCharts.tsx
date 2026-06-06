// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AnalyticsCharts - Visual analytics and trend charts
 *
 * Features:
 * - Line charts for progress over time
 * - Bar charts for activity breakdown
 * - Pie charts for category distribution
 * - Custom date range selection
 * - Comparison periods (week over week)
 * - Pattern detection
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Clock,
  Target,
  Zap,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { isDemoMode } from '../lib/demo-seed';

// Types
interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface ChartData {
  progressOverTime: DataPoint[];
  activitiesByCategory: { category: string; count: number; color: string }[];
  moodDistribution: { mood: string; percentage: number; color: string }[];
  timeOfDayActivity: { hour: string; count: number }[];
  weeklyComparison: { week: string; progress: number }[];
  behaviorPatterns: { pattern: string; frequency: number; trend: 'up' | 'down' | 'stable' }[];
}

interface AnalyticsChartsProps {
  childName: string;
  childId?: string;
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange?: (range: string) => void;
}

// Simple SVG-based charts (no external dependencies)
const SimpleLineChart: React.FC<{
  data: DataPoint[];
  height?: number;
  color?: string;
  showArea?: boolean;
}> = ({ data, height = 150, color = '#6B9080', showArea = true }) => {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 400;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={padding.top + tick * chartHeight}
            x2={width - padding.right}
            y2={padding.top + tick * chartHeight}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 8}
            y={padding.top + tick * chartHeight + 4}
            textAnchor="end"
            className="text-xs fill-gray-400"
          >
            {Math.round(maxValue - tick * valueRange)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      {showArea && (
        <path
          d={areaPath}
          fill={`${color}20`}
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="white"
          stroke={color}
          strokeWidth="2"
        />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        i % Math.ceil(data.length / 7) === 0 && (
          <text
            key={i}
            x={points[i].x}
            y={height - 8}
            textAnchor="middle"
            className="text-xs fill-gray-400"
          >
            {d.label || new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        )
      ))}
    </svg>
  );
};

const SimpleBarChart: React.FC<{
  data: { category: string; count: number; color: string }[];
  height?: number;
}> = ({ data, height = 200 }) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.count));
  const barWidth = 100 / data.length;

  return (
    <div className="flex items-end justify-around" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = (d.count / maxValue) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-2" style={{ width: `${barWidth}%` }}>
            <span className="text-xs font-medium text-[#5A6B7A]">{d.count}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${barHeight}%` }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="w-8 rounded-t-lg"
              style={{ backgroundColor: d.color, maxHeight: height - 40 }}
            />
            <span className="text-xs text-[#5A6B7A] truncate max-w-full">{d.category}</span>
          </div>
        );
      })}
    </div>
  );
};

const SimplePieChart: React.FC<{
  data: { mood: string; percentage: number; color: string }[];
  size?: number;
}> = ({ data, size = 150 }) => {
  const radius = size / 2 - 10;
  const center = size / 2;
  let currentAngle = -90;

  const slices = data.map(d => {
    const angle = (d.percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      ...d,
      path: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="flex-shrink-0">
        {slices.map((slice, i) => (
          <motion.path
            key={i}
            d={slice.path}
            fill={slice.color}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
        {/* Center hole for donut effect */}
        <circle cx={center} cy={center} r={radius * 0.5} fill="white" />
      </svg>

      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-[#5A6B7A]">{d.mood}</span>
            <span className="text-sm font-medium text-[#1B2733]">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActivityHeatmap: React.FC<{
  data: { hour: string; count: number }[];
}> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => {
        const intensity = d.count / maxCount;
        const bgColor = `rgba(107, 144, 128, ${Math.max(0.1, intensity)})`;

        return (
          <div
            key={i}
            className="flex-1 rounded-t transition-all hover:opacity-80"
            style={{
              backgroundColor: bgColor,
              height: `${Math.max(10, intensity * 100)}%`
            }}
            title={`${d.hour}: ${d.count} activities`}
          />
        );
      })}
    </div>
  );
};

export function AnalyticsCharts({
  childName,
  childId,
  dateRange = 'week',
  onDateRangeChange
}: AnalyticsChartsProps) {
  const [selectedRange, setSelectedRange] = useState(dateRange);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const demoMode = isDemoMode();

  useEffect(() => {
    loadChartData();
  }, [childId, selectedRange]);

  const loadChartData = async () => {
    setIsLoading(true);

    if (demoMode) {
      // Demo walkthrough: show the rich sample dataset.
      setTimeout(() => {
        setChartData(generateMockData(selectedRange));
        setIsLoading(false);
      }, 500);
      return;
    }

    // Real users: never fabricate analytics about a real child. Real aggregation
    // is not wired yet, so render an honest empty state instead of mock charts.
    setChartData(null);
    setIsLoading(false);
  };

  const generateMockData = (range: string): ChartData => {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365;

    // Progress over time
    const progressOverTime: DataPoint[] = [];
    let baseProgress = 50;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      baseProgress += (Math.random() - 0.4) * 5;
      baseProgress = Math.max(20, Math.min(95, baseProgress));
      progressOverTime.push({
        date: date.toISOString(),
        value: Math.round(baseProgress)
      });
    }

    return {
      progressOverTime,
      activitiesByCategory: [
        { category: 'Routines', count: 42, color: '#6B9080' },
        { category: 'Communication', count: 28, color: '#8b5cf6' },
        { category: 'Behavior', count: 18, color: '#f59e0b' },
        { category: 'Social', count: 15, color: '#ec4899' },
        { category: 'Self-care', count: 22, color: '#3b82f6' }
      ],
      moodDistribution: [
        { mood: 'Happy', percentage: 45, color: '#22c55e' },
        { mood: 'Calm', percentage: 30, color: '#6B9080' },
        { mood: 'Frustrated', percentage: 15, color: '#f59e0b' },
        { mood: 'Overwhelmed', percentage: 10, color: '#ef4444' }
      ],
      timeOfDayActivity: [
        { hour: '6am', count: 5 },
        { hour: '8am', count: 15 },
        { hour: '10am', count: 12 },
        { hour: '12pm', count: 8 },
        { hour: '2pm', count: 10 },
        { hour: '4pm', count: 14 },
        { hour: '6pm', count: 18 },
        { hour: '8pm', count: 10 },
        { hour: '10pm', count: 3 }
      ],
      weeklyComparison: [
        { week: 'Week 1', progress: 55 },
        { week: 'Week 2', progress: 62 },
        { week: 'Week 3', progress: 58 },
        { week: 'Week 4', progress: 72 }
      ],
      behaviorPatterns: [
        { pattern: 'Morning transitions', frequency: 85, trend: 'up' },
        { pattern: 'Mealtime cooperation', frequency: 68, trend: 'stable' },
        { pattern: 'Bedtime routine', frequency: 45, trend: 'up' },
        { pattern: 'Task completion', frequency: 72, trend: 'up' },
        { pattern: 'Emotional regulation', frequency: 55, trend: 'stable' }
      ]
    };
  };

  const handleRangeChange = (value: string) => {
    setSelectedRange(value as 'week' | 'month' | 'quarter' | 'year');
    onDateRangeChange?.(value);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-[#8A9BA8]" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-[#E8E4DF] rounded w-1/4 mb-4" />
            <div className="h-40 bg-[#F0EDE8] rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!chartData) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#6B9080]/10 flex items-center justify-center mb-3">
          <TrendingUp className="w-6 h-6 text-[#6B9080]" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-[#1B2733] dark:text-white">No analytics yet</h3>
        <p className="mt-1.5 text-sm text-[#5A6B7A] max-w-xs">
          As you track {childName}&rsquo;s activities, moods, and routines, trends and insights will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Data Banner — only in demo mode (real users see real data or the empty state) */}
      {demoMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">Sample Data</span>
          <span className="text-amber-700/70 text-xs">Showing demo analytics. Real data will appear as you track activities.</span>
        </div>
      )}
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-white">Analytics for {childName}</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedRange} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadChartData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Over Time */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 dark:text-white">
            <LineChart className="w-5 h-5 text-primary" />
            Progress Over Time
          </h3>
          {demoMode && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% this {selectedRange}
            </Badge>
          )}
        </div>
        <SimpleLineChart data={chartData.progressOverTime} height={180} />
      </Card>

      {/* Activities and Mood */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activities by Category */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 dark:text-white">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Activities by Category
          </h3>
          <SimpleBarChart data={chartData.activitiesByCategory} height={180} />
        </Card>

        {/* Mood Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 dark:text-white">
            <PieChart className="w-5 h-5 text-pink-500" />
            Mood Distribution
          </h3>
          <SimplePieChart data={chartData.moodDistribution} size={140} />
        </Card>
      </div>

      {/* Time of Day Activity */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <Clock className="w-5 h-5 text-blue-500" />
          Activity by Time of Day
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-[#5A6B7A] flex-1">Morning</span>
          <span className="text-sm text-[#5A6B7A] flex-1 text-center">Afternoon</span>
          <span className="text-sm text-[#5A6B7A] flex-1 text-right">Evening</span>
          <Moon className="w-4 h-4 text-indigo-500" />
        </div>
        <ActivityHeatmap data={chartData.timeOfDayActivity} />
        <div className="flex justify-between mt-2 text-xs text-[#8A9BA8]">
          {chartData.timeOfDayActivity.map((d, i) => (
            <span key={i}>{d.hour}</span>
          ))}
        </div>
      </Card>

      {/* Behavior Patterns */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <Activity className="w-5 h-5 text-amber-500" />
          Behavior Patterns
        </h3>
        <div className="space-y-4">
          {chartData.behaviorPatterns.map((pattern, index) => (
            <motion.div
              key={pattern.pattern}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium dark:text-white">{pattern.pattern}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{pattern.frequency}%</span>
                  {getTrendIcon(pattern.trend)}
                </div>
              </div>
              <div className="w-full bg-[#E8E4DF] dark:bg-slate-700 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pattern.frequency}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Insights — illustrative narrative tied to the sample dataset; demo-only so real
          users are never shown fabricated clinical progress about their child. */}
      {demoMode && (
        <Card className="p-6 bg-gradient-to-r from-[#FAF7F2] to-slate-50 dark:from-teal-900/20 dark:to-slate-900/20 border-[#6B9080]/20 dark:border-[#6B9080]/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-[#6B9080] dark:text-primary">
            <Zap className="w-5 h-5" />
            Pattern Insights
          </h3>
          <ul className="space-y-2 text-sm text-[#6B9080] dark:text-[#7BA7BC]">
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Peak activity occurs between 4-8pm - consider scheduling important tasks during this window</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Morning transitions have improved 15% over the past 2 weeks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Bedtime routine shows consistent improvement - keep up the visual schedule strategy!</span>
            </li>
          </ul>
        </Card>
      )}
    </div>
  );
}

export default AnalyticsCharts;
