// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TIER-CONFIG CONSISTENCY GUARD
 *
 * src/lib/tier-utils.ts is the SINGLE SOURCE OF TRUTH for every per-tier scalar
 * fact (price, AI/day, max children, marketplace discount, memory facts, trial
 * length). The same facts used to be duplicated across billing-engine.ts and the
 * edge auth-middleware, and they repeatedly drifted — causing real
 * false-advertising bugs (trial 7-vs-14 days, Core price $69-vs-$14.99,
 * "1 month"-vs-7-days copy).
 *
 * This test fails CI the moment any consumer re-hardcodes a value that diverges
 * from tier-utils. To stay un-driftable itself, it reads the LIVE tier-utils
 * exports for the expected values rather than re-typing literals; only the small
 * set of immutable CANONICAL FACTS (free=3 AI/day, paid fair-use=100, trial=7
 * days, the published price points) are pinned as literals on purpose — those are
 * the contract, and changing them must be a deliberate, reviewed edit here.
 *
 * SCOPE NOTE — edge auth-middleware:
 *   supabase/functions/server/auth-middleware.ts keeps its own TIER_FEATURES set
 *   for the Deno edge runtime. It is intentionally NOT imported here: it pulls in
 *   `https://esm.sh/@supabase/supabase-js` and `Deno.env`, neither of which
 *   resolves under vitest/node, so importing it would break this suite. That file
 *   carries a prominent "SOURCE OF TRUTH: src/lib/tier-utils.ts — keep in sync"
 *   comment and holds only feature-flag strings (no scalar prices/limits), so the
 *   drift this guard protects against lives in tier-utils + billing-engine.
 */

import { describe, it, expect } from 'vitest';
import {
  tierPricing,
  getMaxChildren,
  getMarketplaceDiscount,
  getEnforcedAIMessageLimit,
  getAIMessageLimit,
  getTierLimits,
  FAIR_USE_AI_DAILY_CAP,
  TRIAL_CONFIG,
  normalizeTierName,
  type TierType,
} from './tier-utils';
import { PRICING_TIERS, type SubscriptionTier } from './billing-engine';

// billing-engine's PricingTier.id uses 'pro_plus'; tier-utils uses 'proplus'.
function toTierType(id: SubscriptionTier): TierType {
  return id === 'pro_plus' ? 'proplus' : (id as TierType);
}

// Pull a billing-engine tier row by its canonical tier-utils name.
function billingTierFor(tier: TierType) {
  const row = PRICING_TIERS.find((t) => toTierType(t.id) === tier);
  if (!row) throw new Error(`PRICING_TIERS is missing a row for "${tier}"`);
  return row;
}

// The four canonical billing tiers (legacy 'starter' is excluded from
// PRICING_TIERS by design — it aliases to core).
const CANONICAL_TIERS: TierType[] = ['free', 'core', 'pro', 'proplus'];

describe('tier-config consistency: tier-utils ⟷ billing-engine', () => {
  describe('monthly + yearly prices agree with tierPricing', () => {
    it.each(CANONICAL_TIERS)('%s prices match', (tier) => {
      const row = billingTierFor(tier);
      // Read the SOURCE OF TRUTH live — if tierPricing changes, expectation moves with it.
      expect(row.monthlyPrice).toBe(tierPricing[tier].monthly);
      expect(row.yearlyPrice).toBe(tierPricing[tier].yearly);
    });

    it('yearlyMonthlyEquivalent is the yearly price / 12 (2dp), 0 for free', () => {
      for (const tier of CANONICAL_TIERS) {
        const row = billingTierFor(tier);
        const expected =
          tierPricing[tier].yearly === 0
            ? 0
            : +(tierPricing[tier].yearly / 12).toFixed(2);
        expect(row.yearlyMonthlyEquivalent).toBe(expected);
      }
    });
  });

  describe('DISPLAY ai-messages/day agrees (free numeric, paid "unlimited")', () => {
    it.each(CANONICAL_TIERS)('%s ai/day display matches', (tier) => {
      const row = billingTierFor(tier);
      const canonical = getAIMessageLimit(tier); // null = unlimited
      const expected = canonical === null ? 'unlimited' : canonical;
      expect(row.limits.aiMessagesPerDay).toBe(expected);
    });
  });

  describe('max children agrees (null → "unlimited")', () => {
    it.each(CANONICAL_TIERS)('%s children match', (tier) => {
      const row = billingTierFor(tier);
      const canonical = getMaxChildren(tier); // null = unlimited
      const expected = canonical === null ? 'unlimited' : canonical;
      expect(row.limits.children).toBe(expected);
    });
  });

  describe('marketplace discount agrees', () => {
    it.each(CANONICAL_TIERS)('%s marketplace discount matches', (tier) => {
      const row = billingTierFor(tier);
      expect(row.limits.marketplaceDiscount).toBe(getMarketplaceDiscount(tier));
    });
  });
});

