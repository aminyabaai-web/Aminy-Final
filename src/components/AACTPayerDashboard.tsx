// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * AACTPayerDashboard — Executive payer scorecard for AACT Arizona
 *
 * Tracks all metrics payers (AHCCCS MCOs + commercial) evaluate during
 * rate negotiations, contract renewals, and network adequacy audits.
 *
 * Three panels: Finance | Clinical Quality | Operations
 * Each metric: current value / target / red-yellow-green status / trend
 * Manual entry: Bucket 3 metrics (BHCOE, staff retention, payer mix)
 * Export: Payer scorecard PDF for rate letters and MCO meetings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  RefreshCw,
  Edit3,
  Save,
  X,
  BarChart3,
  Shield,
  Activity,
  DollarSign,
  Users,
  Clock,
  Target,
  Star,
  Award,
  FileText,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface AACTPayerDashboardProps {
  onBack?: () => void;
}

type TabId = 'finance' | 'clinical' | 'operations';
type MetricStatus = 'green' | 'yellow' | 'red' | 'info';
type TrendDir = 'up' | 'down' | 'flat';

interface KPIMetric {
  id: string;
  label: string;
  value: number | null;
  target: number;
  unit: string; // '%', 'days', '$', 'hrs', 'score', 'count', 'ratio'
  higherIsBetter: boolean; // false for metrics like denial rate, days-to-payment
  trend: TrendDir;
  trendValue?: string; // e.g. "+2.1pp"
  manualEntry: boolean; // Bucket 3: manually entered by admin
  note?: string; // context for payer conversations
  payerFacing: boolean; // include in payer scorecard export
}

interface KPICategory {
  id: TabId;
  label: string;
  icon: React.ElementType;
  metrics: KPIMetric[];
}

