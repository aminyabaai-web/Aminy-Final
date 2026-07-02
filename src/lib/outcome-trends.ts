// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.

/**
 * outcome-trends — one pipeline from weekly check-in collection to presentation.
 *
 * Collection:  WeeklyOutcomeCheckIn → outcome_events (event_type 'weekly_parent_checkin',
 *              ratings in `context`, mirrored to `payload` for the legacy Dashboard10 reader)
 *              BaselineAssessment → clinical_outcomes (assessment_name 'parent_baseline_assessment',
 *              qualitative answers JSON-encoded in `interpretation`)
 * Presentation: AnalyticsCharts (parent trend view), Dashboard10 mini-trend,
 *              contextLayer (parent AI chat), PatientAISummary (provider AI summary).
 *
 * Everything here is pure except fetchOutcomeTrend (Supabase reads under the
 * caller's own RLS-scoped session — no new data flows beyond existing BAA posture).
 */

import { supabase } from '../utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CheckInPoint {
  /** ISO date the check-in was recorded */
  date: string;
  /** 1–5, how often the target behavior happened (5 = multiple times a day). Lower is calmer. */
  frequency: number | null;
  /** 1–5 goal progress rating (higher is better) */
  progress: number | null;
  /** 1–5 parent confidence rating (higher is better) */
  confidence: number | null;
}

export interface BaselineSummary {
  targetBehavior?: string;
  /** raw option value, e.g. 'few_daily' */
  frequency?: string;
  /** 1–5 intensity at baseline */
  intensity?: number;
  trigger?: string;
  ninetyDayGoal?: string;
  /** ISO date the baseline was recorded */
  date?: string;
}

export type TrendDirection = 'improving' | 'steady' | 'watch';

// ── Label maps (must stay in sync with WeeklyOutcomeCheckIn / BaselineAssessment options) ──

export const FREQUENCY_VALUE_LABELS: Record<number, string> = {
  5: 'multiple times a day',
  4: 'once a day',
  3: 'a few times a week',
  2: 'once or twice a week',
  1: 'barely at all',
};

const BASELINE_FREQUENCY_LABELS: Record<string, string> = {
  multiple_daily: 'many times a day',
  few_daily: 'a few times a day',
  once_daily: 'once a day',
  few_weekly: 'a few times a week',
  rarely: 'rarely',
};

export function baselineFrequencyLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return BASELINE_FREQUENCY_LABELS[value] ?? value.replace(/_/g, ' ');
}

// ── Row mappers ──────────────────────────────────────────────────────────────

type Jsonish = Record<string, unknown> | null | undefined;

interface OutcomeEventRow {
  context?: Jsonish;
  payload?: Jsonish;
  recorded_at?: string | null;
  created_at?: string | null;
}

function asRating(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 5 ? r : null;
}

/** ISO-week bucket key (e.g. "2026-W27") so re-done check-ins collapse per week. */
function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Thursday of the same ISO week determines the week-year
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Map raw outcome_events rows (any order) → chronological CheckInPoints.
 * Reads the canonical `context` jsonb first, falling back to the legacy
 * `payload` mirror. Rows with no usable ratings are dropped, and check-ins
 * in the same week are deduped (latest wins — a re-done check-in supersedes).
 */
