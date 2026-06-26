/**
 * Stripe Revenue Dashboard
 *
 * Displays real-time revenue metrics for VC-ready reporting.
 * Pulls from stripe-revenue.ts analytics functions which query
 * the subscriptions + revenue_events Supabase tables.
 *
 * Metrics: MRR, ARR, Customers, Churn, LTV, Plan Breakdown
 * Accessed from Settings → Revenue (admin-only)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserMinus,
  BarChart3,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  AlertTriangle,
  Shield,
  PieChart,
  Activity,
  Target,
} from 'lucide-react';
import {
  revenue,
  type MRRMetrics,
  type CustomerMetrics,
  type RevenueEvent,
} from '../lib/stripe-revenue';
import { supabase } from '../utils/supabase/client';
import { tierDisplayNames, tierPricing, type TierType } from '../lib/tier-utils';
import { RoleGate } from './RoleGate';

interface StripeRevenueDashboardProps {
  onBack?: () => void;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

// Format cents to dollars
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCurrencyDetailed(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  subscription_created: { label: 'New Sub', color: 'text-green-600 bg-green-50' },
  subscription_updated: { label: 'Updated', color: 'text-blue-600 bg-[#EEF4F8]' },
  subscription_canceled: { label: 'Canceled', color: 'text-red-600 bg-red-50' },
  payment_succeeded: { label: 'Payment', color: 'text-green-600 bg-green-50' },
  payment_failed: { label: 'Failed', color: 'text-red-600 bg-red-50' },
  refund: { label: 'Refund', color: 'text-amber-600 bg-amber-50' },
  churn: { label: 'Churn', color: 'text-red-600 bg-red-50' },
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-[#E8E4DF]',
  starter: 'bg-teal-400',
  core: 'bg-primary',
  pro: 'bg-blue-500',
  proplus: 'bg-purple-500',
};

/**
 * Admin-only access denied fallback
 */
function RevenueDashboardAccessDenied({ onBack }: { onBack?: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <Shield className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-[#132F43]">Access Restricted</h2>
      <p className="text-sm text-[#5A6B7A] text-center max-w-sm">
        The Revenue Dashboard is only available to admin users. Contact your
        organization administrator if you need access.
      </p>
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-[#6B9080] hover:text-[#6B9080] font-medium"
        >
          &larr; Go Back
        </button>
      )}
    </div>
  );
}

/**
 * Public export: wraps the dashboard in an admin-only RoleGate.
 * Non-admin users see an access-denied screen. Unauthorized attempts
 * are logged to the HIPAA audit trail via RoleGate.
 */
export function StripeRevenueDashboard({ onBack }: StripeRevenueDashboardProps) {
  return (
    <RoleGate
      allowedRoles={['admin']}
      resourceName="stripe-revenue-dashboard"
      fallback={<RevenueDashboardAccessDenied onBack={onBack} />}
      loadingFallback={
        <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-[#5A6B7A]">Verifying access...</p>
        </div>
      }
    >
      <StripeRevenueDashboardInner onBack={onBack} />
    </RoleGate>
  );
}

// Subscriber growth data for the last 12 months
interface MonthlyGrowth {
  month: string; // "Jan", "Feb", etc.
  count: number;
}

/**
 * Fetch subscriber growth data (last 12 months) from Supabase
 */
async function fetchSubscriberGrowth(): Promise<MonthlyGrowth[]> {
  const months: MonthlyGrowth[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = monthStart.toLocaleString('en-US', { month: 'short' });

    try {
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'trialing'])
        .lte('created_at', monthEnd.toISOString());

      months.push({ month: monthLabel, count: count || 0 });
    } catch {
      months.push({ month: monthLabel, count: 0 });
    }
  }

  return months;
}

/**
 * Inner dashboard component (only rendered for admin users)
 */
