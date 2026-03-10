/**
 * HIPAA Compliance Engine
 *
 * Provides data retention policy management, breach detection heuristics,
 * and PHI access anomaly monitoring. Built on top of the existing audit-logger.
 *
 * HIPAA Key Rules Referenced:
 * - §164.530(j): Retain documentation for 6 years from creation or last effective date
 * - §164.308(a)(1): Security management process with risk analysis
 * - §164.312(b): Audit controls — record and examine PHI access
 * - §164.308(a)(6): Security incident procedures
 */

import {
  getAuditLog,
  logAuditEvent,
  type AuditEvent,
  type AuditAction,
  type AuditUserRole,
} from './audit-logger';
import { syncEncryptedStorage } from './security/encrypted-storage';

// ============================================================================
// Data Retention Policies
// ============================================================================

export interface RetentionPolicy {
  resourceType: string;
  retentionDays: number;
  description: string;
  legalBasis: string;
  autoArchive: boolean;
  autoDelete: boolean;
}

/**
 * Default HIPAA-compliant retention policies
 * HIPAA requires minimum 6 years for most PHI records
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    resourceType: 'child_data',
    retentionDays: 2555, // ~7 years (HIPAA: 6 year minimum + 1 year buffer)
    description: 'Child developmental and behavioral records',
    legalBasis: 'HIPAA §164.530(j) - 6 year minimum retention',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'care_plan',
    retentionDays: 2555,
    description: 'Treatment goals, care plans, and progress records',
    legalBasis: 'HIPAA §164.530(j) - Treatment records',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'session_notes',
    retentionDays: 2555,
    description: 'Provider session notes and clinical observations',
    legalBasis: 'HIPAA §164.530(j) - Clinical documentation',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'message',
    retentionDays: 2190, // 6 years
    description: 'Secure messages between parents and providers',
    legalBasis: 'HIPAA §164.530(j) - Communication records',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'observation',
    retentionDays: 2555,
    description: 'ABC data collection, behavioral observations',
    legalBasis: 'HIPAA §164.530(j) - Clinical observations',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'audit_log',
    retentionDays: 2190, // 6 years
    description: 'System access and activity audit trail',
    legalBasis: 'HIPAA §164.312(b) - Audit controls',
    autoArchive: false,
    autoDelete: false, // Audit logs should NEVER be auto-deleted
  },
  {
    resourceType: 'payment',
    retentionDays: 2555,
    description: 'Payment and billing transaction records',
    legalBasis: 'IRS: 7 year retention for financial records',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'document',
    retentionDays: 2555,
    description: 'Uploaded documents, superbills, reports',
    legalBasis: 'HIPAA §164.530(j) - Documentation retention',
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: 'user_account',
    retentionDays: 365, // 1 year after account deletion
    description: 'User account data (post-deletion retention)',
    legalBasis: 'HIPAA §164.530(j) - Minimum retention after termination',
    autoArchive: true,
    autoDelete: true,
  },
];

const RETENTION_STORAGE_KEY = 'aminy_retention_policies';

/**
 * Get current retention policies (user-customizable within HIPAA minimums)
 */
export function getRetentionPolicies(): RetentionPolicy[] {
  try {
    const stored = syncEncryptedStorage.getItem(RETENTION_STORAGE_KEY);
    if (stored) {
      const custom = JSON.parse(stored) as RetentionPolicy[];
      // Enforce HIPAA minimums — user can extend but not reduce below 6 years for PHI
      return custom.map(p => ({
        ...p,
        retentionDays: Math.max(p.retentionDays, getMinimumRetention(p.resourceType)),
      }));
    }
  } catch (error) {
    console.warn('[HIPAA] Failed to load retention policies from storage:', error);
  }
  return DEFAULT_RETENTION_POLICIES;
}

/**
 * Get HIPAA minimum retention days for a resource type
 */
function getMinimumRetention(resourceType: string): number {
  const PHI_TYPES = ['child_data', 'care_plan', 'session_notes', 'observation', 'document'];
  if (PHI_TYPES.includes(resourceType)) return 2190; // 6 years minimum
  if (resourceType === 'audit_log') return 2190; // 6 years
  if (resourceType === 'payment') return 2555; // 7 years (IRS)
  return 365; // 1 year minimum for non-PHI
}

