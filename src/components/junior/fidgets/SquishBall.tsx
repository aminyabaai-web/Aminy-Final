/**
 * SquishBall — Press-and-hold squishy blob with spring physics
 * Cute face reacts to squish/release. Longer press = bigger bounce-back.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  } catch { return null; }
}

function playSquish() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

function playBoing() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
}

export default function SquishBall({ onBack, onComplete }: FidgetProps) {
  const [pressing, setPressing] = useState(false);
  const [face, setFace] = useState<'idle' | 'squish' | 'surprised'>('idle');
  const pressStart = useRef(0);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);

  const scaleX = useSpring(1, { stiffness: 300, damping: 15 });
  const scaleY = useSpring(1, { stiffness: 300, damping: 15 });
  const colorShift = useTransform(scaleY, [0.7, 1, 1.3], ['#FF6B9D', '#A855F7', '#7C3AED']);

  // Squish animation while pressing
  useEffect(() => {
    if (!pressing) return;
    let raf: number;
    const tick = () => {
      const elapsed = (Date.now() - pressStart.current) / 1000;
      const squish = Math.min(elapsed * 0.4, 0.3);
      scaleX.set(1 + squish * 0.8);
      scaleY.set(1 - squish);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pressing, scaleX, scaleY]);

  const handlePress = useCallback(() => {
    setPressing(true);
    setFace('squish');
    pressStart.current = Date.now();
    playSquish();
    haptic(60);
    interactions.current++;
  }, []);

  const handleRelease = useCallback(() => {
    if (!pressing) return;
    setPressing(false);
    setFace('surprised');
    const holdTime = (Date.now() - pressStart.current) / 1000;
    const overshoot = Math.min(holdTime * 0.5, 0.35);

    // Bounce back with overshoot
    scaleY.set(1 + overshoot);
    scaleX.set(1 - overshoot * 0.5);
    setTimeout(() => {
      scaleX.set(1);
      scaleY.set(1);
    }, 50);

    playBoing();
    haptic(40);

    setTimeout(() => setFace('idle'), 600);
  }, [pressing, scaleX, scaleY]);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 50%, #ede9fe 100%)' }}
      onMouseUp={handleRelease}
      onTouchEnd={handleRelease}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <h2 className="text-lg font-bold" style={{ color: '#7C3AED' }}>Squish Ball</h2>
        <div style={{ width: 40 }} />
      </div>

      {/* Ball */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          style={{
            scaleX,
            scaleY,
            backgroundColor: colorShift,
            width: 200,
            height: 200,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'none',
            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
          }}
          onMouseDown={handlePress}
          onTouchStart={handlePress}
        >
          {/* Face */}
          <div className="relative" style={{ width: 120, height: 80 }}>
            {/* Eyes */}
            {face === 'squish' ? (
              <>
                <div className="absolute" style={{ left: 20, top: 20, width: 30, height: 4, background: '#fff', borderRadius: 2 }} />
                <div className="absolute" style={{ left: 70, top: 20, width: 30, height: 4, background: '#fff', borderRadius: 2 }} />
              </>
            ) : face === 'surprised' ? (
              <>
                <div className="absolute rounded-full" style={{ left: 25, top: 10, width: 22, height: 26, background: '#fff', border: '3px solid #4c1d95' }} />
                <div className="absolute rounded-full" style={{ left: 73, top: 10, width: 22, height: 26, background: '#fff', border: '3px solid #4c1d95' }} />
                <div className="absolute rounded-full" style={{ left: 32, top: 18, width: 8, height: 10, background: '#4c1d95' }} />
                <div className="absolute rounded-full" style={{ left: 80, top: 18, width: 8, height: 10, background: '#4c1d95' }} />
              </>
            ) : (
              <>
                <div className="absolute rounded-full" style={{ left: 28, top: 14, width: 18, height: 20, background: '#fff' }} />
                <div className="absolute rounded-full" style={{ left: 74, top: 14, width: 18, height: 20, background: '#fff' }} />
                <div className="absolute rounded-full" style={{ left: 33, top: 20, width: 8, height: 8, background: '#4c1d95' }} />
                <div className="absolute rounded-full" style={{ left: 79, top: 20, width: 8, height: 8, background: '#4c1d95' }} />
              </>
            )}
            {/* Mouth */}
            {face === 'surprised' ? (
              <div className="absolute rounded-full" style={{ left: 48, top: 48, width: 24, height: 24, background: '#4c1d95' }} />
            ) : (
              <div className="absolute" style={{
                left: 38, top: 50, width: 44, height: 22,
                borderBottom: '4px solid #fff',
                borderRadius: '0 0 22px 22px',
              }} />
            )}
          </div>
        </motion.div>
      </div>

      <p className="pb-8 text-sm" style={{ color: '#a78bfa' }}>Press and hold to squish!</p>
    </div>
  );
}
