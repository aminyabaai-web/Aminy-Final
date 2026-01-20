/**
 * Secure Session Hook
 *
 * Replaces localStorage-based session storage with secure Supabase session management.
 * User data is fetched from the database, not stored locally.
 *
 * Security improvements:
 * - No sensitive data in localStorage (XSS-safe)
 * - Session managed by Supabase (httpOnly cookies when configured)
 * - Profile data fetched fresh from database
 * - Automatic session refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';
import { TierType } from '../lib/tier-utils';

export interface SecureUserData {
  id: string;
  email: string;
  parentName: string;
  childName: string;
  childId?: string;
  relationship: string;
  state: string;
  tier: TierType;
  role: 'user' | 'provider' | 'admin';
  hasCompletedOnboarding: boolean;
  children?: Array<{
    id: string;
    name: string;
    age: number;
    conditions?: string[];
  }>;
  activeChildId?: string;
}

interface UseSecureSessionReturn {
  user: SecureUserData | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: Error | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<SecureUserData>) => Promise<void>;
}

export function useSecureSession(): UseSecureSessionReturn {
  const [user, setUser] = useState<SecureUserData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (authUser: User): Promise<SecureUserData | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        // Profile might not exist for new users
        if (profileError.code === 'PGRST116') {
          return {
            id: authUser.id,
            email: authUser.email || '',
            parentName: '',
            childName: '',
            relationship: '',
            state: '',
            tier: 'free' as TierType,
            role: 'user',
            hasCompletedOnboarding: false,
          };
        }
        throw profileError;
      }

      return {
        id: authUser.id,
        email: authUser.email || '',
        parentName: profile.parent_name || '',
        childName: profile.child_name || '',
        childId: profile.child_id,
        relationship: profile.relationship || '',
        state: profile.state || '',
        tier: (profile.tier as TierType) || 'free',
        role: profile.role || 'user',
        hasCompletedOnboarding: profile.has_completed_onboarding || false,
        children: profile.children,
        activeChildId: profile.active_child_id,
      };
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err as Error);
      return null;
    }
  }, []);

  // Initialize session
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        setIsLoading(true);

        // Get current session
        const { data: { session: currentSession }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (currentSession?.user && mounted) {
          setSession(currentSession);
          const profile = await fetchUserProfile(currentSession.user);
          if (mounted) setUser(profile);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          const profile = await fetchUserProfile(newSession.user);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Clear any legacy localStorage data
          localStorage.removeItem('aminy-user');
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Refresh profile on token refresh
          const profile = await fetchUserProfile(newSession.user);
          setUser(profile);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: refreshedSession }, error } =
        await supabase.auth.refreshSession();

      if (error) throw error;

      if (refreshedSession?.user) {
        setSession(refreshedSession);
        const profile = await fetchUserProfile(refreshedSession.user);
        setUser(profile);
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      setError(err as Error);
    }
  }, [fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);

      // Clear any legacy localStorage data
      localStorage.removeItem('aminy-user');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err as Error);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<SecureUserData>) => {
    if (!user?.id) return;

    try {
      const dbUpdates: Record<string, unknown> = {};

      if (updates.parentName !== undefined) dbUpdates.parent_name = updates.parentName;
      if (updates.childName !== undefined) dbUpdates.child_name = updates.childName;
      if (updates.childId !== undefined) dbUpdates.child_id = updates.childId;
      if (updates.relationship !== undefined) dbUpdates.relationship = updates.relationship;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.hasCompletedOnboarding !== undefined) {
        dbUpdates.has_completed_onboarding = updates.hasCompletedOnboarding;
      }
      if (updates.children !== undefined) dbUpdates.children = updates.children;
      if (updates.activeChildId !== undefined) dbUpdates.active_child_id = updates.activeChildId;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err as Error);
      throw err;
    }
  }, [user?.id]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    isAdmin: user?.role === 'admin',
    error,
    refreshSession,
    signOut,
    updateProfile,
  };
}

/**
 * Check if user has a specific role
 * Server-side role verification (not bypassable like localStorage)
 */
export async function verifyUserRole(
  userId: string,
  requiredRole: 'user' | 'provider' | 'admin'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    const roleHierarchy = { user: 1, provider: 2, admin: 3 };
    return roleHierarchy[data.role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
  } catch {
    return false;
  }
}

/**
 * Check if user is admin (server-side verification)
 * Use this instead of localStorage.getItem('dev-mode')
 */
export async function verifyAdminAccess(userId: string): Promise<boolean> {
  return verifyUserRole(userId, 'admin');
}
