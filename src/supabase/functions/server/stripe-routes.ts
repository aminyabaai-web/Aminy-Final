/**
 * Stripe Payment Routes
 *
 * Backend handlers for Stripe payments
 * Requires STRIPE_SECRET_KEY in Supabase secrets
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Note: In production, use Stripe SDK: import Stripe from 'stripe';
// const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FROM_EMAIL = 'Aminy <hello@aminy.app>';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
          .logo { font-size: 28px; font-weight: 600; color: #577590; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 12px; }
          .amount { font-size: 24px; font-weight: 600; color: #577590; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #577590; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
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
            <a href="https://app.aminy.app" class="button">Open Aminy</a>
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
          .logo { font-size: 28px; font-weight: 600; color: #577590; }
          .content { background: #fff5f5; padding: 30px; border-radius: 12px; border: 1px solid #fed7d7; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #577590; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
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
            <a href="https://app.aminy.app/settings/subscription" class="button">Update Payment Method</a>
            <p style="margin-top: 20px;">If you need help, just reply to this email.</p>
          </div>
          <div class="footer">
            <p>We're here for you,<br>The Aminy Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, We had trouble processing your payment of ${amount}. Please update your payment method at https://app.aminy.app/settings/subscription - The Aminy Team`,
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
          .logo { font-size: 28px; font-weight: 600; color: #577590; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 12px; }
          .highlight { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #577590; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
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
            <a href="https://app.aminy.app/settings/subscription" class="button">Resume Subscription</a>
            <p style="margin-top: 20px;">We'd love to hear what we could do better. Just reply to this email with any feedback.</p>
          </div>
          <div class="footer">
            <p>Wishing you and your family all the best,<br>The Aminy Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, We received your cancellation request. Your access continues until ${endDate}. Changed your mind? Resume at https://app.aminy.app/settings/subscription - The Aminy Team`,
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
          .logo { font-size: 28px; font-weight: 600; color: #577590; }
          .content { background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%); padding: 30px; border-radius: 12px; }
          .countdown { font-size: 48px; font-weight: 700; color: #577590; text-align: center; margin: 20px 0; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
          .check { color: #22c55e; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #577590; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
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
              <a href="https://app.aminy.app/settings/subscription" class="button">Keep My Access</a>
            </p>
          </div>
          <div class="footer">
            <p>Questions? Just reply to this email.<br>The Aminy Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name}, Your Aminy trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Keep your access at https://app.aminy.app/settings/subscription - The Aminy Team`,
  }),
};

// Helper to make Stripe API calls
async function stripeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, any>
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
    options.body = new URLSearchParams(body as Record<string, string>).toString();
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }

  return data;
}

// Price ID mapping (set these in Stripe Dashboard)
const PRICE_IDS: Record<string, string> = {
  starter_monthly: Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY') || 'price_starter_monthly',
  starter_annual: Deno.env.get('STRIPE_PRICE_STARTER_ANNUAL') || 'price_starter_annual',
  core_monthly: Deno.env.get('STRIPE_PRICE_CORE_MONTHLY') || 'price_core_monthly',
  core_annual: Deno.env.get('STRIPE_PRICE_CORE_ANNUAL') || 'price_core_annual',
  pro_monthly: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') || 'price_pro_monthly',
  pro_annual: Deno.env.get('STRIPE_PRICE_PRO_ANNUAL') || 'price_pro_annual',
};

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
      'subscription_data[trial_period_days]': tier === 'core' ? '7' : '0', // 7-day trial for Core
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
    return new Response(JSON.stringify({ error: error.message }), {
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
    return new Response(JSON.stringify({ error: error.message }), {
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
    return new Response(JSON.stringify({ error: error.message }), {
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
    return new Response(JSON.stringify({ error: error.message }), {
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
    const cancelledSub = subscriptions.data?.find((s: any) => s.cancel_at_period_end);

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
    return new Response(JSON.stringify({ error: error.message }), {
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
    return new Response(JSON.stringify({ error: error.message }), {
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

    if (STRIPE_WEBHOOK_SECRET) {
      const isValid = await verifyWebhookSignature(body, signature, STRIPE_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
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
        await storeStripeCustomerId(userId, customerId);

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
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        const customerName = invoice.customer_name || 'there';

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
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

// Helper to update user tier after successful subscription
async function updateUserTier(userId: string, tier: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ tier })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user tier:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error in updateUserTier:', error);
    throw error;
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
};
