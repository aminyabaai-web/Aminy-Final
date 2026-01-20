/**
 * Daily.co Video Service
 *
 * Real video calling integration for Aminy telehealth
 * Requires DAILY_API_KEY in Supabase secrets
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// Daily.co room configuration
export interface DailyRoomConfig {
  name?: string;
  privacy?: 'public' | 'private';
  expiryMinutes?: number;
  maxParticipants?: number;
  enableKnocking?: boolean;
  enableScreenShare?: boolean;
  enableChat?: boolean;
  enableRecording?: boolean;
  startVideoOff?: boolean;
  startAudioOff?: boolean;
}

// Daily.co room response
export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  apiCreated: boolean;
  privacy: string;
  config: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

// Daily.co meeting token
export interface DailyToken {
  token: string;
  expiresAt: string;
}

// Video call participant
export interface VideoParticipant {
  sessionId: string;
  userId?: string;
  userName?: string;
  isLocal: boolean;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
  joinedAt: string;
}

// Get access token from localStorage
const getAccessToken = (): string => {
  return typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || publicAnonKey
    : publicAnonKey;
};

/**
 * Create a Daily.co room for a telehealth session
 */
export async function createVideoRoom(
  sessionId: string,
  config: DailyRoomConfig = {}
): Promise<DailyRoom> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/video/create-room`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        ...config,
        privacy: config.privacy || 'private',
        expiryMinutes: config.expiryMinutes || 120, // 2 hours default
        maxParticipants: config.maxParticipants || 4,
        enableKnocking: config.enableKnocking ?? true,
        enableScreenShare: config.enableScreenShare ?? true,
        enableChat: config.enableChat ?? true,
        enableRecording: config.enableRecording ?? false,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create video room: ${error}`);
  }

  return response.json();
}

/**
 * Get a meeting token for joining a room
 */
export async function getMeetingToken(
  roomName: string,
  userId: string,
  userName: string,
  isProvider: boolean = false
): Promise<DailyToken> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/video/get-token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        userId,
        userName,
        isProvider,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get meeting token: ${error}`);
  }

  return response.json();
}

/**
 * Get room info by session ID
 */
export async function getRoomBySession(sessionId: string): Promise<DailyRoom | null> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/video/room/${sessionId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.text();
    throw new Error(`Failed to get room: ${error}`);
  }

  return response.json();
}

/**
 * Delete a room after session ends
 */
export async function deleteRoom(roomName: string): Promise<void> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/video/room/${roomName}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete room: ${error}`);
  }
}

/**
 * Check if Daily.co SDK is loaded
 */
export function isDailyLoaded(): boolean {
  return typeof window !== 'undefined' && 'DailyIframe' in window;
}

/**
 * Load Daily.co SDK dynamically
 */
