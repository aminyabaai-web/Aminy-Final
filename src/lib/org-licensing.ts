// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Org Licensing — B2B seat-based subscriptions for AACT, schools, agencies, enterprise.
 *
 * Pricing model — volume ladder, solo-BCBA friendly:
 * - 1 seat: $79/seat/mo · 2: $69 · 3: $59 · 4: $54 · 5+: $49/seat/mo
 * - Min 1 seat — solo BCBAs onboard at the same door as clinics
 * - Orgs with negotiated pricing store price_per_seat_cents on the organizations
 *   table; that custom rate overrides the ladder
 * - Billed monthly or annually (15% annual discount applied at Stripe level)
 *
 * Single source of truth for org seat economics. Use this library — don't hardcode
 * prices in components. (The /org/checkout edge function keeps a mirrored copy of
 * the ladder — edge functions can't import src/lib — update both together.)
 */

import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

export const ORG_PLAN_TYPES = ['clinic', 'school', 'agency', 'enterprise'] as const;
export type OrgPlanType = typeof ORG_PLAN_TYPES[number];

export const MIN_SEATS = 1;
export const ANNUAL_DISCOUNT = 0.15;               // 15% off annual

/**
 * Volume pricing ladder — price per seat per month, by total seat count.
 * Single source of truth (mirrored in the /org/checkout edge function).
 * Solo BCBAs pay $79; the per-seat price steps down to $49 at 5+ seats.
 */
export const SEAT_PRICE_LADDER: ReadonlyArray<{ minSeats: number; pricePerSeatCents: number }> = [
  { minSeats: 5, pricePerSeatCents: 4900 },  // 5+ seats: $49/seat
  { minSeats: 4, pricePerSeatCents: 5400 },  // 4 seats:  $54/seat
  { minSeats: 3, pricePerSeatCents: 5900 },  // 3 seats:  $59/seat
  { minSeats: 2, pricePerSeatCents: 6900 },  // 2 seats:  $69/seat
  { minSeats: 1, pricePerSeatCents: 7900 },  // 1 seat:   $79 (solo BCBA)
];

/** Per-seat monthly price for a given seat count, per the volume ladder. */
export function getSeatPriceCents(seats: number): number {
  // Ladder is sorted high→low minSeats; first rung the count clears wins.
  const rung = SEAT_PRICE_LADDER.find(r => seats >= r.minSeats);
  // Below 1 seat is invalid input — charge the solo rate rather than throw.
  return rung ? rung.pricePerSeatCents : SEAT_PRICE_LADDER[SEAT_PRICE_LADDER.length - 1].pricePerSeatCents;
}

/** The 5+ seat volume rate — kept for back-compat with existing callers. */
export const DEFAULT_PRICE_PER_SEAT_CENTS = getSeatPriceCents(5);  // $49/seat/mo

// Solo BCBA = the 1-seat rung of the ladder (delegated so they can't drift)
export const SOLO_BCBA_PRICE_CENTS = getSeatPriceCents(1);  // $79/mo, 1 clinician
export const SOLO_BCBA_MAX_CLINICIANS = 1;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: OrgPlanType;
  seatCount: number;
  ownerId: string;
  status: 'active' | 'suspended' | 'cancelled' | 'pending_setup';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  billingInterval: 'month' | 'year';
  pricePerSeatCents: number;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string | null;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  status: 'invited' | 'active' | 'deactivated' | 'removed';
  joinedAt: string | null;
  invitedAt: string;
}

export interface OrgUsage {
  seatsAllocated: number;     // org.seat_count
  seatsUsed: number;          // active members
  seatsAvailable: number;     // allocated - used
  monthlyAmountCents: number; // seat_count × price_per_seat_cents
  annualAmountCents: number;  // discounted
  nextBillingDate: string | null;
}

// ─── Pricing helpers ─────────────────────────────────────────────────────────

/** Monthly total. Omit pricePerSeatCents to use the volume ladder; pass it for orgs with negotiated pricing (stored in DB). */
export function calculateMonthlyAmount(seats: number, pricePerSeatCents?: number): number {
  return seats * (pricePerSeatCents ?? getSeatPriceCents(seats));
}

