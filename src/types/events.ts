// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Event Types
 * Type definitions for event bus, analytics, and connector events
 */

// Analytics events
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, AnalyticsValue>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export type AnalyticsValue = string | number | boolean | null | undefined;

export interface AnalyticsProperties {
  [key: string]: AnalyticsValue;
}

// Connector hub events
export interface ConnectorEventPayload {
  type: string;
  data?: unknown;
  source?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface DeviceConnectedPayload {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  childId?: string;
}

export interface SessionStartedPayload {
  sessionId: string;
  childId: string;
  type: 'parent' | 'jr';
  activityType?: string;
}

export interface SessionCompletedPayload {
  sessionId: string;
  childId: string;
  duration: number;
  accuracy?: number;
  tokensEarned?: number;
  activitiesCompleted?: string[];
}

export interface GoalProgressPayload {
  goalId: string;
  childId: string;
  progress: number;
  previousProgress: number;
  status?: 'active' | 'completed' | 'paused';
}

export interface InsightGeneratedPayload {
  insightId: string;
  childId: string;
  category: string;
  title: string;
  confidence: number;
  actionable: boolean;
}

// Shop/product events
export interface ProductEventPayload {
  productId: string;
  productName: string;
  category?: string;
  price?: number;
  action: 'view' | 'save' | 'add-to-cart' | 'purchase' | 'add-to-plan' | 'add-to-junior';
}

export interface BundleEventPayload {
  bundleId: string;
  bundleName: string;
  productIds: string[];
  price?: number;
  action: 'view' | 'add-to-cart' | 'purchase';
}

// Coverage events
export interface CoverageSummaryPayload {
  childId: string;
  state: string;
  insurer: string;
  eligible: boolean;
  benefits?: {
    sessionsPerYear: number;
    copayAmount: number;
  };
  action: 'save' | 'email' | 'share';
}

// Error events
export interface ErrorEventPayload {
  error: Error | string;
  context?: string;
  component?: string;
  userId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
}

// Navigation events
export interface NavigationEventPayload {
  from: string;
  to: string;
  method: 'click' | 'swipe' | 'back' | 'programmatic';
  params?: Record<string, string>;
}

// Performance events
export interface PerformanceEntryData {
  name: string;
  entryType: 'navigation' | 'resource' | 'paint' | 'longtask' | 'largest-contentful-paint';
  startTime: number;
  duration: number;
  processingStart?: number;
  processingEnd?: number;
  renderTime?: number;
  loadTime?: number;
}

// Feature flag types
export interface FeatureFlags {
  [key: string]: boolean | string | number;
}

// Subscription/tier events
export interface SubscriptionEventPayload {
  userId: string;
  tier: 'free' | 'starter' | 'core' | 'pro' | 'pro-plus';
  previousTier?: string;
  action: 'upgrade' | 'downgrade' | 'cancel' | 'renew' | 'trial-start' | 'trial-end';
  source?: string;
}

// Benefits/coverage connector
export interface BenefitsData {
  eligible: boolean;
  status?: 'unknown' | 'verified' | 'pending' | 'denied';
  sessions?: number;
  copay?: number;
  deductibleMet?: boolean;
  lastChecked?: Date;
}

// Mock event creator type
export type MockEventCreator = (eventName: string, payload: unknown) => ConnectorEventPayload;
