// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * claim-validator.ts
 *
 * Comprehensive pre-submission claim validation for ABA/behavioral health claims.
 * Validates claims against payer-specific rules, CPT/modifier combinations,
 * NPI checksum, timely filing, authorization matching, duplicate detection,
 * and rendering/billing provider requirements.
 *
 * Designed to catch rejection-causing errors BEFORE submission to the clearinghouse.
 */

import {
  getPayerConfig,
  getCPTCodeConfig,
  getTimelyFilingDeadline,
  isValidABACPT,
  ABA_CPT_CODES,
  PLACE_OF_SERVICE,
  type PayerConfig,
} from './payer-configs';

// ============================================================================
// Types
// ============================================================================

/** A field on the claim being validated */
export type ClaimField =
  | 'billingProvider.npi'
  | 'billingProvider.taxId'
  | 'billingProvider.name'
  | 'billingProvider.address'
  | 'renderingProvider.npi'
  | 'renderingProvider.name'
  | 'subscriber.memberId'
  | 'subscriber.name'
  | 'subscriber.dob'
  | 'subscriber.gender'
  | 'payer.payerId'
  | 'payer.payerName'
  | 'diagnosis'
  | `diagnosis[${number}]`
  | 'services'
  | `services[${number}]`
  | `services[${number}].procedureCode`
  | `services[${number}].modifier`
  | `services[${number}].serviceDate`
  | `services[${number}].placeOfService`
  | `services[${number}].chargeAmount`
  | `services[${number}].units`
  | `services[${number}].diagnosisPointers`
  | `services[${number}].renderingProviderNpi`
  | 'authorization'
  | 'totalCharges'
  | 'duplicate'
  | string;

/** Severity of a validation issue */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** A single validation issue */
export interface ValidationIssue {
  severity: ValidationSeverity;
  field: ClaimField;
  code: string;
  message: string;
  suggestion?: string;
}

/** Result of claim validation */
export interface ClaimValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  allIssues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  payerConfig?: PayerConfig;
  validatedAt: string;
}

