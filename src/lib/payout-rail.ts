// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Payout-rail resolution — sourcing-based insured rates (July 2026).
 *
 * On insured care the platform take is PURELY a function of WHO SOURCED THE
 * CLIENT (marketplace_bookings.client_source), permanently — there is no
 * pilot-expiry step-up:
 *
 *  - 'aminy_marketplace'  → insured_aminy_sourced (20%): the family found the
 *     provider through Aminy's parent app / marketplace funnel. Applies even to
 *     AACT/partner-affiliated providers — Aminy did the demand-gen either way.
 *  - 'partner_org'        → aact_pilot (5%): the partner org (AACT/Rise) brought
 *     the client. Permanent — does NOT expire. (organizations.pilot_ends_at is a
 *     contractual evaluation-window record only; it never changes rates.)
 *  - 'provider_sourced' / NULL (legacy rows) → the base rail unchanged: the
 *     provider's own insured client settles at the standard insured 10%.
 *
 * Cash-pay (25%) is a payment-method rail, not a sourcing rail — it is never
 * re-routed by client_source.
 *
 * Pure + deterministic. Rates themselves live in PLATFORM_TAKE_RATE
 * (telehealth-economics.ts) via PLATFORM_FEE_RATES (stripe-connect.ts) — this
 * module only picks WHICH rail applies.
 */

import type { PayoutRail } from './stripe-connect';

/** Who sourced the client for a given booking (marketplace_bookings.client_source). */
export type ClientSource = 'aminy_marketplace' | 'partner_org' | 'provider_sourced';

export interface ResolvePayoutRailInput {
  /** What the relationship/org config says (e.g. PARTNER_CONFIGS[org].payoutRail). */
  baseRail: PayoutRail;
  /** Who sourced the client. null/undefined = unknown → treated as provider-sourced (legacy rows). */
  clientSource?: ClientSource | null;
}

/**
 * Resolve the EFFECTIVE payout rail for a session.
 *
 * Rules (owner-approved, July 2026 — purely sourcing-based, permanent):
 *  - cash_pay is never re-routed by sourcing (payment-method rail)
 *  - clientSource === 'aminy_marketplace' → insured_aminy_sourced (20%) — this
 *    OVERRIDES an aact_pilot base rail too
 *  - clientSource === 'partner_org' → aact_pilot (5%), forever
 *  - otherwise (provider_sourced / null) → the base rail unchanged
 */
export function resolvePayoutRail(input: ResolvePayoutRailInput): PayoutRail {
  const { baseRail, clientSource } = input;

  // Cash-pay is who-pays, not who-sourced — sourcing never re-routes it.
  if (baseRail === 'cash_pay') return 'cash_pay';

  // Insured-family rails: the take is purely sourcing-based.
  if (clientSource === 'aminy_marketplace') return 'insured_aminy_sourced';
  if (clientSource === 'partner_org') return 'aact_pilot';

  return baseRail;
}
