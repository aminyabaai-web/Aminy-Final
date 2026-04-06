// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Insured Care Lane
 *
 * The complete insured family journey: benefits verification, prior auth,
 * claim-ready session validation, EDI submission, ERA reconciliation.
 */

// ============================================================================
// Types
// ============================================================================

export interface InsuredFamily {
  familyId: string;
  memberId: string;
  planId: string;
  planName: string;
  payer: string;
  subscriberName: string;
  dependentName: string;
  groupNumber: string;
  effectiveDate: string;
  terminationDate?: string;
}

export interface BenefitsVerification {
  memberId: string;
  planId: string;
  verifiedAt: string;
  eligible: boolean;
  planName: string;
  payer: string;
  deductible: {
    individual: number;
    individualUsed: number;
    family: number;
    familyUsed: number;
  };
  outOfPocketMax: {
    individual: number;
    individualUsed: number;
    family: number;
    familyUsed: number;
  };
  coverageDetails: {
    aba: { covered: boolean; requiresPriorAuth: boolean; sessionsApproved?: number; sessionsUsed?: number; copay?: number; coinsurance?: number };
    mentalHealth: { covered: boolean; requiresPriorAuth: boolean; sessionsApproved?: number; sessionsUsed?: number; copay?: number; coinsurance?: number };
    speech: { covered: boolean; requiresPriorAuth: boolean; sessionsApproved?: number; sessionsUsed?: number; copay?: number; coinsurance?: number };
    telehealth: { covered: boolean; copay?: number };
  };
  networkStatus: 'in-network' | 'out-of-network' | 'unknown';
  coordinationOfBenefits: boolean;
}

export type PriorAuthStatus = 'approved' | 'pending' | 'denied' | 'not_required' | 'additional_info_needed';

