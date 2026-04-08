// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Pull-to-Refresh Hook
 *
 * Provides native-like pull-to-refresh functionality for mobile web.
 * Uses touch events with a configurable threshold and resistance curve.
 *
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { isPulling, isRefreshing, pullDistance, canRefresh } =
 *     usePullToRefresh(containerRef, { onRefresh: async () => { ... } });
 *
 * Pair with PullToRefreshIndicator for the visual spinner.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PullToRefreshOptions {
  /** Async callback invoked when the pull threshold is reached and released */
  onRefresh: () => Promise<void>;
  /** Distance in px (after resistance) to pull before triggering (default: 60) */
  threshold?: number;
  /** Maximum allowed pull distance in px (default: 100) */
  maxPull?: number;
  /** Disable the hook entirely */
  disabled?: boolean;
  /** Resistance factor — higher = harder to pull (default: 2.5) */
  resistance?: number;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

// ============================================================================
// Standalone detection — skip pull-to-refresh if native behavior is active
// ============================================================================

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  options: PullToRefreshOptions,
) {
  const {
    onRefresh,
    threshold = 60,
    maxPull = 100,
    disabled = false,
    resistance = 2.5,
  } = options;

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false,
  });

  const touchStartY = useRef(0);
  const isPullingRef = useRef(false);

  // Determine if we should be active
  // In standalone PWA on iOS, the browser itself handles pull-to-refresh,
  // so we skip our custom implementation to avoid double-firing.
  const isDisabled = disabled || (isStandalonePWA() && /iPhone|iPad|iPod/.test(navigator.userAgent));

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isDisabled || state.isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only activate when scrolled to top
      if (container.scrollTop > 0) return;

      touchStartY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    },
    [isDisabled, state.isRefreshing, containerRef],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPullingRef.current || isDisabled || state.isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // If the user has scrolled down since touchstart, bail out
      if (container.scrollTop > 0) {
        isPullingRef.current = false;
        setState((prev) => ({ ...prev, isPulling: false, pullDistance: 0 }));
        return;
      }

      const rawDistance = e.touches[0].clientY - touchStartY.current;

      // Only handle downward pull
      if (rawDistance <= 0) {
        setState((prev) => ({ ...prev, isPulling: false, pullDistance: 0 }));
        return;
      }

      // Apply resistance curve
      const pullDistance = Math.min(rawDistance / resistance, maxPull);
      const canRefresh = pullDistance >= threshold;

      // Prevent native scroll when we're pulling
      if (pullDistance > 0) {
        e.preventDefault();
      }

      setState({
        isPulling: true,
        isRefreshing: false,
        pullDistance,
        canRefresh,
      });
    },
    [isDisabled, state.isRefreshing, containerRef, threshold, maxPull, resistance],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (state.canRefresh && !state.isRefreshing) {
      setState((prev) => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold, // Hold at threshold during refresh animation
      }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false,
        });
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        canRefresh: false,
      });
    }
  }, [state.canRefresh, state.isRefreshing, onRefresh, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isDisabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, isDisabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}

// ============================================================================
// Simple Hook Version (creates its own ref)
// ============================================================================

export function useSimplePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const state = usePullToRefresh(containerRef, { onRefresh });

  return {
    containerRef,
    ...state,
  };
}

export default usePullToRefresh;
