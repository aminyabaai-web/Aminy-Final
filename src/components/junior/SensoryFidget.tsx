/**
 * SensoryFidget — Calm Corner sensory regulation tool
 *
 * Tabs:
 * 1. Tap Fidget   — big pulse-on-tap circle with ripple + counter
 * 2. Breathing    — 4-4-4 guided breath circle (teal/blue)
 * 3. Calm Spinner — drag-to-spin mandala that slows naturally
 * 4. Color Tap    — 3×3 calm-palette grid, tap to glow
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Tab = 'tap' | 'breathe' | 'spin' | 'colors';
type BreathPhase = 'inhale' | 'hold' | 'exhale';

export interface SensoryFidgetProps {
  onBack: () => void;
  childName?: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'tap',     label: 'Tap',    emoji: '👆' },
  { id: 'breathe', label: 'Breathe', emoji: '🌬️' },
  { id: 'spin',    label: 'Spin',   emoji: '🌀' },
  { id: 'colors',  label: 'Colors', emoji: '🎨' },
];

const CALM_COLORS = [
  '#43AA8B', // teal
  '#9B8EC4', // lavender
  '#7CBB9B', // sage
  '#77B5D9', // sky blue
  '#E8A598', // soft coral
  '#A8C5A0', // mint green
  '#C4A4CF', // soft purple
  '#F7D9A0', // warm cream
  '#89C4D4', // powder blue
];

const TAP_COLORS = [
  '#43AA8B',
  '#77B5D9',
  '#9B8EC4',
  '#7CBB9B',
  '#E8A598',
  '#A8C5A0',
];

// ─────────────────────────────────────────────
// RIPPLE
// ─────────────────────────────────────────────

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// ─────────────────────────────────────────────
// TAP FIDGET TAB
// ─────────────────────────────────────────────

function TapFidget({ childName }: { childName?: string }) {
  const [tapCount, setTapCount] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [colorIdx, setColorIdx] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const rippleId = useRef(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setTapCount(0);
      setColorIdx(0);
    }, 10000);
  }, []);

  const handleTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Haptic (works on mobile)
    if (navigator.vibrate) navigator.vibrate(30);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = ++rippleId.current;
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);

    setTapCount(prev => prev + 1);
    setColorIdx(prev => (prev + 1) % TAP_COLORS.length);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 200);

    resetInactivity();
  }, [resetInactivity]);

  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  const currentColor = TAP_COLORS[colorIdx];

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 px-6">
      <p className="text-slate-300 text-sm text-center">
        {childName ? `${childName}, tap the circle` : 'Tap the circle'} — feel the rhythm
      </p>

      <div
        className="relative flex items-center justify-center"
        onPointerDown={handleTap}
        style={{ width: 240, height: 240, touchAction: 'none', cursor: 'pointer' }}
      >
        {/* Ripples */}
        <AnimatePresence>
          {ripples.map(r => (
            <motion.div
              key={r.id}
              initial={{ width: 40, height: 40, opacity: 0.6, borderRadius: '50%', x: r.x - 20, y: r.y - 20 }}
              animate={{ width: 200, height: 200, opacity: 0, x: r.x - 100, y: r.y - 100 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                border: `2px solid ${currentColor}`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </AnimatePresence>

        {/* Main circle */}
        <motion.div
          animate={{
            scale: isPulsing ? 1.12 : 1,
            boxShadow: isPulsing
              ? `0 0 48px 12px ${currentColor}88`
              : `0 0 24px 4px ${currentColor}44`,
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            backgroundColor: `${currentColor}33`,
            border: `4px solid ${currentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: 48, lineHeight: 1 }}>✨</span>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <motion.span
          key={tapCount}
          initial={{ scale: 1.4, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-5xl font-bold text-white"
        >
          {tapCount}
        </motion.span>
        <span className="text-slate-400 text-sm">taps</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BREATHING TAB
// ─────────────────────────────────────────────

const BREATH_PHASES: { phase: BreathPhase; label: string; duration: number }[] = [
  { phase: 'inhale', label: 'Breathe in...', duration: 4000 },
  { phase: 'hold',   label: 'Hold...',        duration: 4000 },
  { phase: 'exhale', label: 'Breathe out...', duration: 4000 },
];

function BreathingGuide() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [running, setRunning] = useState(false);

  const currentPhase = BREATH_PHASES[phaseIdx];

  useEffect(() => {
    if (!running) return;

    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 4;
        return prev - 1;
      });
    }, 1000);

    const phaseTimer = setTimeout(() => {
      setPhaseIdx(prev => (prev + 1) % BREATH_PHASES.length);
    }, currentPhase.duration);

    return () => {
      clearInterval(interval);
      clearTimeout(phaseTimer);
    };
  }, [phaseIdx, running, currentPhase.duration]);

  const circleScale = currentPhase.phase === 'inhale' ? 1.5
    : currentPhase.phase === 'hold' ? 1.5
    : 0.85;

  const circleDuration = currentPhase.phase === 'inhale' ? 4
    : currentPhase.phase === 'hold' ? 0.2
    : 4;

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 px-6">
      {!running ? (
        <div className="flex flex-col items-center gap-6">
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #43AA8B44, #77B5D944)',
              border: '3px solid #43AA8B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 56 }}>🌬️</span>
          </div>
          <button
            onClick={() => setRunning(true)}
            className="px-8 py-3 rounded-2xl text-white font-semibold text-lg"
            style={{ background: 'linear-gradient(135deg, #43AA8B, #77B5D9)' }}
          >
            Start Breathing
          </button>
        </div>
      ) : (
        <>
          <motion.div
            animate={{ scale: circleScale }}
            transition={{ duration: circleDuration, ease: currentPhase.phase === 'hold' ? 'linear' : 'easeInOut' }}
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #43AA8B66, #77B5D966)',
              border: '4px solid #43AA8B',
              boxShadow: '0 0 32px #43AA8B55',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.span
              key={phaseIdx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl font-bold text-white"
            >
              {countdown}
            </motion.span>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.p
              key={phaseIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl text-white font-medium text-center"
            >
              {currentPhase.label}
            </motion.p>
          </AnimatePresence>

          {/* Phase dots */}
          <div className="flex gap-3">
            {BREATH_PHASES.map((p, i) => (
              <div
                key={p.phase}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: i === phaseIdx ? '#43AA8B' : '#43AA8B44',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => { setRunning(false); setPhaseIdx(0); setCountdown(4); }}
            className="text-slate-400 text-sm underline"
          >
            Stop
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CALM SPINNER TAB
// ─────────────────────────────────────────────

function CalmSpinner() {
  const rotation = useMotionValue(0);
  const angularVelocity = useRef(0);
  const lastAngle = useRef(0);
  const lastTime = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const centerRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getAngle = (x: number, y: number) => {
    const dx = x - centerRef.current.x;
    const dy = y - centerRef.current.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const updateCenter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    updateCenter();
    isDragging.current = true;
    lastAngle.current = getAngle(e.clientX, e.clientY);
    lastTime.current = Date.now();
    angularVelocity.current = 0;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const now = Date.now();
    const angle = getAngle(e.clientX, e.clientY);
    let delta = angle - lastAngle.current;
    // Normalize delta to [-180, 180]
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const dt = Math.max(now - lastTime.current, 1);
    angularVelocity.current = delta / dt * 16; // deg per frame @60fps

    rotation.set(rotation.get() + delta);
    lastAngle.current = angle;
    lastTime.current = now;
  };

  const onPointerUp = () => {
    isDragging.current = false;
    startCoast();
  };

  const startCoast = () => {
    const FRICTION = 0.97;
    const MIN_VEL = 0.05;

    const frame = () => {
      if (isDragging.current) return;
      if (Math.abs(angularVelocity.current) < MIN_VEL) {
        angularVelocity.current = 0;
        return;
      }
      angularVelocity.current *= FRICTION;
      rotation.set(rotation.get() + angularVelocity.current);
      animFrameRef.current = requestAnimationFrame(frame);
    };
    animFrameRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Slow auto-rotation when idle
  useEffect(() => {
    const controls = animate(rotation, rotation.get() + 360, {
      duration: 30,
      ease: 'linear',
      repeat: Infinity,
    });
    return () => controls.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      <p className="text-slate-300 text-sm text-center">Drag to spin — watch it slow</p>

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ width: 240, height: 240, touchAction: 'none', cursor: 'grab', position: 'relative' }}
      >
        <motion.svg
          width={240}
          height={240}
          viewBox="0 0 240 240"
          style={{ rotate: rotation }}
        >
          {/* Outer ring */}
          <circle cx={120} cy={120} r={115} fill="none" stroke="#43AA8B44" strokeWidth={2} />
          {/* Petal shapes — 8 petals */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * 360;
            const hue = (i / 8) * 360;
            return (
              <ellipse
                key={i}
                cx={120}
                cy={70}
                rx={18}
                ry={48}
                fill={`hsla(${hue}, 60%, 70%, 0.45)`}
                transform={`rotate(${angle} 120 120)`}
              />
            );
          })}
          {/* Inner hexagon */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * 360;
            return (
              <ellipse
                key={`inner-${i}`}
                cx={120}
                cy={95}
                rx={10}
                ry={24}
                fill={`hsla(${180 + i * 30}, 60%, 65%, 0.5)`}
                transform={`rotate(${angle} 120 120)`}
              />
            );
          })}
          {/* Center */}
          <circle cx={120} cy={120} r={22} fill="#0D1B2A" stroke="#43AA8B" strokeWidth={2} />
          <circle cx={120} cy={120} r={12} fill="#43AA8B55" />
        </motion.svg>
      </div>

      <p className="text-[#5A6B7A] text-xs text-center">Let go and watch it coast...</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// COLOR TAP TAB
// ─────────────────────────────────────────────

function ColorTap() {
  const [glowing, setGlowing] = useState<Record<number, boolean>>({});
  const [pattern, setPattern] = useState<{ key: number; idx: number }[]>([]);
  const patternKey = useRef(0);

  const handleTap = (idx: number) => {
    if (navigator.vibrate) navigator.vibrate(20);
    setGlowing(prev => ({ ...prev, [idx]: true }));
    setPattern(prev => [...prev.slice(-5), { key: ++patternKey.current, idx }]);
    setTimeout(() => setGlowing(prev => ({ ...prev, [idx]: false })), 500);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      <p className="text-slate-300 text-sm text-center">Tap each color — make a pattern</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          width: 240,
        }}
      >
        {CALM_COLORS.map((color, idx) => (
          <motion.button
            key={idx}
            onPointerDown={() => handleTap(idx)}
            animate={{
              scale: glowing[idx] ? 1.18 : 1,
              boxShadow: glowing[idx]
                ? `0 0 24px 8px ${color}cc`
                : `0 0 8px 2px ${color}44`,
            }}
            transition={{ duration: 0.15 }}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: glowing[idx]
                ? `radial-gradient(circle at 35% 35%, ${color}ff, ${color}aa)`
                : `radial-gradient(circle at 35% 35%, ${color}88, ${color}44)`,
              border: `3px solid ${color}`,
              cursor: 'pointer',
              touchAction: 'none',
            }}
          />
        ))}
      </div>

      {/* Pattern indicator */}
      <div className="flex gap-2 h-6 items-center">
        <AnimatePresence>
          {pattern.map(({ key, idx }) => (
            <motion.div
              key={key}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: CALM_COLORS[idx],
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function SensoryFidget({ onBack, childName }: SensoryFidgetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tap');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0D1B2A', color: '#fff', maxWidth: 430, margin: '0 auto' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-5 pb-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ background: '#ffffff18' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold text-white">Calm Corner ✨</h1>
          {childName && <p className="text-xs text-slate-400">{childName}'s space</p>}
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Tab bar */}
      <div
        className="flex mx-4 mb-4 rounded-2xl overflow-hidden"
        style={{ background: '#ffffff10' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 flex flex-col items-center gap-1 transition-all"
            style={{
              background: activeTab === tab.id ? '#43AA8B33' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #43AA8B' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.emoji}</span>
            <span
              className="text-xs font-medium"
              style={{ color: activeTab === tab.id ? '#43AA8B' : '#94a3b8' }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col flex-1"
          style={{ minHeight: 0 }}
        >
          {activeTab === 'tap'     && <TapFidget childName={childName} />}
          {activeTab === 'breathe' && <BreathingGuide />}
          {activeTab === 'spin'    && <CalmSpinner />}
          {activeTab === 'colors'  && <ColorTap />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom safe-area spacer */}
      <div style={{ height: 'env(safe-area-inset-bottom, 16px)', minHeight: 16 }} />
    </div>
  );
}
