/**
 * Production Performance Hooks
 *
 * Advanced React hooks for monitoring component performance,
 * memory usage, long tasks, and Interaction to Next Paint (INP).
 */

import { useEffect, useRef, useCallback, useState, Profiler, ProfilerOnRenderCallback } from 'react';
import { analytics } from './analytics-engine';

// ============================================
// COMPONENT RENDER TRACKING
// ============================================

interface RenderMetrics {
  actualDuration: number;
  baseDuration: number;
  commitTime: number;
  renderCount: number;
  phase: 'mount' | 'update';
}

interface UseRenderTrackingOptions {
  componentName: string;
  slowRenderThreshold?: number; // ms
  trackAllRenders?: boolean;
  onSlowRender?: (metrics: RenderMetrics) => void;
}

/**
 * Hook to track component render performance
 */
export function useRenderTracking(options: UseRenderTrackingOptions) {
  const {
    componentName,
    slowRenderThreshold = 16, // 60fps budget
    trackAllRenders = false,
    onSlowRender,
  } = options;

  const renderCount = useRef(0);
  const totalRenderTime = useRef(0);

  const onRender: ProfilerOnRenderCallback = useCallback(
    (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      renderCount.current++;
      totalRenderTime.current += actualDuration;

      const metrics: RenderMetrics = {
        actualDuration,
        baseDuration,
        commitTime,
        renderCount: renderCount.current,
        phase,
      };

      const isSlowRender = actualDuration > slowRenderThreshold;

      if (isSlowRender) {
        analytics.track('slow_component_render', {
          componentName,
          actualDuration,
          baseDuration,
          phase,
          renderCount: renderCount.current,
        });

        onSlowRender?.(metrics);

        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[Performance] Slow render detected in ${componentName}: ${actualDuration.toFixed(2)}ms (phase: ${phase})`
          );
        }
      } else if (trackAllRenders) {
        analytics.track('component_render', {
          componentName,
          actualDuration,
          phase,
        });
      }
    },
    [componentName, slowRenderThreshold, trackAllRenders, onSlowRender]
  );

  const ProfilerWrapper = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <Profiler id={componentName} onRender={onRender}>
        {children}
      </Profiler>
    ),
    [componentName, onRender]
  );

  return {
    ProfilerWrapper,
    getRenderStats: () => ({
      totalRenders: renderCount.current,
      totalRenderTime: totalRenderTime.current,
      averageRenderTime: renderCount.current > 0
        ? totalRenderTime.current / renderCount.current
        : 0,
    }),
  };
}

// ============================================
// INTERACTION TO NEXT PAINT (INP)
// ============================================

interface INPEntry {
  interactionId: number;
  duration: number;
  startTime: number;
  target: string;
}

/**
 * Hook to track Interaction to Next Paint (INP) - the new Core Web Vital
 */
export function useINPTracking() {
  const interactions = useRef<INPEntry[]>([]);
  const [worstINP, setWorstINP] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // @ts-ignore - PerformanceEventTiming has interactionId
          if (entry.interactionId) {
            const inpEntry: INPEntry = {
              // @ts-ignore
              interactionId: entry.interactionId,
              duration: entry.duration,
              startTime: entry.startTime,
              target: (entry as any).target?.tagName || 'unknown',
            };

            interactions.current.push(inpEntry);

            // Keep only the worst 10 interactions
            if (interactions.current.length > 10) {
              interactions.current.sort((a, b) => b.duration - a.duration);
              interactions.current = interactions.current.slice(0, 10);
            }

            // Update worst INP
            const currentWorst = Math.max(...interactions.current.map(i => i.duration));
            setWorstINP(currentWorst);

            // Track slow interactions (>200ms is considered poor INP)
            if (entry.duration > 200) {
              analytics.track('poor_inp_interaction', {
                duration: entry.duration,
                target: inpEntry.target,
                // @ts-ignore
                interactionId: entry.interactionId,
              });
            }
          }
        }
      });

      observer.observe({
        type: 'event',
        // @ts-ignore
        durationThreshold: 16, // Track interactions >16ms
        buffered: true,
      });

      return () => observer.disconnect();
    } catch {
      // INP observation not supported
    }
  }, []);

  return {
    worstINP,
    getINPStats: () => ({
      worstINP,
      p75INP: calculatePercentile(interactions.current.map(i => i.duration), 75),
      totalInteractions: interactions.current.length,
      rating: worstINP <= 200 ? 'good' : worstINP <= 500 ? 'needs-improvement' : 'poor',
    }),
  };
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ============================================
// MEMORY MONITORING
// ============================================

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

interface UseMemoryMonitoringOptions {
  warningThreshold?: number; // percentage (0-100)
  criticalThreshold?: number;
  pollingInterval?: number; // ms
  onWarning?: (info: MemoryInfo) => void;
  onCritical?: (info: MemoryInfo) => void;
}

/**
 * Hook to monitor memory usage and detect potential leaks
 */
export function useMemoryMonitoring(options: UseMemoryMonitoringOptions = {}) {
  const {
    warningThreshold = 70,
    criticalThreshold = 90,
    pollingInterval = 30000, // 30 seconds
    onWarning,
    onCritical,
  } = options;

  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const previousUsage = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // @ts-ignore - performance.memory is Chrome-specific
    const memory = (performance as any).memory;
    if (!memory) return;

    const checkMemory = () => {
      const info: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };

      setMemoryInfo(info);

      // Track usage history for leak detection
      previousUsage.current.push(info.usedJSHeapSize);
      if (previousUsage.current.length > 10) {
        previousUsage.current.shift();
      }

      // Check for potential memory leak (consistent increase)
      if (previousUsage.current.length >= 5) {
        const isConsistentlyIncreasing = previousUsage.current.every(
          (val, i, arr) => i === 0 || val > arr[i - 1]
        );

        if (isConsistentlyIncreasing) {
          analytics.track('potential_memory_leak', {
            currentUsage: info.usedJSHeapSize,
            usageHistory: previousUsage.current,
          });

          if (process.env.NODE_ENV === 'development') {
            console.warn('[Performance] Potential memory leak detected - heap size consistently increasing');
          }
        }
      }

      // Threshold alerts
      if (info.usagePercentage >= criticalThreshold) {
        analytics.track('critical_memory_usage', info);
        onCritical?.(info);
      } else if (info.usagePercentage >= warningThreshold) {
        analytics.track('high_memory_usage', info);
        onWarning?.(info);
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, pollingInterval);

    return () => clearInterval(interval);
  }, [warningThreshold, criticalThreshold, pollingInterval, onWarning, onCritical]);

  return {
    memoryInfo,
    isHighUsage: memoryInfo ? memoryInfo.usagePercentage >= warningThreshold : false,
    isCritical: memoryInfo ? memoryInfo.usagePercentage >= criticalThreshold : false,
    formatMemory: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`,
  };
}

// ============================================
// LONG TASK DETECTION
// ============================================

interface LongTask {
  duration: number;
  startTime: number;
  name: string;
  containerType?: string;
}

interface UseLongTaskTrackingOptions {
  threshold?: number; // ms (default: 50ms per spec)
  onLongTask?: (task: LongTask) => void;
}

/**
 * Hook to track Long Tasks (>50ms) that block the main thread
 */
export function useLongTaskTracking(options: UseLongTaskTrackingOptions = {}) {
  const { threshold = 50, onLongTask } = options;
  const [longTasks, setLongTasks] = useState<LongTask[]>([]);
  const totalBlockingTime = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > threshold) {
            const task: LongTask = {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
              // @ts-ignore
              containerType: entry.attribution?.[0]?.containerType,
            };

            setLongTasks(prev => {
              const updated = [...prev, task];
              // Keep last 20 long tasks
              return updated.slice(-20);
            });

            // Calculate Total Blocking Time (TBT)
            totalBlockingTime.current += entry.duration - 50;

            onLongTask?.(task);

            analytics.track('long_task_detected', {
              duration: entry.duration,
              totalBlockingTime: totalBlockingTime.current,
            });
          }
        }
      });

      observer.observe({ type: 'longtask', buffered: true });

      return () => observer.disconnect();
    } catch {
      // Long task observation not supported
    }
  }, [threshold, onLongTask]);

  return {
    longTasks,
    totalBlockingTime: totalBlockingTime.current,
    getStats: () => ({
      totalLongTasks: longTasks.length,
      totalBlockingTime: totalBlockingTime.current,
      averageDuration: longTasks.length > 0
        ? longTasks.reduce((sum, t) => sum + t.duration, 0) / longTasks.length
        : 0,
      worstTask: longTasks.length > 0
        ? Math.max(...longTasks.map(t => t.duration))
        : 0,
    }),
  };
}

