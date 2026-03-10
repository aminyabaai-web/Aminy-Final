/**
 * useReferralData Hook
 * Loads referral program data from Supabase with localStorage fallback.
 *
 * Tables: referral_codes, referrals, referral_rewards
 * Source: src/lib/referral-program.ts (already fully Supabase-based, zero localStorage)
 *
 * This hook adds: React state management, auto-loading, offline cache,
 * and a memoized API surface for components.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types (mirrored from referral-program.ts to avoid tight coupling)
// ============================================================================

export type ReferralRewardType = 'free-month' | 'session-credit' | 'tier-upgrade' | 'marketplace-credit';

export interface ReferralCode {
  id: string;
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
  qualificationDate?: string;
  rewardedAt?: string;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  userId: string;
  referralId: string;
  rewardType: string;
  rewardValue: number;
  status: string;
  appliedAt?: string;
}

export interface ReferralTier {
  name: string;
  minReferrals: number;
  perks: string[];
  badgeColor: string;
  badgeIcon: string;
}

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

export interface ReferralData {
  referralCode: ReferralCode | null;
  referrals: Referral[];
  rewards: ReferralReward[];
  summary: ReferralSummary | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const REFERRAL_TIERS: ReferralTier[] = [
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
    badgeColor: '#43AA8B',
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

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEY = 'aminy-referral-cache';

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ============================================================================
// Row mappers
// ============================================================================

function mapReferralCode(row: Record<string, unknown>): ReferralCode {
  return {
    id: (row.id as string) || '',
    code: (row.code as string) || '',
    userId: (row.user_id as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    expiresAt: row.expires_at as string | undefined,
    maxUses: row.max_uses as number | undefined,
    currentUses: (row.uses as number) || (row.current_uses as number) || 0,
    isActive: (row.is_active as boolean) !== false,
  };
}

function mapReferral(row: Record<string, unknown>): Referral {
  return {
    id: (row.id as string) || '',
    referrerUserId: (row.referrer_id as string) || '',
    referredUserId: (row.referred_id as string) || '',
    referralCode: (row.referral_code as string) || '',
    status: (row.status as Referral['status']) || 'pending',
    qualificationDate: row.converted_at as string | undefined,
    rewardedAt: row.rewarded_at as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function mapReward(row: Record<string, unknown>): ReferralReward {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id as string) || '',
    referralId: (row.referral_id as string) || '',
    rewardType: (row.reward_type as string) || 'free_month',
    rewardValue: (row.reward_value as number) || 0,
    status: (row.status as string) || 'pending',
    appliedAt: row.applied_at as string | undefined,
  };
}

// ============================================================================
// Summary builder
// ============================================================================

function getReferralTier(successfulReferrals: number): ReferralTier | null {
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (successfulReferrals >= REFERRAL_TIERS[i].minReferrals) {
      return REFERRAL_TIERS[i];
    }
  }
  return null;
}

function buildSummary(referrals: Referral[], code: string): ReferralSummary {
  const totalReferrals = referrals.length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const qualifiedReferrals = referrals.filter(
    r => r.status === 'converted' || r.status === 'rewarded'
  ).length;

  const currentTier = getReferralTier(qualifiedReferrals);
  const currentTierIndex = currentTier ? REFERRAL_TIERS.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex < REFERRAL_TIERS.length - 1
    ? REFERRAL_TIERS[currentTierIndex + 1]
    : null;
  const referralsToNextTier = nextTier ? nextTier.minReferrals - qualifiedReferrals : 0;

  return {
    totalReferrals,
    pendingReferrals,
    qualifiedReferrals,
    totalRewardsEarned: qualifiedReferrals,
    currentTier,
    nextTier,
    referralsToNextTier,
    referralCode: code,
  };
}

// ============================================================================
// Code generator
// ============================================================================

function generateReferralCode(userId: string): string {
  const prefix = userId.slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AMINY-${prefix}-${random}`;
}

// ============================================================================
// Hook
// ============================================================================

export function useReferralData(userId?: string): ReferralData & {
  refresh: () => Promise<void>;
  getOrCreateCode: () => Promise<ReferralCode | null>;
  trackReferral: (referrerCode: string, referredUserId: string) => Promise<Referral | null>;
  getShareMessage: () => { title: string; body: string; url: string } | null;
} {
  const [data, setData] = useState<ReferralData>({
    referralCode: null,
    referrals: [],
    rewards: [],
    summary: null,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [codeResult, referralsResult, rewardsResult] = await Promise.all([
        supabase
          .from('referral_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .then(null, (err: unknown) => {
            console.warn('[Referral] referral_codes fetch failed:', err);
            return { data: null, error: err };
          }),
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false })
          .then(null, (err: unknown) => {
            console.warn('[Referral] referrals fetch failed:', err);
            return { data: null, error: err };
          }),
        supabase
          .from('referral_rewards')
          .select('*')
          .eq('user_id', userId)
          .order('applied_at', { ascending: false })
          .then(null, (err: unknown) => {
            console.warn('[Referral] referral_rewards fetch failed:', err);
            return { data: null, error: err };
          }),
      ]);

      const codeRows = Array.isArray(codeResult?.data) ? codeResult.data : [];
      const referralCode = codeRows.length > 0
        ? mapReferralCode(codeRows[0] as Record<string, unknown>)
        : null;

      const referrals = Array.isArray(referralsResult?.data)
        ? referralsResult.data.map((r: Record<string, unknown>) => mapReferral(r))
        : [];

      const rewards = Array.isArray(rewardsResult?.data)
        ? rewardsResult.data.map((r: Record<string, unknown>) => mapReward(r))
        : [];

      const summary = buildSummary(referrals, referralCode?.code || '');

      // Cache for offline
      writeCache(CACHE_KEY, { referralCode, referrals, rewards, summary });

      setData({
        referralCode,
        referrals,
        rewards,
        summary,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[Referral] Load failed, using cache:', error);

      const cached = readCache<{
        referralCode: ReferralCode | null;
        referrals: Referral[];
        rewards: ReferralReward[];
        summary: ReferralSummary | null;
      }>(CACHE_KEY, { referralCode: null, referrals: [], rewards: [], summary: null });

      setData({
        referralCode: cached.referralCode,
        referrals: cached.referrals,
        rewards: cached.rewards,
        summary: cached.summary,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load referral data',
      });
    }
  }, [userId]);

  const getOrCreateCode = useCallback(async (): Promise<ReferralCode | null> => {
    if (!userId) return null;

    // If we already have a code, return it
    if (data.referralCode) return data.referralCode;

    try {
      // Check for existing code
      const { data: existingCodes } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (existingCodes && existingCodes.length > 0) {
        const code = mapReferralCode(existingCodes[0] as Record<string, unknown>);
        setData(prev => {
          const summary = buildSummary(prev.referrals, code.code);
          return { ...prev, referralCode: code, summary };
        });
        return code;
      }

      // Create new code
      const newCodeString = generateReferralCode(userId);
      const { data: newCode, error } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          code: newCodeString,
          reward_type: 'free_month',
          reward_value: 1,
        })
        .select()
        .single();

      if (error || !newCode) throw new Error('Failed to create referral code');

      const code = mapReferralCode(newCode as Record<string, unknown>);
      setData(prev => {
        const summary = buildSummary(prev.referrals, code.code);
        return { ...prev, referralCode: code, summary };
      });
      return code;
    } catch (err) {
      console.error('[Referral] getOrCreateCode failed:', err);
      return null;
    }
  }, [userId, data.referralCode]);

  const trackReferralFn = useCallback(async (
    referrerCode: string,
    referredUserId: string,
  ): Promise<Referral | null> => {
    try {
      // Find the referral code
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', referrerCode)
        .eq('is_active', true)
        .single();

      if (!codeData) return null;

      // Check if already referred
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_id', referredUserId)
        .maybeSingle();

      if (existingReferral) {
        return mapReferral(existingReferral as Record<string, unknown>);
      }

      // Create new referral
      const { data: newReferral, error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: codeData.user_id,
          referred_id: referredUserId,
          referral_code: referrerCode,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !newReferral) throw new Error('Failed to create referral');

      // Increment code usage
      await supabase
        .from('referral_codes')
        .update({ uses: (codeData.uses || 0) + 1 })
        .eq('id', codeData.id);

      const referral = mapReferral(newReferral as Record<string, unknown>);

      // Update local state
      setData(prev => {
        const referrals = [referral, ...prev.referrals];
        const summary = buildSummary(referrals, prev.referralCode?.code || '');
        writeCache(CACHE_KEY, { ...prev, referrals, summary });
        return { ...prev, referrals, summary };
      });

      return referral;
    } catch (err) {
      console.error('[Referral] trackReferral failed:', err);
      return null;
    }
  }, []);

  const getShareMessage = useCallback((): { title: string; body: string; url: string } | null => {
    if (!data.referralCode) return null;
    return {
      title: 'Join me on Aminy!',
      body: `You're invited to Aminy - the AI-powered companion for families navigating autism and neurodivergence. Use code ${data.referralCode.code} to get $25 toward your first expert session!`,
      url: `https://aminy.ai/join?ref=${data.referralCode.code}`,
    };
  }, [data.referralCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh: loadData,
    getOrCreateCode,
    trackReferral: trackReferralFn,
    getShareMessage,
  };
}

export default useReferralData;
