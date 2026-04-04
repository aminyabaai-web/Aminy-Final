/**
 * Referral Engine
 * Core referral system with conversion funnel tracking, reward calculation,
 * and referral code management for families and providers.
 *
 * Format: AMINY-XXXX (4-character alphanumeric)
 * Rewards:
 *   - Referrer: 1 free month of current tier
 *   - Referee: 14-day Pro trial (not Starter)
 *   - Both: $25 session credit after referee's first booked session
 */

// ============================================================================
// Types
// ============================================================================

export type ReferralStatus = 'created' | 'shared' | 'clicked' | 'signed_up' | 'trial_started' | 'first_session' | 'converted' | 'expired';

export type RewardType = 'free_month' | 'pro_trial' | 'session_credit' | 'provider_credit' | 'featured_badge';

export type ShareChannel = 'sms' | 'email' | 'whatsapp' | 'copy_link' | 'native_share' | 'qr_code';

export interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  userType: 'family' | 'provider';
  createdAt: string;
  expiresAt: string | null;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

export interface ReferralReward {
  id: string;
  referralId: string;
  userId: string;
  type: RewardType;
  value: number;
  description: string;
  status: 'pending' | 'applied' | 'expired';
  appliedAt: string | null;
  expiresAt: string | null;
}

export interface FunnelEvent {
  referralCodeId: string;
  step: 'shared' | 'clicked' | 'downloaded' | 'account_created' | 'first_session_booked';
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface ReferralChain {
  referrerId: string;
  referrerName: string;
  refereeId: string;
  refereeName: string;
  code: string;
  status: ReferralStatus;
  funnelEvents: FunnelEvent[];
  rewards: ReferralReward[];
  createdAt: string;
  convertedAt: string | null;
}

export interface ReferralStats {
  totalShares: number;
  totalClicks: number;
  totalSignups: number;
  totalSessionsBooked: number;
  totalConverted: number;
  conversionRate: number;
  rewardsEarned: ReferralReward[];
  pendingRewards: ReferralReward[];
  chain: ReferralChain[];
}

// ============================================================================
// Supabase import (lazy — avoids breaking if env vars are missing)
// ============================================================================

import { supabase } from './supabase-compat';

// ============================================================================
// Supabase-backed async variants
// ============================================================================

/**
 * Generate or retrieve a referral code for the current Supabase user.
 * Falls back to the localStorage implementation if not authenticated.
 */
export async function generateReferralCodeAsync(userId: string): Promise<ReferralCode> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');

    // Call the Supabase DB function that creates/returns the user's code
    const { data, error } = await supabase.rpc('generate_referral_code', { p_user_id: user.id });
    if (error) throw error;

    const code = data as string;
    const result: ReferralCode = {
      id: `ref-supabase-${user.id}`,
      code,
      userId: user.id,
      userType: 'family',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      maxUses: 50,
      currentUses: 0,
      isActive: true,
    };
    // Mirror to localStorage for offline access
    saveCode(result);
    return result;
  } catch {
    // Fallback to sync localStorage version
    return generateReferralCode(userId);
  }
}

/**
 * Apply a referral code during signup via Supabase.
 * Falls back to localStorage implementation if not authenticated.
 */
export async function applyReferralCodeAsync(
  code: string,
  refereeUserId: string,
  refereeName: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; error?: string; chain?: ReferralChain }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('process_referral_signup', {
      p_new_user_id: user.id,
      p_referral_code: code.trim().toUpperCase(),
      p_ip_address: ipAddress ?? null,
      p_user_agent: userAgent ?? null,
    });
    if (error) throw error;

    const result = data as { success: boolean; error?: string; referral_id?: string; referrer_id?: string };
    if (!result.success) return { success: false, error: result.error };

    // Build a minimal chain object
    const chain: ReferralChain = {
      referrerId: result.referrer_id ?? '',
      referrerName: 'Referrer',
      refereeId: refereeUserId,
      refereeName,
      code: code.trim().toUpperCase(),
      status: 'signed_up',
      funnelEvents: [{ referralCodeId: result.referral_id ?? '', step: 'account_created', timestamp: new Date().toISOString() }],
      rewards: [],
      createdAt: new Date().toISOString(),
      convertedAt: null,
    };
    saveChain(chain);
    return { success: true, chain };
  } catch {
    return applyReferralCode(code, refereeUserId, refereeName);
  }
}

