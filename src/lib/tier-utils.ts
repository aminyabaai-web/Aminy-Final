/**
 * Tier utilities for consistent naming and feature gating across the app
 *
 * Pricing Strategy (per McKinsey MVP spec - Updated):
 * - Free: $0 (discovery tier, hooks users)
 * - Starter: $6.99/mo or $59/year (entry empowerment)
 * - Core: $14.99/mo or $129/year (full companion - recommended)
 * - Pro: $29.99/mo or $279/year (premium with BCBA access)
 * - Pro Plus: $49.99/mo or $479/year (enterprise features + human credit)
 */

export type TierType = 'free' | 'starter' | 'core' | 'pro' | 'proplus';

// Map internal tier names to UI-friendly display names
export const tierDisplayNames: Record<TierType, string> = {
  free: 'Free',
  starter: 'Starter',
  core: 'Core',
  pro: 'Pro',
  proplus: 'Pro+',
};

// Pricing configuration
export const tierPricing: Record<TierType, { monthly: number; yearly: number; savings?: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 6.99, yearly: 59, savings: 30 },
  core: { monthly: 14.99, yearly: 129, savings: 28 },
  pro: { monthly: 29.99, yearly: 279, savings: 22 },
  proplus: { monthly: 49.99, yearly: 479, savings: 20 },
};

// Map UI names back to internal tier types
export function normalizeTierName(tier: string): TierType {
  const normalized = tier.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');

  const mapping: Record<string, TierType> = {
    'free': 'free',
    'starter': 'starter',
    'basic': 'starter',
    'core': 'core',
    'pro': 'pro',
    'proplus': 'proplus',
    'pro+': 'proplus',
    'premium': 'proplus',
    'enterprise': 'proplus',
  };

  return mapping[normalized] || 'free';
}

// Get display name for a tier
export function getTierDisplayName(tier?: TierType | string): string {
  if (!tier) return tierDisplayNames.free;

  if (tier in tierDisplayNames) {
    return tierDisplayNames[tier as TierType];
  }

  const normalized = normalizeTierName(tier);
  return tierDisplayNames[normalized];
}

// Get tier pricing (monthly by default)
export function getTierPrice(tier: TierType, billing: 'monthly' | 'yearly' = 'monthly'): number {
  return tierPricing[tier][billing];
}

// Get yearly savings
export function getTierYearlySavings(tier: TierType): number {
  return tierPricing[tier].savings || 0;
}

// Feature definitions for each tier
const tierFeatureMap: Record<TierType, string[]> = {
  free: [
    'limited-ai-chat',        // 5 messages/day
    'basic-daily-plan',       // Pre-set activities only
    'basic-calm-tools',       // 5 calm tools
    'basic-tracking',         // Simple completion tracking
    'community-read-only',    // View community, can't post
  ],
  starter: [
    'limited-ai-chat',        // 20 messages/day
    'basic-daily-plan',
    'custom-tasks',           // Add custom tasks
    'full-calm-tools',        // All calm tools
    'basic-tracking',
    'favorites',              // Save favorites
    'reminders',              // Push notifications
    'community-participate',  // Can post in community
    'basic-reports',          // Weekly summaries
  ],
  core: [
    'unlimited-ai-chat',      // No limits
    'adaptive-daily-plan',    // AI-suggested activities
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',      // Detailed progress
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',           // Monthly analytics
    'vault-access',           // Document storage
    'ai-document-analysis',   // AI reads IEPs, medical records
    'multi-child',            // Up to 3 children
    'marketplace-access',     // Book sessions (pay per use)
    'care-plan-export',       // Export for providers
  ],
  pro: [
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child',            // Up to 3 children
    'marketplace-access',
    'care-plan-export',
    'bcba-consult',           // Monthly BCBA session included
    'clinical-reports',       // IEP-ready reports
    'priority-support',       // Faster response
    'early-access',           // Beta features
    'discounted-sessions',    // 20% off marketplace
    'live-ai-video-30',       // 30 min/month Live AI Video
  ],
  proplus: [
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child-unlimited',  // Unlimited children
    'marketplace-access',
    'care-plan-export',
    'bcba-consult',           // Monthly BCBA session included
    'clinical-reports',       // IEP-ready reports
    'priority-support',       // Faster response
    'early-access',           // Beta features
    'discounted-sessions',    // 30% off marketplace
    'live-ai-video-unlimited',// Unlimited Live AI Video
    'human-credit-monthly',   // Monthly human consultation credit
    'expiring-share-links',   // Time-limited secure sharing
    'advanced-analytics',     // Detailed progress analytics
    'api-access',             // API access for integrations
    'dedicated-support',      // Dedicated support channel
  ],
};

// Check if tier has specific feature
export function hasTierFeature(tier: TierType | undefined, feature: string): boolean {
  if (!tier) return false;
  return tierFeatureMap[tier]?.includes(feature) || false;
}

