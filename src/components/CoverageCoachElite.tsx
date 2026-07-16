// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CoverageCoachElite — Conversational, warm, best-in-class coverage guidance
 * One question at a time. No forms. Human language throughout.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Shield,
  Camera,
  DollarSign,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Phone,
  FileText,
  CreditCard,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';

interface CoverageCoachEliteProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

type CoverageAnswer = 'yes' | 'no' | 'dont-know' | null;

interface OOPCalc {
  deductibleMet: string;
  copay: string;
  sessionsPerMonth: string;
}

// ─── Medicaid Waiver Data ─────────────────────────────────────────────

interface WaiverProgram {
  name: string;
  code: string;
  eligibility: string[];
  services: string[];
  waitlistMonths: string;
  tip: string;
}

const AZ_WAIVER_PROGRAMS: WaiverProgram[] = [
  {
    name: 'ALTCS-DD (Arizona Long Term Care System)',
    code: 'ALTCS-DD',
    eligibility: [
      'Child has a qualifying developmental disability (autism, intellectual disability, cerebral palsy, epilepsy)',
      'Disability occurred before age 18',
      'Meets institutional level of care criteria',
      'Arizona resident',
    ],
    services: ['ABA therapy', 'Speech therapy', 'OT', 'Respite care', 'Habilitation', 'Day programs', 'Attendant care'],
    waitlistMonths: '3-12 months',
    tip: 'Apply through DES/DDD (Division of Developmental Disabilities). Having a formal diagnosis on file speeds up the process.',
  },
  {
    name: 'DES/DDD (Division of Developmental Disabilities)',
    code: 'DES-DDD',
    eligibility: [
      'Child has autism, intellectual disability, cerebral palsy, or epilepsy',
      'Diagnosis must be documented by a qualified professional',
      'Arizona resident',
    ],
    services: ['Behavioral health services', 'Therapist services', 'Respite care', 'Family support', 'Day treatment'],
    waitlistMonths: '2-6 months',
    tip: 'Even if you have private insurance, DDD can provide additional services. Apply early — the intake process can take time.',
  },
  {
    name: 'CMDP (Comprehensive Medical and Dental Program)',
    code: 'CMDP',
    eligibility: [
      'Child is in foster care or adoption subsidy',
      'Arizona resident',
    ],
    services: ['All medically necessary services', 'ABA therapy', 'Speech', 'OT', 'PT', 'Mental health', 'Dental'],
    waitlistMonths: 'No waitlist — automatic enrollment',
    tip: 'If your child is in the foster care system, they may already be enrolled. Check with your caseworker.',
  },
  {
    name: 'KidsCare (CHIP)',
    code: 'KidsCare',
    eligibility: [
      'Family income 138-200% of Federal Poverty Level',
      'Child is under 19',
      'Not eligible for AHCCCS',
      'Arizona resident',
    ],
    services: ['Doctor visits', 'Behavioral health', 'Therapy services', 'Prescriptions', 'Hospital care'],
    waitlistMonths: '1-2 months',
    tip: 'Low-cost option for families who make too much for Medicaid but can\'t afford private insurance.',
  },
];

// ─── "Is This Covered?" Quick Lookup ──────────────────────────────────

interface CoverageItem {
  service: string;
  typicallyCovered: boolean;
  cptCodes: string[];
  notes: string;
  authRequired: boolean;
}

