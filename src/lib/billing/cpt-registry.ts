// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * cpt-registry.ts — SINGLE SOURCE OF TRUTH for CPT-code rules.
 *
 * Previously CPT data was hardcoded across 4 inconsistent sources:
 *   1. src/lib/cpt-codes.ts            (clinical note-template registry)
 *   2. src/lib/telehealth-economics.ts (ESTIMATED_REIMBURSEMENT_CENTS)
 *   3. src/lib/insurance/payer-configs.ts (ABA_CPT_CODES + payer rate schedules)
 *   4. src/lib/pricing.ts              (SESSION_PRICING cptCode strings)
 *
 * All four now derive from (or are validated against) this module. Rules live
 * in the exported CPT_RULES const so a future Supabase table can hydrate or
 * override them at runtime via hydrateCptRules() / hydratePayerRateOverrides().
 *
 * IMPORT-CYCLE NOTE: this module imports NOTHING from the rest of src/lib.
 * payer-configs.ts imports from here (to derive ABA_CPT_CODES) and registers
 * its rate schedule via registerPayerRateSource(); resolveRateCents() consults
 * that registered source at call time. This keeps module initialization
 * acyclic regardless of load order.
 */

// ============================================================================
// Types
// ============================================================================

export type CptServiceType =
  | 'aba'
  | 'slp'
  | 'mental-health'
  | 'diagnostic'
  | 'dev-ped'
  | 'screener'
  | 'rtm'
  | 'caregiver-education';

export type CptUnit = 'per_15min' | 'per_hour' | 'per_session' | 'per_instrument';

export interface CptModifierRule {
  code: string;
  /** Human hint for when this modifier applies (e.g. 'telehealth', 'group'). */
  when?: string;
}

export interface CptRule {
  code: string;
  serviceType: CptServiceType;
  shortName: string;
  description: string;
  unit: CptUnit;
  /** e.g. ['bcba'], ['rbt', 'bcba'] — lowest-to-highest credential that may render the service. */
  requiredProviderCredential?: string[];
  /** Note template id in ProviderPortal (aba-session | soap | slp-session | mental-health | diagnostic-eval | dev-ped | progress). */
  noteTemplate?: string;
  /** Note field keys that MUST be filled for billing compliance. */
  requiredFields?: string[];
  allowedModifiers?: CptModifierRule[];
  telehealthModifier?: '95' | 'GT';
  /** POS code when delivered via telehealth: '02' (facility) | '10' (patient home). */
  placeOfServiceTelehealth?: string;
  maxUnitsPerDay?: number;
  /** Estimated in-person/95 reimbursement per unit (AZ Medicaid / commercial avg), in cents. */
  defaultReimbursementCents?: number;
  /** GT-modifier reimbursement per unit in cents, when it differs from the default (some payers cut GT 5%). */
  gtReimbursementCents?: number;
  /** True when the code represents supervision / protocol modification (97155, 97158, …). */
  supervisionEligible?: boolean;
  /** Display string, e.g. '15 min units' or '53-60 min'. */
  typicalDuration?: string;
  /** Provider-facing billing guidance. */
  billingTip?: string;
}

/** Payer-specific rate override (future Supabase `cpt_payer_rate_overrides` table shape). */
export interface PayerRateOverride {
  payerId: string;
  code: string;
  modifier?: string;
  ratePerUnitCents: number;
  effectiveDate: string;
}

/**
 * Pluggable payer rate source (returns CENTS per unit, or undefined when the
 * payer has no scheduled rate). payer-configs.ts registers its rateSchedule
 * lookup here so resolveRateCents can consult it without an import cycle.
 */
export type PayerRateSource = (
  payerId: string,
  code: string,
  modifier?: string,
) => number | undefined;

// ============================================================================
// Seed rules — union of all 4 legacy sources + previously-missing codes
// (97152, 97154, 97157, 98970-98972)
// ============================================================================

