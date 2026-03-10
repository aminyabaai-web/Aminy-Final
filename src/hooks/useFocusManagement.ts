/**
 * Focus Management Hooks
 *
 * Comprehensive focus management for modals, dialogs, screen navigation,
 * and the :focus-visible polyfill pattern.
 *
 * Builds on top of the existing useFocusTrap and useFocusManagement in
 * useKeyboardNavigation.ts, providing additional hooks specifically
 * designed for the 42-screen navigation system.
 *
 * Usage:
 *   // Modal focus trap
 *   const { trapRef } = useFocusTrap(modalRef);
 *
 *   // Return focus after navigation
 *   const { saveAndReturn } = useReturnFocus();
 *
 *   // Focus-visible polyfill
 *   useFocusVisible();
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================================================
// Focus Trap — traps Tab/Shift+Tab within a container
// ============================================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Trap keyboard focus within a container element.
 * Use for modals, dialogs, and overlay panels.
 *
 * @param containerRef - Ref to the container element
 * @param options.active - Whether the trap is active (default: true)
 * @param options.autoFocus - Auto-focus first element on activation (default: true)
 * @param options.restoreOnDeactivate - Restore focus when deactivated (default: true)
 */
export function useFocusTrapEnhanced(
  containerRef: React.RefObject<HTMLElement | null>,
  options: {
    active?: boolean;
    autoFocus?: boolean;
    restoreOnDeactivate?: boolean;
  } = {}
) {
  const {
    active = true,
    autoFocus = true,
    restoreOnDeactivate = true,
  } = options;

  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    // Save the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Auto-focus the first focusable element
    if (autoFocus) {
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus());
      } else {
        // If no focusable children, make the container itself focusable
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1');
        }
        requestAnimationFrame(() => container.focus());
      }
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Also prevent focus from leaving the container via mouse click outside
    const handleFocusIn = (e: FocusEvent) => {
      if (!container.contains(e.target as Node)) {
        e.stopPropagation();
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);

      // Restore focus when the trap is deactivated
      if (restoreOnDeactivate && previousFocusRef.current) {
        try {
          previousFocusRef.current.focus();
        } catch {
          // Element may no longer be in the DOM
        }
      }
    };
  }, [active, containerRef, autoFocus, restoreOnDeactivate]);

  return { previousFocusRef };
}

// ============================================================================
// Return Focus — save and restore focus across screen navigation
// ============================================================================

/**
 * Remember the focused element before navigating away, and restore it
 * when returning. Designed for the 42-screen state-based navigation.
 *
 * Usage:
 *   const { saveFocus, restoreFocus } = useReturnFocus();
 *
 *   // Before navigating away:
 *   saveFocus();
 *   navigate('new-screen');
 *
 *   // When coming back:
 *   restoreFocus();
 */
export function useReturnFocus() {
  const focusStackRef = useRef<HTMLElement[]>([]);

  const saveFocus = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body) {
      focusStackRef.current.push(active);
    }
  }, []);

  const restoreFocus = useCallback(() => {
    const element = focusStackRef.current.pop();
    if (element && document.body.contains(element)) {
      requestAnimationFrame(() => {
        try {
          element.focus();
        } catch {
          // Element may not be focusable anymore
        }
      });
    }
  }, []);

  const clearStack = useCallback(() => {
    focusStackRef.current = [];
  }, []);

  return { saveFocus, restoreFocus, clearStack };
}

// ============================================================================
// Focus Visible — polyfill for :focus-visible
// ============================================================================

/**
 * Adds .focus-visible class to the document based on whether the user
 * is navigating via keyboard. This provides a JS-based :focus-visible
 * polyfill for older browsers.
 *
 * Adds 'keyboard-user' class to <body> when keyboard is detected,
 * removes it on mouse/touch input. This is already done in
 * useKeyboardNavigation.ts's useGlobalKeyboardShortcuts, but this hook
 * can be used independently.
 */
export function useFocusVisible() {
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  useEffect(() => {
    let lastInputType: 'keyboard' | 'mouse' | 'touch' = 'mouse';

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only flag as keyboard navigation on Tab, Arrow keys, Enter, Space
      if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        lastInputType = 'keyboard';
        setIsKeyboardNavigation(true);
        document.documentElement.classList.add('keyboard-user');
        document.documentElement.classList.add('focus-visible-active');
      }
    };

    const handleMouseDown = () => {
      lastInputType = 'mouse';
      setIsKeyboardNavigation(false);
      document.documentElement.classList.remove('keyboard-user');
      document.documentElement.classList.remove('focus-visible-active');
    };

    const handleTouchStart = () => {
      lastInputType = 'touch';
      setIsKeyboardNavigation(false);
      document.documentElement.classList.remove('keyboard-user');
      document.documentElement.classList.remove('focus-visible-active');
    };

    // Apply focus-visible class to the focused element
    const handleFocus = (e: FocusEvent) => {
      if (lastInputType === 'keyboard' && e.target instanceof HTMLElement) {
        e.target.classList.add('focus-visible');
      }
    };

    const handleBlur = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) {
        e.target.classList.remove('focus-visible');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.documentElement.classList.remove('keyboard-user', 'focus-visible-active');
    };
  }, []);

  return { isKeyboardNavigation };
}

export default {
  useFocusTrapEnhanced,
  useReturnFocus,
  useFocusVisible,
};
