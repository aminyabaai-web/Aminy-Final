// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * HIPAA-Compliant Audit Logging with Tamper-Evident Chain
 *
 * Implements comprehensive PHI access logging per HIPAA §164.312(b).
 * Each log entry includes a cryptographic hash of the previous entry,
 * creating a tamper-evident chain (similar to blockchain audit trails).
 *
 * Features:
 * - Tamper-evident hash chain (SHA-256 via Web Crypto API)
 * - PHI access event classification (VIEW, EDIT, EXPORT, SHARE, DELETE)
 * - Authentication events (LOGIN, LOGOUT, FAILED_LOGIN, SESSION_TIMEOUT)
 * - Permission change tracking
 * - Compliance report generation for officer review
 * - Filterable audit trail with date range, user, resource queries
 *
 * HIPAA References:
 * - §164.312(b) — Audit controls
 * - §164.308(a)(1)(ii)(D) — Information system activity review
 * - §164.308(a)(5)(ii)(C) — Log-in monitoring
 * - §164.312(c)(1) — Integrity: tamper-evident storage
 */

// ============================================================================
// Types
// ============================================================================

/** PHI access event types per HIPAA audit requirements */
export type PHIAccessEventType =
  | 'VIEW_RECORD'
  | 'EDIT_RECORD'
  | 'EXPORT_DATA'
  | 'SHARE_RECORD'
  | 'DELETE_RECORD'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'SESSION_TIMEOUT'
  | 'PERMISSION_CHANGE';

/** Sensitivity classification of the accessed resource */
export type PHISensitivity = 'standard' | 'sensitive' | 'highly_sensitive';

/** Individual audit log entry with tamper-evident chain link */
export interface PHIAuditEntry {
  /** Unique identifier for this log entry */
  id: string;
  /** ISO 8601 timestamp of the event */
  timestamp: string;
  /** Type of PHI access event */
  eventType: PHIAccessEventType;
  /** User ID who performed the action */
  userId: string;
  /** User role at time of action */
  userRole: 'parent' | 'provider' | 'admin' | 'caregiver' | 'system';
  /** User email (for compliance officer review) */
  userEmail: string;
  /** Resource type accessed */
  resourceType: string;
  /** Specific resource identifier */
  resourceId: string;
  /** Child ID if PHI involves a minor */
  childId?: string;
  /** IP address or 'client-side' for browser-only */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Screen/page where action occurred */
  screenContext: string;
  /** Free-form details about the action */
  actionDescription: string;
  /** Sensitivity level of the accessed data */
  sensitivity: PHISensitivity;
  /** Whether the action was successful */
  success: boolean;
  /** Error message if action failed */
  errorMessage?: string;
  /** Session ID for correlating related events */
  sessionId: string;
  /** SHA-256 hash of the previous entry (tamper-evident chain) */
  previousHash: string;
  /** SHA-256 hash of THIS entry's content (for chain verification) */
  entryHash: string;
}

/** Input for logging a PHI access event (auto-generates id, timestamp, hashes) */
export interface PHIAuditInput {
  eventType: PHIAccessEventType;
  userId: string;
  userRole: PHIAuditEntry['userRole'];
  userEmail: string;
  resourceType: string;
  resourceId: string;
  childId?: string;
  screenContext: string;
  actionDescription: string;
  sensitivity?: PHISensitivity;
  success?: boolean;
  errorMessage?: string;
}

/** Filters for querying the audit trail */
export interface PHIAuditFilters {
  userId?: string;
  userRole?: PHIAuditEntry['userRole'];
  eventType?: PHIAccessEventType;
  eventTypes?: PHIAccessEventType[];
  resourceType?: string;
  resourceId?: string;
  childId?: string;
  sensitivity?: PHISensitivity;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  screenContext?: string;
  limit?: number;
  offset?: number;
}

