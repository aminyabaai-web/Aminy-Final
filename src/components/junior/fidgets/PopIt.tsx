/**
 * PopIt — Pop-It Grid Fidget
 * 6x6 grid of rainbow bubbles that pop with satisfying sounds and haptics.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

const ROWS = 6;
const COLS = 6;
const ROW_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#3B82F6', // blue
  '#A855F7', // purple
];
const ROW_FREQS = [880, 784, 698, 622, 554, 494];

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  } catch { return null; }
}

// Silicone-like pop: combines noise burst (tactile crunch) + sine tone
function playPop(row: number, col: number = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  // Sine tone (pitch varies by row+col for unique feel)
  const baseFreq = ROW_FREQS[row] || 700;
  const freqVariant = baseFreq * (1 + col * 0.015); // subtle col variation
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqVariant * 1.3, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freqVariant * 0.8, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);

  // Noise click for silicone tactile feel
  const bufSize = Math.floor(ctx.sampleRate * 0.012);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.12, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
  src.connect(nGain);
  nGain.connect(ctx.destination);
  src.start();
}

export default function PopIt({ onBack, onComplete }: FidgetProps) {
  const [popped, setPopped] = useState<boolean[]>(Array(ROWS * COLS).fill(false));
  const [tapCount, setTapCount] = useState(0);
  const [resetting, setResetting] = useState(false);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);

  const allPopped = popped.every(Boolean);

  useEffect(() => {
    if (allPopped && !resetting) {
      setResetting(true);
      const timer = setTimeout(() => {
        setPopped(Array(ROWS * COLS).fill(false));
        setResetting(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allPopped, resetting]);

  const handlePop = useCallback((index: number) => {
    if (popped[index] || resetting) return;
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    playPop(row, col);
    haptic(30);
    setPopped(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setTapCount(c => c + 1);
    interactions.current++;
  }, [popped, resetting]);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #e8eaf6 50%, #e0f7fa 100%)' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold" style={{ color: '#333' }}>Pop-It!</h2>
          <p className="text-sm" style={{ color: '#666' }}>Pops: {tapCount}</p>
        </div>
        <button onClick={() => { setPopped(Array(ROWS * COLS).fill(false)); }} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <RotateCcw size={20} color="#666" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <div
          className="grid gap-2 p-4 rounded-3xl"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {Array.from({ length: ROWS * COLS }).map((_, i) => {
            const row = Math.floor(i / COLS);
            const isPopped = popped[i];
            const color = ROW_COLORS[row];
            return (
              <motion.button
                key={i}
                onClick={() => handlePop(i)}
                animate={{
                  scale: isPopped ? 0.84 : 1,
                  y: isPopped ? 4 : 0,
                  boxShadow: isPopped
                    ? `inset 0 3px 8px rgba(0,0,0,0.35)`
                    : `0 4px 8px rgba(0,0,0,0.18), inset 0 -3px 5px rgba(0,0,0,0.12), inset 0 3px 5px rgba(255,255,255,0.45)`,
                }}
                whileTap={!isPopped ? { scale: 0.75, y: 5 } : undefined}
                transition={{ type: 'spring', stiffness: 700, damping: 20, mass: 0.5 }}
                className="rounded-full"
                style={{
                  width: 48,
                  height: 48,
                  minWidth: 44,
                  minHeight: 44,
                  background: isPopped
                    ? `radial-gradient(circle at 50% 60%, ${color}88, ${color}44)`
                    : `radial-gradient(circle at 35% 35%, ${color}cc, ${color})`,
                  boxShadow: isPopped
                    ? `inset 0 2px 6px rgba(0,0,0,0.3)`
                    : `0 3px 6px rgba(0,0,0,0.15), inset 0 -2px 4px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.4)`,
                  border: `2px solid ${color}`,
                }}
                aria-label={`Bubble ${i + 1}, ${isPopped ? 'popped' : 'not popped'}`}
              />
            );
          })}
        </div>
      </div>

      {/* All-popped flash */}
      {allPopped && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-4xl font-bold" style={{ color: '#A855F7' }}>All Popped! 🎉</span>
        </motion.div>
      )}
    </div>
  );
}
