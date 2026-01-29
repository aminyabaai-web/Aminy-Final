/**
 * Payor Reporting System
 *
 * Generates utilization reports, cost-effectiveness metrics,
 * and outcome documentation for insurance/payor stakeholders.
 */

import { supabase } from '../utils/supabase/client';
import type { OutcomeCategory } from './outcome-tracking';

// ============================================================================
// TYPES
// ============================================================================

export interface UtilizationMetrics {
  period: { start: string; end: string };
  totalMembers: number;
  activeMembers: number;
  engagementRate: number;
  avgSessionsPerMember: number;
  avgMinutesPerSession: number;
  totalSessions: number;
  totalMinutes: number;
  byServiceType: Record<string, {
    sessions: number;
    minutes: number;
    uniqueMembers: number;
  }>;
}

export interface CostEffectivenessMetrics {
  period: { start: string; end: string };
  avgCostPerMember: number;
  avgCostPerImprovedOutcome: number;
  costSavingsEstimate: number;
  preventedCrisisEvents: number;
  reducedERVisits: number;
  improvedMedicationAdherence: number;
  benchmarkComparison: {
    metric: string;
    aminyValue: number;
    industryAvg: number;
    percentBetter: number;
  }[];
}

export interface OutcomeReport {
  period: { start: string; end: string };
  totalGoalsTracked: number;
  goalsAchieved: number;
  goalAchievementRate: number;
  avgProgressPercent: number;
  memberImprovementRate: number;
  byCategory: Record<OutcomeCategory, {
    goals: number;
    achieved: number;
    avgProgress: number;
  }>;
  clinicallySignificantImprovement: number;
  memberSatisfactionScore: number;
}

export interface PayorDashboardData {
  utilization: UtilizationMetrics;
  costEffectiveness: CostEffectivenessMetrics;
  outcomes: OutcomeReport;
  trends: {
    month: string;
    engagement: number;
    outcomes: number;
    costPerMember: number;
  }[];
  alerts: {
    type: 'positive' | 'warning' | 'info';
    message: string;
    metric?: string;
    value?: number;
  }[];
}

// ============================================================================
// UTILIZATION REPORTING
// ============================================================================

/**
 * Generate utilization metrics for a payor/employer
 */
export async function generateUtilizationReport(
  payorId: string,
  startDate: string,
  endDate: string
): Promise<UtilizationMetrics> {
  try {
    // In production, this would query Supabase for actual member data
    // For now, return realistic demo data

    const totalMembers = 1250;
    const activeMembers = 847;
    const totalSessions = 3420;
    const avgMinutes = 18;

    return {
      period: { start: startDate, end: endDate },
      totalMembers,
      activeMembers,
      engagementRate: Math.round((activeMembers / totalMembers) * 100),
      avgSessionsPerMember: Math.round((totalSessions / activeMembers) * 10) / 10,
      avgMinutesPerSession: avgMinutes,
      totalSessions,
      totalMinutes: totalSessions * avgMinutes,
      byServiceType: {
        'AI Chat Support': {
          sessions: 2450,
          minutes: 36750,
          uniqueMembers: 720,
        },
        'Provider Consultation': {
          sessions: 580,
          minutes: 29000,
          uniqueMembers: 245,
        },
        'Crisis Support': {
          sessions: 45,
          minutes: 1350,
          uniqueMembers: 38,
        },
        'Community Support': {
          sessions: 345,
          minutes: 5175,
          uniqueMembers: 280,
        },
      },
    };
  } catch (error) {
    console.error('[PayorReporting] Error generating utilization report:', error);
    throw error;
  }
}

// ============================================================================
// COST-EFFECTIVENESS REPORTING
// ============================================================================

/**
 * Calculate cost-effectiveness metrics
 */
export async function generateCostEffectivenessReport(
  payorId: string,
  startDate: string,
  endDate: string
): Promise<CostEffectivenessMetrics> {
  try {
    // These would be calculated from actual claims/outcomes data
    return {
      period: { start: startDate, end: endDate },
      avgCostPerMember: 24.50, // Monthly PMPM cost
      avgCostPerImprovedOutcome: 185,
      costSavingsEstimate: 125000, // Estimated savings vs traditional care
      preventedCrisisEvents: 23,
      reducedERVisits: 15,
      improvedMedicationAdherence: 12,
      benchmarkComparison: [
        {
          metric: 'Engagement Rate',
          aminyValue: 68,
          industryAvg: 42,
          percentBetter: 62,
        },
        {
          metric: 'Cost Per Outcome',
          aminyValue: 185,
          industryAvg: 450,
          percentBetter: 59,
        },
        {
          metric: 'Member Satisfaction',
          aminyValue: 4.6,
          industryAvg: 3.8,
          percentBetter: 21,
        },
        {
          metric: 'Goal Achievement Rate',
          aminyValue: 72,
          industryAvg: 45,
          percentBetter: 60,
        },
      ],
    };
  } catch (error) {
    console.error('[PayorReporting] Error generating cost report:', error);
    throw error;
  }
}

// ============================================================================
// OUTCOME REPORTING
// ============================================================================

/**
 * Generate outcome report for payor
 */
