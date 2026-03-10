/**
 * eligibility-check.ts
 *
 * Real-time eligibility verification for ABA behavioral health services.
 * Implements the HIPAA 270/271 (Eligibility Inquiry/Response) transaction
 * flow via Availity-compatible clearinghouse integration.
 *
 * Features:
 * - Pre-service eligibility verification
 * - ABA-specific benefit detail extraction (authorized hours, units, auth dates)
 * - Coverage details: deductible, copay, coinsurance, OOP max
 * - Demo mode with realistic mock responses for development/testing
 * - Multi-payer support via payer configuration lookup
 * - Eligibility caching to avoid redundant lookups
 *
 * Transaction Flow:
 *   Client → Edge Function → Clearinghouse (Availity) → Payer → 271 Response
 *
 * This module handles the client-side request/response formatting.
 * The actual clearinghouse API calls happen in Supabase edge functions
 * to keep credentials server-side.
 */

import { getPayerConfig, ABA_CPT_CODES } from './payer-configs';

// ============================================================================
// Types
// ============================================================================

/** Patient information for eligibility inquiry */
export interface EligibilityPatient {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'U';
  relationship: 'self' | 'spouse' | 'child' | 'other';
  subscriberId?: string; // If different from memberId (dependent)
  subscriberFirstName?: string;
  subscriberLastName?: string;
  state?: string; // For state Medicaid routing
}

/** Provider information for eligibility inquiry */
export interface EligibilityProvider {
  npi: string;
  taxId: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  taxonomyCode?: string; // e.g., '103K00000X' for Behavioral Analyst
}

/** Service type codes for 270 inquiry */
export type ServiceTypeCode =
  | '30'  // Health Benefit Plan Coverage
  | '33'  // Chiropractic
  | 'A4'  // Psychiatric
  | 'A5'  // Psychiatric - Inpatient
  | 'A6'  // Psychotherapy
  | 'A7'  // Psychiatric - Outpatient
  | 'A8'  // Psychiatric - Partial Hospitalization
  | 'MH'  // Mental Health
  | 'AJ'  // Alcoholism
  | 'AK'  // Drug Addiction
  | 'AL';  // Vision (Optometry)

/** Eligibility inquiry request */
export interface EligibilityInquiry {
  patient: EligibilityPatient;
  provider: EligibilityProvider;
  payerId: string;
  serviceDate: string; // YYYY-MM-DD
  serviceTypeCodes?: ServiceTypeCode[];
  cptCodes?: string[];
  placeOfService?: string;
  referenceId?: string; // Tracking ID
}

/** Coverage financial details from 271 response */
export interface CoverageFinancials {
  deductible: {
    individual: number;
    family: number;
    met: number;
    remaining: number;
  };
  outOfPocketMax: {
    individual: number;
    family: number;
    spent: number;
    remaining: number;
  };
  copay: {
    behavioralHealth: number;
    specialist: number;
    telehealth: number;
  };
  coinsurance: {
    inNetworkPercent: number;
    outOfNetworkPercent: number;
  };
}

/** ABA-specific benefit details from 271 response */
export interface ABABenefitDetails {
  isCovered: boolean;
  requiresAuthorization: boolean;
  currentAuthorization: {
    authorizationNumber: string;
    startDate: string;
    endDate: string;
    authorizedHoursPerWeek: number;
    totalAuthorizedUnits: number;
    usedUnits: number;
    remainingUnits: number;
    authorizedCPTCodes: string[];
  } | null;
  coverageLimitations: string[];
  ageLimit?: number;
  annualVisitLimit?: number;
  dollarLimit?: number;
  networkRestrictions: string[];
  providerRequirements: string[];
}

/** Plan information from 271 response */
export interface PlanInfo {
  payerId: string;
  payerName: string;
  planName: string;
  planType: 'HMO' | 'PPO' | 'EPO' | 'POS' | 'HDHP' | 'Medicaid' | 'Medicare' | 'Tricare' | 'Other';
  groupNumber: string;
  groupName: string;
  effectiveDate: string;
  terminationDate: string | null;
  isActive: boolean;
}

