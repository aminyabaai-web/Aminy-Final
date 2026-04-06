// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Google Calendar Bi-Directional Sync Service
 *
 * Uses Supabase Edge Functions to proxy Google Calendar API calls
 * (keeps client_secret safe on the server).
 *
 * Flow:
 * 1. User connects via Supabase OAuth with calendar scope
 * 2. AuthCallback stores provider_token + provider_refresh_token
 * 3. Edge function uses tokens to call Google Calendar API v3
 * 4. calendar_event_mappings tracks which Aminy appointments are synced
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  htmlLink?: string;
  status?: string;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  calendar_id: string;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Check if user has connected Google Calendar
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('calendar_integrations')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();
    return !!data?.is_active;
  } catch {
    return false;
  }
}

/**
 * Get calendar integration details for the current user
 */
export async function getCalendarIntegration(
  userId: string
): Promise<CalendarIntegration | null> {
  const { data } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();
  return data;
}

// ============================================================================
// OAuth Connection
// ============================================================================

/**
 * Initiate Google Calendar OAuth connection.
 * Uses Supabase OAuth with additional calendar scopes.
 * The `access_type=offline` + `prompt=consent` ensures we get a refresh_token
 * for long-lived server-side access.
 */
export async function connectGoogleCalendar(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar',
      redirectTo: `${window.location.origin}/auth/callback?calendar_connect=true`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent', // Force consent screen to get refresh token
      },
    },
  });
  if (error) throw error;
}

/**
 * Store Google Calendar tokens after OAuth callback.
 * Called from AuthCallback when `calendar_connect=true` is in the URL.
 */
export async function storeCalendarTokens(
  userId: string,
  providerToken: string,
  providerRefreshToken: string | null
): Promise<void> {
  const { error } = await supabase
    .from('calendar_integrations')
    .upsert(
      {
        user_id: userId,
        provider: 'google',
        access_token: providerToken,
        refresh_token: providerRefreshToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
        calendar_id: 'primary',
        is_active: true,
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    );

  if (error) throw error;
}

/**
 * Disconnect Google Calendar integration
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_integrations')
    .update({
      is_active: false,
      sync_enabled: false,
      access_token: null,
      refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google');

  if (error) throw error;
}

// ============================================================================
// Push to Google Calendar (Aminy -> Google)
// ============================================================================

/**
 * Sync an Aminy appointment to Google Calendar.
 * Calls the `calendar-sync` edge function which handles token refresh
 * and Google Calendar API calls server-side.
 */
export async function syncAppointmentToCalendar(
  appointmentId: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: { action: 'create_event', appointmentId },
    });

    if (error) {
      console.error('Calendar sync error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, eventId: data?.eventId };
  } catch (err: unknown) {
    console.error('Calendar sync exception:', err);
    return { success: false, error: (err as Error).message || 'Unknown error' };
  }
}

/**
 * Update an existing Google Calendar event when an Aminy appointment changes
 */
export async function updateCalendarEvent(
  appointmentId: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: { action: 'update_event', appointmentId },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, eventId: data?.eventId };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Unknown error' };
  }
}

/**
 * Delete a Google Calendar event when an Aminy appointment is cancelled
 */
export async function deleteCalendarEvent(
  appointmentId: string
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: { action: 'delete_event', appointmentId },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Unknown error' };
  }
}

// ============================================================================
// Pull from Google Calendar (Google -> Aminy)
// ============================================================================

/**
 * Pull events from Google Calendar into Aminy.
 * Returns external calendar events that can be displayed alongside
 * Aminy appointments for a unified calendar view.
 */
export async function pullCalendarEvents(
  since?: string
): Promise<GoogleCalendarEvent[]> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: {
        action: 'list_events',
        since: since || new Date().toISOString(),
      },
    });

    if (error) {
      console.error('Failed to pull calendar events:', error);
      return [];
    }

    return data?.events || [];
  } catch (err) {
    console.error('Pull calendar events exception:', err);
    return [];
  }
}

// ============================================================================
// Full Sync
// ============================================================================

/**
 * Trigger a full bi-directional sync.
 * Pushes all unsynced Aminy appointments to Google Calendar,
 * and pulls upcoming Google Calendar events into the local view.
 */
export async function triggerFullSync(): Promise<{
  pushed: number;
  pulled: number;
  errors: string[];
}> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: { action: 'sync_all' },
    });

    if (error) {
      return { pushed: 0, pulled: 0, errors: [error.message] };
    }

    return data || { pushed: 0, pulled: 0, errors: [] };
  } catch (err: unknown) {
    return { pushed: 0, pulled: 0, errors: [(err as Error).message || 'Sync failed'] };
  }
}

/**
 * Toggle auto-sync on/off for the user's calendar integration
 */
export async function toggleAutoSync(
  userId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('calendar_integrations')
    .update({
      sync_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google');

  if (error) throw error;
}
