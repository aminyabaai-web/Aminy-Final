// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * AACT Partner Setup — onboarding screen for partner-org admins.
 *
 * Used by Cori (AACT) and equivalent partner-side admins to:
 *   1. Get a one-click invite URL they can share with their providers
 *   2. Bulk-import their provider roster via CSV
 *   3. See current onboarding progress
 *
 * Any provider who signs up via the invite link auto-gets their AACT/Rise
 * contract terms applied (handled by partner-org.ts).
 */

import React, { useEffect, useState } from 'react';
import { Copy, Check, Upload, Users, Building2, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { PARTNER_CONFIGS, type PartnerOrgId } from '../lib/partner-org';
import { PLATFORM_FEE_RATES } from '../lib/stripe-connect';
import { ScreenHeader } from './ui/ScreenHeader';

/** Proper-noun display labels for the system-of-record enum. */
const SYSTEM_OF_RECORD_LABELS: Record<string, string> = {
  rethink: 'Rethink',
  centralreach: 'CentralReach',
  aminy_native: 'Aminy',
};
function systemOfRecordLabel(sor: string | null): string {
  if (!sor) return 'Native';
  return SYSTEM_OF_RECORD_LABELS[sor] ?? sor;
}

interface AACTPartnerSetupProps {
  onBack?: () => void;
  /** Which partner org this admin manages (defaults to AACT) */
  partnerOrg?: PartnerOrgId;
}

interface ProviderRow {
  email: string;
  full_name?: string;
  provider_type?: string;
  status?: 'invited' | 'applied' | 'approved' | 'active';
}

export function AACTPartnerSetup({ onBack, partnerOrg = 'aact' }: AACTPartnerSetupProps) {
  const config = PARTNER_CONFIGS[partnerOrg];
  const [copied, setCopied] = useState(false);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [csvText, setCsvText] = useState('');
  const [showCsvInput, setShowCsvInput] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://aminy.ai'}/provider-apply?org=${partnerOrg}`;

  useEffect(() => {
    loadProviders();
  }, [partnerOrg]);

  async function loadProviders() {
    setIsLoading(true);
    const { data } = await supabase
      .from('provider_applications')
      .select('email, full_name, provider_type, status, created_at')
      .eq('partner_org', partnerOrg)
      .order('created_at', { ascending: false })
      .limit(200);
    setProviders((data || []) as ProviderRow[]);
    setIsLoading(false);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy — long-press the URL above');
    }
  }

  async function importCsv() {
    if (!csvText.trim()) return;
    setIsImporting(true);

    try {
      // Parse: one email per line, or "name,email" CSV
      const rows = csvText.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('@'))
        .map(line => {
          const parts = line.split(/[,;\t]/).map(p => p.trim());
          const email = parts.find(p => p.includes('@')) || parts[parts.length - 1];
          const name = parts.find(p => !p.includes('@') && p.length > 1);
          return { email: email.toLowerCase(), full_name: name || null };
        });

      if (rows.length === 0) {
        toast.error('No valid emails found');
        return;
      }

      // Pre-create provider_applications rows with status='invited' so the partner
      // admin can see who's expected. When they actually sign up via the invite
      // link, the row gets updated.
      const inserts = rows.map(r => ({
        email: r.email,
        full_name: r.full_name,
        partner_org: partnerOrg,
        status: 'invited' as const,
        invited_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('provider_applications')
        .upsert(inserts, { onConflict: 'email' });

      if (error) throw new Error(error.message);

      toast.success(`Imported ${rows.length} providers — ready to invite`);
      setCsvText('');
      setShowCsvInput(false);
      await loadProviders();
    } catch (e: any) {
      toast.error(e?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }

  const statusCounts = providers.reduce<Record<string, number>>((acc, p) => {
    const s = p.status || 'invited';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-mist pb-20">
      {/* Header */}
      <ScreenHeader
        title={`${config.displayName} Provider Onboarding`}
        subtitle={`One-click invites · CSV import · ${config.payoutRail.replace('_', ' ')} contract auto-applied`}
        icon={<Building2 className="w-6 h-6" />}
        onBack={onBack}
        variant="flat"
      />

      {/* Invite link card */}
      <div className="mx-4 mt-4 rounded-2xl bg-white border border-[#E8E4DF] p-4">
        <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2">Your invite link</p>
        <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#E8E4DF] rounded-xl px-3 py-2.5">
          <p className="text-xs text-[#3A4A57] flex-1 truncate font-mono">{inviteUrl}</p>
          <button
            onClick={copyInvite}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E8E4DF] transition-colors"
            aria-label="Copy invite link"
          >
            {copied ? <Check className="w-4 h-4 text-[#6B9080]" /> : <Copy className="w-4 h-4 text-[#5A6B7A]" />}
          </button>
        </div>
        <p className="text-xs text-[#5A6B7A] mt-2">
          Any provider who signs up via this link gets the {config.displayName} contract terms ({(1 - getRatePercent(config.payoutRail)) * 100}% provider take, {config.payers.length} insurance payers, {systemOfRecordLabel(config.systemOfRecord)} sync) automatically applied.
        </p>
      </div>

      {/* What they'll get */}
      <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #43AA8B12 0%, #57759012 100%)', border: '1px solid #43AA8B30' }}>
        <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide mb-2">What your providers get</p>
        <ul className="space-y-1.5 text-sm text-[#3A4A57]">
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" /><span>Pre-contracted with {config.payers.length} payers (no credentialing wait)</span></li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" /><span>Sync with {systemOfRecordLabel(config.systemOfRecord)} — sessions, notes, claims auto-flow</span></li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" /><span>{config.evvSystem ? `${config.evvSystem.toUpperCase()} EVV compliance built-in` : 'No EVV needed'}</span></li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-[#6B9080] mt-0.5 shrink-0" /><span>Aminy AI assistant for documentation, supervision, and clinical decision support</span></li>
        </ul>
      </div>

      {/* Bulk import */}
      <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Bulk Import</p>
            <p className="text-sm text-[#3A4A57] mt-0.5">Paste your provider roster — we'll pre-create their accounts</p>
          </div>
          {!showCsvInput && (
            <button onClick={() => setShowCsvInput(true)} className="text-xs text-[#6B9080] font-semibold px-2.5 py-1 bg-[#6B9080]/10 rounded-full">
              <Upload className="w-3.5 h-3.5 inline mr-1" />Import
            </button>
          )}
        </div>

        {showCsvInput && (
          <div className="space-y-2">
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`one email per line, OR "Name, email" per line\n\nexample@aact.com\nDr. Sarah Lee, sarah@aact.com\nrbt@aact.com`}
              rows={6}
              className="w-full text-sm font-mono border border-[#E8E4DF] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#6B9080]"
            />
            <div className="flex gap-2">
              <button
                onClick={importCsv}
                disabled={isImporting || !csvText.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #43AA8B 0%, #577590 100%)' }}
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isImporting ? 'Importing…' : 'Import'}
              </button>
              <button onClick={() => { setShowCsvInput(false); setCsvText(''); }} className="text-sm text-[#5A6B7A] px-4 py-2.5 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Provider roster + status */}
      <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF]">
        <div className="px-4 pt-3 pb-2 border-b border-[#E8E4DF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide">Roster ({providers.length})</p>
          </div>
          <button onClick={loadProviders} className="text-xs text-[#6B9080]">Refresh</button>
        </div>

        {/* Status pills */}
        {providers.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-[#E8E4DF]">
            {['invited', 'applied', 'approved', 'active'].map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#F0EDE8] text-[#3A4A57] capitalize">
                {s}: {statusCounts[s] || 0}
              </span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="px-4 py-6 text-center"><Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" /></div>
        ) : providers.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-[#5A6B7A]">No providers yet. Share your invite link or bulk-import above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {providers.map((p, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center text-sm font-semibold text-[#5A6B7A] shrink-0">
                  {(p.full_name || p.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {p.full_name && <p className="text-sm font-medium text-[#1B2733] truncate">{p.full_name}</p>}
                  <p className="text-xs text-[#5A6B7A] truncate">{p.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0EDE8] text-[#5A6B7A] capitalize shrink-0">{p.status || 'invited'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getRatePercent(rail: string): number {
  // Single source of truth: PLATFORM_FEE_RATES in stripe-connect.ts
  if (rail === 'aact_pilot') return PLATFORM_FEE_RATES.aact_pilot;
  if (rail === 'insured') return PLATFORM_FEE_RATES.insured;
  return PLATFORM_FEE_RATES.cash_pay;
}

export default AACTPartnerSetup;
