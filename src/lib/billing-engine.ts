// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Billing Engine
 * Complete Stripe integration for subscriptions, payments, and billing management
 *
 * This provides a seamless billing experience with:
 * - Subscription management
 * - Payment processing
 * - Invoice history
 * - Promo code validation
 * - HSA/FSA support
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  tierPricing,
  tierDisplayNames,
  getTierFeatureDescriptions,
  getMaxChildren,
  getMarketplaceDiscount,
  getAIMessageLimit,
  FAIR_USE_AI_DAILY_CAP,
  type TierType,
} from './tier-utils';

// ----------------------------------------------------------------------------
// Tier-config sourcing helpers (SINGLE SOURCE OF TRUTH = src/lib/tier-utils.ts)
//
// PRICING_TIERS below MUST NOT hardcode per-tier scalar facts. These adapters
// translate tier-utils' canonical accessors into the shapes PRICING_TIERS uses
// (numbers, or the literal 'unlimited' string for null/uncapped values), so the
// numbers can only ever come from tier-utils. Drift is caught by
// src/lib/tier-config-consistency.test.ts.
//
// billing-engine's PricingTier.id ('pro_plus') differs from tier-utils' TierType
// ('proplus'); map it here so accessors receive the canonical key.
// ----------------------------------------------------------------------------

/** Map a billing-engine SubscriptionTier id to the canonical tier-utils TierType. */
function toTierType(id: SubscriptionTier): TierType {
  return id === 'pro_plus' ? 'proplus' : id;
}

/** DISPLAY children limit from tier-utils (null → 'unlimited'). */
function childrenLimitFor(id: SubscriptionTier): number | 'unlimited' {
  const max = getMaxChildren(toTierType(id));
  return max === null ? 'unlimited' : max;
}

/**
 * DISPLAY AI/day limit from tier-utils (null → 'unlimited').
 * Paid tiers stay 'unlimited' for the pricing UI; the fair-use ceiling
 * (FAIR_USE_AI_DAILY_CAP) is applied only on the enforcement path in
 * checkMessageLimit() — display and enforcement are intentionally distinct.
 */
function aiPerDayDisplayFor(id: SubscriptionTier): number | 'unlimited' {
  const limit = getAIMessageLimit(toTierType(id));
  return limit === null ? 'unlimited' : limit;
}

/** Marketplace discount (whole-number percent) from tier-utils. */
function discountFor(id: SubscriptionTier): number {
  return getMarketplaceDiscount(toTierType(id));
}

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = 'free' | 'core' | 'pro' | 'pro_plus';
export type BillingInterval = 'month' | 'year';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  features: string[];
  limits: {
    aiMessagesPerDay: number | 'unlimited';
    children: number | 'unlimited';
    vaultDocuments: number | 'unlimited';
    marketplaceDiscount: number;
  };
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
  isPopular?: boolean;
  badge?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  invoiceUrl?: string;
  pdfUrl?: string;
  createdAt: string;
  paidAt?: string;
}

