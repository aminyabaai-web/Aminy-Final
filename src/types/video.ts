/**
 * Daily.co Video Types
 * Type definitions for video conferencing functionality
 */

// Daily.co native types (subset we use)
export interface DailyParticipant {
  user_id?: string;
  user_name?: string;
  session_id: string;
  local: boolean;
  audio: boolean;
  video: boolean;
  screen: boolean;
  joined_at: Date;
  tracks: {
    audio?: DailyTrack;
    video?: DailyTrack;
    screenAudio?: DailyTrack;
    screenVideo?: DailyTrack;
  };
}

export interface DailyTrack {
  state: 'playable' | 'loading' | 'interrupted' | 'blocked' | 'off' | 'sendable';
  persistentTrack?: MediaStreamTrack;
}

export interface DailyCallObject {
  join: (options?: { url?: string }) => Promise<DailyParticipant>;
  leave: () => Promise<void>;
  destroy: () => Promise<void>;
  setLocalAudio: (enabled: boolean) => void;
  setLocalVideo: (enabled: boolean) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  participants: () => Record<string, DailyParticipant>;
  localAudio: () => boolean;
  localVideo: () => boolean;
  on: (event: DailyEventType, handler: DailyEventHandler) => void;
  off: (event: DailyEventType, handler: DailyEventHandler) => void;
  meetingState: () => DailyMeetingState;
}

export type DailyMeetingState =
  | 'new'
  | 'loading'
  | 'loaded'
  | 'joining-meeting'
  | 'joined-meeting'
  | 'left-meeting'
  | 'error';

export type DailyEventType =
  | 'joined-meeting'
  | 'left-meeting'
  | 'participant-joined'
  | 'participant-left'
  | 'participant-updated'
  | 'error'
  | 'camera-error'
  | 'track-started'
  | 'track-stopped'
  | 'network-quality-change'
  | 'recording-started'
  | 'recording-stopped';

export type DailyEventHandler = (event: DailyEvent) => void;

export interface DailyEvent {
  action: DailyEventType;
  participant?: DailyParticipant;
  participants?: Record<string, DailyParticipant>;
  errorMsg?: string;
  error?: {
    type: string;
    msg: string;
  };
  track?: MediaStreamTrack;
}

// App-level video types
export interface Participant {
  id: string;
  name: string;
  isLocal: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
}

export interface VideoCallState {
  status: 'idle' | 'connecting' | 'connected' | 'error' | 'ended';
  participants: Participant[];
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  isScreenSharing: boolean;
  error?: string;
  roomUrl?: string;
  startTime?: Date;
  duration?: number;
}

export interface VideoCallConfig {
  domain: string;
  roomName?: string;
  token?: string;
  userName?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export interface VideoRoomProps {
  visitId: string;
  visitType?: 'initial' | 'follow_up' | 'emergency' | 'extended';
  patientName?: string;
  providerName?: string;
  onCallEnd?: (summary?: VideoCallSummary) => void;
  onError?: (error: Error) => void;
}

export interface VideoCallSummary {
  duration: number; // seconds
  participantCount: number;
  hadScreenShare: boolean;
  hadAudioIssues: boolean;
  hadVideoIssues: boolean;
  notes?: string;
}

// Recording types
export interface Recording {
  id: string;
  room_name: string;
  status: 'in-progress' | 'completed' | 'failed';
  start_ts: number;
  duration?: number;
  download_url?: string;
}
