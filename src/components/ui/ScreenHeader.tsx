// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * ScreenHeader — single source of truth for top-of-screen headers.
 *
 * Replaces ad-hoc per-screen header markup that was drifting on padding,
 * shadows, and back-button placement. Every hub screen should use this so
 * Dashboard, MyAppointments, CareCoordinationHub, Settings, Vault, etc.
 * have visually identical chrome.
 *
 * Variants:
 *   - 'flat'      → white bg, bottom border (default for content screens)
 *   - 'gradient'  → gradient bg, no border (for hero screens like Dashboard)
 *   - 'overlay'   → no bg, used inside modal/sheet contexts
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Icon component or emoji at left of title */
  icon?: React.ReactNode;
  /** Trailing actions (e.g. settings gear, save button) */
  actions?: React.ReactNode;
  /** Back button handler */
  onBack?: () => void;
  /** Custom back label (default: "Back") */
  backLabel?: string;
  variant?: 'flat' | 'gradient' | 'overlay';
  /** Sticky to viewport top */
  sticky?: boolean;
  className?: string;
}

export function ScreenHeader({
  title, subtitle, icon, actions, onBack, backLabel = 'Back',
  variant = 'flat', sticky = false, className = '',
}: ScreenHeaderProps) {
  const baseClasses = 'px-4 pt-3 pb-4 z-10';
  const variantClasses = {
    flat:     'bg-white border-b border-[#E8E4DF]',
    gradient: 'bg-gradient-to-b from-white to-slate-50',
    overlay:  '',
  }[variant];
  const stickyClasses = sticky ? 'sticky top-0' : '';

  return (
    <div className={`${baseClasses} ${variantClasses} ${stickyClasses} ${className}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-[#5A6B7A] mb-3 hover:text-[#132F43] transition-colors min-h-[36px]"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </button>
      )}
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #577590 100%)' }}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#132F43] leading-tight text-balance">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#5A6B7A] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

export default ScreenHeader;
