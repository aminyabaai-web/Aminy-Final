/**
 * Stripe Payment Routes
 *
 * Backend handlers for Stripe payments
 * Requires STRIPE_SECRET_KEY in Supabase secrets
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Note: In production, use Stripe SDK: import Stripe from 'stripe';
// const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

// ---------------------------------------------------------------------------
// Type definitions for Stripe webhook objects and Supabase client
// ---------------------------------------------------------------------------

/** Minimal interface for a Supabase client as used in this module */
interface SupabaseClient {
  from(table: string): SupabaseQueryBuilder;
  rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: SupabaseError | null }>;
}

/** Supabase query builder chain (simplified) */
interface SupabaseQueryBuilder {
  select(columns: string, options?: { count?: string; head?: boolean }): SupabaseQueryBuilder;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder;
  update(values: Record<string, unknown>): SupabaseQueryBuilder;
  upsert(values: Record<string, unknown>, options?: { onConflict?: string }): SupabaseQueryBuilder;
  delete(): SupabaseQueryBuilder;
  eq(column: string, value: string | number | boolean): SupabaseQueryBuilder;
  single(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null; count?: number | null }>;
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: SupabaseError | null }>;
}

/** Supabase error shape */
interface SupabaseError {
  message: string;
  code?: string;
}

/** Stripe subscription object (minimal fields used in this module) */
interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number;
  trial_end: number | null;
  metadata?: Record<string, string>;
  items: {
    data: Array<{
      price?: {
        id: string;
        recurring?: { interval: string };
      };
    }>;
  };
}

/** Stripe webhook event */
interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/** Helper to get an error message from an unknown error */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_VERIFIED_DOMAIN = Deno.env.get('RESEND_VERIFIED_DOMAIN') === 'true';
const FROM_EMAIL = RESEND_VERIFIED_DOMAIN ? 'Aminy <hello@aminy.ai>' : 'Aminy <onboarding@resend.dev>';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Price ID to tier mapping
// These should match your Stripe product price IDs
const PRICE_TO_TIER: Record<string, string> = {
  // Monthly prices
  [Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY') || 'price_starter_monthly']: 'starter',
  [Deno.env.get('STRIPE_PRICE_CORE_MONTHLY') || 'price_core_monthly']: 'core',
  [Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') || 'price_pro_monthly']: 'pro',
  [Deno.env.get('STRIPE_PRICE_PROPLUS_MONTHLY') || 'price_proplus_monthly']: 'proplus',
  // Annual prices
  [Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL') || 'price_starter_annual']: 'starter',
  [Deno.env.get('STRIPE_PRICE_CORE_ANNUAL') || 'price_core_annual']: 'core',
  [Deno.env.get('STRIPE_PRICE_PRO_ANNUAL') || 'price_pro_annual']: 'pro',
  [Deno.env.get('STRIPE_PRICE_PROPLUS_ANNUAL') || 'price_proplus_annual']: 'proplus',
};

// ── Audit logging for financial events (writes directly to audit_log table) ──

async function logFinancialAuditEvent(
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      user_id: userId || 'system',
      user_role: 'system',
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: JSON.stringify(details),
      session_id: 'stripe-webhook',
      success: true,
    });
  } catch (err) {
    // Audit logging should never block financial operations
    console.warn('[Audit] Failed to log financial event:', err);
  }
}

/**
 * Get tier from Stripe price ID
 */
function getTierFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  return PRICE_TO_TIER[priceId] || null;
}

