// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * High Contrast Mode Hook
 *
 * Detects the prefers-contrast: more media query and provides a manual
 * toggle for high contrast mode. Persists the user's preference in
 * localStorage so it survives page reloads.
 *
 * Adds 'high-contrast' class to <html> when active, which activates
 * the styles in src/styles/high-contrast.css.
 *
 * Complements the existing usePrefersHighContrast() in
 * useAccessibilityEnhancements.ts by adding:
 * - Manual toggle support
 * - localStorage persistence
 * - Comprehensive CSS file for high contrast overrides
 *
 * Usage:
 *   const { isHighContrast, toggleHighContrast, setHighContrast } = useHighContrast();
 *
 *   <button onClick={toggleHighContrast}>
 *     {isHighContrast ? 'Normal contrast' : 'High contrast'}
 *   </button>
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'aminy-high-contrast';
const HTML_CLASS = 'high-contrast';

// ============================================================================
// Hook
// ============================================================================

export interface UseHighContrastReturn {
  /** Whether high contrast mode is currently active */
  isHighContrast: boolean;
  /** Toggle high contrast mode on/off */
  toggleHighContrast: () => void;
  /** Explicitly set high contrast mode */
  setHighContrast: (enabled: boolean) => void;
  /** Whether the OS-level prefers-contrast is set */
  systemPrefersHighContrast: boolean;
}

export function useHighContrast(): UseHighContrastReturn {
  // Detect OS-level preference
  const [systemPrefersHighContrast, setSystemPrefersHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
  });

  // Read user's manual preference from localStorage (null = follow system)
  const [manualPreference, setManualPreference] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null; // Follow system
  });

  // Computed: is high contrast active?
  const isHighContrast = manualPreference !== null
    ? manualPreference
    : systemPrefersHighContrast;

  // Listen for OS-level changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-contrast: more)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersHighContrast(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply/remove the HTML class whenever the state changes
  useEffect(() => {
    document.documentElement.classList.toggle(HTML_CLASS, isHighContrast);
  }, [isHighContrast]);

  // Toggle handler
  const toggleHighContrast = useCallback(() => {
    setManualPreference(prev => {
      const newValue = prev !== null ? !prev : !systemPrefersHighContrast;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, [systemPrefersHighContrast]);

  // Explicit set handler
  const setHighContrast = useCallback((enabled: boolean) => {
    setManualPreference(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, []);

  return {
    isHighContrast,
    toggleHighContrast,
    setHighContrast,
    systemPrefersHighContrast,
  };
}

export default useHighContrast;
