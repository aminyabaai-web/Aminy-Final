// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.

/**
 * WeeklyOutcomeCheckIn — Gentle 3-question weekly progress capture.
 *
 * Surfaces on the dashboard if no check-in recorded in the past 7 days.
 * Data saved to `outcome_events` (already migrated). Parent + provider
 * inputs are joined in ClinicalOutcomesDashboard for the provider view.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, ChevronRight, X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

const WEEKLY_CHECKIN_KEY = 'aminy_weekly_checkin_last';

export function shouldShowWeeklyCheckIn(): boolean {
  const last = localStorage.getItem(WEEKLY_CHECKIN_KEY);
  if (!last) return true;
  const daysSince = (Date.now() - parseInt(last, 10)) / (1000 * 60 * 60 * 24);
  return daysSince >= 7;
}

interface WeeklyOutcomeCheckInProps {
  userId: string;
  childId?: string;
  childName?: string;
  onDismiss: () => void;
}

type Step = 'frequency' | 'progress' | 'confidence' | 'done';

const FREQUENCY_OPTIONS = [
  { label: 'Multiple times a day', value: 5 },
  { label: 'Once a day', value: 4 },
  { label: 'A few times this week', value: 3 },
  { label: 'Once or twice', value: 2 },
  { label: 'Barely at all', value: 1 },
];

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function WeeklyOutcomeCheckIn({ userId, childId, childName, onDismiss }: WeeklyOutcomeCheckInProps) {
  const [step, setStep] = useState<Step>('frequency');
  const [frequency, setFrequency] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const name = childName || 'your child';

  const save = useCallback(async (conf: number) => {
    setSaving(true);
    try {
      await supabase.from('outcome_events').insert({
        user_id: userId,
        child_id: childId || null,
        event_type: 'weekly_parent_checkin',
        payload: {
          target_behavior_frequency: frequency,
          goal_progress_rating: progress,
          parent_confidence_rating: conf,
          source: 'parent_checkin',
          week_of: new Date().toISOString().split('T')[0],
        },
        recorded_at: new Date().toISOString(),
      });
      localStorage.setItem(WEEKLY_CHECKIN_KEY, String(Date.now()));
    } catch {
      // Non-fatal — proceed to done state even if save fails
    } finally {
      setSaving(false);
    }
  }, [userId, childId, frequency, progress]);

  const handleConfidence = async (val: number) => {
    setConfidence(val);
    await save(val);
    setStep('done');
    setTimeout(onDismiss, 2500);
    toast.success('Check-in saved — thank you!', { duration: 2000 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-[#E8E4DF] bg-white shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#43AA8B]/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-[#43AA8B]" />
          </div>
          <span className="text-sm font-semibold text-[#1B2733]">Weekly check-in</span>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <AnimatePresence mode="wait">
          {step === 'frequency' && (
            <motion.div key="freq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-[#3A4A57] mb-3">
                How often did the target behavior happen with {name} this week?
              </p>
              <div className="space-y-1.5">
                {FREQUENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFrequency(opt.value); setStep('progress'); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#E8E4DF] text-sm text-left text-[#3A4A57] hover:border-[#43AA8B] hover:bg-[#43AA8B]/5 transition-all"
                  >
                    {opt.label}
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'progress' && (
            <motion.div key="prog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-[#3A4A57] mb-3">
                Overall, how much progress did {name} make toward their goals this week?
              </p>
              <div className="flex gap-2">
                {RATING_OPTIONS.map(val => (
                  <button
                    key={val}
                    onClick={() => { setProgress(val); setStep('confidence'); }}
                    className="flex-1 aspect-square rounded-xl border border-[#E8E4DF] text-sm font-semibold text-[#3A4A57] hover:border-[#43AA8B] hover:bg-[#43AA8B]/5 transition-all"
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 px-0.5">
                <span className="text-sm text-slate-400">None</span>
                <span className="text-sm text-slate-400">A lot</span>
              </div>
            </motion.div>
          )}

          {step === 'confidence' && (
            <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-[#3A4A57] mb-3">
                How confident do you feel supporting {name} right now?
              </p>
              <div className="flex gap-2">
                {RATING_OPTIONS.map(val => (
                  <button
                    key={val}
                    onClick={() => handleConfidence(val)}
                    disabled={saving}
                    className="flex-1 aspect-square rounded-xl border border-[#E8E4DF] text-sm font-semibold text-[#3A4A57] hover:border-[#2A7D99] hover:bg-[#2A7D99]/5 transition-all disabled:opacity-50"
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 px-0.5">
                <span className="text-sm text-slate-400">Not at all</span>
                <span className="text-sm text-slate-400">Very</span>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 text-center">
              <CheckCircle className="w-8 h-8 text-[#43AA8B] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#1B2733]">Check-in recorded.</p>
              <p className="text-sm text-slate-400 mt-0.5">See you next week.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
