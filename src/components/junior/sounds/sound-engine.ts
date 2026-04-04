// ---------------------------------------------------------------------------
// Feelscape Sound Engine — Procedural Web Audio generation
// No audio file dependencies. All sounds synthesized in real-time.
// ---------------------------------------------------------------------------

import { haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// Shared AudioContext (singleton)
// ---------------------------------------------------------------------------
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume();
  }
  return sharedCtx;
}

// ---------------------------------------------------------------------------
// SoundGenerator interface
// ---------------------------------------------------------------------------
export interface SoundGenerator {
  start(): void;
  stop(): void;
  setVolume(v: number): void;
  isPlaying(): boolean;
}

// ---------------------------------------------------------------------------
// Noise buffer helpers
// ---------------------------------------------------------------------------
function createWhiteNoiseBuffer(ctx: AudioContext, duration = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createPinkNoiseBuffer(ctx: AudioContext, duration = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function createBrownNoiseBuffer(ctx: AudioContext, duration = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + (0.02 * white)) / 1.02;
    data[i] = lastOut * 3.5;
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Noise Generator (rain, ocean, wind, white/pink/brown noise, etc.)
// ---------------------------------------------------------------------------
function createNoiseGenerator(config: Record<string, number>): SoundGenerator {
  let playing = false;
  let source: AudioBufferSourceNode | null = null;
  let gainNode: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;

  return {
    start() {
      if (playing) return;
      playing = true;
      const ctx = getCtx();

      // Pick noise type
      let buffer: AudioBuffer;
      if (config.pink) {
        buffer = createPinkNoiseBuffer(ctx, 4);
      } else if (config.brown) {
        buffer = createBrownNoiseBuffer(ctx, 4);
      } else {
        buffer = createWhiteNoiseBuffer(ctx, 4);
      }

      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Bandpass filter
      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const centerFreq = (config.lowFreq + config.highFreq) / 2;
      filter.frequency.value = centerFreq;
      filter.Q.value = centerFreq / (config.highFreq - config.lowFreq + 1);

      // Master gain
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.35;

      source.connect(filter);
      filter.connect(gainNode);

      // Amplitude modulation (for wave-like effects)
      if (config.ampMod > 0 && config.ampModFreq > 0) {
        lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = config.ampModFreq;
        lfoGain = ctx.createGain();
        lfoGain.gain.value = config.ampMod * 0.35;
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        lfo.start();
      }

      gainNode.connect(ctx.destination);
      source.start();
    },
    stop() {
      if (!playing) return;
      playing = false;
      try {
        lfo?.stop();
        source?.stop();
      } catch { /* already stopped */ }
      source?.disconnect();
      filter?.disconnect();
      gainNode?.disconnect();
      lfoGain?.disconnect();
      source = null;
      filter = null;
      gainNode = null;
      lfo = null;
      lfoGain = null;
    },
    setVolume(v: number) {
      if (gainNode) {
        gainNode.gain.value = v * 0.5;
        if (lfoGain && config.ampMod > 0) {
          lfoGain.gain.value = config.ampMod * v * 0.5;
        }
      }
    },
    isPlaying() { return playing; },
  };
}

// ---------------------------------------------------------------------------
// Oscillator Generator (cat purring, crickets, lullaby, bells, etc.)
// ---------------------------------------------------------------------------
function createOscillatorGenerator(config: Record<string, number>): SoundGenerator {
  let playing = false;
  let gainNode: GainNode | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let activeOscs: OscillatorNode[] = [];

  // Lullaby melodies (MIDI-style note arrays)
  const melodies: Record<number, number[]> = {
    1: [392, 440, 392, 330, 294, 330, 392, 0, 392, 440, 392, 330, 294, 262], // Twinkle-ish
    2: [262, 330, 392, 330, 262, 294, 330, 0, 349, 330, 294, 262, 247, 262], // Gentle piano
    3: [523, 494, 440, 392, 440, 494, 523, 0, 587, 523, 494, 440, 392, 440], // Music box
  };

  return {
    start() {
      if (playing) return;
      playing = true;
      const ctx = getCtx();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.25;
      gainNode.connect(ctx.destination);

      // Bell-type sounds
      if (config.bellInterval) {
        const playBell = () => {
          if (!playing || !gainNode) return;
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = config.freq;
          env.gain.setValueAtTime(0.3, ctx.currentTime);
          env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.bellDecay);
          osc.connect(env);
          env.connect(gainNode!);
          osc.start();
          osc.stop(ctx.currentTime + config.bellDecay + 0.1);
          activeOscs.push(osc);
          // Add harmonic
          const h = ctx.createOscillator();
          const hEnv = ctx.createGain();
          h.type = 'sine';
          h.frequency.value = config.freq * 2.76; // Inharmonic partial for bell sound
          hEnv.gain.setValueAtTime(0.1, ctx.currentTime);
          hEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.bellDecay * 0.6);
          h.connect(hEnv);
          hEnv.connect(gainNode!);
          h.start();
          h.stop(ctx.currentTime + config.bellDecay * 0.6 + 0.1);
          activeOscs.push(h);
        };
        playBell();
        intervalId = setInterval(playBell, config.bellInterval * 1000);
        return;
      }

      // Melody-type sounds
      if (config.melody) {
        const notes = melodies[config.melody] || melodies[1];
        const beatDuration = 60 / (config.tempo || 72);
        let noteIndex = 0;
        const playNote = () => {
          if (!playing || !gainNode) return;
          const freq = notes[noteIndex % notes.length];
          noteIndex++;
          if (freq === 0) return; // rest
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = config.waveform === 1 ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          env.gain.setValueAtTime(0.2, ctx.currentTime);
          env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + beatDuration * 0.9);
          osc.connect(env);
          env.connect(gainNode!);
          osc.start();
          osc.stop(ctx.currentTime + beatDuration + 0.1);
          activeOscs.push(osc);
        };
        playNote();
        intervalId = setInterval(playNote, beatDuration * 1000);
        return;
      }

      // Whale song (frequency sweep)
      if (config.freqSweep) {
        const playCall = () => {
          if (!playing || !gainNode) return;
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(config.freq, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(config.freq + config.freqSweep, ctx.currentTime + config.sweepDuration / 2);
          osc.frequency.linearRampToValueAtTime(config.freq, ctx.currentTime + config.sweepDuration);
          env.gain.setValueAtTime(0, ctx.currentTime);
          env.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
          env.gain.setValueAtTime(0.15, ctx.currentTime + config.sweepDuration - 0.5);
          env.gain.linearRampToValueAtTime(0, ctx.currentTime + config.sweepDuration);
          osc.connect(env);
          env.connect(gainNode!);
          osc.start();
          osc.stop(ctx.currentTime + config.sweepDuration + 0.1);
          activeOscs.push(osc);
        };
        playCall();
        intervalId = setInterval(playCall, (config.sweepDuration + 3) * 1000);
        return;
      }

      // Cricket pattern
      if (config.onDuration) {
        const playCricket = () => {
          if (!playing || !gainNode) return;
          // Chirp burst: rapid on/off
          for (let i = 0; i < 6; i++) {
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = config.freq + Math.random() * 200;
            const offset = i * (config.onDuration + config.offDuration);
            env.gain.setValueAtTime(0, ctx.currentTime + offset);
            env.gain.linearRampToValueAtTime(0.08, ctx.currentTime + offset + 0.005);
            env.gain.setValueAtTime(0.08, ctx.currentTime + offset + config.onDuration);
            env.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + config.onDuration + 0.005);
            osc.connect(env);
            env.connect(gainNode!);
            osc.start(ctx.currentTime + offset);
            osc.stop(ctx.currentTime + offset + config.onDuration + config.offDuration);
            activeOscs.push(osc);
          }
        };
        playCricket();
        intervalId = setInterval(playCricket, config.burstGap * 1000);
        return;
      }

      // Cat purring (low oscillator with amplitude modulation)
      if (config.ampModFreq && config.freq < 50) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = config.freq;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = config.ampModFreq;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.15;
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode!.gain);
        osc.connect(gainNode!);
        osc.start();
        lfo.start();
        activeOscs.push(osc, lfo);
        return;
      }
    },
    stop() {
      if (!playing) return;
      playing = false;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      activeOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch { /* ok */ } });
      activeOscs = [];
      gainNode?.disconnect();
      gainNode = null;
    },
    setVolume(v: number) {
      if (gainNode) gainNode.gain.value = v * 0.4;
    },
    isPlaying() { return playing; },
  };
}

