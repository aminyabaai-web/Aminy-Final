/**
 * Pull-to-Refresh Hook
 *
 * Provides native-like pull-to-refresh functionality for mobile web.
 * Works with touch events and provides smooth animations.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distance to pull before triggering (default: 80)
  maxPull?: number; // Maximum pull distance (default: 120)
  disabled?: boolean;
  resistance?: number; // Resistance factor (default: 2.5)
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  options: PullToRefreshOptions
) {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 120,
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
  const touchCurrentY = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop > 0) return;

    touchStartY.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [disabled, state.isRefreshing, containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || disabled || state.isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Don't interfere with scrolling
    if (container.scrollTop > 0) {
      isPullingRef.current = false;
      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0 }));
      return;
    }

    touchCurrentY.current = e.touches[0].clientY;
    const rawDistance = touchCurrentY.current - touchStartY.current;

    // Only handle downward pull
    if (rawDistance <= 0) {
      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0 }));
      return;
    }

    // Apply resistance
    const pullDistance = Math.min(rawDistance / resistance, maxPull);
    const canRefresh = pullDistance >= threshold;

    // Prevent default scroll behavior when pulling
    if (pullDistance > 0) {
      e.preventDefault();
    }

    setState({
      isPulling: true,
      isRefreshing: false,
      pullDistance,
      canRefresh,
    });
  }, [disabled, state.isRefreshing, containerRef, threshold, maxPull, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;

    isPullingRef.current = false;

    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold, // Hold at threshold during refresh
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
    if (!container) return;

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
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}

// ============================================================================
// Simple Hook Version
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