export interface PromoCode {
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  validTiers: SubscriptionTier[];
  validMonths?: number; // How many months discount applies
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

// ============================================================================
// Pricing Configuration
// ============================================================================

// Pricing derived from tier-utils.ts (single source of truth)
// Stripe price IDs come from environment variables — never hardcode placeholder IDs
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try Aminy with basic features',
    monthlyPrice: tierPricing.free.monthly,
    yearlyPrice: tierPricing.free.yearly,
    yearlyMonthlyEquivalent: 0,
    features: [
      '1 child profile',
      'Book telehealth & marketplace visits',
      '3 AI messages per day',
      'Basic routine tracking',
      '3 calm tools',
      'Community access (read-only)',
    ],
    limits: {
      aiMessagesPerDay: aiPerDayDisplayFor('free'),
      children: childrenLimitFor('free'),
      vaultDocuments: 0,
      marketplaceDiscount: discountFor('free'),
    },
    stripePriceIds: {
      monthly: '',
      yearly: '',
    },
  },
  {
    id: 'core',
    name: 'Core',
    description: 'Everything you need for daily support',
    monthlyPrice: tierPricing.core.monthly,
    yearlyPrice: tierPricing.core.yearly,
    yearlyMonthlyEquivalent: +(tierPricing.core.yearly / 12).toFixed(2),
    features: [
      'Unlimited AI conversations',
      'Unlimited children profiles',
      'Full routine management',
      'Document vault (25 docs)',
      'All calm tools',
      'Full community access',
      'Book marketplace sessions',
      'Progress reports',
    ],
    limits: {
      aiMessagesPerDay: aiPerDayDisplayFor('core'),
      children: childrenLimitFor('core'),
      vaultDocuments: 25,
      marketplaceDiscount: discountFor('core'),
    },
    stripePriceIds: {
      monthly: import.meta.env.VITE_PRICE_CORE_MONTHLY || '',
      yearly: import.meta.env.VITE_PRICE_CORE_ANNUAL || '',
    },
    isPopular: true,
    badge: 'Most Popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for serious progress',
    monthlyPrice: tierPricing.pro.monthly,
    yearlyPrice: tierPricing.pro.yearly,
    yearlyMonthlyEquivalent: +(tierPricing.pro.yearly / 12).toFixed(2),
    features: [
      'Everything in Core',
      'Unlimited children profiles',
      'Clinical-grade reports',
      'Provider sharing',
      'Unlimited vault storage',
      'Priority AI responses',
      '20% marketplace discount',
      'IEP goal tracking',
    ],
    limits: {
      aiMessagesPerDay: aiPerDayDisplayFor('pro'),
      children: childrenLimitFor('pro'),
      vaultDocuments: 'unlimited',
      marketplaceDiscount: discountFor('pro'),
    },
    stripePriceIds: {
      monthly: import.meta.env.VITE_PRICE_PRO_MONTHLY || '',
      yearly: import.meta.env.VITE_PRICE_PRO_ANNUAL || '',
    },
  },
  {
    id: 'pro_plus',
    name: 'Pro+ Family',
    description: 'Complete family support system',
    monthlyPrice: tierPricing.proplus.monthly,
    yearlyPrice: tierPricing.proplus.yearly,
    yearlyMonthlyEquivalent: +(tierPricing.proplus.yearly / 12).toFixed(2),
    features: [
      'Everything in Pro',
      'Unlimited children',
      '4 caregiver accounts',
      '30% marketplace discount',
      'Dedicated support',
      'Care coordinator access',
      'Custom reporting',
      'Early feature access',
    ],
    limits: {
      aiMessagesPerDay: aiPerDayDisplayFor('pro_plus'),
      children: childrenLimitFor('pro_plus'),
      vaultDocuments: 'unlimited',
      marketplaceDiscount: discountFor('pro_plus'),
    },
    stripePriceIds: {
      monthly: import.meta.env.VITE_PRICE_PROPLUS_MONTHLY || '',
      yearly: import.meta.env.VITE_PRICE_PROPLUS_ANNUAL || '',
    },
    badge: 'Best Value',
  },
];

/**
 * PROMO_CODES — DEPRECATED (kept for backward compatibility)
 *
 * SECURITY: Promo codes must NEVER be validated client-side. Hardcoding codes
 * in the frontend bundle exposes them to anyone inspecting the JS source.
 *
 * All promo code validation now goes through the server-side edge function:
 *   POST /billing/validate-promo  (or /payments/validate-promo)
 *
 * Server-side validation provides:
 *   - Codes stored in database, not in client bundle
 *   - Proper usage tracking and rate limiting
 *   - Expiration enforcement with server clock (not client clock)
 *   - Stripe Coupon/Promotion Code integration
 *
 * This empty array is exported only so existing imports don't break.
 */
export const PROMO_CODES: PromoCode[] = [];

// ============================================================================
// API Helpers
// ============================================================================

const getAuthToken = (): string => {
  return typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || publicAnonKey
    : publicAnonKey;
};

