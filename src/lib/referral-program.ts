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
  // Qualification: referred user must be on paid tier for 14+ days
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
  qualificationPeriodDays: 14, // Friend must stay on paid plan for 14 days
  requiredTier: 'core', // Minimum tier for qualification
  maxReferralsPerUser: 20, // Max 20 referrals per user
  maxRewardsPerMonth: 5, // Max 5 free months per month
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
