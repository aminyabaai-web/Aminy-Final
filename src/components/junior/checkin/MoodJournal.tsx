// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Flame, RotateCcw, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTap, playSuccess, haptic } from '../activities/sounds';
const playStarCollect = playSuccess; // alias — playStarCollect not yet in sounds.ts

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export interface MoodJournalProps {
  childName?: string;
  onBack: () => void;
}

interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  note?: string;
  timestamp: number;
}

interface HabitDef {
  id: string;
  emoji: string;
  label: string;
}

interface HabitLog {
  [habitId: string]: {
    /** Dates marked done (YYYY-MM-DD) */
    dates: string[];
    streak: number;
  };
}

interface CheckinState {
  moods: MoodEntry[];
  habits: HabitDef[];
  habitLog: HabitLog;
}

const STORAGE_KEY = 'aminy-ease-checkin';

const DEFAULT_HABITS: HabitDef[] = [
  { id: 'morning', emoji: '🌅', label: 'Morning routine' },
  { id: 'medicine', emoji: '💊', label: 'Took medicine' },
  { id: 'therapy', emoji: '📝', label: 'Therapy homework' },
  { id: 'calm', emoji: '🧘', label: 'Calm-down practice' },
  { id: 'bedtime', emoji: '🌙', label: 'Bedtime routine' },
];

const MOOD_FACES: { value: number; emoji: string; label: string }[] = [
  { value: 5, emoji: '😄', label: 'Great' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 2, emoji: '😟', label: 'Not great' },
  { value: 1, emoji: '😢', label: 'Tough' },
];

const AFFIRMATIONS = [
  'I am brave',
  'I am kind',
  'I can do hard things',
  'I am loved',
  'My feelings matter',
  'I am getting stronger every day',
  "It's okay to take a break",
  'I am enough just as I am',
  'I can ask for help',
  'I am a good friend',
  'My best is always enough',
  'I am creative and full of ideas',
  'I choose to be happy today',
  'I can learn from my mistakes',
  'I am proud of who I am',
  'I am safe and cared for',
  'Today is a new chance to shine',
  'I can handle whatever comes my way',
  'I make the world better by being me',
  'I am grateful for my family',
  'I can be calm when things are hard',
  'My voice matters',
  'I deserve kindness from myself',
  'I am full of potential',
  'Every day I grow a little more',
  'I choose courage over fear',
  'I am important',
  'I trust myself',
  'I spread joy to others',
  'I believe in myself',
  'I am a problem solver',
  'My heart is full of love',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return days;
}

function last14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return days;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  const today = todayStr();
  // Streak must include today or yesterday
  if (sorted[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (sorted[0] !== yStr) return 0;
  }
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function loadCheckin(): CheckinState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CheckinState;
      if (!parsed.habits?.length) parsed.habits = DEFAULT_HABITS;
      if (!parsed.habitLog) parsed.habitLog = {};
      if (!parsed.moods) parsed.moods = [];
      return parsed;
    }
  } catch { /* ignore */ }
  return { moods: [], habits: DEFAULT_HABITS, habitLog: {} };
}

