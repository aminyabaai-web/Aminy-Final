/**
 * Secure Session Management
 * Handles session tokens with security best practices
 *
 * Note: For full HTTP-only cookie support, the backend (Supabase Edge Functions)
 * must set the cookies. This module provides the client-side handling.
 */

import { supabase } from '../supabase';

// Session storage keys
const SESSION_KEYS = {
  ACCESS_TOKEN: 'sb-access-token',
  REFRESH_TOKEN: 'sb-refresh-token',
  EXPIRES_AT: 'sb-expires-at',
} as const;

// Token refresh threshold (5 minutes before expiry)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    tier?: string;
  };
}

/**
 * Check if the current session is valid
 */
export async function isSessionValid(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session && !isSessionExpired(session.expires_at);
}

/**
 * Check if session is expired or about to expire
 */
function isSessionExpired(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt <= now;
}

/**
 * Check if session needs refresh
 */
function needsRefresh(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  const now = Date.now();
  const expiresAtMs = expiresAt * 1000;
  return expiresAtMs - now <= REFRESH_THRESHOLD_MS;
}

/**
 * Refresh the session if needed
 */
export async function refreshSessionIfNeeded(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return false;

    if (needsRefresh(session.expires_at)) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        return false;
      }
      return !!data.session;
    }

    return true;
  } catch (error) {
    console.error('Session refresh error:', error);
    return false;
  }
}

/**
 * Clear all session data
 */
export async function clearSession(): Promise<void> {
  await supabase.auth.signOut();

  // Clear any localStorage items that might contain sensitive data
  Object.values(SESSION_KEYS).forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Clear CSRF token
  sessionStorage.removeItem('aminy_csrf_token');
}

/**
 * Get current session with auto-refresh
 */
export async function getValidSession(): Promise<SessionData | null> {
  try {
    // First try to refresh if needed
    await refreshSessionIfNeeded();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || 0,
      user: {
        id: session.user.id,
        email: session.user.email || '',
        tier: session.user.user_metadata?.tier,
      },
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Setup automatic session refresh
 */
export function setupSessionRefresh(intervalMs: number = 60000): () => void {
  const intervalId = setInterval(async () => {
    const valid = await refreshSessionIfNeeded();
    if (!valid) {
      // Session could not be refreshed - user may need to re-authenticate
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
  }, intervalMs);

  return () => clearInterval(intervalId);
}

/**
 * Hook for session state management
 */
import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export function useSecureSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const valid = await refreshSessionIfNeeded();
      if (!valid) {
        throw new Error('Session refresh failed');
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);

        if (event === 'SIGNED_OUT') {
          await clearSession();
        }
      }
    );

    // Setup auto-refresh
    const cleanup = setupSessionRefresh();

    // Listen for session expiry events
    const handleExpiry = () => {
      setError(new Error('Session expired'));
    };
    window.addEventListener('session-expired', handleExpiry);

    return () => {
      subscription.unsubscribe();
      cleanup();
      window.removeEventListener('session-expired', handleExpiry);
    };
  }, []);

  return {
    session,
    user,
    loading,
    error,
    refreshSession,
    signOut,
    isAuthenticated: !!session,
  };
}
