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
  getEnforcedAIMessageLimit,
  FAIR_USE_AI_DAILY_CAP,
  hasUnlimitedAI,
  getRecommendedTier,
  getUpgradePath,
  getLiveAIVideoLimit,
  hasLiveAIVideo,
  getMarketplaceDiscount,
  includesBCBAConsult,
  getMaxChildren,
} from './tier-utils';

describe('Tier Utilities', () => {
  describe('normalizeTierName', () => {
    it('normalizes free tier correctly', () => {
      expect(normalizeTierName('free')).toBe('free');
      expect(normalizeTierName('FREE')).toBe('free');
      expect(normalizeTierName('Free')).toBe('free');
    });

    it('normalizes starter tier and aliases to core (legacy migration)', () => {
      // Starter has been deprecated and maps to Core
      expect(normalizeTierName('starter')).toBe('core');
      expect(normalizeTierName('basic')).toBe('core');
      expect(normalizeTierName('STARTER')).toBe('core');
    });

    it('normalizes core tier', () => {
      expect(normalizeTierName('core')).toBe('core');
      expect(normalizeTierName('CORE')).toBe('core');
    });

    it('normalizes pro tier', () => {
      expect(normalizeTierName('pro')).toBe('pro');
    });

    it('normalizes proplus tier and aliases', () => {
      expect(normalizeTierName('proplus')).toBe('proplus');
      expect(normalizeTierName('Pro+')).toBe('proplus');
      expect(normalizeTierName('pro+')).toBe('proplus');
      expect(normalizeTierName('premium')).toBe('proplus');
      expect(normalizeTierName('enterprise')).toBe('proplus');
    });

    it('returns free for unknown tiers', () => {
      expect(normalizeTierName('unknown')).toBe('free');
      expect(normalizeTierName('')).toBe('free');
    });
  });

  describe('getTierDisplayName', () => {
    it('returns correct display names', () => {
      expect(getTierDisplayName('free')).toBe('Start Free Trial');  // Free tier displays as trial CTA
      expect(getTierDisplayName('starter')).toBe('Core'); // Starter now maps to Core
      expect(getTierDisplayName('core')).toBe('Core');
      expect(getTierDisplayName('pro')).toBe('Pro');
      expect(getTierDisplayName('proplus')).toBe('Family Plan'); // Rebranded
    });

    it('handles undefined input', () => {
      expect(getTierDisplayName(undefined)).toBe('Start Free Trial');
    });

    it('normalizes and returns display name', () => {
      expect(getTierDisplayName('basic')).toBe('Core'); // Basic maps to Core
      expect(getTierDisplayName('premium')).toBe('Family Plan'); // Premium maps to Family Plan
    });
  });

  describe('getTierPrice', () => {
    it('returns correct monthly prices', () => {
      expect(getTierPrice('free', 'monthly')).toBe(0);
      expect(getTierPrice('starter', 'monthly')).toBe(14.99); // Starter now same as Core
      expect(getTierPrice('core', 'monthly')).toBe(14.99);
      expect(getTierPrice('pro', 'monthly')).toBe(29.99);
      expect(getTierPrice('proplus', 'monthly')).toBe(49.99);
    });

    it('returns correct yearly prices', () => {
      expect(getTierPrice('free', 'yearly')).toBe(0);
      expect(getTierPrice('starter', 'yearly')).toBe(129); // Starter now same as Core
      expect(getTierPrice('core', 'yearly')).toBe(129);
      expect(getTierPrice('pro', 'yearly')).toBe(279);
      expect(getTierPrice('proplus', 'yearly')).toBe(479);
    });

    it('defaults to monthly when not specified', () => {
      expect(getTierPrice('core')).toBe(14.99);
    });
  });

  describe('getTierYearlySavings', () => {
    it('returns correct savings percentages', () => {
      // Implementation returns dollar savings, not percentages
      expect(getTierYearlySavings('free')).toBe(0);
      expect(getTierYearlySavings('starter')).toBe(51); // Starter now same as Core
      expect(getTierYearlySavings('core')).toBe(51);
      expect(getTierYearlySavings('pro')).toBe(81);
      expect(getTierYearlySavings('proplus')).toBe(121);
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
      // Pro tier features based on actual implementation
      expect(hasTierFeature('pro', 'clinical-reports')).toBe(true);
      expect(hasTierFeature('pro', 'priority-support')).toBe(true);
      expect(hasTierFeature('pro', 'discounted-sessions')).toBe(true);
    });

    it('correctly checks proplus tier features', () => {
      expect(hasTierFeature('proplus', 'care-coordinator')).toBe(true);
      expect(hasTierFeature('proplus', 'multi-caregiver')).toBe(true);
      expect(hasTierFeature('proplus', 'multi-child-unlimited')).toBe(true);
      expect(hasTierFeature('proplus', 'dedicated-support')).toBe(true);
    });

    it('returns false for undefined tier', () => {
      expect(hasTierFeature(undefined, 'limited-ai-chat')).toBe(false);
    });
  });

  describe('compareTiers', () => {
    it('correctly compares tier levels', () => {
      expect(compareTiers('proplus', 'free')).toBe(true);
      expect(compareTiers('pro', 'free')).toBe(true);
      expect(compareTiers('core', 'starter')).toBe(true);
      expect(compareTiers('starter', 'core')).toBe(false);
      expect(compareTiers('free', 'pro')).toBe(false);
      expect(compareTiers('pro', 'proplus')).toBe(false);
    });

    it('returns true for equal tiers', () => {
      expect(compareTiers('core', 'core')).toBe(true);
      expect(compareTiers('free', 'free')).toBe(true);
      expect(compareTiers('proplus', 'proplus')).toBe(true);
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
      expect(getTierLevel('proplus')).toBe(4);
    });

    it('returns 0 for undefined', () => {
      expect(getTierLevel(undefined)).toBe(0);
    });
  });

  describe('getAIMessageLimit', () => {
    it('returns correct DISPLAY limits (free hard 3; paid null = Unlimited)', () => {
      // DISPLAY limit. Free is a hard 3/day; paid tiers show "Unlimited" (null).
      // Enforcement fair-use cap is separate — see getEnforcedAIMessageLimit.
      expect(getAIMessageLimit('free')).toBe(3);
      expect(getAIMessageLimit('starter')).toBeNull(); // Legacy: same as Core (unlimited)
      expect(getAIMessageLimit('core')).toBeNull(); // unlimited
      expect(getAIMessageLimit('pro')).toBeNull(); // unlimited
      expect(getAIMessageLimit('proplus')).toBeNull(); // unlimited
    });

    it('returns 3 for undefined (defaults to free hard limit)', () => {
      expect(getAIMessageLimit(undefined)).toBe(3);
    });
  });

  describe('getEnforcedAIMessageLimit (fair-use enforcement vs display)', () => {
    it('keeps free at a hard 3/day', () => {
      expect(getEnforcedAIMessageLimit('free')).toBe(3);
      expect(getEnforcedAIMessageLimit(undefined)).toBe(3);
    });

    it('enforces the 100/day fair-use cap on paid tiers (still displayed as Unlimited)', () => {
      expect(getEnforcedAIMessageLimit('core')).toBe(FAIR_USE_AI_DAILY_CAP);
      expect(getEnforcedAIMessageLimit('pro')).toBe(FAIR_USE_AI_DAILY_CAP);
      expect(getEnforcedAIMessageLimit('proplus')).toBe(FAIR_USE_AI_DAILY_CAP);
      expect(getEnforcedAIMessageLimit('starter')).toBe(FAIR_USE_AI_DAILY_CAP); // legacy = core
      expect(FAIR_USE_AI_DAILY_CAP).toBe(100);
    });

    it('keeps DISPLAY limit unlimited (null) for paid even though enforcement caps at 100', () => {
      // Display path stays "Unlimited" — distinct from enforcement.
      expect(getAIMessageLimit('core')).toBeNull();
      expect(getAIMessageLimit('pro')).toBeNull();
      expect(getAIMessageLimit('proplus')).toBeNull();
    });
  });

  describe('hasUnlimitedAI', () => {
    it('returns true for core, pro, and proplus', () => {
      expect(hasUnlimitedAI('core')).toBe(true);
      expect(hasUnlimitedAI('pro')).toBe(true);
      expect(hasUnlimitedAI('proplus')).toBe(true);
    });

    it('returns false for free only (starter is legacy and maps to unlimited)', () => {
      expect(hasUnlimitedAI('free')).toBe(false);
      // Note: starter is legacy and now has unlimited AI
      expect(hasUnlimitedAI('starter')).toBe(true);
    });

    it('returns false for undefined', () => {
      expect(hasUnlimitedAI(undefined)).toBe(false);
    });
  });

  describe('getLiveAIVideoLimit', () => {
    it('returns correct limits in minutes', () => {
      expect(getLiveAIVideoLimit('free')).toBe(0);
      expect(getLiveAIVideoLimit('starter')).toBe(0);
      expect(getLiveAIVideoLimit('core')).toBe(0);
      expect(getLiveAIVideoLimit('pro')).toBe(30);
      expect(getLiveAIVideoLimit('proplus')).toBeNull(); // unlimited
    });
  });

  describe('hasLiveAIVideo', () => {
    it('returns true for pro and proplus', () => {
      expect(hasLiveAIVideo('pro')).toBe(true);
      expect(hasLiveAIVideo('proplus')).toBe(true);
    });

    it('returns false for lower tiers', () => {
      expect(hasLiveAIVideo('free')).toBe(false);
      expect(hasLiveAIVideo('starter')).toBe(false);
      expect(hasLiveAIVideo('core')).toBe(false);
    });
  });

  describe('getMarketplaceDiscount', () => {
    it('returns correct discount percentages', () => {
      expect(getMarketplaceDiscount('free')).toBe(0);
      expect(getMarketplaceDiscount('starter')).toBe(10); // Legacy: same as Core
      expect(getMarketplaceDiscount('core')).toBe(10);
      expect(getMarketplaceDiscount('pro')).toBe(20);
      expect(getMarketplaceDiscount('proplus')).toBe(30);
    });
  });

  describe('includesBCBAConsult', () => {
    it('returns true for proplus only', () => {
      // Only proplus includes BCBA consult per implementation
      expect(includesBCBAConsult('proplus')).toBe(true);
    });

    it('returns false for lower tiers', () => {
      expect(includesBCBAConsult('free')).toBe(false);
      expect(includesBCBAConsult('starter')).toBe(false);
      expect(includesBCBAConsult('core')).toBe(false);
      expect(includesBCBAConsult('pro')).toBe(false); // Pro doesn't include BCBA consult
    });
  });

  describe('getMaxChildren', () => {
    it('returns correct limits', () => {
      expect(getMaxChildren('free')).toBe(1);
      expect(getMaxChildren('starter')).toBe(2); // Legacy: same as Core
      expect(getMaxChildren('core')).toBe(2);
      expect(getMaxChildren('pro')).toBe(3);
      expect(getMaxChildren('proplus')).toBeNull(); // unlimited (Family Plan)
    });
  });

  describe('getRecommendedTier', () => {
    it('returns core as recommended', () => {
      expect(getRecommendedTier()).toBe('core');
    });
  });

  describe('getUpgradePath', () => {
    it('returns correct upgrade paths (simplified: Free → Core → Pro → Family Plan)', () => {
      expect(getUpgradePath('free')).toBe('core'); // Skip Starter, go to Core
      expect(getUpgradePath('starter')).toBe('core'); // Legacy: same tier
      expect(getUpgradePath('core')).toBe('pro');
      expect(getUpgradePath('pro')).toBe('proplus');
      expect(getUpgradePath('proplus')).toBeNull();
    });
  });
});
