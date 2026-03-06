/**
 * batch-claims.ts
 *
 * Batch processing engine for insurance claim submissions. Handles
 * the workflow of collecting, validating, grouping, and submitting
 * multiple claims in a single operation.
 *
 * Features:
 * 1. Batch claim collection by date range or manual selection
 * 2. Payer-based grouping (one EDI interchange per payer)
 * 3. Pre-submission validation and scrubbing
 * 4. Batch EDI 837P generation
 * 5. Batch status tracking with per-claim granularity
 * 6. Summary reports for batch operations
 * 7. Supabase persistence for batch records
 */

import {
  type ClaimSubmission,
  type ClaimResponse,
  generateEDI837P,
  validateEDI837P,
  submitInsuranceClaim,
} from './clearinghouse-integration';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

/** Overall batch status */
export type BatchStatus =
  | 'draft'
  | 'validating'
  | 'validated'
  | 'validation-failed'
  | 'submitting'
  | 'submitted'
  | 'partially-submitted'
  | 'completed'
  | 'failed';

/** Individual claim status within a batch */
export type BatchClaimStatus =
  | 'pending'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'submitting'
  | 'accepted'
  | 'rejected'
  | 'error';

/** Validation severity levels */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** Pre-submission validation result for a single claim */
export interface ClaimValidationResult {
  claimIndex: number;
  claimId: string;
  patientName: string;
  isValid: boolean;
  issues: Array<{
    severity: ValidationSeverity;
    field: string;
    message: string;
    autoFixable: boolean;
  }>;
}

/** A single claim within a batch, with tracking metadata */
export interface BatchClaimEntry {
  id: string;
  claim: ClaimSubmission;
  status: BatchClaimStatus;
  validationResult?: ClaimValidationResult;
  submissionResponse?: ClaimResponse;
  errorMessage?: string;
  ediContent?: string;
  submittedAt?: string;
  processedAt?: string;
}

/** Payer group for batch submission */
export interface PayerGroup {
  payerId: string;
  payerName: string;
  claims: BatchClaimEntry[];
  ediInterchange?: string;
  totalCharges: number;
  claimCount: number;
}

/** Full batch record */
export interface ClaimBatch {
  id: string;
  providerId: string;
  providerName: string;
  // Batch contents
  claims: BatchClaimEntry[];
  payerGroups: PayerGroup[];
  // Status tracking
  status: BatchStatus;
  totalClaims: number;
  validClaims: number;
  invalidClaims: number;
  submittedClaims: number;
  acceptedClaims: number;
  rejectedClaims: number;
  // Financial
  totalCharges: number;
  // Date filters used
  serviceDateFrom?: string;
  serviceDateTo?: string;
  // Timing
  createdAt: string;
  validatedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  updatedAt: string;
  // Summary
  notes?: string;
}

/** Batch operation summary report */
export interface BatchSummaryReport {
  batchId: string;
  status: BatchStatus;
  totalClaims: number;
  totalCharges: number;
  // Validation results
  validation: {
    passed: number;
    failed: number;
    warnings: number;
    topIssues: Array<{ message: string; count: number }>;
  };
  // Submission results
  submission: {
    accepted: number;
    rejected: number;
    errors: number;
    pending: number;
    topRejectionReasons: Array<{ reason: string; count: number }>;
  };
  // By payer
  byPayer: Array<{
    payerId: string;
    payerName: string;
    claimCount: number;
    totalCharges: number;
    accepted: number;
    rejected: number;
  }>;
  // Timing
  processingTimeMs: number;
  completedAt: string;
}

// ============================================================================
// Pre-submission Validation / Scrubbing
// ============================================================================

/**
 * Common NPI validation: must be exactly 10 digits.
 */
function isValidNPI(npi: string): boolean {
  return /^\d{10}$/.test(npi);
}

/**
 * Basic CPT code validation: 5-digit numeric or HCPCS alphanumeric.
 */
function isValidProcedureCode(code: string): boolean {
  return /^[A-Z0-9]{5}$/.test(code) || /^\d{5}$/.test(code);
}

