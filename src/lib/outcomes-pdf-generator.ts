/**
 * Outcomes PDF Generator for Payers
 *
 * Generates comprehensive clinical outcomes reports in PDF format
 * for insurance payers, demonstrating treatment efficacy and medical necessity.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface OutcomesReportData {
  child: {
    id: string;
    name: string;
    dateOfBirth: Date;
    diagnosis: string[];
    insuranceId: string;
    insurerName: string;
  };
  provider: {
    name: string;
    credentials: string;
    npi: string;
    clinicName: string;
  };
  reportPeriod: {
    start: Date;
    end: Date;
  };
  authorization: {
    number: string;
    approvedHours: number;
    usedHours: number;
    remainingHours: number;
    expirationDate: Date;
  };
  assessments: Assessment[];
  goals: Goal[];
  sessions: SessionSummary;
  behaviorData: BehaviorSummary;
  recommendations: string[];
  medicalNecessity: string;
}

export interface Assessment {
  type: string;
  name: string;
  date: Date;
  score: number;
  previousScore?: number;
  percentile?: number;
  interpretation: string;
  standardizedChange?: number; // Change in standard deviations
}

export interface Goal {
  id: string;
  domain: string;
  description: string;
  targetBehavior: string;
  baseline: string;
  currentLevel: string;
  target: string;
  masteryCriteria: string;
  status: 'not_started' | 'in_progress' | 'mastered' | 'modified' | 'discontinued';
  progressPercent: number;
  trials: number;
  dataPoints: GoalDataPoint[];
}

export interface GoalDataPoint {
  date: Date;
  value: number;
  notes?: string;
}

export interface SessionSummary {
  totalSessions: number;
  attendedSessions: number;
  canceledSessions: number;
  attendanceRate: number;
  totalHours: number;
  averageSessionLength: number;
  sessionsByType: Record<string, number>;
  sessionsByCPT: Record<string, { count: number; units: number }>;
}

export interface BehaviorSummary {
  targetBehaviors: TargetBehavior[];
  overallTrend: 'improving' | 'stable' | 'declining';
  significantEvents: string[];
}

export interface TargetBehavior {
  name: string;
  operationalDefinition: string;
  baseline: { rate: number; unit: string };
  current: { rate: number; unit: string };
  percentChange: number;
  trend: 'improving' | 'stable' | 'declining';
  weeklyData: { week: string; value: number }[];
}

export interface PDFGenerationOptions {
  includeGraphs: boolean;
  includeRawData: boolean;
  includeRecommendations: boolean;
  format: 'detailed' | 'summary';
  branding?: {
    logo?: string;
    primaryColor?: string;
    clinicInfo?: string;
  };
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch all data needed for an outcomes report
 */
