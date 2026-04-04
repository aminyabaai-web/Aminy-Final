/**
 * Upgrade Triggers Service
 *
 * Smart, contextual upgrade prompts based on usage patterns.
 * Shows upgrade opportunities at optimal moments without being annoying.
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type TriggerType =
  | 'message_limit'
  | 'feature_locked'
  | 'storage_limit'
  | 'memory_limit'
  | 'document_limit'
  | 'engagement_high'
  | 'session_milestone'
  | 'feature_discovery';

export interface UpgradeTrigger {
  type: TriggerType;
  title: string;
  message: string;
  ctaText: string;
  ctaAction: 'upgrade' | 'trial' | 'learn_more';
  variant?: 'soft' | 'standard' | 'urgent' | 'inline' | 'banner' | 'modal' | 'toast';
  dismissable: boolean;
  cooldownMs: number; // How long before showing again
  metadata?: Record<string, unknown>;
  // Extended properties used by UpgradePrompt component
  id?: string;
  ctaLink?: string;
  urgency?: 'low' | 'medium' | 'high';
  description?: string;
  showFreeTrial?: boolean;
  recommendedTier?: string;
}

export interface TriggerConfig {
  enabled: boolean;
  showAfterDismissals: number; // How many times to show before respecting dismissal
  minSessionDuration: number; // Minimum session time before showing (ms)
  maxPerSession: number; // Max upgrade prompts per session
}

export interface UsageState {
  messagesUsed: number;
  messagesLimit: number;
  documentsUsed: number;
  documentsLimit: number;
  memoryDays: number;
  tier: 'free' | 'starter' | 'core' | 'pro' | 'proplus';
  sessionStartTime: number;
  promptsShownThisSession: number;
  lastTriggerTime?: number;
  dismissedTriggers: Set<string>;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: TriggerConfig = {
  enabled: true,
  showAfterDismissals: 3,
  minSessionDuration: 60000, // 1 minute
  maxPerSession: 3,
};

const TRIGGER_COOLDOWNS: Record<TriggerType, number> = {
  message_limit: 0, // Always show at limit
  feature_locked: 30 * 60 * 1000, // 30 minutes
  storage_limit: 60 * 60 * 1000, // 1 hour
  memory_limit: 24 * 60 * 60 * 1000, // 24 hours
  document_limit: 60 * 60 * 1000, // 1 hour
  engagement_high: 7 * 24 * 60 * 60 * 1000, // 7 days
  session_milestone: 24 * 60 * 60 * 1000, // 24 hours
  feature_discovery: 3 * 24 * 60 * 60 * 1000, // 3 days
};

// ============================================================================
// Trigger Messages (A/B testable)
// ============================================================================

const TRIGGER_MESSAGES: Record<TriggerType, UpgradeTrigger[]> = {
  message_limit: [
    {
      type: 'message_limit',
      title: "You're on a roll!",
      message: "You've used all your daily messages. Upgrade to Core for unlimited conversations with Aminy.",
      ctaText: 'Unlock Unlimited',
      ctaAction: 'upgrade',
      variant: 'standard',
      dismissable: false,
      cooldownMs: 0,
    },
    {
      type: 'message_limit',
      title: 'Daily limit reached',
      message: "Want to keep the conversation going? Core members get unlimited messages.",
      ctaText: 'Try Plus Free',
      ctaAction: 'trial',
      variant: 'soft',
      dismissable: true,
      cooldownMs: 0,
    },
  ],
  feature_locked: [
    {
      type: 'feature_locked',
      title: 'Pro Feature',
      message: 'This feature is available with Pro. Unlock advanced capabilities to support your journey.',
      ctaText: 'See Pro Benefits',
      ctaAction: 'learn_more',
      variant: 'soft',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.feature_locked,
    },
  ],
  storage_limit: [
    {
      type: 'storage_limit',
      title: 'Storage Full',
      message: "You've reached your document storage limit. Upgrade for unlimited secure storage.",
      ctaText: 'Get More Storage',
      ctaAction: 'upgrade',
      variant: 'standard',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.storage_limit,
    },
  ],
  memory_limit: [
    {
      type: 'memory_limit',
      title: 'Want Aminy to remember more?',
      message: 'Core members get 30 days of memory, so Aminy truly understands your journey.',
      ctaText: 'Extend Memory',
      ctaAction: 'upgrade',
      variant: 'soft',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.memory_limit,
    },
  ],
  document_limit: [
    {
      type: 'document_limit',
      title: 'Document Vault Full',
      message: "Store unlimited documents with Plus. Keep all your child's records in one secure place.",
      ctaText: 'Upgrade Vault',
      ctaAction: 'upgrade',
      variant: 'standard',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.document_limit,
    },
  ],
  engagement_high: [
    {
      type: 'engagement_high',
      title: "You're getting so much from Aminy!",
      message: "You've been using Aminy regularly. Unlock the full experience with Plus.",
      ctaText: 'See What You Get',
      ctaAction: 'learn_more',
      variant: 'soft',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.engagement_high,
    },
  ],
  session_milestone: [
    {
      type: 'session_milestone',
      title: "You've been with us for a while!",
      message: 'Thanks for spending time with Aminy. Want to unlock premium features?',
      ctaText: 'Explore Premium',
      ctaAction: 'learn_more',
      variant: 'soft',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.session_milestone,
    },
  ],
  feature_discovery: [
    {
      type: 'feature_discovery',
      title: 'Did you know?',
      message: 'Pro members can generate professional reports for IEP meetings and provider visits.',
      ctaText: 'Learn More',
      ctaAction: 'learn_more',
      variant: 'soft',
      dismissable: true,
      cooldownMs: TRIGGER_COOLDOWNS.feature_discovery,
    },
  ],
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'aminy_upgrade_triggers';

interface StoredState {
  dismissedTriggers: string[];
  dismissCounts: Record<string, number>;
  lastTriggerTimes: Record<string, number>;
  promptsShownToday: number;
  lastResetDate: string;
}

function getStoredState(): StoredState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { dismissedTriggers: [], dismissCounts: {}, lastTriggerTimes: {}, promptsShownToday: 0, lastResetDate: new Date().toDateString() };
}

function setStoredState(state: Partial<StoredState>): void {
  try {
    const current = getStoredState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {}
}

// ============================================================================
// Trigger Logic
// ============================================================================

export function shouldShowTrigger(
  triggerType: TriggerType,
  usage: UsageState,
  config: TriggerConfig = DEFAULT_CONFIG
): boolean {
  if (!config.enabled) return false;
  if (usage.tier !== 'free') return false; // Only show to free users

  const stored = getStoredState();
  const now = Date.now();

  // Reset daily counter if new day
  if (stored.lastResetDate !== new Date().toDateString()) {
    setStoredState({ promptsShownToday: 0, lastResetDate: new Date().toDateString() });
    stored.promptsShownToday = 0;
  }

  // Check session limits
  if (usage.promptsShownThisSession >= config.maxPerSession) return false;
  if (now - usage.sessionStartTime < config.minSessionDuration) return false;

  // Check cooldown
  const lastShown = stored.lastTriggerTimes[triggerType] || 0;
  const cooldown = TRIGGER_COOLDOWNS[triggerType];
  if (now - lastShown < cooldown) return false;

  // Check if permanently dismissed
  const dismissCount = stored.dismissCounts[triggerType] || 0;
  if (dismissCount >= config.showAfterDismissals) return false;

  return true;
}

export function getTrigger(
  triggerType: TriggerType,
  variantIndex?: number
): UpgradeTrigger | null {
  const triggers = TRIGGER_MESSAGES[triggerType];
  if (!triggers || triggers.length === 0) return null;

  const index = variantIndex ?? Math.floor(Math.random() * triggers.length);
  return triggers[index % triggers.length];
}

export function recordTriggerShown(triggerType: TriggerType): void {
  const stored = getStoredState();
  stored.lastTriggerTimes[triggerType] = Date.now();
  stored.promptsShownToday = (stored.promptsShownToday || 0) + 1;
  setStoredState(stored);
}

export function recordTriggerDismissed(triggerType: TriggerType): void {
  const stored = getStoredState();
  stored.dismissCounts[triggerType] = (stored.dismissCounts[triggerType] || 0) + 1;
  setStoredState(stored);
}

// ============================================================================
// Usage Checks
// ============================================================================

export function checkMessageLimit(used: number, limit: number): UpgradeTrigger | null {
  if (used >= limit) {
    return getTrigger('message_limit');
  }
  // Show warning at 80%
  if (used >= limit * 0.8) {
    const trigger = getTrigger('message_limit', 1); // Softer variant
    if (trigger) trigger.variant = 'soft';
    return trigger;
  }
  return null;
}

export function checkDocumentLimit(used: number, limit: number): UpgradeTrigger | null {
  if (used >= limit) {
    return getTrigger('document_limit');
  }
  return null;
}

export function checkFeatureLocked(featureName: string): UpgradeTrigger | null {
  const trigger = getTrigger('feature_locked');
  if (trigger) {
    trigger.metadata = { feature: featureName };
    trigger.message = trigger.message.replace('This feature', `${featureName}`);
  }
  return trigger;
}

export function checkEngagementMilestone(sessionsThisWeek: number): UpgradeTrigger | null {
  if (sessionsThisWeek >= 5) {
    return getTrigger('engagement_high');
  }
  return null;
}

// ============================================================================
// React Hook
// ============================================================================

export function useUpgradeTrigger(
  tier: UsageState['tier'],
  messagesUsed: number,
  messagesLimit: number
) {
  const [currentTrigger, setCurrentTrigger] = useState<UpgradeTrigger | null>(null);
  const [sessionState, setSessionState] = useState({
    sessionStartTime: Date.now(),
    promptsShownThisSession: 0,
  });

  // Check for triggers
  useEffect(() => {
    if (tier !== 'free') {
      setCurrentTrigger(null);
      return;
    }

    const usage: UsageState = {
      messagesUsed,
      messagesLimit,
      documentsUsed: 0,
      documentsLimit: 0,
      memoryDays: 0,
      tier,
      ...sessionState,
      dismissedTriggers: new Set(),
    };

    // Check message limit trigger
    if (shouldShowTrigger('message_limit', usage)) {
      const trigger = checkMessageLimit(messagesUsed, messagesLimit);
      if (trigger) {
        setCurrentTrigger(trigger);
        recordTriggerShown('message_limit');
        setSessionState(prev => ({
          ...prev,
          promptsShownThisSession: prev.promptsShownThisSession + 1,
        }));
      }
    }
  }, [tier, messagesUsed, messagesLimit, sessionState]);

  const dismiss = useCallback(() => {
    if (currentTrigger) {
      recordTriggerDismissed(currentTrigger.type);
      setCurrentTrigger(null);
    }
  }, [currentTrigger]);

  const showFeatureLocked = useCallback((feature: string) => {
    const trigger = checkFeatureLocked(feature);
    if (trigger) {
      setCurrentTrigger(trigger);
      recordTriggerShown('feature_locked');
    }
  }, []);

  return {
    currentTrigger,
    dismiss,
    showFeatureLocked,
    hasActiveTrigger: currentTrigger !== null,
  };
}

// ============================================================================
// Contextual types (used by UpgradeModal)
// ============================================================================

export type ContextualTrigger = TriggerType;

export interface ContextualUpgradePrompt {
  targetTier: 'core' | 'pro';
  headline: string;
  subtext: string;
  valueProp: string;
  ctaLabel: string;
}

export function dismissContextualUpgrade(triggerType: ContextualTrigger): void {
  recordTriggerDismissed(triggerType);
}

// ============================================================================
// Export
// ============================================================================

export default {
  shouldShowTrigger,
  getTrigger,
  recordTriggerShown,
  recordTriggerDismissed,
  checkMessageLimit,
  checkDocumentLimit,
  checkFeatureLocked,
  checkEngagementMilestone,
  useUpgradeTrigger,
};