/**
 * ICD-10 code validation: letter followed by 2+ digits, optional decimal.
 */
function isValidICD10(code: string): boolean {
  return /^[A-Z]\d{2}(\.\d{1,4})?$/.test(code);
}

/**
 * Validates a single claim for pre-submission scrubbing.
 * Checks for common errors that would cause clearinghouse rejections.
 */
export function validateClaimForBatch(
  claim: ClaimSubmission,
  claimIndex: number,
  claimId: string
): ClaimValidationResult {
  const issues: ClaimValidationResult['issues'] = [];

  // --- Billing Provider Validation ---
  if (!claim.billingProvider.npi) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.npi',
      message: 'Billing provider NPI is required.',
      autoFixable: false,
    });
  } else if (!isValidNPI(claim.billingProvider.npi)) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.npi',
      message: `Invalid billing provider NPI: ${claim.billingProvider.npi}. Must be 10 digits.`,
      autoFixable: false,
    });
  }

  if (!claim.billingProvider.taxId) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.taxId',
      message: 'Billing provider Tax ID is required.',
      autoFixable: false,
    });
  }

  if (!claim.billingProvider.name) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.name',
      message: 'Billing provider name is required.',
      autoFixable: false,
    });
  }

  if (!claim.billingProvider.address?.zip) {
    issues.push({
      severity: 'error',
      field: 'billingProvider.address.zip',
      message: 'Billing provider ZIP code is required.',
      autoFixable: false,
    });
  }

  // --- Subscriber Validation ---
  if (!claim.subscriber.memberId) {
    issues.push({
      severity: 'error',
      field: 'subscriber.memberId',
      message: 'Subscriber member ID is required.',
      autoFixable: false,
    });
  }

  if (!claim.subscriber.firstName || !claim.subscriber.lastName) {
    issues.push({
      severity: 'error',
      field: 'subscriber.name',
      message: 'Subscriber first and last name are required.',
      autoFixable: false,
    });
  }

  if (!claim.subscriber.dob) {
    issues.push({
      severity: 'error',
      field: 'subscriber.dob',
      message: 'Subscriber date of birth is required.',
      autoFixable: false,
    });
  }

  // --- Payer Validation ---
  if (!claim.payer.payerId) {
    issues.push({
      severity: 'error',
      field: 'payer.payerId',
      message: 'Payer ID is required.',
      autoFixable: false,
    });
  }

  // --- Diagnosis Validation ---
  if (!claim.diagnosis || claim.diagnosis.length === 0) {
    issues.push({
      severity: 'error',
      field: 'diagnosis',
      message: 'At least one diagnosis code (ICD-10) is required.',
      autoFixable: false,
    });
  } else {
    const hasPrimary = claim.diagnosis.some(d => d.isPrimary);
    if (!hasPrimary) {
      issues.push({
        severity: 'warning',
        field: 'diagnosis',
        message: 'No primary diagnosis flagged. First diagnosis will be used as primary.',
        autoFixable: true,
      });
    }

    for (let i = 0; i < claim.diagnosis.length; i++) {
      if (!isValidICD10(claim.diagnosis[i].code)) {
        issues.push({
          severity: 'error',
          field: `diagnosis[${i}].code`,
          message: `Invalid ICD-10 code: ${claim.diagnosis[i].code}`,
          autoFixable: false,
        });
      }
    }
  }

  // --- Service Line Validation ---
  if (!claim.services || claim.services.length === 0) {
    issues.push({
      severity: 'error',
      field: 'services',
      message: 'At least one service line is required.',
      autoFixable: false,
    });
  } else {
    for (let i = 0; i < claim.services.length; i++) {
      const svc = claim.services[i];

      if (!isValidProcedureCode(svc.procedureCode)) {
        issues.push({
          severity: 'error',
          field: `services[${i}].procedureCode`,
          message: `Invalid CPT/HCPCS code: ${svc.procedureCode}`,
          autoFixable: false,
        });
      }

      if (!svc.serviceDate) {
        issues.push({
          severity: 'error',
          field: `services[${i}].serviceDate`,
          message: `Service date is required for line ${i + 1}.`,
          autoFixable: false,
        });
      }

      if (svc.chargeAmount <= 0) {
        issues.push({
          severity: 'error',
          field: `services[${i}].chargeAmount`,
          message: `Charge amount must be positive for line ${i + 1}.`,
          autoFixable: false,
        });
      }

      if (svc.units <= 0) {
        issues.push({
          severity: 'warning',
          field: `services[${i}].units`,
          message: `Units should be positive for line ${i + 1}. Defaulting to 1.`,
          autoFixable: true,
        });
      }

      if (!svc.diagnosisPointers || svc.diagnosisPointers.length === 0) {
        issues.push({
          severity: 'error',
          field: `services[${i}].diagnosisPointers`,
          message: `Diagnosis pointer is required for line ${i + 1}.`,
          autoFixable: true,
        });
      } else {
        for (const ptr of svc.diagnosisPointers) {
          if (ptr < 1 || ptr > (claim.diagnosis?.length ?? 0)) {
            issues.push({
              severity: 'error',
              field: `services[${i}].diagnosisPointers`,
              message: `Diagnosis pointer ${ptr} is out of range (1-${claim.diagnosis?.length ?? 0}).`,
              autoFixable: false,
            });
          }
        }
      }

      if (!svc.placeOfService) {
        issues.push({
          severity: 'warning',
          field: `services[${i}].placeOfService`,
          message: `Place of service not specified for line ${i + 1}. Defaulting to 02 (Telehealth).`,
          autoFixable: true,
        });
      }

      // Rendering provider NPI check
      if (svc.renderingProviderNpi && !isValidNPI(svc.renderingProviderNpi)) {
        issues.push({
          severity: 'error',
          field: `services[${i}].renderingProviderNpi`,
          message: `Invalid rendering provider NPI: ${svc.renderingProviderNpi}`,
          autoFixable: false,
        });
      }
    }
  }

  // --- Total Charges Consistency ---
  if (claim.services && claim.services.length > 0) {
    const calculatedTotal = claim.services.reduce(
      (sum, svc) => sum + svc.chargeAmount * svc.units,
      0
    );
    const difference = Math.abs(calculatedTotal - claim.totalCharges);
    if (difference > 0.01) {
      issues.push({
        severity: 'warning',
        field: 'totalCharges',
        message: `Total charges ($${claim.totalCharges}) doesn't match sum of service lines ($${calculatedTotal.toFixed(2)}).`,
        autoFixable: true,
      });
    }
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;

  return {
    claimIndex,
    claimId,
    patientName: `${claim.subscriber.lastName}, ${claim.subscriber.firstName}`,
    isValid: errorCount === 0,
    issues,
  };
}

