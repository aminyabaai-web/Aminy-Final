import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, ArrowLeft, Calendar,
  Download, Users, Video, Briefcase, DollarSign, ChevronDown,
  AlertTriangle, CheckCircle, Activity, Shield, RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  type OperationalMetricsData,
  type KPICard,
  type DateRange,
  type TimeSeriesPoint,
  type OperationalAlert,
  type OverallHealthScore,
  buildRetentionKPIs,
  buildTelehealthKPIs,
  buildProviderLaunchKPIs,
  buildPayerEVVKPIs,
  normalizeSparkline,
  getDateRangePresets,
} from '../../lib/operational-metrics';

// ─── Props ───────────────────────────────────────────────────────────

interface OperationalDashboardProps {
  data: OperationalMetricsData;
  onDateRangeChange: (range: DateRange) => void;
  onExportPDF: () => void;
  onBack?: () => void;
  /** Whether the data is from live Supabase queries vs demo data */
  isLiveData?: boolean;
  /** ISO timestamp of last data fetch */
  lastUpdatedAt?: string;
  /** Callback to re-fetch all 4 metric groups */
  onRefresh?: () => void;
  /** Whether a refresh is in progress */
  isRefreshing?: boolean;
}

// ─── Sparkline SVG ───────────────────────────────────────────────────

