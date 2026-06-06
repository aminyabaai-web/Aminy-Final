// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Interactive Button Component
 * Premium micro-interactions for delightful UX
 *
 * Features:
 * - Haptic-like press feedback
 * - Ripple effect on click
 * - Loading state with spinner
 * - Success/error state animations
 * - Accessible focus states
 */

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Loader2 } from 'lucide-react';

type ButtonState = 'idle' | 'loading' | 'success' | 'error';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  ripple?: boolean;
  haptic?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

interface RippleStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-b from-teal-500 to-teal-600 text-white
    shadow-[0_1px_2px_rgba(13,148,136,0.2),0_4px_12px_rgba(13,148,136,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
    hover:from-teal-600 hover:to-teal-700
    hover:shadow-[0_2px_4px_rgba(13,148,136,0.25),0_8px_20px_rgba(13,148,136,0.2)]
    active:shadow-[0_1px_2px_rgba(13,148,136,0.2),inset_0_1px_2px_rgba(0,0,0,0.1)]
    dark:from-teal-600 dark:to-teal-700
  `,
  secondary: `
    bg-slate-100 text-slate-700
    hover:bg-slate-200
    active:bg-slate-300
    dark:bg-slate-700 dark:text-slate-200
    dark:hover:bg-slate-600
  `,
  ghost: `
    bg-transparent text-slate-600
    hover:bg-slate-100
    active:bg-slate-200
    dark:text-slate-300 dark:hover:bg-slate-800
  `,
  outline: `
    bg-transparent border-2 border-[#6B9080] text-[#6B9080]
    hover:bg-[#6B9080]/10
    active:bg-[#6B9080]/10
    dark:border-[#6B9080] dark:text-primary
    dark:hover:bg-teal-900/30
  `,
  danger: `
    bg-gradient-to-b from-red-500 to-red-600 text-white
    shadow-[0_1px_2px_rgba(239,68,68,0.2),0_4px_12px_rgba(239,68,68,0.15)]
    hover:from-red-600 hover:to-red-700
    active:shadow-[0_1px_2px_rgba(239,68,68,0.2),inset_0_1px_2px_rgba(0,0,0,0.1)]
  `
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-base rounded-xl gap-2',
  lg: 'h-12 px-6 text-lg rounded-xl gap-2.5'
};

const stateStyles: Record<ButtonState, string> = {
  idle: '',
  loading: 'cursor-wait opacity-90',
  success: 'bg-green-500 hover:bg-green-500 from-green-500 to-green-600',
  error: 'bg-red-500 hover:bg-red-500 from-red-500 to-red-600 animate-shake'
};

export function InteractiveButton({
  variant = 'primary',
  size = 'md',
  state = 'idle',
  ripple = true,
  haptic = true,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  disabled,
  onClick,
  children,
  ...props
}: InteractiveButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<RippleStyle[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ripple || disabled || state !== 'idle') return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: RippleStyle = {
      left: e.clientX - rect.left - size / 2,
      top: e.clientY - rect.top - size / 2,
      width: size,
      height: size
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.slice(1));
    }, 600);
  }, [ripple, disabled, state]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    handleRipple(e);

    // Haptic feedback (if supported)
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onClick?.(e);
  }, [handleRipple, haptic, onClick]);

  const handleMouseDown = useCallback(() => {
    if (!disabled && state === 'idle') {
      setIsPressed(true);
    }
  }, [disabled, state]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const isDisabled = disabled || state === 'loading';

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center font-semibold',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'overflow-hidden select-none',
        // Variant styles
        variantStyles[variant],
        // Size styles
        sizeStyles[size],
        // State styles
        stateStyles[state],
        // Press effect
        isPressed && 'scale-[0.97] transition-transform duration-75',
        // Full width
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {/* Ripple effects */}
      {ripples.map((ripple, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.left,
            top: ripple.top,
            width: ripple.width,
            height: ripple.height
          }}
        />
      ))}

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {state === 'loading' && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}

        {state === 'success' && (
          <Check className="w-4 h-4 animate-scale-in" />
        )}

        {state === 'error' && (
          <X className="w-4 h-4 animate-scale-in" />
        )}

        {state === 'idle' && icon && iconPosition === 'left' && (
          <span className="transition-transform group-hover:translate-x-[-2px]">
            {icon}
          </span>
        )}

        {state === 'idle' && children}
        {state === 'loading' && 'Loading...'}
        {state === 'success' && 'Success!'}
        {state === 'error' && 'Error'}

        {state === 'idle' && icon && iconPosition === 'right' && (
          <span className="transition-transform group-hover:translate-x-[2px]">
            {icon}
          </span>
        )}
      </span>
    </button>
  );
}

// Add the ripple and shake animations to tailwind config or global CSS
// These are fallback inline styles if not configured
const styleTag = typeof document !== 'undefined' ? document.createElement('style') : null;
if (styleTag && !document.querySelector('#interactive-button-styles')) {
  styleTag.id = 'interactive-button-styles';
  styleTag.textContent = `
    @keyframes ripple {
      from {
        transform: scale(0);
        opacity: 1;
      }
      to {
        transform: scale(1);
        opacity: 0;
      }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-4px); }
      40% { transform: translateX(4px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }

    @keyframes scale-in {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .animate-ripple {
      animation: ripple 0.6s ease-out forwards;
    }

    .animate-shake {
      animation: shake 0.5s ease-in-out;
    }

    .animate-scale-in {
      animation: scale-in 0.2s ease-out forwards;
    }
  `;
  document.head.appendChild(styleTag);
}

// Floating Action Button variant
export function FloatingActionButton({
  icon,
  onClick,
  className,
  pulse = false,
  badge,
  ...props
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  pulse?: boolean;
  badge?: number;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-b from-teal-500 to-teal-600 text-white',
        'shadow-lg shadow-teal-500/25',
        'flex items-center justify-center',
        'transition-all duration-200 ease-out',
        'hover:scale-105 hover:shadow-xl hover:shadow-teal-500/30',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {icon}

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// Icon Button with micro-interactions
export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  className,
  tooltip,
  ...props
}: {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'filled';
  tooltip?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const variantClasses = {
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
    outline: 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
    filled: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
  };

  return (
    <button
      title={tooltip}
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        'text-slate-600 dark:text-slate-300',
        'transition-all duration-150',
        'active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}

// Toggle Button with smooth state transition
export function ToggleButton({
  isOn,
  onToggle,
  size = 'md',
  disabled = false,
  className
}: {
  isOn: boolean;
  onToggle: (value: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const sizeClasses = {
    sm: { track: 'w-9 h-5', thumb: 'w-4 h-4', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' }
  };

  const sizes = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => onToggle(!isOn)}
      className={cn(
        'relative inline-flex items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isOn
          ? 'bg-primary'
          : 'bg-slate-200 dark:bg-slate-700',
        sizes.track,
        className
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          sizes.thumb,
          isOn && sizes.translate
        )}
      />
    </button>
  );
}

export default InteractiveButton;
