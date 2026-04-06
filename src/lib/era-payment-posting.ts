// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ERA 835 Automated Payment Posting & Reconciliation
 *
 * Extends the existing ERA 835 parser in clearinghouse-integration.ts with:
 * - Automated payment posting to Supabase claims_payments table
 * - Reconciliation of 835 payments against original 837 claim submissions
 * - Discrepancy detection (underpayment, overpayment, unexpected denials)
 * - Write-off suggestion engine based on adjustment reason codes
 * - Batch processing support for high-volume ERA files
 *
 * Depends on: clearinghouse-integration.ts (parseERA835, ERA835* types, CARC_DESCRIPTIONS)
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { secureFetch } from './security/secure-fetch';
import {
  parseERA835,
  type ERA835Payment,
  type ERA835ClaimAdjudication,
  type ERA835ParseResult,
  CARC_DESCRIPTIONS,
} from './clearinghouse-integration';

// ============================================================================
// Types
// ============================================================================

/** A single payment line item posted to Supabase */
export interface PostedPayment {
  id: string;
  claimId: string;
  claimControlNumber: string;
  checkNumber: string;
  checkDate: string;
  payerName: string;
  payerId: string;
  procedureCode: string;
  chargedAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
  patientResponsibility: number;
  adjustmentReasons: Array<{
    groupCode: string;
    reasonCode: string;
    amount: number;
    description: string;
  }>;
  remarkCodes: string[];
  postingStatus: 'posted' | 'pending_review' | 'write_off' | 'appeal';
  postedAt: string;
  postedBy: string; // 'auto' or user ID
  // Snake_case aliases for Supabase raw rows
  paid_amount?: number;
  adjustment_amount?: number;
  patient_responsibility?: number;
  posting_status?: string;
  payer_name?: string;
  procedure_code?: string;
  adjustment_reasons?: Array<{
    groupCode?: string;
    group_code?: string;
    reasonCode?: string;
    reason_code?: string;
    amount: number;
    description?: string;
  }>;
}

/** Result of a payment posting batch operation */
export interface PaymentPostingResult {
  totalPayments: number;
  successfulPosts: number;
  failedPosts: number;
  pendingReview: number;
  totalPostedAmount: number;
  totalAdjustmentAmount: number;
  postedPayments: PostedPayment[];
  errors: Array<{
    claimControlNumber: string;
    error: string;
  }>;
}

/** Reconciliation result comparing 835 payments to original 837 claims */
export interface ReconciliationResult {
  claimId: string;
  claimControlNumber: string;
  status: 'matched' | 'partial_match' | 'unmatched' | 'overpaid' | 'underpaid';
  originalChargedAmount: number;
  totalPaidAmount: number;
  totalAdjustmentAmount: number;
  patientResponsibility: number;
  variance: number; // difference between expected and actual payment
  variancePercentage: number;
  serviceLineReconciliation: Array<{
    procedureCode: string;
    originalCharge: number;
    allowedAmount: number;
    paidAmount: number;
    adjustmentAmount: number;
    status: 'paid_in_full' | 'partial' | 'denied' | 'overpaid';
    adjustmentReasons: Array<{
      groupCode: string;
      reasonCode: string;
      amount: number;
      description: string;
    }>;
  }>;
  writeOffSuggestions: WriteOffSuggestion[];
  appealSuggestions: AppealSuggestion[];
  timeline: ReconciliationEvent[];
}

/** Suggested write-off for an adjustment */
export interface WriteOffSuggestion {
  procedureCode: string;
  adjustmentGroupCode: string;
  adjustmentReasonCode: string;
  amount: number;
  description: string;
  recommendation: 'write_off' | 'appeal' | 'review' | 'patient_bill';
  rationale: string;
}

/** Suggested appeal for a denied/reduced payment */
export interface AppealSuggestion {
  procedureCode: string;
  denialReasonCode: string;
  denialDescription: string;
  amount: number;
  appealDeadlineDays: number;
  suggestedAction: string;
  successLikelihood: 'high' | 'medium' | 'low';
  templateId: string;
}