/** Claim structure for validation (mirrors ClaimSubmission from clearinghouse-integration) */
export interface ClaimForValidation {
  claimType: 'professional' | 'institutional';
  billingProvider: {
    npi: string;
    taxId: string;
    name: string;
    address?: {
      street1?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  renderingProvider?: {
    npi: string;
    name: string;
    taxonomy?: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender?: 'M' | 'F' | 'U';
    address?: {
      street1?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  payer: {
    payerId: string;
    payerName: string;
  };
  diagnosis: Array<{
    code: string;
    isPrimary: boolean;
    description?: string;
  }>;
  services: Array<{
    procedureCode: string;
    modifiers?: string[];
    serviceDate: string;
    serviceDateEnd?: string;
    placeOfService: string;
    chargeAmount: number;
    units: number;
    diagnosisPointers: number[];
    renderingProviderNpi?: string;
    description?: string;
  }>;
  totalCharges: number;
  authorization?: {
    number: string;
    expirationDate?: string;
    authorizedUnits?: number;
    authorizedCodes?: string[];
  };
  priorClaimId?: string;
  submissionDate?: string;
}

/** Previously submitted claim for duplicate detection */
export interface PreviousClaim {
  claimId: string;
  subscriberMemberId: string;
  serviceDate: string;
  procedureCode: string;
  billingProviderNpi: string;
  chargeAmount: number;
  submittedAt: string;
}

// ============================================================================
// NPI Validation (Luhn Algorithm — ISO/IEC 7812)
// ============================================================================

/**
 * Validates an NPI using the Luhn check digit algorithm.
 *
 * NPI is a 10-digit number where:
 * - Prefix: 80840 (for health provider identifier)
 * - The last digit is a Luhn check digit computed over "80840" + first 9 digits
 *
 * Reference: 45 CFR 162.406, CMS NPI Final Rule
 */
export function validateNPI(npi: string): { valid: boolean; error?: string } {
  if (!npi) {
    return { valid: false, error: 'NPI is required' };
  }

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(npi)) {
    return { valid: false, error: `NPI must be exactly 10 digits. Got: "${npi}" (${npi.length} chars)` };
  }

  // NPI must start with 1 or 2 (Type 1 = individual, Type 2 = organization)
  const firstDigit = npi.charAt(0);
  if (firstDigit !== '1' && firstDigit !== '2') {
    return { valid: false, error: `NPI must start with 1 (individual) or 2 (organization). Got: ${firstDigit}` };
  }

  // Luhn check: prefix with "80840", then validate check digit
  const prefixed = '80840' + npi;
  const digits = prefixed.split('').map(Number);
  let sum = 0;

  // Process from right to left, doubling every second digit
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    const posFromRight = digits.length - 1 - i;

    // Double every second digit (positions 1, 3, 5, ... from right)
    if (posFromRight % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: 'NPI fails Luhn check digit validation. Verify the number is correct.' };
  }

  return { valid: true };
}

// ============================================================================
// Core Validation
// ============================================================================

/**
 * Validates a claim for pre-submission.
 *
 * Returns a comprehensive validation result with categorized issues.
 * A claim with any errors should NOT be submitted.
 * Warnings are advisory — submission may succeed but could cause downstream issues.
 *
 * @param claim - The claim to validate
 * @param previousClaims - Optional list of previously submitted claims for duplicate detection
 */
export function validateClaim(
  claim: ClaimForValidation,
  previousClaims?: PreviousClaim[]
): ClaimValidationResult {
  const issues: ValidationIssue[] = [];

  // Get payer config for payer-specific rules
  const payerConfig = getPayerConfig(claim.payer.payerId);

  // --- Billing Provider Validation ---
  validateBillingProvider(claim, issues);

  // --- Rendering Provider Validation ---
  validateRenderingProvider(claim, issues);

  // --- Subscriber Validation ---
  validateSubscriber(claim, issues);

  // --- Payer Validation ---
  validatePayer(claim, payerConfig, issues);

  // --- Diagnosis Validation ---
  validateDiagnoses(claim, issues);

  // --- Service Line Validation ---
  validateServiceLines(claim, payerConfig, issues);

  // --- CPT/Modifier Combination Validation ---
  validateCPTModifierCombinations(claim, issues);

  // --- Authorization Validation ---
  validateAuthorization(claim, payerConfig, issues);

  // --- Timely Filing Validation ---
  validateTimelyFiling(claim, payerConfig, issues);

  // --- Total Charges Validation ---
  validateTotalCharges(claim, issues);

  // --- Duplicate Detection ---
  if (previousClaims && previousClaims.length > 0) {
    detectDuplicates(claim, previousClaims, issues);
  }

  // --- Rendering vs Billing Provider Rules ---
  validateProviderRoles(claim, issues);

  // Categorize issues
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    allIssues: issues,
    errorCount: errors.length,
    warningCount: warnings.length,
    payerConfig,
    validatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Validation Sub-routines
// ============================================================================

function validateBillingProvider(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  // NPI
  if (!claim.billingProvider.npi) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.npi',
      code: 'BP-001',
      message: 'Billing provider NPI is required.',
    });
  } else {
    const npiResult = validateNPI(claim.billingProvider.npi);
    if (!npiResult.valid) {
      issues.push({
        severity: 'error',
        field: 'billingProvider.npi',
        code: 'BP-002',
        message: `Invalid billing provider NPI: ${npiResult.error}`,
        suggestion: 'Verify NPI at https://npiregistry.cms.hhs.gov',
      });
    }
  }

