/**
 * Empty State Component
 * Displays helpful messaging when there's no data to show
 * Used across the app for zero-data views
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  /** Icon to display at the top */
  icon: LucideIcon;
  /** Main headline text */
  headline: string;
  /** Supporting description text */
  description: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button handler */
  onAction?: () => void;
  /** Optional secondary action label */
  secondaryActionLabel?: string;
  /** Optional secondary action handler */
  onSecondaryAction?: () => void;
  /** Visual variant for different contexts */
  variant?: 'default' | 'compact' | 'card';
  /** Optional custom className */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  headline,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  const isCard = variant === 'card';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-12 px-6',
        isCard && 'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4',
          isCompact ? 'w-12 h-12' : 'w-16 h-16'
        )}
      >
        <Icon
          className={cn(
            'text-gray-400 dark:text-slate-500',
            isCompact ? 'w-6 h-6' : 'w-8 h-8'
          )}
        />
      </div>

      {/* Headline */}
      <h3
        className={cn(
          'font-semibold text-gray-900 dark:text-white mb-2',
          isCompact ? 'text-base' : 'text-lg'
        )}
      >
        {headline}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-gray-500 dark:text-slate-400 max-w-sm mb-6',
          isCompact ? 'text-sm' : 'text-base'
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size={isCompact ? 'sm' : 'default'}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              size={isCompact ? 'sm' : 'default'}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured empty state variants for common use cases
 */

export function EmptySearchResults({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').Search}
      headline="No results found"
      description={
        searchTerm
          ? `No results for "${searchTerm}". Try a different search term.`
          : 'Try adjusting your search or filters.'
      }
      actionLabel={onClear ? 'Clear search' : undefined}
      onAction={onClear}
      variant="compact"
    />
  );
}

export function EmptyInbox() {
  return (
    <EmptyState
      icon={require('lucide-react').Inbox}
      headline="All caught up!"
      description="You have no new notifications. Check back later."
    />
  );
}

export function EmptyConversations({
  onStartChat,
}: {
  onStartChat?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').MessageCircle}
      headline="No conversations yet"
      description="Start a conversation with Aminy to get personalized support and guidance."
      actionLabel="Start chatting"
      onAction={onStartChat}
    />
  );
}

export function EmptyReferrals({
  onInvite,
}: {
  onInvite?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').Users}
      headline="No referrals yet"
      description="Invite friends and family to Aminy. You'll both get rewards when they sign up!"
      actionLabel="Invite a friend"
      onAction={onInvite}
    />
  );
}

export function EmptyCommunityPosts({
  category,
  onCreate,
}: {
  category?: string;
  onCreate?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').FileText}
      headline={category ? `No ${category} posts yet` : 'No posts yet'}
      description="Be the first to share with the community! Your experience might help another parent."
      actionLabel="Create a post"
      onAction={onCreate}
    />
  );
}

export function EmptyProviders() {
  return (
    <EmptyState
      icon={require('lucide-react').UserSearch}
      headline="No providers found"
      description="We couldn't find providers matching your criteria. Try adjusting your filters or check back later."
      variant="card"
    />
  );
}

export function EmptyData({
  title = 'No data available',
  message = 'Data will appear here once available.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').BarChart3}
      headline={title}
      description={message}
      variant="compact"
    />
  );
}

export default EmptyState;
