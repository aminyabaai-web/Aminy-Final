// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * iCalendar (.ics) file generator
 *
 * RFC 5545 minimal-but-correct VEVENT generator. The output is universally
 * accepted by every calendar app:
 *   - Apple Calendar (iCloud) — opens via `data:text/calendar` on iOS Safari
 *   - Outlook Web / Desktop / Mac
 *   - Google Calendar
 *   - Yahoo Calendar
 *   - Fastmail, Proton, anything that speaks iCal
 *
 * This is the right answer for "Aminy supports any calendar" — no OAuth,
 * no API integration, no token expiry to manage. The user taps the link,
 * their phone hands the .ics to whichever calendar app is registered as
 * the default handler.
 */

export interface ICSEvent {
  uid?: string;           // Stable identifier (use appointment.id) — required by RFC 5545
  title: string;
  description?: string;
  location?: string;
  startISO: string;       // e.g. "2026-05-20T14:00:00"
  endISO?: string;
  organizerName?: string;
  organizerEmail?: string;
  /** Optional pre-event reminder(s) in minutes before start */
  remindersMinutes?: number[];
  /** URL to attach (telehealth join link, provider profile, etc.) */
  url?: string;
}

function fmtIcsDate(iso: string): string {
  // RFC 5545: YYYYMMDDTHHMMSSZ (UTC, no separators)
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  // RFC 5545 §3.3.11 — backslash, comma, semicolon, newline must be escaped
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Build the full .ics file content. */
export function buildICS(event: ICSEvent): string {
  const uid = event.uid || `aminy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const dtStamp = fmtIcsDate(new Date().toISOString());
  const dtStart = fmtIcsDate(event.startISO);
  const dtEnd = fmtIcsDate(event.endISO || new Date(new Date(event.startISO).getTime() + 60 * 60_000).toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aminy//Care Coordination//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@aminy.ai`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description && `DESCRIPTION:${escapeIcsText(event.description)}`,
    event.location && `LOCATION:${escapeIcsText(event.location)}`,
    event.url && `URL:${event.url}`,
    event.organizerName && event.organizerEmail && `ORGANIZER;CN=${escapeIcsText(event.organizerName)}:mailto:${event.organizerEmail}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
  ].filter(Boolean) as string[];

  // VALARM blocks for pre-event reminders
  for (const minutes of (event.remindersMinutes || [])) {
    lines.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${minutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(event.title)}`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // RFC 5545 requires CRLF line endings
  return lines.join('\r\n');
}

/**
 * Convert ICSEvent to a data URI the user can tap to open in their calendar.
 * Works universally — iOS hands off to Calendar.app, Android prompts a chooser,
 * desktop Safari/Chrome opens default handler.
 */
export function buildICSDataUri(event: ICSEvent): string {
  const ics = buildICS(event);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/**
 * Trigger a browser download of the .ics file. Useful from buttons that
 * should force-download instead of letting the OS open it directly.
 */
export function downloadICS(event: ICSEvent, filename = 'aminy-event.ics'): void {
  const ics = buildICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
