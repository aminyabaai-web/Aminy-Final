/**
 * InsuranceEligibilityCheck — Real-time eligibility widget
 * Uses Stedi 270/271 API via insurance-eligibility.ts
 * Falls back to mock data in dev mode when VITE_STEDI_API_KEY is absent.
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
} from 'lucide-react';
import {
  checkEligibility,
  isEligibilityConfigured,
  type EligibilityRequest,
  type EligibilityResult,
} from '../../lib/insurance-eligibility';

// ============================================================================
// Top-20 ABA payers — Stedi payer IDs from payer-configs.ts
// ============================================================================

const ABA_PAYERS: { label: string; payerId: string }[] = [
  { label: 'UnitedHealthcare / Optum', payerId: '87726' },
  { label: 'Aetna', payerId: '60054' },
  { label: 'Cigna', payerId: '62308' },
  { label: 'Humana', payerId: '61101' },
  { label: 'Anthem Blue Cross Blue Shield', payerId: '00880' },
  { label: 'Blue Cross Blue Shield of Illinois', payerId: '00621' },
  { label: 'Medicaid — Arizona (AHCCCS)', payerId: 'SKAZ0' },
  { label: 'Medicaid — Montana', payerId: 'SKMT0' },
  { label: 'Medicaid — California (Medi-Cal)', payerId: 'SKCA0' },
  { label: 'Medicaid — Texas', payerId: 'SKTX0' },
  { label: 'Medicaid — Florida', payerId: 'SKFL0' },
  { label: 'Magellan Health', payerId: '99726' },
  { label: 'Beacon Health Options', payerId: '94135' },
  { label: 'Molina Healthcare', payerId: '20934' },
  { label: 'Centene / WellCare', payerId: '23284' },
  { label: 'Carelon Behavioral Health', payerId: '47198' },
  { label: 'Tricare', payerId: '46045' },
  { label: 'Coventry / First Health', payerId: '78857' },
  { label: 'Kaiser Permanente', payerId: '13551' },
  { label: 'Oscar Health', payerId: '00990' },
];

// ============================================================================
// Props
// ============================================================================

export interface InsuranceEligibilityCheckProps {
  onResult?: (result: EligibilityResult) => void;
  prefill?: Partial<EligibilityRequest>;
}

// ============================================================================
// Helpers
// ============================================================================

const inputCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#43AA8B] transition-colors';
const selectCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#43AA8B] bg-white transition-colors';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ============================================================================
// Result Card sub-component
// ============================================================================

function ResultCard({ result }: { result: EligibilityResult }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header row */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          result.active ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'
        }`}
      >
        {result.active ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${result.active ? 'text-green-800' : 'text-red-700'}`}>
            {result.active ? 'Active Coverage' : 'Inactive / Not Found'}
          </p>
          <p className="text-xs text-slate-500 truncate">{result.planName}</p>
        </div>
        {/* Auth required badge */}
        {result.authRequired && (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0">
            <ShieldAlert className="w-3 h-3" />
            Auth Required
          </span>
        )}
        {!result.authRequired && result.active && (
          <span className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0">
            <ShieldCheck className="w-3 h-3" />
            No Auth Needed
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {result.groupNumber && (
          <p className="text-xs text-slate-500">Group #: <span className="text-slate-700 font-medium">{result.groupNumber}</span></p>
        )}

        {/* Deductible */}
        {result.deductible && (
          <div>
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3" /> Deductible
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-[#43AA8B] rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (result.deductible.met / Math.max(result.deductible.individual, 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-slate-600 whitespace-nowrap">
                {fmt(result.deductible.met)} / {fmt(result.deductible.individual)} met
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{fmt(result.deductible.remaining)} remaining</p>
          </div>
        )}

        {/* Out-of-pocket max */}
        {result.outOfPocketMax && (
          <div>
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3" /> Out-of-Pocket Max
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (result.outOfPocketMax.met / Math.max(result.outOfPocketMax.individual, 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-slate-600 whitespace-nowrap">
                {fmt(result.outOfPocketMax.met)} / {fmt(result.outOfPocketMax.individual)} met
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{fmt(result.outOfPocketMax.remaining)} remaining</p>
          </div>
        )}

        {/* Cost-share row */}
        {(result.copay !== undefined || result.coinsurance !== undefined) && (
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {result.copay !== undefined && (
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                Copay: <strong>{fmt(result.copay)}</strong>
              </span>
            )}
            {result.coinsurance !== undefined && (
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                Coinsurance: <strong>{Math.round(result.coinsurance * 100)}%</strong>
              </span>
            )}
          </div>
        )}

        {/* Covered services */}
        {result.coveredServices.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Covered Services</p>
            <div className="flex flex-wrap gap-1">
              {result.coveredServices.map(s => (
                <span key={s} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Checked at */}
        <p className="text-xs text-slate-400">
          Checked {new Date(result.checkedAt).toLocaleString()} {!isEligibilityConfigured() && '(demo mode)'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function InsuranceEligibilityCheck({ onResult, prefill }: InsuranceEligibilityCheckProps) {
  const [memberId, setMemberId] = useState(prefill?.memberId ?? '');
  const [payerId, setPayerId] = useState(prefill?.payerId ?? ABA_PAYERS[0].payerId);
  const [dob, setDob] = useState(prefill?.dateOfBirth ?? '');
  const [firstName, setFirstName] = useState(prefill?.firstName ?? '');
  const [lastName, setLastName] = useState(prefill?.lastName ?? '');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!memberId.trim()) {
      setError('Member ID is required.');
      return;
    }
    if (!dob) {
      setError('Date of birth is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const req: EligibilityRequest = {
        memberId: memberId.trim(),
        payerId,
        firstName: firstName.trim() || 'Unknown',
        lastName: lastName.trim() || 'Unknown',
        dateOfBirth: dob,
        serviceType: 'ABA',
      };
      const res = await checkEligibility(req);
      setResult(res);
      onResult?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eligibility check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setError(null);
    handleCheck();
  }

  return (
    <div className="space-y-4">
      {/* Dev mode notice */}
      {!isEligibilityConfigured() && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Running in demo mode — add <code className="font-mono bg-amber-100 px-1 rounded">VITE_STEDI_API_KEY</code> for live eligibility checks.</span>
        </div>
      )}

      {/* Form */}
      <div className="space-y-3">
        {/* Payer */}
        <div>
          <label className={labelCls}>Payer</label>
          <select value={payerId} onChange={e => setPayerId(e.target.value)} className={selectCls}>
            {ABA_PAYERS.map(p => (
              <option key={p.payerId} value={p.payerId}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Member ID */}
        <div>
          <label className={labelCls}>Member ID</label>
          <input
            type="text"
            value={memberId}
            onChange={e => setMemberId(e.target.value)}
            placeholder="Insurance member ID"
            className={inputCls}
          />
        </div>

        {/* Child DOB */}
        <div>
          <label className={labelCls}>Child Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Optional name row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>First Name (optional)</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last Name (optional)</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Last"
              className={inputCls}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#43AA8B] hover:bg-[#3a9a7d] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking Coverage…
            </>
          ) : (
            'Check Coverage'
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Result card */}
      {result && <ResultCard result={result} />}
    </div>
  );
}
