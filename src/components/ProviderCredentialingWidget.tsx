// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * ProviderCredentialingWidget — shows the BCBA/therapist a clear path from
 * "signed up" → "verified, accepting patients."
 *
 * 4 checks shown as a progress card:
 *   1. Identity (Stripe Identity — gov ID + selfie)
 *   2. Background (Checkr)
 *   3. License (CMS NPI + state board)
 *   4. Malpractice (COI upload + admin review)
 *
 * Each row has its status pill + action button. Provider can't see patients
 * until all four are verified — banner makes this crystal clear.
 *
 * Drops into ProviderPortal as a top-of-page widget when status !== 'verified'.
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronRight, Loader2, Camera, FileSearch, FileCheck, Award, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCredentialingStatus,
  startIdentityVerification,
  runOIGExclusionCheck,
  type CredentialingStatus,
  type CheckStatus,
} from '../lib/provider-credentialing-automation';

interface ProviderCredentialingWidgetProps {
  providerId: string;
  /** When all 4 verified, hide the widget. Set false to always show. */
  hideWhenComplete?: boolean;
  className?: string;
}

const CHECK_META = {
  identity:      { label: 'Identity verified',        icon: Camera,     description: 'Verify with gov ID + selfie · Powered by Stripe Identity · ~3 min' },
  background:    { label: 'Background check',         icon: FileSearch, description: 'Criminal + identity background · Powered by Checkr · 3-5 days' },
  license:       { label: 'License verified',         icon: Award,      description: 'NPI + state board check · Auto-verified via CMS · instant if valid' },
  malpractice:   { label: 'Malpractice insurance',    icon: FileCheck,  description: 'Upload Certificate of Insurance · 1 business day to approve' },
  oig_exclusion: { label: 'Federal exclusion check',  icon: ShieldOff,  description: 'OIG LEIE check · Required for Medicaid billing · instant' },
} as const;

const STATUS_STYLE: Record<CheckStatus, { bg: string; text: string; label: string; dot: string }> = {
  not_started:      { bg: 'bg-[#EDF4F7]',   text: 'text-[#5A6B7A]',    label: 'Not started',    dot: 'bg-slate-300' },
  pending:          { bg: 'bg-amber-50',    text: 'text-amber-700',    label: 'In review',      dot: 'bg-amber-400' },
  in_progress:      { bg: 'bg-[#EEF4F8]',     text: 'text-blue-700',     label: 'In progress',    dot: 'bg-blue-400' },
  requires_input:   { bg: 'bg-orange-50',   text: 'text-orange-700',   label: 'Action needed',  dot: 'bg-orange-400' },
  verified:         { bg: 'bg-[#6B9080]/10',     text: 'text-[#6B9080]',     label: 'Verified',       dot: 'bg-primary' },
  failed:           { bg: 'bg-red-50',      text: 'text-red-700',      label: 'Failed',         dot: 'bg-red-500' },
  expired:          { bg: 'bg-orange-50',   text: 'text-orange-700',   label: 'Expired — renew', dot: 'bg-orange-400' },
};

