/**
 * Provider Credential Verification System
 *
 * Verifies provider licenses and certifications:
 * - BACB verification for BCBAs
 * - State license verification
 * - NPI verification
 * - Insurance panel verification
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// Types
export type CredentialType =
  | 'bacb' // BCBA certification
  | 'state_license' // State professional license
  | 'npi' // National Provider Identifier
  | 'insurance_panel' // Insurance network participation
  | 'ccc_slp' // Certificate of Clinical Competence - SLP
  | 'nbcot' // National Board for Certification in OT
  | 'apta' // American Physical Therapy Association
  | 'psychology_license' // State psychology license
  | 'medical_license'; // Medical license for physicians

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'expired'
  | 'revoked'
  | 'not_found'
  | 'error';

export interface Credential {
  id: string;
  providerId: string;
  type: CredentialType;
  credentialNumber: string;
  issuingAuthority: string;
  state?: string; // For state licenses
  issueDate: string;
  expirationDate?: string;
  status: VerificationStatus;
  verifiedAt?: string;
  verificationSource?: string;
  documentUrl?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  data?: {
    name?: string;
    credentialNumber?: string;
    status?: string;
    expirationDate?: string;
    specializations?: string[];
    disciplinaryActions?: any[];
  };
  error?: string;
  source: string;
  verifiedAt: string;
}

export interface ProviderVerificationSummary {
  providerId: string;
  providerName: string;
  providerType: string;
  overallStatus: 'fully_verified' | 'partially_verified' | 'not_verified' | 'expired';
  credentials: Credential[];
  lastVerifiedAt?: string;
  nextVerificationDue?: string;
}

// BACB verification endpoints
const BACB_API_BASE = 'https://www.bacb.com'; // Note: BACB may require direct contact for API access

/**
 * Verify BACB certification
 * Uses the BACB Certificant Registry
 */
