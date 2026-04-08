// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Telehealth Integration
 * Video session capabilities for provider-family consultations
 *
 * Supports:
 * - Daily.co (primary)
 * - Twilio Video (fallback)
 * - Session scheduling
 * - Recording consent
 * - Waiting room
 */

import { createClientSupabaseClient } from '../utils/supabase/client';
import type { SessionStatus } from '../types/app';

const supabase = createClientSupabaseClient();

// Re-export so existing consumers still work
export type { SessionStatus };

// ============================================================================
// TYPES
// ============================================================================

export type TelehealthProvider = 'daily' | 'twilio';

export interface TelehealthSession {
  id: string;
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  childId?: string;
  scheduledAt: string;
  duration: number; // minutes
  status: SessionStatus;
  roomUrl?: string;
  roomName?: string;
  recordingConsent: boolean;
  recordingUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaitingRoomParticipant {
  id: string;
  sessionId: string;
  name: string;
  role: 'provider' | 'patient';
  joinedAt: string;
  admitted: boolean;
}

export interface VideoRoomConfig {
  roomName: string;
  roomUrl: string;
  token?: string;
  enableRecording: boolean;
  enableChat: boolean;
  enableScreenShare: boolean;
  maxDuration: number; // minutes
  waitingRoomEnabled: boolean;
}

// ============================================================================
// DAILY.CO INTEGRATION
// ============================================================================

const DAILY_API_KEY = process.env.NEXT_PUBLIC_DAILY_API_KEY || '';
const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'aminy.daily.co';

export interface DailyRoomProperties {
  privacy: 'private' | 'public';
  exp?: number; // Unix timestamp
  nbf?: number; // Not before timestamp
  max_participants?: number;
  enable_recording?: 'cloud' | 'local' | 'rtp-tracks' | 'raw-tracks';
  enable_chat?: boolean;
  enable_screenshare?: boolean;
  enable_knocking?: boolean; // Waiting room
  start_video_off?: boolean;
  start_audio_off?: boolean;
}

export interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: 'private' | 'public';
  url: string;
  created_at: string;
  config: DailyRoomProperties;
}

/**
 * Create a Daily.co room for a session
 */
