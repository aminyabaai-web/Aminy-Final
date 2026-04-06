// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Caregiver Database Functions
 * Persistence layer for paid caregiver time tracking and fiscal agent submissions
 *
 * In production, these would connect to Supabase/PostgreSQL
 * For now, implements local storage persistence with the same interface
 */

import { WAIVER_SERVICE_CODES, FISCAL_AGENTS } from './tier-utils';
import { syncEncryptedStorage } from './security/encrypted-storage';

// ============================================================================
// SECURE ID GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure random ID for security-sensitive operations
 * Uses crypto.getRandomValues() instead of Math.random() for unpredictability
 */
function generateSecureId(prefix: string, length: number = 12): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  const randomPart = Array.from(array)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
  return `${prefix}-${Date.now()}-${randomPart}`;
}

// ============================================================================
// TYPES
// ============================================================================

export interface WaiverProfile {
  id: string;
  userId: string;
  state: string;
  waiverProgram?: string;
  fiscalAgentId: string;
  participantId: string;
  serviceAuthorization?: string;
  approvedServices: string[];
  weeklyAuthorizedHours: number;
  evvRequired: boolean;
  caregiverModeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  waiverProfileId: string;
  clockIn: string; // ISO datetime
  clockOut?: string; // ISO datetime
  serviceCode: string;
  activitiesCompleted: string[];
  notes?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  status: 'in_progress' | 'completed' | 'submitted' | 'approved' | 'rejected';
  submissionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceNote {
  id: string;
  userId: string;
  timeEntryId: string;
  serviceCode: string;
  serviceDate: string;
  durationHours: number;
  narrative: string;
  goalsAddressed: string[];
  participantResponse?: string;
  caregiverSignature: boolean;
  caregiverSignedAt?: string;
  supervisorSignature?: boolean;
  supervisorId?: string;
  supervisorSignedAt?: string;
  exportUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalAgentSubmission {
  id: string;
  userId: string;
  waiverProfileId: string;
  fiscalAgentId: string;
  timeEntryIds: string[];
  // Summary
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  totalEntries: number;
  serviceBreakdown: Array<{
    serviceCode: string;
    serviceName: string;
    hours: number;
    entries: number;
  }>;
  // Submission details
  submissionMethod: 'pdf_download' | 'direct_api' | 'portal_upload' | 'clearinghouse';
  status: 'pending' | 'submitted' | 'processing' | 'approved' | 'rejected' | 'needs_revision';
  submittedAt?: string;
  processedAt?: string;
  // Documents
  summaryPdfUrl?: string;
  serviceNotesPdfUrl?: string;
  // Response from fiscal agent
  confirmationNumber?: string;
  rejectionReason?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

const STORAGE_KEYS = {
  WAIVER_PROFILES: 'aminy_waiver_profiles',
  TIME_ENTRIES: 'aminy_time_entries',
  SERVICE_NOTES: 'aminy_service_notes',
  SUBMISSIONS: 'aminy_fiscal_submissions',
};

function getFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = syncEncryptedStorage.getItem(key);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (error) {
    // Reset corrupted data
    console.warn('[CaregiverDB] Corrupted localStorage data, resetting key:', key, error);
    syncEncryptedStorage.removeItem(key);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  syncEncryptedStorage.setItem(key, JSON.stringify(data));
}

// ============================================================================
// WAIVER PROFILE FUNCTIONS
// ============================================================================

export async function createWaiverProfile(
  userId: string,
  data: Omit<WaiverProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<WaiverProfile> {
  const profiles = getFromStorage<WaiverProfile>(STORAGE_KEYS.WAIVER_PROFILES);

  const profile: WaiverProfile = {
    id: `waiver-${Date.now()}`,
    userId,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  profiles.push(profile);
  saveToStorage(STORAGE_KEYS.WAIVER_PROFILES, profiles);

  return profile;
}

export async function getWaiverProfile(userId: string): Promise<WaiverProfile | null> {
  const profiles = getFromStorage<WaiverProfile>(STORAGE_KEYS.WAIVER_PROFILES);
  return profiles.find((p) => p.userId === userId) || null;
}

export async function updateWaiverProfile(
  profileId: string,
  updates: Partial<WaiverProfile>
): Promise<WaiverProfile> {
  const profiles = getFromStorage<WaiverProfile>(STORAGE_KEYS.WAIVER_PROFILES);
  const index = profiles.findIndex((p) => p.id === profileId);

  if (index === -1) throw new Error('Profile not found');

  profiles[index] = {
    ...profiles[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.WAIVER_PROFILES, profiles);
  return profiles[index];
}

// ============================================================================
// TIME ENTRY FUNCTIONS
// ============================================================================

export async function clockIn(
  userId: string,
  waiverProfileId: string,
  serviceCode: string,
  options?: {
    gpsLocation?: TimeEntry['gpsLocation'];
    recipientId?: string;
    recipientName?: string;
    providerName?: string;
    enableEVV?: boolean;
  }
): Promise<TimeEntry> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);

  // Check for existing in-progress entry
  const existingEntry = entries.find(
    (e) => e.userId === userId && e.status === 'in_progress'
  );

  if (existingEntry) {
    throw new Error('Already clocked in. Please clock out first.');
  }

  // Request EVV location if EVV is enabled and no location provided
  let gpsLocation = options?.gpsLocation;
  if (options?.enableEVV && !gpsLocation) {
    const evvLocation = await requestEVVLocation();
    if (evvLocation) {
      gpsLocation = {
        latitude: evvLocation.latitude,
        longitude: evvLocation.longitude,
        accuracy: evvLocation.accuracy,
        timestamp: evvLocation.timestamp,
      };
    }
  }

  const entry: TimeEntry = {
    id: `entry-${Date.now()}`,
    userId,
    waiverProfileId,
    clockIn: new Date().toISOString(),
    serviceCode,
    activitiesCompleted: [],
    gpsLocation,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  entries.push(entry);
  saveToStorage(STORAGE_KEYS.TIME_ENTRIES, entries);

  // Create EVV record if enabled
  if (options?.enableEVV) {
    await createEVVClockIn(
      entry.id,
      serviceCode,
      options.recipientId || 'unknown',
      options.recipientName || 'Unknown Recipient',
      userId,
      options.providerName || 'Caregiver'
    );
  }

  return entry;
}

export async function clockOut(
  entryId: string,
  notes?: string,
  activitiesCompleted?: string[],
  options?: {
    enableEVV?: boolean;
    collectSignature?: boolean;
  }
): Promise<TimeEntry> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);
  const index = entries.findIndex((e) => e.id === entryId);

  if (index === -1) throw new Error('Entry not found');

  // Update EVV record if enabled
  if (options?.enableEVV) {
    await updateEVVClockOut(entryId);

    if (options.collectSignature) {
      collectEVVSignature(entryId);
    }
  }

  entries[index] = {
    ...entries[index],
    clockOut: new Date().toISOString(),
    notes,
    activitiesCompleted: activitiesCompleted || entries[index].activitiesCompleted,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.TIME_ENTRIES, entries);
  return entries[index];
}

export async function getCurrentEntry(userId: string): Promise<TimeEntry | null> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);
  return entries.find((e) => e.userId === userId && e.status === 'in_progress') || null;
}

export async function getTimeEntries(
  userId: string,
  dateRange?: DateRange
): Promise<TimeEntry[]> {
  let entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);
  entries = entries.filter((e) => e.userId === userId);

