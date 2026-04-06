// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * denial-management.ts
 *
 * Comprehensive denial tracking and management system that processes
 * ERA 835 remittance data to:
 *
 * 1. Categorize denials by CARC/RARC reason codes
 * 2. Suggest corrective actions for common denial reasons
 * 3. Track appeal deadlines and resubmission workflows
 * 4. Calculate denial rate metrics by payer, provider, and CPT code
 * 5. Persist denial records to Supabase for reporting
 */

import {
  type ERA835ClaimAdjudication,
  type ERA835ParseResult,
  CARC_DESCRIPTIONS,
} from './clearinghouse-integration';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

/** Broad denial category for grouping and reporting */
export type DenialCategory =
  | 'eligibility'
  | 'authorization'
  | 'coding'
  | 'timely-filing'
  | 'duplicate'
  | 'medical-necessity'
  | 'bundling'
  | 'coordination-of-benefits'
  | 'missing-info'
  | 'contractual'
  | 'patient-responsibility'
  | 'other';

/** Priority level for denial follow-up */
export type DenialPriority = 'critical' | 'high' | 'medium' | 'low';

/** Status of a denial record through its lifecycle */
export type DenialStatus =
  | 'new'
  | 'under-review'
  | 'corrective-action'
  | 'resubmitted'
  | 'appealed'
  | 'resolved'
  | 'written-off';

/** Corrective action recommendation */
export interface CorrectiveAction {
  actionType:
    | 'resubmit-corrected'
    | 'appeal'
    | 'provide-documentation'
    | 'verify-eligibility'
    | 'obtain-authorization'
    | 'recode'
    | 'contact-payer'
    | 'write-off'
    | 'patient-billing';
  description: string;
  priority: DenialPriority;
  estimatedRecovery: 'high' | 'medium' | 'low';
  deadline?: string; // ISO date string
}

