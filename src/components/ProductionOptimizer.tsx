import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

interface WindowWithExtensions extends Window {
  analytics?: {
    track: (event: string, properties: Record<string, unknown>) => void;
  };
  gc?: () => void;
  restoreFocus?: () => void;
}

/**
 * ProductionOptimizer - Final production optimizations
 * Handles mobile performance, PWA features, and user experience enhancements
 */
export const ProductionOptimizer: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. MOBILE PERFORMANCE OPTIMIZATIONS
    const optimizeMobilePerformance = () => {
      // Disable 300ms tap delay on mobile
      if ('ontouchstart' in window) {
        document.documentElement.style.touchAction = 'manipulation';
      }

      // Optimize scroll performance
      document.documentElement.style.scrollBehavior = 'smooth';
      
      // Add hardware acceleration hints
      const criticalElements = document.querySelectorAll(
        '.aminy-card, .aminy-button-primary, .aminy-ai-card, [data-radix-select-content]'
      );
      criticalElements.forEach((element) => {
        (element as HTMLElement).style.willChange = 'transform';
        (element as HTMLElement).style.backfaceVisibility = 'hidden';
      });
    };

    // 2. KEYBOARD DETECTION FOR MOBILE
    const handleKeyboardVisibility = () => {
      let initialViewHeight = window.innerHeight;
      
      const checkKeyboard = () => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewHeight - currentHeight;
        
        // If height decreased by more than 150px, keyboard is likely open
        if (heightDifference > 150) {
          document.body.setAttribute('data-keyboard', 'open');
          // Hide elements that might interfere
          const elementsToHide = document.querySelectorAll('#global-support-footer, .help-footer');
          elementsToHide.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        } else {
          document.body.setAttribute('data-keyboard', 'closed');
          // Restore hidden elements
          const elementsToShow = document.querySelectorAll('#global-support-footer, .help-footer');
          elementsToShow.forEach(el => {
            (el as HTMLElement).style.display = '';
          });
        }
      };

      window.addEventListener('resize', checkKeyboard);
      return () => window.removeEventListener('resize', checkKeyboard);
    };

    // 3. NETWORK STATUS MONITORING
    const handleNetworkStatus = () => {
      const updateOnlineStatus = () => {
        setIsOnline(navigator.onLine);
        
        if (!navigator.onLine) {
          // Show offline indicator
          showOfflineNotification();
        } else {
          // Hide offline indicator
          hideOfflineNotification();
        }
      };

      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    };

    // 4. PWA INSTALL PROMPT HANDLING
    const handleInstallPrompt = () => {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    };

    // 5. PERFORMANCE MONITORING
    const monitorPerformance = () => {
      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'longtask' && entry.duration > 50) {
                
                // Log to analytics if available
                if ((window as WindowWithExtensions).analytics) {
                  (window as WindowWithExtensions).analytics!.track('performance_long_task', {
                    duration: entry.duration,
                    timestamp: Date.now(),
                  });
                }
              }
            });
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // Long task observer not supported
        }
      }

      // Monitor memory usage (Chrome only)
      if ('memory' in performance) {
        const checkMemory = () => {
          const memory = (performance as PerformanceWithMemory).memory;
          if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
            
            // Trigger garbage collection hints
            if ('gc' in window) {
              (window as WindowWithExtensions).gc?.();
            }
          }
        };

        const memoryInterval = setInterval(checkMemory, 30000); // Check every 30 seconds
        return () => clearInterval(memoryInterval);
      }
    };

    // 6. ACCESSIBILITY ENHANCEMENTS
    const enhanceAccessibility = () => {
      // Add skip link if not present
      if (!document.querySelector('.skip-to-content')) {
        const skipLink = document.createElement('a');
        skipLink.className = 'skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md';
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
      }

      // Enhance focus management
      let lastFocusedElement: HTMLElement | null = null;
      
      document.addEventListener('focusin', (e) => {
        lastFocusedElement = e.target as HTMLElement;
      });

      // Store focus restoration function globally
      (window as WindowWithExtensions).restoreFocus = () => {
        if (lastFocusedElement && lastFocusedElement.isConnected) {
          lastFocusedElement.focus();
        }
      };
    };

    // 7. iOS SAFE AREA HANDLING
    const handleSafeArea = () => {
      if (window.CSS && CSS.supports('padding: env(safe-area-inset-top)')) {
        document.documentElement.style.setProperty(
          '--safe-area-top',
          'env(safe-area-inset-top)'
        );
        document.documentElement.style.setProperty(
          '--safe-area-bottom',
          'env(safe-area-inset-bottom)'
        );
        document.documentElement.style.setProperty(
          '--safe-area-left',
          'env(safe-area-inset-left)'
        );
        document.documentElement.style.setProperty(
          '--safe-area-right',
          'env(safe-area-inset-right)'
        );
      }
    };

    // Initialize all optimizations
    optimizeMobilePerformance();
    const cleanupKeyboard = handleKeyboardVisibility();
    const cleanupNetwork = handleNetworkStatus();
    const cleanupInstall = handleInstallPrompt();
    const cleanupPerformance = monitorPerformance();
    enhanceAccessibility();
    handleSafeArea();

    // Cleanup function
    return () => {
      cleanupKeyboard?.();
      cleanupNetwork?.();
      cleanupInstall?.();
      cleanupPerformance?.();
    };
  }, []);

  // Helper functions
  const showOfflineNotification = () => {
    const notification = document.createElement('div');
    notification.id = 'offline-notification';
    notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
    notification.textContent = 'You are currently offline';
    
    if (!document.getElementById('offline-notification')) {
      document.body.appendChild(notification);
    }
  };

  const hideOfflineNotification = () => {
    const notification = document.getElementById('offline-notification');
    if (notification) {
      notification.remove();
    }
  };

  // PWA Install Button (conditionally rendered)
  const handleInstallClick = async () => {
    if (installPrompt) {
      const result = await installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {/* PWA Install Prompt */}
      {installPrompt && (
        <div className="fixed bottom-20 left-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-40">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Install Aminy</h3>
              <p className="text-xs text-muted-foreground">
                Add to home screen for the best experience
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setInstallPrompt(null)}
                className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
              >
                Later
              </button>
              <button
                onClick={handleInstallClick}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Development Performance Monitor */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50">
          <div>Online: {isOnline ? '✅' : '❌'}</div>
          <div>Memory: {(performance as PerformanceWithMemory).memory ?
            `${Math.round(((performance as PerformanceWithMemory).memory!.usedJSHeapSize / 1048576) * 100) / 100}MB` :
            'N/A'}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductionOptimizer;