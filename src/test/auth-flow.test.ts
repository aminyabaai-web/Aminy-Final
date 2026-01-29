/**
 * Authentication Flow Tests
 * Tests for login, signup, password reset, and session management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types matching the actual implementation
interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  user_metadata?: Record<string, unknown>;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthError {
  message: string;
  status?: number;
}

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';

// =============================================================================
// EMAIL VALIDATION
// =============================================================================

describe('Email Validation', () => {
  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  it('should accept valid email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.org')).toBe(true);
    expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    expect(validateEmail('first.last@subdomain.domain.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user@domain')).toBe(false);
    expect(validateEmail('user domain@test.com')).toBe(false);
  });
});

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

describe('Password Validation', () => {
  function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain a lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain a number');
    }

    return { valid: errors.length === 0, errors };
  }

  it('should accept strong passwords', () => {
    const result = validatePassword('SecurePass123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject passwords that are too short', () => {
    const result = validatePassword('Short1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should require uppercase letters', () => {
    const result = validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain an uppercase letter');
  });

  it('should require lowercase letters', () => {
    const result = validatePassword('UPPERCASE123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain a lowercase letter');
  });

  it('should require numbers', () => {
    const result = validatePassword('NoNumbersHere');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain a number');
  });

  it('should return multiple errors for weak passwords', () => {
    const result = validatePassword('weak');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// =============================================================================
// LOGIN FLOW
// =============================================================================

describe('Login Flow', () => {
  // Simulate login response handling
  function handleLoginResponse(
    user: User | null,
    error: AuthError | null
  ): { success: boolean; message: string } {
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, message: "We couldn't find that combination. Double-check and try again." };
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, message: 'Please check your email and confirm your account first.' };
      }
      if (error.message.includes('rate limit')) {
        return { success: false, message: 'Too many attempts. Please wait before trying again.' };
      }
      return { success: false, message: error.message };
    }

    if (!user) {
      return { success: false, message: 'Login failed' };
    }

    return { success: true, message: 'Login successful' };
  }

  it('should handle successful login', () => {
    const user: User = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
    };
    const result = handleLoginResponse(user, null);
    expect(result.success).toBe(true);
  });

  it('should handle invalid credentials', () => {
    const error: AuthError = { message: 'Invalid login credentials' };
    const result = handleLoginResponse(null, error);
    expect(result.success).toBe(false);
    expect(result.message).toContain("couldn't find");
  });

  it('should handle unconfirmed email', () => {
    const error: AuthError = { message: 'Email not confirmed' };
    const result = handleLoginResponse(null, error);
    expect(result.success).toBe(false);
    expect(result.message).toContain('confirm your account');
  });

  it('should handle rate limiting', () => {
    const error: AuthError = { message: 'rate limit exceeded' };
    const result = handleLoginResponse(null, error);
    expect(result.success).toBe(false);
    expect(result.message).toContain('wait');
  });
});

// =============================================================================
// SIGNUP FLOW
// =============================================================================

describe('Signup Flow', () => {
  function handleSignupResponse(
    user: User | null,
    error: AuthError | null
  ): { success: boolean; message: string; requiresConfirmation: boolean } {
    if (error) {
      if (error.message.includes('already registered')) {
        return {
          success: false,
          message: 'An account with this email already exists.',
          requiresConfirmation: false,
        };
      }
      if (error.message.includes('invalid email')) {
        return {
          success: false,
          message: 'Please enter a valid email address.',
          requiresConfirmation: false,
        };
      }
      return {
        success: false,
        message: error.message,
        requiresConfirmation: false,
      };
    }

    if (!user) {
      return { success: false, message: 'Signup failed', requiresConfirmation: false };
    }

    // Check if email needs confirmation
    const requiresConfirmation = !user.email_confirmed_at;

    return {
      success: true,
      message: requiresConfirmation
        ? 'Please check your email to confirm your account.'
        : 'Account created successfully!',
      requiresConfirmation,
    };
  }

  it('should handle successful signup requiring confirmation', () => {
    const user: User = {
      id: 'new-user-123',
      email: 'newuser@example.com',
    };
    const result = handleSignupResponse(user, null);
    expect(result.success).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.message).toContain('check your email');
  });

  it('should handle signup with auto-confirmed email', () => {
    const user: User = {
      id: 'new-user-123',
      email: 'newuser@example.com',
      email_confirmed_at: new Date().toISOString(),
    };
    const result = handleSignupResponse(user, null);
    expect(result.success).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.message).toContain('successfully');
  });

  it('should handle duplicate email', () => {
    const error: AuthError = { message: 'User already registered' };
    const result = handleSignupResponse(null, error);
    expect(result.success).toBe(false);
    expect(result.message).toContain('already exists');
  });

  it('should handle invalid email', () => {
    const error: AuthError = { message: 'invalid email format' };
    const result = handleSignupResponse(null, error);
    expect(result.success).toBe(false);
    expect(result.message).toContain('valid email');
  });
});

// =============================================================================
// PASSWORD RESET FLOW
// =============================================================================

describe('Password Reset Flow', () => {
  function handlePasswordResetRequest(
    email: string,
    error: AuthError | null
  ): { success: boolean; message: string } {
    // Don't reveal if email exists
    if (error && error.message.includes('rate limit')) {
      return {
        success: false,
        message: 'Too many requests. Please wait a few minutes before trying again.',
      };
    }

    // Always show success message to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }

  it('should show generic success message to prevent enumeration', () => {
    const result = handlePasswordResetRequest('user@example.com', null);
    expect(result.success).toBe(true);
    expect(result.message).toContain('If an account exists');
  });

  it('should handle rate limiting', () => {
    const error: AuthError = { message: 'rate limit exceeded' };
    const result = handlePasswordResetRequest('user@example.com', error);
    expect(result.success).toBe(false);
    expect(result.message).toContain('wait');
  });

  it('should not reveal whether email exists', () => {
    const resultExisting = handlePasswordResetRequest('existing@example.com', null);
    const resultNonExisting = handlePasswordResetRequest('nonexisting@example.com', null);
    expect(resultExisting.message).toBe(resultNonExisting.message);
  });
});

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

describe('Session Management', () => {
  function isSessionValid(session: Session | null): boolean {
    if (!session) return false;
    if (!session.access_token) return false;
    if (!session.expires_at) return false;

    // Check if expired (with 60 second buffer)
    const expiryTime = session.expires_at * 1000;
    const bufferMs = 60 * 1000;
    return Date.now() < expiryTime - bufferMs;
  }

  function shouldRefreshSession(session: Session | null): boolean {
    if (!session) return false;
    if (!session.expires_at) return false;

    // Refresh if within 5 minutes of expiry
    const expiryTime = session.expires_at * 1000;
    const refreshThreshold = 5 * 60 * 1000;
    return Date.now() > expiryTime - refreshThreshold && Date.now() < expiryTime;
  }

  it('should validate active session', () => {
    const session: Session = {
      access_token: 'valid_token',
      refresh_token: 'refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      user: { id: 'user-123', email: 'test@example.com' },
    };
    expect(isSessionValid(session)).toBe(true);
  });

  it('should invalidate expired session', () => {
    const session: Session = {
      access_token: 'valid_token',
      refresh_token: 'refresh_token',
      expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      user: { id: 'user-123', email: 'test@example.com' },
    };
    expect(isSessionValid(session)).toBe(false);
  });

  it('should invalidate session about to expire (within buffer)', () => {
    const session: Session = {
      access_token: 'valid_token',
      refresh_token: 'refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 30, // 30 seconds from now
      user: { id: 'user-123', email: 'test@example.com' },
    };
    expect(isSessionValid(session)).toBe(false);
  });

  it('should handle null session', () => {
    expect(isSessionValid(null)).toBe(false);
  });

  it('should trigger refresh when close to expiry', () => {
    const session: Session = {
      access_token: 'valid_token',
      refresh_token: 'refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 180, // 3 minutes from now
      user: { id: 'user-123', email: 'test@example.com' },
    };
    expect(shouldRefreshSession(session)).toBe(true);
  });

  it('should not trigger refresh when session is fresh', () => {
    const session: Session = {
      access_token: 'valid_token',
      refresh_token: 'refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      user: { id: 'user-123', email: 'test@example.com' },
    };
    expect(shouldRefreshSession(session)).toBe(false);
  });
});

// =============================================================================
// AUTH EVENT HANDLING
// =============================================================================

describe('Auth Event Handling', () => {
  function getAuthEventAction(event: AuthEvent, session: Session | null): string {
    switch (event) {
      case 'SIGNED_IN':
        return session ? 'redirect_to_dashboard' : 'show_error';
      case 'SIGNED_OUT':
        return 'redirect_to_login';
      case 'TOKEN_REFRESHED':
        return 'update_session';
      case 'USER_UPDATED':
        return 'refresh_profile';
      case 'PASSWORD_RECOVERY':
        return 'show_password_reset_form';
      default:
        return 'no_action';
    }
  }

  it('should redirect to dashboard on sign in', () => {
    const session: Session = {
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'user-123', email: 'test@example.com' },
    };
    expect(getAuthEventAction('SIGNED_IN', session)).toBe('redirect_to_dashboard');
  });

  it('should show error on sign in without session', () => {
    expect(getAuthEventAction('SIGNED_IN', null)).toBe('show_error');
  });

  it('should redirect to login on sign out', () => {
    expect(getAuthEventAction('SIGNED_OUT', null)).toBe('redirect_to_login');
  });

  it('should update session on token refresh', () => {
    expect(getAuthEventAction('TOKEN_REFRESHED', null)).toBe('update_session');
  });

  it('should refresh profile on user update', () => {
    expect(getAuthEventAction('USER_UPDATED', null)).toBe('refresh_profile');
  });

  it('should show password reset form on recovery', () => {
    expect(getAuthEventAction('PASSWORD_RECOVERY', null)).toBe('show_password_reset_form');
  });
});

// =============================================================================
// RATE LIMITING
// =============================================================================

describe('Auth Rate Limiting', () => {
  interface RateLimitState {
    attempts: number;
    lastAttempt: number;
    lockedUntil: number | null;
  }

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  const WINDOW_MS = 15 * 60 * 1000; // 15 minute window

  function checkRateLimit(state: RateLimitState): {
    allowed: boolean;
    remainingAttempts: number;
    lockedUntil: number | null;
    message?: string;
  } {
    const now = Date.now();

    // Check if currently locked out
    if (state.lockedUntil && now < state.lockedUntil) {
      const remainingMs = state.lockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: state.lockedUntil,
        message: `Account locked. Try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`,
      };
    }

    // Reset if outside window
    if (now - state.lastAttempt > WINDOW_MS) {
      return {
        allowed: true,
        remainingAttempts: MAX_ATTEMPTS,
        lockedUntil: null,
      };
    }

    // Check attempts within window
    if (state.attempts >= MAX_ATTEMPTS) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: state.lastAttempt + LOCKOUT_DURATION_MS,
        message: 'Too many failed attempts. Please try again later.',
      };
    }

    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - state.attempts,
      lockedUntil: null,
    };
  }

  it('should allow first attempt', () => {
    const state: RateLimitState = {
      attempts: 0,
      lastAttempt: 0,
      lockedUntil: null,
    };
    const result = checkRateLimit(state);
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });

  it('should track remaining attempts', () => {
    const state: RateLimitState = {
      attempts: 3,
      lastAttempt: Date.now(),
      lockedUntil: null,
    };
    const result = checkRateLimit(state);
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(2);
  });

  it('should lock after max attempts', () => {
    const state: RateLimitState = {
      attempts: 5,
      lastAttempt: Date.now(),
      lockedUntil: null,
    };
    const result = checkRateLimit(state);
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
    expect(result.lockedUntil).not.toBeNull();
  });

  it('should deny during lockout period', () => {
    const state: RateLimitState = {
      attempts: 5,
      lastAttempt: Date.now(),
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    };
    const result = checkRateLimit(state);
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('locked');
  });

  it('should reset after window expires', () => {
    const state: RateLimitState = {
      attempts: 5,
      lastAttempt: Date.now() - WINDOW_MS - 1000, // Just past the window
      lockedUntil: null,
    };
    const result = checkRateLimit(state);
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });
});

// =============================================================================
// OAUTH FLOW
// =============================================================================

describe('OAuth Flow', () => {
  function validateOAuthCallback(
    params: URLSearchParams
  ): { valid: boolean; error?: string; accessToken?: string; refreshToken?: string } {
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      return {
        valid: false,
        error: errorDescription || error,
      };
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
      return {
        valid: false,
        error: 'Missing access token',
      };
    }

    return {
      valid: true,
      accessToken,
      refreshToken: refreshToken || undefined,
    };
  }

  it('should handle successful OAuth callback', () => {
    const params = new URLSearchParams({
      access_token: 'valid_access_token',
      refresh_token: 'valid_refresh_token',
      token_type: 'Bearer',
    });
    const result = validateOAuthCallback(params);
    expect(result.valid).toBe(true);
    expect(result.accessToken).toBe('valid_access_token');
    expect(result.refreshToken).toBe('valid_refresh_token');
  });

  it('should handle OAuth error', () => {
    const params = new URLSearchParams({
      error: 'access_denied',
      error_description: 'User denied access',
    });
    const result = validateOAuthCallback(params);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('User denied access');
  });

  it('should handle missing access token', () => {
    const params = new URLSearchParams({
      refresh_token: 'refresh_only',
    });
    const result = validateOAuthCallback(params);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing access token');
  });
});
