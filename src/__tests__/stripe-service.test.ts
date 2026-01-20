/**
 * Stripe Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateVisitPrice,
  validatePromoCode,
  formatPrice,
  VISIT_PRICES,
} from '../lib/stripe-service';

describe('Stripe Service', () => {
  describe('calculateVisitPrice', () => {
    it('should return base price for non-member without promo', async () => {
      const result = await calculateVisitPrice('consult', false);

      expect(result.subtotal).toBe(VISIT_PRICES.consult.basePrice);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(VISIT_PRICES.consult.basePrice);
      expect(result.breakdown).toHaveLength(0);
    });

    it('should apply member discount', async () => {
      const result = await calculateVisitPrice('consult', true);

      expect(result.subtotal).toBe(VISIT_PRICES.consult.basePrice);
      expect(result.discount).toBe(VISIT_PRICES.consult.memberDiscount);
      expect(result.total).toBe(
        VISIT_PRICES.consult.basePrice - VISIT_PRICES.consult.memberDiscount
      );
      expect(result.breakdown).toContain(
        `Member discount: -$${(VISIT_PRICES.consult.memberDiscount / 100).toFixed(2)}`
      );
    });

    it('should apply promo code discount', async () => {
      const result = await calculateVisitPrice('consult', false, 'WELCOME20');

      expect(result.discount).toBeGreaterThan(0);
      expect(result.total).toBeLessThan(result.subtotal);
    });

    it('should stack member and promo discounts', async () => {
      const result = await calculateVisitPrice('consult', true, 'WELCOME20');

      expect(result.breakdown.length).toBe(2);
      expect(result.discount).toBeGreaterThan(VISIT_PRICES.consult.memberDiscount);
    });

    it('should not go below zero', async () => {
      // Even with maximum discounts, total should be >= 0
      const result = await calculateVisitPrice('follow-up', true, 'AMINY50');

      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate extended session correctly', async () => {
      const result = await calculateVisitPrice('extended', false);

      expect(result.subtotal).toBe(VISIT_PRICES.extended.basePrice);
    });
  });

  describe('validatePromoCode', () => {
    it('should validate WELCOME20 code', async () => {
      const result = await validatePromoCode('WELCOME20');

      expect(result.valid).toBe(true);
      expect(result.description).toBe('20% off your first visit');
    });

    it('should validate FIRST10 code', async () => {
      const result = await validatePromoCode('FIRST10');

      expect(result.valid).toBe(true);
      expect(result.description).toBe('$10 off');
    });

    it('should validate AACT25 partner code', async () => {
      const result = await validatePromoCode('AACT25');

      expect(result.valid).toBe(true);
      expect(result.description).toContain('AACT');
    });

    it('should be case insensitive', async () => {
      const upper = await validatePromoCode('WELCOME20');
      const lower = await validatePromoCode('welcome20');
      const mixed = await validatePromoCode('Welcome20');

      expect(upper.valid).toBe(lower.valid);
      expect(upper.valid).toBe(mixed.valid);
    });

    it('should reject invalid codes', async () => {
      const result = await validatePromoCode('NOTACODE');

      expect(result.valid).toBe(false);
      expect(result.description).toBeUndefined();
    });

    it('should reject empty codes', async () => {
      const result = await validatePromoCode('');

      expect(result.valid).toBe(false);
    });
  });

  describe('formatPrice', () => {
    it('should format cents to dollars', () => {
      expect(formatPrice(100)).toBe('$1.00');
      expect(formatPrice(1234)).toBe('$12.34');
      expect(formatPrice(7500)).toBe('$75.00');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('$0.00');
    });

    it('should handle decimals correctly', () => {
      expect(formatPrice(99)).toBe('$0.99');
      expect(formatPrice(1)).toBe('$0.01');
    });
  });

  describe('VISIT_PRICES', () => {
    it('should have all required visit types', () => {
      expect(VISIT_PRICES).toHaveProperty('consult');
      expect(VISIT_PRICES).toHaveProperty('extended');
      expect(VISIT_PRICES).toHaveProperty('follow-up');
    });

    it('should have positive base prices', () => {
      Object.values(VISIT_PRICES).forEach(price => {
        expect(price.basePrice).toBeGreaterThan(0);
      });
    });

    it('should have reasonable durations', () => {
      expect(VISIT_PRICES.consult.duration).toBe(25);
      expect(VISIT_PRICES.extended.duration).toBe(50);
      expect(VISIT_PRICES['follow-up'].duration).toBe(15);
    });

    it('should have member discounts less than base price', () => {
      Object.values(VISIT_PRICES).forEach(price => {
        expect(price.memberDiscount).toBeLessThan(price.basePrice);
      });
    });
  });
});
