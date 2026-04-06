// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Mock Auth
 *
 * Provides mock authentication objects for provider-portal screens
 * when no real Supabase auth session exists. Used during development,
 * demos, and testing to render populated provider views.
 *
 * IMPORTANT: This file is for development/demo use only.
 * Never use these objects in production auth flows.
 */

import type { DemoProvider } from './provider-demo-data';
import { DEMO_PROVIDERS } from './provider-demo-data';

// ============================================================================
// Types
// ============================================================================

export type ProviderPermission =
  | 'view_patients'
  | 'edit_treatment_plans'
  | 'write_session_notes'
  | 'view_analytics'
  | 'manage_schedule'
  | 'manage_billing'
  | 'approve_referrals'
  | 'manage_care_team'
  | 'view_credentials'
  | 'telehealth_host'
  | 'export_reports'
  | 'manage_rbt_supervision';

export interface MockProviderUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: 'provider';
  providerType: DemoProvider['providerType'];
  credentials: string;
  providerId: string;
  permissions: ProviderPermission[];
  associatedFamilies: MockAssociatedFamily[];
  avatarUrl: string | null;
  verified: boolean;
  verificationLevel: 'none' | 'pending' | 'verified' | 'gold';
  onboardingComplete: boolean;
  lastLoginAt: string;
  createdAt: string;
}

export interface MockAssociatedFamily {
  familyId: string;
  familyName: string;
  childName: string;
  childAge: number;
  relationship: 'primary_bcba' | 'assigned_rbt' | 'consulting_slp' | 'consulting_ot';
  consentStatus: 'granted' | 'pending' | 'revoked';
  startDate: string;
}

export interface MockProviderSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'bearer';
  user: {
    id: string;
    aud: string;
    role: string;
    email: string;
    email_confirmed_at: string;
    phone: string;
    confirmed_at: string;
    last_sign_in_at: string;
    app_metadata: {
      provider: string;
      providers: string[];
    };
    user_metadata: {
      full_name: string;
      provider_id: string;
      role: 'provider';
      provider_type: string;
      credentials: string;
      avatar_url: string | null;
    };
    identities: [];
    created_at: string;
    updated_at: string;
  };
}

// ============================================================================
// BCBA Permissions (full access)
// ============================================================================

const BCBA_PERMISSIONS: ProviderPermission[] = [
  'view_patients',
  'edit_treatment_plans',
  'write_session_notes',
  'view_analytics',
  'manage_schedule',
  'manage_billing',
  'approve_referrals',
  'manage_care_team',
  'view_credentials',
  'telehealth_host',
  'export_reports',
  'manage_rbt_supervision',
];

// ============================================================================
// RBT Permissions (limited — supervised role)
// ============================================================================

const RBT_PERMISSIONS: ProviderPermission[] = [
  'view_patients',
  'write_session_notes',
  'manage_schedule',
  'view_credentials',
  'telehealth_host',
];

// ============================================================================
// SLP / OT Permissions (independent clinician)
// ============================================================================

const CLINICIAN_PERMISSIONS: ProviderPermission[] = [
  'view_patients',
  'edit_treatment_plans',
  'write_session_notes',
  'view_analytics',
  'manage_schedule',
  'manage_billing',
  'approve_referrals',
  'view_credentials',
  'telehealth_host',
  'export_reports',
];

// ============================================================================
// Permission resolver
// ============================================================================

function getPermissionsForType(providerType: DemoProvider['providerType']): ProviderPermission[] {
  switch (providerType) {
    case 'bcba':
    case 'bcaba':
      return BCBA_PERMISSIONS;
    case 'rbt':
      return RBT_PERMISSIONS;
    case 'slp':
    case 'ot':
    case 'psychologist':
      return CLINICIAN_PERMISSIONS;
    default:
      return RBT_PERMISSIONS;
  }
}

// ============================================================================
// Mock Provider User (default: Sarah Mitchell, BCBA)
// ============================================================================

const defaultProvider = DEMO_PROVIDERS[0]; // Sarah Mitchell

export const MOCK_PROVIDER_USER: MockProviderUser = {
  id: 'mock-user-prov-001',
  email: defaultProvider.email,
  name: `${defaultProvider.firstName} ${defaultProvider.lastName}`,
  firstName: defaultProvider.firstName,
  lastName: defaultProvider.lastName,
  role: 'provider',
  providerType: defaultProvider.providerType,
  credentials: defaultProvider.credentials,
  providerId: defaultProvider.id,
  permissions: getPermissionsForType(defaultProvider.providerType),
  associatedFamilies: [
    {
      familyId: 'fam-demo-001',
      familyName: 'Chen',
      childName: 'Ethan Chen',
      childAge: 5,
      relationship: 'primary_bcba',
      consentStatus: 'granted',
      startDate: '2025-12-15',
    },
    {
      familyId: 'fam-demo-002',
      familyName: 'Anderson',
      childName: 'Mia Anderson',
      childAge: 7,
      relationship: 'primary_bcba',
      consentStatus: 'granted',
      startDate: '2025-09-01',
    },
    {
      familyId: 'fam-demo-005',
      familyName: 'Nakamura',
      childName: 'Hana Nakamura',
      childAge: 3,
      relationship: 'primary_bcba',
      consentStatus: 'granted',
      startDate: '2026-02-01',
    },
    {
      familyId: 'fam-demo-009',
      familyName: 'Thompson',
      childName: 'Liam Thompson',
      childAge: 4,
      relationship: 'primary_bcba',
      consentStatus: 'pending',
      startDate: '2026-03-08',
    },
  ],
  avatarUrl: null,
  verified: true,
  verificationLevel: 'gold',
  onboardingComplete: true,
  lastLoginAt: '2026-03-10T07:45:00-07:00',
  createdAt: '2025-06-01T00:00:00-07:00',
};

