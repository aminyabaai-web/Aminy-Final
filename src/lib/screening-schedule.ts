// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * screening-schedule.ts — the billable screening-due engine.
 *
 * Decides which validated screeners a family is due for RIGHT NOW, and whether
 * completing one is potentially billable when a provider orders/reviews it as
 * part of an encounter:
 *
 *   - CPT 96110 — developmental screening, per standardized instrument
 *     (M-CHAT, CSBS — developmental/autism/communication instruments)
 *   - CPT 96127 — brief emotional/behavioral assessment, per standardized
 *     instrument, up to 4 units/day (Vanderbilt, SCARED, PHQ-A, PSC-35)
 *
 * COMPLIANCE: parent-facing copy must say screenings are "often covered by
 * insurance when reviewed with your provider" — NEVER promise coverage.
 * Billing always flows through the provider (requiresProviderReview: true).
 *
 * The catalog is keyed off the instruments that actually exist in
 * screening-instruments.ts (age ranges/domains come from there); reimbursement
 * cents come from the CPT registry (resolveRateCents) — nothing is hardcoded.
 *
 * `getDueScreenings` is a pure function (unit-tested in
 * screening-schedule.test.ts). `loadDueScreenings` is the impure convenience
 * wrapper that gathers inputs from Supabase + localStorage for UI surfaces.
 */

import {
  SCREENING_INSTRUMENTS,
  CONCERN_ROUTES,
  getScreeningResults,
  routeConcernToScreener,
  type ScreeningType,
} from './screening-instruments';
import { resolveRateCents } from './billing/cpt-registry';
import { getMonetizationMode } from './monetization-mode';

// ============================================================================
// Types
// ============================================================================

export interface ScreeningDue {
  instrumentId: string;          // must match ids in screening-instruments.ts
  name: string;                  // parent-friendly, e.g. "ADHD check-in (Vanderbilt)"
  reason: 'age' | 'concern' | 'rescreen';
  concernTag?: string;
  ageWindow?: string;
  lastCompletedAt?: string | null;
  billable: { cpt: '96110' | '96127'; estReimbursementCents: number; requiresProviderReview: true } | null;
  priority: number;              // 1 = highest
}

export interface DueScreeningsInput {
  childAgeMonths: number | null;
  concerns: string[];            // from funnel multi-select
  completed: { instrumentId: string; completedAt: string }[];
  hasInsuranceOnFile: boolean;
}

// ============================================================================
// Instrument → CPT mapping + parent-friendly labels
// ============================================================================

/** Re-screen when the last completion is older than this. */
export const RESCREEN_AFTER_DAYS = 180;

/** Never return more than this many due screenings (avoid overwhelming parents). */
export const MAX_DUE_SCREENINGS = 4;

/**
 * Which CPT code a provider would document each instrument against.
 * - Developmental/communication instruments → 96110 (developmental screening)
 * - Emotional/behavioral instruments → 96127 (brief emotional/behavioral assessment)
 * - PHQ-9 is administered to the CAREGIVER, not the patient — the matching
 *   caregiver-focused code (96161) is not in the CPT registry, so it is never
 *   marked billable here. It still surfaces as a due screening.
 */
export const SCREENING_CPT_BY_INSTRUMENT: Record<ScreeningType, '96110' | '96127' | null> = {
  mchat: '96110',
  csbs: '96110',
  vanderbilt: '96127',
  scared: '96127',
  'phq-a': '96127',
  psc: '96127',
  'phq-9': null,
};

/** Instruments where age-window ALONE makes them due (developmental surveillance). */
const AGE_BASELINE_INSTRUMENTS: ScreeningType[] = ['mchat', 'csbs'];

/** Instruments administered to the caregiver — exempt from child-age gating. */
const CAREGIVER_INSTRUMENTS = new Set<ScreeningType>(['phq-9']);

/** Stable catalog order (used as the tie-break within a priority band). */
const CATALOG_ORDER: ScreeningType[] = ['mchat', 'csbs', 'vanderbilt', 'scared', 'phq-a', 'psc', 'phq-9'];

