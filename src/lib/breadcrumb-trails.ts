// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

export interface BreadcrumbTrailItem {
  label: string;
  screen?: string;
}

// Screens whose components render their own back-button header (ScreenHeader
// or equivalent) must NOT also have a trail here — the stacked breadcrumb +
// back-link double header was flagged on every screen that had both.
// Removed for that reason: care-plan, incident-log, medications, messages,
// my-appointments, weekly-insights. Only add a trail for screens with no
// in-component back affordance.
export const BREADCRUMB_TRAILS: Record<string, BreadcrumbTrailItem[]> = {
  'prior-auth': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Benefits', screen: 'benefits' },
    { label: 'Prior Authorization' },
  ],
  'outcomes': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Care', screen: 'caregivers' },
    { label: 'Outcomes Tracker' },
  ],
  'insight-report': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Insights', screen: 'weekly-insights' },
    { label: 'Insight Report' },
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
  'calm-tools': [
    { label: 'Home', screen: 'dashboard' },
    { label: 'Calm Tools' },
  ],
};
