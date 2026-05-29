// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderPayoutSetup — Stripe Connect onboarding and balance UI
 * Shows payout setup status, onboarding CTA, balance summary, and payout history.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Loader2,
  CreditCard,
  History,
  TrendingUp,
  Shield,
  Building2,
  Pencil,
  Save,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { supabase } from '../../utils/supabase/client';
import {
  createConnectOnboardingLink,
  getConnectAccountStatus,
  getProviderPayoutHistory,
  getProviderBalance,
  formatCents,
  type ConnectAccountStatus,
  type PayoutRecord,
  type ProviderBalance,
} from '../../lib/stripe-connect';

// ============================================================================
// Practice Information — NPI / Taxonomy / Practice Name
// ============================================================================

const ABA_TAXONOMY_CODES = [
  { code: '103T00000X', label: 'BCBA — Board Certified Behavior Analyst' },
  { code: '103K00000X', label: 'BCBA-D — Board Certified Behavior Analyst (Doctoral)' },
  { code: '106S00000X', label: 'Behavior Technician / RBT' },
  { code: '235Z00000X', label: 'Speech-Language Pathologist' },
  { code: '2278P3900X', label: 'Occupational Therapist (Pediatrics)' },
  { code: '261QR0405X', label: 'Applied Behavior Analysis Clinic' },
  { code: '101YA0400X', label: 'Addiction (Behavioral Health) Counselor' },
  { code: '101YM0800X', label: 'Mental Health Counselor' },
  { code: '163WP0218X', label: 'Registered Nurse — Psychiatric/Mental Health (Pediatric)' },
  { code: '207QA0505X', label: 'Family Medicine — Adolescent Medicine' },
] as const;

interface PracticeInfo {
  npi: string;
  taxonomyCode: string;
  practiceName: string;
}