/**
 * Auto-fixes common validation issues that are marked as autoFixable.
 * Returns a corrected copy of the claim (does not mutate the original).
 */
export function autoFixClaim(
  claim: ClaimSubmission,
  validationResult: ClaimValidationResult
): ClaimSubmission {
  const fixed = JSON.parse(JSON.stringify(claim)) as ClaimSubmission;

  for (const issue of validationResult.issues) {
    if (!issue.autoFixable) continue;

    // Fix missing primary diagnosis flag
    if (issue.field === 'diagnosis' && issue.message.includes('No primary diagnosis')) {
      if (fixed.diagnosis.length > 0) {
        fixed.diagnosis[0].isPrimary = true;
      }
    }

    // Fix missing diagnosis pointers
    if (issue.field.includes('diagnosisPointers') && issue.message.includes('required')) {
      const match = issue.field.match(/services\[(\d+)\]/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (fixed.services[idx]) {
          fixed.services[idx].diagnosisPointers = [1]; // Point to first diagnosis
        }
      }
    }

    // Fix missing place of service
    if (issue.field.includes('placeOfService')) {
      const match = issue.field.match(/services\[(\d+)\]/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (fixed.services[idx]) {
          fixed.services[idx].placeOfService = '02'; // Telehealth default
        }
      }
    }

    // Fix units
    if (issue.field.includes('units') && issue.message.includes('Defaulting to 1')) {
      const match = issue.field.match(/services\[(\d+)\]/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (fixed.services[idx]) {
          fixed.services[idx].units = 1;
        }
      }
    }

    // Fix total charges
    if (issue.field === 'totalCharges') {
      fixed.totalCharges = fixed.services.reduce(
        (sum, svc) => sum + svc.chargeAmount * svc.units,
        0
      );
    }
  }

  return fixed;
}

