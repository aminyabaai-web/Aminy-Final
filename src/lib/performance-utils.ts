/**
 * Performance Optimization Utilities
 * Helper functions for improving app performance
 */

/**
 * Debounce function calls to reduce excessive executions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request idle callback with fallback for unsupported browsers
 */
export function requestIdleCallbackPolyfill(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback to setTimeout
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50
    });
  }, 1) as any;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallbackPolyfill(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Measure performance of async operations
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - start;
    
    if (duration > 1000) {
    } else if (process.env.NODE_ENV === 'development') {
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Batch multiple operations to reduce reflows
 */
export function batchDOMUpdates(callback: () => void): void {
  requestAnimationFrame(() => {
    callback();
  });
}

/**
 * Defer non-critical operations until browser is idle
 */
export function deferUntilIdle(callback: () => void, timeout: number = 2000): void {
  requestIdleCallbackPolyfill(callback, { timeout });
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get connection speed (for adaptive loading)
 */
export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return 'medium';
  
  const effectiveType = connection.effectiveType;
  
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'medium';
  return 'slow';
}

/**
 * Check if device is low-end (for performance adaptations)
 */
export function isLowEndDevice(): boolean {
  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores < 4) return true;
  
  // Check for device memory
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return true;
  
  // Check connection speed
  if (getConnectionSpeed() === 'slow') return true;
  
  return false;
}

/**
 * Adaptive loading based on device capabilities
 */
export function shouldLoadHighQuality(): boolean {
  if (isLowEndDevice()) return false;
  if (getConnectionSpeed() === 'slow') return false;
  return true;
}

/**
 * Create memoized function (simple cache)
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Clear cache if it gets too large
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

/**
 * Chunk large arrays for progressive rendering
 */
export async function* chunkArray<T>(
  array: T[],
  chunkSize: number = 20
): AsyncGenerator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
    // Allow browser to breathe between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Progressive rendering helper
 */
export function useProgressiveRender<T>(
  items: T[],
  chunkSize: number = 20,
  interval: number = 50
): T[] {
  const [visibleItems, setVisibleItems] = React.useState<T[]>([]);
  
  React.useEffect(() => {
    let currentIndex = 0;
    
    const timer = setInterval(() => {
      if (currentIndex >= items.length) {
        clearInterval(timer);
        return;
      }
      
      const nextChunk = items.slice(currentIndex, currentIndex + chunkSize);
      setVisibleItems(prev => [...prev, ...nextChunk]);
      currentIndex += chunkSize;
    }, interval);
    
    return () => clearInterval(timer);
  }, [items, chunkSize, interval]);
  
  return visibleItems;
}

/**
 * Use Web Worker for heavy computations
 */
export function createWorker(workerFunction: () => void): Worker {
  const blob = new Blob([`(${workerFunction.toString()})()`], {
    type: 'application/javascript'
  });
  
  return new Worker(URL.createObjectURL(blob));
}

/**
 * Passive event listener helper
 */
export function addPassiveEventListener(
  element: HTMLElement | Window,
  event: string,
  handler: EventListener
): () => void {
  element.addEventListener(event, handler, { passive: true });
  
  return () => element.removeEventListener(event, handler);
}

/**
 * Measure First Input Delay
 */
export function measureFID(callback: (fid: number) => void): void {
  let firstInputDelay: number;
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'first-input' && 'processingStart' in entry) {
        firstInputDelay = (entry as any).processingStart - entry.startTime;
        callback(firstInputDelay);
        observer.disconnect();
      }
    }
  });
  
  try {
    observer.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // First Input Delay not supported
  }
}

/**
 * Measure Cumulative Layout Shift
 */
export function measureCLS(callback: (cls: number) => void): void {
  let clsValue = 0;
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
        callback(clsValue);
      }
    }
  });
  
  try {
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Layout Shift not supported
  }
}

/**
 * Report Web Vitals to analytics
 */
export function reportWebVitals(): void {
  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  
  // First Input Delay
  
  // Cumulative Layout Shift
}

// Import React for hooks
import React from 'react';