/** A timestamped event in the reconciliation process */
export interface ReconciliationEvent {
  timestamp: string;
  event: string;
  details: string;
  amount?: number;
}

// ============================================================================
// Adjustment Group Code Descriptions
// ============================================================================

const ADJUSTMENT_GROUP_DESCRIPTIONS: Record<string, string> = {
  CO: 'Contractual Obligation — Provider write-off per contract',
  PR: 'Patient Responsibility — Patient owes this amount',
  OA: 'Other Adjustment — Neither contractual nor patient responsibility',
  PI: 'Payer Initiated Reduction — Payer-specific rule',
  CR: 'Correction/Reversal — Previous payment correction',
};

// ============================================================================
// Write-Off Decision Engine
// ============================================================================

/**
 * Adjustment reason codes that are typically appropriate for automatic write-off.
 * These are contractual adjustments where the provider has agreed to accept
 * less than billed charges per their contract with the payer.
 */
const AUTO_WRITEOFF_CARC_CODES = new Set([
  '45',  // Charges exceed contracted/legislated fee
  '97',  // Payment included in allowance for another service
  '253', // Sequestration - federal spending reduction
  '24',  // Charges covered under capitation
  '131', // Claim-specific negotiated discount
  '237', // Legislative/regulatory penalty
  'P14', // Payment/reduction for payer-specific adjustment
]);

/**
 * Adjustment reason codes that warrant appeal consideration.
 * These denials are commonly overturned with proper documentation.
 */
const APPEALABLE_CARC_CODES: Record<string, { successRate: string; deadlineDays: number; action: string }> = {
  '50': { successRate: 'medium', deadlineDays: 60, action: 'Submit medical necessity documentation including treatment plan, progress notes, and BCBA supervision records' },
  '197': { successRate: 'high', deadlineDays: 30, action: 'Submit authorization number and approval letter. If auth was obtained, this is a processing error.' },
  '16': { successRate: 'high', deadlineDays: 90, action: 'Resubmit with complete information. Attach missing documentation identified in the remark codes.' },
  '18': { successRate: 'medium', deadlineDays: 60, action: 'Provide proof this is not a duplicate — different dates of service, different modifiers, or different rendering provider.' },
  '29': { successRate: 'low', deadlineDays: 30, action: 'File timely filing appeal with proof of original submission date (clearinghouse acceptance report).' },
  '96': { successRate: 'medium', deadlineDays: 60, action: 'Submit appeal demonstrating service IS covered. Include plan benefit summary and relevant state mandate citations.' },
  '109': { successRate: 'medium', deadlineDays: 60, action: 'Verify payer ID is correct. If service should be covered, submit appeal with benefit plan details.' },
  '119': { successRate: 'low', deadlineDays: 60, action: 'Request benefit exception or peer-to-peer review. Document medical necessity for continued treatment beyond benefit limit.' },
  '167': { successRate: 'medium', deadlineDays: 60, action: 'Verify diagnosis codes match plan coverage. For ABA, ensure autism spectrum diagnosis (F84.0) is primary.' },
  '170': { successRate: 'high', deadlineDays: 60, action: 'Verify provider credentialing status. If credentialed, submit proof of network participation.' },
  '204': { successRate: 'medium', deadlineDays: 60, action: 'Verify plan benefits. If covered under state mandate, cite applicable insurance code.' },
  '236': { successRate: 'high', deadlineDays: 90, action: 'Verify procedure/modifier combinations. Appeal if services are distinct and appropriately documented.' },
};

/**
 * Determine the recommended action for a payment adjustment.
 */
function getWriteOffRecommendation(
  groupCode: string,
  reasonCode: string,
  amount: number
): WriteOffSuggestion['recommendation'] {
  // Contractual obligations are almost always write-offs
  if (groupCode === 'CO' && AUTO_WRITEOFF_CARC_CODES.has(reasonCode)) {
    return 'write_off';
  }

  // Patient responsibility should be billed to patient
  if (groupCode === 'PR') {
    return 'patient_bill';
  }

  // Known appealable codes
  if (reasonCode in APPEALABLE_CARC_CODES) {
    return 'appeal';
  }

  // Small amounts under $5 are usually not worth pursuing
  if (Math.abs(amount) < 5) {
    return 'write_off';
  }

  return 'review';
}

