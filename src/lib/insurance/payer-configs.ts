// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * payer-configs.ts
 *
 * Comprehensive configuration for the top 20 behavioral health insurance payers.
 * Covers commercial, Medicaid (multi-state), and government programs with
 * ABA-specific CPT codes, modifier rules, rate schedules, and filing requirements.
 *
 * Data sources: CMS NPPES, state Medicaid fee schedules, payer provider manuals.
 * Last updated: 2026-03-10
 */

// ============================================================================
// Types
// ============================================================================

/** ABA-specific CPT code range (97151-97158) plus common behavioral health codes */
export interface CPTCodeConfig {
  code: string;
  description: string;
  category: 'assessment' | 'treatment' | 'supervision' | 'caregiver-training' | 'group';
  requiresModifier: boolean;
  allowedModifiers: string[];
  unitType: '15min' | '30min' | 'per-session' | 'per-day';
  maxUnitsPerDay?: number;
  requiresPriorAuth: boolean;
  notes?: string;
}

/** Modifier configuration for ABA billing */
export interface ModifierConfig {
  code: string;
  description: string;
  usage: string;
  requiredCredentials?: string[];
  billingImpact?: string;
}

/** Rate schedule entry */
export interface RateScheduleEntry {
  cptCode: string;
  modifier?: string;
  ratePerUnit: number;
  effectiveDate: string;
  expirationDate?: string;
  placeOfService?: string;
  notes?: string;
}

/** Submission format details */
export interface SubmissionFormat {
  ediVersion: '5010';
  transactionSet: '837P' | '837I';
  clearinghouse: string[];
  electronicPayerId: string;
  portalUrl?: string;
  paperClaimAddress?: string;
}

/** Full payer configuration */
export interface PayerConfig {
  id: string;
  name: string;
  payerId: string;
  states: string[];
  payerType: 'commercial' | 'medicaid' | 'medicare' | 'tricare' | 'managed-medicaid';
  submissionFormat: SubmissionFormat;
  claimTypes: ('professional' | 'institutional')[];
  timelyFilingDays: number;
  priorAuthRequired: boolean;
  priorAuthDetails?: string;
  priorAuthPhone?: string;
  priorAuthPortal?: string;
  modifierRules: ModifierRule[];
  rateSchedule: RateScheduleEntry[];
  credentialingRequirements: string[];
  appealTimelineDays: number;
  appealLevels: string[];
  specialRules?: string[];
  contactInfo: {
    providerServices: string;
    claimsInquiry: string;
    priorAuth: string;
    website: string;
  };
}

/** Modifier rule for a payer */
export interface ModifierRule {
  modifier: string;
  description: string;
  required: boolean;
  conditions: string;
  affectsReimbursement: boolean;
  reimbursementImpact?: string;
}

// ============================================================================
// ABA CPT Codes (97151-97158 + related)
// ============================================================================

