/**
 * CentralReach Webhook Receiver Edge Function
 *
 * Receives incoming webhook events from CentralReach and stores them
 * in the cr_webhook_events table for client-side processing.
 *
 * Security:
 *   - HMAC-SHA256 signature validation (constant-time comparison)
 *   - Event ID deduplication (prevents replay attacks)
 *   - All secrets stored in Supabase environment variables
 *   - Audit logging for all received events
 *
 * CentralReach webhook configuration:
 *   URL: https://<project>.supabase.co/functions/v1/centralreach-webhooks
 *   Method: POST
 *   Header: X-CR-Signature (HMAC-SHA256 hex digest)
 *   Content-Type: application/json
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Environment variables ───────────────────────────────────────────────────

const CR_WEBHOOK_SECRET = Deno.env.get('CENTRALREACH_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cr-signature',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Verify HMAC-SHA256 signature with constant-time comparison.
 */
async function verifySignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  if (!CR_WEBHOOK_SECRET || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(CR_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expectedHex.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Main Handler ────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return jsonResponse({
      status: 'healthy',
      service: 'centralreach-webhooks',
      timestamp: new Date().toISOString(),
      configured: !!CR_WEBHOOK_SECRET,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-cr-signature') || '';

    // Validate HMAC signature
    const isValid = await verifySignature(rawBody, signature);
    if (!isValid) {
      console.error('[CRWebhook] Invalid signature — rejecting event');
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    const body = JSON.parse(rawBody);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extract event ID for idempotency
    const eventId =
      body.eventId || body.event_id || crypto.randomUUID();

    // Check for duplicate events
    const { data: existing } = await supabase
      .from('cr_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existing) {
      console.log(`[CRWebhook] Duplicate event ${eventId} — already stored`);
      return jsonResponse({ status: 'already_received', eventId });
    }

    // Normalize event type field names (CR may use different conventions)
    const eventType =
      body.eventType ||
      body.event_type ||
      body.type ||
      'unknown';
    const clientId =
      body.clientId ||
      body.client_id ||
      '';
    const entityId =
      body.entityId ||
      body.entity_id ||
      '';
    const entityType =
      body.entityType ||
      body.entity_type ||
      '';
    const organizationId =
      body.organizationId ||
      body.organization_id ||
      '';

    // Store the event for client-side processing via Realtime
    const { error: insertError } = await supabase
      .from('cr_webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        organization_id: organizationId,
        client_id: clientId,
        entity_id: entityId,
        entity_type: entityType,
        payload: body.data || body,
        received_at: new Date().toISOString(),
        processed: false,
        retry_count: 0,
      });

    if (insertError) {
      console.error('[CRWebhook] Failed to store event:', insertError);
      return jsonResponse({ error: 'Failed to store event' }, 500);
    }

    // Audit log
    await supabase
      .from('audit_log')
      .insert({
        action: 'cr_webhook_received',
        resource_type: 'centralreach',
        details: {
          event_id: eventId,
          event_type: eventType,
          client_id: clientId,
          entity_type: entityType,
        },
        timestamp: new Date().toISOString(),
      })
      .catch((err: unknown) => console.warn('Audit log failed:', err));

    console.log(
      `[CRWebhook] Stored event: ${eventType} (${eventId}) for client ${clientId}`,
    );

    return jsonResponse({ status: 'received', eventId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    console.error('[CRWebhook] Error:', err);
    return jsonResponse({ error: message }, 500);
  }
});
