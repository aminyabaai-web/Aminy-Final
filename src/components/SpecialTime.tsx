// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Special Time — ten minutes of their world.
 *
 * A daily child-led play prompt. Deliberately NON-CLINICAL: no scoring, no
 * trials, no goals, no data pressure. The child leads, the parent follows,
 * laughter counts, and "not today" is a fully honored answer.
 *
 * AI-FIRST (Wave 1.5, owner decision): the idea shown is Aminy's pick for
 * this specific parent-child pair, generated server-side from the dyad
 * signals (age band, stored interest, recent feedback, parent energy). The
 * static library is invisible plumbing — the instant fallback when the AI
 * request takes >1.5s or fails. ONE idea is committed per request; we never
 * swap after render, and the UI never exposes which path served it.
 *
 * - The 10-minute timer is optional and gentle — no alarm, no shame.
 * - The optional after-moment saves locally AND into the Wins Journal via the
 *   same make-server /wins/save path WinsJournal.tsx uses, so these memories
 *   appear among the parent's wins.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  Laugh,
  Leaf,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { trackEvent } from '../lib/analytics-tracker';
import {
  INTEREST_LABELS,
  SPECIAL_TIME_HISTORY_KEY,
  SPECIAL_TIME_IDEAS,
  SPECIAL_TIME_INTEREST_KEY,
  ageBandForAge,
  dateKey,
  pickDailyIdea,
  readSpecialTimeHistory,
  readSpecialTimeInterest,
  recentSpecialTimeIdeaIds,
  type AgeBand,
  type InterestTag,
  type SpecialTimeIdea,
} from '../content/special-time-ideas';

// ---------------------------------------------------------------------------
// Local persistence (best-effort — Special Time must never crash on storage)
// ---------------------------------------------------------------------------

const MOMENTS_KEY = 'aminy-special-time-moments';
/** Today's AI-generated idea (so same-day reopens show the same idea instantly). */
const AI_IDEA_KEY = 'aminy-special-time-ai-idea';

type Feeling = 'laughed' | 'calm' | 'not-today';

interface MomentRecord {
  date: string;
  ideaId: string;
  /** Title at save time — AI ideas aren't in the static library. */
  ideaTitle?: string;
  /** Which path served the idea. Never shown to the parent. */
  source?: 'ai' | 'library';
  feeling: Feeling;
  note: string;
  savedAt: string;
  /** True once this day's moment has been posted to the Wins Journal. */
  winSynced: boolean;
}

/** The idea as rendered — identical shape whether AI-generated or library. */
interface DisplayIdea {
  id: string;
  title: string;
  oneLiner: string;
  whyItConnects: string;
  materials: 'none' | 'household';
  source: 'ai' | 'library';
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — Special Time still works, it just won't remember
  }
}

function loadMoments(): MomentRecord[] {
  const m = readJson<MomentRecord[]>(MOMENTS_KEY, []);
  return Array.isArray(m) ? m : [];
}

function toDisplayIdea(idea: SpecialTimeIdea): DisplayIdea {
  return {
    id: idea.id,
    title: idea.title,
    oneLiner: idea.oneLiner,
    whyItConnects: idea.whyItConnects,
    materials: idea.materials,
    source: 'library',
  };
}

function readTodaysAIIdea(): DisplayIdea | null {
  const stored = readJson<{ date?: string; idea?: DisplayIdea } | null>(AI_IDEA_KEY, null);
  if (!stored || stored.date !== dateKey() || !stored.idea) return null;
  const { id, title, oneLiner, whyItConnects } = stored.idea;
  if (typeof id !== 'string' || !title || !oneLiner || !whyItConnects) return null;
  return { ...stored.idea, materials: stored.idea.materials === 'none' ? 'none' : 'household', source: 'ai' };
}

/**
 * If today already has a committed idea, return it (same idea all day —
 * reopening never re-rolls). Returns null on the first open of the day, which
 * triggers the AI request + 1.5s fallback race.
 */
function resolveCommittedIdea(): DisplayIdea | null {
  const today = dateKey();
  const history = readSpecialTimeHistory();
  const todays = history.filter((e) => e.date === today);
  if (todays.length === 0) return null;
  const lastId = todays[todays.length - 1].ideaId;
  if (lastId.startsWith('ai-')) {
    const stored = readTodaysAIIdea();
    if (stored && stored.id === lastId) return stored;
  }
  const lib = SPECIAL_TIME_IDEAS.find((i) => i.id === lastId);
  return lib ? toDisplayIdea(lib) : null;
}