  // Tax ID
  if (!claim.billingProvider.taxId) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.taxId',
      code: 'BP-003',
      message: 'Billing provider Tax ID (EIN or SSN) is required.',
    });
  } else {
    const cleaned = claim.billingProvider.taxId.replace(/[-\s]/g, '');
    if (!/^\d{9}$/.test(cleaned)) {
      issues.push({
        severity: 'error',
        field: 'billingProvider.taxId',
        code: 'BP-004',
        message: 'Tax ID must be 9 digits (EIN format: XX-XXXXXXX).',
      });
    }
  }

  // Name
  if (!claim.billingProvider.name || claim.billingProvider.name.trim().length < 2) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.name',
      code: 'BP-005',
      message: 'Billing provider name is required.',
    });
  }

  // Address
  if (!claim.billingProvider.address?.zip) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.address',
      code: 'BP-006',
      message: 'Billing provider ZIP code is required for claim submission.',
    });
  }

  if (!claim.billingProvider.address?.state) {
    issues.push({
      severity: 'warning',
      field: 'billingProvider.address',
      code: 'BP-007',
      message: 'Billing provider state is recommended.',
    });
  }
}

function validateRenderingProvider(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  if (!claim.renderingProvider) return;

  if (!claim.renderingProvider.npi) {
    issues.push({
      severity: 'error',
      field: 'renderingProvider.npi',
      code: 'RP-001',
      message: 'Rendering provider NPI is required when rendering provider is specified.',
    });
  } else {
    const npiResult = validateNPI(claim.renderingProvider.npi);
    if (!npiResult.valid) {
      issues.push({
        severity: 'error',
        field: 'renderingProvider.npi',
        code: 'RP-002',
        message: `Invalid rendering provider NPI: ${npiResult.error}`,
        suggestion: 'Verify NPI at https://npiregistry.cms.hhs.gov',
      });
    }
  }

  if (!claim.renderingProvider.name || claim.renderingProvider.name.trim().length < 2) {
    issues.push({
      severity: 'warning',
      field: 'renderingProvider.name',
      code: 'RP-003',
      message: 'Rendering provider name is recommended.',
    });
  }
}

function validateSubscriber(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  if (!claim.subscriber.memberId) {
    issues.push({
      severity: 'error',
      field: 'subscriber.memberId',
      code: 'SUB-001',
      message: 'Subscriber member ID is required.',
    });
  }

  if (!claim.subscriber.firstName || !claim.subscriber.lastName) {
    issues.push({
      severity: 'error',
      field: 'subscriber.name',
      code: 'SUB-002',
      message: 'Subscriber first and last name are required.',
    });
  }

  if (!claim.subscriber.dob) {
    issues.push({
      severity: 'error',
      field: 'subscriber.dob',
      code: 'SUB-003',
      message: 'Subscriber date of birth is required.',
    });
  } else {
    const dob = new Date(claim.subscriber.dob);
    if (isNaN(dob.getTime())) {
      issues.push({
        severity: 'error',
        field: 'subscriber.dob',
        code: 'SUB-004',
        message: `Invalid date of birth: "${claim.subscriber.dob}". Use YYYY-MM-DD format.`,
      });
    } else if (dob > new Date()) {
      issues.push({
        severity: 'error',
        field: 'subscriber.dob',
        code: 'SUB-005',
        message: 'Subscriber date of birth cannot be in the future.',
      });
    }
  }

  if (!claim.subscriber.gender) {
    issues.push({
      severity: 'warning',
      field: 'subscriber.gender',
      code: 'SUB-006',
      message: 'Subscriber gender is recommended. Some payers require it.',
    });
  }
}

function validatePayer(
  claim: ClaimForValidation,
  payerConfig: PayerConfig | undefined,
  issues: ValidationIssue[]
): void {
  if (!claim.payer.payerId) {
    issues.push({
      severity: 'error',
      field: 'payer.payerId',
      code: 'PAY-001',
      message: 'Payer ID is required.',
    });
  }

  if (!claim.payer.payerName) {
    issues.push({
      severity: 'warning',
      field: 'payer.payerName',
      code: 'PAY-002',
      message: 'Payer name is recommended for claim tracking.',
    });
  }

  if (!payerConfig) {
    issues.push({
      severity: 'info',
      field: 'payer.payerId',
      code: 'PAY-003',
      message: `Payer ID "${claim.payer.payerId}" not found in configured payers. Using default validation rules.`,
      suggestion: 'Verify payer ID is correct or add payer configuration.',
    });
  }
}

