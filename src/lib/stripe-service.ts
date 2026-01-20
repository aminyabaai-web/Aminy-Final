/**
 * Stripe Service
 *
 * Handles all payment processing for Aminy subscriptions
 * Uses Supabase Edge Functions for secure server-side Stripe calls
 *
 * SETUP REQUIRED:
 * 1. Create products in Stripe Dashboard
 * 2. Get price IDs and add to .env.local
 * 3. Configure webhook endpoint in Stripe
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// Stripe Publishable Key (required for frontend)
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Validate Stripe is configured (only warn in dev)
if (import.meta.env.DEV && !STRIPE_PUBLISHABLE_KEY) {
}

// Stripe Price IDs - MUST be set in environment variables for production
// Create these products in your Stripe Dashboard and copy the price_xxx IDs
export const STRIPE_PRICES = {
  // Subscription prices
  starter_monthly: import.meta.env.VITE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
  starter_annual: import.meta.env.VITE_PRICE_STARTER_ANNUAL || 'price_starter_annual',
  core_monthly: import.meta.env.VITE_PRICE_CORE_MONTHLY || 'price_core_monthly',
  core_annual: import.meta.env.VITE_PRICE_CORE_ANNUAL || 'price_core_annual',
  pro_monthly: import.meta.env.VITE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_annual: import.meta.env.VITE_PRICE_PRO_ANNUAL || 'price_pro_annual',
  proplus_monthly: import.meta.env.VITE_PRICE_PROPLUS_MONTHLY || 'price_proplus_monthly',
  proplus_annual: import.meta.env.VITE_PRICE_PROPLUS_ANNUAL || 'price_proplus_annual',
  // Visit prices
  initial_consult: import.meta.env.VITE_PRICE_INITIAL_CONSULT || 'price_initial_consult',
  followup: import.meta.env.VITE_PRICE_FOLLOWUP || 'price_followup',
  emergency: import.meta.env.VITE_PRICE_EMERGENCY || 'price_emergency',
  extended: import.meta.env.VITE_PRICE_EXTENDED || 'price_extended',
} as const;

// Check if Stripe is properly configured
export const isStripeConfigured = (): boolean => {
  return !!(
    STRIPE_PUBLISHABLE_KEY &&
    STRIPE_PUBLISHABLE_KEY.startsWith('pk_') &&
    !STRIPE_PRICES.starter_monthly.startsWith('price_starter')
  );
};

// Tier pricing (display only - actual prices in Stripe)
export const TIER_PRICING = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 4.99, annual: 47.88 }, // ~$4/mo annually
  core: { monthly: 9.99, annual: 95.88 }, // ~$8/mo annually
  pro: { monthly: 19.99, annual: 191.88 }, // ~$16/mo annually
} as const;

export type TierType = 'free' | 'starter' | 'core' | 'pro';
export type BillingInterval = 'monthly' | 'annual';

interface CreateCheckoutParams {
  userId: string;
  email: string;
  tier: TierType;
  interval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutResponse {
  url: string;
  sessionId: string;
}

interface SubscriptionStatus {
  active: boolean;
  tier: TierType;
  interval: BillingInterval;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

// Get access token from localStorage
const getAccessToken = (): string => {
  return typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || publicAnonKey
    : publicAnonKey;
};

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession({
  userId,
  email,
  tier,
  interval,
  successUrl = `${window.location.origin}/dashboard?payment=success`,
  cancelUrl = `${window.location.origin}/paywall?payment=cancelled`,
}: CreateCheckoutParams): Promise<CheckoutResponse> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/create-checkout`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        tier,
        interval,
        successUrl,
        cancelUrl,
        priceId: STRIPE_PRICES[`${tier}_${interval}` as keyof typeof STRIPE_PRICES],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create checkout session: ${error}`);
  }

  return response.json();
}

/**
 * Get customer portal URL for managing subscription
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string = `${window.location.origin}/settings`
): Promise<{ url: string }> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/create-portal`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, returnUrl }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create portal session: ${error}`);
  }

  return response.json();
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/subscription/${userId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    // Default to free tier if no subscription found
    return {
      active: false,
      tier: 'free',
      interval: 'monthly',
      currentPeriodEnd: '',
      cancelAtPeriodEnd: false,
    };
  }

  return response.json();
}

/**
 * Cancel subscription (at period end)
 */
