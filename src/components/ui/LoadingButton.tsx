// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * LoadingButton Component
 * Reusable button with consistent loading state handling
 */

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Text to show while loading (defaults to children) */
  loadingText?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Icon to show before text */
  icon?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-[#6B9080] text-white hover:bg-[#466379] disabled:bg-gray-300 disabled:text-[#5A6B7A]',
  secondary: 'bg-[#F0EDE8] text-[#3A4A57] hover:bg-[#E8E4DF] disabled:bg-[#F0EDE8] disabled:text-[#8A9BA8]',
  outline: 'border-2 border-cyan-600 text-[#6B9080] hover:bg-[#6B9080]/5 disabled:border-[#E8E4DF] disabled:text-[#8A9BA8]',
  ghost: 'text-[#3A4A57] hover:bg-[#F0EDE8] disabled:text-[#8A9BA8]',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:text-[#5A6B7A]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3.5 text-lg min-h-[52px]',
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      loading = false,
      loadingText,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-xl
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:ring-offset-2
          disabled:cursor-not-allowed
          active:scale-[0.98]
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

/**
 * Inline loading spinner for use in components
 */
export const InlineSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Loader2
      className={`animate-spin text-[#6B9080] ${sizeMap[size]} ${className}`}
      aria-label="Loading"
    />
  );
};

/**
 * Content loading placeholder with shimmer effect
 */
export const LoadingPlaceholder: React.FC<{
  width?: string;
  height?: string;
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
}> = ({ width, height, className = '', variant = 'rect' }) => {
  const baseClasses = 'animate-pulse bg-[#E8E4DF]';

  const variantStyles = {
    text: 'rounded h-4',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  };

  return (
    <div
      className={`${baseClasses} ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};

export default LoadingButton;
