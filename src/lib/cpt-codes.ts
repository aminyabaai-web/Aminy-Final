// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * cpt-codes.ts
 *
 * AI-powered CPT code selection engine for clinical notes.
 * Maps CPT codes → recommended note templates, required documentation,
 * and billing guidance. Covers ABA, SLP, Mental Health, Diagnostic, and Dev Ped.
 *
 * The AI layer suggests CPT codes based on session context and auto-selects
 * the matching note template so providers don't have to think about it.
 */

export interface CPTCode {
  code: string;
  shortName: string;
  description: string;
  category: 'aba' | 'slp' | 'mental-health' | 'diagnostic' | 'dev-ped' | 'telehealth' | 'general';
  noteTemplate: string; // maps to NoteType in ProviderPortal
  requiredFields: string[]; // field keys that MUST be filled for billing
  commonModifiers: string[];
  typicalDuration: string; // e.g., "15 min units" or "53-60 min"
  billingTip: string;
}

/**
 * Comprehensive CPT code registry for pediatric behavioral health
 */
export const CPT_CODES: CPTCode[] = [
  // ── ABA / Behavior Analysis ──────────────────────────────
  {
    code: '97151',
    shortName: 'ABA Assessment',
    description: 'Behavior identification assessment by qualified healthcare professional',
    category: 'aba',
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    commonModifiers: ['HN', '95 (telehealth)'],
    typicalDuration: '15 min units (up to 24 units)',
    billingTip: 'Requires BCBA. Document direct observation + caregiver interview.',
  },
  {
    code: '97153',
    shortName: 'ABA Direct (RBT)',
    description: 'Adaptive behavior treatment by technician (RBT), 1:1',
    category: 'aba',
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'trials', 'prompting', 'data'],
    commonModifiers: ['HN', '95', 'GT'],
    typicalDuration: '15 min units',
    billingTip: 'Most common ABA code. Must document specific targets, trial data, and prompting levels per unit.',
  },
  {
    code: '97155',
    shortName: 'ABA Protocol Modification',
    description: 'Adaptive behavior treatment with protocol modification by BCBA',
    category: 'aba',
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    commonModifiers: ['HN', '95'],
    typicalDuration: '15 min units',
    billingTip: 'BCBA only. Document what protocols were modified and clinical rationale.',
  },
  {
    code: '97156',
    shortName: 'ABA Family Guidance',
    description: 'Family adaptive behavior treatment guidance by BCBA',
    category: 'aba',
    noteTemplate: 'soap',
    requiredFields: ['subjective', 'objective', 'plan'],
    commonModifiers: ['HN', '95', 'GT'],
    typicalDuration: '15 min units',
    billingTip: 'Caregiver must be present. Document parent training goals + carryover strategies.',
  },
  {
    code: '97158',
    shortName: 'ABA Group (BCBA)',
    description: 'Group adaptive behavior treatment with protocol modification',
    category: 'aba',
    noteTemplate: 'aba-session',
    requiredFields: ['targets', 'data'],
    commonModifiers: ['HN', 'HQ (group)'],
    typicalDuration: '15 min units',
    billingTip: 'Max 8 clients per group. Each client needs individual documentation.',
  },

  // ── Speech-Language Pathology ─────────────────────────────
  {
    code: '92507',
    shortName: 'SLP Treatment',
    description: 'Treatment of speech, language, voice, communication, auditory processing',
    category: 'slp',
    noteTemplate: 'slp-session',
    requiredFields: ['articulation', 'language', 'plan'],
    commonModifiers: ['95 (telehealth)', '59 (distinct)'],
    typicalDuration: '30-60 min session',
    billingTip: 'Most common SLP code. Document targets addressed, accuracy %, and home program.',
  },
  {
    code: '92521',
    shortName: 'Fluency Evaluation',
    description: 'Evaluation of speech fluency (stuttering)',
    category: 'slp',
    noteTemplate: 'slp-session',
    requiredFields: ['fluency_voice', 'plan'],
    commonModifiers: [],
    typicalDuration: '45-90 min evaluation',
    billingTip: 'One-time eval. Document dysfluency type, frequency, severity rating.',
  },
  {
    code: '92522',
    shortName: 'Speech Sound Eval',
    description: 'Evaluation of speech sound production',
    category: 'slp',
    noteTemplate: 'slp-session',
    requiredFields: ['articulation', 'oral_motor', 'plan'],
    commonModifiers: [],
    typicalDuration: '45-90 min evaluation',
    billingTip: 'Evaluation code — document standardized test scores, stimulability, error patterns.',
  },
  {
    code: '92523',
    shortName: 'Speech + Language Eval',
    description: 'Evaluation of speech sound production with language assessment',
    category: 'slp',
    noteTemplate: 'slp-session',
    requiredFields: ['articulation', 'language', 'oral_motor', 'plan'],
    commonModifiers: [],
    typicalDuration: '60-120 min evaluation',
    billingTip: 'Comprehensive eval. Include both artic + language standardized measures.',
  },
  {
    code: '92526',
    shortName: 'Oral Function Therapy',
    description: 'Treatment of swallowing dysfunction and/or oral function',
    category: 'slp',
    noteTemplate: 'slp-session',
    requiredFields: ['oral_motor', 'plan'],
    commonModifiers: [],
    typicalDuration: '30-60 min session',
    billingTip: 'Document oral motor exercises, feeding trials, texture progression.',
  },

  // ── Mental Health ─────────────────────────────────────────
  {
    code: '90834',
    shortName: 'Psychotherapy 45 min',
    description: 'Individual psychotherapy, 38-52 minutes',
    category: 'mental-health',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'intervention', 'progress', 'plan'],
    commonModifiers: ['95 (telehealth)', '33 (preventive)'],
    typicalDuration: '38-52 min',
    billingTip: 'Standard therapy session. Must document time, therapeutic technique, and patient response.',
  },
  {
    code: '90837',
    shortName: 'Psychotherapy 60 min',
    description: 'Individual psychotherapy, 53+ minutes',
    category: 'mental-health',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'intervention', 'progress', 'plan'],
    commonModifiers: ['95', '33'],
    typicalDuration: '53-60+ min',
    billingTip: 'Extended session. Higher reimbursement — ensure documentation supports medical necessity.',
  },
  {
    code: '90846',
    shortName: 'Family Therapy (w/o patient)',
    description: 'Family psychotherapy without the patient present',
    category: 'mental-health',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'intervention', 'plan'],
    commonModifiers: ['95'],
    typicalDuration: '50 min',
    billingTip: 'Parent/caregiver session focused on child\'s treatment. Document family dynamics + impact.',
  },
  {
    code: '90847',
    shortName: 'Family Therapy (with patient)',
    description: 'Family psychotherapy with patient present',
    category: 'mental-health',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'intervention', 'plan'],
    commonModifiers: ['95'],
    typicalDuration: '50 min',
    billingTip: 'Child must be present for part of session. Document family interaction + child response.',
  },
  {
    code: '90832',
    shortName: 'Psychotherapy 30 min',
    description: 'Individual psychotherapy, 16-37 minutes',
    category: 'mental-health',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'intervention', 'plan'],
    commonModifiers: ['95'],
    typicalDuration: '16-37 min',
    billingTip: 'Brief session or crisis check-in. Lower reimbursement — ensure accurate time.',
  },
  {
    code: '90791',
    shortName: 'Psychiatric Diagnostic Eval',
    description: 'Psychiatric diagnostic evaluation (intake)',
    category: 'mental-health',
    noteTemplate: 'mental-health',
    requiredFields: ['presenting', 'risk_assessment', 'standardized', 'progress', 'plan'],
    commonModifiers: [],
    typicalDuration: '60-90 min',
    billingTip: 'Initial intake. Comprehensive biopsychosocial + DSM-5 diagnosis required.',
  },

  // ── Diagnostic / Psychological Testing ────────────────────
  {
    code: '96130',
    shortName: 'Psych Testing Eval (first hour)',
    description: 'Psychological testing evaluation services, first hour (face-to-face)',
    category: 'diagnostic',
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['reason', 'battery', 'behavioral_obs', 'scores', 'impressions', 'recommendations'],
    commonModifiers: [],
    typicalDuration: 'First 60 min',
    billingTip: 'Face-to-face testing time with patient. Document test administered + scores.',
  },
  {
    code: '96131',
    shortName: 'Psych Testing Eval (add\'l hour)',
    description: 'Psychological testing evaluation services, each additional hour',
    category: 'diagnostic',
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['battery', 'scores'],
    commonModifiers: [],
    typicalDuration: 'Each add\'l 60 min',
    billingTip: 'Add-on code. Track total face-to-face time carefully.',
  },
  {
    code: '96136',
    shortName: 'Psych Test Admin (first 30 min)',
    description: 'Psychological or neuropsychological test administration, first 30 min',
    category: 'diagnostic',
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['battery', 'behavioral_obs'],
    commonModifiers: [],
    typicalDuration: 'First 30 min',
    billingTip: 'Can be administered by tech under psychologist supervision. Document supervision.',
  },
  {
    code: '96112',
    shortName: 'Developmental Testing (first hour)',
    description: 'Developmental test administration with interpretation, first hour',
    category: 'diagnostic',
    noteTemplate: 'diagnostic-eval',
    requiredFields: ['reason', 'history', 'battery', 'scores', 'impressions'],
    commonModifiers: [],
    typicalDuration: 'First 60 min',
    billingTip: 'For Bayley, Mullen, DAYC-2 etc. Requires qualified provider interpretation.',
  },

  // ── Developmental Pediatrics ──────────────────────────────
  {
    code: '99213',
    shortName: 'Office Visit (Established, Low)',
    description: 'Established patient office visit, low complexity',
    category: 'dev-ped',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'assessment', 'coordination'],
    commonModifiers: ['25 (separate E/M)', '95 (telehealth)'],
    typicalDuration: '20-29 min total',
    billingTip: 'Time-based since 2021. Document total time including chart review + coordination.',
  },
  {
    code: '99214',
    shortName: 'Office Visit (Established, Mod)',
    description: 'Established patient office visit, moderate complexity',
    category: 'dev-ped',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'milestones', 'medications', 'assessment', 'coordination'],
    commonModifiers: ['25', '95'],
    typicalDuration: '30-39 min total',
    billingTip: 'Most common dev ped follow-up. Document 2+ chronic conditions or medication management.',
  },
  {
    code: '99215',
    shortName: 'Office Visit (Established, High)',
    description: 'Established patient office visit, high complexity',
    category: 'dev-ped',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'milestones', 'exam', 'medications', 'assessment', 'coordination'],
    commonModifiers: ['25', '95'],
    typicalDuration: '40-54 min total',
    billingTip: 'Complex visit. Requires high MDM or 40+ min total time. Document thoroughly.',
  },
  {
    code: '99205',
    shortName: 'New Patient Visit (High)',
    description: 'New patient office visit, high complexity',
    category: 'dev-ped',
    noteTemplate: 'dev-ped',
    requiredFields: ['chief_complaint', 'milestones', 'exam', 'medications', 'assessment', 'coordination'],
    commonModifiers: ['95'],
    typicalDuration: '60-74 min total',
    billingTip: 'Initial eval for new patients. Comprehensive history + exam required.',
  },

  // ── Telehealth Add-on ─────────────────────────────────────
  {
    code: '99458',
    shortName: 'Remote Therapeutic Monitoring',
    description: 'Remote therapeutic monitoring treatment management services, add\'l 20 min',
    category: 'telehealth',
    noteTemplate: 'progress',
    requiredFields: ['narrative'],
    commonModifiers: [],
    typicalDuration: '20 min',
    billingTip: 'For asynchronous monitoring (e.g., reviewing parent-submitted data). Bill monthly.',
  },
];

