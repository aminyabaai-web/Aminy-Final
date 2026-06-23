// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * NPIVerifier — real-time NPI lookup via the free NPPES public API.
 * Gives BCBAs instant verified status without any manual labor on Aminy's side.
 * Auto-fires when the NPI field loses focus (or after 1s of no typing).
 *
 * AI-driven flow:
 *   1. Provider enters their 10-digit NPI
 *   2. We hit NPPES (free, CMS API) — returns name, taxonomy, active status
 *   3. We cross-check the name against the provider's profile name
 *   4. Mismatch → flag for manual review; match → auto-verified ✓
 *   5. We save the result to provider_credential_checks Supabase table
 */

import React, { useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader2, Shield, ExternalLink } from 'lucide-react';
import { Input } from '../ui/input';
import { supabase } from '../../utils/supabase/client';
import { verifyNPI } from '../../lib/provider-verification';

interface NPIVerifierProps {
  providerId: string;
  providerName?: string;
  initialNPI?: string;
  onVerified?: (npi: string, verifiedName: string) => void;
}

type VerifyState = 'idle' | 'checking' | 'verified' | 'mismatch' | 'not_found' | 'error';

export function NPIVerifier({ providerId, providerName, initialNPI = '', onVerified }: NPIVerifierProps) {
  const [npi, setNpi] = useState(initialNPI);
  const [state, setState] = useState<VerifyState>('idle');
  const [verifiedName, setVerifiedName] = useState('');
  const [taxonomy, setTaxonomy] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const runVerification = useCallback(async (npiValue: string) => {
    const clean = npiValue.replace(/\D/g, '');
    if (clean.length !== 10) return;

    setState('checking');
    try {
      const result = await verifyNPI(clean);

      if (!result.success) {
        setState(result.status === 'failed' ? 'not_found' : 'error');
        return;
      }

      const foundName = result.data?.name || '';
      setVerifiedName(foundName);
      setTaxonomy(result.data?.specialty || '');

      // Cross-check name — loose match (last name substring)
      const providerLastName = (providerName || '').split(' ').pop()?.toLowerCase() || '';
      const nameMatch = !providerLastName || foundName.toLowerCase().includes(providerLastName);

      const finalState: VerifyState = nameMatch ? 'verified' : 'mismatch';
      setState(finalState);

      // Persist to Supabase (non-blocking)
      supabase.from('provider_credential_checks').upsert({
        provider_id: providerId,
        check_type: 'npi',
        credential_number: clean,
        status: nameMatch ? 'verified' : 'manual_review',
        verified_name: foundName,
        taxonomy,
        checked_at: new Date().toISOString(),
        raw_response: result.data,
      }, { onConflict: 'provider_id,check_type' }).then(() => {});

      if (nameMatch && result.data?.name) {
        onVerified?.(clean, result.data.name);
      }
    } catch {
      setState('error');
    }
  }, [providerId, providerName, onVerified, taxonomy]);

  const handleChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 10);
    setNpi(clean);
    setState('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length === 10) {
      debounceRef.current = setTimeout(() => runVerification(clean), 800);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#1B2733] dark:text-white block">
        NPI Number
        <span className="text-sm font-normal text-[#5A6B7A] ml-2">10-digit · auto-verified via NPPES</span>
      </label>

      <div className="relative">
        <Input
          value={npi}
          onChange={e => handleChange(e.target.value)}
          placeholder="e.g. 1234567890"
          maxLength={10}
          className={`pr-10 ${
            state === 'verified' ? 'border-emerald-400 focus:ring-emerald-400/30' :
            state === 'mismatch' ? 'border-amber-400 focus:ring-amber-400/30' :
            state === 'not_found' ? 'border-red-400 focus:ring-red-400/30' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {state === 'checking' && <Loader2 className="w-4 h-4 text-[#6B9080] animate-spin" />}
          {state === 'verified' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {(state === 'mismatch' || state === 'not_found' || state === 'error') && (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          )}
          {state === 'idle' && npi.length > 0 && npi.length < 10 && (
            <span className="text-sm text-slate-400">{10 - npi.length} more</span>
          )}
        </div>
      </div>

      {/* Status feedback */}
      {state === 'verified' && (
        <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">NPI verified ✓</p>
            <p className="text-sm text-emerald-700">{verifiedName}{taxonomy ? ` · ${taxonomy}` : ''}</p>
          </div>
        </div>
      )}

      {state === 'mismatch' && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Name mismatch — flagged for manual review</p>
            <p className="text-sm text-amber-700">NPI found for "{verifiedName}" — doesn't match your profile name. Our team will verify within 1 business day.</p>
          </div>
        </div>
      )}

      {state === 'not_found' && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">NPI not found</p>
            <p className="text-sm text-red-700">
              Double-check your NPI number.{' '}
              <a
                href="https://npiregistry.cms.hhs.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Look it up on NPPES <ExternalLink className="w-3 h-3 inline" />
              </a>
            </p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <p className="text-sm text-slate-400">NPI registry temporarily unavailable — we'll verify manually.</p>
      )}

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        Verified via CMS NPPES — free, instant, no manual labor
      </p>
    </div>
  );
}
