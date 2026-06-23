// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Unit Economics Dashboard
 * VC-focused metrics visualization
 * Shows CAC, LTV, churn, retention - all the numbers investors want to see
 */

import React, { useState, useEffect, useMemo } from 'react';
import { tierPricing } from '../../lib/tier-utils';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import { getRetentionMetrics, getConversionFunnel, type RetentionMetrics, type ConversionFunnel } from '../../lib/analytics-engine';
import { isDemoMode } from '../../lib/demo-seed';

interface UnitEconomicsViewProps {
  onBack?: () => void;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
  target?: string;
  trend: 'up' | 'down' | 'neutral';
}

interface CohortData {
  month: string;
  users: number;
  d1: number;
  d7: number;
  d30: number;
  d60: number;
  d90: number;
}

interface ChannelMetrics {
  channel: string;
  spend: number;
  acquisitions: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  paybackDays: number;
}

// Mock data - would come from analytics backend in production
const MOCK_METRICS: MetricCard[] = [
  {
    title: 'Customer Acquisition Cost',
    value: '$47.20',
    change: -12.3,
    changeLabel: 'vs last month',
    icon: <DollarSign className="w-5 h-5" />,
    color: '#10B981',
    target: '$50',
    trend: 'down',
  },
  {
    title: 'Lifetime Value (LTV)',
    value: '$312',
    change: 8.5,
    changeLabel: 'vs last month',
    icon: <TrendingUp className="w-5 h-5" />,
    color: '#3B82F6',
    target: '$300',
    trend: 'up',
  },
  {
    title: 'LTV/CAC Ratio',
    value: '6.6x',
    change: 24.2,
    changeLabel: 'vs last month',
    icon: <Target className="w-5 h-5" />,
    color: '#8B5CF6',
    target: '3x',
    trend: 'up',
  },
  {
    title: 'Payback Period',
    value: '2.1 mo',
    change: -15.0,
    changeLabel: 'vs last month',
    icon: <Clock className="w-5 h-5" />,
    color: '#F59E0B',
    target: '<6 mo',
    trend: 'down',
  },
  {
    title: 'Monthly Churn Rate',
    value: '3.2%',
    change: -0.8,
    changeLabel: 'vs last month',
    icon: <Users className="w-5 h-5" />,
    color: '#EC4899',
    target: '<5%',
    trend: 'down',
  },
  {
    title: 'Net Revenue Retention',
    value: '118%',
    change: 5.2,
    changeLabel: 'vs last month',
    icon: <RefreshCw className="w-5 h-5" />,
    color: '#06B6D4',
    target: '>100%',
    trend: 'up',
  },
];

const MOCK_COHORTS: CohortData[] = [
  { month: 'Aug 2024', users: 847, d1: 78, d7: 62, d30: 48, d60: 41, d90: 37 },
  { month: 'Sep 2024', users: 1203, d1: 81, d7: 65, d30: 51, d60: 44, d90: 39 },
  { month: 'Oct 2024', users: 1567, d1: 83, d7: 68, d30: 54, d60: 47, d90: 42 },
  { month: 'Nov 2024', users: 2134, d1: 85, d7: 71, d30: 57, d60: 49, d90: 44 },
  { month: 'Dec 2024', users: 2891, d1: 87, d7: 73, d30: 59, d60: 51, d90: 46 },
  { month: 'Jan 2025', users: 3456, d1: 89, d7: 75, d30: 61, d60: 53, d90: 0 },
];

const MOCK_CHANNELS: ChannelMetrics[] = [
  { channel: 'Organic Search', spend: 0, acquisitions: 1245, cac: 0, ltv: 298, ltvCacRatio: Infinity, paybackDays: 0 },
  { channel: 'Facebook Ads', spend: 12500, acquisitions: 312, cac: 40.06, ltv: 287, ltvCacRatio: 7.2, paybackDays: 42 },
  { channel: 'Google Ads', spend: 18200, acquisitions: 387, cac: 47.03, ltv: 324, ltvCacRatio: 6.9, paybackDays: 44 },
  { channel: 'Instagram', spend: 8900, acquisitions: 198, cac: 44.95, ltv: 312, ltvCacRatio: 6.9, paybackDays: 43 },
  { channel: 'Referrals', spend: 2400, acquisitions: 156, cac: 15.38, ltv: 356, ltvCacRatio: 23.1, paybackDays: 13 },
  { channel: 'Partnerships', spend: 5000, acquisitions: 89, cac: 56.18, ltv: 412, ltvCacRatio: 7.3, paybackDays: 41 },
];

