/**
 * Provider Credential Verification System
 * Ensures BCBAs, RBTs, and other providers have valid credentials
 *
 * Integrates with:
 * - BACB Certificant Registry
 * - NPI Registry
 * - State license databases
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type CredentialType =
  | 'bcba'      // Board Certified Behavior Analyst
  | 'bcba-d'    // BCBA-Doctoral
  | 'bcaba'     // Board Certified Assistant Behavior Analyst
  | 'rbt'       // Registered Behavior Technician
  | 'lcsw'      // Licensed Clinical Social Worker
  | 'lmft'      // Licensed Marriage Family Therapist
  | 'psychologist'
  | 'slp'       // Speech Language Pathologist
  | 'ot'        // Occupational Therapist
  | 'pt'        // Physical Therapist
  | 'npi';      // National Provider Identifier

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'manual_review';

export interface ProviderCredential {
  id?: string;
  provider_id: string;
  credential_type: CredentialType;
  credential_number: string;
  issuing_body: string;
  state?: string;
  issue_date?: string;
  expiration_date?: string;
  verification_status: VerificationStatus;
  verified_at?: string;
  verification_notes?: string;
  raw_response?: Record<string, unknown>;
}

export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  message: string;
  data?: {
    name?: string;
    credential_number?: string;
    status?: string;
    expiration_date?: string;
    specialty?: string;
  };
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Verify a BACB credential (BCBA, BCaBA, RBT)
 * Uses the BACB Certificant Registry API
 */
export async function verifyBACBCredential(
  certificantNumber: string,
  type: 'bcba' | 'bcba-d' | 'bcaba' | 'rbt'
): Promise<VerificationResult> {
  try {
    // BACB Registry lookup URL
    // In production, this would call a backend function that queries BACB
    const response = await fetch(
      `/api/verify/bacb`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificant_number: certificantNumber,
          credential_type: type.toUpperCase()
        })
      }
    );

    if (!response.ok) {
      // Fallback to manual verification if API unavailable
      return {
        success: false,
        status: 'manual_review',
        message: 'BACB registry unavailable. Credential flagged for manual verification.'
      };
    }

    const data = await response.json();

    if (data.found && data.status === 'Active') {
      return {
        success: true,
        status: 'verified',
        message: `${type.toUpperCase()} credential verified`,
        data: {
          name: data.name,
          credential_number: certificantNumber,
          status: data.status,
          expiration_date: data.expiration_date,
          specialty: data.specialty
        }
      };
    } else if (data.found && data.status === 'Expired') {
      return {
        success: false,
        status: 'expired',
        message: 'Credential found but expired',
        data: {
          credential_number: certificantNumber,
          status: data.status,
          expiration_date: data.expiration_date
        }
      };
    } else {
      return {
        success: false,
        status: 'failed',
        message: 'Credential not found in BACB registry'
      };
    }
  } catch (error) {
    console.error('BACB verification error:', error);
    return {
      success: false,
      status: 'manual_review',
      message: 'Verification failed. Flagged for manual review.'
    };
  }
}

/**
 * Verify NPI (National Provider Identifier)
 * Uses the NPPES NPI Registry API (free, public)
 */
