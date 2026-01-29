/**
 * ARIA Utilities Module
 *
 * Comprehensive accessibility utilities for screen readers and assistive technologies.
 * Provides live region announcements, role helpers, and ARIA attribute generators.
 */

// ============================================================================
// Live Region Management
// ============================================================================

let liveRegion: HTMLElement | null = null;
let politeRegion: HTMLElement | null = null;

/**
 * Initialize live regions for screen reader announcements
 */
export function initializeLiveRegions(): void {
  if (typeof document === 'undefined') return;

  // Create assertive live region (for urgent messages)
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'alert');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'aria-live-assertive';
    document.body.appendChild(liveRegion);
  }

  // Create polite live region (for status updates)
  if (!politeRegion) {
    politeRegion = document.createElement('div');
    politeRegion.setAttribute('role', 'status');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    politeRegion.id = 'aria-live-polite';
    document.body.appendChild(politeRegion);
  }
}

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  initializeLiveRegions();

  const region = priority === 'assertive' ? liveRegion : politeRegion;
  if (!region) return;

  // Clear and set message to trigger announcement
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/**
 * Announce loading state changes
 */
export function announceLoading(isLoading: boolean, context?: string): void {
  if (isLoading) {
    announce(`Loading ${context || 'content'}. Please wait.`, 'polite');
  } else {
    announce(`${context || 'Content'} loaded.`, 'polite');
  }
}

/**
 * Announce navigation changes
 */
export function announceNavigation(destination: string): void {
  announce(`Navigated to ${destination}`, 'polite');
}

/**
 * Announce form validation errors
 */
export function announceError(error: string): void {
  announce(`Error: ${error}`, 'assertive');
}

/**
 * Announce success messages
 */
export function announceSuccess(message: string): void {
  announce(message, 'polite');
}

// ============================================================================
// ARIA Attribute Helpers
// ============================================================================

export interface ButtonAriaProps {
  label: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  haspopup?: 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid' | true;
  describedby?: string;
  disabled?: boolean;
}

/**
 * Generate ARIA attributes for a button
 */
export function getButtonAria(props: ButtonAriaProps): Record<string, string | boolean | undefined> {
  return {
    'aria-label': props.label,
    'aria-pressed': props.pressed,
    'aria-expanded': props.expanded,
    'aria-controls': props.controls,
    'aria-haspopup': props.haspopup,
    'aria-describedby': props.describedby,
    'aria-disabled': props.disabled,
  };
}

export interface ToggleAriaProps {
  label: string;
  pressed: boolean;
  describedby?: string;
}

/**
 * Generate ARIA attributes for a toggle button
 */
export function getToggleAria(props: ToggleAriaProps): Record<string, string | boolean> {
  return {
    'aria-label': props.label,
    'aria-pressed': props.pressed,
    ...(props.describedby && { 'aria-describedby': props.describedby }),
  };
}

export interface ExpandableAriaProps {
  label: string;
  expanded: boolean;
  controls: string;
}

/**
 * Generate ARIA attributes for expandable content triggers
 */
export function getExpandableAria(props: ExpandableAriaProps): Record<string, string | boolean> {
  return {
    'aria-label': props.label,
    'aria-expanded': props.expanded,
    'aria-controls': props.controls,
  };
}

export interface DialogAriaProps {
  labelledby: string;
  describedby?: string;
  modal?: boolean;
}

/**
 * Generate ARIA attributes for dialogs/modals
 */
export function getDialogAria(props: DialogAriaProps): Record<string, string | boolean> {
  return {
    role: 'dialog',
    'aria-labelledby': props.labelledby,
    'aria-modal': props.modal ?? true,
    ...(props.describedby && { 'aria-describedby': props.describedby }),
  };
}

export interface FeedAriaProps {
  label: string;
  busy?: boolean;
  itemCount?: number;
}

/**
 * Generate ARIA attributes for a feed (like social posts)
 */
export function getFeedAria(props: FeedAriaProps): Record<string, string | boolean | number | undefined> {
  return {
    role: 'feed',
    'aria-label': props.label,
    'aria-busy': props.busy,
    ...(props.itemCount !== undefined && { 'aria-setsize': props.itemCount }),
  };
}

export interface ArticleAriaProps {
  label?: string;
  posinset?: number;
  setsize?: number;
}

/**
 * Generate ARIA attributes for feed articles
 */
export function getArticleAria(props: ArticleAriaProps): Record<string, string | number | undefined> {
  return {
    role: 'article',
    ...(props.label && { 'aria-label': props.label }),
    ...(props.posinset !== undefined && { 'aria-posinset': props.posinset }),
    ...(props.setsize !== undefined && { 'aria-setsize': props.setsize }),
  };
}

