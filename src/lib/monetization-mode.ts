// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Payer-type-aware monetization mode.
 *
 * Cash-pay families get the normal subscription/upgrade funnel (hard-ish paywall).
 * INSURED families are NOT hard-paywalled — surfaces soften and route to the
 * existing coverage/benefits tools with honest "check your coverage" language.
 *
 * A user is treated as insured when ANY of the following is true on their profile:
 *   - `hasInsurance === true`                  (self-reported coverage on file)
 *   - `pilot_payers` / `pilotPayers` non-empty (partner-attributed payer mix)
 *   - `pilot_organization` / `pilotOrganization` set (enrolled via AACT/Rise/etc.)
 *
 * The function is duck-typed and null-safe so it works against BOTH shapes used
 * in the app: the snake_case Supabase `profiles` row (hasInsurance, pilot_payers,
 * pilot_organization) AND the camelCase App.tsx `UserData` (pilotPayers,
 * pilotOrganization). Anything unknown → 'cash'.
 */

export type MonetizationMode = 'cash' | 'insured';

/** Minimal duck-typed shape of the fields that determine monetization mode. */
export interface MonetizationProfileLike {
  hasInsurance?: boolean | null;
  // Supabase profiles row (snake_case)
  pilot_payers?: unknown;
  pilot_organization?: unknown;
  // App.tsx UserData (camelCase)
  pilotPayers?: unknown;
  pilotOrganization?: unknown;
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function isSetValue(value: unknown): boolean {
  // Treat null/undefined/empty-string as "not set"; everything else counts.
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Returns 'insured' if the user has insurance / partner-payer attribution,
 * otherwise 'cash'. Defaults to 'cash' for null/undefined/unknown profiles.
 */
export function getMonetizationMode(
  profile: MonetizationProfileLike | null | undefined,
): MonetizationMode {
  if (!profile || typeof profile !== 'object') return 'cash';

  if (profile.hasInsurance === true) return 'insured';

  if (isNonEmptyArray(profile.pilot_payers) || isNonEmptyArray(profile.pilotPayers)) {
    return 'insured';
  }

  if (isSetValue(profile.pilot_organization) || isSetValue(profile.pilotOrganization)) {
    return 'insured';
  }

  return 'cash';
}

/** Convenience predicate. */
export function isInsuredMode(
  profile: MonetizationProfileLike | null | undefined,
): boolean {
  return getMonetizationMode(profile) === 'insured';
}
