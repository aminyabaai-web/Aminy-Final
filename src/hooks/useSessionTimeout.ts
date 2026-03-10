/**
 * Session Timeout Hook — HIPAA-compliant idle session management
 *
 * Tracks user activity (mouse, keyboard, touch) and enforces automatic
 * logout after a configurable idle period on PHI-containing screens.
 *
 * HIPAA §164.312(a)(2)(iii) — Automatic logoff after a period of inactivity.
 *
 * Usage:
 *   const { isWarningVisible, remainingSeconds, staySignedIn } =
 *     useSessionTimeout({ currentScreen: 'care-plans' });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logAuditEvent, type AuditAction } from '../lib/audit-logger';

// ============================================================================
// PHI Screen Definitions
// ============================================================================

/**
 * Screens that display Protected Health Information (PHI).
 * Session timeout is enforced ONLY on these screens.
 */
const PHI_SCREENS: ReadonlySet<string> = new Set([
  // Care plan screens
  'care-plans',
  'care-plan-detail',
  'care-tab',
  'plan',
  'plan-detail',
  'plan-tab',
  // Behavior / observation logs
  'behavior-log',
  'behavior-logs',
  'daily-log',
  'observations',
  'session-notes',
  'bcba-briefing',
  // Document vault
  'document-vault',
  'vault',
  'records-vault',
  // Insurance / benefits
  'insurance',
  'benefits',
  'benefits-navigator',
  'prior-auth',
  'claims',
  // Telehealth
  'telehealth',
  'telehealth-session',
  'video-session',
  'waiting-room',
  // Provider / clinical screens
  'provider-portal',
  'provider-notes',
  'provider-dashboard',
  'clinical-report',
  'outcomes',
  'outcomes-tracking',
  // Messaging with PHI
  'messages',
  'secure-messaging',
  // Child profiles
  'child-profile',
  'child-mental-health',
  'caregiver-management',
  // Data sharing
  'data-sharing',
  'provider-data-sharing',
]);

// ============================================================================
// Configuration
// ============================================================================

export interface SessionTimeoutConfig {
  /** Idle timeout in milliseconds before showing warning (default: 15 minutes) */
  idleTimeoutMs?: number;
  /** Warning countdown in seconds before auto-logout (default: 60) */
  warningDurationSeconds?: number;
  /** Current screen name from the 42-screen navigation system */
  currentScreen: string;
  /** Callback invoked on auto-logout */
  onTimeout?: () => void;
  /** Callback invoked when the user dismisses the warning */
  onStaySignedIn?: () => void;
  /** User ID for audit logging (optional — uses 'unknown' if omitted) */
  userId?: string;
  /** Whether the user is authenticated (skip timeout logic if false) */
  isAuthenticated?: boolean;
}

export interface SessionTimeoutReturn {
  /** Whether the "session about to expire" dialog should be shown */
  isWarningVisible: boolean;
  /** Seconds remaining before auto-logout (only meaningful when warning is visible) */
  remainingSeconds: number;
  /** Call this to dismiss the warning and reset the idle timer */
  staySignedIn: () => void;
  /** Whether the current screen is a PHI screen */
  isPhiScreen: boolean;
  /** Manually reset the idle timer (e.g. after a user action) */
  resetTimer: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_WARNING_DURATION_SECONDS = 60;
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'keypress',
  'scroll',
  'touchstart',
  'touchmove',
  'click',
  'wheel',
];

// Throttle activity tracking to avoid excessive processing
const ACTIVITY_THROTTLE_MS = 5_000;

// ============================================================================
// Helper — check if a screen handles PHI
// ============================================================================

export function isPhiScreen(screenName: string): boolean {
  return PHI_SCREENS.has(screenName);
}

// ============================================================================
// Hook
// ============================================================================

export function useSessionTimeout(config: SessionTimeoutConfig): SessionTimeoutReturn {
  const {
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    warningDurationSeconds = DEFAULT_WARNING_DURATION_SECONDS,
    currentScreen,
    onTimeout,
    onStaySignedIn,
    userId = 'unknown',
    isAuthenticated = true,
  } = config;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningDurationSeconds);

  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const throttleRef = useRef(0);
  const isPhi = isPhiScreen(currentScreen);

  // ---- Audit logging helper ----
  const logTimeoutEvent = useCallback(
    (action: string, details: Record<string, unknown> = {}) => {
      logAuditEvent({
        userId,
        userRole: 'parent',
        action: 'settings_changed' as AuditAction,
        resourceType: 'user_account',
        resourceId: userId,
        details: {
          eventType: 'session_timeout',
          subAction: action,
          screen: currentScreen,
          ...details,
        },
        sessionId: '',
        success: true,
      });
    },
    [userId, currentScreen]
  );

  // ---- Clear all timers ----
  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // ---- Handle auto-logout ----
  const handleTimeout = useCallback(() => {
    clearTimers();
    setIsWarningVisible(false);
    logTimeoutEvent('auto_logout', { idleTimeoutMs });
    onTimeout?.();
  }, [clearTimers, logTimeoutEvent, idleTimeoutMs, onTimeout]);

  // ---- Start countdown warning ----
  const startWarning = useCallback(() => {
    setIsWarningVisible(true);
    setRemainingSeconds(warningDurationSeconds);
    logTimeoutEvent('warning_shown', { warningDurationSeconds });

    let seconds = warningDurationSeconds;
    countdownRef.current = setInterval(() => {
      seconds -= 1;
      setRemainingSeconds(seconds);
      if (seconds <= 0) {
        handleTimeout();
      }
    }, 1000);
  }, [warningDurationSeconds, logTimeoutEvent, handleTimeout]);

  // ---- Start (or restart) the idle timer ----
  const resetTimer = useCallback(() => {
    clearTimers();
    setIsWarningVisible(false);
    lastActivityRef.current = Date.now();

    if (!isPhi || !isAuthenticated) return;

    idleTimerRef.current = setTimeout(() => {
      startWarning();
    }, idleTimeoutMs);
  }, [clearTimers, isPhi, isAuthenticated, idleTimeoutMs, startWarning]);

  // ---- "Stay signed in" handler ----
  const staySignedIn = useCallback(() => {
    logTimeoutEvent('stay_signed_in');
    resetTimer();
    onStaySignedIn?.();
  }, [logTimeoutEvent, resetTimer, onStaySignedIn]);

  // ---- Track user activity (throttled) ----
  useEffect(() => {
    if (!isPhi || !isAuthenticated) return;

    const handleActivity = () => {
      const now = Date.now();
      if (now - throttleRef.current < ACTIVITY_THROTTLE_MS) return;
      throttleRef.current = now;

      // Only reset if the warning is NOT visible
      // (if warning is showing, we want the countdown to continue)
      if (!isWarningVisible) {
        lastActivityRef.current = now;
        resetTimer();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [isPhi, isAuthenticated, isWarningVisible, resetTimer]);

  // ---- Initialize timer when entering a PHI screen ----
  useEffect(() => {
    if (isPhi && isAuthenticated) {
      resetTimer();
    } else {
      clearTimers();
      setIsWarningVisible(false);
    }

    return clearTimers;
  }, [currentScreen, isPhi, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isWarningVisible,
    remainingSeconds,
    staySignedIn,
    isPhiScreen: isPhi,
    resetTimer,
  };
}

export default useSessionTimeout;
