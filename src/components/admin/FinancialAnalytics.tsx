/**
 * Financial Analytics Dashboard
 *
 * MRR/ARR tracking, revenue forecasting, and financial health metrics.
 * Complements UnitEconomicsView with forward-looking financial analysis.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Download,
  PieChart,
  BarChart3,
  LineChart,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface FinancialAnalyticsProps {
  onBack?: () => void;
}

interface MRRData {
  month: string;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnMRR: number;
  netNewMRR: number;
  totalMRR: number;
}

interface RevenueBreakdown {
  tier: string;
  mrr: number;
  subscribers: number;
  arpu: number;
  percentOfTotal: number;
  growth: number;
  color: string;
}

interface ForecastData {
  month: string;
  projected: number;
  conservative: number;
  optimistic: number;
  actual?: number;
}

// Mock data - would come from Stripe/billing backend in production
const MOCK_MRR_HISTORY: MRRData[] = [
  { month: 'Aug 2024', newMRR: 8420, expansionMRR: 1230, contractionMRR: 450, churnMRR: 2100, netNewMRR: 7100, totalMRR: 52300 },
  { month: 'Sep 2024', newMRR: 11200, expansionMRR: 1890, contractionMRR: 620, churnMRR: 2340, netNewMRR: 10130, totalMRR: 62430 },
  { month: 'Oct 2024', newMRR: 14500, expansionMRR: 2340, contractionMRR: 780, churnMRR: 2560, netNewMRR: 13500, totalMRR: 75930 },
  { month: 'Nov 2024', newMRR: 18200, expansionMRR: 3120, contractionMRR: 890, churnMRR: 2890, netNewMRR: 17540, totalMRR: 93470 },
  { month: 'Dec 2024', newMRR: 21300, expansionMRR: 4200, contractionMRR: 1020, churnMRR: 3200, netNewMRR: 21280, totalMRR: 114750 },
  { month: 'Jan 2025', newMRR: 24800, expansionMRR: 5100, contractionMRR: 1150, churnMRR: 3450, netNewMRR: 25300, totalMRR: 140050 },
];

const TIER_REVENUE: RevenueBreakdown[] = [
  { tier: 'Starter', mrr: 8630, subscribers: 1234, arpu: 6.99, percentOfTotal: 6.2, growth: 12.3, color: '#3B82F6' },
  { tier: 'Core', mrr: 32318, subscribers: 2156, arpu: 14.99, percentOfTotal: 23.1, growth: 18.7, color: '#10B981' },
  { tier: 'Pro', mrr: 26280, subscribers: 876, arpu: 29.99, percentOfTotal: 18.8, growth: 24.5, color: '#8B5CF6' },
  { tier: 'Pro+', mrr: 11698, subscribers: 234, arpu: 49.99, percentOfTotal: 8.4, growth: 31.2, color: '#F59E0B' },
  { tier: 'Enterprise', mrr: 61124, subscribers: 89, arpu: 686.79, percentOfTotal: 43.6, growth: 42.1, color: '#EC4899' },
];

const MOCK_FORECAST: ForecastData[] = [
  { month: 'Feb 2025', projected: 168060, conservative: 154500, optimistic: 182000, actual: undefined },
  { month: 'Mar 2025', projected: 201672, conservative: 180900, optimistic: 224000, actual: undefined },
  { month: 'Apr 2025', projected: 242006, conservative: 211980, optimistic: 276000, actual: undefined },
  { month: 'May 2025', projected: 290408, conservative: 248220, optimistic: 340000, actual: undefined },
  { month: 'Jun 2025', projected: 348489, conservative: 290770, optimistic: 420000, actual: undefined },
];

export function FinancialAnalytics({ onBack }: FinancialAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '12m' | 'all'>('6m');
  const [isLoading, setIsLoading] = useState(false);

  const currentMRR = MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].totalMRR;
  const previousMRR = MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 2].totalMRR;
  const mrrGrowth = ((currentMRR - previousMRR) / previousMRR * 100).toFixed(1);

  const currentARR = currentMRR * 12;
  const totalSubscribers = TIER_REVENUE.reduce((sum, t) => sum + t.subscribers, 0);
  const blendedARPU = currentMRR / totalSubscribers;

  const churnRate = (MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].churnMRR / previousMRR * 100).toFixed(1);
  const nrr = ((currentMRR + MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].expansionMRR - MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].churnMRR) / previousMRR * 100).toFixed(0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Financial Analytics
          </h1>
          <p className="text-neutral-500 dark:text-slate-400">
            MRR, ARR, and revenue forecasting
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-neutral-100 dark:bg-slate-800 rounded-lg p-1">
            {(['3m', '6m', '12m', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeframe === t
                    ? 'bg-white dark:bg-slate-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(currentMRR)}
          change={parseFloat(mrrGrowth)}
          subtitle="vs last month"
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <MetricCard
          title="Annual Run Rate (ARR)"
          value={formatCurrency(currentARR)}
          change={parseFloat(mrrGrowth)}
          subtitle="projected"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Net Revenue Retention"
          value={`${nrr}%`}
          change={parseInt(nrr) - 100}
          subtitle="above baseline"
          icon={<RefreshCw className="w-5 h-5" />}
          color="violet"
        />
        <MetricCard
          title="Blended ARPU"
          value={`$${blendedARPU.toFixed(2)}`}
          change={8.3}
          subtitle="vs last month"
          icon={<Users className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* MRR Movement */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
          MRR Movement
        </h2>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-xs font-medium">New MRR</span>
            </div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              +{formatCurrency(MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].newMRR)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Expansion</span>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              +{formatCurrency(MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].expansionMRR)}
            </p>
          </div>
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-xs font-medium">Contraction</span>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              -{formatCurrency(MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].contractionMRR)}
            </p>
          </div>
          <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Churn</span>
            </div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-300">
              -{formatCurrency(MOCK_MRR_HISTORY[MOCK_MRR_HISTORY.length - 1].churnMRR)}
            </p>
          </div>
        </div>

        {/* MRR Trend Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-neutral-600 dark:text-slate-400">Month</th>
                <th className="text-right py-3 px-4 font-medium text-emerald-600">New</th>
                <th className="text-right py-3 px-4 font-medium text-blue-600">Expansion</th>
                <th className="text-right py-3 px-4 font-medium text-amber-600">Contraction</th>
                <th className="text-right py-3 px-4 font-medium text-rose-600">Churn</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-900 dark:text-white">Net New</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-900 dark:text-white">Total MRR</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MRR_HISTORY.map((row, idx) => (
                <tr
                  key={row.month}
                  className={`border-b border-neutral-100 dark:border-slate-800 ${
                    idx === MOCK_MRR_HISTORY.length - 1 ? 'bg-neutral-50 dark:bg-slate-800/50 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-neutral-900 dark:text-white">{row.month}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">+{formatCurrency(row.newMRR)}</td>
                  <td className="py-3 px-4 text-right text-blue-600">+{formatCurrency(row.expansionMRR)}</td>
                  <td className="py-3 px-4 text-right text-amber-600">-{formatCurrency(row.contractionMRR)}</td>
                  <td className="py-3 px-4 text-right text-rose-600">-{formatCurrency(row.churnMRR)}</td>
                  <td className="py-3 px-4 text-right text-neutral-900 dark:text-white font-medium">
                    +{formatCurrency(row.netNewMRR)}
                  </td>
                  <td className="py-3 px-4 text-right text-neutral-900 dark:text-white font-bold">
                    {formatCurrency(row.totalMRR)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Revenue by Tier & Forecast */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by Tier */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
            Revenue by Tier
          </h2>
          <div className="space-y-4">
            {TIER_REVENUE.map((tier) => (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="font-medium text-neutral-900 dark:text-white">{tier.tier}</span>
                    <Badge variant="secondary" className="text-xs">
                      {tier.subscribers.toLocaleString()} subs
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(tier.mrr)}
                    </span>
                    <span className="text-xs text-emerald-600 ml-2">+{tier.growth}%</span>
                  </div>
                </div>
                <div className="h-2 bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${tier.percentOfTotal}%`,
                      backgroundColor: tier.color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neutral-500 dark:text-slate-400">
                  <span>ARPU: ${tier.arpu.toFixed(2)}</span>
                  <span>{tier.percentOfTotal}% of MRR</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue Forecast */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
            Revenue Forecast
          </h2>
          <div className="space-y-4">
            {MOCK_FORECAST.map((forecast, idx) => {
              const growthFromCurrent = ((forecast.projected - currentMRR) / currentMRR * 100).toFixed(0);
              return (
                <div
                  key={forecast.month}
                  className={`p-4 rounded-lg border ${
                    idx === 0
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-neutral-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {forecast.month}
                    </span>
                    <Badge
                      variant={parseInt(growthFromCurrent) > 50 ? 'default' : 'secondary'}
                      className={parseInt(growthFromCurrent) > 50 ? 'bg-emerald-500' : ''}
                    >
                      +{growthFromCurrent}%
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(forecast.projected)}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-slate-400">Projected</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-600 dark:text-slate-300">
                        <span className="text-amber-600">{formatCurrency(forecast.conservative)}</span>
                        {' - '}
                        <span className="text-emerald-600">{formatCurrency(forecast.optimistic)}</span>
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-slate-400">Range</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-neutral-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-neutral-600 dark:text-slate-400">
              <strong>Model:</strong> 20% MoM growth based on trailing 6-month average.
              Conservative assumes 15% growth, optimistic assumes 25%.
            </p>
          </div>
        </Card>
      </div>

      {/* Health Indicators */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
          Financial Health Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthIndicator
            label="Gross Margin"
            value="82%"
            status="healthy"
            target=">70%"
          />
          <HealthIndicator
            label="Quick Ratio"
            value="3.2"
            status="healthy"
            target=">1"
            description="(New MRR + Expansion) / (Churn + Contraction)"
          />
          <HealthIndicator
            label="Logo Churn"
            value="2.8%"
            status="healthy"
            target="<5%"
          />
          <HealthIndicator
            label="MRR Churn"
            value={`${churnRate}%`}
            status={parseFloat(churnRate) < 5 ? 'healthy' : 'warning'}
            target="<5%"
          />
        </div>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  change: number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-slate-400">{title}</p>
      <p className="text-xs text-neutral-400 dark:text-slate-500 mt-1">{subtitle}</p>
    </Card>
  );
}

// Health Indicator Component
function HealthIndicator({
  label,
  value,
  status,
  target,
  description,
}: {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  target: string;
  description?: string;
}) {
  const statusConfig = {
    healthy: {
      icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
    },
    critical: {
      icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200 dark:border-rose-800',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">{label}</span>
        {config.icon}
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">Target: {target}</p>
      {description && (
        <p className="text-xs text-neutral-400 dark:text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}

export default FinancialAnalytics;