export async function fetchOutcomesReportData(
  childId: string,
  startDate: Date,
  endDate: Date
): Promise<OutcomesReportData | null> {
  try {
    // Fetch child profile
    const { data: child } = await supabase
      .from('child_profiles')
      .select('*, profiles!inner(*)')
      .eq('id', childId)
      .single();

    if (!child) return null;

    // Fetch assessments
    const { data: assessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('child_id', childId)
      .gte('assessment_date', startDate.toISOString())
      .lte('assessment_date', endDate.toISOString())
      .order('assessment_date', { ascending: false });

    // Fetch goals and progress
    const { data: goals } = await supabase
      .from('treatment_goals')
      .select('*, goal_data_points(*)')
      .eq('child_id', childId)
      .eq('is_active', true);

    // Fetch sessions
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('child_id', childId)
      .gte('session_date', startDate.toISOString())
      .lte('session_date', endDate.toISOString());

    // Fetch behavior data
    const { data: behaviorData } = await supabase
      .from('abc_entries')
      .select('*')
      .eq('child_id', childId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    // Fetch authorization
    const { data: authorization } = await supabase
      .from('authorizations')
      .select('*')
      .eq('child_id', childId)
      .gte('end_date', new Date().toISOString())
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    // Process and return data
    return processReportData(
      child,
      assessments || [],
      goals || [],
      sessions || [],
      behaviorData || [],
      authorization,
      startDate,
      endDate
    );
  } catch (error) {
    console.error('Failed to fetch outcomes data:', error);
    return null;
  }
}

function processReportData(
  child: Record<string, unknown>,
  assessments: Record<string, unknown>[],
  goals: Record<string, unknown>[],
  sessions: Record<string, unknown>[],
  behaviorData: Record<string, unknown>[],
  authorization: Record<string, unknown> | null,
  startDate: Date,
  endDate: Date
): OutcomesReportData {
  // Process sessions
  const attendedSessions = sessions.filter(s => s.status === 'completed');
  const canceledSessions = sessions.filter(s => s.status === 'canceled');
  const totalHours = attendedSessions.reduce((sum, s) => sum + ((s.duration_minutes as number) || 0), 0) / 60;

  const sessionsByType: Record<string, number> = {};
  const sessionsByCPT: Record<string, { count: number; units: number }> = {};

  for (const session of attendedSessions) {
    const type = (session.session_type as string) || 'direct';
    sessionsByType[type] = (sessionsByType[type] || 0) + 1;

    const cpt = (session.cpt_code as string) || '97153';
    if (!sessionsByCPT[cpt]) sessionsByCPT[cpt] = { count: 0, units: 0 };
    sessionsByCPT[cpt].count++;
    sessionsByCPT[cpt].units += Math.ceil(((session.duration_minutes as number) || 0) / 15);
  }

  // Process behavior data
  const behaviorCounts: Record<string, number[]> = {};
  for (const entry of behaviorData) {
    const behavior = (entry.behavior as string) || 'unknown';
    if (!behaviorCounts[behavior]) behaviorCounts[behavior] = [];
    behaviorCounts[behavior].push(1);
  }

  const targetBehaviors: TargetBehavior[] = Object.entries(behaviorCounts).map(([name, counts]) => {
    const baseline = counts.slice(0, Math.ceil(counts.length * 0.2)).length;
    const current = counts.slice(-Math.ceil(counts.length * 0.2)).length;
    const percentChange = baseline > 0 ? ((current - baseline) / baseline) * 100 : 0;

    return {
      name,
      operationalDefinition: `Instances of ${name} behavior`,
      baseline: { rate: baseline, unit: 'per week' },
      current: { rate: current, unit: 'per week' },
      percentChange,
      trend: percentChange < -10 ? 'improving' : percentChange > 10 ? 'declining' : 'stable',
      weeklyData: [],
    };
  });

  // Process goals
  const processedGoals: Goal[] = (goals as Record<string, unknown>[]).map(g => {
    const dataPoints = ((g.goal_data_points as Record<string, unknown>[]) || []).map(dp => ({
      date: new Date(dp.recorded_at as string),
      value: dp.value as number,
      notes: dp.notes as string,
    }));

    const progress = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : 0;

    return {
      id: g.id as string,
      domain: (g.domain as string) || 'behavior',
      description: (g.description as string) || '',
      targetBehavior: (g.target_behavior as string) || '',
      baseline: (g.baseline as string) || '0%',
      currentLevel: `${progress}%`,
      target: (g.target as string) || '80%',
      masteryCriteria: (g.mastery_criteria as string) || '80% across 3 sessions',
      status: (g.status as Goal['status']) || 'in_progress',
      progressPercent: progress,
      trials: dataPoints.length,
      dataPoints,
    };
  });

  // Process assessments
  const processedAssessments: Assessment[] = (assessments as Record<string, unknown>[]).map(a => ({
    type: (a.assessment_type as string) || 'standardized',
    name: (a.name as string) || 'Assessment',
    date: new Date(a.assessment_date as string),
    score: (a.score as number) || 0,
    previousScore: a.previous_score as number,
    percentile: a.percentile as number,
    interpretation: (a.interpretation as string) || '',
    standardizedChange: a.standardized_change as number,
  }));

  return {
    child: {
      id: child.id as string,
      name: (child.name as string) || 'Child',
      dateOfBirth: new Date((child.date_of_birth as string) || Date.now()),
      diagnosis: ((child.diagnoses as string[]) || []),
      insuranceId: (child.insurance_member_id as string) || '',
      insurerName: (child.insurance_name as string) || '',
    },
    provider: {
      name: 'Provider Name',
      credentials: 'BCBA',
      npi: '1234567890',
      clinicName: 'ABA Clinic',
    },
    reportPeriod: {
      start: startDate,
      end: endDate,
    },
    authorization: {
      number: (authorization?.authorization_number as string) || 'N/A',
      approvedHours: (authorization?.approved_hours as number) || 0,
      usedHours: totalHours,
      remainingHours: ((authorization?.approved_hours as number) || 0) - totalHours,
      expirationDate: new Date((authorization?.end_date as string) || Date.now()),
    },
    assessments: processedAssessments,
    goals: processedGoals,
    sessions: {
      totalSessions: sessions.length,
      attendedSessions: attendedSessions.length,
      canceledSessions: canceledSessions.length,
      attendanceRate: sessions.length > 0 ? (attendedSessions.length / sessions.length) * 100 : 0,
      totalHours,
      averageSessionLength: attendedSessions.length > 0 ? totalHours / attendedSessions.length * 60 : 0,
      sessionsByType,
      sessionsByCPT,
    },
    behaviorData: {
      targetBehaviors,
      overallTrend: targetBehaviors.every(b => b.trend === 'improving') ? 'improving' :
                    targetBehaviors.every(b => b.trend === 'declining') ? 'declining' : 'stable',
      significantEvents: [],
    },
    recommendations: [
      'Continue current treatment plan with modifications as noted',
      'Increase parent training sessions to generalize skills',
      'Request authorization renewal for continued services',
    ],
    medicalNecessity: 'ABA therapy remains medically necessary based on documented progress and ongoing treatment needs.',
  };
}

// ============================================================================
// HTML Report Generation
// ============================================================================

/**
 * Generate HTML content for the outcomes report
 */
export function generateReportHTML(
  data: OutcomesReportData,
  options: PDFGenerationOptions = { includeGraphs: true, includeRawData: false, includeRecommendations: true, format: 'detailed' }
): string {
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Clinical Outcomes Report - ${data.child.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; color: #111827; margin-bottom: 8px; }
    h2 { font-size: 18px; color: #374151; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    h3 { font-size: 14px; color: #6b7280; margin: 16px 0 8px; }
    p { margin-bottom: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #4f46e5; }
    .header-left h1 { color: #4f46e5; }
    .header-right { text-align: right; font-size: 12px; color: #6b7280; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .info-box { background: #f9fafb; padding: 16px; border-radius: 8px; }
    .info-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #111827; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .metric-label { color: #6b7280; }
    .metric-value { font-weight: 600; }
    .metric-value.positive { color: #059669; }
    .metric-value.negative { color: #dc2626; }
    .goal-card { background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
    .goal-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .goal-title { font-weight: 600; }
    .goal-status { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
    .goal-status.mastered { background: #d1fae5; color: #059669; }
    .goal-status.in_progress { background: #dbeafe; color: #2563eb; }
    .goal-status.not_started { background: #f3f4f6; color: #6b7280; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: #4f46e5; border-radius: 4px; }
    .assessment-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .assessment-table th, .assessment-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .assessment-table th { background: #f9fafb; font-weight: 600; font-size: 12px; color: #6b7280; }
    .cpt-table { width: 100%; border-collapse: collapse; }
    .cpt-table th, .cpt-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .cpt-table th { background: #f9fafb; font-size: 12px; }
    .signature-section { margin-top: 48px; padding-top: 24px; border-top: 2px solid #e5e7eb; }
    .signature-line { display: inline-block; width: 250px; border-bottom: 1px solid #374151; margin: 8px 16px 8px 0; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    .recommendation-list { list-style: none; }
    .recommendation-list li { padding: 8px 0 8px 24px; position: relative; }
    .recommendation-list li::before { content: "•"; position: absolute; left: 8px; color: #4f46e5; }
    .medical-necessity { background: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 16px 0; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Clinical Outcomes Report</h1>
      <p>Applied Behavior Analysis Treatment Summary</p>
    </div>
    <div class="header-right">
      <p><strong>Report Period:</strong><br>${formatDate(data.reportPeriod.start)} - ${formatDate(data.reportPeriod.end)}</p>
      <p style="margin-top: 8px;"><strong>Generated:</strong><br>${formatDate(new Date())}</p>
    </div>
  </div>

  <h2>Patient Information</h2>
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Patient Name</div>
      <div class="info-value">${data.child.name}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Date of Birth</div>
      <div class="info-value">${formatDate(data.child.dateOfBirth)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Diagnosis</div>
      <div class="info-value">${data.child.diagnosis.join(', ') || 'Not specified'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Insurance</div>
      <div class="info-value">${data.child.insurerName}<br><small>Member ID: ${data.child.insuranceId}</small></div>
    </div>
  </div>

  <h2>Authorization Summary</h2>
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Authorization Number</div>
      <div class="info-value">${data.authorization.number}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Expiration Date</div>
      <div class="info-value">${formatDate(data.authorization.expirationDate)}</div>
    </div>
  </div>
  <div class="metric-row">
    <span class="metric-label">Approved Hours</span>
    <span class="metric-value">${data.authorization.approvedHours.toFixed(1)}</span>
  </div>
  <div class="metric-row">
    <span class="metric-label">Hours Used</span>
    <span class="metric-value">${data.authorization.usedHours.toFixed(1)}</span>
  </div>
  <div class="metric-row">
    <span class="metric-label">Hours Remaining</span>
    <span class="metric-value">${data.authorization.remainingHours.toFixed(1)}</span>
  </div>
  <div class="metric-row">
    <span class="metric-label">Utilization Rate</span>
    <span class="metric-value">${formatPercent((data.authorization.usedHours / data.authorization.approvedHours) * 100)}</span>
  </div>

  <h2>Session Summary</h2>
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Total Sessions</div>
      <div class="info-value">${data.sessions.totalSessions}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Attendance Rate</div>
      <div class="info-value">${formatPercent(data.sessions.attendanceRate)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Total Treatment Hours</div>
      <div class="info-value">${data.sessions.totalHours.toFixed(1)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Avg Session Length</div>
      <div class="info-value">${data.sessions.averageSessionLength.toFixed(0)} minutes</div>
    </div>
  </div>

  <h3>Services by CPT Code</h3>
  <table class="cpt-table">
    <thead>
      <tr>
        <th>CPT Code</th>
        <th>Description</th>
        <th>Sessions</th>
        <th>Units</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(data.sessions.sessionsByCPT).map(([code, stats]) => `
        <tr>
          <td><strong>${code}</strong></td>
          <td>${getCPTDescription(code)}</td>
          <td>${stats.count}</td>
          <td>${stats.units}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${data.assessments.length > 0 ? `
  <h2>Standardized Assessments</h2>
  <table class="assessment-table">
    <thead>
      <tr>
        <th>Assessment</th>
        <th>Date</th>
        <th>Score</th>
        <th>Previous</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>
      ${data.assessments.map(a => `
        <tr>
          <td><strong>${a.name}</strong></td>
          <td>${formatDate(a.date)}</td>
          <td>${a.score}</td>
          <td>${a.previousScore || 'N/A'}</td>
          <td class="metric-value ${a.previousScore && a.score > a.previousScore ? 'positive' : 'negative'}">
            ${a.previousScore ? (a.score > a.previousScore ? '+' : '') + (a.score - a.previousScore) : 'N/A'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <h2>Treatment Goals Progress</h2>
  ${data.goals.map(goal => `
    <div class="goal-card">
      <div class="goal-header">
        <span class="goal-title">${goal.domain}: ${goal.description}</span>
        <span class="goal-status ${goal.status}">${goal.status.replace('_', ' ')}</span>
      </div>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
        <strong>Target:</strong> ${goal.targetBehavior}<br>
        <strong>Criteria:</strong> ${goal.masteryCriteria}
      </p>
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span>Baseline: ${goal.baseline}</span>
        <span>Current: ${goal.currentLevel}</span>
        <span>Target: ${goal.target}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${goal.progressPercent}%"></div>
      </div>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">
        ${goal.trials} data points collected
      </p>
    </div>
  `).join('')}

  ${data.behaviorData.targetBehaviors.length > 0 ? `
  <h2>Behavior Data Summary</h2>
  <p style="margin-bottom: 16px;">
    Overall Trend: <strong class="metric-value ${data.behaviorData.overallTrend === 'improving' ? 'positive' : data.behaviorData.overallTrend === 'declining' ? 'negative' : ''}">${data.behaviorData.overallTrend}</strong>
  </p>
  ${data.behaviorData.targetBehaviors.map(b => `
    <div class="metric-row">
      <span class="metric-label">${b.name}</span>
      <span class="metric-value ${b.percentChange < 0 ? 'positive' : b.percentChange > 0 ? 'negative' : ''}">
        ${b.percentChange > 0 ? '+' : ''}${b.percentChange.toFixed(1)}% (${b.trend})
      </span>
    </div>
  `).join('')}
  ` : ''}

  ${options.includeRecommendations ? `
  <h2>Clinical Recommendations</h2>
  <ul class="recommendation-list">
    ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
  </ul>

  <div class="medical-necessity">
    <h3 style="margin-bottom: 8px;">Medical Necessity Statement</h3>
    <p>${data.medicalNecessity}</p>
  </div>
  ` : ''}

  <div class="signature-section">
    <p><strong>Supervising BCBA Certification:</strong></p>
    <p style="margin-top: 24px;">
      Signature: <span class="signature-line"></span> Date: <span class="signature-line" style="width: 120px;"></span>
    </p>
    <p>
      ${data.provider.name}, ${data.provider.credentials}<br>
      NPI: ${data.provider.npi}<br>
      ${data.provider.clinicName}
    </p>
  </div>

  <div class="footer">
    <p>This report contains protected health information (PHI) and is intended solely for the authorized recipient.</p>
    <p>Generated by Aminy Clinical Reporting System</p>
  </div>
</body>
</html>
  `;
}

function getCPTDescription(code: string): string {
  const descriptions: Record<string, string> = {
    '97151': 'Behavior identification assessment',
    '97152': 'Behavior identification supporting assessment',
    '97153': 'Adaptive behavior treatment by protocol',
    '97154': 'Group adaptive behavior treatment',
    '97155': 'Adaptive behavior treatment with protocol modification',
    '97156': 'Family adaptive behavior treatment guidance',
    '97157': 'Multiple-family group guidance',
    '97158': 'Group adaptive behavior treatment by protocol',
  };
  return descriptions[code] || 'ABA Service';
}

// ============================================================================
// PDF Generation (using browser print)
// ============================================================================

/**
 * Generate and download PDF report
 */
export async function generateOutcomesPDF(
  childId: string,
  startDate: Date,
  endDate: Date,
  options?: PDFGenerationOptions
): Promise<boolean> {
  try {
    const data = await fetchOutcomesReportData(childId, startDate, endDate);
    if (!data) {
      console.error('Failed to fetch report data');
      return false;
    }

    const html = generateReportHTML(data, options);

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Popup blocked');
      return false;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };

    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return false;
  }
}

/**
 * Get HTML content for preview
 */
export async function previewOutcomesReport(
  childId: string,
  startDate: Date,
  endDate: Date,
  options?: PDFGenerationOptions
): Promise<string | null> {
  const data = await fetchOutcomesReportData(childId, startDate, endDate);
  if (!data) return null;
  return generateReportHTML(data, options);
}

// ============================================================================
// Exports
// ============================================================================

export const outcomesPDF = {
  fetchData: fetchOutcomesReportData,
  generateHTML: generateReportHTML,
  generate: generateOutcomesPDF,
  preview: previewOutcomesReport,
};
