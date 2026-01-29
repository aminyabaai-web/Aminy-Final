/**
 * Server-Side Audit Logger
 *
 * HIPAA-compliant audit logging for edge functions
 * Logs directly to Supabase for immutable record keeping
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Supabase client with service role for audit logging
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Audit action types
export type AuditAction =
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_renewed'
  | 'refund_initiated'
  | 'refund_completed'
  | 'promo_code_applied'
  | 'tier_upgraded'
  | 'tier_downgraded'
  | 'webhook_received'
  | 'webhook_processed'
  | 'webhook_failed'
  | 'api_request'
  | 'api_error'
  | 'rate_limit_exceeded'
  | 'security_alert';

export type AuditResourceType =
  | 'payment'
  | 'subscription'
  | 'invoice'
  | 'refund'
  | 'promo_code'
  | 'webhook'
  | 'api_endpoint'
  | 'user_account';

export type AuditUserRole = 'parent' | 'provider' | 'admin' | 'system' | 'stripe';

export interface ServerAuditEvent {
  id: string;
  timestamp: string;
  user_id: string;
  user_role: AuditUserRole;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  success: boolean;
  error_message?: string;
}

/**
 * Generate a unique audit ID
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an audit event to Supabase
 */
export async function logServerAuditEvent(event: Omit<ServerAuditEvent, 'id' | 'timestamp'>): Promise<void> {
  const auditEvent: ServerAuditEvent = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    ...event,
  };

  try {
    const { error } = await supabase.from('audit_log').insert({
      id: auditEvent.id,
      timestamp: auditEvent.timestamp,
      user_id: auditEvent.user_id,
      user_role: auditEvent.user_role,
      action: auditEvent.action,
      resource_type: auditEvent.resource_type,
      resource_id: auditEvent.resource_id,
      details: auditEvent.details,
      ip_address: auditEvent.ip_address,
      user_agent: auditEvent.user_agent,
      session_id: auditEvent.request_id,
      success: auditEvent.success,
      error_message: auditEvent.error_message,
    });

    if (error) {
      console.error('[SERVER AUDIT] Failed to log event:', error);
    } else {
      console.log('[SERVER AUDIT]', auditEvent.action, auditEvent.resource_type, auditEvent.resource_id);
    }
  } catch (err) {
    console.error('[SERVER AUDIT] Exception logging event:', err);
  }
}

// =============================================================================
// FINANCIAL TRANSACTION AUDIT FUNCTIONS
// =============================================================================

/**
 * Log Stripe webhook received
 */
export async function logWebhookReceived(
  eventType: string,
  eventId: string,
  ipAddress?: string
): Promise<void> {
  await logServerAuditEvent({
    user_id: 'stripe',
    user_role: 'stripe',
    action: 'webhook_received',
    resource_type: 'webhook',
    resource_id: eventId,
    details: {
      eventType,
      receivedAt: new Date().toISOString(),
    },
    ip_address: ipAddress,
    success: true,
  });
}

/**
 * Log successful payment from webhook
 */
export async function logPaymentSucceededServer(
  userId: string,
  paymentIntentId: string,
  customerId: string,
  amountCents: number,
  tier: string,
  subscriptionId?: string
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: 'payment_succeeded',
    resource_type: 'payment',
    resource_id: paymentIntentId,
    details: {
      stripeCustomerId: customerId,
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      tier,
      subscriptionId,
      processedAt: new Date().toISOString(),
      source: 'stripe_webhook',
    },
    success: true,
  });
}

/**
 * Log failed payment from webhook
 */
export async function logPaymentFailedServer(
  userId: string,
  paymentIntentId: string | undefined,
  amountCents: number,
  failureReason: string,
  failureCode?: string
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: 'payment_failed',
    resource_type: 'payment',
    resource_id: paymentIntentId || 'unknown',
    details: {
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      failureReason,
      failureCode,
      failedAt: new Date().toISOString(),
      source: 'stripe_webhook',
    },
    success: false,
    error_message: failureReason,
  });
}

