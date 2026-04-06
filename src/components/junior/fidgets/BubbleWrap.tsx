// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * BubbleWrap — Satisfying bubble-popping grid
 * Tap to pop, multi-touch, pop-all button, reset.
 */
import { useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, RotateCcw, Zap } from 'lucide-react';
import { haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

const ROWS = 10;
const COLS = 7;
const TOTAL = ROWS * COLS;

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  } catch { return null; }
}

// Unique pitch per bubble index — higher index = higher pitch pop
function playBubblePop(delay = 0, pitchVariant = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  // Noise burst for realistic pop — pitch varies by bubble position
  const bufferSize = ctx.sampleRate * 0.035;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // Playback rate shifts pitch: range from 0.7x (low) to 2.0x (high)
  source.playbackRate.value = 0.7 + (pitchVariant % TOTAL) / TOTAL * 1.3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200 + (pitchVariant % 20) * 80;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
}

// Satisfying "all popped" reward sound
function playAllPopped() {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.15, start + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.6);
  });
}

export default function BubbleWrap({ onBack, onComplete }: FidgetProps) {
  const [popped, setPopped] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [popCount, setPopCount] = useState(0);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);

  const pop = useCallback((index: number) => {
    if (popped[index]) return;
    playBubblePop(0, index); // unique pitch per bubble index
    haptic(25);
    interactions.current++;
    setPopped(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setPopCount(c => c + 1);
  }, [popped]);

  const popAll = useCallback(() => {
    const unpopped = popped.map((p, i) => p ? -1 : i).filter(i => i >= 0);
    unpopped.forEach((idx, i) => {
      setTimeout(() => {
        playBubblePop(0, idx); // unique pitch per index
        haptic(15);
        setPopped(prev => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
        setPopCount(c => c + 1);
      }, i * 30);
    });
    interactions.current += unpopped.length;
  }, [popped]);

  const reset = useCallback(() => {
    setPopped(Array(TOTAL).fill(false));
    setPopCount(0);
  }, []);

  const remaining = popped.filter(p => !p).length;

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 50%, #fdf4ff 100%)' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold" style={{ color: '#333' }}>Bubble Wrap</h2>
          <p className="text-sm" style={{ color: '#666' }}>Popped: {popCount} / {TOTAL}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={popAll} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} aria-label="Pop all">
            <Zap size={18} color="#f59e0b" />
          </button>
          <button onClick={reset} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} aria-label="Reset">
            <RotateCcw size={18} color="#666" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-3 py-2">
        <div
          className="grid gap-1 p-3 rounded-2xl"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {Array.from({ length: TOTAL }).map((_, i) => {
            const isPopped = popped[i];
            return (
              <motion.button
                key={i}
                onClick={() => pop(i)}
                animate={{
                  scale: isPopped ? 0.88 : 1,
                }}
                whileTap={!isPopped ? { scale: 0.85 } : undefined}
                transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                style={{
                  width: 42,
                  height: 42,
                  minWidth: 36,
                  minHeight: 36,
                  borderRadius: '50%',
                  background: isPopped
                    ? 'rgba(203, 213, 225, 0.4)'
                    : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(203, 213, 225, 0.5))',
                  boxShadow: isPopped
                    ? 'inset 0 1px 3px rgba(0,0,0,0.15)'
                    : '0 2px 4px rgba(0,0,0,0.08), inset 0 -1px 3px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.8)',
                  border: isPopped ? '1px solid rgba(148,163,184,0.3)' : '1px solid rgba(203,213,225,0.6)',
                }}
                aria-label={`Bubble ${i + 1}, ${isPopped ? 'popped' : 'unpopped'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Completion */}
      {remaining === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          onAnimationStart={() => playAllPopped()}
          className="text-center pb-4 px-4"
        >
          <p className="text-3xl mb-1">🎉</p>
          <p className="text-xl font-black" style={{ color: '#22c55e' }}>All popped!</p>
          <p className="text-sm text-gray-500">Tap reset for another round</p>
        </motion.div>
      )}
    </div>
  );
}
