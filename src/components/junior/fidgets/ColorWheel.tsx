/**
 * ColorWheel — Draggable color picker ring
 * Rainbow gradient ring with a movable cursor and center color fill.
 */
import { useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hueToName(h: number): string {
  if (h < 15) return 'Red';
  if (h < 45) return 'Orange';
  if (h < 70) return 'Yellow';
  if (h < 150) return 'Green';
  if (h < 195) return 'Cyan';
  if (h < 260) return 'Blue';
  if (h < 290) return 'Purple';
  if (h < 340) return 'Pink';
  return 'Red';
}

export default function ColorWheel({ onBack, onComplete }: FidgetProps) {
  const [hue, setHue] = useState(0);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);
  const ringRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastHue = useRef(0);

  const RADIUS = 120;
  const RING_WIDTH = 32;

  const updateHue = useCallback((clientX: number, clientY: number) => {
    if (!ringRef.current) return;
    const rect = ringRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - cy, clientX - cx);
    let deg = (angle * 180 / Math.PI + 90 + 360) % 360;
    setHue(deg);

    // Haptic every 30 degrees
    const bucket = Math.floor(deg / 30);
    if (bucket !== Math.floor(lastHue.current / 30)) {
      haptic(15);
      interactions.current++;
    }
    lastHue.current = deg;
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true;
    updateHue(clientX, clientY);
  }, [updateHue]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    updateHue(clientX, clientY);
  }, [updateHue]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  const color = hslToHex(hue, 0.8, 0.55);
  const cursorAngle = (hue - 90) * Math.PI / 180;
  const cursorX = Math.cos(cursorAngle) * RADIUS;
  const cursorY = Math.sin(cursorAngle) * RADIUS;

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: `linear-gradient(135deg, ${color}22 0%, #f8f9fa 50%, ${color}11 100%)` }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onTouchMove={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
      onTouchEnd={handleEnd}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <h2 className="text-lg font-bold" style={{ color: '#333' }}>Color Wheel</h2>
        <div style={{ width: 40 }} />
      </div>

      {/* Wheel */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div
          ref={ringRef}
          className="relative"
          style={{ width: RADIUS * 2 + RING_WIDTH * 2, height: RADIUS * 2 + RING_WIDTH * 2 }}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onTouchStart={(e) => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
        >
          {/* Rainbow ring */}
          <div
            className="absolute rounded-full"
            style={{
              inset: 0,
              background: 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0000ff, #8800ff, #ff00ff, #ff0000)',
              WebkitMask: `radial-gradient(circle, transparent ${RADIUS - RING_WIDTH / 2}px, black ${RADIUS - RING_WIDTH / 2 + 1}px, black ${RADIUS + RING_WIDTH / 2 - 1}px, transparent ${RADIUS + RING_WIDTH / 2}px)`,
              mask: `radial-gradient(circle, transparent ${RADIUS - RING_WIDTH / 2}px, black ${RADIUS - RING_WIDTH / 2 + 1}px, black ${RADIUS + RING_WIDTH / 2 - 1}px, transparent ${RADIUS + RING_WIDTH / 2}px)`,
            }}
          />

          {/* Center fill */}
          <motion.div
            className="absolute rounded-full"
            animate={{ backgroundColor: color }}
            transition={{ duration: 0.15 }}
            style={{
              top: RING_WIDTH + 20,
              left: RING_WIDTH + 20,
              right: RING_WIDTH + 20,
              bottom: RING_WIDTH + 20,
              boxShadow: `0 4px 20px ${color}66`,
            }}
          />

          {/* Cursor dot */}
          <div
            className="absolute rounded-full border-4 border-white"
            style={{
              width: RING_WIDTH + 8,
              height: RING_WIDTH + 8,
              background: color,
              left: RADIUS + RING_WIDTH - (RING_WIDTH + 8) / 2 + cursorX,
              top: RADIUS + RING_WIDTH - (RING_WIDTH + 8) / 2 + cursorY,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              touchAction: 'none',
              cursor: 'grab',
            }}
          />
        </div>

        {/* Color info */}
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color }}>{hueToName(hue)}</div>
          <div className="text-sm font-mono" style={{ color: '#888' }}>{color.toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
}
