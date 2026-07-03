// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Appointment Reminder Cron
 *
 * Scans the appointments table for visits coming up in 24h and 1h windows,
 * sends SMS reminders via Twilio, and marks the appropriate flag so reminders
 * never double-fire.
 *
 * Schedule: every 15 minutes via Supabase pg_cron OR external scheduler.
 *   SELECT cron.schedule('appointment-reminders', 'every-15-min (star-slash-15 star star star star)',
 *     'SELECT net.http_post(url:=''https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/appointment-reminders'',
 *       headers:=''{"Authorization":"Bearer <service-role-key>"}''::jsonb)');
 *
 * Required Supabase secrets:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_FROM_NUMBER
 *   - CRON_SHARED_SECRET (optional — gate against unauthorized invocation)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM_NUMBER');
const CRON_SECRET = Deno.env.get('CRON_SHARED_SECRET');

interface AppointmentRow {
  id: string;
  user_id: string;
  provider_id: string | null;
  title: string;
  provider_name: string | null;
  service_type: string | null;
  start_at: string;
  location: string | null;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
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
    }
  );

  if (!resp.ok) {
    return { ok: false, error: (await resp.text()).slice(0, 200) };
  }
  return { ok: true };
}

function buildMessage(apt: AppointmentRow, kind: '24h' | '1h', userTimezone: string): string {
  const friendly = new Date(apt.start_at).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: userTimezone,
  });
  const provider = apt.provider_name ? ` with ${apt.provider_name}` : '';
  const where = apt.location ? ` (${apt.location})` : '';

  if (kind === '24h') {
    return `Aminy: Tomorrow you have ${apt.title}${provider} at ${friendly}${where}. Reply STOP to opt out.`;
  }
  return `Aminy: Starting in ~1 hour — ${apt.title}${provider} at ${friendly}${where}.`;
}

function buildProviderMessage(apt: AppointmentRow, patientName: string, userTimezone: string): string {
  const friendly = new Date(apt.start_at).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: userTimezone,
  });
  return `Aminy: Reminder — you have a session with ${patientName} at ${friendly}. — Aminy Team`;
}

// NOTE: Cancellation SMS — this function is cron-triggered and scans for upcoming appointments;
// it does not receive appointment status-change events. To send an SMS when an appointment is
// cancelled, wire up a Supabase Database Webhook on the `appointments` table filtered to
// status = 'cancelled' (INSERT/UPDATE) pointing at a dedicated edge function (e.g.
// `appointment-cancelled`). The cancellation path today lives in
// supabase/functions/telehealth/index.ts → POST /appointments/:id/cancel and returns immediately
// after updating status — there is no SMS sent there either. Until that webhook exists, no
// cancellation SMS will be sent.

Deno.serve(async (req: Request): Promise<Response> => {
  // Optional shared-secret gate: if CRON_SHARED_SECRET is set, require it in the header
  if (CRON_SECRET) {
    const provided = req.headers.get('x-cron-secret');
    if (provided !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  // 24h window: appointments between now+23h and now+25h, not yet 24h-reminded
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  // 1h window: between now+45min and now+75min, not yet 1h-reminded
  const in45m = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
  const in75m = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

  const results = { sent_24h: 0, sent_1h: 0, skipped: 0, errors: [] as string[] };

  // Fetch + send 24h reminders — ONLY Aminy-managed telehealth appointments
  // (provider visits booked through Aminy marketplace + delivered via telehealth).
  // External appointments captured in chat get calendar entries but no SMS.
  const { data: due24h } = await supabase
    .from('appointments')
    .select('id, user_id, provider_id, title, provider_name, service_type, start_at, location, reminder_24h_sent, reminder_1h_sent')
    .gte('start_at', in23h)
    .lte('start_at', in25h)
    .eq('status', 'scheduled')
    .eq('reminder_24h_sent', false)
    .eq('is_aminy_telehealth', true)
    .limit(200);

  for (const apt of (due24h || []) as AppointmentRow[]) {
    // Fetch user's SMS phone, opt-in flag, timezone, and name
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, sms_reminders_enabled, timezone, full_name')
      .eq('id', apt.user_id)
      .maybeSingle();

    if (!profile?.phone_number || !profile.sms_reminders_enabled) {
      // No phone or opted out — mark sent so we don't keep re-scanning
      await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
      results.skipped++;
      continue;
    }

    const userTimezone = profile.timezone || 'America/Phoenix';
    const res = await sendSms(profile.phone_number, buildMessage(apt, '24h', userTimezone));
    if (res.ok) {
      await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
      results.sent_24h++;
    } else {
      results.errors.push(`24h apt ${apt.id}: ${res.error}`);
    }

    // Provider reminder — best-effort, must not break patient SMS
    if (apt.provider_id) {
      try {
        const { data: providerProfile } = await supabase
          .from('profiles')
          .select('phone_number, timezone')
          .eq('id', apt.provider_id)
          .maybeSingle();
        if (providerProfile?.phone_number) {
          const providerTz = providerProfile.timezone || 'America/Phoenix';
          const patientName = profile.full_name || 'a patient';
          await sendSms(
            providerProfile.phone_number,
            buildProviderMessage(apt, patientName, providerTz),
          );
        }
      } catch (err) {
        results.errors.push(`24h provider reminder apt ${apt.id}: ${(err as Error).message}`);
      }
    }
  }

  // Fetch + send 1h reminders — same telehealth-only scope as 24h
  const { data: due1h } = await supabase
    .from('appointments')
    .select('id, user_id, provider_id, title, provider_name, service_type, start_at, location, reminder_24h_sent, reminder_1h_sent')
    .gte('start_at', in45m)
    .lte('start_at', in75m)
    .eq('status', 'scheduled')
    .eq('reminder_1h_sent', false)
    .eq('is_aminy_telehealth', true)
    .limit(200);

  for (const apt of (due1h || []) as AppointmentRow[]) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, sms_reminders_enabled, timezone, full_name')
      .eq('id', apt.user_id)
      .maybeSingle();

    if (!profile?.phone_number || !profile.sms_reminders_enabled) {
      await supabase.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
      results.skipped++;
      continue;
    }

    const userTimezone = profile.timezone || 'America/Phoenix';
    const res = await sendSms(profile.phone_number, buildMessage(apt, '1h', userTimezone));
    if (res.ok) {
      await supabase.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
      results.sent_1h++;
    } else {
      results.errors.push(`1h apt ${apt.id}: ${res.error}`);
    }

    // Provider reminder — best-effort, must not break patient SMS
    if (apt.provider_id) {
      try {
        const { data: providerProfile } = await supabase
          .from('profiles')
          .select('phone_number, timezone')
          .eq('id', apt.provider_id)
          .maybeSingle();
        if (providerProfile?.phone_number) {
          const providerTz = providerProfile.timezone || 'America/Phoenix';
          const patientName = profile.full_name || 'a patient';
          await sendSms(
            providerProfile.phone_number,
            buildProviderMessage(apt, patientName, providerTz),
          );
        }
      } catch (err) {
        results.errors.push(`1h provider reminder apt ${apt.id}: ${(err as Error).message}`);
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
});
