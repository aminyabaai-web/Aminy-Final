// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Mic,
  Star,
  Sparkles,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { playTap, playSuccess, haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Worry {
  id: string;
  text: string;
  rating: number; // 1-5
  shrunk: boolean;
  released: boolean;
  createdAt: number;
  theme?: string;
  reframes: string[];
}

export interface WorryJarProps {
  onBack: () => void;
  childName?: string;
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aminy-worry-jar';

function loadWorries(): Worry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveWorries(worries: Worry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worries));
}

/** Export for therapist insight integration */
export function getWorryThemes(): { theme: string; count: number }[] {
  const worries = loadWorries();
  const themes: Record<string, number> = {};
  worries.forEach(w => {
    const t = w.theme || 'general';
    themes[t] = (themes[t] || 0) + 1;
  });
  return Object.entries(themes).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Reframe prompts
// ---------------------------------------------------------------------------

const REFRAME_PROMPTS = [
  { emoji: '🤝', text: 'What would you tell a friend who had this worry?' },
  { emoji: '🌈', text: 'What is the BEST thing that could happen?' },
  { emoji: '🔍', text: 'Has this happened before? What actually happened?' },
  { emoji: '💪', text: 'What is one thing you CAN control about this?' },
  { emoji: '⏰', text: 'Will this matter in one week? One month?' },
  { emoji: '🧠', text: 'Is this a fact, or is it just a thought?' },
];

// ---------------------------------------------------------------------------
// Theme detection
// ---------------------------------------------------------------------------

function detectTheme(text: string): string {
  const lower = text.toLowerCase();
  if (/school|test|homework|grade|teacher/.test(lower)) return 'school';
  if (/friend|play|invite|party|lonely/.test(lower)) return 'social';
  if (/dark|monster|night|sleep|bed/.test(lower)) return 'nighttime';
  if (/sick|hurt|doctor|hospital/.test(lower)) return 'health';
  if (/mom|dad|parent|family|fight/.test(lower)) return 'family';
  if (/new|change|move|different/.test(lower)) return 'change';
  return 'general';
}

// ---------------------------------------------------------------------------
// Stone colors
// ---------------------------------------------------------------------------

const STONE_COLORS = [
  'bg-violet-400', 'bg-blue-400', 'bg-teal-400', 'bg-amber-400',
  'bg-rose-400', 'bg-emerald-400', 'bg-pink-400', 'bg-indigo-400',
];

function getStoneColor(index: number): string {
  return STONE_COLORS[index % STONE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Sparkle particles (Web Audio for dissolve sound)
// ---------------------------------------------------------------------------

function playDissolveSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Shimmering dissolve
    [1200, 1400, 1600, 1800, 2000].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  } catch {
    // audio not available
  }
}

// ---------------------------------------------------------------------------
// Speech Recognition helper (avoids TS conflicts with global SpeechRecognition type)
// ---------------------------------------------------------------------------

interface SpeechRec {
  start(): void;
  stop(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function createRecognition(Ctor: new () => SpeechRec): SpeechRec {
  const r = new Ctor();
  r.continuous = false;
  r.interimResults = false;
  r.lang = 'en-US';
  return r;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorryInput({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRec | null>(null);

  const handleVoice = () => {
    const SpeechRecognitionCtor = (window as unknown as Record<string, unknown>).SpeechRecognition
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return; // not supported
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recognition = createRecognition(SpeechRecognitionCtor as new () => SpeechRec);
    recognition.onresult = (event: unknown) => {
      const e = event as { results: { 0?: { 0?: { transcript?: string } } } };
      const result = e.results?.[0]?.[0]?.transcript;
      if (result) setText(prev => prev + ' ' + result);
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    haptic(30);
  };

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
    playTap();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What are you worried about?"
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleVoice}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm active:scale-95 ${
              recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#F0EDE8] text-[#5A6B7A]'
            }`}
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-sm active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ShrinkExercise({ worry, onReframe, onClose }: {
  worry: Worry;
  onReframe: (worryId: string, reframe: string) => void;
  onClose: () => void;
}) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [response, setResponse] = useState('');
  const prompt = REFRAME_PROMPTS[promptIndex];

  const submitReframe = () => {
    if (!response.trim()) return;
    playTap();
    onReframe(worry.id, response.trim());
    setResponse('');
    if (promptIndex < REFRAME_PROMPTS.length - 1) {
      setPromptIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="rounded-[20px] border border-violet-200 bg-violet-50 p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="text-sm font-semibold text-violet-800">Shrink the Worry</div>
        <button type="button" onClick={onClose} className="text-violet-400 hover:text-violet-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="text-sm text-violet-600 italic">"{worry.text}"</div>
      <div className="flex items-start gap-2">
        <span className="text-lg">{prompt.emoji}</span>
        <p className="text-sm text-violet-700">{prompt.text}</p>
      </div>
      <textarea
        value={response}
        onChange={e => setResponse(e.target.value)}
        placeholder="Type your thoughts..."
        rows={2}
        className="w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
      <div className="flex items-center justify-between">
        <div className="text-sm text-violet-400">
          {promptIndex + 1} / {REFRAME_PROMPTS.length}
        </div>
        <button
          type="button"
          onClick={submitReframe}
          className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white active:scale-95"
        >
          {promptIndex < REFRAME_PROMPTS.length - 1 ? 'Next' : 'Done'}
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WorryJar({ onBack, childName = 'Buddy' }: WorryJarProps) {
  const [worries, setWorries] = useState<Worry[]>(() => loadWorries());
  const [selectedWorryId, setSelectedWorryId] = useState<string | null>(null);
  const [shrinkingWorryId, setShrinkingWorryId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  // Persist on change
  useEffect(() => {
    saveWorries(worries);
  }, [worries]);

  const addWorry = useCallback((text: string) => {
    haptic(30);
    const worry: Worry = {
      id: crypto.randomUUID(),
      text,
      rating: 3,
      shrunk: false,
      released: false,
      createdAt: Date.now(),
      theme: detectTheme(text),
      reframes: [],
    };
    setWorries(prev => [worry, ...prev]);
  }, []);

  const rateWorry = (id: string, rating: number) => {
    playTap();
    setWorries(prev => prev.map(w => w.id === id ? { ...w, rating } : w));
  };

  const handleReframe = (id: string, reframe: string) => {
    setWorries(prev => prev.map(w => {
      if (w.id !== id) return w;
      const newReframes = [...w.reframes, reframe];
      return { ...w, reframes: newReframes, shrunk: newReframes.length >= 2, rating: Math.max(1, w.rating - 1) };
    }));
  };

  const releaseWorry = (id: string) => {
    playDissolveSound();
    haptic(60);
    setReleasingId(id);
    setTimeout(() => {
      setWorries(prev => prev.map(w => w.id === id ? { ...w, released: true } : w));
      setReleasingId(null);
      setSelectedWorryId(null);
      playSuccess();
    }, 1500);
  };

  const activeWorries = worries.filter(w => !w.released);
  const releasedCount = worries.filter(w => w.released).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={() => { playTap(); onBack(); }} className="flex items-center gap-2 text-sm font-medium text-[#5A6B7A]">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="text-sm font-semibold text-[#132F43]">Worry Jar</div>
          <div className="flex items-center gap-1 text-sm font-medium text-violet-600">
            <Sparkles className="h-4 w-4" />
            {releasedCount} let go
          </div>
        </div>
      </div>

      <div className="px-4 py-5 pb-24 space-y-5">
        {/* Jar visualization */}
        <div className="relative mx-auto flex flex-col items-center">
          <div className="text-center mb-3">
            <div className="text-2xl mb-1">🫙</div>
            <p className="text-sm text-[#5A6B7A]">Tap a worry stone to explore it</p>
          </div>

          {/* Jar body */}
          <div className="relative w-56 min-h-[160px] rounded-b-[40px] rounded-t-xl border-2 border-violet-200 bg-violet-50/50 p-3 flex flex-wrap gap-2 justify-center content-end">
            <AnimatePresence>
              {activeWorries.map((worry, idx) => (
                <motion.button
                  key={worry.id}
                  type="button"
                  layout
                  initial={{ scale: 0, y: -50 }}
                  animate={{
                    scale: worry.shrunk ? 0.7 : 1,
                    y: 0,
                    opacity: releasingId === worry.id ? 0 : 1,
                  }}
                  exit={{ scale: 0, opacity: 0, y: -80 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  onClick={() => {
                    playTap();
                    setSelectedWorryId(selectedWorryId === worry.id ? null : worry.id);
                    setShrinkingWorryId(null);
                  }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-md ${getStoneColor(idx)} ${
                    selectedWorryId === worry.id ? 'ring-2 ring-white ring-offset-2' : ''
                  }`}
                >
                  {/* Sparkle particles when releasing */}
                  {releasingId === worry.id && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{
                            x: (Math.random() - 0.5) * 80,
                            y: (Math.random() - 0.5) * 80,
                            opacity: 0,
                            scale: 0,
                          }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                          className="absolute h-2 w-2 rounded-full bg-yellow-300"
                        />
                      ))}
                    </>
                  )}
                  <span className="text-sm font-bold text-white">{worry.rating}</span>
                </motion.button>
              ))}
            </AnimatePresence>
            {activeWorries.length === 0 && (
              <div className="flex h-24 items-center justify-center text-sm text-violet-300">
                Jar is empty!
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <WorryInput onAdd={addWorry} />

        {/* Selected worry detail */}
        <AnimatePresence>
          {selectedWorryId && (() => {
            const worry = worries.find(w => w.id === selectedWorryId);
            if (!worry || worry.released) return null;
            return (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="rounded-[20px] border border-[#E8E4DF] bg-white p-4 shadow-sm space-y-3"
              >
                <div className="text-sm font-medium text-[#132F43]">"{worry.text}"</div>
                {/* Rating */}
                <div>
                  <div className="text-sm text-[#5A6B7A] mb-1">How big does it feel? (1-5)</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => rateWorry(worry.id, n)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                          worry.rating >= n ? 'bg-violet-500 text-white' : 'bg-[#F0EDE8] text-slate-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { playTap(); setShrinkingWorryId(worry.id); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-100 px-4 py-3 text-sm font-medium text-violet-700 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Shrink it
                  </button>
                  <button
                    type="button"
                    onClick={() => releaseWorry(worry.id)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-700 active:scale-95"
                  >
                    <Sparkles className="h-4 w-4" />
                    Let it go
                  </button>
                </div>

                {/* Reframes */}
                {worry.reframes.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-slate-400">Your reframes:</div>
                    {worry.reframes.map((r, i) => (
                      <div key={i} className="text-sm text-[#5A6B7A] bg-[#FAF7F2] rounded-lg px-3 py-2">
                        "{r}"
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Shrink exercise */}
        <AnimatePresence>
          {shrinkingWorryId && (() => {
            const worry = worries.find(w => w.id === shrinkingWorryId);
            if (!worry) return null;
            return (
              <ShrinkExercise
                key="shrink"
                worry={worry}
                onReframe={handleReframe}
                onClose={() => setShrinkingWorryId(null)}
              />
            );
          })()}
        </AnimatePresence>

        {/* Stats */}
        {worries.length > 0 && (
          <div className="rounded-[20px] border border-[#E8E4DF] bg-[#FAF7F2] p-4">
            <div className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Worry stats</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-violet-600">{activeWorries.length}</div>
                <div className="text-sm text-slate-400">Active</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{releasedCount}</div>
                <div className="text-sm text-slate-400">Released</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{worries.filter(w => w.shrunk).length}</div>
                <div className="text-sm text-slate-400">Shrunk</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
