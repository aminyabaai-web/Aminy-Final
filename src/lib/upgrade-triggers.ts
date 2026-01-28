/**
 * Upgrade Triggers System
 *
 * Contextual upgrade prompts when users hit tier limits.
 * Features:
 * - Smart timing (not every limit hit)
 * - A/B test prompt copy
 * - Free trial offers
 * - Usage tracking for optimization
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export type TriggerType =
  | 'message_limit'      // Hit daily AI message limit
  | 'document_limit'     // Hit vault document limit
  | 'memory_limit'       // Memory expired (free tier)
  | 'feature_locked'     // Tried to access premium feature
  | 'session_limit'      // Hit telehealth session limit
  | 'export_limit'       // Hit export/report limit
  | 'provider_limit';    // Hit provider connection limit

export type TriggerContext = {
  triggerType: TriggerType;
  currentTier: 'free' | 'starter' | 'core' | 'pro' | 'proplus';
  usageCount: number;      // How many times they've hit this limit
  lastTriggered?: string;  // ISO timestamp
  featureName?: string;    // What feature they tried to access
  sessionCount?: number;   // Total sessions for engagement scoring
};

export interface UpgradePrompt {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  dismissable: boolean;
  variant: 'modal' | 'banner' | 'inline' | 'toast';
  recommendedTier: 'starter' | 'core' | 'pro';
  showFreeTrial: boolean;
  urgency: 'low' | 'medium' | 'high';
  abTestGroup?: string;
}

// ============================================
// TRIGGER CONFIGURATION
// ============================================

const TRIGGER_COOLDOWN_HOURS: Record<TriggerType, number> = {
  message_limit: 4,      // Don't show more than every 4 hours
  document_limit: 24,    // Once per day
  memory_limit: 48,      // Every 2 days
  feature_locked: 2,     // Every 2 hours per feature
  session_limit: 24,     // Once per day
  export_limit: 12,      // Every 12 hours
  provider_limit: 24,    // Once per day
};

const MAX_TRIGGERS_PER_SESSION = 3; // Don't annoy users

// ============================================
// PROMPT TEMPLATES
// ============================================

const PROMPT_TEMPLATES: Record<TriggerType, {
  title: string;
  descriptions: string[];  // A/B test variants
  ctaTexts: string[];     // A/B test variants
}> = {
  message_limit: {
    title: "You've reached your daily message limit",
    descriptions: [
      "Upgrade to keep the conversation going with Aminy. Unlimited messages means unlimited support for your family.",
      "Your daily messages are used up, but your journey doesn't have to stop here. Upgrade for unlimited access.",
      "Aminy is here for you 24/7 with unlimited messages on paid plans. Ready to unlock full access?",
    ],
    ctaTexts: [
      "Upgrade for Unlimited",
      "Continue the Conversation",
      "Unlock Full Access",
    ],
  },

  document_limit: {
    title: "Document Vault is Full",
    descriptions: [
      "Your vault has reached its limit. Upgrade to store all of your child's important documents in one secure place.",
      "Keep all your IEPs, evaluations, and therapy reports organized. Upgrade for more vault space.",
      "Never lose track of important documents. Upgrade for expanded vault storage.",
    ],
    ctaTexts: [
      "Expand My Vault",
      "Upgrade Storage",
      "Get More Space",
    ],
  },

  memory_limit: {
    title: "Aminy's Memory is Limited",
    descriptions: [
      "On the free plan, Aminy only remembers the last 7 days. Upgrade so Aminy can truly know your family's journey.",
      "Unlock long-term memory so Aminy can provide personalized support based on your full history.",
      "Better memory means better support. Upgrade to help Aminy understand your family over time.",
    ],
    ctaTexts: [
      "Unlock Memory",
      "Get Personalized Support",
      "Upgrade for Better Memory",
    ],
  },

  feature_locked: {
    title: "Premium Feature",
    descriptions: [
      "This feature is available on higher tiers. Upgrade to unlock the full power of Aminy.",
      "Get access to this feature and many more with an upgraded plan.",
      "Ready to level up your support? This feature is waiting for you on a premium plan.",
    ],
    ctaTexts: [
      "Unlock This Feature",
      "See Premium Plans",
      "Upgrade Now",
    ],
  },

  session_limit: {
    title: "Telehealth Sessions Limit Reached",
    descriptions: [
      "You've used your included telehealth sessions. Upgrade for more direct access to providers.",
      "Need more provider sessions? Upgrade your plan for additional telehealth access.",
      "Keep the momentum going with more telehealth sessions available on higher tiers.",
    ],
    ctaTexts: [
      "Get More Sessions",
      "Upgrade Plan",
      "See Options",
    ],
  },

  export_limit: {
    title: "Export Limit Reached",
    descriptions: [
      "You've reached your export limit for this period. Upgrade for unlimited reports and exports.",
      "Need more reports? Premium plans include unlimited exports and comprehensive analytics.",
      "Share progress reports freely with unlimited exports on paid plans.",
    ],
    ctaTexts: [
      "Unlock Unlimited Exports",
      "Upgrade for Reports",
      "Get Full Access",
    ],
  },

  provider_limit: {
    title: "Provider Connection Limit",
    descriptions: [
      "Connect with more providers by upgrading your plan. Build your care team without limits.",
      "Your child deserves a full support team. Upgrade to connect with more providers.",
      "Expand your care network with more provider connections on premium plans.",
    ],
    ctaTexts: [
      "Connect More Providers",
      "Build Your Team",
      "Upgrade Now",
    ],
  },
};

// ============================================
// TIER RECOMMENDATIONS
// ============================================

const TIER_RECOMMENDATIONS: Record<TriggerType, {
  fromFree: 'starter' | 'core' | 'pro';
  fromStarter: 'core' | 'pro';
  fromCore: 'pro';
}> = {
  message_limit: { fromFree: 'starter', fromStarter: 'core', fromCore: 'pro' },
  document_limit: { fromFree: 'starter', fromStarter: 'core', fromCore: 'pro' },
  memory_limit: { fromFree: 'starter', fromStarter: 'core', fromCore: 'pro' },
  feature_locked: { fromFree: 'core', fromStarter: 'core', fromCore: 'pro' },
  session_limit: { fromFree: 'core', fromStarter: 'core', fromCore: 'pro' },
  export_limit: { fromFree: 'starter', fromStarter: 'core', fromCore: 'pro' },
  provider_limit: { fromFree: 'core', fromStarter: 'core', fromCore: 'pro' },
};

// ============================================
// TRACKING
// ============================================

let sessionTriggerCount = 0;
const recentTriggers = new Map<string, number>(); // triggerKey -> timestamp

/**
 * Check if we should show an upgrade prompt (respects cooldowns and limits)
 */