function validateDiagnoses(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  if (!claim.diagnosis || claim.diagnosis.length === 0) {
    issues.push({
      severity: 'error',
      field: 'diagnosis',
      code: 'DX-001',
      message: 'At least one diagnosis code (ICD-10-CM) is required.',
    });
    return;
  }

  // Check for primary diagnosis
  const hasPrimary = claim.diagnosis.some((d) => d.isPrimary);
  if (!hasPrimary) {
    issues.push({
      severity: 'warning',
      field: 'diagnosis',
      code: 'DX-002',
      message: 'No primary diagnosis flagged. First diagnosis will be used as primary.',
      suggestion: 'Set isPrimary=true on the principal diagnosis.',
    });
  }

  // Check max 12 diagnosis codes (CMS-1500 limit)
  if (claim.diagnosis.length > 12) {
    issues.push({
      severity: 'error',
      field: 'diagnosis',
      code: 'DX-003',
      message: `Too many diagnosis codes (${claim.diagnosis.length}). Maximum 12 allowed on CMS-1500.`,
    });
  }

  // Validate each diagnosis code
  for (let i = 0; i < claim.diagnosis.length; i++) {
    const dx = claim.diagnosis[i];
    if (!isValidICD10CM(dx.code)) {
      issues.push({
        severity: 'error',
        field: `diagnosis[${i}]`,
        code: 'DX-004',
        message: `Invalid ICD-10-CM code: "${dx.code}". Format: letter + 2+ digits, optional decimal.`,
      });
    }
  }

  // ABA-specific: check for autism spectrum diagnosis
  const hasAutismDx = claim.diagnosis.some(
    (d) =>
      d.code.startsWith('F84') ||
      d.code === 'F84.0' ||
      d.code === 'F84.5' ||
      d.code === 'F84.8' ||
      d.code === 'F84.9'
  );

  const hasABACodes = claim.services.some((s) =>
    s.procedureCode.startsWith('9715') || s.procedureCode.startsWith('9716')
  );

  if (hasABACodes && !hasAutismDx) {
    issues.push({
      severity: 'warning',
      field: 'diagnosis',
      code: 'DX-005',
      message: 'ABA CPT codes (97151-97158) typically require an autism spectrum diagnosis (F84.x) as primary or secondary.',
      suggestion: 'Verify diagnosis supports medical necessity for ABA services.',
    });
  }
}

