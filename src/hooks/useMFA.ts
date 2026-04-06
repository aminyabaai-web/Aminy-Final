// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MFA Hook
 *
 * React hook for managing MFA state in the application.
 * Handles checking MFA status, requirements, and verification flow.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMFAState,
  getMFAStatus,
  checkMFARequirement,
  type MFAState,
  type MFAStatus,
  type MFARequirement,
} from '../lib/mfa';
import { supabase } from '../utils/supabase/client';

export interface UseMFAResult {
  isLoading: boolean;
  status: MFAStatus | null;
  requirement: MFARequirement | null;
  needsEnrollment: boolean;
  needsVerification: boolean;
  canProceed: boolean;
  refreshMFAState: () => Promise<void>;
}

/**
 * Hook to manage MFA state throughout the application
 */
export function useMFA(): UseMFAResult {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [requirement, setRequirement] = useState<MFARequirement | null>(null);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [canProceed, setCanProceed] = useState(true);

  const refreshMFAState = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await getMFAState();
      setStatus(state.status);
      setRequirement(state.requirement);
      setNeedsEnrollment(state.needsEnrollment);
      setNeedsVerification(state.needsVerification);
      setCanProceed(state.canProceed);
    } catch (error) {
      console.error('[useMFA] Error refreshing MFA state:', error);
      // Default to allowing proceed if we can't check
      setCanProceed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and listen for auth changes
  useEffect(() => {
    refreshMFAState();

    // Re-check MFA state when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshMFAState();
        } else if (event === 'SIGNED_OUT') {
          // Reset MFA state on sign out
          setStatus(null);
          setRequirement(null);
          setNeedsEnrollment(false);
          setNeedsVerification(false);
          setCanProceed(true);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [refreshMFAState]);

  return {
    isLoading,
    status,
    requirement,
    needsEnrollment,
    needsVerification,
    canProceed,
    refreshMFAState,
  };
}

export default useMFA;
