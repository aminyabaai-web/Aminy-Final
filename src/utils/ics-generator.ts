// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ICS/Virtual Calendar Generator
 * 
 * Generates an event string compatible with Apple Calendar, 
 * Outlook, and Google Calendar.
 */

interface CalendarEvent {
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    organizerName?: string;
    organizerEmail?: string;
}

export function generateICS(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const now = formatDate(new Date());
    const start = formatDate(event.startTime);
    const end = formatDate(event.endTime);

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Aminy Healthcare//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${Math.random().toString(36).substring(2)}@aminy.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
        `LOCATION:${event.location}`,
        event.organizerName && event.organizerEmail ? `ORGANIZER;CN="${event.organizerName}":mailto:${event.organizerEmail}` : '',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'DESCRIPTION:Reminder',
        'ACTION:DISPLAY',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].filter(Boolean).join('\n');

    return icsContent;
}

export function downloadICS(event: CalendarEvent, filename: string = 'aminy-appointment.ics') {
    const icsContent = generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
