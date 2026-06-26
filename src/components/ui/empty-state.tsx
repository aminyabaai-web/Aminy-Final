// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Empty State Component
 * Displays helpful messaging when there's no data to show
 * Used across the app for zero-data views
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search, Inbox, MessageCircle, Users, FileText, UserSearch, BarChart3,
  FolderOpen, Calendar, Target, ListChecks, Mail, ClipboardList,
} from 'lucide-react';
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
        isCard && 'bg-white dark:bg-slate-900 rounded-xl border border-[#E8E4DF] dark:border-slate-700',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-full bg-[#F0EDE8] dark:bg-slate-800 flex items-center justify-center mb-4',
          isCompact ? 'w-12 h-12' : 'w-16 h-16'
        )}
      >
        <Icon
          className={cn(
            'text-[#8A9BA8] dark:text-[#5A6B7A]',
            isCompact ? 'w-6 h-6' : 'w-8 h-8'
          )}
        />
      </div>

      {/* Headline */}
      <h3
        className={cn(
          'font-semibold text-[#132F43] dark:text-white mb-2',
          isCompact ? 'text-base' : 'text-lg'
        )}
      >
        {headline}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-[#5A6B7A] dark:text-slate-400 max-w-sm mb-4 sm:mb-6',
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
      icon={Search}
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
      icon={Inbox}
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
      icon={MessageCircle}
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
      icon={Users}
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
      icon={FileText}
      headline={category ? `No ${category} posts yet` : 'No posts yet'}
      description="Be the first to share with the community! Your experience might help another parent."
      actionLabel="Create a post"
      onAction={onCreate}
    />
  );
}

export function EmptyProviders({
  headline = 'No providers found',
  description = "We couldn't find providers matching your criteria. Try adjusting your filters or check back later.",
  actionLabel,
  onAction,
}: {
  headline?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={UserSearch}
      headline={headline}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
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
      icon={BarChart3}
      headline={title}
      description={message}
      variant="compact"
    />
  );
}

export function EmptyVault({
  onUpload,
}: {
  onUpload?: () => void;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      headline="Your vault is empty"
      description="Upload IEPs, evaluations, and medical records. Aminy will read them to give you personalized guidance."
      actionLabel="Upload document"
      onAction={onUpload}
    />
  );
}

export function EmptyAppointments({
  onBook,
}: {
  onBook?: () => void;
}) {
  return (
    <EmptyState
      icon={Calendar}
      headline="No upcoming appointments"
      description="Book a session with a BCBA or specialist from our marketplace."
      actionLabel="Browse providers"
      onAction={onBook}
    />
  );
}

export function EmptyGoals({
  onCreateGoal,
}: {
  onCreateGoal?: () => void;
}) {
  return (
    <EmptyState
      icon={Target}
      headline="No goals set yet"
      description="Set developmental goals to track progress and get personalized activity recommendations."
      actionLabel="Add first goal"
      onAction={onCreateGoal}
    />
  );
}

export function EmptyRoutines({
  onCreateRoutine,
}: {
  onCreateRoutine?: () => void;
}) {
  return (
    <EmptyState
      icon={ListChecks}
      headline="No routines created"
      description="Build visual routines for morning, bedtime, or transitions. Kids thrive with predictability!"
      actionLabel="Create routine"
      onAction={onCreateRoutine}
    />
  );
}

export function EmptyMessages({
  onCompose,
}: {
  onCompose?: () => void;
}) {
  return (
    <EmptyState
      icon={Mail}
      headline="No messages"
      description="Your secure messages with providers will appear here."
      actionLabel={onCompose ? "Start a conversation" : undefined}
      onAction={onCompose}
    />
  );
}

export function EmptyActivityLog() {
  return (
    <EmptyState
      icon={ClipboardList}
      headline="No incidents logged"
      description="Track behaviors and triggers here to identify patterns and share insights with your care team."
      variant="compact"
    />
  );
}

export default EmptyState;
