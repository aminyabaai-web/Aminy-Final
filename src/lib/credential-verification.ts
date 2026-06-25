// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

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
  metadata?: Record<string, unknown>;
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
    disciplinaryActions?: { type: string; date?: string; description?: string }[];
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

// ── NPPES API response types ─────────────────────────────────────────

/** Taxonomy entry in NPPES API response */
interface NPPESTaxonomy {
  code: string;
  taxonomy_group: string;
  desc: string;
  state: string;
  license: string;
  primary: boolean;
}

/** Address entry in NPPES API response */
interface NPPESAddress {
  country_code: string;
  country_name: string;
  address_purpose: string;
  address_type: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postal_code: string;
  telephone_number: string;
  fax_number: string;
}

/** Basic info section of NPPES API response */
interface NPPESBasic {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  name?: string;
  organization_name?: string;
  credential?: string;
  sole_proprietor?: string;
  gender?: string;
  enumeration_date?: string;
  last_updated?: string;
  status?: string;
  name_prefix?: string;
  name_suffix?: string;
}

/** Single provider result from NPPES API */
interface NPPESResult {
  created_epoch: number;
  enumeration_type: string;
  last_updated_epoch: number;
  number: string;
  addresses: NPPESAddress[];
  basic: NPPESBasic;
  taxonomies: NPPESTaxonomy[];
  identifiers: Array<{ identifier: string; desc: string; code: string; state: string; issuer: string }>;
  other_names: Array<{ type: string; code: string; first_name?: string; last_name?: string; organization_name?: string }>;
  endpoints: Array<{ endpointType: string; endpoint: string }>;
}

/** NPPES API response envelope */
interface NPPESResponse {
  result_count: number;
  results: NPPESResult[];
}

/** Detailed NPI verification data returned by verifyNPI */
export interface NPIVerificationData {
  npiNumber: string;
  entityType: 'individual' | 'organization';
  providerName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  credential?: string;
  organizationName?: string;
  gender?: string;
  enumerationDate: string;
  lastUpdated: string;
  status: string;
  practiceAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zip: string;
    phone: string;
  } | null;
  mailingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zip: string;
  } | null;
  taxonomies: Array<{
    code: string;
    description: string;
    primary: boolean;
    state: string;
    licenseNumber: string;
  }>;
  primaryTaxonomy: string | null;
  identifiers: Array<{ identifier: string; description: string; state: string }>;
}

/**
 * Validate NPI number format (10-digit Luhn check per CMS spec).
 * Returns true if the number passes the Luhn algorithm with the 80840 prefix.
 */
