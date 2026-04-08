// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Haptic Feedback Utility - iOS Taptic Engine Support
 * Provides Apple-level haptic feedback for touch interactions
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticAPI {
  impact: (style: 'light' | 'medium' | 'heavy') => void;
  notification: (type: 'success' | 'warning' | 'error') => void;
  selection: () => void;
}

/**
 * Check if haptics are supported
 */
export const isHapticsSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'vibrate' in navigator &&
    /iPhone|iPad|iPod/.test(navigator.userAgent)
  );
};

/**
 * Modern Vibration API implementation
 */
const vibratePattern = (pattern: number | number[]): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * iOS Taptic Engine implementation
 */
const getTapticEngine = (): HapticAPI | null => {
  // Check for iOS Taptic Engine API (iOS 10+)
  if (typeof window !== 'undefined') {
    const w = window as unknown as { webkit?: { messageHandlers?: { haptic?: { postMessage: (msg: Record<string, string>) => void } } }; navigator?: Navigator & { vibrate?: (pattern: number | number[]) => boolean } };
    
    // iOS 13+ Haptic Feedback API
    const hapticHandler = w.webkit?.messageHandlers?.haptic;
    if (hapticHandler) {
      return {
        impact: (style) => {
          hapticHandler.postMessage({ type: 'impact', style });
        },
        notification: (type) => {
          hapticHandler.postMessage({ type: 'notification', style: type });
        },
        selection: () => {
          hapticHandler.postMessage({ type: 'selection' });
        }
      };
    }
  }
  
  return null;
};

/**
 * Trigger haptic feedback with fallback support
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  const taptic = getTapticEngine();
  
  if (taptic) {
    // Use native iOS Taptic Engine if available
    switch (type) {
      case 'light':
        taptic.impact('light');
        break;
      case 'medium':
        taptic.impact('medium');
        break;
      case 'heavy':
        taptic.impact('heavy');
        break;
      case 'success':
        taptic.notification('success');
        break;
      case 'warning':
        taptic.notification('warning');
        break;
      case 'error':
        taptic.notification('error');
        break;
      case 'selection':
        taptic.selection();
        break;
    }
  } else if (isHapticsSupported()) {
    // Fallback to Vibration API with patterns
    switch (type) {
      case 'light':
        vibratePattern(10);
        break;
      case 'medium':
        vibratePattern(20);
        break;
      case 'heavy':
        vibratePattern(30);
        break;
      case 'success':
        vibratePattern([10, 50, 10]);
        break;
      case 'warning':
        vibratePattern([20, 50, 20]);
        break;
      case 'error':
        vibratePattern([30, 100, 30, 100, 30]);
        break;
      case 'selection':
        vibratePattern(5);
        break;
    }
  }
};

/**
 * React Hook for haptic feedback
 */
export const useHaptics = () => {
  const supported = isHapticsSupported();
  
  return {
    supported,
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    selection: () => triggerHaptic('selection'),
    trigger: triggerHaptic
  };
};

/**
 * Haptic-enabled button wrapper
 */
export const withHaptics = <T extends HTMLElement>(
  element: T,
  type: HapticType = 'light'
): T => {
  element.addEventListener('click', () => triggerHaptic(type), { passive: true });
  return element;
};

/**
 * Auto-apply haptics to common interactive elements
 */
export const enableAutoHaptics = (): void => {
  if (!isHapticsSupported()) return;
  
  // Apply to buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    if (target.matches('button, [role="button"]')) {
      triggerHaptic('light');
    } else if (target.matches('a, [role="link"]')) {
      triggerHaptic('selection');
    } else if (target.matches('input[type="checkbox"], input[type="radio"]')) {
      triggerHaptic('selection');
    } else if (target.matches('[data-haptic]')) {
      const type = target.getAttribute('data-haptic') as HapticType;
      triggerHaptic(type || 'light');
    }
  }, { passive: true });
};

export default {
  isSupported: isHapticsSupported,
  trigger: triggerHaptic,
  useHaptics,
  withHaptics,
  enableAutoHaptics
};
