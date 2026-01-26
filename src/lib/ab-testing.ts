/**
 * ab-testing.ts
 * A/B Testing Infrastructure for Aminy
 *
 * Features:
 * - Experiment definition and management
 * - User bucketing (deterministic)
 * - Event tracking
 * - Conversion analysis
 * - Feature flags integration
 */

import { supabase } from '../utils/supabase/client';

// Experiment configuration
export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  targetAudience?: AudienceFilter;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed';
  primaryMetric: string;
  secondaryMetrics?: string[];
}

export interface Variant {
  id: string;
  name: string;
  weight: number; // Percentage (0-100)
  config?: Record<string, unknown>;
}

export interface AudienceFilter {
  tiers?: string[];
  minAge?: number;
  maxAge?: number;
  regions?: string[];
  percentage?: number; // What % of eligible users to include
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: Date;
}

export interface ExperimentEvent {
  experimentId: string;
  variantId: string;
  userId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  timestamp: Date;
}

// Active experiments
const EXPERIMENTS: Experiment[] = [
  {
    id: 'onboarding-flow-v2',
    name: 'Onboarding Flow V2',
    description: 'Test new streamlined onboarding with fewer steps',
    variants: [
      { id: 'control', name: 'Original (12 steps)', weight: 50 },
      { id: 'treatment', name: 'Streamlined (8 steps)', weight: 50 },
    ],
    startDate: new Date('2026-01-01'),
    status: 'running',
    primaryMetric: 'onboarding_completion_rate',
    secondaryMetrics: ['time_to_complete', 'd7_retention'],
  },
  {
    id: 'paywall-timing',
    name: 'Paywall Timing Test',
    description: 'Test showing paywall after 3 vs 5 free messages',
    variants: [
      { id: 'control', name: '5 free messages', weight: 33 },
      { id: 'early', name: '3 free messages', weight: 33 },
      { id: 'late', name: '7 free messages', weight: 34 },
    ],
    startDate: new Date('2026-01-15'),
    status: 'running',
    primaryMetric: 'conversion_rate',
    secondaryMetrics: ['messages_before_upgrade', 'revenue_per_user'],
  },
  {
    id: 'morning-mission-prompt',
    name: 'Morning Mission Prompt Style',
    description: 'Test different prompt styles for morning missions',
    variants: [
      { id: 'control', name: 'Standard notification', weight: 50 },
      { id: 'gamified', name: 'Gamified with streak bonus', weight: 50 },
    ],
    startDate: new Date('2026-01-10'),
    status: 'running',
    primaryMetric: 'mission_completion_rate',
    secondaryMetrics: ['streak_length', 'morning_engagement'],
  },
  {
    id: 'ai-response-length',
    name: 'AI Response Length',
    description: 'Test shorter vs longer AI responses',
    variants: [
      { id: 'standard', name: 'Standard length', weight: 50 },
      { id: 'concise', name: 'Concise responses', weight: 50 },
    ],
    startDate: new Date('2026-01-20'),
    status: 'running',
    primaryMetric: 'user_satisfaction',
    secondaryMetrics: ['messages_per_session', 'follow_up_questions'],
  },
];

// In-memory cache for assignments
const assignmentCache: Map<string, ExperimentAssignment> = new Map();

/**
 * Generate a deterministic hash for user bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get variant assignment for a user in an experiment
 * Uses deterministic bucketing so same user always gets same variant
 */
export function getVariant(experimentId: string, userId: string): Variant | null {
  // Check cache first
  const cacheKey = `${experimentId}:${userId}`;
  const cached = assignmentCache.get(cacheKey);
  if (cached) {
    const experiment = EXPERIMENTS.find(e => e.id === experimentId);
    return experiment?.variants.find(v => v.id === cached.variantId) || null;
  }

  // Find experiment
  const experiment = EXPERIMENTS.find(e => e.id === experimentId);
  if (!experiment || experiment.status !== 'running') {
    return null;
  }

  // Deterministic bucketing
  const hash = hashString(`${experimentId}:${userId}`);
  const bucket = hash % 100;

  // Find variant based on weights
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      // Cache assignment
      assignmentCache.set(cacheKey, {
        experimentId,
        variantId: variant.id,
        userId,
        assignedAt: new Date(),
      });

      // Log assignment (fire and forget)
      logAssignment(experimentId, variant.id, userId);

      return variant;
    }
  }

  return experiment.variants[0]; // Fallback to first variant
}

/**
 * Check if user is in a specific variant
 */
export function isInVariant(experimentId: string, variantId: string, userId: string): boolean {
  const variant = getVariant(experimentId, userId);
  return variant?.id === variantId;
}

/**
 * Get config value for user's variant
 */
export function getVariantConfig<T>(
  experimentId: string,
  userId: string,
  key: string,
  defaultValue: T
): T {
  const variant = getVariant(experimentId, userId);
  if (!variant?.config || !(key in variant.config)) {
    return defaultValue;
  }
  return variant.config[key] as T;
}

/**
 * Log experiment assignment to Supabase
 */
