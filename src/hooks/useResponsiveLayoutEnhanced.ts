/**
 * useResponsiveLayoutEnhanced Hook
 *
 * Enhanced responsive layout detection that extends the base useResponsiveLayout
 * with additional capabilities needed for a mobile-first PWA:
 *
 *   - Breakpoint detection: mobile (< 640), tablet (640-1024), desktop (> 1024)
 *   - Orientation: portrait / landscape with real-time updates
 *   - Safe area insets: notch, home indicator, status bar (CSS env() values)
 *   - Preferred color scheme: light / dark
 *   - Touch device detection
 *   - Viewport dimensions and device pixel ratio
 *   - Virtual keyboard detection (viewport height shrink)
 *
 * This is complementary to the base useResponsiveLayout hook — it provides
 * additional data points that the base hook doesn't cover.
 *
 * Usage:
 *   const layout = useResponsiveLayoutEnhanced();
 *
 *   if (layout.breakpoint === 'mobile') showMobileLayout();
 *   if (layout.isKeyboardOpen) adjustForKeyboard();
 *   if (layout.orientation === 'landscape') adjustForLandscape();
 *   const paddingBottom = layout.safeAreaInsets.bottom + 16;
 */

import { useState, useEffect, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export type Orientation = 'portrait' | 'landscape';

export type ColorScheme = 'light' | 'dark';

export interface SafeAreaInsets {
  /** Top safe area (notch, status bar) in px */
  top: number;
  /** Right safe area in px */
  right: number;
  /** Bottom safe area (home indicator) in px */
  bottom: number;
  /** Left safe area in px */
  left: number;
}

export interface ViewportDimensions {
  /** Viewport width in px */
  width: number;
  /** Viewport height in px */
  height: number;
  /** Device pixel ratio */
  dpr: number;
}

export interface ResponsiveLayoutEnhancedState {
  /** Current breakpoint classification */
  breakpoint: Breakpoint;
  /** Current orientation */
  orientation: Orientation;
  /** Safe area insets for notched devices */
  safeAreaInsets: SafeAreaInsets;
  /** Preferred color scheme */
  colorScheme: ColorScheme;
  /** Whether the device supports touch input */
  isTouchDevice: boolean;
  /** Viewport dimensions and pixel ratio */
  viewport: ViewportDimensions;
  /** Whether the viewport is smaller than the sm breakpoint */
  isMobile: boolean;
  /** Whether the viewport is between sm and lg breakpoints */
  isTablet: boolean;
  /** Whether the viewport is larger than the lg breakpoint */
  isDesktop: boolean;
  /** Whether the keyboard is likely open (viewport height shrunk significantly) */
  isKeyboardOpen: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Breakpoint thresholds in px (matching Tailwind defaults) */
const MOBILE_MAX = 640;
const DESKTOP_MIN = 1024;

/** Keyboard detection: if viewport height shrinks by this ratio, keyboard is likely open */
const KEYBOARD_HEIGHT_RATIO = 0.75;

// ============================================================================
// Helpers
// ============================================================================

function getBreakpoint(width: number): Breakpoint {
  if (width < MOBILE_MAX) return 'mobile';
  if (width < DESKTOP_MIN) return 'tablet';
  return 'desktop';
}

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'portrait';

  if (screen.orientation) {
    return screen.orientation.type.startsWith('portrait') ? 'portrait' : 'landscape';
  }

  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function getColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function getViewport(): ViewportDimensions {
  if (typeof window === 'undefined') {
    return { width: 375, height: 812, dpr: 1 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

/**
 * Read safe area insets from CSS env() via a temporary element.
 */
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top, 0px)',
    'padding-right:env(safe-area-inset-right, 0px)',
    'padding-bottom:env(safe-area-inset-bottom, 0px)',
    'padding-left:env(safe-area-inset-left, 0px)',
  ].join(';');

  document.body.appendChild(el);
  const computed = getComputedStyle(el);

  const insets: SafeAreaInsets = {
    top: parseFloat(computed.paddingTop) || 0,
    right: parseFloat(computed.paddingRight) || 0,
    bottom: parseFloat(computed.paddingBottom) || 0,
    left: parseFloat(computed.paddingLeft) || 0,
  };

  document.body.removeChild(el);
  return insets;
}

// ============================================================================
// Hook
// ============================================================================

export function useResponsiveLayoutEnhanced(): ResponsiveLayoutEnhancedState {
  const [viewport, setViewport] = useState<ViewportDimensions>(getViewport);
  const [orientation, setOrientation] = useState<Orientation>(getOrientation);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getColorScheme);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0, right: 0, bottom: 0, left: 0,
  });
  const [initialHeight, setInitialHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 812,
  );

  const isTouchDevice = useMemo(detectTouchDevice, []);

  // ---- Viewport resize listener ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;

    function handleResize() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setViewport(getViewport());
        setOrientation(getOrientation());
      });
    }

    window.addEventListener('resize', handleResize, { passive: true });

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (vv) {
        vv.removeEventListener('resize', handleResize);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // ---- Orientation change listener ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleOrientationChange() {
      setTimeout(() => {
        setOrientation(getOrientation());
        setViewport(getViewport());
        setSafeAreaInsets(getSafeAreaInsets());
        setInitialHeight(window.innerHeight);
      }, 100);
    }

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // ---- Color scheme listener ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange(e: MediaQueryListEvent) {
      setColorScheme(e.matches ? 'dark' : 'light');
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // ---- Safe area insets (on mount + orientation change) ----
  useEffect(() => {
    setSafeAreaInsets(getSafeAreaInsets());
  }, [orientation]);

  // ---- Update initial height on orientation change for keyboard detection ----
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInitialHeight(window.innerHeight);
  }, [orientation]);

  // ---- Computed values ----
  const breakpoint = useMemo(() => getBreakpoint(viewport.width), [viewport.width]);

  const isKeyboardOpen = useMemo(() => {
    if (!isTouchDevice) return false;
    return viewport.height < initialHeight * KEYBOARD_HEIGHT_RATIO;
  }, [viewport.height, initialHeight, isTouchDevice]);

  return useMemo(
    () => ({
      breakpoint,
      orientation,
      safeAreaInsets,
      colorScheme,
      isTouchDevice,
      viewport,
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      isKeyboardOpen,
    }),
    [breakpoint, orientation, safeAreaInsets, colorScheme, isTouchDevice, viewport, isKeyboardOpen],
  );
}

// ============================================================================
// Standalone utilities
// ============================================================================

/**
 * Get the current breakpoint without using the hook.
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'mobile';
  return getBreakpoint(window.innerWidth);
}

/**
 * Get responsive value based on current breakpoint.
 * Useful for non-React code (e.g., chart configurations).
 *
 *   const padding = getResponsiveValue({ mobile: 16, tablet: 24, desktop: 32 });
 */
export function getResponsiveValue<T>(values: Record<Breakpoint, T>): T {
  const bp = getCurrentBreakpoint();
  return values[bp];
}

/**
 * Check if the viewport matches a media query.
 */
export function matchesMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

export default useResponsiveLayoutEnhanced;
