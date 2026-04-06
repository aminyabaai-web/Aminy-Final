// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CentralReach Webhook Receiver
 *
 * Handles incoming webhook events from CentralReach for real-time data updates.
 * CentralReach fires webhooks when clinical data changes:
 *   - session_updated: Therapy session completed, modified, or cancelled
 *   - goal_updated: Treatment goal progress or status changed
 *   - authorization_changed: Insurance auth units updated or renewed
 *   - client_updated: Client demographics or status changed
 *   - home_program_assigned: BCBA assigned new home program to a client
 *
 * Architecture:
 *   1. CentralReach sends HTTPS POST to our Supabase edge function
 *   2. Edge function validates HMAC-SHA256 signature
 *   3. Event is stored in cr_webhook_events table (idempotent via event ID)
 *   4. Client-side WebhookHandler processes events via Supabase realtime
 *   5. Registered callbacks execute (cache refresh, UI update, etc.)
 *
 * Security:
 *   - HMAC-SHA256 signature validation (constant-time comparison)
 *   - All webhook secrets stored server-side (edge function env)
 *   - Replay protection via event ID deduplication
 *   - Rate limiting on the edge function endpoint
 */

import { supabase } from '../utils/supabase/client';
import type { CRWebhookEvent } from './centralreach-types';

// ============================================================================
// Webhook Event Types
// ============================================================================

/** All webhook event types CentralReach can fire */
export type WebhookEventType =
  | 'session_updated'
  | 'session_completed'
  | 'session_cancelled'
  | 'goal_updated'
  | 'goal_completed'
  | 'authorization_changed'
  | 'client_updated'
  | 'home_program_assigned'
  | 'note_signed';

/** Structured webhook payload received from CentralReach */
export interface WebhookPayload {
  /** Unique event ID for idempotency */
  eventId: string;
  /** Event type */
  eventType: WebhookEventType;
  /** CentralReach organization ID */
  organizationId: string;
  /** CentralReach client ID (child) affected */
  clientId: string;
  /** Entity ID that changed (session ID, goal ID, etc.) */
  entityId: string;
  /** Entity type for routing */
  entityType: 'session' | 'goal' | 'authorization' | 'client' | 'home_program' | 'note';
  /** Timestamp of the event in CentralReach */
  occurredAt: string;
  /** Event-specific data payload */
  data: Record<string, unknown>;
  /** HMAC-SHA256 signature for verification */
  signature: string;
}

/** Processed webhook event stored in Supabase */
export interface StoredWebhookEvent {
  id: string;
  event_id: string;
  event_type: WebhookEventType;
  organization_id: string;
  client_id: string;
  entity_id: string;
  entity_type: string;
  payload: Record<string, unknown>;
  received_at: string;
  processed: boolean;
  processed_at: string | null;
  processing_error: string | null;
  retry_count: number;
}

/** Callback signature for webhook event handlers */
export type WebhookCallback = (payload: WebhookPayload) => Promise<void> | void;

/** Event-to-action mapping configuration */
export interface EventActionMapping {
  eventType: WebhookEventType;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  dataTypes: string[];
}

// ============================================================================
// Event-to-Action Mappings
// ============================================================================

/**
 * Maps webhook events to sync actions.
 * When CentralReach fires a webhook, we know exactly what data to refresh.
 */
