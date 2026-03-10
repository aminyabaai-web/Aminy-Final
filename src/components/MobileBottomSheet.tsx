/**
 * MobileBottomSheet Component
 *
 * A mobile-first bottom sheet with touch-driven drag interaction:
 *   - Three snap points: peek (25%), half (50%), full (90%)
 *   - Drag-to-expand/collapse with velocity-based snapping
 *   - Backdrop with blur effect
 *   - Touch-friendly drag handle
 *   - Keyboard avoidance (shifts up when keyboard opens)
 *   - Sensory mode support (reduced motion, enlarged targets)
 *
 * Usage:
 *   <MobileBottomSheet
 *     isOpen={showSheet}
 *     snapPoint="half"
 *     onClose={() => setShowSheet(false)}
 *     title="Select an option"
 *   >
 *     <div>Sheet content here</div>
 *   </MobileBottomSheet>
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export type SnapPoint = 'peek' | 'half' | 'full' | 'closed';

export interface MobileBottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Initial snap point when opened (default: 'half') */
  snapPoint?: SnapPoint;
  /** Called when the user closes the sheet (drag down past threshold or backdrop tap) */
  onClose: () => void;
  /** Called when the snap point changes */
  onSnapPointChange?: (snapPoint: SnapPoint) => void;
  /** Optional title shown in the sheet header */
  title?: string;
  /** Sheet content */
  children: ReactNode;
  /** Whether the backdrop should blur (default: true) */
  backdropBlur?: boolean;
  /** Whether to show the drag handle (default: true) */
  showDragHandle?: boolean;
  /** Whether tapping the backdrop closes the sheet (default: true) */
  closeOnBackdropTap?: boolean;
  /** Whether dragging down past peek closes the sheet (default: true) */
  closeOnDragDown?: boolean;
  /** Custom z-index for the sheet (default: 50) */
  zIndex?: number;
  /** Additional CSS class for the sheet container */
  className?: string;
}

interface TouchState {
  startY: number;
  startTranslate: number;
  currentTranslate: number;
  isDragging: boolean;
  startTime: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Snap point positions as percentage of viewport height from top */
const SNAP_POSITIONS: Record<SnapPoint, number> = {
  full: 0.1,   // 10% from top = 90% visible
  half: 0.5,   // 50% from top = 50% visible
  peek: 0.75,  // 75% from top = 25% visible
  closed: 1.0, // 100% from top = hidden
};

/** Minimum drag distance to trigger a snap change (px) */
const DRAG_THRESHOLD = 50;

/** Minimum velocity to trigger snap change (px/ms) */
const VELOCITY_THRESHOLD = 0.5;

/** Animation duration in ms (0 in reduced motion) */
const ANIMATION_DURATION = 300;

/** How much extra keyboard height to add as padding (px) */
const KEYBOARD_PADDING = 16;

// ============================================================================
// Helpers
// ============================================================================

function isReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('reduced-motion');
}

function isSensoryModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.classList.contains('sensory-muted-colors') ||
    root.classList.contains('sensory-enlarge-targets')
  );
}

/**
 * Get the closest snap point to a given position.
 */
function getClosestSnap(
  position: number,
  velocity: number,
  currentSnap: SnapPoint,
  allowClose: boolean,
): SnapPoint {
  const snaps: SnapPoint[] = allowClose
    ? ['full', 'half', 'peek', 'closed']
    : ['full', 'half', 'peek'];

  // If velocity is high, snap in the direction of movement
  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    const currentIdx = snaps.indexOf(currentSnap);
    if (velocity > 0 && currentIdx < snaps.length - 1) {
      // Dragging down
      return snaps[currentIdx + 1];
    }
    if (velocity < 0 && currentIdx > 0) {
      // Dragging up
      return snaps[currentIdx - 1];
    }
  }

  // Otherwise, snap to closest position
  let closestSnap: SnapPoint = 'half';
  let closestDistance = Infinity;

  for (const snap of snaps) {
    const distance = Math.abs(position - SNAP_POSITIONS[snap]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestSnap = snap;
    }
  }

  return closestSnap;
}

