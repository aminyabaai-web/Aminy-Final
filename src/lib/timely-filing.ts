// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * timely-filing.ts — Timely Filing Tracker
 * Tracks claim filing deadlines per payer and surfaces at-risk claims.
 */

// ============================================================================
// Types
// ============================================================================

export interface TimelyFilingRule {
  payerId: string;
  payerName: string;
  daysFromServiceDate: number; // days from DOS to file original claim
  daysForAppeals: number;       // days from denial date to file appeal
  notes?: string;
}

export interface TimelyFilingStatus {
  claimId: string;
  serviceDate: string;
  payerId: string;
  deadlineDate: string;
  daysRemaining: number;
  status: 'ok' | 'warning' | 'critical' | 'expired';
  appealDeadline?: string;
}

// ============================================================================
// Top 15 ABA payer rules
// ============================================================================

export const TIMELY_FILING_RULES: TimelyFilingRule[] = [
  {
    payerId: 'BCBS',
    payerName: 'Blue Cross Blue Shield (most plans)',
    daysFromServiceDate: 365,
    daysForAppeals: 180,
    notes: 'Some BCBS state plans require 90 or 180 days; verify state-specific plan.',
  },
  {
    payerId: 'AETNA',
    payerName: 'Aetna',
    daysFromServiceDate: 180,
    daysForAppeals: 180,
    notes: 'Commercial plans 180 days; some government-funded plans 365 days.',
  },
  {
    payerId: 'CIGNA',
    payerName: 'Cigna / Evernorth',
    daysFromServiceDate: 180,
    daysForAppeals: 180,
  },
  {
    payerId: 'UHC',
    payerName: 'UnitedHealthcare / Optum',
    daysFromServiceDate: 365,
    daysForAppeals: 60,
    notes: 'UHC commercial generally 365 days; appeals within 60 days of denial.',
  },
  {
    payerId: 'HUMANA',
    payerName: 'Humana',
    daysFromServiceDate: 365,
    daysForAppeals: 180,
  },
  {
    payerId: 'MEDICAID_TYPICAL',
    payerName: 'Medicaid (typical state)',
    daysFromServiceDate: 365,
    daysForAppeals: 90,
    notes: 'State Medicaid varies 90–365 days; always verify state-specific rules.',
  },
  {
    payerId: 'MEDICAID_RESTRICTED',
    payerName: 'Medicaid (restricted state, e.g. TX)',
    daysFromServiceDate: 95,
    daysForAppeals: 120,
    notes: 'Texas Medicaid requires filing within 95 days of DOS.',
  },
  {
    payerId: 'TRICARE',
    payerName: 'TRICARE / Defense Health Agency',
    daysFromServiceDate: 365,
    daysForAppeals: 90,
  },
  {
    payerId: 'MAGELLAN',
    payerName: 'Magellan Health',
    daysFromServiceDate: 180,
    daysForAppeals: 60,
  },
  {
    payerId: 'CENTENE',
    payerName: 'Centene / WellCare',
    daysFromServiceDate: 180,
    daysForAppeals: 60,
    notes: 'Centene Medicaid MCO subsidiaries may vary; check state contract.',
  },
  {
    payerId: 'MOLINA',
    payerName: 'Molina Healthcare',
    daysFromServiceDate: 180,
    daysForAppeals: 90,
  },
  {
    payerId: 'ANTHEM',
    payerName: 'Anthem (BCBS affiliate)',
    daysFromServiceDate: 365,
    daysForAppeals: 180,
  },
  {
    payerId: 'CAREFIRST',
    payerName: 'CareFirst BlueCross BlueShield',
    daysFromServiceDate: 180,
    daysForAppeals: 180,
  },
  {
    payerId: 'BEACON',
    payerName: 'Beacon Health Options / Carelon',
    daysFromServiceDate: 180,
    daysForAppeals: 60,
  },
  {
    payerId: 'DEFAULT',
    payerName: 'Unknown / Default Payer',
    daysFromServiceDate: 365,
    daysForAppeals: 90,
    notes: 'Default rule — verify against actual payer contract.',
  },
];

// ============================================================================
// Internal helpers
// ============================================================================

const WARNING_THRESHOLD = 30; // days
const CRITICAL_THRESHOLD = 7; // days

function findRule(payerId: string): TimelyFilingRule {
  const normalized = payerId.toUpperCase();
  return (
    TIMELY_FILING_RULES.find((r) => normalized.includes(r.payerId)) ??
    TIMELY_FILING_RULES.find((r) => r.payerId === 'DEFAULT')!
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(targetDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

// ============================================================================
// Public API
// ============================================================================

export function getTimelyFilingStatus(claim: {
  serviceDate: string;
  payerId: string;
  claimId: string;
}): TimelyFilingStatus {
  const rule = findRule(claim.payerId);
  const deadlineDate = addDays(claim.serviceDate, rule.daysFromServiceDate);
  const appealDeadline = addDays(deadlineDate, rule.daysForAppeals);
  const daysRemaining = daysUntil(deadlineDate);

  let status: TimelyFilingStatus['status'];
  if (daysRemaining < 0) {
    status = 'expired';
  } else if (daysRemaining <= CRITICAL_THRESHOLD) {
    status = 'critical';
  } else if (daysRemaining <= WARNING_THRESHOLD) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  return {
    claimId: claim.claimId,
    serviceDate: claim.serviceDate,
    payerId: claim.payerId,
    deadlineDate,
    daysRemaining,
    status,
    appealDeadline,
  };
}

/**
 * Returns claims that are at risk (warning, critical, or expired),
 * sorted by daysRemaining ascending (most urgent first).
 */
export function getExpiringClaims(
  claims: Array<{ serviceDate: string; payerId: string; claimId: string }>,
  warningDays: number = WARNING_THRESHOLD
): TimelyFilingStatus[] {
  return claims
    .map((c) => getTimelyFilingStatus(c))
    .filter((s) => {
      if (s.status === 'expired' || s.status === 'critical') return true;
      if (s.status === 'warning' && s.daysRemaining <= warningDays) return true;
      return false;
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
