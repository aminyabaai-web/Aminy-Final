// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Focus Management for Single-Page Application
 *
 * Manages focus behavior for the Aminy SPA which uses `currentScreen`
 * state-based navigation (NOT React Router). Handles:
 *
 * - Focus trapping within modals and dialogs
 * - Skip navigation link support
 * - Focus restoration after screen changes
 * - Screen change announcements via aria-live regions
 * - Focus ring visibility management
 *
 * WCAG References:
 * - 2.1.2 No Keyboard Trap (Level A)
 * - 2.4.1 Bypass Blocks (Level A)
 * - 2.4.3 Focus Order (Level A)
 * - 2.4.7 Focus Visible (Level AA)
 * - 4.1.3 Status Messages (Level AA)
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Focus trap options */
export interface FocusTrapOptions {
  /** The container element to trap focus within */
  container: HTMLElement;
  /** Initial element to focus when trap activates */
  initialFocus?: HTMLElement | string;
  /** Element to return focus to when trap deactivates */
  returnFocusTo?: HTMLElement;
  /** Allow escape key to release the trap */
  escapeDeactivates?: boolean;
  /** Callback when escape is pressed (if escapeDeactivates is true) */
  onEscape?: () => void;
  /** Include container itself in tab order */
  includeContainer?: boolean;
}

/** Screen change announcement configuration */
export interface ScreenAnnouncement {
  /** Text to announce to screen readers */
  message: string;
  /** Politeness level of the announcement */
  politeness?: 'polite' | 'assertive';
  /** Delay before announcement (ms) — allows DOM to settle */
  delayMs?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Selector for all focusable elements */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details > summary',
].join(', ');

/** ID for the aria-live announcement region */
const LIVE_REGION_ID = 'aminy-a11y-live-region';

/** ID for the skip navigation link */
const SKIP_NAV_ID = 'aminy-skip-nav';

// ============================================================================
// DOM Helpers
// ============================================================================

/**
 * Get all focusable elements within a container, sorted by tabindex.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

  // Filter out elements that are not visible
  return elements.filter(el => {
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return true;
  });
}

/**
 * Ensure the aria-live region exists in the DOM.
 */
function ensureLiveRegion(): HTMLElement {
  let region = document.getElementById(LIVE_REGION_ID);
  if (!region) {
    region = document.createElement('div');
    region.id = LIVE_REGION_ID;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    // Visually hidden but accessible to screen readers
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(region);
  }
  return region;
}

// ============================================================================
// FocusManager Class
// ============================================================================

/**
 * Manages focus behavior for the SPA.
 *
 * @example
 * ```ts
 * const fm = new FocusManager();
 *
 * // On screen change (called from App.tsx when currentScreen changes)
 * fm.handleScreenChange('dashboard', 'Dashboard');
 *
 * // Trap focus in a modal
 * const release = fm.trap(modalElement, { escapeDeactivates: true, onEscape: closeModal });
 * // Later: release();
 *
 * // Announce a status message
 * fm.announce('Your changes have been saved');
 *
 * // Move focus to a specific element
 * fm.moveTo('#submit-button');
 *
 * // Destroy when done
 * fm.destroy();
 * ```
 */
export class FocusManager {
  private activeTrap: {
    container: HTMLElement;
    returnFocusTo: HTMLElement | null;
    keyHandler: (e: KeyboardEvent) => void;
  } | null = null;

  private focusStack: HTMLElement[] = [];
  private liveRegion: HTMLElement;

  constructor() {
    this.liveRegion = ensureLiveRegion();
  }

  /**
   * Trap focus within a container element (for modals, dialogs, drawers).
   *
   * Tab and Shift+Tab will cycle through focusable elements within the
   * container. Focus cannot escape the container via keyboard.
   *
   * @returns A function to release the focus trap.
   */
  trap(container: HTMLElement, options?: Partial<Omit<FocusTrapOptions, 'container'>>): () => void {
    // Save current focus for restoration
    const returnFocusTo = options?.returnFocusTo ?? document.activeElement as HTMLElement;
    this.focusStack.push(returnFocusTo);

    // Deactivate any existing trap
    if (this.activeTrap) {
      this.release();
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && options?.escapeDeactivates !== false) {
        e.preventDefault();
        options?.onEscape?.();
        this.release();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', keyHandler);

    this.activeTrap = { container, returnFocusTo, keyHandler };

    // Move focus to initial element
    requestAnimationFrame(() => {
      if (options?.initialFocus) {
        const target = typeof options.initialFocus === 'string'
          ? container.querySelector<HTMLElement>(options.initialFocus)
          : options.initialFocus;
        target?.focus();
      } else {
        const focusable = getFocusableElements(container);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          // Make container focusable and focus it
          if (!container.getAttribute('tabindex')) {
            container.setAttribute('tabindex', '-1');
          }
          container.focus();
        }
      }
    });

    return () => this.release();
  }

