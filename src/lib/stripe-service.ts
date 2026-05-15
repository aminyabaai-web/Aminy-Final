// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

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
import { supabase } from '../utils/supabase/client';
import { tierPricing, type TierType } from './tier-utils';
import { secureFetch } from './security/secure-fetch';
import { getStripeVisitPrices } from './telehealth-economics';

// Edge function base URL for API calls
const EDGE_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8a022548`;

// Stripe Publishable Key (required for frontend)
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Detect whether Stripe is running in test mode (pk_test_ prefix)
export const isStripeTestMode = STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');

// Validate Stripe is configured (only warn in dev)
if (import.meta.env.DEV && !STRIPE_PUBLISHABLE_KEY) {
}

// Stripe Price IDs - MUST be set in environment variables for production
// Create these products in your Stripe Dashboard and copy the price_xxx IDs
//
// Env var lookup order: VITE_STRIPE_PRICE_* (preferred) > VITE_PRICE_* (legacy)
export const STRIPE_PRICES = {
  // Subscription prices
  // Fallback chain: VITE_STRIPE_PRICE_*_MONTHLY → VITE_STRIPE_PRICE_* (plain, in .env.local) → VITE_PRICE_* (legacy)
  starter_monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY || import.meta.env.VITE_STRIPE_PRICE_STARTER || import.meta.env.VITE_PRICE_STARTER_MONTHLY || '',
  starter_annual: import.meta.env.VITE_STRIPE_PRICE_STARTER_YEARLY || import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL || import.meta.env.VITE_PRICE_STARTER_ANNUAL || '',
  core_monthly: import.meta.env.VITE_STRIPE_PRICE_CORE_MONTHLY || import.meta.env.VITE_STRIPE_PRICE_CORE || import.meta.env.VITE_PRICE_CORE_MONTHLY || '',
  core_annual: import.meta.env.VITE_STRIPE_PRICE_CORE_YEARLY || import.meta.env.VITE_STRIPE_PRICE_CORE_ANNUAL || import.meta.env.VITE_PRICE_CORE_ANNUAL || '',
  pro_monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || import.meta.env.VITE_STRIPE_PRICE_PRO || import.meta.env.VITE_PRICE_PRO_MONTHLY || '',
  pro_annual: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || import.meta.env.VITE_PRICE_PRO_ANNUAL || '',
  proplus_monthly: import.meta.env.VITE_STRIPE_PRICE_PROPLUS_MONTHLY || import.meta.env.VITE_STRIPE_PRICE_PROPLUS || import.meta.env.VITE_PRICE_PROPLUS_MONTHLY || '',
  proplus_annual: import.meta.env.VITE_STRIPE_PRICE_PROPLUS_YEARLY || import.meta.env.VITE_STRIPE_PRICE_PROPLUS_ANNUAL || import.meta.env.VITE_PRICE_PROPLUS_ANNUAL || '',
  // Visit prices
  initial_consult: import.meta.env.VITE_PRICE_INITIAL_CONSULT || '',
  followup: import.meta.env.VITE_PRICE_FOLLOWUP || '',
  emergency: import.meta.env.VITE_PRICE_EMERGENCY || '',
  extended: import.meta.env.VITE_PRICE_EXTENDED || '',
} as const;

// Check if Stripe is properly configured
export const isStripeConfigured = (): boolean => {
  return !!(
    STRIPE_PUBLISHABLE_KEY &&
    STRIPE_PUBLISHABLE_KEY.startsWith('pk_') &&
    STRIPE_PRICES.core_monthly &&
    STRIPE_PRICES.core_monthly.startsWith('price_')
  );
};

// Tier pricing — re-exported from tier-utils.ts (single source of truth)
// Keys: monthly / yearly (tier-utils uses 'yearly', Stripe uses 'annual')
export const TIER_PRICING = {
  free: { monthly: tierPricing.free.monthly, annual: tierPricing.free.yearly },
  starter: { monthly: tierPricing.starter.monthly, annual: tierPricing.starter.yearly },
  core: { monthly: tierPricing.core.monthly, annual: tierPricing.core.yearly },
  pro: { monthly: tierPricing.pro.monthly, annual: tierPricing.pro.yearly },
  proplus: { monthly: tierPricing.proplus.monthly, annual: tierPricing.proplus.yearly },
} as const;

export type { TierType };
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

/**
 * Get access token securely
 * NOTE: For HIPAA compliance, tokens should be managed by Supabase Auth
 * which uses httpOnly cookies internally. Never store PHI access tokens in localStorage.
 * The publicAnonKey is safe for anonymous API calls, Supabase handles authenticated sessions.
 */
const getAccessToken = async (): Promise<string> => {
  if (typeof window === 'undefined') return publicAnonKey;

  // Use Supabase's secure session management instead of localStorage
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (error) {
    // Fall back to anon key for unauthenticated requests
    console.warn('[Stripe] Session not available, using anon key');
  }

  return publicAnonKey;
};

// Get origin URL safely for SSR environments
const getOrigin = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

/**
 * Create a Stripe Checkout session for subscription or one-time payment.
 *
 * Calls the `stripe-checkout` edge function which auto-detects recurring vs
 * one-time based on the Stripe Price object.
 */
export async function createCheckoutSession({
  userId,
  email,
  tier,
  interval,
  successUrl = `${getOrigin()}/?screen=dashboard&payment=success`,
  cancelUrl = `${getOrigin()}/?screen=paywall&payment=cancelled`,
}: CreateCheckoutParams): Promise<CheckoutResponse> {
  const priceId = STRIPE_PRICES[`${tier}_${interval}` as keyof typeof STRIPE_PRICES];

  if (!priceId) {
    throw new Error(
      `No Stripe price configured for ${tier} / ${interval}. ` +
      'Set the VITE_STRIPE_PRICE_* environment variables.'
    );
  }

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: {
      priceId,
      userId,
      customerEmail: email,
      successUrl,
      cancelUrl,
    },
  });

  if (error) {
    console.error('[Stripe] Edge function error:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }

  if (!data?.url) {
    throw new Error('Checkout session created but no URL returned');
  }

  return { url: data.url, sessionId: data.sessionId };
}

/**
 * Get customer portal URL for managing subscription
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string = `${getOrigin()}/settings`
): Promise<{ url: string }> {
  const accessToken = await getAccessToken();

  const { data, error, ok } = await secureFetch<{ url: string }>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/create-portal`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId, returnUrl }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to create portal session: ${error || 'Unknown error'}`);
  }

  if (!data) {
    console.error('[Stripe] Failed to parse portal response');
    throw new Error('Invalid response from payment server');
  }

  return data;
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const accessToken = await getAccessToken();

  const { data, ok } = await secureFetch<SubscriptionStatus>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/subscription/${userId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!ok || !data) {
    // Default to free tier if no subscription found
    return {
      active: false,
      tier: 'free',
      interval: 'monthly',
      currentPeriodEnd: '',
      cancelAtPeriodEnd: false,
    };
  }

  return data;
}

/**
 * Cancel subscription (at period end)
 */
export async function cancelSubscription(userId: string): Promise<{ success: boolean }> {
  const accessToken = await getAccessToken();

  const { data, error, ok } = await secureFetch<{ success: boolean }>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to cancel subscription: ${error || 'Unknown error'}`);
  }

  return data!;
}

/**
 * Resume cancelled subscription
 */
export async function resumeSubscription(userId: string): Promise<{ success: boolean }> {
  const accessToken = await getAccessToken();

  const { data, error, ok } = await secureFetch<{ success: boolean }>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/resume`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to resume subscription: ${error || 'Unknown error'}`);
  }

  return data!;
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
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutResponse> {
  const accessToken = await getAccessToken();

  const { data, error, ok } = await secureFetch<CheckoutResponse>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/create-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId,
        email,
        amount,
        description,
        metadata,
        successUrl: successUrl ?? `${getOrigin()}/?screen=dashboard&payment=success`,
        cancelUrl: cancelUrl ?? `${getOrigin()}/?screen=telehealth&payment=cancelled`,
      }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to create payment: ${error || 'Unknown error'}`);
  }

  return data!;
}

/**
 * Open the Stripe Customer Portal in a new tab so the user can self-manage
 * their subscription (cancel, update payment method, switch plans, view invoices).
 *
 * This is the recommended entry point for any "Manage Subscription" or
 * "Update Payment Method" button throughout the app.
 *
 * @param userId - The Supabase user ID
 * @param returnUrl - Where to send the user after they close the portal
 *                    (defaults to current origin /settings)
 * @param options.newTab - Open in a new tab (default: true). Set to false to
 *                         redirect the current window.
 * @returns The portal URL (also opens it automatically)
 */
export async function openCustomerPortal(
  userId: string,
  returnUrl?: string,
  options: { newTab?: boolean } = {}
): Promise<string> {
  const { newTab = true } = options;
  const finalReturnUrl = returnUrl || `${getOrigin()}/?screen=settings`;

  const { url } = await createPortalSession(userId, finalReturnUrl);

  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }

  return url;
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

// Canonical visit pricing for family-facing telehealth.
export const VISIT_PRICES = getStripeVisitPrices();

export type VisitPriceType = keyof typeof VISIT_PRICES;

/**
 * Calculate visit price with discounts
 * Note: Now async because promo code validation is server-side
 */
export async function calculateVisitPrice(
  visitType: VisitPriceType,
  isMember: boolean = false,
  promoCode?: string
): Promise<{ subtotal: number; discount: number; total: number; breakdown: string[] }> {
  const pricing = VISIT_PRICES[visitType];
  const subtotal = pricing.basePrice;
  let discount = 0;
  const breakdown: string[] = [];

  if (isMember) {
    discount += pricing.memberDiscount;
    breakdown.push(`Member discount: -$${(pricing.memberDiscount / 100).toFixed(2)}`);
  }

  // Handle promo codes (async call to backend)
  if (promoCode) {
    const promoDiscount = await getPromoDiscount(promoCode, subtotal);
    if (promoDiscount > 0) {
      discount += promoDiscount;
      breakdown.push(`Promo "${promoCode}": -$${(promoDiscount / 100).toFixed(2)}`);
    }
  }

  const total = Math.max(0, subtotal - discount);

  return { subtotal, discount, total, breakdown };
}

/**
 * Get promo code discount (calls backend API)
 * SECURITY: Promo codes are validated server-side only
 */
async function getPromoDiscount(code: string, subtotal: number): Promise<number> {
  try {
    const result = await validatePromoCode(code, subtotal);
    return result.discountAmount || 0;
  } catch (error) {
    console.warn('[Stripe] Promo code validation failed:', error);
    return 0;
  }
}

/**
 * Validate promo code (calls backend API)
 * SECURITY: Promo codes are NOT hardcoded in frontend
 */
export async function validatePromoCode(
  code: string,
  subtotal?: number
): Promise<{
  valid: boolean;
  description?: string;
  type?: 'percent' | 'fixed';
  value?: number;
  discountAmount?: number;
  error?: string;
}> {
  try {
    const { data, ok } = await secureFetch<{
      valid: boolean;
      description?: string;
      type?: 'percent' | 'fixed';
      value?: number;
      discountAmount?: number;
      error?: string;
    }>(`${EDGE_FUNCTION_BASE}/payments/validate-promo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ code, subtotal }),
    });

    if (!ok || !data) {
      return { valid: false, error: 'Validation failed' };
    }

    return data;
  } catch (error) {
    console.error('Promo validation error:', error);
    return { valid: false, error: 'Network error' };
  }
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
  scheduledAt,
  isMember = false,
  promoCode,
}: {
  userId: string;
  email: string;
  visitType: VisitPriceType;
  providerId: string;
  slotId: string;
  scheduledAt?: string;
  isMember?: boolean;
  promoCode?: string;
}): Promise<CheckoutResponse> {
  const pricing = VISIT_PRICES[visitType];
  const { total } = await calculateVisitPrice(visitType, isMember, promoCode);

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
      scheduledAt: scheduledAt || '',
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

// ============================================================================
// Session Bundle Payment Functions
// ============================================================================

/**
 * Session bundle price IDs (map to Stripe products)
 * These must match the bundle IDs in SESSION_BUNDLES
 */
export const BUNDLE_STRIPE_PRICES: Record<string, string> = {
  'consult-4': import.meta.env.VITE_PRICE_BUNDLE_CONSULT_4 || 'price_consult4_bundle',
  'consult-8': import.meta.env.VITE_PRICE_BUNDLE_CONSULT_8 || 'price_consult8_bundle',
  'deep-review-3': import.meta.env.VITE_PRICE_BUNDLE_DEEP_3 || 'price_deepreview3_bundle',
  'deep-review-6': import.meta.env.VITE_PRICE_BUNDLE_DEEP_6 || 'price_deepreview6_bundle',
  'mixed-starter': import.meta.env.VITE_PRICE_BUNDLE_MIXED || 'price_mixed_starter_bundle',
};

/**
 * Create checkout session for session bundle purchase
 */
export async function createBundleCheckoutSession({
  userId,
  email,
  bundleId,
  bundlePrice,
  consultCredits,
  deepReviewCredits,
  validityDays,
  successUrl = `${getOrigin()}/?screen=telehealth&bundle=success`,
  cancelUrl = `${getOrigin()}/?screen=telehealth&bundle=cancelled`,
}: {
  userId: string;
  email: string;
  bundleId: string;
  bundlePrice: number;
  consultCredits: number;
  deepReviewCredits: number;
  validityDays: number;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutResponse> {
  const accessToken = getAccessToken();
  const priceId = BUNDLE_STRIPE_PRICES[bundleId];

  if (!priceId) {
    throw new Error(`Unknown bundle ID: ${bundleId}`);
  }

  const { data, error, ok } = await secureFetch<CheckoutResponse>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/create-bundle-checkout`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId,
        email,
        bundleId,
        priceId,
        bundlePrice: Math.round(bundlePrice * 100), // Convert to cents
        consultCredits,
        deepReviewCredits,
        validityDays,
        successUrl,
        cancelUrl,
        metadata: {
          type: 'session_bundle',
          bundleId,
          consultCredits: String(consultCredits),
          deepReviewCredits: String(deepReviewCredits),
          validityDays: String(validityDays),
        },
      }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to create bundle checkout session: ${error || 'Unknown error'}`);
  }

  return data!;
}

/**
 * Get user's current bundle credits
 */
export async function getBundleCredits(userId: string): Promise<{
  consultCredits: number;
  deepReviewCredits: number;
  expiresAt: string | null;
  bundleId: string | null;
}> {
  const accessToken = getAccessToken();

  try {
    const { data, ok } = await secureFetch<{
      consultCredits: number;
      deepReviewCredits: number;
      expiresAt: string | null;
      bundleId: string | null;
    }>(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/bundle-credits/${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!ok || !data) {
      // No credits found
      return {
        consultCredits: 0,
        deepReviewCredits: 0,
        expiresAt: null,
        bundleId: null,
      };
    }

    return data;
  } catch (error) {
    console.warn('[Stripe] Failed to fetch bundle credits:', error);
    return {
      consultCredits: 0,
      deepReviewCredits: 0,
      expiresAt: null,
      bundleId: null,
    };
  }
}

/**
 * Use a bundle credit for a session
 */
export async function useBundleCredit({
  userId,
  creditType,
  providerId,
  sessionId,
}: {
  userId: string;
  creditType: 'consult' | 'deep-review';
  providerId: string;
  sessionId: string;
}): Promise<{ success: boolean; remainingCredits: number }> {
  const accessToken = getAccessToken();

  const { data, error, ok } = await secureFetch<{ success: boolean; remainingCredits: number }>(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/payments/use-bundle-credit`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId,
        creditType,
        providerId,
        sessionId,
      }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to use bundle credit: ${error || 'Unknown error'}`);
  }

  return data!;
}

// ============================================================================
// Subscription Pause / Resume Functions
// ============================================================================

export interface PauseStatus {
  isPaused: boolean;
  resumeDate: string | null;
  pausedAt: string | null;
  pauseDurationMonths: number | null;
}

/**
 * Pause a subscription for a given duration.
 * Sets `pause_collection` on the Stripe subscription via edge function.
 *
 * @param subscriptionId - Stripe subscription ID
 * @param durationMonths - How many months to pause (1, 2, or 3)
 */
export async function pauseSubscription(
  subscriptionId: string,
  durationMonths: 1 | 2 | 3 = 1
): Promise<{ success: boolean; resumeDate: string }> {
  const accessToken = await getAccessToken();

  const resumeDate = new Date();
  resumeDate.setMonth(resumeDate.getMonth() + durationMonths);

  const { data, error, ok } = await secureFetch<{ success: boolean; resumeDate: string }>(
    `${EDGE_FUNCTION_BASE}/payments/pause-subscription`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subscriptionId,
        behavior: 'void', // Don't invoice during pause
        resumesAt: Math.floor(resumeDate.getTime() / 1000),
      }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to pause subscription: ${error || 'Unknown error'}`);
  }

  return data!;
}

/**
 * Resume a paused subscription immediately.
 * Removes `pause_collection` from the Stripe subscription.
 *
 * @param subscriptionId - Stripe subscription ID
 */
export async function resumePausedSubscription(
  subscriptionId: string
): Promise<{ success: boolean }> {
  const accessToken = await getAccessToken();

  const { data, error, ok } = await secureFetch<{ success: boolean }>(
    `${EDGE_FUNCTION_BASE}/payments/resume-paused-subscription`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subscriptionId }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to resume subscription: ${error || 'Unknown error'}`);
  }

  return data!;
}

