/**
 * Performance Monitor v1.0 - Real User Monitoring (RUM)
 * 
 * Comprehensive performance monitoring system for tracking Core Web Vitals,
 * user experience metrics, and application performance in production.
 */

import { analytics } from './analytics-engine';

// Performance Metric Types
export interface CoreWebVitals {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
}

export interface CustomMetrics {
  initialRender?: number;
  routeChangeTime?: number;
  componentMountTime?: number;
  apiResponseTime?: number;
  askAminyResponseTime?: number;
  carePlanLoadTime?: number;
  onboardingStepTime?: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  url: string;
  userAgent: string;
  connection?: any;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  coreWebVitals: CoreWebVitals;
  customMetrics: CustomMetrics;
  resources: PerformanceResourceTiming[];
  navigation: PerformanceNavigationTiming;
  userInteractions: UserInteraction[];
}

export interface UserInteraction {
  type: 'click' | 'scroll' | 'touch' | 'keyboard';
  element: string;
  timestamp: number;
  responseTime?: number;
  isSlowInteraction?: boolean;
}

// Performance thresholds (based on Google's recommendations)
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  customMetric: { good: 1000, poor: 3000 }, // Generic threshold
};

class PerformanceMonitor {
  private observer?: PerformanceObserver;
  private navigationStartTime: number;
  private interactionQueue: UserInteraction[] = [];
  private metricsCollected: CoreWebVitals = {};
  private customMetrics: CustomMetrics = {};
  private isMonitoring = false;

  constructor() {
    this.navigationStartTime = performance.timeOrigin;
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined' || this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor user interactions
    this.observeUserInteractions();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Set up periodic reporting
    this.scheduleReporting();

    // Track initial page load performance
    this.trackPageLoad();

  }

  private observeWebVitals(): void {
    try {
      // Observe Largest Contentful Paint (LCP)
      this.createObserver(['largest-contentful-paint'], (entries) => {
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { size?: number };
        this.metricsCollected.LCP = lastEntry.startTime;
        this.reportMetric('LCP', lastEntry.startTime);
      });

      // Observe First Input Delay (FID)
      this.createObserver(['first-input'], (entries) => {
        const firstEntry = entries[0] as PerformanceEventTiming;
        const fid = firstEntry.processingStart - firstEntry.startTime;
        this.metricsCollected.FID = fid;
        this.reportMetric('FID', fid);
      });

      // Observe Layout Shift (CLS)
      this.createObserver(['layout-shift'], (entries) => {
        let cls = 0;
        for (const entry of entries as PerformanceEntry[]) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
        this.metricsCollected.CLS = cls;
        this.reportMetric('CLS', cls);
      });

      // Observe Paint timing
      this.createObserver(['paint'], (entries) => {
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.metricsCollected.FCP = entry.startTime;
            this.reportMetric('FCP', entry.startTime);
          }
        }
      });

