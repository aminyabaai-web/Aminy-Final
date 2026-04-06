// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

// elite-insured-lane.ts — Deep AZ Medicaid (AHCCCS) + BCBS AZ insurance support
// Real AZ-specific plan types, covered services, auth requirements, billing codes,
// EVV requirements, denial guidance, and validation functions.

// ─── Types ───────────────────────────────────────────────────────────

export interface AHCCCSPlan {
  planId: string;
  planName: string;
  planType: AHCCCSPlanType;
  managedCareOrg: string;
  coveredServices: CoveredService[];
  evvRequired: boolean;
  priorAuthRequired: boolean;
  notes: string;
}

export type AHCCCSPlanType =
  | 'ALTCS-DD'    // Arizona Long Term Care System - Developmentally Disabled
  | 'ALTCS-EPD'   // ALTCS - Elderly/Physical Disability
  | 'CMDP'        // Comprehensive Medical and Dental Program (foster care)
  | 'DES-DDD'     // Dept of Economic Security - Division of Developmental Disabilities
  | 'RBHA'        // Regional Behavioral Health Authority
  | 'KidsCare'    // CHIP program
  | 'Acute';      // Standard AHCCCS acute care

export interface BCBSAZPlan {
  planId: string;
  planName: string;
  planType: BCBSPlanType;
  abaMandate: boolean;
  abaMandateDetails: string;
  preAuthProcess: PreAuthProcess;
  coveredServices: CoveredService[];
  notes: string;
}

export type BCBSPlanType =
  | 'PPO'
  | 'HMO'
  | 'EPO'
  | 'HDHP'
  | 'FEP'        // Federal Employee Program
  | 'Medicare-Advantage';

export interface CoveredService {
  serviceType: string;
  billingCodes: BillingCode[];
  authRequired: boolean;
  authUnits?: string;
  maxUnitsPerWeek?: number;
  maxUnitsPerYear?: number;
  ageLimit?: { min: number; max: number };
  evvRequired: boolean;
  notes?: string;
}

export interface BillingCode {
  code: string;
  description: string;
  modifier?: string;
  rateRange?: { min: number; max: number };
  unitType: 'per-15min' | 'per-hour' | 'per-session' | 'per-day' | 'per-assessment';
}

export interface PreAuthProcess {
  required: boolean;
  method: 'portal' | 'fax' | 'phone' | 'electronic';
  portalUrl?: string;
  faxNumber?: string;
  phoneNumber?: string;
  turnaroundDays: number;
  renewalPeriodMonths: number;
  documentsRequired: string[];
}

export interface DenialGuidance {
  denialCode: string;
  description: string;
  commonCauses: string[];
  correctionSteps: string[];
  appealDeadlineDays: number;
  appealMethod: string;
  successLikelihood: 'high' | 'medium' | 'low';
  azSpecificNotes?: string;
}

export interface ClaimValidation {
  valid: boolean;
  errors: ClaimError[];
  warnings: ClaimWarning[];
}

export interface ClaimError {
  field: string;
  message: string;
  code: string;
}

export interface ClaimWarning {
  field: string;
  message: string;
}

// ─── AHCCCS Plan Database ────────────────────────────────────────────

const ABA_BILLING_CODES: BillingCode[] = [
  { code: '97151', description: 'Behavior identification assessment', unitType: 'per-15min', rateRange: { min: 18, max: 28 } },
  { code: '97152', description: 'Behavior identification-supporting assessment', unitType: 'per-15min', rateRange: { min: 14, max: 22 } },
  { code: '97153', description: 'Adaptive behavior treatment by protocol (RBT)', unitType: 'per-15min', rateRange: { min: 12, max: 19 } },
  { code: '97154', description: 'Group adaptive behavior treatment by protocol', unitType: 'per-15min', rateRange: { min: 8, max: 14 } },
  { code: '97155', description: 'Adaptive behavior treatment with protocol modification (BCBA)', unitType: 'per-15min', rateRange: { min: 22, max: 38 } },
  { code: '97156', description: 'Family adaptive behavior treatment guidance', unitType: 'per-15min', rateRange: { min: 22, max: 38 } },
  { code: '97157', description: 'Multiple-family group adaptive behavior treatment guidance', unitType: 'per-15min', rateRange: { min: 12, max: 20 } },
  { code: '97158', description: 'Group adaptive behavior treatment with protocol modification', unitType: 'per-15min', rateRange: { min: 18, max: 30 } },
  { code: '0373T', description: 'Adaptive behavior treatment with protocol modification (assistant)', unitType: 'per-15min', rateRange: { min: 14, max: 22 } },
];

