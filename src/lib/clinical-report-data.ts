/**
 * Clinical Report Data — Real Supabase Queries
 *
 * Replaces getDemoClinicalReportData() with real data from Supabase tables:
 *   children, treatment_goals, screening_results
 *
 * Falls back gracefully: fields without real data show "Not yet tracked"
 * rather than fictional demo data.
 */

import { dataService } from './supabase-data';
import type { Child, TreatmentGoal, ScreeningResult } from './supabase-data';
import type {
  ClinicalReportData,
  ClinicalGoal,
  ClinicalAssessment,
} from './clinical-report-demo-data';
import type { ConditionType } from './child-profiles';

// ============================================================================
// Mappers — Supabase rows → ClinicalReportData shapes
// ============================================================================

function mapChildToReport(child: Child, parentName: string): ClinicalReportData['child'] {
  const nameParts = child.name.trim().split(/\s+/);
  const firstName = nameParts[0] || child.name;
  const lastName = nameParts.slice(1).join(' ') || '';

  const age = child.age_years ?? (child.date_of_birth
    ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0);

  // Map string[] diagnoses to ConditionType[] (best-effort match)
  const conditionMap: Record<string, ConditionType> = {
    autism: 'autism', asd: 'autism', 'autism spectrum': 'autism',
    adhd: 'adhd', 'attention deficit': 'adhd',
    anxiety: 'anxiety',
    'sensory processing': 'sensory-processing', spd: 'sensory-processing',
    'speech delay': 'speech-delay', 'speech disorder': 'speech-delay',
    'developmental delay': 'developmental-delay',
    'learning disability': 'learning-disability',
    ocd: 'ocd',
    depression: 'depression',
  };

  const conditions: ConditionType[] = (child.diagnoses || []).map(d => {
    const lower = d.toLowerCase().trim();
    return conditionMap[lower] || 'other';
  });

  // Extract school info from JSON column
  const si = (child.school_info || {}) as Record<string, unknown>;

  return {
    firstName,
    lastName,
    dateOfBirth: child.date_of_birth || 'Unknown',
    age,
    gender: child.gender || 'Not specified',
    conditions,
    primaryDiagnosis: (child.diagnoses || [])[0] || 'Not yet diagnosed',
    diagnosisDate: 'Not recorded',
    diagnosingProvider: 'Not recorded',
    medications: [], // No medications table yet — empty is honest
    schoolInfo: {
      schoolName: (si.schoolName as string) || (si.school_name as string) || 'Not recorded',
      grade: (si.grade as string) || 'Not recorded',
      hasIEP: (si.hasIEP as boolean) ?? (si.has_iep as boolean) ?? false,
      has504: (si.has504 as boolean) ?? (si.has_504 as boolean) ?? false,
      specialEducation: (si.specialEducation as boolean) ?? (si.special_education as boolean) ?? false,
      mainContact: (si.mainContact as string) || (si.main_contact as string) || undefined,
      notes: (si.notes as string) || undefined,
    },
  };
}

function mapGoalsToClinical(goals: TreatmentGoal[]): ClinicalGoal[] {
  return goals.map(g => ({
    id: g.id,
    domain: g.domain || 'General',
    title: g.title,
    description: g.description || '',
    baseline: g.baseline,
    current: g.current,
    target: g.target,
    masteryCriteria: `${g.target}% across consecutive sessions`,
    status: (g.status as ClinicalGoal['status']) || 'in_progress',
    dataPoints: 0, // No data_points column yet
    trendDirection: g.trend_direction || 'stable',
    startDate: g.created_at.split('T')[0],
  }));
}

function mapScreeningsToClinical(screenings: ScreeningResult[]): ClinicalAssessment[] {
  return screenings.map(s => ({
    type: s.instrument_id as ClinicalAssessment['type'],
    name: s.instrument_name,
    date: (s.completed_at || s.created_at).split('T')[0],
    score: s.total_score,
    interpretation: `${s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1)} risk — ${s.summary}`,
  }));
}

// ============================================================================
// Main: Build report from real Supabase data
// ============================================================================

