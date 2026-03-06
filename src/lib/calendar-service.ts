/**
 * Calendar Integration Service
 * Multi-calendar support for Google, Apple, and Outlook calendars
 *
 * Features:
 * - Add to Calendar links (Google, Apple, Outlook)
 * - ICS file generation
 * - Calendar reminders
 */

import { Appointment, Provider, VisitType, VISIT_TYPES } from '../types/telehealth';

// Calendar event interface
export interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  url?: string;
  reminders?: number[]; // minutes before
}

// ============================================================================
// Calendar Link Generators
// ============================================================================

/**
 * Generate Google Calendar add event URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startTime)}/${formatDate(event.endTime)}`,
    details: event.description,
  });

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar (web) add event URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    startdt: formatDate(event.startTime),
    enddt: formatDate(event.endTime),
  });

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 Calendar add event URL
 */
export function generateOffice365CalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    startdt: formatDate(event.startTime),
    enddt: formatDate(event.endTime),
  });

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar add event URL
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
  };

  const durationMs = event.endTime.getTime() - event.startTime.getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const duration = `${durationHours.toString().padStart(2, '0')}${durationMinutes.toString().padStart(2, '0')}`;

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatDate(event.startTime),
    dur: duration,
    desc: event.description,
  });

  if (event.location) {
    params.set('in_loc', event.location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

// ============================================================================
// ICS File Generation (Apple Calendar & Downloads)
// ============================================================================

/**
 * Generate ICS file content
 */
export function generateICSContent(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const uid = `aminy-${Date.now()}-${Math.random().toString(36).slice(2)}@aminy.ai`;
  const now = formatDate(new Date());

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aminy//Telehealth//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
  ];

  if (event.location) {
    icsContent.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.url) {
    icsContent.push(`URL:${event.url}`);
  }

  // Add reminders (alarms)
  if (event.reminders && event.reminders.length > 0) {
    for (const minutes of event.reminders) {
      icsContent.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(event.title)} - Reminder`,
        `TRIGGER:-PT${minutes}M`,
        'END:VALARM'
      );
    }
  }

  icsContent.push('END:VEVENT', 'END:VCALENDAR');

  return icsContent.join('\r\n');
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEvent, filename?: string): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `appointment-${event.startTime.toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate data URI for ICS file (for Apple Calendar links)
 */
export function generateICSDataUri(event: CalendarEvent): string {
  const content = generateICSContent(event);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}

// ============================================================================
// Appointment to Calendar Event Converter
// ============================================================================

/**
 * Create calendar event from appointment data
 */
export function createCalendarEventFromAppointment(
  appointment: {
    providerName: string;
    startTime: string;
    endTime: string;
    visitType: VisitType;
    videoRoomUrl?: string;
    reasonForVisit?: string;
  }
): CalendarEvent {
  const visitConfig = VISIT_TYPES[appointment.visitType];
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);

  const description = [
    `${visitConfig.displayName} with ${appointment.providerName}`,
    '',
    appointment.reasonForVisit ? `Topic: ${appointment.reasonForVisit}` : '',
    '',
    appointment.videoRoomUrl ? `Join Video Call: ${appointment.videoRoomUrl}` : '',
    '',
    'Powered by Aminy - Your neurodivergent care companion',
  ].filter(Boolean).join('\n');

  return {
    title: `Aminy: ${visitConfig.displayName} with ${appointment.providerName}`,
    description,
    startTime,
    endTime,
    url: appointment.videoRoomUrl,
    location: appointment.videoRoomUrl ? 'Video Call (link in description)' : undefined,
    reminders: [15, 60, 1440], // 15 min, 1 hour, 24 hours
  };
}

// ============================================================================
// Calendar Integration UI Helpers
// ============================================================================

export type CalendarType = 'google' | 'apple' | 'outlook' | 'office365' | 'yahoo' | 'download';

export interface CalendarOption {
  type: CalendarType;
  name: string;
  icon: string;
  getUrl: (event: CalendarEvent) => string;
}

/**
 * Get available calendar options
 */
export const CALENDAR_OPTIONS: CalendarOption[] = [
  {
    type: 'google',
    name: 'Google Calendar',
    icon: '📅',
    getUrl: generateGoogleCalendarUrl,
  },
  {
    type: 'apple',
    name: 'Apple Calendar',
    icon: '🍎',
    getUrl: generateICSDataUri,
  },
  {
    type: 'outlook',
    name: 'Outlook.com',
    icon: '📧',
    getUrl: generateOutlookCalendarUrl,
  },
  {
    type: 'office365',
    name: 'Office 365',
    icon: '💼',
    getUrl: generateOffice365CalendarUrl,
  },
  {
    type: 'yahoo',
    name: 'Yahoo Calendar',
    icon: '🟣',
    getUrl: generateYahooCalendarUrl,
  },
];

/**
 * Open calendar in new window/tab
 */
export function openCalendar(event: CalendarEvent, calendarType: CalendarType): void {
  if (calendarType === 'download' || calendarType === 'apple') {
    // For Apple Calendar, we download the ICS file
    downloadICSFile(event);
    return;
  }

  const option = CALENDAR_OPTIONS.find(opt => opt.type === calendarType);
  if (!option) {
    console.error(`Unknown calendar type: ${calendarType}`);
    return;
  }

  const url = option.getUrl(event);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Add appointment to calendar with user's preferred calendar
 */
export function addToCalendar(
  appointment: {
    providerName: string;
    startTime: string;
    endTime: string;
    visitType: VisitType;
    videoRoomUrl?: string;
    reasonForVisit?: string;
  },
  preferredCalendar?: CalendarType
): void {
  const event = createCalendarEventFromAppointment(appointment);

  // If no preference, default to Google (most common)
  const calendarType = preferredCalendar || 'google';

  openCalendar(event, calendarType);
}

/**
 * Get user's preferred calendar from localStorage
 */
export function getPreferredCalendar(): CalendarType | null {
  return localStorage.getItem('preferred-calendar') as CalendarType | null;
}

/**
 * Set user's preferred calendar
 */
export function setPreferredCalendar(calendarType: CalendarType): void {
  localStorage.setItem('preferred-calendar', calendarType);
}

// ============================================================================
// Calendar Sync (Future Feature)
// ============================================================================

/**
 * Check if device supports native calendar access (via Web API)
 * Note: This is still experimental and has limited browser support
 */
export function supportsNativeCalendar(): boolean {
  // Calendar Access API is still experimental
  return false;
}

/**
 * Request calendar access permission (experimental)
 * For future implementation when Web Calendar API is more widely supported
 */
export async function requestCalendarAccess(): Promise<boolean> {
  // Future: Implement when Calendar Access API is available
  return false;
}

export default {
  // URL generators
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateOffice365CalendarUrl,
  generateYahooCalendarUrl,

  // ICS
  generateICSContent,
  downloadICSFile,
  generateICSDataUri,

  // Helpers
  createCalendarEventFromAppointment,
  openCalendar,
  addToCalendar,
  getPreferredCalendar,
  setPreferredCalendar,

  // Constants
  CALENDAR_OPTIONS,
};
