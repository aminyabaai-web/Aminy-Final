/**
 * Session Security Hardening
 *
 * Production-grade session management for HIPAA-compliant applications.
 * Complements the existing session.ts with advanced security features:
 *
 * - Automatic session timeout (configurable, default 30min for HIPAA)
 * - Activity-based session extension (mouse/keyboard/touch resets timer)
 * - Concurrent session detection (BroadcastChannel + localStorage fingerprint)
 * - Session fingerprinting (user agent + screen size to detect hijacking)
 * - Force logout on security events
 * - Warning dialog before timeout (configurable lead time)
 *
 * HIPAA References:
 * - §164.312(d) — Person or entity authentication
 * - §164.312(a)(2)(iii) — Automatic logoff
 * - §164.308(a)(5)(ii)(C) — Log-in monitoring
 */

// ============================================================================
// Types
// ============================================================================

/** Configuration for the session manager */
export interface SessionHardeningConfig {
  /** Session timeout in milliseconds (default: 30 min for HIPAA) */
  timeoutMs: number;
  /** Time before timeout to show warning (default: 5 min) */
  warningBeforeMs: number;
  /** Events that count as user activity */
  activityEvents: readonly string[];
  /** Throttle activity event processing (ms) to avoid excessive updates */
  activityThrottleMs: number;
  /** Enable concurrent session detection */
  detectConcurrentSessions: boolean;
  /** Enable session fingerprinting */
  enableFingerprinting: boolean;
  /** Maximum allowed concurrent sessions per user (0 = unlimited) */
  maxConcurrentSessions: number;
  /** Callback when session times out */
  onTimeout?: () => void;
  /** Callback when warning period starts */
  onWarning?: (remainingMs: number) => void;
  /** Callback when concurrent session is detected */
  onConcurrentSession?: (sessionCount: number) => void;
  /** Callback when session fingerprint mismatch is detected */
  onFingerprintMismatch?: (expected: string, actual: string) => void;
  /** Callback when session is forcefully terminated */
  onForceLogout?: (reason: string) => void;
}

/** Session fingerprint for hijacking detection */
export interface SessionFingerprint {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  /** Hash of combined fingerprint values */
  hash: string;
}

/** Session state information */
export interface SessionState {
  /** Whether the session is currently active */
  isActive: boolean;
  /** When the session started */
  startedAt: string;
  /** Last user activity timestamp */
  lastActivityAt: string;
  /** When the session will expire */
  expiresAt: string;
  /** Milliseconds remaining before timeout */
  remainingMs: number;
  /** Whether the warning period has started */
  isWarning: boolean;
  /** Session fingerprint */
  fingerprint: SessionFingerprint | null;
  /** Number of detected concurrent sessions */
  concurrentSessionCount: number;
  /** Unique session ID */
  sessionId: string;
}

/** Event emitted by the session manager */
export type SessionEvent =
  | { type: 'started'; sessionId: string }
  | { type: 'activity'; lastActivityAt: string }
  | { type: 'warning'; remainingMs: number }
  | { type: 'timeout'; sessionId: string; idleDurationMs: number }
  | { type: 'extended'; newExpiresAt: string }
  | { type: 'concurrent_detected'; sessionCount: number }
  | { type: 'fingerprint_mismatch'; expected: string; actual: string }
  | { type: 'force_logout'; reason: string }
  | { type: 'terminated'; sessionId: string; reason: string };

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: SessionHardeningConfig = {
  timeoutMs: 30 * 60 * 1000,           // 30 minutes (HIPAA recommendation)
  warningBeforeMs: 5 * 60 * 1000,      // 5 minutes warning
  activityEvents: ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'],
  activityThrottleMs: 30_000,           // Process activity at most every 30s
  detectConcurrentSessions: true,
  enableFingerprinting: true,
  maxConcurrentSessions: 3,
  onTimeout: undefined,
  onWarning: undefined,
  onConcurrentSession: undefined,
  onFingerprintMismatch: undefined,
  onForceLogout: undefined,
};

const SESSION_REGISTRY_KEY = 'aminy_active_sessions';
const SESSION_BC_CHANNEL = 'aminy-session-hardening';

// ============================================================================
// Fingerprinting
// ============================================================================

function computeSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

function generateFingerprint(): SessionFingerprint {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const screenWidth = typeof screen !== 'undefined' ? screen.width : 0;
  const screenHeight = typeof screen !== 'undefined' ? screen.height : 0;
  const colorDepth = typeof screen !== 'undefined' ? screen.colorDepth : 0;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = typeof navigator !== 'undefined' ? navigator.language : 'unknown';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';

  const raw = `${userAgent}|${screenWidth}x${screenHeight}|${colorDepth}|${timezone}|${language}|${platform}`;
  const hash = computeSimpleHash(raw);

  return { userAgent, screenWidth, screenHeight, colorDepth, timezone, language, platform, hash };
}

function compareFingerprints(a: SessionFingerprint, b: SessionFingerprint): boolean {
  return a.hash === b.hash;
}

// ============================================================================
// Session Registry (for concurrent session detection)
// ============================================================================

interface SessionRegistryEntry {
  sessionId: string;
  userId: string;
  startedAt: string;
  lastHeartbeat: string;
  fingerprint: string;
}

function loadSessionRegistry(): SessionRegistryEntry[] {
  try {
    const stored = localStorage.getItem(SESSION_REGISTRY_KEY);
    if (!stored) return [];
    const entries = JSON.parse(stored) as SessionRegistryEntry[];
    // Purge stale entries (no heartbeat in 2 minutes)
    const cutoff = Date.now() - 2 * 60 * 1000;
    return entries.filter(e => new Date(e.lastHeartbeat).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveSessionRegistry(entries: SessionRegistryEntry[]): void {
  try {
    localStorage.setItem(SESSION_REGISTRY_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable
  }
}

function registerSession(sessionId: string, userId: string, fingerprint: string): void {
  const entries = loadSessionRegistry();
  const existing = entries.findIndex(e => e.sessionId === sessionId);
  const now = new Date().toISOString();

  if (existing >= 0) {
    entries[existing].lastHeartbeat = now;
  } else {
    entries.push({ sessionId, userId, startedAt: now, lastHeartbeat: now, fingerprint });
  }
  saveSessionRegistry(entries);
}

function unregisterSession(sessionId: string): void {
  const entries = loadSessionRegistry().filter(e => e.sessionId !== sessionId);
  saveSessionRegistry(entries);
}

function getConcurrentSessionCount(userId: string, currentSessionId: string): number {
  const entries = loadSessionRegistry();
  return entries.filter(e => e.userId === userId && e.sessionId !== currentSessionId).length;
}

// ============================================================================
// SessionManager Class
// ============================================================================

/**
 * Manages session security with automatic timeout, fingerprinting,
 * and concurrent session detection.
 *
 * @example
 * ```ts
 * const manager = new SessionManager({
 *   timeoutMs: 30 * 60 * 1000,
 *   onTimeout: () => { redirectToLogin(); },
 *   onWarning: (remaining) => { showWarningDialog(remaining); },
 *   onConcurrentSession: (count) => { showConcurrentAlert(count); },
 * });
 *
 * // Start when user authenticates
 * manager.start('user_123');
 *
 * // Check status
 * const state = manager.getState();
 *
 * // User clicks "Keep me logged in" on warning dialog
 * manager.extend();
 *
 * // Force logout on security event
 * manager.terminate('Suspicious activity detected');
 * ```
 */
export class SessionManager {
  private config: SessionHardeningConfig;
  private sessionId: string;
  private userId: string | null = null;
  private startedAt: Date | null = null;
  private lastActivity: Date | null = null;
  private expiresAt: Date | null = null;
  private fingerprint: SessionFingerprint | null = null;
  private isActive = false;
  private isWarningActive = false;

  // Timers
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityProcessed = 0;

  // Event listeners
  private boundActivityHandler: (() => void) | null = null;

  // BroadcastChannel for cross-tab communication
  private broadcastChannel: BroadcastChannel | null = null;

  // Event subscribers
  private listeners: Array<(event: SessionEvent) => void> = [];

  constructor(config?: Partial<SessionHardeningConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Start a new session for the given user.
   * Call this after successful authentication.
   */
  start(userId: string): void {
    this.userId = userId;
    this.startedAt = new Date();
    this.lastActivity = new Date();
    this.isActive = true;
    this.isWarningActive = false;

    // Generate fingerprint
    if (this.config.enableFingerprinting) {
      this.fingerprint = generateFingerprint();
    }

    // Set expiry
    this.resetTimers();

    // Register in session registry
    if (this.config.detectConcurrentSessions && this.userId) {
      registerSession(this.sessionId, this.userId, this.fingerprint?.hash ?? '');
      this.checkConcurrentSessions();

      // Heartbeat every 30s to keep registry entry alive
      this.heartbeatTimer = setInterval(() => {
        if (this.userId) {
          registerSession(this.sessionId, this.userId, this.fingerprint?.hash ?? '');
          this.checkConcurrentSessions();
        }
      }, 30_000);
    }

    // Listen for user activity
    this.boundActivityHandler = this.handleActivity.bind(this);
    for (const event of this.config.activityEvents) {
      window.addEventListener(event, this.boundActivityHandler, { passive: true });
    }

    // Setup BroadcastChannel for cross-tab force logout
    this.setupBroadcastChannel();

    this.emit({ type: 'started', sessionId: this.sessionId });
  }

  /**
   * Extend the current session (reset the timeout timer).
   * Call this when user clicks "Keep me logged in" on warning dialog.
   */
  extend(): void {
    if (!this.isActive) return;

    this.lastActivity = new Date();
    this.isWarningActive = false;
    this.resetTimers();

    this.emit({ type: 'extended', newExpiresAt: this.expiresAt!.toISOString() });
  }

  /**
   * Check the current session state.
   */
  check(): SessionState {
    const now = Date.now();
    const remainingMs = this.expiresAt ? Math.max(0, this.expiresAt.getTime() - now) : 0;
    const concurrentCount = this.userId
      ? getConcurrentSessionCount(this.userId, this.sessionId)
      : 0;

    return {
      isActive: this.isActive,
      startedAt: this.startedAt?.toISOString() ?? '',
      lastActivityAt: this.lastActivity?.toISOString() ?? '',
      expiresAt: this.expiresAt?.toISOString() ?? '',
      remainingMs,
      isWarning: this.isWarningActive,
      fingerprint: this.fingerprint,
      concurrentSessionCount: concurrentCount,
      sessionId: this.sessionId,
    };
  }

  /**
   * Get the current session state (alias for check()).
   */
  getState(): SessionState {
    return this.check();
  }

  /**
   * Terminate the session immediately.
   * @param reason - Why the session is being terminated (for audit logging)
   */
  terminate(reason: string = 'User logged out'): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.isWarningActive = false;
    this.cleanupTimers();
    this.cleanupListeners();

    // Unregister from session registry
    unregisterSession(this.sessionId);

    // Broadcast termination to other tabs
    this.broadcastChannel?.postMessage({
      type: 'SESSION_TERMINATED',
      sessionId: this.sessionId,
      reason,
    });

    this.emit({ type: 'terminated', sessionId: this.sessionId, reason });

    this.broadcastChannel?.close();
    this.broadcastChannel = null;
  }

  /**
   * Force logout with a reason (triggers onForceLogout callback).
   * Used for security events like fingerprint mismatch or admin action.
   */
  forceLogout(reason: string): void {
    this.config.onForceLogout?.(reason);
    this.emit({ type: 'force_logout', reason });
    this.terminate(reason);
  }

  /**
   * Subscribe to session events.
   * Returns an unsubscribe function.
   */
  onEvent(listener: (event: SessionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Validate the current session fingerprint against a new one.
   * Call this periodically or on sensitive operations.
   */
  validateFingerprint(): boolean {
    if (!this.config.enableFingerprinting || !this.fingerprint) return true;

    const current = generateFingerprint();
    const matches = compareFingerprints(this.fingerprint, current);

    if (!matches) {
      this.config.onFingerprintMismatch?.(this.fingerprint.hash, current.hash);
      this.emit({
        type: 'fingerprint_mismatch',
        expected: this.fingerprint.hash,
        actual: current.hash,
      });
    }

    return matches;
  }

  /**
   * Destroy the session manager and clean up all resources.
   * Call this on component unmount.
   */
  destroy(): void {
    if (this.isActive) {
      this.terminate('Session manager destroyed');
    }
    this.cleanupTimers();
    this.cleanupListeners();
    this.broadcastChannel?.close();
    this.broadcastChannel = null;
    this.listeners = [];
  }

  // ---- Private Methods ----

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[SESSION-HARDENING] Listener error:', error);
      }
    }
  }

  private handleActivity(): void {
    if (!this.isActive) return;

    const now = Date.now();
    // Throttle activity processing
    if (now - this.lastActivityProcessed < this.config.activityThrottleMs) return;
    this.lastActivityProcessed = now;

    this.lastActivity = new Date();
    this.isWarningActive = false;
    this.resetTimers();

    this.emit({ type: 'activity', lastActivityAt: this.lastActivity.toISOString() });
  }

  private resetTimers(): void {
    this.clearTimers();

    const now = Date.now();
    this.expiresAt = new Date(now + this.config.timeoutMs);

    // Warning timer
    const warningDelay = this.config.timeoutMs - this.config.warningBeforeMs;
    if (warningDelay > 0) {
      this.warningTimer = setTimeout(() => {
        if (!this.isActive) return;
        this.isWarningActive = true;
        this.config.onWarning?.(this.config.warningBeforeMs);
        this.emit({ type: 'warning', remainingMs: this.config.warningBeforeMs });
      }, warningDelay);
    }

    // Timeout timer
    this.timeoutTimer = setTimeout(() => {
      if (!this.isActive) return;
      const idleDurationMs = this.lastActivity ? now + this.config.timeoutMs - this.lastActivity.getTime() : this.config.timeoutMs;
      this.config.onTimeout?.();
      this.emit({ type: 'timeout', sessionId: this.sessionId, idleDurationMs });
      this.terminate('Session timed out due to inactivity');
    }, this.config.timeoutMs);
  }

  private clearTimers(): void {
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.warningTimer !== null) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  private cleanupTimers(): void {
    this.clearTimers();
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanupListeners(): void {
    if (this.boundActivityHandler) {
      for (const event of this.config.activityEvents) {
        window.removeEventListener(event, this.boundActivityHandler);
      }
      this.boundActivityHandler = null;
    }
  }

  private checkConcurrentSessions(): void {
    if (!this.userId || !this.config.detectConcurrentSessions) return;

    const count = getConcurrentSessionCount(this.userId, this.sessionId);
    if (count > 0) {
      this.config.onConcurrentSession?.(count + 1); // +1 for current session
      this.emit({ type: 'concurrent_detected', sessionCount: count + 1 });

      if (this.config.maxConcurrentSessions > 0 && count >= this.config.maxConcurrentSessions) {
        this.forceLogout(
          `Maximum concurrent sessions exceeded (${count + 1}/${this.config.maxConcurrentSessions})`
        );
      }
    }
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return;

    this.broadcastChannel = new BroadcastChannel(SESSION_BC_CHANNEL);
    this.broadcastChannel.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // If another tab force-logged out our user
      if (data.type === 'FORCE_LOGOUT' && data.userId === this.userId) {
        this.forceLogout(data.reason || 'Force logout from another tab');
      }

      // If another tab terminated its session, re-check concurrent count
      if (data.type === 'SESSION_TERMINATED') {
        this.checkConcurrentSessions();
      }
    };
  }
}

/**
 * Create a pre-configured SessionManager with HIPAA-recommended defaults.
 *
 * @example
 * ```ts
 * const manager = createHIPAASessionManager({
 *   onTimeout: () => navigate('/login'),
 *   onWarning: (ms) => showTimeoutWarning(ms),
 * });
 * manager.start('user_123');
 * ```
 */
export function createHIPAASessionManager(
  overrides?: Partial<SessionHardeningConfig>
): SessionManager {
  return new SessionManager({
    timeoutMs: 30 * 60 * 1000,       // HIPAA: 30 min auto-logoff
    warningBeforeMs: 5 * 60 * 1000,  // 5 min warning
    detectConcurrentSessions: true,
    enableFingerprinting: true,
    maxConcurrentSessions: 3,
    ...overrides,
  });
}

export default SessionManager;