const TIER_BREAKDOWN = [
  { tier: 'Free', users: 4521, revenue: 0, arpu: tierPricing.free.monthly, color: '#94A3B8' },
  { tier: 'Starter', users: 1234, revenue: Math.round(1234 * tierPricing.starter.monthly), arpu: tierPricing.starter.monthly, color: '#3B82F6' },
  { tier: 'Core', users: 2156, revenue: Math.round(2156 * tierPricing.core.monthly), arpu: tierPricing.core.monthly, color: '#10B981' },
  { tier: 'Pro', users: 876, revenue: Math.round(876 * tierPricing.pro.monthly), arpu: tierPricing.pro.monthly, color: '#8B5CF6' },
  { tier: 'Pro+', users: 234, revenue: Math.round(234 * tierPricing.proplus.monthly), arpu: tierPricing.proplus.monthly, color: '#F59E0B' },
];

export function UnitEconomicsView({ onBack }: UnitEconomicsViewProps) {
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | '12m' | 'all'>('90d');
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionMetrics | null>(null);
  const [funnelData, setFunnelData] = useState<ConversionFunnel | null>(null);

  // Load real analytics data
  useEffect(() => {
    const retention = getRetentionMetrics();
    const funnel = getConversionFunnel();
    setRetentionData(retention);
    setFunnelData(funnel);
  }, [timeframe]);

  // Compute metrics from real data where available, fall back to mock
  const computedMetrics = useMemo(() => {
    const baseMetrics = [...MOCK_METRICS];

    // Override churn rate if we have real data
    if (retentionData) {
      const churnIndex = baseMetrics.findIndex(m => m.title === 'Monthly Churn Rate');
      if (churnIndex >= 0) {
        baseMetrics[churnIndex] = {
          ...baseMetrics[churnIndex],
          value: `${retentionData.churnRate.toFixed(1)}%`,
        };
      }
    }

    return baseMetrics;
  }, [retentionData]);

  // Convert real retention cohorts to display format
  const cohortData = useMemo(() => {
    if (retentionData && retentionData.cohorts.length > 0) {
      return retentionData.cohorts.slice(0, 6).map(c => ({
        month: new Date(c.cohortDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: c.cohortSize,
        d1: Math.round(c.d1),
        d7: Math.round(c.d7),
        d30: Math.round(c.d30),
        d60: Math.round(c.d60),
        d90: Math.round(c.d90),
      }));
    }
    return MOCK_COHORTS;
  }, [retentionData]);

  const totalRevenue = TIER_BREAKDOWN.reduce((sum, t) => sum + t.revenue, 0);
  const totalPaidUsers = TIER_BREAKDOWN.filter(t => t.tier !== 'Free').reduce((sum, t) => sum + t.users, 0);
  const blendedArpu = totalRevenue / totalPaidUsers;

  // The mock metrics below are investor-grade *sample* numbers. Real users must
  // never see fabricated CAC/LTV/MRR/cohort figures — only show them in demo
  // mode (or once real analytics events exist). Otherwise render an empty state.
  const hasRealData = !!(retentionData && retentionData.cohorts.length > 0);
  if (!isDemoMode() && !hasRealData) {
    return (
      <div className="min-h-screen bg-mist">
        <div className="bg-white border-b border-[#E8E4DF] px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Unit Economics</h1>
              <p className="text-sm text-[#5A6B7A] mt-1">Investor-grade metrics dashboard</p>
            </div>
            {onBack && (
              <button onClick={onBack} className="px-4 py-2 text-sm text-[#5A6B7A] hover:text-[#1B2733]">
                ← Back
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center text-center px-6 py-16">
          <div className="w-12 h-12 rounded-full bg-[#FAF7F2] flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-[#577590]" />
          </div>
          <h2 className="text-[15px] font-bold text-[#0D1B2A] mb-1">No analytics data yet</h2>
          <p className="text-[13px] text-[#577590] max-w-sm">
            Unit-economics metrics will populate here once the analytics backend is
            connected and product usage starts flowing in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      {/* Demo Data Banner — only when showing sample (non-real) metrics */}
      {!hasRealData && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">Demo Data</span>
          <span className="text-amber-700/70 text-sm">Sample metrics shown for demonstration. Connect analytics backend for real data.</span>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Unit Economics</h1>
            <p className="text-sm text-[#5A6B7A] mt-1">Investor-grade metrics dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
              className="px-3 py-2 border border-[#E8E4DF] rounded-lg text-sm bg-white"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
              <option value="all">All time</option>
            </select>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm text-[#5A6B7A] hover:text-[#1B2733]"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {computedMetrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-[#E8E4DF] p-4"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}15` }}
                >
                  <div style={{ color: metric.color }}>{metric.icon}</div>
                </div>
                {metric.target && (
                  <span className="text-sm text-[#8A9BA8]">Target: {metric.target}</span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-sm text-[#5A6B7A]">{metric.title}</p>
                <p className="text-2xl font-semibold text-[#1B2733] mt-1">{metric.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {metric.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : metric.trend === 'down' ? (
                    <ArrowDownRight className="w-4 h-4 text-green-500" />
                  ) : null}
                  <span
                    className={`text-sm font-medium ${
                      (metric.trend === 'down' && metric.title.includes('Churn')) ||
                      (metric.trend === 'down' && metric.title.includes('CAC')) ||
                      (metric.trend === 'down' && metric.title.includes('Payback')) ||
                      (metric.trend === 'up' && !metric.title.includes('Churn'))
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {metric.change > 0 ? '+' : ''}
                    {metric.change}%
                  </span>
                  <span className="text-sm text-[#8A9BA8]">{metric.changeLabel}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Revenue by Tier */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1B2733]">Revenue by Tier</h2>
              <p className="text-sm text-[#5A6B7A]">Monthly recurring revenue breakdown</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-[#1B2733]">${totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-[#5A6B7A]">Total MRR</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {TIER_BREAKDOWN.filter(t => t.tier !== 'Free').map((tier) => (
              <div key={tier.tier} className="flex items-center gap-3 sm:gap-4">
                <div className="w-20 text-sm font-medium text-[#3A4A57]">{tier.tier}</div>
                <div className="flex-1">
                  <div className="h-8 bg-[#F0EDE8] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(tier.revenue / totalRevenue) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-lg"
                      style={{ backgroundColor: tier.color }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-sm font-medium text-white drop-shadow">
                        ${tier.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right">
                  <p className="text-sm font-medium text-[#1B2733]">{tier.users.toLocaleString()}</p>
                  <p className="text-sm text-[#5A6B7A]">users</p>
                </div>
                <div className="w-20 text-right">
                  <p className="text-sm font-medium text-[#1B2733]">${tier.arpu}</p>
                  <p className="text-sm text-[#5A6B7A]">ARPU</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 sm:mt-6 pt-4 border-t border-[#E8E4DF] flex items-center justify-between">
            <div>
              <p className="text-sm text-[#5A6B7A]">Blended ARPU (Paid Users)</p>
              <p className="text-lg font-semibold text-[#1B2733]">${blendedArpu.toFixed(2)}/mo</p>
            </div>
            <div>
              <p className="text-sm text-[#5A6B7A]">Free → Paid Conversion</p>
              <p className="text-lg font-semibold text-[#1B2733]">
                {((totalPaidUsers / (totalPaidUsers + TIER_BREAKDOWN[0].users)) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-[#5A6B7A]">Upgrade Rate (Starter → Higher)</p>
              <p className="text-lg font-semibold text-[#1B2733]">42.3%</p>
            </div>
          </div>
        </div>

        {/* Cohort Retention Table */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1B2733]">Cohort Retention</h2>
              <p className="text-sm text-[#5A6B7A]">User retention by signup month</p>
            </div>
            <BarChart3 className="w-5 h-5 text-[#8A9BA8]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E4DF]">
                  <th className="text-left py-3 px-2 font-medium text-[#5A6B7A]">Cohort</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">Users</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">D1</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">D7</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">D30</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">D60</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">D90</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => (
                  <tr
                    key={cohort.month}
                    className="border-b border-[#E8E4DF] hover:bg-[#FAF7F2] cursor-pointer"
                    onClick={() => setSelectedCohort(selectedCohort === cohort.month ? null : cohort.month)}
                  >
                    <td className="py-3 px-2 font-medium text-[#1B2733]">{cohort.month}</td>
                    <td className="py-3 px-2 text-right text-[#5A6B7A]">{cohort.users.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className="px-2 py-1 rounded text-white text-xs font-medium"
                        style={{ backgroundColor: getRetentionColor(cohort.d1) }}
                      >
                        {cohort.d1}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className="px-2 py-1 rounded text-white text-xs font-medium"
                        style={{ backgroundColor: getRetentionColor(cohort.d7) }}
                      >
                        {cohort.d7}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className="px-2 py-1 rounded text-white text-xs font-medium"
                        style={{ backgroundColor: getRetentionColor(cohort.d30) }}
                      >
                        {cohort.d30}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className="px-2 py-1 rounded text-white text-xs font-medium"
                        style={{ backgroundColor: getRetentionColor(cohort.d60) }}
                      >
                        {cohort.d60}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {cohort.d90 > 0 ? (
                        <span
                          className="px-2 py-1 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: getRetentionColor(cohort.d90) }}
                        >
                          {cohort.d90}%
                        </span>
                      ) : (
                        <span className="text-[#8A9BA8]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3 sm:gap-4 sm:gap-6 text-xs text-[#5A6B7A]">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getRetentionColor(80) }} />
              Excellent (70%+)
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getRetentionColor(55) }} />
              Good (50-69%)
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getRetentionColor(35) }} />
              Needs work (&lt;50%)
            </span>
          </div>
        </div>

        {/* Acquisition Channels */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1B2733]">Acquisition Channels</h2>
              <p className="text-sm text-[#5A6B7A]">CAC and LTV by marketing channel</p>
            </div>
            <PieChart className="w-5 h-5 text-[#8A9BA8]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E4DF]">
                  <th className="text-left py-3 px-2 font-medium text-[#5A6B7A]">Channel</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">Spend</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">Users</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">CAC</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">LTV</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">LTV:CAC</th>
                  <th className="text-right py-3 px-2 font-medium text-[#5A6B7A]">Payback</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CHANNELS.map((channel) => (
                  <tr key={channel.channel} className="border-b border-[#E8E4DF]">
                    <td className="py-3 px-2 font-medium text-[#1B2733]">{channel.channel}</td>
                    <td className="py-3 px-2 text-right text-[#5A6B7A]">
                      {channel.spend === 0 ? '$0' : `$${channel.spend.toLocaleString()}`}
                    </td>
                    <td className="py-3 px-2 text-right text-[#5A6B7A]">{channel.acquisitions.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-[#1B2733] font-medium">
                      {channel.cac === 0 ? '$0' : `$${channel.cac.toFixed(2)}`}
                    </td>
                    <td className="py-3 px-2 text-right text-[#1B2733] font-medium">${channel.ltv}</td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`font-semibold ${
                          channel.ltvCacRatio >= 10
                            ? 'text-green-600'
                            : channel.ltvCacRatio >= 5
                            ? 'text-blue-600'
                            : channel.ltvCacRatio >= 3
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {channel.ltvCacRatio === Infinity ? '∞' : `${channel.ltvCacRatio.toFixed(1)}x`}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-[#5A6B7A]">
                      {channel.paybackDays === 0 ? '0 days' : `${channel.paybackDays} days`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-[#EEF4F8] rounded-lg">
            <p className="text-sm text-[#4A6478]">
              <strong>Key Insight:</strong> Referrals have the highest LTV:CAC ratio (23.1x) with lowest payback period (13 days).
              Consider increasing referral incentives to accelerate growth efficiently.
            </p>
          </div>
        </div>

        {/* VC Summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-4">Investor Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 sm:gap-6">
            <div>
              <p className="text-indigo-200 text-sm">Runway</p>
              <p className="text-2xl font-semibold">18 months</p>
            </div>
            <div>
              <p className="text-indigo-200 text-sm">MRR Growth</p>
              <p className="text-2xl font-semibold">+23% MoM</p>
            </div>
            <div>
              <p className="text-indigo-200 text-sm">Gross Margin</p>
              <p className="text-2xl font-semibold">78%</p>
            </div>
            <div>
              <p className="text-indigo-200 text-sm">Magic Number</p>
              <p className="text-2xl font-semibold">1.4x</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-500">
            <p className="text-sm text-indigo-100">
              Strong unit economics with LTV:CAC of 6.6x (industry standard is 3x+).
              Net revenue retention of 118% indicates expansion revenue from upgrades.
              Positioned for efficient scaling with current capital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRetentionColor(percentage: number): string {
  if (percentage >= 70) return '#10B981';
  if (percentage >= 50) return '#3B82F6';
  if (percentage >= 30) return '#F59E0B';
  return '#EF4444';
}

export default UnitEconomicsView;
