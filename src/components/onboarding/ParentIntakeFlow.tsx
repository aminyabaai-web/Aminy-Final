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
import { isDemoMode } from '../../lib/demo-seed';

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

// Sample providers for DEMO MODE ONLY. Real users never see these invented
// clinicians — when Supabase has no matches they get a friendly empty state.
const DEMO_PROVIDERS: MatchProvider[] = [
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

// Brand emerald (Tailwind emerald-500). The solid `bg/text/border-emerald-500`
// utilities are NOT emitted in this precompiled Tailwind v4 build, so anything
// that needs the solid color is applied via inline style to guarantee it renders.
const EMERALD = '#10b981';
const EMERALD_HOVER = '#0d9d6f';
// Brand teal — the ACTIVE (in-progress) step color. Green is reserved for
// COMPLETED steps only ("green only when earned").
const TEAL = '#2A7D99';

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
    <div className="intake-step-indicator flex items-center justify-center gap-0 mb-8" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
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
                  done   ? 'text-white' : '',
                  active ? 'bg-white' : '',
                  !done && !active ? 'bg-white border-[#E8E4DF] text-slate-400' : '',
                ].join(' ')}
                style={
                  done
                    ? { backgroundColor: EMERALD, borderColor: EMERALD }
                    : active
                      ? { borderColor: TEAL, color: TEAL }
                      : undefined
                }
              >
                {done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <IconComp className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${active ? '' : 'text-slate-400'}`}
                style={active ? { color: TEAL } : undefined}
              >
                {step.label}
              </span>
            </div>
            {idx < total - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mx-1 sm:mt-[-14px] transition-all duration-300 ${done ? '' : 'bg-[#E8E4DF]'}`}
                style={done ? { backgroundColor: EMERALD } : undefined}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Primary call-to-action button. The solid `bg-emerald-500` utility and the
 * `hover:bg-[#3a967a]` variant are not emitted in this precompiled Tailwind v4
 * build, so the brand fill + hover are applied via inline style (which always
 * renders). Disabled state falls back to the emitted slate utilities.
 */