export interface MenuAriaProps {
  label: string;
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Generate ARIA attributes for menus
 */
export function getMenuAria(props: MenuAriaProps): Record<string, string> {
  return {
    role: 'menu',
    'aria-label': props.label,
    'aria-orientation': props.orientation || 'vertical',
  };
}

export interface TablistAriaProps {
  label: string;
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Generate ARIA attributes for tab lists
 */
export function getTablistAria(props: TablistAriaProps): Record<string, string> {
  return {
    role: 'tablist',
    'aria-label': props.label,
    'aria-orientation': props.orientation || 'horizontal',
  };
}

export interface TabAriaProps {
  label: string;
  selected: boolean;
  controls: string;
}

/**
 * Generate ARIA attributes for individual tabs
 */
export function getTabAria(props: TabAriaProps): Record<string, string | boolean> {
  return {
    role: 'tab',
    'aria-label': props.label,
    'aria-selected': props.selected,
    'aria-controls': props.controls,
    tabIndex: props.selected ? 0 : -1,
  };
}

export interface TabPanelAriaProps {
  labelledby: string;
  hidden?: boolean;
}

/**
 * Generate ARIA attributes for tab panels
 */
export function getTabPanelAria(props: TabPanelAriaProps): Record<string, string | boolean | undefined> {
  return {
    role: 'tabpanel',
    'aria-labelledby': props.labelledby,
    'aria-hidden': props.hidden,
    tabIndex: 0,
  };
}

// ============================================================================
// Chat/Message Accessibility
// ============================================================================

export interface ChatLogAriaProps {
  label: string;
  busy?: boolean;
}

/**
 * Generate ARIA attributes for a chat log
 */
export function getChatLogAria(props: ChatLogAriaProps): Record<string, string | boolean | undefined> {
  return {
    role: 'log',
    'aria-label': props.label,
    'aria-live': 'polite',
    'aria-relevant': 'additions',
    'aria-busy': props.busy,
  };
}

export interface MessageAriaProps {
  author: string;
  timestamp: string;
  isOwn?: boolean;
}

/**
 * Generate ARIA label for a chat message
 */
export function getMessageAriaLabel(props: MessageAriaProps): string {
  const direction = props.isOwn ? 'You said' : `${props.author} said`;
  return `${direction} at ${props.timestamp}`;
}

// ============================================================================
// Form Accessibility
// ============================================================================

export interface FormFieldAriaProps {
  label: string;
  required?: boolean;
  invalid?: boolean;
  errorId?: string;
  describedby?: string;
}

/**
 * Generate ARIA attributes for form fields
 */
export function getFormFieldAria(props: FormFieldAriaProps): Record<string, string | boolean | undefined> {
  const describedByIds = [props.describedby, props.invalid ? props.errorId : undefined]
    .filter(Boolean)
    .join(' ');

  return {
    'aria-label': props.label,
    'aria-required': props.required,
    'aria-invalid': props.invalid,
    ...(describedByIds && { 'aria-describedby': describedByIds }),
  };
}

export interface ComboboxAriaProps {
  label: string;
  expanded: boolean;
  controls: string;
  activedescendant?: string;
  autocomplete?: 'list' | 'both' | 'inline' | 'none';
}

/**
 * Generate ARIA attributes for combobox inputs
 */
export function getComboboxAria(props: ComboboxAriaProps): Record<string, string | boolean | undefined> {
  return {
    role: 'combobox',
    'aria-label': props.label,
    'aria-expanded': props.expanded,
    'aria-controls': props.controls,
    'aria-haspopup': 'listbox',
    'aria-autocomplete': props.autocomplete || 'list',
    ...(props.activedescendant && { 'aria-activedescendant': props.activedescendant }),
  };
}

// ============================================================================
// Progress and Loading
// ============================================================================

export interface ProgressAriaProps {
  label: string;
  value?: number;
  min?: number;
  max?: number;
  valuetext?: string;
}

/**
 * Generate ARIA attributes for progress indicators
 */
export function getProgressAria(props: ProgressAriaProps): Record<string, string | number | undefined> {
  return {
    role: 'progressbar',
    'aria-label': props.label,
    'aria-valuenow': props.value,
    'aria-valuemin': props.min ?? 0,
    'aria-valuemax': props.max ?? 100,
    'aria-valuetext': props.valuetext,
  };
}

// ============================================================================
// Image and Media
// ============================================================================

/**
 * Generate appropriate alt text based on image context
 */
export function getImageAlt(
  context: 'avatar' | 'decorative' | 'informative' | 'post',
  details?: { name?: string; description?: string }
): string {
  switch (context) {
    case 'avatar':
      return details?.name ? `${details.name}'s profile picture` : 'User avatar';
    case 'decorative':
      return ''; // Decorative images should have empty alt
    case 'informative':
      return details?.description || 'Image';
    case 'post':
      return details?.description || 'Post attachment image';
    default:
      return 'Image';
  }
}

// ============================================================================
// Landmark Helpers
// ============================================================================

export type LandmarkRole =
  | 'banner'
  | 'navigation'
  | 'main'
  | 'complementary'
  | 'contentinfo'
  | 'search'
  | 'form'
  | 'region';

export interface LandmarkAriaProps {
  role: LandmarkRole;
  label: string;
}

/**
 * Generate ARIA attributes for landmarks
 */
export function getLandmarkAria(props: LandmarkAriaProps): Record<string, string> {
  return {
    role: props.role,
    'aria-label': props.label,
  };
}

// ============================================================================
// Screen Reader Only Text
// ============================================================================

/**
 * CSS class for visually hidden but screen-reader accessible content
 */
export const srOnlyClass = 'sr-only';

/**
 * Generate screen-reader only span element markup
 */
export function getSrOnlyText(text: string): string {
  return `<span class="sr-only">${text}</span>`;
}

// ============================================================================
// Focus Management Utilities
// ============================================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Trap focus within a container (for modals)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Live regions
  initializeLiveRegions,
  announce,
  announceLoading,
  announceNavigation,
  announceError,
  announceSuccess,

  // ARIA helpers
  getButtonAria,
  getToggleAria,
  getExpandableAria,
  getDialogAria,
  getFeedAria,
  getArticleAria,
  getMenuAria,
  getTablistAria,
  getTabAria,
  getTabPanelAria,
  getChatLogAria,
  getMessageAriaLabel,
  getFormFieldAria,
  getComboboxAria,
  getProgressAria,
  getImageAlt,
  getLandmarkAria,

  // Utilities
  srOnlyClass,
  getSrOnlyText,
  getFocusableElements,
  trapFocus,
};
