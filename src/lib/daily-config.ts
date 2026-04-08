// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Daily.co Video Conferencing Configuration
 * Handles video call setup for telehealth sessions
 */

// Environment configuration
const DAILY_CONFIG = {
  domain: import.meta.env.VITE_DAILY_DOMAIN || '',
  apiKey: import.meta.env.VITE_DAILY_API_KEY || '', // Only used server-side
} as const;

/**
 * Check if Daily.co is properly configured
 */
export function isDailyConfigured(): boolean {
  return !!DAILY_CONFIG.domain;
}

/**
 * Get the Daily.co domain for embedding
 */
export function getDailyDomain(): string {
  if (!DAILY_CONFIG.domain && import.meta.env.DEV) {
    console.warn('Daily.co domain not configured. Set VITE_DAILY_DOMAIN in environment.');
  }
  return DAILY_CONFIG.domain;
}

/**
 * Build a Daily.co room URL
 */
export function buildDailyRoomUrl(roomName: string): string {
  const domain = getDailyDomain();
  if (!domain) {
    throw new Error('Daily.co domain not configured');
  }
  return `https://${domain}.daily.co/${roomName}`;
}

/**
 * Generate a unique room name for a session
 */
export function generateRoomName(sessionId: string, userId: string): string {
  const timestamp = Date.now();
  const hash = btoa(`${sessionId}-${userId}-${timestamp}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `aminy-${hash}`;
}

/**
 * Daily.co call configuration
 */
export interface DailyCallConfig {
  url: string;
  token?: string;
  userName?: string;
  showLeaveButton?: boolean;
  showFullscreenButton?: boolean;
  showLocalVideo?: boolean;
  showParticipantsBar?: boolean;
  activeSpeakerMode?: boolean;
}

/**
 * Get default call configuration
 */
export function getDefaultCallConfig(
  roomUrl: string,
  userName: string,
  token?: string
): DailyCallConfig {
  return {
    url: roomUrl,
    token,
    userName,
    showLeaveButton: true,
    showFullscreenButton: true,
    showLocalVideo: true,
    showParticipantsBar: true,
    activeSpeakerMode: true,
  };
}

/**
 * Call quality settings based on network conditions
 */
export const CALL_QUALITY_PRESETS = {
  high: {
    videoQuality: 'high',
    audioBitrate: 128000,
    videoBitrate: 2500000,
    frameRate: 30,
  },
  medium: {
    videoQuality: 'medium',
    audioBitrate: 64000,
    videoBitrate: 1000000,
    frameRate: 24,
  },
  low: {
    videoQuality: 'low',
    audioBitrate: 32000,
    videoBitrate: 500000,
    frameRate: 15,
  },
  audioOnly: {
    videoQuality: 'off',
    audioBitrate: 64000,
    videoBitrate: 0,
    frameRate: 0,
  },
} as const;

export type CallQuality = keyof typeof CALL_QUALITY_PRESETS;

/**
 * Detect recommended call quality based on connection
 */
export async function detectRecommendedQuality(): Promise<CallQuality> {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } };
  if (!nav.connection) {
    return 'medium'; // Default if Network Information API not supported
  }

  const connection = nav.connection;
  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink; // Mbps

  if (effectiveType === '4g' && (downlink ?? 0) >= 5) {
    return 'high';
  } else if (effectiveType === '4g' || (effectiveType === '3g' && (downlink ?? 0) >= 1)) {
    return 'medium';
  } else if (effectiveType === '3g') {
    return 'low';
  } else {
    return 'audioOnly';
  }
}

/**
 * Meeting event types
 */
export type DailyEvent =
  | 'joining-meeting'
  | 'joined-meeting'
  | 'left-meeting'
  | 'participant-joined'
  | 'participant-updated'
  | 'participant-left'
  | 'error'
  | 'network-quality-change'
  | 'recording-started'
  | 'recording-stopped';

/**
 * Handle Daily.co errors
 */
export function handleDailyError(error: unknown): string {
  const errorMessages: Record<string, string> = {
    'meeting-not-found': 'This video session is no longer available.',
    'room-full': 'The video session is at capacity. Please try again later.',
    'not-allowed': 'You do not have permission to join this session.',
    'exp-room': 'This video session has expired.',
    'exp-token': 'Your session token has expired. Please refresh.',
    'invalid-token': 'Unable to verify your session. Please try again.',
    'connection-error': 'Unable to connect to video. Check your internet connection.',
    'camera-error': 'Unable to access camera. Check permissions.',
    'microphone-error': 'Unable to access microphone. Check permissions.',
  };

  const err = error as { errorMsg?: string; error?: string } | null;
  const errorType = err?.errorMsg || err?.error || 'unknown';
  return errorMessages[errorType] || 'An error occurred with the video session. Please try again.';
}

export default {
  isDailyConfigured,
  getDailyDomain,
  buildDailyRoomUrl,
  generateRoomName,
  getDefaultCallConfig,
  detectRecommendedQuality,
  handleDailyError,
  CALL_QUALITY_PRESETS,
};
