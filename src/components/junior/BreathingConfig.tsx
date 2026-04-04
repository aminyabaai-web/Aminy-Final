/**
 * BreathingConfig — Tappy-beating breathing exercise configurator + player
 *
 * Features:
 * - Sunset gradient background (peach -> rose -> lavender -> deep blue)
 * - Animated breathing orb with 3 visual modes: Rings, Flower, Blob
 * - 9 exercise types with configurable duration
 * - Phase labels, progress, cycle counter
 * - Web Audio phase tones (no file deps)
 * - Completion screen with stars + emoji picker
 * - Medical disclaimer
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { playTap, haptic } from './activities/sounds';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BreathingConfigProps {
  onBack: () => void;
  onComplete?: (data: { exercise: string; duration: number; cycles: number }) => void;
}

// ---------------------------------------------------------------------------
// Exercise definitions
// ---------------------------------------------------------------------------
interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  /** Phases in seconds: [inhale, hold1?, exhale, hold2?] — 0 means skip */
  pattern: number[];
  phaseLabels: string[];
}

const EXERCISES: BreathingExercise[] = [
  { id: 'gentle', name: 'Gentle', description: 'Easy & calming', pattern: [3, 0, 3, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
  { id: 'calm', name: 'Calm', description: 'Extended exhale', pattern: [4, 0, 6, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
  { id: 'sleep', name: 'Sleep', description: 'Wind down', pattern: [4, 0, 7, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
  { id: 'box', name: 'Box', description: 'Structured 4-4-4-4', pattern: [4, 4, 4, 4], phaseLabels: ['Breathe In...', 'Hold...', 'Breathe Out...', 'Rest...'] },
  { id: 'focus', name: 'Focus', description: 'Balanced energy', pattern: [4, 0, 4, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
  { id: 'relaxation', name: 'Relaxation', description: 'Deep calm', pattern: [4, 2, 8, 0], phaseLabels: ['Breathe In...', 'Hold...', 'Breathe Out...', ''] },
  { id: 'balance', name: 'Balance', description: 'Centered & steady', pattern: [5, 0, 5, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
  { id: 'resonant', name: 'Resonant', description: 'HRV coherence', pattern: [5.5, 0, 5.5, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
  { id: 'awake', name: 'Awake', description: 'Energizing', pattern: [3, 0, 1, 0], phaseLabels: ['Breathe In...', '', 'Breathe Out...', ''] },
];

const DURATIONS = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '4 min', seconds: 240 },
  { label: '5 min', seconds: 300 },
];

type OrbMode = 'rings' | 'flower' | 'blob';
const ORB_MODES: { id: OrbMode; label: string }[] = [
  { id: 'rings', label: 'Rings' },
  { id: 'flower', label: 'Flower' },
  { id: 'blob', label: 'Blob' },
];

const FEEL_EMOJIS = [
  { emoji: '\uD83D\uDE0A', label: 'Calm' },
  { emoji: '\uD83D\uDE34', label: 'Sleepy' },
  { emoji: '\uD83D\uDE04', label: 'Happy' },
  { emoji: '\uD83E\uDD14', label: 'Okay' },
  { emoji: '\uD83D\uDE1F', label: 'Still anxious' },
];

// ---------------------------------------------------------------------------
// Web Audio phase tones
// ---------------------------------------------------------------------------
function playPhaseTone(phase: 'inhale' | 'exhale' | 'hold') {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    if (phase === 'inhale') {
      osc.frequency.value = 396;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    } else if (phase === 'exhale') {
      osc.frequency.value = 285;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    } else {
      osc.frequency.value = 341;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch { /* no audio */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BreathingConfig({ onBack, onComplete }: BreathingConfigProps) {
  const [exercise, setExercise] = useState<BreathingExercise>(EXERCISES[0]);
  const [duration, setDuration] = useState(60);
  const [orbMode, setOrbMode] = useState<OrbMode>('rings');
  const [mode, setMode] = useState<'config' | 'active' | 'complete'>('config');

  // Active session state
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0); // index in pattern
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [breathScale, setBreathScale] = useState(0.6); // 0.6 = contracted, 1.0 = expanded
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const phaseStartRef = useRef(0);

  // Compute active phases (skip phases with 0 duration)
  const activePhases = useMemo(() => {
    const phases: { duration: number; label: string; type: 'inhale' | 'hold' | 'exhale' | 'rest' }[] = [];
    const types: ('inhale' | 'hold' | 'exhale' | 'rest')[] = ['inhale', 'hold', 'exhale', 'rest'];
    exercise.pattern.forEach((dur, i) => {
      if (dur > 0) {
        phases.push({ duration: dur, label: exercise.phaseLabels[i], type: types[i] });
      }
    });
    return phases;
  }, [exercise]);

  const cycleDuration = useMemo(() => activePhases.reduce((a, p) => a + p.duration, 0), [activePhases]);

  // Pattern display string
  const patternString = useMemo(() => {
    const parts: string[] = [];
    if (exercise.pattern[0]) parts.push(`${exercise.pattern[0]}s Inhale`);
    if (exercise.pattern[1]) parts.push(`${exercise.pattern[1]}s Hold`);
    if (exercise.pattern[2]) parts.push(`${exercise.pattern[2]}s Exhale`);
    if (exercise.pattern[3]) parts.push(`${exercise.pattern[3]}s Rest`);
    return parts.join('  \u2192  ');
  }, [exercise]);

  // Start exercise
  const startExercise = useCallback(() => {
    setMode('active');
    setElapsed(0);
    setCycles(0);
    setCurrentPhase(0);
    setPhaseElapsed(0);
    setPaused(false);
    setBreathScale(0.6);
    lastTimeRef.current = performance.now();
    phaseStartRef.current = performance.now();
    haptic(50);
    playPhaseTone('inhale');
  }, []);

  // Animation loop
  useEffect(() => {
    if (mode !== 'active' || paused) return;

    let prevPhaseIdx = currentPhase;

    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setElapsed(prev => {
        const next = prev + dt;
        if (next >= duration) {
          // Complete
          setMode('complete');
          return duration;
        }
        return next;
      });

      setPhaseElapsed(prev => {
        let next = prev + dt;
        const phase = activePhases[prevPhaseIdx];
        if (!phase) return 0;

        // Phase transition
        if (next >= phase.duration) {
          next = next - phase.duration;
          prevPhaseIdx = (prevPhaseIdx + 1) % activePhases.length;
          setCurrentPhase(prevPhaseIdx);
          if (prevPhaseIdx === 0) {
            setCycles(c => c + 1);
          }
          // Play tone for new phase
          const newPhase = activePhases[prevPhaseIdx];
          if (newPhase) {
            if (newPhase.type === 'inhale') playPhaseTone('inhale');
            else if (newPhase.type === 'exhale') playPhaseTone('exhale');
            else playPhaseTone('hold');
          }
          haptic(20);
        }

        // Update breath scale based on phase
        const phase2 = activePhases[prevPhaseIdx];
        if (phase2) {
          const progress = next / phase2.duration;
          if (phase2.type === 'inhale') {
            setBreathScale(0.6 + 0.4 * progress);
          } else if (phase2.type === 'exhale') {
            setBreathScale(1.0 - 0.4 * progress);
          }
          // hold/rest: scale stays where it is
        }

        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, paused, activePhases, duration, currentPhase]);

  const handleComplete = useCallback(() => {
    onComplete?.({ exercise: exercise.id, duration, cycles });
    onBack();
  }, [exercise, duration, cycles, onComplete, onBack]);

  // ─── Config Screen ────────────────────────────────────────
  if (mode === 'config') {
    return (
      <div
        className="fixed inset-0 flex flex-col overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #FFDAB9 0%, #F4A0A8 20%, #C9A0DC 45%, #8B9AD8 70%, #2D3561 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center px-4 pt-12 pb-2">
          <button onClick={onBack} className="flex items-center gap-1 text-white/90 active:scale-95">
            <ArrowLeft size={22} />
            <span className="text-sm font-medium">Calm Corner</span>
          </button>
        </div>

        <div className="px-5 pb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Breathing</h1>
          <p className="text-white/70 text-sm mb-5">Choose your rhythm and relax</p>

          {/* Orb Mode Selector */}
          <div className="flex gap-2 mb-5">
            {ORB_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setOrbMode(m.id); playTap(); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: orbMode === m.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  color: orbMode === m.id ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Exercise Type Pills */}
          <h2 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Exercise</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {EXERCISES.map(ex => {
              const active = exercise.id === ex.id;
              return (
                <button
                  key={ex.id}
                  onClick={() => { setExercise(ex); playTap(); }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    background: active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {ex.name}
                </button>
              );
            })}
          </div>

          {/* Selected exercise details */}
          <div
            className="rounded-2xl p-4 mb-5"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}
          >
            <p className="text-white font-bold text-base">{exercise.name}</p>
            <p className="text-white/60 text-xs mb-2">{exercise.description}</p>
            <p className="text-white/90 text-sm font-medium">{patternString}</p>
          </div>

          {/* Duration Pills */}
          <h2 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Duration</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {DURATIONS.map(d => {
              const active = duration === d.seconds;
              return (
                <button
                  key={d.seconds}
                  onClick={() => { setDuration(d.seconds); playTap(); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    background: active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Start Button */}
          <button
            onClick={startExercise}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg active:scale-[0.97] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #FFDAB9, #E07A5F)',
              boxShadow: '0 8px 24px rgba(224,122,95,0.4)',
            }}
          >
            Start Breathing Exercise
          </button>

          {/* Disclaimer */}
          <p className="text-white/30 text-xs text-center mt-4">
            For relaxation only. Not medical advice.
          </p>
        </div>
      </div>
    );
  }

  // ─── Active Session ───────────────────────────────────────
  if (mode === 'active') {
    const phase = activePhases[currentPhase];
    const progress = elapsed / duration;
    const phaseProgress = phase ? phaseElapsed / phase.duration : 0;

    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #FFDAB9 0%, #F4A0A8 20%, #C9A0DC 45%, #8B9AD8 70%, #2D3561 100%)',
        }}
        onClick={() => setPaused(p => !p)}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12">
          <button
            onClick={(e) => { e.stopPropagation(); setMode('config'); }}
            className="text-white/70 active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
          <span className="text-white/60 text-sm font-medium">{exercise.name}</span>
          <span className="text-white/60 text-sm font-mono">
            {Math.floor((duration - elapsed) / 60)}:{String(Math.floor((duration - elapsed) % 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Cycle counter */}
        <div className="absolute top-24 text-white/40 text-xs font-medium">
          Cycle {cycles + 1}
        </div>

        {/* Breathing Orb */}
        <div className="relative" style={{ width: 240, height: 240 }}>
          {orbMode === 'rings' && <RingsOrb scale={breathScale} phaseProgress={phaseProgress} />}
          {orbMode === 'flower' && <FlowerOrb scale={breathScale} phaseProgress={phaseProgress} />}
          {orbMode === 'blob' && <BlobOrb scale={breathScale} phaseProgress={phaseProgress} />}
        </div>

        {/* Phase label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={phase?.label || 'none'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-white text-2xl font-bold mt-8"
          >
            {paused ? 'Paused' : (phase?.label || '')}
          </motion.p>
        </AnimatePresence>

        {/* Phase timer */}
        {phase && !paused && (
          <p className="text-white/50 text-sm mt-2">
            {Math.ceil(phase.duration - phaseElapsed)}s
          </p>
        )}

        {/* Progress bar */}
        <div
          className="absolute bottom-24 left-8 right-8 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FFDAB9, #E07A5F)',
              width: `${progress * 100}%`,
            }}
          />
        </div>

        {/* Tap to pause hint */}
        <p className="absolute bottom-14 text-white/25 text-xs">Tap to {paused ? 'resume' : 'pause'}</p>

        {/* Paused overlay */}
        {paused && (
          <div className="absolute bottom-32 flex gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); setMode('config'); }}
              className="px-5 py-2 rounded-xl text-white/70 text-sm font-medium active:scale-95"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <RotateCcw size={16} className="inline mr-1" /> Restart
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Complete Screen ──────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{
        background: 'linear-gradient(180deg, #FFDAB9 0%, #F4A0A8 20%, #C9A0DC 45%, #8B9AD8 70%, #2D3561 100%)',
      }}
    >
      {/* Stars */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <Sparkles size={48} color="#FFD700" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-white text-2xl font-bold mt-4"
      >
        Great Breathing!
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 rounded-2xl p-4 w-full max-w-xs text-center"
        style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}
      >
        <p className="text-white/80 text-sm">
          <span className="font-bold text-white">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span> of {exercise.name} breathing
        </p>
        <p className="text-white/50 text-xs mt-1">{cycles} complete cycles</p>
      </motion.div>

      {/* How do you feel? */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 w-full max-w-xs"
      >
        <p className="text-white/70 text-sm text-center mb-3">How do you feel?</p>
        <div className="flex justify-center gap-3">
          {FEEL_EMOJIS.map(f => (
            <button
              key={f.label}
              onClick={() => { setSelectedFeeling(f.label); haptic(30); }}
              className="flex flex-col items-center gap-1 active:scale-90"
              style={{ opacity: selectedFeeling && selectedFeeling !== f.label ? 0.4 : 1 }}
            >
              <span className="text-3xl">{f.emoji}</span>
              <span className="text-white/50 text-xs">{f.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Done button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        onClick={handleComplete}
        className="mt-8 w-full max-w-xs py-4 rounded-2xl text-white font-bold text-lg active:scale-[0.97]"
        style={{
          background: 'linear-gradient(135deg, #FFDAB9, #E07A5F)',
          boxShadow: '0 8px 24px rgba(224,122,95,0.4)',
        }}
      >
        Done
      </motion.button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orb Visuals
// ---------------------------------------------------------------------------

function RingsOrb({ scale, phaseProgress }: { scale: number; phaseProgress: number }) {
  const ringCount = 5;
  return (
    <div className="w-full h-full flex items-center justify-center">
      {Array.from({ length: ringCount }).map((_, i) => {
        const ringScale = scale * (1 - i * 0.12);
        const opacity = 0.6 - i * 0.1;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 200 * ringScale,
              height: 200 * ringScale,
              border: `2px solid rgba(255,255,255,${opacity})`,
              background: i === 0
                ? `radial-gradient(circle, rgba(255,218,185,${0.4 * scale}) 0%, rgba(200,160,220,${0.3 * scale}) 50%, rgba(139,154,216,${0.2 * scale}) 100%)`
                : 'transparent',
              transition: 'width 0.1s linear, height 0.1s linear',
            }}
          />
        );
      })}
    </div>
  );
}

function FlowerOrb({ scale, phaseProgress }: { scale: number; phaseProgress: number }) {
  const petalCount = 8;
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Center circle */}
      <div
        className="absolute rounded-full"
        style={{
          width: 60 * scale,
          height: 60 * scale,
          background: 'radial-gradient(circle, #FFDAB9, #E07A5F)',
          transition: 'width 0.1s linear, height 0.1s linear',
        }}
      />
      {/* Petals */}
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i / petalCount) * 360;
        const petalLength = 80 * scale;
        const petalWidth = 40 * scale;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              width: petalWidth,
              height: petalLength,
              borderRadius: '50%',
              background: `linear-gradient(180deg, rgba(255,218,185,${0.5 * scale}), rgba(200,160,220,${0.3 * scale}))`,
              transform: `rotate(${angle}deg) translateY(-${petalLength * 0.4}px)`,
              transformOrigin: 'center bottom',
              transition: 'width 0.1s linear, height 0.1s linear',
            }}
          />
        );
      })}
    </div>
  );
}

function BlobOrb({ scale, phaseProgress }: { scale: number; phaseProgress: number }) {
  // Organic blob using border-radius animation
  const r1 = 40 + Math.sin(phaseProgress * Math.PI * 2) * 10;
  const r2 = 60 - Math.sin(phaseProgress * Math.PI * 2 + 1) * 10;
  const r3 = 50 + Math.cos(phaseProgress * Math.PI * 2) * 10;
  const r4 = 45 - Math.cos(phaseProgress * Math.PI * 2 + 2) * 10;
  const size = 180 * scale;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: `${r1}% ${100 - r1}% ${r2}% ${100 - r2}% / ${r3}% ${r4}% ${100 - r4}% ${100 - r3}%`,
          background: `radial-gradient(circle at 40% 40%, #FFDAB9 0%, #F4A0A8 30%, #C9A0DC 60%, #8B9AD8 100%)`,
          boxShadow: `0 0 ${40 * scale}px rgba(200,160,220,0.4), 0 0 ${80 * scale}px rgba(139,154,216,0.2)`,
          transition: 'width 0.1s linear, height 0.1s linear, border-radius 0.15s ease',
        }}
      />
    </div>
  );
}
