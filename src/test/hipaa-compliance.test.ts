/**
 * HIPAA Compliance Engine Tests
 *
 * Comprehensive tests for data retention policies, breach detection,
 * PHI access monitoring, and breach notification calculations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE the module-under-test import
// ---------------------------------------------------------------------------

// In-memory stores used by the mock encrypted storage
let storageStore: Record<string, string> = {};

vi.mock('../lib/security/encrypted-storage', () => ({
  syncEncryptedStorage: {
    getItem: vi.fn((key: string) => storageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storageStore[key];
    }),
  },
}));

// Audit log entries the mock returns
let mockAuditLog: any[] = [];

vi.mock('../lib/audit-logger', () => ({
  getAuditLog: vi.fn((_filters?: any) => {
    let result = [...mockAuditLog];

    if (_filters) {
      if (_filters.action) {
        result = result.filter((e: any) => e.action === _filters.action);
      }
      if (_filters.startDate) {
        result = result.filter((e: any) => e.timestamp >= _filters.startDate);
      }
      if (_filters.endDate) {
        result = result.filter((e: any) => e.timestamp <= _filters.endDate);
      }
      if (_filters.limit) {
        result = result.slice(0, _filters.limit);
      }
    }

    return result;
  }),
  logAuditEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import {
  DEFAULT_RETENTION_POLICIES,
  getRetentionPolicies,
  getRetentionStatus,
  getBreachThresholds,
  getBreachAlerts,
  resolveBreachAlert,
  runBreachDetection,
  getComplianceStatus,
  generatePHIAccessReport,
  calculateBreachNotification,
  type RetentionPolicy,
  type BreachAlert,
} from '../lib/hipaa-compliance';

import { syncEncryptedStorage } from '../lib/security/encrypted-storage';
import { getAuditLog, logAuditEvent } from '../lib/audit-logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAuditEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId: 'user-test-123',
    userRole: 'parent',
    action: 'view',
    resourceType: 'child_data',
    resourceId: 'resource-456',
    details: {},
    sessionId: 'session-xyz',
    success: true,
    ...overrides,
  };
}

/** Seed the mock breach-alerts storage with the given alerts */
function seedBreachAlerts(alerts: BreachAlert[]) {
  storageStore['aminy_breach_alerts'] = JSON.stringify(alerts);
}

