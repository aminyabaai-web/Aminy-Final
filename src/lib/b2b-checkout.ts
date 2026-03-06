/**
 * B2B Checkout Service
 * Handles seat-based Stripe checkout for clinic, school, and agency plans
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

const EDGE_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

// B2B Plan Configuration
export const B2B_PLANS = {
  clinic: {
    name: 'Clinic',
    monthlyPerSeat: 59.99,
    annualDiscount: 0.20, // 20% off annual
    minSeats: 3,
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
    monthlyPerSeat: 29.99,
    annualDiscount: 0.25, // 25% off annual
    minSeats: 5,
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
    monthlyPerSeat: 24.99,
    annualDiscount: 0.30, // 30% off annual
    minSeats: 10,
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
    monthlyPerSeat: 0, // Custom pricing
    annualDiscount: 0,
    minSeats: 100,
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
 * Calculate total price for a B2B plan
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
  const monthlyPerSeat = plan.monthlyPerSeat;

  if (billingPeriod === 'annual') {
    const discountedPerSeat = monthlyPerSeat * (1 - plan.annualDiscount);
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
    return { url: null, error: `${plan.name} plan requires at least ${plan.minSeats} seats.` };
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