// Email notification service
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        text: text || subject,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Email templates
const emailTemplates = {
  paymentSucceeded: (name: string, amount: string, date: string) => ({
    subject: 'Payment Confirmed - Aminy',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: 600; color: #0891b2; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 12px; }
          .amount { font-size: 24px; font-weight: 600; color: #0891b2; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Aminy</div>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you! Your payment has been processed successfully.</p>
            <p><span class="amount">${amount}</span> on ${date}</p>
            <p>Your subscription is active and you have full access to all your plan features.</p>
            <p>If you have any questions, just reply to this email - we're here to help.</p>
            <a href="https://app.aminy.ai" class="button">Open Aminy</a>
          </div>
          <div class="footer">
            <p>With care,<br>The Aminy Team</p>
            <p>You're receiving this because you subscribed to Aminy.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, Thank you! Your payment of ${amount} on ${date} has been processed. Your subscription is active. - The Aminy Team`,
  }),

  paymentFailed: (name: string, amount: string) => ({
    subject: "We couldn't process your payment - Aminy",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: 600; color: #0891b2; }
          .content { background: #fff5f5; padding: 30px; border-radius: 12px; border: 1px solid #fed7d7; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Aminy</div>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We had trouble processing your payment of ${amount}.</p>
            <p>This can happen for a few reasons:</p>
            <ul>
              <li>Your card may have expired</li>
              <li>There might be insufficient funds</li>
              <li>Your bank may have declined the charge</li>
            </ul>
            <p>Please update your payment method to keep your subscription active:</p>
            <a href="https://app.aminy.ai/settings/subscription" class="button">Update Payment Method</a>
            <p style="margin-top: 20px;">If you need help, just reply to this email.</p>
          </div>
          <div class="footer">
            <p>We're here for you,<br>The Aminy Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, We had trouble processing your payment of ${amount}. Please update your payment method at https://app.aminy.ai/settings/subscription - The Aminy Team`,
  }),

  subscriptionCanceled: (name: string, endDate: string) => ({
    subject: "We're sorry to see you go - Aminy",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: 600; color: #0891b2; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 12px; }
          .highlight { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Aminy</div>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received your cancellation request. We're genuinely sorry to see you go.</p>
            <div class="highlight">
              <p><strong>Your access continues until: ${endDate}</strong></p>
              <p>You can still use all your features until then.</p>
            </div>
            <p>If you ever want to come back, your data will be waiting for you. Just log in and resubscribe.</p>
            <p>Changed your mind? You can resume your subscription anytime before ${endDate}:</p>
            <a href="https://app.aminy.ai/settings/subscription" class="button">Resume Subscription</a>
            <p style="margin-top: 20px;">We'd love to hear what we could do better. Just reply to this email with any feedback.</p>
          </div>
          <div class="footer">
            <p>Wishing you and your family all the best,<br>The Aminy Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, We received your cancellation request. Your access continues until ${endDate}. Changed your mind? Resume at https://app.aminy.ai/settings/subscription - The Aminy Team`,
  }),

  trialEnding: (name: string, daysLeft: number) => ({
    subject: `Your Aminy trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: 600; color: #0891b2; }
          .content { background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%); padding: 30px; border-radius: 12px; }
          .countdown { font-size: 48px; font-weight: 700; color: #0891b2; text-align: center; margin: 20px 0; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
          .check { color: #22c55e; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Aminy</div>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <div class="countdown">${daysLeft} day${daysLeft === 1 ? '' : 's'} left</div>
            <p>Your free trial is ending soon. Here's what you'll keep with a subscription:</p>
            <div class="features">
              <div class="feature"><span class="check">✓</span> Unlimited AI conversations with Aminy</div>
              <div class="feature"><span class="check">✓</span> All your saved memories about your child</div>
              <div class="feature"><span class="check">✓</span> Progress tracking and weekly reports</div>
              <div class="feature"><span class="check">✓</span> Vault document storage and insights</div>
              <div class="feature"><span class="check">✓</span> Aminy Jr activities for your child</div>
            </div>
            <p style="text-align: center;">
              <a href="https://app.aminy.ai/settings/subscription" class="button">Keep My Access</a>
            </p>
          </div>
          <div class="footer">
            <p>Questions? Just reply to this email.<br>The Aminy Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, Your Aminy trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Keep your access at https://app.aminy.ai/settings/subscription - The Aminy Team`,
  }),
};

// Helper to make Stripe API calls
async function stripeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, string>
) {
  const url = `https://api.stripe.com/v1${endpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }

  return data;
}

// Price ID mapping — env override first, then the LIVE Stripe price IDs
// (created June 9 2026 in the Aminy account, acct_1Sq3G6QaCBrUl24B).
// Price IDs are public identifiers (they appear in checkout URLs) — safe as
// fallbacks. Annual prices match the ADVERTISED yearly totals in tier-utils
// ($129 / $279 / $479), not a derived percent-off.
const PRICE_IDS: Record<string, string> = {
  // Legacy starter → same prices as core
  starter_monthly: Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY') || 'price_1TfAcvQaCBrUl24BHrxiGHuv',
  starter_annual: Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL') || 'price_1TgUiEQaCBrUl24BCnQ5uBQ7',
  core_monthly: Deno.env.get('STRIPE_PRICE_CORE_MONTHLY') || 'price_1TfAcvQaCBrUl24BHrxiGHuv',       // $14.99/mo
  core_annual: Deno.env.get('STRIPE_PRICE_CORE_ANNUAL') || 'price_1TgUiEQaCBrUl24BCnQ5uBQ7',        // $129/yr
  pro_monthly: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') || 'price_1TfAcxQaCBrUl24B539LF2VT',         // $29.99/mo
  pro_annual: Deno.env.get('STRIPE_PRICE_PRO_ANNUAL') || 'price_1TgUiFQaCBrUl24B4XKvn8IH',          // $279/yr
  proplus_monthly: Deno.env.get('STRIPE_PRICE_PROPLUS_MONTHLY') || 'price_1TfAczQaCBrUl24Bxrsz0tef', // $49.99/mo
  proplus_annual: Deno.env.get('STRIPE_PRICE_PROPLUS_ANNUAL') || 'price_1TgUiGQaCBrUl24Be9NyZWCn',   // $479/yr
};

// Surface a misconfigured prod deploy: if the live price-ID env vars are absent we silently
// fall back to the baked IDs above, which can charge the wrong amount. Warn so it's observable.
{
  const missingPriceEnv = [
    'STRIPE_PRICE_CORE_MONTHLY', 'STRIPE_PRICE_CORE_ANNUAL',
    'STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_ANNUAL',
    'STRIPE_PRICE_PROPLUS_MONTHLY', 'STRIPE_PRICE_PROPLUS_ANNUAL',
  ].filter((k) => !Deno.env.get(k));
  if (missingPriceEnv.length > 0) {
    console.warn(`[stripe] Missing price-ID env vars, using baked fallbacks: ${missingPriceEnv.join(', ')}`);
  }
}

// ============================================================================
// SECURE PROMO CODE HANDLING (Server-Side Only - Database-Backed)
// ============================================================================

/**
 * Validate and get promo code details using database
 * This is the secure backend endpoint - promo codes are NOT exposed to frontend
 * Uses the can_use_promo_code() database function for validation with:
 * - Per-user limits
 * - Global usage limits
 * - Expiration checking
 * - First-purchase-only restrictions
 * - Context restrictions (subscription, telehealth, marketplace)
 */
export async function validatePromoCode(req: Request, supabase?: SupabaseClient): Promise<Response> {
  try {
    const { code, subtotal, userId, context = 'telehealth' } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid code format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize and uppercase the code
    const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 50);

    // Create Supabase client if not provided
    if (!supabase) {
      const { createClient } = await import('jsr:@supabase/supabase-js@2');
      supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
    }

    // First, get the promo code from database
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('is_active', true)
      .single();

    if (promoError || !promo) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid promo code' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Promo code has expired' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check context restriction
    if (promo.context_restriction && !promo.context_restriction.includes(context)) {
      return new Response(JSON.stringify({ valid: false, error: 'Promo code is not valid for this purchase type' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If userId provided, check per-user and first-purchase restrictions
    if (userId) {
      // Check global max uses
      if (promo.max_uses) {
        const { count: totalUses } = await supabase
          .from('promo_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('promo_code', sanitizedCode);

        if (totalUses >= promo.max_uses) {
          return new Response(JSON.stringify({ valid: false, error: 'Promo code has reached maximum uses' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Check per-user limit
      if (promo.per_user_limit) {
        const { count: userUses } = await supabase
          .from('promo_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('promo_code', sanitizedCode)
          .eq('user_id', userId);

        if (userUses >= promo.per_user_limit) {
          return new Response(JSON.stringify({ valid: false, error: 'You have already used this promo code' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Check first purchase only
      if (promo.first_purchase_only) {
        const { count: previousPurchases } = await supabase
          .from('promo_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (previousPurchases > 0) {
          return new Response(JSON.stringify({ valid: false, error: 'Promo code is only valid for first-time purchases' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Calculate discount if subtotal provided
    let discountAmount = 0;
    if (subtotal && typeof subtotal === 'number') {
      if (promo.discount_type === 'percent') {
        discountAmount = Math.round(subtotal * (promo.discount_value / 100));
      } else {
        discountAmount = promo.discount_value;
      }
    }

    return new Response(JSON.stringify({
      valid: true,
      description: promo.description,
      type: promo.discount_type,
      value: promo.discount_value,
      discountAmount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    return new Response(JSON.stringify({ valid: false, error: 'Validation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Calculate discount for a promo code (internal use - async for database lookup)
 */
export async function calculatePromoDiscount(
  code: string,
  subtotal: number,
  supabase?: SupabaseClient
): Promise<number> {
  const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Create Supabase client if not provided
  if (!supabase) {
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  // Get promo from database
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', sanitizedCode)
    .eq('is_active', true)
    .single();

  if (error || !promo) return 0;

  // Check expiration
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return 0;
  }

  if (promo.discount_type === 'percent') {
    return Math.round(subtotal * (promo.discount_value / 100));
  }

  return promo.discount_value;
}

/**
 * Record a promo code redemption (for tracking and abuse prevention)
 */
export async function recordPromoRedemption(
  supabase: SupabaseClient,
  userId: string,
  code: string,
  context: 'subscription' | 'telehealth' | 'marketplace',
  discountAmount: number,
  originalAmount: number,
  finalAmount: number,
  paymentId?: string,
  appointmentId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Get promo to check if it's percentage-based
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('discount_type, discount_value')
    .eq('code', sanitizedCode)
    .single();

  await supabase.from('promo_redemptions').insert({
    user_id: userId,
    promo_code: sanitizedCode,
    context,
    discount_amount: discountAmount,
    discount_percent: promo?.discount_type === 'percent' ? promo.discount_value : null,
    original_amount: originalAmount,
    final_amount: finalAmount,
    payment_id: paymentId || null,
    appointment_id: appointmentId || null,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  // Update current_uses in promo_codes table
  await supabase.rpc('increment_promo_uses', { p_code: sanitizedCode });
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(req: Request): Promise<Response> {
  try {
    const { userId, email, tier, interval, successUrl, cancelUrl, priceId } = await req.json();

    if (!userId || !email || !tier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create price ID
    const stripePriceId = priceId || PRICE_IDS[`${tier}_${interval}`];

    // Create checkout session
    const session = await stripeRequest('/checkout/sessions', 'POST', {
      'mode': 'subscription',
      'customer_email': email,
      'client_reference_id': userId,
      'line_items[0][price]': stripePriceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'allow_promotion_codes': 'true',
      'billing_address_collection': 'auto',
      // 7-day trial on all paid tiers — matches tierPricing.hasTrial in src/lib/tier-utils.ts
      'subscription_data[trial_period_days]': '7',
      'subscription_data[metadata][userId]': userId,
      'subscription_data[metadata][tier]': tier,
    });

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(req: Request): Promise<Response> {
  try {
    const { userId, returnUrl } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get customer ID from stored subscription data
    // In production, store this mapping in your database
    const customerId = await getStripeCustomerId(userId);

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await stripeRequest('/billing_portal/sessions', 'POST', {
      'customer': customerId,
      'return_url': returnUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create portal error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get subscription status
 */
export async function getSubscription(userId: string): Promise<Response> {
  try {
    const customerId = await getStripeCustomerId(userId);

    if (!customerId) {
      return new Response(JSON.stringify({
        active: false,
        tier: 'free',
        interval: 'monthly',
        currentPeriodEnd: '',
        cancelAtPeriodEnd: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get active subscriptions for customer
    const subscriptions = await stripeRequest(`/subscriptions?customer=${customerId}&status=active`);

    if (!subscriptions.data?.length) {
      return new Response(JSON.stringify({
        active: false,
        tier: 'free',
        interval: 'monthly',
        currentPeriodEnd: '',
        cancelAtPeriodEnd: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscription = subscriptions.data[0];
    const tier = subscription.metadata?.tier || 'core';
    const interval = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';

    return new Response(JSON.stringify({
      active: true,
      tier,
      interval,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : undefined,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(req: Request): Promise<Response> {
  try {
    const { userId } = await req.json();
    const customerId = await getStripeCustomerId(userId);

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscriptions = await stripeRequest(`/subscriptions?customer=${customerId}&status=active`);

    if (!subscriptions.data?.length) {
      return new Response(JSON.stringify({ error: 'No active subscription' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscriptionId = subscriptions.data[0].id;

    await stripeRequest(`/subscriptions/${subscriptionId}`, 'POST', {
      'cancel_at_period_end': 'true',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Resume cancelled subscription
 */
export async function resumeSubscription(req: Request): Promise<Response> {
  try {
    const { userId } = await req.json();
    const customerId = await getStripeCustomerId(userId);

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscriptions = await stripeRequest(`/subscriptions?customer=${customerId}`);
    const cancelledSub = subscriptions.data?.find((s: StripeSubscription) => s.cancel_at_period_end);

    if (!cancelledSub) {
      return new Response(JSON.stringify({ error: 'No cancelled subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await stripeRequest(`/subscriptions/${cancelledSub.id}`, 'POST', {
      'cancel_at_period_end': 'false',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Create one-time payment (for on-demand telehealth)
 */
export async function createOneTimePayment(req: Request): Promise<Response> {
  try {
    const { userId, email, amount, description, metadata, successUrl, cancelUrl } = await req.json();

    if (!amount || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await stripeRequest('/checkout/sessions', 'POST', {
      'mode': 'payment',
      'customer_email': email,
      'client_reference_id': userId,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': amount.toString(),
      'line_items[0][price_data][product_data][name]': description,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      ...Object.entries(metadata || {}).reduce((acc, [key, value], i) => ({
        ...acc,
        [`payment_intent_data[metadata][${key}]`]: value,
      }), {}),
    });

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Verify Stripe webhook signature
 * Uses HMAC-SHA256 to verify the signature matches the payload
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Parse the signature header
    const elements = signature.split(',');
    const signatureData: Record<string, string> = {};

    for (const element of elements) {
      const [key, value] = element.split('=');
      signatureData[key] = value;
    }

    const timestamp = signatureData['t'];
    const v1Signature = signatureData['v1'];

    if (!timestamp || !v1Signature) {
      console.error('Invalid signature format');
      return false;
    }

    // Check if timestamp is within tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - signatureTime) > 300) {
      console.error('Webhook timestamp outside tolerance');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (v1Signature.length !== expectedSignature.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < v1Signature.length; i++) {
      mismatch |= v1Signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return mismatch === 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Stripe webhook handler
 */
export async function handleWebhook(req: Request): Promise<Response> {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // Verify webhook signature
    if (!signature) {
      console.error('Missing Stripe signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured — refusing to process unverified webhook');
      return new Response(JSON.stringify({ error: 'Webhook verification not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyWebhookSignature(body, signature, STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const customerId = session.customer;
        const customerEmail = session.customer_details?.email;
        const customerName = session.customer_details?.name || 'there';

        // Store customer ID mapping
        if (userId && customerId) {
          await storeStripeCustomerId(userId, customerId);
        }

        // Check if this is a telehealth visit payment
        const metadata = session.metadata || {};
        if (metadata.type === 'telehealth_visit') {
          try {
            // Create the appointment after successful payment
            const appointmentData = {
              user_id: userId,
              provider_id: metadata.providerId,
              slot_id: metadata.slotId,
              visit_type: metadata.visitType,
              visit_format: 'remote',
              status: 'confirmed',
              payment_status: 'completed',
              payment_id: session.payment_intent,
              price: session.amount_total,
              scheduled_at: metadata.scheduledAt || new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { data: appointment, error: appointmentError } = await supabase
              .from('telehealth_appointments')
              .insert(appointmentData)
              .select()
              .single();

            if (appointmentError) {
              console.error('Failed to create appointment:', appointmentError);
            } else {
              console.log(`Created telehealth appointment ${appointment.id} for user ${userId}`);

              // Send confirmation email
              if (customerEmail) {
                const visitDate = new Date(metadata.scheduledAt || Date.now()).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });
                const amount = session.amount_total
                  ? `$${(session.amount_total / 100).toFixed(2)}`
                  : 'your visit';

                await sendEmail(
                  customerEmail,
                  'Your Telehealth Visit is Confirmed - Aminy',
                  `
                    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h1 style="color: #0891b2;">Your Visit is Confirmed!</h1>
                      <p>Hi ${customerName},</p>
                      <p>Your telehealth appointment has been scheduled and paid for.</p>
                      <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <p><strong>Date:</strong> ${visitDate}</p>
                        <p><strong>Amount Paid:</strong> ${amount}</p>
                        <p><strong>Format:</strong> Video Call</p>
                      </div>
                      <p>You'll receive a video link before your appointment.</p>
                      <p>Thank you for choosing Aminy!</p>
                    </div>
                  `,
                  `Your telehealth visit is confirmed for ${visitDate}. Amount paid: ${amount}`
                );
              }
            }
          } catch (err) {
            console.error('Error creating telehealth appointment:', err);
          }
          break;
        }

        // CRITICAL: Update user's tier in the database based on subscription
        // If this fails, we let the error propagate → webhook returns non-200 → Stripe retries
        if (userId && session.subscription) {
          const subscription = await stripeRequest(`/subscriptions/${session.subscription}`);
          const priceId = subscription.items?.data?.[0]?.price?.id;

          const tier = getTierFromPriceId(priceId);
          if (tier) {
            await updateUserTier(userId, tier);
            console.log(`Updated user ${userId} to tier ${tier}`);

            // Also store subscription metadata for audit trail
            await storeStripeCustomerId(userId, customerId);

            // Audit: subscription created
            await logFinancialAuditEvent(userId, 'subscription_created', 'subscription', session.subscription as string, {
              tier,
              priceId,
              customerId,
              amountTotal: session.amount_total,
            });
          }
        }

        // Send welcome/confirmation email
        if (customerEmail) {
          const amount = session.amount_total
            ? `$${(session.amount_total / 100).toFixed(2)}`
            : 'your subscription';
          const date = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          const template = emailTemplates.paymentSucceeded(customerName, amount, date);
          await sendEmail(customerEmail, template.subject, template.html, template.text);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // ── Handle past_due status → start grace period ──
        if (subscription.status === 'past_due') {
          try {
            const { data: customerData } = await supabase
              .from('stripe_customers')
              .select('user_id')
              .eq('stripe_customer_id', customerId)
              .single();

            if (customerData?.user_id) {
              const userId = customerData.user_id as string;
              const GRACE_PERIOD_DAYS = 7;
              const now = new Date();
              const endsAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

              // Upsert grace period — don't reset if one already exists for this cycle
              await supabase
                .from('grace_periods')
                .upsert(
                  {
                    user_id: userId,
                    subscription_id: subscription.id,
                    status: 'active',
                    started_at: now.toISOString(),
                    ends_at: endsAt.toISOString(),
                    suspended_at: null,
                    updated_at: now.toISOString(),
                  },
                  { onConflict: 'user_id' }
                );

              console.log(`Grace period started for user ${userId} — ends ${endsAt.toISOString()}`);

              // Audit: grace period started
              await logFinancialAuditEvent(userId, 'payment_failed', 'subscription', subscription.id, {
                event: 'grace_period_started',
                gracePeriodDays: GRACE_PERIOD_DAYS,
                endsAt: endsAt.toISOString(),
                customerId,
              });

              // Notify the customer about the payment issue and grace period
              try {
                const customer = await stripeRequest(`/customers/${customerId}`);
                if (customer.email) {
                  const graceEndDate = endsAt.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  await sendEmail(
                    customer.email,
                    'Action Required: Update Your Payment Method - Aminy',
                    `
                      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #e07a5f;">Payment Issue — Your Access is Safe for Now</h1>
                        <p>Hi ${customer.name || 'there'},</p>
                        <p>We were unable to process your latest payment. Don't worry — your full access continues until <strong>${graceEndDate}</strong>.</p>
                        <p>Please update your payment method before then to avoid losing your features:</p>
                        <p style="text-align: center; margin: 24px 0;">
                          <a href="https://app.aminy.ai/settings/subscription" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Update Payment Method</a>
                        </p>
                        <p>If you have any questions, just reply to this email.</p>
                        <p>— The Aminy Team</p>
                      </div>
                    `,
                    `Hi ${customer.name || 'there'}, we couldn't process your payment. Your access continues until ${graceEndDate}. Update at https://app.aminy.ai/settings/subscription`
                  );
                }
              } catch (emailErr) {
                console.error('Failed to send grace period email:', emailErr);
              }
            }
          } catch (err) {
            console.error('Failed to handle past_due subscription:', err);
          }
        }

        // ── Handle subscription becoming active again → resolve grace period ──
        if (subscription.status === 'active') {
          try {
            const { data: customerData } = await supabase
              .from('stripe_customers')
              .select('user_id')
              .eq('stripe_customer_id', customerId)
              .single();

            if (customerData?.user_id) {
              const userId = customerData.user_id as string;

              // Resolve any active grace period
              const { data: activeGrace } = await supabase
                .from('grace_periods')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'active')
                .maybeSingle();

              if (activeGrace) {
                await supabase
                  .from('grace_periods')
                  .update({ status: 'resolved', updated_at: new Date().toISOString() })
                  .eq('user_id', userId)
                  .eq('status', 'active');
                console.log(`Grace period resolved for user ${userId}`);
              }

              // Update tier from subscription metadata/price
              const priceId = subscription.items?.data?.[0]?.price?.id;
              const tier = getTierFromPriceId(priceId);
              if (tier) {
                await updateUserTier(userId, tier);
              }
            }
          } catch (err) {
            console.error('Failed to resolve grace period on reactivation:', err);
          }
        }

        // Check if subscription is being canceled
        if (subscription.cancel_at_period_end) {
          // Get customer email
          try {
            const customer = await stripeRequest(`/customers/${customerId}`);
            if (customer.email) {
              const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              });
              const template = emailTemplates.subscriptionCanceled(customer.name || 'there', endDate);
              await sendEmail(customer.email, template.subject, template.html, template.text);
            }
          } catch (err) {
            console.error('Failed to send cancellation email:', err);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Downgrade user to free tier when subscription ends
        // If this fails, let it propagate → webhook returns non-200 → Stripe retries
        const { data: customerData } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (customerData?.user_id) {
          const deletedUserId = customerData.user_id as string;
          await updateUserTier(deletedUserId, 'free');
          console.log(`Downgraded user ${deletedUserId} to free tier`);

          // Audit: subscription deleted / downgrade
          await logFinancialAuditEvent(deletedUserId, 'subscription_cancelled', 'subscription', subscription.id, {
            previousTier: getTierFromPriceId(subscription.items?.data?.[0]?.price?.id) || 'unknown',
            customerId,
            reason: 'subscription_deleted',
          });
        } else {
          console.warn(`No user found for Stripe customer ${customerId} — cannot downgrade tier`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        const customerName = invoice.customer_name || 'there';
        const invoiceCustomerId = invoice.customer;

        // ── Resolve grace period if payment succeeds ──
        if (invoiceCustomerId) {
          try {
            const { data: customerData } = await supabase
              .from('stripe_customers')
              .select('user_id')
              .eq('stripe_customer_id', invoiceCustomerId)
              .single();

            if (customerData?.user_id) {
              const userId = customerData.user_id as string;
              const { data: activeGrace } = await supabase
                .from('grace_periods')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'active')
                .maybeSingle();

              if (activeGrace) {
                await supabase
                  .from('grace_periods')
                  .update({ status: 'resolved', updated_at: new Date().toISOString() })
                  .eq('user_id', userId)
                  .eq('status', 'active');
                console.log(`Grace period resolved after successful payment for user ${userId}`);
              }
            }
          } catch (err) {
            console.error('Failed to resolve grace period on payment success:', err);
          }
        }

        // Audit: payment succeeded
        if (invoiceCustomerId) {
          try {
            const { data: payingCustomer } = await supabase
              .from('stripe_customers')
              .select('user_id')
              .eq('stripe_customer_id', invoiceCustomerId)
              .single();

            if (payingCustomer?.user_id) {
              await logFinancialAuditEvent(payingCustomer.user_id as string, 'payment_succeeded', 'payment', invoice.id as string, {
                amount: invoice.amount_paid,
                currency: invoice.currency || 'usd',
                billingReason: invoice.billing_reason,
                customerId: invoiceCustomerId,
              });
            }
          } catch {
            // Best-effort audit
          }
        }

        // Send payment confirmation for recurring payments
        if (customerEmail && invoice.billing_reason === 'subscription_cycle') {
          const amount = `$${(invoice.amount_paid / 100).toFixed(2)}`;
          const date = new Date(invoice.created * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          const template = emailTemplates.paymentSucceeded(customerName, amount, date);
          await sendEmail(customerEmail, template.subject, template.html, template.text);
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        const customerName = invoice.customer_name || 'there';
        const failedCustomerId = invoice.customer;

        // ── Check if grace period has expired → downgrade to free ──
        if (failedCustomerId) {
          try {
            const { data: customerData } = await supabase
              .from('stripe_customers')
              .select('user_id')
              .eq('stripe_customer_id', failedCustomerId)
              .single();

            if (customerData?.user_id) {
              const userId = customerData.user_id as string;
              const { data: activeGrace } = await supabase
                .from('grace_periods')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .maybeSingle();

              if (activeGrace) {
                const endsAt = new Date(activeGrace.ends_at as string);
                const now = new Date();

                if (now >= endsAt) {
                  // Grace period expired — suspend features
                  await supabase
                    .from('grace_periods')
                    .update({
                      status: 'expired',
                      suspended_at: now.toISOString(),
                      updated_at: now.toISOString(),
                    })
                    .eq('user_id', userId)
                    .eq('status', 'active');

                  await updateUserTier(userId, 'free');
                  console.log(`Grace period expired — user ${userId} downgraded to free`);

                  // Audit: grace period expired → downgrade
                  await logFinancialAuditEvent(userId, 'tier_downgraded', 'subscription', invoice.subscription as string || 'unknown', {
                    event: 'grace_period_expired',
                    previousTier: 'unknown', // would need a lookup to get actual tier
                    newTier: 'free',
                    customerId: failedCustomerId,
                  });
                } else {
                  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  console.log(`Payment failed again for user ${userId} — ${daysLeft} day(s) left in grace period`);
                }
              }
            }
          } catch (err) {
            console.error('Failed to check grace period on payment failure:', err);
          }
        }

        // Send payment failed notification
        if (customerEmail) {
          const amount = `$${(invoice.amount_due / 100).toFixed(2)}`;
          const template = emailTemplates.paymentFailed(customerName, amount);
          await sendEmail(customerEmail, template.subject, template.html, template.text);
        }

        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Stripe sends this 3 days before trial ends
        const subscription = event.data.object;
        const customerId = subscription.customer;

        try {
          const customer = await stripeRequest(`/customers/${customerId}`);
          if (customer.email) {
            const trialEnd = new Date(subscription.trial_end * 1000);
            const now = new Date();
            const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const template = emailTemplates.trialEnding(customer.name || 'there', daysLeft);
            await sendEmail(customer.email, template.subject, template.html, template.text);
          }
        } catch (err) {
          console.error('Failed to send trial ending email:', err);
        }

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 500 for processing errors so Stripe retries the webhook
    // (400 tells Stripe "bad request, don't retry" which is wrong for transient DB errors)
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Helper to get Stripe customer ID from Supabase
async function getStripeCustomerId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't have a Stripe customer yet
        return null;
      }
      console.error('Error fetching Stripe customer ID:', error);
      return null;
    }

    return data?.stripe_customer_id || null;
  } catch (error) {
    console.error('Error in getStripeCustomerId:', error);
    return null;
  }
}

