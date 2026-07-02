// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Calendar links — client-side "Add to calendar" helpers (no deps).
 *
 * Generates a downloadable .ics file and a Google Calendar prefill URL for a
 * telehealth appointment. Used by ConversationalBooking (booking confirmation)
 * and MyAppointments (upcoming appointment cards).
 */

export interface CalendarEvent {
  title: string;
  /** Event start as a real Date (local time). */
  start: Date;
  durationMinutes: number;
  description?: string;
  /** e.g. the video link, or a placeholder like "Video link arrives by text". */
  location?: string;
}

/**
 * Combine a day (Date, any time-of-day) with a start time.
 * Accepts "HH:MM" clock strings (AvailabilityPicker slots) or a full ISO
 * datetime string (already-scheduled bookings) — in the ISO case the date
 * argument is ignored.
 */
export function combineDateAndTime(date: Date, startTime: string): Date {
  if (/^\d{1,2}:\d{2}$/.test(startTime)) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }
  const parsed = new Date(startTime);
  return isNaN(parsed.getTime()) ? new Date(date) : parsed;
}

/** UTC basic format for ICS: YYYYMMDDTHHMMSSZ */
function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Escape text per RFC 5545 (commas, semicolons, backslashes, newlines). */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildICS(event: CalendarEvent): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const uid = `aminy-${event.start.getTime()}-${Math.random().toString(36).slice(2, 10)}@aminy.ai`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aminy//Telehealth//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(event.start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeICSText(event.location)}`);
  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');

  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n');
}

/** Trigger a client-side download of the event as an .ics file. */
export function downloadICS(event: CalendarEvent, filename = 'aminy-appointment.ics'): void {
  const blob = new Blob([buildICS(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/** Google Calendar event-prefill URL (opens in a new tab). */
export function googleCalendarUrl(event: CalendarEvent): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toICSDate(event.start)}/${toICSDate(end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
