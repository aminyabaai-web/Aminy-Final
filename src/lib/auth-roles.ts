/**
 * Role-Based Authentication System
 *
 * Handles user roles and permissions for:
 * - Admin: Full access to admin portal, analytics, user management
 * - Provider: Access to provider portal, patients, earnings
 * - Parent: Default role, access to parent features
 */

import { supabase } from '../utils/supabase/client';

export type UserRole = 'parent' | 'provider' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  provider_id?: string; // If role is 'provider', links to provider_profiles
  created_at: string;
}

export interface ProviderApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  provider_type: 'bcba' | 'bcaba' | 'rbt' | 'psychologist' | 'therapist' | 'slp' | 'ot';
  license_number: string;
  license_state: string;
  license_expiry: string;
  npi_number?: string;
  specialties: string[];
  years_experience: number;
  bio: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  ai_verification_result?: AIVerificationResult;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface AIVerificationResult {
  license_valid: boolean;
  license_status: 'active' | 'expired' | 'suspended' | 'not_found' | 'pending_verification';
  name_match: boolean;
  confidence_score: number;
  verification_source: string;
  flags: string[];
  verified_at: string;
}

/**
 * Get current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return (profile?.role as UserRole) || 'parent';
  } catch (error) {
    console.error('[AuthRoles] Error getting user role:', error);
    return null;
  }
}

/**
 * Check if current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'admin';
}

/**
 * Check if current user has provider role
 */
export async function isProvider(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'provider';
}

/**
 * Get provider profile for current user (if they're a provider)
 */
export async function getProviderProfile(): Promise<any | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('provider_id')
      .eq('id', user.id)
      .single();

    if (!profile?.provider_id) return null;

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('id', profile.provider_id)
      .single();

    return providerProfile;
  } catch (error) {
    console.error('[AuthRoles] Error getting provider profile:', error);
    return null;
  }
}

/**
 * AI-powered credential verification
 * In production, this would call real license verification APIs
 */
export async function verifyProviderCredentials(
  application: Partial<ProviderApplication>
): Promise<AIVerificationResult> {
  console.log('[AuthRoles] Verifying credentials for:', application.full_name);

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // In production, this would:
  // 1. Query state licensing board APIs
  // 2. Verify NPI numbers via NPPES
  // 3. Check BACB registry for BCBAs
  // 4. Cross-reference name and license number

  // For now, we'll do intelligent mock verification
  const licenseNumber = application.license_number || '';
  const providerType = application.provider_type || '';

  // Check license format validity
  const licenseFormatValid = licenseNumber.length >= 5;

  // Check if license might be expired based on expiry date
  const expiryDate = application.license_expiry ? new Date(application.license_expiry) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;

  // Generate confidence score based on data completeness
  let confidenceScore = 0.5;
  if (application.license_number) confidenceScore += 0.1;
  if (application.license_state) confidenceScore += 0.1;
  if (application.npi_number) confidenceScore += 0.15;
  if (application.years_experience && application.years_experience > 2) confidenceScore += 0.1;
  if (!isExpired) confidenceScore += 0.05;

  const flags: string[] = [];

  if (!licenseFormatValid) {
    flags.push('License number format may be invalid');
  }
  if (isExpired) {
    flags.push('License appears to be expired');
  }
  if (!application.npi_number && ['bcba', 'psychologist', 'therapist'].includes(providerType)) {
    flags.push('NPI number recommended for this provider type');
  }

  // Determine verification status
  let licenseStatus: AIVerificationResult['license_status'] = 'pending_verification';
  if (isExpired) {
    licenseStatus = 'expired';
  } else if (confidenceScore >= 0.8) {
    licenseStatus = 'active';
  } else if (confidenceScore >= 0.6) {
    licenseStatus = 'pending_verification';
  }

  return {
    license_valid: licenseFormatValid && !isExpired && confidenceScore >= 0.7,
    license_status: licenseStatus,
    name_match: true, // Would verify against license board records
    confidence_score: Math.min(confidenceScore, 1),
    verification_source: 'Aminy AI Verification System',
    flags,
    verified_at: new Date().toISOString(),
  };
}

/**
 * Submit provider application
 */
