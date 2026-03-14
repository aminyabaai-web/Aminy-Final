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
