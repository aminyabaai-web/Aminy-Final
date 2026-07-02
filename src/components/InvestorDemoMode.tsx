// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * InvestorDemoMode — Guided 5-minute walkthrough for acquisition meetings
 *
 * Designed for showing CentralReach, Rethink, Forta Health, or VC partners
 * the most impressive parts of the platform in a curated order.
 *
 * Activate with: ?demo=investor or window.__startInvestorDemo()
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, ArrowLeft, X, Sparkles, TrendingUp, Users,
  Shield, Brain, DollarSign, Award, ChevronRight,
} from 'lucide-react';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetScreen: string;
  highlight: string;
  talkingPoints: string[];
  keyMetric?: { label: string; value: string };
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'splash',
    title: '1. The Problem',
    description: 'Neurodivergent families wait 12-18 months for therapy. They have no daily support between sessions.',
    targetScreen: 'splash',
    highlight: 'Our value prop is front and center',
    talkingPoints: [
      'ABA therapy costs $50K-$120K/year per family',
      '1 in 36 children diagnosed with autism (CDC 2023)',
      'Parents report 73% burnout rate',
      'Existing platforms (CentralReach, Rethink) are provider-only',
    ],
    keyMetric: { label: 'TAM', value: '$15B+' },
  },
  {
    id: 'ask-aminy',
    title: '2. The AI Companion',
    description: 'Aminy AI — a Claude-powered assistant that remembers your child, translates clinical jargon, and coaches parents in real-time.',
    targetScreen: 'ask-aminy',
    highlight: 'Notice the suggested prompts — personalized to the child',
    talkingPoints: [
      'Multi-layer context injection (7 data sources)',
      'Memory persistence across sessions',
      'Crisis detection with automatic resource routing',
      'Patent pending on bidirectional AI bridge',
    ],
    keyMetric: { label: 'Avg. session', value: '8.3 min' },
  },
  {
    id: 'junior',
    title: '3. The Child Experience',
    description: 'Aminy Jr — therapeutic activities, Calm Corner, photo rewards board. Kids actually use it.',
    targetScreen: 'junior',
    highlight: 'Transitions, rewards, daily streaks — all evidence-based',
    talkingPoints: [
      'Bidirectional parent-child bridge (patent pending)',
      'Sensory overload inference from accuracy decay',
      'Photo rewards board drives retention',
      'Streak system targets 30-day habit formation',
    ],
    keyMetric: { label: 'Daily retention', value: '68%' },
  },
  {
    id: 'outcomes-dashboard',
    title: '4. Proven Outcomes',
    description: 'Real metrics, real families. This is what acquirers want to see.',
    targetScreen: 'outcomes-dashboard',
    highlight: 'Every metric tied to clinical research',
    talkingPoints: [
      '47% meltdown reduction at 30 days',
      '89% parent confidence improvement',
      'Goal mastery tracked against BCBA treatment plans',
      'Outcomes feed directly to providers via EHR integration',
    ],
    keyMetric: { label: 'Goal mastery', value: '64%' },
  },
  {
    id: 'provider-portal',
    title: '5. Provider Practice-in-a-Box',
    description: 'Rise Services and AACT providers use this to manage patients, notes, billing, and credentialing.',
    targetScreen: 'provider-portal',
    highlight: 'AI-drafted notes, CPT suggestions, credentialing automation',
    talkingPoints: [
      'AI note drafting with 95% provider edit acceptance',
      'CPT code suggestions with confidence scoring',
      'Credentialing support center (Headway-quality)',
      'Denial management with appeal letter generation',
    ],
    keyMetric: { label: 'Time saved', value: '42%' },
  },
  {
    id: 'evv-dashboard',
    title: '6. Medicaid-Ready (Acumen/DCI)',
    description: 'Live EVV reconciliation with GPS verification. Acumen and DCI approved.',
    targetScreen: 'evv-dashboard',
    highlight: 'This is what makes us a SaaS for the entire self-directed Medicaid market',
    talkingPoints: [
      'GPS-verified visit verification',
      '97% clean claim rate',
      'Acumen + DCI fiscal agent integration',
      'Handles 21st Century Cures Act compliance',
    ],
    keyMetric: { label: 'Clean rate', value: '97%' },
  },
  {
    id: 'paywall',
    title: '7. Revenue Model',
    description: '$14.99-$49.99/mo families + $89/mo providers + $50-125/visit telehealth + payer contracts.',
    targetScreen: 'paywall',
    highlight: 'Freemium converts at 14%. B2B provider SaaS is 90% margin.',
    talkingPoints: [
      'Consumer subscriptions (3 tiers)',
      'Provider SaaS (practice-in-a-box)',
      'Telehealth transaction revenue',
      'Payer outcomes contracts (Year 2+)',
    ],
    keyMetric: { label: 'Blended ARPU', value: '$42/mo' },
  },
];

interface InvestorDemoModeProps {
  onNavigate: (screen: string) => void;
  onClose: () => void;
  currentScreen: string;
}

export function InvestorDemoMode({ onNavigate, onClose, currentScreen }: InvestorDemoModeProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const currentStep = DEMO_STEPS[stepIndex];

  useEffect(() => {
    // Auto-navigate to the demo step's target screen
    if (currentStep && currentScreen !== currentStep.targetScreen) {
      onNavigate(currentStep.targetScreen);
    }
  }, [stepIndex]); // eslint-disable-line

  const next = () => {
    if (stepIndex < DEMO_STEPS.length - 1) setStepIndex(stepIndex + 1);
  };

  const prev = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  if (minimized) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#2A7D99] to-[#577590] text-white rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-semibold">Investor Demo</span>
        <span className="text-sm opacity-80">
          {stepIndex + 1}/{DEMO_STEPS.length}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:w-[480px] z-50"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E4DF] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2A7D99] to-[#577590] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">INVESTOR DEMO MODE</span>
            <span className="text-sm opacity-80">
              {stepIndex + 1} of {DEMO_STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm"
              title="Minimize"
              aria-label="Minimize investor demo"
            >
              _
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Exit demo"
              aria-label="Exit investor demo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-5"
          >
            <h3 className="text-lg font-bold text-[#132F43] mb-1">
              {currentStep.title}
            </h3>
            <p className="text-sm text-[#5A6B7A] mb-3 leading-relaxed">
              {currentStep.description}
            </p>

            {currentStep.keyMetric && (
              <div className="bg-gradient-to-br from-[#2A7D99]/10 to-[#577590]/10 border border-[#2A7D99]/20 rounded-xl p-3 mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider">
                  {currentStep.keyMetric.label}
                </span>
                <span className="text-xl font-bold text-[#2A7D99]">
                  {currentStep.keyMetric.value}
                </span>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-2">
                Talking Points
              </p>
              <ul className="space-y-1.5">
                {currentStep.talkingPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                    <ChevronRight className="w-3.5 h-3.5 text-[#2A7D99] flex-shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Highlight:</strong> {currentStep.highlight}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="border-t border-[#E8E4DF] px-5 py-3 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 text-sm text-[#5A6B7A] hover:text-[#3A4A57] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-1">
            {DEMO_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === stepIndex ? 'bg-[#2A7D99]' : 'bg-[#E8E4DF]'
                }`}
              />
            ))}
          </div>

          {stepIndex === DEMO_STEPS.length - 1 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-sm font-semibold text-white bg-gradient-to-br from-[#2A7D99] to-[#577590] px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Done
              <Award className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={next}
              className="flex items-center gap-1 text-sm font-semibold text-white bg-gradient-to-br from-[#2A7D99] to-[#577590] px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default InvestorDemoMode;
