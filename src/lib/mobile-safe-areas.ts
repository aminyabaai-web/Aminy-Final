// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Mobile Safe Areas & Touch Target Utilities
 *
 * Ensures proper iOS/Android safe area handling and accessibility
 * Based on Apple HIG and Material Design guidelines
 */

// Touch target minimum sizes (iOS: 44px, Android: 48dp)
export const TOUCH_TARGETS = {
  minimum: 44, // iOS HIG minimum
  recommended: 48, // Material Design recommended
  large: 56, // Large touch targets for accessibility
} as const;

// Safe area CSS variables
export const SAFE_AREA_VARS = {
  top: 'env(safe-area-inset-top, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
} as const;

// Standard spacing based on safe areas
export const safeAreaPadding = {
  top: `max(16px, ${SAFE_AREA_VARS.top})`,
  bottom: `max(16px, ${SAFE_AREA_VARS.bottom})`,
  left: `max(16px, ${SAFE_AREA_VARS.left})`,
  right: `max(16px, ${SAFE_AREA_VARS.right})`,
} as const;

/**
 * Check if device has a notch (iPhone X+)
 */
export function hasNotch(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for CSS env() support and notch presence
  const testDiv = document.createElement('div');
  testDiv.style.paddingTop = 'env(safe-area-inset-top)';
  document.body.appendChild(testDiv);
  const hasNotchSupport = getComputedStyle(testDiv).paddingTop !== '0px';
  document.body.removeChild(testDiv);

  return hasNotchSupport;
}

/**
 * Get safe area insets
 */
export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  const parseInset = (prop: string): number => {
    const value = computedStyle.getPropertyValue(prop);
    return parseInt(value) || 0;
  };

  return {
    top: parseInset('--sat') || (hasNotch() ? 44 : 20),
    bottom: parseInset('--sab') || (hasNotch() ? 34 : 0),
    left: parseInset('--sal') || 0,
    right: parseInset('--sar') || 0,
  };
}

/**
 * Check if element meets touch target requirements
 */
export function meetsMinimumTouchTarget(element: HTMLElement): {
  meets: boolean;
  width: number;
  height: number;
  minRequired: number;
} {
  const rect = element.getBoundingClientRect();
  const minRequired = TOUCH_TARGETS.minimum;

  return {
    meets: rect.width >= minRequired && rect.height >= minRequired,
    width: rect.width,
    height: rect.height,
    minRequired,
  };
}

/**
 * Audit all interactive elements on the page for touch target compliance
 */
export function auditTouchTargets(): {
  passed: number;
  failed: number;
  failedElements: Array<{
    element: HTMLElement;
    width: number;
    height: number;
    selector: string;
  }>;
} {
  const interactiveSelectors = [
    'button',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[tabindex]',
  ];

  const elements = document.querySelectorAll(
    interactiveSelectors.join(',')
  ) as NodeListOf<HTMLElement>;

  let passed = 0;
  let failed = 0;
  const failedElements: Array<{
    element: HTMLElement;
    width: number;
    height: number;
    selector: string;
  }> = [];

  elements.forEach(element => {
    const result = meetsMinimumTouchTarget(element);
    if (result.meets) {
      passed++;
    } else {
      failed++;
      failedElements.push({
        element,
        width: result.width,
        height: result.height,
        selector: getSelector(element),
      });
    }
  });

  return { passed, failed, failedElements };
}

/**
 * Get a CSS selector for an element
 */
function getSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c).slice(0, 2);
    return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
  }
  return element.tagName.toLowerCase();
}

/**
 * Check if we're on a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  );
}

/**
 * Check if we're on iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Check if we're on Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Get the type of mobile device
 */
export function getMobileType(): 'ios' | 'android' | 'other' | 'desktop' {
  if (!isMobileDevice()) return 'desktop';
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'other';
}

/**
 * CSS utility classes for mobile safe areas
 */
export const safeAreaClasses = {
  // Padding utilities
  paddingTop: 'pt-safe', // Uses env(safe-area-inset-top)
  paddingBottom: 'pb-safe', // Uses env(safe-area-inset-bottom)
  paddingLeft: 'pl-safe', // Uses env(safe-area-inset-left)
  paddingRight: 'pr-safe', // Uses env(safe-area-inset-right)
  paddingX: 'px-safe', // Horizontal safe area padding
  paddingY: 'py-safe', // Vertical safe area padding
  padding: 'p-safe', // All sides safe area padding

  // Common patterns
  bottomNav: 'pb-safe-bottom', // For fixed bottom navigation
  header: 'pt-safe-top', // For fixed headers
  fullscreen: 'safe-area-inset', // Full safe area padding
} as const;

/**
 * CSS styles to inject for safe area support
 */
export const safeAreaStyles = `
/* Safe area CSS variables */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

/* Safe area padding utilities */
.pt-safe { padding-top: max(1rem, env(safe-area-inset-top, 0px)); }
.pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px)); }
.pl-safe { padding-left: max(1rem, env(safe-area-inset-left, 0px)); }
.pr-safe { padding-right: max(1rem, env(safe-area-inset-right, 0px)); }
.px-safe {
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}
.py-safe {
  padding-top: max(1rem, env(safe-area-inset-top, 0px));
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
}
.p-safe {
  padding-top: max(1rem, env(safe-area-inset-top, 0px));
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}

/* Bottom navigation safe area */
.pb-safe-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
}

/* Header safe area */
.pt-safe-top {
  padding-top: calc(env(safe-area-inset-top, 0px) + 1rem);
}

/* Full safe area inset */
.safe-area-inset {
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
           env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
}

/* Minimum touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

.touch-target-lg {
  min-height: 48px;
  min-width: 48px;
}

/* Mobile text sizing */
@media (max-width: 640px) {
  /* Ensure minimum readable font size */
  .text-xs { font-size: max(0.75rem, 12px); }
  .text-sm { font-size: max(0.875rem, 14px); }

  /* Increase tap targets for small screens */
  button,
  a,
  input[type="checkbox"],
  input[type="radio"],
  [role="button"] {
    min-height: 44px;
  }

  /* Improve touch scroll */
  .overflow-auto,
  .overflow-y-auto,
  .overflow-x-auto {
    -webkit-overflow-scrolling: touch;
  }
}

/* iOS-specific fixes */
@supports (-webkit-touch-callout: none) {
  /* Prevent text selection on interactive elements */
  button, a, [role="button"] {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
  }

  /* Fix for iOS input zoom */
  input, textarea, select {
    font-size: 16px;
  }
}
`;

/**
 * Inject safe area styles into the document
 */
export function injectSafeAreaStyles(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'aminy-safe-area-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = safeAreaStyles;
  document.head.appendChild(style);
}

/**
 * Hook to use safe area insets in React components
 */
export function useSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  // This would need to be implemented with React state
  // For now, return static values
  return getSafeAreaInsets();
}

export default {
  TOUCH_TARGETS,
  SAFE_AREA_VARS,
  safeAreaPadding,
  hasNotch,
  getSafeAreaInsets,
  meetsMinimumTouchTarget,
  auditTouchTargets,
  isMobileDevice,
  isIOS,
  isAndroid,
  getMobileType,
  safeAreaClasses,
  safeAreaStyles,
  injectSafeAreaStyles,
  useSafeAreaInsets,
};
