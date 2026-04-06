// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * insurance-eligibility.ts
 * Real-time eligibility check via Stedi's 270/271 API.
 * Falls back to mock data when VITE_STEDI_API_KEY is not configured.
 */

// ============================================================================
// Types
// ============================================================================

export interface EligibilityRequest {
  memberId: string;
  payerId: string; // Stedi payer ID e.g. "BCBSIL"
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  serviceType?: string; // default "ABA" → maps to service type code "Applied Behavioral Analysis"
  npi?: string; // provider NPI
}

export interface EligibilityResult {
  active: boolean;
  planName: string;
  groupNumber?: string;
  deductible?: { individual: number; met: number; remaining: number };
  outOfPocketMax?: { individual: number; met: number; remaining: number };
  copay?: number;
  coinsurance?: number; // e.g. 0.20 for 20%
  authRequired: boolean;
  coveredServices: string[];
  rawResponse?: unknown;
  checkedAt: string;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry {
  result: EligibilityResult;
  expiresAt: number;
}

function cacheKey(req: EligibilityRequest): string {
  return `aminy_elig_${req.memberId}_${req.payerId}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

function readCache(key: string): EligibilityResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function writeCache(key: string, result: EligibilityResult): void {
  try {
    const entry: CacheEntry = { result, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

// ============================================================================
// Stedi API
// ============================================================================

const STEDI_ELIGIBILITY_URL =
  'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3';

// Maps our ABA service type to the X12 271 service type code
const ABA_SERVICE_TYPE_CODE = '96'; // "Applied Behavioral Analysis" in standard X12

/**
 * Returns true when a Stedi API key is present in the environment.
 */
export function isEligibilityConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STEDI_API_KEY);
}

/**
 * Parse a dollar amount from Stedi's benefit amount structures.
 * Stedi returns amounts as strings like "1500.00".
 */
function parseDollar(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
}

/**
 * Extract deductible / OOP info from a Stedi 271 benefitBalance array.
 */
function extractBenefit(
  benefits: unknown[],
  code: string
): { individual: number; met: number; remaining: number } | undefined {
  const matches = (benefits as Record<string, unknown>[]).filter(
    b => b.benefitCode === code || b.code === code
  );
  if (!matches.length) return undefined;

  let individual = 0;
  let met = 0;

  for (const b of matches) {
    const amounts = (b.benefitAmounts ?? b.amounts ?? []) as Record<string, unknown>[];
    for (const a of amounts) {
      const qualifier = (a.qualifier ?? a.amountQualifier ?? '') as string;
      const val = parseDollar(a.amount ?? a.value);
      if (qualifier === 'EligibilityOrBenefitAmount') individual = val;
      if (qualifier === 'SpendDown' || qualifier === 'AmountMet') met = val;
    }
  }

  const remaining = Math.max(0, individual - met);
  return { individual, met, remaining };
}

/**
 * Map a raw Stedi 271 response to our EligibilityResult shape.
 */
function mapStediResponse(raw: unknown, req: EligibilityRequest): EligibilityResult {
  const data = raw as Record<string, unknown>;

  // Top-level subscriber / coverage info
  const subscriber = (data.subscriber ?? data.member ?? {}) as Record<string, unknown>;
  const coverages = (data.coverages ?? data.benefits ?? []) as Record<string, unknown>[];

  // Active status: look for active indicator
  const coverageStatus = (data.coverageStatus ?? subscriber.coverageStatus ?? 'unknown') as string;
  const active = coverageStatus.toLowerCase() === 'active' || coverageStatus === '1';

  const planName =
    (data.planName ?? data.groupName ?? subscriber.groupName ?? subscriber.planName ?? 'Unknown Plan') as string;
  const groupNumber = (subscriber.groupNumber ?? data.groupNumber ?? undefined) as string | undefined;

  // Benefits — filter to ABA or catch-all
  const abaBenefits = coverages.filter(c => {
    const code = (c.serviceTypeCode ?? c.serviceType ?? '') as string;
    return code === ABA_SERVICE_TYPE_CODE || code === 'ABA' || !code;
  });

  const deductible = extractBenefit(abaBenefits, 'C' /* Deductible */);
  const outOfPocketMax = extractBenefit(abaBenefits, 'G' /* Out-of-Pocket Maximum */);

  // Copay / coinsurance
  let copay: number | undefined;
  let coinsurance: number | undefined;
  for (const b of abaBenefits) {
    const code = (b.benefitCode ?? b.code ?? '') as string;
    const amounts = (b.benefitAmounts ?? b.amounts ?? []) as Record<string, unknown>[];
    if (code === 'B' /* Co-Payment */) {
      copay = parseDollar(amounts[0]?.amount ?? amounts[0]?.value) || undefined;
    }
    if (code === 'A' /* Co-Insurance */) {
      const pct = parseDollar(amounts[0]?.amount ?? amounts[0]?.value);
      coinsurance = pct > 1 ? pct / 100 : pct || undefined;
    }
  }

  // Auth required
  const authRequired = coverages.some(c => {
    const prior = (c.authorizationRequired ?? c.priorAuthorizationRequired ?? '') as string;
    return prior === 'Y' || prior === 'Yes' || prior === 'true';
  });

  // Covered services list
  const coveredServices = coverages
    .map(c => (c.serviceTypeName ?? c.serviceType ?? '') as string)
    .filter(Boolean)
    .slice(0, 10);

  return {
    active,
    planName,
    groupNumber,
    deductible,
    outOfPocketMax,
    copay,
    coinsurance,
    authRequired,
    coveredServices: coveredServices.length ? coveredServices : ['ABA Therapy'],
    rawResponse: raw,
    checkedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Mock data (dev mode)
// ============================================================================

function buildMockResult(req: EligibilityRequest): EligibilityResult {
  return {
    active: true,
    planName: `${req.payerId} PPO Gold (Demo)`,
    groupNumber: 'GRP-00000',
    deductible: { individual: 1500, met: 400, remaining: 1100 },
    outOfPocketMax: { individual: 5000, met: 900, remaining: 4100 },
    copay: 25,
    coinsurance: 0.2,
    authRequired: true,
    coveredServices: ['ABA Therapy', 'Speech Therapy', 'Occupational Therapy'],
    checkedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check real-time eligibility for a member.
 * Uses localStorage cache (4-hour TTL).
 * Returns mock data when Stedi is not configured.
 */
export async function checkEligibility(req: EligibilityRequest): Promise<EligibilityResult> {
  // Dev mode — no API key
  if (!isEligibilityConfigured()) {
    return buildMockResult(req);
  }

  const key = cacheKey(req);
  const cached = readCache(key);
  if (cached) return cached;

  const serviceTypeCode = req.serviceType === 'ABA' || !req.serviceType ? ABA_SERVICE_TYPE_CODE : req.serviceType;

  const body: Record<string, unknown> = {
    controlNumber: String(Date.now()).slice(-9), // 9-digit control number
    tradingPartnerServiceId: req.payerId,
    provider: {
      organizationName: 'Aminy Health',
      ...(req.npi ? { npi: req.npi } : {}),
    },
    subscriber: {
      memberId: req.memberId,
      firstName: req.firstName,
      lastName: req.lastName,
      dateOfBirth: req.dateOfBirth.replace(/-/g, ''), // YYYYMMDD
    },
    encounter: {
      serviceTypeCodes: [serviceTypeCode],
    },
  };

  const response = await fetch(STEDI_ELIGIBILITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${import.meta.env.VITE_STEDI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Stedi eligibility check failed (${response.status}): ${errorText}`);
  }

  const raw: unknown = await response.json();
  const result = mapStediResponse(raw, req);

  writeCache(key, result);
  return result;
}
