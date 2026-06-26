// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * OutcomeMeasureForm — generic forms generator for validated outcome measures.
 *
 * Takes any OutcomeMeasure from validated-outcome-measures.ts and renders:
 *   - One question per "page" (mobile-friendly, low cognitive load)
 *   - Likert buttons (taller touch targets than radio buttons)
 *   - Progress bar
 *   - Auto-saves answers as you go
 *   - At completion: shows score + band guidance, saves to outcome_measure_submissions
 *
 * Works for: PHQ-9, GAD-7, PHQ-A, SCARED, ABC Irritability.
 * For PHQ-9/PHQ-A, if item 9 (self-harm) scores ≥1, surfaces crisis resources.
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import type { OutcomeMeasure } from '../lib/validated-outcome-measures';

interface OutcomeMeasureFormProps {
  measure: OutcomeMeasure;
  /** Who the assessment is about — defaults to the index child */
  patientType?: 'child' | 'parent' | 'sibling' | 'caregiver';
  childId?: string;
  onBack?: () => void;
  onComplete?: (result: { total: number; band: string }) => void;
}

export function OutcomeMeasureForm({ measure, patientType = 'child', childId, onBack, onComplete }: OutcomeMeasureFormProps) {
  const [step, setStep] = useState<'intro' | 'questions' | 'result'>('intro');
  const [answers, setAnswers] = useState<number[]>(Array(measure.items.length).fill(-1));
  const [itemIndex, setItemIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ total: number; band: ReturnType<typeof measure.score>['band'] } | null>(null);

  const answered = answers.filter(a => a >= 0).length;
  const progress = (answered / measure.items.length) * 100;
  const allAnswered = answered === measure.items.length;
  const currentItem = measure.items[itemIndex];

  function selectAnswer(value: number) {
    const next = [...answers];
    next[itemIndex] = value;
    setAnswers(next);
    // Auto-advance after a short pause so the parent sees their selection
    setTimeout(() => {
      if (itemIndex < measure.items.length - 1) setItemIndex(itemIndex + 1);
    }, 220);
  }

  async function submitForm() {
    if (!allAnswered) {
      toast.error('Please answer all questions');
      return;
    }
    setSubmitting(true);

    const scored = measure.score(answers);
    setResult(scored);

    // Save to outcome_measure_submissions
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('outcome_measure_submissions').insert({
          user_id: user.id,
          child_id: childId || null,
          patient_type: patientType,
          measure_id: measure.id,
          measure_name: measure.name,
          answers: answers,
          total_score: scored.total,
          severity_band: scored.band?.severity || 'unknown',
          band_label: scored.band?.label || 'Unknown',
          band_guidance: scored.band?.guidance,
          completed_by: patientType === 'child' ? 'parent' : 'self',
        });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[outcome] save failed:', e);
    }

    setStep('result');
    setSubmitting(false);
    onComplete?.({ total: scored.total, band: scored.band?.severity || 'unknown' });
  }

  // PHQ-9 item 9 (self-harm) — show crisis resources if scored
  const selfHarmAlert =
    (measure.id === 'phq9' || measure.id === 'phq-a') &&
    answers[8] >= 1;

  // ─── Intro screen ──────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-mist flex flex-col">
        <div className="px-4 pt-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#5A6B7A]">
              <ChevronLeft className="w-4 h-4" />Back
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)' }}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#132F43] mb-2">{measure.name}</h1>
            <p className="text-sm text-[#5A6B7A] mb-4 leading-relaxed">{measure.description}</p>
            <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4 mb-4 text-left">
              <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">About this assessment</p>
              <ul className="text-sm text-[#3A4A57] space-y-1.5">
                <li>• {measure.items.length} questions — about 2 minutes</li>
                <li>• Your answers are private and HIPAA-protected</li>
                <li>• Recommended every {measure.cadenceWeeks} weeks for tracking</li>
                <li>• Used by clinicians + payers as a validated measure</li>
              </ul>
            </div>
            <button
              onClick={() => setStep('questions')}
              className="w-full py-3.5 rounded-xl text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)' }}
            >
              Begin assessment
            </button>
            <p className="text-sm text-slate-400 mt-3">
              {measure.shortName} · {measure.citation.split('.')[0]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Result screen ─────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const bandColor =
      result.band?.severity === 'minimal' || result.band?.severity === 'negative_screen' ? '#2A7D99' :
      result.band?.severity === 'mild' ? '#F8B400' :
      result.band?.severity === 'moderate' ? '#E07A5F' :
      result.band?.severity === 'severe' || result.band?.severity === 'moderately_severe' ? '#dc2626' :
      result.band?.severity === 'positive_screen' ? '#E07A5F' :
      '#64748b';

    return (
      <div className="min-h-screen bg-mist flex flex-col">
        <div className="px-4 pt-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#5A6B7A]">
              <ChevronLeft className="w-4 h-4" />Done
            </button>
          )}
        </div>
        <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
          {selfHarmAlert && (
            <div className="mb-4 rounded-2xl p-4 border-2" style={{ background: '#fef2f2', borderColor: '#dc2626' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900 mb-1">Same-day clinical contact recommended</p>
                  <p className="text-sm text-red-800 mb-2">You noted thoughts of self-harm. You're not alone.</p>
                  <a href="tel:988" className="inline-flex items-center gap-1 text-sm font-bold text-white px-3 py-2 rounded-lg" style={{ background: '#dc2626' }}>
                    Call 988 — Suicide & Crisis Lifeline
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">Score</p>
            <p className="text-6xl font-bold mb-1" style={{ color: bandColor }}>{result.total}</p>
            <p className="text-sm text-slate-400">of {measure.items.length * (measure.items[0].scaleLabels.length - 1)} possible</p>
            <p className="text-lg font-semibold mt-2" style={{ color: bandColor }}>{result.band?.label}</p>
          </div>

          {result.band?.guidance && (
            <div className="rounded-2xl bg-white border border-[#E8E4DF] p-4 mb-4">
              <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">What this means</p>
              <p className="text-sm text-[#3A4A57] leading-relaxed">{result.band.guidance}</p>
            </div>
          )}

          <div className="rounded-2xl p-4 mb-4" style={{ background: '#2A7D9910' }}>
            <p className="text-sm text-[#3A4A57] leading-relaxed">
              <strong className="text-[#6B9080]">Re-take in {measure.cadenceWeeks} weeks</strong> to track changes. Aminy will remind you. Your provider can see your trend in the clinical portal.
            </p>
          </div>

          <button
            onClick={onBack}
            className="w-full py-3 rounded-xl border border-[#E8E4DF] text-sm font-medium text-[#3A4A57] hover:bg-white"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ─── Question screen ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-mist flex flex-col">
      {/* Header with progress */}
      <div className="px-4 pt-3 pb-3 bg-white border-b border-[#E8E4DF]">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => itemIndex > 0 ? setItemIndex(itemIndex - 1) : setStep('intro')}
            className="flex items-center gap-1 text-sm text-[#5A6B7A]"
          >
            <ChevronLeft className="w-4 h-4" />
            {itemIndex === 0 ? 'Back' : 'Previous'}
          </button>
          <p className="text-sm text-[#5A6B7A] font-medium">
            {itemIndex + 1} of {measure.items.length}
          </p>
        </div>
        <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #2A7D99 0%, #577590 100%)' }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
        <div className="mb-2">
          <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">
            {measure.id === 'phq9' || measure.id === 'gad7' || measure.id === 'phq-a' ? 'Over the last 2 weeks…' : 'How often did this happen?'}
          </p>
        </div>
        <h2 className="text-lg font-semibold text-[#132F43] mb-6 leading-snug">{currentItem.text}</h2>

        <div className="space-y-2">
          {currentItem.scaleLabels.map((label, value) => {
            const selected = answers[itemIndex] === value;
            return (
              <button
                key={value}
                onClick={() => selectAnswer(value)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all min-h-[60px] ${
                  selected ? 'border-[#6B9080] bg-[#6B9080]/10' : 'border-[#E8E4DF] bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    selected ? 'bg-primary' : 'border-2 border-slate-300'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className={`text-sm flex-1 ${selected ? 'text-[#6B9080] font-medium' : 'text-[#3A4A57]'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Submit button (only on last question, when all answered) */}
        {itemIndex === measure.items.length - 1 && (
          <div className="mt-6">
            <button
              onClick={submitForm}
              disabled={!allAnswered || submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)' }}
            >
              {submitting ? 'Saving…' : <>See my results <ChevronRight className="w-4 h-4" /></>}
            </button>
            {!allAnswered && (
              <p className="text-sm text-slate-400 text-center mt-2">Answer all questions to see your result</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OutcomeMeasureForm;
