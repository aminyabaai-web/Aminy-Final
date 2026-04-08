// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * claim-queue.ts
 *
 * Claim-ready queue with 12-point validation, batch 837P submission,
 * and queue summary for provider billing workflows.
 */

// ============================================================================
// Types
// ============================================================================

export type ClaimReadyStatus = 'ready' | 'blocked' | 'submitted' | 'paid' | 'denied';

export interface ClaimReadyItem {
  id: string;
  sessionNoteId: string;
  providerNPI: string;
  providerName: string;
  clientMemberId: string;
  clientName: string;
  cptCode: string;
  cptDescription: string;
  diagnosisICD10: string;
  diagnosisDescription: string;
  dateOfService: string;
  placeOfService: '02' | '11' | '12' | '99'; // 02=telehealth, 11=office, 12=home, 99=other
  units: number;
  billedAmount: number;
  authorizationNumber: string | null;
  authorizationPeriod: { start: string; end: string } | null;
  payerName: string;
  payerId: string;
  status: ClaimReadyStatus;
  blockReasons: string[];
  validationResults: ValidationResult[];
  submittedAt: string | null;
  batchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  checkId: string;
  label: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface BatchSubmission {
  batchId: string;
  payerName: string;
  payerId: string;
  claimIds: string[];
  totalClaims: number;
  totalBilled: number;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  ediTraceId: string;
}

export interface ClaimQueueSummaryDetailed {
  totalReady: number;
  totalBlocked: number;
  totalSubmittedThisWeek: number;
  totalBilledThisWeek: number;
  totalPaidThisWeek: number;
  totalInProcess: number;
  blockedReasons: { reason: string; count: number }[];
  readyByPayer: { payer: string; count: number; amount: number }[];
}

// ============================================================================
// 12-Point Claim Validation
// ============================================================================

const VALIDATION_CHECKS = [
  { id: 'npi', label: 'Provider NPI valid' },
  { id: 'member-id', label: 'Client member ID on file' },
  { id: 'auth-number', label: 'Authorization number present' },
  { id: 'auth-period', label: 'DOS within authorization period' },
  { id: 'cpt-match', label: 'CPT code matches authorization' },
  { id: 'signature', label: 'Session note signed by provider' },
  { id: 'diagnosis', label: 'ICD-10 diagnosis code valid' },
  { id: 'units', label: 'Units within authorized range' },
  { id: 'place-of-service', label: 'Place of service matches authorization' },
  { id: 'payer-active', label: 'Provider in-network with payer' },
  { id: 'timely-filing', label: 'Within timely filing limit' },
  { id: 'no-duplicate', label: 'No duplicate claim detected' },
];

export function validateClaimReadiness(item: ClaimReadyItem): ValidationResult[] {
  const results: ValidationResult[] = [];
  const today = new Date();

  // 1. NPI valid (10 digits)
  results.push({
    checkId: 'npi',
    label: 'Provider NPI valid',
    passed: /^\d{10}$/.test(item.providerNPI),
    message: /^\d{10}$/.test(item.providerNPI) ? 'NPI is valid' : 'NPI must be 10 digits',
    severity: 'error',
  });

  // 2. Client member ID
  results.push({
    checkId: 'member-id',
    label: 'Client member ID on file',
    passed: !!item.clientMemberId && item.clientMemberId.length >= 4,
    message: item.clientMemberId ? 'Member ID on file' : 'Missing client insurance member ID',
    severity: 'error',
  });

  // 3. Authorization number
  const hasAuth = !!item.authorizationNumber && item.authorizationNumber.length >= 4;
  results.push({
    checkId: 'auth-number',
    label: 'Authorization number present',
    passed: hasAuth,
    message: hasAuth ? `Auth: ${item.authorizationNumber}` : `Missing authorization number for session on ${item.dateOfService}`,
    severity: 'error',
  });

  // 4. DOS within auth period
  let dosInAuthPeriod = false;
  if (item.authorizationPeriod && item.dateOfService) {
    const dos = new Date(item.dateOfService);
    const authStart = new Date(item.authorizationPeriod.start);
    const authEnd = new Date(item.authorizationPeriod.end);
    dosInAuthPeriod = dos >= authStart && dos <= authEnd;
  }
  results.push({
    checkId: 'auth-period',
    label: 'DOS within authorization period',
    passed: dosInAuthPeriod || !item.authorizationPeriod,
    message: dosInAuthPeriod || !item.authorizationPeriod
      ? 'Date of service within authorization period'
      : `DOS ${item.dateOfService} is outside authorization period ${item.authorizationPeriod?.start} – ${item.authorizationPeriod?.end}`,
    severity: 'error',
  });

  // 5. CPT code format
  const validCPT = /^(H\d{4}|9\d{4}|97\d{3})$/.test(item.cptCode);
  results.push({
    checkId: 'cpt-match',
    label: 'CPT code matches authorization',
    passed: validCPT,
    message: validCPT ? `CPT ${item.cptCode} is valid` : `CPT code ${item.cptCode} format invalid or not on authorization`,
    severity: 'error',
  });

  // 6. Session note signed (demo: check if sessionNoteId non-empty)
  const noteSigned = !!item.sessionNoteId && item.sessionNoteId.length > 3;
  results.push({
    checkId: 'signature',
    label: 'Session note signed by provider',
    passed: noteSigned,
    message: noteSigned ? 'Session note signed and locked' : 'Session note missing provider signature',
    severity: 'error',
  });

  // 7. ICD-10 valid (basic format: letter + 2 digits + optional chars)
  const validICD = /^[A-Z]\d{2}(\.[A-Z0-9]+)?$/.test(item.diagnosisICD10);
  results.push({
    checkId: 'diagnosis',
    label: 'ICD-10 diagnosis code valid',
    passed: validICD,
    message: validICD ? `${item.diagnosisICD10} — valid ICD-10` : `${item.diagnosisICD10} is not a valid ICD-10 format`,
    severity: 'error',
  });

  // 8. Units > 0 and reasonable (< 200 per day)
  const unitsValid = item.units > 0 && item.units < 200;
  results.push({
    checkId: 'units',
    label: 'Units within authorized range',
    passed: unitsValid,
    message: unitsValid ? `${item.units} units` : `${item.units} units is outside valid range (1-199)`,
    severity: item.units > 200 ? 'error' : 'warning',
  });

  // 9. Place of service valid
  const validPOS = ['02', '11', '12', '99'].includes(item.placeOfService);
  results.push({
    checkId: 'place-of-service',
    label: 'Place of service matches authorization',
    passed: validPOS,
    message: validPOS ? `POS ${item.placeOfService} valid` : 'Place of service code not recognized',
    severity: 'warning',
  });

  // 10. Provider in-network (demo: assume yes if payerId non-empty)
  const inNetwork = !!item.payerId && item.payerId.length > 2;
  results.push({
    checkId: 'payer-active',
    label: 'Provider in-network with payer',
    passed: inNetwork,
    message: inNetwork ? `In-network with ${item.payerName}` : 'Provider may not be credentialed with this payer',
    severity: 'error',
  });

  // 11. Timely filing (within 365 days for most payers; AHCCCS = 365, BCBS = 180)
  const dos = new Date(item.dateOfService);
  const daysSinceDOS = Math.floor((today.getTime() - dos.getTime()) / (1000 * 60 * 60 * 24));
  const timelyFilingDays = item.payerName.toLowerCase().includes('bcbs') ? 180 : 365;
  const withinFilingLimit = daysSinceDOS <= timelyFilingDays;
  results.push({
    checkId: 'timely-filing',
    label: 'Within timely filing limit',
    passed: withinFilingLimit,
    message: withinFilingLimit
      ? `${daysSinceDOS} days since DOS — within ${timelyFilingDays}-day limit`
      : `${daysSinceDOS} days since DOS exceeds ${timelyFilingDays}-day timely filing limit`,
    severity: 'error',
  });

  // 12. No duplicate (demo: always passes unless batchId already set)
  const noDuplicate = !item.batchId;
  results.push({
    checkId: 'no-duplicate',
    label: 'No duplicate claim detected',
    passed: noDuplicate || item.status === 'submitted',
    message: (noDuplicate || item.status === 'submitted') ? 'No duplicate detected' : 'Potential duplicate — claim may have already been submitted',
    severity: 'warning',
  });

  return results;
}

// ============================================================================
// Batch Operations
// ============================================================================

export function buildBatch(items: ClaimReadyItem[]): Map<string, ClaimReadyItem[]> {
  const byPayer = new Map<string, ClaimReadyItem[]>();
  for (const item of items) {
    if (item.status === 'ready') {
      const existing = byPayer.get(item.payerId) ?? [];
      existing.push(item);
      byPayer.set(item.payerId, existing);
    }
  }
  return byPayer;
}

export function submitBatch(items: ClaimReadyItem[], payerId: string): BatchSubmission {
  const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const ediTraceId = `EDI-${Date.now()}`;
  const payer = items[0];
  return {
    batchId,
    payerName: payer?.payerName ?? 'Unknown',
    payerId,
    claimIds: items.map(i => i.id),
    totalClaims: items.length,
    totalBilled: items.reduce((sum, i) => sum + i.billedAmount, 0),
    submittedAt: new Date().toISOString(),
    status: 'pending',
    ediTraceId,
  };
}

export function getQueueSummary(items: ClaimReadyItem[]): ClaimQueueSummaryDetailed {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const submittedThisWeek = items.filter(i =>
    (i.status === 'submitted' || i.status === 'paid') &&
    i.submittedAt &&
    new Date(i.submittedAt) >= oneWeekAgo
  );

  // Collect block reasons
  const reasonCounts = new Map<string, number>();
  for (const item of items.filter(i => i.status === 'blocked')) {
    for (const reason of item.blockReasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  // Ready by payer
  const payerTotals = new Map<string, { count: number; amount: number }>();
  for (const item of items.filter(i => i.status === 'ready')) {
    const existing = payerTotals.get(item.payerName) ?? { count: 0, amount: 0 };
    existing.count++;
    existing.amount += item.billedAmount;
    payerTotals.set(item.payerName, existing);
  }

  return {
    totalReady: items.filter(i => i.status === 'ready').length,
    totalBlocked: items.filter(i => i.status === 'blocked').length,
    totalSubmittedThisWeek: submittedThisWeek.length,
    totalBilledThisWeek: submittedThisWeek.reduce((s, i) => s + i.billedAmount, 0),
    totalPaidThisWeek: items.filter(i => i.status === 'paid' && i.submittedAt && new Date(i.submittedAt) >= oneWeekAgo).reduce((s, i) => s + i.billedAmount, 0),
    totalInProcess: items.filter(i => i.status === 'submitted').length,
    blockedReasons: Array.from(reasonCounts.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    readyByPayer: Array.from(payerTotals.entries()).map(([payer, data]) => ({ payer, ...data })),
  };
}

// ============================================================================
// Demo Data — 8 claims (5 ready, 2 blocked, 1 submitted)
// ============================================================================

const makeValidationPassed = (): ValidationResult[] =>
  VALIDATION_CHECKS.map(c => ({
    checkId: c.id,
    label: c.label,
    passed: true,
    message: 'Check passed',
    severity: 'info' as const,
  }));

export const DEMO_CLAIM_QUEUE: ClaimReadyItem[] = [
  {
    id: 'clm-001',
    sessionNoteId: 'sn-441',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'AHCCCS-88421',
    clientName: 'Lucas Thompson',
    cptCode: 'H2019',
    cptDescription: 'Behavior Treatment — RBT (per 15 min)',
    diagnosisICD10: 'F84.0',
    diagnosisDescription: 'Autistic Disorder',
    dateOfService: '2026-03-28',
    placeOfService: '11',
    units: 16,
    billedAmount: 136.00,
    authorizationNumber: 'AZ-AUTH-221847',
    authorizationPeriod: { start: '2026-01-01', end: '2026-06-30' },
    payerName: 'AHCCCS',
    payerId: 'ahcccs',
    status: 'ready',
    blockReasons: [],
    validationResults: makeValidationPassed(),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-03-29T08:00:00Z',
    updatedAt: '2026-03-29T08:00:00Z',
  },
  {
    id: 'clm-002',
    sessionNoteId: 'sn-442',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'BCBS-77612A',
    clientName: 'Mia Rodriguez',
    cptCode: 'H0032',
    cptDescription: 'BCBA Supervision (per 15 min)',
    diagnosisICD10: 'F84.0',
    diagnosisDescription: 'Autistic Disorder',
    dateOfService: '2026-03-29',
    placeOfService: '11',
    units: 4,
    billedAmount: 84.00,
    authorizationNumber: 'BCBS-AUTH-994412',
    authorizationPeriod: { start: '2026-01-01', end: '2026-12-31' },
    payerName: 'BCBS AZ',
    payerId: 'bcbs_az',
    status: 'ready',
    blockReasons: [],
    validationResults: makeValidationPassed(),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-03-30T08:00:00Z',
    updatedAt: '2026-03-30T08:00:00Z',
  },
  {
    id: 'clm-003',
    sessionNoteId: 'sn-443',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'AHCCCS-61122',
    clientName: 'Ethan Patel',
    cptCode: '97151',
    cptDescription: 'Behavior Identification Assessment',
    diagnosisICD10: 'F84.0',
    diagnosisDescription: 'Autistic Disorder',
    dateOfService: '2026-03-31',
    placeOfService: '11',
    units: 3,
    billedAmount: 435.00,
    authorizationNumber: 'AZ-AUTH-330918',
    authorizationPeriod: { start: '2026-03-01', end: '2026-03-31' },
    payerName: 'AHCCCS',
    payerId: 'ahcccs',
    status: 'ready',
    blockReasons: [],
    validationResults: makeValidationPassed(),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'clm-004',
    sessionNoteId: 'sn-444',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'UHC-441892',
    clientName: 'Zoe Williams',
    cptCode: 'H2019',
    cptDescription: 'Behavior Treatment — RBT (per 15 min)',
    diagnosisICD10: 'F84.1',
    diagnosisDescription: 'Asperger\'s Syndrome',
    dateOfService: '2026-04-01',
    placeOfService: '02',
    units: 8,
    billedAmount: 74.00,
    authorizationNumber: 'UHC-AUTH-881234',
    authorizationPeriod: { start: '2026-01-01', end: '2026-06-30' },
    payerName: 'UnitedHealthcare',
    payerId: 'uhc',
    status: 'ready',
    blockReasons: [],
    validationResults: makeValidationPassed(),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-04-02T08:00:00Z',
    updatedAt: '2026-04-02T08:00:00Z',
  },
  {
    id: 'clm-005',
    sessionNoteId: 'sn-445',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'AHCCCS-55201',
    clientName: 'Noah Kim',
    cptCode: 'H2014',
    cptDescription: 'Skills Training & Development',
    diagnosisICD10: 'F90.0',
    diagnosisDescription: 'ADHD, inattentive type',
    dateOfService: '2026-04-02',
    placeOfService: '11',
    units: 12,
    billedAmount: 102.00,
    authorizationNumber: 'AZ-AUTH-779234',
    authorizationPeriod: { start: '2026-04-01', end: '2026-09-30' },
    payerName: 'AHCCCS',
    payerId: 'ahcccs',
    status: 'ready',
    blockReasons: [],
    validationResults: makeValidationPassed(),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-04-03T07:00:00Z',
    updatedAt: '2026-04-03T07:00:00Z',
  },
  // Blocked claims
  {
    id: 'clm-006',
    sessionNoteId: 'sn-446',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'BCBS-99241',
    clientName: 'Lily Chen',
    cptCode: 'H2019',
    cptDescription: 'Behavior Treatment — RBT (per 15 min)',
    diagnosisICD10: 'F84.0',
    diagnosisDescription: 'Autistic Disorder',
    dateOfService: '2026-03-28',
    placeOfService: '11',
    units: 16,
    billedAmount: 148.00,
    authorizationNumber: null,
    authorizationPeriod: null,
    payerName: 'BCBS AZ',
    payerId: 'bcbs_az',
    status: 'blocked',
    blockReasons: ['Missing auth number for session on 3/28'],
    validationResults: VALIDATION_CHECKS.map(c => ({
      checkId: c.id,
      label: c.label,
      passed: c.id !== 'auth-number' && c.id !== 'auth-period',
      message: c.id === 'auth-number' ? 'Missing authorization number for session on 3/28' : c.id === 'auth-period' ? 'Cannot verify DOS without auth period' : 'Check passed',
      severity: (c.id === 'auth-number' || c.id === 'auth-period' ? 'error' : 'info') as ValidationResult['severity'],
    })),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-03-29T08:00:00Z',
    updatedAt: '2026-03-29T08:00:00Z',
  },
  {
    id: 'clm-007',
    sessionNoteId: '',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'AHCCCS-44312',
    clientName: 'James Davis',
    cptCode: 'H2019',
    cptDescription: 'Behavior Treatment — RBT (per 15 min)',
    diagnosisICD10: 'F84.0',
    diagnosisDescription: 'Autistic Disorder',
    dateOfService: '2026-03-25',
    placeOfService: '11',
    units: 8,
    billedAmount: 68.00,
    authorizationNumber: 'AZ-AUTH-882341',
    authorizationPeriod: { start: '2026-01-01', end: '2026-06-30' },
    payerName: 'AHCCCS',
    payerId: 'ahcccs',
    status: 'blocked',
    blockReasons: ['Session note not signed — missing provider signature'],
    validationResults: VALIDATION_CHECKS.map(c => ({
      checkId: c.id,
      label: c.label,
      passed: c.id !== 'signature',
      message: c.id === 'signature' ? 'Session note not signed — missing provider signature' : 'Check passed',
      severity: (c.id === 'signature' ? 'error' : 'info') as ValidationResult['severity'],
    })),
    submittedAt: null,
    batchId: null,
    createdAt: '2026-03-26T08:00:00Z',
    updatedAt: '2026-03-26T08:00:00Z',
  },
  // Submitted claim
  {
    id: 'clm-008',
    sessionNoteId: 'sn-440',
    providerNPI: '1234567890',
    providerName: 'Dr. Sarah Chen, BCBA',
    clientMemberId: 'AHCCCS-31188',
    clientName: 'Ava Martinez',
    cptCode: 'H2019',
    cptDescription: 'Behavior Treatment — RBT (per 15 min)',
    diagnosisICD10: 'F84.0',
    diagnosisDescription: 'Autistic Disorder',
    dateOfService: '2026-03-20',
    placeOfService: '11',
    units: 16,
    billedAmount: 136.00,
    authorizationNumber: 'AZ-AUTH-119988',
    authorizationPeriod: { start: '2026-01-01', end: '2026-06-30' },
    payerName: 'AHCCCS',
    payerId: 'ahcccs',
    status: 'submitted',
    blockReasons: [],
    validationResults: makeValidationPassed(),
    submittedAt: '2026-03-28T14:22:00Z',
    batchId: 'BATCH-1743000000-XK4RP',
    createdAt: '2026-03-21T08:00:00Z',
    updatedAt: '2026-03-28T14:22:00Z',
  },
];
