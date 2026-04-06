// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Referral Network Service
 *
 * Enables providers to search, refer, and manage referrals within
 * Aminy's provider network. Supports cross-specialty referrals for
 * neurodivergent care coordination (BCBA -> SLP, OT, etc.).
 *
 * Supabase-backed with the provider_referrals table.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type ReferralUrgency = 'routine' | 'soon' | 'urgent';

export interface ProviderSearchResult {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  type: string;
  location: {
    city: string;
    state: string;
    zipCode: string;
    telehealth: boolean;
    inPerson: boolean;
  };
  insurance: string[];
  acceptingNewPatients: boolean;
  rating: number;
  reviewCount: number;
  nextAvailable?: string;
}

export interface Referral {
  id: string;
  fromProviderId: string;
  toProviderId: string;
  childId: string | null;
  reason: string;
  specialty: string | null;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  notes: string | null;
  attachments: string[];
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  fromProvider?: { name: string; credentials: string; type: string };
  toProvider?: { name: string; credentials: string; type: string };
  child?: { name: string; age: number };
}

export interface SendReferralParams {
  fromProviderId: string;
  toProviderId: string;
  childId?: string;
  reason: string;
  specialty?: string;
  urgency?: ReferralUrgency;
  notes?: string;
  attachments?: string[];
}

export interface ReferralHistoryFilters {
  status?: ReferralStatus;
  direction?: 'sent' | 'received' | 'all';
  dateRange?: { start: string; end: string };
  limit?: number;
  offset?: number;
}

// ============================================================================
// Demo Data (for development without Supabase connection)
// ============================================================================

const DEMO_PROVIDERS: ProviderSearchResult[] = [
  {
    id: 'prov-001',
    name: 'Dr. Sarah Chen',
    credentials: 'BCBA, LBA',
    specialty: 'Applied Behavior Analysis',
    type: 'bcba',
    location: { city: 'Phoenix', state: 'AZ', zipCode: '85018', telehealth: true, inPerson: true },
    insurance: ['AHCCCS', 'United Healthcare', 'Blue Cross'],
    acceptingNewPatients: true,
    rating: 4.9,
    reviewCount: 127,
    nextAvailable: '2026-03-12',
  },
  {
    id: 'prov-002',
    name: 'Maria Rodriguez, CCC-SLP',
    credentials: 'CCC-SLP',
    specialty: 'Pediatric Speech-Language Pathology',
    type: 'slp',
    location: { city: 'Scottsdale', state: 'AZ', zipCode: '85251', telehealth: true, inPerson: true },
    insurance: ['AHCCCS', 'Cigna', 'Aetna'],
    acceptingNewPatients: true,
    rating: 4.8,
    reviewCount: 89,
    nextAvailable: '2026-03-11',
  },
  {
    id: 'prov-003',
    name: 'James Park, OTR/L',
    credentials: 'OTR/L',
    specialty: 'Pediatric Occupational Therapy',
    type: 'ot',
    location: { city: 'Tempe', state: 'AZ', zipCode: '85281', telehealth: false, inPerson: true },
    insurance: ['United Healthcare', 'Aetna', 'Tricare'],
    acceptingNewPatients: false,
    rating: 4.7,
    reviewCount: 64,
    nextAvailable: '2026-03-18',
  },
  {
    id: 'prov-004',
    name: 'Dr. Amanda Foster',
    credentials: 'PhD, Licensed Psychologist',
    specialty: 'Developmental Psychology',
    type: 'psychologist',
    location: { city: 'Mesa', state: 'AZ', zipCode: '85201', telehealth: true, inPerson: true },
    insurance: ['AHCCCS', 'Blue Cross', 'Cigna', 'United Healthcare'],
    acceptingNewPatients: true,
    rating: 4.9,
    reviewCount: 203,
    nextAvailable: '2026-03-10',
  },
  {
    id: 'prov-005',
    name: 'Rachel Kim, RBT',
    credentials: 'RBT',
    specialty: 'Registered Behavior Technician',
    type: 'rbt',
    location: { city: 'Phoenix', state: 'AZ', zipCode: '85016', telehealth: false, inPerson: true },
    insurance: ['AHCCCS', 'United Healthcare'],
    acceptingNewPatients: true,
    rating: 4.6,
    reviewCount: 42,
    nextAvailable: '2026-03-10',
  },
];

