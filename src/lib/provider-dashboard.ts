/**
 * Provider Dashboard Engine
 * Complete provider-side functionality for therapists, BCBAs, and clinicians
 *
 * Enables providers to:
 * - Manage their schedule and availability
 * - View and manage appointments
 * - Conduct video sessions
 * - Write and submit session notes
 * - Track patient progress
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// Types
// ============================================================================

export type ProviderRole = 'bcba' | 'rbt' | 'slp' | 'ot' | 'psychologist' | 'therapist';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type NoteStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'submitted';

export interface Provider {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: ProviderRole;
  credentials: string[];
  licenseNumber: string;
  licensedStates: string[];
  specialties: string[];
  bio?: string;
  photoUrl?: string;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  isAcceptingNew: boolean;
  languages: string[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isRecurring: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

export interface TimeOff {
  id: string;
  providerId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isAllDay: boolean;
}

export interface ProviderAppointment {
  id: string;
  providerId: string;
  clientId: string;
  clientName: string;
  childName: string;
  childAge: number;
  startTime: string;
  endTime: string;
  visitType: string;
  status: AppointmentStatus;
  reasonForVisit: string;
  notes?: string;
  videoRoomUrl?: string;
  videoRoomName?: string;
  createdAt: string;
}

export interface SessionNote {
  id: string;
  appointmentId: string;
  providerId: string;
  clientId: string;
  childName: string;
  sessionDate: string;
  sessionDuration: number; // minutes
  status: NoteStatus;
  // Clinical content
  presentingConcerns: string;
  interventionsUsed: string[];
  clientResponse: string;
  progressTowardGoals: string;
  recommendationsForHome: string[];
  nextSessionFocus: string;
  // Billing
  cptCodes: string[];
  unitsProvided: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ClientSummary {
  clientId: string;
  clientName: string;
  childName: string;
  childAge: number;
  diagnoses: string[];
  totalSessions: number;
  lastSession?: string;
  nextSession?: string;
  activeGoals: string[];
  currentChallenges: string[];
  effectiveStrategies: string[];
  tier: string;
}

export interface ProviderStats {
  totalClients: number;
  appointmentsThisWeek: number;
  appointmentsThisMonth: number;
  completedSessions: number;
  pendingNotes: number;
  averageRating: number;
  totalEarnings: number;
  upcomingAppointments: ProviderAppointment[];
}

// ============================================================================
// API Helpers
// ============================================================================

const getAuthToken = (): string => {
  return typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || publicAnonKey
    : publicAnonKey;
};

const providerApi = async (endpoint: string, options: RequestInit = {}): Promise<unknown> => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/provider${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Provider API error: ${response.status}`);
  }

  return response.json();
};

// ============================================================================
// Provider Profile
// ============================================================================

/**
 * Get provider profile
 */
export async function getProviderProfile(providerId: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', providerId)
    .single();

  if (error || !data) return null;
  return mapDbProvider(data);
}

/**
 * Update provider profile
 */
