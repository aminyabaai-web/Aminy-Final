// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AppBreadcrumbs — Navigation breadcrumbs for deep screens
 *
 * Works with Aminy's state-based navigation (NOT React Router).
 * Renders a breadcrumb trail with clickable ancestors that call navigateToScreen().
 *
 * Usage:
 *   <AppBreadcrumbs
 *     items={[
 *       { label: 'Dashboard', screen: 'dashboard' },
 *       { label: 'Care', screen: 'caregivers' },
 *       { label: 'Care Plan' },  // current page — no screen = non-clickable
 *     ]}
 *     onNavigate={navigateToScreen}
 *   />
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { BreadcrumbTrailItem } from '../lib/breadcrumb-trails';

export type BreadcrumbItem = BreadcrumbTrailItem;

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (screen: string) => void;
  className?: string;
}

export function AppBreadcrumbs({ items, onNavigate, className = '' }: AppBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`px-4 py-2 text-sm ${className}`}
    >
      <ol className="flex items-center gap-1.5 flex-wrap text-[#5A6B7A]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !!item.screen && !isLast;

          return (
            <li key={`${item.screen ?? 'leaf'}-${item.label}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-[#8A9BA8] flex-shrink-0" aria-hidden="true" />
              )}

              {/* Home icon for first item */}
              {index === 0 && isClickable && (
                <Home className="w-3.5 h-3.5 mr-0.5 flex-shrink-0" aria-hidden="true" />
              )}

              {isClickable ? (
                <button
                  onClick={() => onNavigate(item.screen!)}
                  className="hover:text-cyan-700 transition-colors underline-offset-2 hover:underline min-h-[44px] flex items-center px-1"
                  type="button"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={isLast ? 'text-[#132F43] font-medium' : 'text-[#5A6B7A]'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default AppBreadcrumbs;