function validateServiceLines(
  claim: ClaimForValidation,
  payerConfig: PayerConfig | undefined,
  issues: ValidationIssue[]
): void {
  if (!claim.services || claim.services.length === 0) {
    issues.push({
      severity: 'error',
      field: 'services',
      code: 'SVC-001',
      message: 'At least one service line is required.',
    });
    return;
  }

  // Max 50 service lines per CMS-1500
  if (claim.services.length > 50) {
    issues.push({
      severity: 'error',
      field: 'services',
      code: 'SVC-002',
      message: `Too many service lines (${claim.services.length}). Maximum 50 per claim.`,
    });
  }

  for (let i = 0; i < claim.services.length; i++) {
    const svc = claim.services[i];

    // Procedure code
    if (!svc.procedureCode) {
      issues.push({
        severity: 'error',
        field: `services[${i}].procedureCode`,
        code: 'SVC-003',
        message: `Service line ${i + 1}: Procedure code is required.`,
      });
    } else if (!isValidCPTCode(svc.procedureCode)) {
      issues.push({
        severity: 'error',
        field: `services[${i}].procedureCode`,
        code: 'SVC-004',
        message: `Service line ${i + 1}: Invalid CPT/HCPCS code "${svc.procedureCode}".`,
      });
    }

    // Service date
    if (!svc.serviceDate) {
      issues.push({
        severity: 'error',
        field: `services[${i}].serviceDate`,
        code: 'SVC-005',
        message: `Service line ${i + 1}: Service date is required.`,
      });
    } else {
      const svcDate = new Date(svc.serviceDate);
      if (isNaN(svcDate.getTime())) {
        issues.push({
          severity: 'error',
          field: `services[${i}].serviceDate`,
          code: 'SVC-006',
          message: `Service line ${i + 1}: Invalid service date "${svc.serviceDate}".`,
        });
      } else if (svcDate > new Date()) {
        issues.push({
          severity: 'error',
          field: `services[${i}].serviceDate`,
          code: 'SVC-007',
          message: `Service line ${i + 1}: Service date cannot be in the future.`,
        });
      }
    }

    // Charge amount
    if (svc.chargeAmount <= 0) {
      issues.push({
        severity: 'error',
        field: `services[${i}].chargeAmount`,
        code: 'SVC-008',
        message: `Service line ${i + 1}: Charge amount must be greater than zero.`,
      });
    }

    // Units
    if (svc.units <= 0) {
      issues.push({
        severity: 'error',
        field: `services[${i}].units`,
        code: 'SVC-009',
        message: `Service line ${i + 1}: Units must be greater than zero.`,
      });
    }

    // Max units per day check for ABA codes
    if (isValidABACPT(svc.procedureCode)) {
      const cptConfig = getCPTCodeConfig(svc.procedureCode);
      if (cptConfig?.maxUnitsPerDay && svc.units > cptConfig.maxUnitsPerDay) {
        issues.push({
          severity: 'warning',
          field: `services[${i}].units`,
          code: 'SVC-010',
          message: `Service line ${i + 1}: ${svc.units} units of ${svc.procedureCode} exceeds typical daily max of ${cptConfig.maxUnitsPerDay} units.`,
          suggestion: 'Verify documentation supports the billed units.',
        });
      }
    }

    // Place of service
    if (!svc.placeOfService) {
      issues.push({
        severity: 'warning',
        field: `services[${i}].placeOfService`,
        code: 'SVC-011',
        message: `Service line ${i + 1}: Place of service not specified.`,
        suggestion: 'Use 02 for telehealth, 11 for office, 12 for home.',
      });
    } else if (!PLACE_OF_SERVICE[svc.placeOfService]) {
      issues.push({
        severity: 'warning',
        field: `services[${i}].placeOfService`,
        code: 'SVC-012',
        message: `Service line ${i + 1}: Place of service "${svc.placeOfService}" not in standard list.`,
      });
    }

    // Telehealth POS with GT/95 modifier check
    if (svc.placeOfService === '02' || svc.placeOfService === '10') {
      const hasTelehealthModifier = svc.modifiers?.some(
        (m) => m === 'GT' || m === '95'
      );
      if (!hasTelehealthModifier) {
        issues.push({
          severity: 'warning',
          field: `services[${i}].modifier`,
          code: 'SVC-013',
          message: `Service line ${i + 1}: Telehealth POS (${svc.placeOfService}) without GT or 95 modifier. Some payers require telehealth modifier.`,
        });
      }
    }

    // Diagnosis pointers
    if (!svc.diagnosisPointers || svc.diagnosisPointers.length === 0) {
      issues.push({
        severity: 'error',
        field: `services[${i}].diagnosisPointers`,
        code: 'SVC-014',
        message: `Service line ${i + 1}: At least one diagnosis pointer is required.`,
      });
    } else {
      for (const ptr of svc.diagnosisPointers) {
        if (ptr < 1 || ptr > (claim.diagnosis?.length ?? 0)) {
          issues.push({
            severity: 'error',
            field: `services[${i}].diagnosisPointers`,
            code: 'SVC-015',
            message: `Service line ${i + 1}: Diagnosis pointer ${ptr} out of range (1-${claim.diagnosis?.length ?? 0}).`,
          });
        }
      }
    }

    // Rendering provider NPI on service line
    if (svc.renderingProviderNpi) {
      const npiResult = validateNPI(svc.renderingProviderNpi);
      if (!npiResult.valid) {
        issues.push({
          severity: 'error',
          field: `services[${i}].renderingProviderNpi`,
          code: 'SVC-016',
          message: `Service line ${i + 1}: Invalid rendering NPI: ${npiResult.error}`,
        });
      }
    }
  }
}

