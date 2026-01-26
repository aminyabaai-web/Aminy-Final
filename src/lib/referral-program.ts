/**
 * Referral Program
 * Implements viral referral mechanics for organic growth
 * Addresses: "Referral program at launch"
 */

// Referral types
export type ReferralRewardType = 'free-month' | 'session-credit' | 'tier-upgrade' | 'marketplace-credit';

export interface ReferralCode {
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
  status: 'pending' | 'qualified' | 'rewarded' | 'expired';
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
    description: 'Get 1 month free for each friend who joins',
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
    badgeColor: '#577590',
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
    url: `https://aminy.app/join?ref=${referralCode}`,
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
  const qualifiedReferrals = referrals.filter(r => r.status === 'qualified' || r.status === 'rewarded').length;

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
// PERSISTENCE LAYER (Local Storage for MVP, would be Supabase in production)
// ============================================================================

const STORAGE_KEYS = {
  REFERRAL_CODES: 'aminy_referral_codes',
  REFERRALS: 'aminy_referrals',
};

function getFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Create or get existing referral code for user
 */
export async function getOrCreateReferralCode(userId: string): Promise<ReferralCode> {
  const codes = getFromStorage<ReferralCode>(STORAGE_KEYS.REFERRAL_CODES);

  // Check for existing code
  const existingCode = codes.find(c => c.userId === userId && c.isActive);
  if (existingCode) {
    return existingCode;
  }

  // Create new code
  const newCode: ReferralCode = {
    code: generateReferralCode(userId),
    userId,
    createdAt: new Date().toISOString(),
    currentUses: 0,
    isActive: true,
  };

  codes.push(newCode);
  saveToStorage(STORAGE_KEYS.REFERRAL_CODES, codes);

  return newCode;
}

/**
 * Track a new referral
 */
export async function trackReferral(
  referrerCode: string,
  referredUserId: string
): Promise<Referral | null> {
  const codes = getFromStorage<ReferralCode>(STORAGE_KEYS.REFERRAL_CODES);
  const referrals = getFromStorage<Referral>(STORAGE_KEYS.REFERRALS);

  // Find the referral code
  const codeData = codes.find(c => c.code === referrerCode && c.isActive);
  if (!codeData) {
    return null; // Invalid code
  }

  // Check if this user was already referred
  const existingReferral = referrals.find(r => r.referredUserId === referredUserId);
  if (existingReferral) {
    return existingReferral; // Already referred
  }

  // Create new referral
  const newReferral: Referral = {
    id: `ref-${Date.now()}`,
    referrerUserId: codeData.userId,
    referredUserId,
    referralCode: referrerCode,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  referrals.push(newReferral);
  saveToStorage(STORAGE_KEYS.REFERRALS, referrals);

  // Increment code usage
  const codeIndex = codes.findIndex(c => c.code === referrerCode);
  if (codeIndex !== -1) {
    codes[codeIndex].currentUses++;
    saveToStorage(STORAGE_KEYS.REFERRAL_CODES, codes);
  }

  return newReferral;
}

/**
 * Get all referrals for a user (as referrer)
 */
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  const referrals = getFromStorage<Referral>(STORAGE_KEYS.REFERRALS);
  return referrals
    .filter(r => r.referrerUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Mark a referral as qualified (after 14 days on paid plan)
 */
export async function qualifyReferral(referralId: string): Promise<Referral | null> {
  const referrals = getFromStorage<Referral>(STORAGE_KEYS.REFERRALS);
  const index = referrals.findIndex(r => r.id === referralId);

  if (index === -1) return null;

  referrals[index] = {
    ...referrals[index],
    status: 'qualified',
    qualificationDate: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.REFERRALS, referrals);
  return referrals[index];
}

/**
 * Apply rewards for a qualified referral
 */
export async function applyReferralRewards(referralId: string): Promise<Referral | null> {
  const referrals = getFromStorage<Referral>(STORAGE_KEYS.REFERRALS);
  const index = referrals.findIndex(r => r.id === referralId);

  if (index === -1 || referrals[index].status !== 'qualified') return null;

  const now = new Date().toISOString();

  referrals[index] = {
    ...referrals[index],
    status: 'rewarded',
    rewardedAt: now,
    referrerReward: {
      ...REFERRAL_PROGRAM_CONFIG.referrerReward,
      appliedAt: now,
    },
    referredReward: {
      ...REFERRAL_PROGRAM_CONFIG.referredReward,
      appliedAt: now,
    },
  };

  saveToStorage(STORAGE_KEYS.REFERRALS, referrals);
  return referrals[index];
}

/**
 * Generate mock referrals for demo
 */
export function generateMockReferrals(userId: string): Referral[] {
  const statuses: Referral['status'][] = ['pending', 'pending', 'qualified', 'rewarded', 'rewarded'];
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