// Helper to store Stripe customer ID in Supabase
async function storeStripeCustomerId(userId: string, customerId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('stripe_customers')
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error storing Stripe customer ID:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error in storeStripeCustomerId:', error);
    throw error;
  }
}

// Helper to update user tier after successful subscription — with retry
async function updateUserTier(userId: string, tier: string, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tier, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        if (attempt < retries) {
          console.warn(`updateUserTier attempt ${attempt + 1} failed, retrying:`, error.message);
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw error;
      }

      return; // success
    } catch (error) {
      if (attempt >= retries) {
        console.error(`updateUserTier FAILED after ${retries + 1} attempts for user ${userId}:`, error);
        throw error; // propagate so webhook returns non-200 → Stripe retries
      }
    }
  }
}

/**
 * Get proration preview for a plan change
 *
 * Uses Stripe's upcoming invoice API to show the user what they'll
 * be charged (or credited) when switching plans.
 */
export async function getProrationPreview(req: Request): Promise<Response> {
  try {
    const { subscriptionId, newPriceId } = await req.json();

    if (!subscriptionId || !newPriceId) {
      return new Response(JSON.stringify({ error: 'Missing subscriptionId or newPriceId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the current subscription to find the item ID
    const subscription = await stripeRequest(`/subscriptions/${subscriptionId}`);
    const currentItemId = subscription.items?.data?.[0]?.id;

    if (!currentItemId) {
      return new Response(JSON.stringify({ error: 'No subscription item found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use Stripe's upcoming invoice endpoint to preview proration
    const preview = await stripeRequest(
      `/invoices/upcoming?subscription=${subscriptionId}` +
      `&subscription_items[0][id]=${currentItemId}` +
      `&subscription_items[0][price]=${newPriceId}` +
      `&subscription_proration_behavior=create_prorations`
    );

    // Calculate credit and debit from proration line items
    let credit = 0;
    let debit = 0;

    for (const line of (preview.lines?.data || [])) {
      if (line.proration) {
        if (line.amount < 0) {
          credit += Math.abs(line.amount);
        } else {
          debit += line.amount;
        }
      }
    }

    const netAmount = debit - credit;

    return new Response(JSON.stringify({
      credit,
      debit,
      netAmount,
      formattedNetAmount: `$${(Math.abs(netAmount) / 100).toFixed(2)}`,
      newPriceId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proration preview error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Change subscription tier (upgrade or downgrade)
 *
 * - Upgrades: immediate with proration
 * - Downgrades: scheduled at period end (no proration)
 */
export async function changeTierHandler(req: Request): Promise<Response> {
  try {
    const { userId, newPriceId, newTier, direction, prorationBehavior } = await req.json();

    if (!userId || !newPriceId || !newTier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current active subscription
    const subscriptions = await stripeRequest(`/subscriptions?customer=${customerId}&status=active`);
    if (!subscriptions.data?.length) {
      return new Response(JSON.stringify({ error: 'No active subscription' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentSub = subscriptions.data[0];
    const currentItemId = currentSub.items?.data?.[0]?.id;

    if (!currentItemId) {
      return new Response(JSON.stringify({ error: 'No subscription item found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isDowngrade = direction === 'downgrade';

    // Build update params
    const updateParams: Record<string, string> = {
      'items[0][id]': currentItemId,
      'items[0][price]': newPriceId,
      'metadata[tier]': newTier,
      'proration_behavior': isDowngrade ? 'none' : (prorationBehavior || 'create_prorations'),
    };

    // For downgrades, schedule the change at period end
    // by using Stripe's subscription schedule or cancel_at_period_end pattern.
    // The simplest approach: update immediately but with no proration,
    // OR use a subscription schedule. We use the "update at period end" approach:
    if (isDowngrade) {
      // Create a subscription schedule to defer the downgrade
      // First check if a schedule already exists
      if (currentSub.schedule) {
        // Update existing schedule
        await stripeRequest(`/subscription_schedules/${currentSub.schedule}`, 'POST', {
          'phases[0][items][0][price]': currentSub.items.data[0].price.id,
          'phases[0][end_date]': String(currentSub.current_period_end),
          'phases[1][items][0][price]': newPriceId,
          'phases[1][iterations]': '1',
        });
      } else {
        // Create new schedule from the existing subscription
        const schedule = await stripeRequest('/subscription_schedules', 'POST', {
          'from_subscription': currentSub.id,
        });

        // Release the default phase and set up two phases:
        // 1. Current plan until period end
        // 2. New plan starting at period end
        await stripeRequest(`/subscription_schedules/${schedule.id}`, 'POST', {
          'phases[0][items][0][price]': currentSub.items.data[0].price.id,
          'phases[0][start_date]': String(currentSub.current_period_start),
          'phases[0][end_date]': String(currentSub.current_period_end),
          'phases[1][items][0][price]': newPriceId,
          'phases[1][iterations]': '1',
        });
      }

      // Update the user's tier in our database only when the period ends.
      // For now, store the pending change so the UI can show "downgrading to X on DATE".
      await supabase
        .from('pending_tier_changes')
        .upsert(
          {
            user_id: userId,
            new_tier: newTier,
            new_price_id: newPriceId,
            effective_at: new Date(currentSub.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      return new Response(JSON.stringify({
        success: true,
        direction: 'downgrade',
        effectiveDate: new Date(currentSub.current_period_end * 1000).toISOString(),
        message: `Your plan will change to ${newTier} at the end of your current billing period.`,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Upgrade: apply immediately ──
    const updatedSub = await stripeRequest(`/subscriptions/${currentSub.id}`, 'POST', updateParams);

    // Immediately update the user's tier
    await updateUserTier(userId, newTier);
    console.log(`Upgraded user ${userId} to ${newTier} immediately`);

    // Clear any pending downgrade
    await supabase
      .from('pending_tier_changes')
      .delete()
      .eq('user_id', userId);

    return new Response(JSON.stringify({
      success: true,
      direction: 'upgrade',
      effectiveDate: new Date().toISOString(),
      prorationPreview: {
        newPriceId,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Change tier error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get grace period status for a user (called by frontend hook)
 */
export async function getGracePeriodStatus(userId: string): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('grace_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch grace period:', error);
    }

    if (!data) {
      return new Response(JSON.stringify({
        inGracePeriod: false,
        daysRemaining: 0,
        suspendedAt: null,
        gracePeriodStartedAt: null,
        gracePeriodEndsAt: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const endsAt = new Date(data.ends_at as string);
    const msRemaining = endsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return new Response(JSON.stringify({
      inGracePeriod: daysRemaining > 0 && !data.suspended_at,
      daysRemaining,
      suspendedAt: data.suspended_at || null,
      gracePeriodStartedAt: data.started_at || null,
      gracePeriodEndsAt: data.ends_at || null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Grace period status error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  createOneTimePayment,
  handleWebhook,
  getProrationPreview,
  changeTierHandler,
  getGracePeriodStatus,
};