/** Parent-friendly display names (fallback derives from the instrument itself). */
const PARENT_LABELS: Partial<Record<ScreeningType, string>> = {
  mchat: 'Toddler autism check-in (M-CHAT)',
  csbs: 'Communication check-in (CSBS)',
  vanderbilt: 'ADHD check-in (Vanderbilt)',
  scared: 'Anxiety check-in (SCARED)',
  'phq-a': 'Teen mood check-in (PHQ-A)',
  psc: 'Behavior & mood check-in (PSC-35)',
  'phq-9': 'Caregiver wellbeing check-in (PHQ-9)',
};

const REASON_PRIORITY: Record<ScreeningDue['reason'], number> = {
  concern: 1,
  age: 2,
  rescreen: 3,
};

// ============================================================================
// Helpers
// ============================================================================

function parentLabel(id: ScreeningType): string {
  const inst = SCREENING_INSTRUMENTS[id];
  return PARENT_LABELS[id] ?? `${inst.screenFor} check-in (${inst.name})`;
}

function formatAgeWindow(id: ScreeningType): string {
  const { min, max } = SCREENING_INSTRUMENTS[id].ageRange;
  if (max <= 36) return `${min}–${max} months`;
  return `${Math.round(min / 12)}–${Math.round(max / 12)} years`;
}

/** Child-age eligibility. Caregiver instruments always pass; unknown age passes. */
function ageEligible(id: ScreeningType, childAgeMonths: number | null): boolean {
  if (CAREGIVER_INSTRUMENTS.has(id)) return true;
  if (childAgeMonths === null) return true; // can't disprove — allow concern/rescreen paths
  const { min, max } = SCREENING_INSTRUMENTS[id].ageRange;
  return childAgeMonths >= min && childAgeMonths <= max;
}

/**
 * Map funnel concern strings to instrument ids. Tries an exact CONCERN_ROUTES
 * label match first, then the keyword router. Returns instrument → concernTag
 * (first concern that flagged it wins).
 */
function concernFlaggedInstruments(concerns: string[]): Map<ScreeningType, string> {
  const flagged = new Map<ScreeningType, string>();
  for (const concern of concerns) {
    if (typeof concern !== 'string' || !concern.trim()) continue;
    const exact = CONCERN_ROUTES.find(
      (r) => r.concern.toLowerCase() === concern.trim().toLowerCase(),
    );
    const route = exact ?? routeConcernToScreener(concern);
    if (!route) continue;
    for (const id of route.recommendedScreeners) {
      if (!flagged.has(id)) flagged.set(id, route.concern);
    }
  }
  return flagged;
}

function daysSince(iso: string, now: number): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now - t) / (24 * 60 * 60 * 1000);
}

/**
 * Billing metadata for a due instrument. Non-null ONLY when insurance is on
 * file, the instrument maps to a screener CPT, and the CPT registry can
 * resolve an estimated rate. Cents come from resolveRateCents (payer overrides
 * → payer schedule → defaultReimbursementCents) — never hardcoded here.
 */
export function billableForInstrument(
  id: ScreeningType,
  hasInsuranceOnFile: boolean,
): ScreeningDue['billable'] {
  if (!hasInsuranceOnFile) return null;
  const cpt = SCREENING_CPT_BY_INSTRUMENT[id];
  if (!cpt) return null;
  const cents = resolveRateCents(cpt);
  if (!cents || cents <= 0) return null;
  return { cpt, estReimbursementCents: cents, requiresProviderReview: true };
}

// ============================================================================
// Pure engine
// ============================================================================

/**
 * Compute which screenings are due, priority-sorted (concern > age > rescreen),
 * capped at MAX_DUE_SCREENINGS.
 *
 * Rules:
 *  - Concern-flagged domains (funnel multi-select) are due immediately.
 *  - Developmental instruments (M-CHAT 16-30mo, CSBS 6-24mo) are due whenever
 *    the child is inside the instrument's age window.
 *  - A completion within the last 180 days suppresses the instrument; older
 *    completions convert the reason to 'rescreen' (concernTag preserved) and
 *    also make previously-completed instruments due again on their own.
 *  - `billable` is non-null only when hasInsuranceOnFile (see
 *    billableForInstrument). Estimated cents come from the CPT registry.
 */
