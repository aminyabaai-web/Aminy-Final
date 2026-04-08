// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * denial-workflow.ts
 *
 * Denial management workflow engine for ABA behavioral health claims.
 * Orchestrates the end-to-end denial resolution process:
 *
 * 1. Processes ERA 835 remittance data to identify denials
 * 2. Auto-categorizes denials by type using CARC/RARC codes
 * 3. Generates structured corrective action plans per denial code
 * 4. Produces appeal letter templates per category
 * 5. Tracks resolution workflows with deadline awareness
 *
 * Complements denial-management.ts (persistence/metrics) and
 * era-payment-posting.ts (payment posting/reconciliation).
 */

import { getPayerConfig } from './payer-configs';

// ============================================================================
// Types
// ============================================================================

/** Adjustment group codes per X12 835 */
export type AdjustmentGroupCode =
  | 'CO'  // Contractual Obligation
  | 'PR'  // Patient Responsibility
  | 'OA'  // Other Adjustment
  | 'PI'  // Payer Initiated Reduction
  | 'CR'; // Correction/Reversal

/** Denial workflow category */
export type DenialWorkflowCategory =
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
  | 'provider-credential'
  | 'other';

/** Urgency level for denial follow-up */
export type DenialUrgency = 'critical' | 'high' | 'medium' | 'low';

/** Corrective action type */
export type CorrectiveActionType =
  | 'resubmit-corrected'
  | 'appeal-clinical'
  | 'appeal-administrative'
  | 'provide-documentation'
  | 'verify-eligibility'
  | 'obtain-authorization'
  | 'recode-claim'
  | 'contact-payer'
  | 'write-off'
  | 'patient-billing'
  | 'credential-update'
  | 'timely-filing-appeal';

/** A single corrective action step */
export interface CorrectiveActionStep {
  step: number;
  actionType: CorrectiveActionType;
  description: string;
  details: string;
  estimatedTimeMinutes: number;
  automatable: boolean;
}

/** Structured corrective action plan */
export interface CorrectiveActionPlan {
  denialCode: string;
  groupCode: AdjustmentGroupCode;
  category: DenialWorkflowCategory;
  urgency: DenialUrgency;
  estimatedRecoveryLikelihood: 'high' | 'medium' | 'low' | 'unlikely';
  steps: CorrectiveActionStep[];
  deadlineDays: number; // Days from denial date to take action
  appealTemplate?: string; // Template key for appeal letter
  notes: string;
}

/** ERA adjustment data for processing */
export interface ERADenialData {
  claimControlNumber: string;
  patientName: string;
  patientMemberId: string;
  payerId: string;
  payerName: string;
  providerId: string;
  providerName: string;
  dateOfService: string;
  totalCharged: number;
  totalPaid: number;
  adjustments: Array<{
    groupCode: AdjustmentGroupCode;
    reasonCode: string;
    amount: number;
  }>;
  remarkCodes: string[];
  serviceLines: Array<{
    procedureCode: string;
    modifiers: string[];
    chargedAmount: number;
    paidAmount: number;
    deniedAmount: number;
    adjustmentReasonCodes: string[];
  }>;
}

/** Result of processing a denial through the workflow engine */
export interface DenialWorkflowResult {
  claimControlNumber: string;
  category: DenialWorkflowCategory;
  urgency: DenialUrgency;
  totalDeniedAmount: number;
  suggestedActions: CorrectiveActionPlan[];
  appealTemplate: AppealLetterData | null;
  timelyFilingDeadline: string | null;
  isABARelated: boolean;
  summary: string;
}

/** Appeal letter template data */
export interface AppealLetterData {
  category: DenialWorkflowCategory;
  subject: string;
  salutation: string;
  openingParagraph: string;
  bodyParagraphs: string[];
  supportingDocumentation: string[];
  closingParagraph: string;
  templateKey: string;
}

// ============================================================================
// Common Denial Code Map — ABA Behavioral Health Focus
// ============================================================================

/**
 * Maps CARC codes to their descriptions, categories, and corrective actions.
 * Focused on the codes most frequently seen in ABA claim denials.
 */
