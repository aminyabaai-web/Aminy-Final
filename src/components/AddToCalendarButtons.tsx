// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * AddToCalendarButtons — three brand logos (Apple, Google, Outlook).
 *
 * Each opens the matching calendar with the appointment pre-filled:
 *   - Apple    → .ics data URI → Calendar.app on iOS, default app elsewhere
 *   - Google   → calendar.google.com/calendar/render?action=TEMPLATE&...
 *   - Outlook  → outlook.live.com/calendar/0/deeplink/compose?...
 *
 * This is the universal pattern Headway / Calendly / Zocdoc use. No OAuth
 * required — the user picks their calendar, the OS handles the rest.
 *
 * Drop it anywhere an appointment is displayed (chat confirmations, booking
 * confirmation screens, the Care Coordination Hub, appointment detail views).
 */

import React from 'react';
import { buildICSDataUri } from '../lib/ics-calendar';

export interface AppointmentForCalendar {
  /** Stable id — used as the .ics UID so updates replace prior entries */
  id?: string;
  title: string;
  /** Display name (no email) of the provider — included in event body */
  provider?: string;
  service_type?: string;
  /** ISO 8601 — required */
  start_iso: string;
  /** ISO 8601 — if omitted, defaults to start+60min */
  end_iso?: string;
  location?: string;
  notes?: string;
}

interface AddToCalendarButtonsProps {
  appointment: AppointmentForCalendar;
  /** Layout: 'inline' (logos in a row) | 'stacked' (full-width buttons) */
  variant?: 'inline' | 'stacked';
  /** Label shown above the buttons. Set null to hide. */
  label?: string | null;
  className?: string;
}

function fmtGoogle(iso: string): string {
  // Google quick-add: YYYYMMDDTHHMMSSZ (UTC, no separators)
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function fmtOutlook(iso: string): string {
  // Outlook deeplink uses ISO with timezone, but `Z` is fine
  return new Date(iso).toISOString();
}

function buildBody(apt: AppointmentForCalendar): string {
  return [
    apt.provider && `Provider: ${apt.provider}`,
    apt.service_type && `Service: ${apt.service_type}`,
    apt.notes,
    '\nCreated by Aminy',
  ].filter(Boolean).join('\n');
}

function googleUrl(apt: AppointmentForCalendar): string {
  const end = apt.end_iso || new Date(new Date(apt.start_iso).getTime() + 60 * 60_000).toISOString();
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(apt.title)}`
    + `&dates=${fmtGoogle(apt.start_iso)}/${fmtGoogle(end)}`
    + `&details=${encodeURIComponent(buildBody(apt))}`
    + (apt.location ? `&location=${encodeURIComponent(apt.location)}` : '');
}

function outlookUrl(apt: AppointmentForCalendar): string {
  const end = apt.end_iso || new Date(new Date(apt.start_iso).getTime() + 60 * 60_000).toISOString();
  // outlook.live.com handles personal AND work accounts; it'll prompt sign-in if needed
  return 'https://outlook.live.com/calendar/0/deeplink/compose'
    + '?path=%2Fcalendar%2Faction%2Fcompose'
    + '&rru=addevent'
    + `&subject=${encodeURIComponent(apt.title)}`
    + `&body=${encodeURIComponent(buildBody(apt))}`
    + `&startdt=${fmtOutlook(apt.start_iso)}`
    + `&enddt=${fmtOutlook(end)}`
    + (apt.location ? `&location=${encodeURIComponent(apt.location)}` : '');
}

function appleUrl(apt: AppointmentForCalendar): string {
  // .ics data URI — iOS Safari hands off to Calendar.app, desktop opens default
  return buildICSDataUri({
    uid: apt.id,
    title: apt.title,
    description: buildBody(apt),
    location: apt.location,
    startISO: apt.start_iso,
    endISO: apt.end_iso,
    remindersMinutes: [60, 1440],
  });
}

export function AddToCalendarButtons({
  appointment,
  variant = 'inline',
  label = 'Add to calendar',
  className = '',
}: AddToCalendarButtonsProps) {

  const buttons = [
    {
      provider: 'apple' as const,
      label: 'Apple',
      href: appleUrl(appointment),
      download: `aminy-${(appointment.title || 'event').replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.ics`,
      icon: <AppleIcon />,
    },
    {
      provider: 'google' as const,
      label: 'Google',
      href: googleUrl(appointment),
      icon: <GoogleIcon />,
    },
    {
      provider: 'outlook' as const,
      label: 'Outlook',
      href: outlookUrl(appointment),
      icon: <OutlookIcon />,
    },
  ];

  if (variant === 'stacked') {
    return (
      <div className={`space-y-2 ${className}`}>
        {label !== null && (
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        )}
        {buttons.map(b => (
          <a
            key={b.provider}
            href={b.href}
            target={b.provider !== 'apple' ? '_blank' : undefined}
            rel="noopener noreferrer"
            download={b.download}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/40 transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              {b.icon}
            </span>
            <span className="text-sm font-medium text-slate-800 flex-1">{b.label} Calendar</span>
            <span className="text-xs text-[#6B9080] font-semibold shrink-0">Add →</span>
          </a>
        ))}
      </div>
    );
  }

  // Inline variant — compact, logos-only with text under each
  return (
    <div className={className}>
      {label !== null && (
        <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
      )}
      <div className="flex items-center gap-2">
        {buttons.map(b => (
          <a
            key={b.provider}
            href={b.href}
            target={b.provider !== 'apple' ? '_blank' : undefined}
            rel="noopener noreferrer"
            download={b.download}
            title={`Add to ${b.label} Calendar`}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/40 transition-colors min-h-[60px] min-w-[60px]"
            aria-label={`Add to ${b.label} Calendar`}
          >
            <span className="w-6 h-6 flex items-center justify-center">{b.icon}</span>
            <span className="text-[10px] font-medium text-slate-600">{b.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Brand icons (inline SVG, no deps, properly licensed brand colors) ────────

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.61-2.2.43-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0078D4" aria-hidden="true">
      <path d="M7.88 12.04c0 .76-.22 1.41-.66 1.95-.44.54-1.04.81-1.78.81-.7 0-1.27-.27-1.7-.81-.44-.55-.66-1.18-.66-1.91 0-.78.22-1.43.66-1.96.44-.53 1.03-.79 1.76-.79.74 0 1.32.26 1.74.79.42.53.64 1.17.64 1.92z"/>
      <path d="M21 3H8.5a.5.5 0 0 0-.5.5V5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9v1.5a.5.5 0 0 0 .5.5h7c.83 0 1.5-.67 1.5-1.5v-15A1.5 1.5 0 0 0 21 3zm-9.5 13H4V6h7.5v10zm9-2.5h-7V13h5v-2h-5V9h5V7h-5V5.5h7v8z"/>
    </svg>
  );
}

export default AddToCalendarButtons;