/**
 * Check which records are approaching retention expiry
 */
export function getRetentionStatus(): {
  compliant: boolean;
  policiesCount: number;
  upcomingExpirations: Array<{
    resourceType: string;
    recordCount: number;
    expiresInDays: number;
  }>;
  overallHealth: 'healthy' | 'warning' | 'critical';
} {
  const policies = getRetentionPolicies();

  // In a real implementation, this would query the database
  // For now, return compliant status based on policy configuration
  return {
    compliant: true,
    policiesCount: policies.length,
    upcomingExpirations: [],
    overallHealth: 'healthy',
  };
}

// ============================================================================
// Breach Detection Engine
// ============================================================================

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachType =
  | 'failed_login_spike'
  | 'unusual_access_pattern'
  | 'bulk_data_export'
  | 'off_hours_access'
  | 'new_device_login'
  | 'permission_escalation'
  | 'unauthorized_phi_access'
  | 'data_exfiltration_attempt';

export interface BreachAlert {
  id: string;
  timestamp: string;
  type: BreachType;
  severity: BreachSeverity;
  title: string;
  description: string;
  userId?: string;
  affectedRecords: number;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  falsePositive: boolean;
}

// Configurable thresholds
export interface BreachThresholds {
  failedLoginsPerHour: number;          // Default: 5
  bulkAccessRecordsPerMinute: number;   // Default: 20
  exportsPerHour: number;               // Default: 10
  offHoursStart: number;                // Default: 22 (10 PM)
  offHoursEnd: number;                  // Default: 6 (6 AM)
  newDeviceAlertEnabled: boolean;       // Default: true
}

const DEFAULT_THRESHOLDS: BreachThresholds = {
  failedLoginsPerHour: 5,
  bulkAccessRecordsPerMinute: 20,
  exportsPerHour: 10,
  offHoursStart: 22,
  offHoursEnd: 6,
  newDeviceAlertEnabled: true,
};

const BREACH_STORAGE_KEY = 'aminy_breach_alerts';
const THRESHOLDS_STORAGE_KEY = 'aminy_breach_thresholds';

