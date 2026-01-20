import { describe, it, expect } from 'vitest';
import {
  TierType,
  tierDisplayNames,
  normalizeTierName,
  getTierDisplayName,
  getTierPrice,
  getTierYearlySavings,
  hasTierFeature,
  getTierFeatureList,
  compareTiers,
  getTierLevel,
  getAIMessageLimit,
  hasUnlimitedAI,
  getRecommendedTier,
  getUpgradePath,
} from './tier-utils';

describe('Tier Utilities', () => {
  describe('normalizeTierName', () => {
    it('normalizes free tier correctly', () => {
      expect(normalizeTierName('free')).toBe('free');
      expect(normalizeTierName('FREE')).toBe('free');
      expect(normalizeTierName('Free')).toBe('free');
    });

    it('normalizes starter tier and aliases', () => {
      expect(normalizeTierName('starter')).toBe('starter');
      expect(normalizeTierName('basic')).toBe('starter');
      expect(normalizeTierName('STARTER')).toBe('starter');
    });

    it('normalizes core tier', () => {
      expect(normalizeTierName('core')).toBe('core');
      expect(normalizeTierName('CORE')).toBe('core');
    });

    it('normalizes pro tier and aliases', () => {
      expect(normalizeTierName('pro')).toBe('pro');
      expect(normalizeTierName('Pro+')).toBe('pro');
      expect(normalizeTierName('proplus')).toBe('pro');
      expect(normalizeTierName('premium')).toBe('pro');
    });

    it('returns free for unknown tiers', () => {
      expect(normalizeTierName('unknown')).toBe('free');
      expect(normalizeTierName('')).toBe('free');
    });
  });

  describe('getTierDisplayName', () => {
    it('returns correct display names', () => {
      expect(getTierDisplayName('free')).toBe('Free');
      expect(getTierDisplayName('starter')).toBe('Starter');
      expect(getTierDisplayName('core')).toBe('Core');
      expect(getTierDisplayName('pro')).toBe('Pro');
    });

    it('handles undefined input', () => {
      expect(getTierDisplayName(undefined)).toBe('Free');
    });

    it('normalizes and returns display name', () => {
      expect(getTierDisplayName('basic')).toBe('Starter');
      expect(getTierDisplayName('premium')).toBe('Pro');
    });
  });

  describe('getTierPrice', () => {
    it('returns correct monthly prices', () => {
      expect(getTierPrice('free', 'monthly')).toBe(0);
      expect(getTierPrice('starter', 'monthly')).toBe(6.99);
      expect(getTierPrice('core', 'monthly')).toBe(12.99);
      expect(getTierPrice('pro', 'monthly')).toBe(24.99);
    });

    it('returns correct yearly prices', () => {
      expect(getTierPrice('free', 'yearly')).toBe(0);
      expect(getTierPrice('starter', 'yearly')).toBe(59);
      expect(getTierPrice('core', 'yearly')).toBe(119);
      expect(getTierPrice('pro', 'yearly')).toBe(229);
    });

    it('defaults to monthly when not specified', () => {
      expect(getTierPrice('core')).toBe(12.99);
    });
  });

  describe('getTierYearlySavings', () => {
    it('returns correct savings amounts', () => {
      expect(getTierYearlySavings('free')).toBe(0);
      expect(getTierYearlySavings('starter')).toBe(25);
      expect(getTierYearlySavings('core')).toBe(37);
      expect(getTierYearlySavings('pro')).toBe(71);
    });
  });

  describe('hasTierFeature', () => {
    it('correctly checks free tier features', () => {
      expect(hasTierFeature('free', 'limited-ai-chat')).toBe(true);
      expect(hasTierFeature('free', 'basic-daily-plan')).toBe(true);
      expect(hasTierFeature('free', 'unlimited-ai-chat')).toBe(false);
    });

    it('correctly checks core tier features', () => {
      expect(hasTierFeature('core', 'unlimited-ai-chat')).toBe(true);
      expect(hasTierFeature('core', 'vault-access')).toBe(true);
      expect(hasTierFeature('core', 'bcba-consult')).toBe(false);
    });

    it('correctly checks pro tier features', () => {
      expect(hasTierFeature('pro', 'bcba-consult')).toBe(true);
      expect(hasTierFeature('pro', 'priority-support')).toBe(true);
    });

    it('returns false for undefined tier', () => {
      expect(hasTierFeature(undefined, 'limited-ai-chat')).toBe(false);
    });
  });

  describe('compareTiers', () => {
    it('correctly compares tier levels', () => {
      expect(compareTiers('pro', 'free')).toBe(true);
      expect(compareTiers('core', 'starter')).toBe(true);
      expect(compareTiers('starter', 'core')).toBe(false);
      expect(compareTiers('free', 'pro')).toBe(false);
    });

    it('returns true for equal tiers', () => {
      expect(compareTiers('core', 'core')).toBe(true);
      expect(compareTiers('free', 'free')).toBe(true);
    });

    it('handles undefined first tier', () => {
      expect(compareTiers(undefined, 'free')).toBe(false);
    });
  });

  describe('getTierLevel', () => {
    it('returns correct numeric levels', () => {
      expect(getTierLevel('free')).toBe(0);
      expect(getTierLevel('starter')).toBe(1);
      expect(getTierLevel('core')).toBe(2);
      expect(getTierLevel('pro')).toBe(3);
    });

    it('returns 0 for undefined', () => {
      expect(getTierLevel(undefined)).toBe(0);
    });
  });

  describe('getAIMessageLimit', () => {
    it('returns correct limits', () => {
      expect(getAIMessageLimit('free')).toBe(5);
      expect(getAIMessageLimit('starter')).toBe(20);
      expect(getAIMessageLimit('core')).toBeNull(); // unlimited
      expect(getAIMessageLimit('pro')).toBeNull(); // unlimited
    });

    it('returns 5 for undefined', () => {
      expect(getAIMessageLimit(undefined)).toBe(5);
    });
  });

  describe('hasUnlimitedAI', () => {
    it('returns true for core and pro', () => {
      expect(hasUnlimitedAI('core')).toBe(true);
      expect(hasUnlimitedAI('pro')).toBe(true);
    });

    it('returns false for free and starter', () => {
      expect(hasUnlimitedAI('free')).toBe(false);
      expect(hasUnlimitedAI('starter')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(hasUnlimitedAI(undefined)).toBe(false);
    });
  });

  describe('getRecommendedTier', () => {
    it('returns core as recommended', () => {
      expect(getRecommendedTier()).toBe('core');
    });
  });

  describe('getUpgradePath', () => {
    it('returns correct upgrade paths', () => {
      expect(getUpgradePath('free')).toBe('starter');
      expect(getUpgradePath('starter')).toBe('core');
      expect(getUpgradePath('core')).toBe('pro');
      expect(getUpgradePath('pro')).toBeNull();
    });
  });
});