export function getDueScreenings(input: DueScreeningsInput): ScreeningDue[] {
  const { childAgeMonths, hasInsuranceOnFile } = input;
  const concerns = Array.isArray(input.concerns) ? input.concerns : [];
  const completed = Array.isArray(input.completed) ? input.completed : [];
  const now = Date.now();

  // Latest completion per instrument
  const lastCompleted = new Map<string, string>();
  for (const c of completed) {
    if (!c?.instrumentId || !c?.completedAt) continue;
    const prev = lastCompleted.get(c.instrumentId);
    if (!prev || new Date(c.completedAt).getTime() > new Date(prev).getTime()) {
      lastCompleted.set(c.instrumentId, c.completedAt);
    }
  }

  const candidates = new Map<ScreeningType, { reason: ScreeningDue['reason']; concernTag?: string }>();

  // 1) Concern-flagged (highest priority)
  const flagged = concernFlaggedInstruments(concerns);
  for (const id of CATALOG_ORDER) {
    const tag = flagged.get(id);
    if (tag && ageEligible(id, childAgeMonths)) {
      candidates.set(id, { reason: 'concern', concernTag: tag });
    }
  }

  // 2) Age-window baseline (developmental surveillance) — needs a known age
  if (childAgeMonths !== null) {
    for (const id of AGE_BASELINE_INSTRUMENTS) {
      const { min, max } = SCREENING_INSTRUMENTS[id].ageRange;
      if (childAgeMonths >= min && childAgeMonths <= max && !candidates.has(id)) {
        candidates.set(id, { reason: 'age' });
      }
    }
  }

  // 3) Completion gate + re-screen conversion
  for (const [id, meta] of [...candidates]) {
    const last = lastCompleted.get(id);
    if (!last) continue;
    const age = daysSince(last, now);
    if (age <= RESCREEN_AFTER_DAYS) {
      candidates.delete(id); // recently done — not due
    } else {
      candidates.set(id, { ...meta, reason: 'rescreen' }); // stale — due again
    }
  }

  // 4) Standalone re-screens: previously completed, >180 days old, still
  //    age-eligible, not already a candidate.
  for (const id of CATALOG_ORDER) {
    if (candidates.has(id)) continue;
    const last = lastCompleted.get(id);
    if (!last) continue;
    if (daysSince(last, now) <= RESCREEN_AFTER_DAYS) continue;
    if (!ageEligible(id, childAgeMonths)) continue;
    candidates.set(id, { reason: 'rescreen' });
  }

  // Assemble, priority-sort (reason band, then catalog order), cap
  const due: ScreeningDue[] = [...candidates.entries()].map(([id, meta]) => ({
    instrumentId: id,
    name: parentLabel(id),
    reason: meta.reason,
    concernTag: meta.concernTag,
    ageWindow: formatAgeWindow(id),
    lastCompletedAt: lastCompleted.get(id) ?? null,
    billable: billableForInstrument(id, hasInsuranceOnFile),
    priority: REASON_PRIORITY[meta.reason],
  }));

  due.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (
      CATALOG_ORDER.indexOf(a.instrumentId as ScreeningType) -
      CATALOG_ORDER.indexOf(b.instrumentId as ScreeningType)
    );
  });

  return due.slice(0, MAX_DUE_SCREENINGS);
}

// ============================================================================
// Screen routing (which app screen runs a given instrument)
// ============================================================================

/** App screen that administers this instrument for a signed-in parent. */
export function screeningScreenFor(instrumentId: string): 'mchat-screening' | 'developmental-screener' {
  return instrumentId === 'mchat' ? 'mchat-screening' : 'developmental-screener';
}

// ============================================================================
// Impure convenience loader (Supabase + localStorage) for UI surfaces
// ============================================================================

