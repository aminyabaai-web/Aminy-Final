// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * OutcomesStoryReport — the 90-day outcomes story a parent proudly shows their
 * provider. Built entirely from the family's OWN real data, warmly framed and
 * honestly gated.
 *
 * Data sources (all RLS-scoped to the signed-in caller):
 *  - Baseline:            clinical_outcomes (assessment_name 'parent_baseline_assessment')
 *                         via fetchOutcomeTrend → baseline
 *  - Weekly check-ins:    outcome_events (event_type 'weekly_parent_checkin')
 *                         via fetchOutcomeTrend → points (frequency/progress/confidence, 1–5)
 *  - Behavior trend:      behavior_logs bucketed by ISO week (last 90 days)
 *  - Screening timeline:  screening_results (M-CHAT-R/F, ASQ-3, PEDS milestones)
 *  - Wins:                wins journal (make-server /wins/load) — best-effort count
 *
 * Honesty rules:
 *  - Under 2 weekly check-ins → a gentle "your story is just beginning" state.
 *  - Every empty section hides rather than fabricating a number.
 *  - Demo mode (?demo=…) shows a seeded sample so walkthroughs never look empty;
 *    real accounts only ever see their own data.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, ArrowDown, ArrowUp, Minus, Heart, Share2, Loader2,
  CalendarCheck, TrendingUp, ClipboardList, Star, CheckCircle2, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { isDemoMode } from '../lib/demo-seed';
import {
  fetchOutcomeTrend,
  trendHeadline,
  trendDirection,
  shortBehaviorName,
  baselineFrequencyLabel,
  FREQUENCY_VALUE_LABELS,
  type CheckInPoint,
  type BaselineSummary,
} from '../lib/outcome-trends';

// ── Types ────────────────────────────────────────────────────────────────────

interface OutcomesStoryReportProps {
  childName?: string;
  childId?: string;
  /** Optional deep-link (same pattern as OutcomesTracking) — lets the empty
   *  state offer one concrete action instead of a dead end. */
  onNavigate?: (screen: string) => void;
}

interface WeekBar {
  label: string;   // "Wk 1"
  count: number;   // behavior logs that week
}

interface ScreeningMilestone {
  date: string;
  instrument: string;   // glossed, e.g. "M-CHAT-R/F"
  gloss: string;        // "autism screen"
  risk: 'low' | 'medium' | 'high' | string;
}

// ── Instrument glossary (never show a raw code to a parent) ────────────────────

const SCREENING_GLOSS: Record<string, { instrument: string; gloss: string }> = {
  mchat_rf: { instrument: 'M-CHAT-R/F', gloss: 'autism screen' },
  asq3: { instrument: 'ASQ-3', gloss: 'developmental screen' },
  peds: { instrument: 'PEDS', gloss: 'developmental screen' },
  custom: { instrument: 'Screening', gloss: 'wellbeing check' },
};

function glossScreening(type: string): { instrument: string; gloss: string } {
  return SCREENING_GLOSS[type] ?? { instrument: type.replace(/_/g, ' '), gloss: 'screening' };
}

const RISK_LABEL: Record<string, string> = {
  low: 'lower likelihood',
  medium: 'some signs to watch',
  high: 'worth a closer look',
};

// ── ISO-week bucketing for behavior_logs ───────────────────────────────────────

function bucketByWeek(dates: string[], weeks = 13): WeekBar[] {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const buckets: WeekBar[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * WEEK_MS;
    const start = end - WEEK_MS;
    const count = dates.filter((d) => {
      const t = new Date(d).getTime();
      return !Number.isNaN(t) && t > start && t <= end;
    }).length;
    buckets.push({ label: `Wk ${weeks - i}`, count });
  }
  return buckets;
}

// ── Demo seed (matches AnalyticsCharts demoTrendData shape) ─────────────────────

