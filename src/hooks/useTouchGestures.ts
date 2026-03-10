/**
 * useTouchGestures Hook
 *
 * Recognizes common touch gestures for mobile-first interaction:
 *   - Swipe left/right for screen navigation
 *   - Pull-to-refresh on scrollable content
 *   - Pinch-to-zoom on images and charts
 *   - Long-press for context menus
 *
 * Sensory mode integration:
 *   - When sensory mode is active (CSS class on <html>), complex gestures
 *     (pinch, long-press) are disabled to reduce accidental triggers
 *   - Swipe threshold is increased in sensory mode for deliberate intent
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useTouchGestures(ref, {
 *     onSwipeLeft: () => navigateForward(),
 *     onSwipeRight: () => navigateBack(),
 *     onPullRefresh: async () => { await refetchData(); },
 *     onLongPress: (x, y) => showContextMenu(x, y),
 *     onPinchZoom: (scale) => setZoomLevel(scale),
 *   });
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TouchGestureHandlers {
  /** Fired on left swipe (finger moves right-to-left) */
  onSwipeLeft?: () => void;
  /** Fired on right swipe (finger moves left-to-right) */
  onSwipeRight?: () => void;
  /** Fired on upward swipe */
  onSwipeUp?: () => void;
  /** Fired on downward swipe */
  onSwipeDown?: () => void;
  /** Fired on pull-to-refresh (pull down at scroll top). Return a promise for loading state. */
  onPullRefresh?: () => void | Promise<void>;
  /** Fired on long press. Receives the touch coordinates. */
  onLongPress?: (x: number, y: number) => void;
  /** Fired during pinch-to-zoom. Receives the scale factor (1.0 = no zoom). */
  onPinchZoom?: (scale: number) => void;
  /** Fired when pinch zoom ends. Receives the final scale. */
  onPinchEnd?: (finalScale: number) => void;
}

export interface TouchGestureOptions extends TouchGestureHandlers {
  /** Minimum swipe distance in px (default: 50, sensory mode: 80) */
  swipeThreshold?: number;
  /** Maximum swipe duration in ms (default: 300) */
  swipeMaxDuration?: number;
  /** Minimum swipe velocity in px/ms (default: 0.3) */
  swipeMinVelocity?: number;
  /** Long press duration in ms (default: 500) */
  longPressDuration?: number;
  /** Whether gestures are enabled (default: true) */
  enabled?: boolean;
  /** Whether to prevent default touch behavior on recognized gestures */
  preventDefault?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SWIPE_THRESHOLD = 50;
const SENSORY_SWIPE_THRESHOLD = 80;
const DEFAULT_SWIPE_MAX_DURATION = 300;
const DEFAULT_SWIPE_MIN_VELOCITY = 0.3;
const DEFAULT_LONG_PRESS_DURATION = 500;

/** Maximum movement allowed during a long press (px) */
const LONG_PRESS_MAX_MOVE = 10;

/** Pull-to-refresh: minimum pull distance before triggering */
const PULL_REFRESH_THRESHOLD = 60;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if sensory mode is active by looking for CSS classes on <html>.
 */
function isSensoryModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.classList.contains('sensory-muted-colors') ||
    root.classList.contains('sensory-enlarge-targets') ||
    root.classList.contains('sensory-reduce-text')
  );
}

/**
 * Check if reduced motion is active.
 */
function isReducedMotionActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('reduced-motion');
}

/**
 * Get the distance between two touch points.
 */
function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if the element or its ancestors are scrollable and not at scroll top.
 */
function isScrolledContent(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.scrollTop > 0) return true;
    current = current.parentElement;
  }
  return false;
}

// ============================================================================
// Hook
// ============================================================================

export function useTouchGestures(
  ref: React.RefObject<HTMLElement | null>,
  options: TouchGestureOptions = {},
): void {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPullRefresh,
    onLongPress,
    onPinchZoom,
    onPinchEnd,
    swipeThreshold: customSwipeThreshold,
    swipeMaxDuration = DEFAULT_SWIPE_MAX_DURATION,
    swipeMinVelocity = DEFAULT_SWIPE_MIN_VELOCITY,
    longPressDuration = DEFAULT_LONG_PRESS_DURATION,
    enabled = true,
    preventDefault: shouldPreventDefault = false,
  } = options;

  // Store handlers in refs to avoid re-attaching listeners
  const handlersRef = useRef(options);
  handlersRef.current = options;

  // Touch tracking state
  const touchStartRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const currentPinchScaleRef = useRef(1);
  const isPullingRef = useRef(false);
  const isSwiping = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    function getSwipeThreshold(): number {
      if (customSwipeThreshold !== undefined) return customSwipeThreshold;
      return isSensoryModeActive() ? SENSORY_SWIPE_THRESHOLD : DEFAULT_SWIPE_THRESHOLD;
    }

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      isSwiping.current = false;
      isPullingRef.current = false;

      // ---- Long press detection ----
      if (
        handlersRef.current.onLongPress &&
        e.touches.length === 1 &&
        !isSensoryModeActive() // Disable long press in sensory mode
      ) {
        clearLongPressTimer();
        const startX = touch.clientX;
        const startY = touch.clientY;

        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          handlersRef.current.onLongPress?.(startX, startY);

          // Haptic feedback via vibration API
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, longPressDuration);
      }

      // ---- Pinch detection setup ----
      if (e.touches.length === 2 && !isSensoryModeActive()) {
        initialPinchDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
        currentPinchScaleRef.current = 1;
        clearLongPressTimer();
      }
    }

    function handleTouchMove(e: TouchEvent) {
      const start = touchStartRef.current;
      if (!start) return;

      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Cancel long press if finger moved too far
      if (absDx > LONG_PRESS_MAX_MOVE || absDy > LONG_PRESS_MAX_MOVE) {
        clearLongPressTimer();
      }

      // ---- Pull-to-refresh ----
      if (
        handlersRef.current.onPullRefresh &&
        e.touches.length === 1 &&
        dy > 0 &&
        !isScrolledContent(e.target as HTMLElement)
      ) {
        isPullingRef.current = true;
        if (shouldPreventDefault && dy > PULL_REFRESH_THRESHOLD) {
          e.preventDefault();
        }
      }

      // ---- Pinch-to-zoom ----
      if (
        e.touches.length === 2 &&
        initialPinchDistanceRef.current !== null &&
        handlersRef.current.onPinchZoom &&
        !isSensoryModeActive()
      ) {
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialPinchDistanceRef.current;
        currentPinchScaleRef.current = scale;
        handlersRef.current.onPinchZoom(scale);

        if (shouldPreventDefault) {
          e.preventDefault();
        }
      }

      // Mark as swiping if threshold met
      if (absDx > 10 || absDy > 10) {
        isSwiping.current = true;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      clearLongPressTimer();

      const start = touchStartRef.current;
      touchStartRef.current = null;

      // ---- Pinch end ----
      if (initialPinchDistanceRef.current !== null) {
        if (handlersRef.current.onPinchEnd && currentPinchScaleRef.current !== 1) {
          handlersRef.current.onPinchEnd(currentPinchScaleRef.current);
        }
        initialPinchDistanceRef.current = null;
        currentPinchScaleRef.current = 1;
        return;
      }

      if (!start) return;

      const endTime = Date.now();
      const duration = endTime - start.time;

      // Use changedTouches for the end position (touches is empty at touchend)
      const endTouch = e.changedTouches[0];
      if (!endTouch) return;

      const dx = endTouch.clientX - start.x;
      const dy = endTouch.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // ---- Pull-to-refresh ----
      if (isPullingRef.current && dy > PULL_REFRESH_THRESHOLD) {
        isPullingRef.current = false;
        handlersRef.current.onPullRefresh?.();
        return;
      }
      isPullingRef.current = false;

      // ---- Swipe detection ----
      const threshold = getSwipeThreshold();

      // Must exceed threshold and be within time limit
      if (duration > swipeMaxDuration) return;

      const velocity = Math.max(absDx, absDy) / duration;
      if (velocity < swipeMinVelocity) return;

      // Determine primary direction
      if (absDx > absDy && absDx >= threshold) {
        // Horizontal swipe
        if (shouldPreventDefault) {
          e.preventDefault();
        }

        if (dx < 0) {
          handlersRef.current.onSwipeLeft?.();
        } else {
          handlersRef.current.onSwipeRight?.();
        }
      } else if (absDy > absDx && absDy >= threshold) {
        // Vertical swipe
        if (shouldPreventDefault) {
          e.preventDefault();
        }

        if (dy < 0) {
          handlersRef.current.onSwipeUp?.();
        } else {
          handlersRef.current.onSwipeDown?.();
        }
      }
    }

    function handleTouchCancel() {
      clearLongPressTimer();
      touchStartRef.current = null;
      initialPinchDistanceRef.current = null;
      currentPinchScaleRef.current = 1;
      isPullingRef.current = false;
      isSwiping.current = false;
    }

    // Passive: false is needed for preventDefault in touchmove
    const passiveOption = shouldPreventDefault ? { passive: false } : { passive: true };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, passiveOption);
    element.addEventListener('touchend', handleTouchEnd, passiveOption);
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
      clearLongPressTimer();
    };
  }, [
    ref,
    enabled,
    customSwipeThreshold,
    swipeMaxDuration,
    swipeMinVelocity,
    longPressDuration,
    shouldPreventDefault,
    clearLongPressTimer,
  ]);
}

// ============================================================================
// Standalone utilities
// ============================================================================

/**
 * Check if the device supports touch events.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Check if the device supports the Vibration API (for haptic feedback).
 */
export function supportsVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Get the recommended touch target size based on sensory mode.
 * Returns size in pixels.
 */
export function getMinTouchTargetSize(): number {
  const sensoryActive = isSensoryModeActive();
  const reducedMotion = isReducedMotionActive();

  // WCAG 2.5.5 Level AAA: 44x44px minimum
  // Sensory mode: 55x55px (44 * 1.25)
  if (sensoryActive) return 55;
  if (reducedMotion) return 48;
  return 44;
}

export default useTouchGestures;
