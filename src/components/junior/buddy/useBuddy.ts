// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BuddyMood =
  | 'happy'
  | 'excited'
  | 'calm'
  | 'sleepy'
  | 'encouraging'
  | 'celebrating'
  | 'thinking';

export interface BuddyState {
  mood: BuddyMood;
  energy: number; // 0-100
  accessories: string[];
  lastActivityTime: number; // timestamp
}

export interface BuddySpeech {
  text: string;
  duration?: number; // ms, default 3000
  mood?: BuddyMood;
}

const STORAGE_KEY = 'aminy-ease-buddy';
const ENERGY_DECAY_INTERVAL = 60_000; // 1 minute
const ENERGY_DECAY_AMOUNT = 1;

const DEFAULT_STATE: BuddyState = {
  mood: 'happy',
  energy: 50,
  accessories: [],
  lastActivityTime: Date.now(),
};

function loadState(): BuddyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BuddyState;
      // Clamp energy
      parsed.energy = Math.max(0, Math.min(100, parsed.energy));
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATE };
}

function saveState(state: BuddyState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBuddy() {
  const [state, setState] = useState<BuddyState>(loadState);
  const [currentSpeech, setCurrentSpeech] = useState<string | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Energy decay over time
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.energy <= 0) return prev;
        const newEnergy = Math.max(0, prev.energy - ENERGY_DECAY_AMOUNT);
        const newMood: BuddyMood = newEnergy < 15 ? 'sleepy' : prev.mood;
        return { ...prev, energy: newEnergy, mood: newMood };
      });
    }, ENERGY_DECAY_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const setMood = useCallback((mood: BuddyMood) => {
    setState((prev) => ({ ...prev, mood }));
  }, []);

  const addEnergy = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      energy: Math.min(100, prev.energy + amount),
      lastActivityTime: Date.now(),
      mood: prev.energy + amount >= 90 ? 'excited' : prev.mood === 'sleepy' ? 'happy' : prev.mood,
    }));
  }, []);

  const setAccessories = useCallback((accessories: string[]) => {
    setState((prev) => ({ ...prev, accessories }));
  }, []);

  const toggleAccessory = useCallback((accessory: string) => {
    setState((prev) => {
      const has = prev.accessories.includes(accessory);
      return {
        ...prev,
        accessories: has
          ? prev.accessories.filter((a) => a !== accessory)
          : [...prev.accessories, accessory],
      };
    });
  }, []);

  const say = useCallback((speech: BuddySpeech) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setCurrentSpeech(speech.text);
    if (speech.mood) {
      setState((prev) => ({ ...prev, mood: speech.mood! }));
    }
    speechTimerRef.current = setTimeout(() => {
      setCurrentSpeech(null);
      speechTimerRef.current = null;
    }, speech.duration ?? 3000);
  }, []);

  return {
    mood: state.mood,
    energy: state.energy,
    accessories: state.accessories,
    currentSpeech,
    setMood,
    addEnergy,
    setAccessories,
    toggleAccessory,
    say,
  };
}

export function useBuddySpeech() {
  const [currentSpeech, setCurrentSpeech] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((speech: BuddySpeech) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentSpeech(speech.text);
    timerRef.current = setTimeout(() => {
      setCurrentSpeech(null);
      timerRef.current = null;
    }, speech.duration ?? 3000);
  }, []);

  return { say, currentSpeech };
}
