/**
 * Caregiver Database Functions
 * Persistence layer for paid caregiver time tracking and fiscal agent submissions
 *
 * In production, these would connect to Supabase/PostgreSQL
 * For now, implements local storage persistence with the same interface
 */

import { WAIVER_SERVICE_CODES, FISCAL_AGENTS } from './tier-utils';

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
  submissionMethod: 'pdf_download' | 'direct_api' | 'portal_upload';
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
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
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
  gpsLocation?: TimeEntry['gpsLocation']
): Promise<TimeEntry> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);

  // Check for existing in-progress entry
  const existingEntry = entries.find(
    (e) => e.userId === userId && e.status === 'in_progress'
  );

  if (existingEntry) {
    throw new Error('Already clocked in. Please clock out first.');
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

  return entry;
}

export async function clockOut(
  entryId: string,
  notes?: string,
  activitiesCompleted?: string[]
): Promise<TimeEntry> {
  const entries = getFromStorage<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES);
  const index = entries.findIndex((e) => e.id === entryId);

  if (index === -1) throw new Error('Entry not found');

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
