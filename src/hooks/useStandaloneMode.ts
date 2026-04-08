// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useStandaloneMode
 *
 * Detects if the app is running as an installed PWA.
 * - Checks `display-mode: standalone` media query
 * - Checks `navigator.standalone` (iOS Safari)
 * - Re-evaluates on media query changes
 */

import { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseStandaloneModeReturn {
  /** True if running in standalone display mode (installed PWA) */
  isStandalone: boolean;
  /** Alias for isStandalone (convenience) */
  isPWA: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStandaloneMode(): UseStandaloneModeReturn {
  const [mqStandalone, setMqStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  // iOS Safari standalone flag (doesn't change at runtime)
  const iosStandalone = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return (navigator as unknown as { standalone?: boolean }).standalone === true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(display-mode: standalone)');

    const handleChange = (e: MediaQueryListEvent) => {
      setMqStandalone(e.matches);
    };

    // Modern browsers
    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
    } else if (mql.addListener) {
      // Safari < 14 fallback
      mql.addListener(handleChange);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleChange);
      } else if (mql.removeListener) {
        mql.removeListener(handleChange);
      }
    };
  }, []);

  const isStandalone = mqStandalone || iosStandalone;

  return {
    isStandalone,
    isPWA: isStandalone,
  };
}

export default useStandaloneMode;
