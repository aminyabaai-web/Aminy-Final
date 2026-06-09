// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Skeleton Loading Screen Components
 *
 * Provides skeleton loaders for major screen types to improve
 * perceived performance during data fetching.
 */

import React from 'react';

// Base skeleton pulse animation (uses Tailwind animate-pulse)
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#E8E4DF] ${className}`}
      aria-hidden="true"
    />
  );
}

// ---- Screen-specific skeletons ----

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-mist p-4 space-y-4" role="status" aria-label="Loading dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Emotion check-in card */}
      <Skeleton className="h-24 w-full rounded-2xl" />

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      <span className="sr-only">Loading dashboard content...</span>
    </div>
  );
}

export function JuniorSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white p-4 space-y-4" role="status" aria-label="Loading Ease">
      {/* Header */}
      <Skeleton className="h-12 w-full rounded-2xl" />

      {/* Skill tracks */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Activity cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>

      <span className="sr-only">Loading Ease activities...</span>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white" role="status" aria-label="Loading chat">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        <div className="flex justify-start">
          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-2/3 rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-20 w-3/4 rounded-2xl rounded-bl-md" />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>

      <span className="sr-only">Loading conversation...</span>
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="min-h-screen bg-mist p-4 space-y-4" role="status" aria-label="Loading community">
      {/* Search bar */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Filter chips */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      {/* Posts */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}

      <span className="sr-only">Loading community posts...</span>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-mist p-4 space-y-4" role="status" aria-label="Loading settings">
      <Skeleton className="h-8 w-32 mb-6" />

      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      ))}

      <span className="sr-only">Loading settings...</span>
    </div>
  );
}

export function GenericSkeleton() {
  return (
    <div className="min-h-screen bg-mist p-4 space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

/**
 * Get the appropriate skeleton for a screen name
 */
export function getSkeletonForScreen(screenName: string): React.ReactNode {
  switch (screenName) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'junior':
      return <JuniorSkeleton />;
    case 'ask-aminy':
    case 'chat':
      return <ChatSkeleton />;
    case 'community':
    case 'hub':
      return <CommunitySkeleton />;
    case 'settings':
      return <SettingsSkeleton />;
    default:
      return <GenericSkeleton />;
  }
}

export { Skeleton };
export default {
  Dashboard: DashboardSkeleton,
  Junior: JuniorSkeleton,
  Chat: ChatSkeleton,
  Community: CommunitySkeleton,
  Settings: SettingsSkeleton,
  Generic: GenericSkeleton,
};
