// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * B2B Checkout Service
 * Handles seat-based Stripe checkout for clinic, school, and agency plans
 *
 * PRICING SOURCE OF TRUTH: src/lib/org-licensing.ts SEAT_PRICE_LADDER.
 * All plan types share the same volume ladder ($89/seat at 1 seat stepping
 * down to $49/seat at 5+), MIN_SEATS = 1, and the 15% annual discount.
 * B2B_PLANS below carries only the marketing labels + feature lists.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { MIN_SEATS, ANNUAL_DISCOUNT, getSeatPriceCents } from './org-licensing';

const EDGE_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

// B2B Plan Configuration — marketing labels + features only.
// Per-seat pricing comes from the org-licensing SEAT_PRICE_LADDER (see calculateB2BPrice).
export const B2B_PLANS = {
  clinic: {
    name: 'Clinic',
    minSeats: MIN_SEATS,
    features: [
      'AI-powered behavioral insights per family',
      'Telehealth marketplace access',
      'BCBA practice management tools',
      'RBT supervision tracking',
      'Insurance superbill generation',
      'Custom analytics dashboard',
      'Priority support',
    ],
  },
  school: {
    name: 'School District',
    minSeats: MIN_SEATS,
    features: [
      'AI-powered IEP support per student',
      'Behavioral tracking & reporting',
      'Teacher/aide collaboration tools',
      'Progress monitoring dashboards',
      'Bulk user management',
      'SSO integration',
      'Dedicated support',
    ],
  },
  agency: {
    name: 'Agency',
    minSeats: MIN_SEATS,
    features: [
      'AI caregiver support per family',
      'EVV & timesheet automation',
      'Fiscal agent integration',
      'Medicaid waiver guidance (50 states)',
      'White-label option',
      'API access',
      'Custom reporting',
      'Account manager',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    minSeats: 100, // Custom pricing — contact sales
    features: [
      'Everything in Agency',
      'Custom pricing per seat',
      'Full white-label branding',
      'SSO + SAML authentication',
      'SLA guarantee (99.9%)',
      'Dedicated success team',
      'On-site training',
      'Custom integrations',
    ],
  },
} as const;

export type B2BPlanType = keyof typeof B2B_PLANS;

/**
 * Calculate total price for a B2B plan.
 * Per-seat price is the org-licensing volume ladder rate for the seat count
 * ($89 at 1 seat → $49 at 5+); annual billing applies the 15% ANNUAL_DISCOUNT.
 */
export function calculateB2BPrice(
  planType: B2BPlanType,
  seatCount: number,
  billingPeriod: 'monthly' | 'annual'
): { perSeat: number; total: number; savings: number } {
  const plan = B2B_PLANS[planType];
  if (planType === 'enterprise') {
    return { perSeat: 0, total: 0, savings: 0 };
  }

  const seats = Math.max(seatCount, plan.minSeats);
  const monthlyPerSeat = getSeatPriceCents(seats) / 100;

  if (billingPeriod === 'annual') {
    const discountedPerSeat = monthlyPerSeat * (1 - ANNUAL_DISCOUNT);
    const annualTotal = discountedPerSeat * seats * 12;
    const monthlySavings = (monthlyPerSeat - discountedPerSeat) * seats;
    return {
      perSeat: discountedPerSeat,
      total: annualTotal,
      savings: monthlySavings * 12,
    };
  }

  return {
    perSeat: monthlyPerSeat,
    total: monthlyPerSeat * seats,
    savings: 0,
  };
}

/**
 * Create a Stripe checkout session for B2B seat-based billing
 */
export async function createB2BCheckoutSession(params: {
  planType: B2BPlanType;
  seatCount: number;
  billingPeriod: 'monthly' | 'annual';
  orgName?: string;
  adminEmail?: string;
}): Promise<{ url: string | null; error?: string }> {
  const { planType, seatCount, billingPeriod, orgName, adminEmail } = params;
  const plan = B2B_PLANS[planType];

  if (planType === 'enterprise') {
    return { url: null, error: 'Enterprise plans require custom setup. Contact partnerships@aminy.ai' };
  }

  if (seatCount < plan.minSeats) {
    return { url: null, error: `${plan.name} plan requires at least ${plan.minSeats} seat${plan.minSeats === 1 ? '' : 's'}.` };
  }

  try {
    // Get auth token if available
    let token = publicAnonKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch { /* use anon key */ }

    const pricing = calculateB2BPrice(planType, seatCount, billingPeriod);

    const response = await fetch(`${EDGE_FUNCTION_BASE}/payments/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'b2b_subscription',
        planType,
        seatCount,
        billingPeriod,
        unitAmount: Math.round(pricing.perSeat * 100), // cents
        orgName: orgName || `${plan.name} Organization`,
        adminEmail,
        successUrl: `${window.location.origin}/?screen=b2b-setup&plan=${planType}&seats=${seatCount}`,
        cancelUrl: `${window.location.origin}/?screen=b2b-partner`,
      }),
    });

    const data = await response.json();

    if (data?.url) {
      return { url: data.url };
    }

    // Fallback: simulate checkout for demo mode
    return {
      url: `${window.location.origin}/?screen=b2b-setup&plan=${planType}&seats=${seatCount}&demo=true`,
    };
  } catch (e: unknown) {
    console.error('B2B checkout failed:', e);
    // Fallback for demo
    return {
      url: `${window.location.origin}/?screen=b2b-setup&plan=${planType}&seats=${seatCount}&demo=true`,
    };
  }
}
