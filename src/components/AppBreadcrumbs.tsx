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

export interface BreadcrumbItem {
  label: string;
  /** Screen name to navigate to. Omit for the current (non-clickable) page. */
  screen?: string;
}

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
      <ol className="flex items-center gap-1.5 flex-wrap text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !!item.screen && !isLast;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
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
                  className={isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}
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

// ── Predefined breadcrumb trails for common deep screens ──

export const BREADCRUMB_TRAILS: Record<string, BreadcrumbItem[]> = {
  'care-plan': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Care', screen: 'caregivers' },
    { label: 'Care Plan' },
  ],
  'prior-auth': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Benefits', screen: 'benefits' },
    { label: 'Prior Authorization' },
  ],
  'incident-log': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Care', screen: 'caregivers' },
    { label: 'Incident Log' },
  ],
  'medications': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Care', screen: 'caregivers' },
    { label: 'Medications' },
  ],
  'outcomes': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Care', screen: 'caregivers' },
    { label: 'Outcomes Tracker' },
  ],
  'weekly-insights': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Weekly Insights' },
  ],
  'insight-report': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Insights', screen: 'weekly-insights' },
    { label: 'Insight Report' },
  ],
  'analytics-charts': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Analytics', screen: 'analytics' },
    { label: 'Charts & Trends' },
  ],
  'access-requests': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Settings', screen: 'settings' },
    { label: 'Access Requests' },
  ],
  'crisis-resources': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Crisis Resources' },
  ],
  'conversational-booking': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Appointments', screen: 'my-appointments' },
    { label: 'Book Appointment' },
  ],
  'messages': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Messages' },
  ],
  'my-appointments': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Telehealth', screen: 'telehealth' },
    { label: 'My Appointments' },
  ],
  'calm-tools': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Calm Tools' },
  ],
};

export default AppBreadcrumbs;
