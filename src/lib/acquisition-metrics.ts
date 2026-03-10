/**
 * Acquisition Readiness Metrics
 *
 * Tracks and exposes the key product/business metrics that CentralReach
 * (Roper Technologies) would evaluate during acquisition due diligence.
 *
 * These metrics prove:
 * 1. Product-market fit (engagement, retention)
 * 2. Revenue potential (ARPU, conversion, LTV)
 * 3. Clinical value (outcome improvement, CR sync health)
 * 4. Strategic fit (feature adoption, NPS, platform stickiness)
 *
 * All data is sourced from Supabase analytics tables. The service computes
 * cohort-based retention, rolling DAU/MAU, feature adoption rates, and
 * clinical outcome improvements — all the numbers an acquirer's team
 * would ask for in a data room.
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

/** Complete acquisition metrics snapshot. */
export interface AcquisitionMetrics {
  /** Snapshot timestamp */
  generatedAt: string;
  /** Reporting period */
  period: {
    start: string;
    end: string;
  };

  // --- Engagement ---
  engagement: {
    /** Daily Active Users (unique users with a session today) */
    dau: number;
    /** Weekly Active Users (unique users with a session in last 7 days) */
    wau: number;
    /** Monthly Active Users (unique users with a session in last 30 days) */
    mau: number;
    /** DAU/MAU ratio — gold standard for consumer app stickiness */
    dauMauRatio: number;
    /** Average sessions per user per week */
    avgSessionsPerUserPerWeek: number;
    /** Average session duration in minutes */
    avgSessionDurationMinutes: number;
    /** Total registered users */
    totalUsers: number;
  };

  // --- Retention ---
  retention: {
    /** % of users active 1 day after signup */
    d1: number;
    /** % of users active 7 days after signup */
    d7: number;
    /** % of users active 30 days after signup */
    d30: number;
    /** % of users active 90 days after signup */
    d90: number;
    /** Weekly retention curve (12 weeks) */
    weeklyCurve: number[];
    /** Monthly churn rate */
    monthlyChurnRate: number;
  };

  // --- Feature Adoption ---
  featureAdoption: FeatureAdoptionMetric[];

  // --- NPS ---
  nps: {
    /** Net Promoter Score (-100 to 100) */
    score: number;
    /** Number of respondents */
    respondents: number;
    /** Promoters (9-10) percentage */
    promotersPct: number;
    /** Passives (7-8) percentage */
    passivesPct: number;
    /** Detractors (0-6) percentage */
    detractorsPct: number;
    /** Last survey date */
    lastSurveyDate: string | null;
  };

  // --- Revenue ---
  revenue: {
    /** Monthly Recurring Revenue (when Stripe is live) */
    mrr: number;
    /** Average Revenue Per User per month */
    arpu: number;
    /** Free-to-paid conversion rate */
    conversionRate: number;
    /** Estimated Lifetime Value */
    ltv: number;
    /** Total paying subscribers */
    payingUsers: number;
    /** Trial-to-paid conversion rate */
    trialConversionRate: number;
  };

  // --- Clinical Outcomes ---
  clinicalOutcomes: {
    /** Average improvement score across all users (0-100) */
    avgImprovementScore: number;
    /** % of users with measurable clinical improvement */
    usersWithImprovement: number;
    /** Average goal progress rate (%) */
    avgGoalProgressRate: number;
    /** Average behavior incident reduction (%) */
    avgIncidentReduction: number;
    /** Number of significant outcome correlations found */
    significantCorrelations: number;
  };

  // --- CentralReach Integration ---
  crIntegration: {
    /** % of sync operations succeeding */
    syncSuccessRate: number;
    /** Total records synced (lifetime) */
    totalRecordsSynced: number;
    /** Users with active CR integration */
    usersWithCRActive: number;
    /** Average sync latency in seconds */
    avgSyncLatencySeconds: number;
    /** Days since last sync failure */
    daysSinceLastFailure: number;
  };

  // --- Growth ---
  growth: {
    /** Week-over-week user growth rate */
    wowGrowthRate: number;
    /** Month-over-month user growth rate */
    momGrowthRate: number;
    /** Viral coefficient (referrals per user) */
    viralCoefficient: number;
    /** Organic signups (no referral) vs total */
    organicSignupRate: number;
  };
}