export interface PriorAuthRequest {
  authId: string;
  memberId: string;
  cptCode: string;
  diagnosisCode: string;
  requestedUnits: number;
  approvedUnits?: number;
  status: PriorAuthStatus;
  submittedAt: string;
  decisionDate?: string;
  decisionReason?: string;
  expirationDate?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface ClaimReadySession {
  sessionId: string;
  noteId: string;
  memberId: string;
  planId: string;
  providerNPI: string;
  dateOfService: string;
  placeOfService: string;
  cptCodes: { code: string; units: number; modifier?: string }[];
  diagnosisCodes: string[];
  priorAuthNumber?: string;
  renderingProviderName: string;
  billingProviderNPI: string;
  parentSignatureOnFile: boolean;
  validation: ClaimReadinessCheck;
}

export interface ClaimReadinessCheck {
  ready: boolean;
  checks: {
    label: string;
    passed: boolean;
    detail?: string;
  }[];
}

export interface EDISubmission {
  claimId: string;
  sessionId: string;
  submittedAt: string;
  status: 'submitted' | 'acknowledged' | 'adjudicated' | 'paid' | 'denied' | 'era_received';
  claimNumber?: string;
  batchId?: string;
}

export interface ClaimTrackingStatus {
  claimId: string;
  timeline: {
    stage: EDISubmission['status'];
    date: string;
    detail: string;
  }[];
  currentStatus: EDISubmission['status'];
  expectedPaymentDate?: string;
  denialReason?: string;
}

export interface EOBRecord {
  eobId: string;
  claimId: string;
  paymentDate: string;
  allowedAmount: number;
  paidAmount: number;
  memberResponsibility: number;
  adjustmentReasons: { code: string; description: string; amount: number }[];
  checkNumber?: string;
  eraFileId?: string;
  reconciliationStatus: 'matched' | 'underpayment' | 'overpayment' | 'denied' | 'pending';
}

// ============================================================================
// Mock payer data
// ============================================================================

const MOCK_BENEFITS: Record<string, BenefitsVerification> = {
  'BCBS-AZ': {
    memberId: 'BCBS123456',
    planId: 'BCBS-AZ',
    verifiedAt: new Date().toISOString(),
    eligible: true,
    planName: 'BCBS AZ BlueCare Gold',
    payer: 'Blue Cross Blue Shield of Arizona',
    deductible: { individual: 2000, individualUsed: 1423, family: 4000, familyUsed: 2847 },
    outOfPocketMax: { individual: 6000, individualUsed: 1800, family: 12000, familyUsed: 3600 },
    coverageDetails: {
      aba: { covered: true, requiresPriorAuth: true, sessionsApproved: 60, sessionsUsed: 24, copay: 0, coinsurance: 0.20 },
      mentalHealth: { covered: true, requiresPriorAuth: false, sessionsApproved: 30, sessionsUsed: 8, copay: 35 },
      speech: { covered: true, requiresPriorAuth: true, sessionsApproved: 30, sessionsUsed: 12, copay: 35 },
      telehealth: { covered: true, copay: 20 },
    },
    networkStatus: 'in-network',
    coordinationOfBenefits: false,
  },
  'UHC': {
    memberId: 'UHC789012',
    planId: 'UHC',
    verifiedAt: new Date().toISOString(),
    eligible: true,
    planName: 'UnitedHealthcare Choice Plus',
    payer: 'UnitedHealthcare',
    deductible: { individual: 1500, individualUsed: 750, family: 3000, familyUsed: 1200 },
    outOfPocketMax: { individual: 5000, individualUsed: 900, family: 10000, familyUsed: 1800 },
    coverageDetails: {
      aba: { covered: true, requiresPriorAuth: true, sessionsApproved: 52, sessionsUsed: 18, copay: 0, coinsurance: 0.15 },
      mentalHealth: { covered: true, requiresPriorAuth: false, sessionsApproved: 52, sessionsUsed: 5, copay: 30 },
      speech: { covered: true, requiresPriorAuth: true, sessionsApproved: 26, sessionsUsed: 10, copay: 30 },
      telehealth: { covered: true, copay: 25 },
    },
    networkStatus: 'in-network',
    coordinationOfBenefits: false,
  },
  'AHCCCS': {
    memberId: 'AHCCCS345678',
    planId: 'AHCCCS',
    verifiedAt: new Date().toISOString(),
    eligible: true,
    planName: 'AHCCCS Complete Care',
    payer: 'Arizona Health Care Cost Containment System',
    deductible: { individual: 0, individualUsed: 0, family: 0, familyUsed: 0 },
    outOfPocketMax: { individual: 0, individualUsed: 0, family: 0, familyUsed: 0 },
    coverageDetails: {
      aba: { covered: true, requiresPriorAuth: true, sessionsApproved: 120, sessionsUsed: 45, copay: 0 },
      mentalHealth: { covered: true, requiresPriorAuth: false, sessionsApproved: 52, sessionsUsed: 12, copay: 0 },
      speech: { covered: true, requiresPriorAuth: true, sessionsApproved: 52, sessionsUsed: 20, copay: 0 },
      telehealth: { covered: true, copay: 0 },
    },
    networkStatus: 'in-network',
    coordinationOfBenefits: false,
  },
};

const PRIOR_AUTH_REQUIRED_CODES = ['97153', '97155', '97156', '92507', '92508'];

// ============================================================================
// Benefits Verification
// ============================================================================

/** Verify benefits for a member. Returns realistic mock response. */
export function verifyBenefits(memberId: string, planId: string): Promise<BenefitsVerification> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const match = Object.values(MOCK_BENEFITS).find(
        (b) => b.planId === planId || b.memberId === memberId
      );
      if (match) {
        resolve({ ...match, memberId, planId, verifiedAt: new Date().toISOString() });
      } else {
        // Return a default BCBS response for unknown members
        resolve({
          ...MOCK_BENEFITS['BCBS-AZ'],
          memberId,
          planId,
          verifiedAt: new Date().toISOString(),
        });
      }
    }, 800);
  });
}

/** Get plain-English summary of benefits for the family dashboard */
export function getBenefitsSummary(benefits: BenefitsVerification): {
  headline: string;
  deductibleStatus: string;
  abaStatus: string;
  sessionStatus: string;
  estimatedCopay: string;
} {
  const { deductible, coverageDetails, planName } = benefits;
  const remaining = deductible.individual - deductible.individualUsed;
  const aba = coverageDetails.aba;

  return {
    headline: `${planName} covers ABA therapy${aba.covered ? '' : ' — but your current plan does not include ABA coverage'}.`,
    deductibleStatus: `You've used $${deductible.individualUsed.toLocaleString()} of your $${deductible.individual.toLocaleString()} deductible. $${remaining.toLocaleString()} remaining before insurance pays more.`,
    abaStatus: aba.covered
      ? `ABA therapy is covered. You've used ${aba.sessionsUsed ?? 0} of ${aba.sessionsApproved ?? '?'} authorized sessions this period.`
      : 'ABA therapy is not covered under your current plan. Ask your HR about plan upgrades.',
    sessionStatus: aba.sessionsApproved
      ? `${(aba.sessionsApproved - (aba.sessionsUsed ?? 0))} sessions remaining this authorization period`
      : 'Contact your insurance to confirm authorized session count.',
    estimatedCopay: aba.copay !== undefined
      ? `Your estimated cost per ABA session: $${aba.copay === 0 && aba.coinsurance ? `${(aba.coinsurance * 100).toFixed(0)}% coinsurance (after deductible)` : aba.copay}`
      : 'Copay information not available — contact your insurer.',
  };
}

