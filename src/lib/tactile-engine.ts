// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// ---------------------------------------------------------------------------
// Tactile Engine — Shared particle / feedback system for Aminy Junior
// ---------------------------------------------------------------------------

// ---- Particle Types ----

interface ParticleConfig {
  count: number;
  colors: string[];
  shape: 'circle' | 'star' | 'heart';
  gravity: number;
  spread: number;
  lifetime: number; // ms
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  shape: 'circle' | 'star' | 'heart';
  size: number;
  alpha: number;
  born: number;
  lifetime: number;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const spikes = 5;
  const outerR = r;
  const innerR = r * 0.4;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(x, y - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(x + Math.cos(rot) * innerR, y + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.4);
  ctx.bezierCurveTo(x - r, y - r * 0.3, x - r * 0.5, y - r, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.5, y - r, x + r, y - r * 0.3, x, y + r * 0.4);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// spawnParticles
// ---------------------------------------------------------------------------

export function spawnParticles(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  config: ParticleConfig,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: Particle[] = [];
  const startTime = performance.now();

  for (let i = 0; i < config.count; i++) {
    const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * config.spread;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed * config.spread,
      vy: Math.sin(angle) * speed * config.spread - 2,
      color: config.colors[i % config.colors.length],
      shape: config.shape,
      size: 4 + Math.random() * 6,
      alpha: 1,
      born: startTime,
      lifetime: config.lifetime * (0.7 + Math.random() * 0.6),
    });
  }

  let animId: number;

  function animate(now: number) {
    const elapsed = now - startTime;
    if (elapsed > config.lifetime * 1.5) {
      cancelAnimationFrame(animId);
      // Clear just our particles
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (const p of particles) {
      const age = now - p.born;
      if (age > p.lifetime) continue;
      alive++;

      p.vy += config.gravity * 0.016; // gravity per frame at ~60fps
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = Math.max(0, 1 - age / p.lifetime);

      ctx!.globalAlpha = p.alpha;
      ctx!.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx!, p.x, p.y, p.size);
      } else {
        drawHeart(ctx!, p.x, p.y, p.size);
      }
    }

    ctx!.globalAlpha = 1;

    if (alive > 0) {
      animId = requestAnimationFrame(animate);
    }
  }

  animId = requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// createRipple — DOM-based ripple effect
// ---------------------------------------------------------------------------

export function createRipple(x: number, y: number, color = 'rgba(67, 170, 139, 0.4)'): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    left: ${x - 20}px;
    top: ${y - 20}px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${color};
    pointer-events: none;
    z-index: 9999;
    transform: scale(0);
    opacity: 1;
    transition: transform 0.5s ease-out, opacity 0.5s ease-out;
  `;
  document.body.appendChild(el);

  // Trigger animation next frame
  requestAnimationFrame(() => {
    el.style.transform = 'scale(4)';
    el.style.opacity = '0';
  });

  setTimeout(() => el.remove(), 600);
  return el;
}

// ---------------------------------------------------------------------------
// playMicroInteraction — sound + haptic combos
// ---------------------------------------------------------------------------

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function vibrateIfAvailable(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* */ }
}

export function playMicroInteraction(type: 'tap' | 'success' | 'streak' | 'milestone' | 'combo'): void {
  const ctx = getAudioCtx();

  switch (type) {
    case 'tap': {
      vibrateIfAvailable(30);
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      break;
    }
    case 'success': {
      vibrateIfAvailable([40, 30, 40]);
      if (!ctx) return;
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
      break;
    }
    case 'streak': {
      vibrateIfAvailable([30, 50, 30, 50, 80]);
      if (!ctx) return;
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.35);
      });
      break;
    }
    case 'milestone': {
      vibrateIfAvailable([50, 30, 50, 30, 100]);
      if (!ctx) return;
      // Fanfare: C-E-G-C octave
      [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.65);
      });
      break;
    }
    case 'combo': {
      vibrateIfAvailable([20, 20, 20, 20, 20, 20, 60]);
      if (!ctx) return;
      // Rapid ascending run
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.2);
      });
      break;
    }
  }
}
