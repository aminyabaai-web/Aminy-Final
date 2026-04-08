// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * InsuredCareHub — Family-facing insured lane dashboard
 *
 * Shows benefits in plain English, prior auth tracker, session counter,
 * copay previews, and EOB translations.
 *
 * Screen name: 'insured-care-hub'
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Star,
} from 'lucide-react';
import {
  verifyBenefits,
  getBenefitsSummary,
  translateEOB,
  reconcileERA,
  type BenefitsVerification,
  type EOBRecord,
} from '../../lib/insured-care-lane';

// ============================================================================
// Props
// ============================================================================

interface InsuredCareHubProps {
  memberId?: string;
  planId?: string;
  childName?: string;
  onBack?: () => void;
  onGetHelp?: () => void;
}

// ============================================================================
// Mock data
// ============================================================================

const MOCK_UPCOMING_SESSIONS = [
  { date: 'Tuesday, Apr 8', time: '10:00 AM', provider: 'Dr. Sarah Chen, BCBA', type: 'ABA Therapy', copay: 0, coinsurance: '20%', estimatedCost: 35 },
  { date: 'Thursday, Apr 10', time: '2:00 PM', provider: 'Emily Reyes, SLP', type: 'Speech Therapy', copay: 35, coinsurance: undefined, estimatedCost: 35 },
];

const MOCK_EOB_RECORDS = [
  { billedAmount: 175, eraAmount: 127, date: 'Mar 28, 2026', service: 'ABA therapy session' },
  { billedAmount: 150, eraAmount: 108, date: 'Mar 21, 2026', service: 'Speech therapy session' },
];

const PRIOR_AUTH_STAGES = [
  { id: 'submitted', label: 'Submitted', date: 'Mar 1, 2026' },
  { id: 'under-review', label: 'Under Review', date: 'Mar 3, 2026' },
  { id: 'approved', label: 'Approved', date: 'Mar 8, 2026' },
  { id: 'sessions-started', label: 'Sessions Started', date: 'Mar 12, 2026' },
];

