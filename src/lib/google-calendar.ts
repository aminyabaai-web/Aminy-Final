// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Legacy re-exports for back-compat. Real implementation moved to
 * `calendar-providers.ts` (now multi-provider: Google + Outlook + Apple).
 *
 * New code should import from `./calendar-providers` directly.
 */

export type { CalendarConnection } from './calendar-providers';
import {
  getCalendarConnection as _getConn,
  startConnect,
  completeConnect,
  pushAppointment,
  disconnect as _disconnect,
  tryPushInBackground,
} from './calendar-providers';

export const getCalendarConnection = _getConn;

export async function startGoogleCalendarConnect(): Promise<string> {
  return startConnect('google');
}

export async function completeGoogleCalendarConnect(code: string, state: string): Promise<{ email?: string }> {
  return completeConnect('google', code, state);
}

export async function pushAppointmentToCalendar(appointmentId: string): Promise<{ eventId: string; htmlLink?: string }> {
  const result = await pushAppointment(appointmentId);
  if (!result) throw new Error('No OAuth calendar connected');
  return result;
}

export async function disconnectGoogleCalendar(): Promise<void> {
  return _disconnect();
}

export { tryPushInBackground as tryPushAppointmentInBackground };
