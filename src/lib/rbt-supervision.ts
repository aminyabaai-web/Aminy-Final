// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RBT Supervision Engine
 * BACB-compliant supervision tracking for RBTs
 * Requirements: 5% of direct service hours as supervision,
 * minimum 2 contacts/month, 1 must be individual, 1 must include direct observation
 */

// ── Types ────────────────────────────────────────────────────────────

export interface RBTProfile {
  id: string;
  name: string;
  email: string;
  rbtNumber: string;
  certificationDate: string;
  renewalDate: string;
  supervisingBCBAId: string;
  supervisingBCBAName: string;
  state: string;
  hiredDate: string;
  status: 'active' | 'inactive' | 'pending';
  avatarUrl?: string;
}

export interface SupervisionSession {
  id: string;
  rbtId: string;
  bcbaId: string;
  date: string;
  durationMinutes: number;
  type: 'individual' | 'group';
  includesDirectObservation: boolean;
  topicsCovered: string[];
  competenciesAssessed: string[];
  bcbaNotes: string;
  rbtSignature: boolean;
  rbtSignatureDate?: string;
  bcbaSignature: boolean;
  bcbaSignatureDate?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending-signatures';
  clientId?: string;
  clientName?: string;
}

export interface SupervisionRequirement {
  minPercentOfDirectHours: number; // 5%
  minContactsPerMonth: number; // 2
  minIndividualPerMonth: number; // 1
  minDirectObservationPerMonth: number; // 1
}

export const BACB_REQUIREMENTS: SupervisionRequirement = {
  minPercentOfDirectHours: 5,
  minContactsPerMonth: 2,
  minIndividualPerMonth: 1,
  minDirectObservationPerMonth: 1,
};

export interface CompetencyRating {
  areaId: number;
  areaName: string;
  rating: number; // 1-5
  notes: string;
  assessedDate: string;
}

export interface CompetencyAssessment {
  id: string;
  rbtId: string;
  bcbaId: string;
  date: string;
  ratings: CompetencyRating[];
  overallNotes: string;
  developmentPlan: string[];
}

export interface SupervisionPeriod {
  rbtId: string;
  month: string; // YYYY-MM
  directServiceHours: number;
  supervisionHoursReceived: number;
  individualSessionCount: number;
  groupSessionCount: number;
  directObservationCount: number;
  compliancePercent: number;
  status: 'compliant' | 'at-risk' | 'non-compliant';
}

export interface ComplianceRisk {
  rbtId: string;
  rbtName: string;
  type: 'supervision-percentage' | 'individual-session' | 'direct-observation' | 'contact-count' | 'certification-expiring';
  severity: 'warning' | 'critical';
  message: string;
  dueDate?: string;
  daysRemaining?: number;
}

export interface SupervisionReport {
  rbtId: string;
  rbtName: string;
  rbtNumber: string;
  bcbaName: string;
  startDate: string;
  endDate: string;
  periods: SupervisionPeriod[];
  sessions: SupervisionSession[];
  assessments: CompetencyAssessment[];
  totalDirectHours: number;
  totalSupervisionHours: number;
  overallCompliancePercent: number;
}

// ── BACB 5th Edition Task List Areas ────────────────────────────────

export const BACB_TASK_LIST_AREAS = [
  { id: 1, name: 'Philosophical Underpinnings', category: 'Foundations' },
  { id: 2, name: 'Concepts and Principles', category: 'Foundations' },
  { id: 3, name: 'Measurement, Data Display, Interpretation', category: 'Foundations' },
  { id: 4, name: 'Experimental Design', category: 'Foundations' },
  { id: 5, name: 'Ethics (Professional/Ethical Compliance)', category: 'Ethics' },
  { id: 6, name: 'Behavior Assessment', category: 'Assessment' },
  { id: 7, name: 'Behavior-Change Procedures (Reinforcement)', category: 'Intervention' },
  { id: 8, name: 'Behavior-Change Procedures (Punishment)', category: 'Intervention' },
  { id: 9, name: 'Behavior-Change Procedures (Antecedent)', category: 'Intervention' },
  { id: 10, name: 'Behavior-Change Procedures (Generalization/Maintenance)', category: 'Intervention' },
  { id: 11, name: 'Selecting/Implementing Interventions', category: 'Intervention' },
  { id: 12, name: 'Personnel Supervision/Management', category: 'Management' },
  { id: 13, name: 'Skill Acquisition Programs', category: 'Programs' },
  { id: 14, name: 'Behavior Reduction Programs', category: 'Programs' },
  { id: 15, name: 'Documentation and Reporting', category: 'Administration' },
  { id: 16, name: 'Discretionary Competencies', category: 'Advanced' },
  { id: 17, name: 'Client Dignity and Rights', category: 'Ethics' },
  { id: 18, name: 'Cultural Responsiveness', category: 'Ethics' },
  { id: 19, name: 'Caregiver Training', category: 'Programs' },
  { id: 20, name: 'Professional Development', category: 'Advanced' },
] as const;

