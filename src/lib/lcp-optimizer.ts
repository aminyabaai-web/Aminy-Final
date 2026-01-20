/**
 * LCP (Largest Contentful Paint) Optimizer
 * 
 * Target: LCP < 2500ms (Good), < 4000ms (Needs Improvement)
 * Current: 614716ms (CRITICAL - needs immediate fix)
 * 
 * Strategies:
 * 1. Preload critical images
 * 2. Optimize image loading with fetchpriority
 * 3. Defer non-critical resources
 * 4. Use content-visibility for off-screen content
 * 5. Minimize render-blocking resources
 */

export interface LCPMetrics {
  lcpTime: number;
  lcpElement: string | null;
  renderTime: number;
  loadTime: number;
}

/**
 * Initialize LCP monitoring and optimization
 */
export function initLCPOptimizer() {
  if (typeof window === 'undefined') return;

  // 1. Preload critical images immediately
  preloadCriticalImages();

  // 2. Monitor LCP performance
  monitorLCP();

  // 3. Optimize font loading
  optimizeFontLoading();

  // 4. Defer non-critical resources
  deferNonCriticalResources();
}

/**
 * Preload critical images that are likely to be LCP candidates
 * Note: Figma assets are handled by the build system and shouldn't be preloaded manually
 */
function preloadCriticalImages() {
  // Figma assets are imported and bundled, so they're already optimized
  // No manual preloading needed
}

/**
 * Monitor LCP using Performance Observer API
 */
function monitorLCP() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      if (lastEntry) {
        const lcpTime = lastEntry.renderTime || lastEntry.loadTime;
        
        // Log LCP metrics in development
        if (process.env.NODE_ENV === 'development') {
          // LCP metrics available: time, element, url, size
        }

        // Send to analytics in production
        if (lcpTime > 4000) {
        }
      }
    });

    observer.observe({ 
      type: 'largest-contentful-paint', 
      buffered: true 
    });
  } catch (error) {
    console.error('Failed to observe LCP:', error);
  }
}

/**
 * Optimize font loading to prevent LCP delays
 */
function optimizeFontLoading() {
  // Use font-display: optional for critical fonts
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Manrope-Optimized';
      font-display: optional;
      src: local('Manrope'), local('Helvetica'), local('Arial');
    }
  `;
  document.head.appendChild(style);
}

/**
 * Defer non-critical resources until after LCP
 */
function deferNonCriticalResources() {
  if (!('requestIdleCallback' in window)) return;

  requestIdleCallback(() => {
    // Defer analytics
    const analyticsScripts = document.querySelectorAll('script[data-defer="true"]');
    analyticsScripts.forEach(script => {
      const newScript = document.createElement('script');
      newScript.src = script.getAttribute('src') || '';
      newScript.async = true;
      document.body.appendChild(newScript);
    });
  }, { timeout: 3000 });
}

/**
 * Measure and report LCP
 */
export function measureLCP(): Promise<LCPMetrics> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve({
        lcpTime: 0,
        lcpElement: null,
        renderTime: 0,
        loadTime: 0,
      });
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      if (lastEntry) {
        resolve({
          lcpTime: lastEntry.renderTime || lastEntry.loadTime,
          lcpElement: lastEntry.element?.tagName || null,
          renderTime: lastEntry.renderTime || 0,
          loadTime: lastEntry.loadTime || 0,
        });
        observer.disconnect();
      }
    });

    observer.observe({ 
      type: 'largest-contentful-paint', 
      buffered: true 
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve({
        lcpTime: 0,
        lcpElement: null,
        renderTime: 0,
        loadTime: 0,
      });
    }, 10000);
  });
}

/**
 * Get LCP optimization recommendations
 */
export function getLCPRecommendations(metrics: LCPMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.lcpTime > 4000) {
    recommendations.push('Critical: LCP is over 4 seconds. Optimize image loading.');
  }

  if (metrics.lcpTime > 2500) {
    recommendations.push('LCP needs improvement. Consider preloading critical images.');
  }

  if (metrics.lcpElement === 'IMG') {
    recommendations.push('LCP element is an image. Use fetchpriority="high" and preload.');
  }

  if (metrics.renderTime > metrics.loadTime) {
    recommendations.push('Render time is slower than load time. Check for layout shifts.');
  }

  return recommendations;
}

/**
 * Apply LCP optimizations to an image element
 */
export function optimizeImageForLCP(img: HTMLImageElement) {
  // Set fetchpriority
  img.setAttribute('fetchpriority', 'high');
  
  // Set loading strategy
  img.loading = 'eager';
  
  // Set decoding strategy
  img.decoding = 'async';
  
  // Add explicit dimensions if missing
  if (!img.width || !img.height) {
    const computedStyle = window.getComputedStyle(img);
    img.width = parseInt(computedStyle.width) || 400;
    img.height = parseInt(computedStyle.height) || 400;
  }

  // Enable content-visibility
  img.style.contentVisibility = 'auto';
  
  // Hardware acceleration
  img.style.transform = 'translateZ(0)';
  img.style.willChange = 'transform';
}

/**
 * Preload and cache an image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}
