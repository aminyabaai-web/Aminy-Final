/**
 * Keyboard Navigation System
 *
 * Full keyboard navigation support for the Aminy SPA,
 * implementing the roving tabindex pattern for complex widgets,
 * arrow key navigation for lists/grids, and global shortcuts.
 *
 * Designed for state-based navigation (currentScreen in App.tsx),
 * NOT React Router. All patterns follow WAI-ARIA Authoring Practices.
 *
 * Accessibility References:
 * - WAI-ARIA APG: Keyboard Interaction patterns
 * - WCAG 2.1 SC 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap)
 * - WCAG 2.1 SC 2.4.1 (Bypass Blocks), 2.4.7 (Focus Visible)
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Navigation orientation for arrow key handling */
export type NavigationOrientation = 'horizontal' | 'vertical' | 'grid';

/** Configuration for the roving tabindex pattern */
export interface RovingTabindexConfig {
  /** CSS selector for navigable items within the container */
  itemSelector: string;
  /** Navigation orientation */
  orientation: NavigationOrientation;
  /** Whether to wrap around at boundaries */
  wrap: boolean;
  /** Number of columns (required for grid orientation) */
  columns?: number;
  /** Callback when an item receives focus */
  onFocus?: (element: HTMLElement, index: number) => void;
  /** Callback when an item is activated (Enter/Space) */
  onActivate?: (element: HTMLElement, index: number) => void;
  /** Whether Home/End keys jump to first/last item */
  homeEndKeys?: boolean;
  /** Whether typing a character jumps to matching item */
  typeAheadSearch?: boolean;
}

/** Configuration for keyboard shortcuts */
export interface KeyboardShortcut {
  /** Human-readable description of the shortcut */
  description: string;
  /** Key to listen for (e.g., 'Escape', 'Enter', 'k', '/') */
  key: string;
  /** Whether Ctrl (or Cmd on Mac) is required */
  ctrlOrMeta?: boolean;
  /** Whether Shift is required */
  shift?: boolean;
  /** Whether Alt is required */
  alt?: boolean;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether this shortcut is currently active */
  enabled?: boolean;
}

/** Options for the useKeyboardNav hook */
export interface KeyboardNavOptions {
  /** Roving tabindex configuration (if using arrow key navigation) */
  roving?: RovingTabindexConfig;
  /** Keyboard shortcuts to register */
  shortcuts?: KeyboardShortcut[];
  /** Whether the keyboard nav is currently active */
  enabled?: boolean;
}

/** Result from the useKeyboardNav hook */
export interface KeyboardNavResult {
  /** Current focused item index (-1 if none) */
  activeIndex: number;
  /** Set focus to a specific index */
  setActiveIndex: (index: number) => void;
  /** Reset focus to the first item */
  resetFocus: () => void;
  /** Get all navigable items */
  getItems: () => HTMLElement[];
}

// ============================================================================
// Roving Tabindex Implementation
// ============================================================================

/**
 * Get all navigable items within a container.
 */
function getNavigableItems(
  container: HTMLElement,
  selector: string,
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  ).filter((el) => {
    // Exclude hidden or disabled elements
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    if (
      el instanceof HTMLButtonElement ||
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement
    ) {
      if (el.disabled) return false;
    }
    if (el.getAttribute('aria-disabled') === 'true') return false;
    return true;
  });
}

/**
 * Apply roving tabindex to a set of items.
 * Only the active item gets tabindex="0", all others get tabindex="-1".
 */
function applyRovingTabindex(
  items: HTMLElement[],
  activeIndex: number,
): void {
  items.forEach((item, i) => {
    item.setAttribute('tabindex', i === activeIndex ? '0' : '-1');
  });
}

/**
 * Calculate the next index based on key press and orientation.
 */