export function ProviderCredentialingWidget({ providerId, hideWhenComplete = true, className = '' }: ProviderCredentialingWidgetProps) {
  const [status, setStatus] = useState<CredentialingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<{ firstName?: string; lastName?: string; npi?: string }>({});

  useEffect(() => { refresh(); }, [providerId]);

  async function refresh() {
    try {
      const s = await getCredentialingStatus(providerId);
      setStatus(s);
    }
    catch { /* ignore — show empty state */ }
    finally { setIsLoading(false); }
  }

  async function handleOIGCheck() {
    setWorking('oig_exclusion');
    try {
      const result = await runOIGExclusionCheck({
        providerId,
        npi: providerName.npi,
        firstName: providerName.firstName,
        lastName: providerName.lastName,
      });
      if (result.excluded) {
        toast.error('OIG exclusion found — account flagged. Contact compliance@aminy.ai.');
      } else if (result.verified) {
        toast.success('Federal exclusion check passed.');
      } else {
        toast.info('OIG API unavailable — check queued for manual review.');
      }
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'OIG check failed');
    } finally {
      setWorking(null);
    }
  }

  async function handleIdentityStart() {
    setWorking('identity');
    try {
      const { url } = await startIdentityVerification(providerId);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || 'Could not start identity verification');
      setWorking(null);
    }
  }

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-white border border-[#E8E4DF] p-4 flex items-center justify-center min-h-[120px] ${className}`}>
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!status) return null;

  if (hideWhenComplete && status.overallStatus === 'verified') return null;

  // Aggregate first license status for the "License" row
  const firstLicense = status.licenses[0] || { type: 'license' as const, status: 'not_started' as CheckStatus };

  const rows = [
    { key: 'identity' as const,      check: status.identity,      onAction: handleIdentityStart, actionLabel: 'Verify identity' },
    { key: 'background' as const,    check: status.background,    onAction: () => toast.info('Background check starts after identity is verified'), actionLabel: 'Start check' },
    { key: 'license' as const,       check: firstLicense,         onAction: () => toast.info('Add a state license in your profile to verify'),     actionLabel: 'Add license' },
    { key: 'malpractice' as const,   check: status.malpractice,   onAction: () => toast.info('Upload your Certificate of Insurance in your profile'), actionLabel: 'Upload COI' },
    { key: 'oig_exclusion' as const, check: status.oigExclusion,  onAction: handleOIGCheck, actionLabel: 'Run check' },
  ];

  return (
    <div className={`rounded-2xl border border-[#E8E4DF] overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(135deg, #2A7D9908 0%, #21698208 100%)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{
            background: status.overallStatus === 'verified'
              ? 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)'
              : '#fef3c7'
          }}
        >
          {status.overallStatus === 'verified'
            ? <ShieldCheck className="w-5 h-5" />
            : <ShieldAlert className="w-5 h-5 text-amber-700" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#132F43]">
            {status.overallStatus === 'verified'
              ? 'Fully verified — accepting patients'
              : status.overallStatus === 'failed'
                ? 'Verification issue — see below'
                : `Get verified to accept patients — ${status.completionPercent}% complete`}
          </p>
          <p className="text-sm text-[#5A6B7A] mt-0.5">
            Aminy requires all 5 checks before you can be matched with families.
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 rounded-full bg-[#EDF4F7] overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${status.completionPercent}%`,
              background: 'linear-gradient(90deg, #2A7D99 0%, #216982 100%)',
            }}
          />
        </div>
      </div>

      {/* Checks list */}
      <div className="px-2 pb-2">
        {rows.map(row => {
          const meta = CHECK_META[row.key];
          const Icon = meta.icon;
          const statusStyle = STATUS_STYLE[row.check.status];
          const needsAction = row.check.status === 'not_started' || row.check.status === 'requires_input' || row.check.status === 'failed' || row.check.status === 'expired';

          return (
            <div
              key={row.key}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E4DF] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#5A6B7A]" />
              </div>
              {/* Label owns the row width; the status pill sits beside it and
                  the action drops below — three nowrap columns previously
                  crushed the label to one letter per line at 390px. */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#132F43] truncate">{meta.label}</p>
                  <span className={`text-xs ${statusStyle.bg} ${statusStyle.text} px-2 py-1 rounded-full font-medium shrink-0 flex items-center gap-1.5 whitespace-nowrap`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    {statusStyle.label}
                  </span>
                </div>
                <p className="text-sm text-[#5A6B7A] truncate">{meta.description}</p>
                {row.check.failureReason && (
                  <p className="text-sm text-red-600 mt-0.5">{row.check.failureReason}</p>
                )}
                {needsAction && (
                  <button
                    onClick={row.onAction}
                    disabled={working === row.key}
                    className="mt-1 -ml-1 text-sm font-semibold px-2 py-1 rounded-lg text-[#6B9080] hover:bg-[#6B9080]/10 inline-flex items-center gap-0.5 disabled:opacity-50 whitespace-nowrap"
                  >
                    {working === row.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <>{row.actionLabel}<ChevronRight className="w-3 h-3" /></>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProviderCredentialingWidget;
