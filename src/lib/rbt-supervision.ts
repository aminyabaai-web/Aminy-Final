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

const STORAGE_KEYS = {
  rbtProfiles: 'aminy_rbt_profiles',
  supervisionSessions: 'aminy_supervision_sessions',
  competencyAssessments: 'aminy_competency_assessments',
  directServiceHours: 'aminy_rbt_direct_hours',
  rbtSessionLogs: 'aminy_rbt_session_logs',
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

// ── Demo Data ───────────────────────────────────────────────────────

function getOrInitDemoData(): {
  profiles: RBTProfile[];
  sessions: SupervisionSession[];
  assessments: CompetencyAssessment[];
  directHours: Record<string, Record<string, number>>;
} {
  const existing = loadFromStorage<RBTProfile[]>(STORAGE_KEYS.rbtProfiles, []);
  if (existing.length > 0) {
    return {
      profiles: existing,
      sessions: loadFromStorage<SupervisionSession[]>(STORAGE_KEYS.supervisionSessions, []),
      assessments: loadFromStorage<CompetencyAssessment[]>(STORAGE_KEYS.competencyAssessments, []),
      directHours: loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.directServiceHours, {}),
    };
  }

  // Real BCBAs start with an empty roster — never seed fabricated RBTs
  // (Lisa Park, etc.). The sample supervision dataset is demo-mode only.
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
  const sessions = loadFromStorage<SupervisionSession[]>(STORAGE_KEYS.supervisionSessions, []);
  sessions.push(session);
  saveToStorage(STORAGE_KEYS.supervisionSessions, sessions);
}

export function addCompetencyAssessment(assessment: CompetencyAssessment): void {
  const assessments = loadFromStorage<CompetencyAssessment[]>(STORAGE_KEYS.competencyAssessments, []);
  assessments.push(assessment);
  saveToStorage(STORAGE_KEYS.competencyAssessments, assessments);
}

export function addRBTDirectSession(session: RBTDirectSession): void {
  const sessions = loadFromStorage<RBTDirectSession[]>(STORAGE_KEYS.rbtSessionLogs, []);
  sessions.push(session);
  saveToStorage(STORAGE_KEYS.rbtSessionLogs, sessions);

  // Update direct hours
  const month = session.date.substring(0, 7);
  const hours = loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.directServiceHours, {});
  if (!hours[session.rbtId]) hours[session.rbtId] = {};
  hours[session.rbtId][month] = (hours[session.rbtId][month] ?? 0) + session.durationMinutes / 60;
  saveToStorage(STORAGE_KEYS.directServiceHours, hours);
}

export function getRBTDirectSessions(rbtId: string): RBTDirectSession[] {
  return loadFromStorage<RBTDirectSession[]>(STORAGE_KEYS.rbtSessionLogs, [])
    .filter((s) => s.rbtId === rbtId);
}

export function updateSessionBCBAReview(sessionId: string, status: 'reviewed' | 'flagged', reason?: string): void {
  const sessions = loadFromStorage<RBTDirectSession[]>(STORAGE_KEYS.rbtSessionLogs, []);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx].bcbaReviewStatus = status;
    if (reason) sessions[idx].bcbaFlagReason = reason;
    saveToStorage(STORAGE_KEYS.rbtSessionLogs, sessions);
  }
}