// ============================================================================
// Component
// ============================================================================

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  snapPoint: initialSnapPoint = 'half',
  onClose,
  onSnapPointChange,
  title,
  children,
  backdropBlur = true,
  showDragHandle = true,
  closeOnBackdropTap = true,
  closeOnDragDown = true,
  zIndex = 50,
  className = '',
}) => {
  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(initialSnapPoint);
  const [translateY, setTranslateY] = useState<number>(100); // percentage
  const [isAnimating, setIsAnimating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<TouchState>({
    startY: 0,
    startTranslate: 0,
    currentTranslate: 0,
    isDragging: false,
    startTime: 0,
  });

  const animDuration = isReducedMotion() ? 0 : ANIMATION_DURATION;

  // ---- Open/close handling ----
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateToSnap(initialSnapPoint);
        });
      });
    } else {
      animateToSnap('closed');
      // Hide after animation
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, animDuration + 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---- Keyboard detection ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) return;

    function handleResize() {
      if (!vv) return;
      const heightDiff = window.innerHeight - vv.height;
      if (heightDiff > 100) {
        // Keyboard is open
        setKeyboardHeight(heightDiff + KEYBOARD_PADDING);
      } else {
        setKeyboardHeight(0);
      }
    }

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  // ---- Prevent body scroll when sheet is open ----
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ---- Animation ----
  const animateToSnap = useCallback((snap: SnapPoint) => {
    const position = SNAP_POSITIONS[snap] * 100;
    setIsAnimating(true);
    setTranslateY(position);
    setCurrentSnap(snap);

    if (snap !== currentSnap) {
      onSnapPointChange?.(snap);
    }

    if (snap === 'closed') {
      onClose();
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, animDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animDuration, onClose, onSnapPointChange]);

  // ---- Touch handlers ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStateRef.current = {
      startY: touch.clientY,
      startTranslate: translateY,
      currentTranslate: translateY,
      isDragging: true,
      startTime: Date.now(),
    };
    setIsAnimating(false);
  }, [translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = touchStateRef.current;
    if (!state.isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - state.startY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newTranslate = Math.max(
      SNAP_POSITIONS.full * 100,
      Math.min(100, state.startTranslate + deltaPercent),
    );

    state.currentTranslate = newTranslate;
    setTranslateY(newTranslate);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const state = touchStateRef.current;
    if (!state.isDragging) return;
    state.isDragging = false;

    const duration = Date.now() - state.startTime;
    const deltaY = state.currentTranslate - state.startTranslate;
    const velocity = deltaY / Math.max(duration, 1); // percent/ms

    const position = state.currentTranslate / 100;
    const newSnap = getClosestSnap(
      position,
      velocity,
      currentSnap,
      closeOnDragDown,
    );

    animateToSnap(newSnap);
  }, [currentSnap, closeOnDragDown, animateToSnap]);

  // ---- Backdrop click ----
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdropTap) {
      animateToSnap('closed');
    }
  }, [closeOnBackdropTap, animateToSnap]);

  // ---- Snap point buttons (for programmatic control) ----
  const snapTo = useCallback((snap: SnapPoint) => {
    if (snap === 'closed') {
      onClose();
    }
    animateToSnap(snap);
  }, [animateToSnap, onClose]);

  // ---- Styles ----
  const sheetStyle = useMemo((): React.CSSProperties => ({
    transform: `translateY(${translateY}%)`,
    transition: isAnimating ? `transform ${animDuration}ms cubic-bezier(0.32, 0.72, 0, 1)` : 'none',
    paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
    zIndex: zIndex + 1,
  }), [translateY, isAnimating, animDuration, keyboardHeight, zIndex]);

  const backdropStyle = useMemo((): React.CSSProperties => ({
    opacity: isOpen && translateY < 100 ? Math.max(0, 1 - translateY / 100) : 0,
    transition: `opacity ${animDuration}ms ease`,
    zIndex,
  }), [isOpen, translateY, animDuration, zIndex]);

  // ---- Handle size for sensory mode ----
  const handleSize = isSensoryModeActive() ? 'w-16 h-2' : 'w-12 h-1.5';

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0"
        style={backdropStyle}
        onClick={handleBackdropClick}
        aria-hidden="true"
      >
        <div
          className={`absolute inset-0 bg-black/50 ${backdropBlur ? 'backdrop-blur-sm' : ''}`}
        />
      </div>

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Bottom sheet'}
        className={`fixed inset-x-0 top-0 h-full ${className}`}
        style={sheetStyle}
      >
        <div className="h-full flex flex-col bg-white rounded-t-2xl shadow-2xl overflow-hidden">
          {/* Drag Handle Area */}
          <div
            className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {showDragHandle && (
              <div className="flex justify-center">
                <div
                  className={`${handleSize} rounded-full bg-gray-300`}
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Title */}
            {title && (
              <div className="px-4 pt-2 pb-1">
                <h2 className="text-lg font-semibold text-gray-900 text-center">
                  {title}
                </h2>
              </div>
            )}
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe"
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// Hook for programmatic control
// ============================================================================

export interface UseBottomSheetReturn {
  /** Whether the sheet is currently open */
  isOpen: boolean;
  /** Current snap point */
  snapPoint: SnapPoint;
  /** Open the sheet at a specific snap point */
  open: (snap?: SnapPoint) => void;
  /** Close the sheet */
  close: () => void;
  /** Snap to a specific point */
  snapTo: (snap: SnapPoint) => void;
  /** Toggle the sheet open/closed */
  toggle: () => void;
}

/**
 * Hook for managing bottom sheet state.
 *
 *   const sheet = useBottomSheet();
 *
 *   <button onClick={() => sheet.open('half')}>Open Sheet</button>
 *   <MobileBottomSheet
 *     isOpen={sheet.isOpen}
 *     snapPoint={sheet.snapPoint}
 *     onClose={sheet.close}
 *     onSnapPointChange={(snap) => sheet.snapTo(snap)}
 *   >
 *     Content
 *   </MobileBottomSheet>
 */
export function useBottomSheet(defaultSnap: SnapPoint = 'half'): UseBottomSheetReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [snapPoint, setSnapPoint] = useState<SnapPoint>(defaultSnap);

  const open = useCallback((snap?: SnapPoint) => {
    setSnapPoint(snap ?? defaultSnap);
    setIsOpen(true);
  }, [defaultSnap]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSnapPoint('closed');
  }, []);

  const snapTo = useCallback((snap: SnapPoint) => {
    if (snap === 'closed') {
      close();
    } else {
      setSnapPoint(snap);
    }
  }, [close]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return { isOpen, snapPoint, open, close, snapTo, toggle };
}

export default MobileBottomSheet;
