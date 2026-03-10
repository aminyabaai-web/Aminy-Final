/**
 * EmptyState - Reusable empty state component for list screens
 *
 * Shows an icon, title, description, and optional action button
 * when a list or collection has no items.
 */

import React from 'react';
import {
  Inbox,
  Calendar,
  MessageCircle,
  FileText,
  Search,
  FolderOpen,
  type LucideIcon
} from 'lucide-react';

// Map of icon names to components for dynamic rendering
const iconMap: Record<string, LucideIcon> = {
  inbox: Inbox,
  calendar: Calendar,
  'message-circle': MessageCircle,
  'file-text': FileText,
  search: Search,
  'folder-open': FolderOpen,
};

interface EmptyStateProps {
  icon?: string;
  IconComponent?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  IconComponent,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  // Resolve icon: prefer direct component, then name lookup, then default
  const ResolvedIcon = IconComponent || (icon && iconMap[icon]) || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
        <ResolvedIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
