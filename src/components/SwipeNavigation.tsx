import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface SwipeNavigationProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  disabled?: boolean;
  showIndicators?: boolean;
}

export function SwipeNavigation({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  disabled = false,
  showIndicators = true
}: SwipeNavigationProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSwipingRef = useRef(false);
  const swipeDirection = useRef<'left' | 'right' | null>(null);
  
  useEffect(() => {
    if (disabled) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwipingRef.current = false;
      swipeDirection.current = null;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;
      
      // Determine if horizontal swipe (not vertical scroll)
      if (!isSwipingRef.current && Math.abs(deltaX) > 10) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isSwipingRef.current = true;
          setIsSwiping(true);
          
          // Trigger light haptic on swipe start
          triggerHaptic('light');
        }
      }
      
      if (isSwipingRef.current) {
        // Prevent vertical scrolling during horizontal swipe
        e.preventDefault();
        
        // Apply resistance curve
        const resistedDistance = deltaX * 0.5;
        setSwipeDistance(resistedDistance);
        
        // Determine swipe direction
        if (deltaX > 0 && onSwipeRight) {
          swipeDirection.current = 'right';
          
          // Show indicator when past threshold
          if (Math.abs(resistedDistance) >= threshold && !showRightIndicator) {
            setShowRightIndicator(true);
            triggerHaptic('selection');
          } else if (Math.abs(resistedDistance) < threshold && showRightIndicator) {
            setShowRightIndicator(false);
          }
        } else if (deltaX < 0 && onSwipeLeft) {
          swipeDirection.current = 'left';
          
          // Show indicator when past threshold
          if (Math.abs(resistedDistance) >= threshold && !showLeftIndicator) {
            setShowLeftIndicator(true);
            triggerHaptic('selection');
          } else if (Math.abs(resistedDistance) < threshold && showLeftIndicator) {
            setShowLeftIndicator(false);
          }
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (!isSwipingRef.current) return;
      
      const absDistance = Math.abs(swipeDistance);
      
      // Trigger action if past threshold
      if (absDistance >= threshold) {
        if (swipeDirection.current === 'left' && onSwipeLeft) {
          triggerHaptic('medium');
          onSwipeLeft();
        } else if (swipeDirection.current === 'right' && onSwipeRight) {
          triggerHaptic('medium');
          onSwipeRight();
        }
      }
      
      // Reset state
      setSwipeDistance(0);
      setIsSwiping(false);
      setShowLeftIndicator(false);
      setShowRightIndicator(false);
      isSwipingRef.current = false;
      swipeDirection.current = null;
    };
    
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, threshold, swipeDistance, onSwipeLeft, onSwipeRight, showLeftIndicator, showRightIndicator]);
  
  const progress = Math.min(Math.abs(swipeDistance) / threshold, 1);
  
  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        transform: `translateX(${swipeDistance}px)`,
        transition: isSwipingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Left swipe indicator */}
      {showIndicators && onSwipeLeft && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center pointer-events-none z-50"
          style={{
            width: `${Math.abs(Math.min(swipeDistance, 0))}px`,
            opacity: progress,
            background: 'linear-gradient(90deg, transparent, rgba(8, 145, 178, 0.1))'
          }}
        >
          <div
            className={`p-3 rounded-full transition-all duration-200 ${
              showLeftIndicator
                ? 'bg-accent text-white scale-110'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </div>
        </div>
      )}
      
      {/* Right swipe indicator */}
      {showIndicators && onSwipeRight && (
        <div
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none z-50"
          style={{
            width: `${Math.max(swipeDistance, 0)}px`,
            opacity: progress,
            background: 'linear-gradient(270deg, transparent, rgba(8, 145, 178, 0.1))'
          }}
        >
          <div
            className={`p-3 rounded-full transition-all duration-200 ${
              showRightIndicator
                ? 'bg-accent text-white scale-110'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      )}
      
      {/* Content */}
      {children}
    </div>
  );
}
