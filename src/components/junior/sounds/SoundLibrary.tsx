// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SoundLibrary — Illustrated Feelscape sound browser
 *
 * Beautiful sunset gradient background, category pills, 2-column card grid,
 * simultaneous mixing (max 2), per-sound volume, sleep timer, now-playing bar.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Pause,
  Timer,
  Lock,
  Heart,
  Volume2,
  X,
  Moon,
} from 'lucide-react';
import { SOUNDS, SOUND_CATEGORIES, SLEEP_TIMER_OPTIONS, type SoundCategory, type SoundDefinition } from './sound-data';
import { createSoundGenerator, type SoundGenerator } from './sound-engine';
import { playTap, haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface SoundLibraryProps {
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Active sound state
// ---------------------------------------------------------------------------
interface ActiveSound {
  def: SoundDefinition;
  generator: SoundGenerator;
  volume: number;
}

// ---------------------------------------------------------------------------
// Max simultaneous sounds
// ---------------------------------------------------------------------------
const MAX_MIX = 2;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SoundLibrary({ onBack }: SoundLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | 'favorites'>('nature');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('aminy-sound-favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [activeSounds, setActiveSounds] = useState<Map<string, ActiveSound>>(new Map());
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [volumeEditId, setVolumeEditId] = useState<string | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('aminy-sound-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerEnd === null) return;
    const remaining = sleepTimerEnd - Date.now();
    if (remaining <= 0) {
      stopAll();
      setSleepTimer(null);
      setSleepTimerEnd(null);
      return;
    }
    sleepTimerRef.current = setTimeout(() => {
      stopAll();
      setSleepTimer(null);
      setSleepTimerEnd(null);
    }, remaining);
    return () => { if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current); };
  }, [sleepTimerEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeSounds.forEach(s => s.generator.stop());
    };
  }, []);

  const stopAll = useCallback(() => {
    setActiveSounds(prev => {
      prev.forEach(s => s.generator.stop());
      return new Map();
    });
  }, []);

  const toggleSound = useCallback((def: SoundDefinition) => {
    if (def.premium) {
      playTap();
      return; // Premium sounds locked
    }
    haptic(30);

    setActiveSounds(prev => {
      const next = new Map(prev);
      if (next.has(def.id)) {
        // Stop this sound
        next.get(def.id)!.generator.stop();
        next.delete(def.id);
        return next;
      }
      // Enforce max mix
      if (next.size >= MAX_MIX) {
        // Stop oldest
        const oldestKey = next.keys().next().value;
        if (oldestKey) {
          next.get(oldestKey)!.generator.stop();
          next.delete(oldestKey);
        }
      }
      // Start new
      const generator = createSoundGenerator(def.generatorType, def.generatorConfig);
      generator.start();
      next.set(def.id, { def, generator, volume: 0.7 });
      return next;
    });
  }, []);

  const setVolume = useCallback((id: string, v: number) => {
    setActiveSounds(prev => {
      const next = new Map(prev);
      const entry = next.get(id);
      if (entry) {
        entry.generator.setVolume(v);
        next.set(id, { ...entry, volume: v });
      }
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    haptic(20);
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startSleepTimer = useCallback((minutes: number) => {
    setSleepTimer(minutes);
    setSleepTimerEnd(Date.now() + minutes * 60 * 1000);
    setShowTimerPicker(false);
    haptic(40);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    setSleepTimer(null);
    setSleepTimerEnd(null);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  }, []);

  // Filter sounds
  const filtered = selectedCategory === 'favorites'
    ? SOUNDS.filter(s => favorites.has(s.id))
    : SOUNDS.filter(s => s.category === selectedCategory);

  const hasActive = activeSounds.size > 0;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FF9A56 0%, #FF6B8A 25%, #C06CC6 50%, #6C63FF 75%, #2D1B69 100%)',
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-white/90 active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft size={22} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-lg font-bold text-white tracking-wide">Feelscapes</h1>
        <button
          onClick={() => setShowTimerPicker(true)}
          className="relative flex items-center gap-1 text-white/80 active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Timer size={20} />
          {sleepTimer && (
            <span className="text-sm font-bold text-white">{sleepTimer}m</span>
          )}
        </button>
      </div>

      {/* ── Category Pills ────────────────────────────── */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        {SOUND_CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id as SoundCategory | 'favorites'); playTap(); }}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={{
                background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Sound Grid ────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-32 scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-white/60">
            <Heart size={40} />
            <p className="mt-3 text-sm">No favorites yet. Tap the heart on any sound!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(sound => {
              const isPlaying = activeSounds.has(sound.id);
              const isFav = favorites.has(sound.id);
              return (
                <motion.div
                  key={sound.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${sound.gradientFrom}, ${sound.gradientTo})`,
                      boxShadow: isPlaying
                        ? `0 0 20px ${sound.gradientFrom}88, 0 4px 12px rgba(0,0,0,0.2)`
                        : '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {/* Favorite button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(sound.id); }}
                      className="absolute top-2 right-2 z-10 p-1"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Heart
                        size={16}
                        fill={isFav ? '#fff' : 'none'}
                        color="#fff"
                        strokeWidth={2}
                      />
                    </button>

                    {/* Card body */}
                    <button
                      onClick={() => toggleSound(sound)}
                      className="w-full p-4 pb-3 text-left active:scale-[0.97] transition-transform"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {/* Emoji illustration */}
                      <div className="text-4xl mb-2">{sound.emoji}</div>

                      {/* Name */}
                      <h3 className="text-white font-bold text-sm leading-tight">{sound.name}</h3>

                      {/* Label + Lock */}
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.9)',
                          }}
                        >
                          {sound.type === 'haptic' ? 'Haptic' : 'Feelscape'}
                        </span>
                        {sound.premium && (
                          <Lock size={12} color="rgba(255,255,255,0.7)" />
                        )}
                      </div>

                      {/* Playing indicator */}
                      {isPlaying && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex gap-0.5">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-1 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.8)' }}
                                animate={{ height: [4, 12, 4] }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 0.8,
                                  delay: i * 0.15,
                                  ease: 'easeInOut',
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-white/70 ml-1">Playing</span>
                        </div>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Now Playing Bar ───────────────────────────── */}
      <AnimatePresence>
        {hasActive && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30"
            style={{
              background: 'linear-gradient(180deg, rgba(45,27,105,0.95) 0%, rgba(45,27,105,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
          >
            <div className="px-4 pt-3 pb-2">
              {/* Active sounds */}
              {[...activeSounds.entries()].map(([id, active]) => (
                <div key={id} className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{active.def.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{active.def.name}</p>
                    {/* Volume slider */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(active.volume * 100)}
                      onChange={e => setVolume(id, Number(e.target.value) / 100)}
                      className="w-full h-1.5 rounded-full appearance-none mt-1"
                      style={{
                        background: `linear-gradient(to right, #fff ${active.volume * 100}%, rgba(255,255,255,0.2) ${active.volume * 100}%)`,
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => toggleSound(active.def)}
                    className="p-2 rounded-full active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <Pause size={16} color="#fff" />
                  </button>
                </div>
              ))}

              {/* Timer + Stop All row */}
              <div className="flex items-center justify-between mt-1">
                {sleepTimer ? (
                  <button
                    onClick={cancelSleepTimer}
                    className="flex items-center gap-1 text-sm text-white/60"
                  >
                    <Moon size={12} />
                    <span>Sleep in {sleepTimer}m</span>
                    <X size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowTimerPicker(true)}
                    className="flex items-center gap-1 text-sm text-white/50"
                  >
                    <Moon size={12} />
                    <span>Sleep Timer</span>
                  </button>
                )}
                <button
                  onClick={stopAll}
                  className="text-sm text-white/50 font-medium active:text-white/80"
                >
                  Stop All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sleep Timer Picker ────────────────────────── */}
      <AnimatePresence>
        {showTimerPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowTimerPicker(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md rounded-t-3xl p-6"
              style={{
                background: 'linear-gradient(180deg, #3D2D7B, #2D1B69)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 24px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.3)' }} />
              <h3 className="text-white font-bold text-lg mb-4 text-center">Sleep Timer</h3>
              <div className="grid grid-cols-2 gap-3">
                {SLEEP_TIMER_OPTIONS.map(opt => (
                  <button
                    key={opt.minutes}
                    onClick={() => startSleepTimer(opt.minutes)}
                    className="py-3 rounded-xl text-white font-semibold text-sm active:scale-95"
                    style={{
                      background: sleepTimer === opt.minutes
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {sleepTimer && (
                <button
                  onClick={() => { cancelSleepTimer(); setShowTimerPicker(false); }}
                  className="w-full mt-3 py-3 rounded-xl text-white/60 font-medium text-sm active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  Cancel Timer
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
