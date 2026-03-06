/**
 * Provider Service
 *
 * Production-ready provider management for Aminy marketplace
 * Handles provider profiles, availability, and patient relationships
 *
 * Uses Supabase directly with API fallback
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Provider types
export type ProviderType = 'bcba' | 'slp' | 'ot' | 'pt' | 'psychologist' | 'developmental_pediatrician' | 'other';

export interface ProviderProfile {
  id: string;
  userId: string;
  name: string;
  credentials: string;
  type: ProviderType;
  email: string;
  phone?: string;
  photo?: string;
  bio?: string;
  specialties: string[];
  languages: string[];
  insurance: string[];
  location: {
    city: string;
    state: string;
    zipCode: string;
    telehealth: boolean;
    inPerson: boolean;
  };
  availability: ProviderAvailability;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  acceptingNewPatients: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;
}

export interface ProviderPatient {
  id: string;
  providerId: string;
  childId: string;
  childName: string;
  parentName: string;
  parentEmail: string;
  profileAccess: 'granted' | 'pending' | 'revoked';
  nextSession?: string;
  totalSessions: number;
  createdAt: string;
}

export interface ProviderSession {
  id: string;
  providerId: string;
  patientId: string;
  patientName: string;
  parentName: string;
  scheduledAt: string;
  duration: number;
  type: 'telehealth' | 'in-person';
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  roomUrl?: string;
  fee: number;
  paid: boolean;
}

export interface ProviderStats {
  totalPatients: number;
  activePatients: number;
  sessionsThisMonth: number;
  sessionsTotal: number;
  earningsThisMonth: number;
  earningsTotal: number;
  rating: number;
  reviewCount: number;
  nextAvailableSlot?: string;
}

// Get access token from localStorage
const getAccessToken = (): string => {
  return typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || publicAnonKey
    : publicAnonKey;
};

// Helper to convert DB row to ProviderProfile
function dbRowToProvider(row: Record<string, unknown>): ProviderProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    credentials: row.title as string,
    type: row.provider_type as ProviderProfile['type'],
    email: row.email as string,
    phone: row.phone as string | undefined,
    photo: row.avatar_url as string | undefined,
    bio: row.bio as string | undefined,
    specialties: (row.specialties || []) as string[],
    languages: (row.languages || ['English']) as string[],
    insurance: (row.insurance_accepted || []) as string[],
    location: {
      city: (row.location_city as string) || '',
      state: (row.location_state as string) || '',
      zipCode: (row.location_zip_code as string) || '',
      telehealth: row.offers_telehealth as boolean,
      inPerson: row.offers_in_person as boolean,
    },
    availability: (row.availability || {}) as ProviderProfile['availability'],
    hourlyRate: row.hourly_rate ? (row.hourly_rate as number) / 100 : 0,
    rating: parseFloat(row.rating as string) || 5.0,
    reviewCount: (row.review_count as number) || 0,
    verified: (row.verified as boolean) || false,
    acceptingNewPatients: row.accepts_new_patients as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Get provider profile by ID
 */
export async function getProvider(providerId: string): Promise<ProviderProfile | null> {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return dbRowToProvider(data);
  } catch (err) {
    console.warn('[ProviderService] Supabase error, trying API fallback:', err);

    // Fallback to API
    const accessToken = getAccessToken();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to get provider');
    }

    return response.json();
  }
}

/**
 * Search providers by criteria
 */
export async function searchProviders(criteria: {
  type?: ProviderType;
  specialties?: string[];
  zipCode?: string;
  telehealth?: boolean;
  insurance?: string;
  maxRate?: number;
  language?: string;
  acceptingNew?: boolean;
}): Promise<ProviderProfile[]> {
  const accessToken = getAccessToken();

  const params = new URLSearchParams();
  if (criteria.type) params.set('type', criteria.type);
  if (criteria.specialties?.length) params.set('specialties', criteria.specialties.join(','));
  if (criteria.zipCode) params.set('zipCode', criteria.zipCode);
  if (criteria.telehealth !== undefined) params.set('telehealth', criteria.telehealth.toString());
  if (criteria.insurance) params.set('insurance', criteria.insurance);
  if (criteria.maxRate) params.set('maxRate', criteria.maxRate.toString());
  if (criteria.language) params.set('language', criteria.language);
  if (criteria.acceptingNew !== undefined) params.set('acceptingNew', criteria.acceptingNew.toString());

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/search?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to search providers');
  }

  return response.json();
}

