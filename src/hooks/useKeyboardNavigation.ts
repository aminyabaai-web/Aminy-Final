/**
 * Keyboard Navigation Hooks
 *
 * Comprehensive keyboard navigation support for the app.
 * Implements WCAG 2.1 AAA keyboard accessibility requirements.
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'action' | 'accessibility' | 'help';
}

// ============================================================================
// Global Keyboard Shortcuts Hook
// ============================================================================

export function useGlobalKeyboardShortcuts(
  onNavigate: (destination: string) => void,
  shortcuts?: KeyboardShortcut[]
) {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    // Detect keyboard vs mouse users
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        document.body.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.body.classList.remove('keyboard-user');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        // Allow Escape in inputs to blur
        if (event.key === 'Escape') {
          (event.target as HTMLElement).blur();
        }
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;
      const isShift = event.shiftKey;

      // Check custom shortcuts first
      if (shortcuts) {
        for (const shortcut of shortcuts) {
          const ctrlMatch = shortcut.ctrl ? isCtrlOrCmd : !isCtrlOrCmd;
          const altMatch = shortcut.alt ? isAlt : !isAlt;
          const shiftMatch = shortcut.shift ? isShift : !isShift;
          const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

          if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
            event.preventDefault();
            shortcut.action();
            announce(`Action: ${shortcut.description}`);
            return;
          }
        }
      }

      // Built-in navigation shortcuts (Alt + key)
      if (isAlt && !isShift && !isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'h':
            event.preventDefault();
            onNavigate('home');
            announce('Navigating to Home');
            break;
          case 'a':
            event.preventDefault();
            onNavigate('ask-aminy');
            announce('Navigating to Aminy');
            break;
          case 'm':
            event.preventDefault();
            onNavigate('messages');
            announce('Navigating to Messages');
            break;
          case 'p':
            event.preventDefault();
            onNavigate('plan');
            announce('Navigating to Care Plan');
            break;
          case 'r':
            event.preventDefault();
            onNavigate('reports');
            announce('Navigating to Reports');
            break;
          case 's':
            event.preventDefault();
            onNavigate('settings');
            announce('Navigating to Settings');
            break;
          case 'v':
            event.preventDefault();
            onNavigate('document-vault');
            announce('Navigating to Document Vault');
            break;
        }
      }

      // Search shortcut (Ctrl/Cmd + K)
      if (isCtrlOrCmd && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]'
        ) as HTMLElement;
        if (searchInput) {
          searchInput.focus();
          announce('Search activated');
        }
      }

      // Help shortcut (F1 or Shift + ?)
      if (event.key === 'F1' || (isShift && event.key === '?')) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('show-keyboard-help'));
        announce('Keyboard help opened');
      }

      // Emergency help (Ctrl/Cmd + Shift + H)
      if (isCtrlOrCmd && isShift && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('emergency-help'));
        announce('Emergency help activated');
      }

      // Focus main content (Ctrl/Cmd + Shift + M)
      if (isCtrlOrCmd && isShift && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          announce('Focused on main content');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNavigate, shortcuts]);

  return { isKeyboardUser };
}

// ============================================================================
// Focus Management Hook
// ============================================================================

export function useFocusManagement() {
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current && 'focus' in lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, []);

  const focusFirst = useCallback((container: HTMLElement | null) => {
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement) {
      firstElement.focus();
    }
  }, []);

  return { saveFocus, restoreFocus, focusFirst };
}

// ============================================================================
// Focus Trap Hook
// ============================================================================

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll(focusableSelector);
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element
    const focusableElements = container.querySelectorAll(focusableSelector);
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

// ============================================================================
// Roving Tab Index Hook
// ============================================================================

export function useRovingTabIndex<T extends HTMLElement>(
  items: (T | null)[],
  orientation: 'horizontal' | 'vertical' | 'both' = 'horizontal'
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      let newIndex = index;
      const maxIndex = items.length - 1;

      switch (event.key) {
        case 'ArrowRight':
          if (orientation !== 'vertical') {
            event.preventDefault();
            newIndex = index < maxIndex ? index + 1 : 0;
          }
          break;
        case 'ArrowLeft':
          if (orientation !== 'vertical') {
            event.preventDefault();
            newIndex = index > 0 ? index - 1 : maxIndex;
          }
          break;
        case 'ArrowDown':
          if (orientation !== 'horizontal') {
            event.preventDefault();
            newIndex = index < maxIndex ? index + 1 : 0;
          }
          break;
        case 'ArrowUp':
          if (orientation !== 'horizontal') {
            event.preventDefault();
            newIndex = index > 0 ? index - 1 : maxIndex;
          }
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = maxIndex;
          break;
        default:
          return;
      }

      setFocusedIndex(newIndex);
      items[newIndex]?.focus();
    },
    [items, orientation]
  );

  const getTabIndex = useCallback(
    (index: number) => (index === focusedIndex ? 0 : -1),
    [focusedIndex]
  );

  return { handleKeyDown, getTabIndex, focusedIndex, setFocusedIndex };
}

// ============================================================================
// Screen Reader Announcement
// ============================================================================

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  // Create or get the live region
  let liveRegion = document.getElementById('sr-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText =
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    document.body.appendChild(liveRegion);
  }

  // Clear and set the message with a small delay to ensure announcement
  liveRegion.textContent = '';
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, 100);
}

// ============================================================================
// Escape Key Handler Hook
// ============================================================================

export function useEscapeKey(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [callback, enabled]);
}

// ============================================================================
// Arrow Key Navigation Hook
// ============================================================================

export function useArrowKeyNavigation(
  containerRef: React.RefObject<HTMLElement>,
  selector = 'button, a, [tabindex="0"]'
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll(selector)
      ) as HTMLElement[];

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          nextIndex = (currentIndex + 1) % focusableElements.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          nextIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
          break;
      }

      focusableElements[nextIndex]?.focus();
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, selector]);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  useGlobalKeyboardShortcuts,
  useFocusManagement,
  useFocusTrap,
  useRovingTabIndex,
  useEscapeKey,
  useArrowKeyNavigation,
  announce,
};
