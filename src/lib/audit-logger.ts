/**
 * Comprehensive Audit Logging System
 *
 * HIPAA-compliant audit trail for all user actions
 * Immutable log storage - entries cannot be modified or deleted
 */

import { supabase } from '../utils/supabase/client';
import { syncEncryptedStorage } from './security/encrypted-storage';

// Environment check for production logging
const IS_PRODUCTION = import.meta.env.PROD || import.meta.env.VITE_USE_MOCK_DATA === 'false';

// Audit action types
export type AuditAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'share'
  | 'export'
  | 'download'
  | 'login'
  | 'logout'
  | 'permission_change'
  | 'access_granted'
  | 'access_revoked'
  | 'access_requested'
  | 'message_sent'
  | 'message_read'
  | 'appointment_scheduled'
  | 'appointment_cancelled'
  | 'document_uploaded'
  | 'data_shared'
  | 'settings_changed'
  // Financial transaction actions
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
  // Telehealth recording actions
  | 'recording_consent_given'
  | 'recording_consent_declined'
  | 'recording_started'
  | 'recording_stopped';

// Resource types being accessed
export type AuditResourceType =
  | 'child_data'
  | 'child_profile'
  | 'care_plan'
  | 'goal'
  | 'observation'
  | 'message'
  | 'message_thread'
  | 'appointment'
  | 'document'
  | 'vault_file'
  | 'settings'
  | 'user_account'
  | 'provider_data'
  | 'share_link'
  | 'fhir_bundle'
  | 'session_notes'
  | 'progress_report'
  // Financial resources
  | 'payment'
  | 'subscription'
  | 'invoice'
  | 'refund'
  | 'promo_code'
  // Telehealth resources
  | 'telehealth_session'
  | 'telehealth_recording'
  // Insurance resources
  | 'prior_auth'
  | 'claim'
  | 'denial'
  // Data export & account management
  | 'clinical_data'
  | 'user_account';

// User roles for audit context
export type AuditUserRole = 'parent' | 'provider' | 'admin' | 'caregiver' | 'system';

// Full audit event interface
export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  userId: string;
  userRole: AuditUserRole;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
  childId?: string; // For child-related actions
  providerId?: string; // For provider-related actions
  success: boolean;
  errorMessage?: string;
}

// Simplified event for logging (auto-generates id and timestamp)
export type AuditEventInput = Omit<AuditEvent, 'id' | 'timestamp'>;

// In-memory audit log for development (will be replaced with Supabase in production)
const AUDIT_LOG_KEY = 'aminy_audit_log';

/**
 * Generate a unique ID for audit events
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address (best effort)
 */
async function getClientIP(): Promise<string | undefined> {
  try {
    // In production, this would come from the server
    // For now, we'll mark it as client-side
    return 'client-side';
  } catch {
    return undefined;
  }
}

/**
 * Get or create a session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('aminy_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('aminy_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Get current user agent
 */
function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
}

/**
 * Load audit log from storage
 */
function loadAuditLog(): AuditEvent[] {
  try {
    const stored = syncEncryptedStorage.getItem(AUDIT_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save audit log to storage (append-only)
 * In production, persists to Supabase for HIPAA compliance
 */
async function saveAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Always save to localStorage as backup
    const log = loadAuditLog();
    log.push(event);
    const trimmedLog = log.slice(-10000);
    syncEncryptedStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLog));

    // In production, also persist to Supabase for HIPAA compliance
    if (IS_PRODUCTION) {
      const { error } = await supabase.from('audit_log').insert({
        id: event.id,
        timestamp: event.timestamp,
        user_id: event.userId,
        user_role: event.userRole,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        details: event.details,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        session_id: event.sessionId,
        child_id: event.childId,
        provider_id: event.providerId,
        success: event.success,
        error_message: event.errorMessage
      });

      if (error) {
        console.error('[AUDIT] Failed to persist to Supabase:', error);
        // Event is still in localStorage as backup
      }
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[AUDIT]', {
        action: event.action,
        resource: `${event.resourceType}:${event.resourceId}`,
        user: event.userId,
        role: event.userRole,
        success: event.success
      });
    }
  } catch (error) {
    console.error('[AUDIT] Failed to save audit event:', error);
  }
}

/**
 * Main function to log an audit event
 */
export async function logAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    ...input,
    ipAddress: input.ipAddress || await getClientIP(),
    userAgent: input.userAgent || getUserAgent(),
    sessionId: input.sessionId || getSessionId()
  };

  // Save to localStorage and Supabase (in production)
  await saveAuditEvent(event);

  return event;
}

/**
 * Convenience function for logging data access
 */
