// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { toast } from 'sonner';

// ===== TYPE DECLARATIONS FOR THIRD-PARTY GLOBALS =====

/** Props for the error fallback component */
interface ErrorFallbackProps {
  error?: Error;
}

/** Sentry-like error reporting SDK on window */
interface SentryGlobal {
  captureException: (error: Error, context?: { contexts: { react: React.ErrorInfo } }) => void;
}

/** Google Analytics gtag function */
type GtagFunction = (
  command: string,
  targetOrEvent: string,
  params?: Record<string, unknown>
) => void;

/** Generic analytics tracker */
interface AnalyticsTracker {
  track: (eventName: string, properties: Record<string, unknown>) => void;
}

/** Extended window with optional third-party globals */
interface WindowWithGlobals extends Window {
  Sentry?: SentryGlobal;
  gtag?: GtagFunction;
  customAnalytics?: AnalyticsTracker;
  analytics?: AnalyticsTracker;
}

/** Navigator Network Information API connection */
interface NetworkInformationConnection extends EventTarget {
  type?: string;
  effectiveType?: string;
}

/** Navigator extended with experimental connection APIs */
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationConnection;
  mozConnection?: NetworkInformationConnection;
  webkitConnection?: NetworkInformationConnection;
}

/** Performance entry that may carry a `value` (e.g., CLS, LCP) */
interface PerformanceEntryWithValue extends PerformanceEntry {
  value?: number;
}

/** BeforeInstallPromptEvent for PWA install prompt */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ===== PHASE 3: PRODUCTION EXCELLENCE & PERFORMANCE OPTIMIZATION =====

// Error Boundary with Analytics Integration
export class ProductionErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<ErrorFallbackProps> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<ErrorFallbackProps> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Production analytics
    if (typeof window !== 'undefined') {
      // Log to analytics service
      console.error('[Production Error]', error, errorInfo);
      
      // Report to external service (Sentry, LogRocket, etc.)
      const typedWindow = window as WindowWithGlobals;
      if (typedWindow.Sentry) {
        typedWindow.Sentry.captureException(error, {
          contexts: { react: errorInfo }
        });
      }

      // Track error event
      if (typedWindow.gtag) {
        typedWindow.gtag('event', 'exception', {
          description: error.message,
          fatal: false
        });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F2]">
    <div className="max-w-md text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">
        We've encountered an unexpected error. Our team has been notified.
      </p>
      <div className="space-y-2">
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reload Page
        </button>
        <button
          onClick={() => window.history.back()}
          className="w-full bg-[#E8E4DF] text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Go Back
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-left text-sm text-gray-500">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
        </details>
      )}
    </div>
  </div>
);

// Performance Monitor Hook
export const usePerformanceMonitor = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Web Vitals monitoring
    const typedWindow = window as WindowWithGlobals;
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Log performance metrics

        // Report to analytics
        const entryWithValue = entry as PerformanceEntryWithValue;
        if (typedWindow.gtag) {
          typedWindow.gtag('event', 'web_vitals', {
            metric_name: entry.name,
            metric_value: entry.duration || entryWithValue.value,
            page_path: window.location.pathname
          });
        }
      });
    });

    // Observe Core Web Vitals
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
    }

    return () => observer.disconnect();
  }, []);
};

// Network Status Context
interface NetworkContextType {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  connectionType: 'unknown',
  effectiveType: '4g'
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkContextType>(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { isOnline: true, connectionType: 'unknown', effectiveType: '4g' };
    }

    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || '4g'
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const updateOnlineStatus = () => {
      const nav = navigator as NavigatorWithConnection;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        connectionType: connection?.type || prev.connectionType,
        effectiveType: connection?.effectiveType || prev.effectiveType
      }));

      // Show user feedback for connection changes
      if (navigator.onLine) {
        toast.success('Connection restored', { duration: 2000 });
      } else {
        toast.error('Connection lost - working offline', { duration: 5000 });
      }
    };

    const updateConnection = () => {
      const nav = navigator as NavigatorWithConnection;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      if (connection) {
        setNetworkStatus(prev => ({
          ...prev,
          connectionType: connection.type ?? prev.connectionType,
          effectiveType: connection.effectiveType ?? prev.effectiveType
        }));

        // Warn about slow connections
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          toast.warning('Slow connection detected - some features may be limited', { duration: 4000 });
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const navForCleanup = navigator as NavigatorWithConnection;
    const connectionForCleanup = navForCleanup.connection || navForCleanup.mozConnection || navForCleanup.webkitConnection;
    if (connectionForCleanup) {
      connectionForCleanup.addEventListener('change', updateConnection);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (connectionForCleanup) {
        connectionForCleanup.removeEventListener('change', updateConnection);
      }
    };
  }, []);

  return (
    <NetworkContext.Provider value={networkStatus}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);