function StripeRevenueDashboardInner({ onBack }: StripeRevenueDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mrr, setMRR] = useState<MRRMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerMetrics | null>(null);
  const [byPlan, setByPlan] = useState<Record<string, { count: number; mrr: number; percentage: number }>>({});
  const [recentEvents, setRecentEvents] = useState<RevenueEvent[]>([]);
  const [subscriberGrowth, setSubscriberGrowth] = useState<MonthlyGrowth[]>([]);
  const [_timeRange, setTimeRange] = useState<TimeRange>('30d');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [report, growth] = await Promise.all([
        revenue.getReport(),
        fetchSubscriberGrowth(),
      ]);
      setMRR(report.mrr);
      setCustomers(report.customers);
      setByPlan(report.byPlan);
      setRecentEvents(report.recentEvents);
      setSubscriberGrowth(growth);
    } catch (err) {
      setError('Failed to load revenue data');
      console.error('Revenue dashboard error:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-[#5A6B7A]">Loading revenue data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={handleRefresh} className="text-sm text-[#6B9080] hover:text-[#6B9080] font-medium">
          Retry
        </button>
      </div>
    );
  }

  const arr = (mrr?.currentMRR || 0) * 12;
  const totalPlanSubscribers = Object.values(byPlan).reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#132F43]">Revenue Dashboard</h2>
          <p className="text-sm text-[#5A6B7A] mt-0.5">Real-time Stripe metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-[#8A9BA8] hover:text-[#5A6B7A] disabled:text-[#8A9BA8]"
            aria-label="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {onBack && (
            <button onClick={onBack} className="text-sm text-[#5A6B7A] hover:text-[#3A4A57]">
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex gap-1 bg-[#EDF4F7] rounded-lg p-1">
        {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              _timeRange === range
                ? 'bg-white text-[#132F43] shadow-sm'
                : 'text-[#5A6B7A] hover:text-[#3A4A57]'
            }`}
          >
            {range === 'all' ? 'All Time' : range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3">
        {/* MRR */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A] mb-1">
            <DollarSign size={12} />
            <span>MRR</span>
          </div>
          <p className="text-2xl font-bold text-[#132F43]">
            {formatCurrency(mrr?.currentMRR || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {(mrr?.mrrGrowthPercent || 0) > 0 ? (
              <ArrowUpRight size={12} className="text-green-500" />
            ) : (mrr?.mrrGrowthPercent || 0) < 0 ? (
              <ArrowDownRight size={12} className="text-red-500" />
            ) : (
              <Minus size={12} className="text-[#8A9BA8]" />
            )}
            <span className={`text-sm font-medium ${
              (mrr?.mrrGrowthPercent || 0) > 0 ? 'text-green-600' :
              (mrr?.mrrGrowthPercent || 0) < 0 ? 'text-red-600' : 'text-[#5A6B7A]'
            }`}>
              {formatPercent(mrr?.mrrGrowthPercent || 0)} MoM
            </span>
          </div>
        </div>

        {/* ARR */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A] mb-1">
            <TrendingUp size={12} />
            <span>ARR</span>
          </div>
          <p className="text-2xl font-bold text-[#132F43]">
            {formatCurrency(arr)}
          </p>
          <p className="text-sm text-[#5A6B7A] mt-1">
            Run rate from current MRR
          </p>
        </div>

        {/* Active customers */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A] mb-1">
            <Users size={12} />
            <span>Paying Customers</span>
          </div>
          <p className="text-2xl font-bold text-[#132F43]">
            {customers?.payingCustomers || 0}
          </p>
          <p className="text-sm text-[#5A6B7A] mt-1">
            {customers?.trialingCustomers || 0} trialing
          </p>
        </div>

        {/* Churn Rate */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A] mb-1">
            <UserMinus size={12} />
            <span>Monthly Churn</span>
          </div>
          <p className={`text-2xl font-bold ${
            (customers?.churnRate || 0) > 5 ? 'text-red-600' :
            (customers?.churnRate || 0) > 3 ? 'text-amber-600' : 'text-[#132F43]'
          }`}>
            {(customers?.churnRate || 0).toFixed(1)}%
          </p>
          <p className="text-sm text-[#5A6B7A] mt-1">
            {customers?.churnedCustomers || 0} total churned
          </p>
        </div>
      </div>

      {/* MRR Breakdown */}
      {mrr && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#3A4A57] flex items-center gap-2">
            <BarChart3 size={14} />
            MRR Breakdown
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#5A6B7A]">
                <UserPlus size={12} className="text-green-500" />
                New MRR
              </span>
              <span className="font-medium text-green-600">{formatCurrencyDetailed(mrr.newMRR)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#5A6B7A]">
                <TrendingUp size={12} className="text-blue-500" />
                Expansion
              </span>
              <span className="font-medium text-blue-600">{formatCurrencyDetailed(mrr.expansionMRR)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#5A6B7A]">
                <TrendingDown size={12} className="text-amber-500" />
                Contraction
              </span>
              <span className="font-medium text-amber-600">-{formatCurrencyDetailed(mrr.contractionMRR)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#5A6B7A]">
                <UserMinus size={12} className="text-red-500" />
                Churned
              </span>
              <span className="font-medium text-red-600">-{formatCurrencyDetailed(mrr.churnedMRR)}</span>
            </div>
            <div className="border-t border-[#E8E4DF] pt-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#132F43]">Net New MRR</span>
              <span className={`font-bold ${mrr.netNewMRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {mrr.netNewMRR >= 0 ? '+' : ''}{formatCurrencyDetailed(mrr.netNewMRR)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unit Economics — Enhanced LTV Detail */}
      {customers && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#3A4A57] flex items-center gap-2">
            <Target size={14} />
            Unit Economics
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-[#132F43]">{formatCurrency(customers.ltv)}</p>
              <p className="text-sm text-[#5A6B7A]">LTV</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#132F43]">{formatCurrency(customers.averageRevenue)}</p>
              <p className="text-sm text-[#5A6B7A]">ARPU</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#132F43]">{customers.conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-[#5A6B7A]">Free &rarr; Paid</p>
            </div>
          </div>

          {/* LTV Calculation Breakdown */}
          <div className="border-t border-[#E8E4DF] pt-3 space-y-1.5">
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider">LTV Breakdown</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5A6B7A]">Avg Revenue / User (monthly)</span>
              <span className="font-medium text-[#132F43]">
                {formatCurrencyDetailed(customers.averageRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5A6B7A]">Monthly Churn Rate</span>
              <span className="font-medium text-[#132F43]">
                {(customers.churnRate || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5A6B7A]">Est. Customer Lifetime</span>
              <span className="font-medium text-[#132F43]">
                {customers.churnRate > 0
                  ? `${(1 / (customers.churnRate / 100)).toFixed(1)} months`
                  : '∞'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-[#E8E4DF] pt-1.5">
              <span className="font-semibold text-[#3A4A57]">Estimated LTV</span>
              <span className="font-bold text-green-600">
                {customers.churnRate > 0
                  ? formatCurrency(Math.round(customers.averageRevenue / (customers.churnRate / 100)))
                  : formatCurrency(customers.ltv)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Churn Rate Visualization */}
      {customers && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#3A4A57] flex items-center gap-2">
            <Activity size={14} />
            Churn Analysis
          </h3>
          {/* Visual churn gauge */}
          <div className="relative h-4 rounded-full bg-[#EDF4F7] overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
                (customers.churnRate || 0) > 5
                  ? 'bg-red-500'
                  : (customers.churnRate || 0) > 3
                  ? 'bg-amber-400'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (customers.churnRate || 0) * 5)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-sm font-bold text-[#132F43]">
                {customers.activeCustomers || 0}
              </p>
              <p className="text-sm text-[#5A6B7A]">Active</p>
            </div>
            <div>
              <p className="text-sm font-bold text-red-600">
                {customers.churnedCustomers || 0}
              </p>
              <p className="text-sm text-[#5A6B7A]">Churned</p>
            </div>
            <div>
              <p className={`text-sm font-bold ${
                (customers.churnRate || 0) > 5 ? 'text-red-600' :
                (customers.churnRate || 0) > 3 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {(customers.churnRate || 0).toFixed(1)}%
              </p>
              <p className="text-sm text-[#5A6B7A]">Churn Rate</p>
            </div>
          </div>
          <p className="text-sm text-[#8A9BA8]">
            {(customers.churnRate || 0) <= 3
              ? 'Healthy churn rate. Below SaaS industry average.'
              : (customers.churnRate || 0) <= 5
              ? 'Moderate churn. Consider retention campaigns.'
              : 'High churn rate. Investigate cancellation reasons.'}
          </p>
        </div>
      )}

      {/* Subscriber Growth Chart (last 12 months) */}
      {subscriberGrowth.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#3A4A57] flex items-center gap-2">
            <UserPlus size={14} />
            Subscriber Growth (12 months)
          </h3>
          {(() => {
            const maxCount = Math.max(...subscriberGrowth.map(m => m.count), 1);
            return (
              <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                {subscriberGrowth.map((m, i) => {
                  const heightPct = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 gap-1">
                      <span className="text-[9px] font-medium text-[#5A6B7A]">{m.count}</span>
                      <div
                        className="w-full rounded-t bg-primary transition-all duration-500"
                        style={{
                          height: `${Math.max(heightPct, 2)}%`,
                          minHeight: 2,
                        }}
                        title={`${m.month}: ${m.count} subscribers`}
                      />
                      <span className="text-[9px] text-[#8A9BA8]">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {subscriberGrowth.length >= 2 && (() => {
            const latest = subscriberGrowth[subscriberGrowth.length - 1].count;
            const prev = subscriberGrowth[subscriberGrowth.length - 2].count;
            const delta = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
            return (
              <p className="text-sm text-[#5A6B7A]">
                Month-over-month: <span className={delta >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                </span>
              </p>
            );
          })()}
        </div>
      )}

      {/* Tier Distribution Pie Chart (CSS-based) */}
      {Object.keys(byPlan).length > 0 && totalPlanSubscribers > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#3A4A57] flex items-center gap-2">
            <PieChart size={14} />
            Tier Distribution
          </h3>
          {/* CSS conic-gradient pie chart */}
          <div className="flex items-center gap-6">
            <div
              className="w-28 h-28 rounded-full flex-shrink-0"
              style={{
                background: (() => {
                  const planEntries = Object.entries(byPlan).sort((a, b) => b[1].count - a[1].count);
                  const colorMap: Record<string, string> = {
                    free: '#d1d5db',
                    starter: '#2dd4bf',
                    core: '#2A7D99',
                    pro: '#3b82f6',
                    proplus: '#a855f7',
                  };
                  let cumPct = 0;
                  const segments = planEntries.map(([plan, data]) => {
                    const start = cumPct;
                    cumPct += data.percentage;
                    return `${colorMap[plan] || '#9ca3af'} ${start}% ${cumPct}%`;
                  });
                  return `conic-gradient(${segments.join(', ')})`;
                })(),
              }}
            />
            <div className="flex-1 space-y-1.5">
              {Object.entries(byPlan)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([plan, data]) => (
                  <div key={plan} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${PLAN_COLORS[plan] || 'bg-gray-400'}`} />
                      <span className="text-[#3A4A57]">{tierDisplayNames[plan as TierType] || plan}</span>
                    </div>
                    <span className="font-medium text-[#132F43]">
                      {data.count} ({data.percentage.toFixed(0)}%)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Plan distribution */}
      {Object.keys(byPlan).length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#3A4A57]">Revenue by Plan</h3>

          {/* Distribution bar */}
          <div className="h-3 rounded-full bg-[#EDF4F7] overflow-hidden flex">
            {Object.entries(byPlan).map(([plan, data]) => (
              <div
                key={plan}
                className={`${PLAN_COLORS[plan] || 'bg-gray-400'} transition-all duration-500`}
                style={{ width: `${data.percentage}%` }}
                title={`${tierDisplayNames[plan as TierType] || plan}: ${data.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Plan list */}
          <div className="space-y-2">
            {Object.entries(byPlan)
              .sort((a, b) => b[1].mrr - a[1].mrr)
              .map(([plan, data]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${PLAN_COLORS[plan] || 'bg-gray-400'}`} />
                    <span className="text-[#3A4A57] font-medium">
                      {tierDisplayNames[plan as TierType] || plan}
                    </span>
                    <span className="text-[#8A9BA8]">
                      {data.count} {data.count === 1 ? 'sub' : 'subs'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#5A6B7A]">{data.percentage.toFixed(0)}%</span>
                    <span className="font-medium text-[#132F43] w-16 text-right">
                      {formatCurrency(data.mrr)}/mo
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {totalPlanSubscribers === 0 && (
            <p className="text-sm text-[#8A9BA8] text-center py-2">
              No active subscriptions yet. Create Stripe products to start.
            </p>
          )}
        </div>
      )}

      {/* Recent events */}
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#3A4A57] flex items-center gap-2">
          <Clock size={14} />
          Recent Events
        </h3>
        {recentEvents.length > 0 ? (
          <div className="space-y-2">
            {recentEvents.slice(0, 10).map((event) => {
              const meta = EVENT_TYPE_LABELS[event.type] || { label: event.type, color: 'text-[#5A6B7A] bg-[#F6FBFB]' };
              return (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-[#5A6B7A] truncate max-w-[140px]">
                      {event.userId?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.mrr_change !== 0 && (
                      <span className={`font-medium ${
                        event.mrr_change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {event.mrr_change > 0 ? '+' : ''}{formatCurrencyDetailed(event.mrr_change)}
                      </span>
                    )}
                    <span className="text-[#8A9BA8] w-24 text-right">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#8A9BA8] text-center py-4">
            No revenue events recorded yet. Events will appear after Stripe products are configured.
          </p>
        )}
      </div>

      {/* Stripe setup status */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Stripe Setup Required</p>
            <p className="text-sm text-amber-600 mt-0.5">
              Create 4 Stripe products (Core, Pro, Family Plan — monthly + yearly) and add price IDs
              to your .env file. Revenue tracking will populate automatically from webhook events.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-sm text-[#8A9BA8] text-center">
        Data sourced from Stripe via webhook events. Metrics update in real-time.
      </p>
    </div>
  );
}

export default StripeRevenueDashboard;