/**
 * Defensive read of the funnel's concern multi-select. The funnel persists
 * `concerns: string[]` + `primaryConcern: string` inside the
 * `aminy_screening_results` localStorage payload (and onboarding progress in
 * `aminy-onboarding-progress` also carries `concerns`). Old payloads may be a
 * bare array of results with neither — return [] in every unknown case.
 */
export function readStoredConcerns(): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim() && !out.includes(v)) out.push(v);
  };
  try {
    if (typeof localStorage === 'undefined') return out;
    for (const key of ['aminy_screening_results', 'aminy-onboarding-progress', 'aminy_screening_routing']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') continue;
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.concerns)) obj.concerns.forEach(push);
      push(obj.primaryConcern);
      push(obj.concern);
    }
  } catch {
    // Malformed cache — treat as no concerns
  }
  return out;
}

/**
 * Gather engine inputs for the signed-in user and run getDueScreenings.
 * All data sources are best-effort: any failure degrades to a conservative
 * default (no age, no completions, no insurance) instead of throwing.
 *
 * Screening completions come from BOTH the Supabase `screening_results` table
 * (post-signup home; see App.tsx handleOnboardingComplete migration) and the
 * pre-signup encrypted localStorage cache in screening-instruments.ts.
 */
export async function loadDueScreenings(options?: {
  /** Skip the children-table age lookup when the caller already knows the age. */
  childAgeMonths?: number | null;
}): Promise<ScreeningDue[]> {
  let childAgeMonths: number | null = options?.childAgeMonths ?? null;
  let hasInsuranceOnFile = false;
  const completed: { instrumentId: string; completedAt: string }[] = [];

  // Local (pre-signup) completions
  try {
    for (const r of getScreeningResults()) {
      if (r?.instrumentId && r?.completedAt) {
        completed.push({ instrumentId: r.instrumentId, completedAt: r.completedAt });
      }
    }
  } catch { /* encrypted storage unavailable */ }

  try {
    const { supabase } = await import('../utils/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [childRes, screeningRes, profileRes] = await Promise.allSettled([
        options?.childAgeMonths !== undefined
          ? Promise.resolve(null)
          : supabase
              .from('children')
              .select('age_years, age, is_primary')
              .eq('parent_id', user.id)
              .order('is_primary', { ascending: false })
              .limit(1)
              .maybeSingle(),
        supabase
          .from('screening_results')
          .select('instrument_id, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(25),
        supabase
          .from('profiles')
          .select('pilot_payers, pilot_organization')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (childRes.status === 'fulfilled' && childRes.value && 'data' in childRes.value) {
        const child = childRes.value.data as { age_years?: number | null; age?: number | null } | null;
        const years = child?.age_years ?? child?.age;
        if (typeof years === 'number' && years > 0) childAgeMonths = Math.round(years * 12);
      }
      if (screeningRes.status === 'fulfilled' && Array.isArray(screeningRes.value?.data)) {
        for (const row of screeningRes.value.data as { instrument_id?: string; completed_at?: string }[]) {
          if (row?.instrument_id && row?.completed_at) {
            completed.push({ instrumentId: row.instrument_id, completedAt: row.completed_at });
          }
        }
      }
      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        hasInsuranceOnFile = getMonetizationMode(profileRes.value.data) === 'insured';
      }
    }
  } catch { /* offline / unauthenticated — localStorage-only view */ }

  // Cached user profile may carry a self-reported hasInsurance flag
  if (!hasInsuranceOnFile) {
    try {
      const { syncEncryptedStorage } = await import('./security/encrypted-storage');
      const raw = syncEncryptedStorage.getItem('aminy-user');
      if (raw) {
        const cached = JSON.parse(raw) as Record<string, unknown>;
        hasInsuranceOnFile = getMonetizationMode(cached) === 'insured';
      }
    } catch { /* ignore */ }
  }

  return getDueScreenings({
    childAgeMonths,
    concerns: readStoredConcerns(),
    completed,
    hasInsuranceOnFile,
  });
}
