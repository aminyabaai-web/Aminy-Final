// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Payout-rail resolution — two-rate insured rail + pilot expiry (July 2026).
 *
 * The relationship/org config gives a BASE rail (cash_pay / insured / aact_pilot,
 * see partner-org.ts). Two per-booking facts can shift the EFFECTIVE rail:
 *
 *  1. WHO SOURCED THE CLIENT (marketplace_bookings.client_source):
 *     a provider-brought insured client settles at the standard insured take
 *     (10%), while a client Aminy brought the provider through the parent app /
 *     marketplace funnel settles at insured_aminy_sourced (20%). Sourcing NEVER
 *     changes cash-pay (25%) or an active aact_pilot (5%).
 *
 *  2. PILOT EXPIRY (organizations.pilot_ends_at, optional — owner sets per
 *     contract): once the expiry timestamp has passed, the aact_pilot rail
 *     resolves to the standard insured rail, and THEN the sourcing rule applies.
 *
 * Pure + deterministic (inject `now` in tests). Rates themselves live in
 * PLATFORM_TAKE_RATE (telehealth-economics.ts) via PLATFORM_FEE_RATES
 * (stripe-connect.ts) — this module only picks WHICH rail applies.
 */

import type { PayoutRail } from './stripe-connect';

/** Who sourced the client for a given booking (marketplace_bookings.client_source). */
export type ClientSource = 'aminy_marketplace' | 'provider_sourced';

export interface ResolvePayoutRailInput {
  /** What the relationship/org config says (e.g. PARTNER_CONFIGS[org].payoutRail). */
  baseRail: PayoutRail;
  /** Who sourced the client. null/undefined = unknown → treated as provider-sourced (legacy rows). */
  clientSource?: ClientSource | null;
  /** Org-level pilot expiry (ISO timestamp). null/undefined = pilot never expires. */
  pilotEndsAt?: string | null;
  /** Injectable clock for tests; defaults to the real current time. */
  now?: Date;
}

/**
 * Resolve the EFFECTIVE payout rail for a session.
 *
 * Rules (owner-approved, July 2026):
 *  - aact_pilot with pilotEndsAt in the past → insured (then the sourcing rule applies)
 *  - insured with clientSource === 'aminy_marketplace' → insured_aminy_sourced
 *  - everything else is unchanged (cash_pay and an active pilot ignore sourcing)
 */
export function resolvePayoutRail(input: ResolvePayoutRailInput): PayoutRail {
  const { baseRail, clientSource, pilotEndsAt } = input;
  const now = input.now ?? new Date();

  let rail: PayoutRail = baseRail;

  // 1. Pilot expiry: after pilot_ends_at the 5% partner discount is over — the
  //    org's providers settle on the standard insured rail. An unparseable
  //    timestamp is treated as "no expiry" (fail toward the contracted discount).
  if (rail === 'aact_pilot' && pilotEndsAt) {
    const endsMs = new Date(pilotEndsAt).getTime();
    if (!Number.isNaN(endsMs) && endsMs <= now.getTime()) {
      rail = 'insured';
    }
  }

  // 2. Sourcing split — INSURED ONLY: a client Aminy brought via the parent
  //    app / marketplace funnel carries the 20% take.
  if (rail === 'insured' && clientSource === 'aminy_marketplace') {
    rail = 'insured_aminy_sourced';
  }

  return rail;
}
