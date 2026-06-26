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
      <p className={`text-3xl font-bold ${color ?? 'text-[#1B2733]'}`}>
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
      const [goalsRes, sessionsRes] = await Promise.allSettled([
        supabase
          .from('treatment_goals')
          .select('status, mastery_date, program_name, total_trials, mastery_pct')
          .limit(500),
        supabase
          .from('jr_sessions')
          .select('created_at, provider_id, duration_minutes')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1000),
      ]);

      const goalsData = goalsRes.status === 'fulfilled' && !goalsRes.value.error
        ? goalsRes.value.data ?? []
        : [];
      const sessionsData = sessionsRes.status === 'fulfilled' && !sessionsRes.value.error
        ? sessionsRes.value.data ?? []
        : [];

      if (!mountedRef.current) return;

      // ── KPI tiles — derived only from this account's data (no fabricated fills) ──
      const masteredGoals = goalsData.filter((g: { status: string }) => g.status === 'mastered');
      const goalsAtMastery = goalsData.length > 0
        ? Math.round((masteredGoals.length / goalsData.length) * 100)
        : 0;
      setKpi({
        activeClients: 0,            // not derivable from current query — shown as 0 until wired
        sessionsThisMonth: sessionsData.length,
        goalsAtMastery,
        avgWeeksToFirstMastery: 0,   // not derivable from current query
      });

      // ── Top Programs — grouped from real treatment_goals ──
      const progMap = new Map<string, { trials: number; masterySum: number; n: number }>();
      goalsData.forEach((g: { program_name?: string; total_trials?: number; mastery_pct?: number }) => {
        const name = g.program_name || 'Unnamed program';
        const e = progMap.get(name) ?? { trials: 0, masterySum: 0, n: 0 };
        e.trials += g.total_trials || 0;
        e.masterySum += g.mastery_pct || 0;
        e.n += 1;
        progMap.set(name, e);
      });
      const realPrograms: ProgramRow[] = [...progMap.entries()]
        .map(([name, e]) => ({
          name,
          totalTrials: e.trials,
          masteryPct: Math.round(e.masterySum / Math.max(e.n, 1)),
          trend: 'flat' as const,
        }))
        .sort((a, b) => b.masteryPct - a.masteryPct)
        .slice(0, 10);
      setPrograms(realPrograms);

      // Weekly trend, session-frequency distribution, and per-provider names are
      // not reliably derivable from the current queries — leave empty so those
      // sections show honest empty states rather than fabricated curves.
      setWeekly([]);
      setFreq([]);
      setProviders([]);

      setLastUpdated(new Date());
    } catch (e) {
      console.warn('OutcomesDashboard: Supabase fetch failed', e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

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
          <div className="grid grid-cols-2 gap-3">
            <KPITile
              label="Active Clients"
              value={kpi.activeClients}
              sub="enrolled families"
              color="text-[#1B2733]"
            />
            <KPITile
              label="Sessions This Month"
              value={kpi.sessionsThisMonth}
              sub="completed sessions"
              color="text-[#1B2733]"
            />
            <KPITile
              label="Goals at Mastery"
              value={kpi.goalsAtMastery}
              unit="%"
              sub="> 80% criterion met"
              color="text-emerald-500"
            />
            <KPITile
              label="Avg to First Mastery"
              value={kpi.avgWeeksToFirstMastery}
              unit="wks"
              sub="from program start"
              color="text-[#1B2733]"
            />
          </div>
        </section>

        {/* ── Section 2: Goal Mastery Trend ────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#1B2733]">Goal Mastery Trend</h2>
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
            <h2 className="text-sm font-bold text-[#1B2733]">Session Frequency Distribution</h2>
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
            <h2 className="text-sm font-bold text-[#1B2733]">Top Programs by Mastery Rate</h2>
            <p className="text-sm text-slate-400 mt-0.5">Across all active treatment plans</p>
          </div>
          {programs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAF7F2]">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Program</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Trials</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Mastery</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((row, i) => (
                    <tr key={row.name} className={i % 2 === 0 ? '' : 'bg-[#FAF7F2]/50'}>
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
              <h2 className="text-sm font-bold text-[#1B2733]">Provider Performance</h2>
              <p className="text-sm text-slate-400 mt-0.5">Outcomes score based on mastery rates and session consistency</p>
            </div>
            {providers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAF7F2]">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Provider</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Clients</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Avg Sess/Wk</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((row, i) => (
                      <tr key={row.name} className={i % 2 === 0 ? '' : 'bg-[#FAF7F2]/50'}>
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
