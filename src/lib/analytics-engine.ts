// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Analytics Engine v1.0 - Production-Ready User Intelligence
 * 
 * Comprehensive analytics system for tracking user journeys, feature usage,
 * and behavioral patterns to optimize the Aminy experience.
 */

// Core Analytics Types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, unknown>;
  userId?: string;
  childId?: string;
  sessionId: string;
  timestamp: number;
  userTier: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: string;
  version: string;
}

export interface UserJourney {
  userId: string;
  sessionId: string;
  events: AnalyticsEvent[];
  startTime: number;
  endTime?: number;
  completedGoals: string[];
  dropOffPoint?: string;
  totalEngagementTime: number;
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  users: string[];
  conversionRate: number;
  averageTime: number;
  commonDropOffs: string[];
}

export interface FeatureUsage {
  feature: string;
  totalUsage: number;
  uniqueUsers: number;
  averageSessionTime: number;
  retentionRate: number;
  userTierBreakdown: Record<string, number>;
  peakUsageTimes: number[];
}

// Analytics Configuration
const ANALYTICS_CONFIG = {
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  maxRetries: 3,
  debugMode: import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEBUG === 'true',
  enabledEvents: [
    // Core User Journey
    'app_opened',
    'onboarding_started',
    'onboarding_step_completed',
    'onboarding_completed',
    'onboarding_abandoned',
    
    // Ask Aminy Intelligence
    'ask_aminy_opened',
    'ask_aminy_message_sent',
    'ask_aminy_suggestion_used',
    'ask_aminy_conversation_completed',
    'ask_aminy_paywall_triggered',
    'ask_aminy_contextual_display',
    
    // Care Plan Engagement
    'care_plan_viewed',
    'care_plan_activity_started',
    'care_plan_activity_completed',
    'care_plan_progress_updated',
    'care_plan_shared',
    
    // Feature Usage
    'dashboard_viewed',
    'reports_generated',
    'junior_mode_activated',
    'vault_accessed',
    'provider_directory_searched',
    
    // Conversion Events
    'paywall_viewed',
    'subscription_started',
    'subscription_completed',
    'subscription_cancelled',

    // Upgrade Funnel Analytics
    'paywall_shown',
    'paywall_dismissed',
    'upgrade_clicked',
    'upgrade_tier_selected',
    'upgrade_checkout_started',
    'upgrade_completed',
    'upgrade_abandoned',
    'trial_started',
    'trial_converted',
    'trial_expired',
    'price_comparison_viewed',
    'feature_gated_click',
    
    // Engagement Patterns
    'deep_engagement_started', // 5+ minutes continuous usage
    'feature_discovery', // First use of a feature
    'return_visit', // User returns within 7 days
    'power_user_action', // Advanced feature usage
    
    // System Events
    'performance_metric', // Performance tracking events
    'error_occurred', // Error tracking events
    'session_paused', // Visibility change events
    'session_resumed', // Visibility change events
    'session_ended', // Session lifecycle events
    'user_identified', // User identification events
    'page_viewed', // Page navigation events
    'user_action', // General user actions
    'feature_engagement', // Feature engagement tracking
    'feature_engaged', // Legacy feature engagement tracking (alias)
    'conversion_completed', // Conversion goal completion
    'user_login_completed', // Login completion tracking
    
    // Performance Monitor Events
    'slow_interactions_detected', // Slow user interaction tracking
    'route_changed', // Route change tracking
    'route_context_change', // Context-aware route change tracking
    'child_context_updated', // Child context updates
    'caregiver_context_updated', // Caregiver context updates
  ],
};

class AnalyticsEngine {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private userTier: string = 'starter';
  private flushTimer?: NodeJS.Timeout;
  private journeyStart: number;
  private currentSession: Partial<UserJourney>;
  private behaviorPatterns: Map<string, BehaviorPattern> = new Map();
  private featureUsage: Map<string, FeatureUsage> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.journeyStart = Date.now();
    this.currentSession = {
      sessionId: this.sessionId,
      events: [],
      startTime: this.journeyStart,
      completedGoals: [],
      totalEngagementTime: 0,
    };
    
