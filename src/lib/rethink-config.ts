// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Rethink Behavioral Health EHR — Configuration
 *
 * Centralizes all Rethink API config. Import this in rethink-integration.ts
 * and anywhere else that needs to check connectivity status.
 */

// ============================================================================
// Config Object
// ============================================================================

export const RETHINK_CONFIG = {
  baseUrl: import.meta.env.VITE_RETHINK_BASE_URL || 'https://api.rethinkbh.com/v1',
  clientId: import.meta.env.VITE_RETHINK_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_RETHINK_CLIENT_SECRET || '',
  redirectUri: import.meta.env.VITE_RETHINK_REDIRECT_URI || '',
  scopes: [
    'clients:read',
    'sessions:read',
    'goals:read',
    'behaviors:read',
    'authorizations:read',
    'staff:read',
  ],
  /** 15-minute periodic sync interval (ms) */
  syncInterval: 15 * 60 * 1000,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns true when the Rethink client ID env var is populated.
 * Use this to gate integration UI before attempting API calls.
 */
export function isRethinkConfigured(): boolean {
  return RETHINK_CONFIG.clientId.length > 0;
}

/**
 * Builds the full OAuth 2.0 authorization URL for initiating the provider
 * connection flow (redirect user → Rethink consent screen).
 */
export function getRethinkOAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: RETHINK_CONFIG.clientId,
    redirect_uri: RETHINK_CONFIG.redirectUri,
    scope: RETHINK_CONFIG.scopes.join(' '),
    state: crypto.randomUUID(),
  });

  return `${RETHINK_CONFIG.baseUrl}/oauth/authorize?${params.toString()}`;
}
