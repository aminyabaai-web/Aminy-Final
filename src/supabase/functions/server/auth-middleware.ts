// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Auth Middleware for Edge Functions
 *
 * Provides server-side authentication verification and feature gating.
 * CRITICAL: Never trust tier/permissions from client - always verify from database.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export type TierType = 'free' | 'starter' | 'core' | 'pro' | 'proplus';

export interface AuthUser {
  userId: string;
  email: string;
  tier: TierType;
  role: string;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthUser | null;
  error?: string;
  aal?: 'aal1' | 'aal2'; // Authenticator Assurance Level
  mfaVerified?: boolean;
}

/**
 * Feature definitions for each tier - server-side source of truth
 * This MUST match the client-side tier-utils.ts
 */
const TIER_FEATURES: Record<TierType, Set<string>> = {
  free: new Set([
    'limited-ai-chat',        // 3 messages/day
    'basic-daily-plan',       // Pre-set activities only
    'basic-calm-tools',       // 3 core calm tools
    'basic-tracking',         // Simple completion tracking
    'community-read-only',    // View community, can't post
    'marketplace-access',     // Free can book telehealth/marketplace visits (pay per use)
  ]),
  starter: new Set([
    // Legacy: Starter maps to Core - same features
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child',            // Up to 2 children
    'marketplace-access',
    'care-plan-export',
  ]),
  core: new Set([
    'unlimited-ai-chat',      // No limits
    'adaptive-daily-plan',    // AI-suggested activities
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',      // Detailed progress
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',           // Monthly analytics
    'vault-access',           // Document storage
    'ai-document-analysis',   // AI reads IEPs, medical records
    'multi-child',            // Up to 2 children
    'marketplace-access',     // Book sessions (pay per use)
    'care-plan-export',       // Export for providers
  ]),
  pro: new Set([
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child',
    'marketplace-access',
    'care-plan-export',
    'clinical-reports',       // IEP-ready reports
    'priority-support',       // Faster response
    'early-access',           // Beta features
    'discounted-sessions',    // 20% off marketplace
    'live-ai-video-30',       // 30 min/month Live AI Video
  ]),
  proplus: new Set([
    'unlimited-ai-chat',
    'adaptive-daily-plan',
    'custom-tasks',
    'full-calm-tools',
    'advanced-tracking',
    'favorites',
    'reminders',
    'community-participate',
    'full-reports',
    'vault-access',
    'ai-document-analysis',
    'multi-child-unlimited',  // Unlimited children
    'marketplace-access',
    'care-plan-export',
    'bcba-consult',           // Monthly BCBA session included
    'clinical-reports',       // IEP-ready reports
    'priority-support',       // Faster response
    'early-access',           // Beta features
    'discounted-sessions',    // 30% off marketplace
    'live-ai-video-unlimited',// Unlimited Live AI Video
    'human-credit-monthly',   // Monthly human consultation credit
    'expiring-share-links',   // Time-limited secure sharing
    'advanced-analytics',     // Detailed progress analytics
    'api-access',             // API access for integrations
    'dedicated-support',      // Dedicated support channel
  ]),
};

/**
 * Normalize tier name from database to TierType
 */
function normalizeTier(tier: string | null | undefined): TierType {
  if (!tier) return 'free';

  const normalized = tier.toLowerCase().trim().replace(/\s+/g, '').replace(/-/g, '');
  const mapping: Record<string, TierType> = {
    'free': 'free',
    'starter': 'starter',
    'basic': 'starter',
    'core': 'core',
    'pro': 'pro',
    'proplus': 'proplus',
    'pro+': 'proplus',
    'premium': 'proplus',
    'enterprise': 'proplus',
  };

  return mapping[normalized] || 'free';
}

/**
 * Verify JWT token and get user data with their actual tier from database
 * This is the ONLY way to get a trusted tier value
 */