function demoStory(): {
  points: CheckInPoint[];
  baseline: BaselineSummary;
  behaviorWeeks: WeekBar[];
  screenings: ScreeningMilestone[];
  winsCount: number;
} {
  const week = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const mk = (weeksAgo: number, f: number, p: number, c: number): CheckInPoint => ({
    date: new Date(now - weeksAgo * week).toISOString(),
    frequency: f,
    progress: p,
    confidence: c,
  });
  return {
    points: [mk(12, 5, 1, 2), mk(10, 4, 2, 2), mk(8, 4, 3, 3), mk(6, 3, 3, 3), mk(4, 3, 4, 4), mk(2, 2, 4, 4), mk(0, 2, 5, 4)],
    baseline: {
      targetBehavior: 'Meltdowns during transitions',
      frequency: 'few_daily',
      intensity: 4,
      trigger: 'Transitions / changes in routine',
      ninetyDayGoal: 'Transitions with just a 5-minute warning',
      date: new Date(now - 12 * week).toISOString(),
    },
    behaviorWeeks: [
      { label: 'Wk 1', count: 9 }, { label: 'Wk 2', count: 8 }, { label: 'Wk 3', count: 7 },
      { label: 'Wk 4', count: 7 }, { label: 'Wk 5', count: 6 }, { label: 'Wk 6', count: 5 },
      { label: 'Wk 7', count: 5 }, { label: 'Wk 8', count: 4 }, { label: 'Wk 9', count: 4 },
      { label: 'Wk 10', count: 3 }, { label: 'Wk 11', count: 3 }, { label: 'Wk 12', count: 2 },
      { label: 'Wk 13', count: 2 },
    ],
    screenings: [
      { date: new Date(now - 12 * week).toISOString(), instrument: 'M-CHAT-R/F', gloss: 'autism screen', risk: 'medium' },
      { date: new Date(now - 2 * week).toISOString(), instrument: 'ASQ-3', gloss: 'developmental screen', risk: 'low' },
    ],
    winsCount: 14,
  };
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function first<T>(arr: T[]): T | undefined { return arr[0]; }
function last<T>(arr: T[]): T | undefined { return arr[arr.length - 1]; }

/**
 * Tracks the `.dark` class on <html>. Tailwind v4 is precompiled here, so SVG
 * grid strokes can't rely on `dark:` utilities that may not be in the bundle —
 * we resolve the color in JS instead (same approach as Dashboard10).
 */
function useIsDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// Grid stroke that reads clearly on white and on slate.
const gridStroke = (dark: boolean) => (dark ? '#334155' : '#e2e8f0');

// ── Main component ──────────────────────────────────────────────────────────────

export function OutcomesStoryReport({ childName, childId: _childId, onNavigate }: OutcomesStoryReportProps) {
  void _childId;
  const child = (childName && childName.trim()) || 'your child';
  const isDark = useIsDark();

  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CheckInPoint[]>([]);
  const [baseline, setBaseline] = useState<BaselineSummary | null>(null);
  const [behaviorWeeks, setBehaviorWeeks] = useState<WeekBar[]>([]);
  const [screenings, setScreenings] = useState<ScreeningMilestone[]>([]);
  const [winsCount, setWinsCount] = useState(0);
  const [isSample, setIsSample] = useState(false);

  // Share form
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isDemoMode()) {
          const d = demoStory();
          if (!cancelled) {
            setPoints(d.points);
            setBaseline(d.baseline);
            setBehaviorWeeks(d.behaviorWeeks);
            setScreenings(d.screenings);
            setWinsCount(d.winsCount);
            setIsSample(true);
          }
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const trend = await fetchOutcomeTrend(user.id, 13);
        if (cancelled) return;
        setPoints(trend.points);
        setBaseline(trend.baseline);

        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const [behaviorRes, screeningRes] = await Promise.allSettled([
          supabase
            .from('behavior_logs')
            .select('logged_at, is_positive')
            .eq('user_id', user.id)
            .gte('logged_at', since),
          supabase
            .from('screening_results')
            .select('screening_type, risk_level, completed_at, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
        ]);

        if (!cancelled && behaviorRes.status === 'fulfilled' && !behaviorRes.value.error) {
          const rows = (behaviorRes.value.data ?? []) as Array<{ logged_at?: string; is_positive?: boolean }>;
          // Story-relevant behavior = the incidents we want to see trend down.
          const incidentDates = rows.filter((r) => !r.is_positive).map((r) => r.logged_at || '').filter(Boolean);
          const bars = bucketByWeek(incidentDates, 13);
          // Only surface if there is anything to show.
          setBehaviorWeeks(bars.some((b) => b.count > 0) ? bars : []);
        }

        if (!cancelled && screeningRes.status === 'fulfilled' && !screeningRes.value.error) {
          const rows = (screeningRes.value.data ?? []) as Array<{
            screening_type?: string; risk_level?: string; completed_at?: string; created_at?: string;
          }>;
          setScreenings(
            rows.map((r) => {
              const g = glossScreening(r.screening_type || 'custom');
              return {
                date: r.completed_at || r.created_at || '',
                instrument: g.instrument,
                gloss: g.gloss,
                risk: r.risk_level || 'low',
              };
            }),
          );
        }

        // Wins — best-effort, never blocks the story.
        void loadWinsCount(user.id).then((n) => { if (!cancelled) setWinsCount(n); });
      } catch {
        // Leave whatever loaded; the empty state is honest.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWinsCount(_userId: string): Promise<number> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      // /wins/load derives the user from the session JWT (anon key gets a
      // 401). Best-effort as before: no session → no wins count.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return 0;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/load`,
        { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
      );
      if (!resp.ok) return 0;
      const data = await resp.json();
      return Array.isArray(data.moments) ? data.moments.length : 0;
    } catch {
      return 0;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Derived: the AI one-liner (WeeklyAISummary-style insight; static fallback) ──
  const aiLine = useMemo(() => buildInsightLine(points, baseline, child), [points, baseline, child]);

  // ── Loading ──
  if (loading && !isSample) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-32 rounded-2xl bg-[#EDF4F7] dark:bg-slate-800 animate-pulse" />
        <div className="h-24 rounded-2xl bg-[#EDF4F7] dark:bg-slate-800 animate-pulse" />
        <div className="h-48 rounded-2xl bg-[#EDF4F7] dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  // ── Honest empty state (< 2 weekly check-ins) ──
  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EDF4F7] dark:bg-slate-800 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-[#2A7D99]" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[#132F43] dark:text-white mb-2">
          {child}&apos;s story is just beginning
        </h3>
        <p className="text-sm text-[#5A6B7A] dark:text-slate-400 max-w-xs">
          Every routine and win you log becomes part of {child}&apos;s progress story.
          After two weekly check-ins you&apos;ll see how far you&apos;ve come, ready to share with your provider.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('wins-journal')}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#2A7D99] hover:bg-[#376E80] active:scale-[0.98] text-white text-sm font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Log today&apos;s win
          </button>
        )}
      </div>
    );
  }

  // ── Stat moments (baseline → now) ──
  const stats = buildStatMoments(points, baseline);
  const spanStart = baseline?.date || first(points)?.date;
  const rangeLabel = spanStart ? `${fmtDate(spanStart)} – ${fmtDate(last(points)?.date)}` : '';

  return (
    <div className="space-y-5">
      {isSample && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Showing a sample story. Yours fills in from your own check-ins.
        </div>
      )}

      {/* ── Hero: warm headline + honest trend subline + AI one-liner ── */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#EDF4F7] to-[#F6FBFB] dark:from-slate-800 dark:to-slate-700 border border-[#D6E6EC] dark:border-slate-700">
        <div className="flex items-center gap-2 text-[#2A7D99] dark:text-[#7BA7BC] mb-2">
          <Heart className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">Your 90-day story</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#132F43] dark:text-white leading-tight">
          90 days of showing up for {child}
        </h2>
        {rangeLabel && (
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
            {rangeLabel} · {points.length} weekly check-in{points.length === 1 ? '' : 's'}
          </p>
        )}
        <p className="text-[15px] text-[#3A4A57] dark:text-slate-200 mt-3">
          {trendHeadline(points, baseline)}
        </p>

        {/* AI one-liner */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-[#D6E6EC] dark:border-slate-700 p-3">
          <Sparkles className="w-4 h-4 text-[#2A7D99] dark:text-[#7BA7BC] mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-[#3A4A57] dark:text-slate-200">
            <span className="font-medium text-[#132F43] dark:text-white">Aminy&apos;s read: </span>
            {aiLine}
          </p>
        </div>
      </div>

      {/* ── Stat moments: baseline → now ── */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <StatMoment key={s.label} {...s} />
          ))}
        </div>
      )}

      {/* ── Trend chart: weekly check-ins (1–5) ── */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-[#132F43] dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2A7D99]" aria-hidden="true" />
            Weekly check-in trend
          </h3>
        </div>
        <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">
          Each week you rate goal progress and your own confidence from 1 to 5 (higher is better).
        </p>
        <CheckInLineChart points={points} dark={isDark} />
        <div className="flex items-center gap-4 justify-center mt-3">
          <LegendDot color="#2A7D99" label="Goal progress" />
          <LegendDot color="#6B9080" label="Your confidence" />
        </div>
      </section>

      {/* ── Behavior trend (behavior_logs by week) ── */}
      {behaviorWeeks.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 p-5">
          <h3 className="text-sm font-bold text-[#132F43] dark:text-white flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-[#2A7D99]" aria-hidden="true" />
            {shortBehaviorName(baseline?.targetBehavior) || 'Tracked behavior'} — logged each week
          </h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">
            How many times you logged this behavior each week. Fewer bars over time means calmer weeks.
          </p>
          <WeekBarChart bars={behaviorWeeks} dark={isDark} />
        </section>
      )}

      {/* ── Screening timeline ── */}
      {screenings.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 p-5">
          <h3 className="text-sm font-bold text-[#132F43] dark:text-white flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-[#2A7D99]" aria-hidden="true" />
            Screenings along the way
          </h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">
            Validated questionnaires you completed. These give your provider a shared starting point.
          </p>
          <ol className="space-y-3">
            {screenings.map((s, i) => (
              <li key={`${s.instrument}-${s.date}-${i}`} className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2A7D99] mt-1.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-[#132F43] dark:text-white">
                    {s.instrument} <span className="font-normal text-[#5A6B7A] dark:text-slate-400">({s.gloss})</span>
                  </p>
                  <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                    {fmtDate(s.date)} · {RISK_LABEL[s.risk] || s.risk}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Wins ── */}
      {winsCount > 0 && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-[#2A7D99]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{winsCount}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                win{winsCount === 1 ? '' : 's'} you saved and celebrated — moments worth remembering.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Share with provider ── */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 p-5">
        {!shareOpen ? (
          <button
            onClick={() => setShareOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2A7D99] hover:bg-[#246B84] text-white font-medium py-3 transition-colors"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            Share with your provider
          </button>
        ) : (
          <div>
            <label htmlFor="story-share-email" className="block text-sm font-medium text-[#132F43] dark:text-white mb-1">
              Provider&apos;s email
            </label>
            <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-3">
              We&apos;ll email a secure link to {child}&apos;s 90-day summary. The link expires in 7 days.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 rounded-xl border border-[#D6E6EC] dark:border-slate-600 bg-white dark:bg-slate-900 px-3">
                <Mail className="w-4 h-4 text-[#5A6B7A] dark:text-slate-400 flex-shrink-0" aria-hidden="true" />
                <input
                  id="story-share-email"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="provider@clinic.com"
                  className="flex-1 py-2.5 bg-transparent text-[#132F43] dark:text-white text-sm outline-none"
                />
              </div>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2A7D99] hover:bg-[#246B84] disabled:opacity-60 text-white font-medium px-5 py-2.5 transition-colors"
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                Send
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  // ── Share handler (client-only call to the existing report-share email route) ──
  async function handleShare() {
    const email = shareEmail.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    setSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to share');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const summary = buildShareSummary(points, baseline, child);
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/reports/share-direct`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipientEmail: email,
            childName: child,
            parentName: user?.user_metadata?.full_name || 'An Aminy parent',
            reportSummary: summary,
            message: `Here is ${child}'s 90-day outcomes story from Aminy.`,
          }),
        },
      );
      if (resp.ok) {
        toast.success(`Sent to ${email}`);
        setShareOpen(false);
        setShareEmail('');
      } else {
        toast.error('Could not send — email may not be configured yet');
      }
    } catch {
      toast.error('Something went wrong sending the report');
    } finally {
      setSharing(false);
    }
  }
}

// ── Stat moment card ────────────────────────────────────────────────────────────

interface StatMomentData {
  label: string;
  caption: string;
  fromLabel: string;
  toLabel: string;
  direction: 'up' | 'down' | 'flat';
  good: boolean;
}

function StatMoment({ label, caption, fromLabel, toLabel, direction, good }: StatMomentData) {
  const Arrow = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  const toneClass = direction === 'flat'
    ? 'text-[#5A6B7A] dark:text-slate-400'
    : good
      ? 'text-[#2A7D99] dark:text-[#7BA7BC]'
      : 'text-amber-600 dark:text-amber-400';
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 p-4">
      <p className="text-xs font-semibold text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-[#8A9BA8] dark:text-slate-500">{fromLabel}</span>
        <Arrow className={`w-4 h-4 ${toneClass}`} aria-hidden="true" />
        <span className={`text-base font-bold ${toneClass}`}>{toLabel}</span>
      </div>
      <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1.5">{caption}</p>
    </div>
  );
}

function buildStatMoments(points: CheckInPoint[], baseline: BaselineSummary | null): StatMomentData[] {
  const out: StatMomentData[] = [];
  const firstP = first(points);
  const lastP = last(points);
  if (!firstP || !lastP) return out;

  // 1) Behavior frequency: baseline (or first check-in) → latest. Lower is better.
  const startFreqLabel = baselineFrequencyLabel(baseline?.frequency)
    || (firstP.frequency != null ? FREQUENCY_VALUE_LABELS[firstP.frequency] : undefined);
  const endFreqLabel = lastP.frequency != null ? FREQUENCY_VALUE_LABELS[lastP.frequency] : undefined;
  if (startFreqLabel && endFreqLabel) {
    const dir = trendDirection(points.map((p) => p.frequency), true);
    out.push({
      label: 'How often it happens',
      caption: 'How often the target behavior shows up now vs. at the start.',
      fromLabel: startFreqLabel,
      toLabel: endFreqLabel,
      direction: dir === 'improving' ? 'down' : dir === 'watch' ? 'up' : 'flat',
      good: dir === 'improving',
    });
  }

  // 2) Goal progress: first → latest (/5). Higher is better.
  if (firstP.progress != null && lastP.progress != null) {
    const delta = lastP.progress - firstP.progress;
    out.push({
      label: 'Goal progress',
      caption: 'Your weekly rating of progress toward the 90-day goal (1–5).',
      fromLabel: `${firstP.progress}/5`,
      toLabel: `${lastP.progress}/5`,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      good: delta >= 0,
    });
  }

  // 3) Confidence: first → latest (/5). Higher is better.
  if (firstP.confidence != null && lastP.confidence != null) {
    const delta = lastP.confidence - firstP.confidence;
    out.push({
      label: 'Your confidence',
      caption: 'How confident you felt supporting your child each week (1–5).',
      fromLabel: `${firstP.confidence}/5`,
      toLabel: `${lastP.confidence}/5`,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      good: delta >= 0,
    });
  }

  // 4) Consistency: weeks showing up.
  out.push({
    label: 'Weeks showing up',
    caption: 'Consistent weekly check-ins — the habit that makes the trend real.',
    fromLabel: '0',
    toLabel: `${points.length}`,
    direction: 'up',
    good: true,
  });

  return out.slice(0, 4);
}

// ── AI one-liner (deterministic, WeeklyAISummary-style; the static fallback) ──

function buildInsightLine(points: CheckInPoint[], baseline: BaselineSummary | null, child: string): string {
  if (points.length < 2) return `${child}'s story fills in as you check in each week.`;
  const behavior = shortBehaviorName(baseline?.targetBehavior);
  const freq = trendDirection(points.map((p) => p.frequency), true);
  const prog = trendDirection(points.map((p) => p.progress), false);
  const conf = trendDirection(points.map((p) => p.confidence), false);

  const wins: string[] = [];
  if (freq === 'improving') wins.push(behavior ? `${behavior.toLowerCase()} is happening less often` : 'the hard moments are happening less often');
  if (prog === 'improving') wins.push('goal progress is climbing');
  if (conf === 'improving') wins.push('your confidence has grown');

  if (wins.length > 0) {
    const joined = wins.length === 1 ? wins[0] : `${wins.slice(0, -1).join(', ')} and ${wins[wins.length - 1]}`;
    return `Over these weeks, ${joined}. That is the kind of steady change a provider loves to see — bring this to your next visit.`;
  }
  if (freq === 'watch' || prog === 'watch') {
    return `It's been a bumpier stretch lately — that's real information, not failure. Sharing this with ${child}'s provider helps you adjust the plan together.`;
  }
  return `Things are holding steady, and consistency is exactly how lasting change takes root. Keep checking in — your provider can see the full picture here.`;
}

function buildShareSummary(points: CheckInPoint[], baseline: BaselineSummary | null, child: string): string {
  const lastP = last(points);
  const lines: string[] = [`${child} — 90-day outcomes summary`];
  if (baseline?.targetBehavior) lines.push(`Focus: ${baseline.targetBehavior}`);
  if (baseline?.ninetyDayGoal) lines.push(`90-day goal: ${baseline.ninetyDayGoal}`);
  lines.push(`${points.length} weekly check-ins recorded.`);
  if (lastP?.progress != null) lines.push(`Latest goal-progress rating: ${lastP.progress}/5.`);
  if (lastP?.confidence != null) lines.push(`Latest caregiver confidence: ${lastP.confidence}/5.`);
  return lines.join('\n');
}

// ── Charts (inline SVG; teal line / slate grid; dark-mode legible) ──

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-[#5A6B7A] dark:text-slate-400">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Weekly check-in line chart on a 1–5 scale. Two series: progress + confidence. */
function CheckInLineChart({ points, dark }: { points: CheckInPoint[]; dark: boolean }) {
  const W = 320, H = 150;
  const PAD = { top: 14, right: 14, bottom: 26, left: 26 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const minY = 1, maxY = 5;

  const xPos = (i: number) => PAD.left + (points.length <= 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);
  const yPos = (v: number) => PAD.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

  const series: Array<{ key: 'progress' | 'confidence'; color: string }> = [
    { key: 'progress', color: '#2A7D99' },
    { key: 'confidence', color: '#6B9080' },
  ];

  const pathFor = (key: 'progress' | 'confidence') => {
    const pts = points
      .map((p, i) => ({ i, v: p[key] }))
      .filter((d): d is { i: number; v: number } => d.v != null);
    if (pts.length === 0) return { line: '', dots: [] as Array<{ x: number; y: number }> };
    const line = pts.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${xPos(d.i).toFixed(1)} ${yPos(d.v).toFixed(1)}`).join(' ');
    return { line, dots: pts.map((d) => ({ x: xPos(d.i), y: yPos(d.v) })) };
  };

  const yTicks = [1, 2, 3, 4, 5];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly check-in ratings over time on a 1 to 5 scale">
      {/* Grid — stroke resolved in JS (precompiled Tailwind can't ship dark: SVG utils) */}
      <g>
        {yTicks.map((t) => (
          <line key={t} x1={PAD.left} y1={yPos(t)} x2={PAD.left + chartW} y2={yPos(t)} stroke={gridStroke(dark)} strokeWidth="1" />
        ))}
      </g>
      <g className="fill-slate-400">
        {yTicks.map((t) => (
          <text key={t} x={PAD.left - 6} y={yPos(t)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9 }}>
            {t}
          </text>
        ))}
      </g>

      {/* Series */}
      {series.map((s) => {
        const { line, dots } = pathFor(s.key);
        if (!line) return null;
        return (
          <g key={s.key}>
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            {dots.map((d, i) => (
              <g key={i}>
                <circle cx={d.x} cy={d.y} r={i === dots.length - 1 ? 4 : 2.5} fill={s.color} />
                {i === dots.length - 1 && <circle cx={d.x} cy={d.y} r={2} fill="white" />}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Behavior-per-week bar chart. Teal bars, slate baseline. */
function WeekBarChart({ bars, dark }: { bars: WeekBar[]; dark: boolean }) {
  const W = 320, H = 130;
  const PAD = { top: 12, right: 10, bottom: 24, left: 22 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxCount = Math.max(...bars.map((b) => b.count), 1);
  const slot = chartW / bars.length;
  const barW = Math.min(slot * 0.6, 20);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Behavior logs per week">
      <g>
        <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke={gridStroke(dark)} strokeWidth="1" />
      </g>
      {bars.map((b, i) => {
        const bH = (b.count / maxCount) * chartH;
        const bx = PAD.left + i * slot + (slot - barW) / 2;
        const by = PAD.top + chartH - bH;
        return (
          <g key={b.label}>
            <rect x={bx} y={by} width={barW} height={Math.max(bH, b.count > 0 ? 2 : 0)} rx={3} fill="#2A7D99" opacity={0.85} />
            {i % 2 === 0 && (
              <text x={bx + barW / 2} y={H - 6} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 8 }}>
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default OutcomesStoryReport;