      // Observe navigation timing
      this.createObserver(['navigation'], (entries) => {
        const navEntry = entries[0] as PerformanceNavigationTiming;
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        this.metricsCollected.TTFB = ttfb;
        this.reportMetric('TTFB', ttfb);
      });

    } catch (error) {
    }
  }

  private createObserver(entryTypes: string[], callback: (entries: PerformanceEntry[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes, buffered: true });
    } catch (error) {
    }
  }

  private observeUserInteractions(): void {
    // Track click response times
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const startTime = performance.now();
      
      // Use requestAnimationFrame to measure visual response
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        
        this.interactionQueue.push({
          type: 'click',
          element: this.getElementSelector(target),
          timestamp: Date.now(),
          responseTime,
          isSlowInteraction: responseTime > 100,
        });
      });
    }, { passive: true });

    // Track scroll performance
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      const startTime = performance.now();
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const responseTime = performance.now() - startTime;
        
        this.interactionQueue.push({
          type: 'scroll',
          element: 'window',
          timestamp: Date.now(),
          responseTime,
          isSlowInteraction: responseTime > 16, // 60fps threshold
        });
      }, 100);
    }, { passive: true });

    // Periodically flush interaction data
    setInterval(() => {
      if (this.interactionQueue.length > 0) {
        this.flushInteractions();
      }
    }, 10000); // Every 10 seconds
  }

  private observeResourceTiming(): void {
    this.createObserver(['resource'], (entries) => {
      for (const entry of entries as PerformanceResourceTiming[]) {
        // Track slow resources
        const loadTime = entry.responseEnd - entry.startTime;
        
        if (loadTime > 2000) { // Resources taking > 2s
          analytics.trackPerformance('slow_resource', loadTime, {
            resourceName: entry.name,
            resourceType: entry.initiatorType,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
          });
        }
      }
    });
  }

  private getElementSelector(element: HTMLElement): string {
    // Create a simple selector for the element
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      return `.${element.className.split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  private reportMetric(name: string, value: number): void {
    const threshold = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS] || 
                     PERFORMANCE_THRESHOLDS.customMetric;
    
    let rating: 'good' | 'needs-improvement' | 'poor';
    if (value <= threshold.good) rating = 'good';
    else if (value <= threshold.poor) rating = 'needs-improvement';
    else rating = 'poor';

    analytics.trackPerformance(name, value, { 
      rating,
      threshold,
      url: window.location.pathname,
    });

    // Log poor performance metrics
    if (rating === 'poor') {
    }
  }

  private flushInteractions(): void {
    const interactions = [...this.interactionQueue];
    this.interactionQueue = [];

    // Track slow interactions
    const slowInteractions = interactions.filter(i => i.isSlowInteraction);
    if (slowInteractions.length > 0) {
      analytics.track('slow_interactions_detected', {
        count: slowInteractions.length,
        totalInteractions: interactions.length,
        slowestInteraction: Math.max(...slowInteractions.map(i => i.responseTime || 0)),
      });
    }
  }

  private trackPageLoad(): void {
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.customMetrics.initialRender = loadTime;
      
      analytics.trackPerformance('page_load_complete', loadTime, {
        url: window.location.pathname,
        resources: performance.getEntriesByType('resource').length,
      });
    });
  }

  private scheduleReporting(): void {
    // Report performance snapshot every 30 seconds for active users
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.generatePerformanceSnapshot();
      }
    }, 30000);

    // Report on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.generatePerformanceSnapshot();
      }
    });
  }

  // Public API Methods
  public markFeatureStart(feature: string): string {
    const markName = `feature-${feature}-start`;
    performance.mark(markName);
    return markName;
  }

  public markFeatureEnd(feature: string, startMark?: string): number {
    const endMarkName = `feature-${feature}-end`;
    const startMarkName = startMark || `feature-${feature}-start`;
    
    performance.mark(endMarkName);
    
    try {
      const measureName = `feature-${feature}-duration`;
      performance.measure(measureName, startMarkName, endMarkName);
      
      const measure = performance.getEntriesByName(measureName)[0];
      const duration = measure.duration;
      
      this.customMetrics[`${feature}Time` as keyof CustomMetrics] = duration;
      this.reportMetric(`feature_${feature}`, duration);
      
      return duration;
    } catch (error) {
      return 0;
    }
  }

  public trackApiCall(endpoint: string, startTime: number): void {
    const duration = performance.now() - startTime;
    
    analytics.trackPerformance('api_response_time', duration, {
      endpoint,
      isSlowApi: duration > 3000,
    });
    
    if (endpoint.includes('ask-aminy')) {
      this.customMetrics.askAminyResponseTime = duration;
    }
  }

  public trackRouteChange(route: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.customMetrics.routeChangeTime = duration;
    
    this.reportMetric('route_change', duration);
    
    analytics.track('route_changed', {
      route,
      loadTime: duration,
      isSlowRoute: duration > 1000,
    });
  }

  public trackComponentMount(componentName: string, mountTime: number): void {
    this.customMetrics.componentMountTime = mountTime;
    
    if (mountTime > 100) { // Components taking > 100ms to mount
      analytics.trackPerformance('slow_component_mount', mountTime, {
        componentName,
      });
    }
  }

  public generatePerformanceSnapshot(): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      // @ts-ignore - Navigator extensions
      connection: navigator.connection,
      // @ts-ignore - Navigator extensions  
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      coreWebVitals: { ...this.metricsCollected },
      customMetrics: { ...this.customMetrics },
      resources: performance.getEntriesByType('resource') as PerformanceResourceTiming[],
      navigation: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
      userInteractions: [...this.interactionQueue],
    };

    // Store snapshot for analysis
    this.storeSnapshot(snapshot);
    
    return snapshot;
  }

  private storeSnapshot(snapshot: PerformanceSnapshot): void {
    try {
      const snapshots = JSON.parse(localStorage.getItem('performanceSnapshots') || '[]');
      snapshots.push(snapshot);
      
      // Keep only last 5 snapshots to prevent storage overflow
      const trimmedSnapshots = snapshots.slice(-5);
      localStorage.setItem('performanceSnapshots', JSON.stringify(trimmedSnapshots));
    } catch (error) {
    }
  }

  public getPerformanceInsights(): {
    coreWebVitals: CoreWebVitals & { ratings: Record<string, string> };
    customMetrics: CustomMetrics;
    performanceScore: number;
    recommendations: string[];
  } {
    const ratings: Record<string, string> = {};
    let totalScore = 0;
    let metricCount = 0;

    // Calculate ratings for Core Web Vitals
    Object.entries(this.metricsCollected).forEach(([metric, value]) => {
      if (value !== undefined) {
        const threshold = PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS];
        if (threshold) {
          if (value <= threshold.good) {
            ratings[metric] = 'good';
            totalScore += 100;
          } else if (value <= threshold.poor) {
            ratings[metric] = 'needs-improvement';
            totalScore += 50;
          } else {
            ratings[metric] = 'poor';
            totalScore += 0;
          }
          metricCount++;
        }
      }
    });

    const performanceScore = metricCount > 0 ? Math.round(totalScore / metricCount) : 0;
    const recommendations = this.generateRecommendations();

    return {
      coreWebVitals: { ...this.metricsCollected, ratings },
      customMetrics: { ...this.customMetrics },
      performanceScore,
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metricsCollected.LCP && this.metricsCollected.LCP > 4000) {
      recommendations.push('Optimize images and hero content to improve Largest Contentful Paint');
    }
    
    if (this.metricsCollected.FID && this.metricsCollected.FID > 300) {
      recommendations.push('Reduce JavaScript execution time to improve First Input Delay');
    }
    
    if (this.metricsCollected.CLS && this.metricsCollected.CLS > 0.25) {
      recommendations.push('Stabilize layout by reserving space for dynamic content');
    }
    
    if (this.customMetrics.askAminyResponseTime && this.customMetrics.askAminyResponseTime > 5000) {
      recommendations.push('Optimize Ask Aminy response time for better user experience');
    }
    
    return recommendations;
  }

  public exportPerformanceData(): {
    coreWebVitals: CoreWebVitals;
    customMetrics: CustomMetrics;
    snapshots: PerformanceSnapshot[];
    insights: ReturnType<PerformanceMonitor['getPerformanceInsights']>;
  } {
    const snapshots = JSON.parse(localStorage.getItem('performanceSnapshots') || '[]');
    
    return {
      coreWebVitals: this.metricsCollected,
      customMetrics: this.customMetrics,
      snapshots,
      insights: this.getPerformanceInsights(),
    };
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.isMonitoring = false;
  }
}

// Global Performance Monitor Instance
export const performanceMonitor = new PerformanceMonitor();

// React Hook for Performance Monitoring
export function usePerformanceMonitor() {
  return {
    markStart: performanceMonitor.markFeatureStart.bind(performanceMonitor),
    markEnd: performanceMonitor.markFeatureEnd.bind(performanceMonitor),
    trackApi: performanceMonitor.trackApiCall.bind(performanceMonitor),
    trackRoute: performanceMonitor.trackRouteChange.bind(performanceMonitor),
    trackComponent: performanceMonitor.trackComponentMount.bind(performanceMonitor),
    getInsights: performanceMonitor.getPerformanceInsights.bind(performanceMonitor),
    exportData: performanceMonitor.exportPerformanceData.bind(performanceMonitor),
  };
}

// Utility Functions
export function withPerformanceTracking<T extends any[]>(
  fn: (...args: T) => any,
  featureName: string
) {
  return (...args: T) => {
    const startMark = performanceMonitor.markFeatureStart(featureName);
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        performanceMonitor.markFeatureEnd(featureName, startMark);
      });
    } else {
      performanceMonitor.markFeatureEnd(featureName, startMark);
      return result;
    }
  };
}

export function trackAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now();
  
  return operation().finally(() => {
    const duration = performance.now() - startTime;
    analytics.trackPerformance(`async_${operationName}`, duration);
  });
}

// Debug utilities
export function getPerformanceDebugInfo() {
  if (process.env.NODE_ENV === 'development') {
    return performanceMonitor.exportPerformanceData();
  }
  return null;
}

// Initialization function for App.tsx
export function initPerformanceMonitoring(): void {
  // Performance monitor is auto-initialized via constructor
  // This function exists for explicit initialization in App.tsx
  if (typeof window !== 'undefined') {
  }
}

export { PERFORMANCE_THRESHOLDS };