/**
 * Log subscription created from webhook
 */
export async function logSubscriptionCreatedServer(
  userId: string,
  subscriptionId: string,
  customerId: string,
  tier: string,
  trialEnd?: number
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: 'subscription_created',
    resource_type: 'subscription',
    resource_id: subscriptionId,
    details: {
      stripeCustomerId: customerId,
      tier,
      trialEnd: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      hasTrial: !!trialEnd,
      createdAt: new Date().toISOString(),
      source: 'stripe_webhook',
    },
    success: true,
  });
}

/**
 * Log subscription cancelled from webhook
 */
export async function logSubscriptionCancelledServer(
  userId: string,
  subscriptionId: string,
  customerId: string,
  cancelAtPeriodEnd: boolean
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: 'subscription_cancelled',
    resource_type: 'subscription',
    resource_id: subscriptionId,
    details: {
      stripeCustomerId: customerId,
      cancelAtPeriodEnd,
      cancelledAt: new Date().toISOString(),
      source: 'stripe_webhook',
    },
    success: true,
  });
}

/**
 * Log subscription renewal from webhook
 */
export async function logSubscriptionRenewedServer(
  userId: string,
  subscriptionId: string,
  invoiceId: string,
  amountCents: number
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: 'subscription_renewed',
    resource_type: 'subscription',
    resource_id: subscriptionId,
    details: {
      invoiceId,
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      renewedAt: new Date().toISOString(),
      source: 'stripe_webhook',
    },
    success: true,
  });
}

/**
 * Log tier change from webhook
 */
export async function logTierChangeServer(
  userId: string,
  subscriptionId: string,
  oldTier: string,
  newTier: string
): Promise<void> {
  const changeType = getTierOrder(newTier) > getTierOrder(oldTier) ? 'upgrade' : 'downgrade';

  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: changeType === 'upgrade' ? 'tier_upgraded' : 'tier_downgraded',
    resource_type: 'subscription',
    resource_id: subscriptionId,
    details: {
      oldTier,
      newTier,
      changeType,
      changedAt: new Date().toISOString(),
      source: 'stripe_webhook',
    },
    success: true,
  });
}

/**
 * Log security alert
 */
export async function logSecurityAlert(
  alertType: string,
  details: Record<string, unknown>,
  ipAddress?: string,
  userId?: string
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId || 'system',
    user_role: 'system',
    action: 'security_alert',
    resource_type: 'api_endpoint',
    resource_id: alertType,
    details: {
      alertType,
      ...details,
      alertedAt: new Date().toISOString(),
    },
    ip_address: ipAddress,
    success: true,
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  userId: string,
  endpoint: string,
  currentCount: number,
  limit: number,
  ipAddress?: string
): Promise<void> {
  await logServerAuditEvent({
    user_id: userId,
    user_role: 'parent',
    action: 'rate_limit_exceeded',
    resource_type: 'api_endpoint',
    resource_id: endpoint,
    details: {
      currentCount,
      limit,
      exceededAt: new Date().toISOString(),
    },
    ip_address: ipAddress,
    success: false,
    error_message: `Rate limit exceeded: ${currentCount}/${limit}`,
  });
}

// Helper to determine tier order for upgrade/downgrade detection
function getTierOrder(tier: string): number {
  const order: Record<string, number> = {
    free: 0,
    starter: 1,
    core: 2,
    pro: 3,
    proplus: 4,
  };
  return order[tier.toLowerCase()] ?? 0;
}

export default {
  logServerAuditEvent,
  logWebhookReceived,
  logPaymentSucceededServer,
  logPaymentFailedServer,
  logSubscriptionCreatedServer,
  logSubscriptionCancelledServer,
  logSubscriptionRenewedServer,
  logTierChangeServer,
  logSecurityAlert,
  logRateLimitExceeded,
};
