// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Appointment Cancellation Webhook
 *
 * Receives a Supabase Database Webhook on the `appointments` table (UPDATE events)
 * and sends SMS notifications via Twilio when an appointment transitions to
 * `status = 'cancelled'`.
 *
 * Wire up in Supabase Dashboard → Database → Webhooks:
 *   Table: appointments  |  Events: UPDATE
 *   URL: https://<project-ref>.supabase.co/functions/v1/appointment-cancelled
 *   HTTP Headers: x-supabase-webhook-secret: <WEBHOOK_SECRET>
 *
 * Required Supabase secrets:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_FROM_NUMBER
 *   - WEBHOOK_SECRET (optional — gate against unauthorized invocation)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM_NUMBER');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-supabase-webhook-secret',
};

interface AppointmentRecord {
  id: string;
  user_id: string;
  provider_id: string | null;
  title: string;
  service_type: string | null;
  patient_name: string | null;
  start_at: string;
  status: string;
}

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: AppointmentRecord;
  old_record: AppointmentRecord;
}

interface ProfileRow {
  phone: string | null;
  timezone: string | null;
  full_name?: string | null;
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return { ok: false, error: 'Twilio not configured' };
  }
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const params = new URLSearchParams();
  params.set('To', to);
  params.set('From', TWILIO_FROM);
  params.set('Body', body.slice(0, 1500));

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  if (!resp.ok) {
    return { ok: false, error: (await resp.text()).slice(0, 200) };
  }
  return { ok: true };
}

function formatDate(startAt: string, timezone: string): string {
  return new Date(startAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  // Verify webhook secret if configured
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get('x-supabase-webhook-secret');
    if (provided !== WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: 'unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }

  const { record, old_record } = payload;

  // Only fire on the cancelled transition — not on every update that happens to be cancelled
  if (record?.status !== 'cancelled' || old_record?.status === 'cancelled') {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'not a cancellation transition' }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const errors: string[] = [];
  let userSmsSent = false;
  let providerSmsSent = false;

  // Look up user's phone and timezone from profiles
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('phone, timezone, full_name')
    .eq('id', record.user_id)
    .maybeSingle() as { data: (ProfileRow & { full_name?: string | null }) | null };

  const userTimezone = userProfile?.timezone || 'America/Phoenix';
  const formattedDate = formatDate(record.start_at, userTimezone);
  const serviceLabel = record.service_type || record.title;

  // Send cancellation SMS to the user if they have a phone number
  if (userProfile?.phone) {
    const userMessage =
      `Aminy: Your ${serviceLabel} on ${formattedDate} has been cancelled. ` +
      `To rebook: aminy.ai — Reply STOP to opt out.`;

    const res = await sendSms(userProfile.phone, userMessage);
    if (res.ok) {
      userSmsSent = true;
    } else {
      errors.push(`user SMS apt ${record.id}: ${res.error}`);
    }
  }

  // Send cancellation SMS to the provider if provider_id is present
  if (record.provider_id) {
    try {
      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('phone, timezone')
        .eq('id', record.provider_id)
        .maybeSingle() as { data: ProfileRow | null };

      if (providerProfile?.phone) {
        const providerTimezone = providerProfile.timezone || 'America/Phoenix';
        const providerFormattedDate = formatDate(record.start_at, providerTimezone);
        const patientLabel = record.patient_name || record.title;
        const providerMessage =
          `Aminy: Your session with ${patientLabel} on ${providerFormattedDate} has been cancelled.`;

        const res = await sendSms(providerProfile.phone, providerMessage);
        if (res.ok) {
          providerSmsSent = true;
        } else {
          errors.push(`provider SMS apt ${record.id}: ${res.error}`);
        }
      }
    } catch (err) {
      errors.push(`provider lookup apt ${record.id}: ${(err as Error).message}`);
    }
  }

  const ok = errors.length === 0;
  return new Response(
    JSON.stringify({ ok, userSmsSent, providerSmsSent, errors: ok ? undefined : errors }),
    { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
  );
});