  /**
   * Release the current focus trap and restore focus to the previous element.
   */
  release(): void {
    if (!this.activeTrap) return;

    document.removeEventListener('keydown', this.activeTrap.keyHandler);

    // Restore focus
    const returnTo = this.focusStack.pop();
    if (returnTo && returnTo.focus) {
      requestAnimationFrame(() => {
        returnTo.focus();
      });
    }

    this.activeTrap = null;
  }

  /**
   * Move focus to a specific element.
   *
   * @param target - CSS selector string or HTMLElement
   */
  moveTo(target: string | HTMLElement): void {
    const el = typeof target === 'string'
      ? document.querySelector<HTMLElement>(target)
      : target;

    if (!el) {
      console.warn(`[FocusManager] Target not found: ${target}`);
      return;
    }

    // Make non-focusable elements focusable
    if (!el.getAttribute('tabindex') && !el.matches(FOCUSABLE_SELECTOR)) {
      el.setAttribute('tabindex', '-1');
    }

    requestAnimationFrame(() => {
      el.focus();
    });
  }

  /**
   * Announce a message to screen readers via the aria-live region.
   *
   * @param message - Text to announce
   * @param politeness - 'polite' (default) or 'assertive'
   */
  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    this.liveRegion.setAttribute('aria-live', politeness);

    // Clear and set with a small delay to ensure screen readers pick up the change
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      this.liveRegion.textContent = message;
    });
  }

  /**
   * Handle a screen/page change in the SPA.
   *
   * This should be called whenever `currentScreen` changes in App.tsx.
   * It will:
   * 1. Announce the new screen name to screen readers
   * 2. Move focus to the main content area (or heading)
   * 3. Scroll to top
   *
   * @param screenName - The technical screen name (e.g., 'dashboard')
   * @param screenTitle - Human-readable title (e.g., 'Dashboard')
   */
  handleScreenChange(screenName: string, screenTitle: string): void {
    // Announce the screen change
    this.announce(`Navigated to ${screenTitle}`, 'polite');

    // Update document title
    document.title = `${screenTitle} - Aminy`;

    // After a short delay (let React render), move focus
    setTimeout(() => {
      // Try to focus: main heading > main content > first focusable
      const heading = document.querySelector<HTMLElement>(
        'main h1, [role="main"] h1, #main-content h1'
      );
      if (heading) {
        this.moveTo(heading);
        return;
      }

      const mainContent = document.querySelector<HTMLElement>(
        'main, [role="main"], #main-content'
      );
      if (mainContent) {
        this.moveTo(mainContent);
        return;
      }

      // Last resort: focus the first heading on page
      const anyHeading = document.querySelector<HTMLElement>('h1, h2');
      if (anyHeading) {
        this.moveTo(anyHeading);
      }
    }, 100);

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Check if a focus trap is currently active.
   */
  isTrapActive(): boolean {
    return this.activeTrap !== null;
  }

  /**
   * Destroy the focus manager and clean up all resources.
   */
  destroy(): void {
    this.release();
    this.focusStack = [];
    // Don't remove the live region — it may be shared
  }
}

// ============================================================================
// Skip Navigation
// ============================================================================

/**
 * Create and inject a skip navigation link at the top of the page.
 *
 * The link is visually hidden until focused, then appears at the top of
 * the viewport. Clicking it moves focus to the main content area.
 *
 * @returns Cleanup function to remove the skip link.
 *
 * @example
 * ```ts
 * // In App.tsx useEffect
 * const cleanup = injectSkipNavigation();
 * return cleanup;
 * ```
 */
