// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Provider Credentialing Automation — unified pipeline for the four checks
 * every BCBA/therapist needs to run a practice on Aminy:
 *
 *   1. Identity verification    — Stripe Identity (gov ID + selfie liveness)
 *   2. Background check         — Checkr (criminal, MVR if applicable)
 *   3. License verification     — CAQH ProView + state board APIs
 *   4. Malpractice insurance    — NPI Registry lookup + carrier verification
 *
 * Each step:
 *   - Has a kick-off function (creates external session/check, stores ref)
 *   - Has a status-poll function (checks current state)
 *   - Has a webhook handler (external service notifies us of completion)
 *
 * Required Supabase secrets (set what you have; app degrades gracefully):
 *   - STRIPE_SECRET_KEY (you have this)
 *   - CHECKR_API_KEY
 *   - CAQH_API_KEY  (CAQH ProView Plus — they have a partner API)
 *   - NPI_VERIFY_USE_CMS (set 'true' to use the free CMS NPI registry — no key needed)
 */

import { supabase } from '../utils/supabase/client';

export type CheckType = 'identity' | 'background' | 'license' | 'malpractice';

export type CheckStatus =
  | 'not_started'
  | 'pending'        // initiated, waiting on external service
  | 'in_progress'    // user has to complete (e.g. take selfie)
  | 'requires_input' // we need more info from provider
  | 'verified'
  | 'failed'
  | 'expired';

export interface CredentialCheck {
  type: CheckType;
  status: CheckStatus;
  externalRef?: string;       // Stripe session ID, Checkr report ID, etc.
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  resultData?: Record<string, unknown>;
  failureReason?: string;
}

// ─── 1. Stripe Identity ─────────────────────────────────────────────────────

/**
 * Kicks off Stripe Identity verification — returns a session URL the provider
 * visits to upload gov ID + take selfie. Stripe handles the entire flow.
 *
 * Calls our /credentialing/stripe-identity edge function so the API key
 * stays server-side.
 */
export async function startIdentityVerification(providerId: string): Promise<{ url: string; sessionId: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in first');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credentialing-automation/stripe-identity/start`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ providerId }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Identity verification could not be started');
  }
  return await response.json();
}

// ─── 2. Background check (Checkr) ──────────────────────────────────────────

export interface BackgroundCheckInput {
  providerId: string;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;     // YYYY-MM-DD
  ssn: string;     // Last 4 only — we never store the full SSN
  zipcode: string;
  /** Package tier — 'basic' (~$25), 'pro' (~$60 with verification), 'pro_with_mvr' (~$80) */
  packageTier: 'basic' | 'pro' | 'pro_with_mvr';
}

/**
 * Starts a Checkr background check. Returns the invitation URL the provider
 * must complete to consent + give Checkr the data they need.
 */
export async function startBackgroundCheck(input: BackgroundCheckInput): Promise<{ invitationUrl: string; checkrCandidateId: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in first');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credentialing-automation/checkr/start`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Background check could not be started');
  }
  return await response.json();
}

// ─── 3. License verification (CAQH + free CMS NPI fallback) ────────────────

export interface LicenseLookupInput {
  providerId: string;
  npiNumber: string;       // 10-digit NPI
  stateCode: string;       // 'AZ', 'CA', etc.
  licenseNumber: string;
  licenseType: string;     // 'BCBA', 'LMFT', etc.
}

/**
 * Looks up + verifies a provider's license in a specific state. Uses the free
 * CMS NPI registry first (no auth needed) for basic NPI validation, then
 * CAQH ProView for full state-board verification (requires API key).
 *
 * Falls back to manual-verification queue if neither is configured.
 */
export async function verifyStateLicense(input: LicenseLookupInput): Promise<{ status: CheckStatus; details: Record<string, unknown> }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in first');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credentialing-automation/license/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'License verification failed');
  }
  return await response.json();
}

// ─── 4. Malpractice insurance verification ─────────────────────────────────

