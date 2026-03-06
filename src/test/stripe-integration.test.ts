/**
 * Stripe Integration Tests
 *
 * Tests the Stripe service from src/lib/stripe-service.ts
 * Validates price configuration, tier mapping, and checkout behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock dependencies before importing the module under test
// ---------------------------------------------------------------------------

// Mock Supabase info (used for Edge Function base URL)
vi.mock('@/utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-anon-key',
  supabaseFullUrl: 'https://test-project.supabase.co',
}));

vi.mock('../../utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-anon-key',
  supabaseFullUrl: 'https://test-project.supabase.co',
}));

// Mock Supabase client (imported dynamically by getAccessToken)
vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  },
}));

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks
import {
  STRIPE_PRICES,
  TIER_PRICING,
  VISIT_PRICES,
  BUNDLE_STRIPE_PRICES,
  isStripeConfigured,
  createCheckoutSession,
  formatPrice,
} from '@/lib/stripe-service';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stripe Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ========================================================================
  // STRIPE_PRICES configuration
  // ========================================================================
  describe('STRIPE_PRICES', () => {
    it('has all expected subscription tier keys', () => {
      const expectedKeys = [
        'starter_monthly',
        'starter_annual',
        'core_monthly',
        'core_annual',
        'pro_monthly',
        'pro_annual',
        'proplus_monthly',
        'proplus_annual',
      ];

      for (const key of expectedKeys) {
        expect(STRIPE_PRICES).toHaveProperty(key);
        expect(typeof (STRIPE_PRICES as Record<string, string>)[key]).toBe('string');
        expect((STRIPE_PRICES as Record<string, string>)[key].length).toBeGreaterThan(0);
      }
    });

    it('has all expected visit price keys', () => {
      const visitKeys = ['initial_consult', 'followup', 'emergency', 'extended'];

      for (const key of visitKeys) {
        expect(STRIPE_PRICES).toHaveProperty(key);
        expect(typeof (STRIPE_PRICES as Record<string, string>)[key]).toBe('string');
      }
    });

    it('price IDs are strings (from env vars or defaults)', () => {
      const allValues = Object.values(STRIPE_PRICES);
      for (const value of allValues) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  // ========================================================================
  // Tier mapping
  // ========================================================================
  describe('Tier mapping', () => {
    it('TIER_PRICING covers all known tiers', () => {
      const expectedTiers = ['free', 'starter', 'core', 'pro', 'proplus'];

      for (const tier of expectedTiers) {
        expect(TIER_PRICING).toHaveProperty(tier);
        const pricing = (TIER_PRICING as Record<string, { monthly: number; annual: number }>)[tier];
        expect(pricing).toHaveProperty('monthly');
        expect(pricing).toHaveProperty('annual');
        expect(typeof pricing.monthly).toBe('number');
        expect(typeof pricing.annual).toBe('number');
      }
    });

    it('free tier has zero pricing', () => {
      expect(TIER_PRICING.free.monthly).toBe(0);
      expect(TIER_PRICING.free.annual).toBe(0);
    });

    it('paid tiers have positive pricing', () => {
      const paidTiers = ['core', 'pro', 'proplus'] as const;

      for (const tier of paidTiers) {
        expect(TIER_PRICING[tier].monthly).toBeGreaterThan(0);
        expect(TIER_PRICING[tier].annual).toBeGreaterThan(0);
      }
    });

    it('annual pricing is cheaper than 12x monthly', () => {
      const paidTiers = ['core', 'pro', 'proplus'] as const;

      for (const tier of paidTiers) {
        const yearlyMonthly = TIER_PRICING[tier].monthly * 12;
        expect(TIER_PRICING[tier].annual).toBeLessThan(yearlyMonthly);
      }
    });

    it('tier pricing increases with higher tiers', () => {
      expect(TIER_PRICING.core.monthly).toBeLessThan(TIER_PRICING.pro.monthly);
      expect(TIER_PRICING.pro.monthly).toBeLessThan(TIER_PRICING.proplus.monthly);
    });
  });

  // ========================================================================
  // VISIT_PRICES
  // ========================================================================
  describe('VISIT_PRICES', () => {
    it('has consult, extended, and follow-up visit types', () => {
      expect(VISIT_PRICES).toHaveProperty('consult');
      expect(VISIT_PRICES).toHaveProperty('extended');
      expect(VISIT_PRICES).toHaveProperty('follow-up');
    });

    it('each visit type has name, basePrice, memberDiscount, and duration', () => {
      for (const [key, value] of Object.entries(VISIT_PRICES)) {
        expect(value).toHaveProperty('name');
        expect(value).toHaveProperty('basePrice');
        expect(value).toHaveProperty('memberDiscount');
        expect(value).toHaveProperty('duration');
        expect(typeof value.basePrice).toBe('number');
        expect(value.basePrice).toBeGreaterThan(0);
        expect(value.memberDiscount).toBeLessThan(value.basePrice);
      }
    });
  });

  // ========================================================================
  // BUNDLE_STRIPE_PRICES
  // ========================================================================
  describe('BUNDLE_STRIPE_PRICES', () => {
    it('has expected bundle keys', () => {
      const expectedBundles = [
        'consult-4',
        'consult-8',
        'deep-review-3',
        'deep-review-6',
        'mixed-starter',
      ];

      for (const key of expectedBundles) {
        expect(BUNDLE_STRIPE_PRICES).toHaveProperty(key);
      }
    });
  });

  // ========================================================================
  // isStripeConfigured
  // ========================================================================
  describe('isStripeConfigured', () => {
    it('returns a boolean', () => {
      const result = isStripeConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  // ========================================================================
  // createCheckoutSession
  // ========================================================================
  describe('createCheckoutSession', () => {
    it('calls the checkout endpoint and returns url + sessionId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session-1', sessionId: 'cs_123' }),
        text: () => Promise.resolve(''),
      });

      const result = await createCheckoutSession({
        userId: 'user-1',
        email: 'test@aminy.ai',
        tier: 'core',
        interval: 'monthly',
      });

      expect(result).toEqual({
        url: 'https://checkout.stripe.com/session-1',
        sessionId: 'cs_123',
      });

      // Verify fetch was called with correct endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('create-checkout');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.userId).toBe('user-1');
      expect(body.email).toBe('test@aminy.ai');
      expect(body.tier).toBe('core');
      expect(body.interval).toBe('monthly');
    });

    it('throws when server returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Unauthorized'),
        json: () => Promise.reject(new Error('Not JSON')),
      });

      await expect(
        createCheckoutSession({
          userId: 'user-1',
          email: 'test@aminy.ai',
          tier: 'core',
          interval: 'monthly',
        })
      ).rejects.toThrow('Failed to create checkout session');
    });

    it('throws when response JSON is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        text: () => Promise.resolve('not json'),
      });

      await expect(
        createCheckoutSession({
          userId: 'user-1',
          email: 'test@aminy.ai',
          tier: 'pro',
          interval: 'annual',
        })
      ).rejects.toThrow('Invalid response from payment server');
    });
  });

  // ========================================================================
  // formatPrice
  // ========================================================================
  describe('formatPrice', () => {
    it('formats cents to dollar string', () => {
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(100)).toBe('$1.00');
      expect(formatPrice(7500)).toBe('$75.00');
      expect(formatPrice(12500)).toBe('$125.00');
      expect(formatPrice(1499)).toBe('$14.99');
    });
  });
});