// ---------------------------------------------------------------------------
// Combined Generator (noise + tonal elements: thunder, campfire, birds, etc.)
// ---------------------------------------------------------------------------
function createCombinedGenerator(config: Record<string, number>): SoundGenerator {
  let playing = false;
  let noiseSource: AudioBufferSourceNode | null = null;
  let noiseGain: GainNode | null = null;
  let noiseFilter: BiquadFilterNode | null = null;
  let masterGain: GainNode | null = null;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let activeOscs: (OscillatorNode | AudioBufferSourceNode)[] = [];

  return {
    start() {
      if (playing) return;
      playing = true;
      const ctx = getCtx();

      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);

      // Noise layer
      const buffer = createWhiteNoiseBuffer(ctx, 4);
      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      const center = ((config.lowFreq || 200) + (config.highFreq || 2000)) / 2;
      noiseFilter.frequency.value = center;
      noiseFilter.Q.value = 0.5;

      noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.25;

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // Amplitude modulation on noise
      if (config.ampMod && config.ampModFreq) {
        lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = config.ampModFreq;
        lfoGain = ctx.createGain();
        lfoGain.gain.value = config.ampMod * 0.25;
        lfo.connect(lfoGain);
        lfoGain.connect(noiseGain.gain);
        lfo.start();
      }

      noiseSource.start();

      // Crackle events (campfire, fireplace, horse hooves)
      if (config.crackleRate) {
        intervalId = setInterval(() => {
          if (!playing || !masterGain) return;
          const crackle = ctx.createBufferSource();
          const cb = createWhiteNoiseBuffer(ctx, config.crackleDecay || 0.03);
          crackle.buffer = cb;
          const cGain = ctx.createGain();
          cGain.gain.setValueAtTime(0.4, ctx.currentTime);
          cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (config.crackleDecay || 0.03));
          const cFilter = ctx.createBiquadFilter();
          cFilter.type = 'highpass';
          cFilter.frequency.value = 2000 + Math.random() * 3000;
          crackle.connect(cFilter);
          cFilter.connect(cGain);
          cGain.connect(masterGain!);
          crackle.start();
          activeOscs.push(crackle);
        }, (1000 / (config.crackleRate || 10)) + Math.random() * 100);
      }

      // Chirp events (birds, frogs, jungle)
      if (config.chirpRate && config.chirpDuration) {
        intervalId = setInterval(() => {
          if (!playing || !masterGain) return;
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          const freq = config.lowFreq + Math.random() * (config.highFreq - config.lowFreq);
          osc.frequency.value = freq;
          // Quick frequency sweep for realism
          osc.frequency.linearRampToValueAtTime(freq * (1 + Math.random() * 0.3), ctx.currentTime + config.chirpDuration);
          env.gain.setValueAtTime(0, ctx.currentTime);
          env.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
          env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.chirpDuration);
          osc.connect(env);
          env.connect(masterGain!);
          osc.start();
          osc.stop(ctx.currentTime + config.chirpDuration + 0.05);
          activeOscs.push(osc);
        }, (1000 / config.chirpRate) + Math.random() * 500);
      }

      // Thunder bursts
      if (config.burstInterval && config.burstDuration) {
        intervalId = setInterval(() => {
          if (!playing || !masterGain) return;
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = config.lowFreq + Math.random() * (config.highFreq - config.lowFreq);
          env.gain.setValueAtTime(0, ctx.currentTime);
          env.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
          env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.burstDuration);
          osc.connect(env);
          env.connect(masterGain!);
          osc.start();
          osc.stop(ctx.currentTime + config.burstDuration + 0.1);
          activeOscs.push(osc);
        }, config.burstInterval * 1000 + Math.random() * 3000);
      }
    },
    stop() {
      if (!playing) return;
      playing = false;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      try { lfo?.stop(); } catch { /* ok */ }
      try { noiseSource?.stop(); } catch { /* ok */ }
      activeOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch { /* ok */ } });
      activeOscs = [];
      noiseSource?.disconnect();
      noiseFilter?.disconnect();
      noiseGain?.disconnect();
      masterGain?.disconnect();
      lfoGain?.disconnect();
      noiseSource = null;
      noiseFilter = null;
      noiseGain = null;
      masterGain = null;
      lfo = null;
      lfoGain = null;
    },
    setVolume(v: number) {
      if (masterGain) masterGain.gain.value = v * 0.4;
    },
    isPlaying() { return playing; },
  };
}

