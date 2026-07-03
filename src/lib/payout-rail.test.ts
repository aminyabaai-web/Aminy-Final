// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Two-rate insured rail + pilot expiry — resolvePayoutRail matrix and the
 * PLATFORM_FEE_RATES ↔ PLATFORM_TAKE_RATE drift guard for the new rail.
 */

import { describe, expect, it, vi } from 'vitest';

// stripe-connect.ts imports the browser Supabase client at module load; mock it
// so this suite stays pure (same pattern as src/test/outcome-trends.test.ts).
vi.mock('../utils/supabase/client', () => ({ supabase: {} }));

import { resolvePayoutRail } from './payout-rail';
import { PLATFORM_FEE_RATES, getPlatformFeeRate, calculateProviderAmount, type PayoutRail } from './stripe-connect';
import { PLATFORM_TAKE_RATE } from './telehealth-economics';

const NOW = new Date('2026-07-03T12:00:00Z');
const PAST = '2026-06-01T00:00:00Z';
const FUTURE = '2026-12-31T00:00:00Z';

describe('resolvePayoutRail — two-rate insured rail + pilot expiry', () => {
  describe('sourcing split (insured rail only)', () => {
    it('insured + aminy_marketplace → insured_aminy_sourced (20%)', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured', clientSource: 'aminy_marketplace', now: NOW }),
      ).toBe('insured_aminy_sourced');
    });

    it('insured + provider_sourced stays insured (10%)', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured', clientSource: 'provider_sourced', now: NOW }),
      ).toBe('insured');
    });

    it('insured with unknown source (null/undefined) stays insured — legacy rows default to provider-sourced', () => {
      expect(resolvePayoutRail({ baseRail: 'insured', clientSource: null, now: NOW })).toBe('insured');
      expect(resolvePayoutRail({ baseRail: 'insured', now: NOW })).toBe('insured');
    });

    it('cash_pay is NEVER affected by sourcing', () => {
      expect(
        resolvePayoutRail({ baseRail: 'cash_pay', clientSource: 'aminy_marketplace', now: NOW }),
      ).toBe('cash_pay');
      expect(
        resolvePayoutRail({ baseRail: 'cash_pay', clientSource: 'provider_sourced', now: NOW }),
      ).toBe('cash_pay');
    });

    it('an already-sourced base rail passes through unchanged', () => {
      expect(
        resolvePayoutRail({ baseRail: 'insured_aminy_sourced', clientSource: 'provider_sourced', now: NOW }),
      ).toBe('insured_aminy_sourced');
    });
  });

  describe('pilot expiry (aact_pilot → insured after organizations.pilot_ends_at)', () => {
    it('aact_pilot with NO expiry (null/undefined) stays 5% — no default date', () => {
      expect(resolvePayoutRail({ baseRail: 'aact_pilot', pilotEndsAt: null, now: NOW })).toBe('aact_pilot');
      expect(resolvePayoutRail({ baseRail: 'aact_pilot', now: NOW })).toBe('aact_pilot');
    });

    it('aact_pilot with a FUTURE expiry stays 5%', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', pilotEndsAt: FUTURE, now: NOW }),
      ).toBe('aact_pilot');
    });

    it('aact_pilot with a PAST expiry resolves to standard insured', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', pilotEndsAt: PAST, now: NOW }),
      ).toBe('insured');
    });

    it('expiry at exactly `now` counts as expired', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', pilotEndsAt: NOW.toISOString(), now: NOW }),
      ).toBe('insured');
    });

    it('an unparseable expiry is treated as no expiry (fails toward the contracted discount)', () => {
      expect(
        resolvePayoutRail({ baseRail: 'aact_pilot', pilotEndsAt: 'not-a-date', now: NOW }),
      ).toBe('aact_pilot');
    });

    it('ACTIVE pilot ignores sourcing — marketplace-sourced client pre-expiry stays 5%', () => {
      expect(
        resolvePayoutRail({
          baseRail: 'aact_pilot',
          clientSource: 'aminy_marketplace',
          pilotEndsAt: FUTURE,
          now: NOW,
        }),
      ).toBe('aact_pilot');
    });

    it('EXPIRED pilot then applies the sourcing rule — marketplace-sourced → insured_aminy_sourced', () => {
      expect(
        resolvePayoutRail({
          baseRail: 'aact_pilot',
          clientSource: 'aminy_marketplace',
          pilotEndsAt: PAST,
          now: NOW,
        }),
      ).toBe('insured_aminy_sourced');
    });

    it('EXPIRED pilot with a provider-sourced client → standard insured', () => {
      expect(
        resolvePayoutRail({
          baseRail: 'aact_pilot',
          clientSource: 'provider_sourced',
          pilotEndsAt: PAST,
          now: NOW,
        }),
      ).toBe('insured');
    });

    it('pilotEndsAt on a non-pilot base rail is ignored', () => {
      expect(resolvePayoutRail({ baseRail: 'insured', pilotEndsAt: PAST, now: NOW })).toBe('insured');
      expect(resolvePayoutRail({ baseRail: 'cash_pay', pilotEndsAt: PAST, now: NOW })).toBe('cash_pay');
    });
  });

  it('is pure — same input, same output, input object not mutated', () => {
    const input = { baseRail: 'insured' as PayoutRail, clientSource: 'aminy_marketplace' as const, now: NOW };
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

  it('fee-disclosure copy derivation: the new rail renders as 20% fee / keep 80%', () => {
    // ProviderPayoutSetup derives its rows via pct(rate) = round(rate*100)+'%'.
    const pct = (rate: number) => `${Math.round(rate * 100)}%`;
    expect(pct(PLATFORM_FEE_RATES.insured_aminy_sourced)).toBe('20%');
    expect(pct(1 - PLATFORM_FEE_RATES.insured_aminy_sourced)).toBe('80%');
    expect(pct(PLATFORM_FEE_RATES.insured)).toBe('10%');
  });

  it('payout math on the new rail: $200 insured Aminy-sourced session → provider $160 / platform $40', () => {
    expect(getPlatformFeeRate('insured_aminy_sourced')).toBe(0.2);
    const r = calculateProviderAmount(20000, 'insured_aminy_sourced');
    expect(r.platformFeeCents).toBe(4000);
    expect(r.providerCents).toBe(16000);
  });
});