function getNextIndex(
  currentIndex: number,
  key: string,
  itemCount: number,
  config: RovingTabindexConfig,
): number {
  const { orientation, wrap, columns = 1 } = config;

  let nextIndex = currentIndex;

  switch (key) {
    case 'ArrowDown':
      if (orientation === 'vertical' || orientation === 'grid') {
        nextIndex = orientation === 'grid'
          ? currentIndex + columns
          : currentIndex + 1;
      }
      break;

    case 'ArrowUp':
      if (orientation === 'vertical' || orientation === 'grid') {
        nextIndex = orientation === 'grid'
          ? currentIndex - columns
          : currentIndex - 1;
      }
      break;

    case 'ArrowRight':
      if (orientation === 'horizontal' || orientation === 'grid') {
        nextIndex = currentIndex + 1;
      }
      break;

    case 'ArrowLeft':
      if (orientation === 'horizontal' || orientation === 'grid') {
        nextIndex = currentIndex - 1;
      }
      break;

    case 'Home':
      if (config.homeEndKeys !== false) {
        nextIndex = 0;
      }
      break;

    case 'End':
      if (config.homeEndKeys !== false) {
        nextIndex = itemCount - 1;
      }
      break;

    default:
      return currentIndex;
  }

  // Handle wrapping
  if (wrap) {
    if (nextIndex < 0) nextIndex = itemCount - 1;
    if (nextIndex >= itemCount) nextIndex = 0;
  } else {
    nextIndex = Math.max(0, Math.min(nextIndex, itemCount - 1));
  }

  return nextIndex;
}

// ============================================================================
// Type-Ahead Search
// ============================================================================

/** State for type-ahead search within a list */
interface TypeAheadState {
  query: string;
  timeout: ReturnType<typeof setTimeout> | null;
}

/**
 * Find the next item matching a type-ahead character.
 * Searches forward from the current position, wrapping around.
 */
function findTypeAheadMatch(
  items: HTMLElement[],
  query: string,
  startIndex: number,
): number {
  const lowerQuery = query.toLowerCase();

  // Search forward from current position
  for (let offset = 1; offset <= items.length; offset++) {
    const index = (startIndex + offset) % items.length;
    const text = (
      items[index].textContent ||
      items[index].getAttribute('aria-label') ||
      ''
    ).toLowerCase();
    if (text.startsWith(lowerQuery)) {
      return index;
    }
  }

  return -1;
}

// ============================================================================
// Global Shortcut Registry
// ============================================================================

/** Active shortcuts map for deduplication */
const activeShortcuts = new Map<string, Set<KeyboardShortcut>>();

/**
 * Build a unique key for a shortcut (for dedup/matching).
 */
function shortcutKey(s: KeyboardShortcut): string {
  const parts: string[] = [];
  if (s.ctrlOrMeta) parts.push('mod');
  if (s.shift) parts.push('shift');
  if (s.alt) parts.push('alt');
  parts.push(s.key.toLowerCase());
  return parts.join('+');
}

/**
 * Register global keyboard shortcuts.
 *
 * Returns a cleanup function to unregister all shortcuts.
 *
 * @example
 * ```ts
 * const cleanup = registerShortcuts([
 *   {
 *     description: 'Open search',
 *     key: '/',
 *     handler: () => openSearch(),
 *     preventDefault: true,
 *   },
 *   {
 *     description: 'Close modal',
 *     key: 'Escape',
 *     handler: () => closeModal(),
 *   },
 * ]);
 *
 * // On cleanup:
 * cleanup();
 * ```
 */
