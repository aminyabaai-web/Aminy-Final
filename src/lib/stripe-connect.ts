// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Stripe Connect — Provider Payout Service
 * Manages Express account onboarding, session transfers, and payout history
 * Platform fee: 10% — provider receives 90% of session amount
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ConnectAccountStatus {
  providerId: string;
  stripeConnectAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  status: 'not_connected' | 'pending' | 'active' | 'restricted';
}

/**
 * Care rail determines platform take rate.
 * - cash_pay: 35% to Aminy (covers marketplace, AI, compliance, support, processing)
 * - insured/partner: 10% (lighter touch — payer does the heavy lifting)
 * - aact_pilot: 5% (partner discount for AACT-affiliated providers)
 */
export type PayoutRail = 'cash_pay' | 'insured' | 'aact_pilot';

export interface SessionPayoutParams {
  sessionId: string;
  providerId: string;
  stripeConnectAccountId: string;
  sessionAmountCents: number; // Total collected from family (in cents)
  rail: PayoutRail;            // Determines take rate
  sessionDescription?: string;
}

export interface PayoutRecord {
  id: string;
  sessionId: string;
  providerId: string;
  transferId: string;
  totalAmountCents: number;
  platformFeeCents: number;
  providerAmountCents: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  createdAt: string;
  paidAt?: string;
  sessionDescription?: string;
}

export interface ProviderBalance {
  availableCents: number;
  pendingCents: number;
  currency: string;
}

export interface OnboardingLinkResult {
  url: string;
  stripeConnectAccountId: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Take-rate by rail. Single source of truth — change here, propagates everywhere.
 * Cash-pay 35% matches the implicit rate baked into CASH_PAY_VISITS.providerPayoutCents
 * in src/lib/telehealth-economics.ts.
 */
export const PLATFORM_FEE_RATES: Record<PayoutRail, number> = {
  cash_pay: 0.35,
  insured: 0.10,
  aact_pilot: 0.05,
};

export function getPlatformFeeRate(rail: PayoutRail): number {
  return PLATFORM_FEE_RATES[rail];
}

const EDGE_FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ============================================================================
// Helpers
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
}

async function getSessionToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

// ============================================================================
// createConnectOnboardingLink
// ============================================================================

/**
 * Creates (or retrieves) a Stripe Connect Express account for the provider
 * and returns an onboarding URL they must visit to complete setup.
 */
export async function createConnectOnboardingLink(
  providerId: string,
  email: string,
): Promise<OnboardingLinkResult> {
  const token = await getSessionToken();

  const response = await fetch(`${EDGE_FN_BASE}/stripe-connect-onboard`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ providerId, email }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ??
        `Connect onboarding failed (${response.status})`,
    );
  }

  const data = await response.json() as { url: string; stripeConnectAccountId: string };
  return data;
}

// ============================================================================
// getConnectAccountStatus
// ============================================================================

/**
 * Checks the provider's Connect account status by querying our edge function
 * which reads the Stripe account object and returns capability flags.
 */
export async function getConnectAccountStatus(
  providerId: string,
): Promise<ConnectAccountStatus> {
  const token = await getSessionToken();

  const response = await fetch(`${EDGE_FN_BASE}/stripe-connect-onboard?providerId=${encodeURIComponent(providerId)}&action=status`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    // Return safe default if network fails — UI can retry
    return {
      providerId,
      stripeConnectAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      status: 'not_connected',
    };
  }

  const raw = await response.json() as {
    stripeConnectAccountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };

  let status: ConnectAccountStatus['status'] = 'not_connected';
  if (raw.stripeConnectAccountId) {
    if (raw.chargesEnabled && raw.payoutsEnabled) {
      status = 'active';
    } else if (raw.detailsSubmitted) {
      status = 'pending';
    } else {
      status = 'pending';
    }
  }

  return { providerId, ...raw, status };
}

// ============================================================================
// createSessionPayout
// ============================================================================

/**
 * Transfers 90% of the session amount to the provider's connected account.
 * Uses Stripe Transfers API (platform → connected account).
 * Should only be called after the session is marked complete and payment confirmed.
 */
export async function createSessionPayout(
  params: SessionPayoutParams,
): Promise<PayoutRecord> {
  const {
    sessionId,
    providerId,
    stripeConnectAccountId,
    sessionAmountCents,
    rail,
    sessionDescription,
  } = params;

  const platformFeeCents = Math.round(sessionAmountCents * getPlatformFeeRate(rail));
  const providerAmountCents = sessionAmountCents - platformFeeCents;

  const token = await getSessionToken();

  const response = await fetch(`${EDGE_FN_BASE}/stripe-connect-onboard`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      action: 'payout',
      sessionId,
      providerId,
      stripeConnectAccountId,
      providerAmountCents,
      platformFeeCents,
      sessionAmountCents,
      sessionDescription: sessionDescription ?? `Aminy session ${sessionId}`,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ??
        `Payout failed (${response.status})`,
    );
  }

  const data = await response.json() as PayoutRecord;
  return data;
}

// ============================================================================
// getProviderPayoutHistory
// ============================================================================

/**
 * Returns a list of past payouts for the given provider, newest first.
 * Reads from the `provider_payouts` table in Supabase.
 */
export async function getProviderPayoutHistory(
  providerId: string,
  limit = 50,
): Promise<PayoutRecord[]> {
  const { data, error } = await supabase
    .from('provider_payouts')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[stripe-connect] payout history error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    providerId: row.provider_id as string,
    transferId: row.transfer_id as string,
    totalAmountCents: row.total_amount_cents as number,
    platformFeeCents: row.platform_fee_cents as number,
    providerAmountCents: row.provider_amount_cents as number,
    status: row.status as PayoutRecord['status'],
    createdAt: row.created_at as string,
    paidAt: row.paid_at as string | undefined,
    sessionDescription: row.session_description as string | undefined,
  }));
}

// ============================================================================
// getProviderBalance
// ============================================================================

/**
 * Returns the provider's pending and available balance on their connected account.
 * Calls our edge function which uses the Stripe Balance API.
 */
export async function getProviderBalance(
  providerId: string,
): Promise<ProviderBalance> {
  const token = await getSessionToken();

  const response = await fetch(
    `${EDGE_FN_BASE}/stripe-connect-onboard?providerId=${encodeURIComponent(providerId)}&action=balance`,
    {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    return { availableCents: 0, pendingCents: 0, currency: 'usd' };
  }

  const data = await response.json() as ProviderBalance;
  return data;
}

// ============================================================================
// Utility
// ============================================================================

/** Formats cents as a dollar string: 9000 → "$90.00" */
export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Returns provider net amount given total + rail (cash 35%, insured 10%, aact 5%) */
export function calculateProviderAmount(totalCents: number, rail: PayoutRail = 'cash_pay'): {
  providerCents: number;
  platformFeeCents: number;
} {
  const platformFeeCents = Math.round(totalCents * getPlatformFeeRate(rail));
  return { providerCents: totalCents - platformFeeCents, platformFeeCents };
}
