// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ZenGarden — Sand drawing with finger
 * Canvas-based sand texture, draw lines, decorative rocks, rake-to-smooth.
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Wind } from 'lucide-react';
import { haptic } from '../activities/sounds';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

const ROCKS = [
  { x: 0.25, y: 0.35, rx: 22, ry: 16, color: '#78716c' },
  { x: 0.7, y: 0.55, rx: 18, ry: 14, color: '#6b7280' },
  { x: 0.45, y: 0.75, rx: 15, ry: 12, color: '#9ca3af' },
  { x: 0.8, y: 0.25, rx: 12, ry: 10, color: '#71717a' },
];

export default function ZenGarden({ onBack, onComplete }: FidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);
  const [raking, setRaking] = useState(false);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const isNearRock = useCallback((x: number, y: number, w: number, h: number) => {
    return ROCKS.some(r => {
      const rx = r.x * w;
      const ry = r.y * h;
      const dx = (x - rx) / (r.rx + 10);
      const dy = (y - ry) / (r.ry + 10);
      return dx * dx + dy * dy < 1;
    });
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sand base
    ctx.fillStyle = '#ddd0b6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sand noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw rocks
    ROCKS.forEach(rock => {
      const rx = rock.x * canvas.width;
      const ry = rock.y * canvas.height;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(rx, ry, rock.rx, rock.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = rock.color;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.ellipse(rx - 4, ry - 4, rock.rx * 0.5, rock.ry * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth * 2;
      canvas.height = container.clientHeight * 2;
    }
    initCanvas();
  }, [initCanvas]);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isNearRock(to.x, to.y, canvas.width, canvas.height)) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#b8a88a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Darker center line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#a0926e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [isNearRock]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDrawing.current = true;
    lastPos.current = getCanvasPos(clientX, clientY);
    interactions.current++;
    haptic(10);
  }, [getCanvasPos]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing.current) return;
    const pos = getCanvasPos(clientX, clientY);
    if (pos && lastPos.current) {
      drawLine(lastPos.current, pos);
    }
    lastPos.current = pos;
  }, [getCanvasPos, drawLine]);

  const handleEnd = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const handleRake = useCallback(() => {
    setRaking(true);
    haptic(50);
    setTimeout(() => {
      initCanvas();
      setRaking(false);
    }, 600);
  }, [initCanvas]);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#2d2418' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <ArrowLeft size={24} color="#ddd0b6" />
        </button>
        <h2 className="text-lg font-bold" style={{ color: '#ddd0b6' }}>Zen Garden</h2>
        <button onClick={handleRake} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <Wind size={20} color="#ddd0b6" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 px-4 pb-4 relative">
        <motion.div
          className="w-full h-full rounded-2xl overflow-hidden"
          animate={{ opacity: raking ? 0.5 : 1 }}
          transition={{ duration: 0.3 }}
          style={{ border: '3px solid #5d4e37' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
            onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
            onTouchEnd={handleEnd}
          />
        </motion.div>
      </div>
    </div>
  );
}