const billingApi = async (endpoint: string, options: RequestInit = {}): Promise<Record<string, unknown>> => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/billing${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Billing API error: ${response.status}`);
  }

  return response.json();
};

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Get current subscription
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbSubscription(data);
}

/**
 * Create checkout session for new subscription
 */
export async function createCheckout(
  userId: string,
  tier: SubscriptionTier,
  interval: BillingInterval,
  promoCode?: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutResult> {
  try {
    const pricingTier = PRICING_TIERS.find(t => t.id === tier);
    if (!pricingTier) {
      return { success: false, error: 'Invalid tier' };
    }

    const priceId = interval === 'year'
      ? pricingTier.stripePriceIds.yearly
      : pricingTier.stripePriceIds.monthly;

    const result = await billingApi('/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        priceId,
        tier,
        interval,
        promoCode,
        successUrl: successUrl || `${window.location.origin}/?screen=dashboard&payment=success`,
        cancelUrl: cancelUrl || `${window.location.origin}/?screen=paywall&payment=cancelled`,
      }),
    });

    return {
      success: true,
      checkoutUrl: result.url as string | undefined,
    };
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to create checkout',
    };
  }
}

/**
 * Open Stripe billing portal
 */
export async function openBillingPortal(userId: string): Promise<string | null> {
  try {
    const result = await billingApi('/portal', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        returnUrl: `${window.location.origin}/settings/billing`,
      }),
    });

    return result.url as string | null;
  } catch (error) {
    console.error('Portal error:', error);
    return null;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    await billingApi('/cancel', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return true;
  } catch (error) {
    console.error('Cancel error:', error);
    return false;
  }
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(userId: string): Promise<boolean> {
  try {
    await billingApi('/resume', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return true;
  } catch (error) {
    console.error('Resume error:', error);
    return false;
  }
}

/**
 * Change subscription tier
 */
export async function changeTier(
  userId: string,
  newTier: SubscriptionTier,
  interval?: BillingInterval
): Promise<boolean> {
  try {
    const pricingTier = PRICING_TIERS.find(t => t.id === newTier);
    if (!pricingTier) return false;

    const priceId = interval === 'year'
      ? pricingTier.stripePriceIds.yearly
      : pricingTier.stripePriceIds.monthly;

    await billingApi('/change-plan', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        priceId,
        newTier,
      }),
    });

    return true;
  } catch (error) {
    console.error('Change tier error:', error);
    return false;
  }
}

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Get payment methods for a user
 */
export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  try {
    const result = await billingApi(`/payment-methods?userId=${userId}`);
    return (result.paymentMethods || []) as PaymentMethod[];
  } catch (error) {
    console.error('Get payment methods error:', error);
    return [];
  }
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<boolean> {
  try {
    await billingApi('/set-default-payment-method', {
      method: 'POST',
      body: JSON.stringify({ userId, paymentMethodId }),
    });
    return true;
  } catch (error) {
    console.error('Set default payment method error:', error);
    return false;
  }
}

/**
 * Remove a payment method
 */
export async function removePaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<boolean> {
  try {
    await billingApi('/remove-payment-method', {
      method: 'POST',
      body: JSON.stringify({ userId, paymentMethodId }),
    });
    return true;
  } catch (error) {
    console.error('Remove payment method error:', error);
    return false;
  }
}

// ============================================================================
// Invoices
// ============================================================================

/**
 * Get invoice history
 */
export async function getInvoices(userId: string, limit: number = 10): Promise<Invoice[]> {
  try {
    const result = await billingApi(`/invoices?userId=${userId}&limit=${limit}`);
    return ((result.invoices || []) as Record<string, unknown>[]).map((inv) => ({
      id: inv.id as string,
      stripeInvoiceId: inv.stripe_invoice_id as string,
      amount: inv.amount as number,
      currency: inv.currency as string,
      status: inv.status as Invoice['status'],
      description: inv.description as string,
      invoiceUrl: inv.invoice_url as string,
      pdfUrl: inv.pdf_url as string,
      createdAt: inv.created_at as string,
      paidAt: inv.paid_at as string,
    }));
  } catch (error) {
    console.error('Get invoices error:', error);
    return [];
  }
}

/**
 * Get upcoming invoice (preview)
 */
export async function getUpcomingInvoice(userId: string): Promise<Invoice | null> {
  try {
    const result = await billingApi(`/upcoming-invoice?userId=${userId}`);
    if (!result.invoice) return null;

    const invoice = result.invoice as Record<string, unknown>;
    return {
      id: 'upcoming',
      stripeInvoiceId: '',
      amount: invoice.amount as number,
      currency: invoice.currency as string,
      status: 'pending',
      description: invoice.description as string,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Get upcoming invoice error:', error);
    return null;
  }
}

// ============================================================================
// Promo Codes
// ============================================================================

/**
 * Validate a promo code
 *
 * SECURITY: All validation happens server-side via the edge function.
 * The server checks the code against the database (or Stripe Promotion Codes),
 * enforces usage limits, tier restrictions, and expiration with the server clock.
 * No promo codes are stored or validated in the client bundle.
 */
export async function validatePromoCode(
  code: string,
  tier: SubscriptionTier
): Promise<{
  valid: boolean;
  promoCode?: PromoCode;
  error?: string;
}> {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Please enter a promo code' };
  }

  try {
    const result = await billingApi('/validate-promo', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim().toUpperCase(), tier }),
    });

    if (result.valid) {
      return { valid: true, promoCode: result.promoCode as PromoCode | undefined };
    }
    return { valid: false, error: (result.error as string) || 'Invalid promo code' };
  } catch (error) {
    console.warn('[Billing] Promo code validation failed:', error);
    return { valid: false, error: 'Unable to validate code. Please try again.' };
  }
}

/**
 * Apply promo code to subscription
 */
export async function applyPromoCode(userId: string, code: string): Promise<boolean> {
  try {
    await billingApi('/apply-promo', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    });
    return true;
  } catch (error) {
    console.error('Apply promo error:', error);
    return false;
  }
}

// ============================================================================
// HSA/FSA Support
// ============================================================================

export interface HSAFSAInfo {
  isEligible: boolean;
  requiredDocuments: string[];
  letterTemplate: string;
}

/**
 * Get HSA/FSA eligibility info
 */
export function getHSAFSAInfo(tier: SubscriptionTier): HSAFSAInfo {
  if (tier === 'free') {
    return {
      isEligible: false,
      requiredDocuments: [],
      letterTemplate: '',
    };
  }

  return {
    isEligible: true,
    requiredDocuments: [
      'Letter of Medical Necessity from provider',
      'Diagnosis documentation (optional but helpful)',
    ],
    letterTemplate: `
To Whom It May Concern:

I am writing to confirm that [Child's Name], date of birth [DOB], is under my care for [Diagnosis].

I am recommending the use of Aminy, a digital health application that provides Applied Behavior Analysis (ABA) informed support for children with developmental differences. This application is medically necessary to:

1. Provide consistent behavioral support between therapy sessions
2. Track progress on therapeutic goals
3. Offer evidence-based strategies for caregivers
4. Support the child's overall treatment plan

The Aminy ${tier.toUpperCase()} subscription at $${PRICING_TIERS.find(t => t.id === tier)?.monthlyPrice}/month is medically necessary for the treatment of the patient's condition.

Please contact me if you require additional information.

Sincerely,
[Provider Name, Credentials]
[Practice Name]
[Phone/Email]
    `.trim(),
  };
}

// ============================================================================
// Trial Management
// ============================================================================

/**
 * Start a free trial
 */
export async function startTrial(userId: string): Promise<boolean> {
  try {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

    // Column names must match handleOnboardingComplete in App.tsx
    // (trial_started_at / trial_ends_at) — the canonical trial_tracking schema.
    await supabase.from('trial_tracking').upsert({
      user_id: userId,
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      conversations_used: 0,
      soft_paywall_shown: false,
      hard_paywall_shown: false,
    }, { onConflict: 'user_id' });

    // Update user tier to core (trial)
    await supabase
      .from('profiles')
      .update({ tier: 'core', is_trial: true })
      .eq('id', userId);

    return true;
  } catch (error) {
    console.error('Start trial error:', error);
    return false;
  }
}

/**
 * Get trial status
 */
export async function getTrialStatus(userId: string): Promise<{
  isActive: boolean;
  daysRemaining: number;
  conversationsUsed: number;
  showSoftPaywall: boolean;
  showHardPaywall: boolean;
} | null> {
  const { data, error } = await supabase
    .from('trial_tracking')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const trialEnd = new Date(data.trial_ends_at || data.trial_end);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    isActive: daysRemaining > 0,
    daysRemaining,
    conversationsUsed: data.conversations_used || 0,
    showSoftPaywall: data.conversations_used >= 3 && !data.soft_paywall_shown,
    showHardPaywall: data.conversations_used >= 5 && !data.hard_paywall_shown,
  };
}

/**
 * Track trial conversation
 */
export async function trackTrialConversation(userId: string): Promise<void> {
  await supabase.rpc('increment_trial_conversations', { user_id_param: userId });
}

/**
 * Mark paywall as shown
 */
export async function markPaywallShown(
  userId: string,
  type: 'soft' | 'hard'
): Promise<void> {
  const field = type === 'soft' ? 'soft_paywall_shown' : 'hard_paywall_shown';
  await supabase
    .from('trial_tracking')
    .update({ [field]: true })
    .eq('user_id', userId);
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Check if user has reached their daily AI message limit.
 *
 * DISPLAY vs ENFORCEMENT (intentionally distinct):
 * - DISPLAY: paid tiers (core/pro/pro_plus) are marketed as "Unlimited" — that is
 *   why PRICING_TIERS[*].limits.aiMessagesPerDay stays 'unlimited'. The pricing UI
 *   keeps showing "Unlimited" off that config; do NOT change it.
 * - ENFORCEMENT: this send-path check still applies a fair-use ceiling
 *   (FAIR_USE_AI_DAILY_CAP = 100/day) to "unlimited" tiers as anti-abuse / COGS
 *   protection. Beyond the cap we return allowed:false with a friendly `reason`
 *   ('fair_use_daily_limit') rather than a hard paywall message.
 * - Free tier keeps its hard 3/day limit (reason 'free_daily_limit' when hit).
 *
 * `limit` in the return is the ENFORCED number actually applied (3 for free,
 * 100 for paid), so callers showing "X of N used" reflect the real ceiling.
 */
export async function checkMessageLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number | 'unlimited';
  resetAt: string;
  /** Present only when allowed === false. Distinguishes hard paywall vs fair-use. */
  reason?: 'free_daily_limit' | 'fair_use_daily_limit';
  /** Friendly, copy-ready message for the blocked state. */
  message?: string;
}> {
  // Get user's tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  const tier = profile?.tier || 'free';
  const tierConfig = PRICING_TIERS.find(t => t.id === tier);
  const displayLimit = tierConfig?.limits.aiMessagesPerDay ?? 3;

  // Resolve the ENFORCED limit. Paid tiers display "unlimited" but enforce the
  // fair-use cap; free (or any numeric config) enforces its hard number.
  const isPaidUnlimited = displayLimit === 'unlimited';
  const enforcedLimit = isPaidUnlimited ? FAIR_USE_AI_DAILY_CAP : displayLimit;

  // Get today's usage (needed for both free and fair-use enforcement)
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const used = usage?.message_count || 0;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const resetAt = tomorrow.toISOString();

  const allowed = used < enforcedLimit;

  if (allowed) {
    return { allowed: true, used, limit: enforcedLimit, resetAt };
  }

  // Blocked — pick the right friendly reason/copy for display vs enforcement.
  return {
    allowed: false,
    used,
    limit: enforcedLimit,
    resetAt,
    reason: isPaidUnlimited ? 'fair_use_daily_limit' : 'free_daily_limit',
    message: isPaidUnlimited
      ? `You've reached today's fair-use limit (${FAIR_USE_AI_DAILY_CAP} messages) — resets tomorrow.`
      : `You've reached your daily limit of ${enforcedLimit} messages — upgrade for more or try again tomorrow.`,
  };
}