export async function updateProviderProfile(
  providerId: string,
  updates: Partial<Pick<Provider, 'bio' | 'specialties' | 'hourlyRate' | 'isAcceptingNew' | 'photoUrl' | 'languages'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('providers')
    .update({
      bio: updates.bio,
      specialties: updates.specialties,
      hourly_rate: updates.hourlyRate,
      is_accepting_new: updates.isAcceptingNew,
      photo_url: updates.photoUrl,
      languages: updates.languages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);

  return !error;
}

// ============================================================================
// Availability Management
// ============================================================================

/**
 * Get provider availability
 */
export async function getAvailability(providerId: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase
    .from('provider_availability')
    .select('*')
    .eq('provider_id', providerId)
    .order('day_of_week')
    .order('start_time');

  if (error) {
    console.error('Failed to fetch availability:', error);
    return [];
  }

  return (data || []).map(mapDbAvailability);
}

/**
 * Set availability for a day
 */
export async function setAvailability(
  providerId: string,
  slots: Omit<AvailabilitySlot, 'id' | 'providerId'>[]
): Promise<boolean> {
  // Delete existing slots for affected days
  const daysToUpdate = [...new Set(slots.map(s => s.dayOfWeek))];

  for (const day of daysToUpdate) {
    await supabase
      .from('provider_availability')
      .delete()
      .eq('provider_id', providerId)
      .eq('day_of_week', day);
  }

  // Insert new slots
  const rows = slots.map(slot => ({
    id: `avail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    provider_id: providerId,
    day_of_week: slot.dayOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime,
    is_recurring: slot.isRecurring ?? true,
    effective_from: slot.effectiveFrom,
    effective_until: slot.effectiveUntil,
  }));

  const { error } = await supabase
    .from('provider_availability')
    .insert(rows);

  return !error;
}

/**
 * Add time off
 */
export async function addTimeOff(
  providerId: string,
  timeOff: Omit<TimeOff, 'id' | 'providerId'>
): Promise<TimeOff | null> {
  const id = `timeoff-${Date.now()}`;

  const { error } = await supabase
    .from('provider_time_off')
    .insert({
      id,
      provider_id: providerId,
      start_date: timeOff.startDate,
      end_date: timeOff.endDate,
      reason: timeOff.reason,
      is_all_day: timeOff.isAllDay ?? true,
    });

  if (error) return null;

  return {
    id,
    providerId,
    ...timeOff,
  };
}

/**
 * Get time off
 */
export async function getTimeOff(providerId: string): Promise<TimeOff[]> {
  const { data, error } = await supabase
    .from('provider_time_off')
    .select('*')
    .eq('provider_id', providerId)
    .gte('end_date', new Date().toISOString())
    .order('start_date');

  if (error) return [];

  return (data || []).map((row) => ({
    id: row.id as string,
    providerId: row.provider_id as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    reason: row.reason as string | undefined,
    isAllDay: row.is_all_day as boolean,
  }));
}

/**
 * Cancel time off
 */
export async function cancelTimeOff(timeOffId: string): Promise<boolean> {
  const { error } = await supabase
    .from('provider_time_off')
    .delete()
    .eq('id', timeOffId);

  return !error;
}

// ============================================================================
// Appointment Management
// ============================================================================

/**
 * Get provider appointments
 */
export async function getAppointments(
  providerId: string,
  options?: {
    status?: AppointmentStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<ProviderAppointment[]> {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      profiles:user_id (
        parent_name,
        child_name,
        child_age
      )
    `)
    .eq('provider_id', providerId)
    .order('start_time', { ascending: true });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.startDate) {
    query = query.gte('start_time', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('start_time', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch appointments:', error);
    return [];
  }

  return (data || []).map((row) => {
    const profiles = row.profiles as { parent_name?: string; child_name?: string; child_age?: number } | null;
    return {
      id: row.id as string,
      providerId: row.provider_id as string,
      clientId: row.user_id as string,
      clientName: profiles?.parent_name || 'Client',
      childName: profiles?.child_name || 'Child',
      childAge: profiles?.child_age || 0,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      visitType: row.visit_type as string,
      status: row.status as AppointmentStatus,
      reasonForVisit: row.reason_for_visit as string,
      notes: row.notes as string | undefined,
      videoRoomUrl: row.video_room_url as string | undefined,
      videoRoomName: row.video_room_name as string | undefined,
      createdAt: row.created_at as string,
    };
  });
}

/**
 * Get today's appointments
 */
export async function getTodaysAppointments(providerId: string): Promise<ProviderAppointment[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getAppointments(providerId, {
    startDate: today.toISOString(),
    endDate: tomorrow.toISOString(),
  });
}

/**
 * Get upcoming appointments
 */
export async function getUpcomingAppointments(
  providerId: string,
  limit: number = 5
): Promise<ProviderAppointment[]> {
  return getAppointments(providerId, {
    startDate: new Date().toISOString(),
    status: 'scheduled',
    limit,
  });
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  return !error;
}

/**
 * Start a video session
 */
export async function startVideoSession(appointmentId: string): Promise<{
  roomUrl: string;
  token: string;
} | null> {
  try {
    const result = await providerApi('/start-session', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    });

    // Update appointment status
    await updateAppointmentStatus(appointmentId, 'in_progress');

    return {
      roomUrl: (result as Record<string, unknown>).roomUrl as string,
      token: (result as Record<string, unknown>).token as string,
    };
  } catch (error) {
    console.error('Failed to start video session:', error);
    return null;
  }
}

/**
 * End a video session
 */
export async function endVideoSession(appointmentId: string): Promise<boolean> {
  try {
    await providerApi('/end-session', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    });

    await updateAppointmentStatus(appointmentId, 'completed');
    return true;
  } catch (error) {
    console.error('Failed to end video session:', error);
    return false;
  }
}

// ============================================================================
// Session Notes
// ============================================================================

/**
 * Create session note
 */
export async function createSessionNote(
  note: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<SessionNote> {
  const now = new Date().toISOString();
  const id = `note-${Date.now()}`;

  const sessionNote: SessionNote = {
    ...note,
    id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  await supabase.from('session_notes').insert({
    id: sessionNote.id,
    appointment_id: sessionNote.appointmentId,
    provider_id: sessionNote.providerId,
    client_id: sessionNote.clientId,
    child_name: sessionNote.childName,
    session_date: sessionNote.sessionDate,
    session_duration: sessionNote.sessionDuration,
    status: sessionNote.status,
    presenting_concerns: sessionNote.presentingConcerns,
    interventions_used: sessionNote.interventionsUsed,
    client_response: sessionNote.clientResponse,
    progress_toward_goals: sessionNote.progressTowardGoals,
    recommendations_for_home: sessionNote.recommendationsForHome,
    next_session_focus: sessionNote.nextSessionFocus,
    cpt_codes: sessionNote.cptCodes,
    units_provided: sessionNote.unitsProvided,
    created_at: sessionNote.createdAt,
    updated_at: sessionNote.updatedAt,
  });

  return sessionNote;
}

/**
 * Update session note
 */
export async function updateSessionNote(
  noteId: string,
  updates: Partial<SessionNote>
): Promise<boolean> {
  const { error } = await supabase
    .from('session_notes')
    .update({
      presenting_concerns: updates.presentingConcerns,
      interventions_used: updates.interventionsUsed,
      client_response: updates.clientResponse,
      progress_toward_goals: updates.progressTowardGoals,
      recommendations_for_home: updates.recommendationsForHome,
      next_session_focus: updates.nextSessionFocus,
      cpt_codes: updates.cptCodes,
      units_provided: updates.unitsProvided,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  return !error;
}

/**
 * Submit note for approval
 */
export async function submitNoteForApproval(noteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('session_notes')
    .update({
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  return !error;
}

/**
 * Approve session note (for supervisors)
 */
export async function approveSessionNote(
  noteId: string,
  approverId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('session_notes')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  return !error;
}

/**
 * Get session notes for provider
 */
export async function getSessionNotes(
  providerId: string,
  options?: {
    status?: NoteStatus;
    clientId?: string;
    limit?: number;
  }
): Promise<SessionNote[]> {
  let query = supabase
    .from('session_notes')
    .select('*')
    .eq('provider_id', providerId)
    .order('session_date', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.clientId) {
    query = query.eq('client_id', options.clientId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch session notes:', error);
    return [];
  }

  return (data || []).map(mapDbSessionNote);
}

/**
 * Get pending notes count
 */
export async function getPendingNotesCount(providerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('session_notes')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('status', 'draft');

  return error ? 0 : (count || 0);
}

// ============================================================================
// Client Management
// ============================================================================

/**
 * Get provider's clients
 */
export async function getClients(providerId: string): Promise<ClientSummary[]> {
  // Get all appointments to find unique clients
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      user_id,
      profiles:user_id (
        parent_name,
        child_name,
        child_age,
        tier
      )
    `)
    .eq('provider_id', providerId)
    .eq('status', 'completed');

  if (error || !appointments) return [];

  // Deduplicate clients
  const clientMap = new Map<string, ClientSummary>();

  for (const apt of appointments) {
    const clientId = apt.user_id;
    if (!clientMap.has(clientId)) {
      const profile = apt.profiles as { parent_name?: string; child_name?: string; child_age?: number; tier?: string } | null;
      clientMap.set(clientId, {
        clientId,
        clientName: profile?.parent_name || 'Client',
        childName: profile?.child_name || 'Child',
        childAge: profile?.child_age || 0,
        diagnoses: [],
        totalSessions: 0,
        activeGoals: [],
        currentChallenges: [],
        effectiveStrategies: [],
        tier: profile?.tier || 'free',
      });
    }
    const client = clientMap.get(clientId)!;
    client.totalSessions++;
  }

  return Array.from(clientMap.values());
}

/**
 * Get detailed client info
 */
export async function getClientDetails(
  providerId: string,
  clientId: string
): Promise<ClientSummary | null> {
  // Get client profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', clientId)
    .single();

  if (!profile) return null;

  // Get session history
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('provider_id', providerId)
    .eq('user_id', clientId)
    .order('start_time', { ascending: false });

  const totalSessions = appointments?.filter(a => a.status === 'completed').length || 0;
  const lastSession = appointments?.find(a => a.status === 'completed')?.start_time;
  const nextSession = appointments?.find(a =>
    a.status === 'scheduled' && new Date(a.start_time) > new Date()
  )?.start_time;

  // Get memory facts for client
  const { data: facts } = await supabase
    .from('memory_facts')
    .select('*')
    .eq('user_id', clientId)
    .eq('is_active', true);

  const diagnoses = facts?.filter(f => f.key === 'diagnosis').map(f => f.value) || [];
  const activeGoals = facts?.filter(f => f.category === 'educational').map(f => f.value) || [];
  const challenges = facts?.filter(f => f.category === 'challenge').map(f => f.value) || [];
  const strategies = facts?.filter(f => f.category === 'strategy').map(f => f.value) || [];

  return {
    clientId,
    clientName: profile.parent_name || 'Client',
    childName: profile.child_name || 'Child',
    childAge: profile.child_age || 0,
    diagnoses,
    totalSessions,
    lastSession,
    nextSession,
    activeGoals,
    currentChallenges: challenges,
    effectiveStrategies: strategies,
    tier: profile.tier || 'free',
  };
}

// ============================================================================
// Provider Stats
// ============================================================================

/**
 * Get provider dashboard stats
 */
export async function getProviderStats(providerId: string): Promise<ProviderStats> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get appointments for different time ranges
  const [thisWeek, thisMonth, allTime, upcoming] = await Promise.all([
    getAppointments(providerId, { startDate: weekStart.toISOString() }),
    getAppointments(providerId, { startDate: monthStart.toISOString() }),
    supabase
      .from('appointments')
      .select('user_id', { count: 'exact' })
      .eq('provider_id', providerId)
      .eq('status', 'completed'),
    getUpcomingAppointments(providerId, 5),
  ]);

  // Get unique clients
  const { count: totalClients } = await supabase
    .from('appointments')
    .select('user_id', { count: 'exact', head: true })
    .eq('provider_id', providerId);

  // Get pending notes
  const pendingNotes = await getPendingNotesCount(providerId);

  // Get provider rating
  const { data: provider } = await supabase
    .from('providers')
    .select('rating, total_earnings')
    .eq('id', providerId)
    .single();

  return {
    totalClients: totalClients || 0,
    appointmentsThisWeek: thisWeek.length,
    appointmentsThisMonth: thisMonth.length,
    completedSessions: allTime.count || 0,
    pendingNotes,
    averageRating: provider?.rating || 0,
    totalEarnings: provider?.total_earnings || 0,
    upcomingAppointments: upcoming,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function mapDbProvider(data: Record<string, unknown>): Provider {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    firstName: data.first_name as string,
    lastName: data.last_name as string,
    email: data.email as string,
    phone: data.phone as string | undefined,
    role: data.role as Provider['role'],
    credentials: (data.credentials || []) as string[],
    licenseNumber: data.license_number as string,
    licensedStates: (data.licensed_states || []) as string[],
    specialties: (data.specialties || []) as string[],
    bio: data.bio as string | undefined,
    photoUrl: data.photo_url as string | undefined,
    hourlyRate: data.hourly_rate as number,
    rating: data.rating as number,
    reviewCount: data.review_count as number,
    isAcceptingNew: data.is_accepting_new as boolean,
    languages: (data.languages || ['English']) as string[],
    timezone: (data.timezone as string) || 'America/New_York',
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapDbAvailability(data: Record<string, unknown>): AvailabilitySlot {
  return {
    id: data.id as string,
    providerId: data.provider_id as string,
    dayOfWeek: data.day_of_week as number,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    isRecurring: (data.is_recurring as boolean) ?? true,
    effectiveFrom: data.effective_from as string | undefined,
    effectiveUntil: data.effective_until as string | undefined,
  };
}

function mapDbSessionNote(data: Record<string, unknown>): SessionNote {
  return {
    id: data.id as string,
    appointmentId: data.appointment_id as string,
    providerId: data.provider_id as string,
    clientId: data.client_id as string,
    childName: data.child_name as string,
    sessionDate: data.session_date as string,
    sessionDuration: data.session_duration as number,
    status: data.status as SessionNote['status'],
    presentingConcerns: data.presenting_concerns as string,
    interventionsUsed: (data.interventions_used || []) as string[],
    clientResponse: data.client_response as string,
    progressTowardGoals: data.progress_toward_goals as string,
    recommendationsForHome: (data.recommendations_for_home || []) as string[],
    nextSessionFocus: data.next_session_focus as string,
    cptCodes: (data.cpt_codes || []) as string[],
    unitsProvided: data.units_provided as number,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    submittedAt: data.submitted_at as string | undefined,
    approvedBy: data.approved_by as string | undefined,
    approvedAt: data.approved_at as string | undefined,
  };
}

// ============================================================================
// Export
// ============================================================================

export const providerDashboard = {
  // Profile
  getProviderProfile,
  updateProviderProfile,

  // Availability
  getAvailability,
  setAvailability,
  addTimeOff,
  getTimeOff,
  cancelTimeOff,

  // Appointments
  getAppointments,
  getTodaysAppointments,
  getUpcomingAppointments,
  updateAppointmentStatus,
  startVideoSession,
  endVideoSession,

  // Session Notes
  createSessionNote,
  updateSessionNote,
  submitNoteForApproval,
  approveSessionNote,
  getSessionNotes,
  getPendingNotesCount,

  // Clients
  getClients,
  getClientDetails,

  // Stats
  getProviderStats,
};

export default providerDashboard;
