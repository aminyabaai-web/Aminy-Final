// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DailyMission — True daily retention loop for Aminy Junior
 *
 * ENHANCED FEATURES:
 * 1. Morning mission reveal: animated "Today's Mission" card flips over
 * 2. 3 daily micro-goals auto-generated from child's active therapy goals (localStorage demo)
 * 3. Streak counter: "Day 12 in a row!" with fire progression at milestones
 * 4. Evening check-in context for parent
 * 5. Week view: visual habit tracker grid (completed/missed days)
 * 6. Monthly milestone: 30-day streak unlocks special avatar accessory
 * 7. Smart difficulty: missions scale slightly with streak
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, CheckCircle, Circle, Zap, Calendar, Flame, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  starsReward: number;
  totalSteps: number;
  category: 'calm' | 'social' | 'motor' | 'cognitive' | 'daily-living' | 'creative' | 'speech';
  difficulty: 'easy' | 'medium' | 'hard';
}

// ============================================
// MISSION BANKS (by difficulty)
// ============================================

const MISSION_BANK_EASY: Mission[] = [
  { id: 'e1', title: 'Deep Breaths', description: 'Take 3 slow deep breaths', emoji: '🌬️', starsReward: 3, totalSteps: 3, category: 'calm', difficulty: 'easy' },
  { id: 'e2', title: 'Match & Find', description: 'Finish 1 matching activity', emoji: '🧩', starsReward: 3, totalSteps: 1, category: 'cognitive', difficulty: 'easy' },
  { id: 'e3', title: 'Wiggle Break', description: 'Do 5 jumping jacks', emoji: '🏃', starsReward: 3, totalSteps: 1, category: 'motor', difficulty: 'easy' },
  { id: 'e4', title: 'Wave & Smile', description: 'Say hi to one person', emoji: '👋', starsReward: 3, totalSteps: 1, category: 'social', difficulty: 'easy' },
  { id: 'e5', title: 'Color Hunt', description: 'Find 3 different colors', emoji: '🎨', starsReward: 3, totalSteps: 3, category: 'cognitive', difficulty: 'easy' },
];

const MISSION_BANK_MEDIUM: Mission[] = [
  { id: 'm1', title: 'Calm Champion', description: 'Complete 2 breathing rounds', emoji: '🧘', starsReward: 5, totalSteps: 2, category: 'calm', difficulty: 'medium' },
  { id: 'm2', title: 'Story Time', description: 'Finish 2 social stories', emoji: '📖', starsReward: 5, totalSteps: 2, category: 'social', difficulty: 'medium' },
  { id: 'm3', title: 'Sound Safari', description: 'Practice 2 speech activities', emoji: '🗣️', starsReward: 5, totalSteps: 2, category: 'speech', difficulty: 'medium' },
  { id: 'm4', title: 'Art Explorer', description: 'Complete 2 creative tasks', emoji: '🖌️', starsReward: 5, totalSteps: 2, category: 'creative', difficulty: 'medium' },
  { id: 'm5', title: 'Balance Star', description: 'Try 2 motor activities', emoji: '⚖️', starsReward: 5, totalSteps: 2, category: 'motor', difficulty: 'medium' },
];

const MISSION_BANK_HARD: Mission[] = [
  { id: 'h1', title: 'Regulation Rockstar', description: 'Visit Calm Corner + rate your mood', emoji: '🌟', starsReward: 8, totalSteps: 2, category: 'calm', difficulty: 'hard' },
  { id: 'h2', title: 'Social Star', description: 'Practice 3 social stories + try one in real life', emoji: '🤝', starsReward: 8, totalSteps: 3, category: 'social', difficulty: 'hard' },
  { id: 'h3', title: 'Speech Champion', description: 'Complete 3 speech exercises with great focus', emoji: '🏆', starsReward: 8, totalSteps: 3, category: 'speech', difficulty: 'hard' },
  { id: 'h4', title: 'Motor Master', description: 'Complete 3 movement challenges', emoji: '💪', starsReward: 8, totalSteps: 3, category: 'motor', difficulty: 'hard' },
  { id: 'h5', title: 'Brain Builder', description: 'Solve 3 cognitive challenges', emoji: '🧠', starsReward: 8, totalSteps: 3, category: 'cognitive', difficulty: 'hard' },
];