/**
 * Increment message count
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_message_count', {
    user_id_param: userId,
    date_param: today,
  });
}

// ============================================================================
// Grace Period Management
// ============================================================================

/** Number of days a user retains paid features after a payment fails */
export const GRACE_PERIOD_DAYS = 7;

export interface GracePeriodStatus {
  inGracePeriod: boolean;
  daysRemaining: number;
  suspendedAt: string | null;
  /** ISO timestamp when the grace period started (first past_due event) */
  gracePeriodStartedAt: string | null;
  /** ISO timestamp when features will be suspended */
  gracePeriodEndsAt: string | null;
}

/**
 * Handle a subscription that has entered past_due status.
 *
 * Called by the webhook when Stripe reports a failed payment.
 * Creates or updates a grace_periods row so the frontend can
 * show a countdown banner and the backend can enforce suspension
 * once the window expires.
 */
export async function handlePastDueSubscription(
  userId: string,
  subscriptionId: string
): Promise<{ success: boolean; gracePeriodEndsAt: string }> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Upsert so we don't reset an existing grace period if Stripe fires
  // multiple past_due webhooks for the same cycle.
  const { error } = await supabase
    .from('grace_periods')
    .upsert(
      {
        user_id: userId,
        subscription_id: subscriptionId,
        status: 'active',
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        suspended_at: null,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Billing] Failed to create grace period:', error);
    throw new Error(`Failed to create grace period: ${error.message}`);
  }

  if (import.meta.env.DEV) console.log(
    `[Billing] Grace period started for user ${userId} — ends ${endsAt.toISOString()}`
  );

  return { success: true, gracePeriodEndsAt: endsAt.toISOString() };
}

