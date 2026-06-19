// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider No-Show Handling
 * ─────────────────────────
 * When a PROVIDER fails to show for a booked session, Aminy does NOT pay the
 * family a cash credit (owner decision — we can't absorb provider failures as
 * cash). Instead we run a fast, accountable recovery flow:
 *
 *   1. A grace window after the scheduled start (PROVIDER_JOIN_GRACE_MINUTES).
 *      If the provider never joins, the session is flagged `provider_no_show`.
 *   2. The family immediately gets a sincere apology + one-tap recovery:
 *        • "Reschedule with the same provider" (priority slot), or
 *        • "Match me with someone new" (reassign).
 *      The provider is COPIED on the apology so they're accountable and can
 *      reach out — but the family never waits on them.
 *   3. If the provider doesn't respond within PROVIDER_RESPONSE_WINDOW_MINUTES,
 *      we auto-offer reassignment so the family is never stuck.
 *   4. Every provider no-show is recorded. Repeat offenders escalate through
 *      reliability tiers (warning → probation → removed-from-matching) on a
 *      rolling 90-day window.
 *
 * The family is NEVER charged for a provider no-show, and the provider earns
 * $0 for it.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Timing constants
// ============================================================================

/** Minutes after scheduled start before a no-show provider is auto-flagged. */
export const PROVIDER_JOIN_GRACE_MINUTES = 10;

/**
 * Minutes we wait for the provider to respond (reschedule offer) after a
 * no-show is declared before auto-offering the family a reassignment.
 */
export const PROVIDER_RESPONSE_WINDOW_MINUTES = 30;

/** Rolling window over which provider no-shows are counted for tiering. */
export const PROVIDER_NOSHOW_ROLLING_DAYS = 90;

// ============================================================================
// Reliability tiers (repeat-offender escalation)
// ============================================================================

export type ProviderReliabilityTier =
  | 'good_standing'
  | 'warning'
  | 'probation'
  | 'suspended';

/**
 * No-show count → reliability tier, over a rolling PROVIDER_NOSHOW_ROLLING_DAYS
 * window. Thresholds are inclusive lower bounds.
 *   0 no-shows      → good_standing
 *   1 no-show       → warning      (private nudge, still matchable)
 *   2 no-shows      → probation    (visible flag, deprioritized in matching)
 *   3+ no-shows     → suspended    (removed from matching pending review)
 */
export const PROVIDER_NOSHOW_THRESHOLDS = {
  warning: 1,
  probation: 2,
  suspended: 3,
} as const;

export interface ReliabilityConsequence {
  tier: ProviderReliabilityTier;
  /** Short status label for the ops dashboard. */
  label: string;
  /** Is the provider still surfaced to families in matching? */
  matchable: boolean;
  /** Are they deprioritized (shown after good-standing providers)? */
  deprioritized: boolean;
  /** Human-readable consequence + the action ops should take. */
  description: string;
}

export function getProviderReliabilityTier(
  rollingNoShowCount: number,
): ProviderReliabilityTier {
  if (rollingNoShowCount >= PROVIDER_NOSHOW_THRESHOLDS.suspended) return 'suspended';
  if (rollingNoShowCount >= PROVIDER_NOSHOW_THRESHOLDS.probation) return 'probation';
  if (rollingNoShowCount >= PROVIDER_NOSHOW_THRESHOLDS.warning) return 'warning';
  return 'good_standing';
}

export function getReliabilityConsequence(
  tier: ProviderReliabilityTier,
): ReliabilityConsequence {
  switch (tier) {
    case 'warning':
      return {
        tier,
        label: 'Warning',
        matchable: true,
        deprioritized: false,
        description:
          'First no-show in 90 days. Private reminder sent; reliability is tracked. No matching impact yet.',
      };
    case 'probation':
      return {
        tier,
        label: 'Probation',
        matchable: true,
        deprioritized: true,
        description:
          'Second no-show in 90 days. Provider is deprioritized in matching and flagged for a check-in from Aminy. One more triggers suspension.',
      };
    case 'suspended':
      return {
        tier,
        label: 'Suspended',
        matchable: false,
        deprioritized: true,
        description:
          'Three or more no-shows in 90 days. Provider is removed from new-family matching pending a manual reliability review.',
      };
    case 'good_standing':
    default:
      return {
        tier: 'good_standing',
        label: 'Good standing',
        matchable: true,
        deprioritized: false,
        description: 'No no-shows in the last 90 days.',
      };
  }
}

// ============================================================================
// Auto-reassign decision
// ============================================================================

/**
 * After a provider no-show is declared, should the family be auto-offered a
 * reassignment yet? True once the provider-response window has elapsed without
 * the provider proposing a reschedule.
 */
export function shouldAutoOfferReassignment(options: {
  declaredAtIso: string;
  providerResponded: boolean;
  nowIso?: string;
}): boolean {
  if (options.providerResponded) return false;
  const declared = new Date(options.declaredAtIso).getTime();
  const now = options.nowIso ? new Date(options.nowIso).getTime() : Date.now();
  const elapsedMin = (now - declared) / 60000;
  return elapsedMin >= PROVIDER_RESPONSE_WINDOW_MINUTES;
}

/**
 * Has the provider's join grace window elapsed (i.e. we can declare a no-show)?
 * `joinedAt` short-circuits to false — a provider who joined cannot no-show.
 */
export function isProviderNoShowEligible(options: {
  scheduledStartIso: string;
  providerJoinedAt?: string | null;
  nowIso?: string;
}): boolean {
  if (options.providerJoinedAt) return false;
  const start = new Date(options.scheduledStartIso).getTime();
  const now = options.nowIso ? new Date(options.nowIso).getTime() : Date.now();
  const elapsedMin = (now - start) / 60000;
  return elapsedMin >= PROVIDER_JOIN_GRACE_MINUTES;
}

