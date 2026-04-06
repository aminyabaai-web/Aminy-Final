// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { BuddyMood } from './useBuddy';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AminyBuddyProps {
  mood?: BuddyMood;
  size?: 'sm' | 'md' | 'lg'; // sm=40px, md=80px, lg=120px
  energy?: number; // 0-100
  showEnergy?: boolean;
  speech?: string;
  onClick?: () => void;
  accessories?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_MAP = { sm: 40, md: 80, lg: 120 } as const;

const MOOD_CONFIG: Record<
  BuddyMood,
  {
    bodyGradient: [string, string];
    eyeShape: 'round' | 'wide' | 'sleepy' | 'star';
    mouthType: 'smile' | 'grin' | 'calm' | 'sleepy' | 'open' | 'think';
    bobSpeed: number; // seconds per cycle
    bobAmount: number; // px
  }
> = {
  happy: {
    bodyGradient: ['#43AA8B', '#2EC4B6'],
    eyeShape: 'round',
    mouthType: 'smile',
    bobSpeed: 2.5,
    bobAmount: 3,
  },
  excited: {
    bodyGradient: ['#2EC4B6', '#06D6A0'],
    eyeShape: 'wide',
    mouthType: 'grin',
    bobSpeed: 1.2,
    bobAmount: 6,
  },
  calm: {
    bodyGradient: ['#577590', '#43AA8B'],
    eyeShape: 'round',
    mouthType: 'calm',
    bobSpeed: 3.5,
    bobAmount: 2,
  },
  sleepy: {
    bodyGradient: ['#577590', '#466379'],
    eyeShape: 'sleepy',
    mouthType: 'sleepy',
    bobSpeed: 4,
    bobAmount: 1.5,
  },
  encouraging: {
    bodyGradient: ['#43AA8B', '#06D6A0'],
    eyeShape: 'wide',
    mouthType: 'smile',
    bobSpeed: 2,
    bobAmount: 4,
  },
  celebrating: {
    bodyGradient: ['#06D6A0', '#FFD166'],
    eyeShape: 'star',
    mouthType: 'open',
    bobSpeed: 0.8,
    bobAmount: 8,
  },
  thinking: {
    bodyGradient: ['#577590', '#2EC4B6'],
    eyeShape: 'round',
    mouthType: 'think',
    bobSpeed: 3,
    bobAmount: 2,
  },
};

// ---------------------------------------------------------------------------
// Sub-components (inline SVG)
// ---------------------------------------------------------------------------

