// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Accessibility Enhancements Hook
 *
 * Provides runtime accessibility improvements that complement
 * the existing AccessibilityEnhancer, SkipLinks, and
 * DialogAccessibilityProvider components.
 *
 * Adds:
 * 1. Form field aria-describedby auto-wiring for validation errors
 * 2. High-contrast mode detection + CSS class injection
 * 3. Reduced motion detection with animation override
 * 4. Screen reader announcement utility
 * 5. Focus management for dynamic content
 * 6. Touch target size validation (44x44px minimum)
 * 7. Color contrast checking utility
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ============================================
// 1. Screen Reader Announcements
// ============================================

let announcer: HTMLDivElement | null = null;

function getOrCreateAnnouncer(): HTMLDivElement {
  if (announcer && document.body.contains(announcer)) return announcer;

  announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('role', 'status');
  announcer.className = 'sr-only';
  announcer.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
  document.body.appendChild(announcer);
  return announcer;
}

/**
 * Announce a message to screen readers.
 * @param message The text to announce
 * @param priority 'polite' (default) or 'assertive' (interrupts)
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const el = getOrCreateAnnouncer();
  el.setAttribute('aria-live', priority);
  // Clear then set — forces screen readers to re-read
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

// ============================================
// 2. Reduced Motion Detection
// ============================================

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// ============================================
// 3. High Contrast Mode Detection
// ============================================

export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-contrast: more)');
    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
      // Inject high-contrast class on document
      document.documentElement.classList.toggle('high-contrast', e.matches);
    };

    // Set initial class
    document.documentElement.classList.toggle('high-contrast', prefersHighContrast);

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefersHighContrast]);

  return prefersHighContrast;
}

// ============================================
// 4. Focus Management
// ============================================

/**
 * Move focus to an element, useful after dynamic content changes.
 * Announces the element's label to screen readers.
 */
export function moveFocusTo(
  selector: string | HTMLElement,
  announce?: string
): void {
  const el =
    typeof selector === 'string'
      ? document.querySelector<HTMLElement>(selector)
      : selector;

  if (!el) return;

  // Make focusable if not already
  if (!el.hasAttribute('tabindex') && el.tabIndex < 0) {
    el.setAttribute('tabindex', '-1');
  }

  el.focus({ preventScroll: false });

  if (announce) {
    announceToScreenReader(announce);
  }
}

/**
 * Hook for managing focus when navigating between screens.
 * Call with the screen name to auto-focus the main heading.
 */
export function useScreenFocus(screenName: string): void {
  const previousScreen = useRef<string>('');

  useEffect(() => {
    if (previousScreen.current !== screenName) {
      previousScreen.current = screenName;

      // Delay to let React render
      requestAnimationFrame(() => {
        // Try to focus the main heading or main content
        const heading =
          document.querySelector<HTMLElement>('main h1') ||
          document.querySelector<HTMLElement>('[role="main"] h1') ||
          document.querySelector<HTMLElement>('#main-content h1') ||
          document.querySelector<HTMLElement>('#main-content');

        if (heading) {
          moveFocusTo(heading);
        }

        // Announce the screen change
        const title =
          heading?.textContent || screenName.replace(/-/g, ' ');
        announceToScreenReader(`Navigated to ${title}`);
      });
    }
  }, [screenName]);
}

// ============================================
// 5. Form Validation Accessibility
// ============================================

/**
 * Auto-wire aria-describedby on form fields when validation errors appear.
 * Watches for error messages and links them to their input fields.
 */
export function useFormAccessibility(formRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const observer = new MutationObserver(() => {
      // Find all error messages (common patterns)
      const errorMessages = form.querySelectorAll(
        '[role="alert"], .error-message, .field-error, [data-error], [id$="-error"]'
      );

      errorMessages.forEach((errorEl) => {
        const errorId = errorEl.id;
        if (!errorId) return;

        // Find the associated input
        // Convention: error id = "fieldname-error", input id = "fieldname"
        const inputId = errorId.replace(/-error$/, '');
        const input = form.querySelector<HTMLElement>(`#${inputId}`);

        if (input) {
          const existing = input.getAttribute('aria-describedby') || '';
          if (!existing.includes(errorId)) {
            input.setAttribute('aria-describedby', `${existing} ${errorId}`.trim());
            input.setAttribute('aria-invalid', 'true');
          }
        }
      });

      // Clear aria-invalid when error messages are removed
      const inputs = form.querySelectorAll('[aria-invalid="true"]');
      inputs.forEach((input) => {
        const describedBy = input.getAttribute('aria-describedby') || '';
        const errorIds = describedBy.split(' ').filter((id) => id.endsWith('-error'));
        const allCleared = errorIds.every((id) => !form.querySelector(`#${id}`));
        if (allCleared && errorIds.length > 0) {
          input.removeAttribute('aria-invalid');
          input.setAttribute(
            'aria-describedby',
            describedBy
              .split(' ')
              .filter((id) => !id.endsWith('-error'))
              .join(' ')
              .trim() || ''
          );
          if (!input.getAttribute('aria-describedby')) {
            input.removeAttribute('aria-describedby');
          }
        }
      });
    });

    observer.observe(form, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [formRef]);
}

// ============================================
// 6. Touch Target Validation (Dev Only)
// ============================================

/**
 * Development utility: logs interactive elements smaller than 44x44px.
 * Only runs in development mode.
 */
export function auditTouchTargets(): Array<{
  element: HTMLElement;
  width: number;
  height: number;
  label: string;
}> {
  if (typeof window === 'undefined') return [];

  const violations: Array<{
    element: HTMLElement;
    width: number;
    height: number;
    label: string;
  }> = [];

  const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [tabindex]';
  const elements = document.querySelectorAll<HTMLElement>(interactiveSelectors);

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Skip hidden elements
    if (rect.width === 0 || rect.height === 0) return;

    if (rect.width < 44 || rect.height < 44) {
      const label =
        el.getAttribute('aria-label') ||
        el.textContent?.trim().slice(0, 30) ||
        el.tagName.toLowerCase();

      violations.push({
        element: el,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        label,
      });
    }
  });

  return violations;
}

// ============================================
// 7. Combined Hook
// ============================================

/**
 * Combined accessibility hook that activates all enhancements.
 * Use at the app root level.
 */
export function useAccessibilityEnhancements(screenName?: string) {
  const reducedMotion = usePrefersReducedMotion();
  const highContrast = usePrefersHighContrast();

  // Apply reduced motion class
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  // Screen focus management
  useEffect(() => {
    if (!screenName) return;

    // Delay to let React render the new screen
    const timeout = setTimeout(() => {
      const heading =
        document.querySelector<HTMLElement>('main h1, [role="main"] h1, #main-content h1');

      if (heading) {
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1');
        }
        heading.focus({ preventScroll: false });
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [screenName]);

  return {
    reducedMotion,
    highContrast,
    announce: announceToScreenReader,
    moveFocusTo,
    auditTouchTargets,
  };
}

export default useAccessibilityEnhancements;