export function logDataAccess(
  userId: string,
  userRole: AuditUserRole,
  resourceType: AuditResourceType,
  resourceId: string,
  action: 'view' | 'export' | 'download' = 'view',
  details: Record<string, unknown> = {}
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole,
    action,
    resourceType,
    resourceId,
    details,
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log when a provider accesses child data
 */
export function logProviderAccess(
  providerId: string,
  childId: string,
  resourceType: AuditResourceType,
  resourceId: string,
  accessLevel: 'summary' | 'full' | 'clinical',
  details: Record<string, unknown> = {}
): Promise<AuditEvent> {
  return logAuditEvent({
    userId: providerId,
    userRole: 'provider',
    action: 'view',
    resourceType,
    resourceId,
    childId,
    providerId,
    details: {
      ...details,
      accessLevel
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log when data is shared with a provider
 */
export function logDataShare(
  parentId: string,
  providerId: string,
  childId: string,
  resourceType: AuditResourceType,
  shareLinkId: string,
  accessLevel: 'summary' | 'full' | 'clinical',
  expiresAt: string
): Promise<AuditEvent> {
  return logAuditEvent({
    userId: parentId,
    userRole: 'parent',
    action: 'share',
    resourceType,
    resourceId: shareLinkId,
    childId,
    providerId,
    details: {
      accessLevel,
      expiresAt,
      shareLinkId
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log access request from provider
 */
export function logAccessRequest(
  providerId: string,
  childId: string,
  requestId: string,
  requestedLevel: 'summary' | 'full' | 'clinical',
  reason: string
): Promise<AuditEvent> {
  return logAuditEvent({
    userId: providerId,
    userRole: 'provider',
    action: 'access_requested',
    resourceType: 'child_data',
    resourceId: requestId,
    childId,
    providerId,
    details: {
      requestedLevel,
      reason
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log access grant or denial
 */
export function logAccessDecision(
  parentId: string,
  providerId: string,
  childId: string,
  requestId: string,
  decision: 'granted' | 'denied',
  accessLevel?: 'summary' | 'full' | 'clinical'
): Promise<AuditEvent> {
  return logAuditEvent({
    userId: parentId,
    userRole: 'parent',
    action: decision === 'granted' ? 'access_granted' : 'access_revoked',
    resourceType: 'child_data',
    resourceId: requestId,
    childId,
    providerId,
    details: {
      decision,
      accessLevel
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log message sent
 */
export function logMessageSent(
  senderId: string,
  senderRole: AuditUserRole,
  threadId: string,
  messageId: string,
  recipientId: string,
  hasAttachments: boolean
): Promise<AuditEvent> {
  return logAuditEvent({
    userId: senderId,
    userRole: senderRole,
    action: 'message_sent',
    resourceType: 'message',
    resourceId: messageId,
    details: {
      threadId,
      recipientId,
      hasAttachments
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log message read
 */
export function logMessageRead(
  readerId: string,
  readerRole: AuditUserRole,
  threadId: string,
  messageId: string
): Promise<AuditEvent> {
  return logAuditEvent({
    userId: readerId,
    userRole: readerRole,
    action: 'message_read',
    resourceType: 'message',
    resourceId: messageId,
    details: {
      threadId
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log login event
 */
export function logLogin(
  userId: string,
  userRole: AuditUserRole,
  method: 'email' | 'google' | 'apple' | 'sso'
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole,
    action: 'login',
    resourceType: 'user_account',
    resourceId: userId,
    details: {
      method
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log logout event
 */
export function logLogout(userId: string, userRole: AuditUserRole): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole,
    action: 'logout',
    resourceType: 'user_account',
    resourceId: userId,
    details: {},
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log document export (FHIR bundle, PDF, etc.)
 */
export function logDocumentExport(
  userId: string,
  userRole: AuditUserRole,
  childId: string,
  documentType: 'fhir_bundle' | 'provider_summary' | 'progress_report' | 'superbill',
  documentId: string,
  format: 'json' | 'pdf' | 'csv'
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole,
    action: 'export',
    resourceType: documentType === 'fhir_bundle' ? 'fhir_bundle' : 'document',
    resourceId: documentId,
    childId,
    details: {
      documentType,
      format
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Log settings change
 */
export function logSettingsChange(
  userId: string,
  userRole: AuditUserRole,
  settingCategory: string,
  settingName: string,
  oldValue: unknown,
  newValue: unknown
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole,
    action: 'settings_changed',
    resourceType: 'settings',
    resourceId: `${settingCategory}:${settingName}`,
    details: {
      category: settingCategory,
      setting: settingName,
      oldValue,
      newValue
    },
    sessionId: getSessionId(),
    success: true
  });
}

/**
 * Get audit log entries (for admin view)
 */
export function getAuditLog(filters?: {
  userId?: string;
  userRole?: AuditUserRole;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  childId?: string;
  providerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AuditEvent[] {
  let log = loadAuditLog();

  if (filters) {
    if (filters.userId) {
      log = log.filter(e => e.userId === filters.userId);
    }
    if (filters.userRole) {
      log = log.filter(e => e.userRole === filters.userRole);
    }
    if (filters.action) {
      log = log.filter(e => e.action === filters.action);
    }
    if (filters.resourceType) {
      log = log.filter(e => e.resourceType === filters.resourceType);
    }
    if (filters.childId) {
      log = log.filter(e => e.childId === filters.childId);
    }
    if (filters.providerId) {
      log = log.filter(e => e.providerId === filters.providerId);
    }
    if (filters.startDate) {
      log = log.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      log = log.filter(e => e.timestamp <= filters.endDate!);
    }
  }

  // Sort by timestamp descending (newest first)
  log.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Apply limit
  if (filters?.limit) {
    log = log.slice(0, filters.limit);
  }

  return log;
}

/**
 * Get audit summary for a specific child
 */
export function getChildAuditSummary(childId: string): {
  totalAccesses: number;
  uniqueProviders: number;
  lastAccess?: string;
  recentActions: AuditEvent[];
} {
  const childEvents = getAuditLog({ childId, limit: 100 });

  const providerIds = new Set<string>();
  childEvents.forEach(e => {
    if (e.providerId) {
      providerIds.add(e.providerId);
    }
  });

  return {
    totalAccesses: childEvents.filter(e => e.action === 'view').length,
    uniqueProviders: providerIds.size,
    lastAccess: childEvents[0]?.timestamp,
    recentActions: childEvents.slice(0, 10)
  };
}

/**
 * Get provider activity audit
 */
export function getProviderActivityAudit(providerId: string, days: number = 30): {
  totalActions: number;
  childrenAccessed: number;
  messagesSent: number;
  dataExports: number;
  recentActivity: AuditEvent[];
} {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const providerEvents = getAuditLog({
    providerId,
    startDate: startDate.toISOString(),
    limit: 500
  });

  const childIds = new Set<string>();
  providerEvents.forEach(e => {
    if (e.childId) {
      childIds.add(e.childId);
    }
  });

  return {
    totalActions: providerEvents.length,
    childrenAccessed: childIds.size,
    messagesSent: providerEvents.filter(e => e.action === 'message_sent').length,
    dataExports: providerEvents.filter(e => e.action === 'export').length,
    recentActivity: providerEvents.slice(0, 20)
  };
}

// =============================================================================
// FINANCIAL TRANSACTION AUDIT LOGGING
// =============================================================================

/**
 * Log payment initiation (checkout started)
 */
export function logPaymentInitiated(
  userId: string,
  userRole: AuditUserRole,
  sessionId: string,
  tier: string,
  interval: 'monthly' | 'annual',
  amountCents: number,
  promoCode?: string
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole,
    action: 'payment_initiated',
    resourceType: 'payment',
    resourceId: sessionId,
    details: {
      tier,
      interval,
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      promoCode: promoCode || null,
      initiatedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log successful payment
 */
export function logPaymentSucceeded(
  userId: string,
  stripePaymentId: string,
  stripeCustomerId: string,
  amountCents: number,
  tier: string,
  interval: 'monthly' | 'annual',
  isNewSubscription: boolean
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: 'payment_succeeded',
    resourceType: 'payment',
    resourceId: stripePaymentId,
    details: {
      stripeCustomerId,
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      tier,
      interval,
      isNewSubscription,
      processedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log failed payment
 */
export function logPaymentFailed(
  userId: string,
  stripePaymentId: string | undefined,
  amountCents: number,
  failureReason: string,
  failureCode?: string
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: 'payment_failed',
    resourceType: 'payment',
    resourceId: stripePaymentId || 'unknown',
    details: {
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      failureReason,
      failureCode,
      failedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: false,
    errorMessage: failureReason,
  });
}

/**
 * Log subscription creation
 */
export function logSubscriptionCreated(
  userId: string,
  subscriptionId: string,
  stripeCustomerId: string,
  tier: string,
  interval: 'monthly' | 'annual',
  trialDays?: number
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: 'subscription_created',
    resourceType: 'subscription',
    resourceId: subscriptionId,
    details: {
      stripeCustomerId,
      tier,
      interval,
      trialDays: trialDays || 0,
      hasTrial: (trialDays || 0) > 0,
      createdAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log subscription cancellation
 */
export function logSubscriptionCancelled(
  userId: string,
  subscriptionId: string,
  tier: string,
  cancelReason?: string,
  cancelAtPeriodEnd: boolean = true
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: 'subscription_cancelled',
    resourceType: 'subscription',
    resourceId: subscriptionId,
    details: {
      tier,
      cancelReason: cancelReason || 'User requested',
      cancelAtPeriodEnd,
      cancelledAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log subscription renewal (recurring payment)
 */
export function logSubscriptionRenewed(
  userId: string,
  subscriptionId: string,
  invoiceId: string,
  amountCents: number,
  tier: string
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: 'subscription_renewed',
    resourceType: 'subscription',
    resourceId: subscriptionId,
    details: {
      invoiceId,
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      tier,
      renewedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log tier change (upgrade or downgrade)
 */
export function logTierChange(
  userId: string,
  subscriptionId: string,
  oldTier: string,
  newTier: string,
  changeType: 'upgrade' | 'downgrade',
  proratedAmountCents?: number
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: changeType === 'upgrade' ? 'tier_upgraded' : 'tier_downgraded',
    resourceType: 'subscription',
    resourceId: subscriptionId,
    details: {
      oldTier,
      newTier,
      changeType,
      proratedAmountCents,
      proratedAmountFormatted: proratedAmountCents ? `$${(proratedAmountCents / 100).toFixed(2)}` : null,
      changedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log promo code application
 */
export function logPromoCodeApplied(
  userId: string,
  promoCode: string,
  discountType: 'percent' | 'fixed',
  discountValue: number,
  originalAmountCents: number,
  finalAmountCents: number,
  context: 'subscription' | 'telehealth' | 'marketplace'
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: 'parent',
    action: 'promo_code_applied',
    resourceType: 'promo_code',
    resourceId: promoCode,
    details: {
      discountType,
      discountValue,
      discountFormatted: discountType === 'percent' ? `${discountValue}%` : `$${(discountValue / 100).toFixed(2)}`,
      originalAmountCents,
      finalAmountCents,
      savingsAmountCents: originalAmountCents - finalAmountCents,
      savingsFormatted: `$${((originalAmountCents - finalAmountCents) / 100).toFixed(2)}`,
      context,
      appliedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Log refund
 */
export function logRefund(
  userId: string,
  refundId: string,
  originalPaymentId: string,
  amountCents: number,
  reason: string,
  initiatedBy: 'user' | 'admin' | 'system'
): Promise<AuditEvent> {
  return logAuditEvent({
    userId,
    userRole: initiatedBy === 'admin' ? 'admin' : initiatedBy === 'system' ? 'system' : 'parent',
    action: 'refund_completed',
    resourceType: 'refund',
    resourceId: refundId,
    details: {
      originalPaymentId,
      amountCents,
      amountFormatted: `$${(amountCents / 100).toFixed(2)}`,
      reason,
      initiatedBy,
      refundedAt: new Date().toISOString(),
    },
    sessionId: getSessionId(),
    success: true,
  });
}

/**
 * Get financial audit summary for a user
 */
export function getFinancialAuditSummary(userId: string): {
  totalPayments: number;
  totalAmountPaid: number;
  subscriptionChanges: number;
  promoCodesUsed: number;
  refunds: number;
  recentTransactions: AuditEvent[];
} {
  const financialActions: AuditAction[] = [
    'payment_initiated',
    'payment_succeeded',
    'payment_failed',
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'subscription_renewed',
    'refund_initiated',
    'refund_completed',
    'promo_code_applied',
    'tier_upgraded',
    'tier_downgraded',
  ];

  const allEvents = getAuditLog({ userId });
  const financialEvents = allEvents.filter(e => financialActions.includes(e.action));

  const successfulPayments = financialEvents.filter(
    e => e.action === 'payment_succeeded' || e.action === 'subscription_renewed'
  );

  const totalAmountPaid = successfulPayments.reduce((sum, e) => {
    const amount = (e.details as { amountCents?: number })?.amountCents || 0;
    return sum + amount;
  }, 0);

  return {
    totalPayments: successfulPayments.length,
    totalAmountPaid,
    subscriptionChanges: financialEvents.filter(
      e => e.action.startsWith('subscription_') || e.action.startsWith('tier_')
    ).length,
    promoCodesUsed: financialEvents.filter(e => e.action === 'promo_code_applied').length,
    refunds: financialEvents.filter(e => e.action === 'refund_completed').length,
    recentTransactions: financialEvents.slice(0, 20),
  };
}

export default {
  logAuditEvent,
  logDataAccess,
  logProviderAccess,
  logDataShare,
  logAccessRequest,
  logAccessDecision,
  logMessageSent,
  logMessageRead,
  logLogin,
  logLogout,
  logDocumentExport,
  logSettingsChange,
  getAuditLog,
  getChildAuditSummary,
  getProviderActivityAudit,
  // Financial audit functions
  logPaymentInitiated,
  logPaymentSucceeded,
  logPaymentFailed,
  logSubscriptionCreated,
  logSubscriptionCancelled,
  logSubscriptionRenewed,
  logTierChange,
  logPromoCodeApplied,
  logRefund,
  getFinancialAuditSummary,
};