  if (dateRange) {
    entries = entries.filter((e) => {
      const entryDate = new Date(e.clockIn);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });
  }

  return entries.sort((a, b) =>
    new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
  );
}

export async function updateTimeEntry(
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<TimeEntry> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);
  const index = entries.findIndex((e) => e.id === entryId);

  if (index === -1) throw new Error('Entry not found');

  entries[index] = {
    ...entries[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.TIME_ENTRIES, entries);
  return entries[index];
}

export async function logActivity(
  entryId: string,
  activity: string
): Promise<TimeEntry> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);
  const index = entries.findIndex((e) => e.id === entryId);

  if (index === -1) throw new Error('Entry not found');

  entries[index].activitiesCompleted.push(activity);
  entries[index].updatedAt = new Date().toISOString();

  saveToStorage(STORAGE_KEYS.TIME_ENTRIES, entries);
  return entries[index];
}

// ============================================================================
// SERVICE NOTE FUNCTIONS
// ============================================================================

export async function generateServiceNote(
  timeEntry: TimeEntry,
  goalsAddressed: string[] = []
): Promise<ServiceNote> {
  const notes = getFromStorage<ServiceNote>(STORAGE_KEYS.SERVICE_NOTES);

  // Calculate duration
  const clockIn = new Date(timeEntry.clockIn);
  const clockOut = timeEntry.clockOut ? new Date(timeEntry.clockOut) : new Date();
  const durationHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

  // Get service info
  const serviceInfo = WAIVER_SERVICE_CODES[timeEntry.serviceCode] || {
    description: 'Unknown Service',
    code: 'UNKNOWN',
  };

  // Generate narrative from activities
  const narrative = timeEntry.activitiesCompleted.length > 0
    ? `Caregiver provided ${serviceInfo.description.toLowerCase()} services. Activities completed: ${timeEntry.activitiesCompleted.join(', ')}. ${timeEntry.notes || ''}`
    : `Caregiver provided ${serviceInfo.description.toLowerCase()} services. ${timeEntry.notes || 'Documentation of service delivery.'}`;

  const serviceNote: ServiceNote = {
    id: `note-${Date.now()}`,
    userId: timeEntry.userId,
    timeEntryId: timeEntry.id,
    serviceCode: timeEntry.serviceCode,
    serviceDate: clockIn.toISOString().split('T')[0],
    durationHours: Math.round(durationHours * 100) / 100,
    narrative,
    goalsAddressed,
    caregiverSignature: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  notes.push(serviceNote);
  saveToStorage(STORAGE_KEYS.SERVICE_NOTES, notes);

  return serviceNote;
}

export async function getServiceNotes(
  userId: string,
  dateRange?: DateRange
): Promise<ServiceNote[]> {
  let notes = getFromStorage<ServiceNote>(STORAGE_KEYS.SERVICE_NOTES);
  notes = notes.filter((n) => n.userId === userId);

  if (dateRange) {
    notes = notes.filter((n) => {
      const noteDate = new Date(n.serviceDate);
      return noteDate >= dateRange.start && noteDate <= dateRange.end;
    });
  }

  return notes.sort((a, b) =>
    new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
  );
}

export async function signServiceNote(
  noteId: string,
  isSupervisor: boolean = false,
  supervisorId?: string
): Promise<ServiceNote> {
  const notes = getFromStorage<ServiceNote>(STORAGE_KEYS.SERVICE_NOTES);
  const index = notes.findIndex((n) => n.id === noteId);

  if (index === -1) throw new Error('Note not found');

  if (isSupervisor) {
    notes[index].supervisorSignature = true;
    notes[index].supervisorId = supervisorId;
    notes[index].supervisorSignedAt = new Date().toISOString();
  } else {
    notes[index].caregiverSignature = true;
    notes[index].caregiverSignedAt = new Date().toISOString();
  }

  notes[index].updatedAt = new Date().toISOString();
  saveToStorage(STORAGE_KEYS.SERVICE_NOTES, notes);

  return notes[index];
}

// ============================================================================
// FISCAL AGENT SUBMISSION FUNCTIONS
// ============================================================================

export async function createSubmission(
  userId: string,
  waiverProfileId: string,
  fiscalAgentId: string,
  timeEntryIds: string[],
  submissionMethod: FiscalAgentSubmission['submissionMethod']
): Promise<FiscalAgentSubmission> {
  const submissions = getFromStorage<FiscalAgentSubmission>(STORAGE_KEYS.SUBMISSIONS);
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);

  // Get the entries being submitted
  const submittedEntries = entries.filter((e) => timeEntryIds.includes(e.id));

  if (submittedEntries.length === 0) {
    throw new Error('No entries found for submission');
  }

  // Calculate summary
  const dates = submittedEntries.map((e) => new Date(e.clockIn));
  const periodStart = new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString();
  const periodEnd = new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();

  // Calculate service breakdown
  const serviceMap = new Map<string, { hours: number; entries: number }>();

  submittedEntries.forEach((entry) => {
    if (!entry.clockOut) return;

    const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
    const current = serviceMap.get(entry.serviceCode) || { hours: 0, entries: 0 };
    serviceMap.set(entry.serviceCode, {
      hours: current.hours + hours,
      entries: current.entries + 1,
    });
  });

  const serviceBreakdown = Array.from(serviceMap.entries()).map(([code, data]) => ({
    serviceCode: code,
    serviceName: WAIVER_SERVICE_CODES[code]?.description || 'Unknown',
    hours: Math.round(data.hours * 100) / 100,
    entries: data.entries,
  }));

  const totalHours = serviceBreakdown.reduce((sum, s) => sum + s.hours, 0);

  const submission: FiscalAgentSubmission = {
    id: `sub-${Date.now()}`,
    userId,
    waiverProfileId,
    fiscalAgentId,
    timeEntryIds,
    periodStart,
    periodEnd,
    totalHours: Math.round(totalHours * 100) / 100,
    totalEntries: submittedEntries.length,
    serviceBreakdown,
    submissionMethod,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  submissions.push(submission);
  saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);

  // Mark entries as submitted
  submittedEntries.forEach((entry) => {
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      entries[idx].status = 'submitted';
      entries[idx].submissionId = submission.id;
      entries[idx].updatedAt = new Date().toISOString();
    }
  });
  saveToStorage(STORAGE_KEYS.TIME_ENTRIES, entries);

  return submission;
}