/**
 * Record the referee's first session — triggers rewards in Supabase.
 * Falls back to localStorage implementation.
 */
export async function recordFirstSessionAsync(refereeUserId: string): Promise<ReferralReward[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('credit_referrer_on_subscription', {
      p_referred_user_id: refereeUserId,
    });
    if (error) throw error;
    const result = data as { success: boolean };
    if (!result.success) throw new Error('Credit failed');

    // Also run localStorage version for local state
    return recordFirstSession(refereeUserId);
  } catch {
    return recordFirstSession(refereeUserId);
  }
}

/**
 * Get referral stats from Supabase.
 * Falls back to localStorage implementation.
 */
export async function getReferralStatsAsync(userId: string): Promise<ReferralStats> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('get_referral_stats', { p_user_id: user.id });
    if (error) throw error;

    const stats = data as {
      code: string;
      total_referrals: number;
      pending_referrals: number;
      credited_referrals: number;
      total_credits_earned: number;
    };

    if (!stats || stats.total_referrals == null) throw new Error('No data');

    // Get full chain from localStorage and merge with Supabase counts
    const localStats = getReferralStats(userId);
    return {
      ...localStats,
      totalSignups: Number(stats.total_referrals),
      totalConverted: Number(stats.credited_referrals),
      conversionRate: stats.total_referrals > 0
        ? Number(((stats.credited_referrals / stats.total_referrals) * 100).toFixed(1))
        : 0,
    };
  } catch {
    return getReferralStats(userId);
  }
}

// ============================================================================
// Constants
// ============================================================================

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 for clarity
const CODE_LENGTH = 4;
const STORAGE_KEY = 'aminy_referral_code';
const FUNNEL_KEY = 'aminy_referral_funnel';
const CHAIN_KEY = 'aminy_referral_chain';

// ============================================================================
// Code Generation
// ============================================================================

function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

/**
 * Generate a unique referral code for a family.
 * Format: AMINY-XXXX
 */
export function generateReferralCode(userId: string): ReferralCode {
  const existing = getStoredCode(userId);
  if (existing) return existing;

  const code: ReferralCode = {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: `AMINY-${generateRandomCode()}`,
    userId,
    userType: 'family',
    createdAt: new Date().toISOString(),
    expiresAt: null,
    maxUses: 50,
    currentUses: 0,
    isActive: true,
  };

  saveCode(code);
  return code;
}

/**
 * Generate a provider referral code.
 * Format: AMINY-P-XXXX
 */
export function generateProviderReferralCode(providerId: string): ReferralCode {
  const storageKey = `${STORAGE_KEY}_provider_${providerId}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* regenerate */ }
  }

  const code: ReferralCode = {
    id: `pref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: `AMINY-P-${generateRandomCode()}`,
    userId: providerId,
    userType: 'provider',
    createdAt: new Date().toISOString(),
    expiresAt: null,
    maxUses: 100,
    currentUses: 0,
    isActive: true,
  };

  localStorage.setItem(storageKey, JSON.stringify(code));
  return code;
}

// ============================================================================
// Code Application & Tracking
// ============================================================================

/**
 * Apply a referral code during signup.
 * Validates the code and initiates the referral chain.
 */
