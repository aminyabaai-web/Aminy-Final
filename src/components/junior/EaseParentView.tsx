// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * EaseParentView — Parent window into the Ease (Junior) experience
 *
 * Connection-first caregiver context (deliberately NOT a therapy dashboard):
 * 1. "Ease insights" toggle shows:
 *    - What the child loves about each activity + how to join in
 *    - How many minutes the child has been in Ease today
 *    - A warm observation prompt ("What made them smile?")
 *    - Quick log: "I noticed..." text field saved to session notes
 * 2. After child uses any Ease tool: prompt "How did that go?" (1-tap: great/ok/rough)
 * 3. Weekly report: which tools they returned to, total time, parent ratings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, EyeOff, Clock, MessageSquare, ChevronDown, ChevronUp,
  BarChart3, ThumbsUp, Minus, ThumbsDown, CheckCircle, X, Heart, Sparkles, Users
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { playTap, haptic } from './activities/sounds';

// ============================================
// TYPES
// ============================================

export type SessionRating = 'great' | 'ok' | 'rough';

export interface EaseSessionEntry {
  timestamp: string;
  tool: string;
  toolEmoji: string;
  durationMinutes: number;
  rating: SessionRating | null;
  parentNote: string;
}

export interface EaseParentViewProps {
  childName?: string;
  isParentView: boolean;
  onToggleParentView: () => void;
  lastToolUsed?: string;
  lastToolEmoji?: string;
  onRateSession?: (rating: SessionRating) => void;
}

// ============================================
// ACTIVITY CONNECTION MAP
// ============================================
// Connection-lite framing, not a therapy lens. Field identifiers are kept
// for compatibility with earlier session data/consumers:
//   goal           → "What they love about this"
//   whatToObserve  → "Try joining in"
//   therapistTip   → "Worth noticing" (a warm observation prompt)

const GOAL_MAP: Record<string, { goal: string; whatToObserve: string; therapistTip: string }> = {
  'calm-corner': {
    goal: 'A cozy spot to land when feelings get big — a place that is all theirs.',
    whatToObserve: 'Sit nearby and breathe slowly together. Calm company says more than words.',
    therapistTip: 'What helped them settle today? What made them smile once the storm passed?',
  },
  'breathing': {
    goal: 'The slow rhythm and gentle visuals feel soothing — like blowing bubbles in slow motion.',
    whatToObserve: 'Breathe along with them, out loud and a little dramatic. Kids love when grown-ups play too.',
    therapistTip: 'Did their shoulders drop? What did they want to do right after?',
  },
  'bubble-wrap': {
    goal: 'Popping things is deeply satisfying — little bursts that feel great under busy fingers.',
    whatToObserve: 'Grab a corner and pop along. Take turns, race, or find rhythms together.',
    therapistTip: 'What made them laugh? Which pops got the biggest reaction?',
  },
  'pop-it': {
    goal: 'Something to keep hands happy — the textures and clicks are their own kind of fun.',
    whatToObserve: 'Ask them to show you their favorite pattern — being the expert feels great.',
    therapistTip: 'When do they reach for it? What were they enjoying most?',
  },
  'transition': {
    goal: 'Knowing what comes next feels safe — the countdown makes change less of a surprise.',
    whatToObserve: 'Turn the countdown into a mini game: "Can we hop to the door before the timer?"',
    therapistTip: 'What made the switch easier today? Did anything spark a giggle on the way?',
  },
  'rewards': {
    goal: 'Watching stars add up toward something they picked — progress they can see and feel proud of.',
    whatToObserve: 'Celebrate the stars out loud together. Let them tell you what they are saving for.',
    therapistTip: 'What are they most excited to earn? What story did they tell about today\'s stars?',
  },
  'daily-mission': {
    goal: 'A little quest that is all theirs — kids love checking things off their own list.',
    whatToObserve: 'Ask "what\'s your mission today?" and cheer the attempt, not just the finish.',
    therapistTip: 'What part did they want to tell you about? What lit them up?',
  },
  'fidget': {
    goal: 'Busy hands, happy brain — spinning and squishing just feels good.',
    whatToObserve: 'Try it yourself and compare favorites. A shared fidget moment is a tiny connection.',
    therapistTip: 'Which one do they keep coming back to? What mood follows?',
  },
  default: {
    goal: 'Play they chose themselves — following what they love is the fastest way into their world.',
    whatToObserve: 'Join in on their terms: copy what they do, let them lead, keep it light.',
    therapistTip: 'What made them smile today? What would they want to show you?',
  },
};

