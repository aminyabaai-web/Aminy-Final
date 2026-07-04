// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// Web Audio API sound effects - no file dependencies (CSP blocks remote assets).
//
// Sensory-aware: every effect scales its gain by the child's sensory audio
// volume (full / reduced / muted) and can be muted outright via a persisted
// toggle. Haptics respect reduced-motion and the global haptic toggle so a
// sensory-sensitive child never gets an unwanted buzz.
import { getSensoryAudioVolume } from '../../../hooks/useSensoryMode';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Autoplay policies can leave the context suspended until a gesture — resume opportunistically.
    if (audioCtx.state === 'suspended') { void audioCtx.resume().catch(() => {}); }
    return audioCtx;
  } catch {
    return null;
  }
}

// ── Sound mute toggle (persisted, opt-out) ─────────────────────────────
const SOUND_KEY = 'aminy-junior-sound';
let _soundMuted = false;
try { _soundMuted = localStorage.getItem(SOUND_KEY) === 'off'; } catch { /* no storage */ }

/** Enable or disable Ease sound effects (persisted across sessions). */
export function setSoundEnabled(enabled: boolean): void {
  _soundMuted = !enabled;
  try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* no storage */ }
}

/** Whether Ease sound effects are currently enabled. */
export function isSoundEnabled(): boolean {
  return !_soundMuted;
}

/**
 * Effective playback volume (0–1): 0 when muted or when the child's sensory
 * profile sets audio to "muted". Callers should bail when this is 0.
 */
function effectiveVolume(): number {
  if (_soundMuted) return 0;
  try { return getSensoryAudioVolume(); } catch { return 1; }
}

// ── Haptic gating (reduced-motion + global toggle) ─────────────────────
const HAPTIC_KEY = 'aminy-haptic-enabled';

function reducedMotionActive(): boolean {
  try {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduced-motion')) return true;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

function hapticsEnabled(): boolean {
  try { if (localStorage.getItem(HAPTIC_KEY) === 'false') return false; } catch { /* no storage */ }
  return !reducedMotionActive();
}

export function playTap() {
  const ctx = getCtx();
  const vol = effectiveVolume();
  if (!ctx || vol <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.2 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

/** Soft, rounded bubble "pop" — gentler and lower than playTap. */
export function playPop() {
  const ctx = getCtx();
  const vol = effectiveVolume();
  if (!ctx || vol <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  // Quick downward blip reads as a satisfying "pop".
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.09);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18 * vol, ctx.currentTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playSuccess() {
  const ctx = getCtx();
  const vol = effectiveVolume();
  if (!ctx || vol <= 0) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25 * vol, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.35);
  });
}

export function playWrong() {
  const ctx = getCtx();
  const vol = effectiveVolume();
  if (!ctx || vol <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playComplete() {
  const ctx = getCtx();
  const vol = effectiveVolume();
  if (!ctx || vol <= 0) return;
  [392, 494, 587, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3 * vol, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.55);
  });
}

export function playBreath() {
  const ctx = getCtx();
  const vol = effectiveVolume();
  if (!ctx || vol <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 280;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12 * vol, ctx.currentTime + 1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 2.1);
}

/**
 * Native haptic feedback — uses Capacitor Haptics when available (iOS/Android),
 * falls back to Web Vibration API for PWA. No-ops when reduced-motion is on or
 * haptics have been disabled globally.
 */
export async function haptic(pattern: number | number[] = 50) {
  if (!hapticsEnabled()) return;
  try {
    // Try Capacitor native haptics first (much better on iOS)
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics').catch(() => ({ Haptics: null, ImpactStyle: null }));
    if (Haptics) {
      const intensity = typeof pattern === 'number' ? pattern : pattern[0] || 50;
      if (intensity <= 30) {
        await Haptics.impact({ style: ImpactStyle!.Light });
      } else if (intensity <= 80) {
        await Haptics.impact({ style: ImpactStyle!.Medium });
      } else {
        await Haptics.impact({ style: ImpactStyle!.Heavy });
      }
      return;
    }
  } catch { /* Capacitor not available — fall through to web */ }

  // Web Vibration API fallback
  try { navigator.vibrate?.(pattern); } catch { /* no vibrate */ }
}
