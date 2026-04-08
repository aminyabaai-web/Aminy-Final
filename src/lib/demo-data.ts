// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * demo-data.ts — Realistic mock data for demo/VC presentation mode
 *
 * Used when Supabase returns empty tables. Ensures the app always looks
 * production-ready during demos. Activated when:
 * - VITE_DEMO_MODE=true in .env.local, OR
 * - URL param ?demo=1, OR
 * - No real data returned from Supabase after 3s
 */

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  if (new URLSearchParams(window.location.search).get('demo') === '1') return true;
  return false;
};

// ── Platform KPIs ────────────────────────────────────────────────────────────
export const DEMO_PLATFORM_STATS = {
  activeClients: 47,
  sessionsThisMonth: 312,
  goalsAtMastery: 68,        // percent
  avgWeeksToFirstMastery: 4.2,
  providerCount: 11,
  insurancePayers: 6,
  avgSessionsPerWeek: 2.8,
};

// ── Goal Mastery Trend (12 weeks) ────────────────────────────────────────────
export const DEMO_MASTERY_TREND = [
  { week: 'W1', pct: 18 }, { week: 'W2', pct: 22 }, { week: 'W3', pct: 28 },
  { week: 'W4', pct: 31 }, { week: 'W5', pct: 38 }, { week: 'W6', pct: 44 },
  { week: 'W7', pct: 49 }, { week: 'W8', pct: 53 }, { week: 'W9', pct: 58 },
  { week: 'W10', pct: 62 }, { week: 'W11', pct: 65 }, { week: 'W12', pct: 68 },
];

// ── Session Frequency Distribution ──────────────────────────────────────────
export const DEMO_SESSION_FREQ = [
  { label: '1x/wk', count: 8 },
  { label: '2x/wk', count: 19 },
  { label: '3x/wk', count: 14 },
  { label: '4x+/wk', count: 6 },
];

// ── Top Programs ─────────────────────────────────────────────────────────────
export const DEMO_TOP_PROGRAMS = [
  { name: 'Mand Training', trials: 840, masteryPct: 82, trend: 'up' as const },
  { name: 'Tact Labeling', trials: 620, masteryPct: 74, trend: 'up' as const },
  { name: 'Listener Responding', trials: 510, masteryPct: 71, trend: 'up' as const },
  { name: 'Imitation', trials: 390, masteryPct: 68, trend: 'stable' as const },
  { name: 'Social Referencing', trials: 280, masteryPct: 55, trend: 'up' as const },
];

// ── Provider Performance ──────────────────────────────────────────────────────
export const DEMO_PROVIDERS = [
  { name: 'Sarah K., BCBA', clients: 9, sessionsPerWeek: 3.1, outcomeScore: 94 },
  { name: 'Marcus T., BCBA-D', clients: 7, sessionsPerWeek: 2.8, outcomeScore: 91 },
  { name: 'Priya M., BCBA', clients: 8, sessionsPerWeek: 2.6, outcomeScore: 88 },
  { name: 'James R., RBT', clients: 6, sessionsPerWeek: 3.4, outcomeScore: 85 },
  { name: 'Aisha N., SLP', clients: 5, sessionsPerWeek: 2.2, outcomeScore: 89 },
];

// ── Sample Providers for Intake Matching ────────────────────────────────────
export const DEMO_MATCH_PROVIDERS = [
  {
    id: 'demo-p1',
    name: 'Sarah K., BCBA',
    credentials: 'Board Certified Behavior Analyst',
    specialties: ['ABA', 'Early Intervention', 'Verbal Behavior'],
    distanceMiles: 3.2,
    acceptingClients: true,
    sessionTypes: ['In-home', 'Telehealth'],
    yearsExperience: 8,
    rating: 4.9,
  },
  {
    id: 'demo-p2',
    name: 'Marcus T., BCBA-D',
    credentials: 'Board Certified Behavior Analyst – Doctoral',
    specialties: ['ABA', 'ADHD', 'School-based'],
    distanceMiles: 5.7,
    acceptingClients: true,
    sessionTypes: ['Center-based', 'School-based'],
    yearsExperience: 12,
    rating: 4.8,
  },
  {
    id: 'demo-p3',
    name: 'Priya M., BCBA',
    credentials: 'Board Certified Behavior Analyst',
    specialties: ['ABA', 'Speech Support', 'Sensory'],
    distanceMiles: 7.1,
    acceptingClients: false,
    sessionTypes: ['In-home', 'Telehealth'],
    yearsExperience: 6,
    rating: 4.7,
  },
];

// ── Sample ERA for billing demo ───────────────────────────────────────────────
export const DEMO_ERA_835 = {
  checkNumber: 'CHK-20260401-0047',
  payerId: 'BCBSIL',
  payerName: 'BlueCross BlueShield of Illinois',
  paymentDate: '2026-04-01',
  totalPayment: 142800, // cents = $1,428.00
  claimStatus: 'partial' as const,
  patientName: 'Alex Johnson',
  memberId: 'XYZ123456789',
  npi: '1234567890',
  claimLines: [
    {
      procedureCode: '97153',
      serviceDate: '2026-03-28',
      billedAmount: 18000,
      allowedAmount: 15200,
      paidAmount: 12160,
      patientResponsibility: 3040,
      adjustments: [
        { adjustmentGroupCode: 'CO', reasonCode: '45', adjustmentAmount: 2800, description: 'Charge exceeds fee schedule / maximum allowable' },
        { adjustmentGroupCode: 'PR', reasonCode: '2', adjustmentAmount: 3040, description: 'Coinsurance amount' },
      ],
      claimStatus: 'partial' as const,
    },
    {
      procedureCode: '97155',
      serviceDate: '2026-03-28',
      billedAmount: 22000,
      allowedAmount: 18500,
      paidAmount: 14800,
      patientResponsibility: 3700,
      adjustments: [
        { adjustmentGroupCode: 'CO', reasonCode: '45', adjustmentAmount: 3500, description: 'Charge exceeds fee schedule / maximum allowable' },
        { adjustmentGroupCode: 'PR', reasonCode: '2', adjustmentAmount: 3700, description: 'Coinsurance amount' },
      ],
      claimStatus: 'partial' as const,
    },
  ],
};

// ── Sample expiring claims ───────────────────────────────────────────────────
export const DEMO_EXPIRING_CLAIMS = [
  { claimId: 'CLM-2026-0891', serviceDate: '2026-01-15', payerId: 'AETNA' },    // ~80 days ago
  { claimId: 'CLM-2026-0734', serviceDate: '2025-11-20', payerId: 'UHC' },      // ~135 days ago
  { claimId: 'CLM-2025-1122', serviceDate: '2025-09-08', payerId: 'CIGNA' },    // ~209 days ago
];