function BuddyEyes({
  shape,
  size,
  pupilOffset,
  blinking,
}: {
  shape: 'round' | 'wide' | 'sleepy' | 'star';
  size: number;
  pupilOffset: { x: number; y: number };
  blinking: boolean;
}) {
  const eyeR = size * 0.1;
  const pupilR = eyeR * 0.5;
  const eyeY = size * 0.38;
  const leftX = size * 0.38;
  const rightX = size * 0.62;
  const maxOff = eyeR * 0.35;
  const px = Math.max(-maxOff, Math.min(maxOff, pupilOffset.x));
  const py = Math.max(-maxOff, Math.min(maxOff, pupilOffset.y));

  if (blinking) {
    return (
      <g>
        <line x1={leftX - eyeR} y1={eyeY} x2={leftX + eyeR} y2={eyeY} stroke="#333" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={rightX - eyeR} y1={eyeY} x2={rightX + eyeR} y2={eyeY} stroke="#333" strokeWidth={1.5} strokeLinecap="round" />
      </g>
    );
  }

  if (shape === 'sleepy') {
    const h = eyeR * 0.5;
    return (
      <g>
        <ellipse cx={leftX} cy={eyeY} rx={eyeR} ry={h} fill="white" stroke="#333" strokeWidth={0.5} />
        <circle cx={leftX + px} cy={eyeY + py * 0.3} r={pupilR * 0.7} fill="#333" />
        <ellipse cx={rightX} cy={eyeY} rx={eyeR} ry={h} fill="white" stroke="#333" strokeWidth={0.5} />
        <circle cx={rightX + px} cy={eyeY + py * 0.3} r={pupilR * 0.7} fill="#333" />
      </g>
    );
  }

  if (shape === 'star') {
    // Star-shaped sparkle in eyes
    return (
      <g>
        <circle cx={leftX} cy={eyeY} r={eyeR * 1.1} fill="white" stroke="#333" strokeWidth={0.5} />
        <circle cx={leftX + px} cy={eyeY + py} r={pupilR} fill="#333" />
        <circle cx={leftX + px - pupilR * 0.3} cy={eyeY + py - pupilR * 0.3} r={pupilR * 0.25} fill="white" />
        <circle cx={rightX} cy={eyeY} r={eyeR * 1.1} fill="white" stroke="#333" strokeWidth={0.5} />
        <circle cx={rightX + px} cy={eyeY + py} r={pupilR} fill="#333" />
        <circle cx={rightX + px - pupilR * 0.3} cy={eyeY + py - pupilR * 0.3} r={pupilR * 0.25} fill="white" />
      </g>
    );
  }

  const r = shape === 'wide' ? eyeR * 1.15 : eyeR;
  return (
    <g>
      <circle cx={leftX} cy={eyeY} r={r} fill="white" stroke="#333" strokeWidth={0.5} />
      <circle cx={leftX + px} cy={eyeY + py} r={pupilR} fill="#333" />
      <circle cx={leftX + px - pupilR * 0.25} cy={eyeY + py - pupilR * 0.25} r={pupilR * 0.2} fill="white" />
      <circle cx={rightX} cy={eyeY} r={r} fill="white" stroke="#333" strokeWidth={0.5} />
      <circle cx={rightX + px} cy={eyeY + py} r={pupilR} fill="#333" />
      <circle cx={rightX + px - pupilR * 0.25} cy={eyeY + py - pupilR * 0.25} r={pupilR * 0.2} fill="white" />
    </g>
  );
}

function BuddyMouth({ type, size }: { type: string; size: number }) {
  const cx = size * 0.5;
  const cy = size * 0.56;
  const w = size * 0.12;

  switch (type) {
    case 'grin':
      return (
        <path
          d={`M ${cx - w} ${cy} Q ${cx} ${cy + w * 1.2} ${cx + w} ${cy}`}
          fill="none"
          stroke="#333"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      );
    case 'calm':
      return (
        <path
          d={`M ${cx - w * 0.6} ${cy} Q ${cx} ${cy + w * 0.4} ${cx + w * 0.6} ${cy}`}
          fill="none"
          stroke="#333"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      );
    case 'sleepy':
      return (
        <ellipse cx={cx} cy={cy + 1} rx={w * 0.35} ry={w * 0.25} fill="#333" opacity={0.6} />
      );
    case 'open':
      return <ellipse cx={cx} cy={cy} rx={w * 0.5} ry={w * 0.6} fill="#333" />;
    case 'think':
      return (
        <circle cx={cx + w * 0.4} cy={cy} r={w * 0.25} fill="none" stroke="#333" strokeWidth={1.2} />
      );
    case 'smile':
    default:
      return (
        <path
          d={`M ${cx - w * 0.8} ${cy} Q ${cx} ${cy + w * 0.8} ${cx + w * 0.8} ${cy}`}
          fill="none"
          stroke="#333"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      );
  }
}

