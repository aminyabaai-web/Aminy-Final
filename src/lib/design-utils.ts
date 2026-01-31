/**
 * Design Utilities
 * Consistent design patterns and utilities for the Aminy app
 *
 * Use these utilities to ensure consistent styling across the app
 * rather than hardcoding colors and patterns.
 */

// =============================================================================
// FOCUS STATES
// =============================================================================

/**
 * Standard focus ring classes for interactive elements
 * Use with buttons, links, inputs, and other clickable elements
 */
export const focusRing = {
  /** Standard focus ring for buttons and interactive elements */
  default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-600',
  /** Focus ring for inputs */
  input: 'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-cyan-600/20 focus:border-cyan-600',
  /** Focus ring for cards/containers */
  card: 'focus-within:ring-2 focus-within:ring-cyan-600/20',
  /** Subtle focus for secondary elements */
  subtle: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50',
};

// =============================================================================
// SHADOW SYSTEM
// =============================================================================

/**
 * Shadow classes for elevation and depth
 * Use these instead of mixing shadow classes inconsistently
 */
export const shadows = {
  /** No shadow - flat elements */
  none: 'shadow-none',
  /** Subtle shadow for cards at rest */
  card: 'shadow-sm hover:shadow-md transition-shadow',
  /** Elevated shadow for hover states */
  elevated: 'shadow-md hover:shadow-lg transition-shadow',
  /** Strong shadow for modals and overlays */
  modal: 'shadow-xl',
  /** Maximum elevation for dropdowns and popovers */
  dropdown: 'shadow-2xl',
  /** Floating button shadow */
  float: 'shadow-lg hover:shadow-xl transition-shadow',
};

// =============================================================================
// BRAND COLORS
// =============================================================================

/**
 * Brand color classes - use these instead of hardcoded hex values
 */
export const colors = {
  // Background colors
  bg: {
    page: 'bg-[#F5F5F5] dark:bg-slate-900',
    card: 'bg-white dark:bg-slate-800',
    elevated: 'bg-white dark:bg-slate-700',
    accent: 'bg-cyan-600',
    accentLight: 'bg-cyan-50 dark:bg-cyan-900/20',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-amber-50 dark:bg-amber-900/20',
    error: 'bg-red-50 dark:bg-red-900/20',
  },
  // Text colors
  text: {
    primary: 'text-slate-900 dark:text-white',
    secondary: 'text-slate-600 dark:text-slate-300',
    muted: 'text-slate-400 dark:text-slate-500',
    accent: 'text-cyan-600 dark:text-cyan-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
  },
  // Border colors
  border: {
    default: 'border-slate-200 dark:border-slate-700',
    subtle: 'border-slate-100 dark:border-slate-800',
    accent: 'border-cyan-600 dark:border-cyan-500',
  },
};

// =============================================================================
// SPACING SCALE
// =============================================================================

/**
 * Standard spacing scale (based on 4px grid)
 * Use these class names for consistent spacing
 */
export const spacing = {
  /** 4px - micro spacing */
  xs: 'p-1',
  /** 8px - tight spacing */
  sm: 'p-2',
  /** 12px - default card padding */
  md: 'p-3',
  /** 16px - comfortable card padding */
  lg: 'p-4',
  /** 24px - section padding */
  xl: 'p-6',
  /** 32px - page-level spacing */
  '2xl': 'p-8',
};

// =============================================================================
// INTERACTIVE ELEMENT PATTERNS
// =============================================================================

/**
 * Button pattern classes
 * Combines colors, shadows, and focus states
 */
export const button = {
  primary: `
    bg-cyan-600 text-white
    hover:bg-cyan-700
    active:scale-[0.98]
    ${focusRing.default}
    disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed
    transition-all duration-150
  `.trim().replace(/\s+/g, ' '),

  secondary: `
    bg-white text-slate-700 border border-slate-200
    hover:bg-slate-50 hover:border-slate-300
    active:scale-[0.98]
    ${focusRing.default}
    disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
    transition-all duration-150
  `.trim().replace(/\s+/g, ' '),

  outline: `
    bg-transparent text-cyan-600 border-2 border-cyan-600
    hover:bg-cyan-50
    active:scale-[0.98]
    ${focusRing.default}
    disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed
    transition-all duration-150
  `.trim().replace(/\s+/g, ' '),

  ghost: `
    bg-transparent text-slate-600
    hover:bg-slate-100
    active:scale-[0.98]
    ${focusRing.subtle}
    disabled:text-gray-400 disabled:cursor-not-allowed
    transition-all duration-150
  `.trim().replace(/\s+/g, ' '),
};

/**
 * Card pattern classes
 */
export const card = {
  default: `
    ${colors.bg.card}
    ${colors.border.default}
    border rounded-xl
    ${shadows.card}
  `.trim().replace(/\s+/g, ' '),

  interactive: `
    ${colors.bg.card}
    ${colors.border.default}
    border rounded-xl
    ${shadows.card}
    cursor-pointer
    hover:${colors.border.accent}
    ${focusRing.card}
    transition-all duration-150
  `.trim().replace(/\s+/g, ' '),

  elevated: `
    ${colors.bg.elevated}
    rounded-xl
    ${shadows.elevated}
  `.trim().replace(/\s+/g, ' '),
};

/**
 * Input pattern classes
 */
export const input = {
  default: `
    w-full px-4 py-3
    ${colors.bg.card}
    ${colors.border.default}
    border rounded-xl
    ${colors.text.primary}
    placeholder:${colors.text.muted}
    ${focusRing.input}
    disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
    transition-colors duration-150
  `.trim().replace(/\s+/g, ' '),
};

// =============================================================================
// UTILITY FUNCTION
// =============================================================================

/**
 * Combines class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default {
  focusRing,
  shadows,
  colors,
  spacing,
  button,
  card,
  input,
  cn,
};