function Sparkline({ points, color = '#2A7D99' }: { points: TimeSeriesPoint[]; color?: string }) {
  const normalized = normalizeSparkline(points);
  if (normalized.length < 2) return null;

  const width = 80;
  const height = 24;
  const padding = 2;

  const pathData = normalized.map((v, i) => {
    const x = padding + (i / (normalized.length - 1)) * (width - padding * 2);
    const y = height - padding - v * (height - padding * 2);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={pathData} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────

function MiniBarChart({ items, colorClass }: { items: Array<{ label: string; value: number; unit?: string }>; colorClass: string }) {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-0.5">
            <span className="text-[#5A6B7A]">{item.label}</span>
            <span className="text-[#1B2733] font-medium">{item.value}{item.unit || '%'}</span>
          </div>
          <div className="h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${(item.value / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card Component ─────────────────────────────────────────────

function KPICardView({ kpi, sparkData }: { kpi: KPICard; sparkData?: TimeSeriesPoint[] }) {
  const statusColors = {
    good: 'border-green-200 bg-green-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
    critical: 'border-red-200 bg-red-50/50',
    neutral: 'border-[#E8E4DF] bg-white',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    flat: 'text-[#5A6B7A]',
  };

  // For metrics where "up" is bad (like churn, denial rate, wait time)
  const isInverseMetric = ['Churn Rate', 'Denial Rate', 'Avg Wait Time', 'Days to Launch', 'Days to Payment', 'No-Show Rate'].includes(kpi.label);
  const trendColorKey = isInverseMetric
    ? (kpi.trend === 'up' ? 'down' : kpi.trend === 'down' ? 'up' : 'flat')
    : kpi.trend;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${statusColors[kpi.status]}`}
    >
      <p className="text-sm font-medium text-[#5A6B7A] truncate">{kpi.label}</p>
      <div className="mt-1 flex items-end justify-between">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold text-[#1B2733]">
            {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
          </span>
          {kpi.unit && <span className="text-sm text-[#5A6B7A]">{kpi.unit}</span>}
        </div>
        <div className={`flex items-center gap-0.5 text-sm font-medium ${trendColors[trendColorKey]}`}>
          {kpi.trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
          {kpi.trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
          {kpi.trend === 'flat' && <Minus className="h-3.5 w-3.5" />}
          {kpi.trendValue !== undefined && (
            <span>{kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%</span>
          )}
        </div>
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className="mt-2">
          <Sparkline
            points={sparkData}
            color={kpi.status === 'good' ? '#22c55e' : kpi.status === 'warning' ? '#f59e0b' : kpi.status === 'critical' ? '#ef4444' : '#2A7D99'}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      {icon}
      <h2 className="text-sm font-bold text-[#1B2733] uppercase tracking-wide">{title}</h2>
    </div>
  );
}

// ─── Overall Health Score Banner ─────────────────────────────────────

function HealthScoreBanner({ health }: { health: OverallHealthScore }) {
  const statusConfig = {
    healthy: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="h-5 w-5 text-amber-600" /> },
    critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <AlertTriangle className="h-5 w-5 text-red-600" /> },
  };

  const trendLabels = { improving: 'Improving', stable: 'Stable', declining: 'Declining' };
  const trendColors = { improving: 'text-green-600', stable: 'text-[#5A6B7A]', declining: 'text-red-600' };

  const config = statusConfig[health.status];
  const categories = [
    { label: 'Retention', score: health.componentScores.retention, weight: '30%' },
    { label: 'Liquidity', score: health.componentScores.liquidity, weight: '25%' },
    { label: 'Launch', score: health.componentScores.launch, weight: '20%' },
    { label: 'Payer/EVV', score: health.componentScores.payer, weight: '25%' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${config.bg}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {config.icon}
          <div>
            <h3 className="text-sm font-bold text-[#1B2733]">Platform Health</h3>
            <p className={`text-sm font-medium ${trendColors[health.trend]}`}>{trendLabels[health.trend]}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${config.text}`}>{health.composite}</span>
          <span className="text-sm text-[#5A6B7A]">/100</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {categories.map(cat => (
          <div key={cat.label} className="text-center">
            <div className="h-1.5 rounded-full bg-[#E8E4DF] overflow-hidden mb-1">
              <div
                className={`h-full rounded-full ${cat.score >= 80 ? 'bg-green-500' : cat.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${cat.score}%` }}
              />
            </div>
            <p className="text-sm text-[#5A6B7A]">{cat.label}</p>
            <p className="text-sm font-bold text-[#1B2733]">{cat.score}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Alerts Panel ────────────────────────────────────────────────────

function AlertsPanel({ alerts }: { alerts: OperationalAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50/50 p-3 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800 font-medium">All metrics within healthy thresholds</p>
      </div>
    );
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <p className="text-xs font-bold text-[#3A4A57] uppercase tracking-wide">Alerts ({alerts.length})</p>
      </div>
      {sorted.map(alert => (
        <div
          key={alert.id}
          className={`rounded-lg border p-2.5 text-sm ${
            alert.severity === 'critical'
              ? 'border-red-200 bg-red-50/60 text-red-800'
              : alert.severity === 'warning'
              ? 'border-amber-200 bg-amber-50/60 text-amber-800'
              : 'border-[#C8DDE8] bg-[#EEF4F8]/60 text-[#4A6478]'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="font-medium capitalize flex-shrink-0">{alert.category}</span>
            <span className="text-[#5A6B7A]">{alert.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────

export default function OperationalDashboard({
  data,
  onDateRangeChange,
  onExportPDF,
  onBack,
  isLiveData = false,
  lastUpdatedAt,
  onRefresh,
  isRefreshing = false,
}: OperationalDashboardProps) {
  const presets = useMemo(() => getDateRangePresets(), []);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const retentionKPIs = useMemo(() => buildRetentionKPIs(data.familyRetention), [data.familyRetention]);
  const telehealthKPIs = useMemo(() => buildTelehealthKPIs(data.telehealthLiquidity), [data.telehealthLiquidity]);
  const providerKPIs = useMemo(() => buildProviderLaunchKPIs(data.providerLaunch), [data.providerLaunch]);
  const payerKPIs = useMemo(() => buildPayerEVVKPIs(data.payerEVV), [data.payerEVV]);

  const handleExport = useCallback(() => {
    onExportPDF();
  }, [onExportPDF]);

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#E8E4DF] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-1 hover:bg-[#F0EDE8]">
              <ArrowLeft className="h-5 w-5 text-[#5A6B7A]" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#1B2733]">Operational Metrics</h1>
              {/* Live vs Demo badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isLiveData ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isLiveData ? 'bg-green-500' : 'bg-amber-500'}`} />
                {isLiveData ? 'Live' : 'Demo'}
              </span>
            </div>
            <p className="text-sm text-[#5A6B7A]">{data.dateRange.label}</p>
            {lastUpdatedAt && (
              <p className="text-sm text-[#8A9BA8] mt-0.5">
                Last updated: {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center justify-center rounded-full p-2 hover:bg-[#F0EDE8] disabled:opacity-50"
                aria-label="Refresh metrics"
                title="Refresh metrics"
              >
                <RefreshCw className={`h-4 w-4 text-[#5A6B7A] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E4DF] px-3 py-2 text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mt-3 relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex w-full items-center justify-between rounded-lg border border-[#E8E4DF] bg-white px-3 py-2 text-sm text-[#3A4A57]"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#8A9BA8]" />
              <span>{data.dateRange.label}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-[#8A9BA8] transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
          </button>

          {showDatePicker && (
            <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-[#E8E4DF] bg-white p-2 shadow-lg z-20">
              {presets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => { onDateRangeChange(preset); setShowDatePicker(false); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#FAF7F2] ${
                    data.dateRange.label === preset.label ? 'bg-[#6B9080]/10 text-[#6B9080] font-medium' : 'text-[#3A4A57]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Overall Health Score */}
        <HealthScoreBanner health={data.overallHealth} />

        {/* Alerts */}
        <AlertsPanel alerts={data.alerts} />

        {/* ─── Family Retention ─────────────────────────────────── */}
        <SectionHeader
          icon={<Users className="h-4 w-4 text-[#6B9080]" />}
          title="Family Retention"
        />
        <div className="grid grid-cols-2 gap-3">
          {retentionKPIs.map((kpi, i) => (
            <KPICardView
              key={kpi.label}
              kpi={kpi}
              sparkData={i === 0 ? data.familyRetention.monthlyRetention : undefined}
            />
          ))}
        </div>

        {/* Retention by Period */}
        <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
          <p className="text-sm font-semibold text-[#3A4A57] mb-2">Retention by Period</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: '30-Day', value: data.familyRetention.retention30Day },
              { label: '60-Day', value: data.familyRetention.retention60Day },
              { label: '90-Day', value: data.familyRetention.retention90Day },
            ].map(p => (
              <div key={p.label} className="rounded-lg bg-[#FAF7F2] p-2">
                <p className="text-lg font-bold text-[#1B2733]">{p.value}%</p>
                <p className="text-sm text-[#5A6B7A]">{p.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Retention by Tier */}
        <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
          <p className="text-sm font-semibold text-[#3A4A57] mb-2">Retention by Tier</p>
          <MiniBarChart
            colorClass="bg-teal-400"
            items={[
              { label: 'Pro', value: data.familyRetention.retentionByTier.pro },
              { label: 'Core', value: data.familyRetention.retentionByTier.core },
              { label: 'Starter', value: data.familyRetention.retentionByTier.starter },
            ]}
          />
        </div>

        {/* Churn Reasons */}
        {data.familyRetention.churnReasons.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
            <p className="text-sm font-semibold text-[#3A4A57] mb-2">Churn Reasons</p>
            <div className="space-y-1.5">
              {data.familyRetention.churnReasons.map(r => (
                <div key={r.reason} className="flex items-center justify-between text-sm">
                  <span className="text-[#3A4A57] flex-1 truncate">{r.reason}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-16 h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${r.percentage}%` }} />
                    </div>
                    <span className="text-[#5A6B7A] w-8 text-right">{r.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cohort Preview */}
        {data.familyRetention.cohortAnalysis.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3 overflow-x-auto">
            <p className="text-sm font-semibold text-[#3A4A57] mb-2">Cohort Retention</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#5A6B7A]">
                  <th className="text-left py-1 pr-2">Cohort</th>
                  <th className="text-right px-1">M1</th>
                  <th className="text-right px-1">M2</th>
                  <th className="text-right px-1">M3</th>
                  <th className="text-right px-1">M6</th>
                </tr>
              </thead>
              <tbody>
                {data.familyRetention.cohortAnalysis.slice(0, 4).map(c => (
                  <tr key={c.cohortMonth} className="border-t border-[#E8E4DF]">
                    <td className="py-1 pr-2 font-medium text-[#3A4A57]">{c.cohortMonth}</td>
                    {[0, 1, 2, 5].map(idx => (
                      <td key={idx} className="text-right px-1">
                        {c.retentionRateByMonth[idx] !== undefined ? (
                          <span className={
                            c.retentionRateByMonth[idx] >= 80 ? 'text-green-700' :
                            c.retentionRateByMonth[idx] >= 60 ? 'text-amber-700' : 'text-red-700'
                          }>
                            {c.retentionRateByMonth[idx]}%
                          </span>
                        ) : '\u2014'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Telehealth Liquidity ────────────────────────────── */}
        <SectionHeader
          icon={<Video className="h-4 w-4 text-blue-600" />}
          title="Telehealth Liquidity"
        />
        <div className="grid grid-cols-2 gap-3">
          {telehealthKPIs.map((kpi, i) => (
            <KPICardView
              key={kpi.label}
              kpi={kpi}
              sparkData={i === 1 ? data.telehealthLiquidity.weeklyTrend : undefined}
            />
          ))}
        </div>

        {/* Hours Summary */}
        <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
          <p className="text-sm font-semibold text-[#3A4A57] mb-2">Weekly Hours</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-[#EEF4F8] p-2">
              <p className="text-lg font-bold text-blue-900">{data.telehealthLiquidity.availableHoursThisWeek}</p>
              <p className="text-sm text-blue-600">Available</p>
            </div>
            <div className="rounded-lg bg-[#EEF4F8] p-2">
              <p className="text-lg font-bold text-blue-900">{data.telehealthLiquidity.bookedHoursThisWeek}</p>
              <p className="text-sm text-blue-600">Booked</p>
            </div>
            <div className="rounded-lg bg-[#EEF4F8] p-2">
              <p className="text-lg font-bold text-blue-900">{data.telehealthLiquidity.averageWaitTimeDays}d</p>
              <p className="text-sm text-blue-600">Avg Wait</p>
            </div>
          </div>
        </div>

        {/* Fill Rate by Service Type */}
        <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
          <p className="text-sm font-semibold text-[#3A4A57] mb-2">Fill Rate by Service</p>
          <MiniBarChart
            colorClass="bg-blue-400"
            items={[
              { label: 'ABA', value: data.telehealthLiquidity.byServiceType.aba },
              { label: 'Mental Health', value: data.telehealthLiquidity.byServiceType.mentalHealth },
              { label: 'Speech', value: data.telehealthLiquidity.byServiceType.speech },
            ]}
          />
          <p className="text-sm text-[#8A9BA8] mt-2">Peak hours: {data.telehealthLiquidity.peakHoursDescription}</p>
        </div>

        {/* ─── Provider Launch ─────────────────────────────────── */}
        <SectionHeader
          icon={<Briefcase className="h-4 w-4 text-purple-600" />}
          title="Provider Launch"
        />
        <div className="grid grid-cols-2 gap-3">
          {providerKPIs.map((kpi, i) => (
            <KPICardView
              key={kpi.label}
              kpi={kpi}
              sparkData={i === 0 ? data.providerLaunch.monthlyLaunches : undefined}
            />
          ))}
        </div>

        {/* Provider Summary Stats */}
        <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
          <p className="text-sm font-semibold text-[#3A4A57] mb-2">Provider Breakdown</p>
          <div className="grid grid-cols-3 gap-3 text-center mb-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <p className="text-lg font-bold text-purple-900">{data.providerLaunch.byType.bcba}</p>
              <p className="text-sm text-purple-600">BCBAs</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-2">
              <p className="text-lg font-bold text-purple-900">{data.providerLaunch.byType.lcsw}</p>
              <p className="text-sm text-purple-600">LCSWs</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-2">
              <p className="text-lg font-bold text-purple-900">{data.providerLaunch.byType.slp}</p>
              <p className="text-sm text-purple-600">SLPs</p>
            </div>
          </div>
          <div className="text-sm text-[#5A6B7A] space-y-1">
            <div className="flex justify-between">
              <span>Avg days to 1st session</span>
              <span className="font-medium text-[#1B2733]">{data.providerLaunch.averageDaysToFirstSession} days</span>
            </div>
            <div className="flex justify-between">
              <span>Avg days to 10th session</span>
              <span className="font-medium text-[#1B2733]">{data.providerLaunch.averageDaysTo10thSession} days</span>
            </div>
            <div className="flex justify-between">
              <span>Top complaint</span>
              <span className="font-medium text-amber-700">{data.providerLaunch.topComplaint}</span>
            </div>
          </div>
        </div>

        {/* Provider Funnel */}
        {data.providerLaunch.funnel.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
            <p className="text-sm font-semibold text-[#3A4A57] mb-2">Onboarding Funnel</p>
            <div className="space-y-2">
              {data.providerLaunch.funnel.map((stage, i) => {
                const widthPct = data.providerLaunch.funnel[0].count > 0
                  ? Math.max(10, (stage.count / data.providerLaunch.funnel[0].count) * 100)
                  : 100;

                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="text-[#3A4A57]">{stage.stage}</span>
                      <span className="text-[#5A6B7A]">{stage.count} ({stage.conversionRate}%)</span>
                    </div>
                    <div className="h-4 rounded-full bg-[#F0EDE8] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="h-full rounded-full bg-purple-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Payer / EVV ─────────────────────────────────────── */}
        <SectionHeader
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          title="Payer & EVV"
        />
        <div className="grid grid-cols-2 gap-3">
          {payerKPIs.map((kpi, i) => (
            <KPICardView
              key={kpi.label}
              kpi={kpi}
              sparkData={i === 0 ? data.payerEVV.monthlyTrend : undefined}
            />
          ))}
        </div>

        {/* EVV / Compliance Stats */}
        <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
          <p className="text-sm font-semibold text-[#3A4A57] mb-2">Compliance Snapshot</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-lg font-bold text-green-900">{data.payerEVV.evvMatchRate}%</p>
              <p className="text-sm text-green-600">EVV Match</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-lg font-bold text-green-900">{data.payerEVV.cleanCycles}</p>
              <p className="text-sm text-green-600">Clean Cycles</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-lg font-bold text-green-900">${(data.payerEVV.totalDollarsCollected / 1000).toFixed(0)}k</p>
              <p className="text-sm text-green-600">Collected</p>
            </div>
          </div>
        </div>

        {/* Top Denial Reasons */}
        {data.payerEVV.topDenialReasons.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3">
            <p className="text-sm font-semibold text-[#3A4A57] mb-2">Top Denial Reasons</p>
            <div className="space-y-1.5">
              {data.payerEVV.topDenialReasons.slice(0, 5).map(reason => (
                <div key={reason.reason} className="flex items-center justify-between text-sm">
                  <span className="text-[#3A4A57] truncate flex-1">{reason.reason}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-20 h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${reason.percentage}%` }}
                      />
                    </div>
                    <span className="text-[#5A6B7A] w-8 text-right">{reason.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payer Breakdown */}
        {data.payerEVV.payerBreakdown.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#E8E4DF] bg-white p-3 overflow-x-auto">
            <p className="text-sm font-semibold text-[#3A4A57] mb-2">Payer Breakdown</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#5A6B7A] border-b border-[#E8E4DF]">
                  <th className="text-left py-1">Payer</th>
                  <th className="text-right py-1">Claims</th>
                  <th className="text-right py-1">Clean %</th>
                  <th className="text-right py-1">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {data.payerEVV.payerBreakdown.map(p => (
                  <tr key={p.payer} className="border-t border-gray-50">
                    <td className="py-1 font-medium text-[#3A4A57]">{p.payer}</td>
                    <td className="py-1 text-right text-[#5A6B7A]">{p.claimCount}</td>
                    <td className={`py-1 text-right font-medium ${
                      p.cleanRate >= 95 ? 'text-green-700' : p.cleanRate >= 85 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {p.cleanRate}%
                    </td>
                    <td className="py-1 text-right text-[#5A6B7A]">{p.avgDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
