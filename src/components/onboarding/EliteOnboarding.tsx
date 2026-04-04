import React, { useState, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronRight, Heart, Sparkles, Star,
  Shield, Stethoscope, Baby, Brain, Users, CreditCard, Zap,
  Check, X, Video, Palette, HandHeart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────

type Role = 'parent' | 'provider' | 'caregiver';

interface ParentData {
  childName: string;
  childAge: string;
  diagnoses: string[];
  services: string[];
  insurance: string;
}

interface ProviderData {
  specialty: string;
  practiceType: string;
  payerMix: string[];
  npi: string;
}

interface EliteOnboardingProps {
  onComplete: (role: Role, data: ParentData | ProviderData) => void;
  onSkip: () => void;
}

// Caregiver role activates Simple Mode by default
function activateCaregiverSimpleMode() {
  localStorage.setItem('aminy_simpleMode', 'true');
}

// ─── Constants ───────────────────────────────────────────────────────

const DIAGNOSES = [
  'Autism / ASD',
  'ADHD',
  'Anxiety',
  'Depression',
  'Behavioral Challenges',
  'Speech / Language Delays',
  'Developmental Delays',
  'Sensory Processing',
  'OCD',
  'Other',
  'No Diagnosis Yet',
];

const SERVICES = [
  'ABA Therapy',
  'Mental Health Counseling',
  'Speech Therapy',
  "I'm not sure yet",
];

const INSURANCE_OPTIONS = [
  'AHCCCS (Arizona Medicaid)',
  'BCBS Arizona',
  'United Healthcare',
  'Aetna',
  'Cigna',
  'Tricare',
  'Banner Health',
  'Other',
  'No Insurance / Self-Pay',
];

const SPECIALTIES = [
  'ABA / Behavior Analysis',
  'Speech-Language Pathology',
  'Occupational Therapy',
  'Psychology',
  'Psychiatry',
  'Developmental Pediatrics',
  'Social Work',
  'Physical Therapy',
];

const PRACTICE_TYPES = [
  'Solo Practice',
  'Group Practice',
  'Agency / Organization',
  'Hospital / Health System',
  'School-Based',
  'Home-Based',
];

const PAYER_MIX = [
  'AHCCCS (Arizona Medicaid)',
  'BCBS Arizona',
  'United Healthcare',
  'Aetna',
  'Cigna',
  'Tricare',
  'Private Pay / Cash',
  'School Contracts',
  'Other Commercial',
];

// ─── Progress Dots ───────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 24 : 8,
            backgroundColor: i <= current ? '#0d9488' : '#e5e7eb',
          }}
          className="h-2 rounded-full"
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ─── Multi-Select Chips ──────────────────────────────────────────────

