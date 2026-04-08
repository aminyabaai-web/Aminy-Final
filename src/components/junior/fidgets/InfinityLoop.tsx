// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * InfinityLoop — Figure-8 tracing fidget
 * Glowing dot follows an infinity path. Trail glows when on-path.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
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

function playChime(t: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600 + t * 200;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

// Infinity curve (lemniscate) parametric
function infinityPoint(t: number, cx: number, cy: number, scale: number): { x: number; y: number } {
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const denom = 1 + sin * sin;
  return {
    x: cx + (scale * cos) / denom,
    y: cy + (scale * sin * cos) / denom,
  };
}

export default function InfinityLoop({ onBack, onComplete }: FidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loops, setLoops] = useState(0);
  const [onPath, setOnPath] = useState(false);
  const isDragging = useRef(false);
  const dotPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const trail = useRef<{ x: number; y: number; bright: boolean }[]>([]);
  const paramT = useRef(0);
  const loopProgress = useRef(0);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);
  const chimeTimer = useRef(0);
  const rafRef = useRef<number>(0);
  const dims = useRef({ w: 0, h: 0, cx: 0, cy: 0, scale: 0 });

  const TOLERANCE = 35;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const w = container.clientWidth * 2;
    const h = container.clientHeight * 2;
    canvas.width = w;
    canvas.height = h;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w * 0.38, h * 0.35);
    dims.current = { w, h, cx, cy, scale };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { cx, cy, scale } = dims.current;
      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.5);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw path outline
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const t = (i / 200) * Math.PI * 2;
        const p = infinityPoint(t, cx, cy, scale);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Dashed guide
      ctx.setLineDash([12, 18]);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw trail
      const trailArr = trail.current;
      for (let i = 1; i < trailArr.length; i++) {
        const alpha = (i / trailArr.length) * (trailArr[i].bright ? 0.8 : 0.3);
        ctx.beginPath();
        ctx.moveTo(trailArr[i - 1].x, trailArr[i - 1].y);
        ctx.lineTo(trailArr[i].x, trailArr[i].y);
        ctx.strokeStyle = trailArr[i].bright
          ? `rgba(167, 139, 250, ${alpha})`
          : `rgba(100, 100, 140, ${alpha})`;
        ctx.lineWidth = trailArr[i].bright ? 10 : 6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Draw dot
      if (isDragging.current) {
        const dp = dotPos.current;
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 18, 0, Math.PI * 2);
        const isOn = isOnPath(dp.x, dp.y);
        ctx.fillStyle = isOn ? '#a78bfa' : '#64748b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 26, 0, Math.PI * 2);
        ctx.strokeStyle = isOn ? 'rgba(167, 139, 250, 0.4)' : 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOnPath = useCallback((x: number, y: number): boolean => {
    const { cx, cy, scale } = dims.current;
    let minDist = Infinity;
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * Math.PI * 2;
      const p = infinityPoint(t, cx, cy, scale);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < minDist) minDist = d;
    }
    return minDist < TOLERANCE;
  }, []);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true;
    const pos = getCanvasPos(clientX, clientY);
    dotPos.current = pos;
    trail.current = [{ ...pos, bright: isOnPath(pos.x, pos.y) }];
    loopProgress.current = 0;
    interactions.current++;
  }, [getCanvasPos, isOnPath]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const pos = getCanvasPos(clientX, clientY);
    dotPos.current = pos;
    const on = isOnPath(pos.x, pos.y);
    setOnPath(on);

    trail.current.push({ ...pos, bright: on });
    if (trail.current.length > 200) trail.current.shift();

    if (on) {
      // Find closest t parameter
      const { cx, cy, scale } = dims.current;
      let bestT = 0;
      let bestDist = Infinity;
      for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * Math.PI * 2;
        const p = infinityPoint(t, cx, cy, scale);
        const d = Math.hypot(pos.x - p.x, pos.y - p.y);
        if (d < bestDist) { bestDist = d; bestT = t; }
      }
      const delta = bestT - paramT.current;
      if (Math.abs(delta) < 1) {
        loopProgress.current += Math.abs(delta);
      }
      paramT.current = bestT;

      if (loopProgress.current >= Math.PI * 2) {
        setLoops(l => l + 1);
        loopProgress.current = 0;
        haptic(40);
      }

      // Chime
      const now = Date.now();
      if (now - chimeTimer.current > 500) {
        playChime(bestT / (Math.PI * 2));
        chimeTimer.current = now;
      }
    } else {
      haptic(15);
    }
  }, [getCanvasPos, isOnPath]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
    trail.current = [];
  }, []);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0f172a' }}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <ArrowLeft size={24} color="#a78bfa" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold" style={{ color: '#a78bfa' }}>Infinity Loop</h2>
          <p className="text-sm" style={{ color: onPath ? '#a78bfa' : '#475569' }}>
            Loops: {loops} {onPath ? '~ on path ~' : ''}
          </p>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Canvas */}
      <div className="flex-1 px-2 pb-4">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-2xl"
          style={{ touchAction: 'none' }}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
          onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
        />
      </div>
    </div>
  );
}