export async function verifyBACBCredential(
  certificationNumber: string,
  lastName: string
): Promise<VerificationResult> {
  try {
    // Call backend to verify (backend handles actual BACB API or scraping)
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/credentials/verify/bacb`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          certificationNumber,
          lastName,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        status: 'error',
        error: `Verification failed: ${error}`,
        source: 'bacb_registry',
        verifiedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();
    return {
      success: data.verified,
      status: data.verified ? 'verified' : 'not_found',
      data: {
        name: data.name,
        credentialNumber: data.certificationNumber,
        status: data.certificationStatus,
        expirationDate: data.expirationDate,
        specializations: data.specializations,
      },
      source: 'bacb_registry',
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('BACB verification error:', error);
    return {
      success: false,
      status: 'error',
      error: String(error),
      source: 'bacb_registry',
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Verify NPI (National Provider Identifier)
 * Uses the NPI Registry API
 */
export async function verifyNPI(npiNumber: string): Promise<VerificationResult> {
  try {
    // NPI Registry is a public API
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npiNumber}`
    );

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        error: 'NPI Registry unavailable',
        source: 'npi_registry',
        verifiedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();

    if (data.result_count === 0) {
      return {
        success: false,
        status: 'not_found',
        error: 'NPI not found in registry',
        source: 'npi_registry',
        verifiedAt: new Date().toISOString(),
      };
    }

    const provider = data.results[0];
    const basic = provider.basic || {};
    const taxonomies = provider.taxonomies || [];

    return {
      success: true,
      status: 'verified',
      data: {
        name: basic.name || `${basic.first_name} ${basic.last_name}`,
        credentialNumber: provider.number,
        status: basic.status || 'Active',
        specializations: taxonomies.map((t: any) => t.desc),
      },
      source: 'npi_registry',
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('NPI verification error:', error);
    return {
      success: false,
      status: 'error',
      error: String(error),
      source: 'npi_registry',
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Verify state professional license
 * Routes to appropriate state board API
 */
export async function verifyStateLicense(
  state: string,
  licenseType: string,
  licenseNumber: string,
  lastName: string
): Promise<VerificationResult> {
  try {
    // Call backend to verify (backend handles state-specific APIs)
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/credentials/verify/state-license`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          state,
          licenseType,
          licenseNumber,
          lastName,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        status: 'error',
        error: `State license verification failed: ${error}`,
        source: `${state}_licensing_board`,
        verifiedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();
    return {
      success: data.verified,
      status: data.verified
        ? data.expired
          ? 'expired'
          : 'verified'
        : 'not_found',
      data: {
        name: data.name,
        credentialNumber: data.licenseNumber,
        status: data.licenseStatus,
        expirationDate: data.expirationDate,
        disciplinaryActions: data.disciplinaryActions,
      },
      source: `${state}_licensing_board`,
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('State license verification error:', error);
    return {
      success: false,
      status: 'error',
      error: String(error),
      source: `${state}_licensing_board`,
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Verify insurance panel membership
 */
export async function verifyInsurancePanel(
  npiNumber: string,
  insurerCode: string
): Promise<VerificationResult> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/credentials/verify/insurance-panel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          npiNumber,
          insurerCode,
        }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        error: 'Insurance panel verification failed',
        source: `${insurerCode}_provider_network`,
        verifiedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();
    return {
      success: data.inNetwork,
      status: data.inNetwork ? 'verified' : 'not_found',
      data: {
        status: data.inNetwork ? 'In-Network' : 'Not In-Network',
        specializations: data.acceptingSpecialties,
      },
      source: `${insurerCode}_provider_network`,
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Insurance panel verification error:', error);
    return {
      success: false,
      status: 'error',
      error: String(error),
      source: `${insurerCode}_provider_network`,
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Run full verification for a provider
 */
export async function verifyProvider(
  providerId: string,
  providerType: string,
  credentials: Partial<Credential>[]
): Promise<ProviderVerificationSummary> {
  const results: Credential[] = [];
  let hasVerified = false;
  let hasExpired = false;
  let hasFailed = false;

  for (const credential of credentials) {
    let result: VerificationResult;

    switch (credential.type) {
      case 'bacb':
        result = await verifyBACBCredential(
          credential.credentialNumber!,
          credential.metadata?.lastName || ''
        );
        break;

      case 'npi':
        result = await verifyNPI(credential.credentialNumber!);
        break;

      case 'state_license':
        result = await verifyStateLicense(
          credential.state!,
          credential.metadata?.licenseType || providerType,
          credential.credentialNumber!,
          credential.metadata?.lastName || ''
        );
        break;

      case 'insurance_panel':
        result = await verifyInsurancePanel(
          credential.metadata?.npi || '',
          credential.issuingAuthority!
        );
        break;

      default:
        result = {
          success: false,
          status: 'pending',
          source: 'manual_review',
          verifiedAt: new Date().toISOString(),
        };
    }

    const verifiedCredential: Credential = {
      id: credential.id || `cred-${Date.now()}`,
      providerId,
      type: credential.type!,
      credentialNumber: credential.credentialNumber!,
      issuingAuthority: result.source,
      state: credential.state,
      issueDate: credential.issueDate || new Date().toISOString(),
      expirationDate: result.data?.expirationDate || credential.expirationDate,
      status: result.status,
      verifiedAt: result.verifiedAt,
      verificationSource: result.source,
      metadata: {
        ...credential.metadata,
        verificationData: result.data,
      },
    };

    results.push(verifiedCredential);

    if (result.status === 'verified') hasVerified = true;
    if (result.status === 'expired') hasExpired = true;
    if (result.status === 'not_found' || result.status === 'error') hasFailed = true;
  }

  // Determine overall status
  let overallStatus: ProviderVerificationSummary['overallStatus'];
  if (hasExpired && !hasVerified) {
    overallStatus = 'expired';
  } else if (!hasVerified) {
    overallStatus = 'not_verified';
  } else if (hasFailed || hasExpired) {
    overallStatus = 'partially_verified';
  } else {
    overallStatus = 'fully_verified';
  }

  // Save verification results to database
  await saveVerificationResults(providerId, results, overallStatus);

  return {
    providerId,
    providerName: '', // Will be populated by caller
    providerType,
    overallStatus,
    credentials: results,
    lastVerifiedAt: new Date().toISOString(),
    nextVerificationDue: getNextVerificationDate(results),
  };
}

/**
 * Save verification results to database
 */
async function saveVerificationResults(
  providerId: string,
  credentials: Credential[],
  overallStatus: string
): Promise<void> {
  try {
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/credentials/save`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          providerId,
          credentials,
          overallStatus,
          verifiedAt: new Date().toISOString(),
        }),
      }
    );
  } catch (error) {
    console.error('Failed to save verification results:', error);
  }
}