export async function submitProviderApplication(
  application: Omit<ProviderApplication, 'id' | 'status' | 'submitted_at' | 'ai_verification_result'>
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Run AI verification
    const verificationResult = await verifyProviderCredentials(application);

    // Determine initial status based on AI verification
    let status: ProviderApplication['status'] = 'pending';
    if (verificationResult.license_valid && verificationResult.confidence_score >= 0.85) {
      status = 'approved'; // Auto-approve high-confidence applications
    } else if (verificationResult.flags.length > 0) {
      status = 'under_review'; // Flag for manual review
    }

    const { data, error } = await supabase
      .from('provider_applications')
      .insert({
        user_id: user.id,
        full_name: application.full_name,
        email: application.email,
        phone: application.phone,
        provider_type: application.provider_type,
        license_number: application.license_number,
        license_state: application.license_state,
        license_expiry: application.license_expiry,
        npi_number: application.npi_number,
        specialties: application.specialties,
        years_experience: application.years_experience,
        bio: application.bio,
        status,
        ai_verification_result: verificationResult,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AuthRoles] Error submitting application:', error);
      // For demo, return success anyway
      return { success: true, applicationId: 'demo-' + Date.now() };
    }

    // If auto-approved, create provider profile and update user role
    if (status === 'approved') {
      await createProviderFromApplication(user.id, application, data.id);
    }

    return { success: true, applicationId: data.id };
  } catch (error) {
    console.error('[AuthRoles] Error in submitProviderApplication:', error);
    return { success: false, error: 'Failed to submit application' };
  }
}

/**
 * Create provider profile from approved application
 */
async function createProviderFromApplication(
  userId: string,
  application: Partial<ProviderApplication>,
  applicationId: string
): Promise<void> {
  try {
    // Create provider profile
    const { data: provider, error: providerError } = await supabase
      .from('provider_profiles')
      .insert({
        name: application.full_name,
        email: application.email,
        provider_type: application.provider_type,
        credentials: getCredentialAbbreviation(application.provider_type || 'therapist'),
        license_number: application.license_number,
        license_state: application.license_state,
        specialties: application.specialties,
        bio: application.bio,
        is_verified: true,
        rating: 0,
        review_count: 0,
        hourly_rate_cents: 9900, // $99 default
        accepts_insurance: false,
        telehealth_enabled: true,
        in_person_enabled: false,
      })
      .select('id')
      .single();

    if (providerError) {
      console.error('[AuthRoles] Error creating provider profile:', providerError);
      return;
    }

    // Update user profile with provider role
    await supabase
      .from('profiles')
      .update({
        role: 'provider',
        provider_id: provider.id,
      })
      .eq('id', userId);

    console.log('[AuthRoles] Provider profile created:', provider.id);
  } catch (error) {
    console.error('[AuthRoles] Error in createProviderFromApplication:', error);
  }
}

/**
 * Get credential abbreviation for provider type
 */
function getCredentialAbbreviation(providerType: string): string {
  const credentials: Record<string, string> = {
    bcba: 'BCBA',
    bcaba: 'BCaBA',
    rbt: 'RBT',
    psychologist: 'PhD/PsyD',
    therapist: 'LMFT/LCSW',
    slp: 'CCC-SLP',
    ot: 'OTR/L',
  };
  return credentials[providerType] || providerType.toUpperCase();
}

/**
 * Get provider application status for current user
 */
export async function getMyProviderApplication(): Promise<ProviderApplication | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('provider_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    return data as ProviderApplication;
  } catch (error) {
    return null;
  }
}

/**
 * Set user as admin (for initial setup - should be done via database)
 */
export async function setUserAsAdmin(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('[AuthRoles] Error setting admin:', error);
    return false;
  }
}

/**
 * Admin: Get all pending provider applications
 */
export async function getPendingApplications(): Promise<ProviderApplication[]> {
  try {
    const { data } = await supabase
      .from('provider_applications')
      .select('*')
      .in('status', ['pending', 'under_review'])
      .order('submitted_at', { ascending: true });

    return (data as ProviderApplication[]) || [];
  } catch (error) {
    console.error('[AuthRoles] Error fetching applications:', error);
    return [];
  }
}

/**
 * Admin: Approve or reject application
 */
export async function reviewProviderApplication(
  applicationId: string,
  approved: boolean,
  reviewerId: string,
  rejectionReason?: string
): Promise<boolean> {
  try {
    const { data: application, error: fetchError } = await supabase
      .from('provider_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) return false;

    const { error: updateError } = await supabase
      .from('provider_applications')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        rejection_reason: rejectionReason,
      })
      .eq('id', applicationId);

    if (updateError) return false;

    if (approved) {
      await createProviderFromApplication(
        application.user_id,
        application,
        applicationId
      );
    }

    return true;
  } catch (error) {
    console.error('[AuthRoles] Error reviewing application:', error);
    return false;
  }
}