    this.initializeTracking();
    this.startFlushTimer();
    
    if (ANALYTICS_CONFIG.debugMode) {
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking(): void {
    // Track app open
    this.track('app_opened', {
      timestamp: this.journeyStart,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('session_paused', { timestamp: Date.now() });
      } else {
        this.track('session_resumed', { timestamp: Date.now() });
      }
    });

    // Track beforeunload for session end
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, ANALYTICS_CONFIG.flushInterval);
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getPlatform(): string {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    return 'Unknown';
  }

  // Public API Methods
  public setUser(userId: string, tier: string = 'starter'): void {
    this.userId = userId;
    this.userTier = tier;
    this.currentSession.userId = userId;
    
    this.track('user_identified', {
      userId,
      userTier: tier,
      sessionId: this.sessionId,
    });
  }

  public track(event: string, properties: Record<string, unknown> = {}): void {
    if (!ANALYTICS_CONFIG.enabledEvents.includes(event) && !event.startsWith('custom_')) {
      if (ANALYTICS_CONFIG.debugMode) {
      }
      return;
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: window.location.pathname,
        timestamp: Date.now(),
      },
      userId: this.userId,
      childId: properties.childId as string | undefined,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userTier: this.userTier,
      deviceType: this.getDeviceType(),
      platform: this.getPlatform(),
      version: '1.0.0', // Should come from app config
    };

    this.events.push(analyticsEvent);
    this.currentSession.events?.push(analyticsEvent);

    // Update behavior patterns
    this.updateBehaviorPatterns(analyticsEvent);
    
    // Update feature usage
    this.updateFeatureUsage(analyticsEvent);

    if (ANALYTICS_CONFIG.debugMode) {
    }