// ---------------------------------------------------------------------------
// Haptic-Only Generator (no audio, just vibration patterns)
// ---------------------------------------------------------------------------
function createHapticGenerator(config: Record<string, number>): SoundGenerator {
  let playing = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const patterns: Record<number, number[]> = {
    1: [100, 150, 60, 600],         // Heartbeat: thump-thump...pause
    2: [30, 300],                    // Water drops: brief pulse, pause
    3: [20, 40, 20, 40, 20, 40, 150, 800], // Shooting star: rapid then trail
    4: [50, 50],                     // Infinite pulse: steady rhythm
    5: [10, 20, 30, 40, 50, 60, 70, 80, 70, 60, 50, 40, 30, 20, 10, 500], // Wave: crescendo/decrescendo
  };

  return {
    start() {
      if (playing) return;
      playing = true;
      const pattern = patterns[config.pattern] || patterns[1];
      const fire = () => { if (playing) haptic(pattern); };
      fire();
      const totalDuration = pattern.reduce((a, b) => a + b, 0);
      intervalId = setInterval(fire, totalDuration + (config.interval || 800));
    },
    stop() {
      if (!playing) return;
      playing = false;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      try { navigator.vibrate?.(0); } catch { /* no vibrate */ }
    },
    setVolume(_v: number) { /* haptics don't have volume */ },
    isPlaying() { return playing; },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createSoundGenerator(
  type: 'noise' | 'oscillator' | 'combined' | 'haptic-only',
  config: Record<string, number>,
): SoundGenerator {
  switch (type) {
    case 'noise': return createNoiseGenerator(config);
    case 'oscillator': return createOscillatorGenerator(config);
    case 'combined': return createCombinedGenerator(config);
    case 'haptic-only': return createHapticGenerator(config);
    default: return createNoiseGenerator(config);
  }
}