// Accessibility Enhancement Hook
export const useAccessibility = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Focus management
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip links for keyboard navigation
      if (event.key === 'Tab' && event.shiftKey && event.ctrlKey) {
        event.preventDefault();
        const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
        if (mainContent) {
          (mainContent as HTMLElement).focus();
        }
      }

      // Escape key handling for modals
      if (event.key === 'Escape') {
        const openModal = document.querySelector('[role="dialog"][data-state="open"]');
        if (openModal) {
          const closeButton = openModal.querySelector('[data-close]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        }
      }
    };

    // Announce route changes to screen readers
    const announceRouteChange = () => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Navigated to ${document.title}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Listen for route changes
    const observer = new MutationObserver(() => {
      announceRouteChange();
    });
    observer.observe(document.querySelector('title') || document.head, { childList: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, []);
};

// Progressive Web App Enhancement
export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      toast.success('App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('Installing app...');
        return true;
      } else {
        toast.info('App installation cancelled');
        return false;
      }
    } catch (error) {
      console.error('Error installing app:', error);
      toast.error('Failed to install app');
      return false;
    } finally {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  }, [deferredPrompt]);

  return { isInstallable, installApp };
};

// Analytics Context with Enhanced Tracking
interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  trackPageView: (page: string, title?: string) => void;
  trackUserAction: (action: string, target: string, properties?: Record<string, unknown>) => void;
  setUserProperties: (properties: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
  trackPageView: () => {},
  trackUserAction: () => {},
  setUserProperties: () => {}
});

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const trackEvent = useCallback((eventName: string, properties: Record<string, unknown> = {}) => {
    try {
      // Console logging for development

      // Google Analytics 4
      const typedWindow = (typeof window !== 'undefined' ? window : undefined) as WindowWithGlobals | undefined;
      if (typedWindow?.gtag) {
        typedWindow.gtag('event', eventName, {
          ...properties,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          page_location: window.location.href,
          page_referrer: document.referrer
        });
      }

      // Custom analytics service (placeholder)
      if (typedWindow?.customAnalytics) {
        typedWindow.customAnalytics.track(eventName, properties);
      }

      // Send to multiple analytics providers
      if (typedWindow?.analytics) {
        typedWindow.analytics.track(eventName, properties);
      }
    } catch (error: unknown) {
      // Silently fail analytics
    }
  }, []);

  const trackPageView = useCallback((page: string, title?: string) => {
    try {
      const typedWindow = (typeof window !== 'undefined' ? window : undefined) as WindowWithGlobals | undefined;
      if (typedWindow?.gtag) {
        typedWindow.gtag('config', 'GA_MEASUREMENT_ID', {
          page_title: title || document.title,
          page_location: page
        });
      }

      trackEvent('page_view', {
        page_title: title || document.title,
        page_location: page
      });
    } catch (error: unknown) {
      // Silently fail analytics
    }
  }, [trackEvent]);

  const trackUserAction = useCallback((action: string, target: string, properties: Record<string, unknown> = {}) => {
    trackEvent('user_action', {
      action,
      target,
      ...properties
    });
  }, [trackEvent]);

  const setUserProperties = useCallback((properties: Record<string, unknown>) => {
    try {
      const typedWindow = (typeof window !== 'undefined' ? window : undefined) as WindowWithGlobals | undefined;
      if (typedWindow?.gtag) {
        typedWindow.gtag('config', 'GA_MEASUREMENT_ID', {
          custom_map: properties
        });
      }

    } catch (error: unknown) {
      // Silently fail analytics
    }
  }, []);

  return (
    <AnalyticsContext.Provider value={{
      trackEvent,
      trackPageView,
      trackUserAction,
      setUserProperties
    }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => useContext(AnalyticsContext);

// Image Optimization Hook
export const useImageOptimization = () => {
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [supportsAVIF, setSupportsAVIF] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Test WebP support
    const webpTest = new Image();
    webpTest.onload = webpTest.onerror = () => {
      setSupportsWebP(webpTest.height === 2);
    };
    webpTest.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';

    // Test AVIF support
    const avifTest = new Image();
    avifTest.onload = avifTest.onerror = () => {
      setSupportsAVIF(avifTest.height === 2);
    };
    avifTest.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABoAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=';
  }, []);

  const getOptimalImageFormat = useCallback((originalSrc: string) => {
    if (supportsAVIF && originalSrc.includes('.jpg')) {
      return originalSrc.replace('.jpg', '.avif');
    }
    if (supportsWebP && (originalSrc.includes('.jpg') || originalSrc.includes('.png'))) {
      return originalSrc.replace(/\.(jpg|png)/, '.webp');
    }
    return originalSrc;
  }, [supportsWebP, supportsAVIF]);

  return { supportsWebP, supportsAVIF, getOptimalImageFormat };
};

// SEO Enhancement Hook
export const useSEO = (metadata: {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update title
    if (metadata.title) {
      document.title = `${metadata.title} | Aminy`;
    }

    // Update meta description
    if (metadata.description) {
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = metadata.description;
    }

    // Update meta keywords
    if (metadata.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = metadata.keywords.join(', ');
    }

    // Update Open Graph tags
    if (metadata.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.content = metadata.ogImage;
    }

    // Update canonical URL
    if (metadata.canonical) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = metadata.canonical;
    }

    // JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Aminy",
      "description": metadata.description || "AI-powered guidance for parents of children with developmental needs",
      "url": window.location.origin,
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "category": "subscription"
      }
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

  }, [metadata]);
};

export default {
  ProductionErrorBoundary,
  NetworkProvider,
  AnalyticsProvider,
  usePerformanceMonitor,
  useNetwork,
  useAccessibility,
  usePWA,
  useAnalytics,
  useImageOptimization,
  useSEO
};