function BuddyCheeks({ size }: { size: number }) {
  const r = size * 0.045;
  const y = size * 0.52;
  return (
    <g opacity={0.35}>
      <circle cx={size * 0.28} cy={y} r={r} fill="#E07A5F" />
      <circle cx={size * 0.72} cy={y} r={r} fill="#E07A5F" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------

function Accessory({ name, size }: { name: string; size: number }) {
  const s = size;
  switch (name) {
    case 'star-crown':
      return (
        <g transform={`translate(${s * 0.35}, ${s * 0.08})`}>
          <polygon
            points={`${s * 0.15},${s * 0.15} ${s * 0.18},${s * 0.05} ${s * 0.22},${s * 0.12} ${s * 0.27},0 ${s * 0.3},${s * 0.12} ${s * 0.33},${s * 0.05} ${s * 0.36},${s * 0.15}`}
            fill="#FFD166"
            stroke="#E8A817"
            strokeWidth={0.5}
          />
        </g>
      );
    case 'tiny-cape':
      return (
        <path
          d={`M ${s * 0.35} ${s * 0.6} Q ${s * 0.3} ${s * 0.85} ${s * 0.25} ${s * 0.9} L ${s * 0.75} ${s * 0.9} Q ${s * 0.7} ${s * 0.85} ${s * 0.65} ${s * 0.6}`}
          fill="#E07A5F"
          opacity={0.7}
        />
      );
    case 'glasses':
      return (
        <g>
          <circle cx={s * 0.38} cy={s * 0.38} r={s * 0.09} fill="none" stroke="#333" strokeWidth={1.2} />
          <circle cx={s * 0.62} cy={s * 0.38} r={s * 0.09} fill="none" stroke="#333" strokeWidth={1.2} />
          <line x1={s * 0.47} y1={s * 0.38} x2={s * 0.53} y2={s * 0.38} stroke="#333" strokeWidth={1} />
        </g>
      );
    case 'wizard-hat':
      return (
        <g transform={`translate(${s * 0.28}, ${-s * 0.05})`}>
          <polygon
            points={`${s * 0.22},${s * 0.28} ${s * 0.12},${s * 0.01} ${s * 0.32},${s * 0.28}`}
            fill="#577590"
            stroke="#466379"
            strokeWidth={0.5}
          />
          <circle cx={s * 0.14} cy={s * 0.04} r={s * 0.02} fill="#FFD166" />
        </g>
      );
    case 'superhero-mask':
      return (
        <path
          d={`M ${s * 0.25} ${s * 0.36} Q ${s * 0.5} ${s * 0.28} ${s * 0.75} ${s * 0.36} Q ${s * 0.5} ${s * 0.44} ${s * 0.25} ${s * 0.36} Z`}
          fill="#E07A5F"
          opacity={0.85}
        />
      );
    case 'rainbow-wings':
      return (
        <g opacity={0.5}>
          <ellipse cx={s * 0.15} cy={s * 0.5} rx={s * 0.12} ry={s * 0.18} fill="#E07A5F" transform={`rotate(-20, ${s * 0.15}, ${s * 0.5})`} />
          <ellipse cx={s * 0.15} cy={s * 0.5} rx={s * 0.09} ry={s * 0.14} fill="#FFD166" transform={`rotate(-20, ${s * 0.15}, ${s * 0.5})`} />
          <ellipse cx={s * 0.85} cy={s * 0.5} rx={s * 0.12} ry={s * 0.18} fill="#43AA8B" transform={`rotate(20, ${s * 0.85}, ${s * 0.5})`} />
          <ellipse cx={s * 0.85} cy={s * 0.5} rx={s * 0.09} ry={s * 0.14} fill="#2EC4B6" transform={`rotate(20, ${s * 0.85}, ${s * 0.5})`} />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

function Particles({ mood, size }: { mood: BuddyMood; size: number }) {
  if (mood === 'excited') {
    // Small stars
    return (
      <g>
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2 + Date.now() * 0.001;
          const dist = size * 0.55;
          const x = size / 2 + Math.cos(angle) * dist;
          const y = size / 2 + Math.sin(angle) * dist;
          return (
            <text key={i} x={x} y={y} fontSize={size * 0.08} textAnchor="middle" dominantBaseline="central" opacity={0.7}>
              ✦
            </text>
          );
        })}
      </g>
    );
  }
  if (mood === 'celebrating') {
    return (
      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const colors = ['#E07A5F', '#FFD166', '#43AA8B', '#2EC4B6', '#577590', '#06D6A0'];
          const x = size * 0.2 + (i * size * 0.12);
          const y = size * 0.1 + Math.sin(i * 1.3) * size * 0.1;
          return <circle key={i} cx={x} cy={y} r={size * 0.02} fill={colors[i]} opacity={0.8} />;
        })}
      </g>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Energy Bar
// ---------------------------------------------------------------------------

function EnergyBar({ energy, width }: { energy: number; width: number }) {
  const barW = width * 0.6;
  const barH = 4;
  const fill = energy > 60 ? '#43AA8B' : energy > 25 ? '#FFD166' : '#E07A5F';
  return (
    <div className="flex items-center justify-center gap-1" style={{ marginBottom: 2 }}>
      <span style={{ fontSize: Math.max(8, width * 0.1), color: '#577590' }}>⚡</span>
      <div
        style={{
          width: barW,
          height: barH,
          borderRadius: barH / 2,
          backgroundColor: '#e0e0e0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, energy))}%`,
            height: '100%',
            borderRadius: barH / 2,
            backgroundColor: fill,
            transition: 'width 0.5s ease, background-color 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speech Bubble
// ---------------------------------------------------------------------------

function SpeechBubble({ text, size }: { text: string; size: number }) {
  const fontSize = Math.max(10, size * 0.13);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.85 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'absolute',
        bottom: '105%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: `${size * 0.06}px ${size * 0.1}px`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontSize,
        color: '#333',
        whiteSpace: 'nowrap',
        maxWidth: size * 3,
        textAlign: 'center',
        zIndex: 10,
        lineHeight: 1.3,
      }}
    >
      {text}
      {/* Speech bubble triangle */}
      <div
        style={{
          position: 'absolute',
          bottom: -5,
          left: '50%',
          marginLeft: -5,
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid white',
        }}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AminyBuddy({
  mood = 'happy',
  size: sizeProp = 'md',
  energy = 50,
  showEnergy = false,
  speech,
  onClick,
  accessories = [],
}: AminyBuddyProps) {
  const size = SIZE_MAP[sizeProp];
  const config = MOOD_CONFIG[mood];
  const [blinking, setBlinking] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Blink every few seconds
  useEffect(() => {
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Eyes follow touch/mouse
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width * 2);
      const dy = (e.clientY - cy) / (rect.height * 2);
      setPupilOffset({ x: dx * size * 0.06, y: dy * size * 0.06 });
    },
    [size],
  );

  const gradientId = useMemo(() => `buddy-grad-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {speech && <SpeechBubble text={speech} size={size} />}
      </AnimatePresence>

      {/* Energy bar */}
      {showEnergy && <EnergyBar energy={energy} width={size} />}

      {/* Buddy SVG */}
      <motion.div
        animate={{
          y: [0, -config.bobAmount, 0],
        }}
        transition={{
          duration: config.bobSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.bodyGradient[0]} />
              <stop offset="100%" stopColor={config.bodyGradient[1]} />
            </linearGradient>
          </defs>

          {/* Accessories behind body */}
          {accessories.includes('tiny-cape') && <Accessory name="tiny-cape" size={size} />}
          {accessories.includes('rainbow-wings') && <Accessory name="rainbow-wings" size={size} />}

          {/* Body — blob shape */}
          <ellipse
            cx={size / 2}
            cy={size * 0.52}
            rx={size * 0.34}
            ry={size * 0.36}
            fill={`url(#${gradientId})`}
          />
          {/* Highlight */}
          <ellipse
            cx={size * 0.42}
            cy={size * 0.38}
            rx={size * 0.08}
            ry={size * 0.1}
            fill="white"
            opacity={0.18}
          />

          {/* Cheeks */}
          <BuddyCheeks size={size} />

          {/* Eyes */}
          <BuddyEyes shape={config.eyeShape} size={size} pupilOffset={pupilOffset} blinking={blinking} />

          {/* Mouth */}
          <BuddyMouth type={config.mouthType} size={size} />

          {/* Accessories in front */}
          {accessories.includes('star-crown') && <Accessory name="star-crown" size={size} />}
          {accessories.includes('glasses') && <Accessory name="glasses" size={size} />}
          {accessories.includes('wizard-hat') && <Accessory name="wizard-hat" size={size} />}
          {accessories.includes('superhero-mask') && <Accessory name="superhero-mask" size={size} />}

          {/* Particles */}
          <Particles mood={mood} size={size} />
        </svg>
      </motion.div>
    </div>
  );
}
