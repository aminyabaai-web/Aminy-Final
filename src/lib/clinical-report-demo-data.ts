/**
 * Clinical Report Demo Data
 *
 * Realistic mock clinical scenario for generating demo PDF reports.
 * Uses existing type definitions from child-profiles.ts and clinical-outcomes.ts.
 */

import type { ConditionType, Medication, SchoolInfo } from './child-profiles';
import type { AssessmentType } from './clinical-outcomes';

// ============================================================================
// Types
// ============================================================================

export interface ClinicalGoal {
  id: string;
  domain: string;
  title: string;
  description: string;
  baseline: number;
  current: number;
  target: number;
  masteryCriteria: string;
  status: 'not_started' | 'in_progress' | 'mastered' | 'modified' | 'discontinued';
  dataPoints: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  startDate: string;
}

export interface ClinicalAssessment {
  type: AssessmentType;
  name: string;
  date: string;
  score: number;
  previousScore?: number;
  previousDate?: string;
  percentile?: number;
  interpretation: string;
  change?: number;
}

export interface ABCSummary {
  antecedent: string;
  percentage: number;
}

export interface TargetBehaviorData {
  name: string;
  operationalDefinition: string;
  baselineRate: number;
  currentRate: number;
  unit: string;
  percentChange: number;
  trend: 'improving' | 'stable' | 'declining';
  weeklyData: number[];
}

export interface ClinicalReportData {
  child: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: number;
    gender: string;
    conditions: ConditionType[];
    primaryDiagnosis: string;
    diagnosisDate: string;
    diagnosingProvider: string;
    medications: Medication[];
    schoolInfo: SchoolInfo;
  };
  reportingProvider: {
    name: string;
    credentials: string;
    licenseNumber: string;
    npi: string;
    clinicName: string;
    clinicAddress: string;
    clinicPhone: string;
    supervisorName?: string;
    supervisorCredentials?: string;
  };
  reportPeriod: { start: string; end: string };
  reportDate: string;
  treatmentPlan: {
    startDate: string;
    approvedHoursPerWeek: number;
    currentServiceLevel: string;
    goals: ClinicalGoal[];
  };
  behaviorData: {
    abcSummary: ABCSummary[];
    targetBehaviors: TargetBehaviorData[];
    overallTrend: 'improving' | 'stable' | 'declining';
  };
  assessments: ClinicalAssessment[];
  sessions: {
    totalSessions: number;
    attendedSessions: number;
    canceledByFamily: number;
    canceledByProvider: number;
    attendanceRate: number;
    totalHours: number;
    hoursByType: Record<string, number>;
    sessionsByCPT: Record<string, { count: number; units: number; description: string }>;
  };
  parentReport: {
    concerns: string[];
    wins: string[];
    homeEnvironmentNotes: string;
    medicationChanges: string;
    recentLifeEvents: string;
  };
  recommendations: string[];
}

// ============================================================================
// Demo Data
// ============================================================================