function validateCPTModifierCombinations(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  for (let i = 0; i < claim.services.length; i++) {
    const svc = claim.services[i];
    if (!svc.procedureCode || !isValidABACPT(svc.procedureCode)) continue;

    const cptConfig = getCPTCodeConfig(svc.procedureCode);
    if (!cptConfig) continue;

    // Check if modifier is required
    if (cptConfig.requiresModifier) {
      const hasCredentialModifier = svc.modifiers?.some(
        (m) => ['HN', 'HO', 'HP'].includes(m)
      );
      if (!hasCredentialModifier) {
        issues.push({
          severity: 'error',
          field: `services[${i}].modifier`,
          code: 'MOD-001',
          message: `Service line ${i + 1}: ${svc.procedureCode} requires a credential modifier (HN, HO, or HP).`,
          suggestion: 'HN=RBT/Bachelor\'s, HO=BCBA/Master\'s, HP=Doctoral',
        });
      }
    }

    // Validate modifier is allowed for this code
    if (svc.modifiers) {
      for (const mod of svc.modifiers) {
        if (
          ['HN', 'HO', 'HP'].includes(mod) &&
          !cptConfig.allowedModifiers.includes(mod)
        ) {
          issues.push({
            severity: 'error',
            field: `services[${i}].modifier`,
            code: 'MOD-002',
            message: `Service line ${i + 1}: Modifier ${mod} is not allowed with ${svc.procedureCode}. Allowed: ${cptConfig.allowedModifiers.join(', ')}.`,
          });
        }
      }
    }

    // Supervision codes (97155, 97156) should use HO or HP, not HN
    if (['97155', '97156'].includes(svc.procedureCode)) {
      const hasHN = svc.modifiers?.includes('HN');
      if (hasHN) {
        issues.push({
          severity: 'error',
          field: `services[${i}].modifier`,
          code: 'MOD-003',
          message: `Service line ${i + 1}: ${svc.procedureCode} is a BCBA-level service. Cannot use HN (technician) modifier.`,
          suggestion: 'Use HO (master\'s/BCBA) or HP (doctoral) instead.',
        });
      }
    }

    // Treatment codes (97153, 97152) with HO — unusual unless BCBA is providing direct
    if (['97153', '97152'].includes(svc.procedureCode)) {
      const hasHO = svc.modifiers?.includes('HO');
      const hasHP = svc.modifiers?.includes('HP');
      if (hasHO || hasHP) {
        issues.push({
          severity: 'info',
          field: `services[${i}].modifier`,
          code: 'MOD-004',
          message: `Service line ${i + 1}: ${svc.procedureCode} with ${hasHO ? 'HO' : 'HP'} — typically delivered by RBT (HN). Verify BCBA is delivering direct treatment.`,
        });
      }
    }

    // Max 4 modifiers per service line
    if (svc.modifiers && svc.modifiers.length > 4) {
      issues.push({
        severity: 'error',
        field: `services[${i}].modifier`,
        code: 'MOD-005',
        message: `Service line ${i + 1}: Maximum 4 modifiers allowed. Got ${svc.modifiers.length}.`,
      });
    }
  }
}

