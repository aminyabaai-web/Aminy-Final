// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Sourcing-based insured rates — resolvePayoutRail matrix and the
 * PLATFORM_FEE_RATES ↔ PLATFORM_TAKE_RATE drift guard for the new rail.
 */

import { describe, expect, it, vi } from 'vitest';

// stripe-connect.ts imports the browser Supabase client at module load; mock it
// so this suite stays pure (same pattern as src/test/outcome-trends.test.ts).
vi.mock('../utils/supabase/client', () => ({ supabase: {} }));

import { resolvePayoutRail } from './payout-rail';
import { PLATFORM_FEE_RATES, getPlatformFeeRate, calculateProviderAmount, type PayoutRail } from './stripe-connect';
import { PLATFORM_TAKE_RATE } from './telehealth-economics';

describe('resolvePayoutRail — insured take is purely sourcing-based, permanently', () => {
  describe("clientSource === 'aminy_marketplace' → insured_aminy_sourced (20%)", () => {
    it('bumps a standard insured base rail', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured', clientSource: 'aminy_marketplace' }),
      ).toBe('insured_aminy_sourced');
    });

    it('OVERRIDES an aact_pilot base rail — an AACT-affiliated provider serving an Aminy-sourced client pays 20%', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', clientSource: 'aminy_marketplace' }),
      ).toBe('insured_aminy_sourced');
    });

    it('passes an already-sourced base rail through', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured_aminy_sourced', clientSource: 'aminy_marketplace' }),
      ).toBe('insured_aminy_sourced');
    });
  });

  describe("clientSource === 'partner_org' → aact_pilot (5%), forever — no expiry step-up", () => {
    it('routes an insured base rail to the 5% partner rail', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured', clientSource: 'partner_org' }),
      ).toBe('aact_pilot');
    });

    it('keeps an aact_pilot base rail at 5%', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', clientSource: 'partner_org' }),
      ).toBe('aact_pilot');
    });
  });

  describe("provider's own insured client (provider_sourced / null) → base rail unchanged", () => {
    it('insured stays insured (10%) when the provider brought the client', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured', clientSource: 'provider_sourced' }),
      ).toBe('insured');
    });

    it('null/undefined source (legacy rows) leaves the base rail unchanged', () => {
      expect(resolvePayoutRail({ baseRail: 'insured', clientSource: null })).toBe('insured');
      expect(resolvePayoutRail({ baseRail: 'insured' })).toBe('insured');
      expect(resolvePayoutRail({ baseRail: 'aact_pilot', clientSource: null })).toBe('aact_pilot');
      expect(resolvePayoutRail({ baseRail: 'aact_pilot' })).toBe('aact_pilot');
    });

    it('provider_sourced on an aact_pilot base rail leaves it at the partner rail', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', clientSource: 'provider_sourced' }),
      ).toBe('aact_pilot');
    });
  });

  describe('cash_pay (25%) is a payment-method rail — NEVER re-routed by sourcing', () => {
    it.each(['aminy_marketplace', 'partner_org', 'provider_sourced'] as const)(
      'cash_pay + %s stays cash_pay',
      (source) => {
        expect(resolvePayoutRail({ baseRail: 'cash_pay', clientSource: source })).toBe('cash_pay');
      },
    );

    it('cash_pay with no source stays cash_pay', () => {
      expect(resolvePayoutRail({ baseRail: 'cash_pay' })).toBe('cash_pay');
    });
  });

  it('is pure — same input, same output, input object not mutated', () => {
    const input = { baseRail: 'insured' as PayoutRail, clientSource: 'aminy_marketplace' as const };
    const a = resolvePayoutRail(input);
    const b = resolvePayoutRail(input);
    expect(a).toBe(b);
    expect(input.baseRail).toBe('insured');
  });
});

describe('drift guard: PLATFORM_FEE_RATES ↔ PLATFORM_TAKE_RATE', () => {
  it('every payout rail maps exactly onto the canonical take rate', () => {
    expect(PLATFORM_FEE_RATES.cash_pay).toBe(PLATFORM_TAKE_RATE.cashPay);
    expect(PLATFORM_FEE_RATES.insured).toBe(PLATFORM_TAKE_RATE.insured);
    expect(PLATFORM_FEE_RATES.insured_aminy_sourced).toBe(PLATFORM_TAKE_RATE.insuredAminySourced);
    expect(PLATFORM_FEE_RATES.aact_pilot).toBe(PLATFORM_TAKE_RATE.aactPilot);
    // Exactly the four rails — a new rail must be added to BOTH tables + here.
    expect(Object.keys(PLATFORM_FEE_RATES).sort()).toEqual(
      ['aact_pilot', 'cash_pay', 'insured', 'insured_aminy_sourced'],
    );
  });

  it('fee-disclosure copy derivation: partner 5% / own insured 10% (keep 90%) / Aminy-sourced 20% (keep 80%)', () => {
    // ProviderPayoutSetup derives its rows via pct(rate) = round(rate*100)+'%'.
    const pct = (rate: number) => `${Math.round(rate * 100)}%`;
    expect(pct(PLATFORM_FEE_RATES.aact_pilot)).toBe('5%');
    expect(pct(PLATFORM_FEE_RATES.insured)).toBe('10%');
    expect(pct(1 - PLATFORM_FEE_RATES.insured)).toBe('90%');
    expect(pct(PLATFORM_FEE_RATES.insured_aminy_sourced)).toBe('20%');
    expect(pct(1 - PLATFORM_FEE_RATES.insured_aminy_sourced)).toBe('80%');
  });

  it('payout math on the new rail: $200 insured Aminy-sourced session → provider $160 / platform $40', () => {
    expect(getPlatformFeeRate('insured_aminy_sourced')).toBe(0.2);
    const r = calculateProviderAmount(20000, 'insured_aminy_sourced');
    expect(r.platformFeeCents).toBe(4000);
    expect(r.providerCents).toBe(16000);
  });
});