// ============================================================================
// Mock Session Factory
// ============================================================================

/**
 * Creates a mock Supabase-compatible session object for provider portal screens.
 *
 * @param provider - Optional DemoProvider to use. Defaults to Sarah Mitchell (BCBA).
 * @returns A mock session object matching Supabase auth session shape.
 *
 * Usage:
 * ```ts
 * const session = createMockProviderSession();
 * // Use session.user.user_metadata.provider_id to load demo data
 * ```
 */
export function createMockProviderSession(
  provider?: DemoProvider,
): MockProviderSession {
  const p = provider || defaultProvider;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000); // 1 hour from now

  return {
    access_token: `mock_access_${p.id}_${Date.now()}`,
    refresh_token: `mock_refresh_${p.id}_${Date.now()}`,
    expires_in: 3600,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    token_type: 'bearer',
    user: {
      id: `mock-user-${p.id}`,
      aud: 'authenticated',
      role: 'authenticated',
      email: p.email,
      email_confirmed_at: p.email ? '2025-01-01T00:00:00Z' : '',
      phone: p.phone,
      confirmed_at: '2025-01-01T00:00:00Z',
      last_sign_in_at: now.toISOString(),
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {
        full_name: `${p.firstName} ${p.lastName}`,
        provider_id: p.id,
        role: 'provider',
        provider_type: p.providerType,
        credentials: p.credentials,
        avatar_url: p.avatarUrl,
      },
      identities: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: now.toISOString(),
    },
  };
}

// ============================================================================
// Mock User Factory
// ============================================================================

/**
 * Creates a MockProviderUser for any demo provider.
 * Useful for switching between provider views in the portal.
 *
 * @param providerId - The demo provider ID (e.g., 'prov-demo-002')
 * @returns A MockProviderUser or null if provider not found.
 */
export function createMockProviderUser(
  providerId: string,
): MockProviderUser | null {
  const provider = DEMO_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return null;

  // Build associated families based on provider role in care teams
  const families: MockAssociatedFamily[] = [];

  // This is intentionally simplified — in a real app, care team data would come from the DB
  if (provider.providerType === 'bcba' || provider.providerType === 'bcaba') {
    families.push({
      familyId: 'fam-demo-gen-001',
      familyName: 'Demo Family A',
      childName: 'Demo Child A',
      childAge: 5,
      relationship: 'primary_bcba',
      consentStatus: 'granted',
      startDate: '2025-11-01',
    });
  } else if (provider.providerType === 'rbt') {
    families.push({
      familyId: 'fam-demo-gen-002',
      familyName: 'Demo Family B',
      childName: 'Demo Child B',
      childAge: 4,
      relationship: 'assigned_rbt',
      consentStatus: 'granted',
      startDate: '2025-12-01',
    });
  } else if (provider.providerType === 'slp') {
    families.push({
      familyId: 'fam-demo-gen-003',
      familyName: 'Demo Family C',
      childName: 'Demo Child C',
      childAge: 3,
      relationship: 'consulting_slp',
      consentStatus: 'granted',
      startDate: '2026-01-15',
    });
  } else if (provider.providerType === 'ot') {
    families.push({
      familyId: 'fam-demo-gen-004',
      familyName: 'Demo Family D',
      childName: 'Demo Child D',
      childAge: 6,
      relationship: 'consulting_ot',
      consentStatus: 'granted',
      startDate: '2026-02-01',
    });
  }

  return {
    id: `mock-user-${provider.id}`,
    email: provider.email,
    name: `${provider.firstName} ${provider.lastName}`,
    firstName: provider.firstName,
    lastName: provider.lastName,
    role: 'provider',
    providerType: provider.providerType,
    credentials: provider.credentials,
    providerId: provider.id,
    permissions: getPermissionsForType(provider.providerType),
    associatedFamilies: families,
    avatarUrl: provider.avatarUrl,
    verified: provider.verified,
    verificationLevel: provider.verificationLevel,
    onboardingComplete: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
  };
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if a mock provider user has a specific permission.
 */
export function mockProviderHasPermission(
  user: MockProviderUser,
  permission: ProviderPermission,
): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if provider can access a specific family's data.
 */
export function mockProviderCanAccessFamily(
  user: MockProviderUser,
  familyId: string,
): boolean {
  const family = user.associatedFamilies.find((f) => f.familyId === familyId);
  return family?.consentStatus === 'granted';
}

/**
 * Check if the mock session is still valid (not expired).
 */
export function isMockSessionValid(session: MockProviderSession): boolean {
  return session.expires_at > Math.floor(Date.now() / 1000);
}
