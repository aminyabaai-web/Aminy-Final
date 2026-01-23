/**
 * Mobile QA Utilities
 *
 * Provides utilities for mobile quality assurance including:
 * - Touch target validation
 * - Safe area detection
 * - Performance monitoring
 * - Accessibility checks
 */

// ============================================================================
// Types
// ============================================================================

export interface TouchTargetViolation {
  element: Element;
  width: number;
  height: number;
  selector: string;
  issue: 'too-small' | 'too-close' | 'no-padding';
}

export interface SafeAreaConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
  hasNotch: boolean;
}

export interface MobileDeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  safeAreas: SafeAreaConfig;
}

// ============================================================================
// Constants
// ============================================================================

// WCAG 2.1 AAA recommends 44x44px minimum touch targets
export const MIN_TOUCH_TARGET_SIZE = 44;

// Minimum spacing between touch targets (8px recommended)
export const MIN_TOUCH_TARGET_SPACING = 8;

// Selectors for interactive elements
export const INTERACTIVE_SELECTORS = [
  'button',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
  '.clickable',
  '[onclick]',
].join(', ');

// ============================================================================
// Device Detection
// ============================================================================

export function getDeviceInfo(): MobileDeviceInfo {
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    hasTouch,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    safeAreas: getSafeAreas(),
  };
}

export function getSafeAreas(): SafeAreaConfig {
  const computeInset = (property: string): number => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(property);
    return parseInt(value, 10) || 0;
  };

  // Check if CSS environment variables are supported
  const supportsEnv = CSS.supports('padding-top', 'env(safe-area-inset-top)');

  if (!supportsEnv) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      hasNotch: false,
    };
  }

  // Create a test element to measure safe areas
  const testEl = document.createElement('div');
  testEl.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    visibility: hidden;
  `;
  document.body.appendChild(testEl);

  const styles = getComputedStyle(testEl);
  const top = parseInt(styles.paddingTop, 10) || 0;
  const bottom = parseInt(styles.paddingBottom, 10) || 0;
  const left = parseInt(styles.paddingLeft, 10) || 0;
  const right = parseInt(styles.paddingRight, 10) || 0;

  document.body.removeChild(testEl);

  return {
    top,
    bottom,
    left,
    right,
    hasNotch: top > 0 || bottom > 0,
  };
}

// ============================================================================
// Touch Target Validation
// ============================================================================

export function validateTouchTargets(
  container: Element = document.body,
  minSize: number = MIN_TOUCH_TARGET_SIZE
): TouchTargetViolation[] {
  const violations: TouchTargetViolation[] = [];
  const elements = container.querySelectorAll(INTERACTIVE_SELECTORS);

  elements.forEach((element) => {
    const rect = element.getBoundingClientRect();

    // Skip hidden elements
    if (rect.width === 0 || rect.height === 0) return;

    // Check minimum size
    if (rect.width < minSize || rect.height < minSize) {
      violations.push({
        element,
        width: rect.width,
        height: rect.height,
        selector: getSelector(element),
        issue: 'too-small',
      });
    }
  });

  return violations;
}

export function validateTouchTargetSpacing(
  container: Element = document.body,
  minSpacing: number = MIN_TOUCH_TARGET_SPACING
): TouchTargetViolation[] {
  const violations: TouchTargetViolation[] = [];
  const elements = Array.from(container.querySelectorAll(INTERACTIVE_SELECTORS));

  for (let i = 0; i < elements.length; i++) {
    const el1 = elements[i];
    const rect1 = el1.getBoundingClientRect();

    // Skip hidden elements
    if (rect1.width === 0 || rect1.height === 0) continue;

    for (let j = i + 1; j < elements.length; j++) {
      const el2 = elements[j];
      const rect2 = el2.getBoundingClientRect();

      // Skip hidden elements
      if (rect2.width === 0 || rect2.height === 0) continue;

      // Calculate distance between elements
      const dx = Math.max(0, Math.max(rect1.left, rect2.left) - Math.min(rect1.right, rect2.right));
      const dy = Math.max(0, Math.max(rect1.top, rect2.top) - Math.min(rect1.bottom, rect2.bottom));

      // If elements overlap or are too close
      if (dx === 0 && dy === 0) {
        // Elements overlap - this is okay if one contains the other
        continue;
      }

      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0 && distance < minSpacing) {
        violations.push({
          element: el1,
          width: rect1.width,
          height: rect1.height,
          selector: getSelector(el1),
          issue: 'too-close',
        });
      }
    }
  }

  return violations;
}

// ============================================================================
// Performance Utilities
// ============================================================================

export function measureScrollPerformance(
  element: Element,
  durationMs: number = 1000
): Promise<{ fps: number; jank: number }> {
  return new Promise((resolve) => {
    let frameCount = 0;
    let jankFrames = 0;
    let lastFrameTime = performance.now();

    const measure = (currentTime: number) => {
      frameCount++;
      const frameDuration = currentTime - lastFrameTime;

      // Jank is when a frame takes more than 16.67ms (60fps)
      if (frameDuration > 16.67) {
        jankFrames++;
      }

      lastFrameTime = currentTime;

      if (currentTime - startTime < durationMs) {
        requestAnimationFrame(measure);
      } else {
        const fps = (frameCount / durationMs) * 1000;
        const jank = (jankFrames / frameCount) * 100;
        resolve({ fps, jank });
      }
    };

    const startTime = performance.now();
    requestAnimationFrame(measure);
  });
}

export function getMemoryUsage(): { usedJS: number; totalJS: number } | null {
  const memory = (performance as any).memory;
  if (!memory) return null;

  return {
    usedJS: memory.usedJSHeapSize / 1024 / 1024, // MB
    totalJS: memory.totalJSHeapSize / 1024 / 1024, // MB
  };
}

// ============================================================================
// Accessibility Utilities
// ============================================================================

export function validateFocusIndicators(
  container: Element = document.body
): Element[] {
  const violations: Element[] = [];
  const elements = container.querySelectorAll(INTERACTIVE_SELECTORS);

  elements.forEach((element) => {
    const styles = getComputedStyle(element);

    // Check for outline: none without custom focus styles
    if (styles.outline === 'none' || styles.outlineWidth === '0px') {
      // This is a potential issue - element might lack focus indicator
      // In production, you'd want more sophisticated detection
      violations.push(element);
    }
  });

  return violations;
}

export function validateColorContrast(
  element: Element
): { foreground: string; background: string; ratio: number } | null {
  const styles = getComputedStyle(element);
  const color = styles.color;
  const background = styles.backgroundColor;

  // Simple contrast check - in production use a proper contrast library
  // This is a placeholder implementation
  return {
    foreground: color,
    background: background,
    ratio: 4.5, // Would calculate actual ratio
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(Boolean);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes[0]}`;
    }
  }
  return element.tagName.toLowerCase();
}

