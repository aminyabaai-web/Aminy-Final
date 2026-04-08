// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Organization Hook
 * Manages current user's organization membership, members list, and admin state.
 * Returns null-safe defaults when the user is not part of any organization.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';

// ============================================
// Types
// ============================================

export type OrgPlanType = 'clinic' | 'school' | 'agency' | 'enterprise';
export type OrgStatus = 'active' | 'suspended' | 'cancelled' | 'pending_setup';
export type MemberRole = 'owner' | 'admin' | 'manager' | 'member';
export type MemberStatus = 'invited' | 'active' | 'deactivated' | 'removed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: OrgPlanType;
  seatCount: number;
  ownerId: string;
  ssoEnabled: boolean;
  ssoProvider: string | null;
  status: OrgStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  orgId: string;
  userId: string | null;
  role: MemberRole;
  email: string;
  invitedAt: string;
  joinedAt: string | null;
  status: MemberStatus;
}

export interface UseOrganizationReturn {
  /** The user's current organization, or null */
  org: Organization | null;
  /** List of members in the organization */
  members: OrganizationMember[];
  /** Whether the current user is an admin (owner or admin role) */
  isAdmin: boolean;
  /** Whether the current user is the org owner */
  isOwner: boolean;
  /** Current user's role in the org */
  myRole: MemberRole | null;
  /** Loading state */
  loading: boolean;
  /** Error message, if any */
  error: string | null;
  /** Re-fetch organization data */
  refresh: () => Promise<void>;
}

// ============================================
// Row-to-model mappers
// ============================================

function mapOrg(row: Record<string, unknown>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    planType: row.plan_type as OrgPlanType,
    seatCount: row.seat_count as number,
    ownerId: row.owner_id as string,
    ssoEnabled: (row.sso_enabled as boolean) ?? false,
    ssoProvider: (row.sso_provider as string) ?? null,
    status: row.status as OrgStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMember(row: Record<string, unknown>): OrganizationMember {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    userId: (row.user_id as string) ?? null,
    role: row.role as MemberRole,
    email: row.email as string,
    invitedAt: row.invited_at as string,
    joinedAt: (row.joined_at as string) ?? null,
    status: row.status as MemberStatus,
  };
}

// ============================================
// Hook
// ============================================

export function useOrganization(): UseOrganizationReturn {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Not authenticated — no org
        setOrg(null);
        setMembers([]);
        setMyRole(null);
        setLoading(false);
        return;
      }

      // 2. Find the user's active membership
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (memberError) {
        // Table may not exist yet in dev — degrade gracefully
        console.warn('[useOrganization] Could not query organization_members:', memberError.message);
        setOrg(null);
        setMembers([]);
        setMyRole(null);
        setLoading(false);
        return;
      }

      if (!membership) {
        // User is not in any org
        setOrg(null);
        setMembers([]);
        setMyRole(null);
        setLoading(false);
        return;
      }

      const orgId = membership.org_id as string;
      setMyRole(membership.role as MemberRole);

      // 3. Fetch the organization
      const { data: orgRow, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError || !orgRow) {
        setError('Organization not found');
        setOrg(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      setOrg(mapOrg(orgRow));

      // 4. Fetch members (admins see all, members see active only)
      const memberRole = membership.role as string;
      const isAdminRole = memberRole === 'owner' || memberRole === 'admin';

      let membersQuery = supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', orgId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (!isAdminRole) {
        // Non-admins only see active members
        membersQuery = membersQuery.eq('status', 'active');
      }

      const { data: memberRows, error: membersError } = await membersQuery;

      if (membersError) {
        console.warn('[useOrganization] Could not fetch members:', membersError.message);
        setMembers([]);
      } else {
        setMembers((memberRows ?? []).map(mapMember));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load organization';
      console.error('[useOrganization] Error:', message);
      setError(message);
      setOrg(null);
      setMembers([]);
      setMyRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    org,
    members,
    isAdmin: myRole === 'owner' || myRole === 'admin',
    isOwner: myRole === 'owner',
    myRole,
    loading,
    error,
    refresh: fetchOrganization,
  };
}
