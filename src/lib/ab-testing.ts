/**
 * A/B Testing Infrastructure
 *
 * Handles experiment definition, user assignment, and metrics tracking
 * for prompt versioning, UI experiments, and feature flags.
 */

import { supabase } from '../utils/supabase/client';
import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';
export type VariantType = 'control' | 'treatment';

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  weight: number; // 0-100, percentage of traffic
  config: Record<string, unknown>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  type: 'prompt' | 'ui' | 'feature' | 'pricing';
  status: ExperimentStatus;
  startDate?: string;
  endDate?: string;
  targetAudience?: {
    tiers?: string[];
    percentOfUsers?: number;
    newUsersOnly?: boolean;
  };
  variants: ExperimentVariant[];
  primaryMetric: string;
  secondaryMetrics?: string[];
  minimumSampleSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: string;
}

export interface ExperimentEvent {
  experimentId: string;
  variantId: string;
  eventType: 'impression' | 'conversion' | 'engagement' | 'custom';
  eventName: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ExperimentResults {
  experimentId: string;
  variants: {
    variantId: string;
    variantName: string;
    impressions: number;
    conversions: number;
    conversionRate: number;
    engagementScore: number;
    avgValue?: number;
    confidence: number;
  }[];
  winner?: string;
  statisticalSignificance: number;
  sampleSize: number;
  duration: number; // days
}

// ============================================================================
// Storage Keys
// ============================================================================

const ASSIGNMENTS_KEY = 'aminy_ab_assignments';
const EVENTS_BUFFER_KEY = 'aminy_ab_events_buffer';

// ============================================================================
// Local Storage Helpers
// ============================================================================

function getStoredAssignments(): Record<string, UserAssignment> {
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredAssignment(experimentId: string, assignment: UserAssignment): void {
  try {
    const assignments = getStoredAssignments();
    assignments[experimentId] = assignment;
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch {
    console.warn('[ABTesting] Failed to store assignment');
  }
}

function getEventsBuffer(): ExperimentEvent[] {
  try {
    const stored = localStorage.getItem(EVENTS_BUFFER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToEventsBuffer(event: ExperimentEvent): void {
  try {
    const buffer = getEventsBuffer();
    buffer.push(event);
    localStorage.setItem(EVENTS_BUFFER_KEY, JSON.stringify(buffer.slice(-100))); // Keep last 100
  } catch {
    console.warn('[ABTesting] Failed to buffer event');
  }
}

function clearEventsBuffer(): void {
  try {
    localStorage.removeItem(EVENTS_BUFFER_KEY);
  } catch {
    // Ignore
  }
}

// ============================================================================
// User Assignment
// ============================================================================

/**
 * Get a deterministic hash for user assignment
 */
function hashUserForExperiment(userId: string, experimentId: string): number {
  const str = `${userId}-${experimentId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Assign a user to an experiment variant
 */
export function assignUserToVariant(
  userId: string,
  experiment: Experiment
): UserAssignment | null {
  // Check if experiment is running
  if (experiment.status !== 'running') {
    return null;
  }

  // Check existing assignment
  const assignments = getStoredAssignments();
  if (assignments[experiment.id]) {
    return assignments[experiment.id];
  }

  // Calculate user's bucket (0-99)
  const bucket = hashUserForExperiment(userId, experiment.id);

  // Check if user is in target audience percentage
  const targetPercent = experiment.targetAudience?.percentOfUsers ?? 100;
  if (bucket >= targetPercent) {
    return null; // User not in experiment
  }

  // Assign to variant based on weights
  let cumulativeWeight = 0;
  const normalizedBucket = (bucket / targetPercent) * 100;

  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (normalizedBucket < cumulativeWeight) {
      const assignment: UserAssignment = {
        experimentId: experiment.id,
        variantId: variant.id,
        assignedAt: new Date().toISOString(),
      };
      setStoredAssignment(experiment.id, assignment);
      return assignment;
    }
  }

  // Fallback to first variant
  const assignment: UserAssignment = {
    experimentId: experiment.id,
    variantId: experiment.variants[0].id,
    assignedAt: new Date().toISOString(),
  };
  setStoredAssignment(experiment.id, assignment);
  return assignment;
}

/**
 * Get user's variant for an experiment
 */
export function getUserVariant(
  userId: string,
  experiment: Experiment
): ExperimentVariant | null {
  const assignment = assignUserToVariant(userId, experiment);
  if (!assignment) return null;

  return experiment.variants.find(v => v.id === assignment.variantId) ?? null;
}

/**
 * Get variant config value
 */
export function getVariantConfig<T>(
  userId: string,
  experiment: Experiment,
  key: string,
  defaultValue: T
): T {
  const variant = getUserVariant(userId, experiment);
  if (!variant) return defaultValue;

  return (variant.config[key] as T) ?? defaultValue;
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track an experiment event
 */
export async function trackExperimentEvent(
  userId: string,
  experimentId: string,
  eventType: ExperimentEvent['eventType'],
  eventName: string,
  value?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const assignments = getStoredAssignments();
  const assignment = assignments[experimentId];

  if (!assignment) {
    console.warn(`[ABTesting] No assignment for experiment ${experimentId}`);
    return;
  }

  const event: ExperimentEvent = {
    experimentId,
    variantId: assignment.variantId,
    eventType,
    eventName,
    value,
    metadata,
    timestamp: new Date().toISOString(),
  };

  // Buffer event locally
  addToEventsBuffer(event);

  // Try to send to backend
  try {
    await supabase.from('experiment_events').insert({
      experiment_id: experimentId,
      variant_id: assignment.variantId,
      user_id: userId,
      event_type: eventType,
      event_name: eventName,
      event_value: value,
      metadata,
      created_at: event.timestamp,
    });
  } catch (error) {
    console.warn('[ABTesting] Failed to track event, buffered locally:', error);
  }
}

/**
 * Track impression (user saw the variant)
 */
export function trackImpression(
  userId: string,
  experimentId: string,
  metadata?: Record<string, unknown>
): void {
  trackExperimentEvent(userId, experimentId, 'impression', 'view', undefined, metadata);
}

/**
 * Track conversion (user completed desired action)
 */
export function trackConversion(
  userId: string,
  experimentId: string,
  conversionName: string,
  value?: number,
  metadata?: Record<string, unknown>
): void {
  trackExperimentEvent(userId, experimentId, 'conversion', conversionName, value, metadata);
}

/**
 * Track engagement (user interacted with variant)
 */
export function trackEngagement(
  userId: string,
  experimentId: string,
  engagementName: string,
  value?: number,
  metadata?: Record<string, unknown>
): void {
  trackExperimentEvent(userId, experimentId, 'engagement', engagementName, value, metadata);
}

// ============================================================================
// Flush Events
// ============================================================================

/**
 * Flush buffered events to backend
 */
export async function flushEvents(userId: string): Promise<void> {
  const buffer = getEventsBuffer();
  if (buffer.length === 0) return;

  try {
    const events = buffer.map(event => ({
      experiment_id: event.experimentId,
      variant_id: event.variantId,
      user_id: userId,
      event_type: event.eventType,
      event_name: event.eventName,
      event_value: event.value,
      metadata: event.metadata,
      created_at: event.timestamp,
    }));

    await supabase.from('experiment_events').insert(events);
    clearEventsBuffer();
  } catch (error) {
    console.warn('[ABTesting] Failed to flush events:', error);
  }
}

// ============================================================================
// Experiment Management
// ============================================================================

/**
 * Fetch active experiments
 */
export async function getActiveExperiments(): Promise<Experiment[]> {
  try {
    const { data, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('status', 'running')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      targetAudience: row.target_audience,
      variants: row.variants || [],
      primaryMetric: row.primary_metric,
      secondaryMetrics: row.secondary_metrics,
      minimumSampleSize: row.minimum_sample_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.warn('[ABTesting] Failed to fetch experiments:', error);
    return [];
  }
}

/**
 * Get experiment results
 */
export async function getExperimentResults(experimentId: string): Promise<ExperimentResults | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_experiment_results', { p_experiment_id: experimentId });

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[ABTesting] Failed to fetch results:', error);
    return null;
  }
}

// ============================================================================
// Prompt Experiments
// ============================================================================

export interface PromptExperiment extends Experiment {
  type: 'prompt';
  variants: (ExperimentVariant & {
    config: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      responseStyle?: string;
      includeEmoji?: boolean;
    };
  })[];
}

/**
 * Get prompt config for current user
 */
export function getPromptConfig(
  userId: string,
  experiment: PromptExperiment
): {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseStyle?: string;
  includeEmoji?: boolean;
} {
  const variant = getUserVariant(userId, experiment);
  if (!variant) {
    return {};
  }

  return variant.config as {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    responseStyle?: string;
    includeEmoji?: boolean;
  };
}

// ============================================================================
// Feature Flags (Simple A/B)
// ============================================================================

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  percentage: number; // 0-100
  targetTiers?: string[];
}

const featureFlags: Map<string, FeatureFlag> = new Map();

/**
 * Check if a feature is enabled for user
 */
export function isFeatureEnabled(
  userId: string,
  flagId: string,
  userTier?: string
): boolean {
  const flag = featureFlags.get(flagId);
  if (!flag || !flag.enabled) return false;

  // Check tier restriction
  if (flag.targetTiers && userTier && !flag.targetTiers.includes(userTier)) {
    return false;
  }

  // Check percentage rollout
  const bucket = hashUserForExperiment(userId, flagId);
  return bucket < flag.percentage;
}

/**
 * Register a feature flag
 */
export function registerFeatureFlag(flag: FeatureFlag): void {
  featureFlags.set(flag.id, flag);
}

// ============================================================================
// React Hook
// ============================================================================

export function useExperiment(experimentId: string) {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadExperiment() {
      const experiments = await getActiveExperiments();
      const exp = experiments.find(e => e.id === experimentId);

      if (exp) {
        setExperiment(exp);
        // Get user ID from localStorage or generate one
        const userId = localStorage.getItem('user_id') || 'anonymous';
        const userVariant = getUserVariant(userId, exp);
        setVariant(userVariant);
      }

      setIsLoading(false);
    }

    loadExperiment();
  }, [experimentId]);

  const trackEvent = useCallback(
    (eventType: ExperimentEvent['eventType'], eventName: string, value?: number) => {
      if (!experiment) return;
      const userId = localStorage.getItem('user_id') || 'anonymous';
      trackExperimentEvent(userId, experiment.id, eventType, eventName, value);
    },
    [experiment]
  );

  const getConfig = useCallback(
    <T,>(key: string, defaultValue: T): T => {
      if (!variant) return defaultValue;
      return (variant.config[key] as T) ?? defaultValue;
    },
    [variant]
  );

  return {
    experiment,
    variant,
    isLoading,
    trackEvent,
    trackImpression: () => trackEvent('impression', 'view'),
    trackConversion: (name: string, value?: number) => trackEvent('conversion', name, value),
    trackEngagement: (name: string, value?: number) => trackEvent('engagement', name, value),
    getConfig,
    isControl: variant?.id === experiment?.variants[0]?.id,
    isTreatment: variant?.id !== experiment?.variants[0]?.id,
  };
}

export function useFeatureFlag(flagId: string, userTier?: string) {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    setIsEnabled(isFeatureEnabled(userId, flagId, userTier));
  }, [flagId, userTier]);

  return isEnabled;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  assignUserToVariant,
  getUserVariant,
  getVariantConfig,
  trackExperimentEvent,
  trackImpression,
  trackConversion,
  trackEngagement,
  flushEvents,
  getActiveExperiments,
  getExperimentResults,
  getPromptConfig,
  isFeatureEnabled,
  registerFeatureFlag,
  useExperiment,
  useFeatureFlag,
};