// ============================================================================
// Prior Authorization
// ============================================================================

/** Check if a CPT code requires prior auth and return status */
export function checkPriorAuth(
  cptCode: string,
  diagnosisCode: string,
  memberId: string
): Promise<PriorAuthRequest> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const requiresAuth = PRIOR_AUTH_REQUIRED_CODES.includes(cptCode);
      if (!requiresAuth) {
        resolve({
          authId: `AUTH-${Date.now()}`,
          memberId,
          cptCode,
          diagnosisCode,
          requestedUnits: 0,
          status: 'not_required',
          submittedAt: new Date().toISOString(),
          notes: 'This CPT code does not require prior authorization.',
        });
        return;
      }

      // Simulate realistic PA response
      const outcomes: PriorAuthStatus[] = ['approved', 'approved', 'approved', 'pending', 'additional_info_needed'];
      const status = outcomes[Math.floor(Math.random() * outcomes.length)];
      const approvedUnits = status === 'approved' ? 240 : undefined;

      resolve({
        authId: `AUTH-${Date.now()}`,
        memberId,
        cptCode,
        diagnosisCode,
        requestedUnits: 240,
        approvedUnits,
        status,
        submittedAt: new Date().toISOString(),
        decisionDate: status === 'approved' ? new Date().toISOString() : undefined,
        expirationDate: status === 'approved'
          ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        referenceNumber: `PA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        notes: status === 'approved'
          ? `${approvedUnits} units of CPT ${cptCode} approved for 6 months.`
          : status === 'pending'
          ? 'Under review — expected decision within 3 business days.'
          : 'Additional clinical documentation requested. Please submit behavioral assessment and treatment plan.',
      });
    }, 1200);
  });
}

// ============================================================================
// Claim Readiness
// ============================================================================

/** Validate that a session note is complete before claim submission */
export function createClaimReadySession(
  sessionId: string,
  noteId: string,
  memberId: string,
  planId: string,
  providerNPI: string,
  billingProviderNPI: string,
  dateOfService: string,
  placeOfService: string,
  cptCodes: { code: string; units: number; modifier?: string }[],
  diagnosisCodes: string[],
  renderingProviderName: string,
  parentSignatureOnFile: boolean,
  priorAuthNumber?: string
): ClaimReadySession {
  const checks = [
    { label: 'CPT code selected', passed: cptCodes.length > 0, detail: cptCodes.map((c) => c.code).join(', ') || 'None' },
    { label: 'Session duration documented', passed: true, detail: 'Via note units' },
    { label: 'Provider NPI on file', passed: !!providerNPI && providerNPI.length === 10, detail: providerNPI || 'Missing' },
    { label: 'Diagnosis code (ICD-10)', passed: diagnosisCodes.length > 0, detail: diagnosisCodes.join(', ') || 'None' },
    { label: 'Place of service code', passed: !!placeOfService, detail: placeOfService || 'Missing' },
    { label: 'Parent signature on file', passed: parentSignatureOnFile, detail: parentSignatureOnFile ? 'Signed' : 'Awaiting signature' },
    { label: 'Prior auth number', passed: !PRIOR_AUTH_REQUIRED_CODES.some((c) => cptCodes.map((x) => x.code).includes(c)) || !!priorAuthNumber, detail: priorAuthNumber || 'Required for this service' },
  ];

  return {
    sessionId,
    noteId,
    memberId,
    planId,
    providerNPI,
    dateOfService,
    placeOfService,
    cptCodes,
    diagnosisCodes,
    priorAuthNumber,
    renderingProviderName,
    billingProviderNPI,
    parentSignatureOnFile,
    validation: {
      ready: checks.every((c) => c.passed),
      checks,
    },
  };
}

// ============================================================================
// EDI Submission (837P)
// ============================================================================

/** Submit claim to EDI — mock 837P transaction */
export function submitToEDI(session: ClaimReadySession): Promise<EDISubmission> {
  return new Promise((resolve, reject) => {
    if (!session.validation.ready) {
      reject(new Error('Claim is not ready for submission. Fix all validation errors first.'));
      return;
    }

    setTimeout(() => {
      resolve({
        claimId: `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        sessionId: session.sessionId,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        claimNumber: `837P-${Date.now()}`,
        batchId: `BATCH-${new Date().toISOString().split('T')[0]}`,
      });
    }, 1500);
  });
}

