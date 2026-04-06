// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useResponsiveLayout
 *
 * Detects device type based on viewport width and exposes layout helpers.
 * - phone:   < 768px  (1 column)
 * - tablet:  768-1024px (2 columns)
 * - desktop: > 1024px (3 columns)
 *
 * Uses matchMedia listeners for real-time updates without resize polling.
 */

import { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface UseResponsiveLayoutReturn {
  /** Current device classification */
  deviceType: DeviceType;
  /** True when viewport < 768px */
  isPhone: boolean;
  /** True when viewport 768-1024px */
  isTablet: boolean;
  /** True when viewport > 1024px */
  isDesktop: boolean;
  /** Recommended grid column count: 1 (phone), 2 (tablet), 3 (desktop) */
  columns: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

const TABLET_MIN = 768;
const DESKTOP_MIN = 1025;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'phone';
  const w = window.innerWidth;
  if (w >= DESKTOP_MIN) return 'desktop';
  if (w >= TABLET_MIN) return 'tablet';
  return 'phone';
}

function columnsFor(type: DeviceType): 1 | 2 | 3 {
  switch (type) {
    case 'desktop':
      return 3;
    case 'tablet':
      return 2;
    default:
      return 1;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useResponsiveLayout(): UseResponsiveLayoutReturn {
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqTablet = window.matchMedia(`(min-width: ${TABLET_MIN}px)`);
    const mqDesktop = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);

    const update = () => {
      setDeviceType(getDeviceType());
    };

    // Listen for breakpoint crossings
    if (mqTablet.addEventListener) {
      mqTablet.addEventListener('change', update);
      mqDesktop.addEventListener('change', update);
    } else {
      mqTablet.addListener(update);
      mqDesktop.addListener(update);
    }

    return () => {
      if (mqTablet.removeEventListener) {
        mqTablet.removeEventListener('change', update);
        mqDesktop.removeEventListener('change', update);
      } else {
        mqTablet.removeListener(update);
        mqDesktop.removeListener(update);
      }
    };
  }, []);

  const result = useMemo(
    (): UseResponsiveLayoutReturn => ({
      deviceType,
      isPhone: deviceType === 'phone',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      columns: columnsFor(deviceType),
    }),
    [deviceType],
  );

  return result;
}

export default useResponsiveLayout;