/** Full denial record for tracking */
export interface DenialRecord {
  id: string;
  claimControlNumber: string;
  patientName: string;
  patientMemberId: string;
  payerName: string;
  payerId: string;
  providerId: string;
  providerName: string;
  dateOfService: string;
  dateReceived: string;
  // Denial details
  category: DenialCategory;
  status: DenialStatus;
  priority: DenialPriority;
  deniedAmount: number;
  totalChargedAmount: number;
  totalPaidAmount: number;
  // CARC/RARC codes
  adjustmentReasons: Array<{
    groupCode: string;
    reasonCode: string;
    amount: number;
    description: string;
  }>;
  remarkCodes: string[];
  // Service lines that were denied
  deniedServiceLines: Array<{
    procedureCode: string;
    chargedAmount: number;
    paidAmount: number;
    deniedAmount: number;
    adjustmentReasonCodes: string[];
  }>;
  // Corrective actions
  suggestedActions: CorrectiveAction[];
  selectedAction?: string; // The action type the user chose
  // Appeal tracking
  appealDeadline?: string;
  appealSubmittedDate?: string;
  appealReference?: string;
  // Resubmission tracking
  resubmissionDate?: string;
  resubmissionClaimId?: string;
  // Resolution
  resolvedDate?: string;
  resolvedAmount?: number;
  resolutionNotes?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/** Denial rate metrics for reporting */
export interface DenialMetrics {
  period: { from: string; to: string };
  totalClaims: number;
  totalDenials: number;
  denialRate: number; // percentage
  totalDeniedAmount: number;
  totalRecoveredAmount: number;
  recoveryRate: number; // percentage
  averageDaysToResolve: number;
  byCategory: Array<{
    category: DenialCategory;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byPayer: Array<{
    payerId: string;
    payerName: string;
    denialCount: number;
    deniedAmount: number;
    denialRate: number;
  }>;
  byCptCode: Array<{
    cptCode: string;
    denialCount: number;
    deniedAmount: number;
    topReasons: string[];
  }>;
  topReasonCodes: Array<{
    reasonCode: string;
    description: string;
    count: number;
    amount: number;
  }>;
}

// ============================================================================
// RARC (Remittance Advice Remark Codes) — Most Common
// ============================================================================

const RARC_DESCRIPTIONS: Record<string, string> = {
  'N1': 'Alert: You may appeal this decision.',
  'N4': 'Missing/Incomplete/Invalid prior authorization number.',
  'N5': 'Alert: This is a draft determination. Services rendered on or after the effective date may be covered.',
  'N19': 'Procedure code incidental to primary procedure.',
  'N20': 'Service not consistent with the information in the medical record.',
  'N30': 'Patient ineligible for this service.',
  'N56': 'Procedure code billed is not correct/valid.',
  'N95': 'This provider type/provider specialty may not bill this service.',
  'N115': 'This decision was based on a Local Coverage Determination (LCD).',
  'N386': 'This decision was based on a National Coverage Determination (NCD).',
  'N432': 'Alert: Adjustment based on a recovery audit.',
  'MA04': 'Secondary payment cannot be considered without the identity of or payment information from the primary payer.',
  'MA07': 'The claim information has also been forwarded to the patient\'s supplemental insurer.',
  'MA18': 'The claim information is also being forwarded to the patient\'s supplemental insurer.',
  'MA130': 'Your claim contains incomplete and/or invalid information.',
};

// ============================================================================
// CARC Category Mapping
// ============================================================================

/**
 * Maps CARC reason codes to denial categories for grouping and reporting.
 * Uses range-based mapping since CARC codes follow grouping conventions.
 */
function categorizeByCARC(reasonCode: string): DenialCategory {
  const codeNum = parseInt(reasonCode, 10);
  if (isNaN(codeNum)) return 'other';

  // Eligibility-related (1-3)
  if (codeNum >= 1 && codeNum <= 3) return 'eligibility';
  // Coding and procedure issues (4-16)
  if (codeNum === 4 || codeNum === 5 || codeNum === 6) return 'coding';
  if (codeNum === 11) return 'coding'; // Diagnosis inconsistent with procedure
  // Authorization
  if (codeNum === 15) return 'authorization'; // Auth not provided
  // Timely filing
  if (codeNum === 29) return 'timely-filing';
  // Duplicate
  if (codeNum === 18 || codeNum === 19) return 'duplicate';
  // Bundling
  if (codeNum === 97) return 'bundling';
  // Medical necessity (50-57)
  if (codeNum >= 50 && codeNum <= 57) return 'medical-necessity';
  // COB (22-24)
  if (codeNum >= 22 && codeNum <= 24) return 'coordination-of-benefits';
  // Missing info (16, 252)
  if (codeNum === 16 || codeNum === 252) return 'missing-info';
  // Patient responsibility (common PR group codes: 1-3, 45)
  if (codeNum === 1 || codeNum === 2 || codeNum === 3 || codeNum === 45) return 'patient-responsibility';
  // Contractual (45, 95, 131)
  if (codeNum === 45 || codeNum === 95 || codeNum === 131) return 'contractual';

  return 'other';
}

/**
 * Determines the appropriate denial category from a set of adjustment reasons.
 * Uses the highest-value adjustment as the primary category driver.
 */
function determineDenialCategory(
  adjustmentReasons: Array<{ groupCode: string; reasonCode: string; amount: number }>
): DenialCategory {
  // Filter to non-PR (non-patient-responsibility) denials first
  const insuranceDenials = adjustmentReasons.filter(a => a.groupCode !== 'PR');

  if (insuranceDenials.length === 0) {
    return 'patient-responsibility';
  }

  // Use the highest-amount denial reason as primary category
  const primary = insuranceDenials.reduce((max, current) =>
    current.amount > max.amount ? current : max
  );

  return categorizeByCARC(primary.reasonCode);
}

// ============================================================================
// Priority Assignment
// ============================================================================

/**
 * Assigns a follow-up priority based on denied amount and category.
 */
function assignPriority(
  deniedAmount: number,
  category: DenialCategory
): DenialPriority {
  // Critical: high-value denials that are likely recoverable
  if (deniedAmount >= 500 && (
    category === 'authorization' ||
    category === 'missing-info' ||
    category === 'coding'
  )) {
    return 'critical';
  }

  // High: moderate value or time-sensitive
  if (deniedAmount >= 200 || category === 'timely-filing') {
    return 'high';
  }

  // Medium: recoverable but lower value
  if (
    category === 'coding' ||
    category === 'eligibility' ||
    category === 'duplicate'
  ) {
    return 'medium';
  }

  // Low: contractual or small amounts
  return 'low';
}

// ============================================================================
// Corrective Action Engine
// ============================================================================

/**
 * Suggests corrective actions based on denial category, CARC codes,
 * and adjustment group codes. Returns prioritized action list.
 */
export function suggestCorrectiveActions(
  category: DenialCategory,
  adjustmentReasons: Array<{ groupCode: string; reasonCode: string; amount: number }>,
  deniedAmount: number
): CorrectiveAction[] {
  const actions: CorrectiveAction[] = [];
  const now = new Date();

  switch (category) {
    case 'eligibility':
      actions.push({
        actionType: 'verify-eligibility',
        description: 'Verify patient eligibility for the date of service. Check if coverage was active and the patient was enrolled in the plan.',
        priority: 'high',
        estimatedRecovery: 'medium',
      });
      actions.push({
        actionType: 'resubmit-corrected',
        description: 'If eligibility is confirmed, resubmit with correct member ID and plan information.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      break;

    case 'authorization':
      actions.push({
        actionType: 'obtain-authorization',
        description: 'Obtain retroactive authorization if within payer\'s allowable timeframe (typically 14-30 days).',
        priority: 'critical',
        estimatedRecovery: 'high',
        deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      actions.push({
        actionType: 'appeal',
        description: 'If retroactive auth is denied, file a formal appeal with clinical documentation supporting medical necessity.',
        priority: 'high',
        estimatedRecovery: 'medium',
        deadline: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      break;

    case 'coding':
      actions.push({
        actionType: 'recode',
        description: 'Review documentation and recode the claim with the correct CPT/ICD-10 codes. Verify modifier usage.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      actions.push({
        actionType: 'resubmit-corrected',
        description: 'Resubmit the claim with corrected codes and ensure documentation supports the billed services.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      break;

    case 'timely-filing':
      if (deniedAmount >= 100) {
        actions.push({
          actionType: 'appeal',
          description: 'File a timely filing appeal with proof of original submission (clearinghouse receipt, submission confirmation).',
          priority: 'critical',
          estimatedRecovery: 'medium',
          deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      }
      actions.push({
        actionType: 'contact-payer',
        description: 'Contact the payer to verify filing deadline and discuss any exceptions or extensions.',
        priority: 'high',
        estimatedRecovery: 'low',
      });
      break;

    case 'duplicate':
      actions.push({
        actionType: 'contact-payer',
        description: 'Verify if the original claim was processed. If not, request reprocessing of the current claim.',
        priority: 'medium',
        estimatedRecovery: 'medium',
      });
      break;

    case 'medical-necessity':
      actions.push({
        actionType: 'appeal',
        description: 'Submit a peer-to-peer review request or formal appeal with clinical notes, treatment plan, and documentation supporting medical necessity.',
        priority: 'critical',
        estimatedRecovery: 'medium',
        deadline: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      actions.push({
        actionType: 'provide-documentation',
        description: 'Gather and attach supporting documentation: clinical notes, assessment results, treatment plan, prior progress notes.',
        priority: 'high',
        estimatedRecovery: 'medium',
      });
      break;

    case 'bundling':
      actions.push({
        actionType: 'recode',
        description: 'Review NCCI edits and unbundle codes correctly. Add appropriate modifier (e.g., modifier 59/XE) if services are truly distinct.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      actions.push({
        actionType: 'resubmit-corrected',
        description: 'Resubmit with correct modifier or separate the services appropriately.',
        priority: 'medium',
        estimatedRecovery: 'high',
      });
      break;

    case 'coordination-of-benefits':
      actions.push({
        actionType: 'contact-payer',
        description: 'Verify coordination of benefits. Submit to the correct primary/secondary payer order.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      actions.push({
        actionType: 'resubmit-corrected',
        description: 'Resubmit with correct primary payer EOB attached if this is a secondary claim.',
        priority: 'medium',
        estimatedRecovery: 'high',
      });
      break;

    case 'missing-info':
      actions.push({
        actionType: 'provide-documentation',
        description: 'Review the remittance advice for specific missing information. Gather and attach the required documentation.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      actions.push({
        actionType: 'resubmit-corrected',
        description: 'Resubmit the claim with all required information included.',
        priority: 'high',
        estimatedRecovery: 'high',
      });
      break;

    case 'contractual':
      // Contractual adjustments are usually valid write-offs
      if (deniedAmount > 50) {
        actions.push({
          actionType: 'contact-payer',
          description: 'Review fee schedule and contracted rates. Verify the adjustment matches your contract terms.',
          priority: 'low',
          estimatedRecovery: 'low',
        });
      }
      actions.push({
        actionType: 'write-off',
        description: 'Write off the contractual adjustment as per the payer agreement.',
        priority: 'low',
        estimatedRecovery: 'low',
      });
      break;

    case 'patient-responsibility':
      actions.push({
        actionType: 'patient-billing',
        description: 'Bill the patient for their responsibility (copay, coinsurance, deductible). Generate a patient invoice.',
        priority: 'medium',
        estimatedRecovery: 'high',
      });
      break;

    default:
      actions.push({
        actionType: 'contact-payer',
        description: 'Contact the payer for clarification on the denial reason and required corrective action.',
        priority: 'medium',
        estimatedRecovery: 'medium',
      });
  }

  return actions;
}

// ============================================================================
// Appeal Deadline Calculation
// ============================================================================

/**
 * Calculates appeal deadline based on payer type and state regulations.
 * Most commercial payers allow 60-180 days; Medicaid varies by state.
 */
function calculateAppealDeadline(
  dateReceived: string,
  payerId: string
): string {
  const received = new Date(dateReceived);

  // Default appeal windows by payer type
  // In production, this would come from payer contract data
  const payerIdLower = payerId.toLowerCase();
  let appealDays = 90; // Default: 90 days

  if (payerIdLower.includes('medicaid') || payerIdLower.startsWith('SKMED')) {
    appealDays = 60; // Medicaid: typically 60 days
  } else if (payerIdLower.includes('medicare') || payerIdLower.startsWith('CMS')) {
    appealDays = 120; // Medicare: 120 days for redetermination
  } else if (payerIdLower.includes('bcbs') || payerIdLower.includes('blue')) {
    appealDays = 180; // BCBS: typically 180 days
  } else if (payerIdLower.includes('united') || payerIdLower.includes('uhc')) {
    appealDays = 180; // UHC: 180 days
  } else if (payerIdLower.includes('aetna')) {
    appealDays = 180; // Aetna: 180 days
  } else if (payerIdLower.includes('cigna')) {
    appealDays = 180; // Cigna: 180 days
  }

  const deadline = new Date(received.getTime() + appealDays * 24 * 60 * 60 * 1000);
  return deadline.toISOString().split('T')[0];
}

// ============================================================================
// Core: Process ERA Denials
// ============================================================================

/**
 * Processes an ERA 835 parse result and extracts denial records.
 * Only creates records for claims with non-zero denied amounts
 * (where paid < charged after excluding patient responsibility).
 */
export function extractDenialsFromERA(
  eraResult: ERA835ParseResult,
  providerId: string,
  providerName: string
): DenialRecord[] {
  if (!eraResult.success || !eraResult.claims) return [];

  const denials: DenialRecord[] = [];
  const now = new Date().toISOString();

  for (const claim of eraResult.claims) {
    // Skip fully paid claims
    if (claim.claimStatus === 'paid' && claim.totalPaidAmount >= claim.totalChargedAmount) {
      continue;
    }

    // Calculate denial amount (excluding patient responsibility)
    const coAdjustments = claim.adjustmentReasons.filter(a => a.groupCode === 'CO');
    const oaAdjustments = claim.adjustmentReasons.filter(a => a.groupCode === 'OA');
    const piAdjustments = claim.adjustmentReasons.filter(a => a.groupCode === 'PI');

    const insuranceDeniedAmount = [
      ...coAdjustments,
      ...oaAdjustments,
      ...piAdjustments,
    ].reduce((sum, adj) => sum + adj.amount, 0);

    // Only track if there's a meaningful insurance denial
    if (insuranceDeniedAmount <= 0 && claim.claimStatus === 'paid') {
      continue;
    }

    const nonPrAdjustments = claim.adjustmentReasons.filter(a => a.groupCode !== 'PR');
    const category = determineDenialCategory(
      nonPrAdjustments.length > 0
        ? nonPrAdjustments
        : claim.adjustmentReasons
    );

    const priority = assignPriority(insuranceDeniedAmount, category);
    const dateReceived = now.split('T')[0];
    const appealDeadline = calculateAppealDeadline(
      dateReceived,
      eraResult.payment.payerId
    );

    // Build denied service lines
    const deniedServiceLines = claim.serviceLines
      .filter(sl => sl.paidAmount < sl.chargedAmount)
      .map(sl => ({
        procedureCode: sl.procedureCode,
        chargedAmount: sl.chargedAmount,
        paidAmount: sl.paidAmount,
        deniedAmount: sl.chargedAmount - sl.paidAmount,
        adjustmentReasonCodes: sl.adjustments.map(a => `${a.groupCode}-${a.reasonCode}`),
      }));

    const suggestedActions = suggestCorrectiveActions(
      category,
      claim.adjustmentReasons,
      insuranceDeniedAmount
    );

    const denial: DenialRecord = {
      id: `den-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      claimControlNumber: claim.claimControlNumber,
      patientName: claim.patientName,
      patientMemberId: claim.patientMemberId,
      payerName: eraResult.payment.payerName,
      payerId: eraResult.payment.payerId,
      providerId,
      providerName,
      dateOfService: claim.serviceDateFrom,
      dateReceived,
      category,
      status: 'new',
      priority,
      deniedAmount: insuranceDeniedAmount,
      totalChargedAmount: claim.totalChargedAmount,
      totalPaidAmount: claim.totalPaidAmount,
      adjustmentReasons: claim.adjustmentReasons.map(a => ({
        ...a,
        description: a.description || CARC_DESCRIPTIONS[a.reasonCode] || `Reason code ${a.reasonCode}`,
      })),
      remarkCodes: claim.remarkCodes,
      deniedServiceLines,
      suggestedActions,
      appealDeadline,
      createdAt: now,
      updatedAt: now,
    };

    denials.push(denial);
  }

  return denials;
}

// ============================================================================
// Supabase Persistence
// ============================================================================

/**
 * Saves denial records to the `denial_records` table in Supabase.
 */
export async function saveDenialRecords(
  denials: DenialRecord[]
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  for (const denial of denials) {
    try {
      const { error } = await supabase.from('denial_records').insert({
        id: denial.id,
        claim_control_number: denial.claimControlNumber,
        patient_name: denial.patientName,
        patient_member_id: denial.patientMemberId,
        payer_name: denial.payerName,
        payer_id: denial.payerId,
        provider_id: denial.providerId,
        provider_name: denial.providerName,
        date_of_service: denial.dateOfService,
        date_received: denial.dateReceived,
        category: denial.category,
        status: denial.status,
        priority: denial.priority,
        denied_amount: denial.deniedAmount,
        total_charged_amount: denial.totalChargedAmount,
        total_paid_amount: denial.totalPaidAmount,
        adjustment_reasons: denial.adjustmentReasons,
        remark_codes: denial.remarkCodes,
        denied_service_lines: denial.deniedServiceLines,
        suggested_actions: denial.suggestedActions,
        appeal_deadline: denial.appealDeadline || null,
        created_at: denial.createdAt,
        updated_at: denial.updatedAt,
      });

      if (error) {
        console.error('[denial-management] Error saving denial:', error.message);
        errors++;
      } else {
        saved++;
      }
    } catch (err) {
      console.error('[denial-management] Unexpected error:', err);
      errors++;
    }
  }

  return { saved, errors };
}

/**
 * Updates a denial record's status and resolution info.
 */
export async function updateDenialStatus(
  denialId: string,
  update: {
    status: DenialStatus;
    selectedAction?: string;
    appealSubmittedDate?: string;
    appealReference?: string;
    resubmissionDate?: string;
    resubmissionClaimId?: string;
    resolvedDate?: string;
    resolvedAmount?: number;
    resolutionNotes?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('denial_records')
      .update({
        status: update.status,
        selected_action: update.selectedAction ?? null,
        appeal_submitted_date: update.appealSubmittedDate ?? null,
        appeal_reference: update.appealReference ?? null,
        resubmission_date: update.resubmissionDate ?? null,
        resubmission_claim_id: update.resubmissionClaimId ?? null,
        resolved_date: update.resolvedDate ?? null,
        resolved_amount: update.resolvedAmount ?? null,
        resolution_notes: update.resolutionNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', denialId);

    if (error) {
      console.error('[denial-management] Error updating denial:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[denial-management] Unexpected update error:', err);
    return false;
  }
}

/**
 * Fetches denial records for a provider with optional filters.
 */
export async function getDenialRecords(
  providerId: string,
  filters?: {
    status?: DenialStatus;
    category?: DenialCategory;
    priority?: DenialPriority;
    dateFrom?: string;
    dateTo?: string;
    payerId?: string;
  }
): Promise<DenialRecord[]> {
  try {
    let query = supabase
      .from('denial_records')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.dateFrom) {
      query = query.gte('date_of_service', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('date_of_service', filters.dateTo);
    }
    if (filters?.payerId) {
      query = query.eq('payer_id', filters.payerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[denial-management] Error fetching denials:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToDenialRecord);
  } catch (err) {
    console.error('[denial-management] Unexpected fetch error:', err);
    return [];
  }
}

/**
 * Fetches denials that are approaching their appeal deadline.
 * Returns denials where the appeal deadline is within the specified
 * number of days from today and the status is not yet resolved.
 */
export async function getUpcomingAppealDeadlines(
  providerId: string,
  daysAhead: number = 14
): Promise<DenialRecord[]> {
  const today = new Date();
  const cutoff = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const cutoffDate = cutoff.toISOString().split('T')[0];
  const todayDate = today.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('denial_records')
      .select('*')
      .eq('provider_id', providerId)
      .not('status', 'in', '("resolved","written-off")')
      .not('appeal_deadline', 'is', null)
      .gte('appeal_deadline', todayDate)
      .lte('appeal_deadline', cutoffDate)
      .order('appeal_deadline', { ascending: true });

    if (error) {
      console.error('[denial-management] Error fetching appeal deadlines:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToDenialRecord);
  } catch (err) {
    console.error('[denial-management] Unexpected deadline fetch error:', err);
    return [];
  }
}

/**
 * Get denial records for a specific patient (parent-facing).
 * Matches on patient_name (case-insensitive) for the given user's children.
 */
export async function getDenialRecordsForPatient(
  patientName: string,
  filters?: {
    status?: DenialStatus;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<DenialRecord[]> {
  try {
    let query = supabase
      .from('denial_records')
      .select('*')
      .ilike('patient_name', `%${patientName}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte('date_of_service', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('date_of_service', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[denial-management] Error fetching patient denials:', error.message);
      return [];
    }

    return (data ?? []).map(mapRowToDenialRecord);
  } catch (err) {
    console.error('[denial-management] Unexpected patient denial fetch error:', err);
    return [];
  }
}

// ============================================================================
// Denial Metrics / Analytics
// ============================================================================

/**
 * Calculates denial rate metrics for a provider over a given period.
 * Aggregates data from both claims and denials tables.
 */
export async function calculateDenialMetrics(
  providerId: string,
  dateFrom: string,
  dateTo: string
): Promise<DenialMetrics> {
  try {
    // Fetch all denials for the period
    const { data: denialRows, error: denialError } = await supabase
      .from('denial_records')
      .select('*')
      .eq('provider_id', providerId)
      .gte('date_of_service', dateFrom)
      .lte('date_of_service', dateTo);

    if (denialError) {
      console.error('[denial-management] Error fetching denial metrics:', denialError.message);
    }

    const denials = (denialRows ?? []).map(mapRowToDenialRecord);

    // Fetch total claims count for the period (from submissions table)
    const { count: totalClaims } = await supabase
      .from('claim_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .gte('service_date', dateFrom)
      .lte('service_date', dateTo);

    const claimCount = totalClaims ?? denials.length; // fallback if table doesn't exist
    const totalDenials = denials.length;
    const denialRate = claimCount > 0 ? (totalDenials / claimCount) * 100 : 0;

    const totalDeniedAmount = denials.reduce((sum, d) => sum + d.deniedAmount, 0);

    // Calculate recovered amounts from resolved denials
    const resolvedDenials = denials.filter(d => d.status === 'resolved' && d.resolvedAmount != null);
    const totalRecoveredAmount = resolvedDenials.reduce(
      (sum, d) => sum + (d.resolvedAmount ?? 0),
      0
    );
    const recoveryRate = totalDeniedAmount > 0
      ? (totalRecoveredAmount / totalDeniedAmount) * 100
      : 0;

    // Average days to resolve
    const resolvedWithDates = denials.filter(d => d.resolvedDate && d.createdAt);
    const avgDays = resolvedWithDates.length > 0
      ? resolvedWithDates.reduce((sum, d) => {
          const created = new Date(d.createdAt).getTime();
          const resolved = new Date(d.resolvedDate!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedWithDates.length
      : 0;

    // Group by category
    const categoryMap = new Map<DenialCategory, { count: number; amount: number }>();
    for (const d of denials) {
      const existing = categoryMap.get(d.category) ?? { count: 0, amount: 0 };
      categoryMap.set(d.category, {
        count: existing.count + 1,
        amount: existing.amount + d.deniedAmount,
      });
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: totalDenials > 0 ? (data.count / totalDenials) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    // Group by payer
    const payerMap = new Map<string, { payerName: string; count: number; amount: number }>();
    for (const d of denials) {
      const existing = payerMap.get(d.payerId) ?? { payerName: d.payerName, count: 0, amount: 0 };
      payerMap.set(d.payerId, {
        payerName: d.payerName,
        count: existing.count + 1,
        amount: existing.amount + d.deniedAmount,
      });
    }
    const byPayer = Array.from(payerMap.entries()).map(([payerId, data]) => ({
      payerId,
      payerName: data.payerName,
      denialCount: data.count,
      deniedAmount: data.amount,
      denialRate: claimCount > 0 ? (data.count / claimCount) * 100 : 0,
    })).sort((a, b) => b.denialCount - a.denialCount);

    // Group by CPT code
    const cptMap = new Map<string, { count: number; amount: number; reasons: Set<string> }>();
    for (const d of denials) {
      for (const sl of d.deniedServiceLines) {
        const existing = cptMap.get(sl.procedureCode) ?? { count: 0, amount: 0, reasons: new Set() };
        existing.count++;
        existing.amount += sl.deniedAmount;
        for (const rc of sl.adjustmentReasonCodes) {
          existing.reasons.add(rc);
        }
        cptMap.set(sl.procedureCode, existing);
      }
    }
    const byCptCode = Array.from(cptMap.entries()).map(([cptCode, data]) => ({
      cptCode,
      denialCount: data.count,
      deniedAmount: data.amount,
      topReasons: Array.from(data.reasons).slice(0, 5),
    })).sort((a, b) => b.denialCount - a.denialCount);

    // Top reason codes
    const reasonMap = new Map<string, { description: string; count: number; amount: number }>();
    for (const d of denials) {
      for (const adj of d.adjustmentReasons) {
        if (adj.groupCode === 'PR') continue; // Skip patient responsibility
        const key = adj.reasonCode;
        const existing = reasonMap.get(key) ?? {
          description: adj.description || CARC_DESCRIPTIONS[key] || `Code ${key}`,
          count: 0,
          amount: 0,
        };
        existing.count++;
        existing.amount += adj.amount;
        reasonMap.set(key, existing);
      }
    }
    const topReasonCodes = Array.from(reasonMap.entries())
      .map(([reasonCode, data]) => ({
        reasonCode,
        description: data.description,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period: { from: dateFrom, to: dateTo },
      totalClaims: claimCount,
      totalDenials,
      denialRate: Math.round(denialRate * 100) / 100,
      totalDeniedAmount,
      totalRecoveredAmount,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      averageDaysToResolve: Math.round(avgDays * 10) / 10,
      byCategory,
      byPayer,
      byCptCode,
      topReasonCodes,
    };
  } catch (err) {
    console.error('[denial-management] Unexpected metrics error:', err);
    return {
      period: { from: dateFrom, to: dateTo },
      totalClaims: 0,
      totalDenials: 0,
      denialRate: 0,
      totalDeniedAmount: 0,
      totalRecoveredAmount: 0,
      recoveryRate: 0,
      averageDaysToResolve: 0,
      byCategory: [],
      byPayer: [],
      byCptCode: [],
      topReasonCodes: [],
    };
  }
}

// ============================================================================
// Appeal Letter Generation
// ============================================================================

/** Template appeal letter content per CARC code */
const APPEAL_LETTER_TEMPLATES: Record<string, {
  clinicalJustification: string;
  supportingDocChecklist: string[];
}> = {
  '4': {
    clinicalJustification:
      'The procedure code billed accurately reflects the service rendered. The modifier used is consistent with the clinical documentation and payer guidelines. We respectfully request reconsideration, as the service was medically necessary and properly coded per the treating provider\'s clinical judgment and the applicable CPT coding guidelines.',
    supportingDocChecklist: ['Clinical notes for date of service', 'CPT code rationale from coding reference', 'Modifier documentation', 'Payer-specific billing guidelines'],
  },
  '11': {
    clinicalJustification:
      'The diagnosis code(s) listed on the claim are consistent with the procedure performed. The clinical documentation supports the medical necessity of the billed procedure for the documented diagnosis. The ICD-10 code accurately reflects the patient\'s condition as assessed during the encounter.',
    supportingDocChecklist: ['Clinical notes with diagnosis documentation', 'ICD-10 code rationale', 'Treatment plan linking diagnosis to procedure', 'Prior assessment/evaluation results'],
  },
  '15': {
    clinicalJustification:
      'We acknowledge that prior authorization is required for this service. [If retro-auth obtained]: A retroactive authorization has been obtained (Auth # [AUTH_NUMBER]). [If no auth]: We request an exception based on the urgent/emergent nature of the service, or the authorization was in process at the time of service. The clinical documentation demonstrates that delaying the service would have resulted in adverse patient outcomes.',
    supportingDocChecklist: ['Prior authorization number (if obtained retroactively)', 'Clinical notes demonstrating urgency', 'Authorization request submission confirmation', 'Payer auth requirements reference'],
  },
  '16': {
    clinicalJustification:
      'We are resubmitting this claim with the previously missing information now included. The claim has been reviewed and all required data fields have been completed. We request that the claim be reprocessed with the corrected information.',
    supportingDocChecklist: ['Corrected claim form (CMS-1500 or 837P)', 'Identification of previously missing fields', 'Supporting documentation for corrected fields', 'Original remittance advice/EOB'],
  },
  '18': {
    clinicalJustification:
      'This claim is not a duplicate. [If different dates of service]: The services were rendered on different dates. [If same date, different services]: The services billed are distinct procedures with separate clinical documentation. [If modifier needed]: The appropriate modifier has been added to distinguish the services.',
    supportingDocChecklist: ['Clinical notes for each date of service', 'Side-by-side comparison of billed services', 'Modifier documentation if applicable', 'Original claim submission confirmation'],
  },
  '29': {
    clinicalJustification:
      'We respectfully appeal this timely filing denial. The original claim was submitted within the contractual filing deadline. [If proof available]: Attached is the clearinghouse submission confirmation dated [DATE], which is within the [X]-day filing limit. [If extenuating circumstances]: Extenuating circumstances prevented timely filing, including [REASON].',
    supportingDocChecklist: ['Clearinghouse submission confirmation/receipt', 'Electronic submission acknowledgment', 'Payer contract showing filing deadline', 'Documentation of extenuating circumstances (if applicable)'],
  },
  '50': {
    clinicalJustification:
      'The services rendered were medically necessary for the treatment of the patient\'s diagnosed condition(s). The treatment plan was developed based on a comprehensive assessment and is consistent with evidence-based clinical guidelines. The patient demonstrated [CLINICAL_INDICATORS] warranting the level and frequency of treatment provided. Enclosed are the clinical notes, treatment plan, and progress documentation supporting the medical necessity of these services.',
    supportingDocChecklist: ['Comprehensive treatment plan', 'Progress notes demonstrating medical necessity', 'Assessment/evaluation results', 'Peer-reviewed literature supporting treatment approach', 'Prior authorization documentation (if applicable)'],
  },
  '97': {
    clinicalJustification:
      'The services billed were not bundled and represent distinct clinical services. [If modifier needed]: The appropriate modifier (59/XE/XS/XP/XU) has been added to indicate that the services are separate and distinct. The clinical documentation supports that each service was performed independently and was medically necessary.',
    supportingDocChecklist: ['Clinical notes documenting each distinct service', 'NCCI edit reference showing unbundling rationale', 'Modifier documentation', 'CCI edits policy reference'],
  },
  '1': {
    clinicalJustification:
      'We are contacting the patient regarding their deductible responsibility. However, we believe the patient responsibility amount calculated may be incorrect based on the plan benefits. We request a review of the deductible application for this claim to ensure it aligns with the patient\'s plan year accumulations.',
    supportingDocChecklist: ['Patient\'s benefit summary', 'Deductible accumulation statement', 'EOB from payer', 'Prior claims applied to deductible for the plan year'],
  },
  '2': {
    clinicalJustification:
      'We are contacting the patient regarding their coinsurance responsibility. We request verification that the coinsurance percentage applied is consistent with the patient\'s plan benefits for in-network behavioral health services. The contracted rate and coinsurance split should reflect the negotiated agreement.',
    supportingDocChecklist: ['Patient\'s benefit summary showing coinsurance rates', 'Contracted rate documentation', 'EOB showing coinsurance calculation', 'In-network verification'],
  },
};

/**
 * Generates a structured appeal letter for a denied claim.
 * Includes patient info, claim details, clinical justification template
 * per CARC code, supporting documentation checklist, and deadline reminder.
 */
export function generateAppealLetter(denial: DenialRecord): string {
  const today = new Date().toISOString().split('T')[0];

  // Extract primary CARC code (without group prefix)
  const primaryAdjustment = denial.adjustmentReasons.find(a => a.groupCode !== 'PR') || denial.adjustmentReasons[0];
  const carcCode = primaryAdjustment?.reasonCode || '';
  const carcDescription = primaryAdjustment?.description || CARC_DESCRIPTIONS[carcCode] || `Reason Code ${carcCode}`;

  // Get template for this CARC code, fall back to generic
  const template = APPEAL_LETTER_TEMPLATES[carcCode] || {
    clinicalJustification:
      'The services rendered were medically necessary and appropriately coded. The clinical documentation supports the billed services. We respectfully request reconsideration of this denial and ask that the claim be reprocessed for payment.',
    supportingDocChecklist: ['Clinical notes for date of service', 'Treatment plan', 'Original remittance advice/EOB', 'Any additional supporting documentation'],
  };

  const deniedServiceSummary = denial.deniedServiceLines.map(sl =>
    `  - CPT ${sl.procedureCode}: Charged $${sl.chargedAmount.toFixed(2)}, Paid $${sl.paidAmount.toFixed(2)}, Denied $${sl.deniedAmount.toFixed(2)} (${sl.adjustmentReasonCodes.join(', ')})`
  ).join('\n');

  const docChecklist = template.supportingDocChecklist.map(doc => `  [ ] ${doc}`).join('\n');

  const daysUntilDeadline = denial.appealDeadline
    ? Math.floor((new Date(denial.appealDeadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const letter = `
APPEAL LETTER — ${denial.payerName}
Date: ${today}
${'='.repeat(60)}

To: ${denial.payerName} Appeals Department
From: ${denial.providerName} (NPI on file)
Re: Appeal of Claim Denial

PATIENT INFORMATION
-------------------
Patient Name: ${denial.patientName}
Member ID: ${denial.patientMemberId}
Date of Service: ${denial.dateOfService}

CLAIM DETAILS
-------------
Claim Control Number: ${denial.claimControlNumber}
Total Charged: $${denial.totalChargedAmount.toFixed(2)}
Total Paid: $${denial.totalPaidAmount.toFixed(2)}
Denied Amount: $${denial.deniedAmount.toFixed(2)}

Denied Service Lines:
${deniedServiceSummary || '  (No service line detail available)'}

DENIAL REASON
-------------
Primary CARC Code: ${primaryAdjustment ? `${primaryAdjustment.groupCode}-${carcCode}` : 'N/A'}
Description: ${carcDescription}
Category: ${denial.category}

CLINICAL JUSTIFICATION
----------------------
${template.clinicalJustification}

SUPPORTING DOCUMENTATION ENCLOSED
----------------------------------
${docChecklist}

APPEAL DEADLINE
---------------
${denial.appealDeadline
    ? `Appeal Deadline: ${denial.appealDeadline}${daysUntilDeadline != null ? ` (${daysUntilDeadline} days remaining)` : ''}`
    : 'Appeal deadline not specified. Please confirm with payer.'}
${daysUntilDeadline != null && daysUntilDeadline <= 14
    ? '*** URGENT: Appeal deadline is approaching. Submit immediately. ***'
    : ''}

We respectfully request that this claim be reconsidered and reprocessed
for payment. Please contact our office if additional information is needed.

Sincerely,
${denial.providerName}
Provider ID: ${denial.providerId}
`.trim();

  return letter;
}

// ============================================================================
// Appeal Success Probability Scoring
// ============================================================================

/** Success probability ranges by denial category */
const CATEGORY_SUCCESS_RATES: Record<DenialCategory, { base: number; description: string }> = {
  'eligibility': { base: 70, description: 'Eligibility denials are often resolved by verifying correct member ID and coverage dates.' },
  'authorization': { base: 50, description: 'Authorization denials succeed when retro-auth is obtainable or the service was emergent.' },
  'coding': { base: 65, description: 'Coding denials are correctable by reviewing CPT/ICD pairing and modifier usage.' },
  'timely-filing': { base: 20, description: 'Timely filing appeals rarely succeed unless you have proof of original timely submission.' },
  'duplicate': { base: 55, description: 'Duplicate denials can be resolved by demonstrating services are distinct.' },
  'medical-necessity': { base: 40, description: 'Medical necessity appeals require strong clinical documentation and may need peer-to-peer review.' },
  'bundling': { base: 60, description: 'Bundling denials often succeed with correct modifier application (59/XE/XS/XP/XU).' },
  'coordination-of-benefits': { base: 55, description: 'COB denials resolve by submitting to the correct primary/secondary order.' },
  'missing-info': { base: 80, description: 'Missing info denials are highly recoverable by resubmitting with complete information.' },
  'contractual': { base: 10, description: 'Contractual adjustments are usually valid per the provider agreement and rarely overturned.' },
  'patient-responsibility': { base: 15, description: 'Patient responsibility amounts (deductible/coinsurance) are typically correct per plan design.' },
  'other': { base: 35, description: 'Success rate varies. Review the specific CARC/RARC codes for targeted appeal strategy.' },
};

/** Payer-specific modifiers to base success rate */
const PAYER_SUCCESS_MODIFIERS: Record<string, number> = {
  'bcbs': 5,      // BCBS tends to be slightly more responsive to appeals
  'aetna': 3,     // Aetna moderate
  'uhc': -2,      // UHC slightly harder
  'united': -2,
  'cigna': 0,
  'medicaid': -5,  // Medicaid has stricter rules
  'ahcccs': -5,
  'medicare': -3,
  'tricare': -5,
};

/**
 * Estimates the probability of a successful appeal for a denied claim.
 * Based on denial category, payer, CARC code, and denied amount.
 * Returns a percentage (0-100) and explanation.
 */
export function estimateAppealSuccess(denial: DenialRecord): {
  probability: number;
  explanation: string;
  factors: string[];
} {
  const categoryInfo = CATEGORY_SUCCESS_RATES[denial.category] || CATEGORY_SUCCESS_RATES['other'];
  let probability = categoryInfo.base;
  const factors: string[] = [];

  factors.push(`Base rate for ${denial.category}: ${categoryInfo.base}%`);

  // Payer modifier
  const payerLower = (denial.payerName + denial.payerId).toLowerCase();
  for (const [key, modifier] of Object.entries(PAYER_SUCCESS_MODIFIERS)) {
    if (payerLower.includes(key)) {
      probability += modifier;
      if (modifier !== 0) {
        factors.push(`Payer adjustment (${denial.payerName}): ${modifier > 0 ? '+' : ''}${modifier}%`);
      }
      break;
    }
  }

  // Higher-value claims get slightly more attention from payers on appeal
  if (denial.deniedAmount >= 500) {
    probability += 5;
    factors.push('High-value claim ($500+): +5%');
  } else if (denial.deniedAmount < 50) {
    probability -= 5;
    factors.push('Low-value claim (<$50): -5% (less payer attention)');
  }

  // Check if appeal deadline is near (urgency factor)
  if (denial.appealDeadline) {
    const daysLeft = Math.floor(
      (new Date(denial.appealDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0) {
      probability = 0;
      factors.push('Appeal deadline has passed: 0% (expired)');
    } else if (daysLeft < 7) {
      probability -= 10;
      factors.push('Appeal deadline within 7 days: -10% (rushed submission risk)');
    }
  }

  // Clamp to 0-95 range (never guarantee success)
  probability = Math.max(0, Math.min(95, probability));

  return {
    probability,
    explanation: categoryInfo.description,
    factors,
  };
}

// ============================================================================
// Batch Rework Support
// ============================================================================

/**
 * Result of a batch rework operation.
 */
export interface BatchReworkResult {
  totalProcessed: number;
  successCount: number;
  failCount: number;
  results: Array<{
    denialId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Applies the same corrective action to multiple denials in batch.
 * Updates each denial's status and selected action, then persists to Supabase.
 */
export async function createBatchRework(
  denialIds: string[],
  correction: CorrectiveAction
): Promise<BatchReworkResult> {
  const results: BatchReworkResult['results'] = [];
  let successCount = 0;
  let failCount = 0;

  // Determine the new status based on the correction action type
  let newStatus: DenialStatus;
  switch (correction.actionType) {
    case 'resubmit-corrected':
      newStatus = 'resubmitted';
      break;
    case 'appeal':
      newStatus = 'appealed';
      break;
    case 'write-off':
      newStatus = 'written-off';
      break;
    default:
      newStatus = 'corrective-action';
  }

  for (const denialId of denialIds) {
    try {
      const success = await updateDenialStatus(denialId, {
        status: newStatus,
        selectedAction: correction.actionType,
        ...(correction.actionType === 'appeal'
          ? { appealSubmittedDate: new Date().toISOString().split('T')[0] }
          : {}),
        ...(correction.actionType === 'resubmit-corrected'
          ? { resubmissionDate: new Date().toISOString().split('T')[0] }
          : {}),
        ...(correction.actionType === 'write-off'
          ? {
              resolvedDate: new Date().toISOString().split('T')[0],
              resolvedAmount: 0,
              resolutionNotes: `Written off via batch rework: ${correction.description}`,
            }
          : {}),
      });

      if (success) {
        successCount++;
        results.push({ denialId, success: true });
      } else {
        failCount++;
        results.push({ denialId, success: false, error: 'Update returned false' });
      }
    } catch (err) {
      failCount++;
      results.push({
        denialId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return {
    totalProcessed: denialIds.length,
    successCount,
    failCount,
    results,
  };
}

// ============================================================================
// Recovery Rate Metrics
// ============================================================================

/**
 * Recovery metrics calculated from a set of denial records.
 */
export interface RecoveryMetrics {
  totalDeniedAmount: number;
  totalRecoveredAmount: number;
  overallRecoveryRate: number;
  recoveryByCategory: Array<{
    category: DenialCategory;
    deniedAmount: number;
    recoveredAmount: number;
    recoveryRate: number;
    count: number;
  }>;
  averageDaysToResolution: number;
  topDenialReasons: Array<{
    reasonCode: string;
    description: string;
    count: number;
    totalAmount: number;
  }>;
  statusBreakdown: Record<DenialStatus, { count: number; amount: number }>;
}

/**
 * Calculates comprehensive recovery metrics from a set of denial records.
 * Returns total denied, total recovered, recovery rate by category,
 * average days to resolution, and top denial reasons.
 */
export function calculateRecoveryMetrics(denials: DenialRecord[]): RecoveryMetrics {
  if (denials.length === 0) {
    return {
      totalDeniedAmount: 0,
      totalRecoveredAmount: 0,
      overallRecoveryRate: 0,
      recoveryByCategory: [],
      averageDaysToResolution: 0,
      topDenialReasons: [],
      statusBreakdown: {
        'new': { count: 0, amount: 0 },
        'under-review': { count: 0, amount: 0 },
        'corrective-action': { count: 0, amount: 0 },
        'resubmitted': { count: 0, amount: 0 },
        'appealed': { count: 0, amount: 0 },
        'resolved': { count: 0, amount: 0 },
        'written-off': { count: 0, amount: 0 },
      },
    };
  }

  const totalDeniedAmount = denials.reduce((sum, d) => sum + d.deniedAmount, 0);
  const resolvedDenials = denials.filter(d => d.status === 'resolved' && d.resolvedAmount != null);
  const totalRecoveredAmount = resolvedDenials.reduce((sum, d) => sum + (d.resolvedAmount ?? 0), 0);
  const overallRecoveryRate = totalDeniedAmount > 0
    ? Math.round((totalRecoveredAmount / totalDeniedAmount) * 10000) / 100
    : 0;

  // Recovery by category
  const categoryMap = new Map<DenialCategory, { denied: number; recovered: number; count: number }>();
  for (const d of denials) {
    const existing = categoryMap.get(d.category) ?? { denied: 0, recovered: 0, count: 0 };
    existing.denied += d.deniedAmount;
    existing.count += 1;
    if (d.status === 'resolved' && d.resolvedAmount != null) {
      existing.recovered += d.resolvedAmount;
    }
    categoryMap.set(d.category, existing);
  }
  const recoveryByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    deniedAmount: data.denied,
    recoveredAmount: data.recovered,
    recoveryRate: data.denied > 0 ? Math.round((data.recovered / data.denied) * 10000) / 100 : 0,
    count: data.count,
  })).sort((a, b) => b.deniedAmount - a.deniedAmount);

  // Average days to resolution
  const resolvedWithDates = denials.filter(d => d.resolvedDate && d.createdAt);
  const averageDaysToResolution = resolvedWithDates.length > 0
    ? Math.round(
        resolvedWithDates.reduce((sum, d) => {
          const created = new Date(d.createdAt).getTime();
          const resolved = new Date(d.resolvedDate!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedWithDates.length * 10
      ) / 10
    : 0;

  // Top denial reasons
  const reasonMap = new Map<string, { description: string; count: number; totalAmount: number }>();
  for (const d of denials) {
    for (const adj of d.adjustmentReasons) {
      if (adj.groupCode === 'PR') continue;
      const key = adj.reasonCode;
      const existing = reasonMap.get(key) ?? {
        description: adj.description || CARC_DESCRIPTIONS[key] || `Code ${key}`,
        count: 0,
        totalAmount: 0,
      };
      existing.count++;
      existing.totalAmount += adj.amount;
      reasonMap.set(key, existing);
    }
  }
  const topDenialReasons = Array.from(reasonMap.entries())
    .map(([reasonCode, data]) => ({
      reasonCode,
      description: data.description,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status breakdown
  const statusBreakdown: RecoveryMetrics['statusBreakdown'] = {
    'new': { count: 0, amount: 0 },
    'under-review': { count: 0, amount: 0 },
    'corrective-action': { count: 0, amount: 0 },
    'resubmitted': { count: 0, amount: 0 },
    'appealed': { count: 0, amount: 0 },
    'resolved': { count: 0, amount: 0 },
    'written-off': { count: 0, amount: 0 },
  };
  for (const d of denials) {
    if (statusBreakdown[d.status]) {
      statusBreakdown[d.status].count += 1;
      statusBreakdown[d.status].amount += d.deniedAmount;
    }
  }

  return {
    totalDeniedAmount,
    totalRecoveredAmount,
    overallRecoveryRate,
    recoveryByCategory,
    averageDaysToResolution,
    topDenialReasons,
    statusBreakdown,
  };
}

// ============================================================================
// Row Mapper
// ============================================================================

function mapRowToDenialRecord(row: Record<string, unknown>): DenialRecord {
  return {
    id: row.id as string,
    claimControlNumber: row.claim_control_number as string,
    patientName: row.patient_name as string,
    patientMemberId: row.patient_member_id as string,
    payerName: row.payer_name as string,
    payerId: row.payer_id as string,
    providerId: row.provider_id as string,
    providerName: row.provider_name as string,
    dateOfService: row.date_of_service as string,
    dateReceived: row.date_received as string,
    category: row.category as DenialCategory,
    status: row.status as DenialStatus,
    priority: row.priority as DenialPriority,
    deniedAmount: row.denied_amount as number,
    totalChargedAmount: row.total_charged_amount as number,
    totalPaidAmount: row.total_paid_amount as number,
    adjustmentReasons: (row.adjustment_reasons as DenialRecord['adjustmentReasons']) ?? [],
    remarkCodes: (row.remark_codes as string[]) ?? [],
    deniedServiceLines: (row.denied_service_lines as DenialRecord['deniedServiceLines']) ?? [],
    suggestedActions: (row.suggested_actions as CorrectiveAction[]) ?? [],
    selectedAction: row.selected_action as string | undefined,
    appealDeadline: row.appeal_deadline as string | undefined,
    appealSubmittedDate: row.appeal_submitted_date as string | undefined,
    appealReference: row.appeal_reference as string | undefined,
    resubmissionDate: row.resubmission_date as string | undefined,
    resubmissionClaimId: row.resubmission_claim_id as string | undefined,
    resolvedDate: row.resolved_date as string | undefined,
    resolvedAmount: row.resolved_amount as number | undefined,
    resolutionNotes: row.resolution_notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
