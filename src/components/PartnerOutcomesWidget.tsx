// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * PartnerOutcomesWidget — drops into OrgAdminDashboard or AACTPayerDashboard
 * showing aggregate clinical outcomes for the partner's enrolled families.
 *
 * Three side-by-side cards: PHQ-9, GAD-7, ABC-I averages with delta-vs-last-week
 * trend arrows. Color: green if improving (lower score), red if worsening.
 *
 * Falls back to demo data when running in demo mode so investor walk-throughs
 * see populated charts. Real-user view fetches from `outcome_measure_submissions`
 * filtered by the partner's enrolled family user_ids.
 */

import React, { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { isDemoMode, demoPartnerSnapshot, demoOutcomeSubmissions } from '../lib/demo-seed';
import { AIChart } from './AIChart';

interface PartnerOutcomesWidgetProps {
  /** When provided, scope to families enrolled with this partner org. */
  partnerOrgId?: string;
  /** Show a chart of trend over time (last 8 weeks) */
  showTrendChart?: boolean;
  className?: string;
}

interface OutcomeSummary {
  measureId: string;
  measureName: string;
  avg: number | null;
  deltaPct: number | null;
  submissionsCount: number;
  /** Lower-is-better for these measures. */
  lowerIsBetter: boolean;
}

interface OutcomeTrendPoint {
  week: string;
  phq9: number | null;
  gad7: number | null;
  abc: number | null;
}

export function PartnerOutcomesWidget({ partnerOrgId, showTrendChart = true, className = '' }: PartnerOutcomesWidgetProps) {
  const [summaries, setSummaries] = useState<OutcomeSummary[]>([]);
  const [trend, setTrend] = useState<OutcomeTrendPoint[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, [partnerOrgId]);

  async function load() {
    setIsLoading(true);

    // Demo mode: synthetic-but-credible data so demos don't show empty
    if (isDemoMode()) {
      const snap = demoPartnerSnapshot();
      setFamilyCount(snap.totalActiveFamilies);
      setSummaries([
        { measureId: 'phq9', measureName: 'PHQ-9', avg: snap.phq9Avg, deltaPct: snap.phq9DeltaPct, submissionsCount: 23, lowerIsBetter: true },
        { measureId: 'gad7', measureName: 'GAD-7', avg: snap.gad7Avg, deltaPct: snap.gad7DeltaPct, submissionsCount: 23, lowerIsBetter: true },
        { measureId: 'abc-irritability', measureName: 'ABC-I', avg: snap.abcIAvg, deltaPct: snap.abcIDeltaPct, submissionsCount: 19, lowerIsBetter: true },
      ]);

      // Build 8-week trend from demo submissions
      const subs = demoOutcomeSubmissions();
      const weeks = buildWeeklyBuckets(subs, 8);
      setTrend(weeks);
      setIsLoading(false);
      return;
    }

    // Real query: families enrolled with this partner (if specified) or all
    let familyIds: string[] | null = null;
    if (partnerOrgId) {
      const { data: orgMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('pilot_organization', partnerOrgId);
      familyIds = (orgMembers || []).map(m => m.id);
      setFamilyCount(familyIds.length);
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString();

    let q = supabase
      .from('outcome_measure_submissions')
      .select('measure_id, measure_name, total_score, created_at')
      .gte('created_at', eightWeeksAgo);
    if (familyIds && familyIds.length) q = q.in('user_id', familyIds);
    if (familyIds && familyIds.length === 0) { setSummaries([]); setTrend([]); setIsLoading(false); return; }

    const { data: subs } = await q;
    const safe = subs || [];

    const computeSummary = (id: string, name: string): OutcomeSummary => {
      const thisWeek = safe.filter(r => r.measure_id === id && r.created_at >= oneWeekAgo);
      const lastWeek = safe.filter(r => r.measure_id === id && r.created_at >= twoWeeksAgo && r.created_at < oneWeekAgo);
      const avgNow = thisWeek.length ? thisWeek.reduce((s, r) => s + Number(r.total_score), 0) / thisWeek.length : null;
      const avgPrev = lastWeek.length ? lastWeek.reduce((s, r) => s + Number(r.total_score), 0) / lastWeek.length : null;
      const delta = (avgNow != null && avgPrev != null && avgPrev !== 0)
        ? Math.round(((avgNow - avgPrev) / avgPrev) * 100)
        : null;
      return {
        measureId: id,
        measureName: name,
        avg: avgNow != null ? Math.round(avgNow * 10) / 10 : null,
        deltaPct: delta,
        submissionsCount: thisWeek.length,
        lowerIsBetter: true,
      };
    };

    setSummaries([
      computeSummary('phq9', 'PHQ-9'),
      computeSummary('gad7', 'GAD-7'),
      computeSummary('abc-irritability', 'ABC-I'),
    ]);

    setTrend(buildWeeklyBuckets(
      safe.map(s => ({ measureId: s.measure_id, totalScore: Number(s.total_score), createdAt: s.created_at })),
      8
    ));

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-white border border-[#E8E4DF] p-6 flex items-center justify-center ${className}`}>
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  const hasAnyData = summaries.some(s => s.avg != null);

  return (
    <div className={`rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden ${className}`}>
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Aggregate Outcomes</p>
          <p className="text-sm text-[#3A4A57] mt-0.5">
            {partnerOrgId ? `${familyCount} families enrolled` : 'All Aminy families'} · last 7 days vs prior week
          </p>
        </div>
        <Activity className="w-4 h-4 text-slate-400 mt-1" />
      </div>

      {!hasAnyData ? (
        <div className="px-4 pb-5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[#5A6B7A]">
            No outcome submissions yet. Once families start completing PHQ-9, GAD-7, or ABC-I assessments, trends will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards row */}
          <div className="grid grid-cols-3 gap-2 px-4 pb-3">
            {summaries.map(s => <OutcomeSummaryCard key={s.measureId} summary={s} />)}
          </div>

          {/* Trend chart */}
          {showTrendChart && trend.length > 0 && (
            <div className="px-4 pb-4">
              <AIChart
                spec={{
                  type: 'line',
                  title: '8-week trend (avg score across families)',
                  data: trend.map(t => ({ week: t.week, 'PHQ-9': t.phq9 ?? 0, 'GAD-7': t.gad7 ?? 0, 'ABC-I': t.abc ?? 0 })),
                  xKey: 'week',
                  yKeys: ['PHQ-9', 'GAD-7', 'ABC-I'],
                  colors: ['#577590', '#43AA8B', '#E07A5F'],
                }}
              />
              <p className="text-sm text-slate-400 text-center mt-1">
                Lower scores = improvement. Trend down is the desired direction.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OutcomeSummaryCard({ summary }: { summary: OutcomeSummary }) {
  const { measureName, avg, deltaPct, submissionsCount, lowerIsBetter } = summary;
  const isImproving = deltaPct != null && ((lowerIsBetter && deltaPct < 0) || (!lowerIsBetter && deltaPct > 0));
  const isWorsening = deltaPct != null && ((lowerIsBetter && deltaPct > 0) || (!lowerIsBetter && deltaPct < 0));

  const color = isImproving ? '#43AA8B' : isWorsening ? '#E07A5F' : '#64748b';
  const Icon = isImproving ? TrendingDown : isWorsening ? TrendingUp : Minus;

  return (
    <div className="rounded-xl p-3" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">{measureName}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{avg ?? '—'}</p>
      <div className="flex items-center gap-1 mt-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <p className="text-xs font-medium" style={{ color }}>
          {deltaPct == null ? 'No prior data' : `${deltaPct > 0 ? '+' : ''}${deltaPct}% vs last wk`}
        </p>
      </div>
      <p className="text-xs text-slate-400 mt-1">{submissionsCount} submissions</p>
    </div>
  );
}

/** Bucket submissions into N weekly buckets, computing per-week averages. */
function buildWeeklyBuckets(
  subs: Array<{ measureId: string; totalScore: number; createdAt: string }>,
  weeksBack: number,
): OutcomeTrendPoint[] {
  const now = Date.now();
  const buckets: OutcomeTrendPoint[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 86_400_000;
    const end = now - i * 7 * 86_400_000;
    const weekLabel = `W-${i}`;
    const inWeek = subs.filter(s => {
      const t = new Date(s.createdAt).getTime();
      return t >= start && t < end;
    });
    const avg = (id: string) => {
      const xs = inWeek.filter(s => s.measureId === id);
      if (!xs.length) return null;
      return Math.round((xs.reduce((s, x) => s + x.totalScore, 0) / xs.length) * 10) / 10;
    };
    buckets.push({
      week: weekLabel,
      phq9: avg('phq9'),
      gad7: avg('gad7'),
      abc: avg('abc-irritability'),
    });
  }
  return buckets;
}

export default PartnerOutcomesWidget;