/** Compliance report structure for officer review */
export interface ComplianceReport {
  generatedAt: string;
  dateRange: { start: string; end: string };
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    phiViewEvents: number;
    phiEditEvents: number;
    phiExportEvents: number;
    phiShareEvents: number;
    phiDeleteEvents: number;
    failedLogins: number;
    sessionTimeouts: number;
    permissionChanges: number;
    highSensitivityAccesses: number;
  };
  eventsByUser: Array<{
    userId: string;
    userEmail: string;
    userRole: string;
    eventCount: number;
    lastActivity: string;
    eventTypes: Record<string, number>;
  }>;
  eventsByResource: Array<{
    resourceType: string;
    accessCount: number;
    uniqueUsers: number;
    lastAccess: string;
  }>;
  chainIntegrity: {
    verified: boolean;
    totalEntries: number;
    brokenLinks: number;
    firstBrokenAt?: string;
  };
  riskIndicators: Array<{
    indicator: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    count: number;
  }>;
}

// Supabase client for durable server-side audit writes
import { supabase } from '../../utils/supabase/client';

// ============================================================================
// Constants
// ============================================================================

const HIPAA_AUDIT_STORAGE_KEY = 'aminy_hipaa_audit_chain';
const HIPAA_AUDIT_MAX_LOCAL_ENTRIES = 5000;
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// ============================================================================
// Crypto Helpers
// ============================================================================

/**
 * Compute SHA-256 hash of a string using Web Crypto API.
 * Falls back to a simple deterministic hash if Web Crypto is unavailable.
 */
async function computeSHA256(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: simple deterministic hash (NOT cryptographically secure, but
  // maintains chain structure for environments without Web Crypto)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Compute the hash of an audit entry's content (excludes the entryHash field itself).
 */
async function hashEntry(entry: Omit<PHIAuditEntry, 'entryHash'>): Promise<string> {
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    userId: entry.userId,
    userRole: entry.userRole,
    userEmail: entry.userEmail,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    childId: entry.childId,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    screenContext: entry.screenContext,
    actionDescription: entry.actionDescription,
    sensitivity: entry.sensitivity,
    success: entry.success,
    errorMessage: entry.errorMessage,
    sessionId: entry.sessionId,
    previousHash: entry.previousHash,
  });
  return computeSHA256(payload);
}

// ============================================================================
// Storage Helpers
// ============================================================================