export async function createDailyRoom(
  sessionId: string,
  config: Partial<DailyRoomProperties> = {}
): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    console.warn('[Telehealth] Daily API key not configured');
    return null;
  }

  try {
    const roomName = `aminy-${sessionId}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 2; // 2 hours

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp: expiresAt,
          max_participants: 4,
          enable_recording: config.enable_recording || 'cloud',
          enable_chat: config.enable_chat ?? true,
          enable_screenshare: config.enable_screenshare ?? true,
          enable_knocking: config.enable_knocking ?? true, // Waiting room
          start_video_off: config.start_video_off ?? false,
          start_audio_off: config.start_audio_off ?? true,
          ...config,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Daily API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('[Telehealth] Failed to create Daily room:', error);
    return null;
  }
}

/**
 * Create a meeting token for a participant
 */
export async function createDailyToken(
  roomName: string,
  participant: {
    userId: string;
    userName: string;
    isOwner: boolean;
  }
): Promise<string | null> {
  if (!DAILY_API_KEY) {
    return null;
  }

  try {
    const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: participant.userName,
          user_id: participant.userId,
          is_owner: participant.isOwner,
          enable_recording: participant.isOwner ? 'cloud' : undefined,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2 hours
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Daily API error: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('[Telehealth] Failed to create Daily token:', error);
    return null;
  }
}

/**
 * Delete a Daily.co room
 */
export async function deleteDailyRoom(roomName: string): Promise<boolean> {
  if (!DAILY_API_KEY) {
    return false;
  }

  try {
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[Telehealth] Failed to delete Daily room:', error);
    return false;
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const SESSIONS_STORAGE_KEY = 'aminy_telehealth_sessions';

function getLocalSessions(): TelehealthSession[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalSessions(sessions: TelehealthSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Schedule a telehealth session
 */
export async function scheduleSession(session: {
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  childId?: string;
  scheduledAt: string;
  duration: number;
  recordingConsent: boolean;
}): Promise<TelehealthSession> {
  const newSession: TelehealthSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...session,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .insert({
        id: newSession.id,
        provider_id: session.providerId,
        provider_name: session.providerName,
        patient_id: session.patientId,
        patient_name: session.patientName,
        child_id: session.childId,
        scheduled_at: session.scheduledAt,
        duration: session.duration,
        status: 'scheduled',
        recording_consent: session.recordingConsent,
        created_at: newSession.createdAt,
        updated_at: newSession.updatedAt,
      })
      .select()
      .single();

    if (error) throw error;

    // Create the video room
    const room = await createDailyRoom(newSession.id, {
      enable_recording: session.recordingConsent ? 'cloud' : undefined,
    });

    if (room) {
      newSession.roomName = room.name;
      newSession.roomUrl = room.url;

      // Update with room info
      await supabase
        .from('telehealth_sessions')
        .update({
          room_name: room.name,
          room_url: room.url,
        })
        .eq('id', newSession.id);
    }

    return newSession;
  } catch (err) {
    console.warn('[Telehealth] Supabase error, saving locally:', err);
    const sessions = getLocalSessions();
    sessions.push(newSession);
    saveLocalSessions(sessions);
    return newSession;
  }
}

/**
 * Get upcoming sessions for a user
 */
export async function getUpcomingSessions(
  userId: string,
  role: 'provider' | 'patient'
): Promise<TelehealthSession[]> {
  const now = new Date().toISOString();

  try {
    const column = role === 'provider' ? 'provider_id' : 'patient_id';
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('*')
      .eq(column, userId)
      .gte('scheduled_at', now)
      .in('status', ['scheduled', 'waiting', 'in-progress'])
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      patientId: row.patient_id,
      patientName: row.patient_name,
      childId: row.child_id,
      scheduledAt: row.scheduled_at,
      duration: row.duration,
      status: row.status,
      roomUrl: row.room_url,
      roomName: row.room_name,
      recordingConsent: row.recording_consent,
      recordingUrl: row.recording_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn('[Telehealth] Supabase error, using localStorage:', err);
    const sessions = getLocalSessions();
    const column = role === 'provider' ? 'providerId' : 'patientId';
    return sessions
      .filter(s =>
        s[column] === userId &&
        s.scheduledAt >= now &&
        ['scheduled', 'waiting', 'in-progress'].includes(s.status)
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }
}

/**
 * Get a specific session
 */
export async function getSession(sessionId: string): Promise<TelehealthSession | null> {
  try {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;

    return data ? {
      id: data.id,
      providerId: data.provider_id,
      providerName: data.provider_name,
      patientId: data.patient_id,
      patientName: data.patient_name,
      childId: data.child_id,
      scheduledAt: data.scheduled_at,
      duration: data.duration,
      status: data.status,
      roomUrl: data.room_url,
      roomName: data.room_name,
      recordingConsent: data.recording_consent,
      recordingUrl: data.recording_url,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } : null;
  } catch (err) {
    console.warn('[Telehealth] Supabase error, using localStorage:', err);
    const sessions = getLocalSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  notes?: string
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('telehealth_sessions')
      .update({
        status,
        notes: notes || undefined,
        updated_at: now,
      })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Telehealth] Supabase error, updating locally:', err);
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex >= 0) {
      sessions[sessionIndex].status = status;
      sessions[sessionIndex].notes = notes;
      sessions[sessionIndex].updatedAt = now;
      saveLocalSessions(sessions);
      return true;
    }
    return false;
  }
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string, reason?: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  // Delete the video room if it exists
  if (session.roomName) {
    await deleteDailyRoom(session.roomName);
  }

  return updateSessionStatus(sessionId, 'cancelled', reason);
}

/**
 * Join a session (get room config with token)
 */
export async function joinSession(
  sessionId: string,
  participant: {
    userId: string;
    userName: string;
    role: 'provider' | 'patient';
  }
): Promise<VideoRoomConfig | null> {
  const session = await getSession(sessionId);
  if (!session || !session.roomName) {
    console.error('[Telehealth] Session or room not found');
    return null;
  }

  // Create a meeting token
  const token = await createDailyToken(session.roomName, {
    userId: participant.userId,
    userName: participant.userName,
    isOwner: participant.role === 'provider',
  });

  // Update session status if not already in progress
  if (session.status === 'scheduled') {
    await updateSessionStatus(sessionId, 'waiting');
  }

  return {
    roomName: session.roomName,
    roomUrl: session.roomUrl || `https://${DAILY_DOMAIN}/${session.roomName}`,
    token: token || undefined,
    enableRecording: session.recordingConsent && participant.role === 'provider',
    enableChat: true,
    enableScreenShare: participant.role === 'provider',
    maxDuration: session.duration,
    waitingRoomEnabled: true,
  };
}

