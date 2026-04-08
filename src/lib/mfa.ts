// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Multi-Factor Authentication (MFA) System
 *
 * HIPAA-compliant MFA implementation using Supabase Auth TOTP
 * Required for healthcare providers accessing PHI
 */

import { supabase } from '../utils/supabase/client';
import type { Factor, AuthenticatorAssuranceLevels } from '@supabase/supabase-js';

export interface MFAEnrollmentResult {
  factorId: string;
  qrCode: string; // SVG data URL for QR code
  secret: string; // Manual entry secret
  uri: string; // TOTP URI
}

export interface MFAStatus {
  isEnrolled: boolean;
  isVerified: boolean; // Whether current session has verified MFA
  factors: Factor[];
  currentLevel: 'aal1' | 'aal2';
  nextLevel: 'aal1' | 'aal2' | null;
}

export interface MFARequirement {
  required: boolean;
  reason?: string;
  gracePeriodEnds?: Date;
}

/**
 * Check if user has MFA enrolled and verified
 */
export async function getMFAStatus(): Promise<MFAStatus> {
  try {
    // Get current assurance level
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      console.error('[MFA] Error getting AAL:', aalError);
      return {
        isEnrolled: false,
        isVerified: false,
        factors: [],
        currentLevel: 'aal1',
        nextLevel: null,
      };
    }

    const { currentLevel, nextLevel, currentAuthenticationMethods } = aalData;

    // Get enrolled factors
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      console.error('[MFA] Error listing factors:', factorsError);
    }

    const factors = factorsData?.totp || [];
    const verifiedFactors = factors.filter(f => f.status === 'verified');

    return {
      isEnrolled: verifiedFactors.length > 0,
      isVerified: currentLevel === 'aal2',
      factors: factors,
      currentLevel: currentLevel as 'aal1' | 'aal2',
      nextLevel: nextLevel as 'aal1' | 'aal2' | null,
    };
  } catch (error) {
    console.error('[MFA] Error getting MFA status:', error);
    return {
      isEnrolled: false,
      isVerified: false,
      factors: [],
      currentLevel: 'aal1',
      nextLevel: null,
    };
  }
}

/**
 * Check if MFA is required for the current user based on role
 */
export async function checkMFARequirement(): Promise<MFARequirement> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { required: false };
    }

    // Get user's role - check for errors explicitly
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, created_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[MFA] Error fetching profile for MFA check:', profileError);
      return { required: false };
    }

    // MFA required for providers and admins
    if (profile.role === 'provider' || profile.role === 'admin') {
      // Calculate grace period (7 days from account creation for providers)
      const createdAt = new Date(profile.created_at);
      const gracePeriodDays = 7;
      const gracePeriodEnds = new Date(createdAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
      const now = new Date();

      // If within grace period, MFA is encouraged but not required
      if (now < gracePeriodEnds) {
        return {
          required: false,
          reason: `MFA will be required for ${profile.role} accounts after ${gracePeriodEnds.toLocaleDateString()}`,
          gracePeriodEnds,
        };
      }

      return {
        required: true,
        reason: `Multi-factor authentication is required for ${profile.role} accounts to protect patient data.`,
      };
    }

    // Parents don't require MFA but can optionally enable it
    return { required: false };
  } catch (error) {
    console.error('[MFA] Error checking MFA requirement:', error);
    return { required: false };
  }
}

/**
 * Start MFA enrollment - generates QR code for authenticator app
 */
export async function enrollMFA(friendlyName: string = 'Aminy App'): Promise<MFAEnrollmentResult | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[MFA] No authenticated user');
      return null;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) {
      console.error('[MFA] Enrollment error:', error);
      return null;
    }

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  } catch (error) {
    console.error('[MFA] Error enrolling MFA:', error);
    return null;
  }
}

/**
 * Verify MFA enrollment with code from authenticator app
 */
export async function verifyMFAEnrollment(factorId: string, code: string): Promise<boolean> {
  try {
    // Create a challenge for the factor
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      console.error('[MFA] Challenge error:', challengeError);
      return false;
    }

    // Verify the challenge with user's code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      console.error('[MFA] Verification error:', error);
      return false;
    }

    if (import.meta.env.DEV) console.log('[MFA] Enrollment verified successfully');
    return true;
  } catch (error) {
    console.error('[MFA] Error verifying enrollment:', error);
    return false;
  }
}

/**
 * Verify MFA during login (creates challenge and verifies)
 */
export async function verifyMFALogin(code: string): Promise<boolean> {
  try {
    // Get the user's TOTP factors
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError || !factorsData?.totp?.length) {
      console.error('[MFA] No TOTP factors found');
      return false;
    }

    // Find a verified factor
    const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
    if (!verifiedFactor) {
      console.error('[MFA] No verified factor found');
      return false;
    }

    // Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });

    if (challengeError) {
      console.error('[MFA] Challenge error:', challengeError);
      return false;
    }

    // Verify the code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      console.error('[MFA] Login verification error:', error);
      return false;
    }

    if (import.meta.env.DEV) console.log('[MFA] Login MFA verified successfully');
    return true;
  } catch (error) {
    console.error('[MFA] Error verifying login MFA:', error);
    return false;
  }
}

/**
 * Unenroll/remove MFA factor
 */
export async function unenrollMFA(factorId: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      console.error('[MFA] Unenroll error:', error);
      return false;
    }

    if (import.meta.env.DEV) console.log('[MFA] Factor unenrolled successfully');
    return true;
  } catch (error) {
    console.error('[MFA] Error unenrolling MFA:', error);
    return false;
  }
}

/**
 * Generate backup codes (stored securely for account recovery)
 * Note: Supabase doesn't have native backup codes, so we'd need to implement
 * this with a custom solution or use recovery through email
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric codes
    const code = Array.from(
      { length: 8 },
      () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('');
    codes.push(code);
  }
  return codes;
}

/**
 * Check if current session needs MFA verification
 */
export async function needsMFAVerification(): Promise<boolean> {
  const status = await getMFAStatus();
  const requirement = await checkMFARequirement();

  // If MFA is enrolled but current level is only aal1, needs verification
  if (status.isEnrolled && status.currentLevel === 'aal1') {
    return true;
  }

  // If MFA is required but not enrolled, they need to enroll first
  // This is handled separately in the UI flow
  return false;
}

/**
 * Hook-friendly function to check MFA state for routing
 */
export interface MFAState {
  status: MFAStatus;
  requirement: MFARequirement;
  needsEnrollment: boolean;
  needsVerification: boolean;
  canProceed: boolean;
}

export async function getMFAState(): Promise<MFAState> {
  const status = await getMFAStatus();
  const requirement = await checkMFARequirement();

  const needsEnrollment = requirement.required && !status.isEnrolled;
  const needsVerification = status.isEnrolled && !status.isVerified;
  const canProceed = !requirement.required || (status.isEnrolled && status.isVerified);

  return {
    status,
    requirement,
    needsEnrollment,
    needsVerification,
    canProceed,
  };
}

export default {
  getMFAStatus,
  checkMFARequirement,
  enrollMFA,
  verifyMFAEnrollment,
  verifyMFALogin,
  unenrollMFA,
  generateBackupCodes,
  needsMFAVerification,
  getMFAState,
};