async function logAssignment(
  experimentId: string,
  variantId: string,
  userId: string
): Promise<void> {
  try {
    await supabase.from('ab_experiment_assignments').insert({
      experiment_id: experimentId,
      variant_id: variantId,
      user_id: userId,
      assigned_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ABTesting] Failed to log assignment:', error);
  }
}

/**
 * Track an event for an experiment
 */
export async function trackExperimentEvent(
  experimentId: string,
  userId: string,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  const variant = getVariant(experimentId, userId);
  if (!variant) return;

  const event: ExperimentEvent = {
    experimentId,
    variantId: variant.id,
    userId,
    eventType,
    eventData,
    timestamp: new Date(),
  };

  try {
    await supabase.from('ab_experiment_events').insert({
      experiment_id: event.experimentId,
      variant_id: event.variantId,
      user_id: event.userId,
      event_type: event.eventType,
      event_data: event.eventData,
      created_at: event.timestamp.toISOString(),
    });
  } catch (error) {
    console.error('[ABTesting] Failed to track event:', error);
  }
}

/**
 * Get all active experiments
 */
export function getActiveExperiments(): Experiment[] {
  return EXPERIMENTS.filter(e => e.status === 'running');
}

/**
 * Get experiment by ID
 */
export function getExperiment(experimentId: string): Experiment | undefined {
  return EXPERIMENTS.find(e => e.id === experimentId);
}

/**
 * Calculate experiment results (simplified)
 */
export async function getExperimentResults(experimentId: string): Promise<{
  experiment: Experiment;
  variantResults: Array<{
    variantId: string;
    variantName: string;
    participants: number;
    conversions: number;
    conversionRate: number;
  }>;
} | null> {
  const experiment = EXPERIMENTS.find(e => e.id === experimentId);
  if (!experiment) return null;

  try {
    // Get assignments
    const { data: assignments } = await supabase
      .from('ab_experiment_assignments')
      .select('variant_id, user_id')
      .eq('experiment_id', experimentId);

    // Get conversion events
    const { data: events } = await supabase
      .from('ab_experiment_events')
      .select('variant_id, user_id, event_type')
      .eq('experiment_id', experimentId)
      .eq('event_type', experiment.primaryMetric);

    const variantResults = experiment.variants.map(variant => {
      const variantAssignments = assignments?.filter(a => a.variant_id === variant.id) || [];
      const variantConversions = events?.filter(e => e.variant_id === variant.id) || [];
      const uniqueConversions = new Set(variantConversions.map(e => e.user_id)).size;

      return {
        variantId: variant.id,
        variantName: variant.name,
        participants: variantAssignments.length,
        conversions: uniqueConversions,
        conversionRate: variantAssignments.length > 0
          ? (uniqueConversions / variantAssignments.length) * 100
          : 0,
      };
    });

    return { experiment, variantResults };
  } catch (error) {
    console.error('[ABTesting] Failed to get results:', error);
    return null;
  }
}

// Feature Flags (simple implementation)
const FEATURE_FLAGS: Record<string, {
  enabled: boolean;
  rolloutPercentage: number;
  allowedTiers?: string[];
}> = {
  'new-community-ui': {
    enabled: true,
    rolloutPercentage: 100,
  },
  'ai-memory-v2': {
    enabled: true,
    rolloutPercentage: 50,
  },
  'provider-messaging': {
    enabled: true,
    rolloutPercentage: 100,
    allowedTiers: ['core', 'pro'],
  },
  'fiscal-agent-export': {
    enabled: true,
    rolloutPercentage: 100,
  },
  'screening-tools': {
    enabled: true,
    rolloutPercentage: 75,
  },
  'dark-mode': {
    enabled: false,
    rolloutPercentage: 0,
  },
};

/**
 * Check if a feature flag is enabled for a user
 */
export function isFeatureEnabled(
  featureKey: string,
  userId: string,
  userTier?: string
): boolean {
  const flag = FEATURE_FLAGS[featureKey];
  if (!flag || !flag.enabled) return false;

  // Check tier restriction
  if (flag.allowedTiers && userTier && !flag.allowedTiers.includes(userTier)) {
    return false;
  }

  // Check rollout percentage
  if (flag.rolloutPercentage < 100) {
    const hash = hashString(`${featureKey}:${userId}`);
    const bucket = hash % 100;
    return bucket < flag.rolloutPercentage;
  }

  return true;
}

/**
 * Get all feature flags (for admin dashboard)
 */
export function getAllFeatureFlags(): typeof FEATURE_FLAGS {
  return FEATURE_FLAGS;
}

// React hook for experiments
export function useExperiment(experimentId: string, userId: string) {
  const variant = getVariant(experimentId, userId);

  return {
    variant,
    variantId: variant?.id || null,
    isControl: variant?.id === 'control',
    isTreatment: variant?.id !== 'control',
    config: variant?.config || {},
    trackEvent: (eventType: string, data?: Record<string, unknown>) =>
      trackExperimentEvent(experimentId, userId, eventType, data),
  };
}

// React hook for feature flags
export function useFeatureFlag(featureKey: string, userId: string, userTier?: string) {
  return isFeatureEnabled(featureKey, userId, userTier);
}

export default {
  getVariant,
  isInVariant,
  getVariantConfig,
  trackExperimentEvent,
  getActiveExperiments,
  getExperiment,
  getExperimentResults,
  isFeatureEnabled,
  getAllFeatureFlags,
  useExperiment,
  useFeatureFlag,
};
