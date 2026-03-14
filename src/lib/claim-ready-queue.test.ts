import { describe, expect, it } from 'vitest';
import { buildClaimReadyCase, getClaimRuleProfilesForState, summarizeClaimReadyQueue } from './claim-ready-queue';

describe('claim-ready queue', () => {
  it('returns broad payer rules for supported states', () => {
    expect(getClaimRuleProfilesForState('AZ').length).toBeGreaterThanOrEqual(5);
    expect(getClaimRuleProfilesForState('MT').length).toBeGreaterThanOrEqual(2);
    expect(getClaimRuleProfilesForState('TX').length).toBeGreaterThanOrEqual(2);
  });

  it('blocks cases with missing prerequisites', () => {
    const payer = getClaimRuleProfilesForState('AZ')[0];
    const claim = buildClaimReadyCase({
      patientName: 'Test Child',
      state: 'AZ',
      payer,
      providerName: 'AACT Telehealth Team',
      visitType: 'Standard Session',
      serviceDate: '2026-03-10',
      amountCents: 14900,
      hasClinicalSignoff: false,
      hasEligibility: true,
      hasAuthorization: true,
      payerAssignmentMatches: true,
    });

    expect(claim.queueStatus).toBe('missing_clinical_signoff');
    expect(claim.issues[0]).toContain('Clinical note');
  });

  it('summarizes queue states', () => {
    const payer = getClaimRuleProfilesForState('AZ')[0];
    const queue = [
      buildClaimReadyCase({
        patientName: 'Ready Child',
        state: 'AZ',
        payer,
        providerName: 'AACT',
        visitType: 'Quick Consult',
        serviceDate: '2026-03-10',
        amountCents: 7900,
        hasClinicalSignoff: true,
        hasEligibility: true,
        hasAuthorization: true,
        payerAssignmentMatches: true,
      }),
      buildClaimReadyCase({
        patientName: 'Blocked Child',
        state: 'AZ',
        payer,
        providerName: 'AACT',
        visitType: 'Quick Consult',
        serviceDate: '2026-03-10',
        amountCents: 7900,
        hasClinicalSignoff: true,
        hasEligibility: false,
        hasAuthorization: false,
        payerAssignmentMatches: true,
      }),
    ];

    const summary = summarizeClaimReadyQueue(queue);
    expect(summary.totalCases).toBe(2);
    expect(summary.readyForBiller).toBe(1);
    expect(summary.blocked).toBe(1);
  });
});