/**
 * Generate write-off suggestions for a claim's adjustments.
 */
function generateWriteOffSuggestions(
  claim: ERA835ClaimAdjudication
): WriteOffSuggestion[] {
  const suggestions: WriteOffSuggestion[] = [];

  for (const line of claim.serviceLines) {
    for (const adj of line.adjustments) {
      const recommendation = getWriteOffRecommendation(adj.groupCode, adj.reasonCode, adj.amount);
      const description = CARC_DESCRIPTIONS[adj.reasonCode] || `Adjustment reason ${adj.reasonCode}`;
      const groupDesc = ADJUSTMENT_GROUP_DESCRIPTIONS[adj.groupCode] || adj.groupCode;

      let rationale: string;
      switch (recommendation) {
        case 'write_off':
          rationale = `${groupDesc}. Per payer contract, this adjustment is expected and should be written off.`;
          break;
        case 'patient_bill':
          rationale = `Patient owes $${adj.amount.toFixed(2)} for ${description.toLowerCase()}. Generate patient statement.`;
          break;
        case 'appeal':
          rationale = `Denial may be overturnable. ${APPEALABLE_CARC_CODES[adj.reasonCode]?.action || 'Review and consider appeal.'}`;
          break;
        default:
          rationale = `${groupDesc}: ${description}. Manual review recommended — adjustment may be in error.`;
      }

      suggestions.push({
        procedureCode: line.procedureCode,
        adjustmentGroupCode: adj.groupCode,
        adjustmentReasonCode: adj.reasonCode,
        amount: adj.amount,
        description,
        recommendation,
        rationale,
      });
    }
  }

  return suggestions;
}

/**
 * Generate appeal suggestions for denied/reduced claim lines.
 */
function generateAppealSuggestions(
  claim: ERA835ClaimAdjudication
): AppealSuggestion[] {
  const suggestions: AppealSuggestion[] = [];

  for (const line of claim.serviceLines) {
    // Only suggest appeals for lines that were denied or significantly reduced
    const reductionPct = line.chargedAmount > 0
      ? ((line.chargedAmount - line.paidAmount) / line.chargedAmount) * 100
      : 0;

    if (line.paidAmount === 0 || reductionPct > 50) {
      for (const adj of line.adjustments) {
        const appealInfo = APPEALABLE_CARC_CODES[adj.reasonCode];
        if (appealInfo) {
          suggestions.push({
            procedureCode: line.procedureCode,
            denialReasonCode: adj.reasonCode,
            denialDescription: CARC_DESCRIPTIONS[adj.reasonCode] || `Reason ${adj.reasonCode}`,
            amount: adj.amount,
            appealDeadlineDays: appealInfo.deadlineDays,
            suggestedAction: appealInfo.action,
            successLikelihood: appealInfo.successRate as 'high' | 'medium' | 'low',
            templateId: `appeal_carc_${adj.reasonCode}`,
          });
        }
      }
    }
  }

  return suggestions;
}

// ============================================================================
// Supabase Helpers
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('supabase.auth.token');
  const authToken = token ? JSON.parse(token)?.access_token : publicAnonKey;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'apikey': publicAnonKey,
  };
}

const supabaseRestUrl = `https://${projectId}.supabase.co/rest/v1`;

// ============================================================================
// Payment Posting
// ============================================================================

/**
 * Parse raw ERA 835 data and return structured payment information.
 * This is a convenience wrapper around the existing parseERA835 function
 * with additional enrichment (write-off suggestions, appeal suggestions).
 */