export async function verifyNPI(npiNumber: string): Promise<VerificationResult> {
  try {
    // NPPES NPI Registry is a free public API
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npiNumber}`
    );

    if (!response.ok) {
      return {
        success: false,
        status: 'manual_review',
        message: 'NPI registry unavailable'
      };
    }

    const data = await response.json();

    if (data.result_count > 0) {
      const provider = data.results[0];
      const basic = provider.basic || {};

      return {
        success: true,
        status: 'verified',
        message: 'NPI verified',
        data: {
          name: `${basic.first_name || ''} ${basic.last_name || ''}`.trim() ||
                basic.organization_name || 'Unknown',
          credential_number: npiNumber,
          status: basic.status === 'A' ? 'Active' : basic.status,
          specialty: provider.taxonomies?.[0]?.desc
        }
      };
    } else {
      return {
        success: false,
        status: 'failed',
        message: 'NPI not found in registry'
      };
    }
  } catch (error) {
    console.error('NPI verification error:', error);
    return {
      success: false,
      status: 'manual_review',
      message: 'NPI verification failed'
    };
  }
}

/**
 * Verify any credential type
 */
export async function verifyCredential(
  credentialType: CredentialType,
  credentialNumber: string,
  state?: string
): Promise<VerificationResult> {
  switch (credentialType) {
    case 'bcba':
    case 'bcba-d':
    case 'bcaba':
    case 'rbt':
      return verifyBACBCredential(credentialNumber, credentialType);

    case 'npi':
      return verifyNPI(credentialNumber);

    case 'lcsw':
    case 'lmft':
    case 'psychologist':
    case 'slp':
    case 'ot':
    case 'pt':
      // State licenses require manual verification or state-specific APIs
      return {
        success: false,
        status: 'manual_review',
        message: `${credentialType.toUpperCase()} credentials require manual verification. Our team will verify within 24-48 hours.`
      };

    default:
      return {
        success: false,
        status: 'pending',
        message: 'Unknown credential type'
      };
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save credential to database
 */
export async function saveProviderCredential(
  credential: Omit<ProviderCredential, 'id'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('provider_credentials')
      .upsert({
        ...credential,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'provider_id,credential_type,credential_number'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving credential:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Error saving credential:', err);
    return { success: false, error: 'Failed to save credential' };
  }
}

/**
 * Get all credentials for a provider
 */
export async function getProviderCredentials(
  providerId: string
): Promise<ProviderCredential[]> {
  try {
    const { data, error } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('provider_id', providerId)
      .order('verification_status', { ascending: true });

    if (error) {
      console.error('Error getting credentials:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting credentials:', err);
    return [];
  }
}

/**
 * Submit credential for verification
 */
export async function submitCredentialForVerification(
  providerId: string,
  credentialType: CredentialType,
  credentialNumber: string,
  state?: string
): Promise<{
  success: boolean;
  status: VerificationStatus;
  message: string;
}> {
  // First, verify the credential
  const verificationResult = await verifyCredential(credentialType, credentialNumber, state);

  // Save to database regardless of result
  const credential: Omit<ProviderCredential, 'id'> = {
    provider_id: providerId,
    credential_type: credentialType,
    credential_number: credentialNumber,
    issuing_body: getIssuingBody(credentialType),
    state: state,
    verification_status: verificationResult.status,
    verified_at: verificationResult.success ? new Date().toISOString() : undefined,
    verification_notes: verificationResult.message,
    raw_response: verificationResult.data
  };

  if (verificationResult.data?.expiration_date) {
    credential.expiration_date = verificationResult.data.expiration_date;
  }

  const saveResult = await saveProviderCredential(credential);

  if (!saveResult.success) {
    return {
      success: false,
      status: 'pending',
      message: 'Failed to save credential. Please try again.'
    };
  }

  // If manual review required, create a task for admins
  if (verificationResult.status === 'manual_review') {
    await createVerificationTask(providerId, credentialType, credentialNumber);
  }

  return {
    success: verificationResult.success,
    status: verificationResult.status,
    message: verificationResult.message
  };
}

/**
 * Check if a provider is fully verified
 */
export async function isProviderVerified(providerId: string): Promise<boolean> {
  const credentials = await getProviderCredentials(providerId);

  // Provider needs at least one verified credential
  return credentials.some(c => c.verification_status === 'verified');
}

/**
 * Get verification badge level for display
 */
export async function getVerificationBadge(providerId: string): Promise<{
  level: 'none' | 'pending' | 'verified' | 'gold';
  credentials: string[];
  message: string;
}> {
  const credentials = await getProviderCredentials(providerId);

  if (credentials.length === 0) {
    return {
      level: 'none',
      credentials: [],
      message: 'No credentials submitted'
    };
  }

  const verified = credentials.filter(c => c.verification_status === 'verified');
  const pending = credentials.filter(c =>
    c.verification_status === 'pending' || c.verification_status === 'manual_review'
  );

  if (verified.length >= 2) {
    return {
      level: 'gold',
      credentials: verified.map(c => c.credential_type.toUpperCase()),
      message: 'Fully verified provider with multiple credentials'
    };
  }

  if (verified.length >= 1) {
    return {
      level: 'verified',
      credentials: verified.map(c => c.credential_type.toUpperCase()),
      message: 'Verified credential'
    };
  }

  if (pending.length > 0) {
    return {
      level: 'pending',
      credentials: pending.map(c => c.credential_type.toUpperCase()),
      message: 'Verification in progress'
    };
  }

  return {
    level: 'none',
    credentials: [],
    message: 'Verification failed - please resubmit'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getIssuingBody(credentialType: CredentialType): string {
  switch (credentialType) {
    case 'bcba':
    case 'bcba-d':
    case 'bcaba':
    case 'rbt':
      return 'Behavior Analyst Certification Board (BACB)';
    case 'npi':
      return 'Centers for Medicare & Medicaid Services (CMS)';
    case 'lcsw':
    case 'lmft':
    case 'psychologist':
      return 'State Licensing Board';
    case 'slp':
      return 'American Speech-Language-Hearing Association (ASHA)';
    case 'ot':
      return 'National Board for Certification in Occupational Therapy (NBCOT)';
    case 'pt':
      return 'Federation of State Boards of Physical Therapy (FSBPT)';
    default:
      return 'Unknown';
  }
}

async function createVerificationTask(
  providerId: string,
  credentialType: CredentialType,
  credentialNumber: string
): Promise<void> {
  try {
    await supabase
      .from('admin_tasks')
      .insert({
        task_type: 'credential_verification',
        priority: 'medium',
        status: 'pending',
        data: {
          provider_id: providerId,
          credential_type: credentialType,
          credential_number: credentialNumber
        },
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('Error creating verification task:', err);
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useProviderVerification(providerId: string | null) {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [badge, setBadge] = useState<Awaited<ReturnType<typeof getVerificationBadge>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const [creds, badgeData] = await Promise.all([
        getProviderCredentials(providerId),
        getVerificationBadge(providerId)
      ]);
      setCredentials(creds);
      setBadge(badgeData);
      setLoading(false);
    };

    fetchData();
  }, [providerId]);

  const submitCredential = useCallback(async (
    type: CredentialType,
    number: string,
    state?: string
  ) => {
    if (!providerId) return { success: false, status: 'pending' as const, message: 'No provider ID' };

    const result = await submitCredentialForVerification(providerId, type, number, state);

    // Refresh data
    const [creds, badgeData] = await Promise.all([
      getProviderCredentials(providerId),
      getVerificationBadge(providerId)
    ]);
    setCredentials(creds);
    setBadge(badgeData);

    return result;
  }, [providerId]);

  return {
    credentials,
    badge,
    loading,
    submitCredential,
    isVerified: badge?.level === 'verified' || badge?.level === 'gold'
  };
}

/**
 * Initiate verification for a specific credential
 * Triggers the verification process and updates status
 */
export async function initiateVerification(credentialId: string): Promise<VerificationResult> {
  try {
    // Get the credential details
    const { data: credential, error } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('id', credentialId)
      .single();

    if (error || !credential) {
      return {
        success: false,
        status: 'failed',
        message: 'Credential not found',
      };
    }

    // Verify based on credential type
    return await verifyCredential(credential.credential_type, credential.credential_number);
  } catch (error) {
    console.error('Verification initiation error:', error);
    return {
      success: false,
      status: 'manual_review',
      message: 'Verification failed. Flagged for manual review.',
    };
  }
}

export default {
  verifyCredential,
  verifyBACBCredential,
  verifyNPI,
  submitCredentialForVerification,
  getProviderCredentials,
  isProviderVerified,
  getVerificationBadge,
  initiateVerification,
  useProviderVerification
};
