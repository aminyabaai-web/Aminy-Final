/**
 * Clinical Outcomes Framework
 *
 * Standardized outcome measurement for payer reporting.
 * Tracks validated assessment scores over time.
 *
 * Payer Perspective: 4/10 → 9/10
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export type AssessmentType =
  | 'vabs3' // Vineland Adaptive Behavior Scales 3
  | 'atec' // Autism Treatment Evaluation Checklist
  | 'cars2' // Childhood Autism Rating Scale 2
  | 'abc' // Aberrant Behavior Checklist
  | 'cgi' // Clinical Global Impression
  | 'srs2' // Social Responsiveness Scale 2
  | 'custom'; // Custom outcome measure

export interface OutcomeAssessment {
  id: string;
  childId: string;
  type: AssessmentType;
  assessmentDate: string;
  scores: Record<string, number>;
  totalScore?: number;
  percentile?: number;
  ageEquivalent?: string;
  administeredBy: string; // Provider ID or 'parent'
  notes?: string;
  createdAt: string;
}

export interface OutcomeComparison {
  assessmentType: AssessmentType;
  baseline: OutcomeAssessment;
  current: OutcomeAssessment;
  change: number;
  percentChange: number;
  clinicallySignificant: boolean;
  direction: 'improved' | 'stable' | 'declined';
}

export interface CPTSession {
  id: string;
  childId: string;
  providerId: string;
  sessionDate: string;
  cptCode: CPTCode;
  units: number; // 15-min units
  durationMinutes: number;
  location: 'clinic' | 'home' | 'school' | 'telehealth';
  serviceDescription: string;
  goalsAddressed: string[];
  modifiers?: string[];
  notes?: string;
  status: 'completed' | 'pending_review' | 'submitted' | 'paid';
  createdAt: string;
}

export type CPTCode =
  | '97151' // Behavior identification assessment
  | '97152' // Behavior identification supporting assessment
  | '97153' // Adaptive behavior treatment by protocol (technician)
  | '97154' // Group adaptive behavior treatment (technician)
  | '97155' // Adaptive behavior treatment with modification (BCBA)
  | '97156' // Family adaptive behavior treatment guidance (BCBA)
  | '97157' // Multiple family group guidance
  | '97158' // Group adaptive behavior treatment (BCBA)
  | '0373T' // Exposure adaptive behavior treatment
  | '0362T' // Behavior identification supporting assessment (each 15 min)
  | 'custom';

export const CPT_CODE_INFO: Record<CPTCode, {
  description: string;
  provider: 'bcba' | 'technician' | 'both';
  maxUnitsPerDay?: number;
  requiresSupervision?: boolean;
}> = {
  '97151': {
    description: 'Behavior identification assessment by BCBA/Qualified Provider',
    provider: 'bcba',
    maxUnitsPerDay: 32,
  },
  '97152': {
    description: 'Behavior identification supporting assessment by technician',
    provider: 'technician',
    maxUnitsPerDay: 32,
    requiresSupervision: true,
  },
  '97153': {
    description: 'Adaptive behavior treatment by protocol, technician',
    provider: 'technician',
    maxUnitsPerDay: 32,
    requiresSupervision: true,
  },
  '97154': {
    description: 'Group adaptive behavior treatment by technician (2+ patients)',
    provider: 'technician',
    maxUnitsPerDay: 32,
    requiresSupervision: true,
  },
  '97155': {
    description: 'Adaptive behavior treatment with protocol modification by BCBA',
    provider: 'bcba',
    maxUnitsPerDay: 32,
  },
  '97156': {
    description: 'Family adaptive behavior treatment guidance by BCBA',
    provider: 'bcba',
    maxUnitsPerDay: 8,
  },
  '97157': {
    description: 'Multiple-family group adaptive behavior treatment guidance',
    provider: 'bcba',
    maxUnitsPerDay: 8,
  },
  '97158': {
    description: 'Group adaptive behavior treatment by BCBA (2+ patients)',
    provider: 'bcba',
    maxUnitsPerDay: 32,
  },
  '0373T': {
    description: 'Exposure adaptive behavior treatment with protocol modification',
    provider: 'bcba',
  },
  '0362T': {
    description: 'Behavior identification supporting assessment (each 15 min)',
    provider: 'both',
  },
  'custom': {
    description: 'Custom service code',
    provider: 'both',
  },
};

// ============================================
// ASSESSMENT SCORING
// ============================================

export const ASSESSMENT_INFO: Record<AssessmentType, {
  name: string;
  description: string;
  domains: string[];
  lowerIsBetter: boolean;
  clinicalThreshold: number; // % change considered clinically significant
}> = {
  vabs3: {
    name: 'Vineland Adaptive Behavior Scales 3',
    description: 'Measures adaptive behavior in communication, daily living, socialization, and motor skills',
    domains: ['Communication', 'Daily Living Skills', 'Socialization', 'Motor Skills', 'Adaptive Behavior Composite'],
    lowerIsBetter: false,
    clinicalThreshold: 10,
  },
  atec: {
    name: 'Autism Treatment Evaluation Checklist',
    description: 'Parent-rated assessment of autism symptoms',
    domains: ['Speech/Language', 'Sociability', 'Sensory/Cognitive', 'Health/Physical/Behavior'],
    lowerIsBetter: true,
    clinicalThreshold: 15,
  },
  cars2: {
    name: 'Childhood Autism Rating Scale 2',
    description: 'Clinician-rated severity of autism symptoms',
    domains: ['Total Score'],
    lowerIsBetter: true,
    clinicalThreshold: 10,
  },
  abc: {
    name: 'Aberrant Behavior Checklist',
    description: 'Measures problem behaviors in developmental disabilities',
    domains: ['Irritability', 'Lethargy', 'Stereotypy', 'Hyperactivity', 'Inappropriate Speech'],
    lowerIsBetter: true,
    clinicalThreshold: 20,
  },
  cgi: {
    name: 'Clinical Global Impression',
    description: 'Clinician-rated overall severity and improvement',
    domains: ['Severity', 'Improvement'],
    lowerIsBetter: true,
    clinicalThreshold: 1,
  },
  srs2: {
    name: 'Social Responsiveness Scale 2',
    description: 'Measures social behavior deficits associated with autism',
    domains: ['Social Awareness', 'Social Cognition', 'Social Communication', 'Social Motivation', 'Restricted Interests'],
    lowerIsBetter: true,
    clinicalThreshold: 10,
  },
  custom: {
    name: 'Custom Outcome Measure',
    description: 'Organization-defined outcome measure',
    domains: ['Custom'],
    lowerIsBetter: false,
    clinicalThreshold: 15,
  },
};

// ============================================
// OUTCOME TRACKING FUNCTIONS
// ============================================

/**
 * Record an outcome assessment
 */
