import { describe, expect, it } from 'vitest';
import { buildClaimReadyCase, getClaimRuleProfilesForState, summarizeClaimReadyQueue, summarizePayerOps } from './claim-ready-queue';

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

  it('summarizes payer backlog pressure for operator review', () => {
    const [bcbs, mercy] = getClaimRuleProfilesForState('AZ');
    const queue = [
      buildClaimReadyCase({
        patientName: 'Ready Child',
        state: 'AZ',
        payer: bcbs,
        providerName: 'AACT',
        visitType: 'Quick Consult',
        serviceDate: '2026-03-10',
        amountCents: 7900,
        hasClinicalSignoff: true,
        hasEligibility: true,
        hasAuthorization: true,
        payerAssignmentMatches: true,
        secondaryPolicyId: 'secondary-1',
      }),
      buildClaimReadyCase({
        patientName: 'Auth Blocked',
        state: 'AZ',
        payer: mercy,
        providerName: 'AACT',
        visitType: 'Quick Consult',
        serviceDate: '2026-03-11',
        amountCents: 7900,
        hasClinicalSignoff: true,
        hasEligibility: true,
        hasAuthorization: false,
        payerAssignmentMatches: true,
      }),
      {
        ...buildClaimReadyCase({
          patientName: 'Denied Claim',
          state: 'AZ',
          payer: bcbs,
          providerName: 'AACT',
          visitType: 'Quick Consult',
          serviceDate: '2026-03-12',
          amountCents: 7900,
          hasClinicalSignoff: true,
          hasEligibility: true,
          hasAuthorization: true,
          payerAssignmentMatches: true,
        }),
        queueStatus: 'denied' as const,
      },
    ];

    const summary = summarizePayerOps(queue, 'AZ');

    expect(summary.totalCases).toBe(3);
    expect(summary.authBlockedCases).toBe(1);
    expect(summary.deniedCases).toBe(1);
    expect(summary.secondaryPolicyCases).toBe(1);
    expect(summary.payerLanes[0]?.payerName).toBeDefined();
    expect(summary.payerLanes.some((lane) => lane.authBlockedCases === 1)).toBe(true);
  });
});
