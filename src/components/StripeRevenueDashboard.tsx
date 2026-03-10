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
} from 'lucide-react';
import {
  revenue,
  type MRRMetrics,
  type CustomerMetrics,
  type RevenueEvent,
} from '../lib/stripe-revenue';
import { tierDisplayNames, type TierType } from '../lib/tier-utils';
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
  subscription_updated: { label: 'Updated', color: 'text-blue-600 bg-blue-50' },
  subscription_canceled: { label: 'Canceled', color: 'text-red-600 bg-red-50' },
  payment_succeeded: { label: 'Payment', color: 'text-green-600 bg-green-50' },
  payment_failed: { label: 'Failed', color: 'text-red-600 bg-red-50' },
  refund: { label: 'Refund', color: 'text-amber-600 bg-amber-50' },
  churn: { label: 'Churn', color: 'text-red-600 bg-red-50' },
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-200',
  starter: 'bg-teal-400',
  core: 'bg-teal-500',
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
      <h2 className="text-lg font-semibold text-gray-900">Access Restricted</h2>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        The Revenue Dashboard is only available to admin users. Contact your
        organization administrator if you need access.
      </p>
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
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
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          <p className="text-sm text-gray-500">Verifying access...</p>
        </div>
      }
    >
      <StripeRevenueDashboardInner onBack={onBack} />
    </RoleGate>
  );
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
  const [_timeRange, setTimeRange] = useState<TimeRange>('30d');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const report = await revenue.getReport();
      setMRR(report.mrr);
      setCustomers(report.customers);
      setByPlan(report.byPlan);
      setRecentEvents(report.recentEvents);
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
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm text-gray-500">Loading revenue data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={handleRefresh} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
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
          <h2 className="text-lg font-bold text-gray-900">Revenue Dashboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time Stripe metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:text-gray-300"
            aria-label="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {onBack && (
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              _timeRange === range
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {range === 'all' ? 'All Time' : range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3">
        {/* MRR */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <DollarSign size={12} />
            <span>MRR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(mrr?.currentMRR || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {(mrr?.mrrGrowthPercent || 0) > 0 ? (
              <ArrowUpRight size={12} className="text-green-500" />
            ) : (mrr?.mrrGrowthPercent || 0) < 0 ? (
              <ArrowDownRight size={12} className="text-red-500" />
            ) : (
              <Minus size={12} className="text-gray-400" />
            )}
            <span className={`text-xs font-medium ${
              (mrr?.mrrGrowthPercent || 0) > 0 ? 'text-green-600' :
              (mrr?.mrrGrowthPercent || 0) < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {formatPercent(mrr?.mrrGrowthPercent || 0)} MoM
            </span>
          </div>
        </div>

        {/* ARR */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <TrendingUp size={12} />
            <span>ARR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(arr)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Run rate from current MRR
          </p>
        </div>

        {/* Active customers */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Users size={12} />
            <span>Paying Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {customers?.payingCustomers || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {customers?.trialingCustomers || 0} trialing
          </p>
        </div>

        {/* Churn Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <UserMinus size={12} />
            <span>Monthly Churn</span>
          </div>
          <p className={`text-2xl font-bold ${
            (customers?.churnRate || 0) > 5 ? 'text-red-600' :
            (customers?.churnRate || 0) > 3 ? 'text-amber-600' : 'text-gray-900'
          }`}>
            {(customers?.churnRate || 0).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {customers?.churnedCustomers || 0} total churned
          </p>
        </div>
      </div>

      {/* MRR Breakdown */}
      {mrr && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 size={14} />
            MRR Breakdown
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <UserPlus size={12} className="text-green-500" />
                New MRR
              </span>
              <span className="font-medium text-green-600">{formatCurrencyDetailed(mrr.newMRR)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <TrendingUp size={12} className="text-blue-500" />
                Expansion
              </span>
              <span className="font-medium text-blue-600">{formatCurrencyDetailed(mrr.expansionMRR)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <TrendingDown size={12} className="text-amber-500" />
                Contraction
              </span>
              <span className="font-medium text-amber-600">-{formatCurrencyDetailed(mrr.contractionMRR)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <UserMinus size={12} className="text-red-500" />
                Churned
              </span>
              <span className="font-medium text-red-600">-{formatCurrencyDetailed(mrr.churnedMRR)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-900">Net New MRR</span>
              <span className={`font-bold ${mrr.netNewMRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {mrr.netNewMRR >= 0 ? '+' : ''}{formatCurrencyDetailed(mrr.netNewMRR)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unit Economics */}
      {customers && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Unit Economics</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(customers.ltv)}</p>
              <p className="text-xs text-gray-500">LTV</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(customers.averageRevenue)}</p>
              <p className="text-xs text-gray-500">ARPU</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{customers.conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Free → Paid</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan distribution */}
      {Object.keys(byPlan).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Revenue by Plan</h3>

          {/* Distribution bar */}
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
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
                <div key={plan} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${PLAN_COLORS[plan] || 'bg-gray-400'}`} />
                    <span className="text-gray-700 font-medium">
                      {tierDisplayNames[plan as TierType] || plan}
                    </span>
                    <span className="text-gray-400">
                      {data.count} {data.count === 1 ? 'sub' : 'subs'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{data.percentage.toFixed(0)}%</span>
                    <span className="font-medium text-gray-900 w-16 text-right">
                      {formatCurrency(data.mrr)}/mo
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {totalPlanSubscribers === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              No active subscriptions yet. Create Stripe products to start.
            </p>
          )}
        </div>
      )}

      {/* Recent events */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock size={14} />
          Recent Events
        </h3>
        {recentEvents.length > 0 ? (
          <div className="space-y-2">
            {recentEvents.slice(0, 10).map((event) => {
              const meta = EVENT_TYPE_LABELS[event.type] || { label: event.type, color: 'text-gray-600 bg-gray-50' };
              return (
                <div key={event.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-gray-500 truncate max-w-[140px]">
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
                    <span className="text-gray-400 w-24 text-right">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">
            No revenue events recorded yet. Events will appear after Stripe products are configured.
          </p>
        )}
      </div>

      {/* Stripe setup status */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800">Stripe Setup Required</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Create 4 Stripe products (Core, Pro, Family Plan — monthly + yearly) and add price IDs
              to your .env file. Revenue tracking will populate automatically from webhook events.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 text-center">
        Data sourced from Stripe via webhook events. Metrics update in real-time.
      </p>
    </div>
  );
}

export default StripeRevenueDashboard;