export function mapCheckInRows(rows: OutcomeEventRow[] | null | undefined): CheckInPoint[] {
  if (!rows || rows.length === 0) return [];
  const points = rows
    .map((row): CheckInPoint | null => {
      const data = (row.context && Object.keys(row.context).length > 0 ? row.context : row.payload) || {};
      const frequency = asRating((data as Record<string, unknown>).target_behavior_frequency);
      const progress = asRating((data as Record<string, unknown>).goal_progress_rating);
      const confidence = asRating((data as Record<string, unknown>).parent_confidence_rating);
      if (frequency === null && progress === null && confidence === null) return null;
      return {
        date: row.recorded_at || row.created_at || '',
        frequency,
        progress,
        confidence,
      };
    })
    .filter((p): p is CheckInPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // One point per ISO week, latest wins
  const byWeek = new Map<string, CheckInPoint>();
  for (const p of points) byWeek.set(isoWeekKey(p.date), p);
  return [...byWeek.values()];
}

interface ClinicalOutcomeRow {
  interpretation?: string | null;
  raw_score?: number | null;
  created_at?: string | null;
}

/**
 * Parse a clinical_outcomes baseline row (assessment_name 'parent_baseline_assessment')
 * whose qualitative answers are JSON-encoded in `interpretation`.
 */
export function parseBaselineRow(row: ClinicalOutcomeRow | null | undefined): BaselineSummary | null {
  if (!row) return null;
  let details: Record<string, unknown> = {};
  if (row.interpretation) {
    try {
      const parsed = JSON.parse(row.interpretation);
      if (parsed && typeof parsed === 'object') details = parsed as Record<string, unknown>;
    } catch {
      // Free-text interpretation (e.g. from ClinicalOutcomesTracker) — not a parent baseline blob
    }
  }
  const summary: BaselineSummary = {
    targetBehavior: typeof details.target_behavior === 'string' ? details.target_behavior : undefined,
    frequency: typeof details.baseline_frequency === 'string' ? details.baseline_frequency : undefined,
    intensity: asRating(details.baseline_intensity ?? row.raw_score) ?? undefined,
    trigger: typeof details.primary_trigger === 'string' ? details.primary_trigger : undefined,
    ninetyDayGoal: typeof details.ninety_day_goal === 'string' ? details.ninety_day_goal : undefined,
    date: row.created_at || undefined,
  };
  const hasAnything = Object.values(summary).some(v => v !== undefined);
  return hasAnything ? summary : null;
}

// ── Trend math ───────────────────────────────────────────────────────────────

/**
 * Direction of a metric over time. Needs ≥3 values to speak; compares the mean
 * of the last 2 readings against the mean of the first 2. Movement under half
 * a point is "steady" — we never dramatize noise to a tired parent.
 */
export function trendDirection(
  values: Array<number | null>,
  lowerIsBetter: boolean,
): TrendDirection | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 3) return null;
  const head = (nums[0] + nums[1]) / 2;
  const tail = (nums[nums.length - 2] + nums[nums.length - 1]) / 2;
  const delta = tail - head;
  if (Math.abs(delta) < 0.5) return 'steady';
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  return better ? 'improving' : 'watch';
}

/**
 * Warm, no-shame headline for the parent trend view.
 * "Watch" is framed as information for the care team, never as failure.
 */
export function trendHeadline(points: CheckInPoint[], baseline: BaselineSummary | null): string {
  if (points.length === 0) return 'Your first weekly check-in starts the trend.';
  if (points.length < 3) {
    const n = points.length;
    return `${n} check-in${n === 1 ? '' : 's'} so far — your trend appears at 3.`;
  }
  const behavior = shortBehaviorName(baseline?.targetBehavior) ?? 'The target behavior';
  const freq = trendDirection(points.map(p => p.frequency), true);
  const prog = trendDirection(points.map(p => p.progress), false);
  const conf = trendDirection(points.map(p => p.confidence), false);

  if (freq === 'improving') return `${behavior} — trending down. That's real progress.`;
  if (prog === 'improving') return 'Goal progress is trending up. Keep going.';
  if (conf === 'improving') return "Your confidence is growing — that matters as much as any number.";
  if (freq === 'watch' || prog === 'watch') {
    return 'A bumpier stretch — these check-ins help you and your care team adjust.';
  }
  return 'Holding steady. Consistency is how change happens.';
}

