/**
 * OutcomesDashboard — outcomes & metrics dashboard
 * Shows platform-wide (or per-provider) clinical outcomes.
 *
 * Loads real data from Supabase: treatment_goals, jr_sessions.
 * Real users only ever see metrics derived from their own data — sections with
 * no data render honest empty states. The seeded sample dataset is shown ONLY in
 * demo mode (?demo=…), so prospects/execs get an impressive walkthrough without
 * ever presenting fabricated numbers to a real account.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Minus,
  Users, Calendar, Target, Clock,
  RefreshCw, BarChart3,
} from 'lucide-react';
import { supabase } from '../../lib/supabase-compat';
import { isDemoMode } from '../../lib/demo-seed';
import { ScreenHeader } from '../ui/ScreenHeader';

// ============================================================================
// Types
// ============================================================================

export interface OutcomesDashboardProps {
  providerId?: string;
  onBack?: () => void;
}

interface KPIData {
  activeClients: number;
  sessionsThisMonth: number;
  goalsAtMastery: number;  // percentage
  avgWeeksToFirstMastery: number;
}

interface WeeklyPoint {
  week: number;
  label: string;
  masteryPct: number;
}

interface FrequencyBucket {
  label: string;
  count: number;
}

interface ProgramRow {
  name: string;
  totalTrials: number;
  masteryPct: number;
  trend: 'up' | 'down' | 'flat';
}

interface ProviderRow {
  name: string;
  clients: number;
  avgSessionsPerWeek: number;
  outcomesScore: number;
}

// ============================================================================
// Mock data — realistic, impressive for demo
// ============================================================================

const MOCK_KPI: KPIData = {
  activeClients: 47,
  sessionsThisMonth: 312,
  goalsAtMastery: 68,
  avgWeeksToFirstMastery: 4.2,
};

const MOCK_WEEKLY: WeeklyPoint[] = [
  { week: 1,  label: 'Wk 1',  masteryPct: 18 },
  { week: 2,  label: 'Wk 2',  masteryPct: 22 },
  { week: 3,  label: 'Wk 3',  masteryPct: 24 },
  { week: 4,  label: 'Wk 4',  masteryPct: 29 },
  { week: 5,  label: 'Wk 5',  masteryPct: 33 },
  { week: 6,  label: 'Wk 6',  masteryPct: 38 },
  { week: 7,  label: 'Wk 7',  masteryPct: 44 },
  { week: 8,  label: 'Wk 8',  masteryPct: 49 },
  { week: 9,  label: 'Wk 9',  masteryPct: 54 },
  { week: 10, label: 'Wk 10', masteryPct: 59 },
  { week: 11, label: 'Wk 11', masteryPct: 63 },
  { week: 12, label: 'Wk 12', masteryPct: 68 },
];

const MOCK_FREQUENCY: FrequencyBucket[] = [
  { label: '1x/wk', count: 8  },
  { label: '2x/wk', count: 14 },
  { label: '3x/wk', count: 16 },
  { label: '4x+/wk', count: 9 },
];

const MOCK_PROGRAMS: ProgramRow[] = [
  { name: 'Mand Training',        totalTrials: 1840, masteryPct: 82, trend: 'up'   },
  { name: 'Tact Training',        totalTrials: 1220, masteryPct: 74, trend: 'up'   },
  { name: 'Listener Responding',  totalTrials: 980,  masteryPct: 67, trend: 'up'   },
  { name: 'Motor Imitation',      totalTrials: 760,  masteryPct: 71, trend: 'flat' },
  { name: 'Social Skills',        totalTrials: 640,  masteryPct: 55, trend: 'up'   },
  { name: 'Self-Care / ADL',      totalTrials: 520,  masteryPct: 63, trend: 'up'   },
  { name: 'Behavior Reduction',   totalTrials: 430,  masteryPct: 48, trend: 'down' },
];

const MOCK_PROVIDERS: ProviderRow[] = [
  { name: 'Dr. Sarah Chen, BCBA-D', clients: 12, avgSessionsPerWeek: 2.8, outcomesScore: 9.4 },
  { name: 'Marcus Williams, BCBA',  clients: 10, avgSessionsPerWeek: 2.5, outcomesScore: 9.1 },
  { name: 'Priya Kapoor, BCBA',     clients: 9,  avgSessionsPerWeek: 2.2, outcomesScore: 8.8 },
  { name: 'James Torres, RBT',      clients: 8,  avgSessionsPerWeek: 3.1, outcomesScore: 8.5 },
  { name: 'Alicia Monroe, BCBA',    clients: 8,  avgSessionsPerWeek: 2.4, outcomesScore: 8.7 },
];

// ============================================================================
// SVG Line Chart
// ============================================================================

function LineChart({ points }: { points: WeeklyPoint[] }) {
  const W = 320;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxY = 100;
  const minY = 0;

  function xPos(i: number) {
    return PAD.left + (i / (points.length - 1)) * chartW;
  }
  function yPos(v: number) {
    return PAD.top + chartH - ((v - minY) / (maxY - minY)) * chartH;
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(p.masteryPct).toFixed(1)}`)
    .join(' ');

  const areaD = pathD + ` L ${xPos(points.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${xPos(0).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`;

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }} aria-label="Goal mastery trend over 12 weeks">
      <defs>
        <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A7D99" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2A7D99" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y-axis grid + labels */}
      {yTicks.map(tick => (
        <g key={tick}>
          <line
            x1={PAD.left} y1={yPos(tick)}
            x2={PAD.left + chartW} y2={yPos(tick)}
            stroke="#e2e8f0" strokeWidth="1"
          />
          <text
            x={PAD.left - 4} y={yPos(tick)}
            textAnchor="end" dominantBaseline="middle"
            className="fill-slate-400" style={{ fontSize: 9 }}
          >
            {tick}%
          </text>
        </g>
      ))}

      {/* X-axis labels — every 3 weeks */}
      {points.filter((_, i) => i % 3 === 0 || i === points.length - 1).map((p, _unused, _arr) => {
        const i = points.indexOf(p);
        return (
          <text
            key={p.week}
            x={xPos(i)} y={H - 6}
            textAnchor="middle"
            className="fill-slate-400" style={{ fontSize: 9 }}
          >
            {p.label}
          </text>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#masteryGrad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#2A7D99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* End point dot */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1];
        const lx = xPos(points.length - 1);
        const ly = yPos(last.masteryPct);
        return (
          <g>
            <circle cx={lx} cy={ly} r={5} fill="#2A7D99" />
            <circle cx={lx} cy={ly} r={3} fill="white" />
            <text x={lx + 8} y={ly} dominantBaseline="middle" className="fill-emerald-500 font-bold" style={{ fontSize: 10 }}>
              {last.masteryPct}%
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ============================================================================
// SVG Bar Chart
// ============================================================================

function BarChart({ buckets }: { buckets: FrequencyBucket[] }) {
  const W = 280;
  const H = 110;
  const PAD = { top: 10, right: 12, bottom: 28, left: 12 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const barW = chartW / buckets.length * 0.55;
  const gap = chartW / buckets.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Session frequency distribution">
      {buckets.map((b, i) => {
        const bH = (b.count / maxCount) * chartH;
        const bX = PAD.left + i * gap + (gap - barW) / 2;
        const bY = PAD.top + chartH - bH;
        return (
          <g key={b.label}>
            <rect
              x={bX} y={bY}
              width={barW} height={bH}
              rx={4}
              fill="#2A7D99"
              opacity={0.85}
            />
            <text
              x={bX + barW / 2} y={bY - 5}
              textAnchor="middle"
              className="fill-slate-600 font-semibold" style={{ fontSize: 10 }}
            >
              {b.count}
            </text>
            <text
              x={bX + barW / 2} y={H - 6}
              textAnchor="middle"
              className="fill-slate-400" style={{ fontSize: 9 }}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// KPI Tile
// ============================================================================

function KPITile({
  label, value, unit, sub, color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
      <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-[#132F43]'}`}>
        {value}
        {unit && <span className="text-base font-medium text-[#5A6B7A] ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ============================================================================
// Trend arrow
// ============================================================================

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <TrendingUp   className="w-4 h-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400"     />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

// ============================================================================
// Main Component
// ============================================================================

const EMPTY_KPI: KPIData = { activeClients: 0, sessionsThisMonth: 0, goalsAtMastery: 0, avgWeeksToFirstMastery: 0 };

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <BarChart3 className="w-7 h-7 text-slate-300 mb-2" aria-hidden="true" />
      <p className="text-sm text-slate-400 max-w-[16rem]">{message}</p>
    </div>
  );
}

export function OutcomesDashboard({ providerId, onBack }: OutcomesDashboardProps) {
  const demo = isDemoMode();
  // Real accounts start empty and fill from their own Supabase data. Demo mode
  // seeds the sample dataset so prospect walkthroughs look complete.
  const [kpi, setKpi]           = useState<KPIData>(demo ? MOCK_KPI : EMPTY_KPI);
  const [weekly, setWeekly]     = useState<WeeklyPoint[]>(demo ? MOCK_WEEKLY : []);
  const [frequency, setFreq]    = useState<FrequencyBucket[]>(demo ? MOCK_FREQUENCY : []);
  const [programs, setPrograms] = useState<ProgramRow[]>(demo ? MOCK_PROGRAMS : []);
  const [providers, setProviders] = useState<ProviderRow[]>(demo ? MOCK_PROVIDERS : []);
  const [loading, setLoading]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  async function fetchData() {
    // Demo mode shows the seeded sample dataset already in state — never hit the DB.
    if (demo) {
      setLastUpdated(new Date());
      return;
    }
    setLoading(true);
    try {
      const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
      const windowStartIso = new Date(Date.now() - WINDOW_MS).toISOString();
      const [goalsRes, sessionsRes] = await Promise.allSettled([
        // Columns match the live treatment_goals schema (status, domain, progress,
        // updated_at as the mastery timestamp proxy). RLS scopes rows to the caller.
        supabase
          .from('treatment_goals')
          .select('status, domain, current_progress, current, updated_at')
          .limit(2000),
        // jr_sessions real columns: started_at, child_id, duration_seconds.
        supabase
          .from('jr_sessions')
          .select('started_at, child_id, duration_seconds')
          .gte('started_at', windowStartIso)
          .limit(2000),
      ]);

      const goalsData = goalsRes.status === 'fulfilled' && !goalsRes.value.error
        ? goalsRes.value.data ?? []
        : [];
      const sessionsData = sessionsRes.status === 'fulfilled' && !sessionsRes.value.error
        ? sessionsRes.value.data ?? []
        : [];

      if (!mountedRef.current) return;

      // Treat both "mastered" and "completed" as mastery to be schema-tolerant.
      const isMastered = (s?: string) => s === 'mastered' || s === 'completed';
      const progressOf = (g: { current_progress?: number; current?: number }) =>
        g.current_progress ?? g.current ?? 0;

      // ── KPI tiles — derived only from this account's real data ──
      const masteredGoals = goalsData.filter((g: { status?: string }) => isMastered(g.status));
      const goalsAtMastery = goalsData.length > 0
        ? Math.round((masteredGoals.length / goalsData.length) * 100)
        : 0;
      const activeClients = new Set(
        sessionsData
          .map((s: { child_id?: string }) => s.child_id)
          .filter(Boolean) as string[]
      ).size;
      setKpi({
        activeClients,
        sessionsThisMonth: sessionsData.length,
        goalsAtMastery,
        avgWeeksToFirstMastery: 0,   // requires a true baseline-start date per goal; not in schema
      });

      // ── Top Programs — grouped from real treatment_goals by domain ──
      const DOMAIN_LABELS: Record<string, string> = {
        daily_living: 'Daily Living',
        self_regulation: 'Self-Regulation',
        social: 'Social Skills',
        communication: 'Communication',
        academic: 'Academic',
        motor: 'Motor Skills',
      };
      const progMap = new Map<string, { progressSum: number; n: number }>();
      goalsData.forEach((g: { domain?: string; current_progress?: number; current?: number }) => {
        const name = DOMAIN_LABELS[g.domain || ''] || g.domain || 'Unnamed program';
        const e = progMap.get(name) ?? { progressSum: 0, n: 0 };
        e.progressSum += progressOf(g);
        e.n += 1;
        progMap.set(name, e);
      });
      const realPrograms: ProgramRow[] = [...progMap.entries()]
        .map(([name, e]) => ({
          name,
          totalTrials: e.n, // # goals tracked in this domain (no per-trial table yet)
          masteryPct: Math.round(e.progressSum / Math.max(e.n, 1)),
          trend: 'flat' as const,
        }))
        .sort((a, b) => b.masteryPct - a.masteryPct)
        .slice(0, 10);
      setPrograms(realPrograms);

      // ── Weekly mastery trend — cumulative % of goals mastered over the last 12 weeks ──
      // Honest derivation: a goal counts toward a week once its updated_at (mastery
      // timestamp proxy) falls on/before that week's end. Only populate when there is
      // at least one mastered goal with a usable date; otherwise leave empty.
      const WEEKS = 12;
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const totalGoals = goalsData.length;
      const masteryTimes = masteredGoals
        .map((g: { updated_at?: string }) => (g.updated_at ? new Date(g.updated_at).getTime() : NaN))
        .filter((t: number) => !Number.isNaN(t));
      if (totalGoals > 0 && masteryTimes.length > 0) {
        const now = Date.now();
        const realWeekly: WeeklyPoint[] = [];
        for (let i = WEEKS - 1; i >= 0; i--) {
          const weekEnd = now - i * WEEK_MS;
          const masteredByThen = masteryTimes.filter((t: number) => t <= weekEnd).length;
          realWeekly.push({
            week: WEEKS - i,
            label: `Wk ${WEEKS - i}`,
            masteryPct: Math.round((masteredByThen / totalGoals) * 100),
          });
        }
        setWeekly(realWeekly);
      } else {
        setWeekly([]);
      }

      // ── Session-frequency distribution — bucket clients by sessions/week (30d window) ──
      // Real derivation from jr_sessions: count sessions per child over the window,
      // convert to a weekly cadence, and bucket. Empty when no recent sessions.
      const weeksInWindow = WINDOW_MS / WEEK_MS; // ~4.29
      const perChild = new Map<string, number>();
      sessionsData.forEach((s: { child_id?: string }) => {
        if (!s.child_id) return;
        perChild.set(s.child_id, (perChild.get(s.child_id) ?? 0) + 1);
      });
      if (perChild.size > 0) {
        const buckets = { '1x/wk': 0, '2x/wk': 0, '3x/wk': 0, '4x+/wk': 0 };
        perChild.forEach((count) => {
          const perWeek = count / weeksInWindow;
          if (perWeek < 1.5) buckets['1x/wk']++;
          else if (perWeek < 2.5) buckets['2x/wk']++;
          else if (perWeek < 3.5) buckets['3x/wk']++;
          else buckets['4x+/wk']++;
        });
        const realFreq: FrequencyBucket[] = Object.entries(buckets)
          .map(([label, count]) => ({ label, count }))
          .filter((b) => b.count > 0);
        setFreq(realFreq);
      } else {
        setFreq([]);
      }

      // Per-provider names/scores need a providers join not present in these queries.
      setProviders([]);

      setLastUpdated(new Date());
    } catch (e) {
      console.warn('OutcomesDashboard: Supabase fetch failed', e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // All-zero KPIs read as a dead platform — soften with a gentle zero state.
  // Demo mode seeds MOCK_KPI (non-zero), so this only applies to real empty accounts.
  const kpiIsEmpty =
    kpi.activeClients === 0 &&
    kpi.sessionsThisMonth === 0 &&
    kpi.goalsAtMastery === 0 &&
    kpi.avgWeeksToFirstMastery === 0;

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Header */}
      <ScreenHeader
        title={providerId ? 'Provider Outcomes' : 'Platform Outcomes'}
        onBack={onBack}
        variant="flat"
        sticky
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1 text-slate-400 hover:text-[#5A6B7A] text-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-6">

        {/* Last updated */}
        <p className="text-sm text-slate-400 text-right">
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* ── Section 1: KPI Tiles ─────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-[#5A6B7A] uppercase tracking-widest mb-3">Platform Summary</h2>
          {kpiIsEmpty && (
            <p className="text-sm text-slate-400 mb-3">
              Your outcomes view fills in as you hold sessions and set goals.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <KPITile
              label="Active Clients"
              value={kpiIsEmpty ? '–' : kpi.activeClients}
              sub="enrolled families"
              color={kpiIsEmpty ? 'text-slate-300' : 'text-[#132F43]'}
            />
            <KPITile
              label="Sessions This Month"
              value={kpiIsEmpty ? '–' : kpi.sessionsThisMonth}
              sub="completed sessions"
              color={kpiIsEmpty ? 'text-slate-300' : 'text-[#132F43]'}
            />
            <KPITile
              label="Goals at Mastery"
              value={kpiIsEmpty ? '–' : kpi.goalsAtMastery}
              unit={kpiIsEmpty ? undefined : '%'}
              sub="> 80% criterion met"
              color={kpiIsEmpty ? 'text-slate-300' : 'text-emerald-500'}
            />
            <KPITile
              label="Avg to First Mastery"
              value={kpiIsEmpty ? '–' : kpi.avgWeeksToFirstMastery}
              unit={kpiIsEmpty ? undefined : 'wks'}
              sub="from program start"
              color={kpiIsEmpty ? 'text-slate-300' : 'text-[#132F43]'}
            />
          </div>
        </section>

        {/* ── Section 2: Goal Mastery Trend ────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#132F43]">Goal Mastery Trend</h2>
              <p className="text-sm text-slate-400 mt-0.5">% goals at mastery over 12 weeks</p>
            </div>
            {weekly.length > 1 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <TrendingUp className="w-3 h-3" />
                +{Math.max(0, weekly[weekly.length - 1].masteryPct - weekly[0].masteryPct)}pp
              </span>
            )}
          </div>
          {weekly.length > 0
            ? <LineChart points={weekly} />
            : <EmptyPanel message="Goal mastery trend appears once a few weeks of sessions and goal data are logged." />}
        </section>

        {/* ── Section 3: Session Frequency ─────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF]">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#132F43]">Session Frequency Distribution</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {frequency.length > 0 && kpi.activeClients > 0
                ? `Sessions per week across ${kpi.activeClients} active clients`
                : 'Sessions per week across active clients'}
            </p>
          </div>
          {frequency.length > 0 ? (
            <>
              <BarChart buckets={frequency} />
              <div className="flex justify-around mt-3">
                {frequency.map(b => (
                  <div key={b.label} className="text-center">
                    <p className="text-sm font-medium text-[#5A6B7A]">{b.label}</p>
                    <p className="text-sm text-slate-400">
                      {kpi.activeClients > 0 ? `${Math.round((b.count / kpi.activeClients) * 100)}%` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyPanel message="Session frequency fills in as visits are completed and logged." />
          )}
        </section>

        {/* ── Section 4: Top Programs ───────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E4DF]">
            <h2 className="text-sm font-bold text-[#132F43]">Top Programs by Mastery Rate</h2>
            <p className="text-sm text-slate-400 mt-0.5">Across all active treatment plans</p>
          </div>
          {programs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F6FBFB]">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Program</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Trials</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Mastery</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((row, i) => (
                    <tr key={row.name} className={i % 2 === 0 ? '' : 'bg-[#F6FBFB]/50'}>
                      <td className="px-5 py-3 font-medium text-[#3A4A57]">{row.name}</td>
                      <td className="px-4 py-3 text-right text-[#5A6B7A]">{row.totalTrials.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${row.masteryPct >= 70 ? 'text-emerald-600' : row.masteryPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {row.masteryPct}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <TrendArrow trend={row.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel message="Program mastery rates appear once treatment goals and trial data are recorded." />
          )}
        </section>

        {/* ── Section 5: Provider Performance ─────────────── */}
        {!providerId && (
          <section className="bg-white rounded-2xl shadow-sm border border-[#E8E4DF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E4DF]">
              <h2 className="text-sm font-bold text-[#132F43]">Provider Performance</h2>
              <p className="text-sm text-slate-400 mt-0.5">Outcomes score based on mastery rates and session consistency</p>
            </div>
            {providers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F6FBFB]">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Provider</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Clients</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Avg Sess/Wk</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((row, i) => (
                      <tr key={row.name} className={i % 2 === 0 ? '' : 'bg-[#F6FBFB]/50'}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-[#3A4A57]">{row.name}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-[#5A6B7A]">{row.clients}</td>
                        <td className="px-4 py-3 text-right text-[#5A6B7A]">{row.avgSessionsPerWeek.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${row.outcomesScore >= 9 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {row.outcomesScore.toFixed(1)}
                          </span>
                          <span className="text-sm text-slate-400">/10</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel message="Provider performance ranks appear as your team logs sessions and outcomes." />
            )}
          </section>
        )}

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-sm text-slate-400">
            {kpi.sessionsThisMonth > 0
              ? `Data reflects ${kpi.sessionsThisMonth} sessions in the last 30 days`
              : 'Outcomes update automatically as sessions and goals are logged'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default OutcomesDashboard;