const COVERAGE_LOOKUP: CoverageItem[] = [
  {
    service: 'ABA Therapy (1:1 with RBT)',
    typicallyCovered: true,
    cptCodes: ['97153'],
    notes: 'Covered under most commercial plans and Medicaid per Mental Health Parity Act. Requires prior authorization.',
    authRequired: true,
  },
  {
    service: 'BCBA Assessment / Treatment Plan',
    typicallyCovered: true,
    cptCodes: ['97151', '97155'],
    notes: 'Initial assessment and ongoing supervision are typically covered. May have annual limits.',
    authRequired: true,
  },
  {
    service: 'Parent Training (BCBA-led)',
    typicallyCovered: true,
    cptCodes: ['97156'],
    notes: 'Most plans cover parent training as part of ABA. Some limit to 2-4 sessions/month.',
    authRequired: false,
  },
  {
    service: 'Speech Therapy',
    typicallyCovered: true,
    cptCodes: ['92507', '92523'],
    notes: 'Widely covered. Some plans limit to 20-30 sessions/year. Check your specific plan.',
    authRequired: false,
  },
  {
    service: 'Occupational Therapy',
    typicallyCovered: true,
    cptCodes: ['97530', '97165', '97166'],
    notes: 'Usually covered with visit limits. Sensory integration may require separate justification.',
    authRequired: false,
  },
  {
    service: 'Psychological/Neuropsych Evaluation',
    typicallyCovered: true,
    cptCodes: ['96130', '96131', '96136'],
    notes: 'Covered for diagnostic purposes. May have lifetime limits on re-evaluations.',
    authRequired: true,
  },
  {
    service: 'Telehealth Sessions',
    typicallyCovered: true,
    cptCodes: ['97153-95', '92507-95'],
    notes: 'Most plans now cover telehealth at parity with in-person. Modifier 95 indicates synchronous telehealth.',
    authRequired: false,
  },
  {
    service: 'Respite Care',
    typicallyCovered: false,
    cptCodes: [],
    notes: 'Not typically covered by commercial insurance. May be available through Medicaid waivers (ALTCS-DD, DDD).',
    authRequired: false,
  },
  {
    service: 'Social Skills Groups',
    typicallyCovered: false,
    cptCodes: ['97154'],
    notes: 'Group ABA (97154) may be covered, but recreational social skills groups typically are not. Check your plan.',
    authRequired: true,
  },
];

