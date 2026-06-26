// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * CoverageBanner — surfaces "What services your insurance covers" in BookVisit.
 *
 * Mirrors Headway's eligibility-at-the-top pattern. Parent sees:
 *   - Plan + member ID confirmed
 *   - Covered services (ABA, OT, ST, MH) with check marks
 *   - Coverage details (copay, deductible, session limits)
 *   - Prior auth requirements per service
 *   - "Verify benefits" CTA if not yet checked
 *
 * Drives off existing checkEligibility() + state benefits lookups. If no
 * eligibility on file, surfaces a one-tap CTA.
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2, ChevronRight, Check, X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface CoveredService {
  service: string;          // 'ABA', 'OT', 'ST', 'MentalHealth', etc.
  status: 'covered' | 'prior_auth_required' | 'not_covered' | 'unknown';
  copay?: number;            // cents
  sessionLimit?: number;     // sessions per year
  note?: string;
}

interface CoverageState {
  planName?: string;
  memberId?: string;
  verified: boolean;
  verifiedAt?: string;
  services: CoveredService[];
  deductibleMet?: boolean;
  outOfPocketRemaining?: number;  // cents
}

interface CoverageBannerProps {
  userId: string;
  /** Filter: only show coverage relevant to this service type */
  filterService?: string;
  onVerifyClick?: () => void;
  className?: string;
}

export function CoverageBanner({ userId, filterService, onVerifyClick, className = '' }: CoverageBannerProps) {
  const [coverage, setCoverage] = useState<CoverageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCoverage();
  }, [userId]);

  async function loadCoverage() {
    setIsLoading(true);
    try {
      // Pull most recent eligibility check from the eligibility_checks table
      const { data: latest } = await supabase
        .from('eligibility_checks')
        .select('plan_name, member_id, status, created_at, services, deductible_met, out_of_pocket_remaining_cents')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) {
        setCoverage({ verified: false, services: [] });
        setIsLoading(false);
        return;
      }

      setCoverage({
        planName: latest.plan_name,
        memberId: latest.member_id,
        verified: latest.status === 'active',
        verifiedAt: latest.created_at,
        services: (latest.services as CoveredService[]) || [],
        deductibleMet: latest.deductible_met,
        outOfPocketRemaining: latest.out_of_pocket_remaining_cents,
      });
    } catch {
      setCoverage({ verified: false, services: [] });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-white border border-[#E8E4DF] p-3 flex items-center justify-center ${className}`}>
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Not verified yet — soft CTA to run an eligibility check
  if (!coverage?.verified) {
    return (
      <div className={`rounded-2xl p-4 border ${className}`}
        style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Verify your insurance first</p>
            <p className="text-sm text-amber-800 mt-0.5">
              See what services your plan covers, your copay, and which require prior authorization — takes 30 seconds.
            </p>
          </div>
          <button
            onClick={onVerifyClick}
            className="shrink-0 text-sm font-semibold px-3 py-2 rounded-xl text-white whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #4E93A8 0%, #577590 100%)' }}
          >
            Verify <ChevronRight className="w-3 h-3 inline" />
          </button>
        </div>
      </div>
    );
  }

  // Verified — show summary, filter by service if requested
  const relevantServices = filterService
    ? coverage.services.filter(s => s.service.toLowerCase().includes(filterService.toLowerCase()))
    : coverage.services;

  return (
    <div className={`rounded-2xl p-4 border ${className}`}
      style={{ background: 'linear-gradient(135deg, #4E93A810 0%, #57759010 100%)', borderColor: '#4E93A830' }}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-[#6B9080]" />
        <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide">
          Verified · {coverage.planName || 'Insurance on file'}
        </p>
      </div>

      <div className="space-y-1.5">
        {relevantServices.length === 0 ? (
          <p className="text-sm text-[#5A6B7A]">No coverage details available yet — verify again to refresh.</p>
        ) : relevantServices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {s.status === 'covered' && <Check className="w-3.5 h-3.5 text-[#6B9080] shrink-0" />}
            {s.status === 'prior_auth_required' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            {s.status === 'not_covered' && <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            {s.status === 'unknown' && <span className="w-3.5 h-3.5 text-center text-slate-400">?</span>}

            <span className="font-medium text-[#1B2733]">{s.service}</span>
            <span className="text-[#5A6B7A]">·</span>
            <span className={
              s.status === 'covered' ? 'text-[#6B9080]' :
              s.status === 'prior_auth_required' ? 'text-amber-700' :
              s.status === 'not_covered' ? 'text-red-600' :
              'text-[#5A6B7A]'
            }>
              {s.status === 'covered' && (s.copay != null ? `$${(s.copay / 100).toFixed(0)} copay` : 'Covered')}
              {s.status === 'prior_auth_required' && 'Prior auth required'}
              {s.status === 'not_covered' && 'Not covered'}
              {s.status === 'unknown' && 'Coverage unclear'}
            </span>
            {s.sessionLimit && (
              <span className="text-slate-400 ml-1">· {s.sessionLimit}/yr</span>
            )}
          </div>
        ))}
      </div>

      {coverage.outOfPocketRemaining != null && (
        <div className="mt-3 pt-3 border-t border-[#6B9080]/20 flex items-center justify-between text-sm">
          <span className="text-[#5A6B7A]">Out-of-pocket remaining this year:</span>
          <span className="font-semibold text-[#1B2733]">
            ${(coverage.outOfPocketRemaining / 100).toFixed(0)}
          </span>
        </div>
      )}

      {onVerifyClick && (
        <button
          onClick={onVerifyClick}
          className="mt-2 text-sm text-[#6B9080] font-medium hover:underline"
        >
          Re-verify benefits
        </button>
      )}
    </div>
  );
}

export default CoverageBanner;