export function getDemoClinicalReportData(): ClinicalReportData {
  return {
    child: {
      firstName: 'Eddie',
      lastName: 'Rodriguez',
      dateOfBirth: '2019-08-14',
      age: 6,
      gender: 'Male',
      conditions: ['autism', 'adhd', 'sensory-processing'],
      primaryDiagnosis: 'F84.0 — Autism Spectrum Disorder, Level 2',
      diagnosisDate: '2022-03-10',
      diagnosingProvider: 'Dr. Mariana Torres, MD (Dev. Pediatrician)',
      medications: [
        {
          id: 'med-1',
          name: 'Methylphenidate (Concerta)',
          dosage: '18mg',
          frequency: 'Once daily, morning',
          prescribedBy: 'Dr. Mariana Torres',
          startDate: '2024-09-01',
          purpose: 'ADHD — attention and impulse control',
        },
        {
          id: 'med-2',
          name: 'Melatonin',
          dosage: '3mg',
          frequency: 'Nightly, 30 min before bed',
          prescribedBy: 'Dr. Mariana Torres',
          startDate: '2023-06-15',
          purpose: 'Sleep onset support',
        },
      ],
      schoolInfo: {
        schoolName: 'Riverside Elementary',
        grade: 'Kindergarten',
        hasIEP: true,
        has504: false,
        specialEducation: true,
        mainContact: 'Ms. Jennifer Walsh (SPED Coordinator)',
        notes: 'Mainstreamed with 1:1 aide support, pull-out services for speech 2x/week',
      },
    },

    reportingProvider: {
      name: 'Amanda Chen',
      credentials: 'BCBA, LBA',
      licenseNumber: 'BACB-1-22-54821',
      npi: '1234567890',
      clinicName: 'Bright Futures ABA',
      clinicAddress: '1200 Wellness Dr, Suite 300, Austin, TX 78701',
      clinicPhone: '(512) 555-0142',
      supervisorName: 'Dr. Rachel Kim',
      supervisorCredentials: 'BCBA-D, PhD',
    },

    reportPeriod: {
      start: '2025-09-01',
      end: '2025-11-30',
    },
    reportDate: new Date().toISOString().split('T')[0],

    treatmentPlan: {
      startDate: '2025-01-15',
      approvedHoursPerWeek: 20,
      currentServiceLevel: 'Comprehensive ABA (20 hrs/wk direct + 2 hrs supervision + 1 hr parent training)',
      goals: [
        {
          id: 'g-1',
          domain: 'Communication',
          title: 'Functional Requesting',
          description: 'Eddie will independently request preferred items/activities using 3+ word sentences across settings.',
          baseline: 15,
          current: 62,
          target: 80,
          masteryCriteria: '80% across 3 consecutive sessions in 2+ settings',
          status: 'in_progress',
          dataPoints: 36,
          trendDirection: 'improving',
          startDate: '2025-01-15',
        },
        {
          id: 'g-2',
          domain: 'Social Skills',
          title: 'Cooperative Play',
          description: 'Eddie will engage in cooperative play with a peer for 5+ minutes with no more than 1 prompt.',
          baseline: 8,
          current: 45,
          target: 80,
          masteryCriteria: '80% of opportunities across 3 consecutive sessions',
          status: 'in_progress',
          dataPoints: 28,
          trendDirection: 'improving',
          startDate: '2025-02-01',
        },
        {
          id: 'g-3',
          domain: 'Self-Care',
          title: 'Independent Handwashing',
          description: 'Eddie will independently complete all steps of handwashing routine without prompts.',
          baseline: 30,
          current: 85,
          target: 90,
          masteryCriteria: '90% independence across 5 consecutive days',
          status: 'in_progress',
          dataPoints: 42,
          trendDirection: 'improving',
          startDate: '2025-01-15',
        },
        {
          id: 'g-4',
          domain: 'Behavior Reduction',
          title: 'Elopement Reduction',
          description: 'Reduce instances of elopement (leaving designated area without permission) during structured activities.',
          baseline: 85,
          current: 35,
          target: 10,
          masteryCriteria: '<2 incidents per week across 4 consecutive weeks',
          status: 'in_progress',
          dataPoints: 48,
          trendDirection: 'improving',
          startDate: '2025-01-15',
        },
        {
          id: 'g-5',
          domain: 'Academic Readiness',
          title: 'Seated Engagement',
          description: 'Eddie will remain seated and engaged in a structured academic task for 10+ minutes.',
          baseline: 20,
          current: 55,
          target: 80,
          masteryCriteria: '80% of intervals across 3 consecutive sessions',
          status: 'in_progress',
          dataPoints: 32,
          trendDirection: 'stable',
          startDate: '2025-03-01',
        },
      ],
    },

    behaviorData: {
      abcSummary: [
        { antecedent: 'Demand/Task Presented', percentage: 38 },
        { antecedent: 'Transition Between Activities', percentage: 25 },
        { antecedent: 'Denied Access to Preferred Item', percentage: 18 },
        { antecedent: 'Sensory Overload', percentage: 12 },
        { antecedent: 'Unexpected Change in Routine', percentage: 7 },
      ],
      targetBehaviors: [
        {
          name: 'Elopement',
          operationalDefinition: 'Leaving the designated area (>3 feet from boundary) without adult permission during structured activities.',
          baselineRate: 8.2,
          currentRate: 3.1,
          unit: 'incidents/week',
          percentChange: -62.2,
          trend: 'improving',
          weeklyData: [8, 7, 9, 6, 7, 5, 4, 5, 3, 4, 3, 2],
        },
        {
          name: 'Tantrums',
          operationalDefinition: 'Crying, screaming, or throwing body on floor lasting >30 seconds, not related to pain/illness.',
          baselineRate: 5.5,
          currentRate: 2.8,
          unit: 'incidents/week',
          percentChange: -49.1,
          trend: 'improving',
          weeklyData: [6, 5, 6, 4, 5, 3, 4, 3, 3, 2, 3, 2],
        },
        {
          name: 'Noncompliance',
          operationalDefinition: 'Failure to initiate a requested task within 10 seconds of instruction, following 2 prompts.',
          baselineRate: 12.0,
          currentRate: 7.5,
          unit: 'incidents/week',
          percentChange: -37.5,
          trend: 'improving',
          weeklyData: [12, 11, 13, 10, 9, 10, 8, 9, 7, 8, 7, 6],
        },
        {
          name: 'Vocal Stereotypy',
          operationalDefinition: 'Repetitive non-functional vocalizations (scripting, echolalia) lasting >5 seconds during instruction.',
          baselineRate: 15.0,
          currentRate: 13.2,
          unit: 'incidents/week',
          percentChange: -12.0,
          trend: 'stable',
          weeklyData: [15, 14, 16, 14, 13, 15, 14, 12, 14, 13, 12, 13],
        },
      ],
      overallTrend: 'improving',
    },

    assessments: [
      {
        type: 'vabs3',
        name: 'Vineland Adaptive Behavior Scales 3',
        date: '2025-11-15',
        score: 72,
        previousScore: 65,
        previousDate: '2025-05-20',
        percentile: 3,
        interpretation: 'Low range. Improvement of 7 points (clinically significant) in 6 months. Gains strongest in Communication and Daily Living Skills domains.',
        change: 7,
      },
      {
        type: 'cars2',
        name: 'Childhood Autism Rating Scale 2',
        date: '2025-11-15',
        score: 33.5,
        previousScore: 37.0,
        previousDate: '2025-05-20',
        interpretation: 'Mild-to-moderate range (previously moderate). Decrease of 3.5 points indicates reduced symptom severity, particularly in social interaction and communication.',
        change: -3.5,
      },
      {
        type: 'abc',
        name: 'Aberrant Behavior Checklist',
        date: '2025-10-01',
        score: 42,
        previousScore: 58,
        previousDate: '2025-04-15',
        interpretation: 'Clinically significant reduction in Irritability (-8) and Hyperactivity (-5) subscales. Stereotypy subscale stable.',
        change: -16,
      },
    ],

    sessions: {
      totalSessions: 87,
      attendedSessions: 78,
      canceledByFamily: 7,
      canceledByProvider: 2,
      attendanceRate: 89.7,
      totalHours: 292.5,
      hoursByType: {
        'Direct ABA (RBT)': 260,
        'BCBA Supervision': 22.5,
        'Parent Training': 10,
      },
      sessionsByCPT: {
        '97153': { count: 62, units: 832, description: 'Adaptive behavior treatment by protocol (RBT)' },
        '97155': { count: 10, units: 60, description: 'Adaptive behavior treatment w/ modification (BCBA)' },
        '97156': { count: 6, units: 24, description: 'Family adaptive behavior treatment guidance (BCBA)' },
      },
    },

    parentReport: {
      concerns: [
        'Evening transitions continue to be very difficult — Eddie melts down when asked to stop screen time for dinner or bath.',
        'Homework is a daily battle. He gets frustrated quickly and throws pencils/papers.',
        'New concern: some aggression toward younger sibling when overwhelmed.',
      ],
      wins: [
        'Eddie asked for a snack at grandma\'s house using a 3-word sentence ("I want crackers") — first time without prompting!',
        'Played alongside a neighbor kid at the park for about 10 minutes with minimal adult redirection.',
        'Successfully completed a haircut with only minor fussing — huge improvement from last year.',
        'Has been using the visual schedule at home consistently — morning routine is much smoother.',
      ],
      homeEnvironmentNotes: 'Two-parent household. Younger sibling (age 3, neurotypical). Family dog (golden retriever, trained as companion animal). Structured home environment with visual supports in main living areas.',
      medicationChanges: 'No changes this quarter. Methylphenidate well-tolerated with no reported side effects. Sleep onset improved with melatonin.',
      recentLifeEvents: 'Family vacation to beach in October (some regression noted post-travel, recovered within 1 week). Maternal grandmother started visiting weekly — Eddie has adapted well.',
    },

    recommendations: [
      'Continue comprehensive ABA services at current intensity (20 hrs/wk) with quarterly progress reviews.',
      'Increase parent training sessions to biweekly to address evening transition difficulties and sibling interaction strategies.',
      'Introduce peer-mediated intervention component (2 sessions/week) to generalize social skills with typically developing peers.',
      'Coordinate with school SLP to align communication goals between home, clinic, and school settings.',
      'Consider functional communication training (FCT) for homework-related frustration — teach alternative requesting behaviors.',
      'Schedule 6-month reassessment with VABS-3 and CARS-2 (May 2026) to evaluate continued medical necessity.',
      'Recommend occupational therapy evaluation for sensory processing to complement ABA programming.',
    ],
  };
}
