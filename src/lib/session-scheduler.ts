// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Session Scheduler Service
 *
 * Provides scheduling, retrieval, cancellation, and reminder functions
 * for telehealth sessions. Backed by Supabase with localStorage fallback.
 *
 * Functions:
 * - bookSession(providerId, childId, dateTime, duration, visitType)
 * - getUpcomingSessions(userId)
 * - cancelSession(sessionId, reason)
 * - sendReminder(sessionId)
 * - getProviderAvailability(providerId, date)
 */

import { supabase } from '../utils/supabase/client';
import type { SessionStatus } from '../types/app';

// Re-export so existing consumers still work
export type { SessionStatus };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VisitType =
  | 'initial-evaluation'
  | 'follow-up'
  | 'crisis'
  | 'medication-review'
  | 'therapy'
  | 'parent-coaching'
  | 'team-meeting';

export interface ScheduledSession {
  id: string;
  providerId: string;
  providerName: string;
  providerTitle?: string;
  providerPhotoUrl?: string;
  patientId: string;
  childId?: string;
  childName?: string;
  dateTime: string; // ISO
  duration: number; // minutes
  visitType: VisitType;
  status: SessionStatus;
  roomUrl?: string;
  cancellationReason?: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderTimeSlot {
  startTime: string; // ISO
  endTime: string;   // ISO
  available: boolean;
}

export interface BookSessionParams {
  providerId: string;
  childId?: string;
  dateTime: string;
  duration: number;
  visitType: VisitType;
  userId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSIONS_KEY = 'aminy_scheduled_sessions';

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  'initial-evaluation': 'Initial Evaluation',
  'follow-up': 'Follow-Up Visit',
  'crisis': 'Crisis Session',
  'medication-review': 'Medication Review',
  'therapy': 'Therapy Session',
  'parent-coaching': 'Parent Coaching',
  'team-meeting': 'Team Meeting',
};

export const VISIT_TYPE_DURATIONS: Record<VisitType, number[]> = {
  'initial-evaluation': [50, 80],
  'follow-up': [25, 50],
  'crisis': [25, 50],
  'medication-review': [25],
  'therapy': [50],
  'parent-coaching': [25, 50],
  'team-meeting': [25, 50],
};

// ---------------------------------------------------------------------------
// Local storage helpers
// ---------------------------------------------------------------------------

function getLocalSessions(): ScheduledSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: ScheduledSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

// ---------------------------------------------------------------------------
// bookSession
// ---------------------------------------------------------------------------

/**
 * Creates a new scheduled appointment in Supabase.
 */
export async function bookSession(params: BookSessionParams): Promise<ScheduledSession> {
  const now = new Date().toISOString();
  const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Look up provider name
  let providerName = 'Provider';
  let providerTitle: string | undefined;
  let providerPhotoUrl: string | undefined;

  try {
    const { data: prov } = await supabase
      .from('providers')
      .select('first_name, last_name, title, avatar_url')
      .eq('id', params.providerId)
      .single();

    if (prov) {
      providerName = `${prov.first_name} ${prov.last_name}`;
      providerTitle = prov.title as string;
      providerPhotoUrl = prov.avatar_url as string;
    }
  } catch {
    // Provider lookup failed -- use fallback
  }

  const session: ScheduledSession = {
    id,
    providerId: params.providerId,
    providerName,
    providerTitle,
    providerPhotoUrl,
    patientId: params.userId,
    childId: params.childId,
    dateTime: params.dateTime,
    duration: params.duration,
    visitType: params.visitType,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { error } = await supabase.from('telehealth_sessions').insert({
      id: session.id,
      provider_id: session.providerId,
      provider_name: session.providerName,
      patient_id: session.patientId,
      child_id: session.childId,
      scheduled_at: session.dateTime,
      duration: session.duration,
      visit_type: session.visitType,
      status: session.status,
      created_at: now,
      updated_at: now,
    });

    if (error) throw error;
  } catch (err) {
    console.warn('[session-scheduler] Supabase insert failed, saving locally:', err);
    const local = getLocalSessions();
    local.push(session);
    saveLocalSessions(local);
  }

  return session;
}

// ---------------------------------------------------------------------------
// getUpcomingSessions
// ---------------------------------------------------------------------------

/**
 * Returns upcoming scheduled sessions for a user, sorted by date ascending.
 */
export async function getUpcomingSessions(userId: string): Promise<ScheduledSession[]> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select(`
        *,
        providers (
          first_name,
          last_name,
          title,
          avatar_url
        )
      `)
      .or(`patient_id.eq.${userId},provider_id.eq.${userId}`)
      .gte('scheduled_at', now)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: Record<string, unknown>) => {
      const prov = row.providers as { first_name?: string; last_name?: string; title?: string; avatar_url?: string } | null;
      return {
        id: row.id as string,
        providerId: row.provider_id as string,
        providerName: prov ? `${prov.first_name} ${prov.last_name}` : (row.provider_name as string || 'Provider'),
        providerTitle: prov?.title,
        providerPhotoUrl: prov?.avatar_url,
        patientId: row.patient_id as string,
        childId: row.child_id as string | undefined,
        dateTime: row.scheduled_at as string,
        duration: row.duration as number,
        visitType: (row.visit_type || 'follow-up') as VisitType,
        status: row.status as SessionStatus,
        roomUrl: row.room_url as string | undefined,
        cancellationReason: row.cancellation_reason as string | undefined,
        reminderSentAt: row.reminder_sent_at as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
    });
  } catch (err) {
    console.warn('[session-scheduler] Supabase fetch failed, using local:', err);
    return getLocalSessions()
      .filter(s =>
        (s.patientId === userId || s.providerId === userId) &&
        s.dateTime >= now &&
        ['scheduled', 'confirmed'].includes(s.status),
      )
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }
}