export async function getSubmissions(
  userId: string,
  status?: FiscalAgentSubmission['status']
): Promise<FiscalAgentSubmission[]> {
  let submissions = getFromStorage<FiscalAgentSubmission>(STORAGE_KEYS.SUBMISSIONS);
  submissions = submissions.filter((s) => s.userId === userId);

  if (status) {
    submissions = submissions.filter((s) => s.status === status);
  }

  return submissions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: FiscalAgentSubmission['status'],
  confirmationNumber?: string,
  rejectionReason?: string
): Promise<FiscalAgentSubmission> {
  const submissions = getFromStorage<FiscalAgentSubmission>(STORAGE_KEYS.SUBMISSIONS);
  const index = submissions.findIndex((s) => s.id === submissionId);

  if (index === -1) throw new Error('Submission not found');

  submissions[index] = {
    ...submissions[index],
    status,
    confirmationNumber,
    rejectionReason,
    processedAt: status !== 'pending' && status !== 'submitted' ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
  return submissions[index];
}

// ============================================================================
// REPORTING / EXPORT FUNCTIONS
// ============================================================================

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  totalEntries: number;
  serviceBreakdown: Array<{
    serviceCode: string;
    serviceName: string;
    hours: number;
    entries: number;
    estimatedPay: [number, number]; // min/max based on hourly range
  }>;
  pendingSubmission: number;
  submittedHours: number;
}