export function registerShortcuts(
  shortcuts: KeyboardShortcut[],
): () => void {
  const handler = (event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in form fields
    const target = event.target as HTMLElement;
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;

      // Check key match
      if (event.key !== shortcut.key && event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
        continue;
      }

      // Check modifier match
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      if (shortcut.ctrlOrMeta && !modKey) continue;
      if (!shortcut.ctrlOrMeta && modKey) continue;
      if (shortcut.shift && !event.shiftKey) continue;
      if (!shortcut.shift && event.shiftKey) continue;
      if (shortcut.alt && !event.altKey) continue;
      if (!shortcut.alt && event.altKey) continue;

      // Skip form-field shortcuts unless it's Escape or a modifier combo
      if (isInput && !shortcut.ctrlOrMeta && !shortcut.alt && shortcut.key !== 'Escape') {
        continue;
      }

      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }

      shortcut.handler(event);
      return;
    }
  };

  // Track shortcuts
  for (const s of shortcuts) {
    const key = shortcutKey(s);
    if (!activeShortcuts.has(key)) {
      activeShortcuts.set(key, new Set());
    }
    activeShortcuts.get(key)!.add(s);
  }

  document.addEventListener('keydown', handler);

  return () => {
    document.removeEventListener('keydown', handler);
    for (const s of shortcuts) {
      const key = shortcutKey(s);
      activeShortcuts.get(key)?.delete(s);
      if (activeShortcuts.get(key)?.size === 0) {
        activeShortcuts.delete(key);
      }
    }
  };
}

/**
 * Get all currently registered shortcuts (for a help dialog).
 */
export function getRegisteredShortcuts(): Array<{
  key: string;
  description: string;
}> {
  const result: Array<{ key: string; description: string }> = [];
  for (const [key, shortcuts] of activeShortcuts) {
    for (const s of shortcuts) {
      if (s.enabled !== false) {
        result.push({ key, description: s.description });
      }
    }
  }
  return result;
}

// ============================================================================
// Common Keyboard Patterns
// ============================================================================

/**
 * Handle Escape key to close modals/drawers/overlays.
 *
 * Implements the WAI-ARIA pattern: Escape should close the topmost
 * layer without propagating further.
 */
export function handleEscapeKey(
  event: KeyboardEvent,
  callback: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    callback();
  }
}

/**
 * Handle Enter/Space to activate an element.
 *
 * Standard WAI-ARIA activation pattern for custom buttons/links.
 */
export function handleActivationKeys(
  event: KeyboardEvent,
  callback: () => void,
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}

/**
 * Create an onKeyDown handler for a clickable div/span.
 *
 * Ensures keyboard accessibility for non-semantic interactive elements.
 * Add `role="button"` and `tabindex="0"` to the element.
 */
export function makeKeyboardClickable(
  onClick: () => void,
): (event: React.KeyboardEvent) => void {
  return (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };
}

// ============================================================================
// React Hook: useKeyboardNav
// ============================================================================

