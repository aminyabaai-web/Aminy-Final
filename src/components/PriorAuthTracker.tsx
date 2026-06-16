// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import {
  Clock,
  DollarSign,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react';

// ============================================================================
// PAYER TIMELINES (sourced from provider guides & advocacy research)
// ============================================================================

interface PayerTimeline {
  payer: string;
  aliases: string[];
  assessmentNeedsPA: boolean;
  treatmentNeedsPA: boolean;
  estimatedDays: number;
  phases: { label: string; days: string }[];
  icdRequired: string[];
  notes: string;
  cobEligible: boolean; // AHCCCS payer-of-last-resort applies
}

const PAYER_TIMELINES: PayerTimeline[] = [
  {
    payer: 'BCBS Arizona',
    aliases: ['bcbs', 'blue cross', 'blue shield', 'bluecross'],
    assessmentNeedsPA: true,
    treatmentNeedsPA: true,
    estimatedDays: 28,
    phases: [
      { label: 'Assessment auth (97151)', days: '~14 business days' },
      { label: 'Treatment auth (97153-97156)', days: '~14 business days after assessment' },
    ],
    icdRequired: ['F84.0'],
    notes: 'BCBS AZ requires F84.0 specifically. Telehealth evals accepted under AZ parity law.',
    cobEligible: false,
  },
  {
    payer: 'Aetna',
    aliases: ['aetna', 'cvs health'],
    assessmentNeedsPA: true,
    treatmentNeedsPA: true,
    estimatedDays: 14,
    phases: [
      { label: 'Initial assessment review', days: '~7–14 calendar days' },
      { label: 'Treatment auth', days: '~7 days post-assessment' },
    ],
    icdRequired: ['F84.0', 'F84.3', 'F84.5', 'F84.8', 'F84.9'],
    notes: 'Aetna accepts broader ASD ICD-10 range. CPT 97152 NOT covered via telehealth.',
    cobEligible: false,
  },
  {
    payer: 'UnitedHealthcare',
    aliases: ['united', 'uhc', 'unitedhealthcare', 'optum'],
    assessmentNeedsPA: true,
    treatmentNeedsPA: true,
    estimatedDays: 5,
    phases: [
      { label: 'Assessment + treatment auth', days: '3–5 business days' },
    ],
    icdRequired: ['F84.0'],
    notes: 'UHC has fastest turnaround but increased denial rate. Document medical necessity thoroughly.',
    cobEligible: false,
  },
  {
    payer: 'Cigna',
    aliases: ['cigna', 'evernorth'],
    assessmentNeedsPA: false,
    treatmentNeedsPA: true,
    estimatedDays: 7,
    phases: [
      { label: 'Assessment (97151/97152) — no PA required', days: 'Start immediately' },
      { label: 'Treatment auth', days: '~7 days' },
    ],
    icdRequired: ['F84.0'],
    notes: 'Cigna removed PA for assessment codes as of May 2026. Most permissive major payer.',
    cobEligible: false,
  },
  {
    payer: 'AHCCCS / Medicaid',
    aliases: ['ahcccs', 'medicaid', 'mercy care', 'banner university', 'arizona complete health'],
    assessmentNeedsPA: false,
    treatmentNeedsPA: true,
    estimatedDays: 5,
    phases: [
      { label: 'Assessment (97151/97152) — no PA required', days: 'Start immediately' },
      { label: 'Treatment auth via MCO', days: '~5 business days' },
    ],
    icdRequired: ['F84.0'],
    notes: 'Assessment codes require no PA. Treatment PA submitted by ABA provider, not physician.',
    cobEligible: true,
  },
];

// ============================================================================
// TYPES
// ============================================================================

export type PAStatus = 'not-started' | 'assessment-pending' | 'assessment-approved' | 'treatment-pending' | 'treatment-approved' | 'denied';

export interface PriorAuthTrackerProps {
  payerName?: string;
  status?: PAStatus;
  hasSecondaryMedicaid?: boolean; // COB: commercial primary + AHCCCS secondary
  onStartCashPay?: () => void;
  onLearnMore?: () => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function detectPayer(name?: string): PayerTimeline | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase();
  return PAYER_TIMELINES.find(t =>
    t.aliases.some(alias => normalized.includes(alias)) ||
    normalized.includes(t.payer.toLowerCase())
  );
}

function statusLabel(status: PAStatus): string {
  switch (status) {
    case 'not-started': return 'Not started';
    case 'assessment-pending': return 'Assessment auth submitted';
    case 'assessment-approved': return 'Assessment approved';
    case 'treatment-pending': return 'Treatment auth submitted';
    case 'treatment-approved': return 'Approved — ready to start!';
    case 'denied': return 'Denied — appeal options available';
  }
}