/**
 * Get the current grace period status for a user.
 *
 * Returns a stable object the frontend can use for banners / feature gating.
 */
export async function getGracePeriodStatus(
  userId: string
): Promise<GracePeriodStatus> {
  const { data, error } = await supabase
    .from('grace_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[Billing] Failed to fetch grace period:', error);
  }

  // No active grace period
  if (!data) {
    return {
      inGracePeriod: false,
      daysRemaining: 0,
      suspendedAt: null,
      gracePeriodStartedAt: null,
      gracePeriodEndsAt: null,
    };
  }

  const now = new Date();
  const endsAt = new Date(data.ends_at as string);
  const msRemaining = endsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    inGracePeriod: daysRemaining > 0 && !data.suspended_at,
    daysRemaining,
    suspendedAt: (data.suspended_at as string) || null,
    gracePeriodStartedAt: (data.started_at as string) || null,
    gracePeriodEndsAt: (data.ends_at as string) || null,
  };
}

/**
 * Expire a grace period and suspend the user's paid features.
 *
 * Called either by a scheduled job or by the webhook when the
 * grace window has elapsed and payment still has not succeeded.
 */
export async function expireGracePeriod(userId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // Mark the grace period as expired
  const { error: gpError } = await supabase
    .from('grace_periods')
    .update({ status: 'expired', suspended_at: now, updated_at: now })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (gpError) {
    console.error('[Billing] Failed to expire grace period:', gpError);
    return false;
  }

  // Downgrade the user to free tier
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ tier: 'free', updated_at: now })
    .eq('id', userId);

  if (profileError) {
    console.error('[Billing] Failed to downgrade user after grace expiry:', profileError);
    return false;
  }

  if (import.meta.env.DEV) console.log(`[Billing] Grace period expired — user ${userId} downgraded to free`);
  return true;
}

