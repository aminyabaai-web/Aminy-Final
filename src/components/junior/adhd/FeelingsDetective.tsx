// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Star,
  Wind,
  Activity,
  MessageCircle,
  Dumbbell,
} from 'lucide-react';
import { playTap, playSuccess, haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeelingsDetectiveProps {
  onBack: () => void;
  childName?: string;
  /** Navigate to another Junior screen (e.g., breathing-config, fidget-library) */
  onNavigate?: (screen: string) => void;
}

interface Scenario {
  id: string;
  text: string;
  category: 'social' | 'school' | 'home' | 'unexpected';
}

type Feeling = 'angry' | 'worried' | 'sad' | 'frustrated' | 'excited' | 'scared';

interface ProgressRecord {
  scenarioId: string;
  feeling: Feeling;
  intensity: number;
  copingUsed: string | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SCENARIOS: Scenario[] = [
  { id: 's1', text: 'Your friend won\'t share their toy', category: 'social' },
  { id: 's2', text: 'You have a big test tomorrow', category: 'school' },
  { id: 's3', text: 'Someone cut in front of you in line', category: 'social' },
  { id: 's4', text: 'Your mom said you can\'t have screen time', category: 'home' },
  { id: 's5', text: 'You made a mistake on your homework', category: 'school' },
  { id: 's6', text: 'There\'s a thunderstorm outside', category: 'unexpected' },
  { id: 's7', text: 'Your friend is playing with someone else', category: 'social' },
  { id: 's8', text: 'You\'re starting at a new school', category: 'school' },
  { id: 's9', text: 'Your sibling took your favorite snack', category: 'home' },
  { id: 's10', text: 'You hear a loud, unexpected noise', category: 'unexpected' },
  { id: 's11', text: 'You scored a goal in soccer!', category: 'social' },
  { id: 's12', text: 'You\'re going on a roller coaster', category: 'unexpected' },
  { id: 's13', text: 'Your teacher called on you and you didn\'t know the answer', category: 'school' },
  { id: 's14', text: 'Your pet is sick', category: 'home' },
  { id: 's15', text: 'You lost your favorite toy', category: 'home' },
];

const FEELINGS: { id: Feeling; emoji: string; label: string; color: string }[] = [
  { id: 'angry', emoji: '😠', label: 'Angry', color: 'bg-red-100 border-red-300 text-red-700' },
  { id: 'worried', emoji: '😰', label: 'Worried', color: 'bg-amber-100 border-amber-300 text-amber-700' },
  { id: 'sad', emoji: '😢', label: 'Sad', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: 'frustrated', emoji: '😤', label: 'Frustrated', color: 'bg-orange-100 border-orange-300 text-orange-700' },
  { id: 'excited', emoji: '🤩', label: 'Excited', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { id: 'scared', emoji: '😨', label: 'Scared', color: 'bg-purple-100 border-purple-300 text-purple-700' },
];

interface CopingStrategy {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: 'breathing' | 'fidgets' | 'talk' | 'move';
}

const COPING_STRATEGIES: CopingStrategy[] = [
  { id: 'breathe', label: 'Deep Breath', description: 'Take slow, deep breaths', icon: <Wind className="h-5 w-5" />, action: 'breathing' },
  { id: 'fidget', label: 'Squeeze a Fidget', description: 'Use a fidget to feel calmer', icon: <Activity className="h-5 w-5" />, action: 'fidgets' },
  { id: 'talk', label: 'Talk to Someone', description: 'Tell someone how you feel', icon: <MessageCircle className="h-5 w-5" />, action: 'talk' },
  { id: 'move', label: 'Move Your Body', description: 'Do jumping jacks to let it out', icon: <Dumbbell className="h-5 w-5" />, action: 'move' },
];

// Talk prompt cards
const TALK_PROMPTS = [
  'I feel ___ because ___.',
  'Can you help me with ___?',
  'I need a minute to calm down.',
  'This is really hard for me right now.',
  'I don\'t like it when ___.',
];

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aminy-feelings-detective';

function loadProgress(): ProgressRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveProgress(records: ProgressRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** Export for parent/therapist integration */
export function getEmotionalProgress(): {
  totalScenarios: number;
  avgIntensity: number;
  feelingCounts: Record<string, number>;
  copingUsed: number;
} {
  const records = loadProgress();
  const feelingCounts: Record<string, number> = {};
  let totalIntensity = 0;
  let copingUsed = 0;
  records.forEach(r => {
    feelingCounts[r.feeling] = (feelingCounts[r.feeling] || 0) + 1;
    totalIntensity += r.intensity;
    if (r.copingUsed) copingUsed++;
  });
  return {
    totalScenarios: records.length,
    avgIntensity: records.length ? Math.round(totalIntensity / records.length * 10) / 10 : 0,
    feelingCounts,
    copingUsed,
  };
}

// ---------------------------------------------------------------------------
// Jumping Jacks Timer sub-component
// ---------------------------------------------------------------------------

function JumpingJacksTimer({ onDone }: { onDone: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          playSuccess();
          haptic(60);
          onDone();
          return 0;
        }
        return prev - 1;
      });
      setCount(prev => prev + 1);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[20px] border border-orange-200 bg-orange-50 p-6 text-center space-y-4"
    >
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="text-5xl"
      >
        🏃
      </motion.div>
      <div className="text-lg font-bold text-orange-700">Jumping Jacks!</div>
      <div className="text-3xl font-bold tabular-nums text-orange-600">{secondsLeft}s</div>
      <div className="text-sm text-orange-500">{count} seconds of movement</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type Phase = 'scenario' | 'feeling' | 'thermometer' | 'coping' | 'coping-action' | 'result';

export default function FeelingsDetective({ onBack, childName = 'Buddy', onNavigate }: FeelingsDetectiveProps) {
  const [phase, setPhase] = useState<Phase>('scenario');
  const [scenarioIndex, setScenarioIndex] = useState(() => Math.floor(Math.random() * SCENARIOS.length));
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [selectedCoping, setSelectedCoping] = useState<CopingStrategy | null>(null);
  const [totalStars, setTotalStars] = useState(0);
  const [records, setRecords] = useState<ProgressRecord[]>(() => loadProgress());

  const scenario = SCENARIOS[scenarioIndex];

  useEffect(() => {
    saveProgress(records);
  }, [records]);

  const pickFeeling = (feeling: Feeling) => {
    playTap();
    haptic(30);
    setSelectedFeeling(feeling);
    setPhase('thermometer');
  };

  const submitThermometer = () => {
    playTap();
    if (intensity > 7) {
      setPhase('coping');
    } else {
      // Log and go to result
      finishRound(null);
    }
  };

  const pickCoping = (strategy: CopingStrategy) => {
    playTap();
    haptic(30);
    setSelectedCoping(strategy);

    if (strategy.action === 'breathing' && onNavigate) {
      onNavigate('breathing-config');
      return;
    }
    if (strategy.action === 'fidgets' && onNavigate) {
      onNavigate('fidget-library');
      return;
    }
    setPhase('coping-action');
  };

  const finishRound = (copingUsed: string | null) => {
    if (!selectedFeeling) return;
    playSuccess();
    haptic(50);
    setTotalStars(prev => prev + 1);
    const record: ProgressRecord = {
      scenarioId: scenario.id,
      feeling: selectedFeeling,
      intensity,
      copingUsed,
      timestamp: Date.now(),
    };
    setRecords(prev => [...prev, record]);
    setPhase('result');
  };

  const nextScenario = () => {
    playTap();
    setScenarioIndex(prev => (prev + 1) % SCENARIOS.length);
    setSelectedFeeling(null);
    setIntensity(5);
    setSelectedCoping(null);
    setPhase('scenario');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={() => { playTap(); onBack(); }} className="flex items-center gap-2 text-sm font-medium text-[#5A6B7A]">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="text-sm font-semibold text-[#132F43]">Feelings Detective</div>
          <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {totalStars}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 pb-24">
        {/* Phase: Scenario */}
        {phase === 'scenario' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center"
          >
            <div className="text-2xl mb-1">🔍</div>
            <h2 className="text-lg font-semibold text-[#132F43]">Feelings Detective</h2>
            <p className="text-sm text-[#5A6B7A]">Read the scenario, then pick a feeling.</p>

            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 shadow-sm"
            >
              <div className="text-sm font-medium text-amber-800 uppercase tracking-wide mb-2">Scenario</div>
              <p className="text-base font-semibold text-[#132F43]">{scenario.text}</p>
            </motion.div>

            <button
              type="button"
              onClick={() => { playTap(); setPhase('feeling'); }}
              className="mx-auto flex items-center gap-2 rounded-2xl bg-amber-500 px-8 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
            >
              How does this make you feel? <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Phase: Feeling selector */}
        {phase === 'feeling' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <div className="text-sm text-[#5A6B7A] italic">"{scenario.text}"</div>
              <p className="text-sm font-medium text-[#3A4A57] mt-2">How does this make you feel?</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {FEELINGS.map(f => (
                <motion.button
                  key={f.id}
                  type="button"
                  onClick={() => pickFeeling(f.id)}
                  whileTap={{ scale: 0.9 }}
                  className={`rounded-[20px] border p-4 text-center shadow-sm ${f.color}`}
                >
                  <div className="text-3xl mb-1">{f.emoji}</div>
                  <div className="text-sm font-semibold">{f.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase: Thermometer */}
        {phase === 'thermometer' && selectedFeeling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 text-center"
          >
            <div className="text-3xl">{FEELINGS.find(f => f.id === selectedFeeling)?.emoji}</div>
            <p className="text-sm font-medium text-[#3A4A57]">How BIG is this feeling?</p>

            {/* Thermometer visual */}
            <div className="relative mx-auto flex h-56 w-16 flex-col items-center justify-end rounded-full border-2 border-[#E8E4DF] bg-[#FAF7F2] overflow-hidden">
              <motion.div
                className={`absolute bottom-0 left-0 right-0 rounded-b-full ${
                  intensity > 7 ? 'bg-red-400' : intensity > 4 ? 'bg-amber-400' : 'bg-green-400'
                }`}
                animate={{ height: `${intensity * 10}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              />
              <span className="relative z-10 mb-2 text-2xl font-black text-white drop-shadow-sm">
                {intensity}
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={e => { setIntensity(Number(e.target.value)); haptic(10); }}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-sm text-slate-400 px-1">
              <span>Tiny</span>
              <span>HUGE</span>
            </div>

            <button
              type="button"
              onClick={submitThermometer}
              className="mx-auto rounded-2xl bg-amber-500 px-8 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
            >
              {intensity > 7 ? 'I need a strategy' : 'I can handle this!'}
            </button>
          </motion.div>
        )}

        {/* Phase: Coping strategy picker */}
        {phase === 'coping' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <div className="text-2xl mb-1">💡</div>
              <p className="text-sm font-medium text-[#3A4A57]">That is a big feeling! Let's try a coping strategy.</p>
            </div>
            <div className="space-y-3">
              {COPING_STRATEGIES.map(strategy => (
                <motion.button
                  key={strategy.id}
                  type="button"
                  onClick={() => pickCoping(strategy)}
                  whileTap={{ scale: 0.97 }}
                  className="flex w-full items-center gap-4 rounded-[20px] border border-[#E8E4DF] bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    {strategy.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#132F43]">{strategy.label}</div>
                    <div className="text-sm text-[#5A6B7A]">{strategy.description}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase: Coping action */}
        {phase === 'coping-action' && selectedCoping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {selectedCoping.action === 'talk' && (
              <div className="space-y-3">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">💬</div>
                  <p className="text-sm font-medium text-[#3A4A57]">Try saying one of these:</p>
                </div>
                {TALK_PROMPTS.map((prompt, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-[16px] border border-[#C8DDE8] bg-[#EEF4F8] p-4 text-sm text-[#4A6478]"
                  >
                    "{prompt}"
                  </motion.div>
                ))}
                <button
                  type="button"
                  onClick={() => finishRound('talk')}
                  className="mx-auto flex items-center gap-2 rounded-2xl bg-blue-500 px-8 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
                >
                  I tried it!
                </button>
              </div>
            )}
            {selectedCoping.action === 'move' && (
              <JumpingJacksTimer onDone={() => finishRound('move')} />
            )}
          </motion.div>
        )}

        {/* Phase: Result */}
        {phase === 'result' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center pt-8"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: 2, duration: 0.5 }}
              className="text-5xl"
            >
              🌟
            </motion.div>
            <h3 className="text-lg font-bold text-[#132F43]">Great detective work!</h3>
            <p className="text-sm text-[#5A6B7A]">
              You identified your feeling and{' '}
              {intensity > 7 ? 'used a coping strategy' : 'knew you could handle it'}.
            </p>

            {/* Mini stats */}
            <div className="rounded-[20px] border border-[#E8E4DF] bg-[#FAF7F2] p-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-amber-600">{records.length}</div>
                  <div className="text-sm text-slate-400">Scenarios explored</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{records.filter(r => r.copingUsed).length}</div>
                  <div className="text-sm text-slate-400">Coping strategies used</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={nextScenario}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-medium text-white shadow-sm active:scale-95"
              >
                Next scenario <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { playTap(); onBack(); }}
                className="flex items-center gap-2 rounded-2xl bg-[#F0EDE8] px-6 py-3 text-sm font-medium text-[#5A6B7A] active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