const SPEECH_BILLING_CODES: BillingCode[] = [
  { code: '92521', description: 'Evaluation of speech fluency', unitType: 'per-session', rateRange: { min: 120, max: 200 } },
  { code: '92522', description: 'Evaluation of speech sound production', unitType: 'per-session', rateRange: { min: 120, max: 200 } },
  { code: '92523', description: 'Evaluation of speech sound production with language', unitType: 'per-session', rateRange: { min: 150, max: 250 } },
  { code: '92524', description: 'Behavioral and qualitative analysis of voice', unitType: 'per-session', rateRange: { min: 120, max: 200 } },
  { code: '92507', description: 'Treatment of speech/language/voice/communication/auditory processing', unitType: 'per-15min', rateRange: { min: 18, max: 35 } },
  { code: '92508', description: 'Group treatment of speech/language/voice/communication', unitType: 'per-15min', rateRange: { min: 10, max: 20 } },
];

const OT_BILLING_CODES: BillingCode[] = [
  { code: '97165', description: 'OT evaluation, low complexity', unitType: 'per-session', rateRange: { min: 100, max: 180 } },
  { code: '97166', description: 'OT evaluation, moderate complexity', unitType: 'per-session', rateRange: { min: 130, max: 220 } },
  { code: '97167', description: 'OT evaluation, high complexity', unitType: 'per-session', rateRange: { min: 160, max: 260 } },
  { code: '97530', description: 'Therapeutic activities', unitType: 'per-15min', rateRange: { min: 15, max: 30 } },
  { code: '97533', description: 'Sensory integrative techniques', unitType: 'per-15min', rateRange: { min: 15, max: 30 } },
  { code: '97110', description: 'Therapeutic exercises', unitType: 'per-15min', rateRange: { min: 12, max: 25 } },
];

