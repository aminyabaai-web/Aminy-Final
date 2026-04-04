/**
 * FluidSim — Mesmerizing metaball lava lamp
 * Canvas-based blobs that drift, merge, and respond to touch.
 */
import { useCallback, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export default function FluidSim({ onBack, onComplete }: FidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);
  const touchPoints = useRef<{ x: number; y: number }[]>([]);
  const blobsRef = useRef<Blob[]>([]);
  const hueRef = useRef(220); // Start blue
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;

    // Initialize blobs
    blobsRef.current = Array.from({ length: 6 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: 60 + Math.random() * 40,
    }));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Offscreen for metaball threshold
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.floor(w / 4);
    offscreen.height = Math.floor(h / 4);
    const offCtx = offscreen.getContext('2d');

    const animate = () => {
      const blobs = blobsRef.current;
      const touches = touchPoints.current;

      // Shift hue
      hueRef.current = (hueRef.current + 0.15) % 360;
      const hue = hueRef.current;

      // Physics
      for (const blob of blobs) {
        // Attract toward touch points
        for (const tp of touches) {
          const dx = tp.x - blob.x;
          const dy = tp.y - blob.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            blob.vx += (dx / dist) * 0.8;
            blob.vy += (dy / dist) * 0.8;
          }
        }

        blob.x += blob.vx;
        blob.y += blob.vy;
        blob.vx *= 0.98;
        blob.vy *= 0.98;

        // Bounce off walls
        if (blob.x < blob.radius) { blob.x = blob.radius; blob.vx *= -0.6; }
        if (blob.x > w - blob.radius) { blob.x = w - blob.radius; blob.vx *= -0.6; }
        if (blob.y < blob.radius) { blob.y = blob.radius; blob.vy *= -0.6; }
        if (blob.y > h - blob.radius) { blob.y = h - blob.radius; blob.vy *= -0.6; }

        // Gentle random drift
        blob.vx += (Math.random() - 0.5) * 0.1;
        blob.vy += (Math.random() - 0.5) * 0.1;
      }

      // Draw metaballs via low-res threshold
      if (offCtx) {
        const sw = offscreen.width;
        const sh = offscreen.height;
        const scaleX = w / sw;
        const scaleY = h / sh;

        const imageData = offCtx.createImageData(sw, sh);
        const data = imageData.data;

        for (let py = 0; py < sh; py++) {
          for (let px = 0; px < sw; px++) {
            const wx = px * scaleX;
            const wy = py * scaleY;
            let sum = 0;
            for (const blob of blobs) {
              const dx = wx - blob.x;
              const dy = wy - blob.y;
              sum += (blob.radius * blob.radius) / (dx * dx + dy * dy + 1);
            }
            const idx = (py * sw + px) * 4;
            if (sum > 1) {
              const intensity = Math.min(sum - 1, 1);
              // HSL to approximate RGB
              const h2 = (hue + intensity * 60) % 360;
              const [r, g, b] = hslToRgb(h2, 0.7, 0.45 + intensity * 0.15);
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 220 + intensity * 35;
            } else {
              data[idx + 3] = 0;
            }
          }
        }
        offCtx.putImageData(imageData, 0, 0);

        // Draw to main canvas
        ctx.fillStyle = '#0f0a1a';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offscreen, 0, 0, w, h);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    interactions.current++;
    touchPoints.current = Array.from(e.touches).map(t => getPos(t.clientX, t.clientY));
  }, [getPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchPoints.current = Array.from(e.touches).map(t => getPos(t.clientX, t.clientY));
  }, [getPos]);

  const handleTouchEnd = useCallback(() => {
    touchPoints.current = [];
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    interactions.current++;
    touchPoints.current = [getPos(e.clientX, e.clientY)];
  }, [getPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons > 0) {
      touchPoints.current = [getPos(e.clientX, e.clientY)];
    }
  }, [getPos]);

  const handleMouseUp = useCallback(() => {
    touchPoints.current = [];
  }, []);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0a1a' }}>
      {/* Header (floating) */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
          <ArrowLeft size={24} color="#c4b5fd" />
        </button>
        <h2 className="text-lg font-bold" style={{ color: '#c4b5fd', textShadow: '0 0 20px rgba(196,181,253,0.3)' }}>Fluid Lava</h2>
        <div style={{ width: 40 }} />
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
    </div>
  );
}

// HSL to RGB helper
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