export function injectSkipNavigation(targetId: string = 'main-content'): () => void {
  // Check if it already exists
  if (document.getElementById(SKIP_NAV_ID)) {
    return () => {};
  }

  const link = document.createElement('a');
  link.id = SKIP_NAV_ID;
  link.href = `#${targetId}`;
  link.textContent = 'Skip to main content';
  link.className = 'skip-nav-link';

  // Style: visually hidden until focused
  Object.assign(link.style, {
    position: 'absolute',
    top: '-100%',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '99999',
    padding: '12px 24px',
    backgroundColor: '#0D1B2A',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    borderRadius: '0 0 8px 8px',
    transition: 'top 0.2s ease',
    outline: 'none',
  });

  // Show on focus
  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-100%';
  });

  // Handle click
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      if (!target.getAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Insert as the first child of body
  document.body.insertBefore(link, document.body.firstChild);

  return () => {
    link.remove();
  };
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * React hook for managing focus within a component.
 *
 * Provides focus trapping, screen reader announcements, and focus
 * restoration. Designed for modal/dialog components.
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }: Props) {
 *   const { containerRef, announce } = useFocusManager({
 *     trapFocus: isOpen,
 *     onEscape: onClose,
 *     restoreFocusOnUnmount: true,
 *   });
 *
 *   useEffect(() => {
 *     if (isOpen) announce('Dialog opened');
 *   }, [isOpen, announce]);
 *
 *   return <div ref={containerRef} role="dialog" aria-modal="true">...</div>;
 * }
 * ```
 */
export function useFocusManager(options?: {
  trapFocus?: boolean;
  onEscape?: () => void;
  restoreFocusOnUnmount?: boolean;
  initialFocusSelector?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<FocusManager | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = new FocusManager();
  }

  const announce = useCallback((message: string, politeness?: 'polite' | 'assertive') => {
    managerRef.current?.announce(message, politeness);
  }, []);

  const moveTo = useCallback((target: string | HTMLElement) => {
    managerRef.current?.moveTo(target);
  }, []);

  // Handle focus trapping
  useEffect(() => {
    if (!options?.trapFocus || !containerRef.current) {
      // Release any existing trap
      if (releaseRef.current) {
        releaseRef.current();
        releaseRef.current = null;
      }
      return;
    }

    savedFocusRef.current = document.activeElement as HTMLElement;

    releaseRef.current = managerRef.current!.trap(containerRef.current, {
      escapeDeactivates: true,
      onEscape: options.onEscape,
      initialFocus: options.initialFocusSelector,
      returnFocusTo: savedFocusRef.current ?? undefined,
    });

    return () => {
      if (releaseRef.current) {
        releaseRef.current();
        releaseRef.current = null;
      }
    };
  }, [options?.trapFocus, options?.onEscape, options?.initialFocusSelector]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (releaseRef.current) {
        releaseRef.current();
      }
      if (options?.restoreFocusOnUnmount && savedFocusRef.current) {
        savedFocusRef.current.focus();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    containerRef,
    announce,
    moveTo,
    manager: managerRef.current,
  };
}

/**
 * React hook for handling screen changes in the SPA.
 *
 * Call this in App.tsx to automatically manage focus and
 * screen reader announcements when `currentScreen` changes.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [currentScreen, setCurrentScreen] = useState('login');
 *
 *   useScreenFocusManager(currentScreen, screenTitles);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useScreenFocusManager(
  currentScreen: string,
  screenTitles?: Record<string, string>,
) {
  const managerRef = useRef<FocusManager | null>(null);
  const prevScreenRef = useRef<string>('');

  if (!managerRef.current) {
    managerRef.current = new FocusManager();
  }

  useEffect(() => {
    // Skip the initial mount
    if (prevScreenRef.current === '' && currentScreen) {
      prevScreenRef.current = currentScreen;
      return;
    }

    if (currentScreen !== prevScreenRef.current) {
      const title = screenTitles?.[currentScreen] ??
        currentScreen.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      managerRef.current?.handleScreenChange(currentScreen, title);
      prevScreenRef.current = currentScreen;
    }
  }, [currentScreen, screenTitles]);

  // Inject skip navigation on mount
  useEffect(() => {
    const cleanup = injectSkipNavigation();
    return cleanup;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  return managerRef.current;
}

// ============================================================================
// Exports
// ============================================================================

export { getFocusableElements, FOCUSABLE_SELECTOR };

export default FocusManager;
