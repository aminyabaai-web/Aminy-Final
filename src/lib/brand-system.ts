/**
 * Aminy Brand System
 *
 * Premium branding inspired by Calm and Headspace apps.
 * Gentle, calming, professional - reducing stress through design.
 *
 * Core Brand Values:
 * - Gentle: Soft colors, rounded shapes, calm animations
 * - Trustworthy: Professional typography, consistent spacing
 * - Empowering: Clear hierarchy, actionable design
 * - Warm: Human touches, encouraging language
 */

// ============================================
// COLOR SYSTEM
// ============================================

export const brandColors = {
  // Primary - Teal (trust, calm, growth)
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Main primary
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // Secondary - Violet (wisdom, creativity)
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // Accent - Warm (encouragement, celebration)
  accent: {
    amber: '#f59e0b',
    rose: '#f43f5e',
    pink: '#ec4899',
  },

  // Neutrals - Warm grays
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Special
  background: '#fafaf9',
  surface: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'Manrope, system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },

  // Font sizes (mobile-first)
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================
// SPACING & LAYOUT
// ============================================

export const spacing = {
  // Base unit: 4px
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.625rem',  // 10px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem', // 24px
  full: '9999px',
};

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  // Soft, warm shadows (not harsh)
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.1)',

  // Glow effects for interactive elements
  glow: {
    teal: '0 0 20px rgba(20, 184, 166, 0.15)',
    violet: '0 0 20px rgba(139, 92, 246, 0.15)',
    amber: '0 0 20px rgba(245, 158, 11, 0.15)',
  },

  // Inner shadows for depth
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
};

// ============================================
// ANIMATIONS
// ============================================

export const animations = {
  // Durations
  duration: {
    instant: '75ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },

  // Easings (gentle, organic movements)
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },

  // Keyframes for common animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeInUp: {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    scaleIn: {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    breathe: {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.02)' },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.7 },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
  },
};

// ============================================
// COMPONENT STYLES
// ============================================

export const components = {
  // Cards
  card: {
    base: 'bg-white rounded-xl border border-neutral-200/60 shadow-sm',
    hover: 'hover:shadow-md hover:border-neutral-300/60 transition-all duration-300',
    interactive: 'cursor-pointer active:scale-[0.99]',
    gradient: {
      teal: 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200/60',
      violet: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200/60',
      amber: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/60',
      pink: 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200/60',
    },
  },

  // Buttons
  button: {
    base: 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizes: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    },
    variants: {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md',
      secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-500',
      outline: 'border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500',
      ghost: 'text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-500',
      success: 'bg-success text-white hover:bg-green-600 focus:ring-green-500',
    },
  },

  // Inputs
  input: {
    base: 'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500/20',
  },

  // Badges
  badge: {
    base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    variants: {
      neutral: 'bg-neutral-100 text-neutral-700',
      primary: 'bg-primary-100 text-primary-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      error: 'bg-red-100 text-red-700',
      info: 'bg-blue-100 text-blue-700',
    },
  },
};

// ============================================
// BRAND VOICE & COPY
// ============================================

export const brandVoice = {
  // Tone principles
  tone: {
    warm: 'Speak like a trusted friend, not a medical professional',
    encouraging: 'Celebrate small wins, acknowledge challenges',
    clear: 'Use simple language, avoid jargon',
    calm: 'Never use urgent or stressful language',
    empowering: 'Focus on what parents CAN do, not what they should do',
  },

  // Common phrases
  phrases: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    encouragement: [
      'You\'re doing great',
      'Every step counts',
      'Progress, not perfection',
      'You\'ve got this',
      'One day at a time',
    ],
    loading: [
      'Getting things ready...',
      'Just a moment...',
      'Preparing your view...',
    ],
    success: [
      'All set!',
      'Done!',
      'Success!',
      'Got it!',
    ],
  },

  // Taglines
  taglines: {
    primary: 'Gentle guidance. Meaningful progress.',
    secondary: 'Your partner in the parenting journey.',
    marketplace: 'Expert guides for your family\'s journey.',
  },
};

// ============================================
// LOGO USAGE
// ============================================

export const logoGuidelines = {
  // Minimum clear space (based on compass icon height)
  clearSpace: 'Equal to the height of the compass icon',

  // Minimum sizes
  minimumSize: {
    digital: '24px height',
    print: '12mm height',
  },

  // Approved color combinations
  colorCombinations: [
    { background: 'white', logo: 'full-color' },
    { background: 'neutral-50', logo: 'full-color' },
    { background: 'primary-500', logo: 'white' },
    { background: 'neutral-900', logo: 'white' },
  ],

  // Don'ts
  donts: [
    'Don\'t rotate the logo',
    'Don\'t change the proportions',
    'Don\'t add effects (shadows, gradients)',
    'Don\'t place on busy backgrounds',
    'Don\'t use low-contrast colors',
  ],
};

// ============================================
// ACCESSIBILITY
// ============================================

export const accessibility = {
  // Minimum contrast ratios
  contrast: {
    normalText: 4.5,
    largeText: 3,
    uiComponents: 3,
  },

  // Touch target sizes
  touchTarget: {
    minimum: '44px',
    recommended: '48px',
  },

  // Focus states
  focus: {
    outline: '2px solid currentColor',
    outlineOffset: '2px',
    ring: 'ring-2 ring-primary-500 ring-offset-2',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return brandVoice.phrases.greeting.morning;
  if (hour < 17) return brandVoice.phrases.greeting.afternoon;
  return brandVoice.phrases.greeting.evening;
}

export function getRandomEncouragement(): string {
  const phrases = brandVoice.phrases.encouragement;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function getGradientForCondition(condition: string): string {
  const gradients: Record<string, string> = {
    'autism': 'from-teal-50 to-cyan-50',
    'adhd': 'from-violet-50 to-purple-50',
    'anxiety': 'from-blue-50 to-indigo-50',
    'sensory-processing': 'from-orange-50 to-amber-50',
    'default': 'from-neutral-50 to-stone-50',
  };
  return gradients[condition] || gradients.default;
}

export function getColorForProvider(type: string): string {
  const colors: Record<string, string> = {
    'bcba': 'teal',
    'rbt': 'blue',
    'lpc': 'violet',
    'lcsw': 'pink',
    'slp': 'green',
    'ot': 'orange',
    'psychiatrist': 'red',
    'pediatrician': 'cyan',
  };
  return colors[type] || 'neutral';
}