export const ABA_CPT_CODES: CPTCodeConfig[] = [
  {
    code: '97151',
    description: 'Behavior identification assessment',
    category: 'assessment',
    requiresModifier: true,
    allowedModifiers: ['HO', 'HP', 'HN'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Initial and reassessment. Must be conducted by BCBA/licensed provider.',
  },
  {
    code: '97152',
    description: 'Behavior identification-supporting assessment',
    category: 'assessment',
    requiresModifier: true,
    allowedModifiers: ['HO', 'HP', 'HN'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Administered by technician under BCBA supervision.',
  },
  {
    code: '97153',
    description: 'Adaptive behavior treatment by protocol',
    category: 'treatment',
    requiresModifier: true,
    allowedModifiers: ['HN', 'HO', 'HP'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Direct 1:1 ABA therapy. Most commonly billed ABA code.',
  },
  {
    code: '97154',
    description: 'Group adaptive behavior treatment by protocol',
    category: 'group',
    requiresModifier: true,
    allowedModifiers: ['HN', 'HO', 'HP', 'HQ'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Group setting (2-8 patients). HQ modifier may be required.',
  },
  {
    code: '97155',
    description: 'Adaptive behavior treatment with protocol modification',
    category: 'supervision',
    requiresModifier: true,
    allowedModifiers: ['HO', 'HP'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'BCBA direct supervision/protocol modification during session.',
  },
  {
    code: '97156',
    description: 'Family adaptive behavior treatment guidance',
    category: 'caregiver-training',
    requiresModifier: true,
    allowedModifiers: ['HO', 'HP'],
    unitType: '15min',
    maxUnitsPerDay: 16,
    requiresPriorAuth: true,
    notes: 'Caregiver/family training with BCBA. Does not require child present.',
  },
  {
    code: '97157',
    description: 'Multiple-family group adaptive behavior treatment guidance',
    category: 'caregiver-training',
    requiresModifier: true,
    allowedModifiers: ['HO', 'HP', 'HQ'],
    unitType: '15min',
    maxUnitsPerDay: 16,
    requiresPriorAuth: true,
    notes: 'Group caregiver training (2+ families).',
  },
  {
    code: '97158',
    description: 'Group adaptive behavior treatment with protocol modification',
    category: 'group',
    requiresModifier: true,
    allowedModifiers: ['HO', 'HP', 'HQ'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Group supervision by BCBA with protocol modification.',
  },
  {
    code: '0373T',
    description: 'Adaptive behavior treatment with protocol modification (exposure)',
    category: 'treatment',
    requiresModifier: false,
    allowedModifiers: ['HO', 'HP'],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Category III code. Not all payers accept. Check before billing.',
  },
  {
    code: '0362T',
    description: 'Behavior identification-supporting assessment (exposure)',
    category: 'assessment',
    requiresModifier: false,
    allowedModifiers: [],
    unitType: '15min',
    maxUnitsPerDay: 32,
    requiresPriorAuth: true,
    notes: 'Category III code. Limited payer acceptance.',
  },
];

// ============================================================================
// Modifier Definitions
// ============================================================================

export const ABA_MODIFIERS: ModifierConfig[] = [
  {
    code: 'HN',
    description: 'Bachelor\'s degree level',
    usage: 'RBT or bachelor\'s-level technician delivering direct services',
    requiredCredentials: ['RBT', 'BCaBA'],
    billingImpact: 'Standard rate for technician-delivered services',
  },
  {
    code: 'HO',
    description: 'Master\'s degree level',
    usage: 'BCBA or master\'s-level clinician delivering or supervising services',
    requiredCredentials: ['BCBA', 'BCBA-D', 'Licensed Psychologist'],
    billingImpact: 'Higher rate; required for 97155 and 97156',
  },
  {
    code: 'HP',
    description: 'Doctoral level',
    usage: 'BCBA-D or doctoral-level clinician',
    requiredCredentials: ['BCBA-D', 'PhD', 'PsyD'],
    billingImpact: 'Highest rate tier',
  },
  {
    code: 'GT',
    description: 'Telehealth via interactive audio/video',
    usage: 'Services delivered via real-time telehealth (video + audio)',
    billingImpact: 'Some payers reduce rate 5-15% for telehealth. Check payer policy.',
  },
  {
    code: '95',
    description: 'Synchronous telemedicine via real-time audiovisual',
    usage: 'Alternative to GT for telehealth services (CMS preferred since 2017)',
    billingImpact: 'Equivalent to GT for most commercial payers',
  },
  {
    code: 'HQ',
    description: 'Group setting',
    usage: 'Services provided in a group therapy setting (97154, 97157, 97158)',
    billingImpact: 'Group rate may be lower than individual rate',
  },
  {
    code: 'XE',
    description: 'Separate encounter',
    usage: 'Distinct services on the same day by the same provider',
    billingImpact: 'Required to bypass NCCI edits for same-day services',
  },
  {
    code: '59',
    description: 'Distinct procedural service',
    usage: 'Legacy modifier for distinct services (XE/XS/XP/XU preferred)',
    billingImpact: 'Used when no X-modifier applies',
  },
  {
    code: '76',
    description: 'Repeat procedure by same physician',
    usage: 'Same procedure performed again on the same day by the same provider',
    billingImpact: 'May require documentation of medical necessity',
  },
  {
    code: 'CO',
    description: 'Outpatient hospital',
    usage: 'Services provided in an outpatient hospital setting',
  },
];

// ============================================================================
// Place of Service Codes
// ============================================================================

export const PLACE_OF_SERVICE: Record<string, { code: string; name: string; description: string }> = {
  '02': { code: '02', name: 'Telehealth Provided Other than in Patient\'s Home', description: 'Interactive audio/video telecommunications (clinic-to-clinic telehealth)' },
  '03': { code: '03', name: 'School', description: 'School-based services' },
  '10': { code: '10', name: 'Telehealth Provided in Patient\'s Home', description: 'Interactive audio/video telecommunications in patient home' },
  '11': { code: '11', name: 'Office', description: 'Provider office or clinic' },
  '12': { code: '12', name: 'Home', description: 'Patient\'s home (in-home ABA)' },
  '49': { code: '49', name: 'Independent Clinic', description: 'ABA clinic not part of a hospital' },
  '53': { code: '53', name: 'Community Mental Health Center', description: 'CMHC-based services' },
  '99': { code: '99', name: 'Other Place of Service', description: 'Community-based (park, store for generalization)' },
};

// ============================================================================
// Payer Configurations — Top 20 Behavioral Health
// ============================================================================

function buildDefaultModifierRules(): ModifierRule[] {
  return [
    {
      modifier: 'HN',
      description: 'Bachelor\'s/RBT level',
      required: true,
      conditions: 'Required on 97152, 97153, 97154 when delivered by RBT/BCaBA',
      affectsReimbursement: true,
      reimbursementImpact: 'Standard technician rate',
    },
    {
      modifier: 'HO',
      description: 'Master\'s/BCBA level',
      required: true,
      conditions: 'Required on 97151, 97155, 97156 when delivered by BCBA',
      affectsReimbursement: true,
      reimbursementImpact: 'BCBA-level rate',
    },
    {
      modifier: 'HP',
      description: 'Doctoral level',
      required: false,
      conditions: 'Optional; used for BCBA-D or doctoral-level providers',
      affectsReimbursement: true,
      reimbursementImpact: 'Doctoral rate tier (if applicable)',
    },
    {
      modifier: 'GT',
      description: 'Telehealth via interactive audio/video',
      required: false,
      conditions: 'Required when service is delivered via telehealth',
      affectsReimbursement: true,
      reimbursementImpact: 'Some payers reduce rate 5-15%',
    },
  ];
}

export const PAYER_CONFIGS: PayerConfig[] = [
  // ============================================================================
  // 1. UnitedHealthcare / Optum
  // ============================================================================
  {
    id: 'uhc',
    name: 'UnitedHealthcare',
    payerId: '87726',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Optum', 'Change Healthcare'],
      electronicPayerId: '87726',
      portalUrl: 'https://www.uhcprovider.com',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth required for all ABA services. Initial assessment (97151) may be exempt for first 24 units.',
    priorAuthPhone: '1-800-842-3210',
    priorAuthPortal: 'https://www.uhcprovider.com/priorauth',
    modifierRules: [
      ...buildDefaultModifierRules(),
      {
        modifier: '95',
        description: 'Synchronous telemedicine',
        required: false,
        conditions: 'UHC prefers modifier 95 over GT for telehealth',
        affectsReimbursement: true,
        reimbursementImpact: 'Telehealth rate parity in most states',
      },
    ],
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 26.00, effectiveDate: '2026-01-01' },
      { cptCode: '97152', modifier: 'HN', ratePerUnit: 16.50, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 16.50, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 26.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 26.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: [
      'BCBA must be in-network with Optum behavioral health',
      'RBTs must be supervised by a credentialed BCBA',
      'Group NPI and individual NPI both required',
    ],
    appealTimelineDays: 180,
    appealLevels: ['Standard appeal', 'Expedited appeal', 'External review'],
    specialRules: [
      'Max 40 hours/week ABA unless medical necessity for higher intensity',
      'Reassessment required every 6 months',
      'Concurrent treatment plan review at authorization renewal',
    ],
    contactInfo: {
      providerServices: '1-877-842-3210',
      claimsInquiry: '1-877-842-3210',
      priorAuth: '1-800-842-3210',
      website: 'https://www.uhcprovider.com',
    },
  },

  // ============================================================================
  // 2. Aetna
  // ============================================================================
  {
    id: 'aetna',
    name: 'Aetna',
    payerId: '60054',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Change Healthcare'],
      electronicPayerId: '60054',
      portalUrl: 'https://navinet.navimedix.com',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'All ABA services require prior auth. Initial auth typically 6 months, renewals every 6 months.',
    priorAuthPhone: '1-888-632-3862',
    priorAuthPortal: 'https://www.aetna.com/providerportal',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
      { cptCode: '97152', modifier: 'HN', ratePerUnit: 15.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 15.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: [
      'BCBA or licensed psychologist in-network',
      'RBTs must have active BACB registration',
      'CAQH ProView profile required',
    ],
    appealTimelineDays: 180,
    appealLevels: ['First-level appeal', 'Second-level appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-624-0756',
      claimsInquiry: '1-888-632-3862',
      priorAuth: '1-888-632-3862',
      website: 'https://www.aetna.com/providers.html',
    },
  },

  // ============================================================================
  // 3. Cigna / Evernorth
  // ============================================================================
  {
    id: 'cigna',
    name: 'Cigna / Evernorth',
    payerId: '62308',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Trizetto'],
      electronicPayerId: '62308',
      portalUrl: 'https://cignaforhcp.cigna.com',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth required. Cigna uses ABA treatment guidelines based on BACB standards. Max initial auth 6 months.',
    priorAuthPhone: '1-800-768-4695',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 24.00, effectiveDate: '2026-01-01' },
      { cptCode: '97152', modifier: 'HN', ratePerUnit: 14.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 14.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 24.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 24.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: [
      'BCBA with active state license (where applicable)',
      'RBTs registered with BACB',
      'Provider must be paneled with Evernorth behavioral health',
    ],
    appealTimelineDays: 180,
    appealLevels: ['Pre-service appeal', 'Post-service appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-768-4695',
      claimsInquiry: '1-800-768-4695',
      priorAuth: '1-800-768-4695',
      website: 'https://cignaforhcp.cigna.com',
    },
  },

  // ============================================================================
  // 4. BlueCross BlueShield — Anthem (multi-state)
  // ============================================================================
  {
    id: 'bcbs-anthem',
    name: 'Anthem BlueCross BlueShield',
    payerId: '47198',
    states: ['CA', 'CO', 'CT', 'GA', 'IN', 'KY', 'ME', 'MO', 'NH', 'NV', 'NY', 'OH', 'VA', 'WI'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Change Healthcare'],
      electronicPayerId: '47198',
      portalUrl: 'https://providers.anthem.com',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 120,
    priorAuthRequired: true,
    priorAuthDetails: 'AIM (now Carelon) manages behavioral health prior auth. Initial 90-day auth, then 6-month renewals.',
    priorAuthPhone: '1-800-444-6013',
    priorAuthPortal: 'https://providers.anthem.com/priorauth',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 27.00, effectiveDate: '2026-01-01' },
      { cptCode: '97152', modifier: 'HN', ratePerUnit: 17.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 17.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 27.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 27.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: [
      'BCBA credentialed through Carelon behavioral health',
      'RBTs under BCBA supervision per BACB standards',
      'Must accept Anthem fee schedule',
    ],
    appealTimelineDays: 180,
    appealLevels: ['Internal appeal', 'External review', 'State DOI complaint'],
    contactInfo: {
      providerServices: '1-800-676-2583',
      claimsInquiry: '1-800-676-2583',
      priorAuth: '1-800-444-6013',
      website: 'https://providers.anthem.com',
    },
  },

  // ============================================================================
  // 5. BlueCross BlueShield of Arizona
  // ============================================================================
  {
    id: 'bcbs-az',
    name: 'Blue Cross Blue Shield of Arizona',
    payerId: '46045',
    states: ['AZ'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: '46045',
      portalUrl: 'https://www.azblue.com/providers',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth required for ABA. Steven\'s Law (AZ) mandates autism coverage with no dollar cap.',
    priorAuthPhone: '1-800-232-2345',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 15.50, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: [
      'AZ state licensed BCBA',
      'RBTs with active BACB certification',
    ],
    appealTimelineDays: 180,
    appealLevels: ['First-level appeal', 'Second-level appeal', 'ADOI complaint'],
    specialRules: [
      'Arizona Steven\'s Law: No annual or lifetime dollar cap on autism services',
      'Diagnosis must be F84.0 (Autism Spectrum Disorder)',
    ],
    contactInfo: {
      providerServices: '1-800-232-2345',
      claimsInquiry: '1-800-232-2345',
      priorAuth: '1-800-232-2345',
      website: 'https://www.azblue.com',
    },
  },

  // ============================================================================
  // 6. Arizona Medicaid (AHCCCS)
  // ============================================================================
  {
    id: 'ahcccs',
    name: 'AHCCCS (Arizona Medicaid)',
    payerId: 'SKAZ0',
    states: ['AZ'],
    payerType: 'medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'DHS Direct'],
      electronicPayerId: 'SKAZ0',
      portalUrl: 'https://www.azahcccs.gov/PlansProviders/',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth through assigned MCO (Mercy Care, UHC Community Plan, Arizona Complete Health, or Banner). EPSDT applies for under 21.',
    priorAuthPhone: '1-602-417-4000',
    modifierRules: [
      ...buildDefaultModifierRules(),
      {
        modifier: 'U5',
        description: 'AHCCCS-specific modifier for Medicaid managed care',
        required: false,
        conditions: 'May be required by specific MCOs under AHCCCS',
        affectsReimbursement: false,
      },
    ],
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 18.00, effectiveDate: '2026-01-01', notes: 'AHCCCS fee schedule' },
      { cptCode: '97152', modifier: 'HN', ratePerUnit: 11.50, effectiveDate: '2026-01-01', notes: 'AHCCCS fee schedule' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 11.50, effectiveDate: '2026-01-01', notes: 'AHCCCS fee schedule' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 18.00, effectiveDate: '2026-01-01', notes: 'AHCCCS fee schedule' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 18.00, effectiveDate: '2026-01-01', notes: 'AHCCCS fee schedule' },
    ],
    credentialingRequirements: [
      'Must be registered AHCCCS provider',
      'BCBA with AZ state license',
      'RBTs with BACB certification',
      'Must be contracted with the member\'s assigned MCO',
    ],
    appealTimelineDays: 60,
    appealLevels: ['MCO grievance', 'AHCCCS state fair hearing', 'Administrative review'],
    specialRules: [
      'EPSDT mandate covers all medically necessary services for members under 21',
      'File with the member\'s assigned MCO, not AHCCCS directly',
      'Claims submitted to wrong MCO will be denied — verify member assignment first',
      'AHCCCS MCOs: Mercy Care, UHC Community Plan, AZ Complete Health, Banner University',
    ],
    contactInfo: {
      providerServices: '1-602-417-4000',
      claimsInquiry: '1-602-417-4000',
      priorAuth: '1-602-417-4000',
      website: 'https://www.azahcccs.gov',
    },
  },

  // ============================================================================
  // 7. Montana Medicaid (DPHHS)
  // ============================================================================
  {
    id: 'mt-medicaid',
    name: 'Montana Medicaid (DPHHS)',
    payerId: 'SKMT0',
    states: ['MT'],
    payerType: 'medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Conduent'],
      electronicPayerId: 'SKMT0',
      portalUrl: 'https://medicaidprovider.mt.gov',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 365,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth required through Magellan Healthcare (BH services). EPSDT applies for under 21.',
    priorAuthPhone: '1-800-424-0757',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 16.50, effectiveDate: '2026-01-01', notes: 'MT Medicaid fee schedule' },
      { cptCode: '97152', modifier: 'HN', ratePerUnit: 10.50, effectiveDate: '2026-01-01', notes: 'MT Medicaid fee schedule' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 10.50, effectiveDate: '2026-01-01', notes: 'MT Medicaid fee schedule' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 16.50, effectiveDate: '2026-01-01', notes: 'MT Medicaid fee schedule' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 16.50, effectiveDate: '2026-01-01', notes: 'MT Medicaid fee schedule' },
    ],
    credentialingRequirements: [
      'Must be enrolled as Montana Medicaid provider',
      'BCBA with active BACB certification',
      'MT does not require separate state licensure for BCBAs (as of 2026)',
    ],
    appealTimelineDays: 120,
    appealLevels: ['Administrative review', 'State fair hearing'],
    specialRules: [
      'Montana has limited ABA provider network — many families drive 2+ hours',
      'Telehealth ABA encouraged for rural areas',
      'EPSDT covers all medically necessary services for under 21',
      '1-year timely filing — most generous among Medicaid programs',
    ],
    contactInfo: {
      providerServices: '1-800-694-3084',
      claimsInquiry: '1-800-694-3084',
      priorAuth: '1-800-424-0757',
      website: 'https://dphhs.mt.gov/medicaid',
    },
  },

  // ============================================================================
  // 8. California Medicaid (Medi-Cal)
  // ============================================================================
  {
    id: 'ca-medicaid',
    name: 'Medi-Cal (California Medicaid)',
    payerId: 'SKCA0',
    states: ['CA'],
    payerType: 'medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'DHCS Direct'],
      electronicPayerId: 'SKCA0',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    priorAuthDetails: 'ABA services authorized through regional center or managed care plan. Senate Bill 946 mandates coverage.',
    priorAuthPhone: '1-800-541-5555',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 22.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 14.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 22.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 22.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['Medi-Cal provider enrollment', 'BCBA with CA state license (SB 1034)'],
    appealTimelineDays: 60,
    appealLevels: ['Managed care plan appeal', 'State fair hearing', 'Independent Medical Review'],
    contactInfo: {
      providerServices: '1-800-541-5555',
      claimsInquiry: '1-800-541-5555',
      priorAuth: '1-800-541-5555',
      website: 'https://www.dhcs.ca.gov',
    },
  },

  // ============================================================================
  // 9. Texas Medicaid
  // ============================================================================
  {
    id: 'tx-medicaid',
    name: 'Texas Medicaid (HHSC)',
    payerId: 'SKTX0',
    states: ['TX'],
    payerType: 'medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'TMHP'],
      electronicPayerId: 'SKTX0',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 95,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth through managed care organization. STAR/STAR Kids plans.',
    priorAuthPhone: '1-800-925-9126',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 19.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 12.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 19.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 19.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['TX Medicaid provider enrollment', 'Licensed BCBA in Texas'],
    appealTimelineDays: 60,
    appealLevels: ['MCO appeal', 'State fair hearing'],
    contactInfo: {
      providerServices: '1-800-925-9126',
      claimsInquiry: '1-800-925-9126',
      priorAuth: '1-800-925-9126',
      website: 'https://www.tmhp.com',
    },
  },

  // ============================================================================
  // 10. Florida Medicaid
  // ============================================================================
  {
    id: 'fl-medicaid',
    name: 'Florida Medicaid (AHCA)',
    payerId: 'SKFL0',
    states: ['FL'],
    payerType: 'medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: 'SKFL0',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 365,
    priorAuthRequired: true,
    priorAuthDetails: 'Prior auth through Statewide Medicaid Managed Care plan. EPSDT applies.',
    priorAuthPhone: '1-888-419-3456',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 20.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 13.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 20.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 20.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['FL Medicaid provider enrollment', 'FL licensed BCBA'],
    appealTimelineDays: 90,
    appealLevels: ['Managed care plan appeal', 'Medicaid fair hearing'],
    contactInfo: {
      providerServices: '1-888-419-3456',
      claimsInquiry: '1-888-419-3456',
      priorAuth: '1-888-419-3456',
      website: 'https://ahca.myflorida.com',
    },
  },

  // ============================================================================
  // 11. Tricare
  // ============================================================================
  {
    id: 'tricare',
    name: 'Tricare',
    payerId: '99726',
    states: ['ALL'],
    payerType: 'tricare',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'PGBA/WPS'],
      electronicPayerId: '99726',
      portalUrl: 'https://www.tricare.mil/providers',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 365,
    priorAuthRequired: true,
    priorAuthDetails: 'ACD (Autism Care Demonstration) program. Requires Tricare-authorized ABA provider. No session caps for ACD-enrolled beneficiaries.',
    priorAuthPhone: '1-855-722-4693',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 25.50, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 16.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 25.50, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 25.50, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: [
      'Must be registered Tricare ACD provider',
      'BCBA with BACB certification',
      'Annual re-credentialing',
    ],
    appealTimelineDays: 90,
    appealLevels: ['Reconsideration', 'Formal appeal', 'TRICARE Hearing'],
    specialRules: [
      'ACD program has no session caps',
      'Non-ACD Tricare has 60-hour-per-month limit',
      'Must use ACD-specific authorization process',
    ],
    contactInfo: {
      providerServices: '1-855-722-4693',
      claimsInquiry: '1-855-722-4693',
      priorAuth: '1-855-722-4693',
      website: 'https://www.tricare.mil',
    },
  },

  // ============================================================================
  // 12. Kaiser Permanente
  // ============================================================================
  {
    id: 'kaiser',
    name: 'Kaiser Permanente',
    payerId: '94135',
    states: ['CA', 'CO', 'GA', 'HI', 'MD', 'OR', 'VA', 'WA', 'DC'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: '94135',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'Kaiser uses internal behavioral health network. External ABA providers need single case agreement.',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 28.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 18.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 28.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 28.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['Kaiser network contract or single case agreement'],
    appealTimelineDays: 180,
    appealLevels: ['Internal grievance', 'Independent medical review (DMHC in CA)'],
    contactInfo: {
      providerServices: '1-800-390-3510',
      claimsInquiry: '1-800-390-3510',
      priorAuth: '1-800-390-3510',
      website: 'https://providers.kaiserpermanente.org',
    },
  },

  // ============================================================================
  // 13. Humana
  // ============================================================================
  {
    id: 'humana',
    name: 'Humana',
    payerId: '61101',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Change Healthcare'],
      electronicPayerId: '61101',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 24.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 15.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 24.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 24.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['CAQH ProView', 'BCBA credentialed with Humana behavioral health'],
    appealTimelineDays: 180,
    appealLevels: ['Standard appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-457-4708',
      claimsInquiry: '1-800-457-4708',
      priorAuth: '1-800-457-4708',
      website: 'https://www.humana.com/provider',
    },
  },

  // ============================================================================
  // 14. Molina Healthcare
  // ============================================================================
  {
    id: 'molina',
    name: 'Molina Healthcare',
    payerId: '20934',
    states: ['AZ', 'CA', 'FL', 'IL', 'MI', 'NV', 'NY', 'OH', 'TX', 'UT', 'WA', 'WI'],
    payerType: 'managed-medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: '20934',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    priorAuthDetails: 'Molina manages Medicaid ABA authorizations per state-specific rules.',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 19.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 12.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 19.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 19.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['State Medicaid enrollment', 'Molina network contract'],
    appealTimelineDays: 60,
    appealLevels: ['Molina internal appeal', 'State fair hearing'],
    contactInfo: {
      providerServices: '1-866-449-6849',
      claimsInquiry: '1-866-449-6849',
      priorAuth: '1-866-449-6849',
      website: 'https://www.molinahealthcare.com/providers',
    },
  },

  // ============================================================================
  // 15. Centene (WellCare / Ambetter)
  // ============================================================================
  {
    id: 'centene',
    name: 'Centene / WellCare / Ambetter',
    payerId: '23284',
    states: ['AZ', 'CA', 'FL', 'GA', 'IL', 'IN', 'KY', 'MO', 'NY', 'OH', 'TX', 'WA'],
    payerType: 'managed-medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Change Healthcare'],
      electronicPayerId: '23284',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 18.50, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 11.50, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 18.50, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 18.50, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['State Medicaid enrollment', 'Centene/WellCare network contract'],
    appealTimelineDays: 60,
    appealLevels: ['Plan appeal', 'State fair hearing'],
    contactInfo: {
      providerServices: '1-866-231-1821',
      claimsInquiry: '1-866-231-1821',
      priorAuth: '1-866-231-1821',
      website: 'https://www.centene.com/products-and-services/browse-by-state.html',
    },
  },

  // ============================================================================
  // 16. Optum Behavioral Health
  // ============================================================================
  {
    id: 'optum-bh',
    name: 'Optum Behavioral Health',
    payerId: '00880',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Optum', 'Availity'],
      electronicPayerId: '00880',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'Optum manages behavioral health benefits for UHC and many employer plans. Use Optum payer ID, not UHC.',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 16.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 25.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['Optum behavioral health network', 'CAQH ProView'],
    appealTimelineDays: 180,
    appealLevels: ['Internal appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-788-4005',
      claimsInquiry: '1-800-788-4005',
      priorAuth: '1-800-788-4005',
      website: 'https://www.providerexpress.com',
    },
  },

  // ============================================================================
  // 17. Magellan Health
  // ============================================================================
  {
    id: 'magellan',
    name: 'Magellan Health',
    payerId: '78857',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity', 'Change Healthcare'],
      electronicPayerId: '78857',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'Magellan manages behavioral health for commercial plans and some Medicaid programs.',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 23.00, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 14.50, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 23.00, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 23.00, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['Magellan provider network enrollment'],
    appealTimelineDays: 180,
    appealLevels: ['Standard appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-788-4005',
      claimsInquiry: '1-800-788-4005',
      priorAuth: '1-800-788-4005',
      website: 'https://www.magellanhealth.com/for-providers',
    },
  },

  // ============================================================================
  // 18. Beacon Health (now Carelon)
  // ============================================================================
  {
    id: 'beacon',
    name: 'Beacon Health Options / Carelon',
    payerId: '13551',
    states: ['ALL'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: '13551',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 90,
    priorAuthRequired: true,
    priorAuthDetails: 'Carelon (formerly Beacon/AIM) manages BH benefits for Anthem and other plans.',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 24.50, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 15.50, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 24.50, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 24.50, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['Carelon behavioral health network'],
    appealTimelineDays: 180,
    appealLevels: ['Internal appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-397-1630',
      claimsInquiry: '1-800-397-1630',
      priorAuth: '1-800-397-1630',
      website: 'https://www.carelon.com',
    },
  },

  // ============================================================================
  // 19. BCBS of Illinois
  // ============================================================================
  {
    id: 'bcbs-il',
    name: 'BlueCross BlueShield of Illinois',
    payerId: '00621',
    states: ['IL', 'MT', 'NM', 'OK', 'TX'],
    payerType: 'commercial',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: '00621',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 26.50, effectiveDate: '2026-01-01' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 17.00, effectiveDate: '2026-01-01' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 26.50, effectiveDate: '2026-01-01' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 26.50, effectiveDate: '2026-01-01' },
    ],
    credentialingRequirements: ['BCBSIL provider network', 'CAQH ProView'],
    appealTimelineDays: 180,
    appealLevels: ['Internal appeal', 'External review'],
    contactInfo: {
      providerServices: '1-800-972-3200',
      claimsInquiry: '1-800-972-3200',
      priorAuth: '1-800-972-3200',
      website: 'https://www.bcbsil.com/provider',
    },
  },

  // ============================================================================
  // 20. Mercy Care (AHCCCS MCO)
  // ============================================================================
  {
    id: 'mercy-care',
    name: 'Mercy Care (AHCCCS MCO)',
    payerId: '77032',
    states: ['AZ'],
    payerType: 'managed-medicaid',
    submissionFormat: {
      ediVersion: '5010',
      transactionSet: '837P',
      clearinghouse: ['Availity'],
      electronicPayerId: '77032',
    },
    claimTypes: ['professional'],
    timelyFilingDays: 180,
    priorAuthRequired: true,
    priorAuthDetails: 'Mercy Care manages AHCCCS behavioral health. Prior auth through Mercy Care BH department.',
    priorAuthPhone: '1-602-586-1841',
    modifierRules: buildDefaultModifierRules(),
    rateSchedule: [
      { cptCode: '97151', modifier: 'HO', ratePerUnit: 18.00, effectiveDate: '2026-01-01', notes: 'AHCCCS contracted rate' },
      { cptCode: '97153', modifier: 'HN', ratePerUnit: 11.50, effectiveDate: '2026-01-01', notes: 'AHCCCS contracted rate' },
      { cptCode: '97155', modifier: 'HO', ratePerUnit: 18.00, effectiveDate: '2026-01-01', notes: 'AHCCCS contracted rate' },
      { cptCode: '97156', modifier: 'HO', ratePerUnit: 18.00, effectiveDate: '2026-01-01', notes: 'AHCCCS contracted rate' },
    ],
    credentialingRequirements: [
      'AHCCCS registered provider',
      'Mercy Care network contract',
      'AZ-licensed BCBA',
    ],
    appealTimelineDays: 60,
    appealLevels: ['Mercy Care grievance', 'AHCCCS state fair hearing'],
    contactInfo: {
      providerServices: '1-602-586-1841',
      claimsInquiry: '1-602-586-1841',
      priorAuth: '1-602-586-1841',
      website: 'https://www.mercycareaz.org/providers',
    },
  },
];

// ============================================================================
// Lookup Helpers
// ============================================================================

/** Find a payer config by ID */
export function getPayerConfig(payerId: string): PayerConfig | undefined {
  return PAYER_CONFIGS.find(
    (p) => p.id === payerId || p.payerId === payerId
  );
}

/** Find all payers available in a given state */
export function getPayersByState(stateAbbr: string): PayerConfig[] {
  const upper = stateAbbr.toUpperCase();
  return PAYER_CONFIGS.filter(
    (p) => p.states.includes('ALL') || p.states.includes(upper)
  );
}

/** Find a payer by name (partial, case-insensitive) */
export function searchPayers(query: string): PayerConfig[] {
  const lower = query.toLowerCase();
  return PAYER_CONFIGS.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.id.toLowerCase().includes(lower) ||
      p.payerId.includes(query)
  );
}

/** Get rate for a specific CPT code and payer */
export function getPayerRate(
  payerIdOrConfigId: string,
  cptCode: string,
  modifier?: string
): RateScheduleEntry | undefined {
  const payer = getPayerConfig(payerIdOrConfigId);
  if (!payer) return undefined;

  return payer.rateSchedule.find(
    (r) =>
      r.cptCode === cptCode &&
      (!modifier || r.modifier === modifier)
  );
}

/** Check if a CPT code is a valid ABA code */
export function isValidABACPT(code: string): boolean {
  return ABA_CPT_CODES.some((c) => c.code === code);
}

/** Get CPT code details */
export function getCPTCodeConfig(code: string): CPTCodeConfig | undefined {
  return ABA_CPT_CODES.find((c) => c.code === code);
}

/** Get modifier details */
export function getModifierConfig(code: string): ModifierConfig | undefined {
  return ABA_MODIFIERS.find((m) => m.code === code);
}

/** Get payer timely filing deadline from a service date */
export function getTimelyFilingDeadline(
  payerIdOrConfigId: string,
  serviceDate: string
): Date | undefined {
  const payer = getPayerConfig(payerIdOrConfigId);
  if (!payer) return undefined;

  const svcDate = new Date(serviceDate);
  if (isNaN(svcDate.getTime())) return undefined;

  return new Date(svcDate.getTime() + payer.timelyFilingDays * 24 * 60 * 60 * 1000);
}
