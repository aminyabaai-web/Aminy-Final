// Web Audio API sound effects - no file dependencies
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playTap() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

export function playSuccess() {
  const ctx = getCtx();
  if (!ctx) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.35);
  });
}

export function playWrong() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playComplete() {
  const ctx = getCtx();
  if (!ctx) return;
  [392, 494, 587, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.55);
  });
}

export function playBreath() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 280;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 2.1);
}

/**
 * Native haptic feedback — uses Capacitor Haptics when available (iOS/Android),
 * falls back to Web Vibration API for PWA.
 */
export async function haptic(pattern: number | number[] = 50) {
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
