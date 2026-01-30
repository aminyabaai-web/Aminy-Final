/**
 * Telehealth API Service
 * Complete backend API layer for telehealth functionality
 *
 * This service handles all telehealth-related API calls including:
 * - Appointments (CRUD, status updates)
 * - Provider management
 * - Visit summaries
 * - Care plans
 *
 * In production, these call your Supabase Edge Functions or REST API.
 * For development, they use localStorage with mock data.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Appointment,
  Provider,
  TimeSlot,
  VisitSummary,
  ActionItem,
  GetCareIntake,
  VisitType,
  MOCK_PROVIDERS,
} from '../types/telehealth';
import { generateSlots, holdSlot, confirmSlot, releaseHold } from './availability-engine';
import { secureFetch } from './security/secure-fetch';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  `https://${projectId}.supabase.co/functions/v1/telehealth`;

// Only use mock data if explicitly enabled (default to real API in production)
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// ============================================================================
// Auth Helpers
// ============================================================================

function getAuthToken(): string {
  return localStorage.getItem('access_token') || publicAnonKey;
}

function getAuthHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// Appointment API
// ============================================================================

export interface CreateAppointmentParams {
  userId: string;
  providerId: string;
  slotId: string;
  slot: TimeSlot;
  visitType: VisitType;
  intake: GetCareIntake;
  paymentIntentId?: string;
}

/**
 * Create a new appointment
 */