export const EVENT_ACTION_MAPPINGS: EventActionMapping[] = [
  {
    eventType: 'session_updated',
    description: 'Therapy session was created, modified, or completed',
    action: 'refresh_sessions',
    priority: 'high',
    dataTypes: ['sessions'],
  },
  {
    eventType: 'session_completed',
    description: 'Therapy session marked as completed with notes signed off',
    action: 'refresh_sessions',
    priority: 'high',
    dataTypes: ['sessions'],
  },
  {
    eventType: 'session_cancelled',
    description: 'Therapy session was cancelled',
    action: 'refresh_sessions',
    priority: 'medium',
    dataTypes: ['sessions'],
  },
  {
    eventType: 'goal_updated',
    description: 'Treatment goal progress or phase changed',
    action: 'refresh_goals',
    priority: 'high',
    dataTypes: ['goals'],
  },
  {
    eventType: 'goal_completed',
    description: 'Treatment goal reached mastery criteria',
    action: 'refresh_goals',
    priority: 'high',
    dataTypes: ['goals'],
  },
  {
    eventType: 'authorization_changed',
    description: 'Insurance authorization units or status updated',
    action: 'refresh_authorizations',
    priority: 'high',
    dataTypes: ['insurance', 'auth_status'],
  },
  {
    eventType: 'client_updated',
    description: 'Client demographics, diagnosis, or provider assignment changed',
    action: 'refresh_client',
    priority: 'medium',
    dataTypes: ['sessions', 'goals', 'insurance'],
  },
  {
    eventType: 'home_program_assigned',
    description: 'BCBA assigned a new home program for parent implementation',
    action: 'refresh_home_programs',
    priority: 'high',
    dataTypes: ['home_programs'],
  },
  {
    eventType: 'note_signed',
    description: 'Clinical note was signed off by supervisor',
    action: 'refresh_sessions',
    priority: 'low',
    dataTypes: ['sessions'],
  },
];

// ============================================================================
// Webhook Handler Class
// ============================================================================

/**
 * Client-side webhook handler that subscribes to processed webhook events
 * via Supabase Realtime and dispatches to registered callbacks.
 *
 * Usage:
 *   const handler = new WebhookHandler();
 *   handler.registerHandler('session_updated', async (payload) => {
 *     await refreshSessionCache(payload.clientId);
 *   });
 *   handler.registerHandler('authorization_changed', async (payload) => {
 *     await updateAuthStatusDisplay(payload.clientId);
 *   });
 *   await handler.startListening(userId);
 *
 *   // Later...
 *   handler.stopListening();
 */
export class WebhookHandler {
  private handlers = new Map<WebhookEventType, Set<WebhookCallback>>();
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private isListening = false;
  private userId: string | null = null;
  private processedEventIds = new Set<string>();

  /**
   * Register a callback for a specific webhook event type.
   * Multiple handlers can be registered for the same event type.
   *
   * @param eventType - The webhook event type to listen for
   * @param callback - Async function to execute when event fires
   * @returns Unsubscribe function
   */
  registerHandler(eventType: WebhookEventType, callback: WebhookCallback): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(callback);