export const CPT_RULES: CptRule[] = [
  // ── ABA / Adaptive Behavior Services (97151-97158) ────────────────────────
  // NOTE: the first 5 codes keep their legacy cpt-codes.ts ordering so
  // suggestCPTCodes() top-3 results stay stable; the previously-missing codes
  // (97152/97154/97157) and Category III codes are appended after.
  {
    code: '97151',
    serviceType: 'aba',
    shortName: 'ABA Assessment',
    description:
      'Behavior identification assessment, administered by a physician or other qualified health care professional, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    allowedModifiers: [
      { code: 'HO' },
      { code: 'HP' },
      { code: 'HN' },
      { code: '95', when: 'telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    maxUnitsPerDay: 32,
    defaultReimbursementCents: 4800,
    typicalDuration: '15 min units (up to 24 units)',
    billingTip: 'Requires BCBA. Document direct observation + caregiver interview.',
  },
  {
    code: '97153',
    serviceType: 'aba',
    shortName: 'ABA Direct (RBT)',
    description:
      'Adaptive behavior treatment by protocol, administered by technician under the direction of a physician or other qualified health care professional, face-to-face with one patient, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['rbt', 'bcba'],
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'trials', 'prompting', 'data'],
    allowedModifiers: [
      { code: 'HN' },
      { code: 'HO' },
      { code: 'HP' },
      { code: '95', when: 'telehealth' },
      { code: 'GT', when: 'legacy telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    maxUnitsPerDay: 32,
    defaultReimbursementCents: 3200,
    typicalDuration: '15 min units',
    billingTip:
      'Most common ABA code. Must document specific targets, trial data, and prompting levels per unit.',
  },
  {
    code: '97155',
    serviceType: 'aba',
    shortName: 'ABA Protocol Modification',
    description:
      'Adaptive behavior treatment with protocol modification, administered by physician or other qualified health care professional, which may include simultaneous direction of technician, face-to-face with one patient, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    allowedModifiers: [{ code: 'HO' }, { code: 'HP' }, { code: '95', when: 'telehealth' }],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    maxUnitsPerDay: 32,
    defaultReimbursementCents: 5600,
    supervisionEligible: true,
    typicalDuration: '15 min units',
    billingTip: 'BCBA only. Document what protocols were modified and clinical rationale.',
  },
  {
    code: '97156',
    serviceType: 'aba',
    shortName: 'ABA Family Guidance',
    description:
      'Family adaptive behavior treatment guidance, administered by physician or other qualified health care professional (with or without the patient present), face-to-face with guardian(s)/caregiver(s), each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    noteTemplate: 'soap',
    requiredFields: ['subjective', 'objective', 'plan'],
    allowedModifiers: [
      { code: 'HO' },
      { code: 'HP' },
      { code: '95', when: 'telehealth' },
      { code: 'GT', when: 'legacy telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    maxUnitsPerDay: 16,
    defaultReimbursementCents: 5200,
    typicalDuration: '15 min units',
    billingTip: 'Caregiver must be present. Document parent training goals + carryover strategies.',
  },
  {
    code: '97158',
    serviceType: 'aba',
    shortName: 'ABA Group (BCBA)',
    description:
      'Group adaptive behavior treatment with protocol modification, administered by physician or other qualified health care professional, face-to-face with multiple patients, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    allowedModifiers: [{ code: 'HO' }, { code: 'HP' }, { code: 'HQ', when: 'group' }],
    maxUnitsPerDay: 32,
    supervisionEligible: true,
    typicalDuration: '15 min units',
    billingTip: 'Max 8 clients per group. Each client needs individual documentation.',
  },
  // ── Previously-missing ABA codes (added June 2026) ─────────────────────────
  {
    code: '97152',
    serviceType: 'aba',
    shortName: 'ABA Supporting Assessment (RBT)',
    description:
      'Behavior identification-supporting assessment, administered by one technician under the direction of a physician or other qualified health care professional, face-to-face with the patient, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['rbt', 'bcba'],
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    allowedModifiers: [
      { code: 'HO' },
      { code: 'HP' },
      { code: 'HN' },
      { code: '95', when: 'telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    maxUnitsPerDay: 32,
    typicalDuration: '15 min units',
    billingTip:
      'Technician-administered assessment under BCBA direction. Document assessment activities and supervising BCBA.',
  },
  {
    code: '97154',
    serviceType: 'aba',
    shortName: 'ABA Group (RBT)',
    description:
      'Group adaptive behavior treatment by protocol, administered by technician under the direction of a physician or other qualified health care professional, face-to-face with two or more patients, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['rbt', 'bcba'],
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    allowedModifiers: [
      { code: 'HN' },
      { code: 'HO' },
      { code: 'HP' },
      { code: 'HQ', when: 'group' },
    ],
    maxUnitsPerDay: 32,
    typicalDuration: '15 min units',
    billingTip:
      'Group setting (2-8 patients). HQ modifier may be required. Each client needs individual documentation.',
  },
  {
    code: '97157',
    serviceType: 'aba',
    shortName: 'ABA Multi-Family Group Guidance',
    description:
      'Multiple-family group adaptive behavior treatment guidance, administered by physician or other qualified health care professional (without the patient present), face-to-face with multiple sets of guardians/caregivers, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    noteTemplate: 'soap',
    requiredFields: ['subjective', 'objective', 'plan'],
    allowedModifiers: [{ code: 'HO' }, { code: 'HP' }, { code: 'HQ', when: 'group' }],
    maxUnitsPerDay: 16,
    typicalDuration: '15 min units',
    billingTip:
      'Group caregiver guidance (2+ families, patients not present). Document per-family goals and carryover strategies.',
  },
  // Category III adaptive-behavior codes (limited payer acceptance)
  {
    code: '0373T',
    serviceType: 'aba',
    shortName: 'ABA Protocol Mod (Exposure)',
    description:
      'Adaptive behavior treatment with protocol modification requiring two or more technicians for severe destructive behavior (exposure), each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    allowedModifiers: [{ code: 'HO' }, { code: 'HP' }],
    maxUnitsPerDay: 32,
    typicalDuration: '15 min units',
    billingTip: 'Category III code. Not all payers accept. Check before billing.',
  },
  {
    code: '0362T',
    serviceType: 'aba',
    shortName: 'ABA Supporting Assessment (Exposure)',
    description:
      'Behavior identification supporting assessment with exposure to environmental conditions, requiring two or more technicians for severe destructive behavior, each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['bcba'],
    allowedModifiers: [],
    maxUnitsPerDay: 32,
    typicalDuration: '15 min units',
    billingTip: 'Category III code. Limited payer acceptance.',
  },

  // ── Online digital assessment / e-visit (98970-98972) ─────────────────────
  // Used by Ask-a-Behaviorist: async caregiver questions inside the 7-day
  // post-1:1-telehealth window are documented against these codes.
  {
    code: '98970',
    serviceType: 'caregiver-education',
    shortName: 'Digital E-Visit (5-10 min)',
    description:
      'Qualified nonphysician health care professional online digital assessment and management service, for an established patient, for up to 7 days, cumulative time during the 7 days; 5-10 minutes',
    unit: 'per_session',
    noteTemplate: 'progress',
    requiredFields: ['narrative'],
    maxUnitsPerDay: 1,
    typicalDuration: '5-10 min cumulative over 7 days',
    billingTip:
      'Patient/caregiver-initiated digital inquiry within 7 days of a qualifying visit. Bill once per 7-day episode; time is cumulative.',
  },
  {
    code: '98971',
    serviceType: 'caregiver-education',
    shortName: 'Digital E-Visit (11-20 min)',
    description:
      'Qualified nonphysician health care professional online digital assessment and management service, for an established patient, for up to 7 days, cumulative time during the 7 days; 11-20 minutes',
    unit: 'per_session',
    noteTemplate: 'progress',
    requiredFields: ['narrative'],
    maxUnitsPerDay: 1,
    typicalDuration: '11-20 min cumulative over 7 days',
    billingTip:
      'Bill once per 7-day episode when cumulative response time reaches 11-20 minutes. Document total time.',
  },
  {
    code: '98972',
    serviceType: 'caregiver-education',
    shortName: 'Digital E-Visit (21+ min)',
    description:
      'Qualified nonphysician health care professional online digital assessment and management service, for an established patient, for up to 7 days, cumulative time during the 7 days; 21 or more minutes',
    unit: 'per_session',
    noteTemplate: 'progress',
    requiredFields: ['narrative'],
    maxUnitsPerDay: 1,
    typicalDuration: '21+ min cumulative over 7 days',
    billingTip:
      'Bill once per 7-day episode when cumulative response time reaches 21+ minutes. Document total time.',
  },

  // ── Speech-Language Pathology ──────────────────────────────────────────────
  {
    code: '92507',
    serviceType: 'slp',
    shortName: 'SLP Treatment',
    description:
      'Treatment of speech, language, voice, communication, and/or auditory processing disorder; individual',
    unit: 'per_session',
    requiredProviderCredential: ['slp'],
    noteTemplate: 'slp-session',
    requiredFields: ['articulation', 'language', 'plan'],
    allowedModifiers: [
      { code: '95', when: 'telehealth' },
      { code: '59', when: 'distinct' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    defaultReimbursementCents: 7200,
    typicalDuration: '30-60 min session',
    billingTip: 'Most common SLP code. Document targets addressed, accuracy %, and home program.',
  },
  {
    code: '92521',
    serviceType: 'slp',
    shortName: 'Fluency Evaluation',
    description: 'Evaluation of speech fluency (eg, stuttering, cluttering)',
    unit: 'per_session',
    requiredProviderCredential: ['slp'],
    noteTemplate: 'slp-session',
    requiredFields: ['fluency_voice', 'plan'],
    allowedModifiers: [],
    typicalDuration: '45-90 min evaluation',
    billingTip: 'One-time eval. Document dysfluency type, frequency, severity rating.',
  },
  {
    code: '92522',
    serviceType: 'slp',
    shortName: 'Speech Sound Eval',
    description: 'Evaluation of speech sound production (eg, articulation, phonological process, apraxia, dysarthria)',
    unit: 'per_session',
    requiredProviderCredential: ['slp'],
    noteTemplate: 'slp-session',
    requiredFields: ['articulation', 'oral_motor', 'plan'],
    allowedModifiers: [],
    typicalDuration: '45-90 min evaluation',
    billingTip: 'Evaluation code — document standardized test scores, stimulability, error patterns.',
  },
  {
    code: '92523',
    serviceType: 'slp',
    shortName: 'Speech + Language Eval',
    description:
      'Evaluation of speech sound production with evaluation of language comprehension and expression',
    unit: 'per_session',
    requiredProviderCredential: ['slp'],
    noteTemplate: 'slp-session',
    requiredFields: ['articulation', 'language', 'oral_motor', 'plan'],
    allowedModifiers: [],
    typicalDuration: '60-120 min evaluation',
    billingTip: 'Comprehensive eval. Include both artic + language standardized measures.',
  },
  {
    code: '92526',
    serviceType: 'slp',
    shortName: 'Oral Function Therapy',
    description: 'Treatment of swallowing dysfunction and/or oral function for feeding',
    unit: 'per_session',
    requiredProviderCredential: ['slp'],
    noteTemplate: 'slp-session',
    requiredFields: ['oral_motor', 'plan'],
    allowedModifiers: [],
    typicalDuration: '30-60 min session',
    billingTip: 'Document oral motor exercises, feeding trials, texture progression.',
  },

  // ── Mental Health ──────────────────────────────────────────────────────────
  // Legacy cpt-codes.ts ordering preserved (90834 first) for stable suggestions.
  {
    code: '90834',
    serviceType: 'mental-health',
    shortName: 'Psychotherapy 45 min',
    description: 'Psychotherapy, 45 minutes with patient (38-52 minutes)',
    unit: 'per_session',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'intervention', 'progress', 'plan'],
    allowedModifiers: [
      { code: '95', when: 'telehealth' },
      { code: '33', when: 'preventive' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    defaultReimbursementCents: 10800,
    gtReimbursementCents: 10260, // GT = 95% of in-person in some plans
    typicalDuration: '38-52 min',
    billingTip:
      'Standard therapy session. Must document time, therapeutic technique, and patient response.',
  },
  {
    code: '90837',
    serviceType: 'mental-health',
    shortName: 'Psychotherapy 60 min',
    description: 'Psychotherapy, 60 minutes with patient (53+ minutes)',
    unit: 'per_session',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'intervention', 'progress', 'plan'],
    allowedModifiers: [
      { code: '95', when: 'telehealth' },
      { code: '33', when: 'preventive' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    defaultReimbursementCents: 14400,
    gtReimbursementCents: 13680, // GT = 95% of in-person in some plans
    typicalDuration: '53-60+ min',
    billingTip:
      'Extended session. Higher reimbursement — ensure documentation supports medical necessity.',
  },
  {
    code: '90846',
    serviceType: 'mental-health',
    shortName: 'Family Therapy (w/o patient)',
    description: 'Family psychotherapy (without the patient present), 50 minutes',
    unit: 'per_session',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'intervention', 'plan'],
    allowedModifiers: [{ code: '95', when: 'telehealth' }],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '50 min',
    billingTip:
      "Parent/caregiver session focused on child's treatment. Document family dynamics + impact.",
  },
  {
    code: '90847',
    serviceType: 'mental-health',
    shortName: 'Family Therapy (with patient)',
    description: 'Family psychotherapy (conjoint psychotherapy) with the patient present, 50 minutes',
    unit: 'per_session',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'intervention', 'plan'],
    allowedModifiers: [{ code: '95', when: 'telehealth' }],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '50 min',
    billingTip:
      'Child must be present for part of session. Document family interaction + child response.',
  },
  {
    code: '90832',
    serviceType: 'mental-health',
    shortName: 'Psychotherapy 30 min',
    description: 'Psychotherapy, 30 minutes with patient (16-37 minutes)',
    unit: 'per_session',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'intervention', 'plan'],
    allowedModifiers: [{ code: '95', when: 'telehealth' }],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '16-37 min',
    billingTip: 'Brief session or crisis check-in. Lower reimbursement — ensure accurate time.',
  },
  {
    code: '90791',
    serviceType: 'mental-health',
    shortName: 'Psychiatric Diagnostic Eval',
    description: 'Psychiatric diagnostic evaluation (intake, without medical services)',
    unit: 'per_session',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'standardized', 'progress', 'plan'],
    allowedModifiers: [],
    typicalDuration: '60-90 min',
    billingTip: 'Initial intake. Comprehensive biopsychosocial + DSM-5 diagnosis required.',
  },

  // ── Diagnostic / Psychological Testing ─────────────────────────────────────
  {
    code: '96130',
    serviceType: 'diagnostic',
    shortName: 'Psych Testing Eval (first hour)',
    description:
      'Psychological testing evaluation services by physician or other qualified health care professional, first hour',
    unit: 'per_hour',
    requiredProviderCredential: ['psychologist'],
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['reason', 'battery', 'behavioral_obs', 'scores', 'impressions', 'recommendations'],
    allowedModifiers: [],
    typicalDuration: 'First 60 min',
    billingTip: 'Face-to-face testing time with patient. Document test administered + scores.',
  },
  {
    code: '96131',
    serviceType: 'diagnostic',
    shortName: "Psych Testing Eval (add'l hour)",
    description:
      'Psychological testing evaluation services by physician or other qualified health care professional, each additional hour',
    unit: 'per_hour',
    requiredProviderCredential: ['psychologist'],
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['battery', 'scores'],
    allowedModifiers: [],
    typicalDuration: "Each add'l 60 min",
    billingTip: 'Add-on code. Track total face-to-face time carefully.',
  },
  {
    code: '96136',
    serviceType: 'diagnostic',
    shortName: 'Psych Test Admin (first 30 min)',
    description:
      'Psychological or neuropsychological test administration and scoring by physician or other qualified health care professional, two or more tests, first 30 minutes',
    unit: 'per_session', // first-30-minutes base code
    requiredProviderCredential: ['psychologist'],
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['battery', 'behavioral_obs'],
    allowedModifiers: [],
    typicalDuration: 'First 30 min',
    billingTip: 'Can be administered by tech under psychologist supervision. Document supervision.',
  },
  {
    code: '96112',
    serviceType: 'diagnostic',
    shortName: 'Developmental Testing (first hour)',
    description:
      'Developmental test administration by physician or other qualified health care professional, with interpretation and report, first hour',
    unit: 'per_hour',
    requiredProviderCredential: ['psychologist'],
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['reason', 'history', 'battery', 'scores', 'impressions'],
    allowedModifiers: [],
    typicalDuration: 'First 60 min',
    billingTip: 'For Bayley, Mullen, DAYC-2 etc. Requires qualified provider interpretation.',
  },

  // ── Developmental Pediatrics (E/M) ─────────────────────────────────────────
  {
    code: '99213',
    serviceType: 'dev-ped',
    shortName: 'Office Visit (Established, Low)',
    description:
      'Office or other outpatient visit for an established patient, low level of medical decision making, 20-29 minutes total time',
    unit: 'per_session',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'assessment', 'coordination'],
    allowedModifiers: [
      { code: '25', when: 'separate E/M' },
      { code: '95', when: 'telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '20-29 min total',
    billingTip: 'Time-based since 2021. Document total time including chart review + coordination.',
  },
  {
    code: '99214',
    serviceType: 'dev-ped',
    shortName: 'Office Visit (Established, Mod)',
    description:
      'Office or other outpatient visit for an established patient, moderate level of medical decision making, 30-39 minutes total time',
    unit: 'per_session',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'milestones', 'medications', 'assessment', 'coordination'],
    allowedModifiers: [
      { code: '25', when: 'separate E/M' },
      { code: '95', when: 'telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '30-39 min total',
    billingTip:
      'Most common dev ped follow-up. Document 2+ chronic conditions or medication management.',
  },
  {
    code: '99215',
    serviceType: 'dev-ped',
    shortName: 'Office Visit (Established, High)',
    description:
      'Office or other outpatient visit for an established patient, high level of medical decision making, 40-54 minutes total time',
    unit: 'per_session',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'milestones', 'exam', 'medications', 'assessment', 'coordination'],
    allowedModifiers: [
      { code: '25', when: 'separate E/M' },
      { code: '95', when: 'telehealth' },
    ],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '40-54 min total',
    billingTip: 'Complex visit. Requires high MDM or 40+ min total time. Document thoroughly.',
  },
  {
    code: '99205',
    serviceType: 'dev-ped',
    shortName: 'New Patient Visit (High)',
    description:
      'Office or other outpatient visit for a new patient, high level of medical decision making, 60-74 minutes total time',
    unit: 'per_session',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'milestones', 'exam', 'medications', 'assessment', 'coordination'],
    allowedModifiers: [{ code: '95', when: 'telehealth' }],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '60-74 min total',
    billingTip: 'Initial eval for new patients. Comprehensive history + exam required.',
  },

  // ── Remote monitoring ──────────────────────────────────────────────────────
  {
    code: '99458',
    serviceType: 'rtm',
    shortName: 'Remote Therapeutic Monitoring',
    description:
      "Remote therapeutic monitoring treatment management services, add'l 20 min",
    unit: 'per_session', // each additional 20-minute increment, billed monthly
    noteTemplate: 'progress',
    requiredFields: ['narrative'],
    allowedModifiers: [],
    typicalDuration: '20 min',
    billingTip: 'For asynchronous monitoring (e.g., reviewing parent-submitted data). Bill monthly.',
  },

  // ── Screeners ──────────────────────────────────────────────────────────────
  {
    code: '96127',
    serviceType: 'screener',
    shortName: 'Brief Behavioral Screener',
    description:
      'Brief emotional/behavioral assessment (eg, depression inventory, ADHD scale), with scoring and documentation, per standardized instrument',
    unit: 'per_instrument',
    maxUnitsPerDay: 4,
    defaultReimbursementCents: 500,
    typicalDuration: 'Per instrument (PHQ-9, GAD-7, SCARED, ...)',
    billingTip: 'Payers reimburse up to 4 units per patient per day. Bill per instrument scored.',
  },
  {
    code: '96110',
    serviceType: 'screener',
    shortName: 'Developmental Screening',
    description:
      'Developmental screening (eg, developmental milestone survey, speech and language delay screen), with scoring and documentation, per standardized instrument',
    unit: 'per_instrument',
    typicalDuration: 'Per instrument',
    billingTip: 'Screening-only code — a positive screen should route to 96112 developmental testing.',
  },

  // ── OT (referenced by SESSION_PRICING ot_session) ──────────────────────────
  {
    code: '97530',
    // Nearest bucket for OT until a dedicated 'ot' serviceType exists; keep the
    // CptServiceType union in sync with the task spec.
    serviceType: 'dev-ped',
    shortName: 'Therapeutic Activities (OT)',
    description:
      'Therapeutic activities, direct (one-on-one) patient contact (use of dynamic activities to improve functional performance), each 15 minutes',
    unit: 'per_15min',
    requiredProviderCredential: ['ot'],
    allowedModifiers: [{ code: '95', when: 'telehealth' }, { code: '59', when: 'distinct' }],
    telehealthModifier: '95',
    placeOfServiceTelehealth: '10',
    typicalDuration: '15 min units',
    billingTip: 'OT sensory/motor/daily-living skill work. Document activities and functional goals.',
  },
];

// ============================================================================
// Mutable working state (Supabase hydration overlays the seed at runtime)
// ============================================================================

const workingRules = new Map<string, CptRule>(CPT_RULES.map((r) => [r.code, { ...r }]));
let payerRateOverrides: PayerRateOverride[] = [];
let payerRateSource: PayerRateSource | undefined;

/**
 * Merge runtime overrides (e.g. rows from a future Supabase `cpt_rules` table)
 * into the working registry. Overrides are shallow-merged by `code`; unknown
 * codes are added as new rules (the row must then carry the full CptRule shape).
 */
export function hydrateCptRules(overrides: Partial<CptRule>[]): void {
  for (const override of overrides) {
    if (!override.code) continue;
    const existing = workingRules.get(override.code);
    if (existing) {
      workingRules.set(override.code, { ...existing, ...override });
    } else if (override.serviceType && override.shortName && override.description && override.unit) {
      workingRules.set(override.code, override as CptRule);
    }
  }
}

/** Replace the payer-specific rate overrides (future Supabase table hydration). */
export function hydratePayerRateOverrides(overrides: PayerRateOverride[]): void {
  payerRateOverrides = [...overrides];
}

/**
 * Register the payer rate-schedule lookup (payer-configs.ts calls this at module
 * load). Kept as a registration hook so this module never imports payer-configs
 * — resolveRateCents consults the source lazily at call time.
 */
export function registerPayerRateSource(source: PayerRateSource): void {
  payerRateSource = source;
}

/** Reset the registry to its compiled seed (test hygiene). */
export function resetCptRegistry(): void {
  workingRules.clear();
  for (const rule of CPT_RULES) workingRules.set(rule.code, { ...rule });
  payerRateOverrides = [];
}

// ============================================================================
// Queries
// ============================================================================

/** All rules in seed order (plus any hydrated additions, appended). */
export function listCptRules(): CptRule[] {
  return [...workingRules.values()];
}

export function getCptRule(code: string): CptRule | undefined {
  return workingRules.get(code);
}

export function getCptRulesForService(serviceType: CptServiceType): CptRule[] {
  return listCptRules().filter((r) => r.serviceType === serviceType);
}

export function listServiceTypes(): CptServiceType[] {
  const seen = new Set<CptServiceType>();
  for (const rule of workingRules.values()) seen.add(rule.serviceType);
  return [...seen];
}

export function maxUnitsPerDay(code: string): number | undefined {
  return getCptRule(code)?.maxUnitsPerDay;
}

/**
 * Resolve the per-unit rate in CENTS for a CPT code.
 *
 * Resolution order:
 *   1. Hydrated payer-specific overrides (Supabase `cpt_payer_rate_overrides`)
 *   2. The payer's contracted rateSchedule (payer-configs.ts, via the
 *      registered PayerRateSource)
 *   3. The rule's defaultReimbursementCents (estimated market rate)
 *
 * Returns undefined when nothing matches (unknown code with no payer rate).
 */
export function resolveRateCents(
  code: string,
  payerId?: string,
  modifier?: string,
): number | undefined {
  if (payerId) {
    const override = payerRateOverrides.find(
      (o) => o.payerId === payerId && o.code === code && (!modifier || !o.modifier || o.modifier === modifier),
    );
    if (override) return override.ratePerUnitCents;

    const scheduled = payerRateSource?.(payerId, code, modifier);
    if (scheduled !== undefined) return scheduled;
  }
  return getCptRule(code)?.defaultReimbursementCents;
}
