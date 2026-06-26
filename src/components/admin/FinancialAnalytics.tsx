// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Financial Analytics Dashboard
 *
 * MRR/ARR tracking, revenue forecasting, and financial health metrics.
 * Complements UnitEconomicsView with forward-looking financial analysis.
 * Connected to Stripe via financial-analytics service.
 */

import React, { useState } from 'react';
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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useFinancialAnalytics,
  downloadFinancialReport,
  type MRRData,
  type RevenueBreakdown,
  type ForecastData,
} from '../../lib/financial-analytics';

interface FinancialAnalyticsProps {
  onBack?: () => void;
}

export function FinancialAnalytics({ onBack }: FinancialAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '12m' | 'all'>('6m');

  // Fetch financial data from Stripe/Supabase
  const { data, isLoading, error, refresh } = useFinancialAnalytics(timeframe);

  // Extract metrics from data or use defaults
  const metrics = data?.metrics || {
    currentMRR: 0,
    previousMRR: 0,
    mrrGrowth: 0,
    currentARR: 0,
    totalSubscribers: 0,
    blendedARPU: 0,
    churnRate: 0,
    nrr: 100,
    grossMargin: 82,
    quickRatio: 0,
    logoChurn: 0,
  };

  const mrrHistory = data?.mrrHistory || [];
  const revenueByTier = data?.revenueByTier || [];
  const forecast = data?.forecast || [];

  const currentMRR = metrics.currentMRR;
  const previousMRR = metrics.previousMRR;
  const mrrGrowth = metrics.mrrGrowth.toFixed(1);
  const currentARR = metrics.currentARR;
  const totalSubscribers = metrics.totalSubscribers;
  const blendedARPU = metrics.blendedARPU;
  const churnRate = metrics.churnRate.toFixed(1);
  const nrr = metrics.nrr.toFixed(0);
  const grossMargin = metrics.grossMargin;
  const quickRatio = metrics.quickRatio;
  const logoChurn = metrics.logoChurn;

  // Get latest MRR movement data
  const latestMRR = mrrHistory.length > 0 ? mrrHistory[mrrHistory.length - 1] : null;

  // Handle export
  const handleExport = () => {
    if (!data) {
      toast.error('No data to export');
      return;
    }
    downloadFinancialReport(data);
    toast.success('Financial report downloaded');
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Demo Data Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
        <span className="text-amber-600 text-sm font-medium">Demo Data</span>
        <span className="text-amber-700/70 text-sm">Sample financial metrics. Connect Stripe for real revenue data.</span>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#132F43] dark:text-white">
            Financial Analytics
          </h1>
          <p className="text-[#5A6B7A] dark:text-slate-400">
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
                    ? 'bg-white dark:bg-slate-700 text-[#132F43] dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-slate-400 hover:text-[#132F43] dark:hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!data || isLoading}
          >
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="ml-2 text-neutral-600 dark:text-slate-400">Loading financial data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error loading financial data</span>
          </div>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
      )}

      {/* MRR Movement */}
      {!isLoading && !error && (
      <>
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-[#132F43] dark:text-white">
          MRR Movement
        </h2>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm font-medium">New MRR</span>
            </div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              +{formatCurrency(latestMRR?.newMRR || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-[#EEF4F8] dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Expansion</span>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              +{formatCurrency(latestMRR?.expansionMRR || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-sm font-medium">Contraction</span>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              -{formatCurrency(latestMRR?.contractionMRR || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Churn</span>
            </div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-300">
              -{formatCurrency(latestMRR?.churnMRR || 0)}
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
                <th className="text-right py-3 px-4 font-medium text-[#132F43] dark:text-white">Net New</th>
                <th className="text-right py-3 px-4 font-medium text-[#132F43] dark:text-white">Total MRR</th>
              </tr>
            </thead>
            <tbody>
              {mrrHistory.map((row, idx) => (
                <tr
                  key={row.month}
                  className={`border-b border-neutral-100 dark:border-slate-800 ${
                    idx === mrrHistory.length - 1 ? 'bg-neutral-50 dark:bg-slate-800/50 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-[#132F43] dark:text-white">{row.month}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">+{formatCurrency(row.newMRR)}</td>
                  <td className="py-3 px-4 text-right text-blue-600">+{formatCurrency(row.expansionMRR)}</td>
                  <td className="py-3 px-4 text-right text-amber-600">-{formatCurrency(row.contractionMRR)}</td>
                  <td className="py-3 px-4 text-right text-rose-600">-{formatCurrency(row.churnMRR)}</td>
                  <td className="py-3 px-4 text-right text-[#132F43] dark:text-white font-medium">
                    +{formatCurrency(row.netNewMRR)}
                  </td>
                  <td className="py-3 px-4 text-right text-[#132F43] dark:text-white font-bold">
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
          <h2 className="text-lg font-semibold mb-4 text-[#132F43] dark:text-white">
            Revenue by Tier
          </h2>
          <div className="space-y-4">
            {revenueByTier.map((tier) => (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="font-medium text-[#132F43] dark:text-white">{tier.tier}</span>
                    <Badge variant="secondary" className="text-sm">
                      {tier.subscribers.toLocaleString()} subs
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#132F43] dark:text-white">
                      {formatCurrency(tier.mrr)}
                    </span>
                    <span className="text-sm text-emerald-600 ml-2">+{tier.growth}%</span>
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
                <div className="flex justify-between text-sm text-[#5A6B7A] dark:text-slate-400">
                  <span>ARPU: ${tier.arpu.toFixed(2)}</span>
                  <span>{tier.percentOfTotal}% of MRR</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue Forecast */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-[#132F43] dark:text-white">
            Revenue Forecast
          </h2>
          <div className="space-y-4">
            {forecast.map((item, idx) => {
              const growthFromCurrent = currentMRR > 0
                ? ((item.projected - currentMRR) / currentMRR * 100).toFixed(0)
                : '0';
              return (
                <div
                  key={item.month}
                  className={`p-4 rounded-lg border ${
                    idx === 0
                      ? 'border-[#C8DDE8] bg-[#EEF4F8] dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-neutral-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#132F43] dark:text-white">
                      {item.month}
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
                      <p className="text-2xl font-bold text-[#132F43] dark:text-white">
                        {formatCurrency(item.projected)}
                      </p>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Projected</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-600 dark:text-slate-300">
                        <span className="text-amber-600">{formatCurrency(item.conservative)}</span>
                        {' - '}
                        <span className="text-emerald-600">{formatCurrency(item.optimistic)}</span>
                      </p>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Range</p>
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
        <h2 className="text-lg font-semibold mb-4 text-[#132F43] dark:text-white">
          Financial Health Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthIndicator
            label="Gross Margin"
            value={`${grossMargin}%`}
            status={grossMargin >= 70 ? 'healthy' : grossMargin >= 50 ? 'warning' : 'critical'}
            target=">70%"
          />
          <HealthIndicator
            label="Quick Ratio"
            value={quickRatio.toFixed(1)}
            status={quickRatio >= 1 ? 'healthy' : 'critical'}
            target=">1"
            description="(New MRR + Expansion) / (Churn + Contraction)"
          />
          <HealthIndicator
            label="Logo Churn"
            value={`${logoChurn.toFixed(1)}%`}
            status={logoChurn < 5 ? 'healthy' : logoChurn < 10 ? 'warning' : 'critical'}
            target="<5%"
          />
          <HealthIndicator
            label="MRR Churn"
            value={`${churnRate}%`}
            status={parseFloat(churnRate) < 5 ? 'healthy' : parseFloat(churnRate) < 10 ? 'warning' : 'critical'}
            target="<5%"
          />
        </div>
      </Card>
      </>
      )}
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
    blue: 'bg-[#EEF4F8] dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
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
      <p className="text-2xl font-bold text-[#132F43] dark:text-white mb-1">{value}</p>
      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">{title}</p>
      <p className="text-sm text-neutral-400 dark:text-[#5A6B7A] mt-1">{subtitle}</p>
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
      <p className="text-2xl font-bold text-[#132F43] dark:text-white">{value}</p>
      <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">Target: {target}</p>
      {description && (
        <p className="text-sm text-neutral-400 dark:text-[#5A6B7A] mt-1">{description}</p>
      )}
    </div>
  );
}

export default FinancialAnalytics;