export const RATING_LABELS: Record<number, string> = {
  1: 'Not Demonstrated',
  2: 'Emerging',
  3: 'Developing',
  4: 'Competent',
  5: 'Mastered',
};

// ── localStorage Keys ───────────────────────────────────────────────

import { isDemoMode } from './demo-seed';
import { supabase } from '../utils/supabase/client';

const STORAGE_KEYS = {
  rbtProfiles: 'aminy_rbt_profiles',
  supervisionSessions: 'aminy_supervision_sessions',
  competencyAssessments: 'aminy_competency_assessments',
  directServiceHours: 'aminy_rbt_direct_hours',
  rbtSessionLogs: 'aminy_rbt_session_logs',
  /** Offline cache of the Supabase-backed roster (non-demo mode only). */
  sbProfileCache: 'aminy_rbt_profiles_offline_cache',
};

// ── Storage Helpers ─────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

// ── Supabase-backed in-memory cache (non-demo mode) ─────────────────

let _sbProfiles: RBTProfile[] = [];
let _sbSessions: SupervisionSession[] = [];
let _sbAssessments: CompetencyAssessment[] = [];
let _sbDirectHours: Record<string, Record<string, number>> = {};
let _sbLoaded = false;

/** Load RBT data from Supabase for the current BCBA user. Call from SupervisionDashboard on mount. */
export async function loadRBTDataFromSupabase(currentBcbaId: string): Promise<void> {
  if (isDemoMode()) return;

  const [assignmentsRes, sessionsRes, assessmentsRes, hoursRes] = await Promise.allSettled([
    supabase
      .from('rbt_org_assignments')
      .select('*, rbt:rbt_user_id(id, full_name, email, avatar_url)')
      .eq('supervising_bcba_id', currentBcbaId)
      .eq('status', 'active'),

    supabase
      .from('rbt_supervision_sessions')
      .select('*')
      .eq('bcba_id', currentBcbaId)
      .order('date', { ascending: false })
      .limit(500),

    supabase
      .from('rbt_competency_assessments')
      .select('*')
      .eq('bcba_id', currentBcbaId)
      .order('date', { ascending: false }),

    supabase
      .from('rbt_direct_service_hours')
      .select('rbt_id, month, hours'),
  ]);

  if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value.data) {
    const cached = loadFromStorage<RBTProfile[]>(STORAGE_KEYS.sbProfileCache, []);
    _sbProfiles = assignmentsRes.value.data.map((row) => {
      // Pending invites may not have an auth user yet (rbt_user_id is null) —
      // fall back to the assignment row id so the roster entry is still addressable.
      const profileId = row.rbt_user_id || row.id;
      const cachedProfile = cached.find((c) => c.id === profileId);
      return {
        id: profileId,
        name:
          (row.rbt as { full_name?: string } | null)?.full_name ||
          (row as { invite_name?: string }).invite_name ||
          cachedProfile?.name ||
          row.rbt_user_id ||
          'Invited RBT',
        email:
          (row.rbt as { email?: string } | null)?.email ||
          (row as { invite_email?: string }).invite_email ||
          cachedProfile?.email ||
          '',
        avatarUrl: (row.rbt as { avatar_url?: string } | null)?.avatar_url,
        rbtNumber: row.rbt_certification_number || '',
        certificationDate: row.certification_date || '',
        renewalDate: row.renewal_date || '',
        supervisingBCBAId: row.supervising_bcba_id,
        supervisingBCBAName: '',
        state: row.state || '',
        hiredDate: row.hired_date || '',
        status: row.status as RBTProfile['status'],
      };
    });
    // Offline cache: last-known roster so a flaky reload doesn't blank the screen.
    saveToStorage(STORAGE_KEYS.sbProfileCache, _sbProfiles);
  } else if (_sbProfiles.length === 0) {
    // Query failed (network / RLS) — fall back to the offline cache.
    _sbProfiles = loadFromStorage<RBTProfile[]>(STORAGE_KEYS.sbProfileCache, []);
  }

  if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data) {
    _sbSessions = sessionsRes.value.data.map((row) => ({
      id: row.id,
      rbtId: row.rbt_id,
      bcbaId: row.bcba_id,
      date: row.date,
      durationMinutes: row.duration_minutes,
      type: row.type as SupervisionSession['type'],
      includesDirectObservation: row.includes_direct_observation,
      topicsCovered: row.topics_covered || [],
      competenciesAssessed: row.competencies_assessed || [],
      bcbaNotes: row.bcba_notes || '',
      rbtSignature: row.rbt_signed,
      rbtSignatureDate: row.rbt_signed_at,
      bcbaSignature: row.bcba_signed,
      bcbaSignatureDate: row.bcba_signed_at,
      status: row.status as SupervisionSession['status'],
      clientId: row.client_id,
    }));
  }

  if (assessmentsRes.status === 'fulfilled' && assessmentsRes.value.data) {
    _sbAssessments = assessmentsRes.value.data.map((row) => ({
      id: row.id,
      rbtId: row.rbt_id,
      bcbaId: row.bcba_id,
      date: row.date,
      ratings: row.ratings || [],
      overallNotes: row.overall_notes || '',
      developmentPlan: row.development_plan || [],
    }));
  }

  if (hoursRes.status === 'fulfilled' && hoursRes.value.data) {
    _sbDirectHours = {};
    for (const row of hoursRes.value.data) {
      if (!_sbDirectHours[row.rbt_id]) _sbDirectHours[row.rbt_id] = {};
      _sbDirectHours[row.rbt_id][row.month] = Number(row.hours);
    }
  }

  _sbLoaded = true;
}