/** Full eligibility response */
export interface EligibilityResult {
  success: boolean;
  transactionId: string;
  timestamp: string;
  responseSource: 'live' | 'demo' | 'cached';
  // Subscriber/patient info echoed back
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    relationship: string;
  };
  // Plan details
  plan: PlanInfo;
  // Coverage financials
  coverage: CoverageFinancials;
  // ABA-specific benefits
  abaBenefits: ABABenefitDetails;
  // Service-specific coverage (per requested CPT code)
  serviceCoverage: Array<{
    serviceCode: string;
    serviceName: string;
    covered: boolean;
    requiresAuth: boolean;
    authInfo: string;
    limitations: string;
    estimatedCopay: number;
  }>;
  // Errors/warnings
  errors: Array<{ code: string; message: string }>;
  warnings: string[];
}

/** Cached eligibility entry */
interface CachedEligibility {
  result: EligibilityResult;
  cachedAt: number;
  expiresAt: number;
}

// ============================================================================
// Configuration
// ============================================================================

/** Cache duration for eligibility responses (4 hours) */
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

/** Whether to use demo mode (no real API calls) */
let demoMode = true;

/** In-memory eligibility cache */
const eligibilityCache = new Map<string, CachedEligibility>();

// ============================================================================
// Main API
// ============================================================================

/**
 * Sets the eligibility verification mode.
 * In demo mode, returns realistic mock responses without API calls.
 */
export function setEligibilityMode(mode: 'live' | 'demo'): void {
  demoMode = mode === 'demo';
}

/**
 * Gets the current eligibility verification mode.
 */
export function getEligibilityMode(): 'live' | 'demo' {
  return demoMode ? 'demo' : 'live';
}

/**
 * Checks patient eligibility for ABA behavioral health services.
 *
 * In demo mode, returns realistic mock data.
 * In live mode, sends 270 inquiry through Supabase edge function to clearinghouse.
 *
 * @param inquiry - The eligibility inquiry parameters
 * @returns Eligibility result with coverage details and ABA-specific benefits
 */
