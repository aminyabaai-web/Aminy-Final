// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Competitive Positioning: Aminy vs CareCompanion (CentralReach)
 *
 * CareCompanion Context:
 *   - Launched August 2024 by CentralReach (acquired by Roper Technologies for $1.65B)
 *   - Positioned as a "family engagement" companion to CentralReach's practice management
 *   - As of March 2026: only 4 App Store reviews, basic logistics-only features
 *   - App Store description focuses on: appointment viewing, session schedule,
 *     basic messaging with providers, and document sharing
 *   - NO clinical tools, NO AI, NO therapy games, NO insurance navigation,
 *     NO community, NO telehealth, NO outcome tracking
 *
 * Strategic Thesis:
 *   CentralReach owns the provider side (practice management, clinical data collection,
 *   billing, scheduling). Their ecosystem has a massive gap on the consumer/family side.
 *   CareCompanion was their attempt to fill it, but it's a logistics-only app with
 *   minimal traction. Aminy is purpose-built to be the consumer layer CentralReach
 *   needs — with deep clinical integration, AI behavioral assistance, gamified therapy,
 *   insurance navigation, community, and outcome correlation. An acquisition of Aminy
 *   completes the CentralReach ecosystem: provider PM + family engagement + outcome
 *   correlation = the only end-to-end ABA platform.
 *
 * Feature Gap Analysis (Aminy Advantages):
 *
 * ┌─────────────────────────────────────────┬───────────┬────────────────┐
 * │ Feature                                 │   Aminy   │ CareCompanion  │
 * ├─────────────────────────────────────────┼───────────┼────────────────┤
 * │ AI Behavioral Assistant (Ask Aminy)     │    YES    │      NO        │
 * │ Junior Speech/Social Therapy Games      │    YES    │      NO        │
 * │ Calm Corner De-escalation Tools         │    YES    │      NO        │
 * │ ABC Behavior Logging (parent-reported)  │    YES    │      NO        │
 * │ Daily Routines with Visual Supports     │    YES    │      NO        │
 * │ Insurance Navigation + EDI Claims       │    YES    │      NO        │
 * │ Prior Authorization Management          │    YES    │      NO        │
 * │ Community Hub with Moderation           │    YES    │  Basic messaging│
 * │ Telehealth with Superbills              │    YES    │      NO        │
 * │ Outcome Correlation Engine              │    YES    │      NO        │
 * │ Caregiver Wellness Tracking             │    YES    │      NO        │
 * │ Weekly AI-Generated Summaries           │    YES    │      NO        │
 * │ Home Program Tracker (BCBA-assigned)    │    YES    │      NO        │
 * │ Secure Records Vault (HIPAA)            │    YES    │      NO        │
 * │ Provider Marketplace & Booking          │    YES    │      NO        │
 * │ Gamified Engagement (Badges/Streaks)    │    YES    │      NO        │
 * │ Referral Program                        │    YES    │      NO        │
 * │ B2B Org/Clinic White-Label              │    YES    │      NO        │
 * │ Stripe Subscription + Paywalls          │    YES    │      NO        │
 * │ CR Bidirectional API Integration        │    YES    │   Built-in     │
 * │ Session Notes Viewer                    │    YES    │    YES         │
 * │ Appointment Schedule                    │    YES    │    YES         │
 * │ Provider Messaging                      │    YES    │    YES         │
 * │ Document Sharing                        │    YES    │    YES         │
 * └─────────────────────────────────────────┴───────────┴────────────────┘
 *
 * Score: Aminy has 20+ unique features that CareCompanion lacks entirely.
 * CareCompanion only matches on 4 basic logistics features.
 *
 * Why This Matters for Acquisition:
 *   1. Build vs Buy: It would take CentralReach 2-3 years and $15M+ to build
 *      what Aminy already has. Acquiring is faster and cheaper.
 *   2. Clinical Credibility: Aminy's outcome correlation proves that family
 *      engagement drives clinical improvement — a data story CentralReach
 *      desperately needs for payer negotiations.
 *   3. Revenue Expansion: Aminy's B2C subscription + B2B clinic licensing
 *      opens a new revenue stream for Roper's CentralReach portfolio.
 *   4. Competitive Moat: No other family app has bidirectional CentralReach
 *      integration + AI + clinical tools. This is a first-mover advantage.
 *   5. Roper's M&A Playbook: Roper Technologies acquires "mission-critical"
 *      vertical SaaS companies. Aminy fits the pattern — sticky, clinical,
 *      recurring revenue.
 */