// ============================================================================
// Batch Creation and Grouping
// ============================================================================

/**
 * Creates a new claim batch from a list of claim submissions.
 * Groups claims by payer for efficient EDI interchange generation.
 */
export function createBatch(
  claims: ClaimSubmission[],
  providerId: string,
  providerName: string,
  options?: {
    serviceDateFrom?: string;
    serviceDateTo?: string;
    notes?: string;
  }
): ClaimBatch {
  const now = new Date().toISOString();

  // Create batch entries
  const batchClaims: BatchClaimEntry[] = claims.map((claim, index) => ({
    id: `bc-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    claim,
    status: 'pending' as BatchClaimStatus,
  }));

  // Group by payer
  const payerGroupMap = new Map<string, PayerGroup>();
  for (const entry of batchClaims) {
    const payerId = entry.claim.payer.payerId;
    const existing = payerGroupMap.get(payerId);

    if (existing) {
      existing.claims.push(entry);
      existing.totalCharges += entry.claim.totalCharges;
      existing.claimCount++;
    } else {
      payerGroupMap.set(payerId, {
        payerId,
        payerName: entry.claim.payer.payerName,
        claims: [entry],
        totalCharges: entry.claim.totalCharges,
        claimCount: 1,
      });
    }
  }

  const payerGroups = Array.from(payerGroupMap.values());
  const totalCharges = batchClaims.reduce((sum, c) => sum + c.claim.totalCharges, 0);

  return {
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    providerId,
    providerName,
    claims: batchClaims,
    payerGroups,
    status: 'draft',
    totalClaims: batchClaims.length,
    validClaims: 0,
    invalidClaims: 0,
    submittedClaims: 0,
    acceptedClaims: 0,
    rejectedClaims: 0,
    totalCharges: Math.round(totalCharges * 100) / 100,
    serviceDateFrom: options?.serviceDateFrom,
    serviceDateTo: options?.serviceDateTo,
    createdAt: now,
    updatedAt: now,
    notes: options?.notes,
  };
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validates all claims in a batch. Updates each claim's validation
 * status and returns the overall validation results.
 */
export function validateBatch(
  batch: ClaimBatch,
  autoFix: boolean = true
): ClaimBatch {
  const updatedClaims = batch.claims.map((entry, index) => {
    const validation = validateClaimForBatch(entry.claim, index, entry.id);

    let updatedClaim = entry.claim;
    if (autoFix && !validation.isValid) {
      updatedClaim = autoFixClaim(entry.claim, validation);
      // Re-validate after auto-fix
      const revalidation = validateClaimForBatch(updatedClaim, index, entry.id);
      return {
        ...entry,
        claim: updatedClaim,
        status: (revalidation.isValid ? 'valid' : 'invalid') as BatchClaimStatus,
        validationResult: revalidation,
      };
    }

    return {
      ...entry,
      status: (validation.isValid ? 'valid' : 'invalid') as BatchClaimStatus,
      validationResult: validation,
    };
  });

  const validCount = updatedClaims.filter(c => c.status === 'valid').length;
  const invalidCount = updatedClaims.filter(c => c.status === 'invalid').length;

  // Rebuild payer groups with updated claims
  const payerGroupMap = new Map<string, PayerGroup>();
  for (const entry of updatedClaims) {
    const payerId = entry.claim.payer.payerId;
    const existing = payerGroupMap.get(payerId);
    if (existing) {
      existing.claims.push(entry);
      existing.totalCharges += entry.claim.totalCharges;
      existing.claimCount++;
    } else {
      payerGroupMap.set(payerId, {
        payerId,
        payerName: entry.claim.payer.payerName,
        claims: [entry],
        totalCharges: entry.claim.totalCharges,
        claimCount: 1,
      });
    }
  }

  return {
    ...batch,
    claims: updatedClaims,
    payerGroups: Array.from(payerGroupMap.values()),
    status: invalidCount === 0 ? 'validated' : 'validation-failed',
    validClaims: validCount,
    invalidClaims: invalidCount,
    validatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Batch EDI Generation
// ============================================================================

/**
 * Generates EDI 837P interchanges for each payer group in the batch.
 * Only includes valid claims; invalid claims are skipped.
 */
export function generateBatchEDI(
  batch: ClaimBatch
): ClaimBatch {
  const updatedPayerGroups = batch.payerGroups.map(group => {
    const validClaims = group.claims.filter(c => c.status === 'valid');

    if (validClaims.length === 0) {
      return group;
    }

    // Generate EDI for each valid claim in this payer group
    const ediSegments: string[] = [];
    const updatedGroupClaims = group.claims.map(entry => {
      if (entry.status !== 'valid') return entry;

      try {
        const edi = generateEDI837P(entry.claim);
        const validation = validateEDI837P(edi);

        if (!validation.valid) {
          return {
            ...entry,
            status: 'invalid' as BatchClaimStatus,
            errorMessage: `EDI validation failed: ${validation.errors.map(e => e.message).join('; ')}`,
          };
        }

        ediSegments.push(edi);
        return {
          ...entry,
          ediContent: edi,
        };
      } catch (err) {
        return {
          ...entry,
          status: 'error' as BatchClaimStatus,
          errorMessage: `EDI generation error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    });

    return {
      ...group,
      claims: updatedGroupClaims,
      ediInterchange: ediSegments.length > 0 ? ediSegments.join('\n') : undefined,
    };
  });

  return {
    ...batch,
    payerGroups: updatedPayerGroups,
    claims: updatedPayerGroups.flatMap(g => g.claims),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Batch Submission
// ============================================================================

/**
 * Submits all valid claims in a batch to the clearinghouse.
 * Processes one claim at a time to avoid overwhelming the API.
 * Updates each claim's status as responses come back.
 */
export async function submitBatch(
  batch: ClaimBatch
): Promise<ClaimBatch> {
  const startTime = Date.now();
  let submittedCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;

  const updatedClaims: BatchClaimEntry[] = [];

  for (const entry of batch.claims) {
    if (entry.status !== 'valid' && entry.status !== 'pending') {
      updatedClaims.push(entry);
      continue;
    }

    try {
      const response = await submitInsuranceClaim(entry.claim);
      submittedCount++;

      if (response.success && response.status === 'accepted') {
        acceptedCount++;
        updatedClaims.push({
          ...entry,
          status: 'accepted',
          submissionResponse: response,
          submittedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
        });
      } else {
        rejectedCount++;
        updatedClaims.push({
          ...entry,
          status: 'rejected',
          submissionResponse: response,
          errorMessage: response.errors?.map(e => e.message).join('; '),
          submittedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      updatedClaims.push({
        ...entry,
        status: 'error',
        errorMessage: `Submission error: ${err instanceof Error ? err.message : String(err)}`,
        submittedAt: new Date().toISOString(),
      });
    }

    // Small delay between submissions to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Rebuild payer groups
  const payerGroupMap = new Map<string, PayerGroup>();
  for (const entry of updatedClaims) {
    const payerId = entry.claim.payer.payerId;
    const existing = payerGroupMap.get(payerId);
    if (existing) {
      existing.claims.push(entry);
      existing.totalCharges += entry.claim.totalCharges;
      existing.claimCount++;
    } else {
      payerGroupMap.set(payerId, {
        payerId,
        payerName: entry.claim.payer.payerName,
        claims: [entry],
        totalCharges: entry.claim.totalCharges,
        claimCount: 1,
      });
    }
  }

  const allSubmitted = updatedClaims.every(
    c => c.status === 'accepted' || c.status === 'rejected' || c.status === 'invalid'
  );
  const anyFailed = updatedClaims.some(c => c.status === 'error');

  let batchStatus: BatchStatus = 'submitted';
  if (allSubmitted && rejectedCount === 0) {
    batchStatus = 'completed';
  } else if (anyFailed) {
    batchStatus = 'partially-submitted';
  }

  return {
    ...batch,
    claims: updatedClaims,
    payerGroups: Array.from(payerGroupMap.values()),
    status: batchStatus,
    submittedClaims: submittedCount,
    acceptedClaims: acceptedCount,
    rejectedClaims: rejectedCount,
    submittedAt: new Date().toISOString(),
    completedAt: allSubmitted ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Batch Summary Report
// ============================================================================

/**
 * Generates a summary report for a completed batch.
 */
export function generateBatchReport(
  batch: ClaimBatch
): BatchSummaryReport {
  // Validation summary
  const validationIssues = new Map<string, number>();
  let warningCount = 0;
  for (const claim of batch.claims) {
    if (!claim.validationResult) continue;
    for (const issue of claim.validationResult.issues) {
      if (issue.severity === 'warning') warningCount++;
      const count = validationIssues.get(issue.message) ?? 0;
      validationIssues.set(issue.message, count + 1);
    }
  }

  const topIssues = Array.from(validationIssues.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Submission summary
  const rejectionReasons = new Map<string, number>();
  for (const claim of batch.claims) {
    if (claim.status === 'rejected' && claim.submissionResponse?.errors) {
      for (const err of claim.submissionResponse.errors) {
        const count = rejectionReasons.get(err.message) ?? 0;
        rejectionReasons.set(err.message, count + 1);
      }
    }
  }

  const topRejectionReasons = Array.from(rejectionReasons.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const pendingCount = batch.claims.filter(
    c => c.status === 'pending' || c.status === 'valid' || c.status === 'submitting'
  ).length;
  const errorCount = batch.claims.filter(c => c.status === 'error').length;

  // By payer
  const byPayer = batch.payerGroups.map(group => ({
    payerId: group.payerId,
    payerName: group.payerName,
    claimCount: group.claimCount,
    totalCharges: group.totalCharges,
    accepted: group.claims.filter(c => c.status === 'accepted').length,
    rejected: group.claims.filter(c => c.status === 'rejected').length,
  }));

  const processingTimeMs = batch.completedAt && batch.createdAt
    ? new Date(batch.completedAt).getTime() - new Date(batch.createdAt).getTime()
    : 0;

  return {
    batchId: batch.id,
    status: batch.status,
    totalClaims: batch.totalClaims,
    totalCharges: batch.totalCharges,
    validation: {
      passed: batch.validClaims,
      failed: batch.invalidClaims,
      warnings: warningCount,
      topIssues,
    },
    submission: {
      accepted: batch.acceptedClaims,
      rejected: batch.rejectedClaims,
      errors: errorCount,
      pending: pendingCount,
      topRejectionReasons,
    },
    byPayer,
    processingTimeMs,
    completedAt: batch.completedAt ?? new Date().toISOString(),
  };
}

// ============================================================================
// Supabase Persistence
// ============================================================================

/**
 * Saves a batch record to Supabase.
 */
export async function saveBatch(
  batch: ClaimBatch
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('claim_batches')
      .insert({
        id: batch.id,
        provider_id: batch.providerId,
        provider_name: batch.providerName,
        claims: batch.claims.map(c => ({
          id: c.id,
          claim: c.claim,
          status: c.status,
          validationResult: c.validationResult ?? null,
          submissionResponse: c.submissionResponse ?? null,
          errorMessage: c.errorMessage ?? null,
          submittedAt: c.submittedAt ?? null,
          processedAt: c.processedAt ?? null,
        })),
        payer_groups: batch.payerGroups.map(g => ({
          payerId: g.payerId,
          payerName: g.payerName,
          totalCharges: g.totalCharges,
          claimCount: g.claimCount,
        })),
        status: batch.status,
        total_claims: batch.totalClaims,
        valid_claims: batch.validClaims,
        invalid_claims: batch.invalidClaims,
        submitted_claims: batch.submittedClaims,
        accepted_claims: batch.acceptedClaims,
        rejected_claims: batch.rejectedClaims,
        total_charges: batch.totalCharges,
        service_date_from: batch.serviceDateFrom ?? null,
        service_date_to: batch.serviceDateTo ?? null,
        created_at: batch.createdAt,
        validated_at: batch.validatedAt ?? null,
        submitted_at: batch.submittedAt ?? null,
        completed_at: batch.completedAt ?? null,
        updated_at: batch.updatedAt,
        notes: batch.notes ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[batch-claims] Error saving batch:', error.message);
      return null;
    }

    return data?.id ?? batch.id;
  } catch (err) {
    console.error('[batch-claims] Unexpected save error:', err);
    return null;
  }
}

/**
 * Updates a batch record in Supabase.
 */
export async function updateBatch(
  batch: ClaimBatch
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('claim_batches')
      .update({
        claims: batch.claims.map(c => ({
          id: c.id,
          claim: c.claim,
          status: c.status,
          validationResult: c.validationResult ?? null,
          submissionResponse: c.submissionResponse ?? null,
          errorMessage: c.errorMessage ?? null,
          submittedAt: c.submittedAt ?? null,
          processedAt: c.processedAt ?? null,
        })),
        status: batch.status,
        valid_claims: batch.validClaims,
        invalid_claims: batch.invalidClaims,
        submitted_claims: batch.submittedClaims,
        accepted_claims: batch.acceptedClaims,
        rejected_claims: batch.rejectedClaims,
        validated_at: batch.validatedAt ?? null,
        submitted_at: batch.submittedAt ?? null,
        completed_at: batch.completedAt ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batch.id);

    if (error) {
      console.error('[batch-claims] Error updating batch:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[batch-claims] Unexpected update error:', err);
    return false;
  }
}

/**
 * Fetches batch records for a provider.
 */
export async function getBatchesForProvider(
  providerId: string,
  status?: BatchStatus
): Promise<ClaimBatch[]> {
  try {
    let query = supabase
      .from('claim_batches')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[batch-claims] Error fetching batches:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToBatch);
  } catch (err) {
    console.error('[batch-claims] Unexpected fetch error:', err);
    return [];
  }
}

/**
 * Fetches a single batch by ID.
 */
export async function getBatch(
  batchId: string
): Promise<ClaimBatch | null> {
  try {
    const { data, error } = await supabase
      .from('claim_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) {
      console.error('[batch-claims] Error fetching batch:', error.message);
      return null;
    }

    return data ? mapRowToBatch(data as Record<string, unknown>) : null;
  } catch (err) {
    console.error('[batch-claims] Unexpected fetch error:', err);
    return null;
  }
}

// ============================================================================
// Row Mapper
// ============================================================================

function mapRowToBatch(row: Record<string, unknown>): ClaimBatch {
  const claims = (row.claims as BatchClaimEntry[]) ?? [];
  const payerGroupsRaw = (row.payer_groups as Array<{
    payerId: string;
    payerName: string;
    totalCharges: number;
    claimCount: number;
  }>) ?? [];

  // Rebuild payer groups with claim references
  const payerGroups: PayerGroup[] = payerGroupsRaw.map(pg => ({
    ...pg,
    claims: claims.filter(c => c.claim.payer.payerId === pg.payerId),
  }));

  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    providerName: row.provider_name as string,
    claims,
    payerGroups,
    status: row.status as BatchStatus,
    totalClaims: row.total_claims as number,
    validClaims: row.valid_claims as number,
    invalidClaims: row.invalid_claims as number,
    submittedClaims: row.submitted_claims as number,
    acceptedClaims: row.accepted_claims as number,
    rejectedClaims: row.rejected_claims as number,
    totalCharges: row.total_charges as number,
    serviceDateFrom: row.service_date_from as string | undefined,
    serviceDateTo: row.service_date_to as string | undefined,
    createdAt: row.created_at as string,
    validatedAt: row.validated_at as string | undefined,
    submittedAt: row.submitted_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    updatedAt: row.updated_at as string,
    notes: row.notes as string | undefined,
  };
}
