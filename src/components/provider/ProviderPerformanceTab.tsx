// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  DollarSign,
  Target,
  Users,
  Star,
  Shield,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface ProviderPerformanceTabProps {
  providerId: string;
}

type NetworkTier = 'green' | 'yellow' | 'red';

interface PerfMetric {
  id: string;
  label: string;
  value: number | null;
  target: number;
  unit: string;
  higherIsBetter: boolean;
  description: string;
  icon: React.ElementType;
}

interface AuthRecord {
  id: string;
  clientName: string;
  payer: string;
  cptCode: string;
  expiresAt: string;
  hoursApproved: number;
  hoursUsed: number;
}

interface DenialRecord {
  id: string;
  clientName: string;
  cptCode: string;
  payer: string;
  reason: string;
  dateOfService: string;
  amount: number;
}

type MetricStatus = 'green' | 'yellow' | 'red' | 'info';

function metricStatus(m: PerfMetric): MetricStatus {
  if (m.value === null) return 'info';
  const ratio = m.higherIsBetter ? m.value / m.target : m.target / (m.value || 0.001);
  if (ratio >= 1) return 'green';
  if (ratio >= 0.85) return 'yellow';
  return 'red';
}

function computeNetworkTier(metrics: PerfMetric[]): NetworkTier {
  const statuses = metrics.map(metricStatus);
  const reds = statuses.filter((s) => s === 'red').length;
  const yellows = statuses.filter((s) => s === 'yellow').length;
  if (reds >= 2) return 'red';
  if (reds >= 1 || yellows >= 3) return 'yellow';
  return 'green';
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatVal(m: PerfMetric): string {
  if (m.value === null) return '—';
  if (m.unit === '%') return `${m.value.toFixed(1)}%`;
  if (m.unit === 'pts') return `${Math.round(m.value)}`;
  if (m.unit === 'hrs') return `${m.value.toFixed(0)} h`;
  if (m.unit === '/5.0') return m.value.toFixed(1);
  return String(m.value);
}

function StatusChip({ status }: { status: MetricStatus }) {
  const map: Record<MetricStatus, string> = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    info: 'bg-[#F0EDE8] text-[#5A6B7A] dark:bg-slate-800 dark:text-slate-400',
  };
  const icons: Record<MetricStatus, React.ReactNode> = {
    green: <CheckCircle className="w-3.5 h-3.5" />,
    yellow: <AlertCircle className="w-3.5 h-3.5" />,
    red: <XCircle className="w-3.5 h-3.5" />,
    info: <Minus className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {icons[status]}
      {status === 'info' ? 'No data' : status === 'green' ? 'On target' : status === 'yellow' ? 'Watch' : 'Off target'}
    </span>
  );
}

const TIER_CONFIG: Record<NetworkTier, { label: string; bg: string; border: string; text: string; sub: string }> = {
  green: {
    label: 'Network Standing: Good',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    sub: 'All core metrics on target. You are in good standing on the Aminy network.',
  },
  yellow: {
    label: 'Network Standing: Needs Improvement',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    sub: 'One or more metrics are below target. Address flagged areas within 30 days to maintain network status.',
  },
  red: {
    label: 'Network Standing: At Risk',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-800 dark:text-red-200',
    sub: 'Multiple metrics are off target. Your network standing is at risk. Aminy may pause new referrals until metrics recover.',
  },
};

const INITIAL_METRICS: PerfMetric[] = [
  {
    id: 'billable-hours',
    label: 'Billable Hours / Month',
    value: null,
    target: 80,
    unit: 'hrs',
    higherIsBetter: true,
    description: 'Total billed clinical hours this calendar month.',
    icon: Clock,
  },
  {
    id: 'note-compliance',
    label: 'Note Compliance (≤24h)',
    value: null,
    target: 95,
    unit: '%',
    higherIsBetter: true,
    description: '% of session notes submitted within 24 hours of session end.',
    icon: FileText,
  },
  {
    id: 'goal-mastery',
    label: 'Goal Mastery Rate',
    value: null,
    target: 75,
    unit: '%',
    higherIsBetter: true,
    description: '% of active treatment goals mastered in the current assessment cycle.',
    icon: Target,
  },
  {
    id: 'attendance',
    label: 'Session Attendance Rate',
    value: null,
    target: 85,
    unit: '%',
    higherIsBetter: true,
    description: '% of scheduled telehealth sessions where client joined.',
    icon: Users,
  },
  {
    id: 'clean-claim',
    label: 'Clean Claim Rate',
    value: null,
    target: 95,
    unit: '%',
    higherIsBetter: true,
    description: '% of submitted claims accepted first-pass with no corrections.',
    icon: DollarSign,
  },
  {
    id: 'denial-rate',
    label: 'Denial Rate',
    value: null,
    target: 5,
    unit: '%',
    higherIsBetter: false,
    description: '% of claims denied by payer. Target: <5%.',
    icon: AlertTriangle,
  },
  {
    id: 'family-nps',
    label: 'Family Satisfaction (NPS)',
    value: null,
    target: 50,
    unit: 'pts',
    higherIsBetter: true,
    description: 'Net Promoter Score from 90-day rolling caregiver surveys.',
    icon: Star,
  },
  {
    id: 'supervisory',
    label: 'Supervisory Compliance',
    value: null,
    target: 100,
    unit: '%',
    higherIsBetter: true,
    description: 'Required BCBA supervision contacts completed on schedule.',
    icon: Shield,
  },
];