// ── Demo Data ───────────────────────────────────────────────────────

function getOrInitDemoData(): {
  profiles: RBTProfile[];
  sessions: SupervisionSession[];
  assessments: CompetencyAssessment[];
  directHours: Record<string, Record<string, number>>;
} {
  // Non-demo mode: return Supabase-backed cache (populated by loadRBTDataFromSupabase)
  if (!isDemoMode()) {
    return {
      profiles: _sbProfiles,
      sessions: _sbSessions,
      assessments: _sbAssessments,
      directHours: _sbDirectHours,
    };
  }

  const existing = loadFromStorage<RBTProfile[]>(STORAGE_KEYS.rbtProfiles, []);
  if (existing.length > 0) {
    return {
      profiles: existing,
      sessions: loadFromStorage<SupervisionSession[]>(STORAGE_KEYS.supervisionSessions, []),
      assessments: loadFromStorage<CompetencyAssessment[]>(STORAGE_KEYS.competencyAssessments, []),
      directHours: loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.directServiceHours, {}),
    };
  }

  // Demo mode: seed fabricated RBTs if localStorage is empty
  if (!isDemoMode()) {
    return { profiles: [], sessions: [], assessments: [], directHours: {} };
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const profiles: RBTProfile[] = [
    {
      id: 'rbt-001', name: 'Lisa Park', email: 'lisa.park@example.com',
      rbtNumber: 'RBT-2023-4521', certificationDate: '2023-06-15', renewalDate: '2026-06-15',
      supervisingBCBAId: 'bcba-001', supervisingBCBAName: 'Dr. Sarah Chen',
      state: 'AZ', hiredDate: '2023-07-01', status: 'active',
    },
    {
      id: 'rbt-002', name: 'Marcus Johnson', email: 'marcus.j@example.com',
      rbtNumber: 'RBT-2024-1187', certificationDate: '2024-02-10', renewalDate: '2027-02-10',
      supervisingBCBAId: 'bcba-001', supervisingBCBAName: 'Dr. Sarah Chen',
      state: 'AZ', hiredDate: '2024-03-01', status: 'active',
    },
    {
      id: 'rbt-003', name: 'Rachel Kim', email: 'rachel.k@example.com',
      rbtNumber: 'RBT-2024-3309', certificationDate: '2024-08-20', renewalDate: '2027-08-20',
      supervisingBCBAId: 'bcba-001', supervisingBCBAName: 'Dr. Sarah Chen',
      state: 'AZ', hiredDate: '2024-09-01', status: 'active',
    },
    {
      id: 'rbt-004', name: 'Derek Owens', email: 'derek.o@example.com',
      rbtNumber: 'RBT-2025-0044', certificationDate: '2025-01-05', renewalDate: '2028-01-05',
      supervisingBCBAId: 'bcba-001', supervisingBCBAName: 'Dr. Sarah Chen',
      state: 'AZ', hiredDate: '2025-01-15', status: 'active',
    },
  ];

  const sessions: SupervisionSession[] = [
    {
      id: 'ss-001', rbtId: 'rbt-001', bcbaId: 'bcba-001',
      date: `${thisMonth}-02`, durationMinutes: 60, type: 'individual',
      includesDirectObservation: true, topicsCovered: ['DTT procedure fidelity', 'Data collection accuracy'],
      competenciesAssessed: ['Measurement, Data Display, Interpretation', 'Skill Acquisition Programs'],
      bcbaNotes: 'Lisa showed improvement in DTT delivery. Continue monitoring prompt fading.',
      rbtSignature: true, rbtSignatureDate: `${thisMonth}-02`,
      bcbaSignature: true, bcbaSignatureDate: `${thisMonth}-02`,
      status: 'completed',
    },
    {
      id: 'ss-002', rbtId: 'rbt-001', bcbaId: 'bcba-001',
      date: `${thisMonth}-15`, durationMinutes: 45, type: 'group',
      includesDirectObservation: false, topicsCovered: ['Ethics review', 'HIPAA compliance'],
      competenciesAssessed: ['Ethics (Professional/Ethical Compliance)', 'Documentation and Reporting'],
      bcbaNotes: 'Group discussion on confidentiality protocols. Good participation.',
      rbtSignature: true, rbtSignatureDate: `${thisMonth}-15`,
      bcbaSignature: true, bcbaSignatureDate: `${thisMonth}-15`,
      status: 'completed',
    },
    {
      id: 'ss-003', rbtId: 'rbt-002', bcbaId: 'bcba-001',
      date: `${thisMonth}-05`, durationMinutes: 60, type: 'individual',
      includesDirectObservation: true, topicsCovered: ['Behavior reduction plan', 'FCT implementation'],
      competenciesAssessed: ['Behavior Reduction Programs', 'Behavior-Change Procedures (Reinforcement)'],
      bcbaNotes: 'Marcus is implementing FCT well. Needs more practice with extinction bursts.',
      rbtSignature: true, rbtSignatureDate: `${thisMonth}-05`,
      bcbaSignature: true, bcbaSignatureDate: `${thisMonth}-05`,
      status: 'completed',
    },
    {
      id: 'ss-004', rbtId: 'rbt-003', bcbaId: 'bcba-001',
      date: `${thisMonth}-08`, durationMinutes: 30, type: 'individual',
      includesDirectObservation: false, topicsCovered: ['Caregiver training strategies'],
      competenciesAssessed: ['Caregiver Training'],
      bcbaNotes: 'Reviewed parent coaching techniques. Rachel shows strong rapport.',
      rbtSignature: false, bcbaSignature: true, bcbaSignatureDate: `${thisMonth}-08`,
      status: 'pending-signatures',
    },
    {
      id: 'ss-005', rbtId: 'rbt-004', bcbaId: 'bcba-001',
      date: `${lastMonthStr}-20`, durationMinutes: 60, type: 'individual',
      includesDirectObservation: true, topicsCovered: ['Onboarding review', 'Task list orientation'],
      competenciesAssessed: ['Philosophical Underpinnings', 'Concepts and Principles'],
      bcbaNotes: 'Initial supervision for Derek. Strong academic background, needs field experience.',
      rbtSignature: true, rbtSignatureDate: `${lastMonthStr}-20`,
      bcbaSignature: true, bcbaSignatureDate: `${lastMonthStr}-20`,
      status: 'completed',
    },
  ];

  const assessments: CompetencyAssessment[] = [
    {
      id: 'ca-001', rbtId: 'rbt-001', bcbaId: 'bcba-001', date: `${lastMonthStr}-25`,
      ratings: BACB_TASK_LIST_AREAS.map((area) => ({
        areaId: area.id, areaName: area.name,
        rating: area.id <= 5 ? 4 : area.id <= 10 ? 3 : area.id <= 15 ? 4 : 3,
        notes: '', assessedDate: `${lastMonthStr}-25`,
      })),
      overallNotes: 'Lisa is progressing well. Focus on generalization strategies.',
      developmentPlan: ['Practice generalization across settings', 'Review antecedent interventions'],
    },
    {
      id: 'ca-002', rbtId: 'rbt-002', bcbaId: 'bcba-001', date: `${lastMonthStr}-28`,
      ratings: BACB_TASK_LIST_AREAS.map((area) => ({
        areaId: area.id, areaName: area.name,
        rating: area.id <= 3 ? 3 : area.id <= 8 ? 4 : area.id <= 14 ? 3 : 2,
        notes: '', assessedDate: `${lastMonthStr}-28`,
      })),
      overallNotes: 'Marcus excels at direct intervention. Documentation needs improvement.',
      developmentPlan: ['Improve session note quality', 'Practice cultural responsiveness scenarios'],
    },
  ];

  const directHours: Record<string, Record<string, number>> = {
    'rbt-001': { [thisMonth]: 84, [lastMonthStr]: 92 },
    'rbt-002': { [thisMonth]: 76, [lastMonthStr]: 80 },
    'rbt-003': { [thisMonth]: 68, [lastMonthStr]: 72 },
    'rbt-004': { [thisMonth]: 40, [lastMonthStr]: 32 },
  };

  saveToStorage(STORAGE_KEYS.rbtProfiles, profiles);
  saveToStorage(STORAGE_KEYS.supervisionSessions, sessions);
  saveToStorage(STORAGE_KEYS.competencyAssessments, assessments);
  saveToStorage(STORAGE_KEYS.directServiceHours, directHours);

  return { profiles, sessions, assessments, directHours };
}

