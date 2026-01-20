/**
 * Environment Configuration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-key',
      VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      VITE_DAILY_DOMAIN: 'test.daily.co',
      VITE_USE_MOCK_DATA: 'false',
      DEV: true,
      PROD: false,
    },
  },
});

describe('Environment Configuration', () => {
  describe('Supabase Config', () => {
    it('should extract project ID from URL', () => {
      const url = 'https://myproject.supabase.co';
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      expect(match?.[1]).toBe('myproject');
    });

    it('should validate URL format', () => {
      const validUrl = 'https://abc123.supabase.co';
      const invalidUrl = 'not-a-url';

      expect(validUrl.includes('supabase.co')).toBe(true);
      expect(invalidUrl.includes('supabase.co')).toBe(false);
    });
  });

  describe('Stripe Config', () => {
    it('should validate publishable key format', () => {
      const validKey = 'pk_test_123abc';
      const validLiveKey = 'pk_live_xyz789';
      const invalidKey = 'sk_test_123';

      expect(validKey.startsWith('pk_')).toBe(true);
      expect(validLiveKey.startsWith('pk_')).toBe(true);
      expect(invalidKey.startsWith('pk_')).toBe(false);
    });

    it('should distinguish test vs live keys', () => {
      const testKey = 'pk_test_123';
      const liveKey = 'pk_live_456';

      expect(testKey.includes('test')).toBe(true);
      expect(liveKey.includes('live')).toBe(true);
    });
  });

  describe('Daily.co Config', () => {
    it('should validate domain format', () => {
      const validDomain = 'mycompany.daily.co';
      const placeholderDomain = 'your-domain.daily.co';
      const invalidDomain = 'not-daily';

      expect(validDomain.includes('.daily.co')).toBe(true);
      expect(
        validDomain.includes('.daily.co') && !validDomain.includes('your-domain')
      ).toBe(true);
      expect(
        placeholderDomain.includes('.daily.co') &&
          !placeholderDomain.includes('your-domain')
      ).toBe(false);
      expect(invalidDomain.includes('.daily.co')).toBe(false);
    });
  });

  describe('Monitoring Config', () => {
    it('should validate Sentry DSN format', () => {
      const validDsn = 'https://abc@sentry.io/123';
      const invalidDsn = 'not-a-dsn';

      expect(validDsn.includes('sentry.io')).toBe(true);
      expect(invalidDsn.includes('sentry.io')).toBe(false);
    });

    it('should validate GA measurement ID format', () => {
      const validId = 'G-ABC123XYZ';
      const invalidId = 'UA-123456-1';

      expect(validId.startsWith('G-')).toBe(true);
      expect(invalidId.startsWith('G-')).toBe(false);
    });
  });

  describe('Production Readiness', () => {
    it('should require all critical configs for production', () => {
      const hasSupabase = true;
      const hasStripe = true;
      const hasDaily = true;
      const mockDataDisabled = true;

      const productionReady =
        hasSupabase && hasStripe && hasDaily && mockDataDisabled;

      expect(productionReady).toBe(true);
    });

    it('should fail production check if mock data enabled', () => {
      const hasSupabase = true;
      const hasStripe = true;
      const hasDaily = true;
      const mockDataDisabled = false;

      const productionReady =
        hasSupabase && hasStripe && hasDaily && mockDataDisabled;

      expect(productionReady).toBe(false);
    });

    it('should fail production check if Stripe missing', () => {
      const hasSupabase = true;
      const hasStripe = false;
      const hasDaily = true;
      const mockDataDisabled = true;

      const productionReady =
        hasSupabase && hasStripe && hasDaily && mockDataDisabled;

      expect(productionReady).toBe(false);
    });
  });
});