function getGoalInfo(tool: string) {
  const key = Object.keys(GOAL_MAP).find(k => tool.toLowerCase().includes(k)) || 'default';
  return GOAL_MAP[key];
}

// ============================================
// SESSION LOG
// ============================================

const EASE_SESSION_KEY = 'aminy-ease-parent-sessions';
const EASE_TIME_KEY = 'aminy-ease-today-minutes';

function loadSessions(): EaseSessionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(EASE_SESSION_KEY) || '[]');
  } catch { return []; }
}

function saveSessions(sessions: EaseSessionEntry[]) {
  try {
    localStorage.setItem(EASE_SESSION_KEY, JSON.stringify(sessions.slice(0, 100)));
  } catch { /* */ }
}

function getTodayMinutes(): number {
  try {
    const raw = localStorage.getItem(EASE_TIME_KEY);
    if (!raw) return 0;
    const { date, minutes } = JSON.parse(raw);
    if (date === new Date().toISOString().slice(0, 10)) return minutes;
    return 0;
  } catch { return 0; }
}

function addTodayMinutes(mins: number) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const current = getTodayMinutes();
    localStorage.setItem(EASE_TIME_KEY, JSON.stringify({ date: today, minutes: current + mins }));
  } catch { /* */ }
}

export function logEaseSession(tool: string, emoji: string, durationMinutes: number) {
  const sessions = loadSessions();
  const entry: EaseSessionEntry = {
    timestamp: new Date().toISOString(),
    tool,
    toolEmoji: emoji,
    durationMinutes,
    rating: null,
    parentNote: '',
  };
  sessions.unshift(entry);
  saveSessions(sessions);
  addTodayMinutes(durationMinutes);
}

export function updateLastSessionRating(rating: SessionRating, note: string = '') {
  const sessions = loadSessions();
  if (sessions.length > 0) {
    sessions[0].rating = rating;
    sessions[0].parentNote = note;
    saveSessions(sessions);
  }
}

// ============================================
// MOOD TREND (reads MoodJournal's localStorage)
// ============================================

// MoodJournal stores its check-in state under this key (see MoodJournal.tsx STORAGE_KEY).
const MOOD_CHECKIN_KEY = 'aminy-ease-checkin';

// MoodJournal's MOOD_FACES scale: 5=Great, 4=Good, 3=Okay, 2=Not great, 1=Tough.
// Text labels (not emoji) — this is a parent surface.
const MOOD_LABELS: Record<number, string> = { 5: 'Great', 4: 'Good', 3: 'Okay', 2: 'Not great', 1: 'Tough' };

interface StoredMoodEntry { date: string; mood: number }

function loadMoodMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MOOD_CHECKIN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { moods?: StoredMoodEntry[] };
    const map: Record<string, number> = {};
    for (const m of parsed.moods || []) {
      if (typeof m?.mood === 'number' && typeof m?.date === 'string') map[m.date] = m.mood;
    }
    return map;
  } catch { return {}; }
}

