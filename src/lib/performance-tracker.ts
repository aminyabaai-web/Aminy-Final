/**
 * Performance Tracking Utility
 * Monitors FCP, LCP, and other Core Web Vitals
 */

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

export const trackPerformance = () => {
  const metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  };

  // Track First Contentful Paint (FCP)
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = entry.startTime;
        
        if (entry.startTime > 3000) {
        }
      }
    }
  });

  try {
    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
  }

  // Track Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as any;
    metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
    
    if (metrics.lcp > 4000) {
    }
  });

  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
  }

  // Track Time to First Byte (TTFB)
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigationEntry) {
    metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
  }

  // Track Cumulative Layout Shift (CLS)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    metrics.cls = clsValue;
  });

  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
  }

  // Log summary after page load (metrics available: FCP, LCP, TTFB, CLS)
  window.addEventListener('load', () => {
    // Performance metrics tracked
  });

  return metrics;
};

// Export for manual initialization only
export default trackPerformance;
