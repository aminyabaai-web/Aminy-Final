// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import { supabase } from '../utils/supabase/client';

/**
 * Referral Program
 * Implements viral referral mechanics for organic growth
 * Addresses: "Referral program at launch"
 */

// Referral types
export type ReferralRewardType = 'free-month' | 'session-credit' | 'tier-upgrade' | 'marketplace-credit';

export interface ReferralCode {
  id?: string;
  code: string;
  userId: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
}

export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  status: 'pending' | 'converted' | 'rewarded' | 'expired';
  // Qualification: referred user must be on paid tier for 7+ days
  qualificationDate?: string;
  rewardedAt?: string;
  referrerReward?: ReferralReward;
  referredReward?: ReferralReward;
  createdAt: string;
}

export interface ReferralReward {
  type: ReferralRewardType;
  value: number; // Amount in dollars or percentage
  description: string;
  appliedAt?: string;
  expiresAt?: string;
}

// Referral program configuration
export interface ReferralProgramConfig {
  isActive: boolean;
  // Rewards for referrer (person who shares)
  referrerReward: ReferralReward;
  // Rewards for referred (person who signs up)
  referredReward: ReferralReward;
  // Qualification requirements
  qualificationPeriodDays: number;
  requiredTier: 'core' | 'pro' | 'proplus';
  // Limits
  maxReferralsPerUser: number;
  maxRewardsPerMonth: number;
}

export const REFERRAL_PROGRAM_CONFIG: ReferralProgramConfig = {
  isActive: true,
  referrerReward: {
    type: 'free-month',
    value: 1, // 1 free month
    description: '1 month free for each friend who joins',
  },
  referredReward: {
    type: 'session-credit',
    value: 25, // $25 credit
    description: '$25 credit toward your first expert session',
  },
  qualificationPeriodDays: 7, // Friend must stay on paid plan for 7 days (reduced from 14 for better viral coefficient)
  requiredTier: 'core', // Minimum tier for qualification
  maxReferralsPerUser: 20, // Max 20 referrals per user
  maxRewardsPerMonth: 15, // Max 15 free months per month (increased to encourage power referrers)
};

// Premium referral tiers (for power referrers)
export interface ReferralTier {
  name: string;
  minReferrals: number;
  perks: string[];
  badgeColor: string;
  badgeIcon: string;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  {
    name: 'Supporter',
    minReferrals: 1,
    perks: ['1 free month per referral', '$25 credit for friend'],
    badgeColor: '#0891b2',
    badgeIcon: '🌟',
  },
  {
    name: 'Champion',
    minReferrals: 5,
    perks: ['Everything in Supporter', '20% off marketplace sessions', 'Priority support'],
    badgeColor: '#2A7D99',
    badgeIcon: '🏆',
  },
  {
    name: 'Ambassador',
    minReferrals: 10,
    perks: ['Everything in Champion', '1 free BCBA session', 'Early access to features', 'Ambassador badge'],
    badgeColor: '#E07A5F',
    badgeIcon: '👑',
  },
];

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(userId: string): string {
  const prefix = userId.slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AMINY-${prefix}-${random}`;
}

/**
 * Get referral tier based on number of successful referrals
 */
export function getReferralTier(successfulReferrals: number): ReferralTier | null {
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (successfulReferrals >= REFERRAL_TIERS[i].minReferrals) {
      return REFERRAL_TIERS[i];
    }
  }
  return null;
}

/**
 * Calculate remaining days until referral qualifies
 */
export function getReferralQualificationDays(referral: Referral): number {
  if (referral.status !== 'pending') return 0;

  const createdDate = new Date(referral.createdAt);
  const qualificationDate = new Date(createdDate);
  qualificationDate.setDate(qualificationDate.getDate() + REFERRAL_PROGRAM_CONFIG.qualificationPeriodDays);

  const now = new Date();
  const daysRemaining = Math.ceil((qualificationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
}

/**
 * Get share message for referral
 */
export function getReferralShareMessage(referralCode: string, userName: string): {
  title: string;
  body: string;
  url: string;
} {
  return {
    title: 'Join me on Aminy!',
    body: `${userName} invited you to Aminy - the AI-powered companion for families navigating autism and neurodivergence. Use code ${referralCode} to get $25 toward your first expert session!`,
    url: `https://aminy.ai/join?ref=${referralCode}`,
  };
}

/**
 * Get referral summary for user dashboard
 */
export interface ReferralSummary {
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  totalRewardsEarned: number;
  currentTier: ReferralTier | null;
  nextTier: ReferralTier | null;
  referralsToNextTier: number;
  referralCode: string;
}

export function getReferralSummary(
  referrals: Referral[],
  referralCode: string
): ReferralSummary {
  const totalReferrals = referrals.length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const qualifiedReferrals = referrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length;

  const currentTier = getReferralTier(qualifiedReferrals);
  const currentTierIndex = currentTier ? REFERRAL_TIERS.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex < REFERRAL_TIERS.length - 1 ? REFERRAL_TIERS[currentTierIndex + 1] : null;
  const referralsToNextTier = nextTier ? nextTier.minReferrals - qualifiedReferrals : 0;

  return {
    totalReferrals,
    pendingReferrals,
    qualifiedReferrals,
    totalRewardsEarned: qualifiedReferrals, // 1 month per referral
    currentTier,
    nextTier,
    referralsToNextTier,
    referralCode,
  };
}

