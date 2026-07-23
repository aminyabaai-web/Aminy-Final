// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProgressHome — the one clean, motivating "Progress" home (Wave 2).
 *
 * Wins first, never critical. Pure composition of existing sources:
 *  - Wins: same make-server `/wins/load` endpoint the WinsJournal uses
 *  - Streak: the gentle StreakTracker + useStreakTracker (auto-pause, no shame)
 *  - Trend: WeeklyOutcomeTrend from AnalyticsCharts (real outcome_events data)
 *  - Goals: the same RLS-scoped `goals` query OutcomesTracking runs,
 *    framed as journeys — baseline → now → target, "% of the way"
 *
 * Motivating-not-critical rules enforced here:
 *  - No red for anything missed; no "declining" badges on goals
 *  - Percentages framed as journey progress ("62% of the way")
 *  - Stalled goals are NOT flagged here — the AI handles that privately in chat
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  Flag,
  Award,
  Sparkles,
  TrendingUp,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { StreakTracker } from './StreakTracker';
import { useStreakTracker } from '../hooks/useStreakTracker';
import { WeeklyOutcomeTrend } from './AnalyticsCharts';

// ── Types (mirroring the sources we compose — no new data infrastructure) ──

interface WinMoment {
  id: string;
  timestamp: string;
  content: string;
}

interface GoalRow {
  id: string;
  title: string | null;
  category: string | null;
  is_active: boolean;
  status: string | null;
  progress_percent: number | null;
  baseline_value: number | null;
  current_value: number | null;
  target_value: number | null;
}