/** Record a committed idea in the shared history (feeds the no-repeat window). */
function recordIdea(idea: DisplayIdea): void {
  const today = dateKey();
  const history = readSpecialTimeHistory();
  if (!history.some((e) => e.date === today && e.ideaId === idea.id)) {
    writeJson(SPECIAL_TIME_HISTORY_KEY, [...history, { date: today, ideaId: idea.id }].slice(-60));
  }
  if (idea.source === 'ai') {
    writeJson(AI_IDEA_KEY, { date: today, idea });
  }
}

// ---------------------------------------------------------------------------
// Dyad inputs for the AI request (all best-effort localStorage reads)
// ---------------------------------------------------------------------------

/** Parent's own latest check-in, mirrored locally by StressCheckIn. */
function readParentState(): string | undefined {
  try {
    const raw = localStorage.getItem('aminy_parent_checkin_latest');
    if (!raw) return undefined;
    const local = JSON.parse(raw) as { level?: number; at?: string };
    if (typeof local.level !== 'number' || !local.at) return undefined;
    const days = (Date.now() - new Date(local.at).getTime()) / (24 * 60 * 60 * 1000);
    if (!Number.isFinite(days) || days < 0 || days > 2) return undefined;
    if (local.level <= 5) return undefined; // doing okay — no adjustment needed
    return local.level <= 7 ? 'stretched thin' : 'running on empty';
  } catch {
    return undefined;
  }
}

/** Ease tools the child keeps returning to (extra interest signal). */
function readLovedEaseTools(): string[] {
  try {
    const raw = localStorage.getItem('aminy-ease-parent-sessions');
    const sessions = raw ? (JSON.parse(raw) as Array<{ tool?: string; rating?: string | null }>) : [];
    if (!Array.isArray(sessions)) return [];
    const counts = new Map<string, { count: number; great: boolean }>();
    for (const s of sessions.slice(0, 40)) {
      if (!s?.tool) continue;
      const entry = counts.get(s.tool) ?? { count: 0, great: false };
      entry.count += 1;
      if (s.rating === 'great') entry.great = true;
      counts.set(s.tool, entry);
    }
    return [...counts.entries()]
      .filter(([, v]) => v.great || v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([tool]) => tool);
  } catch {
    return [];
  }
}

/** Last 5 after-moments as feedback for the generator. */
function readRecentFeedback(): Array<{ ideaTitle: string; feeling: Feeling; note?: string }> {
  return loadMoments()
    .slice(-5)
    .reverse()
    .map((m) => ({
      ideaTitle: m.ideaTitle || SPECIAL_TIME_IDEAS.find((i) => i.id === m.ideaId)?.title || '',
      feeling: m.feeling,
      note: m.note?.trim() ? m.note.trim().slice(0, 100) : undefined,
    }))
    .filter((f) => f.ideaTitle.length > 0);
}

/** Titles of recently shown ideas (library + AI) so the AI avoids repeats. */
function collectAvoidTitles(): string[] {
  const history = readSpecialTimeHistory();
  const recentIds = new Set([
    ...recentSpecialTimeIdeaIds(history, dateKey()),
    ...history.filter((e) => e.date === dateKey()).map((e) => e.ideaId),
  ]);
  const titles = new Set<string>();
  for (const id of recentIds) {
    const lib = SPECIAL_TIME_IDEAS.find((i) => i.id === id);
    if (lib) titles.add(lib.title);
  }
  const aiIdea = readTodaysAIIdea();
  if (aiIdea) titles.add(aiIdea.title);
  for (const m of loadMoments().slice(-10)) {
    if (m.ideaTitle) titles.add(m.ideaTitle);
  }
  return [...titles].slice(0, 15);
}

/** How long we give the AI before the static fallback renders (no swap after). */
const AI_WAIT_MS = 1500;

/**
 * Ask make-server for Aminy's personalized pick. Resolves null on any
 * failure — the caller races this against the 1.5s fallback timer. The
 * request carries the session JWT when signed in (anon key otherwise, which
 * the route rejects → instant fallback for unauthenticated sessions).
 */