// ── RBT Session Log Types ───────────────────────────────────────────

export interface RBTDirectSession {
  id: string;
  rbtId: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: '1:1' | 'group';
  goalsTargeted: SessionGoal[];
  dataCollected: DataCollectionEntry[];
  notes: string;
  bcbaReviewStatus: 'pending' | 'reviewed' | 'flagged';
  bcbaFlagReason?: string;
  durationMinutes: number;
}

export interface SessionGoal {
  goalId: string;
  goalName: string;
  targetBehavior: string;
  trialsCompleted?: number;
  trialsSuccessful?: number;
  intervals?: number;
  intervalsWithBehavior?: number;
  frequencyCount?: number;
  notes: string;
}

export interface DataCollectionEntry {
  type: 'trial-by-trial' | 'interval-recording' | 'frequency-count' | 'duration' | 'latency';
  label: string;
  value: number;
  total?: number;
  unit?: string;
}

// ── Core Functions ──────────────────────────────────────────────────

export function getRBTProfiles(): RBTProfile[] {
  const data = getOrInitDemoData();
  return data.profiles;
}

export function getRBTProfile(rbtId: string): RBTProfile | undefined {
  return getRBTProfiles().find((p) => p.id === rbtId);
}

export function getSupervisionSessions(rbtId?: string): SupervisionSession[] {
  const data = getOrInitDemoData();
  if (rbtId) return data.sessions.filter((s) => s.rbtId === rbtId);
  return data.sessions;
}

