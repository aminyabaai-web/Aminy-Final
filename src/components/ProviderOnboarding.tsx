// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Onboarding - Multi-step registration flow for new providers
 *
 * Steps:
 * 1. Basic info (name, credentials, role, bio)
 * 2. Licensing (states, NPI number)
 * 3. Services & pricing (what they offer, rates)
 * 4. Availability (weekly schedule)
 * 5. Review & submit
 *
 * On submit → inserts into Supabase provider_profiles + provider_availability
 * → redirects to Provider Portal
 */

import React, { useId, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  User,
  FileSignature,
  DollarSign,
  Calendar,
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import {
  ProviderRole,
  PROVIDER_ROLE_DISPLAY,
  US_STATES
} from '../types/telehealth';
import { verifyProvider, type Credential, type ProviderVerificationSummary } from '../lib/credential-verification';
import { SUPPORTED_PROVIDER_STATES, isSupportedProviderState } from '../lib/insurance/state-market-coverage';
import ProviderAgreement, { type AgreementAcceptance } from './provider/ProviderAgreement';
import ProviderBAA, { type BAAAcceptance } from './provider/ProviderBAA';

interface ProviderOnboardingProps {
  onBack?: () => void;
  onComplete?: (providerId: string) => void;
}

type OnboardingStep = 'basics' | 'licensing' | 'services' | 'availability' | 'review' | 'agreement' | 'baa';

const STEPS: { id: OnboardingStep; label: string; icon: React.ElementType }[] = [
  { id: 'basics', label: 'Profile', icon: User },
  { id: 'licensing', label: 'Licensing', icon: Shield },
  { id: 'services', label: 'Services', icon: DollarSign },
  { id: 'availability', label: 'Schedule', icon: Calendar },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
  { id: 'agreement', label: 'Agreement', icon: FileSignature },
  { id: 'baa', label: 'BAA', icon: Shield },
];

// Single source of truth for the launch-state list shown across this flow,
// derived from SUPPORTED_PROVIDER_STATES so the header subtitle and the
// Aminy Network track copy can never drift apart.
function formatStateList(states: readonly string[], conjunction: 'or' | 'and'): string {
  if (states.length === 0) return '';
  if (states.length === 1) return states[0];
  return `${states.slice(0, -1).join(', ')}, ${conjunction} ${states[states.length - 1]}`;
}
const SUPPORTED_STATES_OR = formatStateList(SUPPORTED_PROVIDER_STATES, 'or');
const SUPPORTED_STATES_AND = formatStateList(SUPPORTED_PROVIDER_STATES, 'and');

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const COMMON_PAYER_OPTIONS = ['Cash Pay', 'Aetna', 'Blue Cross Blue Shield', 'Cigna', 'UnitedHealthcare', 'Medicaid', 'TRICARE'];

interface ProviderFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Run your own independent practice vs. join under an organization. */
  practiceMode: 'independent' | 'org';
  credentials: string;
  role: ProviderRole;
  bio: string;
  npiNumber: string;
  primaryCredentialNumber: string;
  licensedStates: string[];
  billingTrack: 'aact-partner' | 'independent' | 'cash-only';
  offersConsult: boolean;
  offersDeepReview: boolean;
  consultPrice: number;
  deepReviewPrice: number;
  acceptingNewPatients: boolean;
  acceptedInsurance: string[];
  availability: AvailabilitySlot[];
}

const DEFAULT_FORM: ProviderFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  practiceMode: 'independent',
  billingTrack: 'aact-partner',
  credentials: '',
  role: 'bcba',
  bio: '',
  npiNumber: '',
  primaryCredentialNumber: '',
  licensedStates: [],
  offersConsult: true,
  offersDeepReview: true,
  consultPrice: 85,
  deepReviewPrice: 165,
  acceptingNewPatients: true,
  acceptedInsurance: ['Cash Pay'],
  availability: [],
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


type ProviderVerificationRole = 'bcba' | 'slp' | 'ot' | 'pt' | 'psychologist' | 'neuropsychologist';