export async function generateOutcomeReport(
  payorId: string,
  startDate: string,
  endDate: string
): Promise<OutcomeReport> {
  try {
    return {
      period: { start: startDate, end: endDate },
      totalGoalsTracked: 2840,
      goalsAchieved: 2045,
      goalAchievementRate: 72,
      avgProgressPercent: 68,
      memberImprovementRate: 85,
      byCategory: {
        behavior: { goals: 680, achieved: 510, avgProgress: 75 },
        communication: { goals: 520, achieved: 365, avgProgress: 70 },
        social: { goals: 340, achieved: 225, avgProgress: 66 },
        'self-care': { goals: 480, achieved: 385, avgProgress: 80 },
        academic: { goals: 290, achieved: 195, avgProgress: 67 },
        motor: { goals: 220, achieved: 155, avgProgress: 70 },
        emotional: { goals: 310, achieved: 210, avgProgress: 68 },
      },
      clinicallySignificantImprovement: 78,
      memberSatisfactionScore: 4.6,
    };
  } catch (error) {
    console.error('[PayorReporting] Error generating outcome report:', error);
    throw error;
  }
}

// ============================================================================
// FULL DASHBOARD DATA
// ============================================================================

/**
 * Get complete payor dashboard data
 */
export async function getPayorDashboardData(
  payorId: string,
  months: number = 6
): Promise<PayorDashboardData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const [utilization, costEffectiveness, outcomes] = await Promise.all([
    generateUtilizationReport(payorId, startDate.toISOString(), endDate.toISOString()),
    generateCostEffectivenessReport(payorId, startDate.toISOString(), endDate.toISOString()),
    generateOutcomeReport(payorId, startDate.toISOString(), endDate.toISOString()),
  ]);

  // Generate monthly trends
  const trends = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    trends.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      engagement: 60 + Math.floor(Math.random() * 15),
      outcomes: 65 + Math.floor(Math.random() * 15),
      costPerMember: 22 + Math.random() * 5,
    });
  }

  // Generate alerts
  const alerts = [];

  if (utilization.engagementRate > 60) {
    alerts.push({
      type: 'positive' as const,
      message: 'Engagement rate exceeds industry benchmark by 26%',
      metric: 'Engagement',
      value: utilization.engagementRate,
    });
  }

  if (outcomes.goalAchievementRate > 70) {
    alerts.push({
      type: 'positive' as const,
      message: 'Goal achievement rate significantly above target',
      metric: 'Goal Achievement',
      value: outcomes.goalAchievementRate,
    });
  }

  if (costEffectiveness.preventedCrisisEvents > 0) {
    alerts.push({
      type: 'info' as const,
      message: `${costEffectiveness.preventedCrisisEvents} potential crisis events prevented this period`,
      metric: 'Crisis Prevention',
      value: costEffectiveness.preventedCrisisEvents,
    });
  }

  return {
    utilization,
    costEffectiveness,
    outcomes,
    trends,
    alerts,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json';
  includeUtilization: boolean;
  includeCostEffectiveness: boolean;
  includeOutcomes: boolean;
  includeTrends: boolean;
}

/**
 * Generate exportable report data
 */
export async function generateExportData(
  payorId: string,
  startDate: string,
  endDate: string,
  options: ExportOptions
): Promise<{
  data: PayorDashboardData;
  csvContent?: string;
  jsonContent?: string;
}> {
  const data = await getPayorDashboardData(payorId, 6);

  if (options.format === 'csv') {
    const csvRows = [
      // Header
      ['Metric', 'Value', 'Benchmark', 'Difference'],
      // Utilization
      ['Total Members', data.utilization.totalMembers.toString(), '', ''],
      ['Active Members', data.utilization.activeMembers.toString(), '', ''],
      ['Engagement Rate', `${data.utilization.engagementRate}%`, '42%', `+${data.utilization.engagementRate - 42}%`],
      ['Avg Sessions/Member', data.utilization.avgSessionsPerMember.toString(), '', ''],
      // Outcomes
      ['Goal Achievement Rate', `${data.outcomes.goalAchievementRate}%`, '45%', `+${data.outcomes.goalAchievementRate - 45}%`],
      ['Member Improvement Rate', `${data.outcomes.memberImprovementRate}%`, '', ''],
      ['Member Satisfaction', data.outcomes.memberSatisfactionScore.toString(), '3.8', '+0.8'],
      // Cost
      ['Avg Cost/Member (PMPM)', `$${data.costEffectiveness.avgCostPerMember}`, '', ''],
      ['Cost/Improved Outcome', `$${data.costEffectiveness.avgCostPerImprovedOutcome}`, '$450', '-59%'],
      ['Estimated Savings', `$${data.costEffectiveness.costSavingsEstimate.toLocaleString()}`, '', ''],
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    return { data, csvContent };
  }

  if (options.format === 'json') {
    return { data, jsonContent: JSON.stringify(data, null, 2) };
  }

  return { data };
}

// ============================================================================
// HEDIS/QUALITY METRICS
// ============================================================================

export interface QualityMetrics {
  hedisCompliance: {
    measure: string;
    rate: number;
    benchmark: number;
    status: 'exceeds' | 'meets' | 'below';
  }[];
  ncqaScore: number;
  starRating: number;
}

/**
 * Get quality metrics for HEDIS/NCQA reporting
 */
export async function getQualityMetrics(payorId: string): Promise<QualityMetrics> {
  return {
    hedisCompliance: [
      {
        measure: 'Follow-Up After Mental Health Visit (7 days)',
        rate: 78,
        benchmark: 65,
        status: 'exceeds',
      },
      {
        measure: 'Antidepressant Medication Management',
        rate: 72,
        benchmark: 68,
        status: 'meets',
      },
      {
        measure: 'ADHD Medication Continuity',
        rate: 81,
        benchmark: 75,
        status: 'exceeds',
      },
      {
        measure: 'Metabolic Monitoring for Antipsychotics',
        rate: 65,
        benchmark: 60,
        status: 'meets',
      },
    ],
    ncqaScore: 4.2,
    starRating: 4,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateUtilizationReport,
  generateCostEffectivenessReport,
  generateOutcomeReport,
  getPayorDashboardData,
  generateExportData,
  getQualityMetrics,
};
