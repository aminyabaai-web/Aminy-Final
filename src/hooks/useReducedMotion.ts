/**
 * Reduced Motion Hook
 *
 * Detects the prefers-reduced-motion: reduce media query and provides
 * a manual toggle for reduced motion mode. Persists the user's
 * preference in localStorage so it survives page reloads.
 *
 * Adds 'reduced-motion' class to <html> when active, which activates
 * the styles in src/styles/reduced-motion.css.
 *
 * Complements the existing usePrefersReducedMotion() in
 * useAccessibilityEnhancements.ts by adding:
 * - Manual toggle support
 * - localStorage persistence
 * - Comprehensive CSS file for animation disabling
 * - Helper to get safe animation duration (0ms when reduced, normal otherwise)
 *
 * WCAG 2.1 compliance:
 * - 2.3.3: Animation from Interactions (users can disable motion)
 *
 * Usage:
 *   const { isReducedMotion, toggleReducedMotion, getAnimationDuration } = useReducedMotion();
 *
 *   <button onClick={toggleReducedMotion}>
 *     {isReducedMotion ? 'Enable animations' : 'Reduce motion'}
 *   </button>
 *
 *   // Safe animation usage:
 *   <motion.div
 *     animate={{ x: 100 }}
 *     transition={{ duration: getAnimationDuration(0.3) }}
 *   />
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'aminy-reduced-motion';
const HTML_CLASS = 'reduced-motion';

// ============================================================================
// Hook
// ============================================================================

export interface UseReducedMotionReturn {
  /** Whether reduced motion is currently active */
  isReducedMotion: boolean;
  /** Toggle reduced motion on/off */
  toggleReducedMotion: () => void;
  /** Explicitly set reduced motion */
  setReducedMotion: (enabled: boolean) => void;
  /** Whether the OS-level prefers-reduced-motion is set */
  systemPrefersReducedMotion: boolean;
  /**
   * Get a safe animation duration.
   * Returns 0 when reduced motion is active, otherwise returns the given value.
   */
  getAnimationDuration: (normalDurationMs: number) => number;
  /**
   * Get safe transition config for motion/react.
   * When reduced motion is active, returns { duration: 0 }.
   * Otherwise returns the provided config or a default.
   */
  getTransitionConfig: (config?: Record<string, unknown>) => Record<string, unknown>;
}

export function useReducedMotion(): UseReducedMotionReturn {
  // Detect OS-level preference
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Read user's manual preference from localStorage (null = follow system)
  const [manualPreference, setManualPreference] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null; // Follow system
  });

  // Computed: is reduced motion active?
  const isReducedMotion = manualPreference !== null
    ? manualPreference
    : systemPrefersReducedMotion;

  // Listen for OS-level changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply/remove the HTML class whenever the state changes
  useEffect(() => {
    document.documentElement.classList.toggle(HTML_CLASS, isReducedMotion);
  }, [isReducedMotion]);

  // Toggle handler
  const toggleReducedMotion = useCallback(() => {
    setManualPreference(prev => {
      const newValue = prev !== null ? !prev : !systemPrefersReducedMotion;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, [systemPrefersReducedMotion]);

  // Explicit set handler
  const setReducedMotion = useCallback((enabled: boolean) => {
    setManualPreference(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, []);

  // Safe animation duration helper
  const getAnimationDuration = useCallback(
    (normalDurationMs: number): number => {
      return isReducedMotion ? 0 : normalDurationMs;
    },
    [isReducedMotion]
  );

  // Safe transition config for motion/react
  const getTransitionConfig = useCallback(
    (config?: Record<string, unknown>): Record<string, unknown> => {
      if (isReducedMotion) {
        return { duration: 0 };
      }
      return config ?? { duration: 0.3 };
    },
    [isReducedMotion]
  );

  return useMemo(
    () => ({
      isReducedMotion,
      toggleReducedMotion,
      setReducedMotion,
      systemPrefersReducedMotion,
      getAnimationDuration,
      getTransitionConfig,
    }),
    [
      isReducedMotion,
      toggleReducedMotion,
      setReducedMotion,
      systemPrefersReducedMotion,
      getAnimationDuration,
      getTransitionConfig,
    ]
  );
}

// ============================================================================
// Standalone utility (for use outside React components)
// ============================================================================

/**
 * Check if reduced motion is active (OS or manual).
 * Can be called from non-React code.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  // Check manual preference first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;

  // Fall back to OS preference
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get a safe animation duration from non-React code.
 */
export function safeAnimationDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs;
}

export default useReducedMotion;