/**
 * React hook for keyboard navigation within a container.
 *
 * Supports roving tabindex for lists/grids and custom keyboard shortcuts.
 * Follows WAI-ARIA Authoring Practices for keyboard interaction.
 *
 * @example
 * ```tsx
 * function TabList({ tabs, onSelect }: TabListProps) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   const { activeIndex } = useKeyboardNav(containerRef, {
 *     roving: {
 *       itemSelector: '[role="tab"]',
 *       orientation: 'horizontal',
 *       wrap: true,
 *       onActivate: (el, index) => onSelect(tabs[index]),
 *     },
 *   });
 *
 *   return (
 *     <div ref={containerRef} role="tablist">
 *       {tabs.map((tab, i) => (
 *         <button
 *           key={tab.id}
 *           role="tab"
 *           aria-selected={i === activeIndex}
 *           onClick={() => onSelect(tab)}
 *         >
 *           {tab.label}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ImageGrid({ images }: ImageGridProps) {
 *   const gridRef = useRef<HTMLDivElement>(null);
 *
 *   useKeyboardNav(gridRef, {
 *     roving: {
 *       itemSelector: '[role="gridcell"]',
 *       orientation: 'grid',
 *       columns: 3,
 *       wrap: true,
 *       onActivate: (el, index) => openImage(images[index]),
 *     },
 *     shortcuts: [
 *       {
 *         description: 'Select all',
 *         key: 'a',
 *         ctrlOrMeta: true,
 *         handler: () => selectAll(),
 *       },
 *     ],
 *   });
 *
 *   return (
 *     <div ref={gridRef} role="grid">
 *       {images.map((img) => (
 *         <div key={img.id} role="gridcell">
 *           <img src={img.src} alt={img.alt} />
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardNav(
  containerRef: React.RefObject<HTMLElement | null>,
  options: KeyboardNavOptions,
): KeyboardNavResult {
  const activeIndexRef = useRef<number>(0);
  const typeAheadRef = useRef<TypeAheadState>({ query: '', timeout: null });
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const getItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current || !optionsRef.current.roving) return [];
    return getNavigableItems(
      containerRef.current,
      optionsRef.current.roving.itemSelector,
    );
  }, [containerRef]);

  const setActiveIndex = useCallback(
    (index: number) => {
      const items = getItems();
      if (items.length === 0) return;

      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      activeIndexRef.current = clampedIndex;
      applyRovingTabindex(items, clampedIndex);
      items[clampedIndex].focus();

      optionsRef.current.roving?.onFocus?.(items[clampedIndex], clampedIndex);
    },
    [getItems],
  );

  const resetFocus = useCallback(() => {
    setActiveIndex(0);
  }, [setActiveIndex]);

  // Roving tabindex keyboard handler
  useEffect(() => {
    const container = containerRef.current;
    const roving = optionsRef.current.roving;
    if (!container || !roving || optionsRef.current.enabled === false) return;

    // Initialize tabindex on items
    const items = getNavigableItems(container, roving.itemSelector);
    if (items.length > 0) {
      applyRovingTabindex(items, activeIndexRef.current);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentItems = getNavigableItems(container, roving.itemSelector);
      if (currentItems.length === 0) return;

      const currentIndex = activeIndexRef.current;

      // Arrow key navigation
      if (
        ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
          event.key,
        )
      ) {
        const nextIndex = getNextIndex(
          currentIndex,
          event.key,
          currentItems.length,
          roving,
        );

        if (nextIndex !== currentIndex) {
          event.preventDefault();
          activeIndexRef.current = nextIndex;
          applyRovingTabindex(currentItems, nextIndex);
          currentItems[nextIndex].focus();
          roving.onFocus?.(currentItems[nextIndex], nextIndex);
        }
        return;
      }

      // Activation keys
      if (event.key === 'Enter' || event.key === ' ') {
        if (roving.onActivate) {
          event.preventDefault();
          roving.onActivate(currentItems[currentIndex], currentIndex);
        }
        return;
      }

      // Type-ahead search
      if (
        roving.typeAheadSearch !== false &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const ta = typeAheadRef.current;
        if (ta.timeout) clearTimeout(ta.timeout);
        ta.query += event.key;

        const matchIndex = findTypeAheadMatch(
          currentItems,
          ta.query,
          currentIndex,
        );

        if (matchIndex >= 0) {
          activeIndexRef.current = matchIndex;
          applyRovingTabindex(currentItems, matchIndex);
          currentItems[matchIndex].focus();
          roving.onFocus?.(currentItems[matchIndex], matchIndex);
        }

        // Clear query after 500ms of no typing
        ta.timeout = setTimeout(() => {
          ta.query = '';
        }, 500);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, getItems]);

  // Global shortcuts
  useEffect(() => {
    const shortcuts = optionsRef.current.shortcuts;
    if (!shortcuts || shortcuts.length === 0 || optionsRef.current.enabled === false) {
      return;
    }

    return registerShortcuts(shortcuts);
  }, [options.shortcuts, options.enabled]);

  return {
    activeIndex: activeIndexRef.current,
    setActiveIndex,
    resetFocus,
    getItems,
  };
}

// ============================================================================
// React Hook: useGlobalShortcuts
// ============================================================================

/**
 * React hook to register global keyboard shortcuts.
 *
 * Shortcuts are automatically cleaned up when the component unmounts.
 * Form inputs are excluded by default (except Escape and modifier combos).
 *
 * @example
 * ```tsx
 * function App() {
 *   useGlobalShortcuts([
 *     {
 *       description: 'Open search',
 *       key: '/',
 *       handler: () => setSearchOpen(true),
 *     },
 *     {
 *       description: 'Go to dashboard',
 *       key: 'd',
 *       ctrlOrMeta: true,
 *       handler: () => navigateTo('dashboard'),
 *     },
 *     {
 *       description: 'Show keyboard shortcuts',
 *       key: '?',
 *       shift: true,
 *       handler: () => setShortcutsDialogOpen(true),
 *     },
 *   ]);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useGlobalShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true,
): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled || shortcutsRef.current.length === 0) return;
    return registerShortcuts(shortcutsRef.current);
  }, [enabled]);
}

// ============================================================================
// React Hook: useEscapeKey
// ============================================================================

/**
 * React hook that calls a handler when Escape is pressed.
 *
 * Commonly used for closing modals, drawers, popovers, and overlays.
 * Stops propagation to prevent parent Escape handlers from firing.
 *
 * @example
 * ```tsx
 * function Modal({ onClose }: { onClose: () => void }) {
 *   useEscapeKey(onClose);
 *
 *   return (
 *     <div role="dialog" aria-modal="true">
 *       <h2>Modal Title</h2>
 *       <p>Modal content</p>
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handlerRef.current();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}

// ============================================================================
// Utility: Tab Order Management
// ============================================================================

/**
 * Ensure a logical tab order within a container by
 * setting explicit tabindex values based on DOM order.
 *
 * Useful for dynamically reordered content (drag-and-drop, sorted lists).
 */