/** Annual total. Omit pricePerSeatCents to use the volume ladder; pass it for orgs with negotiated pricing (stored in DB). */
export function calculateAnnualAmount(seats: number, pricePerSeatCents?: number): number {
  // 12 months × seat price × (1 - annual discount)
  return Math.round(seats * (pricePerSeatCents ?? getSeatPriceCents(seats)) * 12 * (1 - ANNUAL_DISCOUNT));
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function getSoloBCBAPricing() {
  // Solo BCBA = the 1-seat rung of the ladder — delegate so the two can't drift.
  return {
    monthlyAmountCents: calculateMonthlyAmount(1),
    annualAmountCents: calculateAnnualAmount(1),
    maxClinicians: SOLO_BCBA_MAX_CLINICIANS,
    features: [
      'All provider features',
      'Unlimited client families',
      'AI session briefings',
      'Documentation & notes tools',
      'BCBA practice dashboard',
      'Rethink/CentralReach sync (coming soon)',
    ],
  };
}

// ─── Organization queries ───────────────────────────────────────────────────

/** Get the org owned by the current user, if any. */
export async function getMyOrganization(): Promise<Organization | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToOrg(data);
}

/** Get all orgs where the current user is a member. */
export async function getMyMemberships(): Promise<{ org: Organization; role: OrgMember['role'] }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error || !memberships) return [];

  return memberships
    .filter((m: any) => m.organizations)
    .map((m: any) => ({
      org: mapRowToOrg(m.organizations),
      role: m.role as OrgMember['role'],
    }));
}

/** List active members of an org. Org owner/admin only (RLS-enforced). */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('org_id', orgId)
    .neq('status', 'removed')
    .order('invited_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapRowToMember);
}

/** Compute live usage stats for an org. */
export async function getOrgUsage(org: Organization): Promise<OrgUsage> {
  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'active');

  const seatsUsed = count ?? 0;
  const seatsAvailable = Math.max(0, org.seatCount - seatsUsed);

  return {
    seatsAllocated: org.seatCount,
    seatsUsed,
    seatsAvailable,
    monthlyAmountCents: calculateMonthlyAmount(org.seatCount, org.pricePerSeatCents),
    annualAmountCents: calculateAnnualAmount(org.seatCount, org.pricePerSeatCents),
    nextBillingDate: org.currentPeriodEnd,
  };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create a new org. Caller becomes owner. */
export async function createOrganization(input: {
  name: string;
  slug: string;
  planType: OrgPlanType;
  seatCount: number;
}): Promise<Organization | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (input.seatCount < MIN_SEATS) {
    throw new Error(`Seat count must be at least ${MIN_SEATS}`);
  }

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      slug: input.slug,
      plan_type: input.planType,
      seat_count: input.seatCount,
      owner_id: user.id,
      status: 'pending_setup',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create organization');
  }

  // Auto-add owner as member
  await supabase
    .from('organization_members')
    .insert({
      org_id: data.id,
      user_id: user.id,
      email: user.email || '',
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

  return mapRowToOrg(data);
}

/** Invite a member to the org by email. */
export async function inviteMember(orgId: string, email: string, role: OrgMember['role'] = 'member'): Promise<OrgMember | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      org_id: orgId,
      email: email.toLowerCase().trim(),
      role,
      status: 'invited',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to invite member');
  }
  return mapRowToMember(data);
}

/** Remove (soft-delete) a member from the org. */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .update({ status: 'removed' })
    .eq('id', memberId);
  if (error) throw new Error(error.message);
}

/** Update seat count (will trigger Stripe subscription update via webhook). */
export async function updateSeatCount(orgId: string, newSeatCount: number): Promise<void> {
  if (newSeatCount < MIN_SEATS) {
    throw new Error(`Seat count must be at least ${MIN_SEATS}`);
  }
  const { error } = await supabase
    .from('organizations')
    .update({ seat_count: newSeatCount })
    .eq('id', orgId);
  if (error) throw new Error(error.message);
}

// ─── Stripe checkout (edge function) ────────────────────────────────────────

/**
 * Create Stripe Checkout session for org subscription.
 * Returns the checkout URL — caller redirects the user there.
 */
export async function createOrgCheckoutSession(input: {
  orgId: string;
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/org/checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Checkout failed (${response.status})`);
  }

  return await response.json();
}

// ─── Row mappers ────────────────────────────────────────────────────────────

function mapRowToOrg(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    planType: row.plan_type,
    seatCount: row.seat_count,
    ownerId: row.owner_id,
    status: row.status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status || 'inactive',
    billingInterval: row.billing_interval || 'month',
    // No negotiated price in DB → ladder rate for this org's seat count
    pricePerSeatCents: row.price_per_seat_cents || getSeatPriceCents(row.seat_count),
    currentPeriodEnd: row.current_period_end,
    trialEndsAt: row.trial_ends_at,
    createdAt: row.created_at,
  };
}

function mapRowToMember(row: any): OrgMember {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    invitedAt: row.invited_at,
  };
}
