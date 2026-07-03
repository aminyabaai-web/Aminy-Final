// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Partner Organization Auto-Contract — seamless AACT (and future partner) onboarding.
 *
 * How it works:
 *   1. Partner sends caregiver/provider a link with `?org=aact` (or invite code)
 *   2. App detects this on signup OR provider-application submit
 *   3. We auto-set profile.pilot_organization, profile.pilot_payers, profile.system_of_record
 *      and apply the partner's contract rail (insured 10%, or aact_pilot 5%, etc.)
 *
 * This is the single source of truth — both parent signup and provider signup
 * use the same detection. To add a new partner, extend PARTNER_CONFIGS here.
 */

import { supabase } from '../utils/supabase/client';
import type { PayoutRail } from './stripe-connect';

export type PartnerOrgId = 'aact' | 'rise' | 'unknown';

export interface PartnerConfig {
  id: PartnerOrgId;
  displayName: string;
  /**
   * BASE care rail used for provider payouts under this partner contract.
   * The EFFECTIVE per-session rail is resolved by resolvePayoutRail
   * (src/lib/payout-rail.ts): an expired org pilot (organizations.pilot_ends_at)
   * falls back to insured, and an Aminy-sourced insured client
   * (marketplace_bookings.client_source === 'aminy_marketplace') settles at
   * insured_aminy_sourced (20%) instead of insured (10%).
   */
  payoutRail: PayoutRail;
  /** Payers covered by this partner (used to skip cash-pay setup if all-insured) */
  payers: string[];
  /** System of record for clinical data — what EMR/practice management to sync to */
  systemOfRecord: 'centralreach' | 'rethink' | 'aminy_native' | null;
  /** EVV vendor the partner uses for Medicaid compliance (feeds the state aggregator).
   *  Per-partner configurable — extensible union so new partners' vendors are valid. */
  evvSystem: 'dci' | 'sandata' | 'tellus' | 'acumen' | 'spokchoice' | 'ppl' | 'conduent' | null;
  /** Bypass cash-pay onboarding for providers (all visits insured) */
  insuredOnly: boolean;
  /** Welcome message shown after partner-attributed signup */
  welcomeMessage: string;
}

export const PARTNER_CONFIGS: Record<PartnerOrgId, PartnerConfig> = {
  aact: {
    id: 'aact',
    displayName: 'AACT Arizona',
    payoutRail: 'aact_pilot',  // 5% take rate — partner discount
    payers: ['AHCCCS', 'Aetna', 'BCBS AZ', 'Cigna', 'United Healthcare', 'Health Net', 'Mercy Care', 'Banner Health', 'Magellan', 'Optum'],
    systemOfRecord: 'rethink',   // CORRECTED: AACT uses Rethink, NOT CentralReach
    evvSystem: 'dci',            // CORRECTED: AACT uses DCI for EVV, NOT Sandata
    insuredOnly: true,
    welcomeMessage: "Welcome — you're enrolled through AACT Arizona. Your contract terms, payer mix, Rethink integration, and DCI EVV are pre-configured. You can start seeing patients today.",
  },
  rise: {
    id: 'rise',
    displayName: 'Rise Services',
    payoutRail: 'insured',
    payers: ['AHCCCS', 'BCBS', 'Cigna', 'United Healthcare'],
    systemOfRecord: 'rethink',   // Rise also uses Rethink
    evvSystem: 'dci',            // Rise also uses DCI for EVV
    insuredOnly: true,
    welcomeMessage: "Welcome — you're enrolled through Rise Services. Your Rethink integration is pre-configured.",
  },
  unknown: {
    id: 'unknown',
    displayName: 'Direct Sign-up',
    payoutRail: 'cash_pay',  // 25% platform fee — direct providers (see PLATFORM_FEE_RATES)
    payers: [],
    systemOfRecord: 'aminy_native',
    evvSystem: null,
    insuredOnly: false,
    welcomeMessage: "Welcome to Aminy. Set up your provider profile and start accepting cash-pay sessions.",
  },
};

/**
 * Detect partner org from URL query, localStorage, or invite token.
 * Call this on signup, on dashboard load, anywhere context matters.
 */
export function detectPartnerOrg(): PartnerOrgId {
  // 1. URL query: ?org=aact, ?partner=aact, or ?pilot_organization=aact
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('org') || params.get('partner') || params.get('pilot_organization');
    if (fromUrl === 'aact' || fromUrl === 'rise') {
      // Persist for later signup steps that may navigate away
      try { localStorage.setItem('aminy_partner_org', fromUrl); } catch {}
      return fromUrl as PartnerOrgId;
    }

    // 2. localStorage (persisted from earlier detection)
    try {
      const stored = localStorage.getItem('aminy_partner_org');
      if (stored === 'aact' || stored === 'rise') return stored as PartnerOrgId;
    } catch {}
  }

  return 'unknown';
}

/** Get the full config for the current partner org. */
export function getCurrentPartnerConfig(): PartnerConfig {
  return PARTNER_CONFIGS[detectPartnerOrg()];
}

/** Look up a partner config by ID. */
export function getPartnerConfig(id: PartnerOrgId): PartnerConfig {
  return PARTNER_CONFIGS[id];
}

/**
 * Apply partner config to a user's profile after signup.
 * Idempotent — safe to call multiple times.
 */
export async function applyPartnerToProfile(userId: string, partnerId: PartnerOrgId = detectPartnerOrg()): Promise<void> {
  if (partnerId === 'unknown') return;  // No partner — nothing to apply

  const config = PARTNER_CONFIGS[partnerId];

  const { error } = await supabase
    .from('profiles')
    .update({
      pilot_organization: partnerId,
      pilot_payers: config.payers,
      system_of_record: config.systemOfRecord,
      evv_system: config.evvSystem,
    })
    .eq('id', userId);

  if (error) {
    // Silent fail — partner attribution is best-effort, not load-bearing
    if (import.meta.env.DEV) {
      console.warn('Failed to apply partner config:', error.message);
    }
    return;
  }

  // Clear the localStorage flag — applied
  try { localStorage.removeItem('aminy_partner_org'); } catch {}
}

/**
 * Get the BASE payout rail for a given user — checks their profile's
 * pilot_organization and returns the rail the partner contract specifies.
 * Defaults to cash_pay. Callers computing fees for a specific session should
 * pass this through resolvePayoutRail (src/lib/payout-rail.ts) together with
 * the booking's client_source and the org's pilot_ends_at.
 */
export async function getPayoutRailForUser(userId: string): Promise<PayoutRail> {
  const { data } = await supabase
    .from('profiles')
    .select('pilot_organization')
    .eq('id', userId)
    .single();

  const orgId = (data?.pilot_organization as PartnerOrgId) || 'unknown';
  return PARTNER_CONFIGS[orgId]?.payoutRail || 'cash_pay';
}

/** True if the current partner contract is insurance-only (skip cash-pay setup). */
export function isInsuredOnlyPartner(): boolean {
  return getCurrentPartnerConfig().insuredOnly;
}