interface ProgressHomeProps {
  userId: string;
  childName?: string;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

// ── Journey math — always 0–100, never negative, never a grade ──────────────

function journeyPercent(g: GoalRow): number {
  let pct = g.progress_percent;
  if (pct == null && g.baseline_value != null && g.target_value != null) {
    const span = g.target_value - g.baseline_value;
    if (span !== 0 && g.current_value != null) {
      pct = ((g.current_value - g.baseline_value) / span) * 100;
    }
  }
  if (pct == null || !Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Warm journey framing — "on the way", never a report card. */
function journeyLabel(pct: number): string {
  if (pct >= 100) return 'You made it — 100% of the way';
  if (pct === 0) return 'Just getting started — every journey begins here';
  return `${pct}% of the way`;
}

function relativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Component ───────────────────────────────────────────────────────────────

export function ProgressHome({ userId, childName, onBack, onNavigate }: ProgressHomeProps) {
  const name = childName || 'your child';
  const possessive = childName ? `${childName}'s` : "Your child's";

  // Streak — same gentle hook the dashboard uses (auto-pause, local + cloud)
  const streak = useStreakTracker(userId || null);

  // Wins — same server source as the WinsJournal
  const [wins, setWins] = useState<WinMoment[]>([]);
  const [winsLoading, setWinsLoading] = useState(true);

  // Goals — same RLS-scoped query OutcomesTracking runs
  const [activeGoals, setActiveGoals] = useState<GoalRow[]>([]);
  const [reachedCount, setReachedCount] = useState(0);
  const [goalsLoading, setGoalsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return; // signed-out / bypass — warm empty state
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/load`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        if (response.ok && !cancelled) {
          const data = await response.json();
          setWins((data.moments || []).slice(0, 3));
        }
      } catch {
        // Warm empty state — never an error wall
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setWinsLoading(false);
      }
    })();

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('goals')
          .select('id, title, category, is_active, status, progress_percent, baseline_value, current_value, target_value')
          .eq('user_id', user.id);
        if (!cancelled && data) {
          const rows = data as GoalRow[];
          setActiveGoals(rows.filter(g => g.is_active).slice(0, 5));
          setReachedCount(rows.filter(g => g.status === 'mastered' || g.status === 'completed').length);
        }
      } catch {
        // Warm empty state
      } finally {
        if (!cancelled) setGoalsLoading(false);
      }
    })();

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [userId]);

  const deeperLinks = [
    { screen: 'outcomes', label: 'Outcomes overview', icon: BarChart3 },
    { screen: 'weekly-insights', label: 'Weekly insights', icon: Sparkles },
    { screen: 'analytics-charts', label: 'Charts & trends', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-app dark:bg-slate-900 pb-24">
      {/* Sticky header — same bones as sibling screens */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-[#EDF4F7] dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5 text-[#3A4A57] dark:text-slate-200" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-semibold text-[#132F43] dark:text-white">Progress</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* (a) Warm header — validate first, inform second */}
        <div>
          <h2 className="text-2xl font-bold text-[#132F43] dark:text-white">
            {possessive} progress
          </h2>
          <p className="aminy-affirm dark:text-slate-300 mt-1">
            Look how far you&rsquo;ve come.
          </p>
        </div>

        {/* (b) WINS FIRST — the latest three, then everything else */}
        <section aria-labelledby="progress-wins-heading">
          <div className="flex items-center justify-between mb-3">
            <h3 id="progress-wins-heading" className="flex items-center gap-2 font-semibold text-[#132F43] dark:text-white">
              <Heart className="w-5 h-5 text-[#2A7D99]" aria-hidden="true" />
              Latest wins
            </h3>
            <button
              onClick={() => onNavigate('wins-journal')}
              className="text-sm font-medium text-[#2A7D99] dark:text-teal-300 hover:text-[#1F6080] px-2 py-1.5 rounded-lg hover:bg-[#2A7D99]/8 transition-colors"
              aria-label="See all wins in the Wins Journal"
            >
              See all wins
            </button>
          </div>

          {winsLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading your wins">
              {[0, 1].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
                  <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-700" />
                </Card>
              ))}
            </div>
          ) : wins.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-sm text-[#3A4A57] dark:text-slate-200">
                Your first win starts the collection.
              </p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                Small moments count — a calm transition, a new word, a shared laugh.
              </p>
              <button
                onClick={() => onNavigate('wins-journal')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#2A7D99] hover:bg-[#376E80] active:scale-[0.98] text-white text-sm font-semibold transition-colors"
                aria-label="Save your first win in the Wins Journal"
              >
                <Heart className="w-4 h-4" aria-hidden="true" />
                Save your first win
              </button>
            </Card>
          ) : (
            <div className="space-y-3">
              {wins.map(win => (
                <Card key={win.id} className="p-4">
                  <p className="text-sm text-[#3A4A57] dark:text-slate-200 leading-relaxed">
                    {win.content}
                  </p>
                  <p className="text-sm text-[#8A9BA8] dark:text-slate-400 mt-2">
                    {relativeTime(win.timestamp)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* (c) Consistency — the gentle streak (auto-pauses, never shames) */}
        <section aria-label="Your consistency">
          <StreakTracker
            currentStreak={streak.currentStreak}
            longestStreak={streak.longestStreak}
            isPaused={streak.isPaused}
            lastCheckIn={streak.hasActivityToday ? new Date().toISOString() : undefined}
          />
        </section>

        {/* (d) Weekly check-in trend — the honest one (real outcome_events data) */}
        <section aria-label="Weekly check-in trend">
          <WeeklyOutcomeTrend childName={name} />
        </section>

        {/* (e) Goals as journeys — baseline → now → target, always "on the way" */}
        <section aria-labelledby="progress-goals-heading">
          <h3 id="progress-goals-heading" className="flex items-center gap-2 font-semibold text-[#132F43] dark:text-white mb-3">
            <Flag className="w-5 h-5 text-[#2A7D99]" aria-hidden="true" />
            Goals on the way
          </h3>

          {goalsLoading ? (
            <Card className="p-4 animate-pulse" aria-busy="true" aria-label="Loading goals">
              <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
              <div className="h-2 w-full rounded bg-slate-100 dark:bg-slate-700" />
            </Card>
          ) : activeGoals.length === 0 && reachedCount === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-[#3A4A57] dark:text-slate-200">
                When you and your care team set goals, each one becomes a journey you can watch here — starting point to destination.
              </p>
              <button
                onClick={() => onNavigate('care-plan')}
                className="mt-3 text-sm font-medium text-[#2A7D99] dark:text-teal-300 hover:text-[#1F6080] inline-flex items-center gap-1 py-1.5 transition-colors"
                aria-label="Set up goals in My Plan"
              >
                Set up goals in My Plan
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeGoals.map(goal => {
                const pct = journeyPercent(goal);
                const goalTitle = goal.title || goal.category || 'Goal';
                return (
                  <Card key={goal.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-sm font-medium text-[#132F43] dark:text-white min-w-0">
                        {goalTitle}
                      </p>
                      <span className="text-sm font-semibold text-[#2A7D99] dark:text-teal-300 shrink-0">
                        {journeyLabel(pct)}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-2"
                      aria-label={`${goalTitle}: ${pct}% of the way from baseline to target`}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-[#8A9BA8] dark:text-slate-400">
                        Started{goal.baseline_value != null ? ` at ${goal.baseline_value}` : ''}
                      </span>
                      {goal.current_value != null && (
                        <span className="text-sm text-[#5A6B7A] dark:text-slate-300">
                          Now {goal.current_value}
                        </span>
                      )}
                      <span className="text-sm text-[#8A9BA8] dark:text-slate-400">
                        Goal{goal.target_value != null ? ` ${goal.target_value}` : ''}
                      </span>
                    </div>
                  </Card>
                );
              })}

              {reachedCount > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <Award className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {reachedCount} goal{reachedCount === 1 ? '' : 's'} already reached — part of {possessive} story now.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* (f) Quiet links to the deeper views — nothing here goes away */}
        <section aria-labelledby="progress-deeper-heading">
          <h3 id="progress-deeper-heading" className="text-sm font-semibold text-[#5A6B7A] dark:text-slate-400 uppercase tracking-wide mb-2">
            Go deeper
          </h3>
          <div className="space-y-2">
            {deeperLinks.map(({ screen, label, icon: Icon }) => (
              <button
                key={screen}
                onClick={() => onNavigate(screen)}
                className="w-full flex items-center gap-3 rounded-xl border border-[#E8E4DF] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 min-h-[44px] text-left shadow-sm hover:bg-[#F6FBFB] dark:hover:bg-slate-700/70 active:scale-[0.98] transition-all"
                aria-label={`Open ${label}`}
              >
                <div className="w-9 h-9 rounded-lg bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#577590] dark:text-slate-300" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <span className="flex-1 text-sm font-medium text-[#132F43] dark:text-slate-100">{label}</span>
                <ChevronRight className="w-4 h-4 text-[#8A9BA8]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        {/* Closing affirmation — the exhale */}
        <p className="aminy-affirm dark:text-slate-300 text-center px-4" style={{ fontSize: '1rem' }}>
          Progress isn&rsquo;t a straight line. Showing up is the win — and you keep showing up.
        </p>
      </div>
    </div>
  );
}

export default ProgressHome;
