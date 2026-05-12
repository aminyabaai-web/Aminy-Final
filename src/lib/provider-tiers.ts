// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Tier System — Three tiers matching the Headway-for-ABA strategy
 *
 * Tier 1: "Aminy Verified" — Cash-pay BCBAs who want clients
 *   Free tools. 10-15% booking fee on sessions.
 *
 * Tier 2: "Aminy Practice" — Insurance-accepting BCBAs
 *   Free tools. 15-20% claim facilitation fee. Credentialing included.
 *
 * Tier 3: "Aminy Group" — BCBA practices with RBTs
 *   Free tools. Same claim %. RBT management, supervision, group analytics.
 */

export type ProviderTier = 'verified' | 'practice' | 'group';

export interface ProviderTierConfig {
  tier: ProviderTier;
  name: string;
  tagline: string;
  description: string;
  monthlyFee: number; // $0 for all — free tools
  bookingFeePercent: number; // % of cash-pay sessions
  claimFacilitationPercent: number; // % of insurance claims
  features: string[];
  requirements: string[];
  idealFor: string;
  estimatedOnboardingDays: number;
}

export const PROVIDER_TIERS: Record<ProviderTier, ProviderTierConfig> = {
  verified: {
    tier: 'verified',
    name: 'Aminy Verified',
    tagline: 'Start seeing clients today',
    description: 'Get listed in our family marketplace, use telehealth tools, and AI-assisted notes. No insurance hassle.',
    monthlyFee: 0,
    bookingFeePercent: 12,
    claimFacilitationPercent: 0,
    features: [
      'Listed in Aminy family marketplace',
      'Telehealth video sessions (Daily.co)',
      'AI-assisted session notes (SOAP)',
      'Client scheduling & calendar',
      'Set your own cash-pay rates',
      'Secure HIPAA-compliant messaging',
      'Basic analytics (sessions, revenue)',
    ],
    requirements: [
      'Active BCBA, BCaBA, or RBT certification',
      'Valid state license',
      'NPI number',
      'Malpractice insurance',
    ],
    idealFor: 'BCBAs who want clients without insurance complexity',
    estimatedOnboardingDays: 1,
  },
  practice: {
    tier: 'practice',
    name: 'Aminy Practice',
    tagline: 'Your independent ABA practice, powered',
    description: 'Everything in Verified plus insurance credentialing, claim submission, denial management, and guaranteed payment.',
    monthlyFee: 0,
    bookingFeePercent: 12,
    claimFacilitationPercent: 18,
    features: [
      'Everything in Verified',
      'Insurance credentialing (we handle paperwork)',
      'Claim submission & tracking',
      'Denial management with AI appeal letters',
      'Guaranteed biweekly payments',
      'EVV for Medicaid compliance',
      'Prior authorization support',
      'CPT code recommendations with confidence scoring',
      'Coverage coach for families',
      'Practice KPIs dashboard',
    ],
    requirements: [
      'Everything in Verified',
      'CAQH profile (we help set up)',
      'Background check consent',
      'Bank account for direct deposit',
    ],
    idealFor: 'BCBAs ready to accept insurance independently',
    estimatedOnboardingDays: 30,
  },
  group: {
    tier: 'group',
    name: 'Aminy Group',
    tagline: 'Run your ABA practice like a business',
    description: 'Everything in Practice plus RBT management, supervision tracking, multi-provider scheduling, and group analytics.',
    monthlyFee: 0,
    bookingFeePercent: 10,
    claimFacilitationPercent: 15,
    features: [
      'Everything in Practice',
      'Add and manage RBTs',
      'Supervision compliance tracking',
      'RBT payroll tracking (hours, rates)',
      'Multi-provider scheduling',
      'Group practice analytics',
      'Client assignment & caseload management',
      'Supervision documentation',
      'Team communication tools',
      'Volume discount on claim facilitation (15% vs 18%)',
    ],
    requirements: [
      'Everything in Practice',
      'At least 1 RBT under supervision',
      'Group NPI (recommended)',
    ],
    idealFor: 'BCBAs supervising RBTs who want their own practice',
    estimatedOnboardingDays: 30,
  },
};

/**
 * Calculate provider earnings for a given tier
 */
export function calculateProviderEarnings(
  tier: ProviderTier,
  sessionRate: number, // cents
  sessionsPerWeek: number,
  isInsurance: boolean
): {
  grossWeekly: number;
  aminyFee: number;
  netWeekly: number;
  netMonthly: number;
  netAnnual: number;
  feePercent: number;
} {
  const config = PROVIDER_TIERS[tier];
  const feePercent = isInsurance
    ? config.claimFacilitationPercent
    : config.bookingFeePercent;

  const grossWeekly = sessionRate * sessionsPerWeek;
  const aminyFee = Math.round(grossWeekly * (feePercent / 100));
  const netWeekly = grossWeekly - aminyFee;

  return {
    grossWeekly,
    aminyFee,
    netWeekly,
    netMonthly: netWeekly * 4,
    netAnnual: netWeekly * 52,
    feePercent,
  };
}

/**
 * Recommend a tier based on provider answers
 */
export function recommendTier(answers: {
  wantsInsurance: boolean;
  hasRBTs: boolean;
  rbtCount: number;
}): ProviderTier {
  if (answers.hasRBTs && answers.rbtCount > 0) return 'group';
  if (answers.wantsInsurance) return 'practice';
  return 'verified';
}

/**
 * Calculate Aminy revenue from a provider
 */
export function calculateAminyRevenue(
  tier: ProviderTier,
  monthlyClaimVolume: number, // cents
  monthlyCashPayVolume: number // cents
): {
  fromClaims: number;
  fromCashPay: number;
  totalMonthly: number;
  totalAnnual: number;
} {
  const config = PROVIDER_TIERS[tier];
  const fromClaims = Math.round(monthlyClaimVolume * (config.claimFacilitationPercent / 100));
  const fromCashPay = Math.round(monthlyCashPayVolume * (config.bookingFeePercent / 100));

  return {
    fromClaims,
    fromCashPay,
    totalMonthly: fromClaims + fromCashPay,
    totalAnnual: (fromClaims + fromCashPay) * 12,
  };
}
