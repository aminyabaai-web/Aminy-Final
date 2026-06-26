// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.

/**
 * BaselineAssessment — 5-question structured baseline when a child profile
 * is first created (or when no baseline exists in clinical_outcomes).
 *
 * Data goes to `clinical_outcomes` as a baseline record. This gives providers
 * and future outcome reports a "before" measurement to compare against.
 * Three data sources feed outcomes: parent (this + weekly check-ins),
 * child (Junior module completions), provider (session notes).
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

export const BASELINE_STORAGE_KEY = 'aminy_baseline_done';

export function needsBaseline(userId: string): boolean {
  const done = localStorage.getItem(`${BASELINE_STORAGE_KEY}_${userId}`);
  return !done;
}

interface BaselineAssessmentProps {
  userId: string;
  childId?: string;
  childName?: string;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'intro' | 'behavior' | 'frequency' | 'intensity' | 'trigger' | 'goal' | 'done';

const FREQUENCY_OPTIONS = [
  { label: 'Many times a day (10+)', value: 'multiple_daily' },
  { label: 'A few times a day (2–9)', value: 'few_daily' },
  { label: 'Once a day', value: 'once_daily' },
  { label: 'A few times a week', value: 'few_weekly' },
  { label: 'Rarely (once a week or less)', value: 'rarely' },
];

const TRIGGER_OPTIONS = [
  'Transitions / changes in routine',
  'Sensory overload',
  'Hunger or tiredness',
  'Demands / non-preferred tasks',
  'Social situations',
  'Not getting something they want',
  'Hard to identify',
];

export function BaselineAssessment({ userId, childId, childName, onComplete, onSkip }: BaselineAssessmentProps) {
  const [step, setStep] = useState<Step>('intro');
  const [behavior, setBehavior] = useState('');
  const [frequency, setFrequency] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [trigger, setTrigger] = useState('');
  const [goalText, setGoalText] = useState('');
  const [saving, setSaving] = useState(false);

  const name = childName || 'your child';

  const saveBaseline = useCallback(async (goal: string) => {
    setSaving(true);
    try {
      await supabase.from('clinical_outcomes').insert({
        user_id: userId,
        child_id: childId || null,
        outcome_type: 'behavior_baseline',
        category: 'behavior',
        measurement_type: 'frequency',
        baseline_value: intensity,
        target_value: null,
        notes: JSON.stringify({
          target_behavior: behavior,
          baseline_frequency: frequency,
          baseline_intensity: intensity,
          primary_trigger: trigger,
          ninety_day_goal: goal,
          source: 'parent_baseline_assessment',
        }),
        measured_at: new Date().toISOString(),
        status: 'active',
      });
      localStorage.setItem(`${BASELINE_STORAGE_KEY}_${userId}`, '1');
    } catch {
      // Non-fatal
    } finally {
      setSaving(false);
    }
  }, [userId, childId, behavior, frequency, intensity, trigger]);

  const handleGoalSubmit = async () => {
    await saveBaseline(goalText);
    setStep('done');
    toast.success('Baseline saved! Your AI coach now has a starting point to measure progress.', { duration: 4000 });
    setTimeout(onComplete, 2800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(13, 27, 42, 0.55)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        {step !== 'intro' && step !== 'done' && (
          <div className="h-1 bg-[#E8E4DF]">
            <motion.div
              className="h-full bg-[#4E93A8]"
              animate={{ width: `${(['behavior','frequency','intensity','trigger','goal'].indexOf(step) + 1) * 20}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="w-12 h-12 rounded-2xl bg-[#4E93A8]/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-[#4E93A8]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1B2733] mb-2">Set a starting point</h2>
                <p className="text-sm text-[#5A6B7A] mb-6">
                  5 quick questions helps your AI coach and any providers see where {name} is starting — so progress is real, not guessed.
                </p>
                <button
                  onClick={() => setStep('behavior')}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #2A7D99 100%)' }}
                >
                  Let's do it
                </button>
                <button onClick={onSkip} className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  Skip for now
                </button>
              </motion.div>
            )}

            {step === 'behavior' && (
              <motion.div key="behavior" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs font-medium text-[#4E93A8] uppercase tracking-wide mb-1">Question 1 of 5</p>
                <h3 className="text-base font-semibold text-[#1B2733] mb-3">
                  What behavior would you most like to improve for {name}?
                </h3>
                <textarea
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                  placeholder="e.g., Meltdowns during transitions, hitting siblings, difficulty sleeping..."
                  rows={3}
                  className="w-full text-sm border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#4E93A8] text-[#1B2733] placeholder:text-slate-300"
                />
                <button
                  onClick={() => { if (behavior.trim()) setStep('frequency'); }}
                  disabled={!behavior.trim()}
                  className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: '#4E93A8' }}
                >
                  Next <ChevronRight className="inline w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 'frequency' && (
              <motion.div key="freq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs font-medium text-[#4E93A8] uppercase tracking-wide mb-1">Question 2 of 5</p>
                <h3 className="text-base font-semibold text-[#1B2733] mb-3">
                  How often does this happen right now?
                </h3>
                <div className="space-y-2">
                  {FREQUENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setFrequency(opt.value); setStep('intensity'); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#E8E4DF] text-sm text-left text-[#3A4A57] hover:border-[#4E93A8] hover:bg-[#4E93A8]/5 transition-all"
                    >
                      {opt.label}
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'intensity' && (
              <motion.div key="int" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs font-medium text-[#4E93A8] uppercase tracking-wide mb-1">Question 3 of 5</p>
                <h3 className="text-base font-semibold text-[#1B2733] mb-3">
                  How intense is it typically?
                </h3>
                <div className="flex gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => { setIntensity(v); setStep('trigger'); }}
                      className={`flex-1 aspect-square rounded-xl border text-sm font-semibold transition-all ${
                        intensity === v
                          ? 'border-[#4E93A8] bg-[#4E93A8]/10 text-[#4E93A8]'
                          : 'border-[#E8E4DF] text-[#3A4A57] hover:border-[#4E93A8] hover:bg-[#4E93A8]/5'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-sm text-slate-400">Mild</span>
                  <span className="text-sm text-slate-400">Severe</span>
                </div>
              </motion.div>
            )}

            {step === 'trigger' && (
              <motion.div key="trig" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs font-medium text-[#4E93A8] uppercase tracking-wide mb-1">Question 4 of 5</p>
                <h3 className="text-base font-semibold text-[#1B2733] mb-3">
                  What usually triggers it?
                </h3>
                <div className="space-y-1.5">
                  {TRIGGER_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => { setTrigger(t); setStep('goal'); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#E8E4DF] text-sm text-left text-[#3A4A57] hover:border-[#2A7D99] hover:bg-[#2A7D99]/5 transition-all"
                    >
                      {t}
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'goal' && (
              <motion.div key="goal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs font-medium text-[#4E93A8] uppercase tracking-wide mb-1">Question 5 of 5</p>
                <h3 className="text-base font-semibold text-[#1B2733] mb-3">
                  What does success look like for {name} in 90 days?
                </h3>
                <textarea
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="e.g., Meltdowns reduced to once a week, able to transition with just a 5-minute warning..."
                  rows={3}
                  className="w-full text-sm border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#4E93A8] text-[#1B2733] placeholder:text-slate-300"
                />
                <button
                  onClick={handleGoalSubmit}
                  disabled={!goalText.trim() || saving}
                  className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #2A7D99 100%)' }}
                >
                  {saving ? 'Saving…' : 'Save baseline'}
                </button>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-[#4E93A8]/10 flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="w-8 h-8 text-[#4E93A8]" />
                </motion.div>
                <h3 className="text-base font-semibold text-[#1B2733] mb-2">Baseline set.</h3>
                <p className="text-sm text-[#5A6B7A]">
                  Your AI coach and any providers can now see real progress — not just guesses.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