export function enforceTabOrder(
  container: HTMLElement,
  selector: string,
): void {
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
  items.forEach((item, index) => {
    // Only set tabindex if the element doesn't already have one explicitly
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', String(index + 1));
    }
  });
}

/**
 * Reset all explicit tabindex values within a container,
 * restoring natural DOM tab order.
 */
export function resetTabOrder(
  container: HTMLElement,
  selector: string,
): void {
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
  items.forEach((item) => {
    item.removeAttribute('tabindex');
  });
}

// ============================================================================
// Utility: ARIA Role Keyboard Patterns
// ============================================================================

/**
 * Standard keyboard patterns for common ARIA roles.
 *
 * Reference for implementing keyboard interaction:
 * - Tabs: Arrow keys to navigate, Enter/Space to activate
 * - Menu: Arrow keys, Enter to select, Escape to close
 * - Listbox: Arrow keys, Enter to select, type-ahead search
 * - Grid: Arrow keys in 2D, Enter to activate cell
 * - Tree: Arrow keys, Left to collapse, Right to expand
 */
export const ARIA_KEYBOARD_PATTERNS: Record<
  string,
  {
    role: string;
    keys: string[];
    description: string;
  }
> = {
  tablist: {
    role: 'tablist',
    keys: ['ArrowLeft', 'ArrowRight', 'Home', 'End'],
    description:
      'Arrow keys navigate tabs; Home/End jump to first/last tab; Enter/Space activates',
  },
  menu: {
    role: 'menu',
    keys: ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'],
    description:
      'Arrow keys navigate items; Enter/Space selects; Escape closes menu',
  },
  listbox: {
    role: 'listbox',
    keys: ['ArrowUp', 'ArrowDown', 'Home', 'End'],
    description:
      'Arrow keys navigate options; Enter/Space selects; Type-ahead search supported',
  },
  grid: {
    role: 'grid',
    keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'],
    description:
      'Arrow keys navigate cells in 2D; Enter/Space activates cell; Home/End jump within row',
  },
  tree: {
    role: 'tree',
    keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'],
    description:
      'Up/Down navigate items; Right expands/enters; Left collapses/exits; Home/End jump to first/last',
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  useKeyboardNav,
  useGlobalShortcuts,
  useEscapeKey,
  registerShortcuts,
  getRegisteredShortcuts,
  handleEscapeKey,
  handleActivationKeys,
  makeKeyboardClickable,
  enforceTabOrder,
  resetTabOrder,
  ARIA_KEYBOARD_PATTERNS,
};
