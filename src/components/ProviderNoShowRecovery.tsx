// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Heart, CalendarClock, UserPlus, Phone, CheckCircle } from 'lucide-react';
import {
  buildFamilyApologyMessage,
  resolveProviderNoShow,
  type ApologyMessageParams,
} from '../lib/provider-no-show';

/**
 * Family-facing recovery card shown when a PROVIDER no-shows. The family is
 * never charged; this card apologizes and routes them straight to a one-tap
 * recovery — reschedule with the same provider (priority slot) or get matched
 * with someone new. The provider is copied on the apology behind the scenes.
 */

interface ProviderNoShowRecoveryProps {
  appointmentId: string;
  familyFirstName?: string;
  childName?: string;
  providerName?: string;
  scheduledStartIso?: string;
  serviceLabel?: string;
  /** Reschedule with the SAME provider (priority slot). */
  onRescheduleSame?: () => void;
  /** Match the family with a NEW provider. */
  onReassign?: () => void;
  /** Talk to a human on the care team. */
  onContactSupport?: () => void;
}

export function ProviderNoShowRecovery({
  appointmentId,
  familyFirstName,
  childName,
  providerName,
  scheduledStartIso,
  serviceLabel,
  onRescheduleSame,
  onReassign,
  onContactSupport,
}: ProviderNoShowRecoveryProps) {
  const [resolved, setResolved] = useState<null | 'rescheduled_same' | 'reassigned'>(null);

  const apologyParams: ApologyMessageParams = {
    familyFirstName,
    childName,
    providerName,
    scheduledStartIso,
    serviceLabel,
  };
  const apology = buildFamilyApologyMessage(apologyParams);
  const provider = providerName || 'your provider';

  const handleRescheduleSame = () => {
    setResolved('rescheduled_same');
    void resolveProviderNoShow(appointmentId, 'rescheduled_same');
    onRescheduleSame?.();
  };

  const handleReassign = () => {
    setResolved('reassigned');
    void resolveProviderNoShow(appointmentId, 'reassigned');
    onReassign?.();
  };

  if (resolved) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              {resolved === 'rescheduled_same'
                ? "You're set — we're holding a priority slot."
                : "On it — we're finding you a new provider."}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
              {resolved === 'rescheduled_same'
                ? `We'll confirm a new time with ${provider} and text you the details. You were not charged.`
                : 'We\'ll match you with an available provider who fits your needs and reach out shortly. You were not charged.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-rose-600 dark:text-rose-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-rose-900 dark:text-rose-100">
              {apology.subject}
            </h3>
            <p className="text-sm text-rose-800 dark:text-rose-200 mt-1.5 leading-relaxed">
              {familyFirstName ? `${familyFirstName}, we're` : "We're"} truly sorry — {provider} didn't
              join your scheduled{serviceLabel ? ` ${serviceLabel}` : ' session'}
              {childName ? ` for ${childName}` : ''}.{' '}
              <span className="font-medium">You won't be charged anything.</span> Let's make it right:
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleRescheduleSame}
            className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-700 bg-white dark:bg-slate-800 px-3.5 py-3 text-left hover:border-rose-300 dark:hover:border-rose-600 transition-colors"
          >
            <CalendarClock className="w-5 h-5 text-rose-600 dark:text-rose-300 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Reschedule with {provider}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Priority slot — you're seen first</p>
            </div>
          </button>

          <button
            onClick={handleReassign}
            className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-700 bg-white dark:bg-slate-800 px-3.5 py-3 text-left hover:border-rose-300 dark:hover:border-rose-600 transition-colors"
          >
            <UserPlus className="w-5 h-5 text-rose-600 dark:text-rose-300 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Match me with someone new
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">We'll find an available provider</p>
            </div>
          </button>
        </div>

        <button
          onClick={onContactSupport}
          className="mt-3 flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 hover:underline"
        >
          <Phone className="w-3.5 h-3.5" />
          Rather talk to a person? We'll call you.
        </button>
      </div>
    </div>
  );
}

export default ProviderNoShowRecovery;