export const AHCCCS_PLANS: AHCCCSPlan[] = [
  {
    planId: 'AHCCCS-ALTCS-DD',
    planName: 'ALTCS - Developmentally Disabled',
    planType: 'ALTCS-DD',
    managedCareOrg: 'UnitedHealthcare Community Plan',
    evvRequired: true,
    priorAuthRequired: true,
    notes: 'Primary plan for individuals with developmental disabilities including autism. Covers comprehensive ABA, speech, OT. EVV mandatory for all home/community-based services.',
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        authUnits: 'Units per week authorized by BCBA treatment plan',
        maxUnitsPerWeek: 160,
        evvRequired: true,
        notes: 'Requires initial assessment (97151) before treatment authorization. BCBA must submit treatment plan with measurable goals.',
      },
      {
        serviceType: 'Speech-Language Therapy',
        billingCodes: SPEECH_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 12,
        evvRequired: true,
      },
      {
        serviceType: 'Occupational Therapy',
        billingCodes: OT_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 12,
        evvRequired: true,
      },
    ],
  },
  {
    planId: 'AHCCCS-DES-DDD',
    planName: 'DES Division of Developmental Disabilities',
    planType: 'DES-DDD',
    managedCareOrg: 'Arizona DDD',
    evvRequired: true,
    priorAuthRequired: true,
    notes: 'DDD-eligible individuals. Requires DDD eligibility determination. Covers habilitation, therapy, and day programs. EVV is mandatory under 21st Century Cures Act.',
    coveredServices: [
      {
        serviceType: 'ABA Therapy (Habilitation)',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        authUnits: 'Per Individual Service Plan (ISP)',
        maxUnitsPerWeek: 160,
        evvRequired: true,
        notes: 'Must align with DDD Individual Service Plan. Coordinator approval required.',
      },
      {
        serviceType: 'Speech-Language Therapy',
        billingCodes: SPEECH_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 8,
        evvRequired: true,
      },
      {
        serviceType: 'Occupational Therapy',
        billingCodes: OT_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 8,
        evvRequired: true,
      },
    ],
  },
  {
    planId: 'AHCCCS-CMDP',
    planName: 'Comprehensive Medical and Dental Program',
    planType: 'CMDP',
    managedCareOrg: 'Arizona DCS',
    evvRequired: true,
    priorAuthRequired: true,
    notes: 'For children in foster care. Enhanced coverage for behavioral health services. No cost-sharing for families.',
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 160,
        evvRequired: true,
        notes: 'Foster parent and case worker must consent. Additional documentation for placement changes.',
      },
      {
        serviceType: 'Speech-Language Therapy',
        billingCodes: SPEECH_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 12,
        evvRequired: true,
      },
    ],
  },
  {
    planId: 'AHCCCS-RBHA',
    planName: 'Regional Behavioral Health Authority',
    planType: 'RBHA',
    managedCareOrg: 'Mercy Care (Maricopa), Arizona Complete Health, Banner University',
    evvRequired: true,
    priorAuthRequired: true,
    notes: 'Behavioral health services through RBHA system. Covers ABA under behavioral health carve-out. Title XIX (Medicaid) funding.',
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 120,
        evvRequired: true,
        notes: 'Authorization through RBHA behavioral health plan. Must demonstrate medical necessity.',
      },
    ],
  },
  {
    planId: 'AHCCCS-KidsCare',
    planName: 'KidsCare (CHIP)',
    planType: 'KidsCare',
    managedCareOrg: 'Various MCOs',
    evvRequired: false,
    priorAuthRequired: true,
    notes: 'For children in families earning too much for Medicaid but who cannot afford private insurance. Limited behavioral health coverage.',
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES.filter(c => ['97151', '97153', '97155', '97156'].includes(c.code)),
        authRequired: true,
        maxUnitsPerWeek: 80,
        evvRequired: false,
        ageLimit: { min: 0, max: 18 },
      },
    ],
  },
  {
    planId: 'AHCCCS-Acute',
    planName: 'AHCCCS Acute Care',
    planType: 'Acute',
    managedCareOrg: 'Mercy Care, Banner University, Arizona Complete Health, UHC Community Plan, Molina',
    evvRequired: false,
    priorAuthRequired: true,
    notes: 'Standard AHCCCS Medicaid. Covers EPSDT services for children under 21, which includes ABA when medically necessary.',
    coveredServices: [
      {
        serviceType: 'ABA Therapy (EPSDT)',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 120,
        evvRequired: false,
        ageLimit: { min: 0, max: 21 },
        notes: 'EPSDT mandate requires coverage of medically necessary services for children under 21.',
      },
      {
        serviceType: 'Speech-Language Therapy (EPSDT)',
        billingCodes: SPEECH_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 8,
        evvRequired: false,
        ageLimit: { min: 0, max: 21 },
      },
      {
        serviceType: 'Occupational Therapy (EPSDT)',
        billingCodes: OT_BILLING_CODES,
        authRequired: true,
        maxUnitsPerWeek: 8,
        evvRequired: false,
        ageLimit: { min: 0, max: 21 },
      },
    ],
  },
];

// ─── BCBS AZ Plan Database ───────────────────────────────────────────

