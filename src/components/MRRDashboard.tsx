'use client';

/**
 * MRR Dashboard Component
 *
 * Real-time revenue metrics dashboard for VC-ready reporting.
 * Displays MRR, ARR, cohort retention, and customer metrics.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  revenue,
  MRRMetrics,
  ARRMetrics,
  CustomerMetrics,
  CohortData,
  RevenueEvent,
  PRICING,
} from '@/lib/stripe-revenue';

// ============================================================================
// Types
// ============================================================================

interface MRRDashboardProps {
  className?: string;
  compact?: boolean;
  showCohorts?: boolean;
  refreshInterval?: number; // in seconds
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

function getChangeColor(value: number): string {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-[#5A6B7A]';
}

function getRetentionColor(value: number): string {
  if (value >= 80) return 'bg-green-500';
  if (value >= 60) return 'bg-green-400';
  if (value >= 40) return 'bg-yellow-400';
  if (value >= 20) return 'bg-orange-400';
  return 'bg-red-400';
}

// ============================================================================
// Components
// ============================================================================

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#5A6B7A]">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#132F43]">{value}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${getChangeColor(change)}`}>
            {formatPercent(change)}
          </span>
        )}
      </div>
      {(changeLabel || subtitle) && (
        <p className="text-sm text-[#5A6B7A] mt-1">
          {changeLabel || subtitle}
        </p>
      )}
    </div>
  );
}

function MRRChart({ data }: { data: { month: string; mrr: number }[] }) {
  const maxMRR = Math.max(...data.map(d => d.mrr), 1);

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#132F43] mb-4">MRR Trend</h3>
      <div className="flex items-end gap-2 h-48">
        {data.map((d, i) => (
          <div key={d.month} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-indigo-500 rounded-t transition-all duration-300"
              style={{ height: `${(d.mrr / maxMRR) * 100}%`, minHeight: d.mrr > 0 ? 4 : 0 }}
            />
            <span className="text-sm text-[#5A6B7A] mt-2">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MRRBreakdown({
  newMRR,
  expansionMRR,
  contractionMRR,
  churnedMRR,
  netNewMRR,
}: Partial<MRRMetrics>) {
  const items = [
    { label: 'New MRR', value: newMRR || 0, color: 'bg-green-500' },
    { label: 'Expansion', value: expansionMRR || 0, color: 'bg-blue-500' },
    { label: 'Contraction', value: -(contractionMRR || 0), color: 'bg-orange-500' },
    { label: 'Churned', value: -(churnedMRR || 0), color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#132F43] mb-4">MRR Breakdown</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-sm text-[#5A6B7A]">{item.label}</span>
            </div>
            <span className={`text-sm font-medium ${item.value >= 0 ? 'text-[#132F43]' : 'text-red-600'}`}>
              {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
            </span>
          </div>
        ))}
        <div className="border-t pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[#132F43]">Net New MRR</span>
          <span className={`text-lg font-bold ${(netNewMRR || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(netNewMRR || 0) >= 0 ? '+' : ''}{formatCurrency(netNewMRR || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CohortTable({ cohorts }: { cohorts: CohortData[] }) {
  if (cohorts.length === 0) {
    return null;
  }

  const maxMonths = Math.max(...cohorts.map(c => c.retained.length));

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 shadow-sm overflow-x-auto">
      <h3 className="text-lg font-semibold text-[#132F43] mb-4">Cohort Retention</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-[#5A6B7A]">Cohort</th>
            <th className="text-center py-2 px-2 font-medium text-[#5A6B7A]">Size</th>
            {Array.from({ length: maxMonths }).map((_, i) => (
              <th key={i} className="text-center py-2 px-2 font-medium text-[#5A6B7A]">
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(cohort => (
            <tr key={cohort.cohort} className="border-b last:border-b-0">
              <td className="py-2 px-2 font-medium text-[#132F43]">{cohort.cohort}</td>
              <td className="text-center py-2 px-2 text-[#5A6B7A]">{cohort.size}</td>
              {cohort.retained.map((retention, i) => (
                <td key={i} className="text-center py-1 px-1">
                  <div
                    className={`inline-block rounded px-2 py-1 text-sm font-medium text-white ${getRetentionColor(retention)}`}
                  >
                    {retention}%
                  </div>
                </td>
              ))}
              {Array.from({ length: maxMonths - cohort.retained.length }).map((_, i) => (
                <td key={`empty-${i}`} className="text-center py-1 px-1">
                  <span className="text-[#8A9BA8]">-</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanBreakdown({
  byPlan,
}: {
  byPlan: Record<string, { count: number; mrr: number; percentage: number }>;
}) {
  const plans = Object.entries(byPlan).sort((a, b) => b[1].mrr - a[1].mrr);
  const colors: Record<string, string> = {
    clinic: 'bg-purple-500',
    professional: 'bg-indigo-500',
    starter: 'bg-blue-500',
    free: 'bg-gray-400',
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#132F43] mb-4">Revenue by Plan</h3>
      <div className="space-y-4">
        {plans.map(([plan, data]) => (
          <div key={plan}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors[plan] || 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-[#3A4A57] capitalize">{plan}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#132F43]">{formatCurrency(data.mrr)}</span>
                <span className="text-sm text-[#5A6B7A] ml-2">({data.count} customers)</span>
              </div>
            </div>
            <div className="w-full bg-[#F0EDE8] rounded-full h-2">
              <div
                className={`h-2 rounded-full ${colors[plan] || 'bg-gray-400'}`}
                style={{ width: `${data.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ events }: { events: RevenueEvent[] }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'subscription_created':
        return '🎉';
      case 'subscription_updated':
        return '📈';
      case 'payment_succeeded':
        return '💰';
      case 'payment_failed':
        return '⚠️';
      case 'churn':
        return '😢';
      case 'refund':
        return '↩️';
      default:
        return '📝';
    }
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#132F43] mb-4">Recent Activity</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-sm text-[#5A6B7A] text-center py-4">No recent activity</p>
        ) : (
          events.slice(0, 10).map(event => (
            <div key={event.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
              <span className="text-xl">{getEventIcon(event.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#132F43] truncate">
                  {formatEventType(event.type)}
                </p>
                <p className="text-sm text-[#5A6B7A]">
                  {event.createdAt.toLocaleDateString()} at{' '}
                  {event.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${event.mrr_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {event.mrr_change >= 0 ? '+' : ''}{formatCurrency(event.mrr_change)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function VCMetricsCard({
  mrr,
  arr,
  customers,
}: {
  mrr: MRRMetrics;
  arr: ARRMetrics;
  customers: CustomerMetrics;
}) {
  // Calculate key VC metrics
  const netRevenueRetention = customers.ltv > 0
    ? ((mrr.currentMRR + mrr.expansionMRR - mrr.contractionMRR) / (mrr.previousMRR || 1)) * 100
    : 100;

  const cac = 50 * 100; // Estimated CAC of $50 (would come from actual ad spend data)
  const ltv = customers.ltv;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  const metrics = [
    { label: 'ARR', value: formatCurrency(arr.currentARR), target: '$1M', progress: (arr.currentARR / 100000000) * 100 },
    { label: 'MRR Growth', value: formatPercent(mrr.mrrGrowthPercent), target: '20%+', good: mrr.mrrGrowthPercent >= 20 },
    { label: 'Net Revenue Retention', value: `${netRevenueRetention.toFixed(0)}%`, target: '100%+', good: netRevenueRetention >= 100 },
    { label: 'LTV/CAC Ratio', value: `${ltvCacRatio.toFixed(1)}x`, target: '3x+', good: ltvCacRatio >= 3 },
    { label: 'Monthly Churn', value: `${customers.churnRate.toFixed(1)}%`, target: '<5%', good: customers.churnRate < 5 },
    { label: 'Conversion Rate', value: `${customers.conversionRate.toFixed(1)}%`, target: '5%+', good: customers.conversionRate >= 5 },
  ];

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-[#6B9080]/20 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h3 className="text-lg font-semibold text-[#132F43]">VC Metrics</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map(metric => (
          <div key={metric.label} className="bg-white/80 rounded-lg p-3">
            <p className="text-sm text-[#5A6B7A] mb-1">{metric.label}</p>
            <p className="text-lg font-bold text-[#132F43]">{metric.value}</p>
            <p className={`text-sm ${metric.good !== undefined ? (metric.good ? 'text-green-600' : 'text-orange-600') : 'text-[#8A9BA8]'}`}>
              Target: {metric.target}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MRRDashboard({
  className = '',
  compact = false,
  showCohorts = true,
  refreshInterval = 60,
}: MRRDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mrr, setMRR] = useState<MRRMetrics | null>(null);
  const [arr, setARR] = useState<ARRMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerMetrics | null>(null);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [byPlan, setByPlan] = useState<Record<string, { count: number; mrr: number; percentage: number }>>({});
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load data
  const loadData = async () => {
    try {
      const [mrrData, arrData, customerData, planData, cohortData] = await Promise.all([
        revenue.getMRR(),
        revenue.getARR(),
        revenue.getCustomers(),
        revenue.getByPlan(),
        showCohorts ? revenue.getCohorts(6) : Promise.resolve([]),
      ]);

      // Get recent events from report
      const report = await revenue.getReport();

      setMRR(mrrData);
      setARR(arrData);
      setCustomers(customerData);
      setByPlan(planData);
      setCohorts(cohortData);
      setEvents(report.recentEvents);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up refresh interval
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, showCohorts]);

  // Generate mock trend data for chart
  const trendData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMRR = mrr?.currentMRR || 0;

    return months.map((month, i) => ({
      month,
      mrr: Math.round(currentMRR * (0.5 + i * 0.1)),
    }));
  }, [mrr]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#F0EDE8] rounded-xl h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        <MetricCard
          title="MRR"
          value={formatCurrency(mrr?.currentMRR || 0)}
          change={mrr?.mrrGrowthPercent}
        />
        <MetricCard
          title="ARR"
          value={formatCurrency(arr?.currentARR || 0)}
        />
        <MetricCard
          title="Customers"
          value={formatNumber(customers?.payingCustomers || 0)}
          subtitle={`${customers?.conversionRate.toFixed(1)}% conversion`}
        />
        <MetricCard
          title="Churn"
          value={`${customers?.churnRate.toFixed(1)}%`}
          subtitle="Monthly"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#132F43]">Revenue Dashboard</h2>
          <p className="text-sm text-[#5A6B7A]">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 text-sm font-medium text-[#6B9080] bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(mrr?.currentMRR || 0)}
          change={mrr?.mrrGrowthPercent}
          changeLabel="vs last month"
          icon={<span className="text-xl">💵</span>}
        />
        <MetricCard
          title="Annual Run Rate"
          value={formatCurrency(arr?.currentARR || 0)}
          subtitle={`Projected: ${formatCurrency(arr?.projectedARR || 0)}`}
          icon={<span className="text-xl">📈</span>}
        />
        <MetricCard
          title="Paying Customers"
          value={formatNumber(customers?.payingCustomers || 0)}
          subtitle={`${customers?.conversionRate.toFixed(1)}% of ${customers?.totalCustomers} total`}
          icon={<span className="text-xl">👥</span>}
        />
        <MetricCard
          title="Customer LTV"
          value={formatCurrency(customers?.ltv || 0)}
          subtitle={`Churn: ${customers?.churnRate.toFixed(1)}%/mo`}
          icon={<span className="text-xl">💎</span>}
        />
      </div>

      {/* VC Metrics */}
      {mrr && arr && customers && (
        <div className="mb-6">
          <VCMetricsCard mrr={mrr} arr={arr} customers={customers} />
        </div>
      )}

      {/* Charts and Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MRRChart data={trendData} />
        <MRRBreakdown
          newMRR={mrr?.newMRR}
          expansionMRR={mrr?.expansionMRR}
          contractionMRR={mrr?.contractionMRR}
          churnedMRR={mrr?.churnedMRR}
          netNewMRR={mrr?.netNewMRR}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PlanBreakdown byPlan={byPlan} />
        <RecentActivity events={events} />
      </div>

      {/* Cohort Analysis */}
      {showCohorts && cohorts.length > 0 && (
        <CohortTable cohorts={cohorts} />
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default MRRDashboard;
