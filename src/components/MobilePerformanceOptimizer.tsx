import React, { useEffect, useRef, useState } from 'react';

interface MobilePerformanceOptimizerProps {
  children: React.ReactNode;
}

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  scrollPerformance: number;
  networkLatency: number;
}

export const MobilePerformanceOptimizer: React.FC<MobilePerformanceOptimizerProps> = ({ children }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    scrollPerformance: 0,
    networkLatency: 0
  });
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    // Device capability detection
    const detectDeviceCapabilities = () => {
      const memory = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
      const cores = navigator.hardwareConcurrency || 4;
      const connection = (navigator as any).connection;
      
      // Determine if this is a low-end device
      const isLowEnd = memory < 2 || cores < 4 || (connection && connection.effectiveType === 'slow-2g');
      setIsLowEndDevice(isLowEnd);
      
      // Set optimization level based on device capabilities
      if (isLowEnd) {
        setOptimizationLevel('high');
      } else if (memory < 4 || cores < 6) {
        setOptimizationLevel('medium');
      } else {
        setOptimizationLevel('low');
      }
    };

    // Performance monitoring
    const monitorPerformance = () => {
      // Memory usage (if available)
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize
        }));
      }

      // Frame rate monitoring
      const now = performance.now();
      frameCountRef.current++;
      
      if (frameCountRef.current % 60 === 0) { // Check every 60 frames
        const timeDiff = now - lastFrameTimeRef.current;
        const fps = 60000 / timeDiff;
        
        setMetrics(prev => ({
          ...prev,
          renderTime: fps
        }));
        
        lastFrameTimeRef.current = now;
      }

      requestAnimationFrame(monitorPerformance);
    };

    // Apply mobile-specific optimizations
    const applyMobileOptimizations = () => {
      // Reduce animation complexity for low-end devices
      if (isLowEndDevice) {
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
        document.documentElement.style.setProperty('--transition-duration', '0.1s');
        
        // Disable expensive animations
        const style = document.createElement('style');
        style.textContent = `
          .plan-populate-animation,
          .completion-success,
          .aminy-gentle-shimmer,
          .ai-glow-pulse {
            animation: none !important;
          }
          
          .aminy-card-hover:hover,
          .aminy-ai-card:hover {
            transform: none !important;
            transition: background-color 0.1s ease !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Optimize images for mobile
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        // Add loading="lazy" if not already present
        if (!img.getAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        
        // Optimize image rendering
        img.style.imageRendering = 'optimizeQuality';
        
        // Add decode hint for better performance
        if ('decode' in img) {
          img.decode().catch(() => {
            // Fallback for browsers that don't support decode
          });
        }
      });

      // Memory management
      const cleanupUnusedElements = () => {
        // Remove hidden elements from DOM temporarily to save memory
        const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden');
        hiddenElements.forEach(element => {
          if (element.offsetParent === null && !element.classList.contains('preserve-hidden')) {
            (element as HTMLElement).style.visibility = 'hidden';
            (element as HTMLElement).style.position = 'absolute';
          }
        });
      };

      // Run cleanup every 30 seconds on low-end devices
      if (isLowEndDevice) {
        setInterval(cleanupUnusedElements, 30000);
      }

      // Intersection Observer for performance-aware rendering
      const observerOptions = {
        rootMargin: '50px',
        threshold: 0.1
      };

      const performanceObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          
          if (entry.isIntersecting) {
            // Enable animations when in view
            element.classList.remove('performance-disabled');
          } else {
            // Disable animations when out of view to save resources
            element.classList.add('performance-disabled');
          }
        });
      }, observerOptions);

      // Observe expensive animation elements
      const animatedElements = document.querySelectorAll('.aminy-card, .plan-populate-animation, .aminy-ai-card');
      animatedElements.forEach(element => {
        performanceObserver.observe(element);
      });

      return () => {
        performanceObserver.disconnect();
      };
    };

    // Battery API optimization (if available)
    const optimizeForBattery = () => {
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          const handleBatteryChange = () => {
            if (battery.level < 0.2 || !battery.charging) {
              // Enable power-saving mode
              document.documentElement.classList.add('power-saving');
              setOptimizationLevel('high');
            } else {
              document.documentElement.classList.remove('power-saving');
            }
          };

          battery.addEventListener('levelchange', handleBatteryChange);
          battery.addEventListener('chargingchange', handleBatteryChange);
          handleBatteryChange(); // Initial check
        });
      }
    };

    // Network-aware optimizations
    const optimizeForNetwork = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        const handleNetworkChange = () => {
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // Disable heavy animations and effects
            document.documentElement.classList.add('slow-network');
          } else {
            document.documentElement.classList.remove('slow-network');
          }
        };

        connection.addEventListener('change', handleNetworkChange);
        handleNetworkChange(); // Initial check
      }
    };

    // Initialize all optimizations
    detectDeviceCapabilities();
    monitorPerformance();
    const cleanupMobile = applyMobileOptimizations();
    optimizeForBattery();
    optimizeForNetwork();

    return () => {
      if (cleanupMobile) cleanupMobile();
    };
  }, [isLowEndDevice, optimizationLevel]);

  // Add performance CSS based on optimization level
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'mobile-performance-optimizations';
    
    let css = '';
    
    if (optimizationLevel === 'high') {
      css = `
        /* High optimization - minimal animations */
        * {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }
        
        .performance-disabled {
          transform: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
        
        .power-saving .aminy-card,
        .power-saving .aminy-ai-card {
          backdrop-filter: none !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        }
        
        .slow-network img {
          filter: none !important;
          opacity: 0.9 !important;
        }
      `;
    } else if (optimizationLevel === 'medium') {
      css = `
        /* Medium optimization - reduced animations */
        .performance-disabled {
          animation-play-state: paused !important;
        }
        
        .aminy-card:hover,
        .aminy-ai-card:hover {
          transform: translateY(-1px) !important;
        }
      `;
    }
    
    style.textContent = css;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('mobile-performance-optimizations');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [optimizationLevel]);

  return (
    <div 
      className={`mobile-performance-optimizer ${optimizationLevel}-optimization`}
      data-device-type={isLowEndDevice ? 'low-end' : 'high-end'}
      data-optimization-level={optimizationLevel}
    >
      {children}
      
      {/* Development metrics (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 9999,
            fontFamily: 'monospace'
          }}
        >
          <div>Memory: {(metrics.memoryUsage * 100).toFixed(1)}%</div>
          <div>FPS: {metrics.renderTime.toFixed(1)}</div>
          <div>Device: {isLowEndDevice ? 'Low-end' : 'High-end'}</div>
          <div>Opt Level: {optimizationLevel}</div>
        </div>
      )}
    </div>
  );
};

export default MobilePerformanceOptimizer;