/**
 * Get the current pause status of a subscription.
 */
export async function getPauseStatus(
  subscriptionId: string
): Promise<PauseStatus> {
  const accessToken = await getAccessToken();

  try {
    const { data, ok } = await secureFetch<PauseStatus>(
      `${EDGE_FUNCTION_BASE}/payments/pause-status/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!ok || !data) {
      return { isPaused: false, resumeDate: null, pausedAt: null, pauseDurationMonths: null };
    }

    return data;
  } catch (error) {
    console.warn('[Stripe] Failed to get pause status:', error);
    return { isPaused: false, resumeDate: null, pausedAt: null, pauseDurationMonths: null };
  }
}

// ============================================================================
// Tier Change / Proration Functions
// ============================================================================

/** Ordered list of tiers from lowest to highest for upgrade/downgrade detection */
const TIER_ORDER: TierType[] = ['free', 'starter', 'core', 'pro', 'proplus'];

export interface ProrationPreview {
  /** Amount the customer will be credited (in cents) for unused time on current plan */
  credit: number;
  /** Amount the customer will be charged (in cents) for the new plan prorated period */
  debit: number;
  /** Net amount the customer owes now (debit - credit, in cents). Negative = credit */
  netAmount: number;
  /** Human-readable formatted net amount */
  formattedNetAmount: string;
  /** Whether this is an upgrade (immediate) or downgrade (end of period) */
  direction: 'upgrade' | 'downgrade' | 'lateral';
  /** When the change takes effect */
  effectiveDate: string;
  /** The new price ID that will be applied */
  newPriceId: string;
}

/**
 * Get a proration preview for changing subscription plans.
 *
 * Calls the backend which uses Stripe's upcoming invoice API
 * to calculate exact proration amounts.
 */
export async function getProrationPreview(
  subscriptionId: string,
  newPriceId: string
): Promise<ProrationPreview> {
  const accessToken = await getAccessToken();

  const { data, error, ok } = await secureFetch<ProrationPreview>(
    `${EDGE_FUNCTION_BASE}/payments/proration-preview`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subscriptionId, newPriceId }),
    }
  );

  if (!ok || error) {
    throw new Error(`Failed to get proration preview: ${error || 'Unknown error'}`);
  }

  return data!;
}

/**
 * Change subscription tier with smart proration handling.
 *
 * - Upgrades: Applied immediately with prorated charge for the remainder
 *   of the current billing period.
 * - Downgrades: Scheduled at period end so the user keeps their current
 *   features until the paid period expires. No immediate charge.
 * - Lateral (same rank, different interval): Treated like an upgrade
 *   so the new interval starts immediately.
 */
export async function changeTier(
  userId: string,
  currentTier: TierType,
  newTier: TierType,
  interval: BillingInterval
): Promise<{
  success: boolean;
  direction: 'upgrade' | 'downgrade' | 'lateral';
  effectiveDate: string;
  prorationPreview?: ProrationPreview;
}> {
  const accessToken = await getAccessToken();

  const currentRank = TIER_ORDER.indexOf(currentTier);
  const newRank = TIER_ORDER.indexOf(newTier);

  let direction: 'upgrade' | 'downgrade' | 'lateral';
  if (newRank > currentRank) {
    direction = 'upgrade';
  } else if (newRank < currentRank) {
    direction = 'downgrade';
  } else {
    direction = 'lateral';
  }

  // Build the price key for the new plan
  const priceKey = `${newTier}_${interval}` as keyof typeof STRIPE_PRICES;
  const newPriceId = STRIPE_PRICES[priceKey];

  if (!newPriceId) {
    throw new Error(`No price configured for ${newTier} ${interval}`);
  }

  const { data: result, error, ok } = await secureFetch<{
    effectiveDate?: string;
    prorationPreview?: ProrationPreview;
  }>(
    `${EDGE_FUNCTION_BASE}/payments/change-tier`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId,
        newPriceId,
        newTier,
        direction,
        // Downgrades happen at period end, upgrades immediately
        prorationBehavior: direction === 'downgrade'
          ? 'none'
          : 'create_prorations',
        billingCycleAnchor: direction === 'downgrade'
          ? undefined
          : 'unchanged',
      }),
    }
  );

  if (!ok || error || !result) {
    throw new Error(`Failed to change tier: ${error || 'Unknown error'}`);
  }

  return {
    success: true,
    direction,
    effectiveDate: result.effectiveDate || new Date().toISOString(),
    prorationPreview: result.prorationPreview,
  };
}

// ============================================================================
// Care Package Checkout
// ============================================================================

export interface CarePackageCheckoutParams {
  userId: string;
  email: string;
  carePackage: {
    id: string;
    name: string;
    description: string;
    amount: number; // cents
    recurring: boolean;
    serviceType: string;
  };
}

export async function createCarePackageCheckoutSession(
  params: CarePackageCheckoutParams
): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        carePackage: params.carePackage,
        userId: params.userId,
        email: params.email,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Checkout failed');
  }

  const data = await response.json();
  if (!data.url) throw new Error('No checkout URL returned');
  return { url: data.url };
}

export default {
  createCheckoutSession,
  createPortalSession,
  openCustomerPortal,
  getSubscriptionStatus,
  cancelSubscription,
  resumeSubscription,
  pauseSubscription,
  resumePausedSubscription,
  getPauseStatus,
  createOneTimePayment,
  createVisitPayment,
  calculateVisitPrice,
  validatePromoCode,
  formatPrice,
  changeTier,
  getProrationPreview,
  createBundleCheckoutSession,
  getBundleCredits,
  useBundleCredit,
  STRIPE_PRICES,
  TIER_PRICING,
  VISIT_PRICES,
  BUNDLE_STRIPE_PRICES,
};
