/**
 * Authentication Tests
 * Tests for auth rate limiting (unit tests only)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isAuthRateLimited,
  recordFailedAuthAttempt,
  recordSuccessfulAuth,
  clearAuthRateLimit,
} from '../lib/security/auth-rate-limit';

describe('Auth Rate Limiting', () => {
  beforeEach(() => {
    clearAuthRateLimit();
    localStorage.clear();
  });

  it('should allow first login attempt', () => {
    const result = isAuthRateLimited();
    expect(result.limited).toBe(false);
    expect(result.remainingAttempts).toBe(5);
  });

  it('should track failed attempts', () => {
    recordFailedAuthAttempt();
    recordFailedAuthAttempt();

    const result = isAuthRateLimited();
    expect(result.limited).toBe(false);
    expect(result.remainingAttempts).toBe(3);
  });

  it('should lock after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAuthAttempt();
    }

    const result = isAuthRateLimited();
    expect(result.limited).toBe(true);
    expect(result.remainingAttempts).toBe(0);
    expect(result.message).toContain('Too many failed attempts');
  });

  it('should clear rate limit on successful auth', () => {
    recordFailedAuthAttempt();
    recordFailedAuthAttempt();
    recordSuccessfulAuth();

    const result = isAuthRateLimited();
    expect(result.limited).toBe(false);
    expect(result.remainingAttempts).toBe(5);
  });
});