const FINANCE_METRICS: KPIMetric[] = [
  { id: 'clean-claim-rate', label: 'Clean Claim Rate', value: null, target: 95, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Below 90% is a contract risk flag for MCOs.', payerFacing: true },
  { id: 'denial-rate', label: 'Denial Rate', value: null, target: 5, unit: '%', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'Tracked separately by payer.', payerFacing: true },
  { id: 'days-to-payment', label: 'Days to Payment', value: null, target: 30, unit: 'days', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'Benchmark for negotiation leverage.', payerFacing: true },
  { id: 'ar-aging-90', label: 'AR Aging >90 Days (% of total)', value: null, target: 10, unit: '%', higherIsBetter: false, trend: 'flat', manualEntry: true, payerFacing: true },
  { id: 'timely-filing', label: 'Timely Filing Compliance', value: null, target: 100, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Payers are strict on this.', payerFacing: true },
  { id: 'underpayment-rate', label: 'Underpayment Rate', value: null, target: 0, unit: '%', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'Actual received vs. contracted rate. Payers underpay and count on us not noticing.', payerFacing: true },
  { id: 'commercial-payer-mix', label: 'Commercial % of Revenue', value: null, target: 30, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Target >30% commercial mix.', payerFacing: true },
  { id: 'revenue-per-hour', label: 'Revenue per Billable Hour', value: null, target: 85, unit: '$/hr', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: false },
  { id: 'payer-concentration', label: 'Single-Payer Concentration (max)', value: null, target: 40, unit: '%', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'No single payer >40% of total revenue.', payerFacing: false },
];

const CLINICAL_METRICS: KPIMetric[] = [
  { id: 'bhcoe-staff-qual', label: 'BHCOE Staff Qualification Rate', value: null, target: 90, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Core payer report card. Top credential in every payer meeting.', payerFacing: true },
  { id: 'bhcoe-family-sat', label: 'BHCOE Family Satisfaction', value: null, target: 4.2, unit: '/5.0', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: true },
  { id: 'bhcoe-service-delivery', label: 'BHCOE Service Delivery Rate', value: null, target: 85, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: true },
  { id: 'bhcoe-clinical-outcomes', label: 'BHCOE Clinical Outcomes Rate', value: null, target: 75, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: '% of clients meeting goals per assessment cycle.', payerFacing: true },
  { id: 'bhcoe-supervisory', label: 'BHCOE Supervisory Compliance', value: null, target: 100, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: true },
  { id: 'bcba-compliance', label: 'BCBA Credential Compliance', value: null, target: 100, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: '100% BACB-licensed.', payerFacing: true },
  { id: 'rbt-compliance', label: 'RBT Registration Compliance', value: null, target: 100, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: '100% BACB-registered.', payerFacing: true },
  { id: 'goal-attainment', label: 'Goal Attainment Rate', value: null, target: 75, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: '≥80% of tx plan goals per assessment cycle.', payerFacing: true },
  { id: 'behavior-reduction', label: 'Problem Behavior Reduction', value: null, target: 60, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: '≥25% reduction in target behavior frequency.', payerFacing: true },
  { id: 'caregiver-nps', label: 'Caregiver NPS', value: null, target: 50, unit: 'pts', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: true },
  { id: 'bcba-retention', label: 'BCBA Retention (12-mo rolling)', value: null, target: 80, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: false },
  { id: 'rbt-retention', label: 'RBT Retention (12-mo rolling)', value: null, target: 70, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, payerFacing: false },
  { id: 'tx-plan-compliance', label: 'Treatment Plan Update Compliance', value: null, target: 100, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'MCOs audit this.', payerFacing: true },
  { id: 'hours-to-first-goal', label: 'Avg Hours to First Goal Mastered', value: null, target: 60, unit: 'hrs', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'From treatment initiation.', payerFacing: true },
  { id: 'graduation-rate', label: 'Client Graduation Rate', value: null, target: 30, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Planned discharges vs. attrition.', payerFacing: true },
  { id: 'telehealth-97156', label: 'Telehealth Parent Training (97156) / mo', value: null, target: 1, unit: 'sessions', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Growing number signals innovation to commercial payers.', payerFacing: true },
];

const OPERATIONS_METRICS: KPIMetric[] = [
  { id: 'auth-utilization', label: 'Authorization Utilization Rate', value: null, target: 65, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: '<65% flags under-delivery. >98% flags over-utilization risk.', payerFacing: true },
  { id: 'days-referral-to-first', label: 'Days: Referral to First Appointment', value: null, target: 14, unit: 'days', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'AHCCCS-reportable. Under 14 days helps MCOs hit network adequacy — direct rate leverage.', payerFacing: true },
  { id: 'active-caseload', label: 'Active Client Caseload', value: null, target: 1, unit: 'clients', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Payers use to validate network capacity.', payerFacing: true },
  { id: 'rbt-billable-hours', label: 'RBT Billable Hours / Week / RBT', value: null, target: 25, unit: 'hrs', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Leading indicator of utilization and payer metrics.', payerFacing: false },
  { id: 'no-show-rate', label: 'No-Show / Cancellation Rate', value: null, target: 10, unit: '%', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'High cancellation = low utilization — MCOs watch this.', payerFacing: true },
  { id: 'open-referrals-aging', label: 'Open Referrals >30 Days Unstarted', value: null, target: 0, unit: 'referrals', higherIsBetter: false, trend: 'flat', manualEntry: true, note: 'Target: zero.', payerFacing: true },
  { id: 'staff-productivity', label: 'Staff Productivity Ratio', value: null, target: 0.85, unit: 'ratio', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Total billed hrs ÷ total paid clinical staff hrs.', payerFacing: false },
  { id: 'intake-conversion', label: 'Intake Conversion Rate', value: null, target: 70, unit: '%', higherIsBetter: true, trend: 'flat', manualEntry: true, note: 'Referrals received → clients started. Low = intake process problem.', payerFacing: false },
];

const CATEGORIES: KPICategory[] = [
  { id: 'finance', label: 'Finance', icon: DollarSign, metrics: FINANCE_METRICS },
  { id: 'clinical', label: 'Clinical Quality', icon: Award, metrics: CLINICAL_METRICS },
  { id: 'operations', label: 'Operations', icon: Activity, metrics: OPERATIONS_METRICS },
];

const STORAGE_KEY = 'aact-payer-dashboard-kpis';

function computeStatus(metric: KPIMetric): MetricStatus {
  if (metric.value === null) return 'info';
  const { value, target, higherIsBetter } = metric;
  const ratio = higherIsBetter ? value / target : target / (value || 0.001);
  if (ratio >= 1) return 'green';
  if (ratio >= 0.9) return 'yellow';
  return 'red';
}

function StatusIcon({ status }: { status: MetricStatus }) {
  if (status === 'green') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'yellow') return <AlertCircle className="w-4 h-4 text-amber-500" />;
  if (status === 'red') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-[#8A9BA8]" />;
}

function TrendIcon({ dir }: { dir: TrendDir }) {
  if (dir === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (dir === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-[#8A9BA8]" />;
}

function formatValue(metric: KPIMetric): string {
  if (metric.value === null) return '—';
  if (metric.unit === '/5.0') return metric.value.toFixed(1);
  if (metric.unit === 'ratio') return metric.value.toFixed(2);
  if (metric.unit === '$/hr') return `$${metric.value.toFixed(0)}`;
  return metric.value % 1 === 0 ? String(metric.value) : metric.value.toFixed(1);
}

function KPICard({
  metric,
  onEdit,
}: {
  metric: KPIMetric;
  onEdit: (id: string, value: number) => void;
}) {
  const status = computeStatus(metric);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(metric.value ?? ''));

  const statusBg: Record<MetricStatus, string> = {
    green: 'border-emerald-200 bg-emerald-50/50',
    yellow: 'border-amber-200 bg-amber-50/50',
    red: 'border-red-200 bg-red-50/50',
    info: 'border-[#E8E4DF] bg-white',
  };

  const handleSave = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onEdit(metric.id, n);
    setEditing(false);
  };

  return (
    <Card className={`p-4 border ${statusBg[status]} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <StatusIcon status={status} />
            <p className="text-sm font-medium text-[#3A4A57] truncate">{metric.label}</p>
          </div>
          <div className="flex items-baseline gap-1.5">
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  aria-label={`${metric.label} value`}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  className="w-20 border border-[#6B9080] rounded px-1.5 py-0.5 text-sm font-semibold focus:outline-none"
                />
                <button onClick={handleSave} aria-label="Save value" className="text-[#6B9080] hover:text-[#6B9080]"><Save className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(false)} aria-label="Cancel edit" className="text-[#8A9BA8] hover:text-[#5A6B7A]"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <span className={`text-xl font-bold ${status === 'red' ? 'text-red-600' : status === 'yellow' ? 'text-amber-600' : status === 'green' ? 'text-emerald-700' : 'text-[#8A9BA8]'}`}>
                  {formatValue(metric)}
                </span>
                <span className="text-sm text-[#8A9BA8]">{metric.unit}</span>
              </>
            )}
          </div>
          <p className="text-sm text-[#5A6B7A] mt-0.5">
            Target: {metric.higherIsBetter ? '≥' : '≤'}{metric.target}{metric.unit === '/5.0' ? '/5.0' : metric.unit === 'ratio' ? '' : metric.unit}
          </p>
          {metric.trendValue && (
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon dir={metric.trend} />
              <span className="text-sm text-[#5A6B7A]">{metric.trendValue} vs last period</span>
            </div>
          )}
        </div>
        {metric.manualEntry && !editing && (
          <button
            onClick={() => { setDraft(String(metric.value ?? '')); setEditing(true); }}
            className="flex-shrink-0 text-gray-300 hover:text-primary transition-colors mt-0.5"
            aria-label={`Update ${metric.label}`}
            title="Update value"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {metric.note && (
        <p className="mt-2 text-sm text-[#8A9BA8] italic border-t border-[#E8E4DF] pt-1.5">{metric.note}</p>
      )}
    </Card>
  );
}

function ScorecardSummaryBar({ categories }: { categories: KPICategory[] }) {
  const allMetrics = categories.flatMap(c => c.metrics);
  const entered = allMetrics.filter(m => m.value !== null);
  const green = entered.filter(m => computeStatus(m) === 'green').length;
  const yellow = entered.filter(m => computeStatus(m) === 'yellow').length;
  const red = entered.filter(m => computeStatus(m) === 'red').length;
  const total = allMetrics.length;

  return (
    <Card className="p-4 bg-slate-900 text-white">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">AACT Payer Scorecard</p>
          <p className="text-lg font-bold mt-0.5">{entered.length}/{total} metrics tracked</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-400">{green}</p>
            <p className="text-sm text-slate-400">On target</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-amber-400">{yellow}</p>
            <p className="text-sm text-slate-400">At risk</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-red-400">{red}</p>
            <p className="text-sm text-slate-400">Off target</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-400">{total - entered.length}</p>
            <p className="text-sm text-slate-400">Not entered</p>
          </div>
        </div>
      </div>
      {entered.length > 0 && (
        <div className="mt-3 flex h-2 rounded-full overflow-hidden gap-0.5">
          {green > 0 && <div className="bg-emerald-400 transition-all" style={{ flex: green }} />}
          {yellow > 0 && <div className="bg-amber-400 transition-all" style={{ flex: yellow }} />}
          {red > 0 && <div className="bg-red-400 transition-all" style={{ flex: red }} />}
          {(total - entered.length) > 0 && <div className="bg-slate-700 transition-all" style={{ flex: total - entered.length }} />}
        </div>
      )}
    </Card>
  );
}

export function AACTPayerDashboard({ onBack }: AACTPayerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('finance');
  const [categories, setCategories] = useState<KPICategory[]>(CATEGORIES);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load persisted KPI values from localStorage (fast) or Supabase (durable)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const vals: Record<string, number> = JSON.parse(stored);
        setCategories(prev => prev.map(cat => ({
          ...cat,
          metrics: cat.metrics.map(m => vals[m.id] !== undefined ? { ...m, value: vals[m.id] } : m),
        })));
      }
    } catch { /* start fresh */ }
  }, []);

  const handleEdit = useCallback((metricId: string, value: number) => {
    setCategories(prev => {
      const next = prev.map(cat => ({
        ...cat,
        metrics: cat.metrics.map(m => m.id === metricId ? { ...m, value } : m),
      }));
      // Persist locally immediately
      const vals: Record<string, number> = {};
      next.forEach(cat => cat.metrics.forEach(m => { if (m.value !== null) vals[m.id] = m.value; }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
      return next;
    });
  }, []);

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const vals: Record<string, number> = {};
      categories.forEach(cat => cat.metrics.forEach(m => { if (m.value !== null) vals[m.id] = m.value; }));
      await supabase.from('org_kpi_snapshots').upsert({
        org_id: 'aact',
        user_id: user.id,
        kpi_values: vals,
        snapshot_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id,snapshot_date' });
      setLastSaved(new Date().toLocaleTimeString());
      toast.success('KPIs saved to cloud');
    } catch {
      toast.error('Could not save to cloud — values are saved locally');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportScorecard = () => {
    const lines: string[] = [
      'AACT ARIZONA — PAYER SCORECARD',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
    ];
    categories.forEach(cat => {
      const payerMetrics = cat.metrics.filter(m => m.payerFacing);
      if (payerMetrics.length === 0) return;
      lines.push(`${cat.label.toUpperCase()}`);
      lines.push('─'.repeat(40));
      payerMetrics.forEach(m => {
        const status = computeStatus(m);
        const indicator = status === 'green' ? '✓' : status === 'yellow' ? '~' : status === 'red' ? '✗' : '—';
        lines.push(`${indicator}  ${m.label}: ${formatValue(m)}${m.unit} (target: ${m.higherIsBetter ? '≥' : '≤'}${m.target}${m.unit})`);
      });
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AACT-Payer-Scorecard-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Scorecard exported');
  };

  const activeCategory = categories.find(c => c.id === activeTab)!;

  return (
    <div className="min-h-screen bg-mist dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <button onClick={onBack} aria-label="Go back" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-2 bg-primary/20 rounded-xl border border-[#6B9080]/30">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">AACT Payer Scorecard</h1>
                <Badge className="bg-primary/20 text-[#7BA7BC] border border-[#6B9080]/30 text-sm">Arizona</Badge>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">Rate negotiation · Network adequacy · MCO reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportScorecard}
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Scorecard
            </Button>
            {lastSaved && (
              <span className="text-sm text-slate-400">Saved {lastSaved}</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="max-w-5xl mx-auto px-4 -mt-2 mb-4">
        <ScorecardSummaryBar categories={categories} />
      </div>

      {/* BHCOE / CASP Status Badges */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'BHCOE Accreditation', sublabel: 'Renewal date required', color: 'border-amber-200 bg-amber-50 text-amber-700' },
            { label: 'CASP Membership', sublabel: 'Active status required', color: 'border-[#C8DDE8] bg-[#EEF4F8] text-blue-700' },
            { label: 'AACT AZ Contracts', sublabel: 'AHCCCS + 9 commercial payers', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
          ].map(badge => (
            <div key={badge.label} className={`flex-1 min-w-[160px] border rounded-xl p-3 ${badge.color}`}>
              <p className="text-sm font-semibold">{badge.label}</p>
              <p className="text-sm mt-0.5 opacity-70">{badge.sublabel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <div className="flex gap-2 bg-white rounded-2xl p-1 border border-[#E8E4DF] shadow-sm">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const catMetrics = categories.find(c => c.id === cat.id)?.metrics || [];
            const offTarget = catMetrics.filter(m => computeStatus(m) === 'red').length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === cat.id
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-[#5A6B7A] hover:bg-[#FAF7F2]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{cat.label}</span>
                {offTarget > 0 && (
                  <span className="w-4 h-4 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center">{offTarget}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#3A4A57]">
            {activeCategory.label} — {activeCategory.metrics.length} metrics
          </h2>
          <div className="flex items-center gap-2 text-sm text-[#8A9BA8]">
            <Edit3 className="w-3 h-3" />
            <span>Tap pencil to enter values</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeCategory.metrics.map(metric => (
            <KPICard
              key={metric.id}
              metric={metric}
              onEdit={handleEdit}
            />
          ))}
        </div>

        {/* Payer-Facing Flag Legend */}
        <div className="mt-6 p-4 rounded-xl bg-white border border-[#E8E4DF]">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#3A4A57]">Payer Scorecard Export</p>
              <p className="text-sm text-[#5A6B7A] mt-0.5">
                "Export Scorecard" generates a payer-facing summary of all marked metrics for use in rate letters, MCO renegotiations, and AHCCCS contract renewals.
                {' '}Metrics flagged as payer-facing are the subset MCOs and commercial payers actively evaluate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AACTPayerDashboard;
