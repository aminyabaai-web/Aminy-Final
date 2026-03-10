/**
 * useVideoSessionData Hook
 * Loads telehealth/video session data from Supabase with localStorage fallback.
 *
 * For screens: video-call, daily-video-room, video-call-room, multi-role-telehealth
 * Tables: provider_sessions (019_provider_portal), appointments (001_telehealth_schema)
 * Replaces localStorage keys: aminy-active-session-id, aminy-daily-room-url
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface VideoSession {
  id: string;
  appointmentId?: string;
  providerSessionId?: string;
  roomUrl: string;
  roomName?: string;
  roomExpiresAt?: string;
  providerId?: string;
  providerName?: string;
  patientId?: string;
  familyId?: string;
  sessionType: 'telehealth' | 'in-person';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  scheduledAt?: string;
  durationMinutes: number;
  startedAt?: string;
  endedAt?: string;
}

export interface VideoSessionData {
  activeSession: VideoSession | null;
  upcomingSessions: VideoSession[];
  recentSessions: VideoSession[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Cache keys — ONLY for offline fallback
// ============================================================================

const CACHE_KEYS = {
  ACTIVE_SESSION: 'aminy-active-session-cache',
  UPCOMING: 'aminy-video-upcoming-cache',
} as const;

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
  } catch {
    // Storage full or blocked — ignore
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVideoSessionData(
  userId?: string,
): VideoSessionData & {
  refetch: () => Promise<void>;
  setActiveSession: (sessionId: string, roomUrl: string) => Promise<void>;
  clearActiveSession: () => void;
  joinSession: (sessionId: string) => Promise<string | null>;
} {
  const [data, setData] = useState<VideoSessionData>({
    activeSession: null,
    upcomingSessions: [],
    recentSessions: [],
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

      const [appointmentsResult, providerSessionsResult] = await Promise.all([
        // Get upcoming telehealth appointments with video rooms
        supabase
          .from('appointments')
          .select('*, providers(first_name, last_name)')
          .eq('user_id', userId)
          .in('status', ['scheduled', 'confirmed', 'in-progress'])
          .eq('visit_format', 'video')
          .gte('scheduled_time', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .order('scheduled_time', { ascending: true })
          .limit(10)
          .then(null, (err: unknown) => {
            console.warn('[VideoSession] Appointments fetch failed:', err);
            return { data: [], error: err };
          }),

        // Get provider sessions (if user is a provider)
        supabase
          .from('provider_sessions')
          .select('*')
          .in('status', ['scheduled', 'confirmed', 'in-progress'])
          .eq('session_type', 'telehealth')
          .gte('scheduled_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(10)
          .then(null, (err: unknown) => {
            if (import.meta.env.DEV) {
              console.warn('[VideoSession] Provider sessions fetch failed:', err);
            }
            return { data: [], error: err };
          }),
      ]);

      // Map appointments to VideoSession format
      const safeAppointments = Array.isArray(appointmentsResult?.data) ? appointmentsResult.data : [];
      const appointmentSessions: VideoSession[] = safeAppointments.map((a: Record<string, unknown>) => {
        const providers = a.providers as Record<string, string> | null;
        return {
          id: (a.id as string) || '',
          appointmentId: (a.id as string) || '',
          roomUrl: (a.video_room_url as string) || '',
          roomName: (a.video_room_name as string) || undefined,
          providerId: (a.provider_id as string) || undefined,
          providerName: providers
            ? `${providers.first_name || ''} ${providers.last_name || ''}`.trim()
            : undefined,
          sessionType: 'telehealth' as const,
          status: (a.status as VideoSession['status']) || 'scheduled',
          scheduledAt: (a.scheduled_time as string) || undefined,
          durationMinutes: (a.duration_minutes as number) || 25,
        };
      });

      // Map provider sessions
      const safeProvSessions = Array.isArray(providerSessionsResult?.data) ? providerSessionsResult.data : [];
      const provSessions: VideoSession[] = safeProvSessions.map((s: Record<string, unknown>) => ({
        id: (s.id as string) || '',
        providerSessionId: (s.id as string) || '',
        roomUrl: (s.room_url as string) || '',
        roomExpiresAt: (s.room_expires_at as string) || undefined,
        patientId: (s.patient_id as string) || undefined,
        sessionType: 'telehealth' as const,
        status: (s.status as VideoSession['status']) || 'scheduled',
        scheduledAt: (s.scheduled_at as string) || undefined,
        durationMinutes: (s.duration_minutes as number) || 50,
      }));

      const allSessions = [...appointmentSessions, ...provSessions];

      // Find active session (in-progress or upcoming within 15 min)
      const activeSession = allSessions.find(s => s.status === 'in-progress') ||
        allSessions.find(s => {
          if (!s.scheduledAt) return false;
          const diff = new Date(s.scheduledAt).getTime() - Date.now();
          return diff <= 15 * 60 * 1000 && diff >= -60 * 60 * 1000;
        }) || null;

      const upcomingSessions = allSessions.filter(s =>
        s.status === 'scheduled' || s.status === 'confirmed'
      );

      // Cache active session for offline
      if (activeSession) {
        writeCache(CACHE_KEYS.ACTIVE_SESSION, activeSession);
      }
      writeCache(CACHE_KEYS.UPCOMING, upcomingSessions);

      setData({
        activeSession,
        upcomingSessions,
        recentSessions: [],
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('[VideoSession] Load failed:', error);
      const cachedActive = readCache<VideoSession | null>(CACHE_KEYS.ACTIVE_SESSION, null);
      const cachedUpcoming = readCache<VideoSession[]>(CACHE_KEYS.UPCOMING, []);
      setData({
        activeSession: cachedActive,
        upcomingSessions: cachedUpcoming,
        recentSessions: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load video sessions',
      });
    }
  }, [userId]);

  const setActiveSession = useCallback(async (sessionId: string, roomUrl: string) => {
    if (userId) {
      try {
        await supabase
          .from('appointments')
          .update({ status: 'in-progress', video_room_url: roomUrl })
          .eq('id', sessionId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('[VideoSession] setActiveSession Supabase update failed:', err);
      }
    }
    writeCache(CACHE_KEYS.ACTIVE_SESSION, { id: sessionId, roomUrl });
    await loadData();
  }, [userId, loadData]);

  const clearActiveSession = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.ACTIVE_SESSION);
    setData(prev => ({ ...prev, activeSession: null }));
  }, []);

  const joinSession = useCallback(async (sessionId: string): Promise<string | null> => {
    if (!userId) return null;
    try {
      const { data: session } = await supabase
        .from('appointments')
        .select('video_room_url')
        .eq('id', sessionId)
        .single();
      if (session?.video_room_url) {
        await setActiveSession(sessionId, session.video_room_url);
        return session.video_room_url;
      }
    } catch (err) {
      console.warn('[VideoSession] joinSession failed:', err);
    }
    return null;
  }, [userId, setActiveSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refetch: loadData,
    setActiveSession,
    clearActiveSession,
    joinSession,
  };
}

export default useVideoSessionData;