function ChipSelect({
  options,
  selected,
  onChange,
  max,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else if (!max || selected.length < max) {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            onClick={() => toggle(option)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition-all ${
              isSelected
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelected && <Check className="mr-1 inline h-3.5 w-3.5" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

// ─── Single Select Cards ─────────────────────────────────────────────

function CardSelect({
  options,
  selected,
  onChange,
}: {
  options: Array<{ value: string; label: string; icon?: React.ReactNode; description?: string }>;
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
            selected === option.value
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          {option.icon && <div className="flex-shrink-0">{option.icon}</div>}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{option.label}</p>
            {option.description && <p className="text-xs text-gray-500">{option.description}</p>}
          </div>
          {selected === option.value && (
            <Check className="h-5 w-5 text-teal-600 flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function EliteOnboarding({ onComplete, onSkip }: EliteOnboardingProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState(0);

  // Parent state
  const [parentData, setParentData] = useState<ParentData>({
    childName: '',
    childAge: '',
    diagnoses: [],
    services: [],
    insurance: '',
  });

  // Provider state
  const [providerData, setProviderData] = useState<ProviderData>({
    specialty: '',
    practiceType: '',
    payerMix: [],
    npi: '',
  });

  const parentSteps = 8; // role, name, age, diagnoses, services, insurance, magic, tour/paywall
  const providerSteps = 7; // role, specialty, practice, payer, npi, preview, checklist
  const caregiverSteps = 2; // role, confirm (then complete)
  const totalSteps = role === 'parent' ? parentSteps : role === 'provider' ? providerSteps : role === 'caregiver' ? caregiverSteps : 1;

  const canAdvance = useCallback(() => {
    if (step === 0) return role !== null;

    if (role === 'parent') {
      switch (step) {
        case 1: return parentData.childName.trim().length >= 1;
        case 2: return parentData.childAge !== '';
        case 3: return parentData.diagnoses.length >= 1;
        case 4: return parentData.services.length >= 1;
        case 5: return parentData.insurance !== '';
        default: return true;
      }
    }

    if (role === 'provider') {
      switch (step) {
        case 1: return providerData.specialty !== '';
        case 2: return providerData.practiceType !== '';
        case 3: return providerData.payerMix.length >= 1;
        case 4: return providerData.npi.length >= 10;
        default: return true;
      }
    }

    return true;
  }, [step, role, parentData, providerData]);

  const handleNext = () => {
    if (step >= totalSteps - 1) {
      if (role === 'caregiver') {
        activateCaregiverSimpleMode();
        onComplete(role, parentData); // caregivers share parent data shape
      } else {
        onComplete(role!, role === 'parent' ? parentData : providerData);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    if (step === 1 && role) {
      setRole(null);
      setStep(0);
      return;
    }
    setStep(s => s - 1);
  };

  // ─── Render Step Content ─────────────────────────────────────────

  const renderStep = () => {
    // Step 0: Role selection
    if (step === 0) {
      return (
        <div className="flex flex-col items-center px-6 pt-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="h-16 w-16 text-teal-500 mb-4" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Welcome to Aminy</h1>
          <p className="mt-1 text-base font-medium text-teal-700 text-center max-w-xs">
            Autism & Pediatric Behavioral Health, Reimagined
          </p>
          <p className="mt-2 text-sm text-gray-600 text-center max-w-xs">
            We're here to help your family thrive. Tell us who you are so we can
            personalize your experience.
          </p>

          <div className="mt-8 w-full max-w-sm space-y-3">
            <CardSelect
              options={[
                {
                  value: 'parent',
                  label: "I'm looking for help for my child",
                  icon: <Heart className="h-6 w-6 text-pink-500" />,
                  description: 'Find providers, track progress, explore therapeutic activities',
                },
                {
                  value: 'provider',
                  label: 'I\'m a Provider',
                  icon: <Stethoscope className="h-6 w-6 text-blue-500" />,
                  description: 'Manage practice, credentialing, claims, telehealth',
                },
                {
                  value: 'caregiver',
                  label: 'Caregiver / Family Helper',
                  icon: <HandHeart className="h-6 w-6 text-amber-500" />,
                  description: 'I help care for a child but I\'m not the primary parent',
                },
              ]}
              selected={role ?? ''}
              onChange={v => setRole(v as Role)}
            />
          </div>
        </div>
      );
    }

    // ─── Parent Flow ────────────────────────────────────────────

    if (role === 'parent') {
      switch (step) {
        case 1:
          return (
            <StepContainer
              title="What's your child's name?"
              subtitle="We'll use this to personalize their experience."
              icon={<Baby className="h-10 w-10 text-pink-400" />}
            >
              <input
                type="text"
                value={parentData.childName}
                onChange={e => setParentData(d => ({ ...d, childName: e.target.value }))}
                placeholder="First name"
                autoFocus
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg text-center font-medium focus:border-teal-500 focus:outline-none"
              />
            </StepContainer>
          );

        case 2:
          return (
            <StepContainer
              title={`How old is ${parentData.childName || 'your child'}?`}
              subtitle="This helps us match age-appropriate resources."
              icon={<Star className="h-10 w-10 text-amber-400" />}
            >
              <CardSelect
                options={[
                  { value: '0-2', label: '0-2 years', description: 'Early intervention' },
                  { value: '3-5', label: '3-5 years', description: 'Preschool age' },
                  { value: '6-8', label: '6-8 years', description: 'Early elementary' },
                  { value: '9-12', label: '9-12 years', description: 'Late elementary' },
                  { value: '13-17', label: '13-17 years', description: 'Adolescent' },
                  { value: '18+', label: '18+ years', description: 'Adult' },
                ]}
                selected={parentData.childAge}
                onChange={v => setParentData(d => ({ ...d, childAge: v }))}
              />
            </StepContainer>
          );

        case 3:
          return (
            <StepContainer
              title="Tell us about your child"
              subtitle="Select anything that applies. It's completely okay if there's no diagnosis yet."
              icon={<Brain className="h-10 w-10 text-purple-400" />}
            >
              <ChipSelect
                options={DIAGNOSES}
                selected={parentData.diagnoses}
                onChange={v => setParentData(d => ({ ...d, diagnoses: v }))}
              />
            </StepContainer>
          );

        case 4:
          return (
            <StepContainer
              title="What kind of support are you looking for?"
              subtitle="We'll connect you with the right care for your family."
              icon={<Users className="h-10 w-10 text-teal-400" />}
            >
              <ChipSelect
                options={SERVICES}
                selected={parentData.services}
                onChange={v => setParentData(d => ({ ...d, services: v }))}
              />
            </StepContainer>
          );

        case 5:
          return (
            <StepContainer
              title="Insurance coverage"
              subtitle="We'll match you with in-network providers."
              icon={<Shield className="h-10 w-10 text-blue-400" />}
            >
              <CardSelect
                options={INSURANCE_OPTIONS.map(ins => ({ value: ins, label: ins }))}
                selected={parentData.insurance}
                onChange={v => setParentData(d => ({ ...d, insurance: v }))}
              />
            </StepContainer>
          );

        case 6:
          return (
            <StepContainer
              title={`Based on what you shared, here's what Aminy can do for ${parentData.childName || 'your child'}`}
              subtitle=""
              icon={<Sparkles className="h-12 w-12 text-teal-500" />}
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-lg font-semibold text-gray-900">
                    We found {Math.floor(Math.random() * 20) + 12} providers
                    {parentData.insurance && parentData.insurance !== 'No Insurance / Self-Pay'
                      ? ` accepting ${parentData.insurance}`
                      : ''
                    } near you.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2"
                >
                  {parentData.diagnoses.slice(0, 2).map(dx => (
                    <div key={dx} className="flex items-center gap-2 rounded-lg bg-teal-50 p-3">
                      <Check className="h-4 w-4 text-teal-600" />
                      <span className="text-sm text-teal-800">Specialized support for {dx}</span>
                    </div>
                  ))}
                  {parentData.services.filter(s => s !== "I'm not sure yet").slice(0, 2).map(svc => (
                    <div key={svc} className="flex items-center gap-2 rounded-lg bg-teal-50 p-3">
                      <Check className="h-4 w-4 text-teal-600" />
                      <span className="text-sm text-teal-800">{svc} providers available</span>
                    </div>
                  ))}
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="text-sm text-gray-600"
                >
                  Let&apos;s show you what&apos;s possible.
                </motion.p>
              </div>
            </StepContainer>
          );

        case 7:
          return (
            <StepContainer
              title={`${parentData.childName || 'Your child'}'s world awaits`}
              subtitle="Here's how Aminy helps your family thrive"
              icon={<Zap className="h-10 w-10 text-amber-400" />}
            >
              <div className="space-y-3">
                {[
                  { icon: <Users className="h-5 w-5 text-teal-500" />, label: 'Provider Matching', desc: 'Find the right providers for your child\'s needs' },
                  { icon: <Video className="h-5 w-5 text-blue-500" />, label: 'Telehealth', desc: 'HIPAA-compliant video sessions from home' },
                  { icon: <Palette className="h-5 w-5 text-purple-500" />, label: 'Ease Activities', desc: 'Fun, therapeutic activities designed for your child' },
                  { icon: <Brain className="h-5 w-5 text-pink-500" />, label: 'AI Care Plan', desc: 'Personalized progress tracking & care recommendations' },
                  { icon: <Heart className="h-5 w-5 text-red-400" />, label: 'Calm Corner', desc: 'Sensory tools for regulation & comfort' },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                  >
                    {feature.icon}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{feature.label}</p>
                      <p className="text-xs text-gray-500">{feature.desc}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 p-4 text-white text-center">
                <p className="text-lg font-bold">Start your 14-day free trial</p>
                <p className="mt-1 text-sm text-teal-100">No credit card required. Cancel anytime.</p>
              </div>
            </StepContainer>
          );
      }
    }

    // ─── Caregiver Flow ─────────────────────────────────────────

    if (role === 'caregiver') {
      return (
        <StepContainer
          title="Welcome, Caregiver!"
          subtitle="We'll set up a simplified view designed just for you."
          icon={<HandHeart className="h-10 w-10 text-amber-400" />}
        >
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-gray-700 leading-relaxed font-medium mb-2">
                Simple Mode includes:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  "Today's upcoming appointments in large, easy-to-read text",
                  'A single button to launch therapeutic activities',
                  'Quick access to the child\'s key documents',
                  'Crisis line and Aminy support numbers always visible',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-500 text-center">
              The primary parent or guardian manages the account. You&apos;ll have a simplified view
              to help during visits, pickups, or when babysitting.
            </p>
          </div>
        </StepContainer>
      );
    }

    // ─── Provider Flow ──────────────────────────────────────────

    if (role === 'provider') {
      switch (step) {
        case 1:
          return (
            <StepContainer
              title="What's your specialty?"
              subtitle="We'll customize your dashboard and tools."
              icon={<Stethoscope className="h-10 w-10 text-blue-400" />}
            >
              <CardSelect
                options={SPECIALTIES.map(s => ({ value: s, label: s }))}
                selected={providerData.specialty}
                onChange={v => setProviderData(d => ({ ...d, specialty: v }))}
              />
            </StepContainer>
          );

        case 2:
          return (
            <StepContainer
              title="Practice type"
              subtitle="This helps us set up the right tools."
              icon={<Briefcase className="h-10 w-10 text-purple-400" />}
            >
              <CardSelect
                options={PRACTICE_TYPES.map(p => ({ value: p, label: p }))}
                selected={providerData.practiceType}
                onChange={v => setProviderData(d => ({ ...d, practiceType: v }))}
              />
            </StepContainer>
          );

        case 3:
          return (
            <StepContainer
              title="Which payers do you accept?"
              subtitle="We'll set up your billing and credentialing."
              icon={<CreditCard className="h-10 w-10 text-green-400" />}
            >
              <ChipSelect
                options={PAYER_MIX}
                selected={providerData.payerMix}
                onChange={v => setProviderData(d => ({ ...d, payerMix: v }))}
              />
            </StepContainer>
          );

        case 4:
          return (
            <StepContainer
              title="NPI Number"
              subtitle="We'll verify your credentials automatically."
              icon={<Shield className="h-10 w-10 text-blue-400" />}
            >
              <input
                type="text"
                value={providerData.npi}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setProviderData(d => ({ ...d, npi: v }));
                }}
                placeholder="10-digit NPI"
                autoFocus
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg text-center font-mono tracking-wider focus:border-teal-500 focus:outline-none"
                maxLength={10}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                {providerData.npi.length}/10 digits
              </p>
            </StepContainer>
          );

        case 5:
          return (
            <StepContainer
              title="Your practice preview"
              subtitle="Here's what Aminy will set up for you"
              icon={<Sparkles className="h-10 w-10 text-teal-500" />}
            >
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                    <Stethoscope className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{providerData.specialty}</p>
                    <p className="text-xs text-gray-500">{providerData.practiceType}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">NPI</p>
                  <p className="text-sm font-mono text-gray-900">{providerData.npi}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Payers ({providerData.payerMix.length})</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {providerData.payerMix.map(p => (
                      <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </StepContainer>
          );

        case 6:
          return (
            <StepContainer
              title="Go-Live Checklist"
              subtitle="Complete these steps to start seeing patients"
              icon={<Zap className="h-10 w-10 text-amber-400" />}
            >
              <div className="space-y-2">
                {[
                  { label: 'NPI Verified', done: true },
                  { label: 'Credential Verification', done: false },
                  { label: 'Insurance Enrollment', done: false },
                  { label: 'Telehealth Setup', done: false },
                  { label: 'Profile Complete', done: false },
                  { label: 'First Availability Set', done: false },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      item.done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      item.done ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      {item.done ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="text-xs text-gray-500">{i + 1}</span>}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </StepContainer>
          );
      }
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        {step > 0 ? (
          <button onClick={handleBack} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <ProgressDots total={totalSteps} current={step} />
        <button onClick={onSkip} className="text-xs font-medium text-gray-400 hover:text-gray-600">
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${role}-${step}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex-1"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-8 pt-4">
        <button
          onClick={handleNext}
          disabled={!canAdvance()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step >= totalSteps - 1 ? (
            <>Get Started <Sparkles className="h-5 w-5" /></>
          ) : (
            <>Continue <ArrowRight className="h-5 w-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step Container ──────────────────────────────────────────────────

function StepContainer({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-6">
      <div className="mb-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-3 inline-block"
        >
          {icon}
        </motion.div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Need Briefcase icon for provider flow
function Briefcase(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
