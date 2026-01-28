/**
 * Accessibility Utilities
 *
 * Provides utilities for ensuring WCAG 2.1 compliance:
 * - Touch targets: Minimum 44x44px for mobile
 * - ARIA labels and descriptions
 * - Focus management
 * - Keyboard navigation
 * - Screen reader announcements
 */

// ============================================================================
// TOUCH TARGET UTILITIES
// ============================================================================

/**
 * Minimum touch target size in pixels (WCAG 2.1 Level AAA: 44x44px)
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * CSS classes for ensuring minimum touch target size
 * Use these on interactive elements (buttons, links, checkboxes, etc.)
 */
export const touchTargetClasses = {
  // Minimum 44px touch target with visible bounds
  visible: 'min-h-[44px] min-w-[44px]',

  // Invisible expanded touch target (for small visual elements)
  expanded: 'relative before:absolute before:inset-[-8px] before:content-[""]',

  // For inline elements that need larger tap area
  inline: 'py-3 px-3',

  // Mobile-specific (only applies on touch devices)
  mobile: 'touch-action-manipulation sm:min-h-0 sm:min-w-0 min-h-[44px] min-w-[44px]',
};

// ============================================================================
// ARIA UTILITIES
// ============================================================================

/**
 * Generate ARIA props for common patterns
 */
export const ariaProps = {
  /**
   * For buttons with only icons (no visible text)
   */
  iconButton: (label: string) => ({
    'aria-label': label,
    role: 'button',
  }),

  /**
   * For expandable/collapsible sections
   */
  expandable: (isExpanded: boolean, controlsId: string) => ({
    'aria-expanded': isExpanded,
    'aria-controls': controlsId,
  }),

  /**
   * For current navigation item
   */
  currentPage: () => ({
    'aria-current': 'page' as const,
  }),

  /**
   * For live regions that announce updates
   */
  liveRegion: (politeness: 'polite' | 'assertive' = 'polite') => ({
    'aria-live': politeness,
    'aria-atomic': true,
  }),

  /**
   * For elements that describe another element
   */
  describedBy: (id: string) => ({
    'aria-describedby': id,
  }),

  /**
   * For form validation errors
   */
  invalid: (errorId?: string) => ({
    'aria-invalid': true,
    ...(errorId && { 'aria-describedby': errorId }),
  }),

  /**
   * For required form fields
   */
  required: () => ({
    'aria-required': true,
    required: true,
  }),

  /**
   * For loading states
   */
  loading: (isLoading: boolean) => ({
    'aria-busy': isLoading,
  }),

  /**
   * For dialogs/modals
   */
  dialog: (labelId: string, descriptionId?: string) => ({
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': labelId,
    ...(descriptionId && { 'aria-describedby': descriptionId }),
  }),

  /**
   * For tabs
   */
  tab: (isSelected: boolean, controlsId: string) => ({
    role: 'tab' as const,
    'aria-selected': isSelected,
    'aria-controls': controlsId,
    tabIndex: isSelected ? 0 : -1,
  }),

  /**
   * For tab panels
   */
  tabPanel: (labelledById: string) => ({
    role: 'tabpanel' as const,
    'aria-labelledby': labelledById,
  }),

  /**
   * For progress indicators
   */
  progress: (value: number, max: number = 100, label?: string) => ({
    role: 'progressbar' as const,
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    ...(label && { 'aria-label': label }),
  }),
};

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Focus trap utility for modals and dialogs
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  const getFocusableElements = () =>
    container.querySelectorAll<HTMLElement>(focusableSelectors.join(','));

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  const focusable = getFocusableElements();
  focusable[0]?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Skip link component data
 */
export const skipLinkTargets = {
  mainContent: 'main-content',
  navigation: 'main-navigation',
  search: 'search-input',
  footer: 'main-footer',
};

// ============================================================================
// SCREEN READER UTILITIES
// ============================================================================

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Visually hidden class (for screen readers only)
 */
export const srOnlyClass = 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Handle arrow key navigation for lists/menus
 */
export function handleArrowKeyNavigation(
  e: React.KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  orientation: 'horizontal' | 'vertical' = 'vertical'
) {
  const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

  if (e.key === prevKey) {
    e.preventDefault();
    const newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    items[newIndex]?.focus();
    return newIndex;
  }

  if (e.key === nextKey) {
    e.preventDefault();
    const newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    items[newIndex]?.focus();
    return newIndex;
  }

  if (e.key === 'Home') {
    e.preventDefault();
    items[0]?.focus();
    return 0;
  }

  if (e.key === 'End') {
    e.preventDefault();
    items[items.length - 1]?.focus();
    return items.length - 1;
  }

  return currentIndex;
}

// ============================================================================
// MOTION PREFERENCES
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on motion preferences
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

// ============================================================================
// COLOR CONTRAST
// ============================================================================

/**
 * Ensure text has sufficient contrast against background
 * Returns appropriate text color class
 */
export function getContrastTextColor(bgLuminance: number): string {
  // Use white text for dark backgrounds, black for light
  return bgLuminance < 0.5 ? 'text-white' : 'text-neutral-900';
}

// ============================================================================
// COMPONENT LABELS
// ============================================================================

/**
 * Common ARIA labels for app-wide consistency
 */
export const commonLabels = {
  // Navigation
  mainNav: 'Main navigation',
  breadcrumb: 'Breadcrumb navigation',
  pagination: 'Pagination navigation',

  // Actions
  close: 'Close',
  dismiss: 'Dismiss',
  expand: 'Expand',
  collapse: 'Collapse',
  menu: 'Open menu',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  refresh: 'Refresh',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  submit: 'Submit',

  // Status
  loading: 'Loading',
  loadingMore: 'Loading more',
  noResults: 'No results found',
  error: 'Error occurred',

  // Chat
  sendMessage: 'Send message',
  newChat: 'Start new chat',
  chatHistory: 'Chat history',

  // User actions
  userProfile: 'User profile',
  userMenu: 'User menu',
  notifications: 'Notifications',
  settings: 'Settings',
  logout: 'Log out',
};

export default {
  touchTargetClasses,
  ariaProps,
  createFocusTrap,
  skipLinkTargets,
  announceToScreenReader,
  srOnlyClass,
  handleArrowKeyNavigation,
  prefersReducedMotion,
  getAnimationDuration,
  commonLabels,
};