export interface MalpracticeInput {
  providerId: string;
  carrier: string;          // 'HPSO', 'CPH & Associates', 'CM&F', 'NSO', etc.
  policyNumber: string;
  coverageAmount: number;   // in cents — typical $1M/3M = 100000000
  effectiveDate: string;
  expirationDate: string;
  certificateOfInsuranceUrl?: string;  // Provider uploads PDF
}

/**
 * Records + verifies malpractice insurance. Full automation requires carrier
 * API integration (only a few carriers expose them); fallback is COI upload +
 * manual review queue. We always validate dates + coverage amount + carrier
 * is on the approved list.
 */
export async function verifyMalpracticeInsurance(input: MalpracticeInput): Promise<{ status: CheckStatus; reason?: string }> {
  // Client-side validation first — cheap rejects before hitting the function
  const APPROVED_CARRIERS = ['HPSO', 'CPH & Associates', 'CM&F', 'NSO', 'Proliability', 'Healthcare Providers Service Organization'];
  if (!APPROVED_CARRIERS.some(c => c.toLowerCase() === input.carrier.toLowerCase())) {
    return { status: 'failed', reason: 'Carrier not on approved list. Switch carriers or contact Aminy support.' };
  }
  if (input.coverageAmount < 100000000) {  // $1M minimum
    return { status: 'failed', reason: 'Minimum coverage is $1M per incident.' };
  }
  if (new Date(input.expirationDate) < new Date()) {
    return { status: 'failed', reason: 'Policy is expired.' };
  }
  if (!input.certificateOfInsuranceUrl) {
    return { status: 'requires_input', reason: 'Upload Certificate of Insurance PDF.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in first');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credentialing-automation/malpractice/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Malpractice verification failed');
  }
  return await response.json();
}

// ─── Aggregate status (for the provider's dashboard) ───────────────────────

export interface CredentialingStatus {
  providerId: string;
  identity: CredentialCheck;
  background: CredentialCheck;
  licenses: CredentialCheck[];   // one per state
  malpractice: CredentialCheck;
  /** Overall = AND of all four. Provider can only start seeing patients when ALL verified. */
  overallStatus: 'incomplete' | 'in_review' | 'verified' | 'failed';
  completionPercent: number;
}

/** Aggregate view — drives the provider's "Get verified" dashboard widget. */
export async function getCredentialingStatus(providerId: string): Promise<CredentialingStatus> {
  const { data: checks } = await supabase
    .from('provider_credential_checks')
    .select('check_type, status, external_ref, started_at, completed_at, expires_at, result_data, failure_reason')
    .eq('provider_id', providerId)
    .order('started_at', { ascending: false });

  const { data: licenses } = await supabase
    .from('provider_state_licenses')
    .select('state_code, verification_status, license_type, expires_at')
    .eq('provider_id', providerId);

  const find = (type: CheckType): CredentialCheck => {
    const c = (checks || []).find(c => c.check_type === type);
    return c ? {
      type,
      status: c.status as CheckStatus,
      externalRef: c.external_ref,
      startedAt: c.started_at,
      completedAt: c.completed_at,
      expiresAt: c.expires_at,
      resultData: c.result_data,
      failureReason: c.failure_reason,
    } : { type, status: 'not_started' };
  };

  const identity = find('identity');
  const background = find('background');
  const malpractice = find('malpractice');
  const licenseChecks: CredentialCheck[] = (licenses || []).map(l => ({
    type: 'license',
    status: (l.verification_status as CheckStatus) ?? 'pending',
    externalRef: `${l.state_code}:${l.license_type}`,
    expiresAt: l.expires_at,
  }));

  const required = [identity, background, malpractice, licenseChecks[0] || { type: 'license' as CheckType, status: 'not_started' as CheckStatus }];
  const verifiedCount = required.filter(c => c.status === 'verified').length;
  const failedCount = required.filter(c => c.status === 'failed').length;

  const overallStatus =
    failedCount > 0 ? 'failed' :
    verifiedCount === 4 ? 'verified' :
    verifiedCount > 0 ? 'in_review' :
    'incomplete';

  return {
    providerId,
    identity,
    background,
    licenses: licenseChecks,
    malpractice,
    overallStatus,
    completionPercent: Math.round((verifiedCount / 4) * 100),
  };
}