function saveCheckin(state: CheckinState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MoodJournal({ childName, onBack }: MoodJournalProps) {
  const [state, setState] = useState<CheckinState>(loadCheckin);
  const [noteText, setNoteText] = useState('');
  const [showSparkle, setShowSparkle] = useState<string | null>(null); // habitId or 'mood' or 'affirmation'
  const [affirmationIdx, setAffirmationIdx] = useState(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return dayOfYear % AFFIRMATIONS.length;
  });

  useEffect(() => {
    saveCheckin(state);
  }, [state]);

  const today = todayStr();
  const todayMood = useMemo(
    () => state.moods.find((m) => m.date === today),
    [state.moods, today],
  );

  // Mood history for last 7 days
  const week = useMemo(() => last7Days(), []);
  const twoWeeks = useMemo(() => last14Days(), []);

  const moodMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of state.moods) map[m.date] = m.mood;
    return map;
  }, [state.moods]);

  // Select mood
  const selectMood = useCallback((value: number) => {
    playSuccess();
    haptic(50);
    setShowSparkle('mood');
    setTimeout(() => setShowSparkle(null), 600);
    setState((prev) => {
      const filtered = prev.moods.filter((m) => m.date !== today);
      return {
        ...prev,
        moods: [...filtered, { date: today, mood: value, note: noteText || undefined, timestamp: Date.now() }],
      };
    });
  }, [today, noteText]);

  // Save note
  const saveNote = useCallback(() => {
    if (!todayMood) return;
    setState((prev) => ({
      ...prev,
      moods: prev.moods.map((m) =>
        m.date === today ? { ...m, note: noteText || undefined } : m,
      ),
    }));
  }, [today, todayMood, noteText]);

  // Toggle habit
  const toggleHabit = useCallback((habitId: string) => {
    setState((prev) => {
      const log = { ...prev.habitLog };
      if (!log[habitId]) log[habitId] = { dates: [], streak: 0 };
      const entry = { ...log[habitId], dates: [...log[habitId].dates] };
      const done = entry.dates.includes(today);
      if (done) {
        entry.dates = entry.dates.filter((d) => d !== today);
      } else {
        entry.dates.push(today);
        playStarCollect();
        haptic(50);
        setShowSparkle(habitId);
        setTimeout(() => setShowSparkle(null), 600);
      }
      entry.streak = computeStreak(entry.dates);
      log[habitId] = entry;
      return { ...prev, habitLog: log };
    });
  }, [today]);

  const nextAffirmation = useCallback(() => {
    playTap();
    haptic(30);
    setShowSparkle('affirmation');
    setTimeout(() => setShowSparkle(null), 500);
    setAffirmationIdx((i) => (i + 1) % AFFIRMATIONS.length);
  }, []);

  const greeting = getTimeGreeting();
  const name = childName || 'friend';

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-5 rounded-b-3xl"
        style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #2EC4B6 100%)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { playTap(); haptic(30); onBack(); }}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{greeting}!</h1>
            <p className="text-sm text-white" style={{ opacity: 0.85 }}>
              How are you today, {name}?
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-8">
        {/* Daily Affirmation */}
        <motion.button
          onClick={nextAffirmation}
          className="w-full p-4 rounded-2xl text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FFD166 0%, #E07A5F 100%)',
            boxShadow: '0 4px 12px rgba(224,122,95,0.25)',
          }}
          whileTap={{ scale: 0.97 }}
        >
          <Sparkles size={14} color="white" className="inline mr-1" style={{ opacity: 0.7 }} />
          <span className="text-xs text-white font-medium" style={{ opacity: 0.8 }}>
            Daily Affirmation (tap for new)
          </span>
          <AnimatePresence mode="wait">
            <motion.p
              key={affirmationIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg font-bold text-white mt-1"
            >
              "{AFFIRMATIONS[affirmationIdx]}"
            </motion.p>
          </AnimatePresence>
          {showSparkle === 'affirmation' && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Sparkles size={32} color="white" />
            </motion.div>
          )}
        </motion.button>

        {/* Mood Picker */}
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-base font-bold mb-3" style={{ color: '#333' }}>
            How are you feeling?
          </h2>
          <div className="flex justify-between gap-2 relative">
            {MOOD_FACES.map((face) => {
              const selected = todayMood?.mood === face.value;
              return (
                <motion.button
                  key={face.value}
                  onClick={() => selectMood(face.value)}
                  className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: selected ? '#E8F5E9' : 'transparent',
                    border: selected ? '2px solid #43AA8B' : '2px solid transparent',
                    minWidth: 44,
                    minHeight: 44,
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span style={{ fontSize: 28 }}>{face.emoji}</span>
                  <span className="text-xs" style={{ color: selected ? '#43AA8B' : '#888' }}>
                    {face.label}
                  </span>
                </motion.button>
              );
            })}
            {showSparkle === 'mood' && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Sparkles size={28} color="#43AA8B" />
              </motion.div>
            )}
          </div>
          {/* Note input */}
          {todayMood && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3"
            >
              <input
                type="text"
                placeholder="What happened? (optional)"
                maxLength={100}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={saveNote}
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{
                  backgroundColor: '#F5F5F5',
                  border: '1px solid #E0E0E0',
                  color: '#333',
                  outline: 'none',
                  minHeight: 44,
                }}
              />
            </motion.div>
          )}
        </div>

        {/* Mood History (7 days) */}
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-base font-bold mb-3" style={{ color: '#333' }}>
            Your Week
          </h2>
          <div className="flex justify-between">
            {week.map((d) => {
              const m = moodMap[d];
              const face = m ? MOOD_FACES.find((f) => f.value === m) : null;
              const isToday = d === today;
              return (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium" style={{ color: isToday ? '#43AA8B' : '#888' }}>
                    {dayLabel(d)}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: face ? '#E8F5E9' : '#F5F5F5',
                      border: isToday ? '2px solid #43AA8B' : '2px solid transparent',
                    }}
                  >
                    {face ? (
                      <span style={{ fontSize: 18 }}>{face.emoji}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#ccc' }}>-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mood trend line (2 weeks) */}
          <div className="mt-4">
            <p className="text-xs font-medium mb-2" style={{ color: '#888' }}>
              Mood Trend (2 weeks)
            </p>
            <svg width="100%" height={50} viewBox="0 0 280 50" preserveAspectRatio="none">
              {/* Grid lines */}
              {[1, 2, 3, 4, 5].map((v) => (
                <line
                  key={v}
                  x1={0}
                  y1={50 - ((v - 1) / 4) * 40 - 5}
                  x2={280}
                  y2={50 - ((v - 1) / 4) * 40 - 5}
                  stroke="#F0F0F0"
                  strokeWidth={0.5}
                />
              ))}
              {/* Trend line */}
              {(() => {
                const points = twoWeeks
                  .map((d, i) => {
                    const m = moodMap[d];
                    if (!m) return null;
                    const x = (i / 13) * 270 + 5;
                    const y = 50 - ((m - 1) / 4) * 40 - 5;
                    return { x, y };
                  })
                  .filter(Boolean) as { x: number; y: number }[];
                if (points.length < 2) return null;
                const pathD = points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');
                return (
                  <>
                    <path d={pathD} fill="none" stroke="#43AA8B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={3} fill="#43AA8B" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Habit Tracker */}
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-base font-bold mb-3" style={{ color: '#333' }}>
            Daily Habits
          </h2>
          <div className="space-y-3">
            {state.habits.map((habit) => {
              const log = state.habitLog[habit.id] || { dates: [], streak: 0 };
              const doneToday = log.dates.includes(today);
              const streak = computeStreak(log.dates);
              const weekDates = week;

              return (
                <div key={habit.id} className="relative">
                  <motion.button
                    onClick={() => toggleHabit(habit.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all"
                    style={{
                      backgroundColor: doneToday ? '#E8F5E9' : '#FAFAFA',
                      border: doneToday ? '2px solid #43AA8B' : '2px solid #EEEEEE',
                      minHeight: 44,
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span style={{ fontSize: 24 }}>{habit.emoji}</span>
                    <div className="flex-1 text-left">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: doneToday ? '#43AA8B' : '#333',
                          textDecoration: doneToday ? 'line-through' : 'none',
                        }}
                      >
                        {habit.label}
                      </p>
                      {/* Weekly dots */}
                      <div className="flex gap-1 mt-1">
                        {weekDates.map((d) => {
                          const done = log.dates.includes(d);
                          return (
                            <div
                              key={d}
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: done ? '#43AA8B' : '#E0E0E0',
                                transition: 'background-color 0.3s ease',
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    {/* Streak */}
                    {streak > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Flame size={14} color="#E07A5F" />
                        <span className="text-xs font-bold" style={{ color: '#E07A5F' }}>
                          {streak}
                        </span>
                      </div>
                    )}
                    {/* Checkmark */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: doneToday ? '#43AA8B' : '#E0E0E0',
                        transition: 'background-color 0.3s ease',
                      }}
                    >
                      {doneToday && <Check size={16} color="white" />}
                    </div>
                  </motion.button>
                  {/* Sparkle overlay */}
                  {showSparkle === habit.id && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <Sparkles size={24} color="#43AA8B" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