function validateAuthorization(
  claim: ClaimForValidation,
  payerConfig: PayerConfig | undefined,
  issues: ValidationIssue[]
): void {
  // Check if payer requires prior auth
  const requiresAuth = payerConfig?.priorAuthRequired ?? true;

  if (requiresAuth && !claim.authorization?.number) {
    issues.push({
      severity: 'warning',
      field: 'authorization',
      code: 'AUTH-001',
      message: `Payer${payerConfig ? ` (${payerConfig.name})` : ''} typically requires prior authorization. No auth number provided.`,
      suggestion: 'Claims without auth may be denied. Obtain authorization before submission.',
    });
  }

  if (claim.authorization) {
    // Check auth expiration
    if (claim.authorization.expirationDate) {
      const authExpiry = new Date(claim.authorization.expirationDate);
      const latestServiceDate = getLatestServiceDate(claim);

      if (latestServiceDate && authExpiry < latestServiceDate) {
        issues.push({
          severity: 'error',
          field: 'authorization',
          code: 'AUTH-002',
          message: `Authorization expired on ${claim.authorization.expirationDate}. Service dates extend beyond authorization period.`,
          suggestion: 'Request authorization renewal or adjust service dates.',
        });
      }
    }

    // Check authorized units
    if (claim.authorization.authorizedUnits) {
      const totalUnits = claim.services.reduce((sum, s) => sum + s.units, 0);
      if (totalUnits > claim.authorization.authorizedUnits) {
        issues.push({
          severity: 'warning',
          field: 'authorization',
          code: 'AUTH-003',
          message: `Billed units (${totalUnits}) exceed authorized units (${claim.authorization.authorizedUnits}).`,
          suggestion: 'Units exceeding authorization will likely be denied.',
        });
      }
    }

    // Check authorized CPT codes
    if (claim.authorization.authorizedCodes && claim.authorization.authorizedCodes.length > 0) {
      for (let i = 0; i < claim.services.length; i++) {
        const svc = claim.services[i];
        if (!claim.authorization.authorizedCodes.includes(svc.procedureCode)) {
          issues.push({
            severity: 'warning',
            field: `services[${i}].procedureCode`,
            code: 'AUTH-004',
            message: `Service line ${i + 1}: CPT ${svc.procedureCode} not in authorized codes (${claim.authorization.authorizedCodes.join(', ')}).`,
          });
        }
      }
    }
  }
}

