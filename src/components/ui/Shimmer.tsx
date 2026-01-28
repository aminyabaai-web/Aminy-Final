/**
 * Premium Loading Shimmers
 * Elegant skeleton loading states that feel premium
 *
 * Usage:
 * <Shimmer variant="card" />
 * <Shimmer variant="text" lines={3} />
 * <ShimmerDashboard />
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'image' | 'stat' | 'chart';
  lines?: number;
  width?: string;
  height?: string;
}

// Base shimmer animation component
const ShimmerBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative overflow-hidden rounded-md bg-slate-200/80 dark:bg-slate-700/50',
      'before:absolute before:inset-0',
      'before:-translate-x-full before:animate-[shimmer_2s_infinite]',
      'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
      'dark:before:via-slate-500/20',
      className
    )}
    {...props}
  />
));
ShimmerBase.displayName = 'ShimmerBase';

export function Shimmer({
  className,
  variant = 'text',
  lines = 1,
  width,
  height
}: ShimmerProps) {
  switch (variant) {
    case 'avatar':
      return (
        <ShimmerBase
          className={cn('h-10 w-10 rounded-full', className)}
          style={{ width, height }}
        />
      );

    case 'button':
      return (
        <ShimmerBase
          className={cn('h-10 w-24 rounded-lg', className)}
          style={{ width, height }}
        />
      );

    case 'image':
      return (
        <ShimmerBase
          className={cn('h-48 w-full rounded-xl', className)}
          style={{ width, height }}
        />
      );

    case 'card':
      return (
        <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
          <div className="flex items-center gap-4 mb-4">
            <ShimmerBase className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <ShimmerBase className="h-4 w-3/4" />
              <ShimmerBase className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <ShimmerBase className="h-4 w-full" />
            <ShimmerBase className="h-4 w-5/6" />
            <ShimmerBase className="h-4 w-4/6" />
          </div>
        </div>
      );

    case 'stat':
      return (
        <div className={cn('rounded-xl border bg-card p-4', className)}>
          <ShimmerBase className="h-3 w-20 mb-2" />
          <ShimmerBase className="h-8 w-16 mb-1" />
          <ShimmerBase className="h-2 w-12" />
        </div>
      );

    case 'chart':
      return (
        <div className={cn('rounded-xl border bg-card p-6', className)}>
          <ShimmerBase className="h-4 w-32 mb-4" />
          <div className="flex items-end gap-2 h-32">
            {[40, 60, 45, 70, 55, 80, 65].map((h, i) => (
              <ShimmerBase
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      );

    case 'text':
    default:
      return (
        <div className={cn('space-y-2', className)}>
          {Array.from({ length: lines }).map((_, i) => (
            <ShimmerBase
              key={i}
              className="h-4"
              style={{
                width: i === lines - 1 ? '75%' : width || '100%',
                height
              }}
            />
          ))}
        </div>
      );
  }
}

// Pre-built shimmer layouts for common screens
export function ShimmerDashboard() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <ShimmerBase className="h-8 w-48" />
          <ShimmerBase className="h-4 w-32" />
        </div>
        <ShimmerBase className="h-10 w-10 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Shimmer key={i} variant="stat" />
        ))}
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-2 gap-6">
        <Shimmer variant="card" />
        <Shimmer variant="chart" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <ShimmerBase className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <ShimmerBase className="h-4 w-3/4" />
              <ShimmerBase className="h-3 w-1/2" />
            </div>
            <ShimmerBase className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShimmerChat() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        {/* Bot message */}
        <div className="flex items-start gap-3">
          <ShimmerBase className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 max-w-[80%]">
            <ShimmerBase className="h-4 w-64" />
            <ShimmerBase className="h-4 w-48" />
          </div>
        </div>

        {/* User message */}
        <div className="flex items-start gap-3 justify-end">
          <div className="space-y-2 max-w-[80%]">
            <ShimmerBase className="h-4 w-40 ml-auto" />
          </div>
          <ShimmerBase className="h-8 w-8 rounded-full flex-shrink-0" />
        </div>

        {/* Bot message */}
        <div className="flex items-start gap-3">
          <ShimmerBase className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 max-w-[80%]">
            <ShimmerBase className="h-4 w-72" />
            <ShimmerBase className="h-4 w-56" />
            <ShimmerBase className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <ShimmerBase className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ShimmerProfile() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ShimmerBase className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <ShimmerBase className="h-6 w-40" />
          <ShimmerBase className="h-4 w-24" />
        </div>
      </div>

      {/* Info cards */}
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <ShimmerBase className="h-3 w-20 mb-2" />
            <ShimmerBase className="h-5 w-32" />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <ShimmerBase className="h-10 flex-1 rounded-lg" />
        <ShimmerBase className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function ShimmerGoals() {
  return (
    <div className="space-y-4 p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <ShimmerBase className="h-6 w-32" />
        <ShimmerBase className="h-9 w-28 rounded-lg" />
      </div>

      {[1, 2, 3, 4].map(i => (
        <div key={i} className="p-4 rounded-xl border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ShimmerBase className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <ShimmerBase className="h-4 w-40" />
                <ShimmerBase className="h-3 w-24" />
              </div>
            </div>
            <ShimmerBase className="h-8 w-8 rounded-full" />
          </div>
          <ShimmerBase className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <ShimmerBase key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="p-4 border-b last:border-b-0 flex gap-4"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <ShimmerBase
              key={colIdx}
              className="h-4 flex-1"
              style={{ width: colIdx === 0 ? '40%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Pulse variant for smaller elements
export function ShimmerPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md bg-slate-200/80 dark:bg-slate-700/50 animate-pulse',
        className
      )}
    />
  );
}

// Inline shimmer for text placeholders
export function ShimmerInline({ width = '4rem' }: { width?: string }) {
  return (
    <ShimmerBase
      className="inline-block h-4 align-middle rounded"
      style={{ width }}
    />
  );
}

export { ShimmerBase };
