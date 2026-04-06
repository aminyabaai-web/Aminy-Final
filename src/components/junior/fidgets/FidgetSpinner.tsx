// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FidgetSpinner — Touch-spin with momentum physics
 * SVG 3-arm spinner with velocity tracking and friction deceleration.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Palette } from 'lucide-react';
import { haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

const THEMES = [
  ['#EF4444', '#3B82F6', '#22C55E'],
  ['#F97316', '#A855F7', '#EC4899'],
  ['#06B6D4', '#8B5CF6', '#F59E0B'],
  ['#10B981', '#6366F1', '#F43F5E'],
];

export default function FidgetSpinner({ onBack, onComplete }: FidgetProps) {
  const [rotation, setRotation] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [themeIdx, setThemeIdx] = useState(0);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);

  // Touch tracking
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastAngle = useRef(0);
  const lastTime = useRef(0);
  const isDragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const rotRef = useRef(0);
  const velRef = useRef(0);
  const lastArmPass = useRef(0);

  const colors = THEMES[themeIdx];

  const getAngle = useCallback((clientX: number, clientY: number) => {
    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    isDragging.current = true;
    lastAngle.current = getAngle(clientX, clientY);
    lastTime.current = performance.now();
    velRef.current = 0;
    interactions.current++;
  }, [getAngle]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const angle = getAngle(clientX, clientY);
    let delta = angle - lastAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const now = performance.now();
    const dt = Math.max(now - lastTime.current, 1);
    velRef.current = (delta / dt) * 16; // normalize to ~60fps

    rotRef.current += delta;
    setRotation(rotRef.current);
    lastAngle.current = angle;
    lastTime.current = now;
  }, [getAngle]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
    setVelocity(velRef.current);
  }, []);

  // Physics loop
  useEffect(() => {
    const FRICTION = 0.985;
    const MIN_VEL = 0.05;

    const tick = () => {
      if (!isDragging.current && Math.abs(velRef.current) > MIN_VEL) {
        velRef.current *= FRICTION;
        rotRef.current += velRef.current;
        setRotation(rotRef.current);
        setVelocity(velRef.current);

        // Haptic on arm passing 12 o'clock (every 120 degrees)
        const armIndex = Math.floor(((rotRef.current % 360) + 360) % 360 / 120);
        if (armIndex !== lastArmPass.current && Math.abs(velRef.current) > 1) {
          lastArmPass.current = armIndex;
          haptic(20);
        }
      } else if (!isDragging.current) {
        velRef.current = 0;
        setVelocity(0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const rpm = Math.abs(Math.round((velocity * 60) / 6)); // rough RPM

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <ArrowLeft size={24} color="#fff" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Fidget Spinner</h2>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{rpm} RPM</p>
        </div>
        <button onClick={() => setThemeIdx(i => (i + 1) % THEMES.length)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Palette size={20} color="#fff" />
        </button>
      </div>

      {/* Spinner */}
      <div className="flex-1 flex items-center justify-center">
        <svg
          ref={svgRef}
          width="280"
          height="280"
          viewBox="-140 -140 280 280"
          style={{ touchAction: 'none', cursor: 'grab' }}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onTouchStart={(e) => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
          onTouchMove={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
        >
          <g transform={`rotate(${rotation})`}>
            {/* Arms */}
            {[0, 120, 240].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <ellipse cx="0" cy="-75" rx="32" ry="38" fill={colors[i]} opacity={0.9} />
                <ellipse cx="0" cy="-75" rx="18" ry="20" fill="rgba(255,255,255,0.3)" />
                <rect x="-14" y="-50" width="28" height="50" rx="14" fill={colors[i]} opacity={0.85} />
              </g>
            ))}
            {/* Center bearing */}
            <circle cx="0" cy="0" r="28" fill="#475569" stroke="#64748b" strokeWidth="3" />
            <circle cx="0" cy="0" r="18" fill="#334155" />
            <circle cx="0" cy="0" r="8" fill="#64748b" />
            {/* Bearing dots */}
            {[0, 60, 120, 180, 240, 300].map(a => (
              <circle key={a} cx={Math.cos(a * Math.PI / 180) * 13} cy={Math.sin(a * Math.PI / 180) * 13} r="2" fill="#94a3b8" />
            ))}
          </g>
        </svg>
      </div>

      {/* Speed bar */}
      <div className="w-full px-8 pb-8">
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${Math.min(100, rpm / 3)}%`,
              background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