// ============================================================================
// TYPES
// ============================================================================

export type FeatureCategory =
  | 'ai'
  | 'clinical'
  | 'therapy_games'
  | 'insurance'
  | 'community'
  | 'telehealth'
  | 'engagement'
  | 'outcomes'
  | 'provider_tools'
  | 'platform'
  | 'logistics';

export type CompetitorStatus =
  | 'none'             // Competitor has nothing comparable
  | 'basic'            // Competitor has minimal/basic version
  | 'comparable'       // Competitor has roughly equivalent feature
  | 'superior';        // Competitor's version is better (unlikely for CC)

export interface CompetitiveAdvantage {
  /** Feature identifier */
  id: string;
  /** Feature name */
  name: string;
  /** Category */
  category: FeatureCategory;
  /** What Aminy offers */
  aminyCapability: string;
  /** What CareCompanion offers (or lacks) */
  careCompanionStatus: CompetitorStatus;
  /** CareCompanion description (if any) */
  careCompanionNotes: string;
  /** Strategic importance for acquisition (1-10) */
  acquisitionImportance: number;
  /** Why this matters to CentralReach specifically */
  strategicRationale: string;
  /** Estimated cost for CR to build this themselves */
  estimatedBuildCostUSD: number;
  /** Estimated time to build (months) */
  estimatedBuildMonths: number;
}

export interface CompetitivePositioningSummary {
  /** Total Aminy-only features */
  uniqueFeatureCount: number;
  /** Features where CareCompanion has basic version */
  partialOverlapCount: number;
  /** Features where CareCompanion is comparable */
  fullOverlapCount: number;
  /** Estimated total build cost for CR to replicate Aminy */
  totalEstimatedBuildCostUSD: number;
  /** Estimated total time to build (parallel dev) */
  totalEstimatedBuildMonths: number;
  /** Composite competitive advantage score (0-10) */
  competitiveAdvantageScore: number;
  /** All advantages sorted by acquisition importance */
  advantages: CompetitiveAdvantage[];
  /** Top 5 selling points for acquisition conversation */
  topSellingPoints: string[];
}

// ============================================================================
// FEATURE ADVANTAGE DATABASE
// ============================================================================

