// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

export interface BreadcrumbTrailItem {
  label: string;
  screen?: string;
}

export const BREADCRUMB_TRAILS: Record<string, BreadcrumbTrailItem[]> = {
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