export function isValidNPIFormat(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;

  // NPI uses Luhn algorithm with prefix 80840
  const prefixed = '80840' + npi;
  let sum = 0;
  let alternate = false;

  for (let i = prefixed.length - 1; i >= 0; i--) {
    let digit = parseInt(prefixed[i], 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Verify NPI (National Provider Identifier)
 * Uses the NPPES NPI Registry API (free, public, no API key required).
 * Endpoint: https://npiregistry.cms.hhs.gov/api/?version=2.1
 *
 * Parses the full response including provider name, taxonomy codes,
 * practice address, enumeration date, and identifiers.
 */
export async function verifyNPI(npiNumber: string): Promise<VerificationResult> {
  // Pre-validate format before hitting the API
  const trimmed = npiNumber.trim();
  if (!isValidNPIFormat(trimmed)) {
    return {
      success: false,
      status: 'not_found',
      error: `Invalid NPI format: must be a 10-digit number passing Luhn validation (got "${trimmed}")`,
      source: 'npi_registry',
      verifiedAt: new Date().toISOString(),
    };
  }

  try {
    // NPPES NPI Registry is a public API -- no key required
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(trimmed)}`
    );

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        error: `NPI Registry returned HTTP ${response.status}`,
        source: 'npi_registry',
        verifiedAt: new Date().toISOString(),
      };
    }

    const data: NPPESResponse = await response.json();

    if (data.result_count === 0) {
      return {
        success: false,
        status: 'not_found',
        error: 'NPI not found in the NPPES registry',
        source: 'npi_registry',
        verifiedAt: new Date().toISOString(),
      };
    }

    const provider = data.results[0];
    const basic = provider.basic;
    const taxonomies = provider.taxonomies ?? [];
    const addresses = provider.addresses ?? [];

    // Determine entity type
    const isOrganization = provider.enumeration_type === 'NPI-2';
    const entityType: 'individual' | 'organization' = isOrganization ? 'organization' : 'individual';

    // Build provider name
    const providerName = isOrganization
      ? (basic.organization_name ?? 'Unknown Organization')
      : [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean).join(' ') || 'Unknown';

    // Parse practice address (address_purpose === 'LOCATION')
    const practiceAddr = addresses.find(a => a.address_purpose === 'LOCATION');
    const mailingAddr = addresses.find(a => a.address_purpose === 'MAILING');

    const practiceAddress = practiceAddr
      ? {
          line1: practiceAddr.address_1,
          line2: practiceAddr.address_2 || null,
          city: practiceAddr.city,
          state: practiceAddr.state,
          zip: practiceAddr.postal_code,
          phone: practiceAddr.telephone_number,
        }
      : null;

    const mailingAddress = mailingAddr
      ? {
          line1: mailingAddr.address_1,
          line2: mailingAddr.address_2 || null,
          city: mailingAddr.city,
          state: mailingAddr.state,
          zip: mailingAddr.postal_code,
        }
      : null;

    // Parse taxonomies
    const parsedTaxonomies = taxonomies.map(t => ({
      code: t.code,
      description: t.desc,
      primary: t.primary,
      state: t.state,
      licenseNumber: t.license,
    }));

    const primaryTaxonomy = parsedTaxonomies.find(t => t.primary)?.description ?? null;

    // Parse identifiers
    const parsedIdentifiers = (provider.identifiers ?? []).map(id => ({
      identifier: id.identifier,
      description: id.desc,
      state: id.state,
    }));

    // Build the detailed NPI verification data
    const npiData: NPIVerificationData = {
      npiNumber: provider.number,
      entityType,
      providerName,
      firstName: basic.first_name,
      lastName: basic.last_name,
      middleName: basic.middle_name,
      credential: basic.credential,
      organizationName: basic.organization_name,
      gender: basic.gender,
      enumerationDate: basic.enumeration_date ?? '',
      lastUpdated: basic.last_updated ?? '',
      status: basic.status === 'A' ? 'Active' : (basic.status ?? 'Unknown'),
      practiceAddress,
      mailingAddress,
      taxonomies: parsedTaxonomies,
      primaryTaxonomy,
      identifiers: parsedIdentifiers,
    };

    return {
      success: true,
      status: 'verified',
      data: {
        name: providerName,
        credentialNumber: provider.number,
        status: npiData.status,
        expirationDate: undefined, // NPI does not expire
        specializations: parsedTaxonomies.map(t => t.description),
      },
      source: 'npi_registry',
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('NPI verification error:', error);
    return {
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      source: 'npi_registry',
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Enhanced NPI lookup that returns the full NPIVerificationData object.
 * Use this when you need address, taxonomy, and enumeration details beyond
 * the standard VerificationResult.
 */
export async function lookupNPIDetails(npiNumber: string): Promise<{
  success: boolean;
  data: NPIVerificationData | null;
  error?: string;
}> {
  const trimmed = npiNumber.trim();
  if (!isValidNPIFormat(trimmed)) {
    return { success: false, data: null, error: 'Invalid NPI format' };
  }

  try {
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(trimmed)}`
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const result: NPPESResponse = await response.json();

    if (result.result_count === 0) {
      return { success: false, data: null, error: 'NPI not found' };
    }

    const provider = result.results[0];
    const basic = provider.basic;
    const isOrganization = provider.enumeration_type === 'NPI-2';
    const addresses = provider.addresses ?? [];

    const practiceAddr = addresses.find(a => a.address_purpose === 'LOCATION');
    const mailingAddr = addresses.find(a => a.address_purpose === 'MAILING');

    const taxonomies = (provider.taxonomies ?? []).map(t => ({
      code: t.code,
      description: t.desc,
      primary: t.primary,
      state: t.state,
      licenseNumber: t.license,
    }));

    const data: NPIVerificationData = {
      npiNumber: provider.number,
      entityType: isOrganization ? 'organization' : 'individual',
      providerName: isOrganization
        ? (basic.organization_name ?? '')
        : [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean).join(' '),
      firstName: basic.first_name,
      lastName: basic.last_name,
      middleName: basic.middle_name,
      credential: basic.credential,
      organizationName: basic.organization_name,
      gender: basic.gender,
      enumerationDate: basic.enumeration_date ?? '',
      lastUpdated: basic.last_updated ?? '',
      status: basic.status === 'A' ? 'Active' : (basic.status ?? 'Unknown'),
      practiceAddress: practiceAddr
        ? {
            line1: practiceAddr.address_1,
            line2: practiceAddr.address_2 || null,
            city: practiceAddr.city,
            state: practiceAddr.state,
            zip: practiceAddr.postal_code,
            phone: practiceAddr.telephone_number,
          }
        : null,
      mailingAddress: mailingAddr
        ? {
            line1: mailingAddr.address_1,
            line2: mailingAddr.address_2 || null,
            city: mailingAddr.city,
            state: mailingAddr.state,
            zip: mailingAddr.postal_code,
          }
        : null,
      taxonomies,
      primaryTaxonomy: taxonomies.find(t => t.primary)?.description ?? null,
      identifiers: (provider.identifiers ?? []).map(id => ({
        identifier: id.identifier,
        description: id.desc,
        state: id.state,
      })),
    };

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
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
          (credential.metadata?.lastName as string) || ''
        );
        break;

      case 'npi':
        result = await verifyNPI(credential.credentialNumber!);
        break;

      case 'state_license':
        result = await verifyStateLicense(
          credential.state!,
          (credential.metadata?.licenseType as string) || providerType,
          credential.credentialNumber!,
          (credential.metadata?.lastName as string) || ''
        );
        break;

      case 'insurance_panel':
        result = await verifyInsurancePanel(
          (credential.metadata?.npi as string) || '',
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

// ─── OIG Exclusion Check ─────────────────────────────────────────────────────

export interface OIGExclusionResult {
  /** true = provider IS on the exclusion list — block immediately */
  excluded: boolean;
  /** false = check ran and returned clean. null = API unavailable, manual review required */
  verified: boolean | null;
  matchedRecord?: {
    name: string;
    npi?: string;
    specialty?: string;
    exclusionType: string;
    exclusionDate: string;
    reinstatedDate?: string;
    state?: string;
  };
  error?: string;
}

/**
 * Checks the OIG LEIE (List of Excluded Individuals/Entities).
 * Required for any provider billing Medicaid (AHCCCS, etc.).
 *
 * Uses OIG public API — no auth key required.
 * Falls back to manual review queue if the API is unreachable.
 *
 * @param npi - 10-digit NPI (preferred — most accurate match)
 * @param firstName - Provider first name (used if NPI is absent)
 * @param lastName - Provider last name
 */
export async function checkOIGExclusion(params: {
  npi?: string;
  firstName?: string;
  lastName?: string;
}): Promise<OIGExclusionResult> {
  const { npi, firstName, lastName } = params;

  if (!npi && (!firstName || !lastName)) {
    return { excluded: false, verified: null, error: 'NPI or full name required' };
  }

  try {
    // OIG LEIE public search API — free, no auth, updated monthly
    // Docs: https://oig.hhs.gov/exclusions/exclusions_files.asp
    const searchParams = new URLSearchParams();
    if (npi) {
      searchParams.set('npi', npi);
    } else {
      if (firstName) searchParams.set('firstname', firstName.trim());
      if (lastName) searchParams.set('lastname', lastName.trim());
    }

    const resp = await fetch(
      `https://oig.hhs.gov/exclusions/api/search.json?${searchParams.toString()}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );

    if (!resp.ok) {
      // API unreachable — flag for manual review, do NOT auto-block
      return { excluded: false, verified: null, error: `OIG API ${resp.status}` };
    }

    const data = await resp.json() as Array<Record<string, string>>;

    if (!Array.isArray(data) || data.length === 0) {
      // Clean — not found on exclusion list
      return { excluded: false, verified: true };
    }

    // Match on NPI first (definitive), then name
    const match = npi
      ? data.find(r => r.NPI === npi)
      : data.find(r =>
          r.LASTNAME?.toLowerCase() === lastName?.toLowerCase() &&
          r.FIRSTNAME?.toLowerCase() === firstName?.toLowerCase()
        );

    if (!match) {
      return { excluded: false, verified: true };
    }

    // Provider IS excluded
    return {
      excluded: true,
      verified: true,
      matchedRecord: {
        name: `${match.FIRSTNAME ?? ''} ${match.LASTNAME ?? ''}`.trim(),
        npi: match.NPI || undefined,
        specialty: match.SPECIALTY || undefined,
        exclusionType: match.EXCLTYPE ?? 'Unknown',
        exclusionDate: match.EXCLDATE ?? '',
        reinstatedDate: match.REINDATE || undefined,
        state: match.STATE || undefined,
      },
    };
  } catch (err) {
    // Network error or timeout — flag for manual review
    return { excluded: false, verified: null, error: String(err) };
  }
}

export default {
  verifyBACBCredential,
  verifyNPI,
  lookupNPIDetails,
  isValidNPIFormat,
  verifyStateLicense,
  verifyInsurancePanel,
  verifyProvider,
  getProviderVerificationStatus,
  checkReverificationNeeded,
  getRequiredCredentials,
  formatCredentialDisplay,
  checkOIGExclusion,
};