export function parseAndEnrichERA835(rawData: string): ERA835ParseResult & {
  writeOffSuggestions: WriteOffSuggestion[];
  appealSuggestions: AppealSuggestion[];
} {
  const parsed = parseERA835(rawData);

  const allWriteOffs: WriteOffSuggestion[] = [];
  const allAppeals: AppealSuggestion[] = [];

  for (const claim of parsed.claims) {
    allWriteOffs.push(...generateWriteOffSuggestions(claim));
    allAppeals.push(...generateAppealSuggestions(claim));
  }

  return {
    ...parsed,
    writeOffSuggestions: allWriteOffs,
    appealSuggestions: allAppeals,
  };
}

/**
 * Post payments from parsed ERA 835 data to Supabase claims_payments table.
 *
 * For each claim adjudication in the ERA:
 * 1. Creates a payment record for each service line
 * 2. Stores adjustment details and remark codes
 * 3. Generates write-off / appeal suggestions
 * 4. Marks items that need manual review
 *
 * Returns a summary of the posting operation.
 */
export async function postPayments(
  eraResult: ERA835ParseResult,
  postedBy: string = 'auto'
): Promise<PaymentPostingResult> {
  const result: PaymentPostingResult = {
    totalPayments: 0,
    successfulPosts: 0,
    failedPosts: 0,
    pendingReview: 0,
    totalPostedAmount: 0,
    totalAdjustmentAmount: 0,
    postedPayments: [],
    errors: [],
  };

  if (!eraResult.success || eraResult.claims.length === 0) {
    return result;
  }

  const { payment } = eraResult;

  for (const claim of eraResult.claims) {
    for (const line of claim.serviceLines) {
      result.totalPayments++;

      // Determine posting status based on adjustments
      let postingStatus: PostedPayment['postingStatus'] = 'posted';
      const hasAppealableAdjustments = line.adjustments.some(
        adj => adj.reasonCode in APPEALABLE_CARC_CODES && adj.groupCode !== 'PR'
      );
      const isFullDenial = line.paidAmount === 0 && line.chargedAmount > 0;

      if (isFullDenial && hasAppealableAdjustments) {
        postingStatus = 'appeal';
      } else if (isFullDenial) {
        postingStatus = 'pending_review';
      } else if (hasAppealableAdjustments) {
        postingStatus = 'pending_review';
      }

      const adjustmentAmount = line.adjustments.reduce((sum, a) => sum + a.amount, 0);

      const postedPayment: PostedPayment = {
        id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        claimId: '', // Will be resolved during reconciliation
        claimControlNumber: claim.claimControlNumber,
        checkNumber: payment.checkNumber,
        checkDate: payment.checkDate,
        payerName: payment.payerName,
        payerId: payment.payerId,
        procedureCode: line.procedureCode,
        chargedAmount: line.chargedAmount,
        paidAmount: line.paidAmount,
        adjustmentAmount,
        patientResponsibility: claim.patientResponsibility,
        adjustmentReasons: line.adjustments.map(adj => ({
          groupCode: adj.groupCode,
          reasonCode: adj.reasonCode,
          amount: adj.amount,
          description: CARC_DESCRIPTIONS[adj.reasonCode] || `Reason ${adj.reasonCode}`,
        })),
        remarkCodes: claim.remarkCodes,
        postingStatus,
        postedAt: new Date().toISOString(),
        postedBy,
      };

      try {
        const { ok, error } = await secureFetch(`${supabaseRestUrl}/claims_payments`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: postedPayment.id,
            claim_control_number: postedPayment.claimControlNumber,
            check_number: postedPayment.checkNumber,
            check_date: postedPayment.checkDate,
            payer_name: postedPayment.payerName,
            payer_id: postedPayment.payerId,
            procedure_code: postedPayment.procedureCode,
            charged_amount: postedPayment.chargedAmount,
            paid_amount: postedPayment.paidAmount,
            adjustment_amount: postedPayment.adjustmentAmount,
            patient_responsibility: postedPayment.patientResponsibility,
            adjustment_reasons: postedPayment.adjustmentReasons,
            remark_codes: postedPayment.remarkCodes,
            posting_status: postedPayment.postingStatus,
            posted_at: postedPayment.postedAt,
            posted_by: postedPayment.postedBy,
          }),
        });

        if (ok) {
          result.successfulPosts++;
          result.totalPostedAmount += postedPayment.paidAmount;
          result.totalAdjustmentAmount += adjustmentAmount;
        } else {
          result.failedPosts++;
          result.errors.push({
            claimControlNumber: claim.claimControlNumber,
            error: error?.toString() || 'Unknown database error',
          });
        }
      } catch (err) {
        result.failedPosts++;
        result.errors.push({
          claimControlNumber: claim.claimControlNumber,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (postingStatus === 'pending_review' || postingStatus === 'appeal') {
        result.pendingReview++;
      }

      result.postedPayments.push(postedPayment);
    }
  }

  return result;
}