/** "Meltdowns during transitions, hitting..." → "Meltdowns during transitions" (capped, capitalized) */
export function shortBehaviorName(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;
  let s = raw.trim().split(/[,.;\n]/)[0].trim();
  if (s.length > 40) s = `${s.slice(0, 37).trimEnd()}…`;
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── AI prompt formatting (shared by parent chat contextLayer + provider PatientAISummary) ──

function shortDate(iso?: string): string {
  if (!iso) return '?';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '?';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Compact WEEKLY OUTCOMES block for AI system prompts. Most-recent-first,
 * hard-capped at 600 chars. `points` may be in any order.
 *
 * HIPAA note: this string flows only into the existing Claude prompt path
 * (covered by the existing BAA posture) — it must never be sent to any new
 * third-party endpoint.
 */
export function formatOutcomesForAI(
  points: CheckInPoint[],
  baseline: BaselineSummary | null,
): string {
  if (points.length === 0 && !baseline) return '';
  const recentFirst = [...points].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const parts: string[] = [];
  if (recentFirst.length > 0) {
    const rows = recentFirst.map(p => {
      const bits: string[] = [];
      if (p.frequency !== null) bits.push(`behavior freq ${p.frequency}/5`);
      if (p.progress !== null) bits.push(`goal progress ${p.progress}/5`);
      if (p.confidence !== null) bits.push(`confidence ${p.confidence}/5`);
      return `${shortDate(p.date)}: ${bits.join(', ')}`;
    });
    parts.push(`Weekly parent check-ins, most recent first (freq 5=multiple/day, 1=barely; others higher=better): ${rows.join(' | ')}.`);
  }
  if (baseline) {
    const b: string[] = [];
    if (baseline.targetBehavior) b.push(`target "${baseline.targetBehavior.slice(0, 60)}"`);
    const freqLabel = baselineFrequencyLabel(baseline.frequency);
    if (freqLabel) b.push(freqLabel);
    if (baseline.intensity != null) b.push(`intensity ${baseline.intensity}/5`);
    if (baseline.trigger) b.push(`trigger: ${baseline.trigger}`);
    if (baseline.ninetyDayGoal) b.push(`90-day goal: "${baseline.ninetyDayGoal.slice(0, 70)}"`);
    if (b.length > 0) parts.push(`Baseline (${shortDate(baseline.date)}): ${b.join('; ')}.`);
  }
  const out = parts.join(' ');
  return out.length > 600 ? `${out.slice(0, 599)}…` : out;
}

// ── Fetch (RLS-scoped; used by AnalyticsCharts / contextLayer / PatientAISummary) ──

export interface OutcomeTrendData {
  points: CheckInPoint[];
  baseline: BaselineSummary | null;
}

/**
 * Last `limit` weekly check-ins (chronological) + latest parent baseline for a user.
 * Queries run as the signed-in session, so RLS scopes them to the caller's own
 * family (or a provider with granted access).
 */
export async function fetchOutcomeTrend(userId: string, limit = 8): Promise<OutcomeTrendData> {
  const [eventsRes, baselineRes] = await Promise.allSettled([
    supabase
      .from('outcome_events')
      .select('context, payload, recorded_at, created_at')
      .eq('user_id', userId)
      .eq('event_type', 'weekly_parent_checkin')
      .order('created_at', { ascending: false })
      // Over-fetch rows: same-week re-dos collapse to one point in mapCheckInRows
      .limit(limit * 3),
    supabase
      .from('clinical_outcomes')
      .select('interpretation, raw_score, created_at')
      .eq('user_id', userId)
      .eq('assessment_name', 'parent_baseline_assessment')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const eventRows = eventsRes.status === 'fulfilled' ? eventsRes.value.data : null;
  const baselineRow = baselineRes.status === 'fulfilled' ? baselineRes.value.data : null;
  return {
    // Most recent `limit` weekly points, chronological
    points: mapCheckInRows(eventRows || []).slice(-limit),
    baseline: parseBaselineRow(baselineRow),
  };
}