// ============================================================================
// QA Report Generator
// ============================================================================

export interface MobileQAReport {
  deviceInfo: MobileDeviceInfo;
  touchTargetViolations: TouchTargetViolation[];
  spacingViolations: TouchTargetViolation[];
  timestamp: string;
  score: number;
}

export function generateMobileQAReport(
  container: Element = document.body
): MobileQAReport {
  const deviceInfo = getDeviceInfo();
  const touchTargetViolations = validateTouchTargets(container);
  const spacingViolations = validateTouchTargetSpacing(container);

  // Calculate a simple score (100 = perfect)
  const totalElements = container.querySelectorAll(INTERACTIVE_SELECTORS).length;
  const violationCount = touchTargetViolations.length + spacingViolations.length;
  const score = totalElements > 0 ? Math.max(0, 100 - (violationCount / totalElements) * 100) : 100;

  return {
    deviceInfo,
    touchTargetViolations,
    spacingViolations,
    timestamp: new Date().toISOString(),
    score: Math.round(score),
  };
}

// ============================================================================
// CSS Helpers
// ============================================================================

export const mobileQAStyles = `
  /* Touch target enforcement */
  button,
  [role="button"],
  a[href],
  input,
  select,
  textarea,
  .clickable {
    min-height: ${MIN_TOUCH_TARGET_SIZE}px;
    min-width: ${MIN_TOUCH_TARGET_SIZE}px;
  }

  /* Safe area padding */
  .safe-area-top {
    padding-top: env(safe-area-inset-top, 0px);
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .safe-area-left {
    padding-left: env(safe-area-inset-left, 0px);
  }

  .safe-area-right {
    padding-right: env(safe-area-inset-right, 0px);
  }

  .safe-area-all {
    padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
             env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  }

  /* Prevent iOS zoom on inputs */
  @media (max-width: 640px) {
    input,
    select,
    textarea {
      font-size: 16px !important;
    }
  }

  /* Touch feedback */
  @media (pointer: coarse) {
    button:active,
    [role="button"]:active,
    .clickable:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
  }
`;