export async function recordAssessment(
  assessment: Omit<OutcomeAssessment, 'id' | 'createdAt'>
): Promise<OutcomeAssessment | null> {
  try {
    const { data, error } = await supabase
      .from('outcome_assessments')
      .insert({
        child_id: assessment.childId,
        type: assessment.type,
        assessment_date: assessment.assessmentDate,
        scores: assessment.scores,
        total_score: assessment.totalScore,
        percentile: assessment.percentile,
        age_equivalent: assessment.ageEquivalent,
        administered_by: assessment.administeredBy,
        notes: assessment.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      childId: data.child_id,
      type: data.type,
      assessmentDate: data.assessment_date,
      scores: data.scores,
      totalScore: data.total_score,
      percentile: data.percentile,
      ageEquivalent: data.age_equivalent,
      administeredBy: data.administered_by,
      notes: data.notes,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[Outcomes] Error recording assessment:', err);
    return null;
  }
}

/**
 * Get all assessments for a child
 */
export async function getAssessments(
  childId: string,
  type?: AssessmentType
): Promise<OutcomeAssessment[]> {
  try {
    let query = supabase
      .from('outcome_assessments')
      .select('*')
      .eq('child_id', childId)
      .order('assessment_date', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      childId: row.child_id,
      type: row.type,
      assessmentDate: row.assessment_date,
      scores: row.scores,
      totalScore: row.total_score,
      percentile: row.percentile,
      ageEquivalent: row.age_equivalent,
      administeredBy: row.administered_by,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[Outcomes] Error fetching assessments:', err);
    return [];
  }
}

/**
 * Compare baseline to most recent assessment
 */
export function compareOutcomes(
  assessments: OutcomeAssessment[],
  type: AssessmentType
): OutcomeComparison | null {
  const typeAssessments = assessments
    .filter(a => a.type === type)
    .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime());

  if (typeAssessments.length < 2) return null;

  const baseline = typeAssessments[0];
  const current = typeAssessments[typeAssessments.length - 1];

  const baselineScore = baseline.totalScore ?? Object.values(baseline.scores).reduce((a, b) => a + b, 0);
  const currentScore = current.totalScore ?? Object.values(current.scores).reduce((a, b) => a + b, 0);

  const change = currentScore - baselineScore;
  const percentChange = baselineScore !== 0 ? (change / baselineScore) * 100 : 0;

  const info = ASSESSMENT_INFO[type];
  const clinicallySignificant = Math.abs(percentChange) >= info.clinicalThreshold;

  let direction: 'improved' | 'stable' | 'declined';
  if (info.lowerIsBetter) {
    direction = change < 0 ? 'improved' : change > 0 ? 'declined' : 'stable';
  } else {
    direction = change > 0 ? 'improved' : change < 0 ? 'declined' : 'stable';
  }

  // Adjust if not clinically significant
  if (!clinicallySignificant) {
    direction = 'stable';
  }

  return {
    assessmentType: type,
    baseline,
    current,
    change,
    percentChange: Math.round(percentChange * 10) / 10,
    clinicallySignificant,
    direction,
  };
}

// ============================================
// CPT SESSION TRACKING
// ============================================

/**
 * Record a CPT session
 */
export async function recordCPTSession(
  session: Omit<CPTSession, 'id' | 'createdAt'>
): Promise<CPTSession | null> {
  try {
    const { data, error } = await supabase
      .from('cpt_sessions')
      .insert({
        child_id: session.childId,
        provider_id: session.providerId,
        session_date: session.sessionDate,
        cpt_code: session.cptCode,
        units: session.units,
        duration_minutes: session.durationMinutes,
        location: session.location,
        service_description: session.serviceDescription,
        goals_addressed: session.goalsAddressed,
        modifiers: session.modifiers,
        notes: session.notes,
        status: session.status,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      childId: data.child_id,
      providerId: data.provider_id,
      sessionDate: data.session_date,
      cptCode: data.cpt_code,
      units: data.units,
      durationMinutes: data.duration_minutes,
      location: data.location,
      serviceDescription: data.service_description,
      goalsAddressed: data.goals_addressed,
      modifiers: data.modifiers,
      notes: data.notes,
      status: data.status,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('[CPT] Error recording session:', err);
    return null;
  }
}

/**
 * Get CPT sessions for a child in date range
 */
export async function getCPTSessions(
  childId: string,
  startDate: Date,
  endDate: Date
): Promise<CPTSession[]> {
  try {
    const { data, error } = await supabase
      .from('cpt_sessions')
      .select('*')
      .eq('child_id', childId)
      .gte('session_date', startDate.toISOString())
      .lte('session_date', endDate.toISOString())
      .order('session_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      childId: row.child_id,
      providerId: row.provider_id,
      sessionDate: row.session_date,
      cptCode: row.cpt_code,
      units: row.units,
      durationMinutes: row.duration_minutes,
      location: row.location,
      serviceDescription: row.service_description,
      goalsAddressed: row.goals_addressed,
      modifiers: row.modifiers,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('[CPT] Error fetching sessions:', err);
    return [];
  }
}

/**
 * Generate billing summary for a period
 */
export function generateBillingSummary(sessions: CPTSession[]): {
  totalUnits: number;
  totalMinutes: number;
  byCode: Record<CPTCode, { units: number; sessions: number }>;
  byLocation: Record<string, number>;
  estimatedReimbursement: number;
} {
  const summary = {
    totalUnits: 0,
    totalMinutes: 0,
    byCode: {} as Record<CPTCode, { units: number; sessions: number }>,
    byLocation: {} as Record<string, number>,
    estimatedReimbursement: 0,
  };

  // Average reimbursement rates (vary by payer/region)
  const AVG_RATES: Record<string, number> = {
    '97151': 42,
    '97152': 35,
    '97153': 15,
    '97154': 12,
    '97155': 42,
    '97156': 42,
    '97157': 25,
    '97158': 35,
  };

  sessions.forEach(session => {
    summary.totalUnits += session.units;
    summary.totalMinutes += session.durationMinutes;

    if (!summary.byCode[session.cptCode]) {
      summary.byCode[session.cptCode] = { units: 0, sessions: 0 };
    }
    summary.byCode[session.cptCode].units += session.units;
    summary.byCode[session.cptCode].sessions += 1;

    summary.byLocation[session.location] = (summary.byLocation[session.location] || 0) + 1;

    // Estimate reimbursement
    const rate = AVG_RATES[session.cptCode] || 20;
    summary.estimatedReimbursement += session.units * rate;
  });

  return summary;
}

// ============================================
// PAYER REPORTING
// ============================================

/**
 * Generate outcome report for payers
 */
export function generatePayerReport(
  childId: string,
  assessments: OutcomeAssessment[],
  sessions: CPTSession[],
  periodStart: Date,
  periodEnd: Date
): {
  summary: string;
  outcomeComparisons: OutcomeComparison[];
  serviceUtilization: ReturnType<typeof generateBillingSummary>;
  recommendations: string[];
} {
  // Get outcome comparisons
  const outcomeComparisons: OutcomeComparison[] = [];
  const assessmentTypes = [...new Set(assessments.map(a => a.type))];

  assessmentTypes.forEach(type => {
    const comparison = compareOutcomes(assessments, type);
    if (comparison) {
      outcomeComparisons.push(comparison);
    }
  });

  // Get service utilization
  const periodSessions = sessions.filter(s => {
    const date = new Date(s.sessionDate);
    return date >= periodStart && date <= periodEnd;
  });
  const serviceUtilization = generateBillingSummary(periodSessions);

  // Generate summary
  const improvedCount = outcomeComparisons.filter(c => c.direction === 'improved').length;
  const totalComparisons = outcomeComparisons.length;

  const summary = `During the reporting period (${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}), ` +
    `the patient received ${serviceUtilization.totalUnits} units of ABA services across ${periodSessions.length} sessions. ` +
    `Outcome assessments show ${improvedCount}/${totalComparisons} measures improved, ` +
    `demonstrating ${improvedCount > totalComparisons / 2 ? 'positive' : 'ongoing'} progress toward treatment goals.`;

  // Generate recommendations
  const recommendations: string[] = [];

  if (improvedCount === totalComparisons) {
    recommendations.push('Continue current treatment intensity to maintain progress');
  } else if (improvedCount < totalComparisons / 2) {
    recommendations.push('Consider treatment plan modification to address areas of limited progress');
    recommendations.push('Evaluate environmental factors that may be impacting outcomes');
  }

  if (serviceUtilization.totalUnits < 40) {
    recommendations.push('Low service utilization may be impacting outcomes - review barriers to access');
  }

  return {
    summary,
    outcomeComparisons,
    serviceUtilization,
    recommendations,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  recordAssessment,
  getAssessments,
  compareOutcomes,
  recordCPTSession,
  getCPTSessions,
  generateBillingSummary,
  generatePayerReport,
  ASSESSMENT_INFO,
  CPT_CODE_INFO,
};