export const BCBS_AZ_PLANS: BCBSAZPlan[] = [
  {
    planId: 'BCBS-AZ-PPO',
    planName: 'BCBS Arizona PPO',
    planType: 'PPO',
    abaMandate: true,
    abaMandateDetails: 'Arizona SB 1001 (2008, expanded 2015): Requires coverage of ABA for individuals under 21 diagnosed with ASD. No annual dollar cap. Coverage includes assessment (97151/97152), direct therapy (97153), and BCBA supervision (97155/97156). Minimum 30 hours/week when clinically indicated.',
    notes: 'Most common commercial plan in AZ. Good network of ABA providers. Pre-auth required for initial and ongoing services.',
    preAuthProcess: {
      required: true,
      method: 'portal',
      portalUrl: 'https://www.azblue.com/providers',
      phoneNumber: '1-800-232-2345',
      turnaroundDays: 14,
      renewalPeriodMonths: 6,
      documentsRequired: [
        'ASD diagnosis from qualified professional (psychologist, dev ped, or psychiatrist)',
        'BCBA treatment plan with measurable goals',
        'Functional Behavior Assessment (FBA)',
        'Units requested per week with clinical justification',
        'Progress report (for renewals)',
      ],
    },
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        authUnits: 'Per treatment plan, typically authorized in 6-month blocks',
        ageLimit: { min: 0, max: 21 },
        evvRequired: false,
        notes: 'AZ mandate requires coverage. No annual dollar cap but units subject to medical necessity review.',
      },
      {
        serviceType: 'Speech-Language Therapy',
        billingCodes: SPEECH_BILLING_CODES,
        authRequired: true,
        maxUnitsPerYear: 120,
        evvRequired: false,
      },
      {
        serviceType: 'Occupational Therapy',
        billingCodes: OT_BILLING_CODES,
        authRequired: true,
        maxUnitsPerYear: 120,
        evvRequired: false,
      },
    ],
  },
  {
    planId: 'BCBS-AZ-HMO',
    planName: 'BCBS Arizona HMO',
    planType: 'HMO',
    abaMandate: true,
    abaMandateDetails: 'Same AZ SB 1001 mandate applies. HMO requires referral from PCP before starting ABA services. Must use in-network providers.',
    notes: 'Requires PCP referral. Narrower network than PPO. Lower premiums but more restrictions.',
    preAuthProcess: {
      required: true,
      method: 'portal',
      portalUrl: 'https://www.azblue.com/providers',
      phoneNumber: '1-800-232-2345',
      turnaroundDays: 14,
      renewalPeriodMonths: 6,
      documentsRequired: [
        'PCP referral',
        'ASD diagnosis from qualified professional',
        'BCBA treatment plan with measurable goals',
        'Functional Behavior Assessment (FBA)',
        'Units requested per week with clinical justification',
      ],
    },
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        ageLimit: { min: 0, max: 21 },
        evvRequired: false,
        notes: 'PCP referral mandatory. In-network only.',
      },
    ],
  },
  {
    planId: 'BCBS-AZ-FEP',
    planName: 'BCBS Federal Employee Program',
    planType: 'FEP',
    abaMandate: true,
    abaMandateDetails: 'FEP follows federal ABA coverage requirements plus AZ state mandate. Generally generous coverage. FEP Standard and Basic options both cover ABA.',
    notes: 'Federal employees. Administered by BCBS AZ locally. National benefit with AZ state mandate overlay.',
    preAuthProcess: {
      required: true,
      method: 'phone',
      phoneNumber: '1-800-411-7437',
      turnaroundDays: 10,
      renewalPeriodMonths: 12,
      documentsRequired: [
        'ASD diagnosis',
        'Treatment plan',
        'Progress notes (for renewals)',
      ],
    },
    coveredServices: [
      {
        serviceType: 'ABA Therapy',
        billingCodes: ABA_BILLING_CODES,
        authRequired: true,
        ageLimit: { min: 0, max: 26 },
        evvRequired: false,
        notes: 'FEP covers through age 26 (dependent coverage). More generous than standard commercial.',
      },
    ],
  },
];

// ─── AZ-Specific Denial Codes & Guidance ─────────────────────────────

