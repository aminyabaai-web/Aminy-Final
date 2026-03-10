/**
 * PullToRefreshIndicator
 *
 * Visual feedback for pull-to-refresh gesture. Renders an animated
 * spinner/arrow that tracks the pull distance from usePullToRefresh.
 *
 * Usage:
 *   <PullToRefreshIndicator
 *     pullDistance={pullDistance}
 *     isRefreshing={isRefreshing}
 *     canRefresh={canRefresh}
 *     threshold={60}
 *   />
 *
 * Place this at the top of the scrollable container (before content).
 */

import React from 'react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  canRefresh,
  threshold = 60,
}: PullToRefreshIndicatorProps) {
  // Only render when actively pulling or refreshing
  if (pullDistance <= 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180; // Arrow rotates as user pulls

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
      style={{
        height: isRefreshing ? threshold : pullDistance,
      }}
      aria-hidden="true"
    >
      <div
        className="flex items-center justify-center"
        style={{
          opacity: Math.min(progress * 1.5, 1),
          transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
        }}
      >
        {isRefreshing ? (
          // Spinning loader during refresh
          <svg
            className="h-6 w-6 animate-spin text-cyan-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 018-8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          // Arrow that flips when threshold is reached
          <svg
            className={`h-6 w-6 transition-colors duration-150 ${
              canRefresh ? 'text-cyan-600' : 'text-gray-400'
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default PullToRefreshIndicator;