const DENIAL_CODE_MAP: Record<string, {
  description: string;
  groupCodes: AdjustmentGroupCode[];
  category: DenialWorkflowCategory;
  urgency: DenialUrgency;
  recoveryLikelihood: 'high' | 'medium' | 'low' | 'unlikely';
  actions: CorrectiveActionType[];
  notes: string;
}> = {
  '4': {
    description: 'The procedure code is inconsistent with the modifier used or a required modifier is missing.',
    groupCodes: ['CO'],
    category: 'coding',
    urgency: 'high',
    recoveryLikelihood: 'high',
    actions: ['recode-claim', 'resubmit-corrected'],
    notes: 'Common for ABA: Check HN/HO/HP modifier matches provider credential. Ensure GT modifier for telehealth with POS 02.',
  },
  '16': {
    description: 'Claim/service lacks information or has submission/billing error(s).',
    groupCodes: ['CO', 'OA'],
    category: 'missing-info',
    urgency: 'high',
    recoveryLikelihood: 'high',
    actions: ['provide-documentation', 'resubmit-corrected'],
    notes: 'Often triggered by missing rendering provider NPI, taxonomy code, or referring provider info.',
  },
  '18': {
    description: 'Exact duplicate claim/service.',
    groupCodes: ['CO'],
    category: 'duplicate',
    urgency: 'low',
    recoveryLikelihood: 'unlikely',
    actions: ['contact-payer'],
    notes: 'Verify if original claim was paid. If legitimately separate services, appeal with documentation of distinct sessions.',
  },
  '29': {
    description: 'The time limit for filing has expired.',
    groupCodes: ['CO'],
    category: 'timely-filing',
    urgency: 'critical',
    recoveryLikelihood: 'low',
    actions: ['timely-filing-appeal', 'appeal-administrative'],
    notes: 'Appeal only if you can prove timely filing (submission receipt, clearinghouse confirmation, or evidence of prior submission).',
  },
  '45': {
    description: 'Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.',
    groupCodes: ['CO', 'PI'],
    category: 'contractual',
    urgency: 'low',
    recoveryLikelihood: 'unlikely',
    actions: ['write-off'],
    notes: 'Standard contractual adjustment. Not a true denial — the difference between billed and allowed amounts.',
  },
  '50': {
    description: 'These are non-covered services because this is not deemed a medical necessity by the payer.',
    groupCodes: ['CO', 'PI'],
    category: 'medical-necessity',
    urgency: 'critical',
    recoveryLikelihood: 'medium',
    actions: ['appeal-clinical', 'provide-documentation'],
    notes: 'For ABA: Attach treatment plan, BCBA assessment, progress notes showing medical necessity. Include F84.x diagnosis documentation.',
  },
  '96': {
    description: 'Non-covered charge(s). At least one Remark Code must be provided.',
    groupCodes: ['CO'],
    category: 'coding',
    urgency: 'high',
    recoveryLikelihood: 'medium',
    actions: ['recode-claim', 'appeal-administrative', 'contact-payer'],
    notes: 'Check RARC for specifics. For ABA: verify CPT 97151-97158 are covered under the member\'s plan. Some payers use non-standard ABA codes.',
  },
  '97': {
    description: 'The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.',
    groupCodes: ['CO'],
    category: 'bundling',
    urgency: 'high',
    recoveryLikelihood: 'medium',
    actions: ['recode-claim', 'appeal-administrative'],
    notes: 'ABA bundling issue: supervision (97155/97156) billed same day as direct (97153). Add modifier 59 or XE for distinct services.',
  },
  '109': {
    description: 'Claim/service not covered by this payer/contractor. You must send the claim/service to the correct payer/contractor.',
    groupCodes: ['OA'],
    category: 'eligibility',
    urgency: 'high',
    recoveryLikelihood: 'high',
    actions: ['verify-eligibility', 'resubmit-corrected'],
    notes: 'Check if patient has secondary/tertiary coverage. Verify coordination of benefits. Re-verify eligibility for DOS.',
  },
  '197': {
    description: 'Precertification/authorization/notification absent.',
    groupCodes: ['CO'],
    category: 'authorization',
    urgency: 'critical',
    recoveryLikelihood: 'medium',
    actions: ['obtain-authorization', 'appeal-administrative', 'provide-documentation'],
    notes: 'ABA services almost always require prior authorization. Check if auth was obtained, if DOS falls within auth dates, and if units don\'t exceed authorized amount.',
  },
  '198': {
    description: 'Precertification/authorization/notification absent. Number/date exceeded.',
    groupCodes: ['CO'],
    category: 'authorization',
    urgency: 'critical',
    recoveryLikelihood: 'medium',
    actions: ['obtain-authorization', 'appeal-administrative'],
    notes: 'Units or date range exceeded the authorization. Request retro-auth if available. Attach updated treatment plan showing continued need.',
  },
  '204': {
    description: 'This service/equipment/drug is not covered under the patient\'s current benefit plan.',
    groupCodes: ['CO', 'PI'],
    category: 'eligibility',
    urgency: 'high',
    recoveryLikelihood: 'low',
    actions: ['verify-eligibility', 'appeal-clinical', 'patient-billing'],
    notes: 'Check if ABA is an excluded benefit under this plan. Some employer plans explicitly exclude ABA. State mandate may override for individual/small group plans.',
  },
  '252': {
    description: 'An attachment/other documentation is required to adjudicate this claim/service.',
    groupCodes: ['CO', 'OA'],
    category: 'missing-info',
    urgency: 'high',
    recoveryLikelihood: 'high',
    actions: ['provide-documentation', 'resubmit-corrected'],
    notes: 'Attach requested documentation and resubmit. Common for ABA: treatment plan, BCBA assessment, progress reports, session notes.',
  },
};