// ============================================
// NETWORK QUALITY MONITORING
// ============================================

interface NetworkInfo {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Hook to monitor network quality for adaptive loading
 */
export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // @ts-ignore - Navigator.connection is experimental
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;

    if (!connection) return;

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      });
    };

    updateNetworkInfo();
    connection.addEventListener('change', updateNetworkInfo);

    return () => connection.removeEventListener('change', updateNetworkInfo);
  }, []);

  return {
    networkInfo,
    isSlowConnection: networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g',
    shouldReduceData: networkInfo?.saveData || networkInfo?.effectiveType === 'slow-2g',
    getAdaptiveQuality: (): 'high' | 'medium' | 'low' => {
      if (!networkInfo) return 'high';
      if (networkInfo.saveData || networkInfo.effectiveType === 'slow-2g') return 'low';
      if (networkInfo.effectiveType === '2g' || networkInfo.effectiveType === '3g') return 'medium';
      return 'high';
    },
  };
}

// ============================================
// PERFORMANCE BUDGET
// ============================================

interface PerformanceBudget {
  maxBundleSize?: number; // KB
  maxImageSize?: number; // KB
  maxFCP?: number; // ms
  maxLCP?: number; // ms
  maxINP?: number; // ms
  maxTBT?: number; // ms
}

interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  severity: 'warning' | 'error';
}

const DEFAULT_BUDGET: PerformanceBudget = {
  maxBundleSize: 500, // 500KB
  maxImageSize: 200, // 200KB
  maxFCP: 1800,
  maxLCP: 2500,
  maxINP: 200,
  maxTBT: 300,
};

/**
 * Hook to enforce performance budgets
 */
export function usePerformanceBudget(customBudget: Partial<PerformanceBudget> = {}) {
  const [violations, setViolations] = useState<BudgetViolation[]>([]);
  const budget = { ...DEFAULT_BUDGET, ...customBudget };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBudgets = () => {
      const newViolations: BudgetViolation[] = [];

      // Check resource sizes
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      for (const resource of resources) {
        const sizeKB = (resource.transferSize || 0) / 1024;

        // Check bundle sizes (JS/CSS)
        if (resource.initiatorType === 'script' || resource.initiatorType === 'link') {
          if (budget.maxBundleSize && sizeKB > budget.maxBundleSize) {
            newViolations.push({
              metric: `bundle:${resource.name.split('/').pop()}`,
              actual: sizeKB,
              budget: budget.maxBundleSize,
              severity: sizeKB > budget.maxBundleSize * 1.5 ? 'error' : 'warning',
            });
          }
        }

        // Check image sizes
        if (resource.initiatorType === 'img') {
          if (budget.maxImageSize && sizeKB > budget.maxImageSize) {
            newViolations.push({
              metric: `image:${resource.name.split('/').pop()}`,
              actual: sizeKB,
              budget: budget.maxImageSize,
              severity: sizeKB > budget.maxImageSize * 2 ? 'error' : 'warning',
            });
          }
        }
      }

      if (newViolations.length > 0) {
        setViolations(prev => [...prev, ...newViolations]);
        analytics.track('performance_budget_violations', {
          violations: newViolations,
        });
      }
    };

    // Check on load and after a delay for late-loading resources
    window.addEventListener('load', () => {
      setTimeout(checkBudgets, 2000);
    });
  }, [budget]);

  return {
    violations,
    hasViolations: violations.length > 0,
    hasErrors: violations.some(v => v.severity === 'error'),
    getBudget: () => budget,
  };
}

// ============================================
// COMBINED PERFORMANCE HOOK
// ============================================

/**
 * All-in-one performance monitoring hook
 */
export function useProductionPerformance(componentName?: string) {
  const render = useRenderTracking({
    componentName: componentName || 'App',
    slowRenderThreshold: 16,
  });

  const inp = useINPTracking();
  const memory = useMemoryMonitoring();
  const longTasks = useLongTaskTracking();
  const network = useNetworkQuality();
  const budget = usePerformanceBudget();

  return {
    render,
    inp,
    memory,
    longTasks,
    network,
    budget,
    getFullReport: () => ({
      renderStats: render.getRenderStats(),
      inpStats: inp.getINPStats(),
      memoryInfo: memory.memoryInfo,
      longTaskStats: longTasks.getStats(),
      networkInfo: network.networkInfo,
      budgetViolations: budget.violations,
    }),
  };
}

export default useProductionPerformance;