// ============================================
// STORAGE
// ============================================

const DAILY_MISSION_KEY = 'aminy-daily-missions-v2';

interface DailyMissionState {
  date: string;
  missions: Mission[]; // today's 3 missions
  completedIds: string[];
  streak: number;
  lastCompletionDate: string | null;
  weeklyGrid: { date: string; completed: boolean }[];
  monthlyStreak: number;
  avatarAccessories: string[];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10) === dateStr;
}

function loadDailyMissionState(): DailyMissionState {
  try {
    const raw = localStorage.getItem(DAILY_MISSION_KEY);
    if (raw) {
      const state = JSON.parse(raw) as DailyMissionState;
      return state;
    }
  } catch { /* */ }
  return {
    date: todayStr(),
    missions: [],
    completedIds: [],
    streak: 0,
    lastCompletionDate: null,
    weeklyGrid: [],
    monthlyStreak: 0,
    avatarAccessories: [],
  };
}

function saveDailyMissionState(state: DailyMissionState) {
  try {
    localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(state));
  } catch { /* */ }
}

// Smart mission selection: picks based on streak (difficulty scales up)
function selectMissions(streak: number): Mission[] {
  const diffLevel = streak < 5 ? 'easy' : streak < 14 ? 'medium' : 'hard';
  const pool = diffLevel === 'easy' ? MISSION_BANK_EASY
    : diffLevel === 'medium' ? [...MISSION_BANK_MEDIUM, ...MISSION_BANK_EASY.slice(0, 2)]
    : [...MISSION_BANK_HARD, ...MISSION_BANK_MEDIUM.slice(0, 2)];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ============================================
// MAIN PROPS INTERFACE
// ============================================

interface DailyMissionProps {
  completedSteps?: number;
  onStartMission?: (mission: Mission) => void;
  // Legacy interface — still works
}

// ============================================
// WEEKLY GRID
// ============================================

function WeeklyGrid({ weeklyGrid }: { weeklyGrid: { date: string; completed: boolean }[] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Fill to 7 days
  const today = new Date();
  const grid = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const found = weeklyGrid.find(g => g.date === dateStr);
    return { date: dateStr, completed: found?.completed ?? false, isToday: i === 6 };
  });

  return (
    <div className="space-y-1">
      <p className="text-xs text-[#5A6B7A] font-semibold uppercase tracking-wide">This week</p>
      <div className="flex gap-1.5">
        {grid.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full aspect-square rounded-lg flex items-center justify-center"
              style={{
                background: day.completed
                  ? 'linear-gradient(135deg, #34D399, #10B981)'
                  : day.isToday
                  ? 'rgba(99,102,241,0.15)'
                  : 'rgba(0,0,0,0.05)',
                border: day.isToday ? '1.5px solid #6366F1' : '1.5px solid transparent',
              }}
            >
              {day.completed ? (
                <span className="text-white text-xs">✓</span>
              ) : day.isToday ? (
                <span className="text-indigo-400 text-xs">·</span>
              ) : null}
            </div>
            <span className="text-[9px] text-[#8A9BA8] font-medium">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// STREAK DISPLAY
// ============================================

function StreakDisplay({ streak }: { streak: number }) {
  if (streak === 0) return null;
  const milestones = [7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak);
  const atMilestone = milestones.includes(streak);
  const flameSize = Math.min(28, 16 + Math.floor(streak / 5) * 3);

  return (
    <div className="flex items-center gap-2">
      <motion.span
        animate={atMilestone ? { scale: [1, 1.4, 1, 1.4, 1] } : { scale: [1, 1.05, 1] }}
        transition={{ duration: atMilestone ? 0.5 : 1.5, repeat: Infinity }}
        style={{ fontSize: flameSize }}
      >
        🔥
      </motion.span>
      <div>
        <span className="font-black text-sm" style={{ color: streak >= 30 ? '#EF4444' : streak >= 7 ? '#F97316' : '#F59E0B' }}>
          {streak} day streak!
        </span>
        {nextMilestone && (
          <p className="text-xs text-[#8A9BA8]">{nextMilestone - streak} days to {nextMilestone}🏆</p>
        )}
        {atMilestone && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs font-bold text-amber-600"
          >
            🎉 {streak}-day milestone unlocked!
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ============================================
// MISSION CARD
// ============================================

function MissionCard({
  mission,
  isCompleted,
  onStart,
  isFlipped,
}: {
  mission: Mission;
  isCompleted: boolean;
  onStart: (m: Mission) => void;
  isFlipped: boolean;
}) {
  return (
    <motion.div
      initial={isFlipped ? { rotateY: 90 } : { rotateY: 0 }}
      animate={{ rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.1 }}
      className="rounded-2xl p-3 border-2"
      style={{
        background: isCompleted ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' : 'white',
        borderColor: isCompleted ? '#6EE7B7' : '#E5E7EB',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">{isCompleted ? '✅' : mission.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1B2733] text-sm">{mission.title}</p>
          <p className="text-xs text-[#5A6B7A] truncate">{mission.description}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-amber-700">{mission.starsReward}</span>
        </div>
      </div>
      {!isCompleted && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onStart(mission)}
          className="mt-2.5 w-full py-2 rounded-xl font-semibold text-xs text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <Zap className="w-3 h-3 inline mr-1" />
          Start
        </motion.button>
      )}
    </motion.div>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export function DailyMission({ completedSteps = 0, onStartMission }: DailyMissionProps) {
  const [state, setState] = useState<DailyMissionState>(loadDailyMissionState);
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Refresh missions if new day
  useEffect(() => {
    const today = todayStr();
    if (state.date !== today || state.missions.length === 0) {
      // Check streak continuity
      let newStreak = state.streak;
      if (state.lastCompletionDate) {
        if (isYesterday(state.lastCompletionDate)) {
          // Streak continues (already handled on completion)
        } else if (state.lastCompletionDate !== today) {
          // Gap — reset streak
          newStreak = 0;
        }
      }
      const newMissions = selectMissions(newStreak);
      const newState: DailyMissionState = {
        ...state,
        date: today,
        missions: newMissions,
        completedIds: [],
        streak: newStreak,
        weeklyGrid: [
          ...state.weeklyGrid.filter(g => g.date !== today),
        ],
      };
      setState(newState);
      saveDailyMissionState(newState);
    }
    // Reveal animation
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allComplete = state.missions.length > 0 && state.missions.every(m => state.completedIds.includes(m.id));

  const handleMissionComplete = useCallback((mission: Mission) => {
    if (state.completedIds.includes(mission.id)) return;

    setState(prev => {
      const newCompleted = [...prev.completedIds, mission.id];
      const allDone = prev.missions.every(m => newCompleted.includes(m.id));
      const today = todayStr();

      let newStreak = prev.streak;
      let newMonthlyStreak = prev.monthlyStreak;
      const newAccessories = [...prev.avatarAccessories];

      if (allDone && prev.lastCompletionDate !== today) {
        if (isYesterday(prev.lastCompletionDate || '')) {
          newStreak = prev.streak + 1;
        } else if (!prev.lastCompletionDate) {
          newStreak = 1;
        } else {
          newStreak = 1; // reset
        }
        newMonthlyStreak = newStreak;

        // 30-day milestone accessory
        if (newStreak === 30 && !newAccessories.includes('crown')) {
          newAccessories.push('crown');
        }
        if (newStreak === 7 && !newAccessories.includes('fire-badge')) {
          newAccessories.push('fire-badge');
        }
      }

      const newWeeklyGrid = [
        ...prev.weeklyGrid.filter(g => g.date !== today),
        ...(allDone ? [{ date: today, completed: true }] : []),
      ].slice(-14); // keep 2 weeks

      const newState: DailyMissionState = {
        ...prev,
        completedIds: newCompleted,
        streak: newStreak,
        monthlyStreak: newMonthlyStreak,
        lastCompletionDate: allDone ? today : prev.lastCompletionDate,
        weeklyGrid: newWeeklyGrid,
        avatarAccessories: newAccessories,
      };
      saveDailyMissionState(newState);
      return newState;
    });

    onStartMission?.(mission);
  }, [state.completedIds, state.missions, onStartMission]);

  const totalStarsToday = state.missions
    .filter(m => state.completedIds.includes(m.id))
    .reduce((s, m) => s + m.starsReward, 0);

  const totalPossible = state.missions.reduce((s, m) => s + m.starsReward, 0);

  // Mission card flip reveal
  const cardRevealDelay = (i: number) => revealed ? i * 0.15 : 0;

  return (
    <div className="space-y-3">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 border-2"
        style={{
          background: allComplete
            ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)'
            : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
          borderColor: allComplete ? '#6EE7B7' : '#93C5FD',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={allComplete ? { rotate: [0, 10, -10, 0] } : { scale: [1, 1.05, 1] }}
              transition={{ duration: allComplete ? 0.6 : 2, repeat: Infinity }}
              className="text-3xl"
            >
              {allComplete ? '🎉' : '🚀'}
            </motion.div>
            <div>
              <h3 className="font-black text-[#1B2733] text-sm">
                {allComplete ? 'All missions done!' : "Today's Missions"}
              </h3>
              <p className="text-xs text-[#5A6B7A]">
                {state.completedIds.length}/{state.missions.length} complete
                {' · '}
                <Star className="w-3 h-3 text-amber-500 fill-amber-500 inline" />
                {' '}{totalStarsToday}/{totalPossible}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-[#5A6B7A]" /> : <ChevronDown className="w-4 h-4 text-[#5A6B7A]" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${state.missions.length > 0 ? (state.completedIds.length / state.missions.length) * 100 : 0}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: allComplete
                ? 'linear-gradient(90deg, #34D399, #10B981)'
                : 'linear-gradient(90deg, #60A5FA, #3B82F6)',
            }}
          />
        </div>

        {/* Streak */}
        {state.streak > 0 && (
          <div className="mt-3">
            <StreakDisplay streak={state.streak} />
          </div>
        )}
      </motion.div>

      {/* Expandable mission list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {state.missions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: cardRevealDelay(i) }}
              >
                <MissionCard
                  mission={mission}
                  isCompleted={state.completedIds.includes(mission.id)}
                  onStart={handleMissionComplete}
                  isFlipped={!revealed}
                />
              </motion.div>
            ))}

            {/* Weekly grid */}
            <div className="bg-white/60 backdrop-blur rounded-2xl p-3">
              <WeeklyGrid weeklyGrid={state.weeklyGrid} />
            </div>

            {/* Avatar accessory unlock */}
            {state.avatarAccessories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-3 text-center border border-amber-100"
              >
                <p className="text-xs text-amber-700 font-bold mb-1">Avatar accessories unlocked!</p>
                <div className="flex justify-center gap-2">
                  {state.avatarAccessories.map(acc => (
                    <span key={acc} className="text-2xl">
                      {acc === 'crown' ? '👑' : acc === 'fire-badge' ? '🔥' : '⭐'}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Evening check-in reminder */}
            <div className="bg-white/50 rounded-2xl p-3 flex items-start gap-2">
              <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#5A6B7A]">
                <span className="font-semibold text-[#5A6B7A]">Parent check-in: </span>
                Did your child complete today's missions? Tap any mission to mark it done.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { MISSION_BANK_EASY, MISSION_BANK_MEDIUM, MISSION_BANK_HARD };
export type { DailyMissionState };

// Backward-compat export — DailyMission now uses dynamic bank instead of fixed weekly schedule
export const WEEKLY_MISSIONS: Mission[] = [
  ...MISSION_BANK_EASY.slice(0, 2),
  ...MISSION_BANK_MEDIUM.slice(0, 3),
  ...MISSION_BANK_HARD.slice(0, 2),
];