function PracticeInfoSection({ providerId }: { providerId: string | null }) {
  const [info, setInfo] = useState<PracticeInfo>({ npi: '', taxonomyCode: '', practiceName: '' });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PracticeInfo>({ npi: '', taxonomyCode: '', practiceName: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing data
  useEffect(() => {
    if (!providerId) return;
    async function load() {
      const { data } = await supabase
        .from('provider_profiles')
        .select('npi, taxonomy_code, practice_name')
        .eq('id', providerId)
        .maybeSingle();
      if (data) {
        const loaded: PracticeInfo = {
          npi: (data as Record<string, string>).npi ?? '',
          taxonomyCode: (data as Record<string, string>).taxonomy_code ?? '',
          practiceName: (data as Record<string, string>).practice_name ?? '',
        };
        setInfo(loaded);
        setDraft(loaded);
      } else {
        setEditing(true); // auto-open edit mode if no data yet
      }
    }
    load();
  }, [providerId]);

  const npiValid = (v: string) => /^\d{10}$/.test(v.replace(/\s/g, ''));

  const handleSave = async () => {
    if (!providerId) return;
    const npiClean = draft.npi.replace(/\s/g, '');
    if (!npiValid(npiClean)) {
      setSaveError('NPI must be exactly 10 digits.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const upsertData = {
        id: providerId,
        npi: npiClean,
        taxonomy_code: draft.taxonomyCode,
        practice_name: draft.practiceName,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('provider_profiles')
        .upsert(upsertData, { onConflict: 'id' });
      if (error) throw error;
      setInfo({ npi: npiClean, taxonomyCode: draft.taxonomyCode, practiceName: draft.practiceName });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save practice info');
    } finally {
      setSaving(false);
    }
  };

  const taxLabel = ABA_TAXONOMY_CODES.find((t) => t.code === info.taxonomyCode)?.label ?? info.taxonomyCode;

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-white mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <span className="font-semibold text-gray-800 text-sm">Practice Information</span>
        </div>
        {!editing && info.npi && (
          <button
            onClick={() => { setDraft({ ...info }); setEditing(true); setSaveError(null); }}
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>

      {/* Saved confirmation */}
      {saved && (
        <div className="mb-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5" />
          Practice information saved.
        </div>
      )}

      {!editing ? (
        // Read-only view
        <div className="space-y-2">
          {[
            { label: 'NPI Number', value: info.npi || '—' },
            { label: 'Taxonomy Code', value: info.taxonomyCode ? `${info.taxonomyCode} — ${taxLabel}` : '—' },
            { label: 'Practice Name', value: info.practiceName || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-500 text-xs">{label}</span>
              <span className="font-medium text-gray-700 text-xs text-right max-w-[60%] truncate">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        // Edit form
        <div className="space-y-3">
          {/* Practice Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Practice Name</label>
            <input
              type="text"
              value={draft.practiceName}
              onChange={(e) => setDraft((d) => ({ ...d, practiceName: e.target.value }))}
              placeholder="e.g. Sunshine ABA Therapy"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-gray-50"
            />
          </div>

          {/* NPI */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              NPI Number <span className="text-gray-400">(10 digits)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={draft.npi}
              onChange={(e) => setDraft((d) => ({ ...d, npi: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))}
              placeholder="1234567890"
              maxLength={10}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-gray-50"
            />
            {draft.npi.length > 0 && draft.npi.length < 10 && (
              <p className="text-xs text-amber-600 mt-1">{10 - draft.npi.length} more digit{10 - draft.npi.length !== 1 ? 's' : ''} needed</p>
            )}
            {draft.npi.length === 10 && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Valid NPI format</p>
            )}
          </div>

          {/* Taxonomy */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Taxonomy Code</label>
            <select
              value={draft.taxonomyCode}
              onChange={(e) => setDraft((d) => ({ ...d, taxonomyCode: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-gray-50"
            >
              <option value="">Select taxonomy code…</option>
              {ABA_TAXONOMY_CODES.map((t) => (
                <option key={t.code} value={t.code}>{t.code} — {t.label.split(' — ')[0]}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {saveError && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {saveError}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || draft.npi.length !== 10}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#43AA8B' }}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="w-4 h-4" />Save Practice Info</>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Props
// ============================================================================

interface ProviderPayoutSetupProps {
  onBack: () => void;
}

// ============================================================================
// Status helpers
// ============================================================================

function StatusBadge({ status }: { status: ConnectAccountStatus['status'] }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending Verification
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Not Connected
        </Badge>
      );
  }
}

function payoutStatusLabel(status: PayoutRecord['status']) {
  switch (status) {
    case 'paid': return { label: 'Paid', cls: 'bg-green-100 text-green-700' };
    case 'pending': return { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' };
    case 'failed': return { label: 'Failed', cls: 'bg-red-100 text-red-700' };
    case 'canceled': return { label: 'Canceled', cls: 'bg-gray-100 text-gray-600' };
  }
}

// ============================================================================
// Component
// ============================================================================

export function ProviderPayoutSetup({ onBack }: ProviderPayoutSetupProps) {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerEmail, setProviderEmail] = useState<string>('');
  const [accountStatus, setAccountStatus] = useState<ConnectAccountStatus | null>(null);
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ---- Load current user/provider ----
  useEffect(() => {
    async function loadProvider() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated. Please sign in.');
        setLoading(false);
        return;
      }

      setProviderEmail(user.email ?? '');

      // Look up provider record by user id
      const { data: providerRow } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const pid = providerRow?.id as string ?? user.id;
      setProviderId(pid);

      await Promise.all([
        loadStatus(pid),
        loadPayouts(pid),
      ]);

      setLoading(false);
    }

    loadProvider();
  }, []);

  const loadStatus = useCallback(async (pid: string) => {
    try {
      const status = await getConnectAccountStatus(pid);
      setAccountStatus(status);
      if (status.status === 'active' && status.stripeConnectAccountId) {
        const bal = await getProviderBalance(pid);
        setBalance(bal);
      }
    } catch (e) {
      console.error('[ProviderPayoutSetup] status error:', e);
    }
  }, []);

  const loadPayouts = useCallback(async (pid: string) => {
    try {
      const history = await getProviderPayoutHistory(pid, 20);
      setPayouts(history);
    } catch (e) {
      console.error('[ProviderPayoutSetup] payout history error:', e);
    }
  }, []);

  const handleSetupPayouts = async () => {
    if (!providerId) return;
    setOnboarding(true);
    setError(null);
    try {
      const result = await createConnectOnboardingLink(providerId, providerEmail);
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start payout setup');
      setOnboarding(false);
    }
  };

  const handleRefresh = async () => {
    if (!providerId) return;
    setLoading(true);
    await Promise.all([loadStatus(providerId), loadPayouts(providerId)]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg, #f9fafb)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const isActive = accountStatus?.status === 'active';
  const isPending = accountStatus?.status === 'pending';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg, #f9fafb)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#0D1B2A' }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base">Payout Setup</h1>
          <p className="text-white/50 text-xs">Receive payments for your sessions</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">

        {/* Practice Information — NPI / Taxonomy / Practice Name */}
        <PracticeInfoSection providerId={providerId} />

        <div className="space-y-4">

        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Connect URL return notice */}
        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('connect') === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-700">Stripe onboarding complete! Your account is being verified.</p>
          </motion.div>
        )}

        {/* Status card */}
        <Card className="p-5 rounded-2xl border-0 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-teal-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Stripe Connect</span>
            </div>
            {accountStatus && <StatusBadge status={accountStatus.status} />}
          </div>

          {/* Status description */}
          {!isActive && !isPending && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">
                Connect your bank account to receive payouts for completed sessions.
              </p>
              <p className="text-xs text-gray-400">
                Aminy retains a 10% platform fee. You receive 90% of each session.
              </p>
            </div>
          )}

          {isPending && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
              <p className="text-sm text-yellow-800">
                Your Stripe account is under review. This typically takes 1–2 business days.
                You can resume onboarding if additional information is needed.
              </p>
            </div>
          )}

          {isActive && balance && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-teal-50 p-3 text-center">
                <p className="text-xs text-teal-600 font-medium mb-1">Available</p>
                <p className="text-lg font-bold text-teal-700">{formatCents(balance.availableCents)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Pending</p>
                <p className="text-lg font-bold text-gray-700">{formatCents(balance.pendingCents)}</p>
              </div>
            </div>
          )}

          {/* CTA */}
          {!isActive && (
            <Button
              onClick={handleSetupPayouts}
              disabled={onboarding}
              className="w-full h-10 rounded-xl font-semibold text-sm text-white"
              style={{ backgroundColor: '#43AA8B' }}
            >
              {onboarding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe…</>
              ) : isPending ? (
                <><ExternalLink className="w-4 h-4 mr-2" />Resume Stripe Onboarding</>
              ) : (
                <><ExternalLink className="w-4 h-4 mr-2" />Set Up Payouts</>
              )}
            </Button>
          )}

          {isActive && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <Shield className="w-3 h-3" />
              <span>Payouts processed securely via Stripe</span>
            </div>
          )}
        </Card>

        {/* Fee info card */}
        <Card className="p-4 rounded-2xl border-0 shadow-sm bg-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="font-semibold text-gray-800 text-sm">Payout Schedule</span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Platform fee', value: '10%' },
              { label: 'Your share', value: '90%' },
              { label: 'Payout timing', value: '2 business days' },
              { label: 'Minimum payout', value: '$0 (auto)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Payout history */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-800 text-sm">Payout History</span>
              {payouts.length > 0 && (
                <Badge className="bg-teal-50 text-teal-700 border-0 text-xs">
                  {payouts.length}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-400">{showHistory ? 'Hide' : 'View'}</span>
          </button>

          {showHistory && (
            <div className="border-t border-gray-100">
              {payouts.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No payouts yet</p>
                  <p className="text-xs text-gray-400 mt-1">Payouts appear here after sessions are completed and paid</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {payouts.map((payout) => {
                    const { label, cls } = payoutStatusLabel(payout.status);
                    const date = new Date(payout.createdAt);
                    return (
                      <div key={payout.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {payout.sessionDescription ?? `Session ${payout.sessionId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold text-gray-800">
                            {formatCents(payout.providerAmountCents)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
                            {label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
        </div>{/* end space-y-4 */}
      </main>
    </div>
  );
}

export default ProviderPayoutSetup;
