/**
 * Report Builder
 * Types and utilities for building reports
 */

export type ReportType =
  | 'progress'
  | 'outcomes'
  | 'weekly'
  | 'monthly'
  | 'provider'
  | 'insurance'
  | 'behavioral'
  | 'parent'
  | 'iep'
  | 'bcba';

export interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  sections: string[];
}

export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  progress: {
    type: 'progress',
    title: 'Progress Report',
    description: 'Summary of child progress over time',
    sections: ['goals', 'milestones', 'observations'],
  },
  outcomes: {
    type: 'outcomes',
    title: 'Outcomes Report',
    description: 'Behavioral outcomes and analysis',
    sections: ['behaviors', 'interventions', 'results'],
  },
  weekly: {
    type: 'weekly',
    title: 'Weekly Summary',
    description: 'Weekly activities and achievements',
    sections: ['activities', 'highlights', 'notes'],
  },
  monthly: {
    type: 'monthly',
    title: 'Monthly Report',
    description: 'Monthly progress overview',
    sections: ['summary', 'goals', 'recommendations'],
  },
  provider: {
    type: 'provider',
    title: 'Provider Report',
    description: 'Report for healthcare providers',
    sections: ['history', 'current_status', 'plan'],
  },
  insurance: {
    type: 'insurance',
    title: 'Insurance Report',
    description: 'Report for insurance claims',
    sections: ['services', 'progress', 'medical_necessity'],
  },
  behavioral: {
    type: 'behavioral',
    title: 'Behavioral Analysis',
    description: 'Detailed behavioral data analysis',
    sections: ['data', 'patterns', 'interventions'],
  },
  parent: {
    type: 'parent',
    title: 'Parent Report',
    description: 'Summary report for parents',
    sections: ['overview', 'progress', 'recommendations'],
  },
  iep: {
    type: 'iep',
    title: 'IEP Progress Report',
    description: 'Report for IEP meetings',
    sections: ['goals', 'progress', 'accommodations'],
  },
  bcba: {
    type: 'bcba',
    title: 'BCBA Clinical Notes',
    description: 'Notes for BCBA supervision',
    sections: ['observations', 'interventions', 'data'],
  },
};

export function getReportConfig(type: ReportType): ReportConfig {
  return REPORT_CONFIGS[type];
}
