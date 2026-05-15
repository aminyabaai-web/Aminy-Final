// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Care Team Service
 *
 * Manages multi-provider care teams for children.
 * Each child can have multiple providers (BCBA, RBT, SLP, OT, etc.)
 * with role assignments, session tracking, and appointment management.
 *
 * Supabase-backed with the care_teams table.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type CareTeamRole = 'BCBA' | 'RBT' | 'SLP' | 'OT' | 'PT' | 'Psychologist' | 'Developmental Pediatrician' | 'LCSW' | 'Other';
export type MemberStatus = 'active' | 'inactive' | 'pending';

export interface CareTeamMember {
  id: string;
  childId: string;
  providerId: string;
  role: CareTeamRole;
  specialty: string | null;
  isPrimary: boolean;
  status: MemberStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  lastSessionDate: string | null;
  nextAppointment: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined provider data
  provider?: {
    id: string;
    name: string;
    credentials: string;
    email: string;
    phone: string | null;
    photo: string | null;
    rating: number;
  };
}

export interface CareTeam {
  childId: string;
  childName: string;
  members: CareTeamMember[];
  totalMembers: number;
  activeSince: string;
}

export interface AddTeamMemberParams {
  childId: string;
  providerId: string;
  role: CareTeamRole;
  specialty?: string;
  isPrimary?: boolean;
  notes?: string;
  startDate?: string;
}

export interface ProviderSearchForTeam {
  id: string;
  name: string;
  credentials: string;
  type: string;
  specialty: string;
  acceptingNewPatients: boolean;
  rating: number;
}


// ============================================================================
// Care Team CRUD
// ============================================================================

/**
 * Get the full care team for a child
 */
export async function getCareTeam(childId: string): Promise<{ data: CareTeam | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('care_teams')
      .select(`
        *,
        provider:profiles!provider_id(id, full_name, credentials, email, phone, avatar_url, rating)
      `)
      .eq('child_id', childId)
      .order('is_primary', { ascending: false })
      .order('start_date');

    if (error) throw error;

    if (data && data.length > 0) {
      const members = data.map(mapMemberFromDb);
      return {
        data: {
          childId,
          childName: '',
          members,
          totalMembers: members.length,
          activeSince: members[0]?.startDate || '',
        },
        error: null,
      };
    }

    return { data: { childId, childName: '', members: [], totalMembers: 0, activeSince: '' }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load care team' };
  }
}

/**
 * Add a provider to a child's care team
 */
export async function addTeamMember(params: AddTeamMemberParams): Promise<{ data: CareTeamMember | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('care_teams')
      .insert({
        child_id: params.childId,
        provider_id: params.providerId,
        role: params.role,
        specialty: params.specialty || null,
        is_primary: params.isPrimary || false,
        status: 'pending',
        start_date: params.startDate || new Date().toISOString().split('T')[0],
        notes: params.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: mapMemberFromDb(data), error: null };
  } catch (err) {
    // Dev fallback
    if (err instanceof Error && err.message.includes('duplicate key')) {
      return { data: null, error: 'This provider is already on the care team' };
    }
    return { data: null, error: err instanceof Error ? err.message : 'Failed to add team member' };
  }
}

/**
 * Remove a provider from a child's care team (soft-delete: set inactive)
 */
export async function removeTeamMember(membershipId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('care_teams')
      .update({ status: 'inactive', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', membershipId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to remove team member' };
  }
}

/**
 * Update a care team member (e.g., change role, set primary)
 */
export async function updateTeamMember(
  membershipId: string,
  updates: Partial<Pick<CareTeamMember, 'role' | 'isPrimary' | 'notes' | 'nextAppointment'>>
): Promise<{ error: string | null }> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.nextAppointment !== undefined) dbUpdates.next_appointment = updates.nextAppointment;

    const { error } = await supabase
      .from('care_teams')
      .update(dbUpdates)
      .eq('id', membershipId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update team member' };
  }
}

/**
 * Search providers to add to a care team
 */
export async function searchProvidersForTeam(
  query: string,
  role?: CareTeamRole
): Promise<{ data: ProviderSearchForTeam[]; error: string | null }> {
  try {
    let dbQuery = supabase
      .from('provider_profiles')
      .select('id, name, full_name, credentials, type, specialties, accepting_new_patients, rating')
      .eq('accepting_new_patients', true);

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,name.ilike.%${query}%,credentials.ilike.%${query}%`);
    }

    if (role) {
      const roleTypeMap: Record<string, string> = {
        'BCBA': 'bcba', 'RBT': 'rbt', 'SLP': 'slp', 'OT': 'ot',
        'PT': 'pt', 'Psychologist': 'psychologist', 'LCSW': 'lcsw',
      };
      const type = roleTypeMap[role];
      if (type) {
        dbQuery = dbQuery.eq('type', type);
      }
    }

    const { data, error } = await dbQuery.limit(10);

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        data: data.map((row) => ({
          id: row.id,
          name: row.full_name || row.name || '',
          credentials: row.credentials || '',
          type: row.type || '',
          specialty: (row.specialties as string[])?.[0] || '',
          acceptingNewPatients: row.accepting_new_patients ?? true,
          rating: row.rating || 0,
        })),
        error: null,
      };
    }

    return { data: [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to search providers' };
  }
}

/**
 * Get all children the current user has (for selecting which child to view care team for)
 */
export async function getChildren(): Promise<{ data: { id: string; name: string; age: number }[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('id, name, date_of_birth')
      .order('name');

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        data: data.map((c) => ({
          id: c.id,
          name: c.name,
          age: Math.floor((Date.now() - new Date(c.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        })),
        error: null,
      };
    }

    return { data: [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load children' };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function mapMemberFromDb(row: Record<string, unknown>): CareTeamMember {
  const providerData = row.provider as Record<string, unknown> | null;

  return {
    id: row.id as string,
    childId: row.child_id as string,
    providerId: row.provider_id as string,
    role: row.role as CareTeamRole,
    specialty: row.specialty as string | null,
    isPrimary: row.is_primary as boolean,
    status: (row.status as MemberStatus) || 'active',
    startDate: row.start_date as string,
    endDate: row.end_date as string | null,
    notes: row.notes as string | null,
    lastSessionDate: row.last_session_date as string | null,
    nextAppointment: row.next_appointment as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    provider: providerData
      ? {
          id: providerData.id as string,
          name: providerData.full_name as string,
          credentials: providerData.credentials as string,
          email: providerData.email as string,
          phone: providerData.phone as string | null,
          photo: providerData.avatar_url as string | null,
          rating: providerData.rating as number,
        }
      : undefined,
  };
}

