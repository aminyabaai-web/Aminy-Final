// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useState } from 'react';
import { enableAutoHaptics } from '../lib/haptics';

interface MobilePolishEnhancerProps {
  children: React.ReactNode;
  enableHaptics?: boolean;
}

export const MobilePolishEnhancer: React.FC<MobilePolishEnhancerProps> = ({
  children,
  enableHaptics: enableHapticsOption = true,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Detect mobile environment
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    // Handle viewport changes for keyboard detection
    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const screenHeight = window.screen.height;
      
      // Detect keyboard by significant viewport height reduction
      const keyboardThreshold = screenHeight * 0.25; // 25% reduction indicates keyboard
      const isKeyboard = (screenHeight - currentHeight) > keyboardThreshold;
      
      setIsKeyboardOpen(isKeyboard);
      setViewportHeight(currentHeight);
      
      // Update CSS custom property for dynamic layouts
      document.documentElement.style.setProperty('--vh', `${currentHeight / 100}px`);
      document.documentElement.style.setProperty('--keyboard-open', isKeyboard ? '1' : '0');
    };

    // Enhanced touch feedback for iOS
    const enhanceTouchFeedback = () => {
      if (isMobile) {
        // Add touch-action optimization
        document.body.style.touchAction = 'manipulation';
        
        // Prevent zoom on double-tap for inputs
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          input.addEventListener('touchstart', (e) => {
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
              // Ensure font size is 16px or larger to prevent iOS zoom
              const fontSize = window.getComputedStyle(input).fontSize;
              if (parseInt(fontSize) < 16) {
                (input as HTMLElement).style.fontSize = '16px';
              }
            }
          });
        });
      }
    };

    // Mobile-specific optimizations
    const applyMobileOptimizations = () => {
      if (isMobile) {
        // Add mobile-optimized classes
        document.body.classList.add('mobile-optimized');
        
        // Enhanced scrolling for mobile (vendor-prefixed properties)
        const bodyStyle = document.body.style as CSSStyleDeclaration & Record<string, string>;
        bodyStyle.webkitOverflowScrolling = 'touch';
        bodyStyle.overscrollBehavior = 'contain';

        // Optimize tap highlights
        bodyStyle.webkitTapHighlightColor = 'rgba(8, 145, 178, 0.15)';
        
        // Prevent text selection on UI elements
        const uiElements = document.querySelectorAll('button, .aminy-card, .aminy-button-primary, .aminy-button-secondary');
        uiElements.forEach(element => {
          (element as HTMLElement).style.webkitUserSelect = 'none';
          (element as HTMLElement).style.userSelect = 'none';
        });
      }
    };

    // Safe area inset support
    const applySafeAreaSupport = () => {
      // Update CSS custom properties for safe areas
      const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0px';
      const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0px';
      
      document.documentElement.style.setProperty('--safe-top', `env(safe-area-inset-top, ${safeAreaTop})`);
      document.documentElement.style.setProperty('--safe-bottom', `env(safe-area-inset-bottom, ${safeAreaBottom})`);
    };

    // Initialize all enhancements
    checkMobile();
    handleViewportChange();
    enhanceTouchFeedback();
    applyMobileOptimizations();
    applySafeAreaSupport();

    // Event listeners
    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [isMobile]);

  // Add mobile-specific attributes to the wrapper
  return (
    <div 
      className={`mobile-polish-wrapper ${isMobile ? 'is-mobile' : 'is-desktop'} ${isKeyboardOpen ? 'keyboard-open' : 'keyboard-closed'}`}
      data-mobile={isMobile.toString()}
      data-keyboard={isKeyboardOpen ? 'open' : 'closed'}
      style={{
        minHeight: isMobile && viewportHeight > 0 ? `${viewportHeight}px` : '100vh',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
};

export default MobilePolishEnhancer;