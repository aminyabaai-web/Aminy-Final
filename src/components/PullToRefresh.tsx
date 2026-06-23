// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 120,
  disabled = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  
  useEffect(() => {
    if (disabled) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh at top of scroll
      const container = containerRef.current;
      if (!container) return;
      
      const isAtTop = container.scrollTop === 0;
      if (isAtTop && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = true;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;
      
      // Only pull down
      if (distance > 0) {
        // Prevent default scrolling while pulling
        e.preventDefault();
        
        // Apply resistance curve (slower as you pull further)
        const resistedDistance = Math.min(
          distance * 0.4, // 40% resistance
          maxPullDistance
        );
        
        setPullDistance(resistedDistance);
        
        // Trigger selection haptic at threshold
        if (resistedDistance >= threshold && !canRefresh) {
          setCanRefresh(true);
          triggerHaptic('selection');
        } else if (resistedDistance < threshold && canRefresh) {
          setCanRefresh(false);
        }
      }
    };
    
    const handleTouchEnd = async () => {
      if (!isDragging.current) return;
      
      isDragging.current = false;
      
      if (pullDistance >= threshold && !isRefreshing) {
        // Trigger refresh
        setIsRefreshing(true);
        triggerHaptic('medium');
        
        try {
          await onRefresh();
          triggerHaptic('success');
        } catch (error) {
          triggerHaptic('error');
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setCanRefresh(false);
        }
      }
      
      // Animate back to 0
      setPullDistance(0);
      setCanRefresh(false);
    };
    
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, pullDistance, threshold, maxPullDistance, isRefreshing, canRefresh, onRefresh]);
  
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;
  
  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      style={pullDistance > 0 || isRefreshing ? {
        transform: `translateY(${pullDistance}px)`,
        transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      } : undefined}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          opacity: Math.min(progress, 1),
          transform: `translateY(-${pullDistance}px)`
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className={`p-2 rounded-full transition-all duration-200 ${
              canRefresh
                ? 'bg-accent text-white scale-110'
                : 'bg-[#F0EDE8] text-[#8A9BA8]'
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isDragging.current
                ? 'background-color 0.2s, color 0.2s, transform 0.1s'
                : 'background-color 0.2s, color 0.2s'
            }}
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </div>
          {canRefresh && (
            <p className="text-sm font-medium text-[#5A6B7A]">
              Release to refresh
            </p>
          )}
          {!canRefresh && pullDistance > 20 && (
            <p className="text-sm font-medium text-[#8A9BA8]">
              Pull to refresh
            </p>
          )}
        </div>
      </div>
      
      {/* Content */}
      {children}
    </div>
  );
}