export function getCompetencyAssessments(rbtId?: string): CompetencyAssessment[] {
  const data = getOrInitDemoData();
  if (rbtId) return data.assessments.filter((a) => a.rbtId === rbtId);
  return data.assessments;
}

export function getDirectServiceHours(rbtId: string, month: string): number {
  const data = getOrInitDemoData();
  return data.directHours[rbtId]?.[month] ?? 0;
}

/** Sum of all recorded direct-service hours for an RBT across every month. */
export function getTotalDirectServiceHours(rbtId: string): number {
  const data = getOrInitDemoData();
  const months = data.directHours[rbtId] ?? {};
  return Object.values(months).reduce((sum, h) => sum + h, 0);
}

// ── Roster Mutations (shared by RBTManagement + SupervisionDashboard) ───────

export interface NewRBTInput {
  name: string;
  email: string;
  certificationNumber?: string;
  supervisingBCBAId: string;
}

/**
 * Adds an RBT to the current BCBA's roster.
 * Non-demo: persists to `rbt_org_assignments` (rbt_user_id stays null until the
 * invitee signs up; invite_name/invite_email keep the roster entry readable).
 * Demo: writes to the demo localStorage store.
 */
export async function saveRBTProfile(input: NewRBTInput): Promise<RBTProfile> {
  const today = new Date().toISOString().split('T')[0];

  if (isDemoMode()) {
    const profile: RBTProfile = {
      id: `rbt-${Date.now()}`,
      name: input.name,
      email: input.email,
      rbtNumber: input.certificationNumber || '',
      certificationDate: '',
      renewalDate: '',
      supervisingBCBAId: input.supervisingBCBAId,
      supervisingBCBAName: '',
      state: '',
      hiredDate: today,
      status: 'pending',
    };
    const profiles = loadFromStorage<RBTProfile[]>(STORAGE_KEYS.rbtProfiles, []);
    profiles.push(profile);
    saveToStorage(STORAGE_KEYS.rbtProfiles, profiles);
    return profile;
  }

  const basePayload: Record<string, unknown> = {
    supervising_bcba_id: input.supervisingBCBAId,
    rbt_certification_number: input.certificationNumber || null,
    hired_date: today,
    status: 'pending',
  };

  // Prefer storing the invitee's name/email on the row (migration
  // 20260702110000_rbt_invite_columns). Retry without those columns if the
  // migration hasn't been applied yet.
  let insertRes = await supabase
    .from('rbt_org_assignments')
    .insert({ ...basePayload, invite_name: input.name, invite_email: input.email.toLowerCase().trim() })
    .select()
    .single();

  if (insertRes.error && /invite_(name|email)/.test(insertRes.error.message)) {
    insertRes = await supabase
      .from('rbt_org_assignments')
      .insert(basePayload)
      .select()
      .single();
  }

  if (insertRes.error || !insertRes.data) {
    throw new Error(insertRes.error?.message || 'Failed to save RBT');
  }

  const row = insertRes.data as Record<string, unknown>;
  const profile: RBTProfile = {
    id: (row.rbt_user_id as string | null) || (row.id as string),
    name: input.name,
    email: input.email,
    rbtNumber: input.certificationNumber || '',
    certificationDate: '',
    renewalDate: '',
    supervisingBCBAId: input.supervisingBCBAId,
    supervisingBCBAName: '',
    state: (row.state as string) || '',
    hiredDate: today,
    status: 'pending',
  };

  _sbProfiles = [..._sbProfiles.filter((p) => p.id !== profile.id), profile];
  saveToStorage(STORAGE_KEYS.sbProfileCache, _sbProfiles);
  return profile;
}

