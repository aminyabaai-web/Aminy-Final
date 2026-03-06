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

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  User,
  FileText,
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

interface ProviderOnboardingProps {
  onBack?: () => void;
  onComplete?: (providerId: string) => void;
}

type OnboardingStep = 'basics' | 'licensing' | 'services' | 'availability' | 'review';

const STEPS: { id: OnboardingStep; label: string; icon: React.ElementType }[] = [
  { id: 'basics', label: 'Profile', icon: User },
  { id: 'licensing', label: 'Licensing', icon: Shield },
  { id: 'services', label: 'Services', icon: DollarSign },
  { id: 'availability', label: 'Schedule', icon: Calendar },
  { id: 'review', label: 'Review', icon: FileText },
];

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ProviderFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  credentials: string;
  role: ProviderRole;
  bio: string;
  npiNumber: string;
  licensedStates: string[];
  offersConsult: boolean;
  offersDeepReview: boolean;
  consultPrice: number;
  deepReviewPrice: number;
  acceptingNewPatients: boolean;
  availability: AvailabilitySlot[];
}

const DEFAULT_FORM: ProviderFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  credentials: '',
  role: 'bcba',
  bio: '',
  npiNumber: '',
  licensedStates: [],
  offersConsult: true,
  offersDeepReview: true,
  consultPrice: 85,
  deepReviewPrice: 165,
  acceptingNewPatients: true,
  availability: [],
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ProviderOnboarding({ onBack, onComplete }: ProviderOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basics');
  const [form, setForm] = useState<ProviderFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  const updateForm = (updates: Partial<ProviderFormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 'basics':
        return !!(form.firstName && form.lastName && form.email && form.credentials && form.role);
      case 'licensing':
        return form.licensedStates.length > 0;
      case 'services':
        return form.offersConsult || form.offersDeepReview;
      case 'availability':
        return form.availability.length > 0;
      case 'review':
        return true;
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Insert provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .insert({
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          credentials: form.credentials,
          provider_type: form.role,
          bio: form.bio,
          npi_number: form.npiNumber,
          states_licensed: form.licensedStates,
          offers_consult: form.offersConsult,
          offers_deep_review: form.offersDeepReview,
          consult_price: form.consultPrice,
          deep_review_price: form.deepReviewPrice,
          is_accepting_patients: form.acceptingNewPatients,
          is_active: true,
          organization: 'independent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (providerError) throw providerError;

      const providerId = providerData.id;

      // Insert availability blocks
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
          // Non-fatal — provider can set this up later in portal
        }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Join Aminy as a Provider</h1>
            <p className="text-sm text-gray-500">Set up your profile in just a few minutes</p>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-1">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = step.id === currentStep;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => idx <= stepIndex && setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-[#0891b2]/10 text-[#0891b2]'
                      : isCompleted
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => updateForm({ firstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => updateForm({ lastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateForm({ email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => updateForm({ phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credentials *</label>
                  <input
                    type="text"
                    value={form.credentials}
                    onChange={e => updateForm({ credentials: e.target.value })}
                    placeholder="e.g., BCBA, LCSW, MS CCC-SLP"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Role *</label>
                  <select
                    value={form.role}
                    onChange={e => updateForm({ role: e.target.value as ProviderRole })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                  >
                    {Object.entries(PROVIDER_ROLE_DISPLAY).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => updateForm({ bio: e.target.value })}
                    rows={3}
                    placeholder="Tell families about your experience and approach..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'licensing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Licensing & Credentials</h2>
              <p className="text-sm text-gray-500 mb-6">Select all states where you hold an active license</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
                <input
                  type="text"
                  value={form.npiNumber}
                  onChange={e => updateForm({ npiNumber: e.target.value })}
                  placeholder="10-digit NPI"
                  maxLength={10}
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2]/20 focus:border-[#0891b2]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Licensed States *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto">
                  {US_STATES.map(state => (
                    <label
                      key={state.code}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        form.licensedStates.includes(state.code)
                          ? 'bg-[#0891b2]/10 text-[#0891b2] font-medium'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.licensedStates.includes(state.code)}
                        onChange={() => toggleState(state.code)}
                        className="rounded border-gray-300 text-[#0891b2] focus:ring-[#0891b2]"
                      />
                      {state.code}
                    </label>
                  ))}
                </div>
                {form.licensedStates.length > 0 && (
                  <p className="text-sm text-[#0891b2] mt-3 font-medium">
                    {form.licensedStates.length} state{form.licensedStates.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'services' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Services & Pricing</h2>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.offersConsult}
                      onChange={e => updateForm({ offersConsult: e.target.checked })}
                      className="rounded border-gray-300 text-[#0891b2] focus:ring-[#0891b2]"
                    />
                    <div>
                      <p className="font-medium text-gray-900">25-min Consult</p>
                      <p className="text-sm text-gray-500">Quick guidance session for specific questions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      value={form.consultPrice}
                      onChange={e => updateForm({ consultPrice: Number(e.target.value) })}
                      className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-right"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.offersDeepReview}
                      onChange={e => updateForm({ offersDeepReview: e.target.checked })}
                      className="rounded border-gray-300 text-[#0891b2] focus:ring-[#0891b2]"
                    />
                    <div>
                      <p className="font-medium text-gray-900">50-min Deep Review</p>
                      <p className="text-sm text-gray-500">Comprehensive session for complex challenges</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      value={form.deepReviewPrice}
                      onChange={e => updateForm({ deepReviewPrice: Number(e.target.value) })}
                      className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-right"
                    />
                  </div>
                </label>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Cash-pay model:</strong> Aminy processes payments via Stripe. You receive payouts weekly minus a 15% platform fee. No insurance billing needed for MVP.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'availability' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Weekly Availability</h2>
                  <p className="text-sm text-gray-500">Set your recurring weekly schedule (you can change this anytime)</p>
                </div>
                <button
                  onClick={addAvailability}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0891b2] text-white text-sm font-medium rounded-lg hover:bg-[#0891b2]/90 transition-colors"
                >
                  + Add Time Block
                </button>
              </div>

              {form.availability.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No availability set yet</p>
                  <p className="text-sm mt-1">Add time blocks when you're available for sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.availability.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={slot.dayOfWeek}
                        onChange={e => updateAvailability(idx, { dayOfWeek: Number(e.target.value) })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        {DAYS.map((day, i) => (
                          <option key={i} value={i}>{day}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateAvailability(idx, { startTime: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateAvailability(idx, { endTime: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeAvailability(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Your Profile</h2>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Profile</h3>
                  <p className="font-semibold text-gray-900">
                    {form.firstName} {form.lastName}, {form.credentials}
                  </p>
                  <p className="text-sm text-gray-600">{PROVIDER_ROLE_DISPLAY[form.role]}</p>
                  {form.bio && <p className="text-sm text-gray-500 mt-2">{form.bio}</p>}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Licensing</h3>
                  <div className="flex flex-wrap gap-1">
                    {form.licensedStates.map(code => (
                      <span key={code} className="px-2 py-0.5 bg-[#0891b2]/10 text-[#0891b2] text-xs font-medium rounded-full">
                        {code}
                      </span>
                    ))}
                  </div>
                  {form.npiNumber && (
                    <p className="text-sm text-gray-500 mt-2">NPI: {form.npiNumber}</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Services</h3>
                  {form.offersConsult && (
                    <p className="text-sm text-gray-900">25-min Consult — ${form.consultPrice}</p>
                  )}
                  {form.offersDeepReview && (
                    <p className="text-sm text-gray-900">50-min Deep Review — ${form.deepReviewPrice}</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Availability</h3>
                  {form.availability.length > 0 ? (
                    <div className="space-y-1">
                      {form.availability.map((slot, idx) => (
                        <p key={idx} className="text-sm text-gray-900">
                          {DAYS[slot.dayOfWeek]}: {slot.startTime} – {slot.endTime}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">None set — you can configure this in your portal</p>
                  )}
                </div>
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

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={stepIndex === 0 ? onBack : prevStep}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#0891b2]/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit & Start Practicing
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0891b2] text-white font-medium rounded-lg hover:bg-[#0891b2]/90 disabled:opacity-50 transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderOnboarding;
