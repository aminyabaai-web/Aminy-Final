/**
 * Plan Tab Utilities
 * Shared helper functions and icon mappings for Plan Tab components
 */

import React from 'react';
import {
  MessageSquare,
  Users2,
  Brain,
  Clock,
  Target,
  ClipboardList,
  Lightbulb,
  TrendingUp,
  Gift,
  Library,
  Share,
  Shield,
  Sparkles,
  BarChart3,
  Home,
  GraduationCap,
} from 'lucide-react';
import type { GoalCategory, Priority, NavSection, TimeOfDay } from './types';

// ============================================
// Category Helpers
// ============================================

export function getCategoryIcon(category: GoalCategory | string): React.ReactNode {
  switch (category) {
    case 'speech':
      return <MessageSquare className="w-4 h-4" />;
    case 'social':
      return <Users2 className="w-4 h-4" />;
    case 'sensory':
      return <Brain className="w-4 h-4" />;
    case 'routines':
      return <Clock className="w-4 h-4" />;
    default:
      return <Target className="w-4 h-4" />;
  }
}

export function getCategoryColor(category: GoalCategory | string): string {
  switch (category) {
    case 'speech':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
    case 'social':
      return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800';
    case 'sensory':
      return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800';
    case 'routines':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/30 dark:border-gray-800';
  }
}

export function getCategoryLabel(category: GoalCategory): string {
  switch (category) {
    case 'speech':
      return 'Communication';
    case 'social':
      return 'Social Skills';
    case 'sensory':
      return 'Sensory';
    case 'routines':
      return 'Daily Routines';
  }
}

// ============================================
// Priority Helpers
// ============================================

export function getPriorityColor(priority: Priority | string): string {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'High Priority';
    case 'medium':
      return 'Medium Priority';
    case 'low':
      return 'Low Priority';
  }
}

// ============================================
// Time of Day Helpers
// ============================================

export function getTimeOfDayIcon(timeOfDay: TimeOfDay): React.ReactNode {
  switch (timeOfDay) {
    case 'morning':
      return '🌅';
    case 'afternoon':
      return '☀️';
    case 'evening':
      return '🌆';
    case 'bedtime':
      return '🌙';
  }
}

export function getTimeOfDayLabel(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning':
      return 'Morning';
    case 'afternoon':
      return 'Afternoon';
    case 'evening':
      return 'Evening';
    case 'bedtime':
      return 'Bedtime';
  }
}

// ============================================
// Progress Helpers
// ============================================

export function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-amber-500';
  return 'bg-gray-400';
}

export function getProgressLabel(progress: number): string {
  if (progress >= 80) return 'Excellent';
  if (progress >= 50) return 'Good Progress';
  if (progress >= 25) return 'Getting Started';
  return 'Beginning';
}

// ============================================
// Severity Helpers
// ============================================

export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
  }
}

// ============================================
// Navigation Sections
// ============================================

export const NAV_SECTIONS: NavSection[] = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'routines', label: 'Routines', icon: Clock },
  { id: 'strategies', label: 'Strategies', icon: Lightbulb },
  { id: 'tracking', label: 'Tracking', icon: TrendingUp },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'coaching', label: 'Coaching', icon: GraduationCap, tierRequired: 'pro' },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'insights', label: 'AI Insights', icon: Sparkles, tierRequired: 'pro' },
  { id: 'outcomes', label: 'Outcomes', icon: BarChart3, tierRequired: 'premium' },
  { id: 'family', label: 'Family/School', icon: Home },
  { id: 'sharing', label: 'Sharing', icon: Share },
];

// ============================================
// Date Formatting
// ============================================

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
}

// ============================================
// Calculation Helpers
// ============================================

export function calculateAverageProgress(goals: { progress: number }[]): number {
  if (goals.length === 0) return 0;
  const total = goals.reduce((sum, goal) => sum + goal.progress, 0);
  return Math.round(total / goals.length);
}

export function calculateCompletionRate(items: { completed?: boolean; active?: boolean }[]): number {
  const activeItems = items.filter(item => item.active !== false);
  if (activeItems.length === 0) return 0;
  const completed = activeItems.filter(item => item.completed).length;
  return Math.round((completed / activeItems.length) * 100);
}

// ============================================
// Tier Check Helpers
// ============================================

export function hasAccessToSection(
  sectionId: string,
  userTier?: string | null
): boolean {
  const section = NAV_SECTIONS.find(s => s.id === sectionId);
  if (!section?.tierRequired) return true;

  const tierHierarchy: Record<string, number> = {
    free: 0,
    pro: 1,
    premium: 2,
  };

  const userLevel = tierHierarchy[userTier?.toLowerCase() || 'free'] || 0;
  const requiredLevel = tierHierarchy[section.tierRequired] || 0;

  return userLevel >= requiredLevel;
}