const DEMO_REFERRALS: Referral[] = [
  {
    id: 'ref-001',
    fromProviderId: 'prov-001',
    toProviderId: 'prov-002',
    childId: 'child-001',
    reason: 'Speech delay — recommend SLP evaluation for articulation and expressive language',
    specialty: 'slp',
    urgency: 'soon',
    status: 'accepted',
    notes: 'Parent reports difficulty with multi-word utterances. VB-MAPP shows delay in mand repertoire.',
    attachments: [],
    acceptedAt: '2026-03-05T10:00:00Z',
    completedAt: null,
    createdAt: '2026-03-03T14:30:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
    fromProvider: { name: 'Dr. Sarah Chen', credentials: 'BCBA, LBA', type: 'bcba' },
    toProvider: { name: 'Maria Rodriguez, CCC-SLP', credentials: 'CCC-SLP', type: 'slp' },
    child: { name: 'Alex M.', age: 4 },
  },
  {
    id: 'ref-002',
    fromProviderId: 'prov-001',
    toProviderId: 'prov-003',
    childId: 'child-002',
    reason: 'Fine motor concerns — difficulty with writing and self-care tasks',
    specialty: 'ot',
    urgency: 'routine',
    status: 'pending',
    notes: null,
    attachments: [],
    acceptedAt: null,
    completedAt: null,
    createdAt: '2026-03-08T09:15:00Z',
    updatedAt: '2026-03-08T09:15:00Z',
    fromProvider: { name: 'Dr. Sarah Chen', credentials: 'BCBA, LBA', type: 'bcba' },
    toProvider: { name: 'James Park, OTR/L', credentials: 'OTR/L', type: 'ot' },
    child: { name: 'Jordan K.', age: 6 },
  },
  {
    id: 'ref-003',
    fromProviderId: 'prov-004',
    toProviderId: 'prov-001',
    childId: 'child-003',
    reason: 'ASD diagnosis confirmed — requesting BCBA for ABA therapy initiation',
    specialty: 'bcba',
    urgency: 'urgent',
    status: 'completed',
    notes: 'ADOS-2 completed, Module 1, comparison score 8. Family ready to begin services.',
    attachments: [],
    acceptedAt: '2026-02-20T11:00:00Z',
    completedAt: '2026-03-01T16:00:00Z',
    createdAt: '2026-02-18T13:45:00Z',
    updatedAt: '2026-03-01T16:00:00Z',
    fromProvider: { name: 'Dr. Amanda Foster', credentials: 'PhD, Licensed Psychologist', type: 'psychologist' },
    toProvider: { name: 'Dr. Sarah Chen', credentials: 'BCBA, LBA', type: 'bcba' },
    child: { name: 'Sam T.', age: 3 },
  },
];

// ============================================================================
// Provider Search
// ============================================================================

/**
 * Search the provider network by specialty, location, and insurance
 */
export async function searchProviders(
  specialty?: string,
  location?: string,
  insurance?: string
): Promise<{ data: ProviderSearchResult[]; error: string | null }> {
  try {
    // Try Supabase first
    let query = supabase
      .from('provider_profiles')
      .select('*')
      .eq('accepting_new_patients', true);

    if (specialty) {
      query = query.or(`type.eq.${specialty},specialties.cs.{${specialty}}`);
    }

    if (location) {
      query = query.or(
        `location->>city.ilike.%${location}%,location->>state.ilike.%${location}%,location->>zipCode.eq.${location}`
      );
    }

    if (insurance) {
      query = query.contains('insurance', [insurance]);
    }

    const { data, error } = await query.order('rating', { ascending: false }).limit(20);

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        data: data.map(mapProviderFromDb),
        error: null,
      };
    }

    // Fall back to demo data if no Supabase results
    return { data: filterDemoProviders(specialty, location, insurance), error: null };
  } catch {
    // Fallback to demo data
    return { data: filterDemoProviders(specialty, location, insurance), error: null };
  }
}

function filterDemoProviders(
  specialty?: string,
  location?: string,
  insurance?: string
): ProviderSearchResult[] {
  return DEMO_PROVIDERS.filter((p) => {
    if (specialty && !p.type.includes(specialty.toLowerCase()) && !p.specialty.toLowerCase().includes(specialty.toLowerCase())) {
      return false;
    }
    if (location) {
      const loc = location.toLowerCase();
      if (!p.location.city.toLowerCase().includes(loc) && !p.location.state.toLowerCase().includes(loc) && !p.location.zipCode.includes(loc)) {
        return false;
      }
    }
    if (insurance && !p.insurance.some((i) => i.toLowerCase().includes(insurance.toLowerCase()))) {
      return false;
    }
    return true;
  });
}

function mapProviderFromDb(row: Record<string, unknown>): ProviderSearchResult {
  return {
    id: row.id as string,
    name: row.name as string || `${row.first_name} ${row.last_name}`,
    credentials: row.credentials as string || '',
    specialty: (row.specialties as string[])?.[0] || row.type as string || '',
    type: row.type as string || '',
    location: (row.location as ProviderSearchResult['location']) || {
      city: '', state: '', zipCode: '', telehealth: false, inPerson: false,
    },
    insurance: (row.insurance as string[]) || [],
    acceptingNewPatients: row.accepting_new_patients as boolean ?? true,
    rating: row.rating as number || 0,
    reviewCount: row.review_count as number || 0,
    nextAvailable: row.next_available as string || undefined,
  };
}