// PR (Patient Responsibility) group codes
const PR_CODE_MAP: Record<string, {
  description: string;
  category: DenialWorkflowCategory;
  urgency: DenialUrgency;
  actions: CorrectiveActionType[];
  notes: string;
}> = {
  '1': {
    description: 'Deductible Amount',
    category: 'patient-responsibility',
    urgency: 'medium',
    actions: ['patient-billing'],
    notes: 'Patient owes deductible. Bill patient for this amount. Verify deductible amount matches 271 eligibility response.',
  },
  '2': {
    description: 'Coinsurance Amount',
    category: 'patient-responsibility',
    urgency: 'medium',
    actions: ['patient-billing'],
    notes: 'Patient owes coinsurance. Bill patient for this amount.',
  },
  '3': {
    description: 'Co-payment Amount',
    category: 'patient-responsibility',
    urgency: 'medium',
    actions: ['patient-billing'],
    notes: 'Patient owes copay. Bill patient for this amount. Verify copay matches contract/271 response.',
  },
};

// ============================================================================
// Denial Processing Engine
// ============================================================================

/**
 * Categorizes a denial based on CARC reason code and group code.
 */
export function categorizeDenial(
  groupCode: AdjustmentGroupCode,
  reasonCode: string,
): { category: DenialWorkflowCategory; urgency: DenialUrgency } {
  // Check PR-specific codes first
  if (groupCode === 'PR' && PR_CODE_MAP[reasonCode]) {
    return {
      category: PR_CODE_MAP[reasonCode].category,
      urgency: PR_CODE_MAP[reasonCode].urgency,
    };
  }

  // Check main denial code map
  if (DENIAL_CODE_MAP[reasonCode]) {
    return {
      category: DENIAL_CODE_MAP[reasonCode].category,
      urgency: DENIAL_CODE_MAP[reasonCode].urgency,
    };
  }

  // Fallback categorization by code ranges
  const codeNum = parseInt(reasonCode, 10);
  if (isNaN(codeNum)) {
    return { category: 'other', urgency: 'medium' };
  }

  if (codeNum >= 1 && codeNum <= 3) return { category: 'eligibility', urgency: 'high' };
  if (codeNum >= 4 && codeNum <= 6) return { category: 'coding', urgency: 'high' };
  if (codeNum >= 7 && codeNum <= 15) return { category: 'missing-info', urgency: 'high' };
  if (codeNum === 16) return { category: 'missing-info', urgency: 'high' };
  if (codeNum === 17) return { category: 'duplicate', urgency: 'low' };
  if (codeNum === 18) return { category: 'duplicate', urgency: 'low' };
  if (codeNum >= 19 && codeNum <= 28) return { category: 'coding', urgency: 'medium' };
  if (codeNum === 29) return { category: 'timely-filing', urgency: 'critical' };
  if (codeNum >= 30 && codeNum <= 44) return { category: 'contractual', urgency: 'low' };
  if (codeNum >= 45 && codeNum <= 49) return { category: 'contractual', urgency: 'low' };
  if (codeNum >= 50 && codeNum <= 95) return { category: 'medical-necessity', urgency: 'high' };
  if (codeNum >= 96 && codeNum <= 120) return { category: 'coding', urgency: 'medium' };
  if (codeNum >= 130 && codeNum <= 159) return { category: 'authorization', urgency: 'high' };
  if (codeNum >= 170 && codeNum <= 199) return { category: 'authorization', urgency: 'high' };
  if (codeNum >= 200 && codeNum <= 250) return { category: 'eligibility', urgency: 'high' };

  return { category: 'other', urgency: 'medium' };
}

/**
 * Builds a corrective action plan for a specific denial code.
 */
export function buildCorrectiveActionPlan(
  groupCode: AdjustmentGroupCode,
  reasonCode: string,
  payerId?: string,
): CorrectiveActionPlan {
  // PR codes
  if (groupCode === 'PR' && PR_CODE_MAP[reasonCode]) {
    const prInfo = PR_CODE_MAP[reasonCode];
    return {
      denialCode: reasonCode,
      groupCode,
      category: prInfo.category,
      urgency: prInfo.urgency,
      estimatedRecoveryLikelihood: 'unlikely', // PR is patient responsibility, not recoverable from payer
      steps: prInfo.actions.map((actionType, index) => ({
        step: index + 1,
        actionType,
        description: getActionDescription(actionType),
        details: prInfo.notes,
        estimatedTimeMinutes: getActionTimeEstimate(actionType),
        automatable: isActionAutomatable(actionType),
      })),
      deadlineDays: 30,
      notes: prInfo.notes,
    };
  }

  // Known denial codes
  if (DENIAL_CODE_MAP[reasonCode]) {
    const info = DENIAL_CODE_MAP[reasonCode];
    const payerConfig = payerId ? getPayerConfig(payerId) : undefined;
    const appealDeadline = payerConfig?.appealTimelineDays ?? 60;

    return {
      denialCode: reasonCode,
      groupCode,
      category: info.category,
      urgency: info.urgency,
      estimatedRecoveryLikelihood: info.recoveryLikelihood,
      steps: info.actions.map((actionType, index) => ({
        step: index + 1,
        actionType,
        description: getActionDescription(actionType),
        details: getActionDetails(actionType, reasonCode, info.category),
        estimatedTimeMinutes: getActionTimeEstimate(actionType),
        automatable: isActionAutomatable(actionType),
      })),
      deadlineDays: appealDeadline,
      appealTemplate: info.recoveryLikelihood !== 'unlikely' ? info.category : undefined,
      notes: info.notes,
    };
  }

  // Unknown code fallback
  const { category, urgency } = categorizeDenial(groupCode, reasonCode);
  return {
    denialCode: reasonCode,
    groupCode,
    category,
    urgency,
    estimatedRecoveryLikelihood: 'medium',
    steps: [{
      step: 1,
      actionType: 'contact-payer',
      description: 'Contact payer for clarification on denial reason',
      details: `Reason code ${reasonCode} requires manual review. Contact payer representative for specific denial details.`,
      estimatedTimeMinutes: 30,
      automatable: false,
    }],
    deadlineDays: 60,
    notes: `Unknown denial code ${reasonCode}. Manual review recommended.`,
  };
}