/**
 * Create or update provider profile
 */
export async function saveProviderProfile(profile: Partial<ProviderProfile>): Promise<ProviderProfile> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers`,
    {
      method: profile.id ? 'PUT' : 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to save provider profile: ${error}`);
  }

  return response.json();
}

/**
 * Update provider availability
 */
export async function updateAvailability(
  providerId: string,
  availability: ProviderAvailability
): Promise<void> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/availability`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ availability }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update availability');
  }
}

/**
 * Get provider's patients
 */
export async function getProviderPatients(providerId: string): Promise<ProviderPatient[]> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/patients`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get patients');
  }

  return response.json();
}

/**
 * Get provider's sessions
 */
export async function getProviderSessions(
  providerId: string,
  filter?: {
    status?: ProviderSession['status'];
    startDate?: string;
    endDate?: string;
  }
): Promise<ProviderSession[]> {
  const accessToken = getAccessToken();

  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.startDate) params.set('startDate', filter.startDate);
  if (filter?.endDate) params.set('endDate', filter.endDate);

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/sessions?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get sessions');
  }

  return response.json();
}

/**
 * Get provider stats
 */
export async function getProviderStats(providerId: string): Promise<ProviderStats> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/stats`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get provider stats');
  }

  return response.json();
}

/**
 * Schedule a session with a provider
 */
export async function scheduleSession(
  providerId: string,
  data: {
    patientId: string;
    scheduledAt: string;
    duration: number;
    type: 'telehealth' | 'in-person';
    notes?: string;
  }
): Promise<ProviderSession> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/sessions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to schedule session: ${error}`);
  }

  return response.json();
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: ProviderSession['status'],
  notes?: string
): Promise<ProviderSession> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/sessions/${sessionId}/status`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, notes }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update session status');
  }

  return response.json();
}

/**
 * Request profile access from parent
 */
export async function requestProfileAccess(
  providerId: string,
  childId: string,
  message?: string
): Promise<{ success: boolean; requestId: string }> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/request-access`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ childId, message }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to request profile access');
  }

  return response.json();
}

/**
 * Grant/revoke profile access (for parents)
 */
export async function updateProfileAccess(
  providerId: string,
  childId: string,
  access: 'granted' | 'revoked'
): Promise<void> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/children/${childId}/provider-access`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ providerId, access }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update profile access');
  }
}

/**
 * Submit session notes
 */
export async function submitSessionNotes(
  sessionId: string,
  notes: {
    observations: string;
    goalsWorkedOn: string[];
    progress: Record<string, 'improved' | 'maintained' | 'needs_attention'>;
    recommendations: string[];
    parentFollowUp?: string;
  }
): Promise<void> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/sessions/${sessionId}/notes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notes),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to submit session notes');
  }
}

/**
 * Get available time slots for a provider on a specific date
 */
export async function getAvailableSlots(
  providerId: string,
  date: string,
  duration: number = 50
): Promise<string[]> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/slots?date=${date}&duration=${duration}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get available slots');
  }

  const data = await response.json();
  return data.slots || [];
}

/**
 * Verify provider credentials
 */
export async function verifyProvider(
  providerId: string,
  documents: {
    licenseNumber: string;
    licenseState: string;
    npiNumber?: string;
  }
): Promise<{ verified: boolean; message?: string }> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/providers/${providerId}/verify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documents),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to verify provider');
  }

  return response.json();
}

export default {
  getProvider,
  searchProviders,
  saveProviderProfile,
  updateAvailability,
  getProviderPatients,
  getProviderSessions,
  getProviderStats,
  scheduleSession,
  updateSessionStatus,
  requestProfileAccess,
  updateProfileAccess,
  submitSessionNotes,
  getAvailableSlots,
  verifyProvider,
};
