// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gift, Star, Moon, Sun, Sunrise, Sunset, ChevronRight } from 'lucide-react';
import { playTap, playSuccess, playComplete, haptic } from './activities/sounds';
import { recordActivity } from '../../lib/retention-engine';
import { supabase } from '../../utils/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyLoopState {
  /** ISO date strings of days with activity */
  activeDays: string[];
  /** Current streak count */
  streak: number;
  /** Date of last visit (ISO string) */
  lastVisit: string | null;
  /** Total stars earned */
  stars: number;
  /** Claimed mystery reward day indices (0-based from first active day) */
  claimedMysteryDays: number[];
}

interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: string;
}

export interface DailyLoopProps {
  childName?: string;
  onStartChallenge?: (challenge: DailyChallenge) => void;
  onOpenCalmCorner?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aminy-daily-loop';

const CHALLENGES: DailyChallenge[] = [
  { id: 'c1', emoji: '\uD83C\uDFA8', title: 'Color Match', description: 'Find 3 things that are the same color', category: 'cognitive' },
  { id: 'c2', emoji: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', title: 'Friendship Card', description: 'Draw a card for someone you care about', category: 'social' },
  { id: 'c3', emoji: '\uD83C\uDFB5', title: 'Sound Safari', description: 'Listen for 5 different sounds around you', category: 'sensory' },
  { id: 'c4', emoji: '\uD83E\uDDD8', title: 'Calm Pose', description: 'Try holding a yoga pose for 10 seconds', category: 'motor' },
  { id: 'c5', emoji: '\uD83D\uDCD6', title: 'Story Starter', description: 'Make up a one-sentence story about an animal', category: 'speech' },
  { id: 'c6', emoji: '\uD83C\uDF1F', title: 'Gratitude Star', description: 'Name one thing that made you smile today', category: 'emotional' },
  { id: 'c7', emoji: '\uD83E\uDDE9', title: 'Pattern Finder', description: 'Find a pattern in your home (stripes, dots, etc.)', category: 'cognitive' },
  { id: 'c8', emoji: '\uD83C\uDF08', title: 'Rainbow Hunt', description: 'Find something red, orange, yellow, green, blue', category: 'sensory' },
  { id: 'c9', emoji: '\u270D\uFE0F', title: 'Name Practice', description: 'Write your name with your eyes closed!', category: 'motor' },
  { id: 'c10', emoji: '\uD83E\uDD17', title: 'Feelings Check', description: 'Show someone how you feel with your face', category: 'emotional' },
  { id: 'c11', emoji: '\uD83D\uDC3E', title: 'Animal Walk', description: 'Walk like your favorite animal for 30 seconds', category: 'motor' },
  { id: 'c12', emoji: '\uD83C\uDFAD', title: 'Silly Voice', description: 'Say your name in 3 different silly voices', category: 'speech' },
  { id: 'c13', emoji: '\uD83D\uDD22', title: 'Count Down', description: 'Count backwards from 20 as fast as you can', category: 'cognitive' },
  { id: 'c14', emoji: '\uD83C\uDFB6', title: 'Rhythm Maker', description: 'Clap a rhythm and ask someone to copy it', category: 'social' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function hourOfDay(): number {
  return new Date().getHours();
}

function loadState(): DailyLoopState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return { activeDays: [], streak: 0, lastVisit: null, stars: 0, claimedMysteryDays: [] };
}

function saveState(state: DailyLoopState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* */ }
}

function hoursSinceLastVisit(lastVisit: string | null): number {
  if (!lastVisit) return Infinity;
  return (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyLoop({ childName = 'friend', onStartChallenge, onOpenCalmCorner }: DailyLoopProps) {
  const [state, setState] = useState<DailyLoopState>(loadState);
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  const [mysteryStars, setMysteryStars] = useState(0);
  const [showReturnBonus, setShowReturnBonus] = useState(false);
  const [returnBonusStars, setReturnBonusStars] = useState(0);

  // ---- Record today's visit and compute streak ----
  useEffect(() => {
    const today = todayISO();
    const prevState = loadState();
    const hours = hoursSinceLastVisit(prevState.lastVisit);

    // Return bonus: >24hrs since last visit
    if (hours > 24 && hours < Infinity) {
      const bonus = Math.min(Math.floor(hours / 24) * 3, 15); // 3 stars per day away, max 15
      setReturnBonusStars(bonus);
      setShowReturnBonus(true);
    }

    if (!prevState.activeDays.includes(today)) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const wasActiveYesterday = prevState.activeDays.includes(yesterday);
      const newStreak = wasActiveYesterday ? prevState.streak + 1 : 1;
      const updated: DailyLoopState = {
        ...prevState,
        activeDays: [...prevState.activeDays, today],
        streak: newStreak,
        lastVisit: new Date().toISOString(),
        stars: prevState.stars + 1, // 1 star for showing up
      };
      saveState(updated);
      setState(updated);

      // Sync to Supabase so streak survives device/browser changes
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          recordActivity(data.user.id, 'daily_checkin').catch(() => {
            // Non-critical — localStorage is source of truth
          });
        }
      });
    } else {
      const updated = { ...prevState, lastVisit: new Date().toISOString() };
      saveState(updated);
      setState(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Time-aware greeting ----
  const greeting = useMemo(() => {
    const h = hourOfDay();
    if (h < 6) return { text: `Shhh... it's still early, ${childName}!`, icon: <Moon className="text-indigo-300" size={28} /> };
    if (h < 12) return { text: `Good morning, ${childName}!`, icon: <Sunrise className="text-amber-400" size={28} /> };
    if (h < 17) return { text: `Good afternoon, ${childName}!`, icon: <Sun className="text-yellow-400" size={28} /> };
    if (h < 20) return { text: `Good evening, ${childName}!`, icon: <Sunset className="text-orange-400" size={28} /> };
    return { text: `Sleepy time soon, ${childName}!`, icon: <Moon className="text-indigo-300" size={28} /> };
  }, [childName]);

  // ---- Daily challenge (deterministic per day) ----
  const challenge = useMemo(() => {
    return CHALLENGES[dayOfYear() % CHALLENGES.length];
  }, []);

  // ---- Streak icon ----
  const streakDisplay = useMemo(() => {
    const s = state.streak;
    if (s >= 14) return { icon: '\uD83D\uDE80', label: `${s}-day streak!` };
    if (s >= 7) return { icon: '\u2728\uD83D\uDD25', label: `${s}-day streak!` };
    if (s >= 3) return { icon: '\uD83D\uDD25', label: `${s}-day streak!` };
    if (s >= 1) return { icon: '\uD83D\uDD6F\uFE0F', label: `${s}-day streak` };
    return { icon: '\uD83D\uDD6F\uFE0F', label: 'Start a streak!' };
  }, [state.streak]);

  // ---- Mystery reward (every 3rd active day) ----
  const mysteryAvailable = useMemo(() => {
    const dayIndex = state.activeDays.length;
    return dayIndex > 0 && dayIndex % 3 === 0 && !state.claimedMysteryDays.includes(dayIndex);
  }, [state.activeDays, state.claimedMysteryDays]);

  const claimMystery = useCallback(() => {
    const bonus = 3 + Math.floor(Math.random() * 5); // 3-7 bonus stars
    setMysteryStars(bonus);
    setMysteryRevealed(true);
    playSuccess();
    haptic([50, 100, 50]);
    const updated: DailyLoopState = {
      ...state,
      stars: state.stars + bonus,
      claimedMysteryDays: [...state.claimedMysteryDays, state.activeDays.length],
    };
    saveState(updated);
    setState(updated);
  }, [state]);

  const claimReturnBonus = useCallback(() => {
    playComplete();
    haptic([50, 50, 50]);
    const updated: DailyLoopState = {
      ...state,
      stars: state.stars + returnBonusStars,
    };
    saveState(updated);
    setState(updated);
    setShowReturnBonus(false);
  }, [state, returnBonusStars]);

  // ---- Weekly dots (last 7 days) ----
  const weekDots = useMemo(() => {
    const dots: { date: string; active: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dots.push({ date: d, active: state.activeDays.includes(d) });
    }
    return dots;
  }, [state.activeDays]);

  const isBedtime = hourOfDay() >= 20;

  // ---- Return bonus overlay ----
  if (showReturnBonus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 p-6 text-center">
        <div className="text-6xl mb-4 animate-bounce">&#127775;</div>
        <h2 className="text-white text-2xl font-bold mb-2">Welcome back, {childName}!</h2>
        <p className="text-white/70 mb-6">
          We missed you! Here are {returnBonusStars} bonus stars for coming back!
        </p>
        <div className="flex gap-1 mb-6">
          {Array.from({ length: returnBonusStars }).map((_, i) => (
            <Star key={i} size={20} className="text-yellow-300 animate-pulse" fill="currentColor" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <button
          onClick={claimReturnBonus}
          className="px-8 py-4 bg-yellow-400 text-purple-900 rounded-full text-lg font-bold"
        >
          Collect Stars!
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b bg-[#FFF8F0] p-5 pb-24">
      {/* Greeting */}
      <div className="flex items-center gap-3 mb-6">
        {greeting.icon}
        <h1 className="text-white text-xl font-bold">{greeting.text}</h1>
      </div>

      {/* Streak + Stars row */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center">
          <span className="text-3xl">{streakDisplay.icon}</span>
          <p className="text-white text-sm mt-1 font-medium">{streakDisplay.label}</p>
        </div>
        <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star size={20} className="text-yellow-300" fill="currentColor" />
            <span className="text-white text-2xl font-bold">{state.stars}</span>
          </div>
          <p className="text-white/60 text-xs mt-1">Total Stars</p>
        </div>
      </div>

      {/* Weekly progress dots */}
      <div className="bg-white/5 rounded-2xl p-4 mb-5">
        <p className="text-white/60 text-xs mb-3 uppercase tracking-wider">This Week</p>
        <div className="flex justify-between">
          {weekDots.map((dot, i) => {
            const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(dot.date).getDay()];
            return (
              <div key={dot.date} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    dot.active
                      ? 'bg-green-500 scale-110'
                      : 'bg-white/10'
                  }`}
                >
                  {dot.active && <Star size={14} className="text-white" fill="currentColor" />}
                </div>
                <span className="text-white/40 text-xs">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Challenge */}
      <button
        onClick={() => {
          playTap();
          haptic(30);
          onStartChallenge?.(challenge);
        }}
        className="w-full bg-gradient-to-r bg-[#6B9080] rounded-2xl p-5 mb-5 text-left"
      >
        <p className="text-white/70 text-xs uppercase tracking-wider mb-2">Today's Challenge</p>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{challenge.emoji}</span>
          <div className="flex-1">
            <h3 className="text-white text-lg font-bold">{challenge.title}</h3>
            <p className="text-white/70 text-sm">{challenge.description}</p>
          </div>
          <ChevronRight className="text-white/50" size={20} />
        </div>
      </button>

      {/* Mystery Reward */}
      {mysteryAvailable && !mysteryRevealed && (
        <button
          onClick={claimMystery}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-5 text-center animate-pulse"
        >
          <Gift size={32} className="text-white mx-auto mb-2" />
          <h3 className="text-white text-lg font-bold">Mystery Reward!</h3>
          <p className="text-white/70 text-sm">Tap to unwrap your surprise</p>
        </button>
      )}
      {mysteryRevealed && (
        <div className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-5 mb-5 text-center">
          <span className="text-4xl">&#127775;</span>
          <h3 className="text-white text-lg font-bold mt-1">+{mysteryStars} Bonus Stars!</h3>
          <p className="text-white/80 text-sm">Great job staying consistent!</p>
        </div>
      )}

      {/* Bedtime suggestion */}
      {isBedtime && onOpenCalmCorner && (
        <button
          onClick={() => {
            playTap();
            onOpenCalmCorner();
          }}
          className="w-full bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <Moon size={28} className="text-indigo-300" />
            <div className="flex-1">
              <h3 className="text-white text-lg font-bold">Wind Down Time</h3>
              <p className="text-white/70 text-sm">Visit the Calm Corner before bed</p>
            </div>
            <ChevronRight className="text-white/50" size={20} />
          </div>
        </button>
      )}
    </div>
  );
}