function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `phi_${timestamp}_${random}`;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('aminy_hipaa_session_id');
  if (!sessionId) {
    sessionId = `hsess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem('aminy_hipaa_session_id', sessionId);
  }
  return sessionId;
}

function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'server';
}

function getClientIP(): string {
  // In a browser context, we cannot determine the real IP.
  // The server should inject this via a header or API response.
  return 'client-side';
}

/** Load the full audit chain from localStorage */
function loadAuditChain(): PHIAuditEntry[] {
  try {
    const stored = localStorage.getItem(HIPAA_AUDIT_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PHIAuditEntry[];
  } catch {
    console.error('[HIPAA-AUDIT] Failed to load audit chain from storage');
    return [];
  }
}

/** Save the audit chain to localStorage (append-only, trimmed to max) */
function saveAuditChain(chain: PHIAuditEntry[]): void {
  try {
    const trimmed = chain.slice(-HIPAA_AUDIT_MAX_LOCAL_ENTRIES);
    localStorage.setItem(HIPAA_AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[HIPAA-AUDIT] Failed to save audit chain:', error);
  }
}

/** Get the hash of the last entry in the chain (or genesis hash if empty) */
function getLastHash(chain: PHIAuditEntry[]): string {
  if (chain.length === 0) return GENESIS_HASH;
  return chain[chain.length - 1].entryHash;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Log a PHI access event to the tamper-evident audit chain.
 *
 * This is the primary logging function. Every PHI access, authentication event,
 * or permission change should be logged through this function.
 *
 * @example
 * ```ts
 * await logPHIAccess({
 *   eventType: 'VIEW_RECORD',
 *   userId: 'user_123',
 *   userRole: 'provider',
 *   userEmail: 'dr.smith@clinic.com',
 *   resourceType: 'care_plan',
 *   resourceId: 'cp_456',
 *   childId: 'child_789',
 *   screenContext: 'care-plan-detail',
 *   actionDescription: 'Viewed care plan for quarterly review',
 * });
 * ```
 */
export async function logPHIAccess(input: PHIAuditInput): Promise<PHIAuditEntry> {
  const chain = loadAuditChain();
  const previousHash = getLastHash(chain);

  const partialEntry: Omit<PHIAuditEntry, 'entryHash'> = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    eventType: input.eventType,
    userId: input.userId,
    userRole: input.userRole,
    userEmail: input.userEmail,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    childId: input.childId,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
    screenContext: input.screenContext,
    actionDescription: input.actionDescription,
    sensitivity: input.sensitivity ?? 'standard',
    success: input.success ?? true,
    errorMessage: input.errorMessage,
    sessionId: getSessionId(),
    previousHash,
  };

  const entryHash = await hashEntry(partialEntry);
  const entry: PHIAuditEntry = { ...partialEntry, entryHash };

  chain.push(entry);
  saveAuditChain(chain);

  // Durable server-side write — fire-and-forget so UI is never blocked.
  // Writes to audit_log table (migration 007). If the table doesn't exist yet,
  // the error is caught silently — localStorage chain remains the fallback.
  supabase.from('audit_log').insert({
    event_type: entry.eventType,
    // Live table requires NOT NULL `action` + `details` (schema-gap migration
    // 20260607 added the event_type/… columns alongside the original
    // action/details ones). Without these two, EVERY insert 400s and the
    // HIPAA trail silently drops to localStorage-only.
    action: entry.eventType,
    details: {
      description: entry.actionDescription,
      screen: entry.screenContext ?? null,
      sensitivity: entry.sensitivity ?? null,
    },
    user_id: entry.userId === 'unknown' ? null : entry.userId,
    user_role: entry.userRole,
    user_email: entry.userEmail,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    child_id: entry.childId ?? null,
    screen_context: entry.screenContext,
    action_description: entry.actionDescription,
    sensitivity: entry.sensitivity,
    success: entry.success,
    error_message: entry.errorMessage ?? null,
    session_id: entry.sessionId,
    entry_hash: entry.entryHash,
    previous_hash: entry.previousHash,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
  }).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn('[HIPAA-AUDIT] Supabase write failed (localStorage preserved):', error.message);
    }
  });

  // Console log in development
  if (import.meta.env.DEV) {
    console.log('[HIPAA-AUDIT]', {
      event: entry.eventType,
      user: entry.userId,
      resource: `${entry.resourceType}:${entry.resourceId}`,
      hash: entry.entryHash.substring(0, 12) + '...',
    });
  }

  return entry;
}

/**
 * Query the audit trail with optional filters.
 *
 * Returns entries sorted by timestamp descending (newest first).
 * Supports pagination via `limit` and `offset`.
 *
 * @example
 * ```ts
 * const trail = getAuditTrail({
 *   userId: 'user_123',
 *   eventTypes: ['VIEW_RECORD', 'EDIT_RECORD'],
 *   startDate: '2026-01-01T00:00:00Z',
 *   limit: 50,
 * });
 * ```
 */
export function getAuditTrail(filters?: PHIAuditFilters): PHIAuditEntry[] {
  let chain = loadAuditChain();

  if (filters) {
    if (filters.userId) {
      chain = chain.filter(e => e.userId === filters.userId);
    }
    if (filters.userRole) {
      chain = chain.filter(e => e.userRole === filters.userRole);
    }
    if (filters.eventType) {
      chain = chain.filter(e => e.eventType === filters.eventType);
    }
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      chain = chain.filter(e => filters.eventTypes!.includes(e.eventType));
    }
    if (filters.resourceType) {
      chain = chain.filter(e => e.resourceType === filters.resourceType);
    }
    if (filters.resourceId) {
      chain = chain.filter(e => e.resourceId === filters.resourceId);
    }
    if (filters.childId) {
      chain = chain.filter(e => e.childId === filters.childId);
    }
    if (filters.sensitivity) {
      chain = chain.filter(e => e.sensitivity === filters.sensitivity);
    }
    if (filters.success !== undefined) {
      chain = chain.filter(e => e.success === filters.success);
    }
    if (filters.startDate) {
      chain = chain.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      chain = chain.filter(e => e.timestamp <= filters.endDate!);
    }
    if (filters.screenContext) {
      chain = chain.filter(e => e.screenContext === filters.screenContext);
    }
  }

  // Sort newest first
  chain.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Pagination
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? chain.length;
  chain = chain.slice(offset, offset + limit);

  return chain;
}

/**
 * Verify the integrity of the audit chain.
 *
 * Walks the chain from the beginning, recomputing each entry's hash
 * and verifying that `previousHash` links match. Returns details
 * about any broken links found.
 */
export async function verifyChainIntegrity(): Promise<{
  verified: boolean;
  totalEntries: number;
  brokenLinks: number;
  firstBrokenAt?: string;
  details: Array<{ index: number; entryId: string; expected: string; actual: string }>;
}> {
  const chain = loadAuditChain();
  const brokenDetails: Array<{ index: number; entryId: string; expected: string; actual: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    // Verify previousHash link
    const expectedPrev = i === 0 ? GENESIS_HASH : chain[i - 1].entryHash;
    if (entry.previousHash !== expectedPrev) {
      brokenDetails.push({
        index: i,
        entryId: entry.id,
        expected: expectedPrev,
        actual: entry.previousHash,
      });
    }

    // Verify entry's own hash
    const { entryHash: _storedHash, ...rest } = entry;
    const recomputedHash = await hashEntry(rest);
    if (recomputedHash !== _storedHash) {
      brokenDetails.push({
        index: i,
        entryId: entry.id,
        expected: recomputedHash,
        actual: _storedHash,
      });
    }
  }

  return {
    verified: brokenDetails.length === 0,
    totalEntries: chain.length,
    brokenLinks: brokenDetails.length,
    firstBrokenAt: brokenDetails.length > 0 ? chain[brokenDetails[0].index]?.timestamp : undefined,
    details: brokenDetails,
  };
}

/**
 * Generate a comprehensive compliance report for a given date range.
 *
 * This report is designed for a HIPAA compliance officer to review.
 * It includes event summaries, per-user activity, per-resource access,
 * chain integrity status, and risk indicators.
 *
 * @example
 * ```ts
 * const report = await generateComplianceReport({
 *   start: '2026-01-01T00:00:00Z',
 *   end: '2026-03-31T23:59:59Z',
 * });
 * ```
 */
export async function generateComplianceReport(dateRange: {
  start: string;
  end: string;
}): Promise<ComplianceReport> {
  const events = getAuditTrail({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // --- Summary ---
  const uniqueUserIds = new Set(events.map(e => e.userId));
  const summary = {
    totalEvents: events.length,
    uniqueUsers: uniqueUserIds.size,
    phiViewEvents: events.filter(e => e.eventType === 'VIEW_RECORD').length,
    phiEditEvents: events.filter(e => e.eventType === 'EDIT_RECORD').length,
    phiExportEvents: events.filter(e => e.eventType === 'EXPORT_DATA').length,
    phiShareEvents: events.filter(e => e.eventType === 'SHARE_RECORD').length,
    phiDeleteEvents: events.filter(e => e.eventType === 'DELETE_RECORD').length,
    failedLogins: events.filter(e => e.eventType === 'FAILED_LOGIN').length,
    sessionTimeouts: events.filter(e => e.eventType === 'SESSION_TIMEOUT').length,
    permissionChanges: events.filter(e => e.eventType === 'PERMISSION_CHANGE').length,
    highSensitivityAccesses: events.filter(e => e.sensitivity === 'highly_sensitive').length,
  };

  // --- Events by User ---
  const userMap = new Map<string, {
    userId: string;
    userEmail: string;
    userRole: string;
    events: PHIAuditEntry[];
  }>();
  for (const event of events) {
    const existing = userMap.get(event.userId);
    if (existing) {
      existing.events.push(event);
    } else {
      userMap.set(event.userId, {
        userId: event.userId,
        userEmail: event.userEmail,
        userRole: event.userRole,
        events: [event],
      });
    }
  }
  const eventsByUser = Array.from(userMap.values()).map(u => {
    const typeCounts: Record<string, number> = {};
    for (const e of u.events) {
      typeCounts[e.eventType] = (typeCounts[e.eventType] || 0) + 1;
    }
    return {
      userId: u.userId,
      userEmail: u.userEmail,
      userRole: u.userRole,
      eventCount: u.events.length,
      lastActivity: u.events[0]?.timestamp ?? '',
      eventTypes: typeCounts,
    };
  });

  // --- Events by Resource ---
  const resourceMap = new Map<string, { type: string; count: number; users: Set<string>; lastAccess: string }>();
  for (const event of events) {
    const existing = resourceMap.get(event.resourceType);
    if (existing) {
      existing.count++;
      existing.users.add(event.userId);
      if (event.timestamp > existing.lastAccess) {
        existing.lastAccess = event.timestamp;
      }
    } else {
      resourceMap.set(event.resourceType, {
        type: event.resourceType,
        count: 1,
        users: new Set([event.userId]),
        lastAccess: event.timestamp,
      });
    }
  }
  const eventsByResource = Array.from(resourceMap.values()).map(r => ({
    resourceType: r.type,
    accessCount: r.count,
    uniqueUsers: r.users.size,
    lastAccess: r.lastAccess,
  }));

  // --- Chain Integrity ---
  const integrity = await verifyChainIntegrity();
  const chainIntegrity = {
    verified: integrity.verified,
    totalEntries: integrity.totalEntries,
    brokenLinks: integrity.brokenLinks,
    firstBrokenAt: integrity.firstBrokenAt,
  };

  // --- Risk Indicators ---
  const riskIndicators: ComplianceReport['riskIndicators'] = [];

  // Failed login attempts
  if (summary.failedLogins > 10) {
    riskIndicators.push({
      indicator: 'Excessive Failed Logins',
      severity: summary.failedLogins > 50 ? 'critical' : 'high',
      description: `${summary.failedLogins} failed login attempts in reporting period. May indicate brute-force attack.`,
      count: summary.failedLogins,
    });
  } else if (summary.failedLogins > 3) {
    riskIndicators.push({
      indicator: 'Elevated Failed Logins',
      severity: 'medium',
      description: `${summary.failedLogins} failed login attempts detected.`,
      count: summary.failedLogins,
    });
  }

  // High-sensitivity accesses
  if (summary.highSensitivityAccesses > 0) {
    riskIndicators.push({
      indicator: 'Highly Sensitive Data Access',
      severity: summary.highSensitivityAccesses > 20 ? 'high' : 'medium',
      description: `${summary.highSensitivityAccesses} accesses to highly sensitive data. Verify all were authorized.`,
      count: summary.highSensitivityAccesses,
    });
  }

  // Data exports
  if (summary.phiExportEvents > 5) {
    riskIndicators.push({
      indicator: 'Frequent Data Exports',
      severity: summary.phiExportEvents > 20 ? 'high' : 'medium',
      description: `${summary.phiExportEvents} data export operations. Review for potential data exfiltration.`,
      count: summary.phiExportEvents,
    });
  }

  // Data deletion
  if (summary.phiDeleteEvents > 0) {
    riskIndicators.push({
      indicator: 'PHI Deletion Events',
      severity: summary.phiDeleteEvents > 5 ? 'high' : 'medium',
      description: `${summary.phiDeleteEvents} PHI records deleted. Verify compliance with retention policies.`,
      count: summary.phiDeleteEvents,
    });
  }

  // Chain integrity failure
  if (!chainIntegrity.verified) {
    riskIndicators.push({
      indicator: 'Audit Chain Integrity Failure',
      severity: 'critical',
      description: `${chainIntegrity.brokenLinks} broken links detected in audit chain. Possible tampering.`,
      count: chainIntegrity.brokenLinks,
    });
  }

  // Permission changes
  if (summary.permissionChanges > 10) {
    riskIndicators.push({
      indicator: 'Frequent Permission Changes',
      severity: 'medium',
      description: `${summary.permissionChanges} permission changes. Review for privilege escalation.`,
      count: summary.permissionChanges,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    dateRange,
    summary,
    eventsByUser,
    eventsByResource,
    chainIntegrity,
    riskIndicators,
  };
}

/**
 * Export the raw audit trail as a JSON string for external archival.
 * Includes chain integrity verification metadata.
 */
export async function exportAuditTrail(filters?: PHIAuditFilters): Promise<string> {
  const entries = getAuditTrail(filters);
  const integrity = await verifyChainIntegrity();

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    chainIntegrity: {
      verified: integrity.verified,
      totalEntries: integrity.totalEntries,
      brokenLinks: integrity.brokenLinks,
    },
    entries,
  }, null, 2);
}

/**
 * Get total count of audit entries (without loading full data for filters).
 */
export function getAuditEntryCount(): number {
  return loadAuditChain().length;
}

/**
 * Convenience: log a VIEW_RECORD event.
 */
export async function logPHIView(
  userId: string,
  userRole: PHIAuditEntry['userRole'],
  userEmail: string,
  resourceType: string,
  resourceId: string,
  screenContext: string,
  childId?: string,
): Promise<PHIAuditEntry> {
  return logPHIAccess({
    eventType: 'VIEW_RECORD',
    userId,
    userRole,
    userEmail,
    resourceType,
    resourceId,
    childId,
    screenContext,
    actionDescription: `Viewed ${resourceType} record`,
    sensitivity: 'standard',
  });
}

/**
 * Convenience: log a LOGIN event.
 */
export async function logPHILogin(
  userId: string,
  userRole: PHIAuditEntry['userRole'],
  userEmail: string,
  method: string,
): Promise<PHIAuditEntry> {
  return logPHIAccess({
    eventType: 'LOGIN',
    userId,
    userRole,
    userEmail,
    resourceType: 'user_account',
    resourceId: userId,
    screenContext: 'login',
    actionDescription: `User logged in via ${method}`,
  });
}

/**
 * Convenience: log a FAILED_LOGIN event.
 */
export async function logPHIFailedLogin(
  userEmail: string,
  reason: string,
): Promise<PHIAuditEntry> {
  return logPHIAccess({
    eventType: 'FAILED_LOGIN',
    userId: 'unknown',
    userRole: 'system',
    userEmail,
    resourceType: 'user_account',
    resourceId: 'unknown',
    screenContext: 'login',
    actionDescription: `Failed login attempt: ${reason}`,
    success: false,
    errorMessage: reason,
  });
}

/**
 * Convenience: log a SESSION_TIMEOUT event.
 */
export async function logPHISessionTimeout(
  userId: string,
  userRole: PHIAuditEntry['userRole'],
  userEmail: string,
  idleDurationMs: number,
): Promise<PHIAuditEntry> {
  return logPHIAccess({
    eventType: 'SESSION_TIMEOUT',
    userId,
    userRole,
    userEmail,
    resourceType: 'user_account',
    resourceId: userId,
    screenContext: 'session-manager',
    actionDescription: `Session timed out after ${Math.round(idleDurationMs / 1000 / 60)} minutes of inactivity`,
  });
}

export default {
  logPHIAccess,
  logPHIView,
  logPHILogin,
  logPHIFailedLogin,
  logPHISessionTimeout,
  getAuditTrail,
  verifyChainIntegrity,
  generateComplianceReport,
  exportAuditTrail,
  getAuditEntryCount,
};
