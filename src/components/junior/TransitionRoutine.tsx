// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TransitionRoutine — Elite transition experience for Aminy Junior
 *
 * ENHANCED FEATURES:
 * 1. Visual countdown timer with animated circle depletion
 * 2. "Now → Next" card system with photos/emojis
 * 3. Warning sequence: 5-min, 2-min, "Almost time!" — distinct gentle sounds
 * 4. First/Then board integration
 * 5. "I'm ready!" button — child taps when they feel ready
 * 6. Parent notes: "This transition was hard/easy" logged with timestamp
 * 7. 5 customizable transition sounds via Web Audio
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, SkipForward, Wind, Star, CheckCircle, ChevronRight, ArrowRight, Music, Bell, ClipboardList } from 'lucide-react';
import { playTap, playSuccess, haptic } from './activities/sounds';

// ============================================
// WEB AUDIO: 5 TRANSITION SOUNDS
// ============================================

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch { return null; }
}

type TransitionSound = 'chime' | 'bell' | 'whoosh' | 'gentle' | 'sparkle';

function playTransitionSound(sound: TransitionSound = 'chime') {
  const ctx = getCtx();
  if (!ctx) return;

  if (sound === 'chime') {
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 1.0;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.3);
    });
  } else if (sound === 'bell') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2.1);
  } else if (sound === 'whoosh') {
    const bufSize = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } else if (sound === 'gentle') {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.3;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.9);
    });
  } else if (sound === 'sparkle') {
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1200 + Math.random() * 800;
      const start = ctx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    }
  }
}

// Warning sounds
function playWarning(urgency: 'low' | 'medium' | 'high') {
  const ctx = getCtx();
  if (!ctx) return;
  const freq = urgency === 'low' ? 660 : urgency === 'medium' ? 770 : 880;
  const repeats = urgency === 'high' ? 3 : urgency === 'medium' ? 2 : 1;
  for (let i = 0; i < repeats; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.25;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  }
}

// Celebration jingle
function playCelebration() {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.8);
  });
}

// ============================================
// PARENT LOG (localStorage)
// ============================================

interface TransitionNote {
  timestamp: string;
  fromActivity: string;
  toActivity: string;
  durationSeconds: number;
  rating: 'great' | 'ok' | 'rough';
  childReady: boolean;
}

function logTransitionNote(note: TransitionNote) {
  try {
    const key = 'aminy-transition-notes';
    const existing: TransitionNote[] = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(note);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
  } catch { /* */ }
}

// ============================================
// TYPES
// ============================================

export interface TransitionRoutineProps {
  fromActivity: string;
  toActivity: string;
  fromEmoji?: string;
  toEmoji?: string;
  durationSeconds?: number;
  onComplete: () => void;
  onSkip: () => void;
  calmBridgeEnabled?: boolean;
  soundChoice?: TransitionSound;
}

type Phase = 'countdown' | 'calm-bridge' | 'ready-check' | 'celebration';

// ============================================
// COLOR HELPER
// ============================================

function timerColor(pct: number): string {
  if (pct > 0.5) {
    const t = (pct - 0.5) / 0.5;
    const r = Math.round(255 * (1 - t));
    const g = Math.round(200 + 55 * t);
    return `rgb(${r}, ${g}, 0)`;
  }
  const t = pct / 0.5;
  const g = Math.round(200 * t);
  return `rgb(255, ${g}, 0)`;
}

// ============================================
// SOUND PICKER
// ============================================

const SOUND_OPTIONS: { id: TransitionSound; label: string; emoji: string }[] = [
  { id: 'chime', label: 'Chime', emoji: '🔔' },
  { id: 'bell', label: 'Bell', emoji: '🕭' },
  { id: 'whoosh', label: 'Whoosh', emoji: '💨' },
  { id: 'gentle', label: 'Gentle', emoji: '🎶' },
  { id: 'sparkle', label: 'Sparkle', emoji: '✨' },
];