// ============================================================================
// Send Referral
// ============================================================================

/**
 * Create and send a referral from one provider to another
 */
export async function sendReferral(params: SendReferralParams): Promise<{ data: Referral | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('provider_referrals')
      .insert({
        from_provider_id: params.fromProviderId,
        to_provider_id: params.toProviderId,
        child_id: params.childId || null,
        reason: params.reason,
        specialty: params.specialty || null,
        urgency: params.urgency || 'routine',
        notes: params.notes || null,
        attachments: params.attachments || [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return { data: mapReferralFromDb(data), error: null };
  } catch (err) {
    // In dev, return a mock referral
    const mockReferral: Referral = {
      id: `ref-${Date.now()}`,
      fromProviderId: params.fromProviderId,
      toProviderId: params.toProviderId,
      childId: params.childId || null,
      reason: params.reason,
      specialty: params.specialty || null,
      urgency: params.urgency || 'routine',
      status: 'pending',
      notes: params.notes || null,
      attachments: params.attachments || [],
      acceptedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { data: mockReferral, error: null };
  }
}

// ============================================================================
// Referral History
// ============================================================================

/**
 * Get referral history for the current provider
 */
export async function getReferralHistory(
  providerId: string,
  filters: ReferralHistoryFilters = {}
): Promise<{ data: Referral[]; error: string | null; total: number }> {
  const { status, direction = 'all', dateRange, limit = 20, offset = 0 } = filters;

  try {
    let query = supabase
      .from('provider_referrals')
      .select('*, from_provider:profiles!from_provider_id(id, full_name, credentials, type), to_provider:profiles!to_provider_id(id, full_name, credentials, type), child:children(id, name, date_of_birth)', { count: 'exact' });

    // Direction filter
    if (direction === 'sent') {
      query = query.eq('from_provider_id', providerId);
    } else if (direction === 'received') {
      query = query.eq('to_provider_id', providerId);
    } else {
      query = query.or(`from_provider_id.eq.${providerId},to_provider_id.eq.${providerId}`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateRange) {
      query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: (data || []).map(mapReferralFromDb),
      error: null,
      total: count || 0,
    };
  } catch {
    // Fallback to demo data
    let filtered = [...DEMO_REFERRALS];

    if (direction === 'sent') {
      filtered = filtered.filter((r) => r.fromProviderId === providerId);
    } else if (direction === 'received') {
      filtered = filtered.filter((r) => r.toProviderId === providerId);
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return {
      data: filtered.slice(offset, offset + limit),
      error: null,
      total: filtered.length,
    };
  }
}

// ============================================================================
// Referral Actions
// ============================================================================

/**
 * Accept a referral
 */
export async function acceptReferral(referralId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('provider_referrals')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', referralId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to accept referral' };
  }
}

/**
 * Decline a referral
 */
export async function declineReferral(referralId: string, reason?: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('provider_referrals')
      .update({ status: 'declined', notes: reason || null })
      .eq('id', referralId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to decline referral' };
  }
}

/**
 * Mark a referral as completed
 */
export async function completeReferral(referralId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('provider_referrals')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', referralId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to complete referral' };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function mapReferralFromDb(row: Record<string, unknown>): Referral {
  const fromProvider = row.from_provider as Record<string, unknown> | null;
  const toProvider = row.to_provider as Record<string, unknown> | null;
  const child = row.child as Record<string, unknown> | null;

  return {
    id: row.id as string,
    fromProviderId: row.from_provider_id as string,
    toProviderId: row.to_provider_id as string,
    childId: row.child_id as string | null,
    reason: row.reason as string,
    specialty: row.specialty as string | null,
    urgency: (row.urgency as ReferralUrgency) || 'routine',
    status: (row.status as ReferralStatus) || 'pending',
    notes: row.notes as string | null,
    attachments: (row.attachments as string[]) || [],
    acceptedAt: row.accepted_at as string | null,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    fromProvider: fromProvider
      ? { name: fromProvider.full_name as string, credentials: fromProvider.credentials as string, type: fromProvider.type as string }
      : undefined,
    toProvider: toProvider
      ? { name: toProvider.full_name as string, credentials: toProvider.credentials as string, type: toProvider.type as string }
      : undefined,
    child: child
      ? {
          name: child.name as string,
          age: child.date_of_birth
            ? Math.floor((Date.now() - new Date(child.date_of_birth as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : 0,
        }
      : undefined,
  };
}
