// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useRef } from 'react';

interface MobileTouchOptimizerProps {
  children: React.ReactNode;
  enableHaptics?: boolean;
  optimizeScrolling?: boolean;
}

export const MobileTouchOptimizer: React.FC<MobileTouchOptimizerProps> = ({ 
  children, 
  enableHaptics = true,
  optimizeScrolling = true 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isMobile && !isTouchDevice) return;

    // Enhanced touch event handling
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Add touch feedback class
      if (target.matches('button, [role="button"], .aminy-button-primary, .aminy-button-secondary, .aminy-card')) {
        target.classList.add('touch-active');
        
        // Haptic feedback for supported devices
        if (enableHaptics && 'vibrate' in navigator) {
          navigator.vibrate(10); // Very light haptic feedback
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Remove touch feedback class
      setTimeout(() => {
        target.classList.remove('touch-active');
      }, 150);
    };

    const handleTouchCancel = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      target.classList.remove('touch-active');
    };

    // Optimize scrolling for mobile
    if (optimizeScrolling) {
      const scrollableElements = container.querySelectorAll('[data-scroll="true"], .overflow-y-auto, .overflow-auto');
      
      scrollableElements.forEach(element => {
        // Enable momentum scrolling on iOS
        (element as HTMLElement).style.setProperty('-webkit-overflow-scrolling', 'touch');
        
        // Prevent overscroll bounce
        (element as HTMLElement).style.overscrollBehavior = 'contain';
        
        // Add scroll optimization
        element.addEventListener('touchstart', (e) => {
          const startY = (e as TouchEvent).touches[0].clientY;
          const scrollTop = (element as HTMLElement).scrollTop;
          const scrollHeight = (element as HTMLElement).scrollHeight;
          const offsetHeight = (element as HTMLElement).offsetHeight;
          
          // Prevent rubber band scrolling at boundaries
          if (scrollTop === 0 && startY > 0) {
            (element as HTMLElement).style.touchAction = 'pan-x pinch-zoom';
          } else if (scrollTop + offsetHeight >= scrollHeight && startY < 0) {
            (element as HTMLElement).style.touchAction = 'pan-x pinch-zoom';
          } else {
            (element as HTMLElement).style.touchAction = 'pan-y pinch-zoom';
          }
        });
      });
    }

    // Prevent zoom on double-tap for form elements
    const formElements = container.querySelectorAll('input, textarea, select');
    formElements.forEach(element => {
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        // Use setTimeout to allow the touch event to complete
        setTimeout(() => {
          (element as HTMLElement).focus();
        }, 0);
      });
    });

    // Enhanced button interactions
    const buttons = container.querySelectorAll('button, [role="button"]');
    buttons.forEach(button => {
      // Prevent 300ms click delay
      button.addEventListener('touchstart', (e) => {
        (button as HTMLElement).style.cursor = 'pointer';
      });
      
      // Add visual feedback
      button.addEventListener('touchstart', (e) => {
        (button as HTMLElement).style.transform = 'scale(0.96)';
        (button as HTMLElement).style.transition = 'transform 0.1s ease';
      });
      
      button.addEventListener('touchend', (e) => {
        setTimeout(() => {
          (button as HTMLElement).style.transform = 'scale(1)';
        }, 100);
      });
    });

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Cleanup
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enableHaptics, optimizeScrolling]);

  return (
    <div 
      ref={containerRef}
      className="mobile-touch-optimizer"
      style={{
        touchAction: 'manipulation', // Prevent zoom on double-tap
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitUserSelect: 'none', // Prevent text selection on UI elements
        userSelect: 'none'
      }}
    >
      {children}

      {/* SECURITY: Static CSS only, no user input - safe for dangerouslySetInnerHTML */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .touch-active {
          background-color: rgba(8, 145, 178, 0.1) !important;
          transform: scale(0.96);
          transition: all 0.1s ease;
        }
        
        .mobile-touch-optimizer input,
        .mobile-touch-optimizer textarea {
          -webkit-user-select: text;
          user-select: text;
        }
        
        .mobile-touch-optimizer button:active {
          transform: scale(0.96);
          background-color: rgba(8, 145, 178, 0.15);
        }
        
        /* Enhanced touch targets */
        @media (max-width: 640px) and (pointer: coarse) {
          .mobile-touch-optimizer button,
          .mobile-touch-optimizer [role="button"] {
            min-height: 44px;
            min-width: 44px;
          }
          
          .mobile-touch-optimizer .aminy-button-primary,
          .mobile-touch-optimizer .aminy-button-secondary {
            min-height: 48px;
            padding: 12px 24px;
          }
          
          .mobile-touch-optimizer .bottom-navigation button {
            min-height: 56px;
            padding: 8px 12px;
          }
        }
        
        /* iOS-specific optimizations */
        @supports (-webkit-touch-callout: none) {
          .mobile-touch-optimizer {
            -webkit-tap-highlight-color: rgba(8, 145, 178, 0.2);
          }
          
          .mobile-touch-optimizer input,
          .mobile-touch-optimizer textarea {
            -webkit-appearance: none;
            border-radius: 12px;
          }
          
          .mobile-touch-optimizer button {
            -webkit-appearance: none;
          }
        }
      `
      }} />
    </div>
  );
};

export default MobileTouchOptimizer;