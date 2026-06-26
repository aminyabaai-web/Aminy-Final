// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Eye,
  Ear,
  Hand,
  Flower2,
  Apple,
  Star,
  ChevronRight,
  Check,
  TreePine,
  Cloud,
  Waves,
  Rocket,
  RotateCcw,
} from 'lucide-react';
import { playTap, playSuccess, haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// SVG color constants — mapped to Tailwind palette for consistency
// ---------------------------------------------------------------------------

/** Tailwind slate-200 (#e2e8f0) — body part default fill */
const SLATE_200 = '#e2e8f0';
/** Tailwind slate-400 (#94a3b8) — body outline stroke */
const SLATE_400 = '#94a3b8';
/** Tailwind teal-300 (#5eead4) — body part completed fill */
const TEAL_300 = '#5eead4';
/** Tailwind teal-600 (#6B9080) — face detail accent */
const TEAL_600 = '#4E93A8';
/** Tailwind indigo-100 (#e0e7ff) — inactive corner fill */
const INDIGO_100 = '#e0e7ff';
/** Tailwind indigo-200 (#c7d2fe) — square border stroke */
const INDIGO_200 = '#c7d2fe';
/** Tailwind indigo-300 (#a5b4fc) — corner stroke */
const INDIGO_300 = '#a5b4fc';
/** Tailwind indigo-500 (#6366f1) — active dot / active corner fill */
const INDIGO_500 = '#6366f1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroundingExercisesProps {
  onBack: () => void;
  childName?: string;
}

type ExerciseId = 'five-senses' | 'body-scan' | 'safe-place' | 'square-breathing';

interface UsageStat {
  exercise: ExerciseId;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aminy-grounding';

function loadStats(): UsageStat[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStat(stat: UsageStat) {
  const stats = loadStats();
  stats.push(stat);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

/** Export for therapist insight */
export function getGroundingStats(): { exercise: string; count: number }[] {
  const stats = loadStats();
  const counts: Record<string, number> = {};
  stats.forEach(s => { counts[s.exercise] = (counts[s.exercise] || 0) + 1; });
  return Object.entries(counts).map(([exercise, count]) => ({ exercise, count })).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Exercises data
// ---------------------------------------------------------------------------

const EXERCISES: { id: ExerciseId; label: string; description: string; emoji: string; bgColor: string; borderColor: string }[] = [
  { id: 'five-senses', label: '5-4-3-2-1 Senses', description: 'Notice what is around you right now', emoji: '👁️', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  { id: 'body-scan', label: 'Body Scan', description: 'Feel your body from toes to head', emoji: '🧍', bgColor: 'bg-[#6B9080]/10', borderColor: 'border-[#6B9080]/20' },
  { id: 'safe-place', label: 'Safe Place', description: 'Imagine your favorite calm place', emoji: '🏖️', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'square-breathing', label: 'Square Breathing', description: 'Breathe along the square path', emoji: '🟦', bgColor: 'bg-indigo-50', borderColor: 'border-[#6B9080]/20' },
];

// ---------------------------------------------------------------------------
// 5-4-3-2-1 Senses
// ---------------------------------------------------------------------------

const SENSES_STEPS = [
  { count: 5, sense: 'SEE', prompt: 'things you can see right now', icon: <Eye className="h-8 w-8" />, color: 'text-sky-600' },
  { count: 4, sense: 'HEAR', prompt: 'things you can hear', icon: <Ear className="h-8 w-8" />, color: 'text-green-600' },
  { count: 3, sense: 'TOUCH', prompt: 'things you can feel', icon: <Hand className="h-8 w-8" />, color: 'text-orange-600' },
  { count: 2, sense: 'SMELL', prompt: 'things you can smell', icon: <Flower2 className="h-8 w-8" />, color: 'text-pink-600' },
  { count: 1, sense: 'TASTE', prompt: 'thing you can taste', icon: <Apple className="h-8 w-8" />, color: 'text-red-600' },
];

function FiveSenses({ onFinish }: { onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const step = SENSES_STEPS[stepIndex];
  const totalSteps = SENSES_STEPS.length;
  const progress = (stepIndex / totalSteps) * 100;

  const addItem = () => {
    if (!currentInput.trim()) return;
    playTap();
    haptic(20);
    const newItems = [...items, currentInput.trim()];
    setItems(newItems);
    setCurrentInput('');
    if (newItems.length >= step.count) {
      // Move to next step
      setTimeout(() => {
        if (stepIndex < totalSteps - 1) {
          setStepIndex(prev => prev + 1);
          setItems([]);
        } else {
          playSuccess();
          haptic(60);
          saveStat({ exercise: 'five-senses', timestamp: Date.now() });
          onFinish();
        }
      }, 400);
    }
  };

  return (
    <div className="space-y-5 text-center">
      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-[#EDF4F7] overflow-hidden">
        <motion.div
          className="h-full bg-sky-400 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Step */}
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-3"
      >
        <div className={`${step.color}`}>{step.icon}</div>
        <div className="text-lg font-bold text-[#132F43]">
          Name <span className="text-2xl">{step.count}</span> {step.prompt}
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">{step.sense}</div>
      </motion.div>

      {/* Items entered */}
      <div className="flex flex-wrap justify-center gap-2 min-h-[32px]">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
            >
              {item}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={currentInput}
          onChange={e => setCurrentInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={`Type what you ${step.sense.toLowerCase()}...`}
          className="flex-1 rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
        <button
          type="button"
          onClick={addItem}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm active:scale-95"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>

      <div className="text-sm text-slate-400">
        {items.length} / {step.count}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body Scan
// ---------------------------------------------------------------------------

const BODY_ZONES = [
  { id: 'feet', label: 'Feet & Toes', y: 92, prompt: 'Wiggle your toes. Feel the floor under your feet.' },
  { id: 'legs', label: 'Legs', y: 75, prompt: 'Feel your legs. Are they heavy or light?' },
  { id: 'belly', label: 'Tummy', y: 55, prompt: 'Put your hand on your belly. Feel it go in and out as you breathe.' },
  { id: 'chest', label: 'Chest', y: 42, prompt: 'Feel your heart beating. Take a slow breath.' },
  { id: 'hands', label: 'Hands & Arms', y: 52, prompt: 'Squeeze your fists, then let go. Feel the difference.' },
  { id: 'shoulders', label: 'Shoulders', y: 30, prompt: 'Lift your shoulders up to your ears, then drop them. Ahh.' },
  { id: 'face', label: 'Face', y: 18, prompt: 'Scrunch your face, then relax. Smooth forehead, relaxed jaw.' },
  { id: 'head', label: 'Head', y: 8, prompt: 'Imagine warm sunlight on the top of your head. You are calm.' },
];

function BodyScan({ onFinish }: { onFinish: () => void }) {
  const [zoneIndex, setZoneIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const zone = BODY_ZONES[zoneIndex];

  const advance = () => {
    playTap();
    haptic(30);
    setCompleted(prev => new Set(prev).add(zone.id));
    if (zoneIndex < BODY_ZONES.length - 1) {
      setZoneIndex(prev => prev + 1);
    } else {
      playSuccess();
      haptic(60);
      saveStat({ exercise: 'body-scan', timestamp: Date.now() });
      onFinish();
    }
  };

  return (
    <div className="space-y-4">
      {/* Body outline */}
      <div className="relative mx-auto h-64 w-32">
        {/* Simple body SVG */}
        <svg viewBox="0 0 100 200" className="absolute inset-0 h-full w-full">
          {/* Head */}
          <circle cx="50" cy="20" r="15" fill={completed.has('head') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          {/* Body */}
          <rect x="35" y="38" width="30" height="50" rx="10" fill={completed.has('chest') || completed.has('belly') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          {/* Arms */}
          <rect x="10" y="42" width="22" height="8" rx="4" fill={completed.has('hands') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          <rect x="68" y="42" width="22" height="8" rx="4" fill={completed.has('hands') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          {/* Shoulders */}
          <rect x="28" y="35" width="44" height="8" rx="4" fill={completed.has('shoulders') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          {/* Legs */}
          <rect x="37" y="90" width="10" height="45" rx="5" fill={completed.has('legs') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          <rect x="53" y="90" width="10" height="45" rx="5" fill={completed.has('legs') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          {/* Feet */}
          <ellipse cx="42" cy="140" rx="8" ry="5" fill={completed.has('feet') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          <ellipse cx="58" cy="140" rx="8" ry="5" fill={completed.has('feet') ? TEAL_300 : SLATE_200} stroke={SLATE_400} strokeWidth="1.5" />
          {/* Face detail */}
          {completed.has('face') && (
            <>
              <circle cx="44" cy="18" r="2" fill={TEAL_600} />
              <circle cx="56" cy="18" r="2" fill={TEAL_600} />
              <path d="M44 24 Q50 28 56 24" stroke={TEAL_600} strokeWidth="1.5" fill="none" />
            </>
          )}
        </svg>

        {/* Pulse indicator */}
        <motion.div
          key={zone.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-teal-400 shadow-lg"
          style={{ top: `${zone.y}%` }}
        />
      </div>

      {/* Prompt card */}
      <motion.div
        key={zone.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-[#6B9080]/20 bg-[#6B9080]/10 p-4 text-center"
      >
        <div className="text-sm font-semibold text-[#6B9080] mb-1">{zone.label}</div>
        <p className="text-sm text-[#6B9080]">{zone.prompt}</p>
      </motion.div>

      <button
        type="button"
        onClick={advance}
        className="mx-auto flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
      >
        <Check className="h-4 w-4" />
        {zoneIndex < BODY_ZONES.length - 1 ? 'Next zone' : 'Finish'}
      </button>

      <div className="text-sm text-center text-slate-400">
        {completed.size} / {BODY_ZONES.length} zones
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Safe Place Visualization
// ---------------------------------------------------------------------------

const SAFE_PLACES = [
  { id: 'beach', label: 'Beach', emoji: '🏖️', color: 'from-sky-200 to-amber-100', freq: 200 },
  { id: 'forest', label: 'Forest', emoji: '🌲', color: 'from-green-200 to-emerald-100', freq: 150 },
  { id: 'clouds', label: 'Clouds', emoji: '☁️', color: 'from-blue-100 to-white', freq: 180 },
  { id: 'space', label: 'Space', emoji: '🚀', color: 'from-indigo-300 to-violet-200', freq: 120 },
];

function SafePlace({ onFinish }: { onFinish: () => void }) {
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const DURATION = 60; // seconds

  const startAmbient = useCallback((freq: number) => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      gain.gain.value = 0.08;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      nodesRef.current = { osc, gain };
    } catch {
      // no audio
    }
  }, []);

  const stopAmbient = useCallback(() => {
    try {
      nodesRef.current?.osc.stop();
      audioCtxRef.current?.close();
    } catch {
      // ignore
    }
    nodesRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const startSession = (placeId: string) => {
    playTap();
    setSelectedPlace(placeId);
    setPlaying(true);
    setElapsed(0);
    const place = SAFE_PLACES.find(p => p.id === placeId);
    if (place) startAmbient(place.freq);
  };

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= DURATION - 1) {
            setPlaying(false);
            stopAmbient();
            playSuccess();
            haptic(60);
            saveStat({ exercise: 'safe-place', timestamp: Date.now() });
            onFinish();
            return DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, stopAmbient, onFinish]);

  // Cleanup on unmount
  useEffect(() => () => stopAmbient(), [stopAmbient]);

  const place = SAFE_PLACES.find(p => p.id === selectedPlace);

  if (!selectedPlace) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-[#5A6B7A]">Choose your safe place</p>
        <div className="grid grid-cols-2 gap-3">
          {SAFE_PLACES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => startSession(p.id)}
              className={`rounded-[20px] bg-gradient-to-b ${p.color} p-6 text-center shadow-sm active:scale-95`}
            >
              <div className="text-3xl mb-2">{p.emoji}</div>
              <div className="text-sm font-semibold text-[#3A4A57]">{p.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`rounded-[28px] bg-gradient-to-b ${place?.color || ''} p-8 shadow-inner`}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="text-6xl mb-4"
        >
          {place?.emoji}
        </motion.div>
        <p className="text-sm text-[#5A6B7A]">Close your eyes and imagine you are here. Breathe slowly.</p>
      </motion.div>

      {/* Timer */}
      <div className="text-2xl font-bold tabular-nums text-[#3A4A57]">
        {Math.floor((DURATION - elapsed) / 60)}:{String((DURATION - elapsed) % 60).padStart(2, '0')}
      </div>

      <div className="h-2 w-full rounded-full bg-[#EDF4F7] overflow-hidden">
        <motion.div
          className="h-full bg-amber-400 rounded-full"
          animate={{ width: `${(elapsed / DURATION) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          playTap();
          setPlaying(false);
          stopAmbient();
          setSelectedPlace(null);
          setElapsed(0);
        }}
        className="mx-auto flex items-center gap-2 rounded-2xl bg-[#EDF4F7] px-4 py-2 text-sm text-[#5A6B7A] active:scale-95"
      >
        <RotateCcw className="h-4 w-4" /> Change place
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Square Breathing
// ---------------------------------------------------------------------------

const SQUARE_PHASES: { label: string; duration: number }[] = [
  { label: 'Breathe in', duration: 4 },
  { label: 'Hold', duration: 4 },
  { label: 'Breathe out', duration: 4 },
  { label: 'Hold', duration: 4 },
];

function SquareBreathing({ onFinish }: { onFinish: () => void }) {
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondInPhase, setSecondInPhase] = useState(0);
  const [cycles, setCycles] = useState(0);
  const TARGET_CYCLES = 4;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = SQUARE_PHASES[phaseIndex];

  // Square path positions (top-left, top-right, bottom-right, bottom-left)
  const POSITIONS = [
    { x: 15, y: 15 }, // top-left (breathe in — moving right)
    { x: 85, y: 15 }, // top-right (hold — moving down)
    { x: 85, y: 85 }, // bottom-right (breathe out — moving left)
    { x: 15, y: 85 }, // bottom-left (hold — moving up)
  ];
  const nextPos = POSITIONS[(phaseIndex + 1) % 4];
  const currPos = POSITIONS[phaseIndex];
  const t = secondInPhase / phase.duration;
  const dotX = currPos.x + (nextPos.x - currPos.x) * t;
  const dotY = currPos.y + (nextPos.y - currPos.y) * t;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondInPhase(prev => {
        if (prev + 1 >= phase.duration) {
          const nextPhase = (phaseIndex + 1) % 4;
          if (nextPhase === 0) {
            const newCycles = cycles + 1;
            setCycles(newCycles);
            if (newCycles >= TARGET_CYCLES) {
              setRunning(false);
              playSuccess();
              haptic(60);
              saveStat({ exercise: 'square-breathing', timestamp: Date.now() });
              onFinish();
              return 0;
            }
          }
          setPhaseIndex(nextPhase);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phaseIndex, phase.duration, cycles, onFinish]);

  return (
    <div className="space-y-6 text-center">
      {/* Square */}
      <div className="relative mx-auto h-48 w-48">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {/* Square border */}
          <rect x="15" y="15" width="70" height="70" rx="8" fill="none" stroke={INDIGO_200} strokeWidth="3" />
          {/* Traced path */}
          {running && (
            <motion.circle
              cx={dotX}
              cy={dotY}
              r="6"
              fill={INDIGO_500}
            />
          )}
          {/* Corner labels */}
          {POSITIONS.map((pos, i) => (
            <circle
              key={i}
              cx={pos.x}
              cy={pos.y}
              r="4"
              fill={phaseIndex === i && running ? INDIGO_500 : INDIGO_100}
              stroke={INDIGO_300}
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* Phase label */}
      <motion.div
        key={`${phaseIndex}-${cycles}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-bold text-indigo-700"
      >
        {running ? phase.label : 'Ready?'}
      </motion.div>

      {running && (
        <div className="text-3xl font-bold tabular-nums text-indigo-500">
          {phase.duration - secondInPhase}
        </div>
      )}

      {/* Cycles */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: TARGET_CYCLES }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full transition-colors ${
              i < cycles ? 'bg-indigo-500' : 'bg-indigo-100'
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      {!running ? (
        <button
          type="button"
          onClick={() => { playTap(); setRunning(true); setPhaseIndex(0); setSecondInPhase(0); setCycles(0); }}
          className="mx-auto rounded-2xl bg-indigo-500 px-8 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
        >
          Start
        </button>
      ) : (
        <button
          type="button"
          onClick={() => { playTap(); setRunning(false); }}
          className="mx-auto rounded-2xl bg-[#EDF4F7] px-8 py-3 text-sm font-medium text-[#5A6B7A] active:scale-95"
        >
          Stop
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion overlay
// ---------------------------------------------------------------------------

function CompletionOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        className="mx-8 rounded-[28px] bg-white p-8 text-center shadow-xl"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: 2, duration: 0.5 }}
          className="text-5xl mb-3"
        >
          🌟
        </motion.div>
        <h3 className="text-lg font-bold text-[#132F43] mb-1">Great job!</h3>
        <p className="text-sm text-[#5A6B7A] mb-5">You did amazing grounding yourself.</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-2xl bg-primary px-8 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function GroundingExercises({ onBack, childName = 'Buddy' }: GroundingExercisesProps) {
  const [activeExercise, setActiveExercise] = useState<ExerciseId | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const handleFinish = useCallback(() => {
    setShowCompletion(true);
  }, []);

  const dismissCompletion = () => {
    setShowCompletion(false);
    setActiveExercise(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6FBFB] to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={() => { playTap(); activeExercise ? setActiveExercise(null) : onBack(); }} className="flex items-center gap-2 text-sm font-medium text-[#5A6B7A]">
            <ArrowLeft className="h-5 w-5" />
            {activeExercise ? 'Exercises' : 'Back'}
          </button>
          <div className="text-sm font-semibold text-[#132F43]">
            {activeExercise ? EXERCISES.find(e => e.id === activeExercise)?.label : 'Grounding Exercises'}
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-5 pb-24">
        {!activeExercise ? (
          <>
            <div className="mb-5 text-center">
              <div className="text-2xl mb-1">🌿</div>
              <h2 className="text-lg font-semibold text-[#132F43]">Feel grounded</h2>
              <p className="text-sm text-[#5A6B7A] mt-1">Pick an exercise to calm your body and mind.</p>
            </div>

            <div className="space-y-3">
              {EXERCISES.map(ex => (
                <motion.button
                  key={ex.id}
                  type="button"
                  onClick={() => { playTap(); haptic(30); setActiveExercise(ex.id); }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex w-full items-center gap-4 rounded-[20px] border ${ex.borderColor} ${ex.bgColor} p-4 text-left shadow-sm`}
                >
                  <div className="text-2xl">{ex.emoji}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#132F43]">{ex.label}</div>
                    <div className="text-sm text-[#5A6B7A]">{ex.description}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2">
            {activeExercise === 'five-senses' && <FiveSenses onFinish={handleFinish} />}
            {activeExercise === 'body-scan' && <BodyScan onFinish={handleFinish} />}
            {activeExercise === 'safe-place' && <SafePlace onFinish={handleFinish} />}
            {activeExercise === 'square-breathing' && <SquareBreathing onFinish={handleFinish} />}
          </div>
        )}
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {showCompletion && <CompletionOverlay onDismiss={dismissCompletion} />}
      </AnimatePresence>
    </div>
  );
}