/**
 * Get CPT codes filtered by category
 */
export function getCPTsByCategory(category: CPTCode['category']): CPTCode[] {
  return CPT_CODES.filter(c => c.category === category);
}

/**
 * Get CPT code by code string
 */
export function getCPTByCode(code: string): CPTCode | undefined {
  return CPT_CODES.find(c => c.code === code);
}

/**
 * AI-powered CPT suggestion based on session context
 * Returns top 3 most likely CPT codes ranked by relevance
 */
export function suggestCPTCodes(context: {
  providerType?: 'bcba' | 'rbt' | 'slp' | 'psychologist' | 'therapist' | 'dev-ped';
  sessionType?: 'individual' | 'family' | 'group' | 'evaluation' | 'follow-up';
  duration?: number; // minutes
  isTelemedicine?: boolean;
}): CPTCode[] {
  const { providerType, sessionType, duration, isTelemedicine } = context;

  // Map provider type to category
  const categoryMap: Record<string, CPTCode['category'][]> = {
    'bcba': ['aba'],
    'rbt': ['aba'],
    'slp': ['slp'],
    'psychologist': ['diagnostic', 'mental-health'],
    'therapist': ['mental-health'],
    'dev-ped': ['dev-ped'],
  };

  let candidates = providerType
    ? CPT_CODES.filter(c => categoryMap[providerType]?.includes(c.category))
    : [...CPT_CODES];

  // Filter by session type
  if (sessionType === 'evaluation') {
    candidates = candidates.filter(c =>
      c.shortName.toLowerCase().includes('eval') ||
      c.shortName.toLowerCase().includes('assessment') ||
      c.shortName.toLowerCase().includes('diagnostic') ||
      c.shortName.toLowerCase().includes('new patient')
    );
  } else if (sessionType === 'family') {
    candidates = candidates.filter(c =>
      c.shortName.toLowerCase().includes('family') ||
      c.shortName.toLowerCase().includes('guidance') ||
      c.description.toLowerCase().includes('family')
    );
  } else if (sessionType === 'group') {
    candidates = candidates.filter(c =>
      c.shortName.toLowerCase().includes('group')
    );
  }

  // Score by duration match
  if (duration) {
    candidates = candidates.map(c => {
      let score = 0;
      if (c.category === 'mental-health') {
        if (duration <= 37 && c.code === '90832') score = 10;
        else if (duration >= 38 && duration <= 52 && c.code === '90834') score = 10;
        else if (duration >= 53 && c.code === '90837') score = 10;
      }
      if (c.category === 'aba') {
        // ABA uses 15-min units, so any duration works for 97153
        if (providerType === 'rbt') score = c.code === '97153' ? 10 : 2;
        if (providerType === 'bcba') score = c.code === '97155' ? 8 : 5;
      }
      return { ...c, _score: score };
    }).sort((a, b) => (b as { _score: number })._score - (a as { _score: number })._score);
  }

  // Return top 3
  return candidates.slice(0, 3);
}

/**
 * Check if a note has all required fields for a CPT code
 * Returns missing fields for billing compliance
 */
export function validateNoteForCPT(
  cptCode: string,
  noteContent: Record<string, string>
): { valid: boolean; missingFields: string[]; warnings: string[] } {
  const cpt = getCPTByCode(cptCode);
  if (!cpt) return { valid: false, missingFields: [], warnings: ['Unknown CPT code'] };

  const missingFields = cpt.requiredFields.filter(f => !noteContent[f]?.trim());
  const warnings: string[] = [];

  // Add billing-specific warnings
  if (cpt.category === 'aba' && !noteContent.trials?.trim()) {
    warnings.push('Trial-by-trial data strongly recommended for ABA billing compliance');
  }
  if (cpt.category === 'mental-health' && !noteContent.risk_assessment?.trim()) {
    warnings.push('Safety/risk assessment recommended for every MH session');
  }
  if (cpt.code === '97156' && !noteContent.subjective?.includes('caregiver')) {
    warnings.push('Document caregiver presence — required for family guidance code');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}