export function shouldShowPrompt(context: TriggerContext): boolean {
  // Don't spam users in a single session
  if (sessionTriggerCount >= MAX_TRIGGERS_PER_SESSION) {
    return false;
  }

  // Check cooldown
  const triggerKey = `${context.triggerType}-${context.featureName || 'default'}`;
  const lastTrigger = recentTriggers.get(triggerKey);
  const cooldownMs = TRIGGER_COOLDOWN_HOURS[context.triggerType] * 60 * 60 * 1000;

  if (lastTrigger && Date.now() - lastTrigger < cooldownMs) {
    return false;
  }

  // Don't show prompts to users who just saw one
  if (context.lastTriggered) {
    const timeSinceLast = Date.now() - new Date(context.lastTriggered).getTime();
    if (timeSinceLast < 60 * 60 * 1000) { // 1 hour minimum between any triggers
      return false;
    }
  }

  return true;
}

/**
 * Get the appropriate upgrade prompt for a trigger
 */
export function getUpgradePrompt(context: TriggerContext): UpgradePrompt | null {
  if (!shouldShowPrompt(context)) {
    return null;
  }

  const template = PROMPT_TEMPLATES[context.triggerType];
  const tierRec = TIER_RECOMMENDATIONS[context.triggerType];

  // Determine recommended tier based on current tier
  let recommendedTier: 'starter' | 'core' | 'pro';
  if (context.currentTier === 'free') {
    recommendedTier = tierRec.fromFree;
  } else if (context.currentTier === 'starter') {
    recommendedTier = tierRec.fromStarter;
  } else if (context.currentTier === 'core') {
    recommendedTier = tierRec.fromCore;
  } else {
    // Pro+ users shouldn't see upgrade prompts
    return null;
  }

  // A/B test: Select variant based on user ID hash
  const variantIndex = context.usageCount % template.descriptions.length;

  // Determine urgency based on usage
  let urgency: 'low' | 'medium' | 'high' = 'low';
  if (context.usageCount > 5) urgency = 'medium';
  if (context.usageCount > 10) urgency = 'high';

  // Determine variant (modal for high urgency, inline for low)
  let variant: UpgradePrompt['variant'] = 'inline';
  if (urgency === 'high') variant = 'modal';
  else if (urgency === 'medium') variant = 'banner';

  // Show free trial for engaged free users
  const showFreeTrial = context.currentTier === 'free' &&
    (context.sessionCount || 0) > 10 &&
    context.usageCount >= 3;

  // Record this trigger
  const triggerKey = `${context.triggerType}-${context.featureName || 'default'}`;
  recentTriggers.set(triggerKey, Date.now());
  sessionTriggerCount++;

  return {
    id: `${context.triggerType}-${Date.now()}`,
    title: template.title,
    description: template.descriptions[variantIndex],
    ctaText: template.ctaTexts[variantIndex],
    ctaLink: `/pricing?upgrade=${recommendedTier}&source=${context.triggerType}`,
    dismissable: urgency !== 'high',
    variant,
    recommendedTier,
    showFreeTrial,
    urgency,
    abTestGroup: `v${variantIndex + 1}`,
  };
}