async function fetchAIIdea(input: {
  childAge?: number;
  interest: InterestTag | null;
}): Promise<DisplayIdea | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || publicAnonKey;
    const interests = [
      ...(input.interest ? [INTEREST_LABELS[input.interest]] : []),
      ...readLovedEaseTools(),
    ];
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/special-time`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          childAge: input.childAge,
          interests,
          recentFeedback: readRecentFeedback(),
          parentState: readParentState(),
          avoidIds: collectAvoidTitles(),
        }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const idea = data?.idea;
    if (!idea || typeof idea.title !== 'string' || typeof idea.oneLiner !== 'string' || typeof idea.whyItConnects !== 'string') {
      return null;
    }
    if (!idea.title.trim() || !idea.oneLiner.trim() || !idea.whyItConnects.trim()) return null;
    return {
      id: `ai-${dateKey()}-${Date.now().toString(36)}`,
      title: idea.title.trim().slice(0, 60),
      oneLiner: idea.oneLiner.trim().slice(0, 400),
      whyItConnects: idea.whyItConnects.trim().slice(0, 300),
      materials: 'household',
      source: 'ai',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SpecialTimeProps {
  onBack: () => void;
  childName?: string;
  childAge?: number;
  userId?: string;
}

const TEN_MINUTES = 10 * 60;

const FEELING_OPTIONS: { id: Feeling; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: 'laughed', label: 'We laughed', icon: Laugh },
  { id: 'calm', label: 'It was calm', icon: Leaf },
  { id: 'not-today', label: "Not today — that's okay", icon: Moon },
];

export function SpecialTime({ onBack, childName, childAge, userId }: SpecialTimeProps) {
  const ageBand = ageBandForAge(childAge);
  const hasRealName = Boolean(childName?.trim()) && childName !== 'Your Child';
  const kidName = hasRealName ? (childName as string) : 'your child';
  const kidPossessive = hasRealName ? `${childName}'s` : "your child's";

  const [interest, setInterest] = useState<InterestTag | null>(() => readSpecialTimeInterest());
  // AI-first: null until today's idea is committed (same-day reopens resolve
  // instantly from the committed pick — one idea per request, never swapped).
  const [idea, setIdea] = useState<DisplayIdea | null>(() => resolveCommittedIdea());
  const [ideaLoading, setIdeaLoading] = useState(idea === null);
  const requestSeqRef = useRef(0);

  /**
   * Request Aminy's pick, racing the AI against a calm 1.5s shimmer. If the
   * AI wins, its idea is committed; otherwise the static fallback renders and
   * a late AI response is discarded (pick ONE — never swap after render).
   */
  async function requestIdea(nextInterest: InterestTag | null, staticOffset = 0) {
    const seq = ++requestSeqRef.current;
    setIdeaLoading(true);

    const aiPromise = fetchAIIdea({ childAge, interest: nextInterest }).catch(() => null);
    const winner = await Promise.race([
      aiPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_WAIT_MS)),
    ]);
    if (seq !== requestSeqRef.current) return; // superseded by a newer request

    let next: DisplayIdea;
    if (winner) {
      next = winner;
    } else {
      // Instant fallback — the invisible static library
      const history = readSpecialTimeHistory();
      const todaysIds = history.filter((e) => e.date === today).map((e) => e.ideaId);
      next = toDisplayIdea(
        pickDailyIdea({
          ageBand,
          interest: nextInterest,
          excludeIds: [...recentSpecialTimeIdeaIds(history, today), ...todaysIds],
          offset: staticOffset || todaysIds.length,
        })
      );
    }
    recordIdea(next);
    setIdea(next);
    setIdeaLoading(false);
  }

  // First open of the day: fetch Aminy's pick (fallback renders within 1.5s).
  useEffect(() => {
    if (idea === null && requestSeqRef.current === 0) {
      requestIdea(interest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle optional timer
  const [secondsLeft, setSecondsLeft] = useState(TEN_MINUTES);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');

  // After-moment
  const today = dateKey();
  const todaysMoment = useMemo(() => loadMoments().find((m) => m.date === today), [today]);
  const [feeling, setFeeling] = useState<Feeling | null>(todaysMoment?.feeling ?? null);
  const [note, setNote] = useState(todaysMoment?.note ?? '');
  const [savedFeeling, setSavedFeeling] = useState<Feeling | null>(todaysMoment?.feeling ?? null);
  const [savedNote, setSavedNote] = useState(todaysMoment?.note ?? '');
  // True only once the moment has actually landed in the Wins Journal — the
  // saved-state copy must never overclaim if the wins endpoint is unreachable.
  const [winSynced, setWinSynced] = useState(todaysMoment?.winSynced === true);

  useEffect(() => {
    if (timerState !== 'running') return;
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [timerState]);

  useEffect(() => {
    if (secondsLeft === 0 && timerState === 'running') setTimerState('done');
  }, [secondsLeft, timerState]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  function handleInterest(next: InterestTag | null) {
    if (next === interest) return;
    setInterest(next);
    writeJson(SPECIAL_TIME_INTEREST_KEY, next);
    // New filter → a fresh Aminy pick (static fallback honors the filter too)
    requestIdea(next);
  }

  function handleSomethingElse() {
    if (ideaLoading) return;
    // Reshuffle = regenerate, not next-in-list (static offset only on fallback)
    const todaysCount = readSpecialTimeHistory().filter((e) => e.date === today).length;
    requestIdea(interest, todaysCount);
  }

  /**
   * Post this moment to the Wins Journal using the exact WinsJournal.tsx save
   * path (make-server /wins/save, same moment shape) so it shows up among the
   * parent's wins. Best-effort: local save already succeeded before this runs.
   */
  async function syncToWins(saved: MomentRecord): Promise<boolean> {
    if (!userId) return false;
    const hour = new Date().getHours();
    const context = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'bedtime';
    const ideaTitle = saved.ideaTitle || 'Special Time';
    const content = saved.note.trim().length > 0
      ? saved.note.trim()
      : saved.feeling === 'laughed'
        ? `We laughed together during Special Time — ${ideaTitle}.`
        : `Ten calm minutes in ${kidPossessive} world — ${ideaTitle}.`;
    try {
      // /wins/save now requires the user's session JWT (server derives the
      // user from it). No session → skip the sync; winSynced stays false so a
      // later save can retry. The local save above already succeeded.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            moment: {
              id: `win_${Date.now()}`,
              userId,
              timestamp: saved.savedAt,
              content,
              context,
              mood: 'positive',
              tags: ['special time'],
            },
          }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async function handleSaveMoment() {
    if (!feeling || !idea) return;
    const trimmedNote = note.trim();
    const moments = loadMoments().filter((m) => m.date !== today);
    const alreadySynced = todaysMoment?.winSynced === true;
    const record: MomentRecord = {
      date: today,
      ideaId: idea.id,
      ideaTitle: idea.title,
      source: idea.source,
      feeling,
      note: trimmedNote,
      savedAt: new Date().toISOString(),
      winSynced: alreadySynced,
    };
    writeJson(MOMENTS_KEY, [...moments, record].slice(-90));
    setSavedFeeling(feeling);
    setSavedNote(trimmedNote);

    if (feeling === 'not-today') {
      toast.success("Noted, with zero guilt. Tomorrow's idea will be waiting.");
    } else {
      toast.success('Saved — a little joy on the record.');
      if (!alreadySynced) {
        const ok = await syncToWins(record);
        if (ok) {
          writeJson(MOMENTS_KEY, [...moments, { ...record, winSynced: true }].slice(-90));
          setWinSynced(true);
        }
      }
    }
    trackEvent('calm_moment_saved', {
      source: 'special-time',
      feeling,
      hasNote: trimmedNote.length > 0,
      ideaId: idea.id,
    }).catch(() => {});
  }

  const isDirty = feeling !== savedFeeling || note.trim() !== savedNote;
  const isSaved = savedFeeling !== null && !isDirty;

  return (
    <div className="min-h-screen bg-app dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-[#EDF4F7] dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-[#3A4A57] dark:text-slate-200" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#132F43] dark:text-slate-100">Special Time</h1>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Ten minutes of {kidPossessive} world</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* The promise — what this is (and isn't) */}
        <p className="text-sm text-[#3A4A57] dark:text-slate-300 leading-relaxed">
          No goals, no teaching, no fixing. {kidName === 'your child' ? 'Your child leads' : `${kidName} leads`}, you follow,
          and laughter counts double. That's the whole plan.
        </p>

        {/* Interest filter */}
        <div>
          <p className="text-sm font-medium text-[#5A6B7A] dark:text-slate-400 mb-2" id="special-time-interest-label">
            What are they into lately?
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-labelledby="special-time-interest-label">
            <button
              onClick={() => handleInterest(null)}
              aria-pressed={interest === null}
              className={`shrink-0 px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-all active:scale-[0.97] ${
                interest === null
                  ? 'bg-[#2A7D99] text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-[#5A6B7A] dark:text-slate-300 border border-[#E8E4DF] dark:border-slate-600'
              }`}
            >
              Anything
            </button>
            {(Object.keys(INTEREST_LABELS) as InterestTag[]).map((tag) => (
              <button
                key={tag}
                onClick={() => handleInterest(tag)}
                aria-pressed={interest === tag}
                className={`shrink-0 px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-all active:scale-[0.97] ${
                  interest === tag
                    ? 'bg-[#2A7D99] text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-[#5A6B7A] dark:text-slate-300 border border-[#E8E4DF] dark:border-slate-600'
                }`}
              >
                {INTEREST_LABELS[tag]}
              </button>
            ))}
          </div>
        </div>

        {/* Today's idea */}
        <section
          aria-label="Today's Special Time idea"
          className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E8E4DF] dark:border-slate-700 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#2A7D99] dark:text-teal-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Today's idea
            </span>
            {!ideaLoading && idea && (
              <span className="text-sm text-[#5A6B7A] dark:text-slate-400 bg-[#EDF4F7] dark:bg-slate-700 px-3 py-1 rounded-full">
                {idea.materials === 'none' ? 'Nothing needed' : 'Grab what you have'}
              </span>
            )}
          </div>

          {ideaLoading || !idea ? (
            // Calm shimmer (≤1.5s) while Aminy picks — then one idea, committed.
            <div data-testid="special-time-shimmer" aria-label="Finding today's idea" role="status">
              <div className="h-7 w-2/3 rounded-lg bg-[#EDF4F7] dark:bg-slate-700 mb-3" />
              <div className="h-4 w-full rounded bg-[#F1F5F7] dark:bg-slate-700/70 mb-2" />
              <div className="h-4 w-5/6 rounded bg-[#F1F5F7] dark:bg-slate-700/70 mb-4" />
              <div className="bg-[#F6FBFB] dark:bg-slate-700/50 rounded-xl p-3 border-l-4 border-[#D6E6EC] mb-4">
                <div className="h-4 w-3/4 rounded bg-[#EDF4F7] dark:bg-slate-700" />
              </div>
              <p className="text-sm text-[#8A9BA8] dark:text-slate-500 text-center mb-1">
                Finding ten minutes of {kidPossessive} world...
              </p>
            </div>
          ) : (
            <>
              <h2
                className="text-2xl text-[#132F43] dark:text-slate-100 mb-2"
                style={{ fontFamily: "'Fredoka', 'Schibsted Grotesk', sans-serif", fontWeight: 600, lineHeight: 1.2 }}
              >
                {idea.title}
              </h2>
              <p className="text-[#3A4A57] dark:text-slate-300 leading-relaxed mb-4">{idea.oneLiner}</p>

              <div className="bg-[#F6FBFB] dark:bg-slate-700/50 rounded-xl p-3 border-l-4 border-[#2A7D99] mb-4">
                <p className="text-sm text-[#3A4A57] dark:text-slate-300 italic leading-relaxed">{idea.whyItConnects}</p>
              </div>

              <button
                onClick={handleSomethingElse}
                disabled={ideaLoading}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-[#5A6B7A] dark:text-slate-300 transition-all hover:bg-[#F6FBFB] dark:hover:bg-slate-700 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Something else
              </button>
            </>
          )}
        </section>

        {/* Gentle timer */}
        <section
          aria-label="Optional ten minute timer"
          className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E8E4DF] dark:border-slate-700 shadow-sm p-5 text-center"
        >
          {timerState === 'idle' && (
            <>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-3 leading-relaxed">
                A timer, only if it helps. No alarm at the end — just a gentle note.
              </p>
              <button
                onClick={() => { setSecondsLeft(TEN_MINUTES); setTimerState('running'); }}
                className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[#2A7D99] hover:bg-[#1F6080] px-4 py-3 font-semibold text-white shadow-md transition-all active:scale-[0.98]"
              >
                <Play className="w-5 h-5" aria-hidden="true" />
                Start ten minutes
              </button>
            </>
          )}

          {(timerState === 'running' || timerState === 'paused') && (
            <>
              <p
                className="text-5xl font-semibold text-[#132F43] dark:text-slate-100 mb-1"
                style={{ fontVariantNumeric: 'tabular-nums' }}
                role="timer"
                aria-label={`${minutes} minutes ${seconds} seconds remaining`}
              >
                {minutes}:{seconds}
              </p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">
                {timerState === 'paused' ? 'Paused — take all the time you need.' : 'Their world, their pace.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimerState(timerState === 'running' ? 'paused' : 'running')}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-[#3A4A57] dark:text-slate-200 transition-all hover:bg-[#F6FBFB] dark:hover:bg-slate-700 active:scale-[0.98]"
                >
                  {timerState === 'running' ? (
                    <><Pause className="w-4 h-4" aria-hidden="true" />Pause</>
                  ) : (
                    <><Play className="w-4 h-4" aria-hidden="true" />Resume</>
                  )}
                </button>
                <button
                  onClick={() => { setTimerState('idle'); setSecondsLeft(TEN_MINUTES); }}
                  className="flex-1 min-h-[44px] rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-[#5A6B7A] dark:text-slate-300 transition-all hover:bg-[#F6FBFB] dark:hover:bg-slate-700 active:scale-[0.98]"
                >
                  Stop — that's fine
                </button>
              </div>
            </>
          )}

          {timerState === 'done' && (
            <>
              <p
                className="text-xl text-[#132F43] dark:text-slate-100 mb-1"
                style={{ fontFamily: "'Fredoka', 'Schibsted Grotesk', sans-serif", fontWeight: 500 }}
              >
                That was ten minutes of their world.
              </p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">
                Keep going if it's flowing — this clock doesn't boss anyone around.
              </p>
              <button
                onClick={() => { setTimerState('idle'); setSecondsLeft(TEN_MINUTES); }}
                className="w-full min-h-[44px] rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-[#5A6B7A] dark:text-slate-300 transition-all hover:bg-[#F6FBFB] dark:hover:bg-slate-700 active:scale-[0.98]"
              >
                Reset timer
              </button>
            </>
          )}
        </section>

        {/* After-moment — entirely optional */}
        <section
          aria-label="How did it feel"
          className="bg-white dark:bg-slate-800 rounded-2xl border border-[#E8E4DF] dark:border-slate-700 shadow-sm p-5"
        >
          <h2 className="font-semibold text-[#132F43] dark:text-slate-100 mb-1 flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#2A7D99]" aria-hidden="true" />
            Afterward — only if you feel like it
          </h2>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">One tap, no wrong answers.</p>

          <div className="space-y-2 mb-4" role="group" aria-label="How did it feel?">
            {FEELING_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = feeling === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setFeeling(selected ? null : option.id)}
                  aria-pressed={selected}
                  className={`w-full min-h-[52px] flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                    selected
                      ? 'border-[#2A7D99] bg-[#2A7D99]/10'
                      : 'border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-[#F6FBFB] dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${selected ? 'text-[#2A7D99]' : 'text-[#5A6B7A] dark:text-slate-400'}`}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className={`flex-1 text-sm font-medium ${selected ? 'text-[#2A7D99] dark:text-teal-200' : 'text-[#132F43] dark:text-slate-100'}`}>
                    {option.label}
                  </span>
                  {selected && <Check className="w-4 h-4 text-[#2A7D99] shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {feeling === 'not-today' && (
            <p className="text-sm text-[#3A4A57] dark:text-slate-300 italic leading-relaxed mb-4">
              Some days don't have room, and that's truly okay. The idea will wait for you.
            </p>
          )}

          {feeling !== null && feeling !== 'not-today' && (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={160}
              placeholder="One line to remember it by (optional)"
              aria-label="Optional memory note"
              className="w-full rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 text-base mb-4 focus:border-[#2A7D99] focus:ring-2 focus:ring-[#2A7D99]/20"
            />
          )}

          {feeling !== null && (
            <button
              onClick={handleSaveMoment}
              disabled={isSaved}
              className={`w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all active:scale-[0.98] ${
                isSaved
                  ? 'bg-[#EDF4F7] dark:bg-slate-700 text-[#5A6B7A] dark:text-slate-300'
                  : 'bg-[#132F43] text-white shadow-md'
              }`}
            >
              {isSaved ? (
                <><Check className="w-5 h-5" aria-hidden="true" />Saved for today</>
              ) : feeling === 'not-today' ? (
                'Close the day gently'
              ) : (
                'Keep this moment'
              )}
            </button>
          )}

          {isSaved && savedFeeling !== 'not-today' && (
            <p className="text-sm text-[#5A6B7A] dark:text-slate-400 text-center mt-3">
              {winSynced
                ? "It's in your Wins Journal now, with all the other good ones."
                : 'Saved on this device — these little moments add up.'}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default SpecialTime;
