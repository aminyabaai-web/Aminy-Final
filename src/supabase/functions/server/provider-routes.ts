// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Routes
 *
 * Backend handlers for provider management
 * Handles profiles, availability, sessions, and patient relationships
 */

import * as kv from "./kv_store.tsx";

type ProviderType = 'bcba' | 'slp' | 'ot' | 'pt' | 'psychologist' | 'developmental_pediatrician' | 'other';

interface AvailabilitySlot {
  start: string;
  end: string;
}

interface ProviderRecord {
  id: string;
  type: ProviderType;
  specialties?: string[];
  location?: {
    zipCode?: string;
    telehealth?: boolean;
  };
  insurance?: string[];
  hourlyRate?: number;
  languages?: string[];
  acceptingNewPatients?: boolean;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  verificationStatus?: string;
  verificationData?: {
    licenseNumber: string;
    licenseState: string;
    npiNumber: string;
    submittedAt: string;
  };
  availability?: Record<string, AvailabilitySlot[]>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface SessionRecord {
  id: string;
  providerId: string;
  patientId: string;
  patientName?: string;
  parentName?: string;
  scheduledAt: string;
  duration: number;
  type?: string;
  status: string;
  notes?: string;
  notesSubmitted?: boolean;
  fee?: number;
  paid?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface PatientRecord {
  childName?: string;
  parentName?: string;
  profileAccess?: string;
  [key: string]: unknown;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Get provider by ID
 */
export async function getProvider(providerId: string): Promise<Response> {
  try {
    const provider = await kv.get(`provider:${providerId}`);

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(provider), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Get provider error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Search providers
 */
export async function searchProviders(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const specialties = url.searchParams.get('specialties')?.split(',');
    const zipCode = url.searchParams.get('zipCode');
    const telehealth = url.searchParams.get('telehealth');
    const insurance = url.searchParams.get('insurance');
    const maxRate = url.searchParams.get('maxRate');
    const language = url.searchParams.get('language');
    const acceptingNew = url.searchParams.get('acceptingNew');

    // Get all providers
    const allProviders = (await kv.getByPrefix('provider:')) as ProviderRecord[];

    // Filter based on criteria
    let filtered = allProviders.filter((p: ProviderRecord) => {
      if (type && p.type !== type) return false;
      if (specialties?.length && !specialties.some(s => p.specialties?.includes(s))) return false;
      if (zipCode && p.location?.zipCode !== zipCode) return false;
      if (telehealth === 'true' && !p.location?.telehealth) return false;
      if (insurance && !p.insurance?.includes(insurance)) return false;
      if (maxRate && (p.hourlyRate ?? 0) > parseInt(maxRate)) return false;
      if (language && !p.languages?.includes(language)) return false;
      if (acceptingNew === 'true' && !p.acceptingNewPatients) return false;
      return true;
    });

    // Sort by rating
    filtered.sort((a: ProviderRecord, b: ProviderRecord) => (b.rating || 0) - (a.rating || 0));

    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Search providers error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Create or update provider profile
 */
export async function saveProvider(req: Request): Promise<Response> {
  try {
    const data = (await req.json()) as Record<string, unknown>;
    const isUpdate = req.method === 'PUT';

    const providerId = (data.id as string) || `provider_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const provider: ProviderRecord = {
      ...(data as Omit<ProviderRecord, 'id'>),
      id: providerId,
      updatedAt: new Date().toISOString(),
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      verified: (data.verified as boolean) || false,
      rating: (data.rating as number) || 0,
      reviewCount: (data.reviewCount as number) || 0,
      type: (data.type as ProviderType) || 'other',
    };

    await kv.set(`provider:${providerId}`, provider);

    // Index by type for faster searches
    const typeIndex = ((await kv.get(`providers_by_type:${provider.type}`)) as string[] | null) || [];
    if (!typeIndex.includes(providerId)) {
      typeIndex.push(providerId);
      await kv.set(`providers_by_type:${provider.type}`, typeIndex);
    }

    return new Response(JSON.stringify(provider), {
      status: isUpdate ? 200 : 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Save provider error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update provider availability
 */
export async function updateAvailability(req: Request, providerId: string): Promise<Response> {
  try {
    const { availability } = (await req.json()) as { availability: Record<string, AvailabilitySlot[]> };

    const provider = (await kv.get(`provider:${providerId}`)) as ProviderRecord | null;
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    provider.availability = availability;
    provider.updatedAt = new Date().toISOString();

    await kv.set(`provider:${providerId}`, provider);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Update availability error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get provider's patients
 */
export async function getProviderPatients(providerId: string): Promise<Response> {
  try {
    const patients = await kv.getByPrefix(`provider_patient:${providerId}:`);

    return new Response(JSON.stringify(patients), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Get patients error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get provider's sessions
 */
export async function getProviderSessions(req: Request, providerId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const allSessions = (await kv.getByPrefix(`session:${providerId}:`)) as SessionRecord[];

    const filtered = allSessions.filter((s: SessionRecord) => {
      if (status && s.status !== status) return false;
      if (startDate && new Date(s.scheduledAt) < new Date(startDate)) return false;
      if (endDate && new Date(s.scheduledAt) > new Date(endDate)) return false;
      return true;
    });

    // Sort by date
    filtered.sort((a: SessionRecord, b: SessionRecord) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Get sessions error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get provider stats
 */
export async function getProviderStats(providerId: string): Promise<Response> {
  try {
    const provider = (await kv.get(`provider:${providerId}`)) as ProviderRecord | null;
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const patients = (await kv.getByPrefix(`provider_patient:${providerId}:`)) as PatientRecord[];
    const sessions = (await kv.getByPrefix(`session:${providerId}:`)) as SessionRecord[];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sessionsThisMonth = sessions.filter((s: SessionRecord) =>
      new Date(s.scheduledAt) >= monthStart && s.status === 'completed'
    );

    const earningsThisMonth = sessionsThisMonth.reduce((sum: number, s: SessionRecord) => sum + (s.fee || 0), 0);
    const earningsTotal = sessions
      .filter((s: SessionRecord) => s.status === 'completed')
      .reduce((sum: number, s: SessionRecord) => sum + (s.fee || 0), 0);

    const activePatients = patients.filter((p: PatientRecord) => p.profileAccess === 'granted').length;

    // Find next available slot
    const upcomingSessions = sessions
      .filter((s: SessionRecord) => new Date(s.scheduledAt) > now && s.status === 'upcoming')
      .sort((a: SessionRecord, b: SessionRecord) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const stats = {
      totalPatients: patients.length,
      activePatients,
      sessionsThisMonth: sessionsThisMonth.length,
      sessionsTotal: sessions.filter((s: SessionRecord) => s.status === 'completed').length,
      earningsThisMonth,
      earningsTotal,
      rating: provider.rating || 0,
      reviewCount: provider.reviewCount || 0,
      nextAvailableSlot: upcomingSessions[0]?.scheduledAt,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Get stats error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Schedule a session
 */
export async function scheduleSession(req: Request, providerId: string): Promise<Response> {
  try {
    const { patientId, scheduledAt, duration, type, notes } = (await req.json()) as {
      patientId: string;
      scheduledAt: string;
      duration: number;
      type?: string;
      notes?: string;
    };

    if (!patientId || !scheduledAt || !duration) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = (await kv.get(`provider:${providerId}`)) as ProviderRecord | null;
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const patient = (await kv.get(`provider_patient:${providerId}:${patientId}`)) as PatientRecord | null;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const session: SessionRecord = {
      id: sessionId,
      providerId,
      patientId,
      patientName: patient?.childName || 'Unknown',
      parentName: patient?.parentName || 'Unknown',
      scheduledAt,
      duration,
      type: type || 'telehealth',
      status: 'upcoming',
      notes: notes || '',
      fee: (provider.hourlyRate || 100) * (duration / 60),
      paid: false,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`session:${providerId}:${sessionId}`, session);

    return new Response(JSON.stringify(session), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Schedule session error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(req: Request, sessionId: string): Promise<Response> {
  try {
    const { status, notes } = (await req.json()) as { status: string; notes?: string };

    // Find the session
    const allSessions = (await kv.getByPrefix('session:')) as SessionRecord[];
    const session = allSessions.find((s: SessionRecord) => s.id === sessionId);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    session.status = status;
    if (notes) session.notes = notes;
    session.updatedAt = new Date().toISOString();

    await kv.set(`session:${session.providerId}:${sessionId}`, session);

    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Update session error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Submit session notes
 */
export async function submitSessionNotes(req: Request, sessionId: string): Promise<Response> {
  try {
    const notes = (await req.json()) as Record<string, unknown>;

    // Find the session
    const allSessions = (await kv.getByPrefix('session:')) as SessionRecord[];
    const session = allSessions.find((s: SessionRecord) => s.id === sessionId);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store notes separately for compliance
    const notesId = `session_notes:${sessionId}`;
    await kv.set(notesId, {
      sessionId,
      providerId: session.providerId,
      patientId: session.patientId,
      ...notes,
      submittedAt: new Date().toISOString(),
    });

    // Update session to indicate notes submitted
    session.notesSubmitted = true;
    session.updatedAt = new Date().toISOString();
    await kv.set(`session:${session.providerId}:${sessionId}`, session);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Submit notes error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Request profile access
 */
export async function requestProfileAccess(req: Request, providerId: string): Promise<Response> {
  try {
    const { childId, message } = (await req.json()) as { childId: string; message?: string };

    const requestId = `access_request:${providerId}:${childId}:${Date.now()}`;
    const request = {
      id: requestId,
      providerId,
      childId,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(requestId, request);

    return new Response(JSON.stringify({ success: true, requestId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Request access error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get available time slots
 */
export async function getAvailableSlots(req: Request, providerId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const duration = parseInt(url.searchParams.get('duration') || '50');

    if (!date) {
      return new Response(JSON.stringify({ error: 'Date required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = (await kv.get(`provider:${providerId}`)) as ProviderRecord | null;
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get day of week
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    const dayAvailability: AvailabilitySlot[] = provider.availability?.[dayOfWeek] || [];

    // Get existing sessions for the date
    const allSessions = (await kv.getByPrefix(`session:${providerId}:`)) as SessionRecord[];
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookedSessions = allSessions.filter((s: SessionRecord) => {
      const sessionDate = new Date(s.scheduledAt);
      return sessionDate >= dayStart && sessionDate <= dayEnd && s.status !== 'cancelled';
    });

    // Generate available slots
    const slots: string[] = [];
    for (const slot of dayAvailability) {
      // Parse start and end times
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);

      // Generate slots at 30-minute intervals
      let currentHour = startHour;
      let currentMin = startMin;

      while (currentHour < endHour || (currentHour === endHour && currentMin + duration <= endMin * 60)) {
        const slotTime = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        const slotDateTime = new Date(`${date}T${slotTime}:00`);
        const slotEndDateTime = new Date(slotDateTime.getTime() + duration * 60000);

        // Check if slot conflicts with existing sessions
        const hasConflict = bookedSessions.some((s: SessionRecord) => {
          const sessionStart = new Date(s.scheduledAt);
          const sessionEnd = new Date(sessionStart.getTime() + s.duration * 60000);
          return !(slotEndDateTime <= sessionStart || slotDateTime >= sessionEnd);
        });

        if (!hasConflict) {
          slots.push(slotTime);
        }

        // Move to next slot (30 min intervals)
        currentMin += 30;
        if (currentMin >= 60) {
          currentHour++;
          currentMin -= 60;
        }
      }
    }

    return new Response(JSON.stringify({ slots }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Get slots error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Verify provider credentials
 */
export async function verifyProvider(req: Request, providerId: string): Promise<Response> {
  try {
    const { licenseNumber, licenseState, npiNumber } = (await req.json()) as {
      licenseNumber: string;
      licenseState: string;
      npiNumber: string;
    };

    const provider = (await kv.get(`provider:${providerId}`)) as ProviderRecord | null;
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In production, this would call external verification APIs
    // For now, we'll mark as pending verification
    provider.verificationStatus = 'pending';
    provider.verificationData = {
      licenseNumber,
      licenseState,
      npiNumber,
      submittedAt: new Date().toISOString(),
    };

    await kv.set(`provider:${providerId}`, provider);

    return new Response(JSON.stringify({
      verified: false,
      message: 'Verification submitted. You will be notified once verified.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Verify provider error:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  getProvider,
  searchProviders,
  saveProvider,
  updateAvailability,
  getProviderPatients,
  getProviderSessions,
  getProviderStats,
  scheduleSession,
  updateSessionStatus,
  submitSessionNotes,
  requestProfileAccess,
  getAvailableSlots,
  verifyProvider,
};