export async function verifyAuth(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      user: null,
      error: 'Missing or invalid Authorization header',
    };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        authenticated: false,
        user: null,
        error: authError?.message || 'Invalid or expired token',
      };
    }

    // Fetch the user's profile to get their actual tier from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Profile may not exist yet for new users - default to free
      console.warn(`Profile not found for user ${user.id}, defaulting to free tier`);
    }

    const tier = normalizeTier(profile?.tier);
    const role = profile?.role || 'parent';

    // Check MFA/AAL level from session
    // The AAL is encoded in the JWT claims
    const jwt = token.split('.')[1];
    let aal: 'aal1' | 'aal2' = 'aal1';
    try {
      const payload = JSON.parse(atob(jwt));
      if (payload.aal === 'aal2') {
        aal = 'aal2';
      }
    } catch {
      // Default to aal1 if we can't parse
    }

    return {
      authenticated: true,
      user: {
        userId: user.id,
        email: user.email || '',
        tier,
        role,
      },
      aal,
      mfaVerified: aal === 'aal2',
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      authenticated: false,
      user: null,
      error: 'Authentication verification failed',
    };
  }
}

/**
 * Check if a tier has access to a specific feature
 */
export function hasTierFeature(tier: TierType, feature: string): boolean {
  const features = TIER_FEATURES[tier];
  if (!features) return false;
  return features.has(feature);
}

/**
 * Get all features for a tier
 */
export function getTierFeatures(tier: TierType): string[] {
  return Array.from(TIER_FEATURES[tier] || []);
}

/**
 * Compare tiers - returns true if tier1 >= tier2
 */
export function compareTiers(tier1: TierType, tier2: TierType): boolean {
  const tierLevels: Record<TierType, number> = {
    free: 0,
    starter: 1,
    core: 2,
    pro: 3,
    proplus: 4,
  };
  return tierLevels[tier1] >= tierLevels[tier2];
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: string): TierType | null {
  const tiers: TierType[] = ['free', 'starter', 'core', 'pro', 'proplus'];
  for (const tier of tiers) {
    if (hasTierFeature(tier, feature)) {
      return tier;
    }
  }
  return null;
}

/**
 * Verify auth and check feature access in one call
 * Returns the auth result with an additional featureAllowed flag
 */
export async function verifyAuthAndFeature(
  authHeader: string | null,
  requiredFeature: string
): Promise<AuthResult & { featureAllowed: boolean; minimumTier?: TierType }> {
  const authResult = await verifyAuth(authHeader);

  if (!authResult.authenticated || !authResult.user) {
    return {
      ...authResult,
      featureAllowed: false,
    };
  }

  const featureAllowed = hasTierFeature(authResult.user.tier, requiredFeature);
  const minimumTier = featureAllowed ? undefined : getMinimumTierForFeature(requiredFeature);

  return {
    ...authResult,
    featureAllowed,
    minimumTier,
  };
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message || 'Unauthorized',
      code: 'UNAUTHORIZED',
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a forbidden response (authenticated but lacking permissions)
 */
export function forbiddenResponse(
  message?: string,
  minimumTier?: TierType
): Response {
  return new Response(
    JSON.stringify({
      error: message || 'Access denied - upgrade required',
      code: 'FORBIDDEN',
      minimumTier,
      upgradeRequired: true,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a response requiring MFA verification
 */
export function mfaRequiredResponse(message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message || 'Multi-factor authentication required',
      code: 'MFA_REQUIRED',
      mfaRequired: true,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Verify auth with MFA requirement for sensitive provider operations
 * HIPAA compliance: Providers accessing PHI must have MFA enabled and verified
 */
export async function verifyAuthWithMFA(
  authHeader: string | null,
  requireMFA: boolean = true
): Promise<AuthResult & { mfaRequired?: boolean }> {
  const authResult = await verifyAuth(authHeader);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  // For providers and admins, MFA is required for sensitive operations
  const isProviderOrAdmin = ['provider', 'admin'].includes(authResult.user.role);

  if (requireMFA && isProviderOrAdmin && !authResult.mfaVerified) {
    return {
      ...authResult,
      mfaRequired: true,
      error: 'MFA verification required for this operation',
    };
  }

  return authResult;
}

/**
 * Check if a user role requires MFA
 */
export function rolRequiresMFA(role: string): boolean {
  return ['provider', 'admin'].includes(role);
}
