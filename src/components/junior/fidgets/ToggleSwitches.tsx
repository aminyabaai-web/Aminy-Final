// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ToggleSwitches — 4x3 grid of satisfying toggle switches
 * Row 1: iOS-style, Row 2: Slider bars, Row 3: Rocker switches.
 */
import { useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { playTap, haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

const IOS_COLORS = ['#22C55E', '#3B82F6', '#F97316', '#A855F7'];
const SLIDER_COLORS = ['#EC4899', '#06B6D4', '#F59E0B', '#10B981'];
const ROCKER_COLORS = ['#EF4444', '#6366F1', '#14B8A6', '#F43F5E'];

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  } catch { return null; }
}

function playClick(pitch: number = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 600 * pitch;
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

function playClack() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 300;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

export default function ToggleSwitches({ onBack, onComplete }: FidgetProps) {
  const [states, setStates] = useState<boolean[]>(Array(12).fill(false));
  const startTime = useRef(Date.now());
  const interactions = useRef(0);

  const toggle = useCallback((index: number) => {
    const row = Math.floor(index / 4);
    if (row === 0) playClick(1.2);
    else if (row === 1) playClick(0.8);
    else playClack();
    haptic(40);
    interactions.current++;
    setStates(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const onCount = states.filter(Boolean).length;

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 50%, #fff3e0 100%)' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold" style={{ color: '#333' }}>Toggle Grid</h2>
          <p className="text-sm" style={{ color: '#666' }}>{onCount} / 12 ON</p>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {/* Row 1: iOS toggles */}
        <div>
          <p className="text-sm font-semibold text-center mb-3" style={{ color: '#888' }}>SLIDE</p>
          <div className="flex gap-4">
            {IOS_COLORS.map((color, i) => {
              const on = states[i];
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="relative rounded-full"
                  style={{
                    width: 56, height: 32,
                    background: on ? color : '#d1d5db',
                    transition: 'background 0.2s',
                    minWidth: 44, minHeight: 44,
                    padding: 0,
                  }}
                  aria-label={`Toggle ${i + 1}, ${on ? 'on' : 'off'}`}
                >
                  <motion.div
                    className="absolute rounded-full bg-white"
                    style={{ width: 26, height: 26, top: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                    animate={{ left: on ? 27 : 3 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Slider bars */}
        <div>
          <p className="text-sm font-semibold text-center mb-3" style={{ color: '#888' }}>DRAG</p>
          <div className="flex gap-4">
            {SLIDER_COLORS.map((color, i) => {
              const idx = 4 + i;
              const on = states[idx];
              return (
                <button
                  key={idx}
                  onClick={() => toggle(idx)}
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    width: 56, height: 80,
                    background: '#e5e7eb',
                    minWidth: 44, minHeight: 44,
                  }}
                  aria-label={`Slider ${i + 1}, ${on ? 'on' : 'off'}`}
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 rounded-lg"
                    animate={{ height: on ? '100%' : '15%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{ background: color }}
                  />
                  <motion.div
                    className="absolute left-1 right-1 h-3 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                    animate={{ bottom: on ? 60 : 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Rocker switches */}
        <div>
          <p className="text-sm font-semibold text-center mb-3" style={{ color: '#888' }}>CLICK</p>
          <div className="flex gap-4">
            {ROCKER_COLORS.map((color, i) => {
              const idx = 8 + i;
              const on = states[idx];
              return (
                <button
                  key={idx}
                  onClick={() => toggle(idx)}
                  className="relative rounded-xl"
                  style={{
                    width: 48, height: 72,
                    background: '#374151',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                    minWidth: 44, minHeight: 44,
                  }}
                  aria-label={`Rocker ${i + 1}, ${on ? 'on' : 'off'}`}
                >
                  <motion.div
                    className="absolute left-1 right-1 rounded-lg"
                    style={{ height: '45%', background: color }}
                    animate={{
                      top: on ? 3 : undefined,
                      bottom: on ? undefined : 3,
                      boxShadow: on ? '0 3px 0 rgba(0,0,0,0.3)' : '0 -3px 0 rgba(0,0,0,0.3)',
                    }}
                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  >
                    <div className="w-4 h-1 rounded-full mx-auto mt-3" style={{ background: 'rgba(255,255,255,0.4)' }} />
                  </motion.div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
