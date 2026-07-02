/**
 * GrantNavigator — Funding finder for ABA & behavioral health families
 *
 * Pro-tier feature. Sections:
 * 1. Quick Finder    — state + need + insurance status form
 * 2. Results         — 5-6 funding categories tailored to input
 * 3. Appeal Letter   — care-team-assisted appeal (AI auto-draft is beta/coming soon)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Lock,
  Search,
  FileText,
  DollarSign,
  Shield,
  BookOpen,
  Heart,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface GrantNavigatorProps {
  onBack: () => void;
  onUpgrade: () => void;
  userTier: string;
  userState?: string;
}

type Need = 'aba' | 'speech' | 'mental-health' | 'multiple';
type InsuranceStatus = 'private' | 'medicaid' | 'uninsured' | 'multiple';

interface FundingResult {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  learnMoreUrl?: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const STATE_WAIVER_NAMES: Record<string, string> = {
  'Arizona': 'DDD Developmental Disabilities Waiver',
  'California': 'Regional Center Waiver (Lanterman Act)',
  'Texas': 'Home and Community-Based Services (HCS) Waiver',
  'Florida': 'iBudget Florida Waiver',
  'New York': 'OPWDD Waiver',
  'Colorado': 'Developmental Disabilities Waiver',
  'Illinois': 'Home Services Program Waiver',
  'Washington': 'DDA Community Protection Waiver',
  'Oregon': 'Oregon Developmental Disability Services Waiver',
  'Georgia': 'New Options Waiver (NOW)',
};

const NONPROFITS = [
  {
    name: 'Autism Speaks',
    url: 'https://www.autismspeaks.org',
    desc: 'Grants, resource guides, and Insurance Resource Center',
  },
  {
    name: 'The Autism Society',
    url: 'https://www.autism-society.org',
    desc: 'Local chapter support and funding navigation',
  },
  {
    name: 'Doug Flutie Jr. Foundation',
    url: 'https://www.flutiefoundation.org',
    desc: 'Direct financial assistance for autism families',
  },
  {
    name: 'ACT Today',
    url: 'https://www.act-today.org',
    desc: 'Grants directly to families for therapy costs',
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function buildResults(
  state: string,
  need: Need,
  insurance: InsuranceStatus,
): FundingResult[] {
  const results: FundingResult[] = [];

  // 1. State Medicaid Waiver
  const waiverName = STATE_WAIVER_NAMES[state] || 'Developmental Disabilities Waiver';
  results.push({
    id: 'state-waiver',
    title: `${state} ${waiverName}`,
    subtitle: 'State Medicaid Waiver',
    description:
      `Many states fund ABA and behavioral health through Medicaid waivers. ` +
      `Contact your state's developmental disabilities division to apply — ` +
      `waitlists exist but early enrollment is critical.`,
    icon: <Shield className="w-5 h-5" />,
    accentColor: '#2A7D99',
  });

  // 2. Insurance appeal (if private insurance)
  if (insurance === 'private' || insurance === 'multiple') {
    results.push({
      id: 'insurance-appeal',
      title: 'Insurance Appeal Rights',
      subtitle: 'Private Insurance',
      description:
        `If your insurer denied ABA or behavioral health coverage, you have the right to appeal. ` +
        `Federal mental health parity laws (MHPAEA) require insurers to cover behavioral health ` +
        `comparably to medical/surgical benefits. Most appeals succeed with proper documentation.`,
      icon: <FileText className="w-5 h-5" />,
      accentColor: '#77B5D9',
    });
  }

  // 3. IDEA / School funding
  results.push({
    id: 'idea',
    title: 'School-District Services (IDEA)',
    subtitle: 'Federal Education Law',
    description:
      `Under the Individuals with Disabilities Education Act (IDEA), your school district ` +
      `must provide a Free Appropriate Public Education (FAPE). Request an IEP evaluation ` +
      `in writing — the district has 60 days to respond.`,
    icon: <BookOpen className="w-5 h-5" />,
    accentColor: '#9B8EC4',
  });

  // 4. Nonprofit grants
  results.push({
    id: 'nonprofits',
    title: 'Nonprofit Grants & Assistance',
    subtitle: '4 organizations to contact',
    description:
      `Several nonprofits offer direct financial assistance, resource guides, and grant programs ` +
      `for families navigating ABA and behavioral health costs.`,
    icon: <Heart className="w-5 h-5" />,
    accentColor: '#E8A598',
    learnMoreUrl: undefined,
  });

  // 5. Aminy sliding scale
  results.push({
    id: 'aminy-sliding-scale',
    title: 'Aminy Cash-Pay Rates',
    subtitle: 'Platform Discount',
    description:
      `Aminy's cash-pay rates are 30–40% below market average. If you're uninsured or ` +
      `between coverage, ask your Aminy provider about sliding-scale options. ` +
      `Flexible payment plans available at checkout.`,
    icon: <DollarSign className="w-5 h-5" />,
    accentColor: '#F7D9A0',
  });

  // 6. Uninsured-specific
  if (insurance === 'uninsured' || insurance === 'multiple') {
    results.push({
      id: 'community-health',
      title: 'Federally Qualified Health Centers',
      subtitle: 'Sliding-Scale Community Care',
      description:
        `FQHCs serve patients regardless of ability to pay, using a sliding-fee scale. ` +
        `HRSA's Find a Health Center tool can locate the nearest FQHC with behavioral health services.`,
      icon: <Heart className="w-5 h-5" />,
      accentColor: '#7CBB9B',
    });
  }

  return results;
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          style={{ background: '#1a3a5c', border: '1px solid #2A7D9944' }}
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: '#2A7D99' }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: FundingResult }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#1a3a5c', border: `1px solid ${result.accentColor}44` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${result.accentColor}22`, color: result.accentColor }}
        >
          {result.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">{result.title}</p>
          <p className="text-sm mt-0.5" style={{ color: result.accentColor }}>{result.subtitle}</p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">{result.description}</p>

              {/* Nonprofit sub-list */}
              {result.id === 'nonprofits' && (
                <div className="space-y-2">
                  {NONPROFITS.map(np => (
                    <div
                      key={np.name}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: '#ffffff08' }}
                    >
                      <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E8A598' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{np.name}</p>
                        <p className="text-sm text-slate-400 mt-0.5">{np.desc}</p>
                        <a
                          href={np.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm flex items-center gap-1 mt-1"
                          style={{ color: '#2A7D99' }}
                          onClick={e => e.stopPropagation()}
                        >
                          Visit site <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AppealLetterSection() {
  const [insurerName, setInsurerName] = useState('');
  const [deniedService, setDeniedService] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleGenerate = () => {
    if (!insurerName || !deniedService) return;
    setSubmitted(true);
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: '#1a3a5c', border: '1px solid #9B8EC444' }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" style={{ color: '#9B8EC4' }} />
        <h3 className="font-semibold text-white">Appeal Letter Help</h3>
        <span
          className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: '#9B8EC433', color: '#9B8EC4' }}
        >
          Beta
        </span>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">
        Tell us about your denial and we'll connect you with our care team to help draft a
        customized insurance appeal letter. AI-generated drafts are coming soon.
      </p>

      {!submitted ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-400">Insurance company name</label>
            <input
              value={insurerName}
              onChange={e => setInsurerName(e.target.value)}
              placeholder="e.g. Blue Cross Blue Shield"
              className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ background: '#0D1B2A', border: '1px solid #9B8EC444' }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-400">Service that was denied</label>
            <input
              value={deniedService}
              onChange={e => setDeniedService(e.target.value)}
              placeholder="e.g. ABA Therapy, 30 hours/week"
              className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ background: '#0D1B2A', border: '1px solid #9B8EC444' }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-400">Child's diagnosis or concern (optional)</label>
            <input
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="e.g. Autism Spectrum Disorder, Level 2"
              className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
              style={{ background: '#0D1B2A', border: '1px solid #9B8EC444' }}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!insurerName || !deniedService}
            className="w-full py-3 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #9B8EC4, #77B5D9)' }}
          >
            <Sparkles className="w-4 h-4" />
            Request Appeal-Letter Help
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#9B8EC422', border: '1px solid #9B8EC444' }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#9B8EC4' }} />
            <div>
              <p className="font-semibold text-white text-sm">Let's get your appeal started</p>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Fully automated AI drafts are still in beta review. For now, Aminy's care team
                will help you draft your appeal — email{' '}
                <a
                  href={`mailto:support@aminy.ai?subject=${encodeURIComponent('Appeal letter help')}&body=${encodeURIComponent(
                    `Insurance company: ${insurerName}\nService denied: ${deniedService}\nDiagnosis/concern: ${diagnosis || '(not provided)'}`,
                  )}`}
                  className="underline"
                  style={{ color: '#9B8EC4' }}
                >
                  support@aminy.ai
                </a>{' '}
                and we'll send a customized letter back, usually within one business day.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="text-sm underline"
            style={{ color: '#9B8EC4' }}
          >
            Try again
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function GrantNavigator({
  onBack,
  onUpgrade,
  userTier,
  userState,
}: GrantNavigatorProps) {
  const isPro = userTier === 'pro' || userTier === 'proplus' || userTier === 'pro_plus';

  const [state, setState] = useState(userState || '');
  const [need, setNeed] = useState<Need | ''>('');
  const [insurance, setInsurance] = useState<InsuranceStatus | ''>('');
  const [results, setResults] = useState<FundingResult[] | null>(null);

  const handleFind = () => {
    if (!state || !need || !insurance) return;
    setResults(buildResults(state, need as Need, insurance as InsuranceStatus));
  };

  const handleReset = () => {
    setResults(null);
  };

  // ── Paywall gate ──
  if (!isPro) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: '#F6FBFB', color: '#132F43', maxWidth: 430, margin: '0 auto' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 pb-4"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}
        >
          <button
            onClick={onBack}
            className="p-2 rounded-xl"
            style={{ background: '#FFFFFF', border: '1px solid #E8E4DF' }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#132F43' }} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold" style={{ color: '#132F43' }}>Grant Navigator</h1>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Upgrade prompt */}
        <div className="flex flex-col items-center justify-center flex-1 px-5">
          <div
            className="w-full rounded-2xl p-6 flex flex-col items-center gap-6 text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8E4DF',
              boxShadow: '0 4px 24px rgba(19, 47, 67, 0.06)',
            }}
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(42, 125, 153, 0.10)' }}
            >
              <Lock className="w-10 h-10" style={{ color: '#2A7D99' }} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase" style={{ color: '#2A7D99', letterSpacing: '0.1em' }}>
                Pro Feature
              </p>
              <h2 className="text-2xl font-bold" style={{ color: '#132F43' }}>Find Funding for Care</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#5A6B7A' }}>
                Grant Navigator helps you find Medicaid waivers, nonprofit grants, IDEA funding,
                and appeal insurance denials — personalized to your state and situation.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg"
              style={{ background: '#2A7D99' }}
            >
              Upgrade to Pro
            </button>
            <button onClick={onBack} className="text-sm underline" style={{ color: '#5A6B7A' }}>
              Not now
            </button>
          </div>
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 16px)', minHeight: 16 }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0D1B2A', color: '#fff', maxWidth: 430, margin: '0 auto' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pb-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}
      >
        <button
          onClick={results ? handleReset : onBack}
          className="p-2 rounded-xl"
          style={{ background: '#ffffff18' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold text-white">Grant Navigator</h1>
          <p className="text-sm" style={{ color: '#2A7D99' }}>Pro</p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        <AnimatePresence mode="wait">
          {!results ? (
            /* ── QUICK FINDER FORM ── */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4"
            >
              {/* Hero */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{ background: 'linear-gradient(135deg, #2A7D9922, #77B5D922)', border: '1px solid #2A7D9933' }}
              >
                <div className="text-3xl mb-2">💰</div>
                <h2 className="font-bold text-white">Find Funding Options</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Personalized to your state, therapy needs, and insurance status
                </p>
              </div>

              {/* Form */}
              <div
                className="rounded-2xl p-4 space-y-4"
                style={{ background: '#1a3a5c', border: '1px solid #2A7D9922' }}
              >
                <SelectField
                  label="Your state"
                  value={state}
                  onChange={setState}
                  placeholder="Select your state"
                  options={US_STATES.map(s => ({ value: s, label: s }))}
                />

                <SelectField
                  label="Primary therapy need"
                  value={need}
                  onChange={v => setNeed(v as Need | '')}
                  placeholder="Select therapy type"
                  options={[
                    { value: 'aba', label: 'ABA Therapy' },
                    { value: 'speech', label: 'Speech Therapy' },
                    { value: 'mental-health', label: 'Mental Health' },
                    { value: 'multiple', label: 'Multiple Needs' },
                  ]}
                />

                <SelectField
                  label="Insurance status"
                  value={insurance}
                  onChange={v => setInsurance(v as InsuranceStatus | '')}
                  placeholder="Select insurance status"
                  options={[
                    { value: 'private', label: 'Insured (Private)' },
                    { value: 'medicaid', label: 'Medicaid' },
                    { value: 'uninsured', label: 'Uninsured' },
                    { value: 'multiple', label: 'Multiple / Unsure' },
                  ]}
                />

                <button
                  onClick={handleFind}
                  disabled={!state || !need || !insurance}
                  className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #2A7D99, #77B5D9)' }}
                >
                  <Search className="w-5 h-5" />
                  Find Funding Options
                </button>
              </div>

              {/* Disclaimer */}
              <p className="text-sm text-[#5A6B7A] text-center px-2 leading-relaxed">
                Information is for guidance only. Eligibility and availability vary.
                Consult a benefits specialist for personalized advice.
              </p>
            </motion.div>
          ) : (
            /* ── RESULTS ── */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4"
            >
              {/* Summary bar */}
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: '#2A7D9922', border: '1px solid #2A7D9944' }}
              >
                <div className="text-2xl">🔍</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{state}</p>
                  <p className="text-sm text-slate-400 truncate">
                    {results.length} funding options found
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{ background: '#ffffff18', color: '#94a3b8' }}
                >
                  Edit
                </button>
              </div>

              {/* Result cards */}
              {results.map((result, i) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <ResultCard result={result} />
                </motion.div>
              ))}

              {/* Appeal letter section */}
              <AppealLetterSection />

              {/* Disclaimer */}
              <p className="text-sm text-[#5A6B7A] text-center px-2 leading-relaxed">
                Information is for guidance only. Eligibility and availability vary.
                Consult a benefits specialist for personalized advice.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ height: 'env(safe-area-inset-bottom, 16px)', minHeight: 16 }} />
    </div>
  );
}