/**
 * Track when a prompt is shown (for analytics)
 */
export async function trackPromptShown(
  userId: string,
  prompt: UpgradePrompt,
  context: TriggerContext
): Promise<void> {
  try {
    await supabase.from('upgrade_prompt_analytics').insert({
      user_id: userId,
      prompt_id: prompt.id,
      trigger_type: context.triggerType,
      current_tier: context.currentTier,
      recommended_tier: prompt.recommendedTier,
      variant: prompt.variant,
      ab_test_group: prompt.abTestGroup,
      urgency: prompt.urgency,
      shown_free_trial: prompt.showFreeTrial,
      shown_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to track prompt:', error);
  }
}

/**
 * Track when a prompt leads to upgrade
 */
export async function trackPromptConversion(
  userId: string,
  promptId: string,
  newTier: string
): Promise<void> {
  try {
    await supabase.from('upgrade_prompt_analytics').update({
      converted: true,
      converted_tier: newTier,
      converted_at: new Date().toISOString(),
    }).eq('prompt_id', promptId);
  } catch (error) {
    console.error('Failed to track conversion:', error);
  }
}

/**
 * Track when a prompt is dismissed
 */
export async function trackPromptDismissed(
  userId: string,
  promptId: string
): Promise<void> {
  try {
    await supabase.from('upgrade_prompt_analytics').update({
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    }).eq('prompt_id', promptId);
  } catch (error) {
    console.error('Failed to track dismissal:', error);
  }
}

/**
 * Reset session trigger count (call on new session)
 */
export function resetSessionTriggers(): void {
  sessionTriggerCount = 0;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick check and get prompt for message limit
 */
export function checkMessageLimitPrompt(
  currentTier: TriggerContext['currentTier'],
  usageCount: number
): UpgradePrompt | null {
  return getUpgradePrompt({
    triggerType: 'message_limit',
    currentTier,
    usageCount,
  });
}

/**
 * Quick check and get prompt for feature lock
 */
export function checkFeatureLockedPrompt(
  featureName: string,
  currentTier: TriggerContext['currentTier']
): UpgradePrompt | null {
  return getUpgradePrompt({
    triggerType: 'feature_locked',
    currentTier,
    usageCount: 1,
    featureName,
  });
}

/**
 * Quick check and get prompt for document limit
 */
export function checkDocumentLimitPrompt(
  currentTier: TriggerContext['currentTier'],
  usageCount: number
): UpgradePrompt | null {
  return getUpgradePrompt({
    triggerType: 'document_limit',
    currentTier,
    usageCount,
  });
}

export default {
  shouldShowPrompt,
  getUpgradePrompt,
  trackPromptShown,
  trackPromptConversion,
  trackPromptDismissed,
  resetSessionTriggers,
  checkMessageLimitPrompt,
  checkFeatureLockedPrompt,
  checkDocumentLimitPrompt,
};