/** Build a minimal BreachAlert for testing */
function createBreachAlert(overrides: Partial<BreachAlert> = {}): BreachAlert {
  return {
    id: `breach_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    type: 'failed_login_spike',
    severity: 'medium',
    title: 'Test Alert',
    description: 'Test description',
    affectedRecords: 0,
    resolved: false,
    falsePositive: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  storageStore = {};
  mockAuditLog = [];
});

// ==========================================================================
// DEFAULT_RETENTION_POLICIES
// ==========================================================================

describe('DEFAULT_RETENTION_POLICIES', () => {
  it('should contain exactly 9 retention policies', () => {
    expect(DEFAULT_RETENTION_POLICIES).toHaveLength(9);
  });

  it('should include all expected resource types', () => {
    const types = DEFAULT_RETENTION_POLICIES.map(p => p.resourceType);
    expect(types).toContain('child_data');
    expect(types).toContain('care_plan');
    expect(types).toContain('session_notes');
    expect(types).toContain('message');
    expect(types).toContain('observation');
    expect(types).toContain('audit_log');
    expect(types).toContain('payment');
    expect(types).toContain('document');
    expect(types).toContain('user_account');
  });

  it('should enforce >= 2190-day retention for PHI resource types', () => {
    const phiTypes = ['child_data', 'care_plan', 'session_notes', 'observation', 'document'];
    phiTypes.forEach(type => {
      const policy = DEFAULT_RETENTION_POLICIES.find(p => p.resourceType === type);
      expect(policy).toBeDefined();
      expect(policy!.retentionDays).toBeGreaterThanOrEqual(2190);
    });
  });

  it('should enforce >= 2190-day retention for audit_log', () => {
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.resourceType === 'audit_log');
    expect(policy).toBeDefined();
    expect(policy!.retentionDays).toBeGreaterThanOrEqual(2190);
  });

  it('should enforce >= 2555-day retention for payment (IRS 7-year)', () => {
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.resourceType === 'payment');
    expect(policy).toBeDefined();
    expect(policy!.retentionDays).toBeGreaterThanOrEqual(2555);
  });

  it('should never auto-delete audit logs', () => {
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.resourceType === 'audit_log');
    expect(policy!.autoDelete).toBe(false);
  });

  it('should have legalBasis on every policy', () => {
    DEFAULT_RETENTION_POLICIES.forEach(policy => {
      expect(policy.legalBasis).toBeTruthy();
      expect(policy.legalBasis.length).toBeGreaterThan(0);
    });
  });
});

// ==========================================================================
// getRetentionPolicies
// ==========================================================================

describe('getRetentionPolicies', () => {
  it('should return default policies when storage is empty', () => {
    const policies = getRetentionPolicies();
    expect(policies).toEqual(DEFAULT_RETENTION_POLICIES);
  });

  it('should return custom policies from encrypted storage', () => {
    const custom: RetentionPolicy[] = DEFAULT_RETENTION_POLICIES.map(p => ({
      ...p,
      retentionDays: p.retentionDays + 365, // extend by one year
    }));
    storageStore['aminy_retention_policies'] = JSON.stringify(custom);

    const policies = getRetentionPolicies();
    policies.forEach(p => {
      const original = DEFAULT_RETENTION_POLICIES.find(d => d.resourceType === p.resourceType);
      expect(p.retentionDays).toBeGreaterThanOrEqual(original!.retentionDays);
    });
  });

  it('should enforce HIPAA minimums even when custom values are lower', () => {
    const tooShort: RetentionPolicy[] = [
      { ...DEFAULT_RETENTION_POLICIES[0], retentionDays: 30 }, // child_data at 30 days — way under HIPAA minimum
    ];
    storageStore['aminy_retention_policies'] = JSON.stringify(tooShort);

    const policies = getRetentionPolicies();
    const childData = policies.find(p => p.resourceType === 'child_data');
    expect(childData).toBeDefined();
    expect(childData!.retentionDays).toBeGreaterThanOrEqual(2190);
  });

  it('should enforce payment minimum even when custom value is lower', () => {
    const tooShort: RetentionPolicy[] = [
      { ...DEFAULT_RETENTION_POLICIES.find(p => p.resourceType === 'payment')!, retentionDays: 100 },
    ];
    storageStore['aminy_retention_policies'] = JSON.stringify(tooShort);

    const policies = getRetentionPolicies();
    const payment = policies.find(p => p.resourceType === 'payment');
    expect(payment).toBeDefined();
    expect(payment!.retentionDays).toBeGreaterThanOrEqual(2555);
  });

  it('should fall back to defaults when storage throws', () => {
    (syncEncryptedStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Storage unavailable');
    });
    const policies = getRetentionPolicies();
    expect(policies).toEqual(DEFAULT_RETENTION_POLICIES);
  });
});

// ==========================================================================
// getRetentionStatus
// ==========================================================================

describe('getRetentionStatus', () => {
  it('should return compliant status with correct policiesCount', () => {
    const status = getRetentionStatus();
    expect(status.compliant).toBe(true);
    expect(status.policiesCount).toBe(DEFAULT_RETENTION_POLICIES.length);
    expect(status.overallHealth).toBe('healthy');
  });

  it('should return upcomingExpirations as an array', () => {
    const status = getRetentionStatus();
    expect(Array.isArray(status.upcomingExpirations)).toBe(true);
  });
});

// ==========================================================================
// getBreachThresholds
// ==========================================================================

describe('getBreachThresholds', () => {
  it('should return correct defaults when storage is empty', () => {
    const thresholds = getBreachThresholds();
    expect(thresholds.failedLoginsPerHour).toBe(5);
    expect(thresholds.bulkAccessRecordsPerMinute).toBe(20);
    expect(thresholds.exportsPerHour).toBe(10);
    expect(thresholds.offHoursStart).toBe(22);
    expect(thresholds.offHoursEnd).toBe(6);
    expect(thresholds.newDeviceAlertEnabled).toBe(true);
  });

  it('should merge stored overrides with defaults', () => {
    storageStore['aminy_breach_thresholds'] = JSON.stringify({
      failedLoginsPerHour: 10,
    });
    const thresholds = getBreachThresholds();
    expect(thresholds.failedLoginsPerHour).toBe(10);
    // Other fields remain default
    expect(thresholds.bulkAccessRecordsPerMinute).toBe(20);
  });

  it('should fall back to defaults when storage throws', () => {
    (syncEncryptedStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Storage unavailable');
    });
    const thresholds = getBreachThresholds();
    expect(thresholds.failedLoginsPerHour).toBe(5);
  });
});

// ==========================================================================
// getBreachAlerts + filtering
// ==========================================================================

describe('getBreachAlerts', () => {
  it('should return empty array when no alerts stored', () => {
    const alerts = getBreachAlerts();
    expect(alerts).toEqual([]);
  });

  it('should return stored alerts sorted by timestamp descending', () => {
    const older = createBreachAlert({ timestamp: '2026-01-01T00:00:00Z' });
    const newer = createBreachAlert({ timestamp: '2026-03-01T00:00:00Z' });
    seedBreachAlerts([older, newer]);

    const alerts = getBreachAlerts();
    expect(alerts[0].timestamp).toBe(newer.timestamp);
    expect(alerts[1].timestamp).toBe(older.timestamp);
  });

  it('should filter by severity', () => {
    seedBreachAlerts([
      createBreachAlert({ severity: 'low' }),
      createBreachAlert({ severity: 'high' }),
      createBreachAlert({ severity: 'low' }),
    ]);

    const alerts = getBreachAlerts({ severity: 'low' });
    expect(alerts).toHaveLength(2);
    alerts.forEach(a => expect(a.severity).toBe('low'));
  });

  it('should filter by resolved status', () => {
    seedBreachAlerts([
      createBreachAlert({ resolved: false }),
      createBreachAlert({ resolved: true }),
    ]);

    const unresolved = getBreachAlerts({ resolved: false });
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].resolved).toBe(false);
  });

  it('should filter by breach type', () => {
    seedBreachAlerts([
      createBreachAlert({ type: 'bulk_data_export' }),
      createBreachAlert({ type: 'off_hours_access' }),
      createBreachAlert({ type: 'bulk_data_export' }),
    ]);

    const filtered = getBreachAlerts({ type: 'bulk_data_export' });
    expect(filtered).toHaveLength(2);
    filtered.forEach(a => expect(a.type).toBe('bulk_data_export'));
  });

  it('should filter by date range', () => {
    seedBreachAlerts([
      createBreachAlert({ timestamp: '2026-01-15T00:00:00Z' }),
      createBreachAlert({ timestamp: '2026-02-15T00:00:00Z' }),
      createBreachAlert({ timestamp: '2026-03-15T00:00:00Z' }),
    ]);

    const filtered = getBreachAlerts({
      startDate: '2026-02-01T00:00:00Z',
      endDate: '2026-02-28T23:59:59Z',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].timestamp).toBe('2026-02-15T00:00:00Z');
  });

  it('should return empty array when storage throws', () => {
    (syncEncryptedStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('Corrupted');
    });
    const alerts = getBreachAlerts();
    expect(alerts).toEqual([]);
  });
});

// ==========================================================================
// resolveBreachAlert
// ==========================================================================

describe('resolveBreachAlert', () => {
  it('should mark an alert as resolved', () => {
    const alert = createBreachAlert({ id: 'breach-resolve-test' });
    seedBreachAlerts([alert]);

    resolveBreachAlert('breach-resolve-test', 'admin-user');

    // The function writes back to storage — read what was saved
    const savedCall = (syncEncryptedStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'aminy_breach_alerts'
    );
    expect(savedCall).toBeDefined();
    const saved: BreachAlert[] = JSON.parse(savedCall![1]);
    const resolved = saved.find(a => a.id === 'breach-resolve-test');
    expect(resolved).toBeDefined();
    expect(resolved!.resolved).toBe(true);
    expect(resolved!.resolvedBy).toBe('admin-user');
    expect(resolved!.resolvedAt).toBeTruthy();
  });

  it('should mark an alert as false positive when specified', () => {
    const alert = createBreachAlert({ id: 'breach-fp-test' });
    seedBreachAlerts([alert]);

    resolveBreachAlert('breach-fp-test', 'admin-user', true);

    const savedCall = (syncEncryptedStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'aminy_breach_alerts'
    );
    const saved: BreachAlert[] = JSON.parse(savedCall![1]);
    const resolved = saved.find(a => a.id === 'breach-fp-test');
    expect(resolved!.falsePositive).toBe(true);
  });

  it('should not crash when alert ID not found', () => {
    seedBreachAlerts([createBreachAlert({ id: 'exists' })]);
    // Should not throw
    expect(() => resolveBreachAlert('non-existent-id', 'admin')).not.toThrow();
  });
});

// ==========================================================================
// runBreachDetection
// ==========================================================================

describe('runBreachDetection', () => {
  it('should return no alerts when audit log is clean', () => {
    mockAuditLog = [];
    const alerts = runBreachDetection();
    expect(alerts).toHaveLength(0);
  });

  it('should detect failed login spike when count >= threshold', () => {
    const now = new Date();
    // Generate 5 failed logins in the last hour (threshold default = 5)
    mockAuditLog = Array.from({ length: 5 }, (_, i) =>
      createMockAuditEvent({
        action: 'login',
        resourceType: 'user_account',
        success: false,
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
      })
    );

    const alerts = runBreachDetection();
    const loginAlerts = alerts.filter(a => a.type === 'failed_login_spike');
    expect(loginAlerts.length).toBeGreaterThanOrEqual(1);
    expect(loginAlerts[0].severity).toBe('medium');
  });

  it('should flag high severity when failed logins >= 2x threshold', () => {
    const now = new Date();
    // Generate 10 failed logins (2x the default threshold of 5)
    mockAuditLog = Array.from({ length: 10 }, (_, i) =>
      createMockAuditEvent({
        action: 'login',
        resourceType: 'user_account',
        success: false,
        timestamp: new Date(now.getTime() - i * 30000).toISOString(),
      })
    );

    const alerts = runBreachDetection();
    const loginAlerts = alerts.filter(a => a.type === 'failed_login_spike');
    expect(loginAlerts.length).toBeGreaterThanOrEqual(1);
    expect(loginAlerts[0].severity).toBe('high');
  });

  it('should detect bulk data access when >= 20 view records in 5 min', () => {
    const now = new Date();
    mockAuditLog = Array.from({ length: 25 }, (_, i) =>
      createMockAuditEvent({
        action: 'view',
        userId: 'bulk-user',
        resourceType: 'child_data',
        timestamp: new Date(now.getTime() - i * 10000).toISOString(), // within 5 min
      })
    );

    const alerts = runBreachDetection();
    const bulkAlerts = alerts.filter(a => a.type === 'unusual_access_pattern');
    expect(bulkAlerts.length).toBeGreaterThanOrEqual(1);
    expect(bulkAlerts[0].severity).toBe('high');
    expect(bulkAlerts[0].affectedRecords).toBeGreaterThanOrEqual(20);
  });

  it('should detect bulk data exports when >= 10 in an hour', () => {
    const now = new Date();
    mockAuditLog = Array.from({ length: 12 }, (_, i) =>
      createMockAuditEvent({
        action: 'export',
        resourceType: 'child_data',
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
      })
    );

    const alerts = runBreachDetection();
    const exportAlerts = alerts.filter(a => a.type === 'bulk_data_export');
    expect(exportAlerts.length).toBeGreaterThanOrEqual(1);
    expect(exportAlerts[0].severity).toBe('critical');
  });

  it('should detect off-hours PHI access when current hour is in off-hours', () => {
    const now = new Date();
    // Force "now" to be 23:00 (within default off-hours 22-6)
    vi.useFakeTimers();
    const offHoursDate = new Date();
    offHoursDate.setHours(23, 0, 0, 0);
    vi.setSystemTime(offHoursDate);

    mockAuditLog = [
      createMockAuditEvent({
        action: 'view',
        resourceType: 'child_data',
        timestamp: new Date(offHoursDate.getTime() - 60000).toISOString(),
      }),
    ];

    const alerts = runBreachDetection();
    const offHoursAlerts = alerts.filter(a => a.type === 'off_hours_access');
    expect(offHoursAlerts.length).toBeGreaterThanOrEqual(1);
    expect(offHoursAlerts[0].severity).toBe('low');

    vi.useRealTimers();
  });

  it('should log an audit event when new alerts are generated', () => {
    const now = new Date();
    mockAuditLog = Array.from({ length: 5 }, (_, i) =>
      createMockAuditEvent({
        action: 'login',
        success: false,
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
      })
    );

    runBreachDetection();
    expect(logAuditEvent).toHaveBeenCalled();
  });

  it('should NOT log an audit event when no alerts generated', () => {
    mockAuditLog = [];
    runBreachDetection();
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('should save new alerts to encrypted storage', () => {
    const now = new Date();
    mockAuditLog = Array.from({ length: 12 }, (_, i) =>
      createMockAuditEvent({
        action: 'export',
        resourceType: 'child_data',
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
      })
    );

    runBreachDetection();

    // saveBreachAlert calls syncEncryptedStorage.setItem internally
    expect(syncEncryptedStorage.setItem).toHaveBeenCalledWith(
      'aminy_breach_alerts',
      expect.any(String)
    );
  });
});

// ==========================================================================
// getComplianceStatus
// ==========================================================================

describe('getComplianceStatus', () => {
  it('should return 7 compliance categories', () => {
    const status = getComplianceStatus();
    expect(status.categories).toHaveLength(7);
  });

  it('should include all required category names', () => {
    const status = getComplianceStatus();
    const names = status.categories.map(c => c.name);
    expect(names).toContain('Access Controls');
    expect(names).toContain('Audit Controls');
    expect(names).toContain('Data Encryption');
    expect(names).toContain('Data Retention');
    expect(names).toContain('Breach Detection');
    expect(names).toContain('Integrity Controls');
    expect(names).toContain('Transmission Security');
  });

  it('should calculate overall score as average of category scores', () => {
    // We provide a clean state so audit comes back with some data
    mockAuditLog = [createMockAuditEvent()];
    storageStore['aminy-hipaa-enabled'] = 'true';

    const status = getComplianceStatus();
    const expectedAvg = Math.round(
      status.categories.reduce((sum, c) => sum + c.score, 0) / status.categories.length
    );
    expect(status.overallScore).toBe(expectedAvg);
  });

  it('should report retention compliant', () => {
    const status = getComplianceStatus();
    expect(status.retentionCompliant).toBe(true);
  });

  it('should have nextAuditDue approximately 3 months from lastAuditDate', () => {
    const status = getComplianceStatus();
    const lastAudit = new Date(status.lastAuditDate);
    const nextAudit = new Date(status.nextAuditDue);
    const diffMs = nextAudit.getTime() - lastAudit.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // 3 months is roughly 89-92 days
    expect(diffDays).toBeGreaterThanOrEqual(85);
    expect(diffDays).toBeLessThanOrEqual(95);
  });

  it('should count unresolved alerts', () => {
    seedBreachAlerts([
      createBreachAlert({ resolved: false }),
      createBreachAlert({ resolved: true }),
      createBreachAlert({ resolved: false }),
    ]);

    const status = getComplianceStatus();
    expect(status.unresolvedAlerts).toBe(2);
  });

  it('should mark Breach Detection as warning when 1-3 unresolved alerts exist', () => {
    seedBreachAlerts([
      createBreachAlert({ resolved: false }),
      createBreachAlert({ resolved: false }),
    ]);

    const status = getComplianceStatus();
    const breachCategory = status.categories.find(c => c.name === 'Breach Detection');
    expect(breachCategory).toBeDefined();
    expect(breachCategory!.status).toBe('warning');
    expect(breachCategory!.score).toBe(70);
  });

  it('should mark Audit Controls as fail when no recent events exist', () => {
    mockAuditLog = [];
    const status = getComplianceStatus();
    const auditCategory = status.categories.find(c => c.name === 'Audit Controls');
    expect(auditCategory).toBeDefined();
    expect(auditCategory!.status).toBe('fail');
    expect(auditCategory!.score).toBe(40);
  });

  it('should mark Data Encryption as fail when encryption is disabled', () => {
    storageStore['aminy-hipaa-enabled'] = 'false';
    const status = getComplianceStatus();
    const encCategory = status.categories.find(c => c.name === 'Data Encryption');
    expect(encCategory).toBeDefined();
    expect(encCategory!.status).toBe('fail');
    expect(encCategory!.score).toBe(30);
  });
});

// ==========================================================================
// generatePHIAccessReport
// ==========================================================================

describe('generatePHIAccessReport', () => {
  it('should return zero counts when audit log is empty', () => {
    mockAuditLog = [];
    const report = generatePHIAccessReport();
    expect(report.totalAccesses).toBe(0);
    expect(report.uniqueUsers).toBe(0);
    expect(report.riskScore).toBe(0);
  });

  it('should count only PHI resource types', () => {
    mockAuditLog = [
      createMockAuditEvent({ resourceType: 'child_data' }),
      createMockAuditEvent({ resourceType: 'care_plan' }),
      createMockAuditEvent({ resourceType: 'payment' }), // not PHI
      createMockAuditEvent({ resourceType: 'user_account' }), // not PHI
    ];

    const report = generatePHIAccessReport();
    expect(report.totalAccesses).toBe(2);
    expect(report.byResourceType['child_data']).toBe(1);
    expect(report.byResourceType['care_plan']).toBe(1);
    expect(report.byResourceType['payment']).toBeUndefined();
  });

  it('should count unique users correctly', () => {
    mockAuditLog = [
      createMockAuditEvent({ userId: 'user-A', resourceType: 'child_data' }),
      createMockAuditEvent({ userId: 'user-A', resourceType: 'session_notes' }),
      createMockAuditEvent({ userId: 'user-B', resourceType: 'observation' }),
    ];

    const report = generatePHIAccessReport();
    expect(report.uniqueUsers).toBe(2);
  });

  it('should track by user role', () => {
    mockAuditLog = [
      createMockAuditEvent({ userRole: 'parent', resourceType: 'child_data' }),
      createMockAuditEvent({ userRole: 'provider', resourceType: 'care_plan' }),
      createMockAuditEvent({ userRole: 'provider', resourceType: 'session_notes' }),
    ];

    const report = generatePHIAccessReport();
    expect(report.byUserRole['parent']).toBe(1);
    expect(report.byUserRole['provider']).toBe(2);
  });

  it('should identify sensitive actions (export, share, etc.)', () => {
    mockAuditLog = [
      createMockAuditEvent({ action: 'export', resourceType: 'child_data' }),
      createMockAuditEvent({ action: 'share', resourceType: 'care_plan' }),
      createMockAuditEvent({ action: 'view', resourceType: 'child_data' }),
    ];

    const report = generatePHIAccessReport();
    expect(report.sensitiveActions).toHaveLength(2);
  });

  it('should increase risk score based on sensitive action count', () => {
    // More than 10 sensitive actions should add 20 to risk score
    mockAuditLog = Array.from({ length: 12 }, (_, i) =>
      createMockAuditEvent({
        action: 'export',
        resourceType: 'child_data',
        userId: `user-${i}`,
      })
    );

    const report = generatePHIAccessReport();
    expect(report.riskScore).toBeGreaterThanOrEqual(20);
  });

  it('should increase risk score based on unresolved breach alerts', () => {
    seedBreachAlerts([
      createBreachAlert({ resolved: false }),
      createBreachAlert({ resolved: false }),
    ]);
    mockAuditLog = [createMockAuditEvent({ resourceType: 'child_data' })];

    const report = generatePHIAccessReport();
    // 2 unresolved alerts * 15 = 30
    expect(report.riskScore).toBeGreaterThanOrEqual(30);
  });

  it('should cap risk score at 100', () => {
    // Lots of sensitive actions + lots of unresolved alerts
    seedBreachAlerts(
      Array.from({ length: 10 }, () => createBreachAlert({ resolved: false }))
    );
    mockAuditLog = Array.from({ length: 15 }, () =>
      createMockAuditEvent({ action: 'export', resourceType: 'child_data' })
    );

    const report = generatePHIAccessReport();
    expect(report.riskScore).toBeLessThanOrEqual(100);
  });

  it('should respect daysBack parameter in period label', () => {
    mockAuditLog = [];
    const report = generatePHIAccessReport(7);
    expect(report.period).toBe('Last 7 days');
  });
});

// ==========================================================================
// calculateBreachNotification
// ==========================================================================

describe('calculateBreachNotification', () => {
  it('should set notification deadline 60 days from discovery', () => {
    const discoveredDate = '2026-01-15T00:00:00Z';
    const notification = calculateBreachNotification('breach-001', discoveredDate, 50);

    const discovered = new Date(discoveredDate);
    const deadline = new Date(notification.notificationDeadline);
    const diffDays = Math.round((deadline.getTime() - discovered.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(60);
  });

  it('should require HHS notification when 500+ individuals affected', () => {
    const notification = calculateBreachNotification('breach-002', '2026-03-01T00:00:00Z', 500);
    expect(notification.requiresHHSNotification).toBe(true);
    expect(notification.requiresMediaNotification).toBe(true);
  });

  it('should NOT require HHS notification when fewer than 500 affected', () => {
    const notification = calculateBreachNotification('breach-003', '2026-03-01T00:00:00Z', 499);
    expect(notification.requiresHHSNotification).toBe(false);
    expect(notification.requiresMediaNotification).toBe(false);
  });

  it('should start in pending notification status', () => {
    const notification = calculateBreachNotification('breach-004', '2026-03-01T00:00:00Z', 10);
    expect(notification.notificationStatus).toBe('pending');
  });

  it('should preserve breachId and discoveredDate', () => {
    const notification = calculateBreachNotification('my-breach-id', '2026-06-15T12:00:00Z', 100);
    expect(notification.breachId).toBe('my-breach-id');
    expect(notification.discoveredDate).toBe('2026-06-15T12:00:00Z');
  });

  it('should correctly report affectedIndividuals count', () => {
    const notification = calculateBreachNotification('breach-005', '2026-03-01T00:00:00Z', 1234);
    expect(notification.affectedIndividuals).toBe(1234);
  });
});