function mapRoleToVerificationRole(role: ProviderRole): ProviderVerificationRole | null {
  switch (role) {
    case 'bcba':
    case 'behavior-consultant':
      return 'bcba';
    case 'slp':
      return 'slp';
    case 'ot':
      return 'ot';
    case 'pt':
      return 'pt';
    case 'psychologist':
      return 'psychologist';
    case 'neuropsychologist':
      return 'neuropsychologist';
    default:
      return null;
  }
}

function mapVerificationStatus(
  summary: ProviderVerificationSummary | null,
): 'pending' | 'verified' | 'manual_review' | 'expired' | 'failed' {
  if (!summary) return 'pending';

  switch (summary.overallStatus) {
    case 'fully_verified':
      return 'verified';
    case 'partially_verified':
      return 'manual_review';
    case 'expired':
      return 'expired';
    case 'not_verified':
    default:
      return 'failed';
  }
}

export function ProviderOnboarding({ onBack, onComplete }: ProviderOnboardingProps) {
  const formId = useId();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basics');
  const [form, setForm] = useState<ProviderFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nonSolicitationAck, setNonSolicitationAck] = useState(false);
  const [agreementAcceptance, setAgreementAcceptance] = useState<AgreementAcceptance | null>(null);
  const [baaAcceptance, setBaaAcceptance] = useState<BAAAcceptance | null>(null);

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  const fieldId = (field: string) => `${formId}-${field}`;

  const updateForm = (updates: Partial<ProviderFormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 'basics':
        return !!(form.firstName && form.lastName && form.email && form.credentials && form.role);
      case 'licensing':
        return form.licensedStates.length > 0 && !!form.primaryCredentialNumber;
      case 'services':
        return form.offersConsult || form.offersDeepReview;
      case 'availability':
        return form.availability.length > 0;
      case 'review':
        return true;
      case 'agreement':
        return agreementAcceptance !== null;
      case 'baa':
        return baaAcceptance !== null;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  };

  const prevStep = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id);
    }
  };

  const toggleState = (code: string) => {
    const newStates = form.licensedStates.includes(code)
      ? form.licensedStates.filter(s => s !== code)
      : [...form.licensedStates, code];
    updateForm({ licensedStates: newStates });
  };

  const addAvailability = () => {
    updateForm({
      availability: [...form.availability, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]
    });
  };

  const updateAvailability = (index: number, updates: Partial<AvailabilitySlot>) => {
    const newSlots = [...form.availability];
    newSlots[index] = { ...newSlots[index], ...updates };
    updateForm({ availability: newSlots });
  };

  const removeAvailability = (index: number) => {
    updateForm({ availability: form.availability.filter((_, i) => i !== index) });
  };

  const handleAgreementAccept = (acceptance: AgreementAcceptance) => {
    setAgreementAcceptance(acceptance);
    // Advance to the BAA step automatically on acceptance
    setCurrentStep('baa');
  };

  const handleBAAAccept = async (acceptance: BAAAcceptance) => {
    setBaaAcceptance(acceptance);
    setIsSubmitting(true);
    setSubmitError(null);

    // Save BAA acceptance first, best-effort
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to insert into provider_baa_agreements table; fall back to profiles upsert
        const { error: baaError } = await supabase
          .from('provider_baa_agreements')
          .insert({
            user_id: user.id,
            accepted_at: acceptance.acceptedAt,
            signed_name: acceptance.signedName,
            document_version: acceptance.documentVersion,
            provider_email: acceptance.providerEmail,
          });

        if (baaError) {
          // Table doesn't exist yet — fall back to profiles column
          console.warn('provider_baa_agreements insert failed, falling back to profiles:', baaError.message);
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              baa_accepted_at: acceptance.acceptedAt,
            });
        }
      }
    } catch (err) {
      console.warn('Could not persist BAA acceptance:', err);
      // Non-blocking — continue to submit regardless
    }

    // Proceed to the main onboarding submission (keeps isSubmitting=true)
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const primaryLicensedState = form.licensedStates[0] || '';
      const liveMarketStates = form.licensedStates.filter((state) => isSupportedProviderState(state));
      const marketplaceState = liveMarketStates[0] || primaryLicensedState;
      const verificationRole = mapRoleToVerificationRole(form.role);
      const fullName = `${form.firstName} ${form.lastName}`.trim();

      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .insert({
          full_name: fullName,
          name: fullName,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          credentials: form.credentials,
          provider_type: form.role,
          bio: form.bio,
          npi_number: form.npiNumber,
          license_number: form.primaryCredentialNumber,
          license_state: marketplaceState || null,
          state: marketplaceState || null,
          states_licensed: form.licensedStates,
          offers_consult: form.offersConsult,
          offers_deep_review: form.offersDeepReview,
          consult_price: form.consultPrice,
          deep_review_price: form.deepReviewPrice,
          hourly_rate: form.consultPrice,
          session_rate: form.consultPrice,
          accepting_new_patients: false,
          is_accepting_patients: false,
          accepts_insurance: form.acceptedInsurance.some((plan) => plan !== 'Cash Pay'),
          insurance_accepted: form.acceptedInsurance,
          verified: false,
          verification_status: 'pending',
          is_active: false,
          offers_telehealth: true,
          organization: form.billingTrack === 'aact-partner' ? 'aact' : 'independent',
          billing_track: form.billingTrack,
          non_solicitation_ack: true,
          non_solicitation_ack_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (providerError) throw providerError;

      const providerId = providerData.id;

      // Persist the owner-facing practice posture on the auth-user profile, where
      // ProviderPortal reads it (alongside pilot_organization). Best-effort: the
      // practice_mode column may not exist in every deployed schema yet, so a
      // failure here must never block onboarding completion.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ practice_mode: form.practiceMode })
            .eq('id', user.id);
        }
      } catch (practiceModeError) {
        console.warn('Could not persist practice_mode to profile:', practiceModeError);
      }

      if (form.availability.length > 0) {
        const availRows = form.availability.map(slot => ({
          provider_id: providerId,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_recurring: true
        }));

        const { error: availError } = await supabase
          .from('provider_availability')
          .insert(availRows);

        if (availError) {
          console.error('Failed to save availability:', availError);
        }
      }

      let verificationSummary: ProviderVerificationSummary | null = null;
      let verificationStatus: 'pending' | 'verified' | 'manual_review' | 'expired' | 'failed' = 'pending';

      if (verificationRole) {
        const credentialsToVerify: Partial<Credential>[] = [
          {
            type: 'state_license',
            credentialNumber: form.primaryCredentialNumber,
            state: primaryLicensedState || undefined,
            issueDate: new Date().toISOString(),
            metadata: {
              lastName: form.lastName,
              licenseType: verificationRole,
            },
          },
        ];

        if (verificationRole === 'bcba') {
          credentialsToVerify.unshift({
            type: 'bacb',
            credentialNumber: form.primaryCredentialNumber,
            issueDate: new Date().toISOString(),
            metadata: {
              lastName: form.lastName,
            },
          });
        }

        if (form.npiNumber) {
          credentialsToVerify.push({
            type: 'npi',
            credentialNumber: form.npiNumber,
            issueDate: new Date().toISOString(),
            metadata: {
              lastName: form.lastName,
            },
          });
        }

        try {
          verificationSummary = await verifyProvider(providerId, verificationRole, credentialsToVerify);
          verificationStatus = mapVerificationStatus(verificationSummary);
        } catch (verificationError) {
          console.error('Provider verification failed during onboarding:', verificationError);
          verificationStatus = 'manual_review';
        }
      }

      const canGoLive = verificationStatus === 'verified' && liveMarketStates.length > 0;

      const { error: activationError } = await supabase
        .from('provider_profiles')
        .update({
          verified: canGoLive,
          verification_status: verificationStatus,
          is_active: canGoLive,
          accepting_new_patients: canGoLive ? form.acceptingNewPatients : false,
          is_accepting_patients: canGoLive ? form.acceptingNewPatients : false,
          next_available: canGoLive && form.availability.length > 0 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      if (activationError) throw activationError;

      if (canGoLive) {
        toast.success(`Profile verified. You are now bookable in ${liveMarketStates.join(', ')}.`);
      } else if (verificationStatus === 'verified') {
        toast.success('Verification cleared. Your marketplace listing will turn on automatically when one of your licensed states is a live Aminy market.');
      } else if (verificationStatus === 'manual_review') {
        toast.success('Profile submitted for manual verification. Aminy will keep your listing private until review is complete.');
      } else {
        toast.success('Profile submitted for verification. Aminy will keep your listing private until credentials clear.');
      }

      onComplete?.(providerId);
    } catch (err: unknown) {
      console.error('Provider onboarding failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to create provider profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E4DF] px-4 py-4">
        <nav aria-label="Provider onboarding navigation" className="max-w-2xl mx-auto flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-[#5A6B7A] transition-colors hover:bg-[#EDF4F7] hover:text-[#3A4A57]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-[#132F43]">Join Aminy as a Provider</h1>
            <p className="text-sm text-[#5A6B7A]">Join the supported-state provider network in {SUPPORTED_STATES_OR} and start with cash-pay or insurance billing.</p>
          </div>
          {currentStep !== 'agreement' && currentStep !== 'baa' && (
            <button
              type="button"
              onClick={currentStep === 'review' ? nextStep : nextStep}
              disabled={!canAdvance() || isSubmitting}
              className="action-button ml-auto hidden min-h-11 items-center gap-2 rounded-xl bg-[#2A7D99] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#376E80] disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </nav>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-3">
        {/* 7 fixed-width steps overflow a 390px viewport and overlapped each
            other. On small screens show icon-only steps (label only on the
            current one); labels return at sm+. shrink-0 + overflow-x-auto keep
            the row usable even at very narrow widths. */}
        <div className="max-w-2xl mx-auto flex items-center gap-1 overflow-x-auto">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => idx <= stepIndex && setCurrentStep(step.id)}
                  aria-label={`Open ${step.label} step`}
                  className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-[#2A7D99]/10 text-[#2A7D99]'
                      : isCompleted
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-[#8A9BA8]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className={isCurrent ? '' : 'hidden sm:inline'}>{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-2 shrink-0 sm:w-auto sm:flex-1 ${isCompleted ? 'bg-green-300' : 'bg-[#E8E4DF]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {currentStep === 'basics' && (
          <div className="space-y-6">
            <p className="text-sm text-[#5A6B7A]">
              You're setting up your practice OS — everything you need to run your practice lives here.
            </p>
            {/* Practice mode — own independent practice vs. join under an organization */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h2 className="text-lg font-semibold text-[#132F43] mb-1">How do you want to practice?</h2>
              <p className="text-sm text-[#5A6B7A] mb-5">This shapes your portal. You can change it later.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  {
                    id: 'independent' as const,
                    title: 'Run your own independent practice',
                    description: 'You own the practice — your families, your RBT roster, your supervision, and how you get paid. Aminy is your practice-in-a-box.',
                  },
                  {
                    id: 'org' as const,
                    title: 'Join under an organization',
                    description: "Work a caseload under an organization (e.g. AACT/Rise). The org handles credentialing and billing; you focus on clients and supervision.",
                  },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateForm({ practiceMode: opt.id })}
                    aria-pressed={form.practiceMode === opt.id}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      form.practiceMode === opt.id
                        ? 'border-[#2A7D99] bg-[#2A7D99]/10'
                        : 'border-[#E8E4DF] bg-[#F6FBFB] hover:border-[#E8E4DF]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {form.practiceMode === opt.id && <CheckCircle className="w-4 h-4 text-[#2A7D99] shrink-0" />}
                      <span className="font-semibold text-[#132F43]">{opt.title}</span>
                    </div>
                    <p className="text-sm text-[#5A6B7A]">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h2 className="text-lg font-semibold text-[#132F43] mb-6">Basic Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={fieldId('first-name')} className="mb-1 block text-sm font-medium text-[#3A4A57]">First Name *</label>
                  <input
                    id={fieldId('first-name')}
                    type="text"
                    value={form.firstName}
                    onChange={e => updateForm({ firstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label htmlFor={fieldId('last-name')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Last Name *</label>
                  <input
                    id={fieldId('last-name')}
                    type="text"
                    value={form.lastName}
                    onChange={e => updateForm({ lastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label htmlFor={fieldId('email')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Email *</label>
                  <input
                    id={fieldId('email')}
                    type="email"
                    value={form.email}
                    onChange={e => updateForm({ email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label htmlFor={fieldId('phone')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Phone</label>
                  <input
                    id={fieldId('phone')}
                    type="tel"
                    value={form.phone}
                    onChange={e => updateForm({ phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label htmlFor={fieldId('credentials')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Credentials *</label>
                  <input
                    id={fieldId('credentials')}
                    type="text"
                    value={form.credentials}
                    onChange={e => updateForm({ credentials: e.target.value })}
                    placeholder="e.g., BCBA, LCSW, MS CCC-SLP"
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label htmlFor={fieldId('role')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Provider Role *</label>
                  <select
                    id={fieldId('role')}
                    value={form.role}
                    onChange={e => updateForm({ role: e.target.value as ProviderRole })}
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  >
                    {Object.entries(PROVIDER_ROLE_DISPLAY).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={fieldId('bio')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Bio</label>
                  <textarea
                    id={fieldId('bio')}
                    value={form.bio}
                    onChange={e => updateForm({ bio: e.target.value })}
                    rows={3}
                    placeholder="Tell families about your experience and approach..."
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'licensing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h2 className="text-lg font-semibold text-[#132F43] mb-2">Licensing & Credentials</h2>
              <p className="text-sm text-[#5A6B7A] mb-6">Select every state where you hold an active license or certification. Aminy only lists providers after verification clears and at least one supported market is live.</p>

              <div className="grid gap-4 mb-6 sm:grid-cols-2">
                <div>
                  <label htmlFor={fieldId('credential-number')} className="mb-1 block text-sm font-medium text-[#3A4A57]">Primary license or certification number *</label>
                  <input
                    id={fieldId('credential-number')}
                    type="text"
                    value={form.primaryCredentialNumber}
                    onChange={e => updateForm({ primaryCredentialNumber: e.target.value })}
                    placeholder="Used for verification before you go live"
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label htmlFor={fieldId('npi-number')} className="mb-1 block text-sm font-medium text-[#3A4A57]">NPI Number</label>
                  <input
                    id={fieldId('npi-number')}
                    type="text"
                    value={form.npiNumber}
                    onChange={e => updateForm({ npiNumber: e.target.value })}
                    placeholder="10-digit NPI"
                    maxLength={10}
                    className="w-full px-4 py-2.5 border border-[#E8E4DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-[#E8E4DF] bg-[#2A7D99]/10/70 px-4 py-3 text-sm text-[#3A4A57]">
                <p className="font-medium text-[#132F43]">Supported launch states: {SUPPORTED_PROVIDER_STATES.join(' · ')}</p>
                <p className="mt-1">You can add any licensed state now. Aminy keeps you off the marketplace until your credentials are validated, then turns on live booking only in supported markets where you are actually licensed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A4A57] mb-3">Licensed States *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto">
                  {US_STATES.map(state => (
                    <label
                      key={state.code}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        form.licensedStates.includes(state.code)
                          ? 'bg-[#2A7D99]/10 text-[#2A7D99] font-medium'
                          : 'hover:bg-[#F6FBFB] text-[#5A6B7A]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.licensedStates.includes(state.code)}
                        onChange={() => toggleState(state.code)}
                        className="rounded border-[#E8E4DF] text-[#2A7D99] focus:ring-cyan-600"
                      />
                      {state.code}
                    </label>
                  ))}
                </div>
                {form.licensedStates.length > 0 && (
                  <p className="text-sm text-[#2A7D99] mt-3 font-medium">
                    {form.licensedStates.length} state{form.licensedStates.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'services' && (
          <div className="space-y-6">

            {/* Billing Track Selection */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h2 className="text-lg font-semibold text-[#132F43] mb-1">Choose Your Practice Track</h2>
              <p className="text-sm text-[#5A6B7A] mb-5">This determines how you get credentialed and paid. You can change tracks later.</p>
              <div className="space-y-3">
                {([
                  {
                    id: 'aact-partner' as const,
                    title: 'Aminy Network',
                    badge: 'Insurance — Rolling Out',
                    badgeClass: 'bg-[#2A7D99]/10 text-[#2A7D99]',
                    description: `Bill insured sessions under a group payer network — rolling out, pending payer-network access in your state. When live: AHCCCS/Medicaid, Mercy Care, Health Choice, BCBS, Aetna, UHC, Cigna, Magellan, and state Medicaid plans across ${SUPPORTED_STATES_AND}, with billing, claims, and prior-auths handled for you and ~biweekly payouts. Aminy fee: 10% of insured sessions.`,
                    highlight: true,
                  },
                  {
                    id: 'independent' as const,
                    title: 'Independent (Bring Your Own Contracts)',
                    badge: null,
                    badgeClass: '',
                    description: 'Use your own existing payer contracts. Aminy handles scheduling, telehealth, family discovery, and documentation. You bill payers directly. Aminy fee: $149/month flat.',
                    highlight: false,
                  },
                  {
                    id: 'cash-only' as const,
                    title: 'Cash Pay Only',
                    badge: 'Fastest Start',
                    badgeClass: 'bg-blue-100 text-blue-700',
                    description: 'No insurance billing. Accept cash-pay families only. Go live in your licensed states immediately. Aminy takes 25% of each session booked through the platform.',
                    highlight: false,
                  },
                ] as const).map(track => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => updateForm({ billingTrack: track.id })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      form.billingTrack === track.id
                        ? 'border-[#2A7D99] bg-[#2A7D99]/10'
                        : 'border-[#E8E4DF] bg-[#F6FBFB] hover:border-[#E8E4DF]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#132F43]">{track.title}</span>
                      {track.badge && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${track.badgeClass}`}>
                          {track.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#5A6B7A]">{track.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h2 className="text-lg font-semibold text-[#132F43] mb-6">Services & Pricing</h2>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-[#F6FBFB] rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.offersConsult}
                      onChange={e => updateForm({ offersConsult: e.target.checked })}
                      className="rounded border-[#E8E4DF] text-[#2A7D99] focus:ring-cyan-600"
                    />
                    <div>
                      <p className="font-medium text-[#132F43]">25-min Consult</p>
                      <p className="text-sm text-[#5A6B7A]">Quick guidance session for specific questions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#5A6B7A]">$</span>
                    <input
                      type="number"
                      value={form.consultPrice}
                      onChange={e => updateForm({ consultPrice: Number(e.target.value) })}
                      className="w-20 px-3 py-1.5 border border-[#E8E4DF] rounded-lg text-right"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 bg-[#F6FBFB] rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.offersDeepReview}
                      onChange={e => updateForm({ offersDeepReview: e.target.checked })}
                      className="rounded border-[#E8E4DF] text-[#2A7D99] focus:ring-cyan-600"
                    />
                    <div>
                      <p className="font-medium text-[#132F43]">50-min Deep Review</p>
                      <p className="text-sm text-[#5A6B7A]">Comprehensive session for complex challenges</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#5A6B7A]">$</span>
                    <input
                      type="number"
                      value={form.deepReviewPrice}
                      onChange={e => updateForm({ deepReviewPrice: Number(e.target.value) })}
                      className="w-20 px-3 py-1.5 border border-[#E8E4DF] rounded-lg text-right"
                    />
                  </div>
                </label>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#3A4A57] mb-2">Accepted payment and insurance rails</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_PAYER_OPTIONS.map((plan) => {
                      const active = form.acceptedInsurance.includes(plan);
                      return (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => updateForm({
                            acceptedInsurance: active
                              ? form.acceptedInsurance.filter((entry) => entry !== plan)
                              : [...form.acceptedInsurance, plan],
                          })}
                          aria-pressed={active}
                          className={`min-h-11 rounded-full border px-3 py-2 text-sm transition-colors ${active ? 'border-cyan-600 bg-[#2A7D99]/10 text-[#2A7D99]' : 'border-[#E8E4DF] text-[#5A6B7A] hover:border-[#E8E4DF]'}`}
                        >
                          {plan}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-[#5A6B7A] mt-2">
                    Independent providers can start with cash pay only, then add payer contracts or partner-billed lanes as they grow.
                  </p>
                </div>

                <div className="p-4 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
                  <p className="text-sm text-[#4A6478]">
                    <strong>Practice in a box:</strong> Aminy handles family-facing discovery, booking, reminders, telehealth access, payouts, and follow-up. Cash-pay can go live immediately in your licensed states; insured lanes can be layered in as you add contracts or partner billing paths.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'availability' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#132F43]">Weekly Availability</h2>
                  <p className="text-sm text-[#5A6B7A]">Set your recurring weekly schedule (you can change this anytime)</p>
                </div>
                <button
                  type="button"
                  onClick={addAvailability}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-[#2A7D99] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2A7D99]/90"
                >
                  + Add Time Block
                </button>
              </div>

              {form.availability.length === 0 ? (
                <div className="text-center py-8 text-[#5A6B7A]">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-[#8A9BA8]" />
                  <p className="font-medium">No availability set yet</p>
                  <p className="text-sm mt-1">Add time blocks when you're available for sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.availability.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#F6FBFB] rounded-lg">
                      <select
                        aria-label={`Day of week for time block ${idx + 1}`}
                        value={slot.dayOfWeek}
                        onChange={e => updateAvailability(idx, { dayOfWeek: Number(e.target.value) })}
                        className="px-3 py-2 border border-[#E8E4DF] rounded-lg text-sm"
                      >
                        {DAYS.map((day, i) => (
                          <option key={i} value={i}>{day}</option>
                        ))}
                      </select>
                      <input
                        aria-label={`Start time for time block ${idx + 1}`}
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateAvailability(idx, { startTime: e.target.value })}
                        className="px-3 py-2 border border-[#E8E4DF] rounded-lg text-sm"
                      />
                      <span className="text-[#8A9BA8]">to</span>
                      <input
                        aria-label={`End time for time block ${idx + 1}`}
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateAvailability(idx, { endTime: e.target.value })}
                        className="px-3 py-2 border border-[#E8E4DF] rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeAvailability(idx)}
                        aria-label={`Remove time block ${idx + 1}`}
                        className="min-h-11 min-w-11 rounded-lg p-2 text-[#8A9BA8] transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h2 className="text-lg font-semibold text-[#132F43] mb-6">Review Your Profile</h2>

              <div className="space-y-4">
                <div className="p-4 bg-[#F6FBFB] rounded-lg">
                  <h3 className="text-sm font-medium text-[#5A6B7A] mb-2">Profile</h3>
                  <p className="font-semibold text-[#132F43]">
                    {form.firstName} {form.lastName}, {form.credentials}
                  </p>
                  <p className="text-sm text-[#5A6B7A]">{PROVIDER_ROLE_DISPLAY[form.role]}</p>
                  {form.bio && <p className="text-sm text-[#5A6B7A] mt-2">{form.bio}</p>}
                </div>

                <div className="p-4 bg-[#F6FBFB] rounded-lg">
                  <h3 className="text-sm font-medium text-[#5A6B7A] mb-2">Licensing</h3>
                  <div className="flex flex-wrap gap-1">
                    {form.licensedStates.map(code => (
                      <span key={code} className="px-2 py-0.5 bg-[#2A7D99]/10 text-[#2A7D99] text-xs font-medium rounded-full">
                        {code}
                      </span>
                    ))}
                  </div>
                  {form.npiNumber && (
                    <p className="text-sm text-[#5A6B7A] mt-2">NPI: {form.npiNumber}</p>
                  )}
                  {form.primaryCredentialNumber && (
                    <p className="text-sm text-[#5A6B7A] mt-1">Credential #: {form.primaryCredentialNumber}</p>
                  )}
                </div>

                <div className="p-4 bg-[#F6FBFB] rounded-lg">
                  <h3 className="text-sm font-medium text-[#5A6B7A] mb-2">Services</h3>
                  {form.offersConsult && (
                    <p className="text-sm text-[#132F43]">25-min Consult — ${form.consultPrice}</p>
                  )}
                  {form.offersDeepReview && (
                    <p className="text-sm text-[#132F43]">50-min Deep Review — ${form.deepReviewPrice}</p>
                  )}
                  <p className="text-sm text-[#5A6B7A] mt-2">Accepted rails: {form.acceptedInsurance.join(', ')}</p>
                </div>

                <div className="p-4 bg-[#F6FBFB] rounded-lg">
                  <h3 className="text-sm font-medium text-[#5A6B7A] mb-2">Availability</h3>
                  {form.availability.length > 0 ? (
                    <div className="space-y-1">
                      {form.availability.map((slot, idx) => (
                        <p key={idx} className="text-sm text-[#132F43]">
                          {DAYS[slot.dayOfWeek]}: {slot.startTime} – {slot.endTime}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#5A6B7A]">None set — you can configure this in your portal</p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#E8E4DF] bg-[#2A7D99]/10/70 px-4 py-4">
                  <h3 className="text-sm font-semibold text-[#132F43]">Before you go live</h3>
                  <p className="mt-2 text-sm text-[#3A4A57]">
                    Aminy verifies your primary credential, matches your licensed states, and only turns on marketplace discovery after those checks pass. If you add states outside the live launch footprint, they stay saved on your profile and become bookable when that market is opened.
                  </p>
                </div>
              </div>

              {/* Non-solicitation acknowledgment */}
              <div className={`mt-4 rounded-2xl border p-4 transition-colors ${nonSolicitationAck ? 'border-[#2A7D99]/20 bg-[#2A7D99]/10/60' : 'border-neutral-200 bg-neutral-50'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nonSolicitationAck}
                    onChange={(e) => setNonSolicitationAck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E8E4DF] text-[#2A7D99] focus:ring-teal-500"
                  />
                  <span className="text-sm text-[#3A4A57]">
                    <span className="font-semibold text-[#132F43]">Non-Solicitation Agreement — </span>
                    I understand that families I connect with through the Aminy marketplace may not be solicited to continue or initiate services outside of the Aminy platform for a period of 12 months following our last session on Aminy. This protects both the family and the integrity of the Aminy network.
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'agreement' && (
          <ProviderAgreement
            providerName={`${form.firstName} ${form.lastName}`.trim() || 'Provider'}
            providerEmail={form.email}
            onAccept={handleAgreementAccept}
            onBack={prevStep}
          />
        )}

        {currentStep === 'baa' && (
          <ProviderBAA
            providerName={`${form.firstName} ${form.lastName}`.trim() || 'Provider'}
            providerEmail={form.email}
            onAccept={handleBAAAccept}
            onBack={prevStep}
          />
        )}

        {isSubmitting && currentStep === 'baa' && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2A7D99]" />
              <p className="text-sm text-[#5A6B7A] font-medium">Creating your provider profile…</p>
            </div>
          </div>
        )}

        {submitError && currentStep === 'baa' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Navigation — hidden on agreement/baa steps which have their own action buttons */}
        {currentStep !== 'agreement' && currentStep !== 'baa' && (
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={stepIndex === 0 ? onBack : prevStep}
              className="flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-[#5A6B7A] transition-colors hover:bg-[#EDF4F7]"
            >
              <ArrowLeft className="w-4 h-4" />
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </button>

            {currentStep === 'review' ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!nonSolicitationAck}
                className="action-button flex min-h-11 items-center gap-2 rounded-lg bg-[#2A7D99] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#2A7D99]/90 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                Continue to Agreement
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canAdvance()}
                className="action-button flex min-h-11 items-center gap-2 rounded-lg bg-[#2A7D99] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#2A7D99]/90 disabled:opacity-50"
              >
                Continue to {STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].label}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProviderOnboarding;
