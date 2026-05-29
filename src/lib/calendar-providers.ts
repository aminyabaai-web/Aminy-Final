// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Calendar Providers — unified API for Google, Outlook, and Apple (.ics).
 *
 * Google + Outlook: full OAuth + auto-push of appointments.
 * Apple: no OAuth available — uses universal .ics file (works on iOS Calendar,
 *        Apple Calendar Mac, AND anywhere else as a fallback).
 *
 * Single-provider constraint: a user has ONE OAuth provider connected at a
 * time (the user_calendar_tokens table has UNIQUE(user_id)). Apple .ics is
 * always available alongside whichever OAuth provider is connected.
 */

import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { buildICSDataUri, downloadICS, type ICSEvent } from './ics-calendar';

export type CalendarProvider = 'google' | 'outlook' | 'apple';

const GOOGLE_BASE = `https://${projectId}.supabase.co/functions/v1/google-calendar`;
const OUTLOOK_BASE = `https://${projectId}.supabase.co/functions/v1/outlook-calendar`;

function endpointFor(provider: 'google' | 'outlook'): string {
  return provider === 'google' ? GOOGLE_BASE : OUTLOOK_BASE;
}

async function authedFetch(provider: 'google' | 'outlook', path: string, body: unknown): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in first');

  return fetch(`${endpointFor(provider)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
}

export interface CalendarConnection {
  connected: boolean;
  provider?: CalendarProvider;
  email?: string;
  status?: 'active' | 'expired' | 'revoked' | 'error';
  connectedAt?: string;
  lastSyncedAt?: string;
  targetCalendarName?: string;
}

/** Get current OAuth connection (Google OR Outlook). Apple is always usable via .ics. */
export async function getCalendarConnection(): Promise<CalendarConnection> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connected: false };

  const { data } = await supabase
    .from('user_calendar_tokens')
    .select('provider, email, status, connected_at, last_synced_at, target_calendar_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return { connected: false };
  return {
    connected: data.status === 'active',
    provider: data.provider as CalendarProvider,
    email: data.email,
    status: data.status as CalendarConnection['status'],
    connectedAt: data.connected_at,
    lastSyncedAt: data.last_synced_at,
    targetCalendarName: data.target_calendar_name,
  };
}

/** Start OAuth for a given provider. Returns the consent URL. */
export async function startConnect(provider: 'google' | 'outlook'): Promise<string> {
  const resp = await authedFetch(provider, '/auth-url', {});
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to start ${provider} connect (${resp.status})`);
  }
  const { url } = await resp.json();
  return url;
}

/** Complete OAuth — exchange the code for tokens. */
export async function completeConnect(provider: 'google' | 'outlook', code: string, state: string): Promise<{ email?: string }> {
  const resp = await authedFetch(provider, '/exchange', { code, state });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Token exchange failed (${resp.status})`);
  }
  return await resp.json();
}

/** Push an Aminy appointment to whichever OAuth calendar is connected. No-op for Apple. */
export async function pushAppointment(appointmentId: string): Promise<{ eventId: string; htmlLink?: string } | null> {
  const conn = await getCalendarConnection();
  if (!conn.connected || !conn.provider || conn.provider === 'apple') return null;

  const resp = await authedFetch(conn.provider, '/push-event', { appointmentId });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Push failed (${resp.status})`);
  }
  return await resp.json();
}

/** Disconnect whichever OAuth provider is currently connected. */
export async function disconnect(): Promise<void> {
  const conn = await getCalendarConnection();
  if (!conn.provider || conn.provider === 'apple') return;

  const resp = await authedFetch(conn.provider, '/disconnect', {});
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Disconnect failed (${resp.status})`);
  }
}

/** Fire-and-forget push — used after chat ADD_APPOINTMENT smart action. */
export function tryPushInBackground(appointmentId: string): void {
  pushAppointment(appointmentId).catch(err => {
    if (import.meta.env.DEV) console.warn('[calendar] background push failed:', err.message);
  });
}

// ─── Apple Calendar (.ics) — works for any calendar app ──────────────────────

/** Build a one-tap .ics data URI from an appointment-shaped object. */
export function buildICSForAppointment(apt: {
  id?: string;
  title: string;
  provider_name?: string | null;
  service_type?: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  notes?: string | null;
}): string {
  const event: ICSEvent = {
    uid: apt.id,
    title: apt.title,
    description: [
      apt.provider_name && `Provider: ${apt.provider_name}`,
      apt.service_type && `Service: ${apt.service_type}`,
      apt.notes,
    ].filter(Boolean).join('\n'),
    location: apt.location || undefined,
    startISO: apt.start_at,
    endISO: apt.end_at || undefined,
    remindersMinutes: [60, 1440],
  };
  return buildICSDataUri(event);
}

/** Force-download an .ics file (alternative to data-URI link). */
export function downloadAppointmentICS(apt: Parameters<typeof buildICSForAppointment>[0]): void {
  const event: ICSEvent = {
    uid: apt.id,
    title: apt.title,
    description: [
      apt.provider_name && `Provider: ${apt.provider_name}`,
      apt.service_type && `Service: ${apt.service_type}`,
      apt.notes,
    ].filter(Boolean).join('\n'),
    location: apt.location || undefined,
    startISO: apt.start_at,
    endISO: apt.end_at || undefined,
    remindersMinutes: [60, 1440],
  };
  downloadICS(event, `aminy-${apt.title.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.ics`);
}