export async function getWeeklySummary(
  userId: string,
  weekOf?: Date
): Promise<WeeklySummary> {
  const targetDate = weekOf || new Date();
  const dayOfWeek = targetDate.getDay();

  // Get start of week (Sunday)
  const weekStart = new Date(targetDate);
  weekStart.setDate(targetDate.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  // Get end of week (Saturday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const entries = await getTimeEntries(userId, { start: weekStart, end: weekEnd });

  // Calculate breakdown
  const serviceMap = new Map<string, { hours: number; entries: number }>();
  let submittedHours = 0;

  entries.forEach((entry) => {
    if (!entry.clockOut) return;

    const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
    const current = serviceMap.get(entry.serviceCode) || { hours: 0, entries: 0 };
    serviceMap.set(entry.serviceCode, {
      hours: current.hours + hours,
      entries: current.entries + 1,
    });

    if (entry.status === 'submitted' || entry.status === 'approved') {
      submittedHours += hours;
    }
  });

  const serviceBreakdown = Array.from(serviceMap.entries()).map(([code, data]) => {
    const serviceInfo = WAIVER_SERVICE_CODES[code] || {
      description: 'Unknown',
      hourlyRange: [0, 0],
    };
    return {
      serviceCode: code,
      serviceName: serviceInfo.description,
      hours: Math.round(data.hours * 100) / 100,
      entries: data.entries,
      estimatedPay: [
        Math.round(data.hours * serviceInfo.hourlyRange[0] * 100) / 100,
        Math.round(data.hours * serviceInfo.hourlyRange[1] * 100) / 100,
      ] as [number, number],
    };
  });

  const totalHours = serviceBreakdown.reduce((sum, s) => sum + s.hours, 0);
  const pendingSubmission = totalHours - submittedHours;

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    totalHours: Math.round(totalHours * 100) / 100,
    totalEntries: entries.filter((e) => e.clockOut).length,
    serviceBreakdown,
    pendingSubmission: Math.round(pendingSubmission * 100) / 100,
    submittedHours: Math.round(submittedHours * 100) / 100,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function calculateHours(clockIn: string, clockOut?: string): number {
  const start = new Date(clockIn);
  const end = clockOut ? new Date(clockOut) : new Date();
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function getFiscalAgentInfo(fiscalAgentId: string) {
  return FISCAL_AGENTS.find((a) => a.id === fiscalAgentId) || null;
}

// ============================================================================
// EVV (Electronic Visit Verification) COMPLIANCE
// ============================================================================

/**
 * EVV Data structure for federal 21st Century Cures Act compliance
 * Required data points:
 * - Type of service
 * - Individual receiving service
 * - Date of service
 * - Location of service (GPS)
 * - Individual providing service
 * - Time service begins and ends
 */
export interface EVVData {
  verificationId: string;
  // Required EVV fields
  serviceType: string;
  serviceCode: string;
  recipientId: string;
  recipientName: string;
  providerId: string;
  providerName: string;
  dateOfService: string;
  // Clock in data
  clockInTime: string;
  clockInLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  clockInDeviceId: string;
  clockInMethod: 'gps' | 'telephony' | 'fob' | 'biometric' | 'manual';
  // Clock out data
  clockOutTime?: string;
  clockOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  clockOutDeviceId?: string;
  clockOutMethod?: 'gps' | 'telephony' | 'fob' | 'biometric' | 'manual';
  // Validation
  locationVerified: boolean;
  timeVerified: boolean;
  signatureCollected: boolean;
  // Audit trail
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
  submittedToAggregator?: boolean;
  aggregatorConfirmation?: string;
}

/**
 * EVV location accuracy requirements by state
 * Some states have specific accuracy requirements
 */
export const EVV_ACCURACY_REQUIREMENTS: Record<string, number> = {
  AZ: 100,  // meters
  CA: 50,
  TX: 100,
  FL: 100,
  NY: 50,
  PA: 100,
  OH: 100,
  CO: 100,
  GA: 100,
  NC: 100,
  DEFAULT: 100,
};

/**
 * Get required GPS accuracy for a state
 */
export function getRequiredAccuracy(state: string): number {
  return EVV_ACCURACY_REQUIREMENTS[state.toUpperCase()] || EVV_ACCURACY_REQUIREMENTS.DEFAULT;
}

/**
 * Request GPS location with high accuracy for EVV
 */
export async function requestEVVLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not available');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };

        // Attempt reverse geocoding for address (optional)
        try {
          const address = await reverseGeocode(location.latitude, location.longitude);
          resolve({ ...location, address });
        } catch (error) {
          console.warn('[CaregiverDB] Reverse geocoding failed:', error);
          resolve(location);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to address (simplified - would use actual API in production)
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  // In production, use Google Maps, Mapbox, or OpenStreetMap Nominatim API
  // For now, return undefined to skip address lookup
  return undefined;
}

/**
 * Generate device ID for EVV tracking
 */
export function getDeviceId(): string {
  const storageKey = 'aminy_evv_device_id';
  let deviceId = syncEncryptedStorage.getItem(storageKey);

  if (!deviceId) {
    // Generate a unique device ID based on browser fingerprint
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    deviceId = `device-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
    syncEncryptedStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

/**
 * Create EVV record for clock in
 */
export async function createEVVClockIn(
  timeEntryId: string,
  serviceCode: string,
  recipientId: string,
  recipientName: string,
  providerId: string,
  providerName: string
): Promise<EVVData | null> {
  const location = await requestEVVLocation();

  if (!location) {
    console.warn('Could not obtain location for EVV');
    // EVV still proceeds but marks location as unverified
  }

  const evvData: EVVData = {
    verificationId: generateSecureId('evv'),
    serviceType: 'personal-care', // Map from service code
    serviceCode,
    recipientId,
    recipientName,
    providerId,
    providerName,
    dateOfService: new Date().toISOString().split('T')[0],
    clockInTime: new Date().toISOString(),
    clockInLocation: location || {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
    },
    clockInDeviceId: getDeviceId(),
    clockInMethod: location ? 'gps' : 'manual',
    locationVerified: !!location && location.accuracy < 150, // within 150m
    timeVerified: true,
    signatureCollected: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Store EVV data
  saveEVVData(timeEntryId, evvData);

  return evvData;
}

/**
 * Update EVV record for clock out
 */
export async function updateEVVClockOut(timeEntryId: string): Promise<EVVData | null> {
  const evvData = getEVVData(timeEntryId);

  if (!evvData) {
    console.warn('No EVV data found for time entry');
    return null;
  }

  const location = await requestEVVLocation();

  const updatedEvv: EVVData = {
    ...evvData,
    clockOutTime: new Date().toISOString(),
    clockOutLocation: location || {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
    },
    clockOutDeviceId: getDeviceId(),
    clockOutMethod: location ? 'gps' : 'manual',
    locationVerified: evvData.locationVerified && !!location && location.accuracy < 150,
    updatedAt: new Date().toISOString(),
  };

  saveEVVData(timeEntryId, updatedEvv);

  return updatedEvv;
}

/**
 * Collect signature for EVV compliance
 */
export function collectEVVSignature(timeEntryId: string): boolean {
  const evvData = getEVVData(timeEntryId);

  if (!evvData) return false;

  saveEVVData(timeEntryId, {
    ...evvData,
    signatureCollected: true,
    updatedAt: new Date().toISOString(),
  });

  return true;
}

/**
 * EVV storage helpers
 */
const EVV_STORAGE_KEY = 'aminy_evv_data';

function saveEVVData(timeEntryId: string, evvData: EVVData): void {
  let allEvv: Record<string, EVVData> = {};
  try {
    allEvv = JSON.parse(syncEncryptedStorage.getItem(EVV_STORAGE_KEY) || '{}');
  } catch {
    // localStorage unavailable
    allEvv = {};
  }
  allEvv[timeEntryId] = evvData;
  syncEncryptedStorage.setItem(EVV_STORAGE_KEY, JSON.stringify(allEvv));
}

export function getEVVData(timeEntryId: string): EVVData | null {
  try {
    const allEvv = JSON.parse(syncEncryptedStorage.getItem(EVV_STORAGE_KEY) || '{}');
    return allEvv[timeEntryId] || null;
  } catch {
    // localStorage unavailable
    return null;
  }
}

export function getAllEVVData(): Record<string, EVVData> {
  try {
    return JSON.parse(syncEncryptedStorage.getItem(EVV_STORAGE_KEY) || '{}');
  } catch {
    // localStorage unavailable
    return {};
  }
}

/**
 * Validate EVV data completeness
 */
export function validateEVVData(evvData: EVVData): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!evvData.clockInTime) errors.push('Missing clock-in time');
  if (!evvData.clockOutTime) errors.push('Missing clock-out time');
  if (!evvData.serviceCode) errors.push('Missing service code');
  if (!evvData.recipientId) errors.push('Missing recipient ID');
  if (!evvData.providerId) errors.push('Missing provider ID');

  // Location validation
  if (!evvData.locationVerified) {
    warnings.push('Location could not be verified - may require manual review');
  }

  if (evvData.clockInLocation.accuracy > 150) {
    warnings.push('Clock-in location accuracy is low');
  }

  if (evvData.clockOutLocation && evvData.clockOutLocation.accuracy > 150) {
    warnings.push('Clock-out location accuracy is low');
  }

  // Signature
  if (!evvData.signatureCollected) {
    warnings.push('Signature not collected');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export EVV data for fiscal agent submission
 * Formats data according to common EVV aggregator requirements
 */
export function exportEVVDataForSubmission(
  timeEntryIds: string[]
): Array<{
  evv: EVVData;
  validation: ReturnType<typeof validateEVVData>;
}> {
  const results: Array<{
    evv: EVVData;
    validation: ReturnType<typeof validateEVVData>;
  }> = [];

  const allEvv = getAllEVVData();

  timeEntryIds.forEach((id) => {
    const evv = allEvv[id];
    if (evv) {
      results.push({
        evv,
        validation: validateEVVData(evv),
      });
    }
  });

  return results;
}

/**
 * Calculate distance between two GPS points (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate that clock in/out locations are reasonable
 * (e.g., not too far apart for the time elapsed)
 */
export function validateLocationConsistency(evvData: EVVData): {
  valid: boolean;
  distanceMeters?: number;
  message?: string;
} {
  if (!evvData.clockInLocation || !evvData.clockOutLocation) {
    return { valid: true }; // Can't validate without both locations
  }

  if (!evvData.clockInTime || !evvData.clockOutTime) {
    return { valid: true };
  }

  const distance = calculateDistance(
    evvData.clockInLocation.latitude,
    evvData.clockInLocation.longitude,
    evvData.clockOutLocation.latitude,
    evvData.clockOutLocation.longitude
  );

  const durationMs = new Date(evvData.clockOutTime).getTime() - new Date(evvData.clockInTime).getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  // Maximum reasonable speed: 120 km/h = 33.3 m/s
  const maxDistance = durationHours * 120 * 1000; // meters

  if (distance > maxDistance) {
    return {
      valid: false,
      distanceMeters: distance,
      message: `Distance between clock-in and clock-out (${Math.round(distance / 1000)}km) seems too far for the time elapsed (${durationHours.toFixed(1)}h)`,
    };
  }

  return {
    valid: true,
    distanceMeters: distance,
  };
}
