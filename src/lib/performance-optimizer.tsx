// ===== PHASE 3: PERFORMANCE OPTIMIZATION SERVICE =====

// Lazy loading utilities
export const createLazyComponent = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(factory);
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <React.Suspense 
      fallback={
        fallback ? 
        React.createElement(fallback) : 
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <LazyComponent {...props} ref={ref} />
    </React.Suspense>
  ));
};

// Image lazy loading with intersection observer
export class LazyImageLoader {
  private static observer: IntersectionObserver | null = null;
  private static imageQueue = new Set<HTMLImageElement>();

  static initialize() {
    if (typeof window === 'undefined' || this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
            this.imageQueue.delete(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );
  }

  static observe(img: HTMLImageElement) {
    if (!this.observer) this.initialize();
    if (this.observer) {
      this.observer.observe(img);
      this.imageQueue.add(img);
    }
  }

  static unobserve(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.unobserve(img);
      this.imageQueue.delete(img);
    }
  }

  private static loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    const srcSet = img.dataset.srcset;
    
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
    
    if (srcSet) {
      img.srcset = srcSet;
      img.removeAttribute('data-srcset');
    }

    img.classList.remove('lazy-loading');
    img.classList.add('lazy-loaded');
  }

  static cleanup() {
    if (this.observer) {
      this.imageQueue.forEach(img => this.observer?.unobserve(img));
      this.imageQueue.clear();
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Memory management
export class MemoryManager {
  private static cleanupTasks: (() => void)[] = [];
  private static isCleanupScheduled = false;

  static addCleanupTask(task: () => void) {
    this.cleanupTasks.push(task);
    this.scheduleCleanup();
  }

  private static scheduleCleanup() {
    if (this.isCleanupScheduled) return;
    
    this.isCleanupScheduled = true;
    
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => this.runCleanup(), { timeout: 5000 });
    } else {
      setTimeout(() => this.runCleanup(), 100);
    }
  }

  private static runCleanup() {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
      }
    });
    
    this.cleanupTasks = [];
    this.isCleanupScheduled = false;

    // Force garbage collection in development
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      (window as any).gc();
    }
  }

  static forceCleanup() {
    this.runCleanup();
  }
}

// Resource preloading
export class ResourcePreloader {
  private static preloadedResources = new Set<string>();

  static preloadCriticalResources() {
    if (typeof window === 'undefined') return;

    // Preload critical fonts
    this.preloadFont('/fonts/inter-var.woff2', 'font/woff2');
    
    // Preload critical images
    this.preloadImage('/logo.png');
    this.preloadImage('/hero-bg.webp');
    
    // Preload critical CSS
    this.preloadCSS('/critical.css');
  }

  private static preloadFont(href: string, type: string) {
    if (this.preloadedResources.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'font';
    link.type = type;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    this.preloadedResources.add(href);
  }

  private static preloadImage(src: string) {
    if (this.preloadedResources.has(src)) return;

    const img = new Image();
    img.src = src;
    
    this.preloadedResources.add(src);
  }

  private static preloadCSS(href: string) {
    if (this.preloadedResources.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'style';
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
    
    this.preloadedResources.add(href);
  }

  static preloadRoute(routePath: string) {
    if (this.preloadedResources.has(routePath)) return;

    // Dynamically import route component
    import(`../components/${routePath}`)
      .then(() => {
      })
      .catch((error) => {
      });
    
    this.preloadedResources.add(routePath);
  }
}

// Bundle splitting configuration
export const bundleSplitConfig = {
  // Vendor libraries
  vendor: [
    'react',
    'react-dom',
    'lucide-react'
  ],
  
  // UI components
  ui: [
    './components/ui/',
    './components/figma/'
  ],
  
  // Feature-specific bundles
  onboarding: [
    './components/OnboardingFlowNormalized',
    './components/PreferencesStepNew',
    './components/SummaryStepNew'
  ],
  
  care: [
    './components/CarePage',
    './components/CareTab',
    './components/CoachScreen'
  ],
  
  reports: [
    './components/ReportsTab',
    './components/RecordsVault'
  ],
  
  settings: [
    './components/SettingsPage',
    './components/SettingsPageFixed'
  ]
};

// Code splitting utility
export const splitByRoute = (routes: Record<string, () => Promise<any>>) => {
  const chunks: Record<string, React.LazyExoticComponent<any>> = {};
  
  Object.entries(routes).forEach(([key, loader]) => {
    chunks[key] = React.lazy(loader);
  });
  
  return chunks;
};

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Record<string, number[]> = {};
  private static initialized = false;

  static initialize() {
    if (typeof window === 'undefined' || this.initialized) return;
    
    this.initialized = true;
    
    // Monitor Core Web Vitals
    this.monitorLCP();
    this.monitorFID();
    this.monitorCLS();
    
    // Monitor custom metrics
    this.monitorRouteChanges();
    this.monitorMemoryUsage();
  }

  private static monitorLCP() {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        this.recordMetric('LCP', entry.startTime);
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private static monitorFID() {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
  }

  private static monitorCLS() {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.recordMetric('CLS', clsValue);
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private static monitorRouteChanges() {
    let navigationStart = performance.now();
    
    const observer = new MutationObserver(() => {
      const navigationEnd = performance.now();
      const duration = navigationEnd - navigationStart;
      this.recordMetric('Route Change', duration);
      navigationStart = navigationEnd;
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private static monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('Memory Used', memory.usedJSHeapSize / 1024 / 1024);
        this.recordMetric('Memory Total', memory.totalJSHeapSize / 1024 / 1024);
      }, 30000); // Every 30 seconds
    }
  }

  static recordMetric(name: string, value: number) {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    this.metrics[name].push(value);
    
    // Keep only last 100 measurements
    if (this.metrics[name].length > 100) {
      this.metrics[name] = this.metrics[name].slice(-100);
    }
  }

  static getMetrics() {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    Object.entries(this.metrics).forEach(([name, values]) => {
      summary[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    
    return summary;
  }

  static reportMetrics() {
    const metrics = this.getMetrics();
    console.table(metrics);
    
    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      Object.entries(metrics).forEach(([name, data]) => {
        (window as any).gtag('event', 'performance_metric', {
          metric_name: name,
          metric_value: data.avg,
          metric_min: data.min,
          metric_max: data.max
        });
      });
    }
  }
}

// Caching service
export class CacheManager {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static initialized = false;

  static initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  static set(key: string, data: any, ttlMs: number = 300000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  static has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  static delete(key: string) {
    this.cache.delete(key);
  }

  static clear() {
    this.cache.clear();
  }

  private static cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
  }

  static getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    });
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
}

// Initialize all performance optimizations
export const initializePerformanceOptimizations = () => {
  if (typeof window === 'undefined') return;
  
  // Initialize all services
  LazyImageLoader.initialize();
  PerformanceMonitor.initialize();
  CacheManager.initialize();
  ResourcePreloader.preloadCriticalResources();
  
  // Report performance metrics periodically
  setInterval(() => {
    PerformanceMonitor.reportMetrics();
  }, 60000); // Every minute
  
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    LazyImageLoader.cleanup();
    MemoryManager.forceCleanup();
  });
}

import React from 'react';

export {
  createLazyComponent,
  LazyImageLoader,
  MemoryManager,
  ResourcePreloader,
  PerformanceMonitor,
  CacheManager,
  bundleSplitConfig,
  splitByRoute,
  initializePerformanceOptimizations
};