function last14DaysKeys(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

function MoodTrendChart({ childName }: { childName: string }) {
  const moodMap = loadMoodMap();
  const days = last14DaysKeys();
  const hasData = days.some(d => moodMap[d] != null);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#94a3b8' : '#8A9BA8';
  const gridColor = isDark ? '#334155' : '#EEF2F4';

  const chartData = days.map(d => ({
    label: new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    // recharts skips null y-values, leaving gaps for days with no check-in (honest).
    mood: moodMap[d] ?? null,
  }));

  return (
    <div className="rounded-2xl p-3 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-600 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-[#2A7D99]" />
        <h3 className="font-bold text-[#132F43] dark:text-slate-100 text-sm">{childName}'s mood — last 14 days</h3>
      </div>

      {!hasData ? (
        <p className="text-sm text-[#8A9BA8] dark:text-slate-400 text-center py-6">No mood check-ins yet</p>
      ) : (
        <>
          <div className="w-full" style={{ height: 144 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: axisColor }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  tickFormatter={(v: number) => String(v)}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    background: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#e2e8f0' : '#132F43',
                  }}
                  formatter={(value) => {
                    const n = Number(value);
                    return [`${MOOD_LABELS[n] ?? ''} (${n}/5)`, 'Mood'] as [string, string];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#2A7D99"
                  strokeWidth={2.5}
                  connectNulls
                  dot={{ r: 3, fill: '#2A7D99', stroke: isDark ? '#1e293b' : '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-sm text-[#8A9BA8] dark:text-slate-400 text-center">
            From {childName}'s daily check-ins
          </p>
        </>
      )}
    </div>
  );
}

// ============================================
// WEEKLY REPORT
// ============================================

function WeeklyReport({ sessions }: { sessions: EaseSessionEntry[] }) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekSessions = sessions.filter(s => new Date(s.timestamp) > weekAgo);

  // Tool usage count
  const toolCounts: Record<string, { count: number; emoji: string; minutes: number }> = {};
  let totalMinutes = 0;
  let greatCount = 0, okCount = 0, roughCount = 0;

  for (const s of weekSessions) {
    if (!toolCounts[s.tool]) toolCounts[s.tool] = { count: 0, emoji: s.toolEmoji, minutes: 0 };
    toolCounts[s.tool].count++;
    toolCounts[s.tool].minutes += s.durationMinutes;
    totalMinutes += s.durationMinutes;
    if (s.rating === 'great') greatCount++;
    else if (s.rating === 'ok') okCount++;
    else if (s.rating === 'rough') roughCount++;
  }

  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-[#132F43] text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-[#2A7D99]" />
        This week in Ease
      </h3>

      {weekSessions.length === 0 ? (
        <p className="text-sm text-[#8A9BA8] text-center py-4">No sessions logged this week yet</p>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#EDF4F7] rounded-xl p-3 text-center">
              <p className="text-sm text-[#5A6B7A]">Sessions</p>
              <p className="text-xl font-black text-[#132F43]">{weekSessions.length}</p>
            </div>
            <div className="bg-[#EDF4F7] rounded-xl p-3 text-center">
              <p className="text-sm text-[#5A6B7A]">Total time</p>
              <p className="text-xl font-black text-[#2A7D99]">{totalMinutes}m</p>
            </div>
            <div className="bg-[#EDF4F7] rounded-xl p-3 text-center">
              <p className="text-sm text-[#5A6B7A]">Avg/day</p>
              <p className="text-xl font-black text-[#132F43]">{Math.round(totalMinutes / 7)}m</p>
            </div>
          </div>

          {/* Parent ratings */}
          {(greatCount + okCount + roughCount) > 0 && (
            <div className="bg-[#F6FBFB] rounded-xl p-3">
              <p className="text-sm font-semibold text-[#5A6B7A] mb-2">Session ratings</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-sm font-bold text-green-600">{greatCount}</span>
                  <span className="text-sm text-[#8A9BA8]">great</span>
                </div>
                <div className="flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600">{okCount}</span>
                  <span className="text-sm text-[#8A9BA8]">ok</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-sm font-bold text-red-600">{roughCount}</span>
                  <span className="text-sm text-[#8A9BA8]">rough</span>
                </div>
              </div>
            </div>
          )}

          {/* Top tools */}
          {topTools.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[#5A6B7A] mb-2">What they kept coming back to</p>
              <div className="space-y-1.5">
                {topTools.map(([tool, data]) => (
                  <div key={tool} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                    <Sparkles className="w-4 h-4 text-[#2A7D99] shrink-0" />
                    <span className="text-sm font-medium text-[#3A4A57] flex-1 capitalize">{tool}</span>
                    <span className="text-sm text-[#8A9BA8]">{data.count}x · {data.minutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// POST-SESSION RATING PROMPT
// ============================================

export function PostSessionRatingPrompt({
  tool,
  toolEmoji,
  onRate,
  onDismiss,
}: {
  tool: string;
  toolEmoji: string;
  onRate: (rating: SessionRating, note: string) => void;
  onDismiss: () => void;
}) {
  const [note, setNote] = useState('');
  const [rated, setRated] = useState<SessionRating | null>(null);

  const handleRate = (rating: SessionRating) => {
    setRated(rating);
    haptic([30, 20, 40]);
    updateLastSessionRating(rating, note);
    onRate(rating, note);
    setTimeout(() => onDismiss(), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
    >
      <div className="bg-white rounded-t-3xl shadow-2xl p-5"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{toolEmoji}</span>
            <div>
              <p className="font-bold text-[#132F43] text-sm">How did that go?</p>
              <p className="text-sm text-[#8A9BA8] capitalize">{tool} session</p>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1.5 rounded-full bg-[#EDF4F7]">
            <X className="w-4 h-4 text-[#8A9BA8]" />
          </button>
        </div>

        {!rated ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { id: 'great' as SessionRating, emoji: '😊', label: 'Great', color: '#10B981' },
                { id: 'ok' as SessionRating, emoji: '😐', label: 'OK', color: '#F59E0B' },
                { id: 'rough' as SessionRating, emoji: '😤', label: 'Rough', color: '#EF4444' },
              ]).map(r => (
                <motion.button
                  key={r.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleRate(r.id)}
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2"
                  style={{ borderColor: `${r.color}44`, background: `${r.color}11` }}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-sm font-bold" style={{ color: r.color }}>{r.label}</span>
                </motion.button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="I noticed... (optional)"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#E8E4DF] focus:outline-none focus:border-indigo-300"
              />
            </div>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-4"
          >
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-[#3A4A57]">Saved! Thanks for the note.</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// PARENT VIEW PANEL
// ============================================

export function EaseParentView({
  childName = 'your child',
  isParentView,
  onToggleParentView,
  lastToolUsed,
  onRateSession,
}: EaseParentViewProps) {
  const [sessions] = useState<EaseSessionEntry[]>(loadSessions);
  const [todayMinutes] = useState(getTodayMinutes);
  const [activeSection, setActiveSection] = useState<'goals' | 'report' | 'notes' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Fall back to the most recent logged session when no explicit tool is passed
  // (e.g. when mounted from the Grown-up settings screen).
  const effectiveLastTool = lastToolUsed ?? sessions[0]?.tool;
  const goalInfo = effectiveLastTool ? getGoalInfo(effectiveLastTool) : getGoalInfo('default');

  const handleSaveNote = useCallback(() => {
    if (!noteText.trim()) return;
    updateLastSessionRating('ok', noteText);
    setNoteSaved(true);
    setNoteText('');
    setTimeout(() => setNoteSaved(false), 2000);
  }, [noteText]);

  const toggleSection = (section: typeof activeSection) => {
    setActiveSection(prev => prev === section ? null : section);
    playTap();
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => { onToggleParentView(); playTap(); haptic(20); }}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all"
        style={{
          background: isParentView ? '#2A7D99' : 'rgba(255,255,255,0.8)',
          color: isParentView ? 'white' : '#4B5563',
          border: isParentView ? 'none' : '1px solid rgba(0,0,0,0.1)',
        }}
        aria-expanded={isParentView}
      >
        {isParentView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        {isParentView ? 'Hide Ease insights' : 'Show Ease insights'}
      </motion.button>

      {/* Parent View Panel */}
      <AnimatePresence>
        {isParentView && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 rounded-3xl overflow-hidden shadow-xl"
            style={{ background: 'white', border: '1px solid rgba(42,125,153,0.2)' }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3"
              style={{ background: 'linear-gradient(135deg, #F6FBFB, #EDF4F7)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-[#132F43] text-base">{childName}'s Ease time</h3>
                  <p className="text-sm text-[#2A7D99]">A window into their world</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-[#2A7D99]" />
                  <span className="text-sm font-bold text-[#2A7D99]">{todayMinutes}m today</span>
                </div>
              </div>

              {/* Current tool info */}
              {effectiveLastTool && (
                <div className="mt-3 flex items-center gap-2 bg-white/60 rounded-2xl px-3 py-2">
                  <Sparkles className="w-5 h-5 text-[#2A7D99] shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#3A4A57] capitalize">{effectiveLastTool}</p>
                    <p className="text-sm text-[#8A9BA8]">Last played</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mood trend — surfaced prominently for parents */}
            <div className="px-4 pt-4">
              <MoodTrendChart childName={childName} />
            </div>

            {/* Sections */}
            <div className="divide-y divide-gray-100">

              {/* Inside this activity — connection framing, not therapy */}
              <button
                onClick={() => toggleSection('goals')}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#2A7D99]" />
                  <span className="text-sm font-semibold text-[#3A4A57]">Inside this activity</span>
                </div>
                {activeSection === 'goals' ? <ChevronUp className="w-4 h-4 text-[#8A9BA8]" /> : <ChevronDown className="w-4 h-4 text-[#8A9BA8]" />}
              </button>
              <AnimatePresence>
                {activeSection === 'goals' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="bg-[#EDF4F7] rounded-2xl p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Heart className="w-4 h-4 text-[#2A7D99] mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-bold text-[#132F43]">What they love about this</p>
                        </div>
                        <p className="text-sm text-[#3A4A57] ml-6">{goalInfo.goal}</p>
                      </div>
                      <div className="bg-[#EDF4F7] rounded-2xl p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Users className="w-4 h-4 text-[#2A7D99] mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-bold text-[#132F43]">Try joining in</p>
                        </div>
                        <p className="text-sm text-[#3A4A57] ml-6">{goalInfo.whatToObserve}</p>
                      </div>
                      <div className="bg-[#EDF4F7] rounded-2xl p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Eye className="w-4 h-4 text-[#2A7D99] mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-bold text-[#132F43]">Worth noticing</p>
                        </div>
                        <p className="text-sm text-[#3A4A57] ml-6">{goalInfo.therapistTip}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick log */}
              <button
                onClick={() => toggleSection('notes')}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2A7D99]" />
                  <span className="text-sm font-semibold text-[#3A4A57]">I noticed...</span>
                </div>
                {activeSection === 'notes' ? <ChevronUp className="w-4 h-4 text-[#8A9BA8]" /> : <ChevronDown className="w-4 h-4 text-[#8A9BA8]" />}
              </button>
              <AnimatePresence>
                {activeSection === 'notes' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder={`What made ${childName} smile today?`}
                        rows={3}
                        className="w-full text-sm p-3 rounded-2xl border border-[#E8E4DF] focus:outline-none resize-none"
                        aria-label="Observation note"
                      />
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={handleSaveNote}
                        className="mt-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white shadow-md"
                        style={{ background: noteSaved ? '#10B981' : '#2A7D99' }}
                      >
                        {noteSaved ? 'Saved' : 'Save note'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Weekly report */}
              <button
                onClick={() => toggleSection('report')}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#2A7D99]" />
                  <span className="text-sm font-semibold text-[#3A4A57]">Weekly report</span>
                </div>
                {activeSection === 'report' ? <ChevronUp className="w-4 h-4 text-[#8A9BA8]" /> : <ChevronDown className="w-4 h-4 text-[#8A9BA8]" />}
              </button>
              <AnimatePresence>
                {activeSection === 'report' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <WeeklyReport sessions={sessions} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EaseParentView;
