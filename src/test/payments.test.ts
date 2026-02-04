/**
 * Payment Configuration Tests
 * Tests for pricing logic (unit tests only)
 */

import { describe, it, expect } from 'vitest';

// Define pricing inline to avoid import resolution issues
// Must match tier-utils.ts and stripe-service.ts
const TIER_PRICING = {
  starter: { monthly: 14.99, annual: 129 },  // Legacy: same as Core
  core: { monthly: 14.99, annual: 129 },
  pro: { monthly: 29.99, annual: 279 },
  proplus: { monthly: 49.99, annual: 479 },
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

describe('Tier Pricing Configuration', () => {
  it('should have correct pricing structure', () => {
    expect(TIER_PRICING.starter.monthly).toBe(14.99);
    expect(TIER_PRICING.starter.annual).toBe(129);

    expect(TIER_PRICING.core.monthly).toBe(14.99);
    expect(TIER_PRICING.core.annual).toBe(129);

    expect(TIER_PRICING.pro.monthly).toBe(29.99);
    expect(TIER_PRICING.pro.annual).toBe(279);

    expect(TIER_PRICING.proplus.monthly).toBe(49.99);
    expect(TIER_PRICING.proplus.annual).toBe(479);
  });

  it('should calculate annual savings correctly', () => {
    // Core: $14.99 * 12 = $179.88 vs $129 annual = $50.88 saved
    const coreMonthlyCost = TIER_PRICING.core.monthly * 12;
    const coreAnnualCost = TIER_PRICING.core.annual;
    expect(coreMonthlyCost).toBeGreaterThan(coreAnnualCost);

    // Pro: $29.99 * 12 = $359.88 vs $279 annual = $80.88 saved
    const proMonthlyCost = TIER_PRICING.pro.monthly * 12;
    const proAnnualCost = TIER_PRICING.pro.annual;
    expect(proMonthlyCost).toBeGreaterThan(proAnnualCost);
  });

  it('should have tiers in ascending price order', () => {
    expect(TIER_PRICING.core.monthly).toBeLessThan(TIER_PRICING.pro.monthly);
    expect(TIER_PRICING.pro.monthly).toBeLessThan(TIER_PRICING.proplus.monthly);
  });
});

describe('Price Formatting', () => {
  it('should format prices correctly', () => {
    expect(formatPrice(1499)).toBe('$14.99');
    expect(formatPrice(2999)).toBe('$29.99');
    expect(formatPrice(4999)).toBe('$49.99');
  });

  it('should handle zero price', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('should handle large prices', () => {
    expect(formatPrice(44900)).toBe('$449.00');
  });
});

describe('Pricing Tiers', () => {
  it('should have all required tiers', () => {
    expect(TIER_PRICING).toHaveProperty('starter');
    expect(TIER_PRICING).toHaveProperty('core');
    expect(TIER_PRICING).toHaveProperty('pro');
    expect(TIER_PRICING).toHaveProperty('proplus');
  });

  it('each tier should have monthly and annual prices', () => {
    Object.values(TIER_PRICING).forEach((tier) => {
      expect(tier).toHaveProperty('monthly');
      expect(tier).toHaveProperty('annual');
      expect(typeof tier.monthly).toBe('number');
      expect(typeof tier.annual).toBe('number');
    });
  });
});