/**
 * Processes a full denial from ERA data, returning a comprehensive workflow result.
 *
 * This is the main entry point — call this with parsed ERA denial data to get
 * categorization, corrective actions, and appeal templates.
 */
export function processDenial(eraData: ERADenialData): DenialWorkflowResult {
  const deniedAmount = eraData.totalCharged - eraData.totalPaid;

  // Determine if ABA-related by checking service line CPT codes
  const abaCPTCodes = ['97151', '97152', '97153', '97154', '97155', '97156', '97157', '97158', '0373T', '0362T'];
  const isABARelated = eraData.serviceLines.some(
    (line) => abaCPTCodes.includes(line.procedureCode)
  );

  // Build corrective action plans for each adjustment
  const suggestedActions: CorrectiveActionPlan[] = [];
  let primaryCategory: DenialWorkflowCategory = 'other';
  let primaryUrgency: DenialUrgency = 'medium';
  let highestUrgencyScore = 0;

  const urgencyScores: Record<DenialUrgency, number> = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1,
  };

  for (const adj of eraData.adjustments) {
    // Skip zero-amount adjustments (informational)
    if (adj.amount === 0) continue;

    const plan = buildCorrectiveActionPlan(
      adj.groupCode,
      adj.reasonCode,
      eraData.payerId,
    );

    suggestedActions.push(plan);

    // Track the highest-urgency category as primary
    const score = urgencyScores[plan.urgency];
    if (score > highestUrgencyScore) {
      highestUrgencyScore = score;
      primaryCategory = plan.category;
      primaryUrgency = plan.urgency;
    }
  }

  // Generate appeal letter if applicable
  const appealableActions = suggestedActions.filter(
    (a) => a.estimatedRecoveryLikelihood !== 'unlikely' && a.appealTemplate
  );
  const appealTemplate = appealableActions.length > 0
    ? generateAppealLetter(primaryCategory, eraData, isABARelated)
    : null;

  // Calculate timely filing deadline
  const payerConfig = getPayerConfig(eraData.payerId);
  const timelyFilingDeadline = payerConfig
    ? calculateDeadline(eraData.dateOfService, payerConfig.timelyFilingDays)
    : null;

  // Build summary
  const summary = buildDenialSummary(
    eraData,
    primaryCategory,
    primaryUrgency,
    deniedAmount,
    suggestedActions,
    isABARelated,
  );

  return {
    claimControlNumber: eraData.claimControlNumber,
    category: primaryCategory,
    urgency: primaryUrgency,
    totalDeniedAmount: deniedAmount,
    suggestedActions,
    appealTemplate,
    timelyFilingDeadline,
    isABARelated,
    summary,
  };
}

/**
 * Batch-processes multiple denials from an ERA 835 payment.
 */
export function processDenialBatch(
  denials: ERADenialData[],
): DenialWorkflowResult[] {
  return denials.map((denial) => processDenial(denial));
}

// ============================================================================
// Appeal Letter Templates
// ============================================================================

/**
 * Generates a structured appeal letter based on denial category and claim data.
 */
