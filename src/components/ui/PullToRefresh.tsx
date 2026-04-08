// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

'use client';

/**
 * Pull-to-Refresh Component
 *
 * Wrapper component that adds pull-to-refresh functionality to any scrollable content.
 * Provides a native-like experience on mobile devices.
 */

import React, { useRef } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

// ============================================================================
// Types
// ============================================================================

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  indicatorColor?: string;
  backgroundColor?: string;
}

// ============================================================================
// Spinner Component
// ============================================================================

function RefreshSpinner({
  progress,
  isRefreshing,
  color = 'text-indigo-600',
}: {
  progress: number;
  isRefreshing: boolean;
  color?: string;
}) {
  const size = 24;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${isRefreshing ? 'animate-spin' : ''}`} style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute inset-0" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Progress circle */}
      <svg
        className={`absolute inset-0 ${color}`}
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={isRefreshing ? 0 : offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            transition: isRefreshing ? 'none' : 'stroke-dashoffset 0.1s ease-out',
          }}
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Arrow Icon
// ============================================================================

function ArrowIcon({ rotation }: { rotation: number }) {
  return (
    <svg
      className="w-5 h-5 text-gray-500 transition-transform duration-200"
      style={{ transform: `rotate(${rotation}deg)` }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PullToRefresh({
  children,
  onRefresh,
  className = '',
  threshold = 80,
  maxPull = 120,
  disabled = false,
  indicatorColor = 'text-indigo-600',
  backgroundColor = 'bg-gray-50 dark:bg-slate-900',
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { isPulling, isRefreshing, pullDistance, canRefresh } = usePullToRefresh(
    containerRef,
    { onRefresh, threshold, maxPull, disabled }
  );

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const indicatorOffset = Math.min(pullDistance, maxPull);
  const showIndicator = isPulling || isRefreshing;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Pull indicator */}
      <div
        className={`
          absolute left-0 right-0 flex items-center justify-center
          ${backgroundColor}
          transition-transform duration-200 ease-out
          ${showIndicator ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          height: maxPull,
          top: -maxPull,
          transform: `translateY(${indicatorOffset}px)`,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {isRefreshing ? (
            <RefreshSpinner progress={100} isRefreshing={true} color={indicatorColor} />
          ) : (
            <>
              {progress < 100 ? (
                <RefreshSpinner progress={progress} isRefreshing={false} color={indicatorColor} />
              ) : (
                <ArrowIcon rotation={canRefresh ? 180 : 0} />
              )}
            </>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isRefreshing
              ? 'Refreshing...'
              : canRefresh
              ? 'Release to refresh'
              : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain"
        style={{
          transform: showIndicator ? `translateY(${indicatorOffset}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Simpler Inline Refresh Trigger
// ============================================================================

interface RefreshTriggerProps {
  onRefresh: () => Promise<void>;
  children?: React.ReactNode;
  className?: string;
}

export function RefreshTrigger({
  onRefresh,
  children,
  className = '',
}: RefreshTriggerProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        inline-flex items-center gap-2 text-sm
        ${isRefreshing ? 'opacity-50 cursor-wait' : 'hover:opacity-70'}
        ${className}
      `}
    >
      <svg
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {children || (isRefreshing ? 'Refreshing...' : 'Refresh')}
    </button>
  );
}

export default PullToRefresh;
