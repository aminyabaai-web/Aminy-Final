/**
 * Auth Rate Limiting
 * Client-side rate limiting for authentication attempts
 * Works in conjunction with server-side rate limiting
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

// Configuration
const AUTH_RATE_LIMIT_CONFIG = {
  maxAttempts: 5,           // Max failed attempts
  windowMs: 15 * 60 * 1000, // 15 minute window
  lockoutMs: 30 * 60 * 1000, // 30 minute lockout after max attempts
  storageKey: 'aminy_auth_rate_limit',
};

// Get rate limit data from storage
function getRateLimitData(): RateLimitEntry {
  try {
    const stored = localStorage.getItem(AUTH_RATE_LIMIT_CONFIG.storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid data, reset
  }
  return { attempts: 0, firstAttempt: 0, lockedUntil: null };
}

// Save rate limit data
function saveRateLimitData(data: RateLimitEntry): void {
  localStorage.setItem(AUTH_RATE_LIMIT_CONFIG.storageKey, JSON.stringify(data));
}

// Clear rate limit data (on successful auth)
export function clearAuthRateLimit(): void {
  localStorage.removeItem(AUTH_RATE_LIMIT_CONFIG.storageKey);
}

/**
 * Check if auth is currently rate limited
 */
export function isAuthRateLimited(): {
  limited: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
  message: string;
} {
  const now = Date.now();
  const data = getRateLimitData();

  // Check if locked out
  if (data.lockedUntil && now < data.lockedUntil) {
    const remainingMs = data.lockedUntil - now;
    const remainingMins = Math.ceil(remainingMs / 60000);
    return {
      limited: true,
      remainingAttempts: 0,
      lockedUntil: new Date(data.lockedUntil),
      message: `Too many failed attempts. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`,
    };
  }

  // Check if window has expired (reset if so)
  if (data.firstAttempt && now - data.firstAttempt > AUTH_RATE_LIMIT_CONFIG.windowMs) {
    clearAuthRateLimit();
    return {
      limited: false,
      remainingAttempts: AUTH_RATE_LIMIT_CONFIG.maxAttempts,
      lockedUntil: null,
      message: '',
    };
  }

  // Calculate remaining attempts
  const remaining = AUTH_RATE_LIMIT_CONFIG.maxAttempts - data.attempts;
  if (remaining <= 0) {
    // Should be locked but wasn't - lock now
    const newData: RateLimitEntry = {
      ...data,
      lockedUntil: now + AUTH_RATE_LIMIT_CONFIG.lockoutMs,
    };
    saveRateLimitData(newData);
    return {
      limited: true,
      remainingAttempts: 0,
      lockedUntil: new Date(newData.lockedUntil!),
      message: 'Too many failed attempts. Please try again in 30 minutes.',
    };
  }

  return {
    limited: false,
    remainingAttempts: remaining,
    lockedUntil: null,
    message: '',
  };
}

/**
 * Record a failed auth attempt
 */
export function recordFailedAuthAttempt(): {
  limited: boolean;
  remainingAttempts: number;
  message: string;
} {
  const now = Date.now();
  const data = getRateLimitData();

  // If first attempt or window expired, start fresh
  if (!data.firstAttempt || now - data.firstAttempt > AUTH_RATE_LIMIT_CONFIG.windowMs) {
    const newData: RateLimitEntry = {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
    };
    saveRateLimitData(newData);
    return {
      limited: false,
      remainingAttempts: AUTH_RATE_LIMIT_CONFIG.maxAttempts - 1,
      message: '',
    };
  }

  // Increment attempts
  const newAttempts = data.attempts + 1;
  const remaining = AUTH_RATE_LIMIT_CONFIG.maxAttempts - newAttempts;

  // Check if should lock
  if (remaining <= 0) {
    const newData: RateLimitEntry = {
      attempts: newAttempts,
      firstAttempt: data.firstAttempt,
      lockedUntil: now + AUTH_RATE_LIMIT_CONFIG.lockoutMs,
    };
    saveRateLimitData(newData);
    return {
      limited: true,
      remainingAttempts: 0,
      message: 'Too many failed attempts. Your account has been temporarily locked for 30 minutes.',
    };
  }

  // Save updated attempts
  saveRateLimitData({
    ...data,
    attempts: newAttempts,
  });

  // Warning message when getting close
  if (remaining <= 2) {
    return {
      limited: false,
      remainingAttempts: remaining,
      message: `Warning: ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before temporary lockout.`,
    };
  }

  return {
    limited: false,
    remainingAttempts: remaining,
    message: '',
  };
}

/**
 * Record a successful auth attempt (clears rate limit)
 */
export function recordSuccessfulAuth(): void {
  clearAuthRateLimit();
}

/**
 * React hook for auth rate limiting
 */
import { useState, useCallback } from 'react';

export function useAuthRateLimit() {
  const [rateLimitState, setRateLimitState] = useState(isAuthRateLimited);

  const checkRateLimit = useCallback(() => {
    const state = isAuthRateLimited();
    setRateLimitState(state);
    return state;
  }, []);

  const recordFailure = useCallback(() => {
    const result = recordFailedAuthAttempt();
    setRateLimitState({
      limited: result.limited,
      remainingAttempts: result.remainingAttempts,
      lockedUntil: result.limited ? new Date(Date.now() + AUTH_RATE_LIMIT_CONFIG.lockoutMs) : null,
      message: result.message,
    });
    return result;
  }, []);

  const recordSuccess = useCallback(() => {
    recordSuccessfulAuth();
    setRateLimitState({
      limited: false,
      remainingAttempts: AUTH_RATE_LIMIT_CONFIG.maxAttempts,
      lockedUntil: null,
      message: '',
    });
  }, []);

  return {
    ...rateLimitState,
    checkRateLimit,
    recordFailure,
    recordSuccess,
  };
}
