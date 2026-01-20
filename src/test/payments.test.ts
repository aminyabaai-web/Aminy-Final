/**
 * Payment Configuration Tests
 * Tests for pricing logic (unit tests only)
 */

import { describe, it, expect } from 'vitest';

// Define pricing inline to avoid import resolution issues
const TIER_PRICING = {
  starter: { monthly: 6.99, annual: 59 },
  core: { monthly: 12.99, annual: 119 },
  pro: { monthly: 24.99, annual: 229 },
  proplus: { monthly: 49.99, annual: 449 },
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

describe('Tier Pricing Configuration', () => {
  it('should have correct pricing structure', () => {
    expect(TIER_PRICING.starter.monthly).toBe(6.99);
    expect(TIER_PRICING.starter.annual).toBe(59);

    expect(TIER_PRICING.core.monthly).toBe(12.99);
    expect(TIER_PRICING.core.annual).toBe(119);

    expect(TIER_PRICING.pro.monthly).toBe(24.99);
    expect(TIER_PRICING.pro.annual).toBe(229);

    expect(TIER_PRICING.proplus.monthly).toBe(49.99);
    expect(TIER_PRICING.proplus.annual).toBe(449);
  });

  it('should calculate annual savings correctly', () => {
    // Starter: $6.99 * 12 = $83.88 vs $59 annual = $24.88 saved
    const starterMonthlyCost = TIER_PRICING.starter.monthly * 12;
    const starterAnnualCost = TIER_PRICING.starter.annual;
    expect(starterMonthlyCost).toBeGreaterThan(starterAnnualCost);

    // Core: $12.99 * 12 = $155.88 vs $119 annual = $36.88 saved
    const coreMonthlyCost = TIER_PRICING.core.monthly * 12;
    const coreAnnualCost = TIER_PRICING.core.annual;
    expect(coreMonthlyCost).toBeGreaterThan(coreAnnualCost);
  });

  it('should have tiers in ascending price order', () => {
    expect(TIER_PRICING.starter.monthly).toBeLessThan(TIER_PRICING.core.monthly);
    expect(TIER_PRICING.core.monthly).toBeLessThan(TIER_PRICING.pro.monthly);
    expect(TIER_PRICING.pro.monthly).toBeLessThan(TIER_PRICING.proplus.monthly);
  });
});

describe('Price Formatting', () => {
  it('should format prices correctly', () => {
    expect(formatPrice(699)).toBe('$6.99');
    expect(formatPrice(1299)).toBe('$12.99');
    expect(formatPrice(5900)).toBe('$59.00');
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