    console.log(`[CRWebhook] Registered handler for ${eventType}`);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(callback);
      console.log(`[CRWebhook] Unregistered handler for ${eventType}`);
    };
  }

  /**
   * Remove all handlers for a specific event type.
   */
  removeAllHandlers(eventType: WebhookEventType): void {
    this.handlers.delete(eventType);
  }

  /**
   * Process an incoming webhook payload.
   * Validates the payload structure, deduplicates, and dispatches to handlers.
   *
   * @param payload - The webhook payload to process
   * @returns Whether the event was processed (false if duplicate)
   */
  async processWebhook(payload: WebhookPayload): Promise<boolean> {
    // Deduplication check
    if (this.processedEventIds.has(payload.eventId)) {
      console.log(`[CRWebhook] Skipping duplicate event: ${payload.eventId}`);
      return false;
    }

    // Validate payload structure
    if (!payload.eventType || !payload.clientId || !payload.entityId) {
      console.error('[CRWebhook] Invalid payload — missing required fields:', payload);
      return false;
    }

    // Check if event type is known
    const mapping = EVENT_ACTION_MAPPINGS.find((m) => m.eventType === payload.eventType);
    if (!mapping) {
      console.warn(`[CRWebhook] Unknown event type: ${payload.eventType}`);
      return false;
    }

    // Mark as processed (idempotency)
    this.processedEventIds.add(payload.eventId);

    // Cap the set size to prevent memory leaks
    if (this.processedEventIds.size > 10_000) {
      const iterator = this.processedEventIds.values();
      for (let i = 0; i < 5_000; i++) {
        const result = iterator.next();
        if (result.done) break;
        this.processedEventIds.delete(result.value);
      }
    }

    // Dispatch to registered handlers
    const handlers = this.handlers.get(payload.eventType);
    if (!handlers || handlers.size === 0) {
      console.log(`[CRWebhook] No handlers for ${payload.eventType} — event stored but not acted on`);
      return true;
    }

    console.log(
      `[CRWebhook] Processing ${payload.eventType} (${payload.eventId}) — ` +
        `${handlers.size} handler(s), priority: ${mapping.priority}`,
    );

    // Execute all handlers (parallel for independent handlers)
    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) => handler(payload)),
    );

    // Log failures
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(
        `[CRWebhook] ${failures.length}/${results.length} handlers failed for ${payload.eventType}:`,
        failures.map((f) => (f as PromiseRejectedResult).reason),
      );
    }

    // Update processed status in Supabase
    try {
      await supabase
        .from('cr_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error:
            failures.length > 0
              ? `${failures.length} handler(s) failed`
              : null,
        })
        .eq('event_id', payload.eventId);
    } catch (err) {
      console.error('[CRWebhook] Failed to update event status:', err);
    }

    return true;
  }

  /**
   * Validate a webhook signature using HMAC-SHA256.
   * NOTE: In production, signature validation happens in the edge function.
   * This client-side method is for development/testing only.
   *
   * @param payload - Raw JSON string of the webhook body
   * @param signature - The HMAC-SHA256 hex signature from the X-CR-Signature header
   * @param secret - The webhook secret (should be in edge function env, not client)
   * @returns Whether the signature is valid
   */
  async validateSignature(
    payload: string,
    signature: string,
    secret?: string,
  ): Promise<boolean> {
    // In production, signature validation is done server-side in the edge function.
    // This method exists for testing and development workflows.
    if (!secret) {
      console.warn(
        '[CRWebhook] validateSignature called without secret — ' +
          'in production, validation is handled by the edge function',
      );
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );

      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const expectedHex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Constant-time comparison to prevent timing attacks
      if (expectedHex.length !== signature.length) return false;
      let mismatch = 0;
      for (let i = 0; i < expectedHex.length; i++) {
        mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
      }
      return mismatch === 0;
    } catch (err) {
      console.error('[CRWebhook] Signature validation error:', err);
      return false;
    }
  }

  /**
   * Start listening for webhook events via Supabase Realtime.
   * Subscribes to INSERT events on the cr_webhook_events table.
   *
   * @param userId - The authenticated user ID to filter events for
   */
  async startListening(userId: string): Promise<void> {
    if (this.isListening) {
      console.warn('[CRWebhook] Already listening — call stopListening() first');
      return;
    }

    this.userId = userId;
    this.isListening = true;

    // Subscribe to new webhook events via Supabase Realtime
    this.realtimeChannel = supabase
      .channel('cr-webhook-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cr_webhook_events',
          filter: `processed=eq.false`,
        },
        async (payload) => {
          const row = payload.new as StoredWebhookEvent;

          // Convert DB row to WebhookPayload
          const webhookPayload: WebhookPayload = {
            eventId: row.event_id,
            eventType: row.event_type,
            organizationId: row.organization_id,
            clientId: row.client_id,
            entityId: row.entity_id,
            entityType: row.entity_type as WebhookPayload['entityType'],
            occurredAt: row.received_at,
            data: row.payload,
            signature: '', // Already validated server-side
          };

          await this.processWebhook(webhookPayload);
        },
      )
      .subscribe((status) => {
        console.log(`[CRWebhook] Realtime subscription status: ${status}`);
      });

    // Also process any unprocessed events that arrived while we were offline
    await this.processBacklog();

    console.log(`[CRWebhook] Listening for webhook events (user: ${userId})`);
  }

  /**
   * Stop listening for webhook events.
   */
  stopListening(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.isListening = false;
    console.log('[CRWebhook] Stopped listening');
  }

  /**
   * Process any unprocessed webhook events (backlog from offline periods).
   */
  private async processBacklog(): Promise<void> {
    try {
      const { data: events, error } = await supabase
        .from('cr_webhook_events')
        .select('*')
        .eq('processed', false)
        .order('received_at', { ascending: true })
        .limit(50);

      if (error || !events || events.length === 0) return;

      console.log(`[CRWebhook] Processing ${events.length} backlog event(s)`);

      for (const row of events as StoredWebhookEvent[]) {
        const webhookPayload: WebhookPayload = {
          eventId: row.event_id,
          eventType: row.event_type,
          organizationId: row.organization_id,
          clientId: row.client_id,
          entityId: row.entity_id,
          entityType: row.entity_type as WebhookPayload['entityType'],
          occurredAt: row.received_at,
          data: row.payload,
          signature: '',
        };

        await this.processWebhook(webhookPayload);
      }
    } catch (err) {
      console.error('[CRWebhook] Backlog processing error:', err);
    }
  }

  /**
   * Get registered handler count per event type (useful for diagnostics).
   */
  getHandlerCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [eventType, handlers] of this.handlers) {
      counts[eventType] = handlers.size;
    }
    return counts;
  }

  /**
   * Get the action mapping for a given event type.
   */
  getActionMapping(eventType: WebhookEventType): EventActionMapping | undefined {
    return EVENT_ACTION_MAPPINGS.find((m) => m.eventType === eventType);
  }

  /** Whether the handler is currently listening for events */
  get listening(): boolean {
    return this.isListening;
  }

  /** Number of unique events processed in this session */
  get processedCount(): number {
    return this.processedEventIds.size;
  }
}

