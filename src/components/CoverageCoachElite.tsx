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

export function CoverageCoachElite({ onBack, onNavigate }: CoverageCoachEliteProps) {
  const [coverageAnswer, setCoverageAnswer] = useState<CoverageAnswer>(null);
  const [step, setStep] = useState<'lead' | 'flow' | 'calc'>('lead');
  const [oopCalc, setOopCalc] = useState<OOPCalc>({ deductibleMet: '', copay: '', sessionsPerMonth: '4' });
  const [showCalc, setShowCalc] = useState(false);
  const [calcResult, setCalcResult] = useState<number | null>(null);

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
    <div className="min-h-screen bg-slate-50" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-teal-600" />
            </div>
            <h1 className="text-base font-semibold text-slate-900">Coverage Coach</h1>
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
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Does your insurance cover ABA therapy?
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Most plans do — but navigating it can feel like a maze. Let's figure it out together in 3 minutes.
              </p>
            </div>

            {/* Answer cards */}
            <div className="space-y-3 mb-8">
              <button
                onClick={() => handleCoverageAnswer('yes')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Yes, I believe so</div>
                    <div className="text-xs text-slate-400 mt-0.5">Let's maximize your benefits</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-teal-400 transition-colors" />
                </div>
              </button>

              <button
                onClick={() => handleCoverageAnswer('no')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">No, it doesn't</div>
                    <div className="text-xs text-slate-400 mt-0.5">Let's explore your options</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-orange-400 transition-colors" />
                </div>
              </button>

              <button
                onClick={() => handleCoverageAnswer('dont-know')}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <HelpCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">I'm not sure</div>
                    <div className="text-xs text-slate-400 mt-0.5">We'll help you find out in 3 minutes</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-400 transition-colors" />
                </div>
              </button>
            </div>

            {/* Insurance card scan prompt */}
            <Card className="p-4 border-dashed border-slate-200 bg-white text-center">
              <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 mb-1">Scan your insurance card</p>
              <p className="text-xs text-slate-400 mb-3">We'll pre-fill your plan details automatically</p>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info('Camera access coming soon')}>
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
              <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-bold text-slate-900">Great! Let's maximize your benefits.</h2>
              </div>

              {/* Benefits breakdown in plain English */}
              <Card className="p-5 bg-white border-slate-200 mb-4">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Your estimated ABA coverage</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <strong className="text-slate-900">60 ABA sessions per year</strong> — You've used 12 so far. That's <strong>48 sessions remaining</strong> — about 3 months of weekly therapy.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <strong className="text-slate-900">$25 copay per session</strong> after deductible is met.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <strong className="text-slate-900">Prior authorization required</strong> — Most plans need pre-approval before ABA starts. We'll handle the paperwork.
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
                      ABA therapy usually needs pre-approval from your insurance company before you can start. Think of it as getting a green light before scheduling. <strong>Aminy helps you get that approval</strong> — we handle the forms and follow up.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Superbill explainer */}
              <Card className="p-5 bg-blue-50 border-blue-100 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm mb-1">What about out-of-network providers?</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Even if a provider isn't in your network, you may get reimbursed. We'll generate a <strong>superbill</strong> — a special receipt — you submit to your insurance for partial reimbursement. Many families get 40–70% back.
                    </p>
                  </div>
                </div>
              </Card>

              {/* HSA/FSA */}
              <Card className="p-4 bg-teal-50 border-teal-100 mb-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  <p className="text-sm text-teal-800">
                    <strong>Therapy is HSA/FSA eligible.</strong> You can use those funds here — it's pre-tax money that stretches further.
                  </p>
                </div>
              </Card>

              {/* OOP Calculator */}
              <div className="mb-6">
                <button
                  onClick={() => setShowCalc(!showCalc)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 hover:text-teal-600 transition-colors"
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
                      <Card className="p-4 bg-white border-slate-200">
                        <div className="space-y-3 mb-4">
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Deductible already met? ($)</label>
                            <input
                              type="number"
                              placeholder="e.g. 1500"
                              value={oopCalc.deductibleMet}
                              onChange={(e) => setOopCalc(prev => ({ ...prev, deductibleMet: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Your copay per session ($)</label>
                            <input
                              type="number"
                              placeholder="e.g. 30"
                              value={oopCalc.copay}
                              onChange={(e) => setOopCalc(prev => ({ ...prev, copay: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Sessions per month</label>
                            <input
                              type="number"
                              value={oopCalc.sessionsPerMonth}
                              onChange={(e) => setOopCalc(prev => ({ ...prev, sessionsPerMonth: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </div>
                        </div>
                        <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={calcOOP}>
                          <Calculator className="w-3.5 h-3.5 mr-1.5" />
                          Calculate
                        </Button>
                        {calcResult !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 p-3 bg-teal-50 rounded-lg text-center"
                          >
                            <p className="text-xs text-teal-600 mb-1">Estimated monthly out-of-pocket</p>
                            <p className="text-2xl font-bold text-teal-700">${calcResult.toFixed(2)}</p>
                            <p className="text-xs text-teal-500 mt-1">Based on your inputs. Actual costs may vary.</p>
                          </motion.div>
                        )}
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onNavigate?.('benefits')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify My Benefits
                </Button>
                <Button variant="outline" className="w-full border-slate-200" onClick={() => onNavigate?.('marketplace')}>
                  See Cash-Pay Options
                </Button>
                <Button variant="ghost" className="w-full text-slate-500" onClick={() => toast.info('Connecting you with a coverage expert...')}>
                  <Phone className="w-4 h-4 mr-2" />
                  Talk to a Coverage Expert
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
              <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-slate-900">Let's explore your options.</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6">No insurance coverage doesn't mean no access. Here's what families do.</p>

              <div className="space-y-3 mb-6">
                {[
                  {
                    icon: <DollarSign className="w-5 h-5 text-teal-600" />,
                    bg: 'bg-teal-50',
                    title: 'Cash-pay packages',
                    desc: 'Aminy-partner providers offer discounted rates for self-pay families — typically 20–40% below standard rates.',
                  },
                  {
                    icon: <CreditCard className="w-5 h-5 text-blue-600" />,
                    bg: 'bg-blue-50',
                    title: 'HSA/FSA funds',
                    desc: 'If you have a health savings account, ABA therapy is 100% eligible — use pre-tax money to stretch your budget.',
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
                    desc: 'If open enrollment is soon, we\'ll help you pick a plan that covers ABA — most ACA plans do under Mental Health Parity.',
                  },
                ].map((option) => (
                  <Card key={option.title} className="p-4 bg-white border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 ${option.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        {option.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm mb-0.5">{option.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{option.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onNavigate?.('marketplace')}>
                  See Cash-Pay Options
                </Button>
                <Button variant="outline" className="w-full border-slate-200" onClick={() => toast.info('Checking your state waiver eligibility...')}>
                  Check Waiver Eligibility
                </Button>
                <Button variant="ghost" className="w-full text-slate-500" onClick={() => toast.info('Connecting you with a coverage expert...')}>
                  <Phone className="w-4 h-4 mr-2" />
                  Talk to a Coverage Expert
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
              <button onClick={() => setStep('lead')} className="flex items-center gap-1 text-slate-400 text-sm mb-6 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-slate-900">We'll help you find out in 3 minutes.</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6">Most families are surprised — ABA is often covered more than you'd think.</p>

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
                  <Card key={item.step} className="p-4 bg-white border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs">
                        {item.step}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm mb-0.5">{item.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
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
                  className="mt-3 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Copy script →
                </button>
              </Card>

              <div className="space-y-2">
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onNavigate?.('benefits')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify My Benefits
                </Button>
                <Button variant="outline" className="w-full border-slate-200" onClick={() => toast.info('Connecting you with a coverage expert...')}>
                  <Phone className="w-4 h-4 mr-2" />
                  Talk to a Coverage Expert
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
