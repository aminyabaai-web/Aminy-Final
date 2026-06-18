/**
 * Daily.co webhook handler — standalone Supabase edge function
 *
 * Handles two events from Daily.co:
 *   participant-joined  → stamps provider_joined_at when a provider token arrives
 *   meeting-ended       → marks appointment as provider_no_show (10-min grace window)
 *
 * Setup (owner action required):
 *   1. Go to: daily.co dashboard → Developers → Webhooks → Add webhook
 *   2. URL: https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/daily-webhook
 *   3. Events: participant-joined, meeting-ended
 *   4. Copy the shared secret → add to Supabase secrets as DAILY_WEBHOOK_SECRET
 *
 * Provider no-show detection:
 *   Provider meeting tokens are minted with user_id = "provider:<provider_id>"
 *   (see video-routes.ts getMeetingToken). When participant-joined fires with that
 *   prefix, provider_joined_at is stamped. On meeting-ended, if provider never
 *   joined and 10 minutes have elapsed since scheduled_at, the appointment is
 *   marked provider_no_show and a row is inserted into provider_no_show_events.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DAILY_WEBHOOK_SECRET = Deno.env.get('DAILY_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GRACE_MS = 10 * 60 * 1000; // 10-minute grace window before flagging no-show

async function verifyDailySignature(body: string, signature: string): Promise<boolean> {
  // When no secret is configured (dev/test), skip verification
  if (!DAILY_WEBHOOK_SECRET) return true;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(DAILY_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return signature === expected;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('x-daily-signature') ?? '';

  try {
    if (!(await verifyDailySignature(body, signature))) {
      console.warn('[Daily webhook] Invalid signature — rejected');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[Daily webhook] Signature verification error:', err);
    return new Response(JSON.stringify({ error: 'Signature error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const action = event.action as string;
  const roomName = event.room as string;

  // Room name convention: "aminy-<appointmentId>" — extract ID without a DB round-trip
  const appointmentId = roomName?.startsWith('aminy-') ? roomName.slice(6) : null;
  if (!appointmentId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Room doesn't belong to Aminy (e.g. a test room) — ignore silently
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ──────────────────────────────────────────────────────────────────────────
  // participant-joined → stamp provider_joined_at
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'participant-joined') {
    const props = event.properties as Record<string, unknown> | undefined;
    const userId = props?.user_id as string | undefined;
    const joinTime = new Date((event.timeStamp as number) * 1000).toISOString();

    if (userId?.startsWith('provider:')) {
      const { error } = await supabase
        .from('telehealth_appointments')
        .update({ provider_joined_at: joinTime, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .is('provider_joined_at', null); // idempotent — only stamp first join

      if (error) {
        console.error('[Daily webhook] Failed to stamp provider_joined_at:', error);
      } else {
        console.log(`[Daily webhook] Provider joined appt ${appointmentId} at ${joinTime}`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // meeting-ended → detect provider no-show
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'meeting-ended') {
    const { data: appointment, error: fetchErr } = await supabase
      .from('telehealth_appointments')
      .select('id, status, provider_joined_at, scheduled_at')
      .eq('id', appointmentId)
      .in('status', ['confirmed', 'ready_to_join'])
      .maybeSingle();

    if (fetchErr) {
      console.error('[Daily webhook] Appointment lookup error:', fetchErr);
    } else if (appointment && !appointment.provider_joined_at) {
      const elapsed = Date.now() - Date.parse(appointment.scheduled_at as string);
      if (elapsed >= GRACE_MS) {
        const { error: updateErr } = await supabase
          .from('telehealth_appointments')
          .update({ status: 'provider_no_show', updated_at: new Date().toISOString() })
          .eq('id', appointmentId);

        if (updateErr) {
          console.error('[Daily webhook] Failed to mark provider_no_show:', updateErr);
        } else {
          console.log(`[Daily webhook] Appointment ${appointmentId} marked provider_no_show`);
          await supabase.from('provider_no_show_events').insert({
            appointment_id: appointmentId,
            scheduled_start: appointment.scheduled_at,
            declared_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