const COMPETITIVE_ADVANTAGES: CompetitiveAdvantage[] = [
  // --- AI ---
  {
    id: 'ask_aminy_ai',
    name: 'AI Behavioral Assistant (Ask Aminy)',
    category: 'ai',
    aminyCapability:
      'Context-aware AI chat trained on ABA principles, crisis de-escalation, insurance navigation, and parent coaching. Uses RAG with user history for personalized responses.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No AI capabilities whatsoever.',
    acquisitionImportance: 10,
    strategicRationale:
      'AI is the most defensible moat. CentralReach has no consumer AI. This instantly makes CR the first ABA platform with AI-powered family support.',
    estimatedBuildCostUSD: 3_000_000,
    estimatedBuildMonths: 18,
  },
  {
    id: 'weekly_ai_summary',
    name: 'AI Weekly Summary Reports',
    category: 'ai',
    aminyCapability:
      'Auto-generated weekly reports synthesizing behavior trends, therapy progress, routine adherence, and caregiver wellness into actionable insights.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No automated reporting.',
    acquisitionImportance: 8,
    strategicRationale:
      'Reduces BCBA documentation time and gives parents a reason to open the app weekly. Drives engagement and provider value simultaneously.',
    estimatedBuildCostUSD: 800_000,
    estimatedBuildMonths: 8,
  },

  // --- Clinical / Therapy ---
  {
    id: 'junior_games',
    name: 'Junior Speech/Social Therapy Games',
    category: 'therapy_games',
    aminyCapability:
      'Adaptive-difficulty gamified therapy sessions targeting communication, social skills, daily living, and academic domains. Results map to CR treatment goals.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No therapy activities or games.',
    acquisitionImportance: 9,
    strategicRationale:
      'Extends therapy hours beyond clinic sessions. BCBA-aligned activities that generate billable data points. Unique in the market.',
    estimatedBuildCostUSD: 2_500_000,
    estimatedBuildMonths: 14,
  },
  {
    id: 'calm_corner',
    name: 'Calm Corner De-escalation Tools',
    category: 'clinical',
    aminyCapability:
      'Breathing exercises, sensory tools, visual timers, and guided de-escalation sequences for in-the-moment crisis support.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No crisis or de-escalation tools.',
    acquisitionImportance: 8,
    strategicRationale:
      'Real-time clinical value during behavior crises. Usage data correlates with incident reduction — proving the app has clinical impact.',
    estimatedBuildCostUSD: 500_000,
    estimatedBuildMonths: 6,
  },
  {
    id: 'abc_logging',
    name: 'ABC Behavior Logging',
    category: 'clinical',
    aminyCapability:
      'Structured Antecedent-Behavior-Consequence logging with severity rating, environmental factors, and automatic sync to CentralReach as clinical data points.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No behavior data collection.',
    acquisitionImportance: 9,
    strategicRationale:
      'Parent-reported ABC data is the #1 gap in ABA data collection. This fills it and feeds directly into CR for BCBA review.',
    estimatedBuildCostUSD: 600_000,
    estimatedBuildMonths: 5,
  },
  {
    id: 'daily_routines',
    name: 'Daily Routines with Visual Supports',
    category: 'clinical',
    aminyCapability:
      'Customizable visual routine schedules (morning/afternoon/evening/bedtime) with step-by-step completion tracking, independence levels, and CR billing documentation.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No routine management.',
    acquisitionImportance: 7,
    strategicRationale:
      'Routine adherence is a core ABA goal. Tracking generates billable documentation and proves home generalization.',
    estimatedBuildCostUSD: 400_000,
    estimatedBuildMonths: 4,
  },
  {
    id: 'home_program_tracker',
    name: 'Home Program Tracker',
    category: 'clinical',
    aminyCapability:
      'BCBA-assigned home programs with activity instructions, video demonstrations, trial tracking, accuracy measurement, and completion sync to CR.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No home program support.',
    acquisitionImportance: 9,
    strategicRationale:
      'Home programs are assigned in CR but have no tracking mechanism. This closes the loop — assigned in CR, tracked in Aminy, results pushed back.',
    estimatedBuildCostUSD: 700_000,
    estimatedBuildMonths: 6,
  },

  // --- Outcomes ---
  {
    id: 'outcome_correlation',
    name: 'Outcome Correlation Engine',
    category: 'outcomes',
    aminyCapability:
      'Statistical correlation engine linking app usage patterns (Junior sessions, Calm Corner, routines) to clinical outcomes (goal progress, incident reduction). Pearson r with p-values.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No outcome tracking or correlation.',
    acquisitionImportance: 10,
    strategicRationale:
      'THE killer feature for acquisition. Proves that family engagement (Aminy) drives clinical improvement (CR goals). No competitor has this.',
    estimatedBuildCostUSD: 1_200_000,
    estimatedBuildMonths: 10,
  },
  {
    id: 'caregiver_wellness',
    name: 'Caregiver Wellness Tracking',
    category: 'outcomes',
    aminyCapability:
      'Stress check-ins, sleep tracking, self-care completion, support network engagement, and composite wellness scores synced to CR for treatment context.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No caregiver wellness features.',
    acquisitionImportance: 7,
    strategicRationale:
      'Caregiver burnout is the #1 reason families drop out of ABA. Tracking and supporting caregivers improves retention — for both the app and the clinic.',
    estimatedBuildCostUSD: 300_000,
    estimatedBuildMonths: 3,
  },

  // --- Insurance ---
  {
    id: 'insurance_navigation',
    name: 'Insurance Navigation + EDI Claims',
    category: 'insurance',
    aminyCapability:
      'Benefits verification, coverage explanation, EDI 837/835 claim submission, denial management, and prior authorization tracking — all from the parent side.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No insurance features (CR handles billing on provider side only).',
    acquisitionImportance: 8,
    strategicRationale:
      'CentralReach handles provider-side billing. Aminy handles parent-side insurance navigation. Together they cover the full billing cycle.',
    estimatedBuildCostUSD: 1_500_000,
    estimatedBuildMonths: 12,
  },
  {
    id: 'prior_auth',
    name: 'Prior Authorization Management',
    category: 'insurance',
    aminyCapability:
      'Track authorization status, units remaining/used, expiration warnings, and auto-alert when re-authorization is needed.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No authorization visibility for families.',
    acquisitionImportance: 7,
    strategicRationale:
      'Expired authorizations = lost revenue for clinics. Proactive alerts from the family side prevent service gaps.',
    estimatedBuildCostUSD: 400_000,
    estimatedBuildMonths: 4,
  },

  // --- Community ---
  {
    id: 'community_hub',
    name: 'Community Hub with Moderation',
    category: 'community',
    aminyCapability:
      'Moderated community forums with topic categories, post/comment/react, AI-assisted content moderation, and caregiver support groups.',
    careCompanionStatus: 'basic',
    careCompanionNotes: 'Basic provider-to-parent messaging only. No community features.',
    acquisitionImportance: 6,
    strategicRationale:
      'Community creates stickiness and reduces churn. Caregiver peer support is clinically validated to improve outcomes.',
    estimatedBuildCostUSD: 800_000,
    estimatedBuildMonths: 8,
  },

  // --- Telehealth ---
  {
    id: 'telehealth',
    name: 'Telehealth with Superbills',
    category: 'telehealth',
    aminyCapability:
      'Integrated video sessions via Daily.co, session notes, automatic superbill generation, recording consent management, and CR session push.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No telehealth capabilities.',
    acquisitionImportance: 7,
    strategicRationale:
      'Telehealth for parent training (97156) is a growing billing code. Aminy enables it from the family side with automatic documentation.',
    estimatedBuildCostUSD: 1_000_000,
    estimatedBuildMonths: 10,
  },
  {
    id: 'provider_marketplace',
    name: 'Provider Marketplace & Booking',
    category: 'telehealth',
    aminyCapability:
      'Search, filter, and book providers with specialty matching, availability checking, and conversational booking via AI.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No marketplace. Families are assigned to providers through their clinic.',
    acquisitionImportance: 6,
    strategicRationale:
      'Expands CentralReach from a clinic tool to a platform that connects families with providers. Network effects.',
    estimatedBuildCostUSD: 900_000,
    estimatedBuildMonths: 8,
  },

  // --- Engagement ---
  {
    id: 'gamification',
    name: 'Gamified Engagement System',
    category: 'engagement',
    aminyCapability:
      'Badges, streaks, stars, leveling system, and achievement tracking that drive daily app usage and therapy adherence.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No gamification.',
    acquisitionImportance: 5,
    strategicRationale:
      'Gamification drives DAU/MAU ratio — the single most important engagement metric for consumer apps.',
    estimatedBuildCostUSD: 300_000,
    estimatedBuildMonths: 3,
  },
  {
    id: 'referral_program',
    name: 'Referral Program',
    category: 'engagement',
    aminyCapability:
      'Built-in viral referral system with tracking, rewards, and analytics.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No referral system.',
    acquisitionImportance: 4,
    strategicRationale:
      'Organic growth reduces CAC. Families recommending to other families is the highest-trust acquisition channel.',
    estimatedBuildCostUSD: 200_000,
    estimatedBuildMonths: 2,
  },

  // --- Platform ---
  {
    id: 'b2b_whitelabel',
    name: 'B2B Clinic White-Label / Org Setup',
    category: 'platform',
    aminyCapability:
      'Multi-tenant org support with clinic branding, role-based access, provider onboarding, and clinic-level analytics.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'CareCompanion is consumer-only, no B2B model.',
    acquisitionImportance: 8,
    strategicRationale:
      'B2B licensing to CR clinics is the fastest path to revenue post-acquisition. Clinics pay for branded family apps.',
    estimatedBuildCostUSD: 1_000_000,
    estimatedBuildMonths: 10,
  },
  {
    id: 'secure_vault',
    name: 'Secure Records Vault',
    category: 'platform',
    aminyCapability:
      'HIPAA-encrypted document storage for IEPs, evaluations, insurance cards, medical records, and provider reports.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'Basic document sharing only (provider-initiated).',
    acquisitionImportance: 5,
    strategicRationale:
      'Families need a single secure place for all ABA documentation. Reduces support burden on clinics.',
    estimatedBuildCostUSD: 400_000,
    estimatedBuildMonths: 4,
  },
  {
    id: 'stripe_monetization',
    name: 'Stripe Subscription + Paywalls',
    category: 'platform',
    aminyCapability:
      'Full subscription management with free/premium tiers, trial flows, upgrade prompts, and revenue analytics.',
    careCompanionStatus: 'none',
    careCompanionNotes: 'No direct monetization (bundled with CR subscription).',
    acquisitionImportance: 7,
    strategicRationale:
      'Proven monetization model with B2C subscriptions. Gives Roper immediate revenue from day one post-acquisition.',
    estimatedBuildCostUSD: 500_000,
    estimatedBuildMonths: 5,
  },

  // --- CR Integration (Aminy has it, CC has it built-in) ---
  {
    id: 'cr_bidirectional_sync',
    name: 'CentralReach Bidirectional API Sync',
    category: 'platform',
    aminyCapability:
      'Full OAuth 2.0 integration with 4 pull endpoints (sessions, goals, insurance, home programs) and 5 push endpoints (ABC logs, routines, Junior results, wellness, telehealth). Webhook support, offline queue, conflict resolution.',
    careCompanionStatus: 'comparable',
    careCompanionNotes: 'Built into CentralReach natively (first-party integration).',
    acquisitionImportance: 9,
    strategicRationale:
      'Having a working third-party integration proves Aminy can operate independently AND deeply integrate. Post-acquisition, this becomes native.',
    estimatedBuildCostUSD: 0, // Already built
    estimatedBuildMonths: 0,
  },

  // --- Logistics (CareCompanion matches) ---
  {
    id: 'session_notes',
    name: 'Session Notes Viewer',
    category: 'logistics',
    aminyCapability: 'View session notes, dates, goals addressed, and billing codes from provider sessions.',
    careCompanionStatus: 'comparable',
    careCompanionNotes: 'CareCompanion shows session schedule and notes.',
    acquisitionImportance: 3,
    strategicRationale: 'Table stakes — both apps cover this.',
    estimatedBuildCostUSD: 0,
    estimatedBuildMonths: 0,
  },
  {
    id: 'appointment_schedule',
    name: 'Appointment Schedule',
    category: 'logistics',
    aminyCapability: 'View upcoming appointments with provider details and session types.',
    careCompanionStatus: 'comparable',
    careCompanionNotes: 'CareCompanion shows appointment schedule.',
    acquisitionImportance: 3,
    strategicRationale: 'Table stakes.',
    estimatedBuildCostUSD: 0,
    estimatedBuildMonths: 0,
  },
  {
    id: 'provider_messaging',
    name: 'Provider Messaging',
    category: 'logistics',
    aminyCapability: 'Secure HIPAA-compliant messaging with providers.',
    careCompanionStatus: 'comparable',
    careCompanionNotes: 'CareCompanion has basic messaging.',
    acquisitionImportance: 3,
    strategicRationale: 'Table stakes.',
    estimatedBuildCostUSD: 0,
    estimatedBuildMonths: 0,
  },
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the complete competitive advantage analysis as structured data.
 * This is the primary function for programmatic access to the positioning.
 */
export function getCompetitiveAdvantages(): CompetitivePositioningSummary {
  const unique = COMPETITIVE_ADVANTAGES.filter((a) => a.careCompanionStatus === 'none');
  const partial = COMPETITIVE_ADVANTAGES.filter((a) => a.careCompanionStatus === 'basic');
  const overlap = COMPETITIVE_ADVANTAGES.filter(
    (a) => a.careCompanionStatus === 'comparable' || a.careCompanionStatus === 'superior',
  );

  const totalBuildCost = COMPETITIVE_ADVANTAGES.reduce(
    (sum, a) => sum + a.estimatedBuildCostUSD,
    0,
  );
  const maxBuildMonths = Math.max(
    ...COMPETITIVE_ADVANTAGES.map((a) => a.estimatedBuildMonths),
  );

  // Competitive advantage score: weighted by acquisition importance
  const maxPossibleScore =
    COMPETITIVE_ADVANTAGES.reduce((sum, a) => sum + a.acquisitionImportance, 0);
  const uniqueScore =
    unique.reduce((sum, a) => sum + a.acquisitionImportance, 0) +
    partial.reduce((sum, a) => sum + a.acquisitionImportance * 0.5, 0);
  const competitiveAdvantageScore =
    Math.round((uniqueScore / maxPossibleScore) * 10 * 10) / 10;

  // Sort by acquisition importance
  const sorted = [...COMPETITIVE_ADVANTAGES].sort(
    (a, b) => b.acquisitionImportance - a.acquisitionImportance,
  );

  // Top selling points
  const topSellingPoints = [
    `${unique.length} features Aminy has that CareCompanion completely lacks.`,
    `Outcome Correlation Engine is unique in the market — proves family engagement drives clinical improvement.`,
    `Estimated $${(totalBuildCost / 1_000_000).toFixed(1)}M and ${maxBuildMonths}+ months for CentralReach to build equivalent features internally.`,
    `AI behavioral assistant (Ask Aminy) and Junior therapy games have no equivalent in any ABA family app.`,
    `B2B clinic white-label enables immediate revenue from CentralReach's 3,000+ clinic customer base.`,
  ];

  return {
    uniqueFeatureCount: unique.length,
    partialOverlapCount: partial.length,
    fullOverlapCount: overlap.length,
    totalEstimatedBuildCostUSD: totalBuildCost,
    totalEstimatedBuildMonths: maxBuildMonths,
    competitiveAdvantageScore,
    advantages: sorted,
    topSellingPoints,
  };
}

/**
 * Get only the features that Aminy has and CareCompanion lacks.
 * Useful for pitch deck bullet points.
 */
export function getUniqueAdvantages(): CompetitiveAdvantage[] {
  return COMPETITIVE_ADVANTAGES.filter((a) => a.careCompanionStatus === 'none').sort(
    (a, b) => b.acquisitionImportance - a.acquisitionImportance,
  );
}

/**
 * Get the estimated total cost for CentralReach to build Aminy's
 * unique features internally (build vs buy analysis).
 */
export function getBuildVsBuyAnalysis(): {
  totalBuildCost: number;
  totalBuildMonths: number;
  featureBreakdown: Array<{
    feature: string;
    cost: number;
    months: number;
    importance: number;
  }>;
  recommendation: string;
} {
  const uniqueFeatures = COMPETITIVE_ADVANTAGES.filter(
    (a) => a.careCompanionStatus !== 'comparable' && a.estimatedBuildCostUSD > 0,
  );

  const totalBuildCost = uniqueFeatures.reduce(
    (sum, a) => sum + a.estimatedBuildCostUSD,
    0,
  );
  const totalBuildMonths = Math.max(
    ...uniqueFeatures.map((a) => a.estimatedBuildMonths),
  );

  return {
    totalBuildCost,
    totalBuildMonths,
    featureBreakdown: uniqueFeatures
      .sort((a, b) => b.estimatedBuildCostUSD - a.estimatedBuildCostUSD)
      .map((a) => ({
        feature: a.name,
        cost: a.estimatedBuildCostUSD,
        months: a.estimatedBuildMonths,
        importance: a.acquisitionImportance,
      })),
    recommendation:
      `Building internally would cost approximately $${(totalBuildCost / 1_000_000).toFixed(1)}M ` +
      `over ${totalBuildMonths}+ months with significant execution risk. ` +
      `Acquiring Aminy provides immediate access to a production-ready platform ` +
      `with proven clinical integration and growing user base.`,
  };
}

/**
 * Get the feature categories where Aminy has the strongest positioning.
 */
export function getStrengthsByCategory(): Array<{
  category: FeatureCategory;
  uniqueFeatures: number;
  avgImportance: number;
  totalBuildCost: number;
}> {
  const categories = new Map<
    FeatureCategory,
    { unique: number; importanceSum: number; count: number; costSum: number }
  >();

  for (const advantage of COMPETITIVE_ADVANTAGES) {
    const cat = categories.get(advantage.category) ?? {
      unique: 0,
      importanceSum: 0,
      count: 0,
      costSum: 0,
    };

    cat.count++;
    cat.importanceSum += advantage.acquisitionImportance;
    cat.costSum += advantage.estimatedBuildCostUSD;
    if (advantage.careCompanionStatus === 'none') cat.unique++;

    categories.set(advantage.category, cat);
  }

  return [...categories.entries()]
    .map(([category, data]) => ({
      category,
      uniqueFeatures: data.unique,
      avgImportance: Math.round((data.importanceSum / data.count) * 10) / 10,
      totalBuildCost: data.costSum,
    }))
    .sort((a, b) => b.avgImportance - a.avgImportance);
}
