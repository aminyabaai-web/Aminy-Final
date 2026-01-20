/**
 * Analytics Engine v1.0 - Production-Ready User Intelligence
 * 
 * Comprehensive analytics system for tracking user journeys, feature usage,
 * and behavioral patterns to optimize the Aminy experience.
 */

// Core Analytics Types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
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
  debugMode: process.env.NODE_ENV === 'development',
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

  public track(event: string, properties: Record<string, any> = {}): void {
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
      childId: properties.childId,
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
      'ask_aminy_opened': 'Ask Aminy',
      'care_plan_viewed': 'Care Planning',
      'reports_generated': 'Reports',
      'junior_mode_activated': 'Junior Mode',
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

    this.currentSession.totalEngagementTime += duration;

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

  public trackError(error: Error, context: Record<string, any> = {}): void {
    this.track('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    });
  }

  public trackPerformance(metric: string, value: number, context?: Record<string, any>): void {
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
    // In production, this would send to your analytics service
    // For now, we'll store locally and provide export functionality
    
    const existingData = localStorage.getItem('aminy_analytics') || '[]';
    const analyticsData = JSON.parse(existingData);
    analyticsData.push(...events);
    
    // Keep only last 1000 events to prevent storage overflow
    const trimmedData = analyticsData.slice(-1000);
    localStorage.setItem('aminy_analytics', JSON.stringify(trimmedData));
    
    // In production, replace with:
    // await fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ events, sessionId: this.sessionId })
    // });
  }

  public exportData(): {
    events: AnalyticsEvent[];
    session: Partial<UserJourney>;
    patterns: BehaviorPattern[];
    usage: FeatureUsage[];
    insights: any;
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

// Utility Functions
export function trackPageView(page: string, properties?: Record<string, any>) {
  analytics.track('page_viewed', {
    page,
    ...properties,
  });
}

export function trackUserAction(action: string, context?: Record<string, any>) {
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