export function CoverageCoachElite({ onBack, onNavigate }: CoverageCoachEliteProps) {
  const [coverageAnswer, setCoverageAnswer] = useState<CoverageAnswer>(null);
  const [step, setStep] = useState<'lead' | 'flow' | 'calc' | 'waiver' | 'lookup'>('lead');
  const [oopCalc, setOopCalc] = useState<OOPCalc>({ deductibleMet: '', copay: '', sessionsPerMonth: '4' });
  const [showCalc, setShowCalc] = useState(false);
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const [expandedWaiver, setExpandedWaiver] = useState<string | null>(null);
  const [lookupSearch, setLookupSearch] = useState('');

  const handleCoverageAnswer = (answer: CoverageAnswer) => {
    setCoverageAnswer(answer);
    setStep('flow');
  };

  const calcOOP = () => {
    const deductible = parseFloat(oopCalc.deductibleMet) || 0;
    const copay = parseFloat(oopCalc.copay) || 30;
    const sessions = parseFloat(oopCalc.sessionsPerMonth) || 4;
    // Simplified: after deductible met, just copay per session
    const monthlyOOP = copay * sessions;
    setCalcResult(monthlyOOP);
  };

  return (
    <div className="min-h-screen bg-mist" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} aria-label="Back" className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#EDF4F7] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#2A7D99]/10 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#2A7D99]" />
            </div>
            <h1 className="text-base font-semibold text-[#132F43]">Coverage Coach</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-16">

        {/* STEP: Lead Question */}
        {step === 'lead' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Big question */}
            <div className="text-center mb-8 pt-4">
              <div className="w-14 h-14 bg-[#2A7D99]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-[#2A7D99]" />
              </div>
              <h2 className="text-2xl font-bold text-[#132F43] mb-3">
                Does your insurance cover behavior therapy?
              </h2>
              <p className="text-[#5A6B7A] text-sm leading-relaxed">
                Most plans do — but navigating it can feel like a maze. Let's figure it out together in 3 minutes.
              </p>
            </div>

            {/* Answer cards */}
            <div className="space-y-3 mb-8">
              <button
                onClick={() => handleCoverageAnswer('yes')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 p-4 bg-white border border-[#E8E4DF] rounded-xl hover:border-[#2A7D99]/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#132F43] text-sm">Yes, I believe so</div>
                    <div className="text-sm text-slate-400 mt-0.5">Let's maximize your benefits</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-primary transition-colors" />
                </div>
              </button>

              <button
                onClick={() => handleCoverageAnswer('no')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 p-4 bg-white border border-[#E8E4DF] rounded-xl hover:border-orange-300 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#132F43] text-sm">No, it doesn't</div>
                    <div className="text-sm text-slate-400 mt-0.5">Let's explore your options</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-orange-400 transition-colors" />
                </div>
              </button>

              <button
                onClick={() => handleCoverageAnswer('dont-know')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 p-4 bg-white border border-[#E8E4DF] rounded-xl hover:border-blue-300 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-[#EEF4F8] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <HelpCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#132F43] text-sm">I'm not sure</div>
                    <div className="text-sm text-slate-400 mt-0.5">We'll help you find out in 3 minutes</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-blue-400 transition-colors" />
                </div>
              </button>
            </div>

            {/* Insurance card scan prompt */}
            <Card className="p-4 border-dashed border-[#E8E4DF] bg-white text-center">
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#5A6B7A] mb-1">Scan your insurance card</p>
              <p className="text-sm text-slate-400 mb-3">We'll pre-fill your plan details automatically</p>
              <Button variant="outline" size="sm" className="text-sm" onClick={() => toast.info('Camera access coming soon')}>
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Open Camera
              </Button>
            </Card>
          </motion.div>
        )}

        {/* STEP: Flow based on answer */}
        <AnimatePresence mode="wait">
          {step === 'flow' && coverageAnswer === 'yes' && (
            <motion.div
              key="yes-flow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              {/* Back button */}
              <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-[#5A6B7A] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-bold text-[#132F43]">Great! Let's maximize your benefits.</h2>
              </div>

              {/* Benefits breakdown in plain English */}
              <Card className="p-5 bg-white border-[#E8E4DF] mb-4">
                <h3 className="font-semibold text-[#132F43] mb-3 text-sm">Your estimated behavior therapy coverage</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-[#5A6B7A] leading-relaxed">
                      <strong className="text-[#132F43]">60 behavior therapy sessions per year</strong> — You've used 12 so far. That's <strong>48 sessions remaining</strong> — about 3 months of weekly therapy.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-[#5A6B7A] leading-relaxed">
                      <strong className="text-[#132F43]">$25 copay per session</strong> after deductible is met.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-[#5A6B7A] leading-relaxed">
                      <strong className="text-[#132F43]">Prior authorization required</strong> — Most plans need pre-approval before behavior therapy starts. We'll handle the paperwork.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Prior auth explainer */}
              <Card className="p-5 bg-amber-50 border-amber-100 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 text-sm mb-1">What is prior authorization?</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Behavior therapy usually needs pre-approval from your insurance company before you can start. Think of it as getting a green light before scheduling. <strong>Aminy helps you get that approval</strong> — we handle the forms and follow up.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Superbill explainer */}
              <Card className="p-5 bg-[#EEF4F8] border-blue-100 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm mb-1">What about out-of-network providers?</h4>
                    <p className="text-sm text-[#4A6478] leading-relaxed">
                      Even if a provider isn't in your network, you may get reimbursed. We'll generate a <strong>superbill</strong> — a special receipt — you submit to your insurance for partial reimbursement. Many families get 40–70% back.
                    </p>
                  </div>
                </div>
              </Card>

              {/* HSA/FSA */}
              <Card className="p-4 bg-[#2A7D99]/10 border-[#E8E4DF] mb-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#2A7D99] flex-shrink-0" />
                  <p className="text-sm text-[#2A7D99]">
                    <strong>Therapy is HSA/FSA eligible.</strong> You can use those funds here — it's pre-tax money that stretches further.
                  </p>
                </div>
              </Card>

              {/* OOP Calculator */}
              <div className="mb-6">
                <button
                  onClick={() => setShowCalc(!showCalc)}
                  className="flex items-center gap-2 text-sm font-semibold text-[#3A4A57] mb-3 hover:text-[#2A7D99] transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  What's my out-of-pocket cost per session?
                  <ChevronRight className={`w-4 h-4 transition-transform ${showCalc ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {showCalc && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Card className="p-4 bg-white border-[#E8E4DF]">
                        <div className="space-y-3 mb-4">
                          <div>
                            <label className="text-sm font-medium text-[#5A6B7A] block mb-1">Deductible already met? ($)</label>
                            <input
                              type="number"
                              placeholder="e.g. 1500"
                              value={oopCalc.deductibleMet}
                              onChange={(e) => setOopCalc(prev => ({ ...prev, deductibleMet: e.target.value }))}
                              className="w-full text-sm border border-[#E8E4DF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#5A6B7A] block mb-1">Your copay per session ($)</label>
                            <input
                              type="number"
                              placeholder="e.g. 30"
                              value={oopCalc.copay}
                              onChange={(e) => setOopCalc(prev => ({ ...prev, copay: e.target.value }))}
                              className="w-full text-sm border border-[#E8E4DF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#5A6B7A] block mb-1">Sessions per month</label>
                            <input
                              type="number"
                              value={oopCalc.sessionsPerMonth}
                              onChange={(e) => setOopCalc(prev => ({ ...prev, sessionsPerMonth: e.target.value }))}
                              className="w-full text-sm border border-[#E8E4DF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </div>
                        </div>
                        <Button size="sm" className="w-full bg-primary hover:bg-primary text-white" onClick={calcOOP}>
                          <Calculator className="w-3.5 h-3.5 mr-1.5" />
                          Calculate
                        </Button>
                        {calcResult !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 p-3 bg-[#2A7D99]/10 rounded-lg text-center"
                          >
                            <p className="text-sm text-[#2A7D99] mb-1">Estimated monthly out-of-pocket</p>
                            <p className="text-2xl font-bold text-[#2A7D99]">${calcResult.toFixed(2)}</p>
                            <p className="text-sm text-primary mt-1">Based on your inputs. Actual costs may vary.</p>
                          </motion.div>
                        )}
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <Button className="w-full bg-primary hover:bg-primary text-white" onClick={() => onNavigate?.('benefits')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify My Benefits
                </Button>
                <Button variant="outline" className="w-full border-[#E8E4DF]" onClick={() => onNavigate?.('marketplace')}>
                  See Cash-Pay Options
                </Button>
                {/* No coverage-expert line exists yet — a "connecting…" toast would
                    fake it. Honest disabled state until the service is live. */}
                <Button variant="ghost" className="w-full text-[#5A6B7A]" disabled>
                  <Phone className="w-4 h-4 mr-2" />
                  Talk to a Coverage Expert — coming soon
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'flow' && coverageAnswer === 'no' && (
            <motion.div
              key="no-flow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-[#5A6B7A] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-[#132F43]">Let's explore your options.</h2>
              </div>
              <p className="text-[#5A6B7A] text-sm mb-6">No insurance coverage doesn't mean no access. Here's what families do.</p>

              <div className="space-y-3 mb-6">
                {[
                  {
                    icon: <DollarSign className="w-5 h-5 text-[#2A7D99]" />,
                    bg: 'bg-[#2A7D99]/10',
                    title: 'Cash-pay packages',
                    desc: 'Aminy-partner providers offer discounted rates for self-pay families — typically 20–40% below standard rates.',
                  },
                  {
                    icon: <CreditCard className="w-5 h-5 text-blue-600" />,
                    bg: 'bg-[#EEF4F8]',
                    title: 'HSA/FSA funds',
                    desc: 'If you have a health savings account, behavior therapy is 100% eligible — use pre-tax money to stretch your budget.',
                  },
                  {
                    icon: <FileText className="w-5 h-5 text-violet-600" />,
                    bg: 'bg-violet-50',
                    title: 'State waivers & grants',
                    desc: 'Arizona has several Medicaid waiver programs for autism services. We can check your eligibility right now.',
                  },
                  {
                    icon: <Sparkles className="w-5 h-5 text-amber-600" />,
                    bg: 'bg-amber-50',
                    title: 'Open enrollment is coming',
                    desc: 'If open enrollment is soon, we\'ll help you pick a plan that covers behavior therapy — most ACA plans do under Mental Health Parity.',
                  },
                ].map((option) => (
                  <Card key={option.title} className="p-4 bg-white border-[#E8E4DF]">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 ${option.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        {option.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-[#132F43] text-sm mb-0.5">{option.title}</p>
                        <p className="text-sm text-[#5A6B7A] leading-relaxed">{option.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Button className="w-full bg-primary hover:bg-primary text-white" onClick={() => onNavigate?.('marketplace')}>
                  See Cash-Pay Options
                </Button>
                <Button variant="outline" className="w-full border-[#E8E4DF]" onClick={() => setStep('waiver')}>
                  Check Waiver Eligibility
                </Button>
                {/* No coverage-expert line exists yet — a "connecting…" toast would
                    fake it. Honest disabled state until the service is live. */}
                <Button variant="ghost" className="w-full text-[#5A6B7A]" disabled>
                  <Phone className="w-4 h-4 mr-2" />
                  Talk to a Coverage Expert — coming soon
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'flow' && coverageAnswer === 'dont-know' && (
            <motion.div
              key="dk-flow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-[#5A6B7A] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-[#132F43]">We'll help you find out in 3 minutes.</h2>
              </div>
              <p className="text-[#5A6B7A] text-sm mb-6">Most families are surprised — behavior therapy is often covered more than you'd think.</p>

              <div className="space-y-3 mb-6">
                {[
                  {
                    step: '1',
                    title: 'Find your insurance card',
                    desc: 'Physical card or your insurance app. We need your Member ID and group number.',
                  },
                  {
                    step: '2',
                    title: 'Call the number on the back',
                    desc: 'Ask: "Does my plan cover Applied Behavior Analysis (ABA) therapy? What CPT codes are covered?" We\'ll give you the script.',
                  },
                  {
                    step: '3',
                    title: 'Come back and we\'ll decode it',
                    desc: 'Tell us what they said and we\'ll translate it into plain English — what you\'re covered for, how much it costs, and what to do next.',
                  },
                ].map((item) => (
                  <Card key={item.step} className="p-4 bg-white border-[#E8E4DF]">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs">
                        {item.step}
                      </div>
                      <div>
                        <p className="font-semibold text-[#132F43] text-sm mb-0.5">{item.title}</p>
                        <p className="text-sm text-[#5A6B7A] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Script card */}
              <Card className="p-4 bg-slate-900 border-0 mb-6">
                <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Your call script</p>
                <p className="text-sm text-white leading-relaxed italic">
                  &ldquo;Hi, I'm calling to ask about behavioral health benefits for my child. Do you cover Applied Behavior Analysis (ABA) therapy? What CPT codes are approved, and is prior authorization required?&rdquo;
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("Hi, I'm calling to ask about behavioral health benefits for my child. Do you cover Applied Behavior Analysis (ABA) therapy? What CPT codes are approved, and is prior authorization required?");
                    toast.success('Script copied to clipboard!');
                  }}
                  className="mt-3 text-sm text-primary hover:text-[#6AA9BC] transition-colors"
                >
                  Copy script →
                </button>
              </Card>

              <div className="space-y-2">
                <Button className="w-full bg-primary hover:bg-primary text-white" onClick={() => onNavigate?.('benefits')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify My Benefits
                </Button>
                {/* No coverage-expert line exists yet — honest disabled state. */}
                <Button variant="outline" className="w-full border-[#E8E4DF]" disabled>
                  <Phone className="w-4 h-4 mr-2" />
                  Talk to a Coverage Expert — coming soon
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP: Medicaid Waiver Eligibility */}
        {step === 'waiver' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-[#5A6B7A] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-violet-500" />
              <h2 className="text-xl font-bold text-[#132F43]">Arizona Medicaid Waivers</h2>
            </div>
            <p className="text-[#5A6B7A] text-sm mb-6">
              These programs can cover therapy services even if you don't have private insurance — or supplement what your insurance doesn't cover.
            </p>

            <div className="space-y-3 mb-6">
              {AZ_WAIVER_PROGRAMS.map((waiver) => (
                <Card key={waiver.code} className="bg-white border-[#E8E4DF] overflow-hidden">
                  <button
                    onClick={() => setExpandedWaiver(expandedWaiver === waiver.code ? null : waiver.code)}
                    className="w-full text-left p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#132F43] text-sm">{waiver.name}</p>
                      <p className="text-sm text-slate-400 mt-0.5">Wait: {waiver.waitlistMonths}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedWaiver === waiver.code ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {expandedWaiver === waiver.code && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-1">Eligibility</p>
                            <ul className="space-y-1">
                              {waiver.eligibility.map((e, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[#5A6B7A]">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-1">Covered Services</p>
                            <div className="flex flex-wrap gap-1.5">
                              {waiver.services.map((s) => (
                                <span key={s} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-800"><strong>Tip:</strong> {waiver.tip}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>

            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={() => onNavigate?.('benefits')}>
              <Shield className="w-4 h-4 mr-2" />
              Check My Eligibility
            </Button>
          </motion.div>
        )}

        {/* STEP: "Is This Covered?" Quick Lookup */}
        {step === 'lookup' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-[#5A6B7A] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-[#132F43]">Is This Covered?</h2>
            </div>
            <p className="text-[#5A6B7A] text-sm mb-4">Quick lookup for common therapy services and their typical coverage status.</p>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search services (e.g., ABA, speech, OT...)"
                value={lookupSearch}
                onChange={(e) => setLookupSearch(e.target.value)}
                className="w-full text-sm border border-[#E8E4DF] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
              />
            </div>

            <div className="space-y-2.5 mb-6">
              {COVERAGE_LOOKUP.filter(item =>
                !lookupSearch || item.service.toLowerCase().includes(lookupSearch.toLowerCase())
              ).map((item) => (
                <Card key={item.service} className="p-4 bg-white border-[#E8E4DF]">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.typicallyCovered ? 'bg-green-50' : 'bg-red-50'}`}>
                      {item.typicallyCovered ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#132F43] text-sm">{item.service}</p>
                      <p className="text-sm text-[#5A6B7A] mt-1 leading-relaxed">{item.notes}</p>
                      {item.cptCodes.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-sm text-slate-400">CPT:</span>
                          {item.cptCodes.map(code => (
                            <span key={code} className="text-xs bg-[#EDF4F7] text-[#5A6B7A] px-1.5 py-0.5 rounded font-mono">{code}</span>
                          ))}
                        </div>
                      )}
                      {item.authRequired && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span className="text-sm text-amber-600 font-medium">Prior auth required</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <p className="text-sm text-slate-400 text-center mb-4">
              Coverage varies by plan. Always verify with your insurance company.
            </p>
          </motion.div>
        )}

        {/* Quick Action Pills (always visible at bottom of lead step) */}
        {step === 'lead' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 space-y-2"
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Tools</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep('lookup')} className="p-3 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-xl hover:border-[#2A7D99]/30 transition-all text-left">
                <HelpCircle className="w-5 h-5 text-primary mb-1.5" />
                <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">Is This Covered?</p>
                <p className="text-sm text-slate-400 dark:text-slate-400">Service lookup</p>
              </button>
              <button onClick={() => setStep('waiver')} className="p-3 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 rounded-xl hover:border-violet-300 transition-all text-left">
                <Shield className="w-5 h-5 text-violet-500 mb-1.5" />
                <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">Medicaid Waivers</p>
                <p className="text-sm text-slate-400 dark:text-slate-400">AZ programs</p>
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
