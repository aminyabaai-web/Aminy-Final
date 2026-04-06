// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useKeyboardHeight Hook
 * Detects virtual keyboard on iOS/Android and returns keyboard height
 * Enables proper keyboard avoidance in chat interfaces
 */

import { useState, useEffect, useCallback } from 'react';

interface KeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

export function useKeyboardHeight(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isKeyboardOpen: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Use Visual Viewport API for accurate keyboard detection (iOS Safari, Chrome)
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      const handleResize = () => {
        // On iOS, when keyboard opens, visualViewport.height shrinks
        const windowHeight = window.innerHeight;
        const viewportHeight = visualViewport.height;
        const keyboardHeight = windowHeight - viewportHeight;

        // Consider keyboard "open" if more than 150px is covered (filters out address bar changes)
        const isOpen = keyboardHeight > 150;

        setState({
          isKeyboardOpen: isOpen,
          keyboardHeight: isOpen ? keyboardHeight : 0,
        });
      };

      // Listen to viewport resize events
      visualViewport.addEventListener('resize', handleResize);
      visualViewport.addEventListener('scroll', handleResize);

      // Initial check
      handleResize();

      return () => {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      };
    }

    // Fallback for older browsers: use focus/blur events
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Estimate keyboard height (roughly 40% of screen on mobile)
        const estimatedHeight = window.innerHeight * 0.4;
        setState({
          isKeyboardOpen: true,
          keyboardHeight: estimatedHeight,
        });
      }
    };

    const handleBlur = () => {
      setState({
        isKeyboardOpen: false,
        keyboardHeight: 0,
      });
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return state;
}

/**
 * Helper hook that provides a style object for keyboard avoidance
 */
export function useKeyboardAvoidingStyle(): React.CSSProperties {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardHeight();

  return {
    paddingBottom: isKeyboardOpen
      ? `${keyboardHeight}px`
      : 'max(16px, env(safe-area-inset-bottom))',
    transition: 'padding-bottom 0.2s ease-out',
  };
}

export default useKeyboardHeight;