describe('tier-config consistency: pinned CANONICAL FACTS', () => {
  // These literals are the contract. They must match tier-utils AND the
  // task-specified canonical facts. Changing any of these is a deliberate edit.

  it('FREE: $0, 3 AI/day (display + enforced), 1 child, 0% discount, 50 memory facts', () => {
    expect(tierPricing.free.monthly).toBe(0);
    expect(tierPricing.free.yearly).toBe(0);
    expect(getAIMessageLimit('free')).toBe(3);
    expect(getEnforcedAIMessageLimit('free')).toBe(3);
    expect(getMaxChildren('free')).toBe(1);
    expect(getMarketplaceDiscount('free')).toBe(0);
    expect(getTierLimits('free').memoryFacts).toBe(50);
  });

  it('CORE: $14.99/mo, $129/yr, unlimited (fair-use 100), 2 children, 10% discount, 5000 memory facts', () => {
    expect(tierPricing.core.monthly).toBe(14.99);
    expect(tierPricing.core.yearly).toBe(129);
    expect(getAIMessageLimit('core')).toBeNull(); // displayed "Unlimited"
    expect(getEnforcedAIMessageLimit('core')).toBe(100);
    expect(getMaxChildren('core')).toBe(2);
    expect(getMarketplaceDiscount('core')).toBe(10);
    expect(getTierLimits('core').memoryFacts).toBe(5000);
  });

  it('PRO: $29.99/mo, $279/yr, unlimited (fair-use 100), 3 children, 20% discount, 15000 memory facts', () => {
    expect(tierPricing.pro.monthly).toBe(29.99);
    expect(tierPricing.pro.yearly).toBe(279);
    expect(getAIMessageLimit('pro')).toBeNull();
    expect(getEnforcedAIMessageLimit('pro')).toBe(100);
    expect(getMaxChildren('pro')).toBe(3);
    expect(getMarketplaceDiscount('pro')).toBe(20);
    expect(getTierLimits('pro').memoryFacts).toBe(15000);
  });

  it('FAMILY/proplus: $49.99/mo, $479/yr, unlimited (fair-use 100), unlimited children, 30% discount, unlimited memory facts', () => {
    expect(tierPricing.proplus.monthly).toBe(49.99);
    expect(tierPricing.proplus.yearly).toBe(479);
    expect(getAIMessageLimit('proplus')).toBeNull();
    expect(getEnforcedAIMessageLimit('proplus')).toBe(100);
    expect(getMaxChildren('proplus')).toBeNull(); // unlimited
    expect(getMarketplaceDiscount('proplus')).toBe(30);
    expect(getTierLimits('proplus').memoryFacts).toBeNull(); // unlimited
  });

  it('FAIR_USE_AI_DAILY_CAP is 100 and is the enforced ceiling for every paid tier', () => {
    expect(FAIR_USE_AI_DAILY_CAP).toBe(100);
    for (const tier of ['core', 'pro', 'proplus'] as TierType[]) {
      expect(getEnforcedAIMessageLimit(tier)).toBe(FAIR_USE_AI_DAILY_CAP);
    }
  });

  it('TRIAL is 7 days and the trial tier is Core', () => {
    expect(TRIAL_CONFIG.durationDays).toBe(7);
    expect(normalizeTierName(TRIAL_CONFIG.trialTier)).toBe('core');
  });

  it('legacy "starter" aliases to Core on every canonical fact', () => {
    // Guards the legacy migration path so a re-introduced starter can't drift.
    expect(tierPricing.starter.monthly).toBe(tierPricing.core.monthly);
    expect(tierPricing.starter.yearly).toBe(tierPricing.core.yearly);
    expect(getMaxChildren('starter')).toBe(getMaxChildren('core'));
    expect(getMarketplaceDiscount('starter')).toBe(getMarketplaceDiscount('core'));
    expect(getEnforcedAIMessageLimit('starter')).toBe(getEnforcedAIMessageLimit('core'));
  });
});