function SoundPicker({ current, onChange }: { current: TransitionSound; onChange: (s: TransitionSound) => void }) {
  return (
    <div className="bg-white/10 rounded-2xl p-3">
      <p className="text-white/60 text-xs mb-2 text-center uppercase tracking-wide">Transition sound</p>
      <div className="flex gap-2 justify-center">
        {SOUND_OPTIONS.map(s => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => { playTransitionSound(s.id); onChange(s.id); }}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all"
            style={{ background: current === s.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' }}
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="text-[9px] text-white/70">{s.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TransitionRoutine({
  fromActivity,
  toActivity,
  fromEmoji = '📚',
  toEmoji = '🎮',
  durationSeconds = 60,
  onComplete,
  onSkip,
  calmBridgeEnabled = true,
  soundChoice: initialSound = 'chime',
}: TransitionRoutineProps) {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [remaining, setRemaining] = useState(durationSeconds);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathTimer, setBreathTimer] = useState(30);
  const [showCalmOffer, setShowCalmOffer] = useState(false);
  const [celebrationStars, setCelebrationStars] = useState<number[]>([]);
  const [childReady, setChildReady] = useState(false);
  const [parentRating, setParentRating] = useState<'great' | 'ok' | 'rough' | null>(null);
  const [showParentNote, setShowParentNote] = useState(false);
  const [soundChoice, setSoundChoice] = useState<TransitionSound>(initialSound);
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const warned5 = useRef(false);
  const warned2 = useRef(false);
  const warned1 = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // ── Countdown timer ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          if (calmBridgeEnabled) setShowCalmOffer(true);
          else enterCelebration();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Warnings ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (remaining <= 300 && remaining > 295 && !warned5.current) {
      warned5.current = true;
      playWarning('low');
      haptic(30);
    }
    if (remaining <= 120 && remaining > 115 && !warned2.current) {
      warned2.current = true;
      playWarning('medium');
      haptic(50);
    }
    if (remaining <= 60 && remaining > 55 && !warned1.current) {
      warned1.current = true;
      playWarning('high');
      haptic([60, 30, 80]);
    }
  }, [remaining, phase]);

  // ── Calm bridge ──
  useEffect(() => {
    if (phase !== 'calm-bridge') return;
    let elapsed = 0;
    const cycle = 10;
    const iv = setInterval(() => {
      elapsed++;
      setBreathTimer(30 - elapsed);
      const pos = elapsed % cycle;
      if (pos < 4) setBreathPhase('in');
      else if (pos < 6) setBreathPhase('hold');
      else setBreathPhase('out');
      if (elapsed >= 30) { clearInterval(iv); enterReadyCheck(); }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const enterCelebration = useCallback(() => {
    setPhase('celebration');
    playCelebration();
    haptic([50, 100, 50, 100, 50]);
    const stars: number[] = [];
    const iv = setInterval(() => {
      stars.push(Math.random());
      setCelebrationStars([...stars]);
      if (stars.length >= 12) {
        clearInterval(iv);
        setShowParentNote(true);
      }
    }, 200);
  }, []);

  const enterReadyCheck = useCallback(() => {
    setPhase('ready-check');
  }, []);

  const handleChildReady = useCallback(() => {
    setChildReady(true);
    playSuccess();
    haptic([30, 20, 60]);
    setTimeout(() => enterCelebration(), 500);
  }, [enterCelebration]);

  const handleParentRating = useCallback((rating: 'great' | 'ok' | 'rough') => {
    setParentRating(rating);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    logTransitionNote({
      timestamp: new Date().toISOString(),
      fromActivity,
      toActivity,
      durationSeconds: duration,
      rating,
      childReady,
    });
    setTimeout(() => onComplete(), 1000);
  }, [fromActivity, toActivity, childReady, onComplete]);

  const pct = remaining / durationSeconds;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const warningLevel = remaining <= 60 ? 'high' : remaining <= 120 ? 'medium' : remaining <= 300 ? 'low' : null;
  const warningText = remaining <= 60 ? 'Almost time!' : remaining <= 120 ? '2 minutes left' : remaining <= 300 ? '5 minutes left' : null;

  // ── Parent note phase ──
  if (showParentNote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6"
        style={{ background: 'linear-gradient(160deg, #1e3a5f 0%, #312e81 100%)' }}>
        <ClipboardList className="text-blue-300 mb-3" size={36} />
        <h2 className="text-white text-xl font-bold mb-1">How did it go?</h2>
        <p className="text-white/60 text-sm mb-6">Quick note for next time</p>
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {(['great', 'ok', 'rough'] as const).map(r => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleParentRating(r)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
              style={{
                background: parentRating === r ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                borderColor: parentRating === r ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
              }}
            >
              <span className="text-2xl">{r === 'great' ? '😊' : r === 'ok' ? '😐' : '😤'}</span>
              <span className="text-white text-sm font-semibold capitalize">{r}</span>
            </motion.button>
          ))}
        </div>
        <button
          onClick={() => onComplete()}
          className="mt-6 text-white/50 text-sm"
        >
          Skip →
        </button>
      </div>
    );
  }

  // ── Celebration phase ──
  if (phase === 'celebration') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 100%)' }}>
        {celebrationStars.map((r, i) => (
          <Star key={i} className="absolute text-yellow-300 animate-bounce" size={20 + Math.random() * 16}
            style={{ left: `${10 + r * 80}%`, top: `${20 + (i * 5) % 60}%`, animationDelay: `${i * 0.1}s` }}
            fill="currentColor"
          />
        ))}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-7xl mb-4">
          🌟
        </motion.div>
        <h2 className="text-white text-2xl font-bold mb-2">You did it!</h2>
        <p className="text-white/70 text-lg">Time for {toEmoji} {toActivity}!</p>

        {/* I'm ready button */}
        {!childReady && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleChildReady}
            className="mt-8 px-8 py-4 rounded-3xl font-bold text-white text-lg shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}
          >
            I'm ready! 🙌
          </motion.button>
        )}
        {childReady && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-5xl">
            🎉
          </motion.div>
        )}
      </div>
    );
  }

  // ── Ready check phase ──
  if (phase === 'ready-check') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6"
        style={{ background: 'linear-gradient(160deg, #065f46 0%, #1e3a5f 100%)' }}>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-6xl mb-6"
        >
          🤔
        </motion.div>
        <h2 className="text-white text-2xl font-bold mb-3 text-center">Do you feel ready?</h2>
        <div className="text-center mb-8">
          <p className="text-white/60 text-base">Time to go to</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-4xl">{toEmoji}</span>
            <span className="text-white font-bold text-xl">{toActivity}</span>
          </div>
        </div>
        <div className="flex gap-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleChildReady}
            className="px-8 py-4 rounded-2xl font-bold text-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            I'm ready! 🙌
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setShowCalmOffer(false); setPhase('calm-bridge'); }}
            className="px-6 py-4 rounded-2xl font-medium text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Wind size={16} className="inline mr-1" /> Need a breath
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Calm bridge ──
  if (phase === 'calm-bridge') {
    const breathScale = breathPhase === 'in' ? 'scale-125' : breathPhase === 'hold' ? 'scale-125' : 'scale-100';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6"
        style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)' }}>
        <Wind className="text-blue-300 mb-4" size={32} />
        <h2 className="text-white text-xl font-bold mb-2">Calm Bridge</h2>
        <p className="text-white/50 text-sm mb-6">A few deep breaths before we go</p>
        <motion.div
          animate={{ scale: breathPhase === 'in' ? 1.25 : 1 }}
          transition={{ type: 'spring', stiffness: 20, damping: 10 }}
          className="w-36 h-36 rounded-full border-4 border-blue-300/50 flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
        >
          <span className="text-white font-bold text-sm text-center px-3">
            {breathPhase === 'in' ? 'Breathe\nIn' : breathPhase === 'hold' ? 'Hold' : 'Breathe\nOut'}
          </span>
        </motion.div>
        <p className="text-white/50 mt-6 text-sm">{breathTimer}s remaining</p>
        <button
          onClick={() => enterReadyCheck()}
          className="mt-8 px-6 py-3 rounded-full text-white/60 text-sm"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          Skip breathing
        </button>
      </div>
    );
  }

  // ── Countdown phase ──
  return (
    <div className="flex flex-col items-center min-h-screen pt-8 pb-6 px-5"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>

      {/* Now → Next cards */}
      <div className="flex items-center gap-4 mb-8 w-full max-w-sm">
        <div className="flex-1 rounded-3xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p className="text-white/40 text-xs mb-2 uppercase tracking-wider font-semibold">Now</p>
          <span className="text-5xl block mb-2">{fromEmoji}</span>
          <p className="text-white font-medium text-sm truncate">{fromActivity}</p>
        </div>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowRight className="text-white/40" size={28} />
        </motion.div>
        <div className="flex-1 rounded-3xl p-5 text-center"
          style={{ background: 'rgba(99,102,241,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <p className="text-purple-300 text-xs mb-2 uppercase tracking-wider font-semibold">Next</p>
          <span className="text-5xl block mb-2">{toEmoji}</span>
          <p className="text-white font-medium text-sm truncate">{toActivity}</p>
        </div>
      </div>

      {/* Circular timer */}
      <div className="relative mb-6">
        <svg width="190" height="190" viewBox="0 0 190 190">
          <circle cx="95" cy="95" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
          <motion.circle
            cx="95" cy="95" r={radius} fill="none"
            stroke={timerColor(pct)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 95 95)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white text-4xl font-bold font-mono">{formatTime(remaining)}</span>
          <span className="text-white/40 text-sm mt-1">remaining</span>
        </div>
        {/* Pulsing glow when urgent */}
        {warningLevel === 'high' && (
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.2), transparent)' }}
          />
        )}
      </div>

      {/* Warning banner */}
      <AnimatePresence>
        {warningText && (
          <motion.div
            key={warningText}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-5 py-2 rounded-2xl mb-4 text-sm font-semibold"
            style={{
              background: warningLevel === 'high' ? 'rgba(239,68,68,0.2)' : warningLevel === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)',
              border: `1px solid ${warningLevel === 'high' ? 'rgba(239,68,68,0.4)' : warningLevel === 'medium' ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.4)'}`,
              color: warningLevel === 'high' ? '#FCA5A5' : warningLevel === 'medium' ? '#FDE68A' : '#C4B5FD',
            }}
          >
            <Bell size={14} className="inline mr-1.5" />
            {warningText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calm bridge offer (shows at 0) */}
      <AnimatePresence>
        {showCalmOffer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl p-5 mb-5 w-full max-w-xs text-center"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <p className="text-purple-200 mb-4 text-sm">Do you need a breath before the switch?</p>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => { setShowCalmOffer(false); setPhase('calm-bridge'); }}
                className="px-5 py-2.5 rounded-2xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
              >
                <Wind size={14} className="inline mr-1" /> Yes please
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => { setShowCalmOffer(false); enterReadyCheck(); }}
                className="px-5 py-2.5 rounded-2xl font-medium text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                I'm ready! 🙌
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound picker toggle */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowSoundPicker(p => !p)}
        className="flex items-center gap-2 text-white/50 text-sm mb-3"
      >
        <Music size={14} />
        Transition sound
        <ChevronRight size={12} className={`transition-transform ${showSoundPicker ? 'rotate-90' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {showSoundPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-xs mb-4 overflow-hidden"
          >
            <SoundPicker current={soundChoice} onChange={setSoundChoice} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <button
        onClick={() => { playTap(); haptic(30); onSkip(); }}
        className="flex items-center gap-2 px-5 py-3 rounded-full text-sm text-white/40 transition-colors mt-2"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <SkipForward size={16} />
        Skip transition
      </button>
    </div>
  );
}