// Get all features for a tier
export function getTierFeatureList(tier: TierType): string[] {
  return tierFeatureMap[tier] || [];
}

// Compare tiers (returns true if tier1 >= tier2)
export function compareTiers(tier1: TierType | undefined, tier2: TierType): boolean {
  const tierLevels: Record<TierType, number> = {
    free: 0,
    starter: 1,
    core: 2,
    pro: 3,
    proplus: 4,
  };

  if (!tier1) return false;
  return tierLevels[tier1] >= tierLevels[tier2];
}

// Get tier level as number (for comparisons)
export function getTierLevel(tier: TierType | undefined): number {
  const tierLevels: Record<TierType, number> = {
    free: 0,
    starter: 1,
    core: 2,
    pro: 3,
    proplus: 4,
  };
  return tier ? tierLevels[tier] : 0;
}

// Get human-readable feature descriptions for paywall/marketing
export function getTierFeatureDescriptions(tier: TierType): string[] {
  const descriptions: Record<TierType, string[]> = {
    free: [
      'Daily plan with curated activities',
      '5 AI chat messages per day',
      'Basic calm tools for stressful moments',
      'Track daily progress',
    ],
    starter: [
      'Everything in Free, plus:',
      '20 AI chat messages per day',
      'Create custom tasks and routines',
      'All calm tools with reminders',
      'Weekly progress summaries',
      'Join the parent community',
    ],
    core: [
      'Everything in Starter, plus:',
      'Unlimited AI chat (text & voice)',
      'AI reads your IEPs & medical records',
      'Adaptive plans that learn what works',
      'Book BCBA/RBT sessions (pay per use)',
      'Support up to 3 children',
      'Export care plans for providers',
    ],
    pro: [
      'Everything in Core, plus:',
      'One monthly BCBA consultation included',
      '30 min/month Live AI Video coaching',
      'Provider-ready clinical reports',
      '20% off all marketplace sessions',
      'Priority support',
    ],
    proplus: [
      'Everything in Pro, plus:',
      'Unlimited Live AI Video coaching',
      'Monthly human consultation credit',
      'Unlimited children profiles',
      '30% off all marketplace sessions',
      'Time-limited secure sharing links',
      'Advanced analytics dashboard',
      'Dedicated support channel',
    ],
  };

  return descriptions[tier] || descriptions.free;
}

// Get AI message limits per tier
export function getAIMessageLimit(tier: TierType | undefined): number | null {
  const limits: Record<TierType, number | null> = {
    free: 5,
    starter: 20,
    core: null,    // unlimited
    pro: null,     // unlimited
    proplus: null, // unlimited
  };
  return tier ? limits[tier] : 5;
}

// Check if tier has unlimited AI
export function hasUnlimitedAI(tier: TierType | undefined): boolean {
  return tier === 'core' || tier === 'pro' || tier === 'proplus';
}

// Get Live AI Video limits per tier (minutes per month)
export function getLiveAIVideoLimit(tier: TierType | undefined): number | null {
  const limits: Record<TierType, number | null> = {
    free: 0,       // No Live AI Video
    starter: 0,    // No Live AI Video
    core: 0,       // No Live AI Video (pay per use via marketplace)
    pro: 30,       // 30 minutes/month included
    proplus: null, // unlimited
  };
  return tier ? limits[tier] : 0;
}

// Check if tier has Live AI Video access
export function hasLiveAIVideo(tier: TierType | undefined): boolean {
  return tier === 'pro' || tier === 'proplus';
}

// Get the recommended tier (for highlighting in UI)
export function getRecommendedTier(): TierType {
  return 'core';
}

// Get upgrade path from current tier
export function getUpgradePath(currentTier: TierType): TierType | null {
  const upgradePaths: Record<TierType, TierType | null> = {
    free: 'starter',
    starter: 'core',
    core: 'pro',
    pro: 'proplus',
    proplus: null,
  };
  return upgradePaths[currentTier];
}

// Get marketplace discount percentage by tier
export function getMarketplaceDiscount(tier: TierType | undefined): number {
  const discounts: Record<TierType, number> = {
    free: 0,
    starter: 0,
    core: 0,
    pro: 20,     // 20% off
    proplus: 30, // 30% off
  };
  return tier ? discounts[tier] : 0;
}

// Check if tier includes BCBA consultation
export function includesBCBAConsult(tier: TierType | undefined): boolean {
  return tier === 'pro' || tier === 'proplus';
}

// Get max children allowed per tier
export function getMaxChildren(tier: TierType | undefined): number | null {
  const limits: Record<TierType, number | null> = {
    free: 1,
    starter: 1,
    core: 3,
    pro: 3,
    proplus: null, // unlimited
  };
  return tier ? limits[tier] : 1;
}
