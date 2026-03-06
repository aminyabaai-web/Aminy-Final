/**
 * SSO Service
 * Enterprise Single Sign-On integration for organizations
 *
 * Supports SAML, OIDC, Okta, Azure AD, and Google Workspace.
 * All functions are stubs pending IDP integration — they throw
 * descriptive errors so callers can detect the "not yet configured" state.
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// Types & Interfaces
// ============================================

export type SSOProvider = 'saml' | 'oidc' | 'okta' | 'azure-ad' | 'google-workspace';

export interface SSOConfig {
  /** Which IDP protocol / vendor to use */
  provider: SSOProvider;
  /** SAML Entity ID or OIDC Client ID */
  entityId: string;
  /** IDP metadata URL (SAML) or discovery endpoint (OIDC) */
  metadataUrl: string;
  /** OIDC client secret — never stored client-side, sent to edge function */
  clientSecret?: string;
  /** Allowed email domains for this org (e.g. ['acme.com']) */
  allowedDomains?: string[];
  /** Custom attribute mappings from IDP claims to Aminy profile fields */
  attributeMapping?: Record<string, string>;
  /** Whether to auto-provision users on first SSO login */
  autoProvision?: boolean;
  /** Default role assigned to auto-provisioned users */
  defaultRole?: 'member' | 'manager';
}

export interface SSOLoginResult {
  /** Redirect URL for the IDP login page */
  redirectUrl: string;
  /** Opaque state token to validate the callback */
  state: string;
}

export interface SSOCallbackResult {
  /** Supabase session after successful SSO */
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  /** User info extracted from IDP claims */
  user: {
    id: string;
    email: string;
    name: string;
    orgId: string;
    role: string;
  };
  /** Whether this was the user's first login (just provisioned) */
  isNewUser: boolean;
}

export interface SSOStatus {
  enabled: boolean;
  provider: SSOProvider | null;
  entityId: string | null;
  metadataUrl: string | null;
  orgName: string | null;
  orgSlug: string | null;
}

// ============================================
// SSO Service Functions
// ============================================

/**
 * Check whether an organization has SSO enabled.
 * This is the only function that actually queries — it reads the public
 * `organizations` table so unauthenticated login pages can detect SSO.
 */
export async function isSSOEnabled(orgSlug: string): Promise<SSOStatus> {
  if (!orgSlug) {
    return {
      enabled: false,
      provider: null,
      entityId: null,
      metadataUrl: null,
      orgName: null,
      orgSlug: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, sso_enabled, sso_provider, sso_entity_id, sso_metadata_url')
      .eq('slug', orgSlug)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return {
        enabled: false,
        provider: null,
        entityId: null,
        metadataUrl: null,
        orgName: null,
        orgSlug: orgSlug,
      };
    }

    return {
      enabled: data.sso_enabled ?? false,
      provider: (data.sso_provider as SSOProvider) ?? null,
      entityId: data.sso_entity_id ?? null,
      metadataUrl: data.sso_metadata_url ?? null,
      orgName: data.name,
      orgSlug: data.slug,
    };
  } catch {
    console.warn('[SSO] Failed to check SSO status for org:', orgSlug);
    return {
      enabled: false,
      provider: null,
      entityId: null,
      metadataUrl: null,
      orgName: null,
      orgSlug: orgSlug,
    };
  }
}

/**
 * Initiate SSO login flow for a given organization.
 * Redirects the user to the configured IDP.
 *
 * @throws Error — SSO not yet configured (stub)
 */
export async function initiateSSOLogin(orgSlug: string): Promise<SSOLoginResult> {
  // 1. Verify org has SSO enabled
  const status = await isSSOEnabled(orgSlug);

  if (!status.enabled || !status.provider) {
    throw new Error(
      `SSO is not enabled for organization "${orgSlug}". ` +
      'Contact your administrator to configure SSO.'
    );
  }

  // 2. Stub — in production this calls the edge function which:
  //    - Generates a SAML AuthnRequest / OIDC authorization URL
  //    - Stores a state token in the session
  //    - Returns the IDP redirect URL
  throw new Error(
    'SSO not yet configured: initiateSSOLogin is a stub. ' +
    `Provider "${status.provider}" integration is pending. ` +
    'The edge function endpoint /auth/sso/login needs to be implemented.'
  );
}

/**
 * Handle the callback from the IDP after the user authenticates.
 * Validates the response, creates/links the Supabase user, and returns a session.
 *
 * @param code  — Authorization code (OIDC) or SAMLResponse
 * @param state — Opaque state token from initiateSSOLogin
 * @throws Error — SSO not yet configured (stub)
 */
export async function handleSSOCallback(
  code: string,
  state: string
): Promise<SSOCallbackResult> {
  if (!code || !state) {
    throw new Error('SSO callback requires both code and state parameters.');
  }

  // Stub — in production this calls the edge function which:
  //   - Validates the state token
  //   - Exchanges code for tokens (OIDC) or validates SAMLResponse
  //   - Extracts user claims (email, name, groups)
  //   - Creates or links the Supabase auth user
  //   - Creates/updates the organization_members record
  //   - Returns a Supabase session
  throw new Error(
    'SSO not yet configured: handleSSOCallback is a stub. ' +
    'The edge function endpoint /auth/sso/callback needs to be implemented.'
  );
}

/**
 * Configure SSO for an organization. Admin-only.
 * Stores the IDP configuration and validates connectivity.
 *
 * @param orgId  — Organization UUID
 * @param config — SSO provider configuration
 * @throws Error — SSO not yet configured (stub)
 */
export async function configureSSOForOrg(
  orgId: string,
  config: SSOConfig
): Promise<{ success: boolean; message: string }> {
  if (!orgId) {
    throw new Error('Organization ID is required to configure SSO.');
  }

  if (!config.provider || !config.entityId || !config.metadataUrl) {
    throw new Error(
      'SSO configuration requires provider, entityId, and metadataUrl.'
    );
  }

  // Validate provider is supported
  const supportedProviders: SSOProvider[] = [
    'saml', 'oidc', 'okta', 'azure-ad', 'google-workspace',
  ];
  if (!supportedProviders.includes(config.provider)) {
    throw new Error(`Unsupported SSO provider: ${config.provider}`);
  }

  // Stub — in production this:
  //   - Validates the metadata URL is reachable
  //   - Parses the IDP metadata / discovery document
  //   - Stores the configuration in the organizations table
  //   - Registers the SP (Service Provider) with the IDP if needed
  //   - Runs a test authentication flow
  throw new Error(
    'SSO not yet configured: configureSSOForOrg is a stub. ' +
    `Provider "${config.provider}" setup for org "${orgId}" is pending. ` +
    'The admin edge function endpoint /auth/sso/configure needs to be implemented.'
  );
}

/**
 * Disconnect / disable SSO for an organization. Admin-only.
 * Members will need to use email/password login after this.
 *
 * @param orgId — Organization UUID
 * @throws Error — SSO not yet configured (stub)
 */
export async function disableSSOForOrg(
  orgId: string
): Promise<{ success: boolean; message: string }> {
  if (!orgId) {
    throw new Error('Organization ID is required to disable SSO.');
  }

  // Stub — in production this:
  //   - Clears SSO fields on the organizations row
  //   - Triggers password-reset emails for SSO-only users
  //   - Logs the change in audit_log
  throw new Error(
    'SSO not yet configured: disableSSOForOrg is a stub. ' +
    `SSO teardown for org "${orgId}" is pending. ` +
    'The admin edge function endpoint /auth/sso/disable needs to be implemented.'
  );
}
