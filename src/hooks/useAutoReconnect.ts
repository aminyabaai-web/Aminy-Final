// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * useAutoReconnect Hook
 *
 * Provides automatic reconnection logic for Daily.co video calls.
 * When a participant drops (network disconnect), this hook:
 *
 * 1. Detects the disconnect via `left-meeting` or `error` events
 * 2. Enters a "reconnecting" state
 * 3. Attempts to rejoin for up to 30 seconds (configurable)
 * 4. Falls back to a "connection-lost" state if all retries fail
 *
 * Usage:
 *   const reconnect = useAutoReconnect(callObject, {
 *     roomUrl,
 *     token,
 *     userName,
 *     onReconnected: () => console.log('back!'),
 *     onReconnectFailed: () => console.log('lost connection'),
 *   });
 *
 *   // In your UI:
 *   if (reconnect.state === 'reconnecting') { ... }
 *   if (reconnect.state === 'connection-lost') { ... }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DailyCallObject, DailyEvent } from '../types/video';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReconnectState =
  | 'idle'          // Not reconnecting — call is healthy
  | 'reconnecting'  // Actively trying to rejoin
  | 'connection-lost'; // All retries exhausted

export interface AutoReconnectConfig {
  /** Daily room URL to rejoin */
  roomUrl: string;
  /** Meeting token for authentication */
  token?: string;
  /** User name for the call */
  userName?: string;
  /** Maximum time (ms) to keep retrying. Default: 30 000 */
  maxReconnectMs?: number;
  /** Delay between retry attempts (ms). Default: 3 000 */
  retryIntervalMs?: number;
  /** Called when successfully reconnected */
  onReconnected?: () => void;
  /** Called when all retries are exhausted */
  onReconnectFailed?: () => void;
}

export interface AutoReconnectResult {
  /** Current reconnection state */
  state: ReconnectState;
  /** Number of attempts made so far */
  attemptCount: number;
  /** Seconds remaining before giving up */
  secondsRemaining: number;
  /** Manually trigger a reconnection attempt */
  retryNow: () => void;
  /** Manually cancel reconnection and go to connection-lost */
  cancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RECONNECT_MS = 30_000;
const DEFAULT_RETRY_INTERVAL_MS = 3_000;

// Error types that indicate a transient network issue (worth retrying)
const RETRYABLE_ERRORS = new Set([
  'connection-error',
  'network-connection',
  'not-found', // Sometimes a temporary CDN issue
]);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAutoReconnect(
  callObject: DailyCallObject | null,
  config: AutoReconnectConfig,
): AutoReconnectResult {
  const {
    roomUrl,
    token,
    userName,
    maxReconnectMs = DEFAULT_MAX_RECONNECT_MS,
    retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS,
    onReconnected,
    onReconnectFailed,
  } = config;

  const [state, setState] = useState<ReconnectState>('idle');
  const [attemptCount, setAttemptCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Refs to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  const reconnectStartRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalLeaveRef = useRef(false);

  // Cleanup helper
  const clearTimers = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /**
   * Mark the next leave as intentional so the hook does not try
   * to reconnect when the user deliberately ends the call.
   */
  const markIntentionalLeave = useCallback(() => {
    intentionalLeaveRef.current = true;
  }, []);

  // Expose on the callObject via a side-channel so VideoRoom can call it
  // before invoking `leaveCall`.
  useEffect(() => {
    if (callObject) {
      (callObject as unknown as Record<string, unknown>).__markIntentionalLeave = markIntentionalLeave;
    }
    return () => {
      if (callObject) {
        delete (callObject as unknown as Record<string, unknown>).__markIntentionalLeave;
      }
    };
  }, [callObject, markIntentionalLeave]);

  // ------------------------------------------------------------------
  // Attempt a single reconnection
  // ------------------------------------------------------------------
  const attemptReconnect = useCallback(async () => {
    if (!callObject) return false;

    setAttemptCount(prev => prev + 1);

    try {
      // Destroy and re-join. Daily recommends creating a fresh join when
      // the meeting state is in an error/left state.
      const meetingState = callObject.meetingState();

      if (meetingState === 'left-meeting' || meetingState === 'error') {
        await callObject.join({ url: roomUrl });
      } else if (meetingState === 'new' || meetingState === 'loaded') {
        await callObject.join({ url: roomUrl });
      }

      // If join didn't throw, we're reconnected
      setState('idle');
      setAttemptCount(0);
      reconnectStartRef.current = null;
      clearTimers();
      onReconnected?.();
      return true;
    } catch (err) {
      console.warn('[useAutoReconnect] Reconnect attempt failed:', err);
      return false;
    }
  }, [callObject, roomUrl, clearTimers, onReconnected]);

  // ------------------------------------------------------------------
  // Start the reconnection loop
  // ------------------------------------------------------------------
  const startReconnecting = useCallback(() => {
    if (stateRef.current === 'reconnecting') return; // Already running

    setState('reconnecting');
    setAttemptCount(0);
    reconnectStartRef.current = Date.now();
    setSecondsRemaining(Math.ceil(maxReconnectMs / 1000));

    // Countdown timer
    countdownRef.current = setInterval(() => {
      if (!reconnectStartRef.current) return;
      const elapsed = Date.now() - reconnectStartRef.current;
      const remaining = Math.max(0, Math.ceil((maxReconnectMs - elapsed) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        // Time's up
        clearTimers();
        setState('connection-lost');
        reconnectStartRef.current = null;
        onReconnectFailed?.();
      }
    }, 1000);

    // Kick off the first retry immediately
    const doRetry = async () => {
      if (stateRef.current !== 'reconnecting') return;
      if (!reconnectStartRef.current) return;

      const elapsed = Date.now() - reconnectStartRef.current;
      if (elapsed >= maxReconnectMs) return; // Countdown handler will clean up

      const success = await attemptReconnect();
      if (!success && stateRef.current === 'reconnecting') {
        retryTimerRef.current = setTimeout(doRetry, retryIntervalMs);
      }
    };

    doRetry();
  }, [maxReconnectMs, retryIntervalMs, attemptReconnect, clearTimers, onReconnectFailed]);

  // ------------------------------------------------------------------
  // Listen to Daily.co events for disconnections
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!callObject) return;

    const handleLeftMeeting = (_event: DailyEvent) => {
      if (intentionalLeaveRef.current) {
        intentionalLeaveRef.current = false;
        return; // User wanted to leave — do not reconnect
      }

      // Unexpected disconnect — try to reconnect
      startReconnecting();
    };

    const handleError = (event: DailyEvent) => {
      const errorType = event.errorMsg || event.error?.type || '';

      // Only auto-reconnect for transient network issues
      if (RETRYABLE_ERRORS.has(errorType)) {
        startReconnecting();
      }
    };

    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('error', handleError);

    return () => {
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('error', handleError);
      clearTimers();
    };
  }, [callObject, startReconnecting, clearTimers]);

  // ------------------------------------------------------------------
  // Manual actions
  // ------------------------------------------------------------------
  const retryNow = useCallback(() => {
    if (state === 'connection-lost') {
      // Reset and try again
      startReconnecting();
    } else if (state === 'reconnecting') {
      attemptReconnect();
    }
  }, [state, startReconnecting, attemptReconnect]);

  const cancel = useCallback(() => {
    clearTimers();
    setState('connection-lost');
    reconnectStartRef.current = null;
    onReconnectFailed?.();
  }, [clearTimers, onReconnectFailed]);

  return {
    state,
    attemptCount,
    secondsRemaining,
    retryNow,
    cancel,
  };
}

export default useAutoReconnect;
