/**
 * Stripe Connect Onboard — Supabase Edge Function
 * Handles provider Connect Express account creation, status checks,
 * balance queries, and session payouts (transfers).
 *
 * POST /stripe-connect-onboard
 *   body: { providerId, email }                      → create/resume onboarding link
 *   body: { action: "payout", ...SessionPayoutBody } → transfer to connected account
 *
 * GET  /stripe-connect-onboard?providerId=X&action=status  → account status
 * GET  /stripe-connect-onboard?providerId=X&action=balance → connected balance
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

// ============================================================================
// Setup
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
);

const PLATFORM_FEE_RATE = 0.10;

// ============================================================================
// Helpers
// ============================================================================

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/** Get or create a Stripe Connect Express account for this provider */
async function getOrCreateConnectAccount(providerId: string, email: string): Promise<string> {
  // Check if provider already has a connect account ID
  const { data: provider, error } = await supabaseAdmin
    .from('providers')
    .select('stripe_connect_account_id')
    .eq('id', providerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`DB lookup failed: ${error.message}`);
  }

  const existingId = provider?.stripe_connect_account_id as string | null;
  if (existingId) {
    return existingId;
  }

  // Create a new Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: { aminy_provider_id: providerId },
  });

  // Persist to providers table
  await supabaseAdmin
    .from('providers')
    .upsert({ id: providerId, stripe_connect_account_id: account.id }, { onConflict: 'id' });

  return account.id;
}

// ============================================================================
// Handlers
// ============================================================================

async function handleOnboard(providerId: string, email: string, origin: string): Promise<Response> {
  if (!providerId || !email) {
    return errorResponse('providerId and email are required');
  }

  const stripeConnectAccountId = await getOrCreateConnectAccount(providerId, email);

  const accountLink = await stripe.accountLinks.create({
    account: stripeConnectAccountId,
    refresh_url: `${origin}/?screen=provider-payout-setup&connect=refresh`,
    return_url: `${origin}/?screen=provider-payout-setup&connect=success`,
    type: 'account_onboarding',
  });

  return jsonResponse({ url: accountLink.url, stripeConnectAccountId });
}

async function handleStatus(providerId: string): Promise<Response> {
  if (!providerId) {
    return errorResponse('providerId is required');
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('stripe_connect_account_id')
    .eq('id', providerId)
    .single();

  const accountId = provider?.stripe_connect_account_id as string | null;

  if (!accountId) {
    return jsonResponse({
      stripeConnectAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }

  const account = await stripe.accounts.retrieve(accountId);

  return jsonResponse({
    stripeConnectAccountId: accountId,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });
}

async function handleBalance(providerId: string): Promise<Response> {
  if (!providerId) {
    return errorResponse('providerId is required');
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('stripe_connect_account_id')
    .eq('id', providerId)
    .single();

  const accountId = provider?.stripe_connect_account_id as string | null;

  if (!accountId) {
    return jsonResponse({ availableCents: 0, pendingCents: 0, currency: 'usd' });
  }

  const balance = await stripe.balance.retrieve({ stripeAccount: accountId });

  const currency = 'usd';
  const available = balance.available.find((b) => b.currency === currency);
  const pending = balance.pending.find((b) => b.currency === currency);

  return jsonResponse({
    availableCents: available?.amount ?? 0,
    pendingCents: pending?.amount ?? 0,
    currency,
  });
}

interface SessionPayoutBody {
  action: 'payout';
  sessionId: string;
  providerId: string;
  stripeConnectAccountId: string;
  providerAmountCents: number;
  platformFeeCents: number;
  sessionAmountCents: number;
  sessionDescription: string;
}

async function handlePayout(body: SessionPayoutBody): Promise<Response> {
  const {
    sessionId,
    providerId,
    stripeConnectAccountId,
    providerAmountCents,
    platformFeeCents,
    sessionAmountCents,
    sessionDescription,
  } = body;

  if (!sessionId || !providerId || !stripeConnectAccountId || !providerAmountCents) {
    return errorResponse('Missing required payout fields');
  }

  // Idempotency: check if a transfer already exists for this session
  const { data: existingPayout } = await supabaseAdmin
    .from('provider_payouts')
    .select('id, transfer_id, status')
    .eq('session_id', sessionId)
    .eq('provider_id', providerId)
    .maybeSingle();

  if (existingPayout) {
    return jsonResponse(existingPayout);
  }

  // Create the Stripe transfer
  const transfer = await stripe.transfers.create({
    amount: providerAmountCents,
    currency: 'usd',
    destination: stripeConnectAccountId,
    description: sessionDescription,
    metadata: {
      aminy_session_id: sessionId,
      aminy_provider_id: providerId,
      platform_fee_cents: String(platformFeeCents),
    },
  });

  const now = new Date().toISOString();

  // Record in Supabase
  const { data: payoutRow, error: insertError } = await supabaseAdmin
    .from('provider_payouts')
    .insert({
      session_id: sessionId,
      provider_id: providerId,
      transfer_id: transfer.id,
      total_amount_cents: sessionAmountCents,
      platform_fee_cents: platformFeeCents,
      provider_amount_cents: providerAmountCents,
      status: 'paid',
      created_at: now,
      paid_at: now,
      session_description: sessionDescription,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[stripe-connect-onboard] DB insert error:', insertError.message);
    // Transfer succeeded — don't block on DB write failure
  }

  return jsonResponse(payoutRow ?? {
    id: transfer.id,
    sessionId,
    providerId,
    transferId: transfer.id,
    totalAmountCents: sessionAmountCents,
    platformFeeCents,
    providerAmountCents,
    status: 'paid',
    createdAt: now,
    paidAt: now,
    sessionDescription,
  });
}

// ============================================================================
// Main
// ============================================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') ?? url.origin;

    if (req.method === 'GET') {
      const providerId = url.searchParams.get('providerId') ?? '';
      const action = url.searchParams.get('action') ?? 'status';

      if (action === 'balance') {
        return await handleBalance(providerId);
      }
      return await handleStatus(providerId);
    }

    if (req.method === 'POST') {
      const body = await req.json() as any;
      const action = body.action as string | undefined;

      if (action === 'payout') {
        return await handlePayout(body as SessionPayoutBody);
      }

      // Default: create onboarding link
      return await handleOnboard(body.providerId, body.email, origin);
    }

    return errorResponse('Method not allowed', 405);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe-connect-onboard] error:', message);
    return errorResponse(`Internal error: ${message}`, 500);
  }
});
