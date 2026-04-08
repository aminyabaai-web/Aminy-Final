// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderPracticeLaunch — Elite "Practice-in-a-Box" Onboarding Wizard
 *
 * 7 steps: Profile → Availability → Services → Telehealth → Cash-Pay → Insurance → First Client Match
 * Completion: "Your practice is live on Aminy!" celebration with confetti
 *
 * Screen name: 'provider-practice-launch'
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  Upload,
  Video,
  DollarSign,
  Shield,
  Users,
  Star,
  Zap,
  Phone,
  Globe,
  Heart,
  Brain,
  MessageSquare,
  Award,
  CheckCircle,
  Sparkles,
  Play,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

type WizardStep =
  | 'profile'
  | 'availability'
  | 'services'
  | 'telehealth'
  | 'cash-pay'
  | 'insurance'
  | 'first-client'
  | 'done';

const STEPS: WizardStep[] = ['profile', 'availability', 'services', 'telehealth', 'cash-pay', 'insurance', 'first-client', 'done'];

const STEP_META: Record<WizardStep, { label: string; icon: React.ElementType; description: string }> = {
  profile: { label: 'Profile', icon: Users, description: 'Tell families about you' },
  availability: { label: 'Schedule', icon: CheckCircle, description: 'Set your open hours' },
  services: { label: 'Services', icon: Heart, description: 'What you offer' },
  telehealth: { label: 'Telehealth', icon: Video, description: 'Virtual session setup' },
  'cash-pay': { label: 'Rates', icon: DollarSign, description: 'Set your pricing' },
  insurance: { label: 'Insurance', icon: Shield, description: 'Accepted payers' },
  'first-client': { label: 'Match', icon: Star, description: 'Meet your first client' },
  done: { label: 'Live!', icon: Zap, description: 'Practice is live' },
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm'];

const SERVICES = [
  { id: 'aba-assessment', label: 'ABA Assessment', cpt: '97151', category: 'ABA', rate: 350 },
  { id: 'bcba-session', label: 'BCBA Supervision Session', cpt: '97155', category: 'ABA', rate: 175 },
  { id: 'rbt-supervision', label: 'RBT Supervision', cpt: '97155', category: 'ABA', rate: 120 },
  { id: 'parent-training', label: 'Parent Training (ABA)', cpt: '97156', category: 'ABA', rate: 125 },
  { id: 'mh-therapy', label: 'Mental Health Therapy (60 min)', cpt: '90837', category: 'MH', rate: 180 },
  { id: 'speech-individual', label: 'Speech Therapy (Individual)', cpt: '92507', category: 'Speech', rate: 150 },
  { id: 'speech-group', label: 'Speech Therapy (Group)', cpt: '92508', category: 'Speech', rate: 90 },
  { id: 'ot-evaluation', label: 'OT Evaluation', cpt: '97165', category: 'OT', rate: 275 },
  { id: 'ot-therapy', label: 'OT Therapy Session', cpt: '97530', category: 'OT', rate: 145 },
];

const PAYERS = [
  { id: 'bcbs-az', label: 'BCBS Arizona', logo: '🔵' },
  { id: 'uhc', label: 'UnitedHealthcare', logo: '🟢' },
  { id: 'aetna', label: 'Aetna', logo: '🔴' },
  { id: 'ahcccs', label: 'AHCCCS (Medicaid)', logo: '🟣' },
  { id: 'cigna', label: 'Cigna', logo: '🟠' },
  { id: 'tricare', label: 'TRICARE', logo: '🟤' },
  { id: 'humana', label: 'Humana', logo: '🟡' },
  { id: 'magellan', label: 'Magellan', logo: '⚫' },
];

const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Arabic', 'Vietnamese', 'ASL', 'Portuguese', 'Hindi'];

const SPECIALTIES = [
  'Autism Spectrum Disorder', 'ADHD', 'Anxiety', 'Social Skills',
  'Feeding Therapy', 'Executive Functioning', 'Trauma', 'Early Intervention',
  'Parent Training', 'Behavioral Challenges', 'Speech Delays', 'Sensory Processing',
];

const DEMO_FAMILIES = [
  {
    name: 'The Martinez Family',
    child: 'Sofia, age 5',
    need: 'ABA therapy for autism — just diagnosed, eager to start',
    distance: '2.1 miles',
    insurance: 'BCBS Arizona',
    waitTime: 'Ready to book this week',
    avatar: '👧',
    match: 98,
  },
  {
    name: 'The Johnson Family',
    child: 'Ethan, age 7',
    need: 'BCBA supervision + parent training',
    distance: '4.8 miles',
    insurance: 'UHC',
    waitTime: 'Flexible on timing',
    avatar: '👦',
    match: 94,
  },
  {
    name: 'The Patel Family',
    child: 'Aria, age 4',
    need: 'Speech therapy — bilingual household (English/Hindi)',
    distance: '1.3 miles',
    insurance: 'Aetna',
    waitTime: 'Ready to book this week',
    avatar: '👧',
    match: 91,
  },
];

// ============================================================================
// State
// ============================================================================

interface PracticeLaunchState {
  profile: {
    photoBase64: string | null;
    firstName: string;
    lastName: string;
    credentials: string;
    bio: string;
    languages: string[];
    specialties: string[];
    npi: string;
  };
  availability: Record<string, boolean>; // "Mon-8am" → true/false
  selectedServices: string[];
  serviceRates: Record<string, number>;
  telehealthReady: boolean;
  telehealthRoomUrl: string;
  cashPayPreference: 'platform-defaults' | 'custom';
  acceptedPayers: string[];
}

const DEFAULT_STATE: PracticeLaunchState = {
  profile: {
    photoBase64: null,
    firstName: '',
    lastName: '',
    credentials: '',
    bio: '',
    languages: ['English'],
    specialties: [],
    npi: '',
  },
  availability: {},
  selectedServices: [],
  serviceRates: {},
  telehealthReady: false,
  telehealthRoomUrl: 'https://aminy.daily.co/provider-room-demo',
  cashPayPreference: 'platform-defaults',
  acceptedPayers: [],
};

// ============================================================================
// Props
// ============================================================================

interface ProviderPracticeLaunchProps {
  onComplete?: (state: PracticeLaunchState) => void;
  onBack?: () => void;
}

// ============================================================================
// Progress Bar
// ============================================================================

type ActiveStep = Exclude<WizardStep, 'done'>;

function ProgressBar({ current }: { current: WizardStep }) {
  const activeSteps = STEPS.filter((s): s is ActiveStep => s !== 'done');
  const currentIdx = current === 'done' ? -1 : activeSteps.indexOf(current as ActiveStep);
  const pct = currentIdx < 0 ? 100 : ((currentIdx) / (activeSteps.length - 1)) * 100;

  return (
    <div className="px-5 py-3 bg-white border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">
          {current === 'done' ? 'Complete!' : `Step ${currentIdx + 1} of ${activeSteps.length}`}
        </span>
        <span className="text-xs font-semibold text-teal-600">
          {current === 'done' ? '100%' : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: '#43AA8B' }}
          animate={{ width: `${current === 'done' ? 100 : pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        {activeSteps.map((step, i) => {
          const isPast = i < currentIdx;
          const isActive = i === currentIdx;
          const meta = STEP_META[step];
          const Icon = meta.icon;
          return (
            <div key={step} className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isPast ? 'bg-teal-500' : isActive ? 'bg-teal-100 ring-2 ring-teal-500' : 'bg-slate-100'
              }`}>
                {isPast ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <Icon className={`w-3 h-3 ${isActive ? 'text-teal-600' : 'text-slate-300'}`} />
                )}
              </div>
              <span className={`text-[9px] font-medium hidden sm:block ${isActive ? 'text-teal-600' : isPast ? 'text-teal-400' : 'text-slate-300'}`}>
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Step: Profile
// ============================================================================

function StepProfile({
  state,
  onChange,
}: {
  state: PracticeLaunchState;
  onChange: (s: PracticeLaunchState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const p = state.profile;

  const update = (key: keyof typeof p, value: unknown) =>
    onChange({ ...state, profile: { ...p, [key]: value } });

  const toggleArr = (key: 'languages' | 'specialties', val: string) => {
    const arr = p[key];
    update(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('photoBase64', reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Your Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">Families see this when browsing providers</p>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200 cursor-pointer hover:border-teal-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {p.photoBase64 ? (
            <img src={p.photoBase64} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-slate-300" />
          )}
        </div>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-teal-600 font-medium hover:text-teal-700"
          >
            <Upload className="w-4 h-4" />
            Upload photo
          </button>
          <p className="text-xs text-slate-400 mt-0.5">JPG or PNG, up to 5MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">First Name</label>
          <input
            type="text"
            value={p.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Sarah"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Last Name</label>
          <input
            type="text"
            value={p.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Chen"
          />
        </div>
      </div>

      {/* Credentials */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Credentials (e.g. BCBA, LCSW)</label>
        <input
          type="text"
          value={p.credentials}
          onChange={(e) => update('credentials', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="BCBA, M.S."
        />
      </div>

      {/* NPI */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">NPI Number</label>
        <input
          type="text"
          value={p.npi}
          onChange={(e) => update('npi', e.target.value)}
          maxLength={10}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="1234567890"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Bio</label>
        <textarea
          value={p.bio}
          onChange={(e) => update('bio', e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          placeholder="Tell families about your experience, approach, and what makes you passionate about this work..."
        />
        <p className="text-xs text-slate-400 mt-1">{p.bio.length}/400 characters</p>
      </div>

      {/* Languages */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Languages Spoken</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => toggleArr('languages', lang)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                p.languages.includes(lang)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Specialties */}
      <div>
        <label className="text-xs font-medium text-slate-600 mb-2 block">Specialties</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec}
              onClick={() => toggleArr('specialties', spec)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                p.specialties.includes(spec)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step: Availability Grid
// ============================================================================

function StepAvailability({
  state,
  onChange,
}: {
  state: PracticeLaunchState;
  onChange: (s: PracticeLaunchState) => void;
}) {
  const toggle = (day: string, slot: string) => {
    const key = `${day}-${slot}`;
    onChange({
      ...state,
      availability: { ...state.availability, [key]: !state.availability[key] },
    });
  };

  const selected = Object.values(state.availability).filter(Boolean).length;

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Your Availability</h2>
        <p className="text-sm text-slate-500 mt-0.5">Tap slots when you're open. Families can only book during these windows.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-slate-100">
          <div className="p-2" />
          {DAYS.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-slate-600">{day}</div>
          ))}
        </div>

        {/* Time rows */}
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="grid grid-cols-8 border-b border-slate-50 last:border-b-0">
            <div className="p-2 text-xs text-slate-400 font-medium flex items-center">{slot}</div>
            {DAYS.map((day) => {
              const key = `${day}-${slot}`;
              const active = !!state.availability[key];
              return (
                <button
                  key={key}
                  onClick={() => toggle(day, slot)}
                  className={`h-9 border-l border-slate-50 transition-colors ${
                    active ? 'bg-teal-500' : 'hover:bg-teal-50'
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded bg-teal-500" />
        <span className="text-sm text-slate-600">{selected} slot{selected !== 1 ? 's' : ''} selected</span>
      </div>

      {selected === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-amber-500 text-sm mt-0.5">!</span>
          <p className="text-sm text-amber-700">Select at least a few slots so families can book with you.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step: Services
// ============================================================================

function StepServices({
  state,
  onChange,
}: {
  state: PracticeLaunchState;
  onChange: (s: PracticeLaunchState) => void;
}) {
  const toggle = (id: string) => {
    onChange({
      ...state,
      selectedServices: state.selectedServices.includes(id)
        ? state.selectedServices.filter((s) => s !== id)
        : [...state.selectedServices, id],
    });
  };

  const categories = [...new Set(SERVICES.map((s) => s.category))];

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Services Offered</h2>
        <p className="text-sm text-slate-500 mt-0.5">Select everything you offer. Rates are platform defaults — you can adjust in the next step.</p>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{cat}</h3>
          <div className="space-y-2">
            {SERVICES.filter((s) => s.category === cat).map((svc) => {
              const selected = state.selectedServices.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  onClick={() => toggle(svc.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{svc.label}</p>
                    <p className="text-xs text-slate-400">CPT {svc.cpt}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 shrink-0">${svc.rate}/hr</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Step: Telehealth Setup
// ============================================================================

function StepTelehealth({
  state,
  onChange,
}: {
  state: PracticeLaunchState;
  onChange: (s: PracticeLaunchState) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const runTest = async () => {
    setTesting(true);
    setTestResult('idle');
    await new Promise((r) => setTimeout(r, 2000));
    setTesting(false);
    setTestResult('success');
    onChange({ ...state, telehealthReady: true });
    toast.success('Camera and microphone confirmed — telehealth ready!');
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Telehealth Setup</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your private Daily.co room is already configured — just confirm your camera and mic work.</p>
      </div>

      {/* Room info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Video className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Your private room</p>
            <p className="text-xs text-slate-400 font-mono truncate">{state.telehealthRoomUrl}</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {['HIPAA-compliant end-to-end encryption', 'HD video up to 1080p', 'In-session chat + file sharing', 'Automatic recording (with consent)', 'Works on any device, no app required'].map((feat) => (
            <li key={feat} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* Test call */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Test Your Setup</h3>
        </div>
        <p className="text-sm text-slate-500">Run a quick check to make sure your camera and mic are working before your first session.</p>

        {testResult === 'success' ? (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl p-3">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">All systems go — you're telehealth ready!</span>
          </div>
        ) : (
          <button
            onClick={runTest}
            disabled={testing}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#0D1B2A' }}
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking camera & mic...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run test call
              </>
            )}
          </button>
        )}
      </div>

      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
        <p className="text-xs text-blue-700">
          <strong>Privacy note:</strong> Test calls are never recorded and automatically deleted. Your room URL is unique to you and requires authentication.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Step: Cash-Pay Rates
// ============================================================================

function StepCashPay({
  state,
  onChange,
}: {
  state: PracticeLaunchState;
  onChange: (s: PracticeLaunchState) => void;
}) {
  const selectedSvcs = SERVICES.filter((s) => state.selectedServices.includes(s.id));

  const updateRate = (id: string, rate: number) =>
    onChange({ ...state, serviceRates: { ...state.serviceRates, [id]: rate } });

  const getRate = (svc: typeof SERVICES[0]) =>
    state.serviceRates[svc.id] ?? svc.rate;

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Cash-Pay Rates</h2>
        <p className="text-sm text-slate-500 mt-0.5">Set rates within Aminy's standard bands. Aminy takes 35% for cash-pay clients we send you.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
        {(['platform-defaults', 'custom'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onChange({ ...state, cashPayPreference: mode })}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              state.cashPayPreference === mode
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {mode === 'platform-defaults' ? 'Use platform defaults' : 'Set custom rates'}
          </button>
        ))}
      </div>

      {selectedSvcs.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-sm text-amber-700">You haven't selected any services yet. Go back to Step 3 to add services.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedSvcs.map((svc) => {
            const rate = getRate(svc);
            const yourTake = Math.round(rate * 0.65);
            return (
              <div key={svc.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{svc.label}</p>
                    <p className="text-xs text-slate-400">CPT {svc.cpt}</p>
                  </div>
                  {state.cashPayPreference === 'custom' ? (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        value={rate}
                        onChange={(e) => updateRate(svc.id, parseInt(e.target.value) || svc.rate)}
                        min={50}
                        max={500}
                        className="w-20 text-right px-2 py-1 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-slate-900">${rate}/hr</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                  <span>You keep <strong className="text-emerald-600">${yourTake}/hr</strong> (65% after 35% Aminy fee)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step: Insurance Networks
// ============================================================================

function StepInsurance({
  state,
  onChange,
}: {
  state: PracticeLaunchState;
  onChange: (s: PracticeLaunchState) => void;
}) {
  const toggle = (id: string) => {
    onChange({
      ...state,
      acceptedPayers: state.acceptedPayers.includes(id)
        ? state.acceptedPayers.filter((p) => p !== id)
        : [...state.acceptedPayers, id],
    });
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Insurance Networks</h2>
        <p className="text-sm text-slate-500 mt-0.5">Select the payers you're credentialed with. Aminy will verify during onboarding review.</p>
      </div>

      <div className="space-y-2">
        {PAYERS.map((payer) => {
          const selected = state.acceptedPayers.includes(payer.id);
          return (
            <button
              key={payer.id}
              onClick={() => toggle(payer.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selected ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{payer.logo}</span>
              <span className="flex-1 font-medium text-slate-900 text-sm">{payer.label}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
              }`}>
                {selected && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
        <p className="text-xs text-blue-700">
          <strong>Credentialing support:</strong> Aminy's credentialing team can help you get in-network with additional payers. We handle the paperwork — typical timeline is 60–90 days.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Step: First Client Match
// ============================================================================

function StepFirstClient({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Families waiting for you</h2>
        <p className="text-sm text-slate-500 mt-0.5">These families match your specialty and location. Your practice goes live once you complete setup.</p>
      </div>

      <div className="space-y-3">
        {DEMO_FAMILIES.map((family, i) => (
          <motion.div
            key={family.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                {family.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 text-sm">{family.name}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50">{family.match}% match</span>
                </div>
                <p className="text-xs text-slate-500">{family.child}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{family.need}</p>

            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-xs text-slate-600 border border-slate-100">
                {family.distance} away
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-xs text-blue-700 border border-blue-100">
                {family.insurance}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-xs text-emerald-700 border border-emerald-100">
                {family.waitTime}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-sm text-amber-800">
          <strong>These are real families on our waitlist.</strong> Completing your profile takes about 2 more minutes — then you'll appear in search results and can accept booking requests.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-sm flex items-center justify-center gap-2"
        style={{ backgroundColor: '#43AA8B' }}
      >
        Complete setup and go live
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ============================================================================
// Step: Done / Celebration
// ============================================================================

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute top-0 rounded-sm"
      style={{ left: `${x}%`, backgroundColor: color, width: 8, height: 12 }}
      initial={{ y: -20, opacity: 1, rotate: 0, x: 0 }}
      animate={{ y: 400, opacity: 0, rotate: 360 * 3, x: (Math.random() - 0.5) * 100 }}
      transition={{ duration: 2.5 + Math.random() * 1.5, delay, ease: 'easeIn' }}
    />
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    delay: Math.random() * 0.8,
    x: Math.random() * 100,
    color: ['#43AA8B', '#E07A5F', '#577590', '#F8F8F6', '#0D1B2A', '#fbbf24'][Math.floor(Math.random() * 6)],
    id: i,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} delay={p.delay} x={p.x} color={p.color} />
      ))}
    </div>
  );
}

function StepDone({ state, onFinish }: { state: PracticeLaunchState; onFinish: () => void }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const providerName = `${state.profile.firstName || 'Dr.'} ${state.profile.lastName || 'Provider'}`;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {showConfetti && <Confetti />}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl"
        style={{ backgroundColor: '#43AA8B' }}
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-slate-900 mb-2"
      >
        Your practice is live on Aminy!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs"
      >
        {providerName} — families in your area can now find and book with you. Check your dashboard to manage your schedule and incoming requests.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-xs bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 text-left space-y-2.5"
      >
        {[
          `${state.selectedServices.length} services listed`,
          `${Object.values(state.availability).filter(Boolean).length} availability slots open`,
          state.acceptedPayers.length > 0 ? `${state.acceptedPayers.length} insurance networks` : 'Cash-pay only',
          state.telehealthReady ? 'Telehealth confirmed' : 'Telehealth pending setup',
        ].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-slate-700">{item}</span>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.97 }}
        onClick={onFinish}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-base shadow-sm flex items-center justify-center gap-2"
        style={{ backgroundColor: '#0D1B2A' }}
      >
        Go to my dashboard
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}

// ============================================================================
// Main Wizard
// ============================================================================

export function ProviderPracticeLaunch({ onComplete, onBack }: ProviderPracticeLaunchProps) {
  const [step, setStep] = useState<WizardStep>('profile');
  const [state, setState] = useState<PracticeLaunchState>(DEFAULT_STATE);

  const stepIdx = STEPS.indexOf(step);
  const isFirst = step === 'profile';
  const isLast = step === 'first-client';

  const handleNext = () => {
    const nextStep = STEPS[stepIdx + 1];
    if (nextStep) setStep(nextStep);
  };

  const handleBack = () => {
    if (isFirst) {
      onBack?.();
      return;
    }
    const prevStep = STEPS[stepIdx - 1];
    if (prevStep) setStep(prevStep);
  };

  if (step === 'done') {
    return <StepDone state={state} onFinish={() => onComplete?.(state)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={handleBack} className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-500">Practice Launch Wizard</p>
            <p className="text-sm font-semibold text-slate-900">{STEP_META[step].description}</p>
          </div>
          <Award className="w-5 h-5 text-teal-500" />
        </div>
        <ProgressBar current={step} />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 'profile' && <StepProfile state={state} onChange={setState} />}
          {step === 'availability' && <StepAvailability state={state} onChange={setState} />}
          {step === 'services' && <StepServices state={state} onChange={setState} />}
          {step === 'telehealth' && <StepTelehealth state={state} onChange={setState} />}
          {step === 'cash-pay' && <StepCashPay state={state} onChange={setState} />}
          {step === 'insurance' && <StepInsurance state={state} onChange={setState} />}
          {step === 'first-client' && (
            <StepFirstClient onContinue={() => setStep('done')} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav (skip for first-client which has its own CTA) */}
      {step !== 'first-client' && (
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: '#43AA8B' }}
          >
            {isLast ? 'See matching families' : 'Continue'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ProviderPracticeLaunch;
