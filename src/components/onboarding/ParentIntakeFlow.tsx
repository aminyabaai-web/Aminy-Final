// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ParentIntakeFlow — Connected 5-step parent onboarding
 * signup → child profile → insurance → provider match → confirm
 *
 * Persists progress to localStorage: aminy_intake_progress
 * On complete: saves to Supabase children + appointments tables
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, User, Shield, Settings, Users, Star } from 'lucide-react';
import InsuranceEligibilityCheck from '../family/InsuranceEligibilityCheck';
import { supabase } from '../../lib/supabase-compat';

// ============================================================================
// Types
// ============================================================================

export interface IntakeData {
  // Step 1 — Child profile
  childName: string;
  childAge: string;
  diagnosis: string;

  // Step 2 — Insurance
  insuranceSkipped: boolean;
  insurancePayer?: string;
  insuranceMemberId?: string;

  // Step 3 — Needs
  serviceSettings: string[];
  sessionFrequency: string;

  // Step 4 — Match
  selectedProviderId?: string;
  selectedProviderName?: string;

  // Meta
  completedAt?: string;
}

const DIAGNOSIS_OPTIONS = [
  { value: 'autism-aba', label: 'Autism / ABA Therapy' },
  { value: 'adhd', label: 'ADHD' },
  { value: 'speech', label: 'Speech & Language Delay' },
  { value: 'anxiety', label: 'Anxiety / Behavioral' },
  { value: 'developmental', label: 'Developmental Delay' },
  { value: 'other', label: 'Other / Not Yet Diagnosed' },
];

const SERVICE_SETTINGS = [
  { value: 'in-home', label: 'In-Home Sessions' },
  { value: 'telehealth', label: 'Telehealth / Virtual' },
  { value: 'school-based', label: 'School-Based' },
  { value: 'center-based', label: 'Center-Based' },
];

const FREQUENCIES = [
  { value: '1x', label: '1x / week' },
  { value: '2x', label: '2x / week' },
  { value: '3x+', label: '3x+ / week' },
  { value: 'intensive', label: 'Intensive (daily)' },
];

// Provider type for intake matching
interface MatchProvider {
  id: string;
  name: string;
  credentials: string;
  distance: string;
  specialties: string[];
  accepting: boolean;
  rating: number;
  reviewCount: number;
}

// Fallback providers if Supabase unavailable
const FALLBACK_PROVIDERS: MatchProvider[] = [
  {
    id: 'prov-fallback-1',
    name: 'Sarah Kim, BCBA',
    credentials: 'BCBA · ABA Specialist',
    distance: 'Telehealth · AZ licensed',
    specialties: ['ABA Therapy', 'Early Intervention', 'Autism'],
    accepting: true,
    rating: 4.9,
    reviewCount: 47,
  },
  {
    id: 'prov-fallback-2',
    name: 'Marcus Thompson, BCBA-D',
    credentials: 'BCBA-D · Doctoral Level',
    distance: 'Telehealth · AZ licensed',
    specialties: ['Behavioral Challenges', 'School Advocacy', 'ABA'],
    accepting: true,
    rating: 4.8,
    reviewCount: 63,
  },
  {
    id: 'prov-fallback-3',
    name: 'Priya Mehta, BCBA',
    credentials: 'BCBA · Verbal Behavior Specialist',
    distance: 'Telehealth · AZ licensed',
    specialties: ['Autism', 'AAC', 'Parent Coaching'],
    accepting: true,
    rating: 5.0,
    reviewCount: 31,
  },
];

const STORAGE_KEY = 'aminy_intake_progress';
const TOTAL_STEPS = 5;

const STEP_META = [
  { icon: User,    label: 'Welcome'  },
  { icon: Shield,  label: 'Insurance' },
  { icon: Settings, label: 'Needs'   },
  { icon: Users,   label: 'Match'    },
  { icon: CheckCircle, label: 'Confirm' },
];

// ============================================================================
// Helpers
// ============================================================================