// ============================================================================
// Sub-components
// ============================================================================

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CoverageCard({ benefits }: { benefits: BenefitsVerification }) {
  const summary = getBenefitsSummary(benefits);
  const [expanded, setExpanded] = useState(false);
  const deductiblePct = Math.min(100, Math.round((benefits.deductible.individualUsed / benefits.deductible.individual) * 100));
  const oopPct = Math.min(100, Math.round((benefits.outOfPocketMax.individualUsed / benefits.outOfPocketMax.individual) * 100));

  return (
    <SectionCard>
      <div className="p-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm">Your Coverage</p>
            <p className="text-xs text-slate-500">{benefits.planName}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            benefits.networkStatus === 'in-network' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {benefits.networkStatus === 'in-network' ? 'In-Network' : 'Out-of-Network'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-slate-700 leading-relaxed">{summary.abaStatus}</p>

        {/* Deductible bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Deductible</span>
            <span className="text-xs text-slate-500">
              ${benefits.deductible.individualUsed.toLocaleString()} of ${benefits.deductible.individual.toLocaleString()} used
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${deductiblePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-slate-400">${(benefits.deductible.individual - benefits.deductible.individualUsed).toLocaleString()} remaining before insurance pays more</p>
        </div>

        {/* Out-of-pocket bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Out-of-Pocket Max</span>
            <span className="text-xs text-slate-500">
              ${benefits.outOfPocketMax.individualUsed.toLocaleString()} of ${benefits.outOfPocketMax.individual.toLocaleString()} used
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${oopPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>

        {/* Coverage toggles */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors"
        >
          {expanded ? 'Hide details' : 'See coverage details'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-1">
                {([
                  { label: 'ABA Therapy', data: benefits.coverageDetails.aba, icon: '🧩' },
                  { label: 'Mental Health', data: benefits.coverageDetails.mentalHealth, icon: '🧠' },
                  { label: 'Speech Therapy', data: benefits.coverageDetails.speech, icon: '💬' },
                  { label: 'Telehealth', data: benefits.coverageDetails.telehealth, icon: '📱' },
                ] as const).map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        {item.data.covered ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.data.covered
                          ? (() => {
                              const d = item.data as { covered: boolean; copay?: number; coinsurance?: number; requiresPriorAuth?: boolean };
                              return [
                                d.copay !== undefined ? `$${d.copay} copay` : '',
                                d.coinsurance !== undefined ? `${(d.coinsurance * 100).toFixed(0)}% coinsurance` : '',
                                d.requiresPriorAuth ? 'Prior auth required' : '',
                              ].filter(Boolean).join(' · ') || 'Covered';
                            })()
                          : 'Not covered under this plan'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionCard>
  );
}

function PriorAuthTracker() {
  const currentStageIdx = 3; // approved and sessions started

  return (
    <SectionCard>
      <div className="p-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Prior Authorization — ABA Therapy</p>
            <p className="text-xs text-slate-500">Auth #PA-8X2K9M · 240 units approved</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-100" />
          <div
            className="absolute left-[11px] top-3 w-0.5 bg-emerald-400 transition-all duration-700"
            style={{ height: `${(currentStageIdx / (PRIOR_AUTH_STAGES.length - 1)) * 100}%` }}
          />

          <div className="space-y-4">
            {PRIOR_AUTH_STAGES.map((stage, i) => {
              const isPast = i < currentStageIdx;
              const isActive = i === currentStageIdx;
              return (
                <div key={stage.id} className="flex items-start gap-3 relative">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                    isPast || isActive
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-200 bg-white'
                  }`}>
                    {(isPast || isActive) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isActive ? 'text-slate-900' : isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                      {stage.label}
                    </p>
                    <p className="text-xs text-slate-400">{stage.date}</p>
                  </div>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Active</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Sessions used</span>
            <span className="text-sm font-bold text-slate-900">24 of 60</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '40%' }} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">36 sessions remaining in this authorization period</p>
        </div>
      </div>
    </SectionCard>
  );
}

function UpcomingSessionCosts() {
  return (
    <SectionCard>
      <div className="p-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Upcoming Session Costs</p>
            <p className="text-xs text-slate-500">Estimated — final amounts may vary</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {MOCK_UPCOMING_SESSIONS.map((session, i) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{session.type}</p>
              <p className="text-xs text-slate-500">{session.provider}</p>
              <p className="text-xs text-slate-400 mt-0.5">{session.date} at {session.time}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-slate-900">${session.estimatedCost}</p>
              <p className="text-xs text-slate-400">
                {session.coinsurance ? session.coinsurance + ' coinsurance' : `$${session.copay} copay`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function EOBTranslations() {
  const eobs = MOCK_EOB_RECORDS.map((r) => {
    const eob = reconcileERA(`claim-${r.date}`, r.billedAmount, r.eraAmount);
    const translation = translateEOB(eob, r.service);
    return { ...r, eob, translation };
  });

  return (
    <SectionCard>
      <div className="p-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Recent Payments</p>
            <p className="text-xs text-slate-500">Plain-English EOB breakdown</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {eobs.map((item, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900 capitalize">{item.service}</p>
                <p className="text-xs text-slate-400">{item.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">+${item.eraAmount}</p>
                <p className="text-xs text-slate-400">insurance paid</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{item.translation.headline}</p>
            <p className="text-xs text-slate-500">{item.translation.detail}</p>
            {item.translation.action && (
              <p className="text-xs text-amber-600 font-medium">{item.translation.action}</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// Inline Check import workaround (already in scope from lucide-react above, but let's add it)
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function InsuredCareHub({ memberId = 'BCBS123456', planId = 'BCBS-AZ', childName = 'Alex', onBack, onGetHelp }: InsuredCareHubProps) {
  const [benefits, setBenefits] = useState<BenefitsVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'coverage' | 'auth' | 'sessions' | 'eob'>('coverage');

  useEffect(() => {
    verifyBenefits(memberId, planId).then((b) => {
      setBenefits(b);
      setLoading(false);
    });
  }, [memberId, planId]);

  const TABS = [
    { id: 'coverage' as const, label: 'Coverage', icon: Shield },
    { id: 'auth' as const, label: 'Prior Auth', icon: FileText },
    { id: 'sessions' as const, label: 'Sessions', icon: Calendar },
    { id: 'eob' as const, label: 'Payments', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-slate-900">Insurance Care Hub</h1>
            <p className="text-xs text-slate-500">{childName}'s benefits & coverage</p>
          </div>
          {benefits && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              Active
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-slate-100 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-sm text-slate-500">Checking your benefits with {planId.replace('-', ' ')}...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {activeTab === 'coverage' && benefits && (
                <>
                  <CoverageCard benefits={benefits} />
                  <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-teal-800">Aminy handles the billing</p>
                        <p className="text-sm text-teal-700 mt-0.5 leading-relaxed">
                          We submit claims directly to {benefits.payer} after every session. You just approve the note and we do the rest.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeTab === 'auth' && <PriorAuthTracker />}
              {activeTab === 'sessions' && <UpcomingSessionCosts />}
              {activeTab === 'eob' && <EOBTranslations />}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Help CTA */}
        {!loading && (
          <button
            onClick={onGetHelp}
            className="w-full py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-600 flex items-center justify-center gap-2 hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            Questions about your coverage?
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default InsuredCareHub;