// ============================================================================
// Claim Tracking
// ============================================================================

/** Track claim through adjudication lifecycle */
export function trackClaim(claimId: string): Promise<ClaimTrackingStatus> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const stages: ClaimTrackingStatus['timeline'] = [
        {
          stage: 'submitted',
          date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          detail: '837P transaction submitted to payer clearinghouse',
        },
        {
          stage: 'acknowledged',
          date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          detail: 'Claim acknowledged by payer — assigned claim number',
        },
        {
          stage: 'adjudicated',
          date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          detail: 'Claim adjudicated — payment approved at contracted rate',
        },
      ];

      resolve({
        claimId,
        timeline: stages,
        currentStatus: 'adjudicated',
        expectedPaymentDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }, 600);
  });
}

// ============================================================================
// ERA Reconciliation
// ============================================================================

/** Match ERA payment to claim — flag underpayments/denials */
export function reconcileERA(
  claimId: string,
  billedAmount: number,
  eraPaymentAmount: number
): EOBRecord {
  const allowedAmount = billedAmount * 0.72; // Typical contracted rate ~72% of billed
  const memberResponsibility = Math.max(0, allowedAmount - eraPaymentAmount);
  const delta = eraPaymentAmount - allowedAmount;

  let reconciliationStatus: EOBRecord['reconciliationStatus'] = 'matched';
  const adjustmentReasons: EOBRecord['adjustmentReasons'] = [];

  if (eraPaymentAmount === 0) {
    reconciliationStatus = 'denied';
    adjustmentReasons.push({ code: 'CO-4', description: 'Service not covered by plan', amount: billedAmount });
  } else if (delta < -10) {
    reconciliationStatus = 'underpayment';
    adjustmentReasons.push({ code: 'CO-45', description: 'Charge exceeds fee schedule/maximum allowable', amount: Math.abs(delta) });
  } else if (delta > 10) {
    reconciliationStatus = 'overpayment';
    adjustmentReasons.push({ code: 'OA-23', description: 'Payment adjusted — overpayment', amount: delta });
  } else {
    adjustmentReasons.push({ code: 'CO-45', description: 'Contractual adjustment to fee schedule', amount: billedAmount - allowedAmount });
  }

  return {
    eobId: `EOB-${claimId}-${Date.now()}`,
    claimId,
    paymentDate: new Date().toISOString(),
    allowedAmount,
    paidAmount: eraPaymentAmount,
    memberResponsibility,
    adjustmentReasons,
    checkNumber: `CHK-${Math.floor(Math.random() * 999999)}`,
    reconciliationStatus,
  };
}

/** Plain-English EOB translation for families */
export function translateEOB(eob: EOBRecord, serviceName = 'therapy session'): {
  headline: string;
  detail: string;
  action?: string;
} {
  const total = (eob.allowedAmount).toFixed(2);
  const paid = eob.paidAmount.toFixed(2);
  const yourShare = eob.memberResponsibility.toFixed(2);

  switch (eob.reconciliationStatus) {
    case 'matched':
      return {
        headline: `Insurance paid $${paid} for your ${serviceName}.`,
        detail: `Total session cost: $${total}. Insurance covered $${paid}. Your share: $${yourShare}.`,
      };
    case 'underpayment':
      return {
        headline: `Insurance paid less than expected for your ${serviceName}.`,
        detail: `We billed $${total}. Insurance paid $${paid}. The difference ($${(eob.allowedAmount - eob.paidAmount).toFixed(2)}) may be subject to appeal.`,
        action: 'Contact Aminy billing support if you believe this is incorrect.',
      };
    case 'denied':
      return {
        headline: `This ${serviceName} claim was denied by insurance.`,
        detail: `Reason: ${eob.adjustmentReasons[0]?.description ?? 'See EOB for details'}. You may owe the full session cost.`,
        action: 'Aminy can help you appeal this denial. Tap "Get Help" below.',
      };
    default:
      return {
        headline: `Payment processed for your ${serviceName}.`,
        detail: `Insurance paid $${paid}. Your share: $${yourShare}.`,
      };
  }
}
