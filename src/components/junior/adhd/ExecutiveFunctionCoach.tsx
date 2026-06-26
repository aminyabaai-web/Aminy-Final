// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ListChecks,
  Timer,
  LayoutGrid,
  Hand,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Flower2,
  Play,
  Pause,
  RotateCcw,
  Star,
} from 'lucide-react';
import { playTap, playSuccess, haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

interface PriorityCard {
  id: string;
  text: string;
  column: 'now' | 'later' | 'done';
}

interface CompletionRecord {
  tool: string;
  timestamp: number;
  detail?: string;
}

export interface ExecutiveFunctionCoachProps {
  onBack: () => void;
  childName?: string;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aminy-ef-coach';

function loadCompletions(): CompletionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCompletion(record: CompletionRecord) {
  const records = loadCompletions();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** Export for parent dashboard integration */
export function getEFCompletions(): CompletionRecord[] {
  return loadCompletions();
}

// ---------------------------------------------------------------------------
// Web Audio helper for timer sounds
// ---------------------------------------------------------------------------

function playTimerDing() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.5);
    });
  } catch {
    // audio not available
  }
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

type ToolId = 'chunker' | 'timer' | 'priority' | 'impulse';

const TOOLS: { id: ToolId; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { id: 'chunker', label: 'Task Chunker', description: 'Break big tasks into small steps', icon: <ListChecks className="h-6 w-6" />, color: 'bg-[#EEF4F8] border-[#C8DDE8] text-blue-700' },
  { id: 'timer', label: 'Focus Timer', description: 'Stay focused with a fun timer', icon: <Timer className="h-6 w-6" />, color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'priority', label: 'Priority Picker', description: 'Sort tasks: Now, Later, Done', icon: <LayoutGrid className="h-6 w-6" />, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'impulse', label: 'Impulse Pause', description: 'Stop and count to 5 first', icon: <Hand className="h-6 w-6" />, color: 'bg-red-50 border-red-200 text-red-700' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TaskChunker({ onComplete }: { onComplete: () => void }) {
  const [bigTask, setBigTask] = useState('');
  const [steps, setSteps] = useState<Task[]>([]);
  const [newStep, setNewStep] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const addStep = () => {
    if (!newStep.trim()) return;
    playTap();
    setSteps(prev => [...prev, { id: crypto.randomUUID(), text: newStep.trim(), done: false, order: prev.length }]);
    setNewStep('');
  };

  const toggleStep = (id: string) => {
    playTap();
    haptic(20);
    setSteps(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));
  };

  const removeStep = (id: string) => {
    playTap();
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...steps];
    const draggedItem = copy[dragItem.current];
    copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null;
    dragOverItem.current = null;
    setSteps(copy);
  };

  const allDone = steps.length > 0 && steps.every(s => s.done);

  useEffect(() => {
    if (allDone && !submitted) {
      setSubmitted(true);
      playSuccess();
      haptic(50);
      saveCompletion({ tool: 'chunker', timestamp: Date.now(), detail: bigTask });
      onComplete();
    }
  }, [allDone, submitted, bigTask, onComplete]);

  return (
    <div className="space-y-4">
      {/* Big task input */}
      <div>
        <label className="block text-sm font-medium text-[#3A4A57] mb-1">What is your big task?</label>
        <input
          type="text"
          value={bigTask}
          onChange={e => setBigTask(e.target.value)}
          placeholder="e.g., Clean my room"
          className="w-full rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Add step */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newStep}
          onChange={e => setNewStep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addStep()}
          placeholder="Add a small step..."
          className="flex-1 rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="button"
          onClick={addStep}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className={`flex items-center gap-3 rounded-2xl border p-3 shadow-sm transition-colors ${
                step.done ? 'border-green-200 bg-green-50' : 'border-[#E8E4DF] bg-white'
              }`}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-slate-400" />
              <button type="button" onClick={() => toggleStep(step.id)} className="flex-shrink-0">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                  step.done ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300'
                }`}>
                  {step.done && <Check className="h-4 w-4" />}
                </div>
              </button>
              <span className={`flex-1 text-sm ${step.done ? 'text-slate-400 line-through' : 'text-[#132F43]'}`}>
                {step.text}
              </span>
              <button type="button" onClick={() => removeStep(step.id)} className="text-slate-400 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {steps.length > 0 && (
        <div className="text-center text-sm text-[#5A6B7A]">
          {steps.filter(s => s.done).length} / {steps.length} steps done
        </div>
      )}
    </div>
  );
}

function FocusTimer({ onComplete }: { onComplete: () => void }) {
  const [duration, setDuration] = useState(5); // minutes
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = duration * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  // Flower grows from 0.3 to 1.0 scale
  const flowerScale = 0.3 + progress * 0.7;
  // Jar fills from 0% to 100%
  const jarFill = progress * 100;

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
            setFinished(true);
            playTimerDing();
            haptic(80);
            saveCompletion({ tool: 'timer', timestamp: Date.now(), detail: `${duration}min` });
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, secondsLeft, duration, onComplete]);

  const reset = () => {
    setRunning(false);
    setFinished(false);
    setSecondsLeft(duration * 60);
  };

  const selectDuration = (mins: number) => {
    if (running) return;
    playTap();
    setDuration(mins);
    setSecondsLeft(mins * 60);
    setFinished(false);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="space-y-6 text-center">
      {/* Duration selector */}
      <div className="flex justify-center gap-2">
        {[5, 10, 15, 20].map(m => (
          <button
            key={m}
            type="button"
            onClick={() => selectDuration(m)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              duration === m
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-[#F0EDE8] text-[#5A6B7A]'
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Visual: growing flower */}
      <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
        {/* Jar background */}
        <div className="absolute bottom-0 left-1/2 h-32 w-24 -translate-x-1/2 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-green-200 bg-green-50">
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-green-300/60"
            animate={{ height: `${jarFill}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {/* Flower */}
        <motion.div
          className="relative z-10 text-6xl"
          animate={{ scale: flowerScale }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <Flower2 className="h-16 w-16 text-green-500" />
        </motion.div>
      </div>

      {/* Time display */}
      <div className="text-4xl font-bold tabular-nums text-[#132F43]">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!finished ? (
          <button
            type="button"
            onClick={() => { playTap(); setRunning(prev => !prev); }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-md active:scale-95"
          >
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </button>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 rounded-full bg-green-100 px-6 py-3 text-green-700 font-semibold"
          >
            <Star className="h-5 w-5" /> Great focus!
          </motion.div>
        )}
        <button
          type="button"
          onClick={() => { playTap(); reset(); }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0EDE8] text-[#5A6B7A] active:scale-95"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function PriorityPicker({ onComplete }: { onComplete: () => void }) {
  const [cards, setCards] = useState<PriorityCard[]>([]);
  const [newCard, setNewCard] = useState('');

  const addCard = () => {
    if (!newCard.trim()) return;
    playTap();
    setCards(prev => [...prev, { id: crypto.randomUUID(), text: newCard.trim(), column: 'now' }]);
    setNewCard('');
  };

  const moveCard = (id: string, column: PriorityCard['column']) => {
    playTap();
    haptic(20);
    setCards(prev => prev.map(c => c.id === id ? { ...c, column } : c));
    if (column === 'done') {
      saveCompletion({ tool: 'priority', timestamp: Date.now() });
      onComplete();
    }
  };

  const removeCard = (id: string) => {
    playTap();
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const columns: { key: PriorityCard['column']; label: string; emoji: string; bgColor: string; borderColor: string }[] = [
    { key: 'now', label: 'Do Now', emoji: '🔥', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { key: 'later', label: 'Do Later', emoji: '⏰', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { key: 'done', label: 'Done', emoji: '✅', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  ];

  return (
    <div className="space-y-4">
      {/* Add card */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCard}
          onChange={e => setNewCard(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCard()}
          placeholder="Add a task..."
          className="flex-1 rounded-2xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <button
          type="button"
          onClick={addCard}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500 text-white shadow-sm active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-2">
        {columns.map(col => (
          <div key={col.key} className={`rounded-2xl border ${col.borderColor} ${col.bgColor} p-2`}>
            <div className="mb-2 text-center text-sm font-semibold text-[#3A4A57]">
              {col.emoji} {col.label}
            </div>
            <div className="min-h-[80px] space-y-2">
              <AnimatePresence mode="popLayout">
                {cards.filter(c => c.column === col.key).map(card => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="rounded-xl bg-white p-2 text-sm text-[#3A4A57] shadow-sm"
                  >
                    <div className="mb-1 break-words">{card.text}</div>
                    <div className="flex gap-1">
                      {columns.filter(c2 => c2.key !== col.key).map(target => (
                        <button
                          key={target.key}
                          type="button"
                          onClick={() => moveCard(card.id, target.key)}
                          className="rounded-lg bg-[#F0EDE8] px-2 py-0.5 text-sm text-[#5A6B7A] active:scale-95"
                        >
                          {target.emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => removeCard(card.id)}
                        className="ml-auto rounded-lg bg-red-50 px-2 py-0.5 text-sm text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpulsePause({ onComplete }: { onComplete: () => void }) {
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCount = () => {
    playTap();
    haptic(60);
    setCounting(true);
    setCount(0);
    setFinished(false);
  };

  useEffect(() => {
    if (counting && count < 5) {
      intervalRef.current = setTimeout(() => {
        setCount(prev => {
          const next = prev + 1;
          haptic(30);
          playTap();
          if (next >= 5) {
            setCounting(false);
            setFinished(true);
            playSuccess();
            haptic(80);
            saveCompletion({ tool: 'impulse', timestamp: Date.now() });
            onComplete();
          }
          return next;
        });
      }, 1200);
    }
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [counting, count, onComplete]);

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      {/* Big STOP button */}
      {!counting && !finished && (
        <motion.button
          type="button"
          onClick={startCount}
          whileTap={{ scale: 0.9 }}
          className="flex h-40 w-40 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
        >
          <span className="text-3xl font-black tracking-wider">STOP</span>
        </motion.button>
      )}

      {/* Counting phase */}
      {counting && (
        <div className="flex flex-col items-center space-y-6">
          <div className="text-sm font-medium text-[#5A6B7A]">Count with me...</div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <motion.div
                key={n}
                initial={{ scale: 0.5, opacity: 0.3 }}
                animate={count >= n ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0.3 }}
                className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shadow-sm ${
                  count >= n ? 'bg-blue-500 text-white' : 'bg-[#F0EDE8] text-slate-400'
                }`}
              >
                {n}
              </motion.div>
            ))}
          </div>
          <motion.div
            key={count}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="text-7xl font-black text-blue-600"
          >
            {count || '...'}
          </motion.div>
        </div>
      )}

      {/* Finished */}
      {finished && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-green-100">
            <Check className="h-16 w-16 text-green-600" />
          </div>
          <div className="text-lg font-semibold text-green-700">Great job pausing!</div>
          <div className="text-sm text-[#5A6B7A]">Now you can think about what to do next.</div>
          <button
            type="button"
            onClick={startCount}
            className="mt-2 rounded-2xl bg-[#F0EDE8] px-6 py-3 text-sm font-medium text-[#5A6B7A] active:scale-95"
          >
            Try again
          </button>
        </motion.div>
      )}

      {!counting && !finished && (
        <p className="text-center text-sm text-[#5A6B7A] px-4">
          Feeling a big urge? Press the STOP button and count to 5 before you act.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ExecutiveFunctionCoach({ onBack, childName = 'Buddy' }: ExecutiveFunctionCoachProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [starsEarned, setStarsEarned] = useState(0);

  const handleComplete = useCallback(() => {
    setStarsEarned(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={() => { playTap(); activeTool ? setActiveTool(null) : onBack(); }} className="flex items-center gap-2 text-sm font-medium text-[#5A6B7A]">
            <ArrowLeft className="h-5 w-5" />
            {activeTool ? 'Tools' : 'Back'}
          </button>
          <div className="text-sm font-semibold text-[#132F43]">
            {activeTool ? TOOLS.find(t => t.id === activeTool)?.label : 'Executive Function Coach'}
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {starsEarned}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 pb-24">
        {!activeTool ? (
          <>
            {/* Welcome */}
            <div className="mb-5 text-center">
              <div className="text-2xl mb-1">🧠</div>
              <h2 className="text-lg font-semibold text-[#132F43]">Hey {childName}!</h2>
              <p className="text-sm text-[#5A6B7A] mt-1">Pick a tool to help you get stuff done.</p>
            </div>

            {/* Tool grid */}
            <div className="space-y-3">
              {TOOLS.map((tool) => (
                <motion.button
                  key={tool.id}
                  type="button"
                  onClick={() => { playTap(); haptic(30); setActiveTool(tool.id); }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex w-full items-center gap-4 rounded-[20px] border p-4 text-left shadow-sm transition-transform ${tool.color}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70">
                    {tool.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{tool.label}</div>
                    <div className="text-sm opacity-70">{tool.description}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2">
            {activeTool === 'chunker' && <TaskChunker onComplete={handleComplete} />}
            {activeTool === 'timer' && <FocusTimer onComplete={handleComplete} />}
            {activeTool === 'priority' && <PriorityPicker onComplete={handleComplete} />}
            {activeTool === 'impulse' && <ImpulsePause onComplete={handleComplete} />}
          </div>
        )}
      </div>
    </div>
  );
}