/**
 * End a session
 */
export async function endSession(
  sessionId: string,
  sessionNotes?: string
): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  // Delete the video room
  if (session.roomName) {
    await deleteDailyRoom(session.roomName);
  }

  return updateSessionStatus(sessionId, 'completed', sessionNotes);
}

// ============================================================================
// WAITING ROOM
// ============================================================================

/**
 * Add participant to waiting room
 */
export async function joinWaitingRoom(
  sessionId: string,
  participant: {
    userId: string;
    userName: string;
    role: 'provider' | 'patient';
  }
): Promise<WaitingRoomParticipant> {
  const waitingParticipant: WaitingRoomParticipant = {
    id: `waiting-${Date.now()}`,
    sessionId,
    name: participant.userName,
    role: participant.role,
    joinedAt: new Date().toISOString(),
    admitted: participant.role === 'provider', // Providers auto-admitted
  };

  // In a real implementation, this would use real-time subscriptions
  // For now, just return the participant
  return waitingParticipant;
}

/**
 * Admit a participant from waiting room
 */
export async function admitFromWaitingRoom(
  sessionId: string,
  participantId: string
): Promise<boolean> {
  // In a real implementation, this would update the participant's admitted status
  // and trigger a real-time notification
  void (`[Telehealth] Admitting participant ${participantId} to session ${sessionId}`);
  return true;
}

// ============================================================================
// RECORDING
// ============================================================================

/**
 * Get recording URL for a completed session
 */
export async function getSessionRecording(sessionId: string): Promise<string | null> {
  const session = await getSession(sessionId);
  if (!session || !session.recordingConsent || session.status !== 'completed') {
    return null;
  }

  return session.recordingUrl || null;
}

// ============================================================================
// CALENDAR INTEGRATION
// ============================================================================

/**
 * Generate iCal event for a session
 */
export function generateICalEvent(session: TelehealthSession): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = new Date(startDate.getTime() + session.duration * 60 * 1000);

  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const icalEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aminy//Telehealth//EN
BEGIN:VEVENT
UID:${session.id}@aminy.ai
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Aminy Telehealth Session
DESCRIPTION:Video session with ${session.providerName}\\n\\nJoin at: ${session.roomUrl || 'Link will be provided'}
LOCATION:${session.roomUrl || 'Online'}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  return icalEvent;
}

/**
 * Download iCal file
 */
export function downloadICalEvent(session: TelehealthSession): void {
  const icalContent = generateICalEvent(session);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aminy-session-${session.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Daily.co
  createDailyRoom,
  createDailyToken,
  deleteDailyRoom,

  // Session management
  scheduleSession,
  getUpcomingSessions,
  getSession,
  updateSessionStatus,
  cancelSession,
  joinSession,
  endSession,

  // Waiting room
  joinWaitingRoom,
  admitFromWaitingRoom,

  // Recording
  getSessionRecording,

  // Calendar
  generateICalEvent,
  downloadICalEvent,
};