/**
 * Resolve a grace period after the user successfully pays.
 *
 * Called by the webhook on `invoice.payment_succeeded` when there
 * is an active grace period for the customer.
 */
export async function resolveGracePeriod(userId: string): Promise<boolean> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('grace_periods')
    .update({ status: 'resolved', updated_at: now })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('[Billing] Failed to resolve grace period:', error);
    return false;
  }

  if (import.meta.env.DEV) console.log(`[Billing] Grace period resolved for user ${userId}`);
  return true;
}

// ============================================================================
// Helpers
// ============================================================================

function mapDbSubscription(data: Record<string, unknown>): Subscription {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    stripeSubscriptionId: data.stripe_subscription_id as string,
    stripeCustomerId: data.stripe_customer_id as string,
    tier: data.tier as SubscriptionTier,
    status: data.status as SubscriptionStatus,
    interval: data.interval as BillingInterval,
    currentPeriodStart: data.current_period_start as string,
    currentPeriodEnd: data.current_period_end as string,
    cancelAtPeriodEnd: data.cancel_at_period_end as boolean,
    canceledAt: data.canceled_at as string | undefined,
    trialEnd: data.trial_end as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate savings percentage for yearly
 */
export function calculateYearlySavings(tier: PricingTier): number {
  const monthlyTotal = tier.monthlyPrice * 12;
  const savings = monthlyTotal - tier.yearlyPrice;
  return Math.round((savings / monthlyTotal) * 100);
}

// ============================================================================
// Export
// ============================================================================

export const billingEngine = {
  // Configuration
  PRICING_TIERS,
  PROMO_CODES,
  GRACE_PERIOD_DAYS,

  // Subscription
  getSubscription,
  createCheckout,
  openBillingPortal,
  cancelSubscription,
  resumeSubscription,
  changeTier,

  // Grace Period
  handlePastDueSubscription,
  getGracePeriodStatus,
  expireGracePeriod,
  resolveGracePeriod,

  // Payment Methods
  getPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,

  // Invoices
  getInvoices,
  getUpcomingInvoice,

  // Promo Codes
  validatePromoCode,
  applyPromoCode,

  // HSA/FSA
  getHSAFSAInfo,

  // Trial
  startTrial,
  getTrialStatus,
  trackTrialConversation,
  markPaywallShown,

  // Usage
  checkMessageLimit,
  incrementMessageCount,

  // Helpers
  formatPrice,
  calculateYearlySavings,
};

export default billingEngine;