export async function cancelSubscription(userId: string): Promise<{ success: boolean }> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to cancel subscription: ${error}`);
  }

  return response.json();
}

/**
 * Resume cancelled subscription
 */
export async function resumeSubscription(userId: string): Promise<{ success: boolean }> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/resume`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to resume subscription: ${error}`);
  }

  return response.json();
}

/**
 * Process one-time payment (e.g., on-demand telehealth)
 */
export async function createOneTimePayment({
  userId,
  email,
  amount, // in cents
  description,
  metadata = {},
}: {
  userId: string;
  email: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<CheckoutResponse> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/create-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        amount,
        description,
        metadata,
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/telehealth?payment=cancelled`,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create payment: ${error}`);
  }

  return response.json();
}

/**
 * Hook for components to redirect to Stripe Checkout
 */
export function useStripeCheckout() {
  const redirectToCheckout = async (params: CreateCheckoutParams) => {
    try {
      const { url } = await createCheckoutSession(params);
      window.location.href = url;
    } catch (error) {
      console.error('Stripe checkout error:', error);
      throw error;
    }
  };

  const redirectToPortal = async (userId: string) => {
    try {
      const { url } = await createPortalSession(userId);
      window.location.href = url;
    } catch (error) {
      console.error('Stripe portal error:', error);
      throw error;
    }
  };

  return { redirectToCheckout, redirectToPortal };
}

// ============================================================================
// Telehealth Visit Payment Functions
// ============================================================================

// Visit type pricing for cash-pay telehealth
export const VISIT_PRICES = {
  consult: {
    name: '25-minute Consult',
    basePrice: 7500, // $75.00 in cents
    memberDiscount: 2500, // $25 off for members
    duration: 25,
  },
  extended: {
    name: '50-minute Session',
    basePrice: 12500, // $125.00 in cents
    memberDiscount: 3500, // $35 off for members
    duration: 50,
  },
  'follow-up': {
    name: '15-minute Follow-up',
    basePrice: 5000, // $50.00 in cents
    memberDiscount: 1500, // $15 off for members
    duration: 15,
  },
} as const;

export type VisitPriceType = keyof typeof VISIT_PRICES;

/**
 * Calculate visit price with discounts
 */
export function calculateVisitPrice(
  visitType: VisitPriceType,
  isMember: boolean = false,
  promoCode?: string
): { subtotal: number; discount: number; total: number; breakdown: string[] } {
  const pricing = VISIT_PRICES[visitType];
  const subtotal = pricing.basePrice;
  let discount = 0;
  const breakdown: string[] = [];

  if (isMember) {
    discount += pricing.memberDiscount;
    breakdown.push(`Member discount: -$${(pricing.memberDiscount / 100).toFixed(2)}`);
  }

  // Handle promo codes
  if (promoCode) {
    const promoDiscount = getPromoDiscount(promoCode, subtotal);
    if (promoDiscount > 0) {
      discount += promoDiscount;
      breakdown.push(`Promo "${promoCode}": -$${(promoDiscount / 100).toFixed(2)}`);
    }
  }

  const total = Math.max(0, subtotal - discount);

  return { subtotal, discount, total, breakdown };
}

/**
 * Get promo code discount
 */
function getPromoDiscount(code: string, subtotal: number): number {
  const promoCodes: Record<string, { type: 'percent' | 'fixed'; value: number }> = {
    'WELCOME20': { type: 'percent', value: 20 },
    'FIRST10': { type: 'fixed', value: 1000 }, // $10 off
    'AMINY50': { type: 'percent', value: 50 },
    'AACT25': { type: 'percent', value: 25 }, // Partner discount
  };

  const promo = promoCodes[code.toUpperCase()];
  if (!promo) return 0;

  if (promo.type === 'percent') {
    return Math.round(subtotal * (promo.value / 100));
  }

  return promo.value;
}

/**
 * Validate promo code
 */
export function validatePromoCode(code: string): { valid: boolean; description?: string } {
  const promoCodes: Record<string, string> = {
    'WELCOME20': '20% off your first visit',
    'FIRST10': '$10 off',
    'AMINY50': '50% off (limited time)',
    'AACT25': '25% AACT partner discount',
  };

  const description = promoCodes[code.toUpperCase()];
  return {
    valid: !!description,
    description,
  };
}

/**
 * Create payment for telehealth visit
 */
export async function createVisitPayment({
  userId,
  email,
  visitType,
  providerId,
  slotId,
  isMember = false,
  promoCode,
}: {
  userId: string;
  email: string;
  visitType: VisitPriceType;
  providerId: string;
  slotId: string;
  isMember?: boolean;
  promoCode?: string;
}): Promise<CheckoutResponse> {
  const pricing = VISIT_PRICES[visitType];
  const { total } = calculateVisitPrice(visitType, isMember, promoCode);

  return createOneTimePayment({
    userId,
    email,
    amount: total,
    description: `${pricing.name} with provider`,
    metadata: {
      type: 'telehealth_visit',
      visitType,
      providerId,
      slotId,
      promoCode: promoCode || '',
    },
  });
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  cancelSubscription,
  resumeSubscription,
  createOneTimePayment,
  createVisitPayment,
  calculateVisitPrice,
  validatePromoCode,
  formatPrice,
  STRIPE_PRICES,
  TIER_PRICING,
  VISIT_PRICES,
};