function statusColor(status: PAStatus): string {
  switch (status) {
    case 'not-started': return 'text-slate-500';
    case 'assessment-pending': return 'text-amber-600 dark:text-amber-400';
    case 'assessment-approved': return 'text-blue-600 dark:text-blue-400';
    case 'treatment-pending': return 'text-amber-600 dark:text-amber-400';
    case 'treatment-approved': return 'text-emerald-600 dark:text-emerald-400';
    case 'denied': return 'text-red-600 dark:text-red-400';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PriorAuthTracker({
  payerName,
  status = 'not-started',
  hasSecondaryMedicaid = false,
  onStartCashPay,
  onLearnMore,
  className = '',
}: PriorAuthTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const timeline = detectPayer(payerName);
  const isMedicaidOnly = timeline?.payer === 'AHCCCS / Medicaid';
  const isApproved = status === 'treatment-approved';
  const isDenied = status === 'denied';

  // COB banner: show when family has commercial primary + AHCCCS secondary
  const showCOBBanner = hasSecondaryMedicaid && !isMedicaidOnly;

  return (
    <div className={`rounded-2xl border bg-white dark:bg-slate-800 overflow-hidden ${className}`}>
      {/* COB Banner — $0 OOP for dual-coverage families */}
      {showCOBBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-700 px-4 py-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              You may owe $0 out-of-pocket
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              AHCCCS (your secondary coverage) pays the gap your commercial plan leaves behind for ABA services. Your family pays nothing.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6B9080]" />
          <span className="text-sm font-medium text-[#1B2733] dark:text-slate-100">
            Prior Authorization Status
          </span>
          {timeline && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · {timeline.payer}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${statusColor(status)}`}>
            {statusLabel(status)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#E8E4DF] dark:border-slate-700">

          {/* Timeline phases */}
          {timeline ? (
            <div className="pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Typical timeline for {timeline.payer}
              </p>
              <div className="space-y-2">
                {timeline.phases.map((phase, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {i < phaseIndexForStatus(status) ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : i === phaseIndexForStatus(status) ? (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400 bg-amber-100 dark:bg-amber-900/30" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#1B2733] dark:text-slate-200">{phase.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{phase.days}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ICD-10 requirement note */}
              {timeline.icdRequired.length > 0 && (
                <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium">ICD-10 required:</span>{' '}
                    {timeline.icdRequired.join(', ')} · {timeline.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                We'll check your specific plan's timeline once we verify coverage.
              </p>
            </div>
          )}

          {/* Denial help */}
          {isDenied && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Appeal options</p>
              </div>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 ml-6 list-disc">
                <li>Request a peer-to-peer review — BCBA speaks directly with plan's medical director</li>
                <li>Submit updated clinical documentation (ADOS-2, Vineland-3)</li>
                <li>File a formal appeal within 60 days of denial letter</li>
                <li>Contact your state insurance commissioner (AZ: (602) 364-2499)</li>
              </ul>
            </div>
          )}

          {/* Approval message */}
          {isApproved && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Ready to start ABA therapy!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Your prior authorization is approved. Contact your ABA provider to schedule the first session.
                </p>
              </div>
            </div>
          )}

          {/* Cash-pay bridge — show when auth is pending and not yet approved */}
          {!isApproved && !isMedicaidOnly && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Don't wait {timeline ? `~${timeline.estimatedDays} days` : 'weeks'} — start today
                </p>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Many families pay cash for the first sessions while prior auth processes. Some payers allow retroactive billing once approved — ask your ABA provider.
              </p>
              {onStartCashPay && (
                <button
                  onClick={onStartCashPay}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 dark:bg-amber-500 text-white text-sm py-2 px-3 hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Book cash-pay session now
                </button>
              )}
            </div>
          )}

          {onLearnMore && (
            <button
              onClick={onLearnMore}
              className="text-xs text-[#6B9080] hover:underline"
            >
              Learn more about prior authorization →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Maps PAStatus to which phase index is "in progress"
function phaseIndexForStatus(status: PAStatus): number {
  switch (status) {
    case 'not-started': return 0;
    case 'assessment-pending': return 0;
    case 'assessment-approved': return 1;
    case 'treatment-pending': return 1;
    case 'treatment-approved': return 99; // all done
    case 'denied': return 99;
    default: return 0;
  }
}

// ============================================================================
// COMPACT INLINE VERSION (for embedding in chat bubble)
// ============================================================================

export function PriorAuthBadge({
  payerName,
  status = 'not-started',
  hasSecondaryMedicaid = false,
}: Pick<PriorAuthTrackerProps, 'payerName' | 'status' | 'hasSecondaryMedicaid'>) {
  const timeline = detectPayer(payerName);

  return (
    <div className="mt-2 rounded-xl border border-[#E8E4DF] dark:border-slate-600 bg-[#FAF7F2] dark:bg-slate-700/50 px-3 py-2 space-y-1">
      {hasSecondaryMedicaid && (
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Dual coverage detected — estimated $0 out-of-pocket
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#6B9080]" />
          <span className="text-xs text-[#5A6B7A] dark:text-slate-300">
            Prior auth · {timeline?.payer ?? payerName ?? 'Your plan'}
          </span>
        </div>
        <span className={`text-xs font-medium ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>
      {timeline && status === 'not-started' && (
        <p className="text-xs text-[#5A6B7A] dark:text-slate-400">
          Typical timeline: ~{timeline.estimatedDays} days
          {!timeline.assessmentNeedsPA && ' · Assessment can start now (no PA needed)'}
        </p>
      )}
    </div>
  );
}