/**
 * Calculate next verification date based on credential expirations
 */
function getNextVerificationDate(credentials: Credential[]): string {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Find earliest expiration
  let earliestExpiration: Date | null = null;

  for (const cred of credentials) {
    if (cred.expirationDate) {
      const expDate = new Date(cred.expirationDate);
      if (!earliestExpiration || expDate < earliestExpiration) {
        earliestExpiration = expDate;
      }
    }
  }

  // If we have an expiration coming up, verify 30 days before
  if (earliestExpiration) {
    const verifyDate = new Date(
      earliestExpiration.getTime() - 30 * 24 * 60 * 60 * 1000
    );
    if (verifyDate > now) {
      return verifyDate.toISOString();
    }
    return now.toISOString(); // Already past, verify now
  }

  // Default: verify again in 90 days
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return ninetyDays.toISOString();
}

/**
 * Get provider's verification status
 */
export async function getProviderVerificationStatus(
  providerId: string
): Promise<ProviderVerificationSummary | null> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/credentials/status/${providerId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get verification status:', error);
    return null;
  }
}

/**
 * Check if provider needs reverification
 */
export async function checkReverificationNeeded(
  providerId: string
): Promise<boolean> {
  const status = await getProviderVerificationStatus(providerId);
  if (!status) return true;

  if (status.nextVerificationDue) {
    return new Date(status.nextVerificationDue) <= new Date();
  }

  return status.overallStatus !== 'fully_verified';
}

/**
 * Get list of required credentials by provider type
 */
export function getRequiredCredentials(providerType: string): CredentialType[] {
  const requirements: Record<string, CredentialType[]> = {
    bcba: ['bacb', 'state_license', 'npi'],
    slp: ['ccc_slp', 'state_license', 'npi'],
    ot: ['nbcot', 'state_license', 'npi'],
    pt: ['state_license', 'npi'],
    psychologist: ['psychology_license', 'npi'],
    developmental_pediatrician: ['medical_license', 'npi'],
    neuropsychologist: ['psychology_license', 'npi'],
  };

  return requirements[providerType] || ['npi'];
}

/**
 * Format credential for display
 */
export function formatCredentialDisplay(credential: Credential): {
  title: string;
  status: string;
  statusColor: string;
  expirationInfo: string;
} {
  const titles: Record<CredentialType, string> = {
    bacb: 'BACB Certification',
    state_license: `${credential.state || 'State'} Professional License`,
    npi: 'NPI Registration',
    insurance_panel: `${credential.issuingAuthority} Network`,
    ccc_slp: 'CCC-SLP Certification',
    nbcot: 'NBCOT Certification',
    apta: 'APTA Certification',
    psychology_license: 'Psychology License',
    medical_license: 'Medical License',
  };

  const statusColors: Record<VerificationStatus, string> = {
    verified: 'green',
    pending: 'yellow',
    expired: 'orange',
    revoked: 'red',
    not_found: 'red',
    error: 'gray',
  };

  let expirationInfo = '';
  if (credential.expirationDate) {
    const expDate = new Date(credential.expirationDate);
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      expirationInfo = 'Expired';
    } else if (daysUntilExpiration < 30) {
      expirationInfo = `Expires in ${daysUntilExpiration} days`;
    } else {
      expirationInfo = `Expires ${expDate.toLocaleDateString()}`;
    }
  }

  return {
    title: titles[credential.type] || credential.type,
    status: credential.status.replace('_', ' ').toUpperCase(),
    statusColor: statusColors[credential.status],
    expirationInfo,
  };
}

export default {
  verifyBACBCredential,
  verifyNPI,
  verifyStateLicense,
  verifyInsurancePanel,
  verifyProvider,
  getProviderVerificationStatus,
  checkReverificationNeeded,
  getRequiredCredentials,
  formatCredentialDisplay,
};
