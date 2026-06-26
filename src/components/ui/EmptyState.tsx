// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

'use client';

/**
 * Empty State Components
 *
 * Provides friendly, helpful empty states for all list and data views.
 * Includes illustrations, helpful messages, and action buttons.
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

type PresetType =
  | 'no-data'
  | 'no-results'
  | 'no-messages'
  | 'no-notifications'
  | 'no-children'
  | 'no-routines'
  | 'no-entries'
  | 'no-documents'
  | 'no-providers'
  | 'no-appointments'
  | 'error'
  | 'offline'
  | 'coming-soon';

// ============================================================================
// Icons
// ============================================================================

const icons = {
  empty: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  search: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chat: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  bell: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  users: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  document: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  error: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  offline: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
    </svg>
  ),
  rocket: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  heart: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
};

// ============================================================================
// Presets
// ============================================================================

const presets: Record<PresetType, Omit<EmptyStateProps, 'action' | 'secondaryAction'>> = {
  'no-data': {
    icon: icons.empty,
    title: 'No data yet',
    description: 'Data will appear here once available.',
  },
  'no-results': {
    icon: icons.search,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  'no-messages': {
    icon: icons.chat,
    title: 'No messages yet',
    description: 'Start a conversation and your messages will appear here.',
  },
  'no-notifications': {
    icon: icons.bell,
    title: 'All caught up!',
    description: 'You have no new notifications. Check back later.',
  },
  'no-children': {
    icon: icons.heart,
    title: 'Add your child\'s profile',
    description: 'Create a profile for your child to get personalized support and track progress.',
  },
  'no-routines': {
    icon: icons.calendar,
    title: 'No routines set up',
    description: 'Create visual routines to help structure your child\'s day.',
  },
  'no-entries': {
    icon: icons.clipboard,
    title: 'No entries recorded',
    description: 'Start tracking behaviors, moods, or progress to see data here.',
  },
  'no-documents': {
    icon: icons.document,
    title: 'No documents uploaded',
    description: 'Upload IEPs, evaluations, or other documents to keep them organized.',
  },
  'no-providers': {
    icon: icons.users,
    title: 'No providers connected',
    description: 'Connect with therapists and specialists to share progress.',
  },
  'no-appointments': {
    icon: icons.calendar,
    title: 'No upcoming appointments',
    description: 'Your scheduled appointments and sessions will appear here.',
  },
  error: {
    icon: icons.error,
    title: 'Something went wrong',
    description: 'We couldn\'t load this content. Please try again.',
  },
  offline: {
    icon: icons.offline,
    title: 'You\'re offline',
    description: 'Check your internet connection and try again.',
  },
  'coming-soon': {
    icon: icons.rocket,
    title: 'Coming soon!',
    description: 'We\'re working on this feature. Check back soon.',
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const sizes = {
    sm: {
      container: 'py-6 px-4',
      icon: 'w-10 h-10',
      title: 'text-base',
      description: 'text-sm',
      button: 'px-3 py-1.5 text-sm',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'w-14 h-14',
      title: 'text-lg',
      description: 'text-sm',
      button: 'px-4 py-2 text-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
      button: 'px-5 py-2.5 text-base',
    },
  };

  const sizeClasses = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeClasses.container} ${className}`}>
      {icon && (
        <div className={`${sizeClasses.icon} text-[#8A9BA8] dark:text-[#5A6B7A] mb-4`}>
          {icon}
        </div>
      )}

      <h3 className={`font-semibold text-[#132F43] dark:text-white ${sizeClasses.title} mb-2`}>
        {title}
      </h3>

      {description && (
        <p className={`text-[#5A6B7A] dark:text-[#8A9BA8] ${sizeClasses.description} max-w-sm mb-6`}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={`
                bg-primary text-white rounded-lg font-medium
                hover:bg-[#216982] transition-colors
                ${sizeClasses.button}
              `}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={`
                bg-[#F0EDE8] dark:bg-slate-800 text-[#3A4A57] dark:text-gray-300
                rounded-lg font-medium hover:bg-[#E8E4DF] dark:hover:bg-slate-700
                transition-colors
                ${sizeClasses.button}
              `}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Preset Components
// ============================================================================

interface PresetEmptyStateProps {
  preset: PresetType;
  action?: EmptyStateProps['action'];
  secondaryAction?: EmptyStateProps['secondaryAction'];
  className?: string;
  size?: EmptyStateProps['size'];
}

export function PresetEmptyState({
  preset,
  action,
  secondaryAction,
  className,
  size,
}: PresetEmptyStateProps) {
  const config = presets[preset];
  return (
    <EmptyState
      {...config}
      action={action}
      secondaryAction={secondaryAction}
      className={className}
      size={size}
    />
  );
}

// ============================================================================
// Specific Empty States (for convenience)
// ============================================================================

export function NoResultsState({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={icons.search}
      title="No results found"
      description={
        searchTerm
          ? `We couldn't find anything matching "${searchTerm}". Try different keywords.`
          : 'Try adjusting your search or filters.'
      }
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
      className={className}
    />
  );
}

export function ErrorState({
  onRetry,
  message,
  className,
}: {
  onRetry?: () => void;
  message?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={icons.error}
      title="Something went wrong"
      description={message || 'We couldn\'t load this content. Please try again.'}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

export function OfflineState({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={icons.offline}
      title="You're offline"
      description="Check your internet connection and try again."
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

export function ComingSoonState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={icons.rocket}
      title="Coming soon!"
      description="We're working hard on this feature. Check back soon!"
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export { icons as emptyStateIcons };
export default EmptyState;
