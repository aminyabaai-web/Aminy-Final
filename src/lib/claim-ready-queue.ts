import { supabase } from '../utils/supabase/client';
import { getStateMarketCoverage, type SupportedProviderState } from './insurance/state-market-coverage';

export type ClaimQueueStatus =
  | 'draft'
  | 'missing_clinical_signoff'
  | 'missing_eligibility'
  | 'missing_auth'
  | 'payer_assignment_mismatch'
  | 'coding_review_required'
  | 'ready_for_biller'
  | 'approved_for_submission'
  | 'submitted'
  | 'accepted'
  | 'denied'
  | 'paid';

export interface ClaimRuleProfile {
  payerId: string;
  payerName: string;
  state: SupportedProviderState;
  lineOfBusiness: 'commercial' | 'medicaid_managed' | 'medicaid' | 'exchange' | 'military';
  requiresAuthorization: boolean;
  supportsSecondary: boolean;
  submissionMode: 'clearinghouse' | 'payer_portal' | 'partner_billing';
  notes: string[];
}

export interface ClaimReadyCase {
  id: string;
  patientName: string;
  childId?: string;
  state: SupportedProviderState;
  payerId: string;
  payerName: string;
  providerName: string;
  visitType: string;
  serviceDate: string;
  primaryPolicyId?: string;
  secondaryPolicyId?: string;
  queueStatus: ClaimQueueStatus;
  issues: string[];
  route: 'insured_partner_billed' | 'insured_aminy_billed' | 'cash_pay_direct';
  submissionMode: ClaimRuleProfile['submissionMode'];
  authRequired: boolean;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimReadinessInput {
  patientName: string;
  state: SupportedProviderState;
  payer: ClaimRuleProfile;
  providerName: string;
  visitType: string;
  serviceDate: string;
  amountCents: number;
  route?: ClaimReadyCase['route'];
  childId?: string;
  primaryPolicyId?: string;
  secondaryPolicyId?: string;
  hasClinicalSignoff?: boolean;
  hasEligibility?: boolean;
  hasAuthorization?: boolean;
  payerAssignmentMatches?: boolean;
  codingReviewRequired?: boolean;
}

export interface ClaimQueueSummary {
  totalCases: number;
  readyForBiller: number;
  blocked: number;
  submitted: number;
  denied: number;
  paid: number;
}

export interface PayerOpsLaneSummary {
  payerId: string;
  payerName: string;
  supported: boolean;
  launchState: 'pilot' | 'limited_launch' | 'live' | 'unsupported';
  totalCases: number;
  blockedCases: number;
  authBlockedCases: number;
  deniedCases: number;
  secondaryPolicyCases: number;
  submissionModes: ClaimRuleProfile['submissionMode'][];
  operatorNotes: string[];
}

export interface PayerOpsSummary {
  totalCases: number;
  readyCases: number;
  blockedCases: number;
  authBlockedCases: number;
  deniedCases: number;
  secondaryPolicyCases: number;
  unsupportedPayerCases: number;
  payerLanes: PayerOpsLaneSummary[];
}

export interface CoverageRouteDecision {
  state: SupportedProviderState;
  payerId: string;
  route: ClaimReadyCase['route'] | 'auth_required' | 'waiver_hcbs_route';
  rationale: string;
  authRequired: boolean;
  launchState: 'pilot' | 'limited_launch' | 'live';
}

const CLAIM_RULES: ClaimRuleProfile[] = [
  {
    payerId: 'bcbs-az',
    payerName: 'Blue Cross Blue Shield of Arizona',
    state: 'AZ',
    lineOfBusiness: 'commercial',
    requiresAuthorization: true,
    supportsSecondary: true,
    submissionMode: 'clearinghouse',
    notes: ['Autism treatment often requires prior authorization.', 'Validate rendering provider taxonomy before submission.'],
  },
  {
    payerId: 'ahcccs',
    payerName: 'AHCCCS Medicaid',
    state: 'AZ',
    lineOfBusiness: 'medicaid',
    requiresAuthorization: true,
    supportsSecondary: false,
    submissionMode: 'partner_billing',
    notes: ['Managed care assignment must be confirmed before claim assembly.', 'Arizona EVV and authorization evidence should remain linked.'],
  },
  {
    payerId: 'mercy-care',
    payerName: 'Mercy Care',
    state: 'AZ',
    lineOfBusiness: 'medicaid_managed',
    requiresAuthorization: true,
    supportsSecondary: false,
    submissionMode: 'partner_billing',
    notes: ['Verify member assignment to Mercy Care before submission.', 'BCBA of AZ primary / MercyCare secondary coordination should be explicit.'],
  },
  {
    payerId: 'uhc',
    payerName: 'UnitedHealthcare',
    state: 'AZ',
    lineOfBusiness: 'commercial',
    requiresAuthorization: true,
    supportsSecondary: true,
    submissionMode: 'clearinghouse',
    notes: ['Use payer-specific modifier validation for therapy services.'],
  },
  {
    payerId: 'aetna',
    payerName: 'Aetna',
    state: 'AZ',
    lineOfBusiness: 'commercial',
    requiresAuthorization: true,
    supportsSecondary: true,
    submissionMode: 'clearinghouse',
    notes: ['Check autism mandate routing and medical necessity packet requirements.'],
  },
  {
    payerId: 'cigna',
    payerName: 'Cigna',
    state: 'AZ',
    lineOfBusiness: 'commercial',
    requiresAuthorization: true,
    supportsSecondary: true,
    submissionMode: 'clearinghouse',
    notes: ['Prior-auth packet should include treatment plan and provider attestation.'],
  },
  {
    payerId: 'mt-medicaid',
    payerName: 'Montana Medicaid',
    state: 'MT',
    lineOfBusiness: 'medicaid',
    requiresAuthorization: true,
    supportsSecondary: false,
    submissionMode: 'partner_billing',
    notes: ['Use managed Medicaid rules where delegated administrator requires them.'],
  },
  {
    payerId: 'bcbs-il',
    payerName: 'Blue Cross Blue Shield',
    state: 'MT',
    lineOfBusiness: 'commercial',
    requiresAuthorization: true,
    supportsSecondary: true,
    submissionMode: 'clearinghouse',
    notes: ['Plan-level eligibility must be verified before booking.'],
  },
  {
    payerId: 'tx-medicaid',
    payerName: 'Texas Medicaid',
    state: 'TX',
    lineOfBusiness: 'medicaid',
    requiresAuthorization: true,
    supportsSecondary: false,
    submissionMode: 'partner_billing',
    notes: ['STAR/STAR Kids routing must be resolved before claim assembly.'],
  },
  {
    payerId: 'tricare',
    payerName: 'TRICARE',
    state: 'TX',
    lineOfBusiness: 'military',
    requiresAuthorization: true,
    supportsSecondary: true,
    submissionMode: 'payer_portal',
    notes: ['Use payer portal if clearinghouse path is not enabled for the lane.'],
  },
];

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getClaimRuleProfilesForState(
  state: SupportedProviderState,
): ClaimRuleProfile[] {
  const rules = CLAIM_RULES.filter((rule) => rule.state === state);
  const coverage = getStateMarketCoverage(state);
  if (!coverage) return rules;

  const ruleIds = new Set(rules.map((rule) => rule.payerId));
  return coverage.payerProducts.reduce<ClaimRuleProfile[]>((acc, product) => {
    const existing = rules.find((rule) => rule.payerId === product.id);
    if (existing) {
      acc.push(existing);
      return acc;
    }

    acc.push({
      payerId: product.id,
      payerName: product.displayName,
      state,
      lineOfBusiness:
        product.payerType === 'medicaid'
          ? 'medicaid'
          : product.payerType === 'commercial'
            ? 'commercial'
            : product.payerType === 'medicare'
              ? 'exchange'
              : 'commercial',
      requiresAuthorization: product.priorAuthReady,
      supportsSecondary: true,
      submissionMode:
        product.submissionPath === 'portal'
          ? 'payer_portal'
          : product.submissionPath === 'hybrid'
            ? 'clearinghouse'
            : product.submissionPath === 'clearinghouse'
              ? 'clearinghouse'
              : 'partner_billing',
      notes: [`${product.displayName} is part of the supported-state payer matrix for ${state}.`],
    });
    ruleIds.add(product.id);
    return acc;
  }, []).filter((rule, index, all) => all.findIndex((candidate) => candidate.payerId === rule.payerId && candidate.state === rule.state) === index);
}

export function getClaimRuleProfile(
  state: SupportedProviderState,
  payerId: string,
): ClaimRuleProfile | null {
  return CLAIM_RULES.find((rule) => rule.state === state && rule.payerId === payerId) || null;
}

export function buildClaimReadyCase(
  input: ClaimReadinessInput,
): ClaimReadyCase {
  const issues: string[] = [];

  if (!input.hasClinicalSignoff) issues.push('Clinical note is not signed and locked.');
  if (!input.hasEligibility) issues.push('Eligibility has not been verified for the selected payer product.');
  if (input.payer.requiresAuthorization && !input.hasAuthorization) {
    issues.push('Prior authorization is required for this payer and service line.');
  }
  if (input.payerAssignmentMatches === false) {
    issues.push('Member payer assignment does not match the selected billing lane.');
  }
  if (input.codingReviewRequired) {
    issues.push('Coder review is required before submission.');
  }

  let queueStatus: ClaimQueueStatus = 'ready_for_biller';
  if (!input.hasClinicalSignoff) {
    queueStatus = 'missing_clinical_signoff';
  } else if (!input.hasEligibility) {
    queueStatus = 'missing_eligibility';
  } else if (input.payer.requiresAuthorization && !input.hasAuthorization) {
    queueStatus = 'missing_auth';
  } else if (input.payerAssignmentMatches === false) {
    queueStatus = 'payer_assignment_mismatch';
  } else if (input.codingReviewRequired) {
    queueStatus = 'coding_review_required';
  }

  const now = new Date().toISOString();
  return {
    id: randomId('claim'),
    patientName: input.patientName,
    childId: input.childId,
    state: input.state,
    payerId: input.payer.payerId,
    payerName: input.payer.payerName,
    providerName: input.providerName,
    visitType: input.visitType,
    serviceDate: input.serviceDate,
    primaryPolicyId: input.primaryPolicyId,
    secondaryPolicyId: input.secondaryPolicyId,
    queueStatus,
    issues,
    route: input.route || 'insured_partner_billed',
    submissionMode: input.payer.submissionMode,
    authRequired: input.payer.requiresAuthorization,
    amountCents: input.amountCents,
    createdAt: now,
    updatedAt: now,
  };
}

export function summarizeClaimReadyQueue(
  cases: ClaimReadyCase[],
): ClaimQueueSummary {
  return cases.reduce<ClaimQueueSummary>(
    (summary, entry) => {
      summary.totalCases += 1;
      if (entry.queueStatus === 'ready_for_biller') summary.readyForBiller += 1;
      if (
        [
          'missing_clinical_signoff',
          'missing_eligibility',
          'missing_auth',
          'payer_assignment_mismatch',
          'coding_review_required',
        ].includes(entry.queueStatus)
      ) {
        summary.blocked += 1;
      }
      if (['submitted', 'accepted'].includes(entry.queueStatus)) summary.submitted += 1;
      if (entry.queueStatus === 'denied') summary.denied += 1;
      if (entry.queueStatus === 'paid') summary.paid += 1;
      return summary;
    },
    {
      totalCases: 0,
      readyForBiller: 0,
      blocked: 0,
      submitted: 0,
      denied: 0,
      paid: 0,
    },
  );
}

function isBlockedStatus(status: ClaimReadyCase['queueStatus']): boolean {
  return [
    'missing_clinical_signoff',
    'missing_eligibility',
    'missing_auth',
    'payer_assignment_mismatch',
    'coding_review_required',
  ].includes(status);
}

export function summarizePayerOps(
  cases: ClaimReadyCase[],
  state: SupportedProviderState,
): PayerOpsSummary {
  const marketCoverage = getStateMarketCoverage(state);
  const supportedProducts = new Map((marketCoverage?.payerProducts || []).map((product) => [product.id, product]));
  const laneMap = new Map<string, PayerOpsLaneSummary>();

  for (const entry of cases) {
    const supportedProduct = supportedProducts.get(entry.payerId);
    const existing = laneMap.get(entry.payerId) || {
      payerId: entry.payerId,
      payerName: entry.payerName,
      supported: Boolean(supportedProduct),
      launchState: supportedProduct ? marketCoverage?.launchState || 'limited_launch' : 'unsupported',
      totalCases: 0,
      blockedCases: 0,
      authBlockedCases: 0,
      deniedCases: 0,
      secondaryPolicyCases: 0,
      submissionModes: [],
      operatorNotes: [],
    };

    existing.totalCases += 1;
    if (isBlockedStatus(entry.queueStatus)) existing.blockedCases += 1;
    if (entry.queueStatus === 'missing_auth') existing.authBlockedCases += 1;
    if (entry.queueStatus === 'denied') existing.deniedCases += 1;
    if (entry.secondaryPolicyId) existing.secondaryPolicyCases += 1;
    if (!existing.submissionModes.includes(entry.submissionMode)) {
      existing.submissionModes.push(entry.submissionMode);
    }
    if (!supportedProduct) {
      existing.operatorNotes.push('This payer is outside the supported-state matrix and needs manual lane review.');
    } else if (entry.queueStatus === 'missing_auth') {
      existing.operatorNotes.push('Prior authorization is the active blocker for this payer lane.');
    } else if (entry.queueStatus === 'denied') {
      existing.operatorNotes.push('Denial rework is open on this payer lane.');
    }

    laneMap.set(entry.payerId, existing);
  }

  const payerLanes = Array.from(laneMap.values())
    .map((lane) => ({
      ...lane,
      operatorNotes: Array.from(new Set(lane.operatorNotes)),
    }))
    .sort((a, b) => {
      if (b.blockedCases !== a.blockedCases) return b.blockedCases - a.blockedCases;
      if (b.deniedCases !== a.deniedCases) return b.deniedCases - a.deniedCases;
      return b.totalCases - a.totalCases;
    });

  return {
    totalCases: cases.length,
    readyCases: cases.filter((entry) => entry.queueStatus === 'ready_for_biller').length,
    blockedCases: cases.filter((entry) => isBlockedStatus(entry.queueStatus)).length,
    authBlockedCases: cases.filter((entry) => entry.queueStatus === 'missing_auth').length,
    deniedCases: cases.filter((entry) => entry.queueStatus === 'denied').length,
    secondaryPolicyCases: cases.filter((entry) => Boolean(entry.secondaryPolicyId)).length,
    unsupportedPayerCases: cases.filter((entry) => !supportedProducts.has(entry.payerId)).length,
    payerLanes,
  };
}

export function getSampleClaimReadyQueue(
  state: SupportedProviderState,
): ClaimReadyCase[] {
  const rules = getClaimRuleProfilesForState(state);
  const first = rules[0];
  const second = rules[1] || first;
  const third = rules[2] || first;
  if (!first || !second || !third) return [];

  return [
    buildClaimReadyCase({
      patientName: 'Ethan R.',
      childId: 'child-ethan',
      state,
      payer: first,
      providerName: 'AACT Telehealth Team',
      visitType: 'Standard Session',
      serviceDate: '2026-03-08',
      amountCents: 14900,
      hasClinicalSignoff: true,
      hasEligibility: true,
      hasAuthorization: !first.requiresAuthorization ? true : true,
      payerAssignmentMatches: true,
    }),
    buildClaimReadyCase({
      patientName: 'Mila S.',
      childId: 'child-mila',
      state,
      payer: second,
      providerName: 'AACT Telehealth Team',
      visitType: 'Diagnostic / Deep Review',
      serviceDate: '2026-03-09',
      amountCents: 22900,
      hasClinicalSignoff: true,
      hasEligibility: true,
      hasAuthorization: false,
      payerAssignmentMatches: true,
    }),
    buildClaimReadyCase({
      patientName: 'Noah G.',
      childId: 'child-noah',
      state,
      payer: third,
      providerName: 'Rise Pediatric Therapies',
      visitType: 'Quick Consult',
      serviceDate: '2026-03-10',
      amountCents: 7900,
      hasClinicalSignoff: false,
      hasEligibility: true,
      hasAuthorization: true,
      payerAssignmentMatches: true,
    }),
  ];
}

export function buildCoverageRouteDecision(options: {
  state: SupportedProviderState;
  payerId: string;
  wantsCashPay?: boolean;
  authRequired?: boolean;
  supportsPartnerRoute?: boolean;
  waiverEligible?: boolean;
}): CoverageRouteDecision {
  if (options.waiverEligible) {
    return {
      state: options.state,
      payerId: options.payerId,
      route: 'waiver_hcbs_route',
      rationale: 'Route the family to the waiver / DDD / HCBS workflow and keep EVV evidence linked.',
      authRequired: false,
      launchState: 'pilot',
    };
  }

  if (options.wantsCashPay) {
    return {
      state: options.state,
      payerId: options.payerId,
      route: 'cash_pay_direct',
      rationale: 'Cash-pay telehealth can be booked immediately in the supported state.',
      authRequired: false,
      launchState: 'live',
    };
  }

  if (options.authRequired) {
    return {
      state: options.state,
      payerId: options.payerId,
      route: 'auth_required',
      rationale: 'Prior authorization must be completed before the visit can move into the claim-ready queue.',
      authRequired: true,
      launchState: 'limited_launch',
    };
  }

  return {
    state: options.state,
    payerId: options.payerId,
    route: options.supportsPartnerRoute === false ? 'insured_aminy_billed' : 'insured_partner_billed',
    rationale: options.supportsPartnerRoute === false
      ? 'Aminy-owned insurance billing remains future state for this lane.'
      : 'Route the visit into the partner-billed insured lane and keep the family in Aminy.',
    authRequired: false,
    launchState: 'limited_launch',
  };
}

// ============================================================================
// Claim Maturity Scoring
// ============================================================================

export interface ClaimMaturityScore {
  score: number; // 0-100
  breakdown: Array<{
    criterion: string;
    points: number;
    maxPoints: number;
    passed: boolean;
    detail: string;
  }>;
  readyForSubmission: boolean;
}

/**
 * Scores a claim's maturity / readiness for submission on a 0-100 scale.
 * Checks: required fields, NPI validity, auth linkage, CPT/ICD match,
 * timely filing, and rendering provider identification.
 */
export function scoreClaimMaturity(claim: {
  patientName?: string;
  payerId?: string;
  payerName?: string;
  providerName?: string;
  providerNpi?: string;
  visitType?: string;
  serviceDate?: string;
  cptCode?: string;
  icdCodes?: string[];
  authorizationNumber?: string;
  authRequired?: boolean;
  renderingProviderNpi?: string;
  renderingProviderName?: string;
  primaryPolicyId?: string;
  amountCents?: number;
  timelyFilingLimitDays?: number;
}): ClaimMaturityScore {
  const breakdown: ClaimMaturityScore['breakdown'] = [];
  let totalPoints = 0;
  const maxTotal = 100;

  // 1. Required fields present (25 points)
  const requiredFields = [
    { name: 'patientName', value: claim.patientName },
    { name: 'payerId', value: claim.payerId },
    { name: 'providerName', value: claim.providerName },
    { name: 'serviceDate', value: claim.serviceDate },
    { name: 'cptCode', value: claim.cptCode },
    { name: 'amountCents', value: claim.amountCents },
    { name: 'primaryPolicyId', value: claim.primaryPolicyId },
  ];
  const presentFields = requiredFields.filter(f => f.value != null && f.value !== '');
  const fieldPoints = Math.round((presentFields.length / requiredFields.length) * 25);
  totalPoints += fieldPoints;
  breakdown.push({
    criterion: 'Required Fields Present',
    points: fieldPoints,
    maxPoints: 25,
    passed: presentFields.length === requiredFields.length,
    detail: `${presentFields.length}/${requiredFields.length} required fields populated.${
      presentFields.length < requiredFields.length
        ? ' Missing: ' + requiredFields.filter(f => f.value == null || f.value === '').map(f => f.name).join(', ')
        : ''
    }`,
  });

  // 2. NPI valid (15 points) — Luhn check for 10-digit NPI
  const npiToCheck = claim.providerNpi || '';
  const npiValid = /^\d{10}$/.test(npiToCheck) && validateNpiLuhn(npiToCheck);
  const npiPoints = npiValid ? 15 : 0;
  totalPoints += npiPoints;
  breakdown.push({
    criterion: 'Provider NPI Valid',
    points: npiPoints,
    maxPoints: 15,
    passed: npiValid,
    detail: npiValid
      ? `NPI ${npiToCheck} passes Luhn validation.`
      : npiToCheck ? `NPI ${npiToCheck} is invalid or fails Luhn check.` : 'Provider NPI not provided.',
  });

  // 3. Authorization number linked (15 points)
  const authNotRequired = claim.authRequired === false;
  const authLinked = authNotRequired || (!!claim.authorizationNumber && claim.authorizationNumber.length > 0);
  const authPoints = authLinked ? 15 : 0;
  totalPoints += authPoints;
  breakdown.push({
    criterion: 'Authorization Linked',
    points: authPoints,
    maxPoints: 15,
    passed: authLinked,
    detail: authNotRequired
      ? 'Authorization not required for this payer/service.'
      : authLinked
        ? `Auth # ${claim.authorizationNumber} linked.`
        : 'Authorization required but not linked. Claim will be denied without auth.',
  });

  // 4. CPT/ICD codes matched (15 points)
  const hasCpt = !!claim.cptCode && claim.cptCode.length > 0;
  const hasIcd = Array.isArray(claim.icdCodes) && claim.icdCodes.length > 0;
  const codesMatched = hasCpt && hasIcd;
  const codePoints = codesMatched ? 15 : hasCpt || hasIcd ? 7 : 0;
  totalPoints += codePoints;
  breakdown.push({
    criterion: 'CPT/ICD Codes Matched',
    points: codePoints,
    maxPoints: 15,
    passed: codesMatched,
    detail: codesMatched
      ? `CPT ${claim.cptCode} with ${claim.icdCodes!.length} ICD code(s).`
      : !hasCpt && !hasIcd
        ? 'Neither CPT nor ICD codes provided.'
        : !hasCpt ? 'CPT code missing.' : 'ICD diagnosis code(s) missing.',
  });

  // 5. Timely filing check (15 points)
  let timelyPoints = 0;
  let timelyPassed = true;
  let timelyDetail = 'Service date or filing limit not provided.';
  if (claim.serviceDate) {
    const serviceDate = new Date(claim.serviceDate);
    const today = new Date();
    const daysSinceService = Math.floor((today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
    const filingLimit = claim.timelyFilingLimitDays || 90; // Default 90 days
    const daysRemaining = filingLimit - daysSinceService;

    if (daysRemaining <= 0) {
      timelyPassed = false;
      timelyDetail = `PAST FILING DEADLINE: ${daysSinceService} days since service (limit: ${filingLimit} days). Claim will likely be denied for timely filing.`;
    } else if (daysRemaining <= 14) {
      timelyPoints = 8;
      timelyDetail = `URGENT: Only ${daysRemaining} days remaining to file (limit: ${filingLimit} days).`;
    } else {
      timelyPoints = 15;
      timelyDetail = `${daysRemaining} days remaining within ${filingLimit}-day filing limit.`;
    }
  }
  totalPoints += timelyPoints;
  breakdown.push({
    criterion: 'Timely Filing Check',
    points: timelyPoints,
    maxPoints: 15,
    passed: timelyPassed,
    detail: timelyDetail,
  });

  // 6. Rendering provider identified (15 points)
  const hasRenderingProvider = !!(claim.renderingProviderNpi || claim.renderingProviderName);
  const renderingPoints = hasRenderingProvider ? 15 : 0;
  totalPoints += renderingPoints;
  breakdown.push({
    criterion: 'Rendering Provider Identified',
    points: renderingPoints,
    maxPoints: 15,
    passed: hasRenderingProvider,
    detail: hasRenderingProvider
      ? `Rendering provider: ${claim.renderingProviderName || claim.renderingProviderNpi}.`
      : 'Rendering provider not identified. Some payers require rendering provider for payment.',
  });

  const score = Math.min(maxTotal, totalPoints);

  return {
    score,
    breakdown,
    readyForSubmission: score >= 85 && breakdown.every(b => b.criterion !== 'Timely Filing Check' || b.passed),
  };
}

/**
 * Luhn check for NPI (10-digit, prefixed with 80840 per CMS spec).
 */
function validateNpiLuhn(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  const prefixed = '80840' + npi;
  let sum = 0;
  let alternate = false;
  for (let i = prefixed.length - 1; i >= 0; i--) {
    let n = parseInt(prefixed[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ============================================================================
// Auto-Validation Rules
// ============================================================================

export interface ClaimValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Runs all validation checks on a claim and returns pass/fail with
 * detailed errors and warnings.
 */
export function validateClaimForSubmission(claim: {
  patientName?: string;
  payerId?: string;
  payerName?: string;
  providerName?: string;
  providerNpi?: string;
  visitType?: string;
  serviceDate?: string;
  cptCode?: string;
  icdCodes?: string[];
  authorizationNumber?: string;
  authRequired?: boolean;
  renderingProviderNpi?: string;
  renderingProviderName?: string;
  primaryPolicyId?: string;
  amountCents?: number;
  timelyFilingLimitDays?: number;
  placeOfService?: string;
  modifiers?: string[];
  patientDob?: string;
  subscriberId?: string;
}): ClaimValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Hard errors (will cause denial) ---

  if (!claim.patientName || claim.patientName.trim() === '') {
    errors.push('Patient name is required.');
  }
  if (!claim.payerId || claim.payerId.trim() === '') {
    errors.push('Payer ID is required.');
  }
  if (!claim.providerNpi || !/^\d{10}$/.test(claim.providerNpi)) {
    errors.push('Valid 10-digit provider NPI is required.');
  } else if (!validateNpiLuhn(claim.providerNpi)) {
    errors.push(`Provider NPI ${claim.providerNpi} fails Luhn check digit validation.`);
  }
  if (!claim.serviceDate || !/^\d{4}-\d{2}-\d{2}$/.test(claim.serviceDate)) {
    errors.push('Valid service date (YYYY-MM-DD) is required.');
  }
  if (!claim.cptCode || claim.cptCode.trim() === '') {
    errors.push('CPT procedure code is required.');
  } else if (!/^\d{5}$/.test(claim.cptCode)) {
    errors.push(`CPT code "${claim.cptCode}" is not a valid 5-digit code.`);
  }
  if (!claim.icdCodes || claim.icdCodes.length === 0) {
    errors.push('At least one ICD-10 diagnosis code is required.');
  }
  if (!claim.primaryPolicyId || claim.primaryPolicyId.trim() === '') {
    errors.push('Primary policy/member ID is required.');
  }
  if (claim.authRequired && (!claim.authorizationNumber || claim.authorizationNumber.trim() === '')) {
    errors.push('Prior authorization number is required for this payer/service but not provided.');
  }
  if (claim.amountCents == null || claim.amountCents <= 0) {
    errors.push('Billed amount must be greater than zero.');
  }

  // Timely filing check
  if (claim.serviceDate && /^\d{4}-\d{2}-\d{2}$/.test(claim.serviceDate)) {
    const serviceDate = new Date(claim.serviceDate);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
    const limit = claim.timelyFilingLimitDays || 90;
    if (daysSince > limit) {
      errors.push(`Timely filing limit exceeded: ${daysSince} days since service date (limit: ${limit} days).`);
    } else if (daysSince > limit - 14) {
      warnings.push(`Timely filing deadline approaching: ${limit - daysSince} days remaining.`);
    }

    // Future date check
    if (serviceDate > today) {
      errors.push('Service date is in the future.');
    }
  }

  // --- Warnings (may cause issues) ---

  if (!claim.renderingProviderNpi && !claim.renderingProviderName) {
    warnings.push('Rendering provider not specified. Some payers require rendering provider for payment.');
  }
  if (claim.renderingProviderNpi && !validateNpiLuhn(claim.renderingProviderNpi)) {
    warnings.push(`Rendering provider NPI ${claim.renderingProviderNpi} may be invalid (Luhn check failed).`);
  }
  if (!claim.placeOfService) {
    warnings.push('Place of service not specified. Default (11 - Office) will be used. Use 02 for telehealth.');
  }
  if (!claim.subscriberId) {
    warnings.push('Subscriber ID not provided. If patient is a dependent, subscriber ID may be required.');
  }
  if (!claim.patientDob) {
    warnings.push('Patient date of birth not provided. Some payers require DOB for eligibility matching.');
  }
  if (claim.modifiers && claim.modifiers.length > 4) {
    warnings.push('More than 4 modifiers specified. Most payers only accept up to 4 modifiers per line.');
  }
  if (claim.icdCodes && claim.icdCodes.length > 12) {
    warnings.push('More than 12 diagnosis codes. CMS-1500 form supports a maximum of 12 diagnosis pointers.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Pre-Submission Batch Scrub
// ============================================================================

export interface BatchScrubResult {
  totalClaims: number;
  passCount: number;
  failCount: number;
  warningCount: number;
  totalBilledCents: number;
  readyBilledCents: number;
  blockedBilledCents: number;
  results: Array<{
    index: number;
    patientName: string;
    serviceDate: string;
    cptCode: string;
    validation: ClaimValidationResult;
  }>;
}

/**
 * Validates all claims in a batch and returns a summary
 * with pass/fail/warning counts and per-claim details.
 */
export function scrubClaimBatch(claims: Array<{
  patientName?: string;
  payerId?: string;
  payerName?: string;
  providerName?: string;
  providerNpi?: string;
  visitType?: string;
  serviceDate?: string;
  cptCode?: string;
  icdCodes?: string[];
  authorizationNumber?: string;
  authRequired?: boolean;
  renderingProviderNpi?: string;
  renderingProviderName?: string;
  primaryPolicyId?: string;
  amountCents?: number;
  timelyFilingLimitDays?: number;
  placeOfService?: string;
  modifiers?: string[];
  patientDob?: string;
  subscriberId?: string;
}>): BatchScrubResult {
  const results: BatchScrubResult['results'] = [];
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;
  let totalBilledCents = 0;
  let readyBilledCents = 0;
  let blockedBilledCents = 0;

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const validation = validateClaimForSubmission(claim);
    const amount = claim.amountCents || 0;
    totalBilledCents += amount;

    if (validation.valid && validation.warnings.length === 0) {
      passCount++;
      readyBilledCents += amount;
    } else if (validation.valid) {
      warningCount++;
      readyBilledCents += amount; // warnings don't block submission
    } else {
      failCount++;
      blockedBilledCents += amount;
    }

    results.push({
      index: i,
      patientName: claim.patientName || 'Unknown',
      serviceDate: claim.serviceDate || 'N/A',
      cptCode: claim.cptCode || 'N/A',
      validation,
    });
  }

  return {
    totalClaims: claims.length,
    passCount,
    failCount,
    warningCount,
    totalBilledCents,
    readyBilledCents,
    blockedBilledCents,
    results,
  };
}

// ============================================================================
// Row Mapper
// ============================================================================

function mapRowToClaimReadyCase(row: Record<string, unknown>): ClaimReadyCase {
  return {
    id: String(row.id),
    patientName: String(row.patient_name || 'Unknown Patient'),
    childId: row.child_id ? String(row.child_id) : undefined,
    state: String(row.state || 'AZ') as SupportedProviderState,
    payerId: String(row.payer_id || ''),
    payerName: String(row.payer_name || ''),
    providerName: String(row.provider_name || ''),
    visitType: String(row.visit_type || ''),
    serviceDate: String(row.service_date || ''),
    primaryPolicyId: row.primary_policy_id ? String(row.primary_policy_id) : undefined,
    secondaryPolicyId: row.secondary_policy_id ? String(row.secondary_policy_id) : undefined,
    queueStatus: String(row.queue_status || 'draft') as ClaimQueueStatus,
    issues: Array.isArray(row.issues) ? (row.issues as string[]) : [],
    route: String(row.route || 'insured_partner_billed') as ClaimReadyCase['route'],
    submissionMode: String(row.submission_mode || 'partner_billing') as ClaimRuleProfile['submissionMode'],
    authRequired: Boolean(row.auth_required),
    amountCents: Number(row.amount_cents || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function getStoredSupabaseAccessToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const authKey = Object.keys(window.localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
  if (!authKey) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(authKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token || null;
  } catch {
    return null;
  }
}

async function fetchClaimReadyCasesViaRest(
  state?: SupportedProviderState,
): Promise<ClaimReadyCase[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const accessToken = getStoredSupabaseAccessToken();

  const params = new URLSearchParams({ select: '*' });
  params.set('order', 'updated_at.desc');
  params.set('limit', '100');
  if (state) {
    params.set('state', `eq.${state}`);
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/claim_ready_cases?${params.toString()}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`REST fallback failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json() as Record<string, unknown>[];
  return rows.map((row) => mapRowToClaimReadyCase(row));
}

export async function listClaimReadyCases(state?: SupportedProviderState): Promise<ClaimReadyCase[]> {
  try {
    const restRows = await fetchClaimReadyCasesViaRest(state);
    return restRows;
  } catch (error) {
    console.warn('[ClaimReadyQueue] Falling back to sample claim-ready queue:', error);
    return state ? getSampleClaimReadyQueue(state) : [];
  }
}

export async function saveClaimReadyCase(entry: ClaimReadyCase): Promise<ClaimReadyCase> {
  const payload = {
    id: entry.id,
    patient_name: entry.patientName,
    child_id: entry.childId || null,
    state: entry.state,
    payer_id: entry.payerId,
    payer_name: entry.payerName,
    provider_name: entry.providerName,
    visit_type: entry.visitType,
    service_date: entry.serviceDate,
    primary_policy_id: entry.primaryPolicyId || null,
    secondary_policy_id: entry.secondaryPolicyId || null,
    queue_status: entry.queueStatus,
    issues: entry.issues,
    route: entry.route,
    submission_mode: entry.submissionMode,
    auth_required: entry.authRequired,
    amount_cents: entry.amountCents,
    created_at: entry.createdAt,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('claim_ready_cases')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRowToClaimReadyCase(data as Record<string, unknown>);
}
