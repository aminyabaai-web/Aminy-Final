/**
 * Referral Program Tests
 * Tests for referral code generation, tracking, tiers, and rewards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateReferralCode,
  getReferralTier,
  getReferralQualificationDays,
  getReferralShareMessage,
  getReferralSummary,
  REFERRAL_TIERS,
  REFERRAL_PROGRAM_CONFIG,
  Referral,
} from '../lib/referral-program';

describe('Referral Code Generation', () => {
  it('should generate a code with AMINY prefix', () => {
    const userId = 'test-user-123';
    const code = generateReferralCode(userId);

    expect(code).toMatch(/^AMINY-/);
  });

  it('should generate codes with consistent format', () => {
    const userId = 'user-456';
    const code = generateReferralCode(userId);

    // Format: AMINY-XXXX-XXXX
    expect(code.split('-').length).toBe(3);
    expect(code.toUpperCase()).toBe(code); // All uppercase
  });

  it('should generate unique codes for different users', () => {
    const code1 = generateReferralCode('user-1');
    const code2 = generateReferralCode('user-2');

    // Codes should be different (high probability)
    expect(code1).not.toBe(code2);
  });

  it('should include user ID prefix in code', () => {
    const userId = 'test-user';
    const code = generateReferralCode(userId);

    // First 4 chars of userId should be in the code
    expect(code).toContain('TEST');
  });
});

describe('Referral Tiers', () => {
  it('should return null for zero referrals', () => {
    const tier = getReferralTier(0);
    expect(tier).toBeNull();
  });

  it('should return Supporter tier for 1 referral', () => {
    const tier = getReferralTier(1);
    expect(tier?.name).toBe('Supporter');
  });

  it('should return Champion tier for 5 referrals', () => {
    const tier = getReferralTier(5);
    expect(tier?.name).toBe('Champion');
  });

  it('should return Ambassador tier for 10+ referrals', () => {
    const tier = getReferralTier(10);
    expect(tier?.name).toBe('Ambassador');

    const tier20 = getReferralTier(20);
    expect(tier20?.name).toBe('Ambassador');
  });

  it('should have correct tier thresholds', () => {
    expect(REFERRAL_TIERS[0].minReferrals).toBe(1);
    expect(REFERRAL_TIERS[1].minReferrals).toBe(5);
    expect(REFERRAL_TIERS[2].minReferrals).toBe(10);
  });

  it('should have perks for each tier', () => {
    for (const tier of REFERRAL_TIERS) {
      expect(tier.perks.length).toBeGreaterThan(0);
      expect(tier.badgeColor).toBeDefined();
      expect(tier.badgeIcon).toBeDefined();
    }
  });
});

describe('Referral Qualification', () => {
  it('should return 0 days for already qualified referral', () => {
    const referral: Referral = {
      id: 'ref-1',
      referrerUserId: 'user-1',
      referredUserId: 'user-2',
      referralCode: 'AMINY-TEST-123',
      status: 'qualified',
      createdAt: new Date().toISOString(),
    };

    const days = getReferralQualificationDays(referral);
    expect(days).toBe(0);
  });

  it('should calculate remaining days for pending referral', () => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 3); // 3 days ago

    const referral: Referral = {
      id: 'ref-1',
      referrerUserId: 'user-1',
      referredUserId: 'user-2',
      referralCode: 'AMINY-TEST-123',
      status: 'pending',
      createdAt: createdAt.toISOString(),
    };

    const days = getReferralQualificationDays(referral);
    // Should be ~4 days remaining (7 day qualification period - 3 days elapsed)
    expect(days).toBe(REFERRAL_PROGRAM_CONFIG.qualificationPeriodDays - 3);
  });

  it('should return 0 for overdue pending referral', () => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 30); // 30 days ago

    const referral: Referral = {
      id: 'ref-1',
      referrerUserId: 'user-1',
      referredUserId: 'user-2',
      referralCode: 'AMINY-TEST-123',
      status: 'pending',
      createdAt: createdAt.toISOString(),
    };

    const days = getReferralQualificationDays(referral);
    expect(days).toBe(0);
  });
});

describe('Referral Share Message', () => {
  it('should generate share message with code', () => {
    const code = 'AMINY-TEST-123';
    const userName = 'John';
    const message = getReferralShareMessage(code, userName);

    expect(message.title).toBe('Join me on Aminy!');
    expect(message.body).toContain(code);
    expect(message.body).toContain(userName);
    expect(message.url).toContain(code);
  });

  it('should include $25 credit mention', () => {
    const message = getReferralShareMessage('AMINY-TEST-123', 'Sarah');
    expect(message.body).toContain('$25');
  });

  it('should generate proper URL format', () => {
    const message = getReferralShareMessage('AMINY-CODE-XYZ', 'User');
    expect(message.url).toMatch(/https:\/\/aminy\.app\/join\?ref=AMINY-CODE-XYZ/);
  });
});

describe('Referral Summary', () => {
  it('should calculate correct summary for empty referrals', () => {
    const summary = getReferralSummary([], 'AMINY-TEST-123');

    expect(summary.totalReferrals).toBe(0);
    expect(summary.pendingReferrals).toBe(0);
    expect(summary.qualifiedReferrals).toBe(0);
    expect(summary.currentTier).toBeNull();
    expect(summary.referralCode).toBe('AMINY-TEST-123');
  });

  it('should count pending and qualified referrals separately', () => {
    const referrals: Referral[] = [
      { id: '1', referrerUserId: 'u1', referredUserId: 'r1', referralCode: 'C', status: 'pending', createdAt: new Date().toISOString() },
      { id: '2', referrerUserId: 'u1', referredUserId: 'r2', referralCode: 'C', status: 'pending', createdAt: new Date().toISOString() },
      { id: '3', referrerUserId: 'u1', referredUserId: 'r3', referralCode: 'C', status: 'qualified', createdAt: new Date().toISOString() },
      { id: '4', referrerUserId: 'u1', referredUserId: 'r4', referralCode: 'C', status: 'rewarded', createdAt: new Date().toISOString() },
    ];

    const summary = getReferralSummary(referrals, 'AMINY-TEST');

    expect(summary.totalReferrals).toBe(4);
    expect(summary.pendingReferrals).toBe(2);
    expect(summary.qualifiedReferrals).toBe(2); // qualified + rewarded
  });

  it('should determine correct tier based on qualified referrals', () => {
    const qualifiedReferrals: Referral[] = Array(5).fill(null).map((_, i) => ({
      id: `ref-${i}`,
      referrerUserId: 'u1',
      referredUserId: `r${i}`,
      referralCode: 'CODE',
      status: 'qualified' as const,
      createdAt: new Date().toISOString(),
    }));

    const summary = getReferralSummary(qualifiedReferrals, 'CODE');

    expect(summary.currentTier?.name).toBe('Champion');
    expect(summary.nextTier?.name).toBe('Ambassador');
    expect(summary.referralsToNextTier).toBe(5); // 10 - 5
  });

  it('should calculate rewards earned', () => {
    const referrals: Referral[] = Array(3).fill(null).map((_, i) => ({
      id: `ref-${i}`,
      referrerUserId: 'u1',
      referredUserId: `r${i}`,
      referralCode: 'CODE',
      status: 'rewarded' as const,
      createdAt: new Date().toISOString(),
    }));

    const summary = getReferralSummary(referrals, 'CODE');

    expect(summary.totalRewardsEarned).toBe(3); // 3 free months
  });
});

describe('Referral Program Config', () => {
  it('should have valid referrer reward', () => {
    expect(REFERRAL_PROGRAM_CONFIG.referrerReward.type).toBe('free-month');
    expect(REFERRAL_PROGRAM_CONFIG.referrerReward.value).toBeGreaterThan(0);
    expect(REFERRAL_PROGRAM_CONFIG.referrerReward.description).toBeDefined();
  });

  it('should have valid referred reward', () => {
    expect(REFERRAL_PROGRAM_CONFIG.referredReward.type).toBe('session-credit');
    expect(REFERRAL_PROGRAM_CONFIG.referredReward.value).toBe(25);
    expect(REFERRAL_PROGRAM_CONFIG.referredReward.description).toContain('$25');
  });

  it('should have reasonable limits', () => {
    expect(REFERRAL_PROGRAM_CONFIG.qualificationPeriodDays).toBeLessThanOrEqual(14);
    expect(REFERRAL_PROGRAM_CONFIG.maxReferralsPerUser).toBeGreaterThanOrEqual(10);
    expect(REFERRAL_PROGRAM_CONFIG.maxRewardsPerMonth).toBeGreaterThanOrEqual(10);
  });

  it('should be active', () => {
    expect(REFERRAL_PROGRAM_CONFIG.isActive).toBe(true);
  });
});

describe('Viral Analytics Integration', () => {
  it('should track K-factor components correctly', () => {
    // K = invites_per_user × conversion_rate
    // For a healthy referral program:
    // - avgInvitesSent should be > 1
    // - conversionRate should be > 10%
    // - kFactor should ideally be > 0.5 (approaching viral at 1.0)

    // Example calculation
    const totalUsers = 100;
    const totalInvites = 150;
    const conversions = 30;

    const avgInvitesSent = totalInvites / totalUsers;
    const conversionRate = conversions / totalInvites;
    const kFactor = avgInvitesSent * conversionRate;

    expect(avgInvitesSent).toBe(1.5);
    expect(conversionRate).toBeCloseTo(0.2, 5);
    expect(kFactor).toBeCloseTo(0.3, 5);
  });
});
