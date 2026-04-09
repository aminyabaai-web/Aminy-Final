// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderRegistration — Multi-step registration flow
 *
 * Steps: Welcome → Profile → Services → Practice Type → Payment → Agreement → Preview → Go Live
 * Clean mobile-first design with progress dots and back navigation.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  Camera,
  Users,
  Briefcase,
  Star,
  Clock,
  MapPin,
  Globe,
  Shield,
  CreditCard,
  Building2,
  Sparkles,
  PartyPopper,
  ChevronRight,
  User,
  FileText,
  Heart,
  Brain,
  MessageCircle,
  Calendar,
  BadgeCheck,
  Banknote,
  CircleDollarSign,
} from 'lucide-react';
import ProviderAgreement, { type AgreementAcceptance } from './ProviderAgreement';
import {
  getAllServices,
  getCategoryLabel,
  type ServiceCategory,
  type CashPayService,
} from '../../lib/pricing/cash-pay-pricing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RegistrationStep =
  | 'welcome'
  | 'profile'
  | 'services'
  | 'practice-type'
  | 'payment'
  | 'agreement'
  | 'preview'
  | 'go-live';

const STEPS: RegistrationStep[] = [
  'welcome',
  'profile',
  'services',
  'practice-type',
  'payment',
  'agreement',
  'preview',
  'go-live',
];

const STEP_LABELS: Record<RegistrationStep, string> = {
  welcome: 'Welcome',
  profile: 'Profile',
  services: 'Services',
  'practice-type': 'Practice',
  payment: 'Payment',
  agreement: 'Agreement',
  preview: 'Preview',
  'go-live': 'Go Live',
};

type ProviderPath = 'marketplace' | 'saas' | 'both';

type CredentialType = 'BCBA' | 'BCaBA' | 'RBT' | 'LCSW' | 'LPC' | 'LMFT' | 'PsyD' | 'PhD' | 'MD' | 'SLP-CCC' | 'SLPA' | 'OT' | 'PT';

const CREDENTIAL_OPTIONS: CredentialType[] = [
  'BCBA', 'BCaBA', 'RBT', 'LCSW', 'LPC', 'LMFT', 'PsyD', 'PhD', 'MD', 'SLP-CCC', 'SLPA', 'OT', 'PT',
];

const SPECIALTY_OPTIONS = [
  'Autism Spectrum Disorder',
  'ADHD',
  'Anxiety & OCD',
  'Depression',
  'Trauma & PTSD',
  'Behavioral Challenges',
  'Social Skills',
  'Speech & Language Delays',
  'Feeding Therapy',
  'Sensory Processing',
  'Executive Functioning',
  'Parent Training',
  'School Readiness',
  'Transition Planning',
  'Early Intervention',
];

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'Mandarin', 'Vietnamese', 'Arabic', 'Korean',
  'Tagalog', 'ASL', 'French', 'Portuguese', 'Hindi', 'Russian',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface ProviderProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  credentials: CredentialType[];
  npi: string;
  licenseStates: string[];
  specialties: string[];
  languages: string[];
  bio: string;
  photoUrl: string | null;
}

interface RegistrationState {
  step: RegistrationStep;
  path: ProviderPath | null;
  profile: ProviderProfile;
  selectedServices: string[];
  availability: Record<string, boolean>;
  practiceType: ProviderPath | null;
  saasTier: 'basic' | 'premium';
  agreementAccepted: AgreementAcceptance | null;
}