export async function loadDailySDK(): Promise<void> {
  if (isDailyLoaded()) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Daily.co SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Create a Daily.co call object
 */
export async function createCallObject(options: {
  url: string;
  token?: string;
  userName?: string;
  startVideoOff?: boolean;
  startAudioOff?: boolean;
}): Promise<any> {
  await loadDailySDK();

  const DailyIframe = (window as any).DailyIframe;
  if (!DailyIframe) {
    throw new Error('Daily.co SDK not loaded');
  }

  const callObject = DailyIframe.createCallObject({
    url: options.url,
    token: options.token,
    userName: options.userName,
    dailyConfig: {
      experimentalChromeVideoMuteLightOff: true,
    },
    startVideoOff: options.startVideoOff ?? false,
    startAudioOff: options.startAudioOff ?? false,
  });

  return callObject;
}

/**
 * Utility to format remaining time
 */
export function formatRemainingTime(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m remaining`;
  }
  return `${minutes}m remaining`;
}

// ============================================================================
// Video Call State Management
// ============================================================================

export type CallState =
  | 'idle'
  | 'joining'
  | 'joined'
  | 'leaving'
  | 'error';

export interface VideoCallState {
  state: CallState;
  roomUrl: string | null;
  participants: VideoParticipant[];
  localParticipant: VideoParticipant | null;
  error: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

export const initialVideoCallState: VideoCallState = {
  state: 'idle',
  roomUrl: null,
  participants: [],
  localParticipant: null,
  error: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
};

// ============================================================================
// Video Call Event Handlers
// ============================================================================

export type VideoCallEventHandler = {
  onJoined?: (participant: VideoParticipant) => void;
  onParticipantJoined?: (participant: VideoParticipant) => void;
  onParticipantLeft?: (sessionId: string) => void;
  onParticipantUpdated?: (participant: VideoParticipant) => void;
  onError?: (error: string) => void;
  onCallEnded?: () => void;
};

/**
 * Create event listeners for a Daily.co call object
 */
export function attachCallEventHandlers(
  callObject: any,
  handlers: VideoCallEventHandler
): () => void {
  const handleJoinedMeeting = (event: any) => {
    const local = event.participants?.local;
    if (local && handlers.onJoined) {
      handlers.onJoined({
        sessionId: local.session_id,
        userId: local.user_id,
        userName: local.user_name,
        isLocal: true,
        video: local.video,
        audio: local.audio,
        screenShare: local.screen,
        joinedAt: new Date().toISOString(),
      });
    }
  };

  const handleParticipantJoined = (event: any) => {
    const p = event.participant;
    if (!p.local && handlers.onParticipantJoined) {
      handlers.onParticipantJoined({
        sessionId: p.session_id,
        userId: p.user_id,
        userName: p.user_name,
        isLocal: false,
        video: p.video,
        audio: p.audio,
        screenShare: p.screen,
        joinedAt: new Date().toISOString(),
      });
    }
  };

  const handleParticipantLeft = (event: any) => {
    if (handlers.onParticipantLeft) {
      handlers.onParticipantLeft(event.participant.session_id);
    }
  };

  const handleParticipantUpdated = (event: any) => {
    const p = event.participant;
    if (handlers.onParticipantUpdated) {
      handlers.onParticipantUpdated({
        sessionId: p.session_id,
        userId: p.user_id,
        userName: p.user_name,
        isLocal: p.local,
        video: p.video,
        audio: p.audio,
        screenShare: p.screen,
        joinedAt: '',
      });
    }
  };

  const handleError = (event: any) => {
    if (handlers.onError) {
      handlers.onError(event.errorMsg || 'An error occurred');
    }
  };

  const handleLeftMeeting = () => {
    if (handlers.onCallEnded) {
      handlers.onCallEnded();
    }
  };

  callObject.on('joined-meeting', handleJoinedMeeting);
  callObject.on('participant-joined', handleParticipantJoined);
  callObject.on('participant-left', handleParticipantLeft);
  callObject.on('participant-updated', handleParticipantUpdated);
  callObject.on('error', handleError);
  callObject.on('left-meeting', handleLeftMeeting);

  // Return cleanup function
  return () => {
    callObject.off('joined-meeting', handleJoinedMeeting);
    callObject.off('participant-joined', handleParticipantJoined);
    callObject.off('participant-left', handleParticipantLeft);
    callObject.off('participant-updated', handleParticipantUpdated);
    callObject.off('error', handleError);
    callObject.off('left-meeting', handleLeftMeeting);
  };
}

// ============================================================================
// Video Call Controls
// ============================================================================

/**
 * Toggle local audio (mute/unmute)
 */
export async function toggleAudio(callObject: any): Promise<boolean> {
  const newState = !callObject.localAudio();
  await callObject.setLocalAudio(newState);
  return newState;
}

/**
 * Toggle local video (on/off)
 */
export async function toggleVideo(callObject: any): Promise<boolean> {
  const newState = !callObject.localVideo();
  await callObject.setLocalVideo(newState);
  return newState;
}

/**
 * Start screen sharing
 */
export async function startScreenShare(callObject: any): Promise<void> {
  await callObject.startScreenShare();
}

/**
 * Stop screen sharing
 */
export async function stopScreenShare(callObject: any): Promise<void> {
  await callObject.stopScreenShare();
}

/**
 * Leave the call
 */
export async function leaveCall(callObject: any): Promise<void> {
  await callObject.leave();
  await callObject.destroy();
}

// ============================================================================
// Session Management for Telehealth
// ============================================================================

/**
 * Join a telehealth video session
 */
export async function joinTelehealthSession(
  appointmentId: string,
  userId: string,
  userName: string,
  isProvider: boolean = false
): Promise<{ callObject: any; roomUrl: string }> {
  // Get or create room
  let room = await getRoomBySession(appointmentId);
  if (!room) {
    room = await createVideoRoom(appointmentId, {
      privacy: 'private',
      expiryMinutes: 120,
      enableKnocking: !isProvider, // Providers don't need to knock
      enableScreenShare: true,
      enableChat: true,
    });
  }

  // Get meeting token
  const { token } = await getMeetingToken(room.name, userId, userName, isProvider);

  // Create and join call
  const callObject = await createCallObject({
    url: room.url,
    token,
    userName,
  });

  await callObject.join();

  return { callObject, roomUrl: room.url };
}

/**
 * End a telehealth session (provider only)
 */
export async function endTelehealthSession(
  callObject: any,
  roomName: string
): Promise<void> {
  await leaveCall(callObject);
  await deleteRoom(roomName);
}

export default {
  createVideoRoom,
  getMeetingToken,
  getRoomBySession,
  deleteRoom,
  loadDailySDK,
  createCallObject,
  isDailyLoaded,
  formatRemainingTime,
  attachCallEventHandlers,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  leaveCall,
  joinTelehealthSession,
  endTelehealthSession,
  initialVideoCallState,
};