/** Removes an RBT from the roster (Supabase in non-demo mode). */
export async function removeRBTProfile(rbtId: string): Promise<void> {
  if (isDemoMode()) {
    const profiles = loadFromStorage<RBTProfile[]>(STORAGE_KEYS.rbtProfiles, []);
    saveToStorage(STORAGE_KEYS.rbtProfiles, profiles.filter((p) => p.id !== rbtId));
    return;
  }

  // The roster id is either the RBT's auth user id or (for pending invites)
  // the assignment row id — match on both.
  const { error } = await supabase
    .from('rbt_org_assignments')
    .delete()
    .or(`rbt_user_id.eq.${rbtId},id.eq.${rbtId}`);

  if (error) {
    throw new Error(error.message);
  }

  _sbProfiles = _sbProfiles.filter((p) => p.id !== rbtId);
  saveToStorage(STORAGE_KEYS.sbProfileCache, _sbProfiles);
}

export function calculateSupervisionCompliance(
  rbtId: string,
  month: string
): SupervisionPeriod {
  const data = getOrInitDemoData();
  const directHours = data.directHours[rbtId]?.[month] ?? 0;
  const monthSessions = data.sessions.filter(
    (s) => s.rbtId === rbtId && s.date.startsWith(month) && s.status === 'completed'
  );

  const supervisionMinutes = monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const supervisionHours = supervisionMinutes / 60;
  const individualCount = monthSessions.filter((s) => s.type === 'individual').length;
  const groupCount = monthSessions.filter((s) => s.type === 'group').length;
  const observationCount = monthSessions.filter((s) => s.includesDirectObservation).length;
  const compliancePercent = directHours > 0 ? (supervisionHours / directHours) * 100 : 0;

  const totalContacts = monthSessions.length;
  const meetsPercentage = compliancePercent >= BACB_REQUIREMENTS.minPercentOfDirectHours;
  const meetsContacts = totalContacts >= BACB_REQUIREMENTS.minContactsPerMonth;
  const meetsIndividual = individualCount >= BACB_REQUIREMENTS.minIndividualPerMonth;
  const meetsObservation = observationCount >= BACB_REQUIREMENTS.minDirectObservationPerMonth;

  let status: SupervisionPeriod['status'] = 'compliant';
  if (!meetsPercentage || !meetsContacts || !meetsIndividual || !meetsObservation) {
    status = 'non-compliant';
  }
  if (status === 'non-compliant' && (meetsPercentage || compliancePercent >= 3)) {
    status = 'at-risk';
  }

  return {
    rbtId,
    month,
    directServiceHours: directHours,
    supervisionHoursReceived: Math.round(supervisionHours * 100) / 100,
    individualSessionCount: individualCount,
    groupSessionCount: groupCount,
    directObservationCount: observationCount,
    compliancePercent: Math.round(compliancePercent * 100) / 100,
    status,
  };
}

export function getUpcomingSupervisionDue(rbtId: string): {
  daysUntilDue: number;
  dueDate: string;
  reason: string;
} {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const compliance = calculateSupervisionCompliance(rbtId, thisMonth);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  let reason = 'Monthly supervision contact required';
  if (compliance.individualSessionCount < BACB_REQUIREMENTS.minIndividualPerMonth) {
    reason = 'Individual supervision session required this month';
  } else if (compliance.directObservationCount < BACB_REQUIREMENTS.minDirectObservationPerMonth) {
    reason = 'Direct observation session required this month';
  } else if (compliance.compliancePercent < BACB_REQUIREMENTS.minPercentOfDirectHours) {
    reason = `Supervision at ${compliance.compliancePercent.toFixed(1)}% — need ${BACB_REQUIREMENTS.minPercentOfDirectHours}%`;
  }

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dueDate = endOfMonth.toISOString().split('T')[0];

  return { daysUntilDue: daysLeft, dueDate, reason };
}