export async function checkEligibility(
  inquiry: EligibilityInquiry,
): Promise<EligibilityResult> {
  // Check cache first
  const cacheKey = buildCacheKey(inquiry);
  const cached = eligibilityCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { ...cached.result, responseSource: 'cached' };
  }

  // Route to demo or live handler
  const result = demoMode
    ? generateDemoResponse(inquiry)
    : await sendLiveEligibilityInquiry(inquiry);

  // Cache the result
  eligibilityCache.set(cacheKey, {
    result,
    cachedAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

/**
 * Checks eligibility for multiple patients in batch.
 */
export async function checkEligibilityBatch(
  inquiries: EligibilityInquiry[],
): Promise<EligibilityResult[]> {
  const results = await Promise.allSettled(
    inquiries.map((inquiry) => checkEligibility(inquiry))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    // Return error result for failed inquiries
    return createErrorResult(
      inquiries[index],
      'BATCH_ERROR',
      result.reason instanceof Error ? result.reason.message : 'Unknown error',
    );
  });
}

/**
 * Clears the eligibility cache (useful before important verifications).
 */
export function clearEligibilityCache(): void {
  eligibilityCache.clear();
}

/**
 * Removes expired entries from the eligibility cache.
 */
export function pruneEligibilityCache(): number {
  let removed = 0;
  const now = Date.now();
  for (const [key, entry] of eligibilityCache.entries()) {
    if (now >= entry.expiresAt) {
      eligibilityCache.delete(key);
      removed++;
    }
  }
  return removed;
}

/**
 * Gets a summary of the eligibility cache status.
 */
export function getEligibilityCacheStats(): {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
} {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  for (const entry of eligibilityCache.values()) {
    if (now < entry.expiresAt) {
      active++;
    } else {
      expired++;
    }
  }
  return {
    totalEntries: eligibilityCache.size,
    activeEntries: active,
    expiredEntries: expired,
  };
}

/**
 * Builds a 270-format eligibility inquiry for Availity-compatible submission.
 * Returns the structured request object that would be sent to the clearinghouse.
 */
export function build270Request(inquiry: EligibilityInquiry): {
  transactionSetId: '270';
  submitterId: string;
  receiverId: string;
  subscriber: Record<string, string>;
  dependentInfo: Record<string, string> | null;
  provider: Record<string, string>;
  eligibilityDates: Record<string, string>;
  serviceTypes: string[];
  procedureCodes: string[];
} {
  const payerConfig = getPayerConfig(inquiry.payerId);

  const isDependent = inquiry.patient.relationship !== 'self';

  return {
    transactionSetId: '270',
    submitterId: inquiry.provider.npi,
    receiverId: payerConfig?.payerId ?? inquiry.payerId,
    subscriber: {
      memberId: isDependent
        ? (inquiry.patient.subscriberId ?? inquiry.patient.memberId)
        : inquiry.patient.memberId,
      firstName: isDependent
        ? (inquiry.patient.subscriberFirstName ?? '')
        : inquiry.patient.firstName,
      lastName: isDependent
        ? (inquiry.patient.subscriberLastName ?? '')
        : inquiry.patient.lastName,
      dateOfBirth: inquiry.patient.dateOfBirth,
      gender: inquiry.patient.gender,
    },
    dependentInfo: isDependent ? {
      firstName: inquiry.patient.firstName,
      lastName: inquiry.patient.lastName,
      dateOfBirth: inquiry.patient.dateOfBirth,
      gender: inquiry.patient.gender,
      relationship: inquiry.patient.relationship,
    } : null,
    provider: {
      npi: inquiry.provider.npi,
      taxId: inquiry.provider.taxId,
      organizationName: inquiry.provider.organizationName ?? '',
      taxonomyCode: inquiry.provider.taxonomyCode ?? '103K00000X',
    },
    eligibilityDates: {
      serviceDate: inquiry.serviceDate,
    },
    serviceTypes: inquiry.serviceTypeCodes ?? ['MH', '30'],
    procedureCodes: inquiry.cptCodes ?? ABA_CPT_CODES.map((c) => c.code),
  };
}

// ============================================================================
// Live Eligibility (Clearinghouse API)
// ============================================================================

/**
 * Sends a real eligibility inquiry through the Supabase edge function.
 * The edge function routes to Availity, Waystar, or Change Healthcare.
 */
async function sendLiveEligibilityInquiry(
  inquiry: EligibilityInquiry,
): Promise<EligibilityResult> {
  try {
    // Import secureFetch dynamically to avoid circular deps at module load
    const { secureFetch } = await import('../security/secure-fetch');
    const { projectId, publicAnonKey } = await import('../../utils/supabase/info');

    const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/clearinghouse`;

    const requestBody = {
      action: 'eligibility-inquiry',
      data: build270Request(inquiry),
    };

    const response = await secureFetch<Record<string, unknown>>(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || response.error) {
      return createErrorResult(
        inquiry,
        `HTTP_${response.status}`,
        `Clearinghouse error: ${response.error ?? 'Unknown error'}`,
      );
    }

    if (!response.data) {
      return createErrorResult(inquiry, 'EMPTY_RESPONSE', 'No data returned from clearinghouse');
    }

    return parse271Response(response.data, inquiry);
  } catch (error) {
    return createErrorResult(
      inquiry,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to reach clearinghouse',
    );
  }
}

/**
 * Parses a raw 271 response from the clearinghouse into our structured format.
 */
function parse271Response(
  raw: Record<string, unknown>,
  inquiry: EligibilityInquiry,
): EligibilityResult {
  // The clearinghouse returns standardized JSON.
  // Map it to our EligibilityResult structure.
  try {
    const subscriber = raw['subscriber'] as Record<string, string> | undefined;
    const plan = raw['plan'] as Record<string, unknown> | undefined;
    const coverage = raw['coverage'] as Record<string, unknown> | undefined;
    const services = raw['serviceCoverage'] as Array<Record<string, unknown>> | undefined;
    const errors = raw['errors'] as Array<Record<string, string>> | undefined;

    return {
      success: (raw['success'] as boolean) ?? false,
      transactionId: (raw['transactionId'] as string) ?? generateTransactionId(),
      timestamp: new Date().toISOString(),
      responseSource: 'live',
      subscriber: {
        memberId: subscriber?.['memberId'] ?? inquiry.patient.memberId,
        firstName: subscriber?.['firstName'] ?? inquiry.patient.firstName,
        lastName: subscriber?.['lastName'] ?? inquiry.patient.lastName,
        dateOfBirth: subscriber?.['dob'] ?? inquiry.patient.dateOfBirth,
        relationship: subscriber?.['relationship'] ?? inquiry.patient.relationship,
      },
      plan: parsePlanInfo(plan, inquiry.payerId),
      coverage: parseCoverageFinancials(coverage),
      abaBenefits: parseABABenefits(raw),
      serviceCoverage: (services ?? []).map((svc) => ({
        serviceCode: (svc['serviceCode'] as string) ?? '',
        serviceName: (svc['serviceName'] as string) ?? '',
        covered: (svc['covered'] as boolean) ?? false,
        requiresAuth: (svc['requiresAuth'] as boolean) ?? false,
        authInfo: (svc['authInfo'] as string) ?? '',
        limitations: (svc['limitations'] as string) ?? '',
        estimatedCopay: (svc['copay'] as number) ?? 0,
      })),
      errors: (errors ?? []).map((e) => ({
        code: e['code'] ?? '',
        message: e['message'] ?? '',
      })),
      warnings: (raw['warnings'] as string[]) ?? [],
    };
  } catch {
    return createErrorResult(inquiry, 'PARSE_ERROR', 'Failed to parse 271 response');
  }
}

function parsePlanInfo(
  raw: Record<string, unknown> | undefined,
  payerId: string,
): PlanInfo {
  if (!raw) {
    return {
      payerId,
      payerName: '',
      planName: '',
      planType: 'Other',
      groupNumber: '',
      groupName: '',
      effectiveDate: '',
      terminationDate: null,
      isActive: false,
    };
  }
  return {
    payerId: (raw['payerId'] as string) ?? payerId,
    payerName: (raw['payerName'] as string) ?? '',
    planName: (raw['planName'] as string) ?? '',
    planType: (raw['planType'] as PlanInfo['planType']) ?? 'Other',
    groupNumber: (raw['groupNumber'] as string) ?? '',
    groupName: (raw['groupName'] as string) ?? '',
    effectiveDate: (raw['effectiveDate'] as string) ?? '',
    terminationDate: (raw['terminationDate'] as string) ?? null,
    isActive: (raw['isActive'] as boolean) ?? false,
  };
}

function parseCoverageFinancials(
  raw: Record<string, unknown> | undefined,
): CoverageFinancials {
  if (!raw) {
    return {
      deductible: { individual: 0, family: 0, met: 0, remaining: 0 },
      outOfPocketMax: { individual: 0, family: 0, spent: 0, remaining: 0 },
      copay: { behavioralHealth: 0, specialist: 0, telehealth: 0 },
      coinsurance: { inNetworkPercent: 0, outOfNetworkPercent: 0 },
    };
  }

  const deductible = raw['deductible'] as Record<string, number> | undefined;
  const oop = raw['outOfPocketMax'] as Record<string, number> | undefined;
  const copay = raw['copay'] as Record<string, number> | undefined;
  const coinsurance = raw['coinsurance'] as Record<string, number> | undefined;

  return {
    deductible: {
      individual: deductible?.['individual'] ?? 0,
      family: deductible?.['family'] ?? 0,
      met: deductible?.['met'] ?? 0,
      remaining: deductible?.['remaining'] ?? 0,
    },
    outOfPocketMax: {
      individual: oop?.['individual'] ?? 0,
      family: oop?.['family'] ?? 0,
      spent: oop?.['spent'] ?? 0,
      remaining: oop?.['remaining'] ?? 0,
    },
    copay: {
      behavioralHealth: copay?.['behavioralHealth'] ?? 0,
      specialist: copay?.['specialist'] ?? 0,
      telehealth: copay?.['telehealth'] ?? 0,
    },
    coinsurance: {
      inNetworkPercent: coinsurance?.['inNetwork'] ?? 0,
      outOfNetworkPercent: coinsurance?.['outOfNetwork'] ?? 0,
    },
  };
}

function parseABABenefits(
  raw: Record<string, unknown>,
): ABABenefitDetails {
  const aba = raw['abaBenefits'] as Record<string, unknown> | undefined;
  if (!aba) {
    return {
      isCovered: false,
      requiresAuthorization: true,
      currentAuthorization: null,
      coverageLimitations: [],
      networkRestrictions: [],
      providerRequirements: [],
    };
  }

  const auth = aba['currentAuthorization'] as Record<string, unknown> | undefined;

  return {
    isCovered: (aba['isCovered'] as boolean) ?? false,
    requiresAuthorization: (aba['requiresAuthorization'] as boolean) ?? true,
    currentAuthorization: auth ? {
      authorizationNumber: (auth['authorizationNumber'] as string) ?? '',
      startDate: (auth['startDate'] as string) ?? '',
      endDate: (auth['endDate'] as string) ?? '',
      authorizedHoursPerWeek: (auth['authorizedHoursPerWeek'] as number) ?? 0,
      totalAuthorizedUnits: (auth['totalAuthorizedUnits'] as number) ?? 0,
      usedUnits: (auth['usedUnits'] as number) ?? 0,
      remainingUnits: (auth['remainingUnits'] as number) ?? 0,
      authorizedCPTCodes: (auth['authorizedCPTCodes'] as string[]) ?? [],
    } : null,
    coverageLimitations: (aba['coverageLimitations'] as string[]) ?? [],
    ageLimit: aba['ageLimit'] as number | undefined,
    annualVisitLimit: aba['annualVisitLimit'] as number | undefined,
    dollarLimit: aba['dollarLimit'] as number | undefined,
    networkRestrictions: (aba['networkRestrictions'] as string[]) ?? [],
    providerRequirements: (aba['providerRequirements'] as string[]) ?? [],
  };
}

// ============================================================================
// Demo Mode — Realistic Mock Responses
// ============================================================================

/**
 * Generates a realistic demo eligibility response based on the inquiry parameters.
 * Uses payer configuration to produce payer-appropriate responses.
 */
function generateDemoResponse(inquiry: EligibilityInquiry): EligibilityResult {
  const payerConfig = getPayerConfig(inquiry.payerId);
  const payerName = payerConfig?.name ?? 'Demo Payer';
  const planType = getDemoPlanType(inquiry.payerId);

  // Generate deterministic but varied data based on memberId hash
  const hash = simpleHash(inquiry.patient.memberId);
  const deductibleIndividual = [500, 1000, 1500, 2000, 2500, 3000][hash % 6];
  const deductibleMet = Math.floor(deductibleIndividual * ((hash % 80) / 100));
  const oopMax = [4000, 5000, 6000, 7500, 8000, 8700][hash % 6];
  const oopSpent = Math.floor(oopMax * ((hash % 40) / 100));
  const bhCopay = [0, 10, 20, 25, 30, 40, 50][hash % 7];
  const coinsurance = [10, 15, 20, 25, 30][hash % 5];

  // Authorization details — most ABA payers require auth
  const requiresAuth = payerConfig?.priorAuthRequired ?? true;
  const hasActiveAuth = hash % 4 !== 0; // 75% chance of having active auth
  const authHoursPerWeek = [15, 20, 25, 30, 35, 40][hash % 6];
  const totalUnits = authHoursPerWeek * 4 * 12; // ~12 weeks
  const usedUnits = Math.floor(totalUnits * ((hash % 60) / 100));

  const today = new Date(inquiry.serviceDate);
  const authStart = new Date(today);
  authStart.setMonth(authStart.getMonth() - 2);
  const authEnd = new Date(today);
  authEnd.setMonth(authEnd.getMonth() + 4);

  // Build service coverage for requested CPT codes
  const requestedCodes = inquiry.cptCodes ?? ABA_CPT_CODES.map((c) => c.code);
  const serviceCoverage = requestedCodes.map((code) => {
    const cptInfo = ABA_CPT_CODES.find((c) => c.code === code);
    return {
      serviceCode: code,
      serviceName: cptInfo?.description ?? `Procedure ${code}`,
      covered: true,
      requiresAuth,
      authInfo: requiresAuth
        ? (hasActiveAuth ? `Auth #ABA${hash}${code.slice(-3)} active through ${formatDate(authEnd)}` : 'Authorization required — none on file')
        : 'No authorization required',
      limitations: getLimitationsForCode(code, payerConfig?.name),
      estimatedCopay: bhCopay,
    };
  });

  // Warnings based on data
  const warnings: string[] = [];
  if (deductibleMet < deductibleIndividual) {
    const remaining = deductibleIndividual - deductibleMet;
    warnings.push(`Patient has $${remaining} remaining on individual deductible.`);
  }
  if (requiresAuth && !hasActiveAuth) {
    warnings.push('No active ABA authorization on file. Services may be denied without prior authorization.');
  }
  if (usedUnits > totalUnits * 0.8) {
    warnings.push(`Authorization is ${Math.round((usedUnits / totalUnits) * 100)}% utilized. Consider requesting additional units.`);
  }

  return {
    success: true,
    transactionId: generateTransactionId(),
    timestamp: new Date().toISOString(),
    responseSource: 'demo',
    subscriber: {
      memberId: inquiry.patient.memberId,
      firstName: inquiry.patient.firstName,
      lastName: inquiry.patient.lastName,
      dateOfBirth: inquiry.patient.dateOfBirth,
      relationship: inquiry.patient.relationship,
    },
    plan: {
      payerId: inquiry.payerId,
      payerName,
      planName: `${payerName} ${planType} Plan`,
      planType,
      groupNumber: `GRP${hash.toString().padStart(6, '0')}`,
      groupName: 'Demo Employer Group',
      effectiveDate: '2026-01-01',
      terminationDate: null,
      isActive: true,
    },
    coverage: {
      deductible: {
        individual: deductibleIndividual,
        family: deductibleIndividual * 2,
        met: deductibleMet,
        remaining: deductibleIndividual - deductibleMet,
      },
      outOfPocketMax: {
        individual: oopMax,
        family: oopMax * 2,
        spent: oopSpent,
        remaining: oopMax - oopSpent,
      },
      copay: {
        behavioralHealth: bhCopay,
        specialist: bhCopay + 10,
        telehealth: Math.max(0, bhCopay - 5),
      },
      coinsurance: {
        inNetworkPercent: coinsurance,
        outOfNetworkPercent: coinsurance + 20,
      },
    },
    abaBenefits: {
      isCovered: true,
      requiresAuthorization: requiresAuth,
      currentAuthorization: hasActiveAuth ? {
        authorizationNumber: `ABA${hash}${today.getFullYear()}`,
        startDate: formatDate(authStart),
        endDate: formatDate(authEnd),
        authorizedHoursPerWeek: authHoursPerWeek,
        totalAuthorizedUnits: totalUnits,
        usedUnits,
        remainingUnits: totalUnits - usedUnits,
        authorizedCPTCodes: ['97153', '97155', '97156', '97151'],
      } : null,
      coverageLimitations: getDemoLimitations(planType),
      ageLimit: planType === 'Medicaid' ? undefined : 21,
      networkRestrictions: [
        'Services must be rendered by an in-network provider',
        'BCBA supervision required for RBT-delivered services',
      ],
      providerRequirements: [
        'Rendering provider must be a certified BCBA or RBT',
        'RBT services require BCBA supervision per BACB guidelines',
        'Provider must be enrolled with payer and credentialed',
      ],
    },
    serviceCoverage,
    errors: [],
    warnings,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function buildCacheKey(inquiry: EligibilityInquiry): string {
  return [
    inquiry.payerId,
    inquiry.patient.memberId,
    inquiry.provider.npi,
    inquiry.serviceDate,
    (inquiry.cptCodes ?? []).sort().join(','),
  ].join('|');
}

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ELG-${timestamp}-${random}`.toUpperCase();
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDemoPlanType(payerId: string): PlanInfo['planType'] {
  const id = payerId.toLowerCase();
  if (id.includes('medicaid') || id.includes('ahcccs') || id.includes('dphhs') || id.includes('medi-cal')) {
    return 'Medicaid';
  }
  if (id.includes('medicare')) return 'Medicare';
  if (id.includes('tricare')) return 'Tricare';
  if (id.includes('kaiser')) return 'HMO';
  if (id.includes('hdhp')) return 'HDHP';
  // Default based on hash
  const types: PlanInfo['planType'][] = ['PPO', 'HMO', 'EPO', 'POS'];
  return types[simpleHash(payerId) % types.length];
}

function getDemoLimitations(planType: PlanInfo['planType']): string[] {
  const common = [
    'Services must be medically necessary per treatment plan',
    'Treatment plan must be reviewed and updated every 6 months',
  ];

  switch (planType) {
    case 'Medicaid':
      return [
        ...common,
        'No age limit for ABA services under EPSDT',
        'Authorization required every 6 months',
        'Maximum 40 hours per week combined services',
      ];
    case 'HMO':
      return [
        ...common,
        'Referral from PCP may be required',
        'Services limited to in-network providers only',
        'Annual re-authorization required',
      ];
    case 'PPO':
      return [
        ...common,
        'Out-of-network benefits available at higher cost share',
        'Authorization required for initial and continued services',
      ];
    default:
      return [
        ...common,
        'Authorization required for ABA services',
        'Annual benefit maximum may apply — check with payer',
      ];
  }
}

function getLimitationsForCode(code: string, payerName?: string): string {
  const limitations: Record<string, string> = {
    '97151': 'Limited to initial assessment and re-assessments per treatment plan cycle',
    '97152': 'Must be followed by 97151 assessment; supporting assessment only',
    '97153': 'Direct 1:1 therapy; requires active authorization; max units per day may apply',
    '97154': 'Group therapy; maximum 8 patients per group per AMA guidelines',
    '97155': 'BCBA supervision of 97153; must be delivered by qualified BCBA',
    '97156': 'Caregiver training; limited sessions per authorization period may apply',
    '97157': 'Group caregiver training; maximum 8 caregivers per session',
    '97158': 'Group adaptive behavior; maximum 8 patients per group',
    '0373T': 'Exposure-based adaptive behavior treatment; check payer coverage',
    '0362T': 'Adaptive behavior assessment by protocol; some payers may not cover Category III codes',
  };

  let limitation = limitations[code] ?? 'Standard coverage limitations apply';

  if (payerName) {
    limitation += ` (${payerName} specific rules may apply)`;
  }

  return limitation;
}

function createErrorResult(
  inquiry: EligibilityInquiry,
  errorCode: string,
  errorMessage: string,
): EligibilityResult {
  return {
    success: false,
    transactionId: generateTransactionId(),
    timestamp: new Date().toISOString(),
    responseSource: demoMode ? 'demo' : 'live',
    subscriber: {
      memberId: inquiry.patient.memberId,
      firstName: inquiry.patient.firstName,
      lastName: inquiry.patient.lastName,
      dateOfBirth: inquiry.patient.dateOfBirth,
      relationship: inquiry.patient.relationship,
    },
    plan: {
      payerId: inquiry.payerId,
      payerName: '',
      planName: '',
      planType: 'Other',
      groupNumber: '',
      groupName: '',
      effectiveDate: '',
      terminationDate: null,
      isActive: false,
    },
    coverage: {
      deductible: { individual: 0, family: 0, met: 0, remaining: 0 },
      outOfPocketMax: { individual: 0, family: 0, spent: 0, remaining: 0 },
      copay: { behavioralHealth: 0, specialist: 0, telehealth: 0 },
      coinsurance: { inNetworkPercent: 0, outOfNetworkPercent: 0 },
    },
    abaBenefits: {
      isCovered: false,
      requiresAuthorization: true,
      currentAuthorization: null,
      coverageLimitations: [],
      networkRestrictions: [],
      providerRequirements: [],
    },
    serviceCoverage: [],
    errors: [{ code: errorCode, message: errorMessage }],
    warnings: [],
  };
}