export function generateAppealLetter(
  category: DenialWorkflowCategory,
  eraData: ERADenialData,
  isABARelated: boolean,
): AppealLetterData {
  const templates = getAppealTemplates();
  const template = templates[category] ?? templates['other'];

  // Replace placeholders in template
  const replacements: Record<string, string> = {
    '{{patientName}}': eraData.patientName,
    '{{memberId}}': eraData.patientMemberId,
    '{{payerName}}': eraData.payerName,
    '{{claimNumber}}': eraData.claimControlNumber,
    '{{dateOfService}}': eraData.dateOfService,
    '{{providerName}}': eraData.providerName,
    '{{providerId}}': eraData.providerId,
    '{{deniedAmount}}': `$${(eraData.totalCharged - eraData.totalPaid).toFixed(2)}`,
    '{{totalCharged}}': `$${eraData.totalCharged.toFixed(2)}`,
    '{{serviceType}}': isABARelated ? 'Applied Behavior Analysis (ABA) therapy' : 'behavioral health',
    '{{cptCodes}}': eraData.serviceLines.map((l) => l.procedureCode).join(', '),
  };

  function applyReplacements(text: string): string {
    let result = text;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.split(placeholder).join(value);
    }
    return result;
  }

  return {
    category,
    subject: applyReplacements(template.subject),
    salutation: template.salutation,
    openingParagraph: applyReplacements(template.openingParagraph),
    bodyParagraphs: template.bodyParagraphs.map(applyReplacements),
    supportingDocumentation: template.supportingDocumentation,
    closingParagraph: applyReplacements(template.closingParagraph),
    templateKey: `appeal-${category}`,
  };
}

interface AppealTemplate {
  subject: string;
  salutation: string;
  openingParagraph: string;
  bodyParagraphs: string[];
  supportingDocumentation: string[];
  closingParagraph: string;
}