// ============================================================================
// Supabase Edge Function Definition (Webhook Receiver Endpoint)
// ============================================================================

/**
 * Edge function definition for the CentralReach webhook receiver.
 * This is the Deno function that CentralReach's webhook configuration
 * points to. It validates the signature and stores events for processing.
 *
 * Deploy path: supabase/functions/centralreach-webhooks/index.ts
 *
 * CentralReach webhook configuration:
 *   URL: https://<project>.supabase.co/functions/v1/centralreach-webhooks
 *   Method: POST
 *   Headers: X-CR-Signature (HMAC-SHA256)
 *   Content-Type: application/json
 */
export const EDGE_FUNCTION_TEMPLATE = `
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CR_WEBHOOK_SECRET = Deno.env.get('CENTRALREACH_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cr-signature',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifySignature(payload: string, signature: string): Promise<boolean> {
  if (!CR_WEBHOOK_SECRET) return false;

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
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHex.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return jsonResponse({ status: 'healthy', service: 'centralreach-webhooks' });
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
      console.error('[CRWebhook] Invalid signature');
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    const body = JSON.parse(rawBody);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Idempotency: check if event already stored
    const eventId = body.eventId || body.event_id || crypto.randomUUID();
    const { data: existing } = await supabase
      .from('cr_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existing) {
      return jsonResponse({ status: 'already_received', eventId });
    }

    // Store the event for client-side processing
    const { error: insertError } = await supabase.from('cr_webhook_events').insert({
      event_id: eventId,
      event_type: body.eventType || body.event_type || body.type,
      organization_id: body.organizationId || body.organization_id,
      client_id: body.clientId || body.client_id,
      entity_id: body.entityId || body.entity_id,
      entity_type: body.entityType || body.entity_type,
      payload: body.data || body,
      received_at: new Date().toISOString(),
      processed: false,
      retry_count: 0,
    });

    if (insertError) {
      console.error('[CRWebhook] Insert error:', insertError);
      return jsonResponse({ error: 'Failed to store event' }, 500);
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      action: 'cr_webhook_received',
      resource_type: 'centralreach',
      details: {
        event_id: eventId,
        event_type: body.eventType || body.event_type || body.type,
        client_id: body.clientId || body.client_id,
      },
      timestamp: new Date().toISOString(),
    }).catch(err => console.warn('Audit log failed:', err));

    return jsonResponse({ status: 'received', eventId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[CRWebhook] Error:', err);
    return jsonResponse({ error: message }, 500);
  }
});
`;

// ============================================================================
// Singleton Export
// ============================================================================

/** Shared webhook handler instance */
export const webhookHandler = new WebhookHandler();

export default webhookHandler;