// ============================================================================
// Payment Reconciliation
// ============================================================================

/**
 * Reconcile ERA 835 payments against original 837 claim submissions.
 *
 * Fetches the original claim data from Supabase, then compares:
 * - Total charged vs. total paid + adjustments
 * - Per-service-line charges vs. payments
 * - Expected vs. actual adjustment patterns
 *
 * Generates discrepancy reports with write-off and appeal recommendations.
 */
export async function reconcilePayments(
  claimId: string
): Promise<ReconciliationResult> {
  const timeline: ReconciliationEvent[] = [];

  timeline.push({
    timestamp: new Date().toISOString(),
    event: 'reconciliation_started',
    details: `Beginning reconciliation for claim ${claimId}`,
  });

  // Fetch original claim submission
  const { data: originalClaim } = await secureFetch<{
    id: string;
    claim_control_number: string;
    total_charges: number;
    services: Array<{
      procedure_code: string;
      charge_amount: number;
      units: number;
    }>;
    submitted_at: string;
  }>(`${supabaseRestUrl}/claim_submissions?id=eq.${claimId}&select=*`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  // Fetch all payment records for this claim
  const claimControlNumber = (originalClaim as any)?.claim_control_number || claimId;
  const { data: payments } = await secureFetch<PostedPayment[]>(
    `${supabaseRestUrl}/claims_payments?claim_control_number=eq.${claimControlNumber}&select=*`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  const paymentList = Array.isArray(payments) ? payments : [];
  const claimData = originalClaim as any;

  const originalChargedAmount = claimData?.total_charges || 0;
  const totalPaidAmount = paymentList.reduce((sum, p) => sum + (p.paidAmount || p.paid_amount || 0), 0);
  const totalAdjustmentAmount = paymentList.reduce((sum, p) => sum + (p.adjustmentAmount || p.adjustment_amount || 0), 0);
  const patientResponsibility = paymentList.reduce((sum, p) => sum + (p.patientResponsibility || p.patient_responsibility || 0), 0);

  const variance = originalChargedAmount - totalPaidAmount - totalAdjustmentAmount - patientResponsibility;
  const variancePercentage = originalChargedAmount > 0
    ? (variance / originalChargedAmount) * 100
    : 0;

  timeline.push({
    timestamp: new Date().toISOString(),
    event: 'amounts_calculated',
    details: `Charged: $${originalChargedAmount.toFixed(2)}, Paid: $${totalPaidAmount.toFixed(2)}, Adjustments: $${totalAdjustmentAmount.toFixed(2)}`,
    amount: totalPaidAmount,
  });

  // Determine reconciliation status
  let status: ReconciliationResult['status'];
  if (Math.abs(variance) < 0.01) {
    status = 'matched';
  } else if (paymentList.length === 0) {
    status = 'unmatched';
  } else if (variance > 0) {
    status = 'underpaid';
  } else if (variance < 0) {
    status = 'overpaid';
  } else {
    status = 'partial_match';
  }

  // Build per-service-line reconciliation
  const originalServices = claimData?.services || [];
  const serviceLineReconciliation: ReconciliationResult['serviceLineReconciliation'] = [];

  for (const svc of originalServices) {
    const code = svc.procedure_code || svc.procedureCode;
    const matchingPayments = paymentList.filter(
      p => (p.procedureCode || p.procedure_code) === code
    );
    const linePaid = matchingPayments.reduce((s, p) => s + (p.paidAmount || p.paid_amount || 0), 0);
    const lineAdj = matchingPayments.reduce((s, p) => s + (p.adjustmentAmount || p.adjustment_amount || 0), 0);
    const originalCharge = svc.charge_amount || svc.chargeAmount || 0;

    let lineStatus: 'paid_in_full' | 'partial' | 'denied' | 'overpaid';
    if (linePaid === 0 && matchingPayments.length > 0) {
      lineStatus = 'denied';
    } else if (Math.abs(originalCharge - linePaid - lineAdj) < 0.01) {
      lineStatus = 'paid_in_full';
    } else if (linePaid > originalCharge) {
      lineStatus = 'overpaid';
    } else {
      lineStatus = 'partial';
    }

    const lineAdjReasons: ReconciliationResult['serviceLineReconciliation'][0]['adjustmentReasons'] = [];
    for (const pm of matchingPayments) {
      const reasons = pm.adjustmentReasons || pm.adjustment_reasons || [];
      for (const r of reasons as Array<Record<string, any>>) {
        lineAdjReasons.push({
          groupCode: r.groupCode || r.group_code,
          reasonCode: r.reasonCode || r.reason_code,
          amount: r.amount,
          description: r.description || CARC_DESCRIPTIONS[r.reasonCode || r.reason_code] || '',
        });
      }
    }

    serviceLineReconciliation.push({
      procedureCode: code,
      originalCharge,
      allowedAmount: linePaid + lineAdj, // What the payer says is allowed
      paidAmount: linePaid,
      adjustmentAmount: lineAdj,
      status: lineStatus,
      adjustmentReasons: lineAdjReasons,
    });
  }

  // Generate write-off and appeal suggestions from the reconciled data
  const writeOffSuggestions: WriteOffSuggestion[] = [];
  const appealSuggestions: AppealSuggestion[] = [];

  for (const lineRecon of serviceLineReconciliation) {
    for (const adj of lineRecon.adjustmentReasons) {
      const recommendation = getWriteOffRecommendation(adj.groupCode, adj.reasonCode, adj.amount);
      const groupDesc = ADJUSTMENT_GROUP_DESCRIPTIONS[adj.groupCode] || adj.groupCode;

      writeOffSuggestions.push({
        procedureCode: lineRecon.procedureCode,
        adjustmentGroupCode: adj.groupCode,
        adjustmentReasonCode: adj.reasonCode,
        amount: adj.amount,
        description: adj.description,
        recommendation,
        rationale: recommendation === 'write_off'
          ? `${groupDesc}. Standard contractual adjustment.`
          : recommendation === 'patient_bill'
          ? `Patient owes $${adj.amount.toFixed(2)}.`
          : recommendation === 'appeal'
          ? APPEALABLE_CARC_CODES[adj.reasonCode]?.action || 'Consider appeal.'
          : `Manual review recommended. ${groupDesc}: ${adj.description}`,
      });

      if (recommendation === 'appeal') {
        const appealInfo = APPEALABLE_CARC_CODES[adj.reasonCode];
        if (appealInfo) {
          appealSuggestions.push({
            procedureCode: lineRecon.procedureCode,
            denialReasonCode: adj.reasonCode,
            denialDescription: adj.description,
            amount: adj.amount,
            appealDeadlineDays: appealInfo.deadlineDays,
            suggestedAction: appealInfo.action,
            successLikelihood: appealInfo.successRate as 'high' | 'medium' | 'low',
            templateId: `appeal_carc_${adj.reasonCode}`,
          });
        }
      }
    }
  }

  timeline.push({
    timestamp: new Date().toISOString(),
    event: 'reconciliation_complete',
    details: `Status: ${status}. Variance: $${variance.toFixed(2)} (${variancePercentage.toFixed(1)}%). Write-offs: ${writeOffSuggestions.length}, Appeals: ${appealSuggestions.length}`,
  });

  return {
    claimId,
    claimControlNumber,
    status,
    originalChargedAmount,
    totalPaidAmount,
    totalAdjustmentAmount,
    patientResponsibility,
    variance,
    variancePercentage,
    serviceLineReconciliation,
    writeOffSuggestions,
    appealSuggestions,
    timeline,
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Process multiple ERA 835 files in batch.
 * Parses each file, posts payments, and returns aggregated results.
 */
export async function batchProcessERA835(
  rawFiles: string[],
  postedBy: string = 'auto'
): Promise<{
  filesProcessed: number;
  totalPaymentsPosted: number;
  totalAmount: number;
  results: PaymentPostingResult[];
  errors: Array<{ fileIndex: number; error: string }>;
}> {
  const batchResult = {
    filesProcessed: 0,
    totalPaymentsPosted: 0,
    totalAmount: 0,
    results: [] as PaymentPostingResult[],
    errors: [] as Array<{ fileIndex: number; error: string }>,
  };

  for (let i = 0; i < rawFiles.length; i++) {
    try {
      const parsed = parseERA835(rawFiles[i]);
      if (!parsed.success) {
        batchResult.errors.push({
          fileIndex: i,
          error: `Parse failed: ${parsed.errors?.map(e => e.message).join('; ') || 'Unknown error'}`,
        });
        continue;
      }

      const postResult = await postPayments(parsed, postedBy);
      batchResult.results.push(postResult);
      batchResult.totalPaymentsPosted += postResult.successfulPosts;
      batchResult.totalAmount += postResult.totalPostedAmount;
      batchResult.filesProcessed++;
    } catch (err) {
      batchResult.errors.push({
        fileIndex: i,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return batchResult;
}

/**
 * Fetch all unreconciled payments from the database.
 * These are payments that have been posted but not yet matched to original claims.
 */
export async function getUnreconciledPayments(): Promise<PostedPayment[]> {
  try {
    const { data, ok } = await secureFetch<PostedPayment[]>(
      `${supabaseRestUrl}/claims_payments?claim_id=is.null&order=posted_at.desc&limit=100`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );
    return ok && Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Get payment posting summary for a date range.
 */
export async function getPaymentPostingSummary(
  dateFrom: string,
  dateTo: string
): Promise<{
  totalPosted: number;
  totalPaid: number;
  totalAdjusted: number;
  totalPatientResponsibility: number;
  byStatus: Record<string, number>;
  byPayer: Array<{ payerName: string; totalPaid: number; claimCount: number }>;
}> {
  try {
    const { data, ok } = await secureFetch<PostedPayment[]>(
      `${supabaseRestUrl}/claims_payments?posted_at=gte.${dateFrom}&posted_at=lte.${dateTo}&select=*&order=posted_at.desc`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    const payments = ok && Array.isArray(data) ? data : [];

    const byStatus: Record<string, number> = {};
    const payerMap: Record<string, { totalPaid: number; claimCount: number }> = {};

    let totalPaid = 0;
    let totalAdjusted = 0;
    let totalPatientResp = 0;

    for (const p of payments) {
      const paid = p.paidAmount || p.paid_amount || 0;
      const adjusted = p.adjustmentAmount || p.adjustment_amount || 0;
      const patientResp = p.patientResponsibility || p.patient_responsibility || 0;
      const status = p.postingStatus || p.posting_status || 'posted';
      const payer = p.payerName || p.payer_name || 'Unknown';

      totalPaid += paid;
      totalAdjusted += adjusted;
      totalPatientResp += patientResp;
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (!payerMap[payer]) payerMap[payer] = { totalPaid: 0, claimCount: 0 };
      payerMap[payer].totalPaid += paid;
      payerMap[payer].claimCount += 1;
    }

    return {
      totalPosted: payments.length,
      totalPaid,
      totalAdjusted,
      totalPatientResponsibility: totalPatientResp,
      byStatus,
      byPayer: Object.entries(payerMap).map(([payerName, v]) => ({
        payerName,
        ...v,
      })),
    };
  } catch {
    return {
      totalPosted: 0,
      totalPaid: 0,
      totalAdjusted: 0,
      totalPatientResponsibility: 0,
      byStatus: {},
      byPayer: [],
    };
  }
}