export const AZ_DENIAL_GUIDANCE: DenialGuidance[] = [
  {
    denialCode: 'CO-4',
    description: 'The procedure code is inconsistent with the modifier used',
    commonCauses: [
      'Missing or incorrect modifier on 97153 (should have no modifier for RBT)',
      'Using modifier 59 incorrectly on same-day services',
      'Missing HO modifier for BCBA-supervised services',
    ],
    correctionSteps: [
      'Verify modifier requirements for each CPT code per payer contract',
      'For AHCCCS: check AHCCCS Fee Schedule modifier requirements',
      'Resubmit with corrected modifier',
    ],
    appealDeadlineDays: 60,
    appealMethod: 'Electronic resubmission with corrected claim',
    successLikelihood: 'high',
    azSpecificNotes: 'AHCCCS requires specific modifiers per provider type. BCBAs use modifier HO, RBTs use no modifier for 97153.',
  },
  {
    denialCode: 'CO-11',
    description: 'Diagnosis is inconsistent with the procedure',
    commonCauses: [
      'Missing F84.0 (autism) as primary diagnosis for ABA codes',
      'Using general developmental delay code instead of ASD-specific code',
      'Secondary diagnosis not supporting medical necessity',
    ],
    correctionSteps: [
      'Ensure F84.0 is primary diagnosis for ABA billing codes',
      'Verify diagnosis matches assessment documentation',
      'Resubmit with corrected diagnosis coding',
    ],
    appealDeadlineDays: 60,
    appealMethod: 'Corrected claim submission',
    successLikelihood: 'high',
    azSpecificNotes: 'AZ mandate (SB 1001) requires formal ASD diagnosis. F84.0 must be primary for all 971xx codes.',
  },
  {
    denialCode: 'CO-15',
    description: 'Authorization/pre-certification was not obtained',
    commonCauses: [
      'Services rendered before authorization was approved',
      'Exceeded authorized units',
      'Authorization expired and was not renewed',
      'Wrong provider NPI on authorization',
    ],
    correctionSteps: [
      'Check authorization dates and units remaining',
      'If retro-auth available, submit retro-authorization request with clinical justification',
      'For AHCCCS: contact MCO authorization department within 30 days',
      'For BCBS: submit appeal with clinical documentation showing medical necessity',
    ],
    appealDeadlineDays: 30,
    appealMethod: 'Written appeal with authorization documentation',
    successLikelihood: 'medium',
    azSpecificNotes: 'AHCCCS MCOs may grant retro-authorizations within 30 days if services were medically necessary. BCBS requires pre-auth before first session.',
  },
  {
    denialCode: 'CO-16',
    description: 'Claim/service lacks information or has submission errors',
    commonCauses: [
      'Missing referring provider NPI',
      'Incomplete member information',
      'Missing place of service code',
      'EVV data not submitted (AHCCCS home-based)',
    ],
    correctionSteps: [
      'Review claim for all required fields per 837P requirements',
      'Verify member eligibility and ID',
      'For AHCCCS EVV: submit EVV data through Sandata or approved aggregator',
      'Resubmit corrected claim',
    ],
    appealDeadlineDays: 60,
    appealMethod: 'Corrected claim resubmission',
    successLikelihood: 'high',
    azSpecificNotes: 'AHCCCS 21st Century Cures Act compliance requires EVV data for all personal care and home health services. Missing EVV = automatic denial.',
  },
  {
    denialCode: 'CO-18',
    description: 'Exact duplicate claim',
    commonCauses: [
      'Accidental double-submission',
      'Resubmission without voiding original',
      'System glitch causing duplicate transmission',
    ],
    correctionSteps: [
      'Verify if original claim was paid',
      'If original denied, void and resubmit as corrected',
      'If paid, no action needed',
    ],
    appealDeadlineDays: 60,
    appealMethod: 'Void and resubmit if needed',
    successLikelihood: 'high',
  },
  {
    denialCode: 'CO-29',
    description: 'Time limit for filing has expired',
    commonCauses: [
      'Claim filed after timely filing deadline',
      'AHCCCS: 6 months from DOS',
      'BCBS: 90 days from DOS',
    ],
    correctionSteps: [
      'Check payer-specific timely filing limits',
      'If within appeal window, submit appeal with proof of timely submission attempt',
      'Document any payer system issues that delayed submission',
    ],
    appealDeadlineDays: 30,
    appealMethod: 'Written appeal with proof of timely submission',
    successLikelihood: 'low',
    azSpecificNotes: 'AHCCCS allows 6 months. Most AZ commercial payers allow 90 days. BCBS AZ allows 90 days from DOS or 60 days from EOB.',
  },
  {
    denialCode: 'CO-50',
    description: 'Non-covered service',
    commonCauses: [
      'Service not in member benefit package',
      'Age exceeds coverage limit (e.g., over 21 for mandate)',
      'Experimental/investigational determination',
    ],
    correctionSteps: [
      'Verify member benefits and covered services',
      'For ABA: cite AZ SB 1001 mandate if member is under 21',
      'Request peer-to-peer review if clinically indicated',
      'For AHCCCS children: cite EPSDT mandate for medical necessity',
    ],
    appealDeadlineDays: 60,
    appealMethod: 'Written appeal with medical necessity documentation and legal mandate citation',
    successLikelihood: 'medium',
    azSpecificNotes: 'AZ SB 1001 mandates ABA coverage for ASD under 21 on all fully-insured commercial plans. Self-funded ERISA plans may be exempt. AHCCCS EPSDT covers all medically necessary services under 21.',
  },
  {
    denialCode: 'PR-1',
    description: 'Deductible amount',
    commonCauses: [
      'Member has not met annual deductible',
      'Member responsibility, not a true denial',
    ],
    correctionSteps: [
      'Verify deductible status with member',
      'Bill member for deductible portion',
      'Set up payment plan if needed',
    ],
    appealDeadlineDays: 0,
    appealMethod: 'Not appealable - member responsibility',
    successLikelihood: 'low',
    azSpecificNotes: 'AHCCCS members have no deductible. BCBS deductibles vary by plan.',
  },
];

