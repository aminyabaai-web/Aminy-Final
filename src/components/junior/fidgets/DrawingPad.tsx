/**
 * DrawingPad — Full-screen finger drawing canvas
 * Color palette, brush sizes, undo, clear, rainbow mode.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Undo2, Trash2, Rainbow } from 'lucide-react';

interface FidgetProps {
  onBack: () => void;
  onComplete?: (data: { timeSpent: number; interactions: number }) => void;
}

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#1e293b'];
const SIZES = [4, 10, 20];

export default function DrawingPad({ onBack, onComplete }: FidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [rainbow, setRainbow] = useState(false);
  const [eraser, setEraser] = useState(false);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const rainbowHue = useRef(0);
  const startTime = useRef(Date.now());
  const interactions = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    canvas.width = container.clientWidth * 2;
    canvas.height = container.clientHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  }, []);

  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 30) history.current.shift();
  }, []);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (eraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = size * 2;
    }

    if (rainbow && !eraser) {
      rainbowHue.current = (rainbowHue.current + 2) % 360;
      ctx.strokeStyle = `hsl(${rainbowHue.current}, 80%, 55%)`;
    } else if (!eraser) {
      ctx.strokeStyle = color;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, [color, size, rainbow, eraser]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDrawing.current = true;
    lastPos.current = getPos(clientX, clientY);
    saveState();
    interactions.current++;
  }, [getPos, saveState]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing.current) return;
    const pos = getPos(clientX, clientY);
    if (lastPos.current) drawLine(lastPos.current, pos);
    lastPos.current = pos;
  }, [getPos, drawLine]);

  const handleEnd = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || history.current.length <= 1) return;
    history.current.pop();
    const prev = history.current[history.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveState();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [saveState]);

  const handleBack = useCallback(() => {
    onComplete?.({ timeSpent: Math.floor((Date.now() - startTime.current) / 1000), interactions: interactions.current });
    onBack();
  }, [onBack, onComplete]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleBack} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <ArrowLeft size={24} color="#333" />
        </button>
        <h2 className="text-lg font-bold" style={{ color: '#333' }}>Drawing Pad</h2>
        <div className="flex gap-2">
          <button onClick={handleUndo} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <Undo2 size={20} color="#666" />
          </button>
          <button onClick={handleClear} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <Trash2 size={20} color="#666" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 px-2">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-2xl"
          style={{ touchAction: 'none', cursor: 'crosshair', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
          onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
          onTouchEnd={handleEnd}
        />
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Colors */}
        <div className="flex items-center justify-center gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false); setRainbow(false); }}
              className="rounded-full"
              style={{
                width: 36, height: 36, minWidth: 36,
                background: c,
                border: color === c && !eraser && !rainbow ? '3px solid #1e293b' : '3px solid transparent',
                boxShadow: color === c && !eraser && !rainbow ? `0 0 0 2px ${c}44` : 'none',
              }}
              aria-label={`Color ${c}`}
            />
          ))}
          {/* Eraser */}
          <button
            onClick={() => { setEraser(true); setRainbow(false); }}
            className="rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              width: 36, height: 36, minWidth: 36,
              background: '#fff',
              border: eraser ? '3px solid #1e293b' : '3px solid #e2e8f0',
              color: '#94a3b8',
            }}
          >
            E
          </button>
        </div>

        {/* Sizes + Rainbow */}
        <div className="flex items-center justify-center gap-3">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44, height: 44,
                background: size === s ? '#e2e8f0' : 'transparent',
              }}
              aria-label={`Brush size ${s}`}
            >
              <div className="rounded-full" style={{ width: s * 2 + 4, height: s * 2 + 4, background: '#475569' }} />
            </button>
          ))}
          <motion.button
            onClick={() => { setRainbow(r => !r); setEraser(false); }}
            className="p-2 rounded-full"
            animate={{ rotate: rainbow ? 360 : 0 }}
            transition={{ duration: 2, repeat: rainbow ? Infinity : 0, ease: 'linear' }}
            style={{ background: rainbow ? 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)' : '#f1f5f9' }}
          >
            <Rainbow size={20} color={rainbow ? '#fff' : '#666'} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