function loadDraft(): Partial<IntakeData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<IntakeData>;
  } catch { /* ignore */ }
  return {};
}

function saveDraft(data: Partial<IntakeData>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ============================================================================
// Sub-components
// ============================================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
      {STEP_META.map((step, idx) => {
        const stepNum = idx + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        const IconComp = step.icon;
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  done   ? 'bg-[#43AA8B] border-[#43AA8B] text-white' : '',
                  active ? 'bg-white border-[#43AA8B] text-[#43AA8B]' : '',
                  !done && !active ? 'bg-white border-slate-200 text-slate-400' : '',
                ].join(' ')}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <IconComp className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-[#43AA8B]' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < total - 1 && (
              <div className={`h-0.5 w-8 sm:w-12 mx-1 mt-[-14px] transition-all duration-300 ${done ? 'bg-[#43AA8B]' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface ParentIntakeFlowProps {
  onComplete: (data: IntakeData) => void;
  onSkip?: () => void;
}

export function ParentIntakeFlow({ onComplete, onSkip }: ParentIntakeFlowProps) {
  const draft = loadDraft();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real providers from Supabase
  const [providers, setProviders] = useState<MatchProvider[]>(FALLBACK_PROVIDERS);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Fetch real providers when reaching step 4
  useEffect(() => {
    if (step !== 4) return;
    setLoadingProviders(true);
    supabase
      .from('providers')
      .select('id, name, credentials, specialty, bio, rating, review_count, accepting_new_patients, video_enabled, states_licensed, hourly_rate')
      .eq('accepting_new_patients', true)
      .order('rating', { ascending: false })
      .limit(6)
      .then(({ data, error: err }) => {
        if (err || !data || data.length === 0) {
          setProviders(FALLBACK_PROVIDERS);
        } else {
          setProviders(data.map(p => ({
            id: p.id,
            name: `${p.name}, ${p.credentials}`,
            credentials: `${p.credentials} · ${p.specialty || 'Specialist'}`,
            distance: p.video_enabled ? 'Telehealth available' : 'In-person',
            specialties: p.specialty ? [p.specialty] : ['Behavioral Health'],
            accepting: p.accepting_new_patients ?? true,
            rating: typeof p.rating === 'string' ? parseFloat(p.rating) : (p.rating ?? 4.8),
            reviewCount: p.review_count ?? 0,
          })));
        }
        setLoadingProviders(false);
      });
  }, [step]);

  // Step 1
  const [childName, setChildName] = useState(draft.childName ?? '');
  const [childAge, setChildAge] = useState(draft.childAge ?? '');
  const [diagnosis, setDiagnosis] = useState(draft.diagnosis ?? '');

  // Step 2
  const [insuranceSkipped, setInsuranceSkipped] = useState(draft.insuranceSkipped ?? false);
  const [insurancePayer, setInsurancePayer] = useState(draft.insurancePayer ?? '');
  const [insuranceMemberId, setInsuranceMemberId] = useState(draft.insuranceMemberId ?? '');

  // Step 3
  const [serviceSettings, setServiceSettings] = useState<string[]>(draft.serviceSettings ?? []);
  const [sessionFrequency, setSessionFrequency] = useState(draft.sessionFrequency ?? '');

  // Step 4
  const [selectedProviderId, setSelectedProviderId] = useState(draft.selectedProviderId ?? '');
  const [selectedProviderName, setSelectedProviderName] = useState(draft.selectedProviderName ?? '');

  const currentData = useCallback((): Partial<IntakeData> => ({
    childName, childAge, diagnosis,
    insuranceSkipped, insurancePayer, insuranceMemberId,
    serviceSettings, sessionFrequency,
    selectedProviderId, selectedProviderName,
  }), [childName, childAge, diagnosis, insuranceSkipped, insurancePayer, insuranceMemberId, serviceSettings, sessionFrequency, selectedProviderId, selectedProviderName]);

  // Auto-save draft on every state change
  useEffect(() => {
    saveDraft(currentData());
  }, [currentData]);

  function toggleSetting(v: string) {
    setServiceSettings(prev =>
      prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v]
    );
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);

    const intakeData: IntakeData = {
      childName, childAge, diagnosis,
      insuranceSkipped, insurancePayer, insuranceMemberId,
      serviceSettings, sessionFrequency,
      selectedProviderId, selectedProviderName,
      completedAt: new Date().toISOString(),
    };

    try {
      // Save child profile
      const { data: childRow, error: childErr } = await supabase
        .from('children')
        .insert({
          name: childName,
          age: parseInt(childAge, 10) || null,
          diagnosis,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (childErr) {
        console.warn('Supabase children insert failed (non-fatal):', childErr.message);
      }

      // Save appointment request if provider selected
      if (selectedProviderId) {
        const { error: apptErr } = await supabase
          .from('appointments')
          .insert({
            provider_id: selectedProviderId,
            provider_name: selectedProviderName,
            service_type: serviceSettings.join(', '),
            session_frequency: sessionFrequency,
            child_id: childRow?.id ?? null,
            status: 'requested',
            created_at: new Date().toISOString(),
          });
        if (apptErr) {
          console.warn('Supabase appointments insert failed (non-fatal):', apptErr.message);
        }
      }
    } catch (e) {
      // Non-blocking — always complete even if Supabase fails
      console.warn('Supabase save failed:', e);
    }

    clearDraft();
    setSaving(false);
    onComplete(intakeData);
  }

  const canAdvanceStep1 = childName.trim().length > 0 && childAge.trim().length > 0 && diagnosis.length > 0;
  const canAdvanceStep3 = serviceSettings.length > 0 && sessionFrequency.length > 0;
  const canAdvanceStep4 = selectedProviderId.length > 0;

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#43AA8B] focus:ring-1 focus:ring-[#43AA8B]/20 transition-colors bg-white';
  const selectCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#43AA8B] focus:ring-1 focus:ring-[#43AA8B]/20 bg-white transition-colors';
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : onSkip?.()}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? 'Back' : 'Skip'}
        </button>
        <span className="text-xs text-slate-400 font-medium">Step {step} of {TOTAL_STEPS}</span>
        <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Skip setup
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* ── Step 1: Welcome ──────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Let's get you matched<br />with the right provider</h1>
              <p className="text-sm text-slate-500">Tell us about your child so we can find the best fit.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              <div>
                <label className={labelCls}>Child's first name</label>
                <input
                  type="text"
                  value={childName}
                  onChange={e => setChildName(e.target.value)}
                  placeholder="e.g. Alex"
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div>
                <label className={labelCls}>Child's age</label>
                <select value={childAge} onChange={e => setChildAge(e.target.value)} className={selectCls}>
                  <option value="">Select age</option>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map(age => (
                    <option key={age} value={String(age)}>{age} year{age !== 1 ? 's' : ''} old</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Primary area of focus</label>
                <select value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className={selectCls}>
                  <option value="">Select area</option>
                  {DIAGNOSIS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canAdvanceStep1}
              className="w-full bg-[#43AA8B] hover:bg-[#3a967a] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Insurance ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Check your coverage</h1>
              <p className="text-sm text-slate-500">Most families use insurance for ABA therapy. Let's see what's covered.</p>
            </div>

            {!insuranceSkipped ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5">
                  <InsuranceEligibilityCheck />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <Shield className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">Paying out of pocket</p>
                <p className="text-xs text-slate-400 mt-1">You can add insurance information later in your profile.</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => setStep(3)}
                className="w-full bg-[#43AA8B] hover:bg-[#3a967a] text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>

              {!insuranceSkipped && (
                <button
                  onClick={() => { setInsuranceSkipped(true); setStep(3); }}
                  className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
                >
                  Skip — I'll pay out of pocket
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Needs ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">What does {childName || 'your child'} need?</h1>
              <p className="text-sm text-slate-500">Select all that apply — we'll match you accordingly.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">
              <div>
                <label className={labelCls}>Session setting</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SERVICE_SETTINGS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleSetting(opt.value)}
                      className={[
                        'rounded-xl px-3 py-2.5 text-sm font-medium border-2 transition-all text-left',
                        serviceSettings.includes(opt.value)
                          ? 'border-[#43AA8B] bg-[#43AA8B]/10 text-[#43AA8B]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {serviceSettings.includes(opt.value) && <span className="mr-1">✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Session frequency</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {FREQUENCIES.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSessionFrequency(opt.value)}
                      className={[
                        'rounded-xl px-3 py-2.5 text-sm font-medium border-2 transition-all',
                        sessionFrequency === opt.value
                          ? 'border-[#43AA8B] bg-[#43AA8B]/10 text-[#43AA8B]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              disabled={!canAdvanceStep3}
              className="w-full bg-[#43AA8B] hover:bg-[#3a967a] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
            >
              Find Providers
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 4: Match ────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Your matched providers</h1>
              <p className="text-sm text-slate-500">These providers match {childName || 'your child'}'s needs and are accepting new clients.</p>
            </div>

            {loadingProviders && (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-[#43AA8B] border-t-transparent rounded-full animate-spin" />
                Finding providers near you…
              </div>
            )}

            <div className="space-y-3">
              {providers.map(prov => (
                <button
                  key={prov.id}
                  onClick={() => { setSelectedProviderId(prov.id); setSelectedProviderName(prov.name.split(',')[0]); }}
                  className={[
                    'w-full bg-white rounded-2xl p-4 shadow-sm border-2 text-left transition-all',
                    selectedProviderId === prov.id
                      ? 'border-[#43AA8B] ring-2 ring-[#43AA8B]/20'
                      : 'border-slate-100 hover:border-slate-200',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{prov.name}</p>
                      <p className="text-xs text-slate-500">{prov.credentials}</p>
                    </div>
                    {prov.accepting && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5 ml-2 shrink-0">
                        Accepting
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span>{prov.distance}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {prov.rating} ({prov.reviewCount})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {prov.specialties.map(s => (
                      <span key={s} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 rounded-full px-2 py-0.5">{s}</span>
                    ))}
                  </div>

                  {selectedProviderId === prov.id && (
                    <div className="mt-3 pt-3 border-t border-[#43AA8B]/20">
                      <span className="text-xs font-semibold text-[#43AA8B] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Selected — Request This Provider
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(5)}
              disabled={!canAdvanceStep4}
              className="w-full bg-[#43AA8B] hover:bg-[#3a967a] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setStep(5)}
              className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
            >
              Skip — I'll choose later
            </button>
          </div>
        )}

        {/* ── Step 5: Confirm ──────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#43AA8B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#43AA8B]" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h1>
              <p className="text-sm text-slate-500">Here's a summary of your profile. We'll match {childName || 'your child'} with the best care team.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Your Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Child</span>
                  <span className="font-medium text-slate-800">{childName}, age {childAge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Focus area</span>
                  <span className="font-medium text-slate-800">
                    {DIAGNOSIS_OPTIONS.find(d => d.value === diagnosis)?.label ?? diagnosis}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Insurance</span>
                  <span className="font-medium text-slate-800">{insuranceSkipped ? 'Out of pocket' : 'Checked'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Session setting</span>
                  <span className="font-medium text-slate-800 text-right max-w-[55%]">
                    {serviceSettings.map(s => SERVICE_SETTINGS.find(o => o.value === s)?.label ?? s).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Frequency</span>
                  <span className="font-medium text-slate-800">
                    {FREQUENCIES.find(f => f.value === sessionFrequency)?.label ?? sessionFrequency}
                  </span>
                </div>
                {selectedProviderName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested provider</span>
                    <span className="font-medium text-slate-800 text-right max-w-[55%]">{selectedProviderName}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleComplete}
              disabled={saving}
              className="w-full bg-[#43AA8B] hover:bg-[#3a967a] disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              Your provider will reach out within 1–2 business days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParentIntakeFlow;
