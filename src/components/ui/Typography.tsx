// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Typography System
 * Consistent, accessible text components for Aminy
 *
 * Design Principles:
 * - Manrope font family for warmth and readability
 * - Calm, breathable line heights
 * - Accessible contrast ratios (WCAG AA)
 * - Consistent hierarchy across the app
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Heading Components
// ============================================================================

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

export function DisplayHeading({ className, children, ...props }: HeadingProps) {
  return (
    <h1
      className={cn(
        'text-4xl md:text-5xl font-bold tracking-tight',
        'text-[#1B2733] dark:text-slate-50',
        'leading-[1.1]',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function PageTitle({ className, children, as: Tag = 'h1', ...props }: HeadingProps) {
  return (
    <Tag
      className={cn(
        'text-2xl md:text-3xl font-semibold tracking-tight',
        'text-[#1B2733] dark:text-slate-50',
        'leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ className, children, as: Tag = 'h2', ...props }: HeadingProps) {
  return (
    <Tag
      className={cn(
        'text-xl md:text-2xl font-semibold tracking-tight',
        'text-[#1B2733] dark:text-slate-100',
        'leading-snug',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({ className, children, as: Tag = 'h3', ...props }: HeadingProps) {
  return (
    <Tag
      className={cn(
        'text-lg font-semibold',
        'text-[#1B2733] dark:text-slate-100',
        'leading-snug',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Subheading({ className, children, as: Tag = 'h4', ...props }: HeadingProps) {
  return (
    <Tag
      className={cn(
        'text-base font-medium',
        'text-[#3A4A57] dark:text-slate-200',
        'leading-normal',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ============================================================================
// Body Text Components
// ============================================================================

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold';
  muted?: boolean;
  children: React.ReactNode;
}

export function Text({
  className,
  size = 'base',
  weight = 'normal',
  muted = false,
  children,
  ...props
}: TextProps) {
  const sizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed'
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold'
  };

  return (
    <p
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        muted
          ? 'text-[#5A6B7A] dark:text-slate-400'
          : 'text-[#3A4A57] dark:text-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function Lead({ className, children, ...props }: Omit<TextProps, 'size'>) {
  return (
    <p
      className={cn(
        'text-lg md:text-xl font-normal',
        'text-[#5A6B7A] dark:text-slate-300',
        'leading-relaxed',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function SmallText({ className, children, muted = false, ...props }: Omit<TextProps, 'size'>) {
  return (
    <p
      className={cn(
        'text-sm leading-normal',
        muted
          ? 'text-[#5A6B7A] dark:text-slate-400'
          : 'text-[#5A6B7A] dark:text-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function Caption({ className, children, ...props }: Omit<TextProps, 'size' | 'muted'>) {
  return (
    <p
      className={cn(
        'text-sm font-medium leading-normal',
        'text-[#5A6B7A] dark:text-slate-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ============================================================================
// Specialized Text Components
// ============================================================================

export function Label({
  className,
  htmlFor,
  required,
  children,
  ...props
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
} & React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-medium leading-none',
        'text-[#3A4A57] dark:text-slate-200',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

export function ErrorText({ className, children, ...props }: Omit<TextProps, 'size' | 'muted'>) {
  return (
    <p
      className={cn(
        'text-sm font-medium leading-normal',
        'text-red-600 dark:text-red-400',
        className
      )}
      role="alert"
      {...props}
    >
      {children}
    </p>
  );
}

export function SuccessText({ className, children, ...props }: Omit<TextProps, 'size' | 'muted'>) {
  return (
    <p
      className={cn(
        'text-sm font-medium leading-normal',
        'text-green-600 dark:text-green-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function HelperText({ className, children, ...props }: Omit<TextProps, 'size' | 'muted'>) {
  return (
    <p
      className={cn(
        'text-sm leading-normal',
        'text-[#5A6B7A] dark:text-slate-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ============================================================================
// Links
// ============================================================================

interface LinkTextProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'subtle' | 'bold';
  children: React.ReactNode;
}

export function LinkText({ className, variant = 'default', children, ...props }: LinkTextProps) {
  const variantClasses = {
    default: 'text-[#6B9080] dark:text-primary hover:text-[#6B9080] dark:hover:text-[#7BA7BC] underline-offset-2 hover:underline',
    subtle: 'text-[#5A6B7A] dark:text-slate-300 hover:text-[#1B2733] dark:hover:text-slate-100 hover:underline',
    bold: 'text-[#6B9080] dark:text-primary font-semibold hover:text-[#6B9080] dark:hover:text-[#7BA7BC]'
  };

  return (
    <a
      className={cn(
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:rounded',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// ============================================================================
// Inline Elements
// ============================================================================

export function Strong({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <strong className={cn('font-semibold text-[#1B2733] dark:text-slate-100', className)}>
      {children}
    </strong>
  );
}

export function Emphasis({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <em className={cn('italic', className)}>
      {children}
    </em>
  );
}

export function Code({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded bg-[#F0EDE8] dark:bg-slate-800',
        'font-mono text-sm',
        'text-[#1B2733] dark:text-slate-200',
        className
      )}
    >
      {children}
    </code>
  );
}

export function Highlight({ className, children, color = 'teal' }: {
  className?: string;
  children: React.ReactNode;
  color?: 'teal' | 'amber' | 'green' | 'purple';
}) {
  const colorClasses = {
    teal: 'bg-[#6B9080]/10 dark:bg-[#6B9080]/15 text-[#6B9080] dark:text-teal-200',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
  };

  return (
    <mark className={cn('px-1 rounded', colorClasses[color], className)}>
      {children}
    </mark>
  );
}

// ============================================================================
// Lists
// ============================================================================

export function UnorderedList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <ul className={cn('list-disc list-inside space-y-1 text-[#3A4A57] dark:text-slate-300', className)}>
      {children}
    </ul>
  );
}

export function OrderedList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <ol className={cn('list-decimal list-inside space-y-1 text-[#3A4A57] dark:text-slate-300', className)}>
      {children}
    </ol>
  );
}

export function ListItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <li className={cn('leading-relaxed', className)}>
      {children}
    </li>
  );
}

// ============================================================================
// Quote / Callout
// ============================================================================

export function Blockquote({ className, children, cite }: {
  className?: string;
  children: React.ReactNode;
  cite?: string;
}) {
  return (
    <blockquote
      className={cn(
        'pl-4 border-l-4 border-[#6B9080]',
        'italic text-[#5A6B7A] dark:text-slate-300',
        className
      )}
    >
      {children}
      {cite && (
        <footer className="mt-2 text-sm text-[#5A6B7A] not-italic">
          — {cite}
        </footer>
      )}
    </blockquote>
  );
}

// ============================================================================
// Divider with optional text
// ============================================================================

export function Divider({ className, children }: { className?: string; children?: React.ReactNode }) {
  if (!children) {
    return <hr className={cn('border-[#E8E4DF] dark:border-slate-700 my-4', className)} />;
  }

  return (
    <div className={cn('relative flex items-center my-4', className)}>
      <div className="flex-grow border-t border-[#E8E4DF] dark:border-slate-700" />
      <span className="px-3 text-sm text-[#5A6B7A] dark:text-slate-400">
        {children}
      </span>
      <div className="flex-grow border-t border-[#E8E4DF] dark:border-slate-700" />
    </div>
  );
}

// ============================================================================
// Number/Stat Display
// ============================================================================

export function StatNumber({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'text-3xl md:text-4xl font-bold tracking-tight',
        'text-[#1B2733] dark:text-slate-50',
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'text-sm font-medium uppercase tracking-wide',
        'text-[#5A6B7A] dark:text-slate-400',
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  DisplayHeading,
  PageTitle,
  SectionTitle,
  CardTitle,
  Subheading,
  Text,
  Lead,
  SmallText,
  Caption,
  Label,
  ErrorText,
  SuccessText,
  HelperText,
  LinkText,
  Strong,
  Emphasis,
  Code,
  Highlight,
  UnorderedList,
  OrderedList,
  ListItem,
  Blockquote,
  Divider,
  StatNumber,
  StatLabel
};
