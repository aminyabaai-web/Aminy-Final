// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useRef } from 'react';

interface MilestoneCelebrationProps {
  milestone: number;
  onDismiss: () => void;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.5);
    });
  } catch { /* no audio */ }
}

function triggerHaptic() {
  try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch { /* no haptic */ }
}

const messages: Record<number, string> = {
  10: 'You earned 10 stars! Amazing start!',
  25: '25 stars! You are a superstar!',
  50: '50 stars! Incredible job!',
  100: '100 stars! You are a champion!',
  200: '200 stars! Legendary!',
  500: '500 stars! Ultimate hero!',
};

export function MilestoneCelebration({ milestone, onDismiss }: MilestoneCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    playChime();
    triggerHaptic();

    // Confetti animation on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];
    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[] = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        life: 1,
      });
    }

    let animId: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.012;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      if (alive) animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    const timer = setTimeout(onDismiss, 5000);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onDismiss}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div
        className="relative bg-white rounded-3xl p-8 mx-6 text-center"
        style={{ animation: 'jr-bounce-in 0.5s ease-out' }}
      >
        <div className="text-6xl mb-4">
          {milestone >= 100 ? '🏆' : milestone >= 50 ? '🌟' : '⭐'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Milestone Reached!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          {messages[milestone] || `${milestone} stars! Keep going!`}
        </p>
        <button
          onClick={onDismiss}
          className="bg-amber-400 text-white font-bold py-3 px-8 rounded-full text-lg"
          style={{ minHeight: '48px', minWidth: '48px' }}
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