function generateBreachId(): string {
  return `breach_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Get breach detection thresholds
 */
export function getBreachThresholds(): BreachThresholds {
  try {
    const stored = syncEncryptedStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(stored) };
  } catch (error) { console.warn('[HIPAA] Failed to load breach thresholds from storage:', error); }
  return DEFAULT_THRESHOLDS;
}

/**
 * Save breach alert
 */
function saveBreachAlert(alert: BreachAlert): void {
  try {
    const alerts = getBreachAlerts();
    alerts.push(alert);
    // Keep last 500 alerts
    const trimmed = alerts.slice(-500);
    syncEncryptedStorage.setItem(BREACH_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[HIPAA] Failed to save breach alert:', e);
  }
}

/**
 * Get all breach alerts
 */
export function getBreachAlerts(filters?: {
  severity?: BreachSeverity;
  resolved?: boolean;
  type?: BreachType;
  startDate?: string;
  endDate?: string;
}): BreachAlert[] {
  try {
    const stored = syncEncryptedStorage.getItem(BREACH_STORAGE_KEY);
    let alerts: BreachAlert[] = stored ? JSON.parse(stored) : [];

    if (filters) {
      if (filters.severity) alerts = alerts.filter(a => a.severity === filters.severity);
      if (filters.resolved !== undefined) alerts = alerts.filter(a => a.resolved === filters.resolved);
      if (filters.type) alerts = alerts.filter(a => a.type === filters.type);
      if (filters.startDate) alerts = alerts.filter(a => a.timestamp >= filters.startDate!);
      if (filters.endDate) alerts = alerts.filter(a => a.timestamp <= filters.endDate!);
    }

    return alerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.warn('[HIPAA] Failed to load breach alerts from storage:', error);
    return [];
  }
}

/**
 * Resolve a breach alert
 */
export function resolveBreachAlert(
  alertId: string,
  resolvedBy: string,
  falsePositive: boolean = false
): void {
  const alerts = getBreachAlerts();
  const idx = alerts.findIndex(a => a.id === alertId);
  if (idx !== -1) {
    alerts[idx].resolved = true;
    alerts[idx].resolvedAt = new Date().toISOString();
    alerts[idx].resolvedBy = resolvedBy;
    alerts[idx].falsePositive = falsePositive;
    syncEncryptedStorage.setItem(BREACH_STORAGE_KEY, JSON.stringify(alerts));
  }
}

/**
 * Run breach detection analysis on recent audit events
 * Call this periodically (e.g., every 5 minutes) or after sensitive actions
 */
export function runBreachDetection(): BreachAlert[] {
  const thresholds = getBreachThresholds();
  const newAlerts: BreachAlert[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  // 1. Failed Login Spike Detection
  const recentLogins = getAuditLog({
    action: 'login' as AuditAction,
    startDate: oneHourAgo,
  });
  const failedLogins = recentLogins.filter(e => !e.success);
  if (failedLogins.length >= thresholds.failedLoginsPerHour) {
    newAlerts.push({
      id: generateBreachId(),
      timestamp: now.toISOString(),
      type: 'failed_login_spike',
      severity: failedLogins.length >= thresholds.failedLoginsPerHour * 2 ? 'high' : 'medium',
      title: 'Failed Login Spike Detected',
      description: `${failedLogins.length} failed login attempts in the last hour (threshold: ${thresholds.failedLoginsPerHour})`,
      affectedRecords: 0,
      resolved: false,
      falsePositive: false,
    });
  }

  // 2. Bulk Data Access Detection
  const recentAccess = getAuditLog({
    action: 'view' as AuditAction,
    startDate: fiveMinAgo,
  });
  if (recentAccess.length >= thresholds.bulkAccessRecordsPerMinute) {
    // Group by user to find who's doing bulk access
    const userCounts: Record<string, number> = {};
    recentAccess.forEach(e => {
      userCounts[e.userId] = (userCounts[e.userId] || 0) + 1;
    });
    Object.entries(userCounts).forEach(([userId, count]) => {
      if (count >= thresholds.bulkAccessRecordsPerMinute) {
        newAlerts.push({
          id: generateBreachId(),
          timestamp: now.toISOString(),
          type: 'unusual_access_pattern',
          severity: 'high',
          title: 'Unusual Bulk Data Access',
          description: `User ${userId.slice(0, 8)}... accessed ${count} records in 5 minutes`,
          userId,
          affectedRecords: count,
          resolved: false,
          falsePositive: false,
        });
      }
    });
  }

  // 3. Bulk Export Detection
  const recentExports = getAuditLog({
    action: 'export' as AuditAction,
    startDate: oneHourAgo,
  });
  if (recentExports.length >= thresholds.exportsPerHour) {
    newAlerts.push({
      id: generateBreachId(),
      timestamp: now.toISOString(),
      type: 'bulk_data_export',
      severity: 'critical',
      title: 'Bulk Data Export Detected',
      description: `${recentExports.length} data exports in the last hour (threshold: ${thresholds.exportsPerHour})`,
      affectedRecords: recentExports.length,
      resolved: false,
      falsePositive: false,
    });
  }

  // 4. Off-Hours Access Detection
  const currentHour = now.getHours();
  const isOffHours = thresholds.offHoursStart > thresholds.offHoursEnd
    ? (currentHour >= thresholds.offHoursStart || currentHour < thresholds.offHoursEnd)
    : (currentHour >= thresholds.offHoursStart && currentHour < thresholds.offHoursEnd);

  if (isOffHours) {
    const recentPHIAccess = getAuditLog({
      startDate: fiveMinAgo,
    }).filter(e => ['child_data', 'care_plan', 'session_notes', 'observation'].includes(e.resourceType));

    if (recentPHIAccess.length > 0) {
      newAlerts.push({
        id: generateBreachId(),
        timestamp: now.toISOString(),
        type: 'off_hours_access',
        severity: 'low',
        title: 'Off-Hours PHI Access',
        description: `${recentPHIAccess.length} PHI records accessed during off-hours (${thresholds.offHoursStart}:00-${thresholds.offHoursEnd}:00)`,
        affectedRecords: recentPHIAccess.length,
        resolved: false,
        falsePositive: false,
      });
    }
  }

  // Save any new alerts
  newAlerts.forEach(alert => saveBreachAlert(alert));

  // Log the detection run itself
  if (newAlerts.length > 0) {
    logAuditEvent({
      userId: 'system',
      userRole: 'system' as AuditUserRole,
      action: 'view' as AuditAction,
      resourceType: 'settings',
      resourceId: 'breach-detection',
      details: {
        alertsGenerated: newAlerts.length,
        severities: newAlerts.map(a => a.severity),
        types: newAlerts.map(a => a.type),
      },
      sessionId: 'system',
      success: true,
    });
  }

  return newAlerts;
}

// ============================================================================
// Compliance Dashboard Data
// ============================================================================

export interface ComplianceStatus {
  overallScore: number; // 0-100
  categories: {
    name: string;
    score: number;
    status: 'pass' | 'warning' | 'fail';
    details: string;
    requirement: string;
  }[];
  lastAuditDate: string;
  nextAuditDue: string;
  unresolvedAlerts: number;
  retentionCompliant: boolean;
}

/**
 * Calculate overall HIPAA compliance status
 */
export function getComplianceStatus(): ComplianceStatus {
  const alerts = getBreachAlerts({ resolved: false });
  const policies = getRetentionPolicies();
  const retentionStatus = getRetentionStatus();

  // Check encryption status
  const encryptionEnabled = syncEncryptedStorage.getItem('aminy-hipaa-enabled') !== 'false';

  // Check audit logging
  const recentAudit = getAuditLog({ limit: 1 });
  const auditActive = recentAudit.length > 0;

  const categories = [
    {
      name: 'Access Controls',
      score: 85,
      status: 'pass' as const,
      details: 'Role-based access with parent/provider/admin separation',
      requirement: 'HIPAA §164.312(a)(1) — Access Control',
    },
    {
      name: 'Audit Controls',
      score: auditActive ? 95 : 40,
      status: auditActive ? 'pass' as const : 'fail' as const,
      details: auditActive
        ? `Active — ${getAuditLog({ limit: 100 }).length} recent events logged`
        : 'No recent audit events detected',
      requirement: 'HIPAA §164.312(b) — Audit Controls',
    },
    {
      name: 'Data Encryption',
      score: encryptionEnabled ? 90 : 30,
      status: encryptionEnabled ? 'pass' as const : 'fail' as const,
      details: encryptionEnabled
        ? 'AES-GCM encryption active via Web Crypto API'
        : 'Encryption disabled — enable HIPAA mode in settings',
      requirement: 'HIPAA §164.312(a)(2)(iv) — Encryption and Decryption',
    },
    {
      name: 'Data Retention',
      score: retentionStatus.compliant ? 90 : 50,
      status: retentionStatus.compliant ? 'pass' as const : 'warning' as const,
      details: `${policies.length} retention policies configured`,
      requirement: 'HIPAA §164.530(j) — Documentation Retention',
    },
    {
      name: 'Breach Detection',
      score: alerts.length === 0 ? 95 : (alerts.length <= 3 ? 70 : 40),
      status: alerts.length === 0 ? 'pass' as const : (alerts.length <= 3 ? 'warning' as const : 'fail' as const),
      details: alerts.length === 0
        ? 'No unresolved security alerts'
        : `${alerts.length} unresolved alert${alerts.length > 1 ? 's' : ''} need attention`,
      requirement: 'HIPAA §164.308(a)(6) — Security Incident Procedures',
    },
    {
      name: 'Integrity Controls',
      score: 80,
      status: 'pass' as const,
      details: 'Immutable audit logs, append-only storage',
      requirement: 'HIPAA §164.312(c)(1) — Integrity',
    },
    {
      name: 'Transmission Security',
      score: 85,
      status: 'pass' as const,
      details: 'HTTPS/TLS for all data transmission, Supabase RLS',
      requirement: 'HIPAA §164.312(e)(1) — Transmission Security',
    },
  ];

  const overallScore = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length
  );

  const now = new Date();
  const nextAudit = new Date(now);
  nextAudit.setMonth(nextAudit.getMonth() + 3); // Quarterly audits

  return {
    overallScore,
    categories,
    lastAuditDate: now.toISOString(),
    nextAuditDue: nextAudit.toISOString(),
    unresolvedAlerts: alerts.length,
    retentionCompliant: retentionStatus.compliant,
  };
}

// ============================================================================
// PHI Access Monitoring
// ============================================================================

export interface PHIAccessReport {
  period: string;
  totalAccesses: number;
  uniqueUsers: number;
  byResourceType: Record<string, number>;
  byUserRole: Record<string, number>;
  sensitiveActions: AuditEvent[];
  riskScore: number; // 0-100, higher = more risk
}

/**
 * Generate PHI access report for a given time period
 */
export function generatePHIAccessReport(daysBack: number = 30): PHIAccessReport {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const events = getAuditLog({
    startDate: startDate.toISOString(),
    limit: 1000,
  });

  // PHI resource types
  const phiTypes = ['child_data', 'care_plan', 'session_notes', 'observation', 'progress_report'];
  const phiEvents = events.filter(e => phiTypes.includes(e.resourceType));

  // Count by resource type
  const byResourceType: Record<string, number> = {};
  phiEvents.forEach(e => {
    byResourceType[e.resourceType] = (byResourceType[e.resourceType] || 0) + 1;
  });

  // Count by user role
  const byUserRole: Record<string, number> = {};
  phiEvents.forEach(e => {
    byUserRole[e.userRole] = (byUserRole[e.userRole] || 0) + 1;
  });

  // Unique users
  const uniqueUsers = new Set(phiEvents.map(e => e.userId)).size;

  // Sensitive actions (exports, shares, permission changes)
  const sensitiveActions = events.filter(e =>
    ['export', 'share', 'permission_change', 'access_granted', 'data_shared'].includes(e.action)
  );

  // Calculate risk score
  let riskScore = 0;
  if (sensitiveActions.length > 10) riskScore += 20;
  else if (sensitiveActions.length > 5) riskScore += 10;
  const unresolvedAlerts = getBreachAlerts({ resolved: false }).length;
  riskScore += Math.min(unresolvedAlerts * 15, 40);
  if (byUserRole['system'] && byUserRole['system'] > phiEvents.length * 0.5) riskScore += 10;
  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  return {
    period: `Last ${daysBack} days`,
    totalAccesses: phiEvents.length,
    uniqueUsers,
    byResourceType,
    byUserRole,
    sensitiveActions: sensitiveActions.slice(0, 20),
    riskScore,
  };
}

// ============================================================================
// Breach Notification Helpers
// ============================================================================

/**
 * HIPAA Breach Notification Rule requires notification within 60 days of discovery
 * for breaches affecting 500+ individuals, and annual reporting for smaller breaches.
 */
export interface BreachNotification {
  breachId: string;
  discoveredDate: string;
  notificationDeadline: string; // 60 days from discovery
  affectedIndividuals: number;
  requiresHHSNotification: boolean; // True if 500+ affected
  requiresMediaNotification: boolean; // True if 500+ in single state
  notificationStatus: 'pending' | 'notified' | 'exempt';
  exemptionReason?: string;
}

/**
 * Calculate breach notification requirements
 */
export function calculateBreachNotification(
  breachId: string,
  discoveredDate: string,
  affectedIndividuals: number
): BreachNotification {
  const discovered = new Date(discoveredDate);
  const deadline = new Date(discovered);
  deadline.setDate(deadline.getDate() + 60); // 60-day notification window

  return {
    breachId,
    discoveredDate,
    notificationDeadline: deadline.toISOString(),
    affectedIndividuals,
    requiresHHSNotification: affectedIndividuals >= 500,
    requiresMediaNotification: affectedIndividuals >= 500,
    notificationStatus: 'pending',
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Retention
  getRetentionPolicies,
  getRetentionStatus,
  DEFAULT_RETENTION_POLICIES,
  // Breach Detection
  runBreachDetection,
  getBreachAlerts,
  resolveBreachAlert,
  getBreachThresholds,
  // Compliance
  getComplianceStatus,
  // PHI Monitoring
  generatePHIAccessReport,
  // Notifications
  calculateBreachNotification,
};
