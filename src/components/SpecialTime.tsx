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
 * - Today's idea is picked deterministically (date + age band + interest),
 *   with no repeats inside ~2 weeks (see src/content/special-time-ideas.ts).
 * - The 10-minute timer is optional and gentle — no alarm, no shame.
 * - The optional after-moment saves locally AND into the Wins Journal via the
 *   same make-server /wins/save path WinsJournal.tsx uses, so these memories
 *   appear among the parent's wins.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { trackEvent } from '../lib/analytics-tracker';
import {
  INTEREST_LABELS,
  SPECIAL_TIME_HISTORY_KEY,
  SPECIAL_TIME_INTEREST_KEY,
  ageBandForAge,
  dateKey,
  pickDailyIdea,
  peekTodaysIdea,
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

type Feeling = 'laughed' | 'calm' | 'not-today';

interface MomentRecord {
  date: string;
  ideaId: string;
  feeling: Feeling;
  note: string;
  savedAt: string;
  /** True once this day's moment has been posted to the Wins Journal. */
  winSynced: boolean;
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

/**
 * Resolve today's idea (peekTodaysIdea semantics) and RECORD it, so the pick
 * is stable across visits and feeds the 2-week no-repeat window. Pure
 * localStorage — no network.
 */
function resolveTodaysIdea(ageBand: AgeBand): SpecialTimeIdea {
  const today = dateKey();
  const history = readSpecialTimeHistory();
  const idea = peekTodaysIdea(ageBand);
  if (!history.some((e) => e.date === today && e.ideaId === idea.id)) {
    writeJson(SPECIAL_TIME_HISTORY_KEY, [...history, { date: today, ideaId: idea.id }].slice(-60));
  }
  return idea;
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
  const [idea, setIdea] = useState<SpecialTimeIdea>(() => resolveTodaysIdea(ageBand));

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
    // Re-pick today's idea for the new filter (replaces today's history entries)
    const history = readSpecialTimeHistory().filter((e) => e.date !== today);
    const fresh = pickDailyIdea({ ageBand, interest: next, excludeIds: recentSpecialTimeIdeaIds(history, today) });
    writeJson(SPECIAL_TIME_HISTORY_KEY, [...history, { date: today, ideaId: fresh.id }].slice(-60));
    setIdea(fresh);
  }

  function handleSomethingElse() {
    const history = readSpecialTimeHistory();
    const todaysIds = history.filter((e) => e.date === today).map((e) => e.ideaId);
    const next = pickDailyIdea({
      ageBand,
      interest,
      excludeIds: [...recentSpecialTimeIdeaIds(history, today), ...todaysIds],
      offset: todaysIds.length,
    });
    writeJson(SPECIAL_TIME_HISTORY_KEY, [...history, { date: today, ideaId: next.id }].slice(-60));
    setIdea(next);
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
    const content = saved.note.trim().length > 0
      ? saved.note.trim()
      : saved.feeling === 'laughed'
        ? `We laughed together during Special Time — ${idea.title}.`
        : `Ten calm minutes in ${kidPossessive} world — ${idea.title}.`;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId,
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
    if (!feeling) return;
    const trimmedNote = note.trim();
    const moments = loadMoments().filter((m) => m.date !== today);
    const alreadySynced = todaysMoment?.winSynced === true;
    const record: MomentRecord = {
      date: today,
      ideaId: idea.id,
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
            <span className="text-sm text-[#5A6B7A] dark:text-slate-400 bg-[#EDF4F7] dark:bg-slate-700 px-3 py-1 rounded-full">
              {idea.materials === 'none' ? 'Nothing needed' : 'Grab what you have'}
            </span>
          </div>

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
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-[#5A6B7A] dark:text-slate-300 transition-all hover:bg-[#F6FBFB] dark:hover:bg-slate-700 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Something else
          </button>
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