// ─── Validation Functions ────────────────────────────────────────────

export function validateAZClaim(claim: {
  diagnosisCodes: string[];
  procedureCode: string;
  modifier?: string;
  placeOfService: string;
  patientAge: number;
  authorizationNumber?: string;
  providerNPI: string;
  renderingProviderType?: string;
  evvData?: { checkIn: string; checkOut: string; gps: boolean };
  payerType: 'ahcccs' | 'bcbs' | 'other';
  planType?: string;
}): ClaimValidation {
  const errors: ClaimError[] = [];
  const warnings: ClaimWarning[] = [];

  // 1. Diagnosis validation
  const hasASDDiagnosis = claim.diagnosisCodes.some(dx =>
    dx.startsWith('F84') // F84.0, F84.1, etc.
  );

  const isABACode = claim.procedureCode.startsWith('971') || claim.procedureCode === '0373T';

  if (isABACode && !hasASDDiagnosis) {
    errors.push({
      field: 'diagnosisCodes',
      message: 'ABA billing codes (971xx) require ASD diagnosis (F84.x) as primary diagnosis per AZ SB 1001',
      code: 'AZ-DX-001',
    });
  }

  // 2. Age validation for mandate
  if (isABACode && claim.patientAge >= 21 && claim.payerType === 'bcbs') {
    if (claim.planType !== 'FEP') {
      errors.push({
        field: 'patientAge',
        message: 'AZ ABA mandate (SB 1001) applies to individuals under 21. Patient exceeds age limit for commercial coverage.',
        code: 'AZ-AGE-001',
      });
    }
  }

  // 3. Authorization
  if (isABACode && !claim.authorizationNumber) {
    errors.push({
      field: 'authorizationNumber',
      message: 'Prior authorization number required for ABA services',
      code: 'AZ-AUTH-001',
    });
  }

  // 4. NPI validation
  if (!claim.providerNPI || claim.providerNPI.length !== 10) {
    errors.push({
      field: 'providerNPI',
      message: 'Valid 10-digit NPI required',
      code: 'AZ-NPI-001',
    });
  }

  // 5. EVV validation for AHCCCS home-based
  if (claim.payerType === 'ahcccs' && claim.placeOfService === '12') {
    // Place of service 12 = Home
    if (!claim.evvData) {
      errors.push({
        field: 'evvData',
        message: 'EVV data required for AHCCCS home-based services per 21st Century Cures Act',
        code: 'AZ-EVV-001',
      });
    } else {
      if (!claim.evvData.checkIn) {
        errors.push({ field: 'evvData.checkIn', message: 'EVV check-in timestamp required', code: 'AZ-EVV-002' });
      }
      if (!claim.evvData.checkOut) {
        errors.push({ field: 'evvData.checkOut', message: 'EVV check-out timestamp required', code: 'AZ-EVV-003' });
      }
      if (!claim.evvData.gps) {
        warnings.push({ field: 'evvData.gps', message: 'GPS verification recommended for EVV compliance' });
      }
    }
  }

  // 6. Modifier validation
  if (claim.procedureCode === '97155' && claim.renderingProviderType === 'BCBA' && claim.modifier !== 'HO') {
    warnings.push({
      field: 'modifier',
      message: 'BCBA-rendered 97155 typically requires HO modifier for AHCCCS claims',
    });
  }

  if (claim.procedureCode === '97153' && claim.modifier === 'HO') {
    errors.push({
      field: 'modifier',
      message: '97153 (RBT direct service) should not have HO modifier',
      code: 'AZ-MOD-001',
    });
  }

  // 7. Place of service
  const validPOS = ['02', '03', '11', '12', '22', '31', '32', '99'];
  if (!validPOS.includes(claim.placeOfService)) {
    warnings.push({
      field: 'placeOfService',
      message: `Place of service ${claim.placeOfService} may not be valid for ABA services. Common: 02 (telehealth), 12 (home), 11 (office), 03 (school)`,
    });
  }

  // Telehealth modifier check
  if (claim.placeOfService === '02' && !['95', 'GT'].includes(claim.modifier ?? '')) {
    warnings.push({
      field: 'modifier',
      message: 'Telehealth services (POS 02) may require modifier 95 or GT depending on payer',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Lookup Helpers ──────────────────────────────────────────────────

export function lookupAHCCCSPlan(planType: AHCCCSPlanType): AHCCCSPlan | undefined {
  return AHCCCS_PLANS.find(p => p.planType === planType);
}

export function lookupBCBSPlan(planType: BCBSPlanType): BCBSAZPlan | undefined {
  return BCBS_AZ_PLANS.find(p => p.planType === planType);
}

export function getDenialGuidance(denialCode: string): DenialGuidance | undefined {
  return AZ_DENIAL_GUIDANCE.find(d => d.denialCode === denialCode);
}

export function getAuthRequirements(payerType: 'ahcccs' | 'bcbs', planType: string, serviceType: string): {
  required: boolean;
  process?: PreAuthProcess;
  documentsNeeded: string[];
  turnaroundDays: number;
} {
  if (payerType === 'bcbs') {
    const plan = BCBS_AZ_PLANS.find(p => p.planType === planType);
    if (!plan) return { required: true, documentsNeeded: [], turnaroundDays: 14 };
    const service = plan.coveredServices.find(s => s.serviceType.toLowerCase().includes(serviceType.toLowerCase()));
    return {
      required: service?.authRequired ?? true,
      process: plan.preAuthProcess,
      documentsNeeded: plan.preAuthProcess.documentsRequired,
      turnaroundDays: plan.preAuthProcess.turnaroundDays,
    };
  }

  // AHCCCS
  const plan = AHCCCS_PLANS.find(p => p.planType === planType);
  if (!plan) return { required: true, documentsNeeded: [], turnaroundDays: 14 };
  return {
    required: plan.priorAuthRequired,
    documentsNeeded: [
      'ASD diagnosis documentation',
      'Treatment plan with measurable goals',
      'Functional Behavior Assessment',
      'Requested units with clinical justification',
    ],
    turnaroundDays: 14,
  };
}

export function isEVVRequired(payerType: 'ahcccs' | 'bcbs', planType: string, placeOfService: string): boolean {
  if (payerType === 'bcbs') return false; // BCBS AZ does not require EVV

  const plan = AHCCCS_PLANS.find(p => p.planType === planType);
  if (!plan) return false;

  // AHCCCS requires EVV for home-based (12) and community-based (99) services
  // on ALTCS-DD, DES-DDD, CMDP, RBHA plans
  const evvPlanTypes: AHCCCSPlanType[] = ['ALTCS-DD', 'DES-DDD', 'CMDP', 'RBHA'];
  const evvPlaces = ['12', '99'];

  return plan.evvRequired && evvPlanTypes.includes(plan.planType) && evvPlaces.includes(placeOfService);
}