// ---------------------------------------------------------------------------
// cancelSession
// ---------------------------------------------------------------------------

/**
 * Cancels a session with an optional reason.
 */
export async function cancelSession(
  sessionId: string,
  reason?: string,
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('telehealth_sessions')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: now,
      })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[session-scheduler] Cancel failed in Supabase, updating local:', err);
    const sessions = getLocalSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx >= 0) {
      sessions[idx].status = 'cancelled';
      sessions[idx].cancellationReason = reason;
      sessions[idx].updatedAt = now;
      saveLocalSessions(sessions);
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// sendReminder
// ---------------------------------------------------------------------------

/**
 * Triggers a reminder notification for an upcoming session.
 * In production this would call the push notification service.
 * For now, it updates the reminder_sent_at timestamp.
 */
export async function sendReminder(sessionId: string): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('telehealth_sessions')
      .update({
        reminder_sent_at: now,
        updated_at: now,
      })
      .eq('id', sessionId);

    if (error) throw error;

    // In production: trigger push notification via edge function
    console.log(`[session-scheduler] Reminder sent for session ${sessionId}`);
    return true;
  } catch (err) {
    console.warn('[session-scheduler] Reminder send failed:', err);
    const sessions = getLocalSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx >= 0) {
      sessions[idx].reminderSentAt = now;
      sessions[idx].updatedAt = now;
      saveLocalSessions(sessions);
    }
    return true; // Don't block the user if reminder fails
  }
}

// ---------------------------------------------------------------------------
// getProviderAvailability
// ---------------------------------------------------------------------------

/**
 * Fetch available time slots for a provider on a given date.
 * Returns 30-minute slots from 8 AM to 5 PM by default.
 * In production, this would check the provider's actual calendar.
 */
export async function getProviderAvailability(
  providerId: string,
  date: string, // YYYY-MM-DD
): Promise<ProviderTimeSlot[]> {
  const slots: ProviderTimeSlot[] = [];
  const dayStart = new Date(`${date}T08:00:00`);

  // Generate 30-minute slots from 8 AM to 5 PM
  for (let i = 0; i < 18; i++) {
    const start = new Date(dayStart.getTime() + i * 30 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    slots.push({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      available: true,
    });
  }

  // Check Supabase for existing bookings to mark as unavailable
  try {
    const dayEnd = new Date(`${date}T23:59:59`);
    const { data } = await supabase
      .from('telehealth_sessions')
      .select('scheduled_at, duration')
      .eq('provider_id', providerId)
      .gte('scheduled_at', dayStart.toISOString())
      .lte('scheduled_at', dayEnd.toISOString())
      .in('status', ['scheduled', 'confirmed', 'in-progress']);

    if (data) {
      for (const booking of data) {
        const bookingStart = new Date(booking.scheduled_at as string).getTime();
        const bookingEnd = bookingStart + (booking.duration as number) * 60 * 1000;

        for (const slot of slots) {
          const slotStart = new Date(slot.startTime).getTime();
          const slotEnd = new Date(slot.endTime).getTime();

          // Mark as unavailable if overlapping
          if (slotStart < bookingEnd && slotEnd > bookingStart) {
            slot.available = false;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[session-scheduler] Availability check failed:', err);
    // Return all slots as available if check fails
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default {
  bookSession,
  getUpcomingSessions,
  cancelSession,
  sendReminder,
  getProviderAvailability,
  VISIT_TYPE_LABELS,
  VISIT_TYPE_DURATIONS,
};