    // Auto-flush if batch size reached
    if (this.events.length >= ANALYTICS_CONFIG.batchSize) {
      this.flush();
    }
  }

  private updateBehaviorPatterns(event: AnalyticsEvent): void {
    const pattern = this.identifyPattern(event);
    if (!pattern) return;

    const existing = this.behaviorPatterns.get(pattern) || {
      pattern,
      frequency: 0,
      users: [],
      conversionRate: 0,
      averageTime: 0,
      commonDropOffs: [],
    };

    existing.frequency++;
    if (event.userId && !existing.users.includes(event.userId)) {
      existing.users.push(event.userId);
    }

    this.behaviorPatterns.set(pattern, existing);
  }

  private updateFeatureUsage(event: AnalyticsEvent): void {
    const feature = this.getFeatureFromEvent(event.event);
    if (!feature) return;

    const existing = this.featureUsage.get(feature) || {
      feature,
      totalUsage: 0,
      uniqueUsers: 0,
      averageSessionTime: 0,
      retentionRate: 0,
      userTierBreakdown: {},
      peakUsageTimes: [],
    };

    existing.totalUsage++;
    existing.userTierBreakdown[event.userTier] = 
      (existing.userTierBreakdown[event.userTier] || 0) + 1;

    this.featureUsage.set(feature, existing);
  }

  private identifyPattern(event: AnalyticsEvent): string | null {
    // Identify common user behavior patterns
    if (event.event.startsWith('onboarding_')) {
      return 'onboarding_flow';
    }
    if (event.event.startsWith('ask_aminy_')) {
      return 'ai_interaction';
    }
    if (event.event.startsWith('care_plan_')) {
      return 'care_engagement';
    }
    if (event.event.includes('paywall') || event.event.includes('subscription')) {
      return 'conversion_funnel';
    }
    return null;
  }

  private getFeatureFromEvent(event: string): string | null {
    const featureMap: Record<string, string> = {
      'ask_aminy_opened': 'Aminy',
      'care_plan_viewed': 'Care Planning',
      'reports_generated': 'Reports',
      'junior_mode_activated': 'Ease',
      'vault_accessed': 'Document Vault',
      'provider_directory_searched': 'Provider Directory',
      'dashboard_viewed': 'Dashboard',
    };

    return featureMap[event] || null;
  }

  public trackConversion(goalType: string, value?: number): void {
    this.track('conversion_completed', {
      goalType,
      value,
      conversionPath: this.getConversionPath(),
      timeToConversion: Date.now() - this.journeyStart,
    });

    this.currentSession.completedGoals?.push(goalType);
  }

  private getConversionPath(): string[] {
    return this.currentSession.events?.map(e => e.event) || [];
  }

  public trackEngagement(feature: string, duration: number): void {
    this.track('feature_engagement', {
      feature,
      duration,
      engagementDepth: this.calculateEngagementDepth(duration),
    });

    const session = this.currentSession;
    if (session) { session.totalEngagementTime = (session.totalEngagementTime ?? 0) + duration; }

    // Track deep engagement
    if (duration > 300000) { // 5 minutes
      this.track('deep_engagement_started', { feature, duration });
    }
  }

  private calculateEngagementDepth(duration: number): 'shallow' | 'medium' | 'deep' {
    if (duration < 30000) return 'shallow'; // < 30 seconds
    if (duration < 180000) return 'medium'; // < 3 minutes
    return 'deep'; // >= 3 minutes
  }

  public trackError(error: Error, context: Record<string, unknown> = {}): void {
    this.track('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    });
  }

  public trackPerformance(metric: string, value: number, context?: Record<string, unknown>): void {
    this.track('performance_metric', {
      metric,
      value,
      context,
      timestamp: Date.now(),
    });
  }

  // Analytics Insights API
  public getBehaviorPatterns(): BehaviorPattern[] {
    return Array.from(this.behaviorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  public getFeatureUsage(): FeatureUsage[] {
    return Array.from(this.featureUsage.values())
      .sort((a, b) => b.totalUsage - a.totalUsage);
  }

  public getSessionInsights(): {
    duration: number;
    eventCount: number;
    engagementScore: number;
    completedGoals: string[];
    dropOffRisk: 'low' | 'medium' | 'high';
  } {
    const duration = Date.now() - this.journeyStart;
    const eventCount = this.currentSession.events?.length || 0;
    const engagementScore = this.calculateEngagementScore();
    
    return {
      duration,
      eventCount,
      engagementScore,
      completedGoals: this.currentSession.completedGoals || [],
      dropOffRisk: this.calculateDropOffRisk(duration, eventCount, engagementScore),
    };
  }

  private calculateEngagementScore(): number {
    const events = this.currentSession.events || [];
    const duration = Date.now() - this.journeyStart;
    const eventDensity = events.length / (duration / 60000); // events per minute
    const goalCompletion = (this.currentSession.completedGoals?.length || 0) * 20;
    const featureUsage = new Set(events.map(e => this.getFeatureFromEvent(e.event)).filter(Boolean)).size * 10;
    
    return Math.min(100, eventDensity * 10 + goalCompletion + featureUsage);
  }

  private calculateDropOffRisk(duration: number, eventCount: number, engagementScore: number): 'low' | 'medium' | 'high' {
    if (engagementScore > 70 && eventCount > 10) return 'low';
    if (engagementScore > 40 && eventCount > 5) return 'medium';
    return 'high';
  }

  // Data Export and Flush
  public async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      await this.sendEvents(eventsToFlush);
      
      if (ANALYTICS_CONFIG.debugMode) {
      }
    } catch (error) {
      // Re-queue events on failure
      this.events.unshift(...eventsToFlush);
      console.error('📊 Failed to flush analytics events:', error);
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    // Send to backend analytics endpoint
    const EDGE_FUNCTION_BASE = `https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548`;

    try {
      // Send to backend for persistent storage
      await fetch(`${EDGE_FUNCTION_BASE}/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, sessionId: this.sessionId })
      });
    } catch (error) {
      // Fallback to localStorage if backend fails
      if (ANALYTICS_CONFIG.debugMode) {
        console.warn('Analytics backend unavailable, storing locally');
      }
      const existingData = localStorage.getItem('aminy_analytics') || '[]';
      const analyticsData = JSON.parse(existingData);
      analyticsData.push(...events);
      const trimmedData = analyticsData.slice(-500);
      localStorage.setItem('aminy_analytics', JSON.stringify(trimmedData));
    }

    // Also send to Google Analytics if configured
    const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
    const win = window as unknown as { gtag?: (command: string, event: string, params: Record<string, unknown>) => void };
    if (GA_MEASUREMENT_ID && typeof window !== 'undefined' && win.gtag) {
      for (const event of events) {
        win.gtag('event', event.event, {
          ...event.properties,
          user_tier: event.userTier,
          session_id: event.sessionId,
        });
      }
    }
  }

  public exportData(): {
    events: AnalyticsEvent[];
    session: Partial<UserJourney>;
    patterns: BehaviorPattern[];
    usage: FeatureUsage[];
    insights: ReturnType<AnalyticsEngine['getSessionInsights']> | null;
  } {
    return {
      events: JSON.parse(localStorage.getItem('aminy_analytics') || '[]'),
      session: this.currentSession,
      patterns: this.getBehaviorPatterns(),
      usage: this.getFeatureUsage(),
      insights: this.getSessionInsights(),
    };
  }

  private endSession(): void {
    this.currentSession.endTime = Date.now();
    this.track('session_ended', {
      sessionDuration: this.currentSession.endTime - this.journeyStart,
      totalEvents: this.currentSession.events?.length || 0,
      engagementScore: this.calculateEngagementScore(),
    });
    
    this.flush();
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  // Cleanup
  public destroy(): void {
    this.endSession();
  }
}

// Global Analytics Instance
export const analytics = new AnalyticsEngine();

// React Hook for Analytics
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    trackEngagement: analytics.trackEngagement.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    setUser: analytics.setUser.bind(analytics),
    getInsights: analytics.getSessionInsights.bind(analytics),
    exportData: analytics.exportData.bind(analytics),
  };
}

// ============================================================================
// UPGRADE FUNNEL ANALYTICS
// ============================================================================

export interface UpgradeFunnelContext {
  location: string; // e.g., 'chat_limit', 'feature_gate', 'settings', 'pricing_page'
  tier?: string; // Target tier
  variant?: string; // A/B test variant
  feature?: string; // Gated feature that triggered paywall
  previousTier?: string;
}

/**
 * Track when a paywall/upgrade prompt is shown
 */
export function trackPaywallShown(context: UpgradeFunnelContext) {
  analytics.track('paywall_shown', {
    location: context.location,
    targetTier: context.tier,
    variant: context.variant,
    gatedFeature: context.feature,
    previousTier: context.previousTier,
    timestamp: Date.now(),
  });
}

/**
 * Track when user dismisses paywall without taking action
 */
export function trackPaywallDismissed(context: UpgradeFunnelContext, timeViewed: number) {
  analytics.track('paywall_dismissed', {
    location: context.location,
    timeViewedMs: timeViewed,
    variant: context.variant,
  });
}

/**
 * Track when user clicks upgrade button
 */
export function trackUpgradeClicked(context: UpgradeFunnelContext) {
  analytics.track('upgrade_clicked', {
    location: context.location,
    targetTier: context.tier,
    variant: context.variant,
    source: context.feature || 'direct',
  });
}

/**
 * Track when user selects a specific tier
 */
export function trackTierSelected(tier: string, context: UpgradeFunnelContext) {
  analytics.track('upgrade_tier_selected', {
    selectedTier: tier,
    location: context.location,
    previousTier: context.previousTier,
    variant: context.variant,
  });
}

/**
 * Track when checkout flow is initiated
 */
export function trackCheckoutStarted(
  tier: string,
  price: number,
  context: UpgradeFunnelContext
) {
  analytics.track('upgrade_checkout_started', {
    tier,
    price,
    location: context.location,
    variant: context.variant,
    timestamp: Date.now(),
  });
}

/**
 * Track successful upgrade completion
 */
export function trackUpgradeCompleted(
  tier: string,
  price: number,
  context: UpgradeFunnelContext
) {
  analytics.track('upgrade_completed', {
    newTier: tier,
    price,
    location: context.location,
    previousTier: context.previousTier,
    variant: context.variant,
    timestamp: Date.now(),
  });

  // Also track as conversion
  analytics.trackConversion('upgrade', price);
}

/**
 * Track when user abandons upgrade flow
 */
export function trackUpgradeAbandoned(
  stage: 'tier_selection' | 'checkout' | 'payment',
  context: UpgradeFunnelContext,
  timeSpent: number
) {
  analytics.track('upgrade_abandoned', {
    abandonedStage: stage,
    location: context.location,
    targetTier: context.tier,
    timeSpentMs: timeSpent,
    variant: context.variant,
  });
}

/**
 * Track when a gated feature is clicked by a user who doesn't have access
 */
export function trackFeatureGated(feature: string, requiredTier: string, userTier: string) {
  analytics.track('feature_gated_click', {
    feature,
    requiredTier,
    userTier,
    timestamp: Date.now(),
  });
}

/**
 * Get upgrade funnel metrics for a time period
 */
export function getUpgradeFunnelMetrics(): {
  impressions: number;
  clicks: number;
  checkouts: number;
  completions: number;
  conversionRate: number;
} {
  // This would aggregate from the analytics backend
  // For now, return structure for frontend integration
  return {
    impressions: 0,
    clicks: 0,
    checkouts: 0,
    completions: 0,
    conversionRate: 0,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Utility Functions
export function trackPageView(page: string, properties?: Record<string, unknown>) {
  analytics.track('page_viewed', {
    page,
    ...properties,
  });
}

export function trackUserAction(action: string, context?: Record<string, unknown>) {
  analytics.track('user_action', {
    action,
    context,
  });
}

export function trackFeatureDiscovery(feature: string) {
  analytics.track('feature_discovery', {
    feature,
    isFirstTime: true,
  });
}

// Debug utilities
export function getAnalyticsDebugInfo() {
  if (ANALYTICS_CONFIG.debugMode) {
    return analytics.exportData();
  }
  return null;
}

// Initialization function for App.tsx
export function initAnalytics(): void {
  // Analytics engine is auto-initialized via constructor
  // This function exists for explicit initialization in App.tsx
  if (typeof window !== 'undefined') {
  }
}

// Export analytics configuration for external use
export { ANALYTICS_CONFIG };

// ============================================
// CONVERSION FUNNEL ANALYTICS
// ============================================

export interface FunnelStage {
  id: string;
  name: string;
  event: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToNext: number | null;
}

export interface ConversionFunnel {
  name: string;
  stages: FunnelStage[];
  overallConversionRate: number;
  totalUsers: number;
  dateRange: { start: Date; end: Date };
}

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  d1: number;
  d7: number;
  d14: number;
  d30: number;
  d60: number;
  d90: number;
}

export interface RetentionMetrics {
  cohorts: RetentionCohort[];
  averageD1: number;
  averageD7: number;
  averageD30: number;
  rollingActiveUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  churnRate: number;
}

/**
 * Get conversion funnel data from stored analytics
 * Funnel stages:
 * 1. app_opened → onboarding_started (Start Rate)
 * 2. onboarding_started → onboarding_completed (Completion Rate)
 * 3. onboarding_completed → paywall_viewed (Engagement)
 * 4. paywall_viewed → subscription_started (Conversion)
 * 5. subscription_started → subscription_completed (Success)
 */
export function getConversionFunnel(dateRange?: { start: Date; end: Date }): ConversionFunnel {
  const storedEvents: AnalyticsEvent[] = JSON.parse(
    localStorage.getItem('aminy_analytics') || '[]'
  );

  const range = dateRange || {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  };

  // Filter events by date range
  const events = storedEvents.filter(e => {
    const eventDate = new Date(e.timestamp);
    return eventDate >= range.start && eventDate <= range.end;
  });

  // Count unique users at each stage
  const getUniqueUsersForEvent = (eventName: string): Set<string> => {
    const users = new Set<string>();
    events.filter(e => e.event === eventName).forEach(e => {
      const userId = e.userId || e.sessionId;
      users.add(userId);
    });
    return users;
  };

  const appOpened = getUniqueUsersForEvent('app_opened');
  const onboardingStarted = getUniqueUsersForEvent('onboarding_started');
  const onboardingCompleted = getUniqueUsersForEvent('onboarding_completed');
  const paywallViewed = getUniqueUsersForEvent('paywall_viewed');
  const subscriptionStarted = getUniqueUsersForEvent('subscription_started');
  const subscriptionCompleted = getUniqueUsersForEvent('subscription_completed');

  // Calculate average time between stages
  const getAvgTimeBetweenEvents = (fromEvent: string, toEvent: string): number | null => {
    const transitions: number[] = [];
    const fromEventsByUser = new Map<string, number>();

    events.forEach(e => {
      const userId = e.userId || e.sessionId;
      if (e.event === fromEvent) {
        fromEventsByUser.set(userId, e.timestamp);
      } else if (e.event === toEvent && fromEventsByUser.has(userId)) {
        const timeDiff = e.timestamp - fromEventsByUser.get(userId)!;
        if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
          transitions.push(timeDiff);
        }
      }
    });

    if (transitions.length === 0) return null;
    return transitions.reduce((a, b) => a + b, 0) / transitions.length;
  };

  const totalUsers = appOpened.size || 1;

  const stages: FunnelStage[] = [
    {
      id: 'app_opened',
      name: 'App Opened',
      event: 'app_opened',
      count: appOpened.size,
      conversionRate: 100,
      dropOffRate: 0,
      avgTimeToNext: getAvgTimeBetweenEvents('app_opened', 'onboarding_started')
    },
    {
      id: 'onboarding_started',
      name: 'Onboarding Started',
      event: 'onboarding_started',
      count: onboardingStarted.size,
      conversionRate: (onboardingStarted.size / totalUsers) * 100,
      dropOffRate: ((appOpened.size - onboardingStarted.size) / appOpened.size) * 100,
      avgTimeToNext: getAvgTimeBetweenEvents('onboarding_started', 'onboarding_completed')
    },
    {
      id: 'onboarding_completed',
      name: 'Onboarding Completed',
      event: 'onboarding_completed',
      count: onboardingCompleted.size,
      conversionRate: (onboardingCompleted.size / totalUsers) * 100,
      dropOffRate: onboardingStarted.size > 0
        ? ((onboardingStarted.size - onboardingCompleted.size) / onboardingStarted.size) * 100
        : 0,
      avgTimeToNext: getAvgTimeBetweenEvents('onboarding_completed', 'paywall_viewed')
    },
    {
      id: 'paywall_viewed',
      name: 'Paywall Viewed',
      event: 'paywall_viewed',
      count: paywallViewed.size,
      conversionRate: (paywallViewed.size / totalUsers) * 100,
      dropOffRate: onboardingCompleted.size > 0
        ? ((onboardingCompleted.size - paywallViewed.size) / onboardingCompleted.size) * 100
        : 0,
      avgTimeToNext: getAvgTimeBetweenEvents('paywall_viewed', 'subscription_started')
    },
    {
      id: 'subscription_started',
      name: 'Subscription Started',
      event: 'subscription_started',
      count: subscriptionStarted.size,
      conversionRate: (subscriptionStarted.size / totalUsers) * 100,
      dropOffRate: paywallViewed.size > 0
        ? ((paywallViewed.size - subscriptionStarted.size) / paywallViewed.size) * 100
        : 0,
      avgTimeToNext: getAvgTimeBetweenEvents('subscription_started', 'subscription_completed')
    },
    {
      id: 'subscription_completed',
      name: 'Subscription Completed',
      event: 'subscription_completed',
      count: subscriptionCompleted.size,
      conversionRate: (subscriptionCompleted.size / totalUsers) * 100,
      dropOffRate: subscriptionStarted.size > 0
        ? ((subscriptionStarted.size - subscriptionCompleted.size) / subscriptionStarted.size) * 100
        : 0,
      avgTimeToNext: null
    }
  ];

  return {
    name: 'User Conversion Funnel',
    stages,
    overallConversionRate: (subscriptionCompleted.size / totalUsers) * 100,
    totalUsers,
    dateRange: range
  };
}

/**
 * Get retention metrics from stored analytics
 * Calculates D1, D7, D14, D30, D60, D90 retention by cohort
 */
export function getRetentionMetrics(): RetentionMetrics {
  const storedEvents: AnalyticsEvent[] = JSON.parse(
    localStorage.getItem('aminy_analytics') || '[]'
  );

  // Group users by signup/first activity date (cohort)
  const userFirstSeen = new Map<string, number>();
  const userLastSeen = new Map<string, number>();
  const userActivityDays = new Map<string, Set<string>>();

  storedEvents.forEach(e => {
    const userId = e.userId || e.sessionId;
    const timestamp = e.timestamp;
    const dayKey = new Date(timestamp).toISOString().split('T')[0];

    if (!userFirstSeen.has(userId) || timestamp < userFirstSeen.get(userId)!) {
      userFirstSeen.set(userId, timestamp);
    }
    if (!userLastSeen.has(userId) || timestamp > userLastSeen.get(userId)!) {
      userLastSeen.set(userId, timestamp);
    }

    if (!userActivityDays.has(userId)) {
      userActivityDays.set(userId, new Set());
    }
    userActivityDays.get(userId)!.add(dayKey);
  });

  // Group users into weekly cohorts
  const cohorts = new Map<string, { users: string[]; firstSeenDates: Map<string, number> }>();

  userFirstSeen.forEach((timestamp, userId) => {
    const cohortDate = new Date(timestamp);
    // Round to start of week (Sunday)
    cohortDate.setDate(cohortDate.getDate() - cohortDate.getDay());
    const cohortKey = cohortDate.toISOString().split('T')[0];

    if (!cohorts.has(cohortKey)) {
      cohorts.set(cohortKey, { users: [], firstSeenDates: new Map() });
    }
    cohorts.get(cohortKey)!.users.push(userId);
    cohorts.get(cohortKey)!.firstSeenDates.set(userId, timestamp);
  });

  // Calculate retention for each cohort
  const retentionCohorts: RetentionCohort[] = [];
  const now = Date.now();

  Array.from(cohorts.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, 12) // Last 12 weeks
    .forEach(([cohortDate, cohortData]) => {
      const { users, firstSeenDates } = cohortData;

      const calculateRetention = (daysAfter: number): number => {
        if (users.length === 0) return 0;

        const retained = users.filter(userId => {
          const firstSeen = firstSeenDates.get(userId)!;
          const targetDate = new Date(firstSeen + daysAfter * 24 * 60 * 60 * 1000);
          const targetDayKey = targetDate.toISOString().split('T')[0];

          // Check if target date is in the future
          if (targetDate.getTime() > now) return false;

          return userActivityDays.get(userId)?.has(targetDayKey) || false;
        });

        return (retained.length / users.length) * 100;
      };

      retentionCohorts.push({
        cohortDate,
        cohortSize: users.length,
        d1: calculateRetention(1),
        d7: calculateRetention(7),
        d14: calculateRetention(14),
        d30: calculateRetention(30),
        d60: calculateRetention(60),
        d90: calculateRetention(90)
      });
    });

  // Calculate averages
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const validCohorts = retentionCohorts.filter(c => c.cohortSize > 0);

  // Calculate rolling active users
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const dailyActive = new Set(
    storedEvents.filter(e => e.timestamp >= oneDayAgo).map(e => e.userId || e.sessionId)
  ).size;

  const weeklyActive = new Set(
    storedEvents.filter(e => e.timestamp >= sevenDaysAgo).map(e => e.userId || e.sessionId)
  ).size;

  const monthlyActive = new Set(
    storedEvents.filter(e => e.timestamp >= thirtyDaysAgo).map(e => e.userId || e.sessionId)
  ).size;

  // Calculate churn rate (users who were active 30-60 days ago but not in last 30 days)
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  const activeLastMonth = new Set(
    storedEvents.filter(e => e.timestamp >= thirtyDaysAgo).map(e => e.userId || e.sessionId)
  );
  const activePreviousMonth = new Set(
    storedEvents
      .filter(e => e.timestamp >= sixtyDaysAgo && e.timestamp < thirtyDaysAgo)
      .map(e => e.userId || e.sessionId)
  );

  const churned = Array.from(activePreviousMonth).filter(u => !activeLastMonth.has(u)).length;
  const churnRate = activePreviousMonth.size > 0 ? (churned / activePreviousMonth.size) * 100 : 0;

  return {
    cohorts: retentionCohorts,
    averageD1: avg(validCohorts.map(c => c.d1)),
    averageD7: avg(validCohorts.map(c => c.d7)),
    averageD30: avg(validCohorts.map(c => c.d30)),
    rollingActiveUsers: {
      daily: dailyActive,
      weekly: weeklyActive,
      monthly: monthlyActive
    },
    churnRate
  };
}

/**
 * Get funnel data broken down by user tier
 */
export function getFunnelByTier(): Record<string, ConversionFunnel> {
  const storedEvents: AnalyticsEvent[] = JSON.parse(
    localStorage.getItem('aminy_analytics') || '[]'
  );

  const tiers = ['free', 'starter', 'core', 'pro', 'pro+'];
  const result: Record<string, ConversionFunnel> = {};

  tiers.forEach(tier => {
    const tierEvents = storedEvents.filter(e => e.userTier === tier);
    // Store temporarily and calculate
    const originalData = localStorage.getItem('aminy_analytics');
    localStorage.setItem('aminy_analytics', JSON.stringify(tierEvents));
    result[tier] = getConversionFunnel();
    localStorage.setItem('aminy_analytics', originalData || '[]');
  });

  return result;
}

/**
 * Generate mock funnel data for demo/development
 */
export function generateMockFunnelData(): ConversionFunnel {
  return {
    name: 'User Conversion Funnel',
    stages: [
      {
        id: 'app_opened',
        name: 'App Opened',
        event: 'app_opened',
        count: 1247,
        conversionRate: 100,
        dropOffRate: 0,
        avgTimeToNext: 5000
      },
      {
        id: 'onboarding_started',
        name: 'Onboarding Started',
        event: 'onboarding_started',
        count: 1122,
        conversionRate: 90,
        dropOffRate: 10,
        avgTimeToNext: 180000
      },
      {
        id: 'onboarding_completed',
        name: 'Onboarding Completed',
        event: 'onboarding_completed',
        count: 899,
        conversionRate: 72,
        dropOffRate: 20,
        avgTimeToNext: 300000
      },
      {
        id: 'paywall_viewed',
        name: 'Paywall Viewed',
        event: 'paywall_viewed',
        count: 674,
        conversionRate: 54,
        dropOffRate: 25,
        avgTimeToNext: 60000
      },
      {
        id: 'subscription_started',
        name: 'Subscription Started',
        event: 'subscription_started',
        count: 236,
        conversionRate: 19,
        dropOffRate: 65,
        avgTimeToNext: 30000
      },
      {
        id: 'subscription_completed',
        name: 'Subscription Completed',
        event: 'subscription_completed',
        count: 212,
        conversionRate: 17,
        dropOffRate: 10,
        avgTimeToNext: null
      }
    ],
    overallConversionRate: 17,
    totalUsers: 1247,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  };
}

/**
 * Generate mock retention data for demo/development
 */
export function generateMockRetentionData(): RetentionMetrics {
  const cohorts: RetentionCohort[] = [];
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const cohortDate = new Date(now);
    cohortDate.setDate(cohortDate.getDate() - (i * 7));
    cohortDate.setDate(cohortDate.getDate() - cohortDate.getDay());

    cohorts.push({
      cohortDate: cohortDate.toISOString().split('T')[0],
      cohortSize: Math.floor(150 + Math.random() * 100),
      d1: 68 + Math.random() * 10,
      d7: 52 + Math.random() * 10,
      d14: 41 + Math.random() * 10,
      d30: 32 + Math.random() * 8,
      d60: 25 + Math.random() * 8,
      d90: 20 + Math.random() * 6
    });
  }

  return {
    cohorts,
    averageD1: 72,
    averageD7: 55,
    averageD30: 35,
    rollingActiveUsers: {
      daily: 423,
      weekly: 1892,
      monthly: 4521
    },
    churnRate: 8.3
  };
}