export function flagComplianceRisks(rbtId: string): ComplianceRisk[] {
  const profile = getRBTProfile(rbtId);
  if (!profile) return [];

  const risks: ComplianceRisk[] = [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const compliance = calculateSupervisionCompliance(rbtId, thisMonth);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  // Check supervision percentage
  if (compliance.compliancePercent < BACB_REQUIREMENTS.minPercentOfDirectHours) {
    risks.push({
      rbtId, rbtName: profile.name,
      type: 'supervision-percentage',
      severity: daysLeft <= 7 ? 'critical' : 'warning',
      message: `Supervision at ${compliance.compliancePercent.toFixed(1)}% (need ${BACB_REQUIREMENTS.minPercentOfDirectHours}%)`,
      daysRemaining: daysLeft,
    });
  }

  // Check individual session requirement
  if (compliance.individualSessionCount < BACB_REQUIREMENTS.minIndividualPerMonth) {
    risks.push({
      rbtId, rbtName: profile.name,
      type: 'individual-session',
      severity: daysLeft <= 10 ? 'critical' : 'warning',
      message: `Needs individual supervision session this month`,
      daysRemaining: daysLeft,
    });
  }

  // Check direct observation requirement
  if (compliance.directObservationCount < BACB_REQUIREMENTS.minDirectObservationPerMonth) {
    risks.push({
      rbtId, rbtName: profile.name,
      type: 'direct-observation',
      severity: daysLeft <= 10 ? 'critical' : 'warning',
      message: `Needs direct observation session this month`,
      daysRemaining: daysLeft,
    });
  }

  // Check contact count
  const totalContacts = compliance.individualSessionCount + compliance.groupSessionCount;
  if (totalContacts < BACB_REQUIREMENTS.minContactsPerMonth) {
    risks.push({
      rbtId, rbtName: profile.name,
      type: 'contact-count',
      severity: daysLeft <= 7 ? 'critical' : 'warning',
      message: `Only ${totalContacts} of ${BACB_REQUIREMENTS.minContactsPerMonth} required contacts completed`,
      daysRemaining: daysLeft,
    });
  }

  // Check certification expiry
  const renewalDate = new Date(profile.renewalDate);
  const daysToRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToRenewal <= 90) {
    risks.push({
      rbtId, rbtName: profile.name,
      type: 'certification-expiring',
      severity: daysToRenewal <= 30 ? 'critical' : 'warning',
      message: `RBT certification expires ${profile.renewalDate}`,
      dueDate: profile.renewalDate,
      daysRemaining: daysToRenewal,
    });
  }

  return risks;
}

export function getAllComplianceRisks(): ComplianceRisk[] {
  const profiles = getRBTProfiles();
  return profiles.flatMap((p) => flagComplianceRisks(p.id));
}