export function ProviderPerformanceTab({ providerId }: ProviderPerformanceTabProps) {
  const [metrics, setMetrics] = useState<PerfMetric[]>(INITIAL_METRICS);
  const [auths, setAuths] = useState<AuthRecord[]>([]);
  const [denials, setDenials] = useState<DenialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('provider_performance_snapshots')
          .select('*')
          .eq('provider_id', providerId)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();

        if (data?.metrics) {
          setMetrics((prev) =>
            prev.map((m) => {
              const val = data.metrics[m.id];
              return val !== undefined ? { ...m, value: val } : m;
            }),
          );
        }

        const { data: authData } = await supabase
          .from('authorizations')
          .select('id, client_name, payer, cpt_code, expires_at, hours_approved, hours_used')
          .eq('provider_id', providerId)
          .gte('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })
          .limit(10);

        if (authData) {
          setAuths(
            authData.map((a) => ({
              id: a.id,
              clientName: a.client_name,
              payer: a.payer,
              cptCode: a.cpt_code,
              expiresAt: a.expires_at,
              hoursApproved: a.hours_approved,
              hoursUsed: a.hours_used,
            })),
          );
        }

        const { data: denialData } = await supabase
          .from('claim_denials')
          .select('id, client_name, cpt_code, payer, denial_reason, date_of_service, billed_amount')
          .eq('provider_id', providerId)
          .eq('status', 'open')
          .order('date_of_service', { ascending: false })
          .limit(8);

        if (denialData) {
          setDenials(
            denialData.map((d) => ({
              id: d.id,
              clientName: d.client_name,
              cptCode: d.cpt_code,
              payer: d.payer,
              reason: d.denial_reason,
              dateOfService: d.date_of_service,
              amount: d.billed_amount,
            })),
          );
        }
      } catch {
        // Supabase tables may not exist yet — fall back to empty state gracefully
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [providerId]);

  const tier = computeNetworkTier(metrics);
  const tierConfig = TIER_CONFIG[tier];
  const expiringAuths = auths.filter((a) => daysUntil(a.expiresAt) <= 30);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#6B9080] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">My Performance</h2>
        <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
          Your network scorecard. Aminy uses these metrics to evaluate provider quality and referral eligibility.
        </p>
      </div>

      {/* Network Standing Banner */}
      <div className={`rounded-2xl border ${tierConfig.bg} ${tierConfig.border} p-4`}>
        <div className="flex items-center gap-3">
          {tier === 'green' && <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
          {tier === 'yellow' && <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />}
          {tier === 'red' && <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
          <div>
            <p className={`font-semibold ${tierConfig.text}`}>{tierConfig.label}</p>
            <p className={`text-sm mt-0.5 ${tierConfig.text} opacity-80`}>{tierConfig.sub}</p>
          </div>
        </div>
      </div>

      {/* Auth Expiry Alert */}
      {expiringAuths.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {expiringAuths.length} authorization{expiringAuths.length > 1 ? 's' : ''} expiring within 30 days
            </p>
          </div>
          <div className="space-y-2">
            {expiringAuths.map((a) => {
              const days = daysUntil(a.expiresAt);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900/50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-[#1B2733] dark:text-white">{a.clientName}</span>
                    <span className="ml-2 text-[#5A6B7A] dark:text-slate-400">{a.cptCode} · {a.payer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5A6B7A] dark:text-slate-400">
                      {a.hoursUsed}/{a.hoursApproved} hrs used
                    </span>
                    <Badge className={days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                      {days}d
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const status = metricStatus(m);
          const IconEl = m.icon;
          const borderMap: Record<MetricStatus, string> = {
            green: 'border-emerald-200 dark:border-emerald-700',
            yellow: 'border-amber-200 dark:border-amber-700',
            red: 'border-red-200 dark:border-red-700',
            info: 'border-neutral-200 dark:border-slate-700',
          };
          return (
            <Card
              key={m.id}
              className={`p-4 border ${borderMap[status]} rounded-2xl bg-white dark:bg-slate-900/60`}
            >
              <div className="flex items-center gap-2 mb-2">
                <IconEl className="w-4 h-4 text-neutral-400" />
                <p className="text-xs text-[#5A6B7A] dark:text-slate-400 leading-tight line-clamp-2">{m.label}</p>
              </div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                {formatVal(m)}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-neutral-400 dark:text-[#5A6B7A]">
                  Target: {m.higherIsBetter ? '≥' : '≤'}{m.target}{m.unit === '%' ? '%' : m.unit === 'hrs' ? ' h' : m.unit === 'pts' ? ' pts' : ''}
                </p>
                <StatusChip status={status} />
              </div>
              <p className="mt-2 text-xs text-[#5A6B7A] dark:text-slate-400 leading-snug">{m.description}</p>
            </Card>
          );
        })}
      </div>

      {/* Open Denials */}
      {denials.length > 0 && (
        <Card className="rounded-2xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-slate-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-[#1B2733] dark:text-white">Open Denials ({denials.length})</h3>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-slate-700">
            {denials.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1B2733] dark:text-white">{d.clientName}</p>
                  <p className="text-xs text-[#5A6B7A] dark:text-slate-400 mt-0.5">
                    {d.cptCode} · {d.payer} · DOS {d.dateOfService}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{d.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[#1B2733] dark:text-white">${d.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty denial state */}
      {denials.length === 0 && (
        <Card className="rounded-2xl border border-neutral-200 dark:border-slate-700 p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="font-medium text-[#1B2733] dark:text-white">No open denials</p>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">Your claims are processing cleanly.</p>
        </Card>
      )}

      {/* No-data notice */}
      {metrics.every((m) => m.value === null) && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/20 p-4">
          <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-800 dark:text-sky-200">Performance data populates as you complete sessions</p>
            <p className="text-sm text-sky-700 dark:text-sky-300 mt-1">
              Billable hours, note compliance, goal mastery, and claim metrics will appear here after your first completed sessions and submitted claims.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