function getAppealTemplates(): Record<string, AppealTemplate> {
  return {
    'eligibility': {
      subject: 'Appeal: Eligibility Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Review Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied for eligibility reasons; however, we believe the member was eligible for covered services on the date of service.',
      bodyParagraphs: [
        'Our records confirm that eligibility was verified prior to the date of service, and the member\'s coverage was active at the time services were rendered. We have attached the eligibility verification confirmation obtained on or before the date of service.',
        'The {{serviceType}} services provided (CPT codes: {{cptCodes}}) are covered benefits under the member\'s plan. The rendering provider ({{providerName}}, NPI: {{providerId}}) is an in-network participating provider.',
        'We request that this claim be reprocessed with the correct eligibility information. The total denied amount of {{deniedAmount}} should be reconsidered for payment.',
      ],
      supportingDocumentation: [
        'Eligibility verification confirmation (dated prior to service)',
        'Copy of member\'s insurance card (front and back)',
        'Provider participation/network confirmation',
        'Original claim submission confirmation',
      ],
      closingParagraph: 'Please reprocess this claim at your earliest convenience. If additional information is needed, please contact our office at the number listed above. We appreciate your prompt attention to this matter.',
    },

    'authorization': {
      subject: 'Appeal: Authorization Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Utilization Review Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied for lack of prior authorization.',
      bodyParagraphs: [
        'Authorization was obtained for these services prior to the date of service. The authorization reference number and approved service dates/units are documented in the attached authorization approval letter.',
        'The services rendered (CPT codes: {{cptCodes}}) fall within the scope of the authorized treatment plan. The rendering provider ({{providerName}}, NPI: {{providerId}}) is the authorized treating provider.',
        'If the authorization number was not included on the original claim or was entered incorrectly, we are providing the correct authorization information with this appeal for reprocessing.',
      ],
      supportingDocumentation: [
        'Prior authorization approval letter with reference number',
        'Treatment plan approved by the authorizing entity',
        'BCBA assessment/evaluation report',
        'Progress notes for the date of service',
        'Original claim submission with corrected authorization number',
      ],
      closingParagraph: 'We respectfully request that this claim be reprocessed with the attached authorization documentation. The total denied amount of {{deniedAmount}} should be reconsidered for payment based on the valid authorization.',
    },

    'coding': {
      subject: 'Appeal: Coding Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Review Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied due to a coding-related issue.',
      bodyParagraphs: [
        'We have reviewed the original claim and are resubmitting with corrected coding. The services rendered (CPT codes: {{cptCodes}}) accurately reflect the {{serviceType}} services provided on the date of service.',
        'The procedure codes used are consistent with the Current Procedural Terminology guidelines for {{serviceType}} services and are appropriate for the diagnosis (F84.x — Autism Spectrum Disorder) and the level of service provided.',
        'The modifiers applied reflect the rendering provider\'s credential level and the service delivery method as required by your payer-specific guidelines.',
      ],
      supportingDocumentation: [
        'Corrected CMS-1500 claim form',
        'Provider credential documentation (BCBA/RBT certification)',
        'Session notes documenting services rendered',
        'Treatment plan with goals addressed during session',
      ],
      closingParagraph: 'Please reprocess this corrected claim for the denied amount of {{deniedAmount}}. We have ensured all coding is consistent with CPT guidelines and your payer-specific requirements.',
    },

    'timely-filing': {
      subject: 'Appeal: Timely Filing Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Appeals Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied for exceeding the timely filing limit.',
      bodyParagraphs: [
        'We respectfully disagree with this determination. Our records indicate that the original claim was submitted within the contractual timely filing limit. We have attached proof of timely submission, including the clearinghouse receipt and/or electronic submission confirmation.',
        'If the original submission was not received by your organization, this was due to circumstances beyond our control (clearinghouse transmission issue, system outage, or claim routing error). We are requesting consideration under your timely filing exception policy.',
        'The denied amount of {{deniedAmount}} for services rendered on {{dateOfService}} represents legitimate {{serviceType}} services that were properly documented and medically necessary.',
      ],
      supportingDocumentation: [
        'Original claim submission receipt/confirmation (clearinghouse or electronic)',
        'Clearinghouse transmission report showing original submission date',
        'Any prior correspondence regarding this claim',
        'Evidence of extenuating circumstances (if applicable)',
      ],
      closingParagraph: 'We request that this timely filing denial be overturned based on the enclosed proof of timely submission. Please reprocess the claim for the denied amount of {{deniedAmount}}.',
    },

    'medical-necessity': {
      subject: 'Appeal: Medical Necessity Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Medical Review Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied as not medically necessary.',
      bodyParagraphs: [
        'The {{serviceType}} services provided are medically necessary for the treatment of the member\'s diagnosed condition (Autism Spectrum Disorder, F84.x). The attached BCBA assessment and treatment plan document the clinical necessity of these services.',
        'Research consistently demonstrates that ABA therapy is the evidence-based standard of care for Autism Spectrum Disorder. The American Academy of Pediatrics, the U.S. Surgeon General, and the National Institute of Mental Health all recognize ABA as an effective, medically necessary treatment.',
        'The member has shown measurable progress toward treatment goals as documented in the attached progress reports. Discontinuation of services would likely result in regression of skills and increased maladaptive behaviors.',
        'Additionally, many states (including Arizona under ARS 20-826.04) mandate coverage of ABA therapy as a medically necessary treatment for autism spectrum disorder.',
      ],
      supportingDocumentation: [
        'BCBA comprehensive assessment/evaluation',
        'Individualized treatment plan with measurable goals',
        'Progress reports demonstrating treatment effectiveness',
        'Session notes for the denied date(s) of service',
        'Peer-reviewed research supporting ABA for ASD (if requested)',
        'State mandate documentation (if applicable)',
      ],
      closingParagraph: 'We respectfully request a peer-to-peer review of this denial. The {{serviceType}} services provided are medically necessary and consistent with evidence-based standards of care. We request reprocessing of the denied amount of {{deniedAmount}}.',
    },

    'bundling': {
      subject: 'Appeal: Bundling Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Review Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied due to bundling/inclusive service determination.',
      bodyParagraphs: [
        'The services billed (CPT codes: {{cptCodes}}) represent distinct and separately identifiable services that were provided during different time periods on the date of service. These services are not properly bundled under CPT guidelines.',
        'ABA therapy commonly involves both direct therapy (97153) and supervision (97155/97156) on the same date of service. These are distinct services provided by different providers (RBT and BCBA respectively) and are separately billable per CPT guidelines and AMA coding guidance.',
        'We have attached session documentation showing the distinct start/end times, provider signatures, and separate clinical activities for each billed service.',
      ],
      supportingDocumentation: [
        'Session notes with distinct start and end times for each service',
        'Provider signatures for each distinct service',
        'Documentation of different providers for each service line',
        'CPT guidelines supporting separate billing of these services',
      ],
      closingParagraph: 'Please reprocess this claim recognizing the distinct nature of the services provided. The denied amount of {{deniedAmount}} represents separately billable services that meet CPT unbundling criteria.',
    },

    'missing-info': {
      subject: 'Resubmission with Additional Information — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Processing Department,',
      openingParagraph: 'I am resubmitting claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}} with the requested additional information.',
      bodyParagraphs: [
        'The original claim was returned/denied for missing or incomplete information. We have addressed all noted deficiencies and are resubmitting with the complete information as detailed below.',
        'All required fields have been verified and corrected. The rendering provider information ({{providerName}}, NPI: {{providerId}}), diagnosis codes, procedure codes, and modifier usage have been confirmed as accurate.',
      ],
      supportingDocumentation: [
        'Corrected CMS-1500 claim form with all required fields completed',
        'Provider enrollment/credentialing confirmation',
        'Any specifically requested documentation noted in the denial',
      ],
      closingParagraph: 'Please process this corrected claim for the denied amount of {{deniedAmount}}. All previously missing information has been provided. Please contact our office if any additional information is needed.',
    },

    'coordination-of-benefits': {
      subject: 'Appeal: Coordination of Benefits — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Review Department,',
      openingParagraph: 'I am writing regarding claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied due to coordination of benefits issues.',
      bodyParagraphs: [
        'We have verified the member\'s primary and secondary coverage and are providing the correct coordination of benefits information with this appeal.',
        'The attached Explanation of Benefits (EOB) from the primary payer confirms their adjudication of this claim. We are requesting secondary payment based on the primary payer\'s determination.',
      ],
      supportingDocumentation: [
        'Primary payer Explanation of Benefits (EOB)',
        'Updated coordination of benefits information',
        'Member\'s insurance card(s) for all coverages',
      ],
      closingParagraph: 'Please reprocess this claim with the correct coordination of benefits information. The balance of {{deniedAmount}} should be considered for secondary payment.',
    },

    'provider-credential': {
      subject: 'Appeal: Provider Credential Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Provider Relations Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}. The claim was denied due to provider credentialing issues.',
      bodyParagraphs: [
        'The rendering provider ({{providerName}}, NPI: {{providerId}}) is properly credentialed and enrolled with your organization. We have attached current credentialing documentation confirming active participation status.',
        'If the denial is related to the provider\'s credential level (BCBA vs. RBT), we have verified that the correct modifier (HO for BCBA, HN for RBT) was applied and matches the rendering provider\'s actual credential.',
      ],
      supportingDocumentation: [
        'Provider enrollment/participation confirmation',
        'Current BCBA/RBT certification',
        'State license (if applicable)',
        'Credentialing effective date documentation',
      ],
      closingParagraph: 'Please verify the provider\'s credentialing status and reprocess this claim for the denied amount of {{deniedAmount}}.',
    },

    'other': {
      subject: 'Appeal: Claim Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Appeals Department,',
      openingParagraph: 'I am writing to appeal the denial of claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}.',
      bodyParagraphs: [
        'The services rendered (CPT codes: {{cptCodes}}) were medically necessary and properly documented. We believe this denial was issued in error and request a thorough review of the claim.',
        'We have attached supporting documentation to assist with your review of this appeal.',
      ],
      supportingDocumentation: [
        'Copy of original claim',
        'Session/progress notes for date of service',
        'Treatment plan',
        'Any additional relevant clinical documentation',
      ],
      closingParagraph: 'We respectfully request that this claim be reprocessed for the denied amount of {{deniedAmount}}. Please contact our office if additional information is needed to complete this review.',
    },

    'contractual': {
      subject: 'Inquiry: Contractual Adjustment — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Provider Relations Department,',
      openingParagraph: 'I am writing to inquire about the contractual adjustment on claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}.',
      bodyParagraphs: [
        'The adjustment amount appears to exceed the expected contractual allowance per our participation agreement. We request a detailed explanation of the fee schedule applied to this claim.',
        'If the adjustment is correct per the current contract, no further action is needed. However, if there is a discrepancy, we request reprocessing at the correct contracted rate.',
      ],
      supportingDocumentation: [
        'Copy of current participation agreement/fee schedule',
        'Rate comparison documentation',
      ],
      closingParagraph: 'Please review the contractual adjustment of {{deniedAmount}} and confirm it aligns with our current agreement. We appreciate your assistance in resolving this matter.',
    },

    'patient-responsibility': {
      subject: 'Patient Statement — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'N/A',
      openingParagraph: 'Patient balance of {{deniedAmount}} identified from claim {{claimNumber}} for services on {{dateOfService}}.',
      bodyParagraphs: [
        'The payer has processed this claim and determined that {{deniedAmount}} is the patient responsibility (deductible, copay, or coinsurance).',
        'Generate a patient statement and apply the balance to the patient\'s account.',
      ],
      supportingDocumentation: [
        'ERA/EOB showing patient responsibility determination',
        'Patient payment history',
      ],
      closingParagraph: 'Bill patient for the determined responsibility amount. Follow standard patient billing workflow.',
    },

    'duplicate': {
      subject: 'Inquiry: Duplicate Claim Denial — Claim {{claimNumber}} for {{patientName}}',
      salutation: 'Dear Claims Processing Department,',
      openingParagraph: 'I am writing regarding the duplicate claim denial for claim {{claimNumber}} for {{serviceType}} services provided to {{patientName}} (Member ID: {{memberId}}) on {{dateOfService}}.',
      bodyParagraphs: [
        'We have reviewed our records and confirmed that this claim represents a unique service that was not previously billed. If a prior submission exists, it may have been submitted in error and should be voided in favor of this corrected submission.',
        'If the services were provided during the same date but at different times (e.g., AM and PM sessions), these represent distinct and separately billable encounters.',
      ],
      supportingDocumentation: [
        'Session notes with distinct start and end times',
        'Documentation showing unique nature of services',
        'Prior claim/submission history for comparison',
      ],
      closingParagraph: 'Please review and reprocess this claim for the denied amount of {{deniedAmount}}. We have confirmed these are unique, non-duplicate services.',
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActionDescription(actionType: CorrectiveActionType): string {
  const descriptions: Record<CorrectiveActionType, string> = {
    'resubmit-corrected': 'Correct and resubmit the claim with updated information',
    'appeal-clinical': 'Submit a clinical appeal with medical necessity documentation',
    'appeal-administrative': 'Submit an administrative appeal for procedural/processing issues',
    'provide-documentation': 'Submit requested supporting documentation',
    'verify-eligibility': 'Re-verify patient eligibility for the date of service',
    'obtain-authorization': 'Obtain or verify prior authorization for services',
    'recode-claim': 'Review and correct procedure/diagnosis codes and modifiers',
    'contact-payer': 'Contact payer representative for clarification',
    'write-off': 'Write off the adjustment as contractual or non-recoverable',
    'patient-billing': 'Bill the patient for their financial responsibility',
    'credential-update': 'Update or verify provider credentialing with payer',
    'timely-filing-appeal': 'Appeal timely filing denial with proof of original submission',
  };
  return descriptions[actionType];
}

function getActionDetails(
  actionType: CorrectiveActionType,
  reasonCode: string,
  category: DenialWorkflowCategory,
): string {
  const codeInfo = DENIAL_CODE_MAP[reasonCode];
  if (codeInfo) {
    return codeInfo.notes;
  }

  const categoryDetails: Record<DenialWorkflowCategory, string> = {
    'eligibility': 'Verify member eligibility for DOS. Check for coverage changes, terminations, or COB issues.',
    'authorization': 'Verify prior authorization was obtained and matches DOS, CPT codes, and units billed.',
    'coding': 'Review CPT codes, modifiers, diagnosis codes, and POS for accuracy per payer guidelines.',
    'timely-filing': 'Gather proof of original timely submission. Check clearinghouse logs and submission receipts.',
    'duplicate': 'Compare with previously paid claims. Document distinct services if legitimately separate.',
    'medical-necessity': 'Prepare clinical documentation: assessment, treatment plan, progress notes, medical necessity letter.',
    'bundling': 'Document distinct services with separate times, providers, and clinical activities.',
    'coordination-of-benefits': 'Verify primary/secondary payer order. Obtain primary EOB for secondary claim submission.',
    'missing-info': 'Identify missing fields and complete claim form. Attach any required documentation.',
    'contractual': 'Review contract terms and fee schedule. Write off if correct per agreement.',
    'patient-responsibility': 'Generate patient statement for deductible, copay, or coinsurance amount.',
    'provider-credential': 'Verify provider enrollment, credentialing, and correct modifier usage.',
    'other': `Review denial for reason code ${reasonCode}. Contact payer if clarification is needed.`,
  };

  return categoryDetails[category];
}

function getActionTimeEstimate(actionType: CorrectiveActionType): number {
  const estimates: Record<CorrectiveActionType, number> = {
    'resubmit-corrected': 15,
    'appeal-clinical': 60,
    'appeal-administrative': 30,
    'provide-documentation': 20,
    'verify-eligibility': 10,
    'obtain-authorization': 45,
    'recode-claim': 15,
    'contact-payer': 30,
    'write-off': 5,
    'patient-billing': 10,
    'credential-update': 30,
    'timely-filing-appeal': 30,
  };
  return estimates[actionType];
}

function isActionAutomatable(actionType: CorrectiveActionType): boolean {
  const automatable: Set<CorrectiveActionType> = new Set([
    'resubmit-corrected',
    'verify-eligibility',
    'patient-billing',
    'write-off',
  ]);
  return automatable.has(actionType);
}

function calculateDeadline(dateOfService: string, daysLimit: number): string {
  const dos = new Date(dateOfService);
  if (isNaN(dos.getTime())) return '';
  dos.setDate(dos.getDate() + daysLimit);
  return dos.toISOString().split('T')[0];
}

function buildDenialSummary(
  eraData: ERADenialData,
  category: DenialWorkflowCategory,
  urgency: DenialUrgency,
  deniedAmount: number,
  suggestedActions: CorrectiveActionPlan[],
  isABARelated: boolean,
): string {
  const actionCount = suggestedActions.length;
  const appealable = suggestedActions.filter(
    (a) => a.estimatedRecoveryLikelihood !== 'unlikely'
  ).length;

  const categoryLabels: Record<DenialWorkflowCategory, string> = {
    'eligibility': 'Eligibility',
    'authorization': 'Prior Authorization',
    'coding': 'Coding/Modifier',
    'timely-filing': 'Timely Filing',
    'duplicate': 'Duplicate Claim',
    'medical-necessity': 'Medical Necessity',
    'bundling': 'Bundling/Inclusive',
    'coordination-of-benefits': 'Coordination of Benefits',
    'missing-info': 'Missing Information',
    'contractual': 'Contractual Adjustment',
    'patient-responsibility': 'Patient Responsibility',
    'provider-credential': 'Provider Credential',
    'other': 'Other',
  };

  const parts: string[] = [
    `${urgency.toUpperCase()} — ${categoryLabels[category]} denial`,
    `for claim ${eraData.claimControlNumber}.`,
    `Denied amount: $${deniedAmount.toFixed(2)}.`,
  ];

  if (isABARelated) {
    parts.push('ABA therapy services.');
  }

  parts.push(`${actionCount} corrective action(s) identified.`);

  if (appealable > 0) {
    parts.push(`${appealable} action(s) are appealable with documentation.`);
  }

  return parts.join(' ');
}