function validateTimelyFiling(
  claim: ClaimForValidation,
  payerConfig: PayerConfig | undefined,
  issues: ValidationIssue[]
): void {
  const submissionDate = claim.submissionDate
    ? new Date(claim.submissionDate)
    : new Date();

  for (let i = 0; i < claim.services.length; i++) {
    const svc = claim.services[i];
    if (!svc.serviceDate) continue;

    const svcDate = new Date(svc.serviceDate);
    if (isNaN(svcDate.getTime())) continue;

    const daysSinceService = Math.floor(
      (submissionDate.getTime() - svcDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const filingLimit = payerConfig?.timelyFilingDays ?? 90;

    if (daysSinceService > filingLimit) {
      issues.push({
        severity: 'error',
        field: `services[${i}].serviceDate`,
        code: 'TF-001',
        message: `Service line ${i + 1}: Service date ${svc.serviceDate} is ${daysSinceService} days ago. Exceeds ${payerConfig?.name ?? 'payer'} timely filing limit of ${filingLimit} days.`,
        suggestion: 'File immediately or request a timely filing exception.',
      });
    } else if (daysSinceService > filingLimit * 0.8) {
      const daysRemaining = filingLimit - daysSinceService;
      issues.push({
        severity: 'warning',
        field: `services[${i}].serviceDate`,
        code: 'TF-002',
        message: `Service line ${i + 1}: Only ${daysRemaining} days remaining in timely filing window for service date ${svc.serviceDate}.`,
        suggestion: 'Submit claim promptly to avoid timely filing denial.',
      });
    }
  }
}

function validateTotalCharges(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  if (!claim.services || claim.services.length === 0) return;

  const calculatedTotal = claim.services.reduce(
    (sum, svc) => sum + svc.chargeAmount * svc.units,
    0
  );

  const roundedCalculated = Math.round(calculatedTotal * 100) / 100;
  const roundedClaimed = Math.round(claim.totalCharges * 100) / 100;

  if (Math.abs(roundedCalculated - roundedClaimed) > 0.01) {
    issues.push({
      severity: 'warning',
      field: 'totalCharges',
      code: 'TC-001',
      message: `Total charges ($${roundedClaimed}) does not match sum of service lines ($${roundedCalculated}).`,
      suggestion: 'Correct totalCharges to match service line totals.',
    });
  }
}

function detectDuplicates(
  claim: ClaimForValidation,
  previousClaims: PreviousClaim[],
  issues: ValidationIssue[]
): void {
  for (let i = 0; i < claim.services.length; i++) {
    const svc = claim.services[i];

    const duplicate = previousClaims.find(
      (prev) =>
        prev.subscriberMemberId === claim.subscriber.memberId &&
        prev.serviceDate === svc.serviceDate &&
        prev.procedureCode === svc.procedureCode &&
        prev.billingProviderNpi === claim.billingProvider.npi
    );

    if (duplicate) {
      issues.push({
        severity: 'warning',
        field: 'duplicate',
        code: 'DUP-001',
        message: `Potential duplicate: Service line ${i + 1} (${svc.procedureCode} on ${svc.serviceDate}) matches previously submitted claim ${duplicate.claimId}.`,
        suggestion: 'Verify this is not a duplicate submission. If distinct, add modifier XE (separate encounter).',
      });
    }
  }
}

function validateProviderRoles(
  claim: ClaimForValidation,
  issues: ValidationIssue[]
): void {
  // If billing and rendering are different, rendering is required on the claim
  if (
    claim.renderingProvider?.npi &&
    claim.billingProvider.npi !== claim.renderingProvider.npi
  ) {
    // This is expected — group NPI billing, individual NPI rendering
    issues.push({
      severity: 'info',
      field: 'renderingProvider.npi',
      code: 'PROV-001',
      message: 'Rendering provider differs from billing provider — ensure rendering NPI is credentialed with payer.',
    });
  }

  // Check for rendering provider at the service line level
  for (let i = 0; i < claim.services.length; i++) {
    const svc = claim.services[i];

    if (svc.renderingProviderNpi && claim.renderingProvider?.npi) {
      if (svc.renderingProviderNpi !== claim.renderingProvider.npi) {
        issues.push({
          severity: 'info',
          field: `services[${i}].renderingProviderNpi`,
          code: 'PROV-002',
          message: `Service line ${i + 1}: Different rendering provider than claim header. Ensure both NPIs are credentialed.`,
        });
      }
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function isValidICD10CM(code: string): boolean {
  // ICD-10-CM: letter + 2 digits, optional decimal + 1-4 more characters
  return /^[A-Z]\d{2}(\.\d{1,4})?$/.test(code);
}

function isValidCPTCode(code: string): boolean {
  // CPT: 5-digit numeric, or HCPCS: letter + 4 digits, or Category III: 4 digits + T
  return /^\d{5}$/.test(code) || /^[A-Z]\d{4}$/.test(code) || /^\d{4}T$/.test(code);
}

function getLatestServiceDate(claim: ClaimForValidation): Date | null {
  let latest: Date | null = null;
  for (const svc of claim.services) {
    const dateStr = svc.serviceDateEnd || svc.serviceDate;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && (!latest || d > latest)) {
      latest = d;
    }
  }
  return latest;
}

// ============================================================================
// Batch Validation Helper
// ============================================================================

/**
 * Validate multiple claims and return aggregated results.
 */
export function validateClaimBatch(
  claims: ClaimForValidation[],
  previousClaims?: PreviousClaim[]
): {
  results: ClaimValidationResult[];
  totalErrors: number;
  totalWarnings: number;
  allValid: boolean;
  validCount: number;
  invalidCount: number;
} {
  const results = claims.map((claim) => validateClaim(claim, previousClaims));

  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  const validCount = results.filter((r) => r.valid).length;

  return {
    results,
    totalErrors,
    totalWarnings,
    allValid: totalErrors === 0,
    validCount,
    invalidCount: claims.length - validCount,
  };
}