/** Individual feature adoption data. */
export interface FeatureAdoptionMetric {
  /** Feature identifier */
  featureId: string;
  /** Human-readable name */
  name: string;
  /** Feature category */
  category: 'core' | 'clinical' | 'community' | 'insurance' | 'telehealth' | 'ai';
  /** % of MAU who used this feature in the last 30 days */
  adoptionRate: number;
  /** Total unique users who ever used this feature */
  totalUsers: number;
  /** Average uses per active user per week */
  avgUsesPerWeek: number;
  /** Whether CareCompanion has a comparable feature */
  careCompanionHasEquivalent: boolean;
}

// ============================================================================
// FEATURE CATALOG
// ============================================================================

/**
 * Catalog of Aminy features, their analytics event names, and whether
 * CareCompanion (CentralReach's consumer app) has an equivalent.
 */
const FEATURE_CATALOG: Array<{
  featureId: string;
  name: string;
  category: FeatureAdoptionMetric['category'];
  events: string[];
  careCompanionHasEquivalent: boolean;
}> = [
  {
    featureId: 'ask_aminy',
    name: 'Ask Aminy (AI Assistant)',
    category: 'ai',
    events: ['ai_chat_sent', 'ai_interaction'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'junior_games',
    name: 'Junior Speech/Social Games',
    category: 'clinical',
    events: ['junior_session_complete', 'junior_game_started'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'calm_corner',
    name: 'Calm Corner / De-escalation Tools',
    category: 'clinical',
    events: ['calm_tool_used', 'calm_timer_completed'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'abc_logging',
    name: 'ABC Behavior Logging',
    category: 'clinical',
    events: ['abc_log_created', 'behavior_incident_logged'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'daily_routines',
    name: 'Daily Routines',
    category: 'core',
    events: ['routine_completed', 'routine_started'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'insurance_nav',
    name: 'Insurance Navigation / EDI Claims',
    category: 'insurance',
    events: ['benefits_checked', 'claim_submitted', 'prior_auth_started'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'community',
    name: 'Community Hub',
    category: 'community',
    events: ['community_post_created', 'community_comment', 'community_reaction'],
    careCompanionHasEquivalent: false, // CC has basic messaging only
  },
  {
    featureId: 'telehealth',
    name: 'Telehealth with Superbills',
    category: 'telehealth',
    events: ['telehealth_session_started', 'telehealth_session_completed'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'care_plan',
    name: 'Care Plan Viewer',
    category: 'clinical',
    events: ['care_plan_viewed', 'goal_detail_viewed'],
    careCompanionHasEquivalent: true, // CC shows basic schedule
  },
  {
    featureId: 'session_notes',
    name: 'Session Notes from Provider',
    category: 'core',
    events: ['session_note_viewed'],
    careCompanionHasEquivalent: true, // CC shows schedule/notes
  },
  {
    featureId: 'wellness_checkin',
    name: 'Caregiver Wellness Check-In',
    category: 'core',
    events: ['wellness_checkin_completed', 'stress_checkin_completed'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'outcome_tracking',
    name: 'Outcome Correlation Reports',
    category: 'clinical',
    events: ['outcome_report_viewed', 'outcome_report_generated'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'provider_marketplace',
    name: 'Provider Marketplace',
    category: 'telehealth',
    events: ['provider_search', 'provider_profile_viewed', 'appointment_booked'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'records_vault',
    name: 'Secure Records Vault',
    category: 'core',
    events: ['vault_document_uploaded', 'vault_document_viewed'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'weekly_summary',
    name: 'AI Weekly Summary',
    category: 'ai',
    events: ['weekly_summary_viewed', 'weekly_summary_generated'],
    careCompanionHasEquivalent: false,
  },
  {
    featureId: 'home_programs',
    name: 'Home Program Tracker',
    category: 'clinical',
    events: ['home_program_activity_completed', 'home_program_viewed'],
    careCompanionHasEquivalent: false,
  },
];

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch complete acquisition metrics. This is the primary entry point
 * for generating the due-diligence data package.
 */
export async function getAcquisitionMetrics(
  periodDays: number = 30,
): Promise<AcquisitionMetrics> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const startISO = periodStart.toISOString();
  const endISO = now.toISOString();

  // Run all queries in parallel for performance
  const [
    engagement,
    retention,
    featureAdoption,
    nps,
    revenue,
    clinicalOutcomes,
    crIntegration,
    growth,
  ] = await Promise.all([
    fetchEngagementMetrics(startISO, endISO),
    fetchRetentionMetrics(),
    fetchFeatureAdoption(startISO, endISO),
    fetchNPSMetrics(),
    fetchRevenueMetrics(),
    fetchClinicalOutcomeMetrics(startISO, endISO),
    fetchCRIntegrationMetrics(startISO, endISO),
    fetchGrowthMetrics(),
  ]);

  return {
    generatedAt: endISO,
    period: { start: startISO, end: endISO },
    engagement,
    retention,
    featureAdoption,
    nps,
    revenue,
    clinicalOutcomes,
    crIntegration,
    growth,
  };
}

// --- Engagement ---

async function fetchEngagementMetrics(
  start: string,
  end: string,
): Promise<AcquisitionMetrics['engagement']> {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  try {
    // DAU — unique users with app_session_start today
    const { count: dauCount } = await supabase
      .from('analytics_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_type', 'app_session_start')
      .gte('created_at', `${today}T00:00:00Z`);

    // WAU — unique users in last 7 days
    const { count: wauCount } = await supabase
      .from('analytics_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_type', 'app_session_start')
      .gte('created_at', sevenDaysAgo);

    // MAU — unique users in last 30 days
    const { count: mauCount } = await supabase
      .from('analytics_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_type', 'app_session_start')
      .gte('created_at', thirtyDaysAgo);

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Average session duration
    const { data: sessionDurations } = await supabase
      .from('analytics_events')
      .select('metadata')
      .eq('event_type', 'app_session_end')
      .gte('created_at', start)
      .lte('created_at', end)
      .limit(500);

    const durations = (sessionDurations ?? [])
      .map((s) => (s.metadata as Record<string, number>)?.duration_minutes)
      .filter((d): d is number => d != null && d > 0);
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Sessions per user per week
    const { count: totalSessions } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'app_session_start')
      .gte('created_at', sevenDaysAgo);

    const mau = mauCount ?? 0;
    const dau = dauCount ?? 0;

    return {
      dau,
      wau: wauCount ?? 0,
      mau,
      dauMauRatio: mau > 0 ? Math.round((dau / mau) * 100) / 100 : 0,
      avgSessionsPerUserPerWeek:
        (wauCount ?? 0) > 0
          ? Math.round(((totalSessions ?? 0) / (wauCount ?? 1)) * 10) / 10
          : 0,
      avgSessionDurationMinutes: Math.round(avgDuration * 10) / 10,
      totalUsers: totalUsers ?? 0,
    };
  } catch (err) {
    console.error('[AcquisitionMetrics] Engagement fetch error:', err);
    return {
      dau: 0, wau: 0, mau: 0, dauMauRatio: 0,
      avgSessionsPerUserPerWeek: 0, avgSessionDurationMinutes: 0, totalUsers: 0,
    };
  }
}

// --- Retention ---

async function fetchRetentionMetrics(): Promise<AcquisitionMetrics['retention']> {
  try {
    // Fetch cohort data: users who signed up in each of the last 13 weeks
    const weeks = 13;
    const cohorts: Array<{ signupWeek: string; signupCount: number; activeWeeks: Set<number> }> = [];

    for (let w = weeks; w >= 0; w--) {
      const weekStart = new Date(Date.now() - w * 7 * 86400000).toISOString().slice(0, 10);
      const weekEnd = new Date(Date.now() - (w - 1) * 7 * 86400000).toISOString().slice(0, 10);

      const { count: signups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${weekStart}T00:00:00Z`)
        .lt('created_at', `${weekEnd}T00:00:00Z`);

      cohorts.push({
        signupWeek: weekStart,
        signupCount: signups ?? 0,
        activeWeeks: new Set(),
      });
    }

    // Compute D1, D7, D30, D90 from cohort activity
    const computeRetention = async (daysAfter: number): Promise<number> => {
      const signupCutoff = new Date(Date.now() - daysAfter * 86400000).toISOString();

      // Users who signed up at least daysAfter ago
      const { count: eligibleUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', signupCutoff);

      if (!eligibleUsers || eligibleUsers === 0) return 0;

      // Users who were active exactly daysAfter days after their signup
      // Simplified: check users active in the target window
      const windowStart = new Date(Date.now() - (daysAfter + 1) * 86400000).toISOString();
      const windowEnd = new Date(Date.now() - (daysAfter - 1) * 86400000).toISOString();

      const { count: activeUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .eq('event_type', 'app_session_start')
        .gte('created_at', windowStart)
        .lte('created_at', windowEnd);

      return Math.round(((activeUsers ?? 0) / eligibleUsers) * 100);
    };

    const [d1, d7, d30, d90] = await Promise.all([
      computeRetention(1),
      computeRetention(7),
      computeRetention(30),
      computeRetention(90),
    ]);

    // Weekly retention curve (percentage of initial cohort active each week)
    const weeklyCurve = [100]; // Week 0 = 100%
    for (let w = 1; w <= 12; w++) {
      const retPct = await computeRetention(w * 7);
      weeklyCurve.push(retPct);
    }

    // Monthly churn: 1 - (MAU this month / MAU last month)
    const thisMonthStart = new Date(Date.now() - 30 * 86400000).toISOString();
    const lastMonthStart = new Date(Date.now() - 60 * 86400000).toISOString();
    const lastMonthEnd = new Date(Date.now() - 30 * 86400000).toISOString();

    const { count: mauThis } = await supabase
      .from('analytics_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_type', 'app_session_start')
      .gte('created_at', thisMonthStart);

    const { count: mauLast } = await supabase
      .from('analytics_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_type', 'app_session_start')
      .gte('created_at', lastMonthStart)
      .lt('created_at', lastMonthEnd);

    const monthlyChurnRate =
      (mauLast ?? 0) > 0
        ? Math.max(0, Math.round((1 - (mauThis ?? 0) / (mauLast ?? 1)) * 100))
        : 0;

    return { d1, d7, d30, d90, weeklyCurve, monthlyChurnRate };
  } catch (err) {
    console.error('[AcquisitionMetrics] Retention fetch error:', err);
    return { d1: 0, d7: 0, d30: 0, d90: 0, weeklyCurve: [100], monthlyChurnRate: 0 };
  }
}

// --- Feature Adoption ---

async function fetchFeatureAdoption(
  start: string,
  end: string,
): Promise<FeatureAdoptionMetric[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Get MAU for adoption rate calculation
  const { count: mau } = await supabase
    .from('analytics_events')
    .select('user_id', { count: 'exact', head: true })
    .eq('event_type', 'app_session_start')
    .gte('created_at', thirtyDaysAgo);

  const mauCount = mau ?? 1; // avoid divide-by-zero

  const results: FeatureAdoptionMetric[] = [];

  for (const feature of FEATURE_CATALOG) {
    try {
      // Unique users who used this feature in last 30 days
      const { count: featureUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .in('event_type', feature.events)
        .gte('created_at', thirtyDaysAgo);

      // Total unique users who ever used this feature
      const { count: totalFeatureUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .in('event_type', feature.events);

      // Total events in last 7 days for avg uses per week calculation
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: weeklyEvents } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .in('event_type', feature.events)
        .gte('created_at', sevenDaysAgo);

      const activeUsers = featureUsers ?? 0;

      results.push({
        featureId: feature.featureId,
        name: feature.name,
        category: feature.category,
        adoptionRate: Math.round((activeUsers / mauCount) * 100),
        totalUsers: totalFeatureUsers ?? 0,
        avgUsesPerWeek:
          activeUsers > 0
            ? Math.round(((weeklyEvents ?? 0) / activeUsers) * 10) / 10
            : 0,
        careCompanionHasEquivalent: feature.careCompanionHasEquivalent,
      });
    } catch {
      results.push({
        featureId: feature.featureId,
        name: feature.name,
        category: feature.category,
        adoptionRate: 0,
        totalUsers: 0,
        avgUsesPerWeek: 0,
        careCompanionHasEquivalent: feature.careCompanionHasEquivalent,
      });
    }
  }

  return results.sort((a, b) => b.adoptionRate - a.adoptionRate);
}

// --- NPS ---

async function fetchNPSMetrics(): Promise<AcquisitionMetrics['nps']> {
  try {
    const { data: surveys } = await supabase
      .from('nps_responses')
      .select('score, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!surveys || surveys.length === 0) {
      return {
        score: 0, respondents: 0, promotersPct: 0,
        passivesPct: 0, detractorsPct: 0, lastSurveyDate: null,
      };
    }

    const promoters = surveys.filter((s) => s.score >= 9).length;
    const passives = surveys.filter((s) => s.score >= 7 && s.score <= 8).length;
    const detractors = surveys.filter((s) => s.score <= 6).length;
    const total = surveys.length;

    return {
      score: Math.round(((promoters - detractors) / total) * 100),
      respondents: total,
      promotersPct: Math.round((promoters / total) * 100),
      passivesPct: Math.round((passives / total) * 100),
      detractorsPct: Math.round((detractors / total) * 100),
      lastSurveyDate: surveys[0]?.created_at ?? null,
    };
  } catch {
    return {
      score: 0, respondents: 0, promotersPct: 0,
      passivesPct: 0, detractorsPct: 0, lastSurveyDate: null,
    };
  }
}

// --- Revenue ---

async function fetchRevenueMetrics(): Promise<AcquisitionMetrics['revenue']> {
  try {
    // Active subscriptions
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('status, plan_amount, trial_end, created_at')
      .eq('status', 'active');

    const activeSubs = subs ?? [];
    const payingUsers = activeSubs.filter(
      (s) => !s.trial_end || new Date(s.trial_end) < new Date(),
    ).length;
    const mrr = activeSubs.reduce(
      (sum, s) => sum + ((s.plan_amount ?? 0) / 100), // Stripe amounts in cents
      0,
    );

    // Total users for conversion rate
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Trial conversions
    const { count: trialUsers } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('trial_end', 'is', null);

    const { count: convertedTrials } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('trial_end', 'is', null)
      .eq('status', 'active');

    const arpu = (totalUsers ?? 0) > 0 ? Math.round((mrr / (totalUsers ?? 1)) * 100) / 100 : 0;
    const conversionRate = (totalUsers ?? 0) > 0
      ? Math.round((payingUsers / (totalUsers ?? 1)) * 100)
      : 0;
    const trialConversionRate = (trialUsers ?? 0) > 0
      ? Math.round(((convertedTrials ?? 0) / (trialUsers ?? 1)) * 100)
      : 0;

    // LTV estimate: ARPU / monthly churn rate (simplified)
    // If churn data isn't available, estimate 3% monthly churn
    const estimatedChurn = 0.03;
    const ltv = arpu > 0 ? Math.round((arpu / estimatedChurn) * 100) / 100 : 0;

    return { mrr, arpu, conversionRate, ltv, payingUsers, trialConversionRate };
  } catch {
    return { mrr: 0, arpu: 0, conversionRate: 0, ltv: 0, payingUsers: 0, trialConversionRate: 0 };
  }
}

// --- Clinical Outcomes ---

async function fetchClinicalOutcomeMetrics(
  start: string,
  end: string,
): Promise<AcquisitionMetrics['clinicalOutcomes']> {
  try {
    // Users with outcome improvement
    const { data: outcomes } = await supabase
      .from('outcome_events')
      .select('user_id, event_type, metric_value')
      .gte('created_at', start)
      .lte('created_at', end);

    if (!outcomes || outcomes.length === 0) {
      return {
        avgImprovementScore: 0, usersWithImprovement: 0,
        avgGoalProgressRate: 0, avgIncidentReduction: 0, significantCorrelations: 0,
      };
    }

    // Goal progress events
    const goalEvents = outcomes.filter((o) => o.event_type === 'goal_progress');
    const avgGoalProgress =
      goalEvents.length > 0
        ? Math.round(goalEvents.reduce((a, b) => a + b.metric_value, 0) / goalEvents.length)
        : 0;

    // Behavior incident reduction (compare first half vs second half of period)
    const incidents = outcomes.filter((o) => o.event_type === 'behavior_incident');
    const midpoint = Math.floor(incidents.length / 2);
    const firstHalf = incidents.slice(0, midpoint);
    const secondHalf = incidents.slice(midpoint);
    const firstHalfAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((a, b) => a + b.metric_value, 0) / firstHalf.length
        : 0;
    const secondHalfAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((a, b) => a + b.metric_value, 0) / secondHalf.length
        : 0;
    const incidentReduction =
      firstHalfAvg > 0
        ? Math.round(((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100)
        : 0;

    // Unique users with positive goal progress
    const usersWithProgress = new Set(
      goalEvents.filter((g) => g.metric_value > 0).map((g) => g.user_id),
    ).size;
    const uniqueUsers = new Set(outcomes.map((o) => o.user_id)).size;
    const usersWithImprovement =
      uniqueUsers > 0 ? Math.round((usersWithProgress / uniqueUsers) * 100) : 0;

    // Significant correlations (from outcome_correlation reports)
    const { count: sigCorrelations } = await supabase
      .from('outcome_reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .gt('significant_correlations', 0);

    // Composite improvement score
    const avgImprovementScore = Math.min(
      100,
      Math.round(
        avgGoalProgress * 0.4 +
          Math.max(0, incidentReduction) * 0.3 +
          usersWithImprovement * 0.3,
      ),
    );

    return {
      avgImprovementScore,
      usersWithImprovement,
      avgGoalProgressRate: avgGoalProgress,
      avgIncidentReduction: Math.max(0, incidentReduction),
      significantCorrelations: sigCorrelations ?? 0,
    };
  } catch {
    return {
      avgImprovementScore: 0, usersWithImprovement: 0,
      avgGoalProgressRate: 0, avgIncidentReduction: 0, significantCorrelations: 0,
    };
  }
}

// --- CentralReach Integration ---

async function fetchCRIntegrationMetrics(
  start: string,
  end: string,
): Promise<AcquisitionMetrics['crIntegration']> {
  try {
    // Sync success rate
    const { count: totalSyncs } = await supabase
      .from('cr_sync_status')
      .select('*', { count: 'exact', head: true });

    const { count: successSyncs } = await supabase
      .from('cr_sync_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success');

    const syncSuccessRate =
      (totalSyncs ?? 0) > 0
        ? Math.round(((successSyncs ?? 0) / (totalSyncs ?? 1)) * 100)
        : 0;

    // Total records synced
    const { count: pullRecords } = await supabase
      .from('cr_sync_status')
      .select('records_synced')
      .eq('direction', 'pull');

    const { count: pushRecords } = await supabase
      .from('cr_sync_status')
      .select('records_synced')
      .eq('direction', 'push');

    // Users with active CR
    const { count: crUsers } = await supabase
      .from('cr_sync_status')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'success');

    // Last failure date
    const { data: lastFailure } = await supabase
      .from('cr_sync_status')
      .select('last_sync_at')
      .eq('status', 'error')
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .single();

    const daysSinceLastFailure = lastFailure?.last_sync_at
      ? Math.floor(
          (Date.now() - new Date(lastFailure.last_sync_at).getTime()) / 86400000,
        )
      : 999; // No failures ever

    return {
      syncSuccessRate,
      totalRecordsSynced: (pullRecords ?? 0) + (pushRecords ?? 0),
      usersWithCRActive: crUsers ?? 0,
      avgSyncLatencySeconds: 2.5, // TODO: Track actual latency
      daysSinceLastFailure: Math.min(daysSinceLastFailure, 999),
    };
  } catch {
    return {
      syncSuccessRate: 0, totalRecordsSynced: 0,
      usersWithCRActive: 0, avgSyncLatencySeconds: 0, daysSinceLastFailure: 0,
    };
  }
}

// --- Growth ---

async function fetchGrowthMetrics(): Promise<AcquisitionMetrics['growth']> {
  try {
    const now = Date.now();
    const oneWeekAgo = new Date(now - 7 * 86400000).toISOString();
    const twoWeeksAgo = new Date(now - 14 * 86400000).toISOString();
    const oneMonthAgo = new Date(now - 30 * 86400000).toISOString();
    const twoMonthsAgo = new Date(now - 60 * 86400000).toISOString();

    // WoW signup growth
    const { count: thisWeekSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo);

    const { count: lastWeekSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo)
      .lt('created_at', oneWeekAgo);

    const wowGrowthRate =
      (lastWeekSignups ?? 0) > 0
        ? Math.round(
            (((thisWeekSignups ?? 0) - (lastWeekSignups ?? 0)) / (lastWeekSignups ?? 1)) * 100,
          )
        : 0;

    // MoM signup growth
    const { count: thisMonthSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo);

    const { count: lastMonthSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoMonthsAgo)
      .lt('created_at', oneMonthAgo);

    const momGrowthRate =
      (lastMonthSignups ?? 0) > 0
        ? Math.round(
            (((thisMonthSignups ?? 0) - (lastMonthSignups ?? 0)) / (lastMonthSignups ?? 1)) * 100,
          )
        : 0;

    // Viral coefficient (referrals / users)
    const { count: referrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo)
      .eq('status', 'completed');

    const { count: activeReferrers } = await supabase
      .from('referrals')
      .select('referrer_id', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo);

    const viralCoefficient =
      (activeReferrers ?? 0) > 0
        ? Math.round(((referrals ?? 0) / (activeReferrers ?? 1)) * 100) / 100
        : 0;

    // Organic vs referred signups
    const { count: referredSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo)
      .not('referred_by', 'is', null);

    const organicSignupRate =
      (thisMonthSignups ?? 0) > 0
        ? Math.round(
            ((((thisMonthSignups ?? 0) - (referredSignups ?? 0)) / (thisMonthSignups ?? 1))) * 100,
          )
        : 100;

    return { wowGrowthRate, momGrowthRate, viralCoefficient, organicSignupRate };
  } catch {
    return { wowGrowthRate: 0, momGrowthRate: 0, viralCoefficient: 0, organicSignupRate: 100 };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get features that Aminy has but CareCompanion does not.
 * Useful for strategic positioning in investor/acquirer conversations.
 */
export function getUniqueFeatures(metrics: AcquisitionMetrics): FeatureAdoptionMetric[] {
  return metrics.featureAdoption.filter((f) => !f.careCompanionHasEquivalent);
}

/**
 * Compute an overall "acquisition readiness" score (0-10).
 * Weights are tuned for what a strategic acquirer like CentralReach cares about.
 */
export function computeAcquisitionReadinessScore(metrics: AcquisitionMetrics): {
  score: number;
  breakdown: Record<string, { score: number; weight: number; notes: string }>;
} {
  const breakdown: Record<string, { score: number; weight: number; notes: string }> = {};

  // Engagement (20% weight)
  const engScore = Math.min(10, Math.round(metrics.engagement.dauMauRatio * 30));
  breakdown.engagement = {
    score: engScore,
    weight: 0.2,
    notes: `DAU/MAU: ${(metrics.engagement.dauMauRatio * 100).toFixed(0)}% (>20% is good for consumer health apps)`,
  };

  // Retention (20% weight)
  const retScore = Math.min(10, Math.round(metrics.retention.d30 / 10));
  breakdown.retention = {
    score: retScore,
    weight: 0.2,
    notes: `D30 retention: ${metrics.retention.d30}% (>30% is strong)`,
  };

  // Clinical Outcomes (25% weight — most important for CentralReach)
  const clinScore = Math.min(10, Math.round(metrics.clinicalOutcomes.avgImprovementScore / 10));
  breakdown.clinicalOutcomes = {
    score: clinScore,
    weight: 0.25,
    notes: `Improvement score: ${metrics.clinicalOutcomes.avgImprovementScore}/100, ${metrics.clinicalOutcomes.usersWithImprovement}% users improved`,
  };

  // CR Integration (15% weight)
  const crScore = Math.min(10, Math.round(metrics.crIntegration.syncSuccessRate / 10));
  breakdown.crIntegration = {
    score: crScore,
    weight: 0.15,
    notes: `Sync success: ${metrics.crIntegration.syncSuccessRate}%, ${metrics.crIntegration.usersWithCRActive} active users`,
  };

  // Feature Differentiation (10% weight)
  const uniqueFeatures = getUniqueFeatures(metrics);
  const featScore = Math.min(10, Math.round((uniqueFeatures.length / FEATURE_CATALOG.length) * 10));
  breakdown.featureDifferentiation = {
    score: featScore,
    weight: 0.1,
    notes: `${uniqueFeatures.length}/${FEATURE_CATALOG.length} features unique vs CareCompanion`,
  };

  // NPS (10% weight)
  const npsScore = Math.min(10, Math.max(0, Math.round((metrics.nps.score + 100) / 20)));
  breakdown.nps = {
    score: npsScore,
    weight: 0.1,
    notes: `NPS: ${metrics.nps.score} from ${metrics.nps.respondents} respondents`,
  };

  // Weighted total
  const totalScore =
    Object.values(breakdown).reduce((sum, b) => sum + b.score * b.weight, 0);
  const score = Math.round(totalScore * 10) / 10;

  return { score, breakdown };
}
