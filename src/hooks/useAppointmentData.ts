// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useAppointmentData Hook
 * Loads appointment and booking data from Supabase with localStorage fallback.
 *
 * For screens: my-appointments, on-demand-telehealth, conversational-booking
 * Tables: appointments (001_telehealth_schema), slot_holds, providers
 * Replaces localStorage keys: pending appointment data, room assignments
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { isUpcomingAppointmentStatus, normalizeAppointmentLifecycleStatus, type AppointmentLifecycleStatus } from '../lib/telehealth-ops';

// ============================================================================
// Types
// ============================================================================

export interface Appointment {
  id: string;
  providerId?: string;
  providerName?: string;
  providerPhoto?: string;
  providerCredentials?: string;
  concernId: string;
  concernLabel: string;
  visitType: 'consult' | 'extended' | 'follow-up';
  visitFormat: 'video' | 'phone' | 'in-person';
  scheduledTime: string;
  durationMinutes: number;
  status: AppointmentLifecycleStatus;
  videoRoomUrl?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface SlotHold {
  id: string;
  providerId: string;
  slotTime: string;
  durationMinutes: number;
  expiresAt: string;
}

export interface AppointmentData {
  appointments: Appointment[];
  upcoming: Appointment[];
  past: Appointment[];
  nextAppointment: Appointment | null;
  activeSlotHold: SlotHold | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEY = 'aminy-appointments-cache';

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAppointmentData(
  userId?: string,
): AppointmentData & {
  refetch: () => Promise<void>;
  bookAppointment: (details: {
    providerId: string;
    concernId: string;
    concernLabel: string;
    visitType: 'consult' | 'extended' | 'follow-up';
    visitFormat: 'video' | 'phone' | 'in-person';
    scheduledTime: string;
    durationMinutes?: number;
  }) => Promise<Appointment | null>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<boolean>;
  holdSlot: (providerId: string, slotTime: string, durationMinutes?: number) => Promise<SlotHold | null>;
} {
  const [data, setData] = useState<AppointmentData>({
    appointments: [],
    upcoming: [],
    past: [],
    nextAppointment: null,
    activeSlotHold: null,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [appointmentsResult, slotHoldsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, provider_id, concern_id, concern_label, visit_type, visit_format, scheduled_time, duration_minutes, status, video_room_url, notes, cancellation_reason, created_at')
          .eq('user_id', userId)
          .order('scheduled_time', { ascending: false })
          .limit(50)
          .then(null, (err: unknown) => {
            console.warn('[Appointments] Fetch failed:', err);
            return { data: [], error: err };
          }),

        supabase
          .from('slot_holds')
          .select('*')
          .eq('user_id', userId)
          .eq('released', false)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .then(null, (err: unknown) => {
            console.warn('[Appointments] Slot holds fetch failed:', err);
            return { data: [], error: err };
          }),
      ]);

      const safeAppts = Array.isArray(appointmentsResult?.data) ? appointmentsResult.data : [];
      const appointments: Appointment[] = safeAppts.map((a: Record<string, unknown>) => {
        return {
          id: (a.id as string) || '',
          providerId: (a.provider_id as string) || undefined,
          providerName: (a.provider_id as string) ? 'Care team provider' : undefined,
          concernId: (a.concern_id as string) || '',
          concernLabel: (a.concern_label as string) || '',
          visitType: (a.visit_type as Appointment['visitType']) || 'consult',
          visitFormat: (a.visit_format as Appointment['visitFormat']) || 'video',
          scheduledTime: (a.scheduled_time as string) || '',
          durationMinutes: (a.duration_minutes as number) || 25,
          status: normalizeAppointmentLifecycleStatus((a.status as string) || 'draft') as Appointment['status'],
          videoRoomUrl: (a.video_room_url as string) || undefined,
          notes: (a.notes as string) || undefined,
          cancellationReason: (a.cancellation_reason as string) || undefined,
          createdAt: (a.created_at as string) || '',
        };
      });

      const now = new Date();
      const upcoming = appointments.filter(a =>
        new Date(a.scheduledTime) >= now && isUpcomingAppointmentStatus(a.status)
      ).reverse();
      const past = appointments.filter(a =>
        new Date(a.scheduledTime) < now || !isUpcomingAppointmentStatus(a.status)
      );

      const safeHolds = Array.isArray(slotHoldsResult?.data) ? slotHoldsResult.data : [];
      const activeSlotHold: SlotHold | null = safeHolds.length > 0 ? {
        id: safeHolds[0].id,
        providerId: safeHolds[0].provider_id,
        slotTime: safeHolds[0].slot_time,
        durationMinutes: safeHolds[0].duration_minutes,
        expiresAt: safeHolds[0].expires_at,
      } : null;

      writeCache(CACHE_KEY, { appointments, upcoming, past });

      setData({
        appointments,
        upcoming,
        past,
        nextAppointment: upcoming[0] || null,
        activeSlotHold,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[Appointments] Load failed:', error);
      const cached = readCache<{ appointments: Appointment[]; upcoming: Appointment[]; past: Appointment[] }>(
        CACHE_KEY, { appointments: [], upcoming: [], past: [] }
      );
      setData({
        ...cached,
        nextAppointment: cached.upcoming[0] || null,
        activeSlotHold: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load appointments',
      });
    }
  }, [userId]);

  const bookAppointment = useCallback(async (details: {
    providerId: string;
    concernId: string;
    concernLabel: string;
    visitType: 'consult' | 'extended' | 'follow-up';
    visitFormat: 'video' | 'phone' | 'in-person';
    scheduledTime: string;
    durationMinutes?: number;
  }): Promise<Appointment | null> => {
    if (!userId) return null;
    try {
      const { data: newAppt, error } = await supabase
        .from('appointments')
        .insert({
          user_id: userId,
          provider_id: details.providerId,
          concern_id: details.concernId,
          concern_label: details.concernLabel,
          visit_type: details.visitType,
          visit_format: details.visitFormat,
          scheduled_time: details.scheduledTime,
          duration_minutes: details.durationMinutes || 25,
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;
      await loadData();
      return newAppt ? {
        id: newAppt.id,
        providerId: newAppt.provider_id,
        concernId: newAppt.concern_id,
        concernLabel: newAppt.concern_label,
        visitType: newAppt.visit_type,
        visitFormat: newAppt.visit_format,
        scheduledTime: newAppt.scheduled_time,
        durationMinutes: newAppt.duration_minutes,
        status: newAppt.status,
        createdAt: newAppt.created_at,
      } : null;
    } catch (err) {
      console.error('[Appointments] Book failed:', err);
      return null;
    }
  }, [userId, loadData]);

  const cancelAppointment = useCallback(async (appointmentId: string, reason?: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: reason || 'User cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .eq('user_id', userId);

      if (error) throw error;
      await loadData();
      return true;
    } catch (err) {
      console.error('[Appointments] Cancel failed:', err);
      return false;
    }
  }, [userId, loadData]);

  const holdSlot = useCallback(async (
    providerId: string,
    slotTime: string,
    durationMinutes: number = 25,
  ): Promise<SlotHold | null> => {
    if (!userId) return null;
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: hold, error } = await supabase
        .from('slot_holds')
        .insert({
          provider_id: providerId,
          user_id: userId,
          slot_time: slotTime,
          duration_minutes: durationMinutes,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      await loadData();
      return hold ? {
        id: hold.id,
        providerId: hold.provider_id,
        slotTime: hold.slot_time,
        durationMinutes: hold.duration_minutes,
        expiresAt: hold.expires_at,
      } : null;
    } catch (err) {
      console.error('[Appointments] holdSlot failed:', err);
      return null;
    }
  }, [userId, loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  return {
    ...data,
    refetch: loadData,
    bookAppointment,
    cancelAppointment,
    holdSlot,
  };
}

export default useAppointmentData;