export function applyReferralCode(
  code: string,
  refereeUserId: string,
  refereeName: string
): { success: boolean; error?: string; chain?: ReferralChain } {
  const normalizedCode = code.trim().toUpperCase();

  // Validate format
  if (!/^AMINY-[A-Z0-9]{4}$/.test(normalizedCode) && !/^AMINY-P-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: 'Invalid referral code format' };
  }

  // Look up the code from all stored codes
  const allCodes = getAllStoredCodes();
  const referralCode = allCodes.find(c => c.code === normalizedCode && c.isActive);

  if (!referralCode) {
    return { success: false, error: 'Referral code not found or expired' };
  }

  if (referralCode.currentUses >= referralCode.maxUses) {
    return { success: false, error: 'Referral code has reached maximum uses' };
  }

  if (referralCode.userId === refereeUserId) {
    return { success: false, error: 'Cannot use your own referral code' };
  }

  // Create the referral chain
  const chain: ReferralChain = {
    referrerId: referralCode.userId,
    referrerName: 'Referrer', // Would come from DB in production
    refereeId: refereeUserId,
    refereeName,
    code: normalizedCode,
    status: 'signed_up',
    funnelEvents: [
      {
        referralCodeId: referralCode.id,
        step: 'account_created',
        timestamp: new Date().toISOString(),
      },
    ],
    rewards: [],
    createdAt: new Date().toISOString(),
    convertedAt: null,
  };

  // Create pending rewards
  // Referee gets 14-day Pro trial
  chain.rewards.push({
    id: `rwd-${Date.now()}-1`,
    referralId: chain.referrerId,
    userId: refereeUserId,
    type: 'pro_trial',
    value: 14,
    description: '14-day Pro trial',
    status: 'applied',
    appliedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Referrer gets pending free month (applied after first session)
  chain.rewards.push({
    id: `rwd-${Date.now()}-2`,
    referralId: chain.referrerId,
    userId: referralCode.userId,
    type: 'free_month',
    value: 1,
    description: '1 free month (pending first session)',
    status: 'pending',
    appliedAt: null,
    expiresAt: null,
  });

  // Save chain
  saveChain(chain);

  // Increment usage
  referralCode.currentUses += 1;
  saveCode(referralCode);

  return { success: true, chain };
}

/**
 * Track a funnel event for a referral code.
 */
export function trackFunnelEvent(
  codeId: string,
  step: FunnelEvent['step'],
  metadata?: Record<string, string>
): void {
  const events = getFunnelEvents();
  events.push({
    referralCodeId: codeId,
    step,
    timestamp: new Date().toISOString(),
    metadata,
  });
  localStorage.setItem(FUNNEL_KEY, JSON.stringify(events));
}

/**
 * Record that the referee booked their first session.
 * Triggers the $25 session credit for both parties.
 */
export function recordFirstSession(refereeUserId: string): ReferralReward[] {
  const chains = getAllChains();
  const chain = chains.find(c => c.refereeId === refereeUserId && c.status !== 'converted');

  if (!chain) return [];

  chain.status = 'first_session';
  chain.funnelEvents.push({
    referralCodeId: chain.code,
    step: 'first_session_booked',
    timestamp: new Date().toISOString(),
  });

  const newRewards: ReferralReward[] = [];

  // $25 session credit for referrer
  const referrerCredit: ReferralReward = {
    id: `rwd-${Date.now()}-3`,
    referralId: chain.referrerId,
    userId: chain.referrerId,
    type: 'session_credit',
    value: 25,
    description: '$25 session credit',
    status: 'applied',
    appliedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };
  chain.rewards.push(referrerCredit);
  newRewards.push(referrerCredit);

  // $25 session credit for referee
  const refereeCredit: ReferralReward = {
    id: `rwd-${Date.now()}-4`,
    referralId: chain.referrerId,
    userId: chain.refereeId,
    type: 'session_credit',
    value: 25,
    description: '$25 session credit',
    status: 'applied',
    appliedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };
  chain.rewards.push(refereeCredit);
  newRewards.push(refereeCredit);

  // Apply the pending free month for referrer
  const pendingMonth = chain.rewards.find(
    r => r.userId === chain.referrerId && r.type === 'free_month' && r.status === 'pending'
  );
  if (pendingMonth) {
    pendingMonth.status = 'applied';
    pendingMonth.appliedAt = new Date().toISOString();
    newRewards.push(pendingMonth);
  }

  chain.status = 'converted';
  chain.convertedAt = new Date().toISOString();

  saveAllChains(chains);
  return newRewards;
}

// ============================================================================
// Stats & Calculations
// ============================================================================

/**
 * Calculate rewards for a user across all their referral chains.
 */
export function calculateRewards(userId: string): {
  earned: ReferralReward[];
  pending: ReferralReward[];
  totalValue: number;
} {
  const chains = getAllChains().filter(c => c.referrerId === userId);
  const allRewards = chains.flatMap(c => c.rewards).filter(r => r.userId === userId);

  const earned = allRewards.filter(r => r.status === 'applied');
  const pending = allRewards.filter(r => r.status === 'pending');

  const totalValue = earned.reduce((sum, r) => {
    if (r.type === 'session_credit') return sum + r.value;
    if (r.type === 'free_month') return sum + (r.value * 29); // Approximate month value
    return sum;
  }, 0);

  return { earned, pending, totalValue };
}

/**
 * Get comprehensive referral stats for a user.
 */
export function getReferralStats(userId: string): ReferralStats {
  const chains = getAllChains().filter(c => c.referrerId === userId);
  const funnelEvents = getFunnelEvents();
  const userCode = getStoredCode(userId);
  const userEvents = userCode
    ? funnelEvents.filter(e => e.referralCodeId === userCode.id || e.referralCodeId === userCode.code)
    : [];

  const totalShares = userEvents.filter(e => e.step === 'shared').length + chains.length;
  const totalClicks = userEvents.filter(e => e.step === 'clicked').length;
  const totalSignups = chains.filter(c => ['signed_up', 'trial_started', 'first_session', 'converted'].includes(c.status)).length;
  const totalSessionsBooked = chains.filter(c => ['first_session', 'converted'].includes(c.status)).length;
  const totalConverted = chains.filter(c => c.status === 'converted').length;

  const rewards = calculateRewards(userId);

  return {
    totalShares: Math.max(totalShares, chains.length),
    totalClicks: Math.max(totalClicks, totalSignups),
    totalSignups,
    totalSessionsBooked,
    totalConverted,
    conversionRate: totalShares > 0 ? (totalConverted / totalShares) * 100 : 0,
    rewardsEarned: rewards.earned,
    pendingRewards: rewards.pending,
    chain: chains,
  };
}

// ============================================================================
// Share Message Templates
// ============================================================================

export interface ShareMessage {
  id: string;
  label: string;
  audience: 'parent' | 'therapist' | 'general';
  subject: string;
  body: string;
}

export function getShareMessages(code: string, childName?: string): ShareMessage[] {
  const url = `https://aminy.ai/join?ref=${code}`;
  const child = childName || 'our child';

  return [
    {
      id: 'parent-to-parent',
      label: 'Parent to Parent',
      audience: 'parent',
      subject: `We found something amazing for ${child}'s therapy`,
      body: `Hey! We found an incredible app called Aminy for ${child}'s therapy journey. It helps us track progress, book sessions with BCBAs, and even has calming activities. Use my code ${code} to get a 14-day free Pro trial + $25 toward your first session.\n\n${url}`,
    },
    {
      id: 'to-therapist',
      label: 'To a Therapist',
      audience: 'therapist',
      subject: 'Our family uses Aminy for care coordination',
      body: `Hi! Our family has been using Aminy for scheduling, activities, and care plans for ${child}. It makes coordinating between home and clinic so much easier. I thought you might want to check it out for your practice. My referral code is ${code}.\n\n${url}`,
    },
    {
      id: 'general',
      label: 'General Share',
      audience: 'general',
      subject: 'Check out Aminy for therapy & care coordination',
      body: `If your child needs ABA, speech, or behavioral therapy, check out Aminy. It's an all-in-one app for finding providers, tracking progress, and managing care plans. Use my code ${code} for a 14-day free Pro trial + $25 session credit.\n\n${url}`,
    },
  ];
}

// ============================================================================
// localStorage Helpers
// ============================================================================

function getStoredCode(userId: string): ReferralCode | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCode(code: ReferralCode): void {
  localStorage.setItem(`${STORAGE_KEY}_${code.userId}`, JSON.stringify(code));
  // Also save to an index for lookups
  const allCodes = getAllStoredCodes();
  const idx = allCodes.findIndex(c => c.id === code.id);
  if (idx >= 0) {
    allCodes[idx] = code;
  } else {
    allCodes.push(code);
  }
  localStorage.setItem(`${STORAGE_KEY}_all`, JSON.stringify(allCodes));
}

function getAllStoredCodes(): ReferralCode[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_all`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getFunnelEvents(): FunnelEvent[] {
  try {
    const stored = localStorage.getItem(FUNNEL_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getAllChains(): ReferralChain[] {
  try {
    const stored = localStorage.getItem(CHAIN_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveChain(chain: ReferralChain): void {
  const chains = getAllChains();
  chains.push(chain);
  localStorage.setItem(CHAIN_KEY, JSON.stringify(chains));
}

function saveAllChains(chains: ReferralChain[]): void {
  localStorage.setItem(CHAIN_KEY, JSON.stringify(chains));
}

// ============================================================================
// Demo / Mock Data
// ============================================================================

export function generateMockStats(userId: string): ReferralStats {
  const code = generateReferralCode(userId);
  const now = Date.now();

  const mockChains: ReferralChain[] = [
    {
      referrerId: userId,
      referrerName: 'You',
      refereeId: 'user-sarah',
      refereeName: 'Sarah M.',
      code: code.code,
      status: 'converted',
      funnelEvents: [
        { referralCodeId: code.id, step: 'shared', timestamp: new Date(now - 30 * 86400000).toISOString() },
        { referralCodeId: code.id, step: 'account_created', timestamp: new Date(now - 28 * 86400000).toISOString() },
        { referralCodeId: code.id, step: 'first_session_booked', timestamp: new Date(now - 14 * 86400000).toISOString() },
      ],
      rewards: [
        { id: 'r1', referralId: userId, userId, type: 'free_month', value: 1, description: '1 free month', status: 'applied', appliedAt: new Date(now - 14 * 86400000).toISOString(), expiresAt: null },
        { id: 'r2', referralId: userId, userId, type: 'session_credit', value: 25, description: '$25 session credit', status: 'applied', appliedAt: new Date(now - 14 * 86400000).toISOString(), expiresAt: null },
      ],
      createdAt: new Date(now - 30 * 86400000).toISOString(),
      convertedAt: new Date(now - 14 * 86400000).toISOString(),
    },
    {
      referrerId: userId,
      referrerName: 'You',
      refereeId: 'user-james',
      refereeName: 'James K.',
      code: code.code,
      status: 'converted',
      funnelEvents: [
        { referralCodeId: code.id, step: 'shared', timestamp: new Date(now - 21 * 86400000).toISOString() },
        { referralCodeId: code.id, step: 'account_created', timestamp: new Date(now - 18 * 86400000).toISOString() },
        { referralCodeId: code.id, step: 'first_session_booked', timestamp: new Date(now - 7 * 86400000).toISOString() },
      ],
      rewards: [
        { id: 'r3', referralId: userId, userId, type: 'free_month', value: 1, description: '1 free month', status: 'applied', appliedAt: new Date(now - 7 * 86400000).toISOString(), expiresAt: null },
        { id: 'r4', referralId: userId, userId, type: 'session_credit', value: 25, description: '$25 session credit', status: 'applied', appliedAt: new Date(now - 7 * 86400000).toISOString(), expiresAt: null },
      ],
      createdAt: new Date(now - 21 * 86400000).toISOString(),
      convertedAt: new Date(now - 7 * 86400000).toISOString(),
    },
    {
      referrerId: userId,
      referrerName: 'You',
      refereeId: 'user-taylor',
      refereeName: 'Taylor R.',
      code: code.code,
      status: 'trial_started',
      funnelEvents: [
        { referralCodeId: code.id, step: 'shared', timestamp: new Date(now - 5 * 86400000).toISOString() },
        { referralCodeId: code.id, step: 'account_created', timestamp: new Date(now - 3 * 86400000).toISOString() },
      ],
      rewards: [
        { id: 'r5', referralId: userId, userId, type: 'free_month', value: 1, description: '1 free month (pending)', status: 'pending', appliedAt: null, expiresAt: null },
      ],
      createdAt: new Date(now - 5 * 86400000).toISOString(),
      convertedAt: null,
    },
    {
      referrerId: userId,
      referrerName: 'You',
      refereeId: 'user-morgan',
      refereeName: 'Morgan P.',
      code: code.code,
      status: 'signed_up',
      funnelEvents: [
        { referralCodeId: code.id, step: 'shared', timestamp: new Date(now - 2 * 86400000).toISOString() },
        { referralCodeId: code.id, step: 'account_created', timestamp: new Date(now - 1 * 86400000).toISOString() },
      ],
      rewards: [],
      createdAt: new Date(now - 2 * 86400000).toISOString(),
      convertedAt: null,
    },
  ];

  const appliedRewards = mockChains.flatMap(c => c.rewards).filter(r => r.userId === userId && r.status === 'applied');
  const pendingRewards = mockChains.flatMap(c => c.rewards).filter(r => r.userId === userId && r.status === 'pending');

  return {
    totalShares: 8,
    totalClicks: 12,
    totalSignups: 4,
    totalSessionsBooked: 2,
    totalConverted: 2,
    conversionRate: 25,
    rewardsEarned: appliedRewards,
    pendingRewards,
    chain: mockChains,
  };
}
