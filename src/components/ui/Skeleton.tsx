// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

'use client';

/**
 * Skeleton Loading Components
 *
 * Provides consistent loading states across the app with smooth animations.
 * Matches the visual structure of actual content for reduced perceived loading time.
 */

import React from 'react';

// ============================================================================
// Base Skeleton
// ============================================================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
  style: styleProp,
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const style: React.CSSProperties = { ...styleProp };
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gray-200 dark:bg-slate-700
        ${roundedClasses[rounded]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  );
}

// ============================================================================
// Text Skeletons
// ============================================================================

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export function SkeletonText({
  lines = 3,
  className = '',
  lastLineWidth = '60%',
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
}

export function SkeletonHeading({
  className = '',
  width = '60%',
}: {
  className?: string;
  width?: string;
}) {
  return <Skeleton height={28} width={width} rounded="md" className={className} />;
}

// ============================================================================
// Card Skeletons
// ============================================================================

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        <Skeleton width={48} height={48} rounded="full" />
        <div className="flex-1">
          <Skeleton height={20} width="70%" className="mb-2" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonMetricCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton height={14} width={80} />
        <Skeleton width={32} height={32} rounded="lg" />
      </div>
      <Skeleton height={32} width="50%" className="mb-2" />
      <Skeleton height={12} width="30%" />
    </div>
  );
}

// ============================================================================
// List Skeletons
// ============================================================================

interface SkeletonListProps {
  items?: number;
  className?: string;
  itemClassName?: string;
}

export function SkeletonList({
  items = 5,
  className = '',
  itemClassName = '',
}: SkeletonListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 ${itemClassName}`}
        >
          <Skeleton width={40} height={40} rounded="lg" />
          <div className="flex-1">
            <Skeleton height={16} width="60%" className="mb-2" />
            <Skeleton height={12} width="40%" />
          </div>
          <Skeleton width={60} height={24} rounded="lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonListItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Skeleton width={40} height={40} rounded="lg" />
      <div className="flex-1">
        <Skeleton height={16} width="60%" className="mb-2" />
        <Skeleton height={12} width="40%" />
      </div>
    </div>
  );
}

// ============================================================================
// Table Skeleton
// ============================================================================

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
  showHeader = true,
}: SkeletonTableProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {showHeader && (
        <div className="flex gap-4 p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={14} width={`${100 / columns - 2}%`} />
          ))}
        </div>
      )}
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                height={16}
                width={colIdx === 0 ? '30%' : `${70 / (columns - 1)}%`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Form Skeletons
// ============================================================================

export function SkeletonInput({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton height={14} width={80} className="mb-2" />
      <Skeleton height={44} width="100%" rounded="lg" />
    </div>
  );
}

export function SkeletonForm({ fields = 3, className = '' }: { fields?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonInput key={i} />
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton height={44} width={120} rounded="lg" />
        <Skeleton height={44} width={100} rounded="lg" />
      </div>
    </div>
  );
}

// ============================================================================
// Avatar & Image Skeletons
// ============================================================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  return <Skeleton width={sizes[size]} height={sizes[size]} rounded="full" className={className} />;
}

export function SkeletonImage({
  aspectRatio = '16/9',
  className = '',
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ aspectRatio }}>
      <Skeleton width="100%" height="100%" rounded="lg" className="absolute inset-0" />
    </div>
  );
}

// ============================================================================
// Chart Skeleton
// ============================================================================

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton height={24} width={150} />
        <div className="flex gap-2">
          <Skeleton height={32} width={80} rounded="lg" />
          <Skeleton height={32} width={80} rounded="lg" />
        </div>
      </div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              height={`${Math.random() * 60 + 20}%`}
              width="100%"
              rounded="sm"
              animate={false}
              className="bg-gray-200 dark:bg-slate-700"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={12} width={40} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Dashboard Skeleton
// ============================================================================

export function SkeletonDashboard({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={16} width={300} />
        </div>
        <div className="flex gap-3">
          <Skeleton height={40} width={120} rounded="lg" />
          <Skeleton height={40} width={100} rounded="lg" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>

      {/* Chart and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonList items={3} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Skeleton
// ============================================================================

export function SkeletonChatMessage({
  isUser = false,
  className = '',
}: {
  isUser?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} ${className}`}>
      <SkeletonAvatar size="sm" />
      <div className={`max-w-[70%] ${isUser ? 'items-end' : ''}`}>
        <Skeleton
          height={60}
          width={isUser ? 200 : 280}
          rounded="xl"
          className={isUser ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''}
        />
        <Skeleton height={10} width={60} className="mt-2" />
      </div>
    </div>
  );
}

export function SkeletonChat({ messages = 5, className = '' }: { messages?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: messages }).map((_, i) => (
        <SkeletonChatMessage key={i} isUser={i % 2 === 1} />
      ))}
    </div>
  );
}

// ============================================================================
// Profile Skeleton
// ============================================================================

export function SkeletonProfile({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-6">
        <SkeletonAvatar size="xl" />
        <div className="flex-1">
          <Skeleton height={28} width={180} className="mb-2" />
          <Skeleton height={16} width={120} />
        </div>
        <Skeleton height={40} width={100} rounded="lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SkeletonInput />
        <SkeletonInput />
      </div>
      <SkeletonText lines={4} />
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export const Skeletons = {
  Base: Skeleton,
  Text: SkeletonText,
  Heading: SkeletonHeading,
  Card: SkeletonCard,
  MetricCard: SkeletonMetricCard,
  List: SkeletonList,
  ListItem: SkeletonListItem,
  Table: SkeletonTable,
  Input: SkeletonInput,
  Form: SkeletonForm,
  Avatar: SkeletonAvatar,
  Image: SkeletonImage,
  Chart: SkeletonChart,
  Dashboard: SkeletonDashboard,
  ChatMessage: SkeletonChatMessage,
  Chat: SkeletonChat,
  Profile: SkeletonProfile,
};

export default Skeleton;