export function generateSupervisionReport(
  rbtId: string,
  startDate: string,
  endDate: string
): SupervisionReport {
  const profile = getRBTProfile(rbtId);
  if (!profile) {
    throw new Error(`RBT profile not found: ${rbtId}`);
  }

  const data = getOrInitDemoData();
  const sessions = data.sessions.filter(
    (s) => s.rbtId === rbtId && s.date >= startDate && s.date <= endDate
  );
  const assessments = data.assessments.filter(
    (a) => a.rbtId === rbtId && a.date >= startDate && a.date <= endDate
  );

  // Build monthly periods
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periods: SupervisionPeriod[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    const monthStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    periods.push(calculateSupervisionCompliance(rbtId, monthStr));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const totalDirectHours = periods.reduce((s, p) => s + p.directServiceHours, 0);
  const totalSupervisionHours = periods.reduce((s, p) => s + p.supervisionHoursReceived, 0);
  const overallCompliancePercent = totalDirectHours > 0
    ? Math.round((totalSupervisionHours / totalDirectHours) * 10000) / 100
    : 0;

  return {
    rbtId,
    rbtName: profile.name,
    rbtNumber: profile.rbtNumber,
    bcbaName: profile.supervisingBCBAName,
    startDate,
    endDate,
    periods,
    sessions,
    assessments,
    totalDirectHours,
    totalSupervisionHours,
    overallCompliancePercent,
  };
}

export function getCompetencyGaps(rbtId: string): {
  area: string;
  rating: number;
  category: string;
}[] {
  const assessments = getCompetencyAssessments(rbtId);
  if (assessments.length === 0) return [];

  const latest = assessments.sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest.ratings
    .filter((r) => r.rating <= 2)
    .map((r) => {
      const area = BACB_TASK_LIST_AREAS.find((a) => a.id === r.areaId);
      return {
        area: r.areaName,
        rating: r.rating,
        category: area?.category ?? 'Unknown',
      };
    });
}

// ── Mutation Helpers ────────────────────────────────────────────────

export function addSupervisionSession(session: SupervisionSession): void {
  if (!isDemoMode()) {
    // Write to Supabase and update in-memory cache
    supabase.from('rbt_supervision_sessions').insert({
      id: session.id,
      rbt_id: session.rbtId,
      bcba_id: session.bcbaId,
      date: session.date,
      duration_minutes: session.durationMinutes,
      type: session.type,
      includes_direct_observation: session.includesDirectObservation,
      topics_covered: session.topicsCovered,
      competencies_assessed: session.competenciesAssessed,
      bcba_notes: session.bcbaNotes,
      rbt_signed: session.rbtSignature,
      rbt_signed_at: session.rbtSignatureDate || null,
      bcba_signed: session.bcbaSignature,
      bcba_signed_at: session.bcbaSignatureDate || null,
      status: session.status,
      client_id: session.clientId || null,
    }).then(({ error }) => {
      if (error) {
        console.error('[rbt-supervision] Failed to save supervision session:', error.message);
        return;
      }
      _sbSessions.push(session);
    });
    return;
  }
  const sessions = loadFromStorage<SupervisionSession[]>(STORAGE_KEYS.supervisionSessions, []);
  sessions.push(session);
  saveToStorage(STORAGE_KEYS.supervisionSessions, sessions);
}

export function addCompetencyAssessment(assessment: CompetencyAssessment): void {
  if (!isDemoMode()) {
    supabase.from('rbt_competency_assessments').insert({
      id: assessment.id,
      rbt_id: assessment.rbtId,
      bcba_id: assessment.bcbaId,
      date: assessment.date,
      ratings: assessment.ratings,
      overall_notes: assessment.overallNotes,
      development_plan: assessment.developmentPlan,
    }).then(({ error }) => {
      if (error) {
        console.error('[rbt-supervision] Failed to save assessment:', error.message);
        return;
      }
      _sbAssessments.push(assessment);
    });
    return;
  }
  const assessments = loadFromStorage<CompetencyAssessment[]>(STORAGE_KEYS.competencyAssessments, []);
  assessments.push(assessment);
  saveToStorage(STORAGE_KEYS.competencyAssessments, assessments);
}

export function addRBTDirectSession(session: RBTDirectSession): void {
  const month = session.date.substring(0, 7);
  const addedHours = session.durationMinutes / 60;

  if (!isDemoMode()) {
    // Upsert monthly hours in Supabase
    supabase.rpc('increment_rbt_hours', {
      p_rbt_id: session.rbtId,
      p_month: month,
      p_hours: addedHours,
    }).then(() => {
      if (!_sbDirectHours[session.rbtId]) _sbDirectHours[session.rbtId] = {};
      _sbDirectHours[session.rbtId][month] = (_sbDirectHours[session.rbtId][month] ?? 0) + addedHours;
    });
    return;
  }

  const sessions = loadFromStorage<RBTDirectSession[]>(STORAGE_KEYS.rbtSessionLogs, []);
  sessions.push(session);
  saveToStorage(STORAGE_KEYS.rbtSessionLogs, sessions);

  const hours = loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.directServiceHours, {});
  if (!hours[session.rbtId]) hours[session.rbtId] = {};
  hours[session.rbtId][month] = (hours[session.rbtId][month] ?? 0) + addedHours;
  saveToStorage(STORAGE_KEYS.directServiceHours, hours);
}

export function getRBTDirectSessions(rbtId: string): RBTDirectSession[] {
  return loadFromStorage<RBTDirectSession[]>(STORAGE_KEYS.rbtSessionLogs, [])
    .filter((s) => s.rbtId === rbtId);
}

export function updateSessionBCBAReview(sessionId: string, status: 'reviewed' | 'flagged', reason?: string): void {
  if (!isDemoMode()) {
    supabase.from('rbt_supervision_sessions')
      .update({ bcba_notes: reason })
      .eq('id', sessionId)
      .then(() => {
        const idx = _sbSessions.findIndex((s) => s.id === sessionId);
        if (idx !== -1 && reason) _sbSessions[idx].bcbaNotes = reason;
      });
    return;
  }
  const sessions = loadFromStorage<RBTDirectSession[]>(STORAGE_KEYS.rbtSessionLogs, []);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx].bcbaReviewStatus = status;
    if (reason) sessions[idx].bcbaFlagReason = reason;
    saveToStorage(STORAGE_KEYS.rbtSessionLogs, sessions);
  }
}