// ============================================================================
// Family-facing apology + provider notice copy
// ============================================================================

export interface ApologyMessageParams {
  familyFirstName?: string;
  childName?: string;
  providerName?: string;
  /** ISO of the missed appointment. */
  scheduledStartIso?: string;
  serviceLabel?: string; // e.g. "ABA consult", "therapy session"
}

/**
 * The family-facing apology. Warm, accountable, no excuses, and routes straight
 * to recovery. The provider is copied (see `providerCcLine`) so they're on the
 * hook without the family having to wait on them.
 */
export function buildFamilyApologyMessage(params: ApologyMessageParams): {
  subject: string;
  body: string;
  providerCcLine: string;
} {
  const fam = params.familyFirstName ? `${params.familyFirstName}, ` : '';
  const provider = params.providerName ? `${params.providerName}` : 'your provider';
  const service = params.serviceLabel ? ` ${params.serviceLabel}` : ' session';
  const forChild = params.childName ? ` for ${params.childName}` : '';

  const subject = `We're sorry — let's get your${service} rescheduled right away`;

  const body = [
    `${fam}we are truly sorry. ${provider} did not join your scheduled${service}${forChild}, and that's not the experience you signed up for.`,
    ``,
    `You will not be charged anything for this session.`,
    ``,
    `Here's how we'll make it right — pick whichever is easier for you:`,
    `  • Reschedule with ${provider} — we'll hold a priority slot so you're seen first.`,
    `  • Match me with someone new — we'll find an available provider who fits your needs and get you booked.`,
    ``,
    `We've let ${provider} know directly, and our care team is on it. If you'd rather just talk to a person, reply here and we'll call you.`,
    ``,
    `— The Aminy Care Team`,
  ].join('\n');

  const providerCcLine = params.providerName
    ? `cc: ${params.providerName} (provider) — you missed a scheduled session; please reach out to the family to reschedule.`
    : 'cc: provider — missed scheduled session; please reach out to reschedule.';

  return { subject, body, providerCcLine };
}

/** The accountability message sent to the provider who missed the session. */
export function buildProviderNoShowNotice(options: {
  providerName?: string;
  scheduledStartIso?: string;
  rollingNoShowCount: number;
}): { subject: string; body: string } {
  const tier = getProviderReliabilityTier(options.rollingNoShowCount);
  const consequence = getReliabilityConsequence(tier);
  const name = options.providerName ? `${options.providerName}, ` : '';

  const subject =
    tier === 'suspended'
      ? 'Action required: your Aminy matching is paused'
      : tier === 'probation'
        ? 'Important: missed session — reliability check-in'
        : 'You missed a scheduled Aminy session';

  const body = [
    `${name}our records show you did not join a scheduled session with a family.`,
    ``,
    `We've already apologized to the family and offered them a priority reschedule or a new match — please reach out to them directly if you can still help.`,
    ``,
    `Reliability status: ${consequence.label} (${options.rollingNoShowCount} no-show${options.rollingNoShowCount === 1 ? '' : 's'} in the last 90 days).`,
    consequence.description,
    ``,
    `Families count on showing up. If something came up, reply and let us know how we can support you.`,
    ``,
    `— Aminy Provider Success`,
  ].join('\n');

  return { subject, body };
}

// ============================================================================
// Persistence (best-effort; degrades silently in demo/offline)
// ============================================================================

export interface ProviderNoShowEvent {
  id?: string;
  providerId: string;
  appointmentId: string;
  familyUserId?: string;
  scheduledStartIso?: string;
  declaredAtIso: string;
  resolution?: 'pending' | 'rescheduled_same' | 'reassigned' | 'family_dropped';
}

/**
 * Records a provider no-show and returns the provider's rolling no-show count
 * (including this one) plus the resulting reliability tier. Best-effort: if the
 * table/network is unavailable, returns a count of 1 so the UI still works.
 */
export async function recordProviderNoShow(
  event: ProviderNoShowEvent,
): Promise<{ rollingNoShowCount: number; tier: ProviderReliabilityTier }> {
  try {
    await supabase.from('provider_no_show_events').insert({
      provider_id: event.providerId,
      appointment_id: event.appointmentId,
      family_user_id: event.familyUserId ?? null,
      scheduled_start: event.scheduledStartIso ?? null,
      declared_at: event.declaredAtIso,
      resolution: event.resolution ?? 'pending',
    });
  } catch (err) {
    console.warn('[provider-no-show] insert failed (non-fatal):', err);
  }

  const rollingNoShowCount = await getProviderRollingNoShowCount(event.providerId);
  const count = Math.max(1, rollingNoShowCount); // this event counts even if read failed
  return { rollingNoShowCount: count, tier: getProviderReliabilityTier(count) };
}

/** Counts a provider's no-shows over the rolling 90-day window. */
export async function getProviderRollingNoShowCount(
  providerId: string,
): Promise<number> {
  const since = new Date(
    Date.now() - PROVIDER_NOSHOW_ROLLING_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { count, error } = await supabase
      .from('provider_no_show_events')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .gte('declared_at', since);

    if (error) {
      console.warn('[provider-no-show] count failed (non-fatal):', error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn('[provider-no-show] count threw (non-fatal):', err);
    return 0;
  }
}

/** Updates the resolution outcome once the family reschedules or reassigns. */
export async function resolveProviderNoShow(
  appointmentId: string,
  resolution: NonNullable<ProviderNoShowEvent['resolution']>,
): Promise<void> {
  try {
    await supabase
      .from('provider_no_show_events')
      .update({ resolution })
      .eq('appointment_id', appointmentId);
  } catch (err) {
    console.warn('[provider-no-show] resolve failed (non-fatal):', err);
  }
}