export async function createAppointment(params: CreateAppointmentParams): Promise<Appointment> {
  if (USE_MOCK_DATA) {
    return createMockAppointment(params);
  }

  const result = await secureFetch<Appointment>(`${API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to create appointment');
  }

  return result.data;
}

/**
 * Get appointment by ID
 */
export async function getAppointment(appointmentId: string): Promise<Appointment | null> {
  if (USE_MOCK_DATA) {
    return getMockAppointment(appointmentId);
  }

  const result = await secureFetch<Appointment>(`${API_BASE_URL}/appointments/${appointmentId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error('Failed to fetch appointment');
  }

  return result.data;
}

/**
 * Get all appointments for a user
 */
export async function getUserAppointments(userId: string): Promise<Appointment[]> {
  if (USE_MOCK_DATA) {
    return getMockUserAppointments(userId);
  }

  const result = await secureFetch<Appointment[]>(`${API_BASE_URL}/appointments?userId=${userId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok || !result.data) {
    throw new Error('Failed to fetch appointments');
  }

  return result.data;
}

/**
 * Get upcoming appointments for a user
 */
export async function getUpcomingAppointments(userId: string): Promise<Appointment[]> {
  const appointments = await getUserAppointments(userId);
  const now = new Date();

  return appointments
    .filter(apt =>
      apt.status === 'scheduled' &&
      new Date(apt.startTime) > now
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<Appointment> {
  if (USE_MOCK_DATA) {
    return updateMockAppointmentStatus(appointmentId, 'cancelled');
  }

  const result = await secureFetch<Appointment>(`${API_BASE_URL}/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to cancel appointment');
  }

  return result.data;
}

/**
 * Reschedule an appointment
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newSlotId: string,
  newSlot: TimeSlot
): Promise<Appointment> {
  if (USE_MOCK_DATA) {
    return rescheduleMockAppointment(appointmentId, newSlot);
  }

  const result = await secureFetch<Appointment>(`${API_BASE_URL}/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slotId: newSlotId, slot: newSlot }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to reschedule appointment');
  }

  return result.data;
}

/**
 * Mark appointment as completed
 */
export async function completeAppointment(appointmentId: string): Promise<Appointment> {
  if (USE_MOCK_DATA) {
    return updateMockAppointmentStatus(appointmentId, 'completed');
  }

  const result = await secureFetch<Appointment>(`${API_BASE_URL}/appointments/${appointmentId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to complete appointment');
  }

  return result.data;
}

// ============================================================================
// Provider API
// ============================================================================

/**
 * Get all providers
 */
export async function getProviders(filters?: {
  state?: string;
  specialty?: string;
  role?: string;
}): Promise<Provider[]> {
  if (USE_MOCK_DATA) {
    return getMockProviders(filters);
  }

  const params = new URLSearchParams();
  if (filters?.state) params.set('state', filters.state);
  if (filters?.specialty) params.set('specialty', filters.specialty);
  if (filters?.role) params.set('role', filters.role);

  const result = await secureFetch<Provider[]>(`${API_BASE_URL}/providers?${params}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok || !result.data) {
    throw new Error('Failed to fetch providers');
  }

  return result.data;
}

/**
 * Get provider by ID
 */
export async function getProvider(providerId: string): Promise<Provider | null> {
  if (USE_MOCK_DATA) {
    return MOCK_PROVIDERS.find(p => p.id === providerId) || null;
  }

  const result = await secureFetch<Provider>(`${API_BASE_URL}/providers/${providerId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error('Failed to fetch provider');
  }

  return result.data;
}

/**
 * Get available slots for a provider
 */
export async function getProviderSlots(
  providerId: string,
  visitType: VisitType,
  startDate?: Date
): Promise<TimeSlot[]> {
  if (USE_MOCK_DATA) {
    const provider = MOCK_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return [];

    return generateSlots(
      providerId,
      provider.availabilityBlocks,
      provider.timeOffBlocks || [],
      visitType,
      [],
      startDate
    );
  }

  const params = new URLSearchParams({
    visitType,
    startDate: (startDate || new Date()).toISOString(),
  });

  const result = await secureFetch<TimeSlot[]>(
    `${API_BASE_URL}/providers/${providerId}/slots?${params}`,
    { method: 'GET', headers: getAuthHeaders() }
  );

  if (!result.ok || !result.data) {
    throw new Error('Failed to fetch slots');
  }

  return result.data;
}

/**
 * Hold a slot during checkout
 */
export async function holdSlotForCheckout(
  slotId: string,
  userId: string
): Promise<{ success: boolean; expiresAt?: string }> {
  if (USE_MOCK_DATA) {
    const success = holdSlot(slotId, userId);
    return {
      success,
      expiresAt: success ? new Date(Date.now() + 10 * 60000).toISOString() : undefined,
    };
  }

  const result = await secureFetch<{ success: boolean; expiresAt?: string }>(`${API_BASE_URL}/slots/${slotId}/hold`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });

  if (!result.ok || !result.data) {
    return { success: false };
  }

  return result.data;
}

/**
 * Release a held slot
 */
export async function releaseSlotHold(slotId: string, userId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    releaseHold(slotId, userId);
    return;
  }

  await secureFetch(`${API_BASE_URL}/slots/${slotId}/release`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
}

// ============================================================================
// Visit Summary API
// ============================================================================

/**
 * Get visit summaries for a user
 */
export async function getVisitSummaries(userId: string): Promise<VisitSummary[]> {
  if (USE_MOCK_DATA) {
    return getMockVisitSummaries(userId);
  }

  const result = await secureFetch<VisitSummary[]>(`${API_BASE_URL}/summaries?userId=${userId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok || !result.data) {
    throw new Error('Failed to fetch visit summaries');
  }

  return result.data;
}

/**
 * Get a single visit summary
 */
export async function getVisitSummary(summaryId: string): Promise<VisitSummary | null> {
  if (USE_MOCK_DATA) {
    return getMockVisitSummary(summaryId);
  }

  const result = await secureFetch<VisitSummary>(`${API_BASE_URL}/summaries/${summaryId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error('Failed to fetch visit summary');
  }

  return result.data;
}

/**
 * Create a visit summary (provider-side)
 */
export async function createVisitSummary(
  appointmentId: string,
  summary: Omit<VisitSummary, 'id' | 'createdAt' | 'updatedAt'>
): Promise<VisitSummary> {
  if (USE_MOCK_DATA) {
    return createMockVisitSummary(appointmentId, summary);
  }

  const result = await secureFetch<VisitSummary>(`${API_BASE_URL}/summaries`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ appointmentId, ...summary }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to create visit summary');
  }

  return result.data;
}

// ============================================================================
// Action Items API
// ============================================================================

/**
 * Get action items for a user
 */
export async function getActionItems(userId: string): Promise<ActionItem[]> {
  if (USE_MOCK_DATA) {
    return getMockActionItems(userId);
  }

  const result = await secureFetch<ActionItem[]>(`${API_BASE_URL}/action-items?userId=${userId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!result.ok || !result.data) {
    throw new Error('Failed to fetch action items');
  }

  return result.data;
}

/**
 * Toggle action item completion
 */
export async function toggleActionItem(
  actionItemId: string,
  completed: boolean
): Promise<ActionItem> {
  if (USE_MOCK_DATA) {
    return toggleMockActionItem(actionItemId, completed);
  }

  const result = await secureFetch<ActionItem>(`${API_BASE_URL}/action-items/${actionItemId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ completed, completedAt: completed ? new Date().toISOString() : null }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to update action item');
  }

  return result.data;
}

// ============================================================================
// Waitlist API
// ============================================================================

/**
 * Join waitlist for a provider
 */
export async function joinWaitlist(
  userId: string,
  providerId: string,
  preferences?: {
    preferredDays?: number[];
    preferredTimeRange?: { start: string; end: string };
    visitType?: VisitType;
  }
): Promise<{ success: boolean; position?: number }> {
  if (USE_MOCK_DATA) {
    // Mock: Always successful, random position
    return { success: true, position: Math.floor(Math.random() * 10) + 1 };
  }

  const result = await secureFetch<{ success: boolean; position?: number }>(`${API_BASE_URL}/waitlist`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, providerId, preferences }),
  });

  if (!result.ok || !result.data) {
    throw new Error(result.error || 'Failed to join waitlist');
  }

  return result.data;
}

// ============================================================================
// Mock Data Implementation
// ============================================================================

// In-memory storage for mock data
const mockAppointments: Map<string, Appointment> = new Map();
const mockVisitSummaries: Map<string, VisitSummary> = new Map();
const mockActionItems: Map<string, ActionItem> = new Map();

// Initialize mock data from localStorage
function initMockData() {
  try {
    const stored = localStorage.getItem('aminy-telehealth-data');
    if (stored) {
      const data = JSON.parse(stored);
      data.appointments?.forEach((apt: Appointment) => mockAppointments.set(apt.id, apt));
      data.summaries?.forEach((sum: VisitSummary) => mockVisitSummaries.set(sum.id, sum));
      data.actionItems?.forEach((item: ActionItem) => mockActionItems.set(item.id, item));
    }
  } catch (e) {
    console.error('Failed to load mock data:', e);
  }
}

// Save mock data to localStorage
function saveMockData() {
  try {
    localStorage.setItem('aminy-telehealth-data', JSON.stringify({
      appointments: Array.from(mockAppointments.values()),
      summaries: Array.from(mockVisitSummaries.values()),
      actionItems: Array.from(mockActionItems.values()),
    }));
  } catch (e) {
    console.error('Failed to save mock data:', e);
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initMockData();
}

function createMockAppointment(params: CreateAppointmentParams): Appointment {
  const provider = MOCK_PROVIDERS.find(p => p.id === params.providerId);
  const now = new Date().toISOString();

  const appointment: Appointment = {
    id: `apt-${Date.now()}`,
    userId: params.userId,
    providerId: params.providerId,
    providerName: provider ? `${provider.firstName} ${provider.lastName}` : 'Provider',
    startTime: params.slot.startTime,
    endTime: params.slot.endTime,
    visitType: params.visitType,
    status: 'scheduled',
    reasonForVisit: params.intake.visitReason,
    notes: params.intake.additionalNotes,
    videoRoomUrl: `https://meet.aminy.app/room/${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  mockAppointments.set(appointment.id, appointment);
  confirmSlot(params.slotId, params.userId, appointment.id);
  saveMockData();

  return appointment;
}

function getMockAppointment(id: string): Appointment | null {
  return mockAppointments.get(id) || null;
}

function getMockUserAppointments(userId: string): Appointment[] {
  return Array.from(mockAppointments.values()).filter(apt => apt.userId === userId);
}

function updateMockAppointmentStatus(
  id: string,
  status: Appointment['status']
): Appointment {
  const apt = mockAppointments.get(id);
  if (!apt) throw new Error('Appointment not found');

  apt.status = status;
  apt.updatedAt = new Date().toISOString();
  mockAppointments.set(id, apt);
  saveMockData();

  return apt;
}

function rescheduleMockAppointment(id: string, newSlot: TimeSlot): Appointment {
  const apt = mockAppointments.get(id);
  if (!apt) throw new Error('Appointment not found');

  apt.startTime = newSlot.startTime;
  apt.endTime = newSlot.endTime;
  apt.updatedAt = new Date().toISOString();
  mockAppointments.set(id, apt);
  saveMockData();

  return apt;
}

function getMockProviders(filters?: { state?: string; specialty?: string; role?: string }): Provider[] {
  let providers = [...MOCK_PROVIDERS];

  if (filters?.state) {
    providers = providers.filter(p => p.licensedStates.includes(filters.state!));
  }

  if (filters?.role) {
    providers = providers.filter(p => p.role === filters.role);
  }

  return providers;
}

function getMockVisitSummaries(userId: string): VisitSummary[] {
  // Return mock summaries - in production these come from the database
  return Array.from(mockVisitSummaries.values()).filter(s => s.userId === userId);
}

function getMockVisitSummary(id: string): VisitSummary | null {
  return mockVisitSummaries.get(id) || null;
}

function createMockVisitSummary(
  appointmentId: string,
  data: Omit<VisitSummary, 'id' | 'createdAt' | 'updatedAt'>
): VisitSummary {
  const now = new Date().toISOString();
  const summary: VisitSummary = {
    ...data,
    id: `vs-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  mockVisitSummaries.set(summary.id, summary);
  saveMockData();

  return summary;
}

function getMockActionItems(userId: string): ActionItem[] {
  // Return sample action items
  const sampleItems: ActionItem[] = [
    {
      id: 'ai-1',
      summaryId: 'vs-1',
      userId,
      text: 'Create a visual schedule for morning routine',
      priority: 'high',
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ai-2',
      summaryId: 'vs-1',
      userId,
      text: 'Give 5-minute warnings before transitions',
      priority: 'medium',
      completed: true,
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'ai-3',
      summaryId: 'vs-1',
      userId,
      text: 'Practice "First-Then" language during calm moments',
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];

  return sampleItems;
}

function toggleMockActionItem(id: string, completed: boolean): ActionItem {
  const item = mockActionItems.get(id) || getMockActionItems('')[0];

  const updated = {
    ...item,
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  };

  mockActionItems.set(id, updated);
  saveMockData();

  return updated;
}

// ============================================================================
// Export
// ============================================================================

export const telehealthApi = {
  // Appointments
  createAppointment,
  getAppointment,
  getUserAppointments,
  getUpcomingAppointments,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,

  // Providers
  getProviders,
  getProvider,
  getProviderSlots,
  holdSlotForCheckout,
  releaseSlotHold,

  // Visit Summaries
  getVisitSummaries,
  getVisitSummary,
  createVisitSummary,

  // Action Items
  getActionItems,
  toggleActionItem,

  // Waitlist
  joinWaitlist,
};

export default telehealthApi;