interface ProviderRegistrationProps {
  onComplete?: (state: RegistrationState) => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Progress Dots
// ---------------------------------------------------------------------------

function ProgressDots({ current, steps }: { current: RegistrationStep; steps: RegistrationStep[] }) {
  const currentIndex = steps.indexOf(current);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, i) => (
        <div
          key={step}
          className={`w-2 h-2 rounded-full transition-all ${
            i === currentIndex
              ? 'w-6 bg-teal-600'
              : i < currentIndex
              ? 'bg-teal-400'
              : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onSelect }: { onSelect: (path: ProviderPath) => void }) {
  return (
    <div className="px-5 py-8 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-6"
      >
        <Sparkles className="w-8 h-8 text-teal-600" />
      </motion.div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Build Your Practice on Aminy</h1>
      <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
        Join the platform connecting families with exceptional behavioral health providers. How would you like to get started?
      </p>

      <div className="space-y-4 max-w-sm mx-auto">
        <button
          onClick={() => onSelect('marketplace')}
          className="w-full p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-400 transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">I Want Aminy Clients</h3>
              <p className="text-sm text-slate-500">
                Get matched with families searching for your services. Aminy handles marketing, billing, and scheduling.
              </p>
              <span className="text-xs text-teal-600 font-medium mt-2 inline-block">
                Per-session platform fee
              </span>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect('saas')}
          className="w-full p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-400 transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
              <Briefcase className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">I Have My Own Clients</h3>
              <p className="text-sm text-slate-500">
                Use Aminy's telehealth, scheduling, and family engagement tools with your existing caseload.
              </p>
              <span className="text-xs text-slate-600 font-medium mt-2 inline-block">
                Flat monthly fee — $49 or $99/mo
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Profile
// ---------------------------------------------------------------------------

interface StepProfileProps {
  profile: ProviderProfile;
  onChange: (profile: ProviderProfile) => void;
}

function StepProfile({ profile, onChange }: StepProfileProps) {
  const update = <K extends keyof ProviderProfile>(key: K, value: ProviderProfile[K]) => {
    onChange({ ...profile, [key]: value });
  };

  const toggleArrayItem = <K extends keyof ProviderProfile>(
    key: K,
    item: string
  ) => {
    const arr = profile[key] as string[];
    const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
    update(key, next as ProviderProfile[K]);
  };

  return (
    <div className="px-5 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Your Profile</h2>
        <p className="text-sm text-slate-500">Tell families about yourself and your qualifications.</p>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <button className="text-sm text-teal-600 font-medium flex items-center gap-1.5 hover:text-teal-700">
          <Upload className="w-4 h-4" />
          Upload Photo
        </button>
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">First Name</label>
          <input
            type="text"
            value={profile.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Jane"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Last Name</label>
          <input
            type="text"
            value={profile.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Smith"
          />
        </div>
      </div>

      {/* Email & Phone */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Email</label>
        <input
          type="email"
          value={profile.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="jane@example.com"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Phone</label>
        <input
          type="tel"
          value={profile.phone}
          onChange={(e) => update('phone', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="(555) 123-4567"
        />
      </div>

      {/* NPI */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">NPI Number</label>
        <input
          type="text"
          value={profile.npi}
          onChange={(e) => update('npi', e.target.value)}
          maxLength={10}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
          placeholder="1234567890"
        />
      </div>

      {/* Credentials */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Credentials</label>
        <div className="flex flex-wrap gap-2">
          {CREDENTIAL_OPTIONS.map((cred) => (
            <button
              key={cred}
              onClick={() => toggleArrayItem('credentials', cred)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                profile.credentials.includes(cred)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {cred}
            </button>
          ))}
        </div>
      </div>

      {/* License States */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Licensed In</label>
        <div className="flex flex-wrap gap-1.5">
          {US_STATES.map((st) => (
            <button
              key={st}
              onClick={() => toggleArrayItem('licenseStates', st)}
              className={`w-10 h-8 rounded-lg text-xs font-medium transition-all border ${
                profile.licenseStates.includes(st)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Specialties */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Specialties</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map((spec) => (
            <button
              key={spec}
              onClick={() => toggleArrayItem('specialties', spec)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                profile.specialties.includes(spec)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Languages</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang}
              onClick={() => toggleArrayItem('languages', lang)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                profile.languages.includes(lang)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Bio</label>
        <textarea
          value={profile.bio}
          onChange={(e) => update('bio', e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          placeholder="Tell families about your experience, approach, and what makes you passionate about working with neurodivergent families..."
        />
        <p className="text-xs text-slate-400 mt-1">{profile.bio.length}/500 characters</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Services
// ---------------------------------------------------------------------------

interface StepServicesProps {
  selectedServices: string[];
  onChange: (services: string[]) => void;
}

function StepServices({ selectedServices, onChange }: StepServicesProps) {
  const servicesByCategory = useMemo(() => {
    const categories: ServiceCategory[] = ['aba', 'mental-health', 'speech'];
    return categories.map((cat) => ({
      category: cat,
      label: getCategoryLabel(cat),
      services: getAllServices(cat),
    }));
  }, []);

  const toggle = (id: string) => {
    onChange(
      selectedServices.includes(id)
        ? selectedServices.filter((s) => s !== id)
        : [...selectedServices, id]
    );
  };

  const CATEGORY_ICONS_MAP: Record<ServiceCategory, React.ReactNode> = {
    aba: <Brain className="w-5 h-5 text-teal-600" />,
    'mental-health': <Heart className="w-5 h-5 text-rose-500" />,
    speech: <MessageCircle className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className="px-5 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Your Services</h2>
        <p className="text-sm text-slate-500">
          Select the services you offer. These will appear on your marketplace listing.
        </p>
      </div>

      {servicesByCategory.map(({ category, label, services }) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            {CATEGORY_ICONS_MAP[category]}
            <h3 className="font-semibold text-slate-800 text-sm">{label}</h3>
          </div>
          <div className="space-y-2">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => toggle(service.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  selectedServices.includes(service.id)
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      selectedServices.includes(service.id)
                        ? 'bg-teal-600 border-teal-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {selectedServices.includes(service.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{service.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      CPT {service.cptCode} — {service.durationMinutes} min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-700">${service.familyPays}</div>
                  <div className="text-xs text-slate-400">You get ${service.providerGets}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {selectedServices.length > 0 && (
        <p className="text-xs text-teal-600 font-medium text-center">
          {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Practice Type
// ---------------------------------------------------------------------------

interface StepPracticeTypeProps {
  practiceType: ProviderPath | null;
  saasTier: 'basic' | 'premium';
  onChangePracticeType: (type: ProviderPath) => void;
  onChangeSaasTier: (tier: 'basic' | 'premium') => void;
}

function StepPracticeType({
  practiceType,
  saasTier,
  onChangePracticeType,
  onChangeSaasTier,
}: StepPracticeTypeProps) {
  return (
    <div className="px-5 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Practice Type</h2>
        <p className="text-sm text-slate-500">
          Choose how you want to use the platform. You can always change this later.
        </p>
      </div>

      <div className="space-y-3">
        {/* Marketplace */}
        <button
          onClick={() => onChangePracticeType('marketplace')}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
            practiceType === 'marketplace'
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <Users className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900">Marketplace Provider</h3>
              <p className="text-sm text-slate-500 mt-1">
                Aminy sends you clients. We handle marketing, scheduling, and billing.
              </p>
              <p className="text-xs text-teal-600 font-medium mt-2">
                Per-session platform fee (32-36% depending on service)
              </p>
            </div>
          </div>
        </button>

        {/* SaaS */}
        <button
          onClick={() => onChangePracticeType('saas')}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
            practiceType === 'saas'
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <Briefcase className="w-6 h-6 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900">SaaS Provider</h3>
              <p className="text-sm text-slate-500 mt-1">
                Bring your own clients. Use our telehealth, scheduling, and family tools.
              </p>
              <p className="text-xs text-slate-600 font-medium mt-2">
                Flat monthly fee. No per-session fee.
              </p>
            </div>
          </div>
        </button>

        {/* Both */}
        <button
          onClick={() => onChangePracticeType('both')}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
            practiceType === 'both'
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <CircleDollarSign className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900">Both</h3>
              <p className="text-sm text-slate-500 mt-1">
                Get Aminy clients AND bring your own. Different fee structures apply to each.
              </p>
              <p className="text-xs text-amber-600 font-medium mt-2">
                Best of both worlds
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* SaaS tier selection */}
      {(practiceType === 'saas' || practiceType === 'both') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-slate-700">SaaS Plan</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onChangeSaasTier('basic')}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                saasTier === 'basic'
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-2xl font-bold text-slate-900">$49</div>
              <div className="text-xs text-slate-500">/month</div>
              <div className="text-xs text-slate-600 mt-2 font-medium">Basic</div>
              <p className="text-[10px] text-slate-400 mt-1">Scheduling, telehealth, basic analytics</p>
            </button>
            <button
              onClick={() => onChangeSaasTier('premium')}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                saasTier === 'premium'
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-2xl font-bold text-slate-900">$99</div>
              <div className="text-xs text-slate-500">/month</div>
              <div className="text-xs text-slate-600 mt-2 font-medium">Premium</div>
              <p className="text-[10px] text-slate-400 mt-1">Full suite: EVV, Ease scores, AI notes, analytics</p>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Payment
// ---------------------------------------------------------------------------

function StepPayment() {
  return (
    <div className="px-5 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Payment Setup</h2>
        <p className="text-sm text-slate-500">
          Set up your bank account for bi-weekly direct deposits. Powered by Stripe.
        </p>
      </div>

      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
        <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-4">
          <Banknote className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-700 mb-1">Stripe Connect</h3>
        <p className="text-sm text-slate-500 mb-4">
          Securely connect your bank account. Aminy never stores your banking details.
        </p>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Connect Bank Account
        </button>
        <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" />
          256-bit encryption. PCI DSS compliant.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">How Payments Work</h3>
        {[
          { icon: Calendar, text: 'Sessions are tracked automatically on the platform' },
          { icon: CircleDollarSign, text: 'Aminy collects payment from families' },
          { icon: Banknote, text: 'You are paid bi-weekly via direct deposit' },
          { icon: FileText, text: 'Itemized statements with every payment' },
        ].map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Preview
// ---------------------------------------------------------------------------

interface StepPreviewProps {
  profile: ProviderProfile;
  selectedServices: string[];
}

function StepPreview({ profile, selectedServices }: StepPreviewProps) {
  const services = getAllServices().filter((s) => selectedServices.includes(s.id));

  return (
    <div className="px-5 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Profile Preview</h2>
        <p className="text-sm text-slate-500">This is how families will see you on Aminy.</p>
      </div>

      {/* Provider Card Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-teal-600 px-5 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Provider profile photo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white/60" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {profile.firstName || 'Jane'} {profile.lastName || 'Smith'}
                {profile.credentials.length > 0 && (
                  <span className="text-teal-100 font-normal">, {profile.credentials.join(', ')}</span>
                )}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-teal-100 text-xs">
                  <Star className="w-3 h-3 fill-current" />
                  <span>New Provider</span>
                </div>
                {profile.licenseStates.length > 0 && (
                  <span className="text-teal-100 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {profile.licenseStates.slice(0, 3).join(', ')}
                    {profile.licenseStates.length > 3 && ` +${profile.licenseStates.length - 3}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
          )}

          {/* Specialties */}
          {profile.specialties.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Specialties
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.specialties.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Services & Pricing
              </h4>
              <div className="space-y-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.durationMinutes} min</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">${s.familyPays}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {profile.languages.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe className="w-3.5 h-3.5" />
              Speaks {profile.languages.join(', ')}
            </div>
          )}

          {/* Availability placeholder */}
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            Availability will be shown once you set your schedule
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Go Live
// ---------------------------------------------------------------------------

interface StepGoLiveProps {
  profile: ProviderProfile;
  selectedServices: string[];
  practiceType: ProviderPath | null;
  agreementAccepted: boolean;
}

function StepGoLive({ profile, selectedServices, practiceType, agreementAccepted }: StepGoLiveProps) {
  const checklist = [
    { label: 'Profile completed', done: !!(profile.firstName && profile.lastName && profile.email) },
    { label: 'Credentials added', done: profile.credentials.length > 0 },
    { label: 'NPI number', done: profile.npi.length === 10 },
    { label: 'Services selected', done: selectedServices.length > 0 },
    { label: 'Practice type chosen', done: !!practiceType },
    { label: 'Payment setup', done: true }, // Placeholder — would check Stripe connect status
    { label: 'Agreement accepted', done: agreementAccepted },
  ];

  const allDone = checklist.every((c) => c.done);

  return (
    <div className="px-5 py-6 space-y-6 text-center">
      {allDone ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
            className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto"
          >
            <PartyPopper className="w-10 h-10 text-teal-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-900">Your Profile is Live!</h2>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Families can now find and book with you on Aminy. Welcome to the team.
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <BadgeCheck className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Almost There</h2>
          <p className="text-sm text-slate-500">Complete all items below to go live.</p>
        </>
      )}

      {/* Checklist */}
      <div className="text-left space-y-2 max-w-sm mx-auto">
        {checklist.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              item.done ? 'bg-teal-50' : 'bg-slate-50'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                item.done ? 'bg-teal-600' : 'bg-slate-200'
              }`}
            >
              {item.done ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <span className="text-xs text-slate-400 font-medium">{i + 1}</span>
              )}
            </div>
            <span
              className={`text-sm ${
                item.done ? 'text-teal-700 font-medium' : 'text-slate-500'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProviderRegistration({ onComplete, onBack }: ProviderRegistrationProps) {
  const [state, setState] = useState<RegistrationState>({
    step: 'welcome',
    path: null,
    profile: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      credentials: [],
      npi: '',
      licenseStates: [],
      specialties: [],
      languages: ['English'],
      bio: '',
      photoUrl: null,
    },
    selectedServices: [],
    availability: {},
    practiceType: null,
    saasTier: 'basic',
    agreementAccepted: null,
  });

  const currentIndex = STEPS.indexOf(state.step);

  const goTo = useCallback((step: RegistrationStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const goNext = useCallback(() => {
    const next = STEPS[currentIndex + 1];
    if (next) goTo(next);
  }, [currentIndex, goTo]);

  const goPrev = useCallback(() => {
    const prev = STEPS[currentIndex - 1];
    if (prev) goTo(prev);
  }, [currentIndex, goTo]);

  const handleWelcomeSelect = useCallback(
    (path: ProviderPath) => {
      setState((prev) => ({ ...prev, path, practiceType: path }));
      goNext();
    },
    [goNext]
  );

  const handleAgreementAccept = useCallback(
    (acceptance: AgreementAcceptance) => {
      setState((prev) => ({ ...prev, agreementAccepted: acceptance }));
      goNext();
    },
    [goNext]
  );

  // Can we proceed from current step?
  const canProceed = useMemo(() => {
    switch (state.step) {
      case 'profile':
        return !!(state.profile.firstName && state.profile.lastName && state.profile.email);
      case 'services':
        return state.selectedServices.length > 0;
      case 'practice-type':
        return !!state.practiceType;
      case 'payment':
        return true; // Placeholder
      case 'agreement':
        return !!state.agreementAccepted;
      case 'preview':
        return true;
      case 'go-live':
        return true;
      default:
        return true;
    }
  }, [state]);

  return (
    <div className="max-w-lg mx-auto pb-8 min-h-screen bg-white">
      {/* Top Bar */}
      {state.step !== 'welcome' && (
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={goPrev}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {STEP_LABELS[state.step]}
            </span>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
          <ProgressDots current={state.step} steps={STEPS} />
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {state.step === 'welcome' && <StepWelcome onSelect={handleWelcomeSelect} />}

          {state.step === 'profile' && (
            <StepProfile
              profile={state.profile}
              onChange={(profile) => setState((prev) => ({ ...prev, profile }))}
            />
          )}

          {state.step === 'services' && (
            <StepServices
              selectedServices={state.selectedServices}
              onChange={(selectedServices) => setState((prev) => ({ ...prev, selectedServices }))}
            />
          )}

          {state.step === 'practice-type' && (
            <StepPracticeType
              practiceType={state.practiceType}
              saasTier={state.saasTier}
              onChangePracticeType={(practiceType) =>
                setState((prev) => ({ ...prev, practiceType }))
              }
              onChangeSaasTier={(saasTier) => setState((prev) => ({ ...prev, saasTier }))}
            />
          )}

          {state.step === 'payment' && <StepPayment />}

          {state.step === 'agreement' && (
            <ProviderAgreement
              providerName={`${state.profile.firstName} ${state.profile.lastName}`}
              providerEmail={state.profile.email}
              onAccept={handleAgreementAccept}
              onBack={goPrev}
            />
          )}

          {state.step === 'preview' && (
            <StepPreview
              profile={state.profile}
              selectedServices={state.selectedServices}
            />
          )}

          {state.step === 'go-live' && (
            <StepGoLive
              profile={state.profile}
              selectedServices={state.selectedServices}
              practiceType={state.practiceType}
              agreementAccepted={!!state.agreementAccepted}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Action Button (not shown on welcome or agreement steps — they have their own) */}
      {state.step !== 'welcome' && state.step !== 'agreement' && state.step !== 'go-live' && (
        <div className="px-5 pt-4 pb-6 sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100">
          <button
            onClick={goNext}
            disabled={!canProceed}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              canProceed
                ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Go Live final button */}
      {state.step === 'go-live' && (
        <div className="px-5 pt-4 pb-6">
          <button
            onClick={() => onComplete?.(state)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