// ============================================================================
// PERSISTENCE LAYER (Supabase)
// ============================================================================

/**
 * Create or get existing referral code for user
 */
export async function getOrCreateReferralCode(userId: string): Promise<ReferralCode> {
  // Check for existing code
  const { data: existingCodes } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (existingCodes && existingCodes.length > 0) {
    const codeData = existingCodes[0];
    return {
      id: codeData.id,
      code: codeData.code,
      userId: codeData.user_id,
      createdAt: codeData.created_at,
      expiresAt: codeData.expires_at,
      maxUses: codeData.max_uses,
      currentUses: codeData.uses,
      isActive: codeData.is_active,
    };
  }

  // Create new code
  const newCodeString = generateReferralCode(userId);

  const { data: newCode, error } = await supabase
    .from('referral_codes')
    .insert({
      user_id: userId,
      code: newCodeString,
      reward_type: 'free_month',
      reward_value: 1
    })
    .select()
    .single();

  if (error || !newCode) {
    throw new Error('Failed to create referral code');
  }

  return {
    id: newCode.id,
    code: newCode.code,
    userId: newCode.user_id,
    createdAt: newCode.created_at,
    expiresAt: newCode.expires_at,
    maxUses: newCode.max_uses,
    currentUses: newCode.uses,
    isActive: newCode.is_active,
  };
}

/**
 * Track a new referral
 */
export async function trackReferral(
  referrerCode: string,
  referredUserId: string
): Promise<Referral | null> {
  // Find the referral code
  const { data: codeData } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', referrerCode)
    .eq('is_active', true)
    .single();

  if (!codeData) {
    return null; // Invalid code
  }

  // Check if this user was already referred
  const { data: existingReferral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', referredUserId)
    .maybeSingle();

  if (existingReferral) {
    return mapDbReferral(existingReferral); // Already referred
  }

  // Create new referral
  const { data: newReferral, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: codeData.user_id,
      referred_id: referredUserId,
      referral_code: referrerCode,
      status: 'pending'
    })
    .select()
    .single();

  if (error || !newReferral) {
    throw new Error('Failed to create referral');
  }

  // Increment code usage (can be handled by trigger, but doing it manually here)
  await supabase
    .from('referral_codes')
    .update({ uses: codeData.uses + 1 })
    .eq('id', codeData.id);

  return mapDbReferral(newReferral);
}

/**
 * Get all referrals for a user (as referrer)
 */
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (!referrals) return [];

  return referrals.map(mapDbReferral);
}

/**
 * Mark a referral as qualified (after 14 days on paid plan)
 */
export async function qualifyReferral(referralId: string): Promise<Referral | null> {
  // Wait, backend uses 'converted'
  const { data, error } = await supabase
    .from('referrals')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString()
    })
    .eq('id', referralId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbReferral(data);
}

/**
 * Apply rewards for a qualified referral
 */
export async function applyReferralRewards(referralId: string): Promise<Referral | null> {
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .single();

  if (!referral || referral.status !== 'converted') return null;

  const { data, error } = await supabase
    .from('referrals')
    .update({
      status: 'rewarded',
      rewarded_at: new Date().toISOString()
    })
    .eq('id', referralId)
    .select()
    .single();

  if (error || !data) return null;

  // Also create a reward record
  await supabase.from('referral_rewards').insert({
    user_id: data.referrer_id,
    referral_id: data.id,
    reward_type: 'free_month',
    reward_value: 1,
    status: 'applied',
    applied_at: new Date().toISOString()
  });

  return mapDbReferral(data);
}

function mapDbReferral(dbRef: Record<string, unknown>): Referral {
  return {
    id: dbRef.id as string,
    referrerUserId: dbRef.referrer_id as string,
    referredUserId: dbRef.referred_id as string,
    referralCode: dbRef.referral_code as string,
    status: dbRef.status as Referral['status'],
    qualificationDate: dbRef.converted_at as string | undefined,
    rewardedAt: dbRef.rewarded_at as string | undefined,
    createdAt: dbRef.created_at as string,
  };
}

/**
 * Generate mock referrals for demo
 */
export function generateMockReferrals(userId: string): Referral[] {
  const statuses: Referral['status'][] = ['pending', 'pending', 'converted', 'rewarded', 'rewarded'];
  const names = ['Alex M.', 'Jamie T.', 'Morgan K.', 'Casey L.', 'Taylor P.'];

  return statuses.map((status, i) => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - (i * 7));

    return {
      id: `mock-ref-${i}`,
      referrerUserId: userId,
      referredUserId: `referred-user-${i}`,
      referralCode: `AMINY-${userId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      status,
      qualificationDate: status !== 'pending' ? createdAt.toISOString() : undefined,
      rewardedAt: status === 'rewarded' ? createdAt.toISOString() : undefined,
      referrerReward: status === 'rewarded' ? {
        type: 'free-month' as const,
        value: 1,
        description: '1 free month',
        appliedAt: createdAt.toISOString(),
      } : undefined,
      createdAt: createdAt.toISOString(),
    };
  });
}
