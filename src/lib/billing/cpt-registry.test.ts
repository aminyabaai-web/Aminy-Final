// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { afterEach, describe, expect, it } from 'vitest';
import {
  CPT_RULES,
  getCptRule,
  getCptRulesForService,
  hydrateCptRules,
  hydratePayerRateOverrides,
  listCptRules,
  listServiceTypes,
  maxUnitsPerDay,
  resetCptRegistry,
  resolveRateCents,
} from './cpt-registry';
// Importing payer-configs also registers its rate schedule as the registry's
// PayerRateSource (module side effect) — required for resolveRateCents fallback.
import { ABA_CPT_CODES, PAYER_CONFIGS } from '../insurance/payer-configs';
import { SESSION_PRICING, splitCptCodes } from '../pricing';
import { ESTIMATED_REIMBURSEMENT_CENTS } from '../telehealth-economics';
import { CPT_CODES } from '../cpt-codes';

afterEach(() => {
  resetCptRegistry();
});

describe('cpt-registry — single source of truth', () => {
  it('has no duplicate codes in the seed', () => {
    const codes = CPT_RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  // (a) every code referenced by payer-configs rateSchedules exists in the registry
  it('covers every CPT code referenced by any payer rateSchedule', () => {
    const missing: string[] = [];
    for (const payer of PAYER_CONFIGS) {
      for (const entry of payer.rateSchedule) {
        if (!getCptRule(entry.cptCode)) missing.push(`${payer.id}:${entry.cptCode}`);
      }
    }
    expect(missing).toEqual([]);
  });

  // (b) every SESSION_PRICING cptCode resolves (incl. multi-code strings)
  it('covers every CPT code referenced by SESSION_PRICING (splitting multi-code strings)', () => {
    const missing: string[] = [];
    for (const session of Object.values(SESSION_PRICING)) {
      for (const code of splitCptCodes(session.cptCode)) {
        if (!getCptRule(code)) missing.push(`${session.id}:${code}`);
      }
    }
    expect(missing).toEqual([]);
  });

  // (c) resolveRateCents: payer override > payer rateSchedule > default
  describe('resolveRateCents resolution order', () => {
    it('a hydrated payer override beats the payer rate schedule and the default', () => {
      // Baseline: UHC schedules 97153/HN at $16.50/unit.
      expect(resolveRateCents('97153', 'uhc', 'HN')).toBe(1650);
      // Default (no payer): estimated market rate.
      expect(resolveRateCents('97153')).toBe(3200);

      hydratePayerRateOverrides([
        { payerId: 'uhc', code: '97153', modifier: 'HN', ratePerUnitCents: 1725, effectiveDate: '2026-07-01' },
      ]);

      expect(resolveRateCents('97153', 'uhc', 'HN')).toBe(1725);
      // Other payers are unaffected by the uhc override.
      expect(resolveRateCents('97153', 'aetna', 'HN')).toBe(1500);
    });

    it('falls back from payer rate schedule to defaultReimbursementCents', () => {
      // 90834 has no entry in any payer rateSchedule → default estimated rate.
      expect(resolveRateCents('90834', 'uhc')).toBe(10800);
      // Unknown code with no default → undefined.
      expect(resolveRateCents('99999', 'uhc')).toBeUndefined();
    });
  });

  // (d) previously-missing codes now exist, with correct serviceType
  describe('previously-missing codes', () => {
    it.each([
      ['97152', 'aba'],
      ['97154', 'aba'],
      ['97157', 'aba'],
      ['98970', 'caregiver-education'],
      ['98971', 'caregiver-education'],
      ['98972', 'caregiver-education'],
    ] as const)('%s exists with serviceType %s', (code, serviceType) => {
      const rule = getCptRule(code);
      expect(rule).toBeDefined();
      expect(rule?.serviceType).toBe(serviceType);
    });

    it('keeps clinically-correct units on the new codes', () => {
      expect(getCptRule('97152')?.unit).toBe('per_15min');
      expect(getCptRule('97154')?.unit).toBe('per_15min');
      expect(getCptRule('97157')?.unit).toBe('per_15min');
      // 98970-98972 bill once per 7-day cumulative episode.
      expect(getCptRule('98970')?.unit).toBe('per_session');
      expect(getCptRule('98972')?.unit).toBe('per_session');
    });
  });

  // (e) regression guard — ESTIMATED_REIMBURSEMENT_CENTS unchanged for the original 8
  it('preserves the original 8 ESTIMATED_REIMBURSEMENT_CENTS values exactly', () => {
    expect(ESTIMATED_REIMBURSEMENT_CENTS['97151']).toEqual({ inPerson: 4800, modifier95: 4800, modifierGT: 4800 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['97153']).toEqual({ inPerson: 3200, modifier95: 3200, modifierGT: 3200 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['97155']).toEqual({ inPerson: 5600, modifier95: 5600, modifierGT: 5600 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['97156']).toEqual({ inPerson: 5200, modifier95: 5200, modifierGT: 5200 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['90834']).toEqual({ inPerson: 10800, modifier95: 10800, modifierGT: 10260 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['90837']).toEqual({ inPerson: 14400, modifier95: 14400, modifierGT: 13680 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['92507']).toEqual({ inPerson: 7200, modifier95: 7200, modifierGT: 7200 });
    expect(ESTIMATED_REIMBURSEMENT_CENTS['96127']).toEqual({ inPerson: 500, modifier95: 500, modifierGT: 500 });
    // and no other codes crept in (calculateTelehealthMargin behavior guard)
    expect(Object.keys(ESTIMATED_REIMBURSEMENT_CENTS).sort()).toEqual(
      ['90834', '90837', '92507', '96127', '97151', '97153', '97155', '97156'].sort(),
    );
  });

  describe('derived consumers stay consistent', () => {
    it('payer-configs ABA_CPT_CODES derives the full 97151-97158 family from the registry', () => {
      const codes = ABA_CPT_CODES.map((c) => c.code);
      expect(codes).toEqual([
        '97151', '97152', '97153', '97154', '97155', '97156', '97157', '97158', '0373T', '0362T',
      ]);
      // Every derived entry mirrors a registry rule.
      for (const config of ABA_CPT_CODES) {
        const rule = getCptRule(config.code);
        expect(rule?.serviceType).toBe('aba');
        expect(config.description).toBe(rule?.description);
        expect(config.maxUnitsPerDay).toBe(rule?.maxUnitsPerDay);
      }
    });

    it('cpt-codes.ts CPT_CODES derives from the registry incl. the new codes', () => {
      const byCode = new Map(CPT_CODES.map((c) => [c.code, c]));
      for (const code of ['97152', '97154', '97157', '98970', '98971', '98972']) {
        expect(byCode.has(code)).toBe(true);
      }
      // Every CPT_CODES entry must exist in the registry with matching shortName.
      for (const cpt of CPT_CODES) {
        expect(getCptRule(cpt.code)?.shortName).toBe(cpt.shortName);
      }
    });
  });

  describe('query helpers', () => {
    it('getCptRulesForService filters by service type', () => {
      const aba = getCptRulesForService('aba');
      expect(aba.length).toBeGreaterThanOrEqual(10);
      expect(aba.every((r) => r.serviceType === 'aba')).toBe(true);
      const slp = getCptRulesForService('slp').map((r) => r.code);
      expect(slp).toEqual(['92507', '92521', '92522', '92523', '92526']);
    });

    it('listServiceTypes returns every seeded service type', () => {
      expect(listServiceTypes().sort()).toEqual(
        ['aba', 'caregiver-education', 'dev-ped', 'diagnostic', 'mental-health', 'rtm', 'screener', 'slp'].sort(),
      );
    });

    it('maxUnitsPerDay exposes payer daily caps', () => {
      expect(maxUnitsPerDay('96127')).toBe(4);
      expect(maxUnitsPerDay('97153')).toBe(32);
      expect(maxUnitsPerDay('97156')).toBe(16);
      expect(maxUnitsPerDay('92507')).toBeUndefined();
    });
  });

  describe('hydration (future Supabase override path)', () => {
    it('hydrateCptRules shallow-merges overrides by code', () => {
      hydrateCptRules([{ code: '97153', maxUnitsPerDay: 24, defaultReimbursementCents: 3400 }]);
      const rule = getCptRule('97153');
      expect(rule?.maxUnitsPerDay).toBe(24);
      expect(rule?.defaultReimbursementCents).toBe(3400);
      // untouched fields survive the merge
      expect(rule?.serviceType).toBe('aba');
      expect(rule?.shortName).toBe('ABA Direct (RBT)');
      expect(resolveRateCents('97153')).toBe(3400);
    });

    it('hydrateCptRules can add a brand-new fully-specified rule', () => {
      hydrateCptRules([
        {
          code: '90853',
          serviceType: 'mental-health',
          shortName: 'Group Psychotherapy',
          description: 'Group psychotherapy (other than of a multiple-family group)',
          unit: 'per_session',
        },
      ]);
      expect(getCptRule('90853')?.serviceType).toBe('mental-health');
      expect(listCptRules().some((r) => r.code === '90853')).toBe(true);
    });

    it('resetCptRegistry restores the compiled seed', () => {
      hydrateCptRules([{ code: '97153', maxUnitsPerDay: 1 }]);
      hydratePayerRateOverrides([
        { payerId: 'uhc', code: '97153', ratePerUnitCents: 1, effectiveDate: '2026-01-01' },
      ]);
      resetCptRegistry();
      expect(getCptRule('97153')?.maxUnitsPerDay).toBe(32);
      expect(resolveRateCents('97153', 'uhc', 'HN')).toBe(1650);
    });
  });
});
