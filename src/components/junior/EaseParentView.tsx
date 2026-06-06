// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * EaseParentView — Parent overlay for Ease (Junior) experience
 *
 * What Tappy completely lacks — CAREGIVER CONTEXT:
 * 1. "Parent View" toggle: shows everything child sees PLUS:
 *    - Which therapeutic goal each activity addresses
 *    - How many minutes child has been in Ease today
 *    - Therapist notes on what to observe
 *    - Quick log: "I noticed..." text field saved to session notes
 * 2. After child uses any Ease tool: prompt "How did that go?" (1-tap: great/ok/rough)
 * 3. Weekly "Ease Report": which tools used most, total time, parent ratings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, EyeOff, ClipboardList, Clock, Target, MessageSquare, ChevronDown, ChevronUp,
  BarChart3, ThumbsUp, Minus, ThumbsDown, Star, CheckCircle, X, Brain, Heart
} from 'lucide-react';
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
// THERAPEUTIC GOAL MAP
// ============================================

const GOAL_MAP: Record<string, { goal: string; whatToObserve: string; therapistTip: string }> = {
  'calm-corner': {
    goal: 'Self-regulation: recognizing & managing emotional states',
    whatToObserve: 'How quickly does child calm? Do they choose this independently?',
    therapistTip: 'Praise the act of seeking help: "Great job coming to calm corner when you felt [emotion]."',
  },
  'breathing': {
    goal: 'Autonomic nervous system regulation via diaphragmatic breathing',
    whatToObserve: 'Is child following the breath cue? Are shoulders relaxing?',
    therapistTip: 'Model breathing alongside child. Narrate: "I breathe in slowly... I breathe out slowly."',
  },
  'bubble-wrap': {
    goal: 'Sensory input: tactile feedback, fine motor calming',
    whatToObserve: 'Does child remain regulated? Does repetitive motion help focus?',
    therapistTip: 'Allow sensory breaks before transitions or demanding tasks.',
  },
  'pop-it': {
    goal: 'Sensory regulation: tactile fidget for focus + calming',
    whatToObserve: 'Does fidget use decrease anxiety behaviors (hand-wringing, rocking)?',
    therapistTip: 'Allow fidget during structured tasks — it may improve attention, not distract.',
  },
  'transition': {
    goal: 'Executive function: flexible thinking, routine adherence',
    whatToObserve: 'Did child need extra warnings? Was physical transition smooth?',
    therapistTip: 'Increase warning time if needed. Pair verbal with visual timer.',
  },
  'rewards': {
    goal: 'Motivation & reinforcement: positive behavior support via token economy',
    whatToObserve: 'Is child motivated by the reward goal? Is the star cost appropriate?',
    therapistTip: 'Set goals jointly with child. Celebrate progress toward reward, not just achievement.',
  },
  'daily-mission': {
    goal: 'Daily living: habit formation, intrinsic motivation, self-monitoring',
    whatToObserve: 'Does child initiate missions independently? Do they track their own progress?',
    therapistTip: 'Discuss mission at start of day: "What will you work on today?" Check in at end.',
  },
  'fidget': {
    goal: 'Sensory + attention: motor outlet for hyperactivity, calming input',
    whatToObserve: 'Duration of focused use, whether it precedes or follows dysregulation',
    therapistTip: 'Track whether fidget helps child return to learning tasks more quickly.',
  },
  default: {
    goal: 'Therapeutic engagement through play-based learning',
    whatToObserve: 'Child engagement level, affect, and duration of focus',
    therapistTip: 'Note what activities your child gravitates toward — these are often regulation tools.',
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
      <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        Weekly Ease Report
      </h3>

      {weekSessions.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No sessions logged this week yet</p>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Sessions</p>
              <p className="text-xl font-black text-indigo-700">{weekSessions.length}</p>
            </div>
            <div className="bg-[#6B9080]/10 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Total time</p>
              <p className="text-xl font-black text-[#6B9080]">{totalMinutes}m</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Avg/day</p>
              <p className="text-xl font-black text-amber-700">{Math.round(totalMinutes / 7)}m</p>
            </div>
          </div>

          {/* Parent ratings */}
          {(greatCount + okCount + roughCount) > 0 && (
            <div className="bg-[#FAF7F2] rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Session ratings</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-sm font-bold text-green-600">{greatCount}</span>
                  <span className="text-xs text-gray-400">great</span>
                </div>
                <div className="flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600">{okCount}</span>
                  <span className="text-xs text-gray-400">ok</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-sm font-bold text-red-600">{roughCount}</span>
                  <span className="text-xs text-gray-400">rough</span>
                </div>
              </div>
            </div>
          )}

          {/* Top tools */}
          {topTools.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Most used tools</p>
              <div className="space-y-1.5">
                {topTools.map(([tool, data]) => (
                  <div key={tool} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                    <span className="text-xl">{data.emoji}</span>
                    <span className="text-sm font-medium text-gray-700 flex-1 capitalize">{tool}</span>
                    <span className="text-xs text-gray-400">{data.count}x · {data.minutes}m</span>
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
              <p className="font-bold text-gray-800 text-sm">How did that go?</p>
              <p className="text-xs text-gray-400 capitalize">{tool} session</p>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1.5 rounded-full bg-[#F0EDE8]">
            <X className="w-4 h-4 text-gray-400" />
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
                  <span className="text-xs font-bold" style={{ color: r.color }}>{r.label}</span>
                </motion.button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="I noticed... (optional)"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-300"
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
            <p className="font-semibold text-gray-700">Saved! Thanks for the note.</p>
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
  lastToolEmoji = '🎮',
  onRateSession,
}: EaseParentViewProps) {
  const [sessions] = useState<EaseSessionEntry[]>(loadSessions);
  const [todayMinutes] = useState(getTodayMinutes);
  const [activeSection, setActiveSection] = useState<'goals' | 'report' | 'notes' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const goalInfo = lastToolUsed ? getGoalInfo(lastToolUsed) : getGoalInfo('default');

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
          background: isParentView
            ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
            : 'rgba(255,255,255,0.8)',
          color: isParentView ? 'white' : '#4B5563',
          border: isParentView ? 'none' : '1px solid rgba(0,0,0,0.1)',
        }}
      >
        {isParentView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        {isParentView ? 'Parent View On' : 'Parent View'}
      </motion.button>

      {/* Parent View Panel */}
      <AnimatePresence>
        {isParentView && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 rounded-3xl overflow-hidden shadow-xl"
            style={{ background: 'white', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3"
              style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-indigo-900 text-base">{childName}'s Ease Session</h3>
                  <p className="text-xs text-indigo-500">Parent View — Therapeutic Context</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-700">{todayMinutes}m today</span>
                </div>
              </div>

              {/* Current tool info */}
              {lastToolUsed && (
                <div className="mt-3 flex items-center gap-2 bg-white/60 rounded-2xl px-3 py-2">
                  <span className="text-2xl">{lastToolEmoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-700 capitalize">{lastToolUsed}</p>
                    <p className="text-[10px] text-gray-400">Last used</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="divide-y divide-gray-100">

              {/* Therapeutic goals */}
              <button
                onClick={() => toggleSection('goals')}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-700">Therapeutic Goal</span>
                </div>
                {activeSection === 'goals' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
                      <div className="bg-indigo-50 rounded-2xl p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Brain className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-bold text-indigo-800">Goal</p>
                        </div>
                        <p className="text-xs text-indigo-700 ml-6">{goalInfo.goal}</p>
                      </div>
                      <div className="bg-[#6B9080]/10 rounded-2xl p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Eye className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-bold text-teal-800">What to observe</p>
                        </div>
                        <p className="text-xs text-[#6B9080] ml-6">{goalInfo.whatToObserve}</p>
                      </div>
                      <div className="bg-amber-50 rounded-2xl p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Heart className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-bold text-amber-800">Therapist tip</p>
                        </div>
                        <p className="text-xs text-amber-700 ml-6">{goalInfo.therapistTip}</p>
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
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700">I noticed...</span>
                </div>
                {activeSection === 'notes' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
                        placeholder={`What did you observe during ${childName}'s session?`}
                        rows={3}
                        className="w-full text-sm p-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-indigo-300 resize-none"
                      />
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={handleSaveNote}
                        className="mt-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white shadow-md"
                        style={{ background: noteSaved ? '#10B981' : 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                      >
                        {noteSaved ? '✓ Saved!' : 'Save Note'}
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
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">Weekly Report</span>
                </div>
                {activeSection === 'report' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