export async function getClinicalReportData(
  childId?: string
): Promise<ClinicalReportData> {
  // Fetch real data in parallel
  const [profile, children, goals, screenings] = await Promise.all([
    dataService.getProfile(),
    dataService.getChildren(),
    dataService.getTreatmentGoals(childId),
    dataService.getScreeningResults(),
  ]);

  // Pick the right child
  const child = childId
    ? children.find(c => c.id === childId)
    : children.find(c => c.is_primary) ?? children[0];

  const parentName = profile?.parent_name || 'Parent';
  const today = new Date().toISOString().split('T')[0];

  // If no child profile exists, return a minimal report structure
  if (!child) {
    return buildEmptyReport(parentName, today);
  }

  // Filter screenings for this child (if child_id is set), otherwise all
  const childScreenings = childId
    ? screenings.filter(s => s.child_id === childId || !s.child_id)
    : screenings;

  // Filter goals for this child
  const childGoals = childId
    ? goals.filter(g => g.child_id === childId || !g.child_id)
    : goals;

  const clinicalGoals = mapGoalsToClinical(childGoals);
  const clinicalAssessments = mapScreeningsToClinical(childScreenings);

  // Calculate a 90-day report period ending today
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 90);

  return {
    child: mapChildToReport(child, parentName),

    // Provider info — empty until provider portal is wired
    reportingProvider: {
      name: 'Not assigned',
      credentials: '',
      licenseNumber: '',
      npi: '',
      clinicName: '',
      clinicAddress: '',
      clinicPhone: '',
    },

    reportPeriod: {
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
    },
    reportDate: today,

    treatmentPlan: {
      startDate: clinicalGoals.length > 0
        ? clinicalGoals[clinicalGoals.length - 1].startDate
        : today,
      approvedHoursPerWeek: 0,
      currentServiceLevel: 'Not yet determined',
      goals: clinicalGoals,
    },

    // Behavioral data — no table yet, honest empty state
    behaviorData: {
      abcSummary: [],
      targetBehaviors: [],
      overallTrend: 'stable',
    },

    assessments: clinicalAssessments,

    // Session data — no session tracking yet
    sessions: {
      totalSessions: 0,
      attendedSessions: 0,
      canceledByFamily: 0,
      canceledByProvider: 0,
      attendanceRate: 0,
      totalHours: 0,
      hoursByType: {},
      sessionsByCPT: {},
    },

    // Parent observations — could pull from AI memory in the future
    parentReport: {
      concerns: [],
      wins: [],
      homeEnvironmentNotes: '',
      medicationChanges: 'No medications tracked yet.',
      recentLifeEvents: '',
    },

    recommendations: clinicalGoals.length > 0
      ? ['Continue monitoring treatment goals and update progress regularly.']
      : ['Complete initial screening assessments to establish baseline.', 'Set up treatment goals with your provider.'],
  };
}

// ============================================================================
// Empty report for users with no child profile
// ============================================================================

function buildEmptyReport(parentName: string, today: string): ClinicalReportData {
  return {
    child: {
      firstName: 'Child',
      lastName: '',
      dateOfBirth: 'Not recorded',
      age: 0,
      gender: 'Not specified',
      conditions: [],
      primaryDiagnosis: 'Not yet diagnosed',
      diagnosisDate: '',
      diagnosingProvider: '',
      medications: [],
      schoolInfo: {
        schoolName: 'Not recorded',
        grade: '',
        hasIEP: false,
        has504: false,
        specialEducation: false,
      },
    },
    reportingProvider: {
      name: 'Not assigned',
      credentials: '',
      licenseNumber: '',
      npi: '',
      clinicName: '',
      clinicAddress: '',
      clinicPhone: '',
    },
    reportPeriod: { start: today, end: today },
    reportDate: today,
    treatmentPlan: {
      startDate: today,
      approvedHoursPerWeek: 0,
      currentServiceLevel: 'Not started',
      goals: [],
    },
    behaviorData: { abcSummary: [], targetBehaviors: [], overallTrend: 'stable' },
    assessments: [],
    sessions: {
      totalSessions: 0, attendedSessions: 0, canceledByFamily: 0,
      canceledByProvider: 0, attendanceRate: 0, totalHours: 0,
      hoursByType: {}, sessionsByCPT: {},
    },
    parentReport: {
      concerns: [], wins: [],
      homeEnvironmentNotes: '', medicationChanges: '', recentLifeEvents: '',
    },
    recommendations: [
      'Add your child\'s profile to get started.',
      'Complete a screening assessment to establish baseline.',
    ],
  };
}
