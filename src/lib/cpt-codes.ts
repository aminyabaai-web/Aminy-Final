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
 *
 * DATA SOURCE: this module is now a thin view over the configurable CPT rules
 * registry (src/lib/billing/cpt-registry.ts) — the single source of truth for
 * CPT code data. Only registry rules that carry a noteTemplate appear here
 * (i.e. codes the clinical note engine can document against).
 */

import { listCptRules, type CptRule, type CptServiceType } from './billing/cpt-registry';

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

/** Registry serviceType → legacy CPTCode category. */
const SERVICE_TO_CATEGORY: Record<CptServiceType, CPTCode['category']> = {
  'aba': 'aba',
  'slp': 'slp',
  'mental-health': 'mental-health',
  'diagnostic': 'diagnostic',
  'dev-ped': 'dev-ped',
  'rtm': 'telehealth',
  'screener': 'general',
  'caregiver-education': 'general',
};

function ruleToCPTCode(rule: CptRule): CPTCode {
  return {
    code: rule.code,
    shortName: rule.shortName,
    description: rule.description,
    category: SERVICE_TO_CATEGORY[rule.serviceType],
    noteTemplate: rule.noteTemplate ?? 'progress',
    requiredFields: rule.requiredFields ?? [],
    commonModifiers: (rule.allowedModifiers ?? []).map((m) =>
      m.when ? `${m.code} (${m.when})` : m.code,
    ),
    typicalDuration: rule.typicalDuration ?? '',
    billingTip: rule.billingTip ?? '',
  };
}

/**
 * Comprehensive CPT code registry for pediatric behavioral health.
 * Derived from CPT_RULES — rules without a noteTemplate (pure billing codes
 * like 96127, 0373T) are excluded because they have no note to document.
 */
export const CPT_CODES: CPTCode[] = listCptRules()
  .filter((rule) => rule.noteTemplate !== undefined)
  .map(ruleToCPTCode);

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