function PrimaryButton({
  onClick,
  disabled = false,
  className = '',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`text-white font-semibold transition-colors disabled:cursor-not-allowed ${className}`}
      style={
        disabled
          // Clearly visible-but-inactive: solid slate-200 fill + slate-500 text
          // (inline so it renders regardless of the precompiled CSS build).
          ? { backgroundColor: '#e2e8f0', color: '#64748b' }
          : { backgroundColor: hover ? EMERALD_HOVER : EMERALD }
      }
    >
      {children}
    </button>
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

  // Real providers from Supabase. Demo mode pre-seeds sample matches so
  // walkthroughs look complete; real users start empty until the DB responds.
  const demo = isDemoMode();
  const [providers, setProviders] = useState<MatchProvider[]>(demo ? DEMO_PROVIDERS : []);
  const [loadingProviders, setLoadingProviders] = useState(false);
  // True only while the list shown IS the DEMO_PROVIDERS fallback (never for real
  // Supabase matches). Drives a visible "Sample matches" label so a stakeholder
  // walkthrough can't mistake the seeded clinicians for live network data.
  const [usingSampleProviders, setUsingSampleProviders] = useState(demo);

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
          // No real matches: demo gets sample providers, real users get an empty state.
          setProviders(demo ? DEMO_PROVIDERS : []);
          setUsingSampleProviders(demo);
        } else {
          setUsingSampleProviders(false);
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
  }, [step, demo]);

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

  const inputCls = 'w-full border border-[#E8E4DF] rounded-xl px-3 py-2.5 text-sm text-[#132F43] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors bg-white';
  const selectCls = 'w-full border border-[#E8E4DF] rounded-xl px-3 py-2.5 text-sm text-[#132F43] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-white transition-colors';
  const labelCls = 'block text-xs font-semibold text-[#5A6B7A] mb-1 uppercase tracking-wide';

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-4 flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 text-[#5A6B7A] hover:text-[#3A4A57] text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          // Step 1 has nothing to go back to — the single skip affordance
          // lives at top-right ("Skip setup"). Spacer keeps the layout balanced.
          <span className="w-12" aria-hidden="true" />
        )}
        <span className="text-sm text-slate-400 font-medium">Step {step} of {TOTAL_STEPS}</span>
        <button onClick={onSkip} className="text-sm text-slate-400 hover:text-[#5A6B7A] transition-colors">
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
              <h1 className="text-2xl font-bold text-[#132F43] mb-2">Let's get you matched<br />with the right provider</h1>
              <p className="text-sm text-[#5A6B7A]">Tell us about your child so we can find the best fit.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF] space-y-4">
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

            <div>
              <PrimaryButton
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </PrimaryButton>
              {!canAdvanceStep1 && (
                <p className="text-center text-sm text-[#5A6B7A] mt-2">
                  Fill in the fields above to continue
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Insurance ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#132F43] mb-2">Check your coverage</h1>
              <p className="text-sm text-[#5A6B7A]">Most families use insurance for ABA therapy. Let's see what's covered.</p>
            </div>

            {!insuranceSkipped ? (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DF] overflow-hidden">
                <div className="p-5">
                  <InsuranceEligibilityCheck />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF] text-center">
                <Shield className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-[#5A6B7A] font-medium">Paying out of pocket</p>
                <p className="text-sm text-slate-400 mt-1">You can add insurance information later in your profile.</p>
              </div>
            )}

            <div className="space-y-3">
              <PrimaryButton
                onClick={() => setStep(3)}
                className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </PrimaryButton>

              {!insuranceSkipped && (
                <button
                  onClick={() => { setInsuranceSkipped(true); setStep(3); }}
                  className="w-full text-[#5A6B7A] hover:text-[#3A4A57] text-sm font-medium py-2 transition-colors"
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
              <h1 className="text-2xl font-bold text-[#132F43] mb-2">What does {childName || 'your child'} need?</h1>
              <p className="text-sm text-[#5A6B7A]">Select all that apply — we'll match you accordingly.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF] space-y-5">
              <div>
                <label className={labelCls}>Session setting</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SERVICE_SETTINGS.map(opt => {
                    const isSel = serviceSettings.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleSetting(opt.value)}
                        className={[
                          'rounded-xl px-3 py-2.5 text-sm font-medium border-2 transition-all text-left',
                          isSel
                            ? 'bg-emerald-500/10'
                            : 'border-[#E8E4DF] text-[#5A6B7A] hover:border-slate-300',
                        ].join(' ')}
                        style={isSel ? { borderColor: EMERALD, color: EMERALD } : undefined}
                      >
                        {isSel && <span className="mr-1">✓</span>}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Session frequency</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {FREQUENCIES.map(opt => {
                    const isSel = sessionFrequency === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSessionFrequency(opt.value)}
                        className={[
                          'rounded-xl px-3 py-2.5 text-sm font-medium border-2 transition-all',
                          isSel
                            ? 'bg-emerald-500/10'
                            : 'border-[#E8E4DF] text-[#5A6B7A] hover:border-slate-300',
                        ].join(' ')}
                        style={isSel ? { borderColor: EMERALD, color: EMERALD } : undefined}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <PrimaryButton
                onClick={() => setStep(4)}
                disabled={!canAdvanceStep3}
                className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2"
              >
                Find Providers
                <ArrowRight className="w-4 h-4" />
              </PrimaryButton>
              {!canAdvanceStep3 && (
                <p className="text-center text-sm text-[#5A6B7A] mt-2">
                  Pick a setting and frequency above to continue
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Match ────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#132F43] mb-2">Your matched providers</h1>
              <p className="text-sm text-[#5A6B7A]">These providers match {childName || 'your child'}'s needs and are accepting new clients.</p>
            </div>

            {loadingProviders && (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: EMERALD, borderTopColor: 'transparent' }}
                />
                Finding providers near you…
              </div>
            )}

            {!loadingProviders && providers.length === 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DF] text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-[#3A4A57]">No matches just yet</p>
                <p className="text-sm text-[#5A6B7A] mt-1">
                  We're still building our provider network in your area. You can finish setup now and we'll reach out as soon as a match is available.
                </p>
                <PrimaryButton
                  onClick={() => setStep(5)}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </div>
            )}

            {usingSampleProviders && providers.length > 0 && (
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                style={{ backgroundColor: '#FEF9C3', borderColor: '#FDE68A', color: '#92400E' }}
              >
                <span
                  className="text-xs font-bold uppercase tracking-wide rounded-full px-2 py-0.5"
                  style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
                >
                  Sample
                </span>
                Illustrative matches — not live network data.
              </div>
            )}

            <div className="space-y-3">
              {providers.map(prov => {
                const isSel = selectedProviderId === prov.id;
                return (
                <button
                  key={prov.id}
                  onClick={() => { setSelectedProviderId(prov.id); setSelectedProviderName(prov.name.split(',')[0]); }}
                  className={[
                    'w-full bg-white rounded-2xl p-4 shadow-sm border-2 text-left transition-all',
                    isSel
                      ? 'ring-2 ring-emerald-500/20'
                      : 'border-[#E8E4DF] hover:border-[#E8E4DF]',
                  ].join(' ')}
                  style={isSel ? { borderColor: EMERALD } : undefined}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-[#132F43] text-sm">{prov.name}</p>
                      <p className="text-sm text-[#5A6B7A]">{prov.credentials}</p>
                    </div>
                    {prov.accepting && (
                      <span
                        className="text-xs font-bold text-emerald-600 border rounded-full px-2 py-0.5 ml-2 shrink-0"
                        style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}
                      >
                        Accepting
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-[#5A6B7A] mb-3">
                    <span>{prov.distance}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {prov.rating} ({prov.reviewCount})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {prov.specialties.map(s => (
                      <span key={s} className="text-xs bg-[#F6FBFB] border border-[#E8E4DF] text-[#5A6B7A] rounded-full px-2 py-0.5">{s}</span>
                    ))}
                  </div>

                  {isSel && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                      <span
                        className="text-sm font-semibold flex items-center gap-1"
                        style={{ color: EMERALD }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        Selected — Request This Provider
                      </span>
                    </div>
                  )}
                </button>
                );
              })}
            </div>

            <PrimaryButton
              onClick={() => setStep(5)}
              disabled={!canAdvanceStep4}
              className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </PrimaryButton>

            <button
              onClick={() => setStep(5)}
              className="w-full text-[#5A6B7A] hover:text-[#3A4A57] text-sm font-medium py-2 transition-colors"
            >
              Skip — I'll choose later
            </button>
          </div>
        )}

        {/* ── Step 5: Confirm ──────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" style={{ color: EMERALD }} />
              </div>
              <h1 className="text-2xl font-bold text-[#132F43] mb-2">You're all set!</h1>
              <p className="text-sm text-[#5A6B7A]">Here's a summary of your profile. We'll match {childName || 'your child'} with the best care team.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DF] space-y-4">
              <h2 className="text-sm font-semibold text-[#3A4A57] border-b border-[#E8E4DF] pb-2">Your Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Child</span>
                  <span className="font-medium text-[#132F43]">{childName}, age {childAge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Focus area</span>
                  <span className="font-medium text-[#132F43]">
                    {DIAGNOSIS_OPTIONS.find(d => d.value === diagnosis)?.label ?? diagnosis}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Insurance</span>
                  <span className="font-medium text-[#132F43]">{insuranceSkipped ? 'Out of pocket' : 'Checked'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Session setting</span>
                  <span className="font-medium text-[#132F43] text-right max-w-[55%]">
                    {serviceSettings.map(s => SERVICE_SETTINGS.find(o => o.value === s)?.label ?? s).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7A]">Frequency</span>
                  <span className="font-medium text-[#132F43]">
                    {FREQUENCIES.find(f => f.value === sessionFrequency)?.label ?? sessionFrequency}
                  </span>
                </div>
                {selectedProviderName && (
                  <div className="flex justify-between">
                    <span className="text-[#5A6B7A]">Requested provider</span>
                    <span className="font-medium text-[#132F43] text-right max-w-[55%]">{selectedProviderName}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <PrimaryButton
              onClick={handleComplete}
              disabled={saving}
              className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2"
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
            </PrimaryButton>

            <p className="text-center text-sm text-slate-400">
              Your provider will reach out within 1–2 business days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParentIntakeFlow;
